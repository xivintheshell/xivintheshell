import {Aspect, BuffType, Debug, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {GameConfig} from "./GameConfig"
import {StatsModifier} from "./StatsModifier";
import {
	DisplayedSkills,
	SkillApplicationCallbackInfo,
	SkillCaptureCallbackInfo,
	SkillsList,
	Skill,
	Spell,
	Ability,
} from "./Skills"
import {CoolDown, CoolDownState, DoTBuff, Event, EventTag, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {ActionNode} from "../Controller/Record";
import {ShellInfo, ShellJob} from "../Controller/Common";
import {getPotencyModifiersFromResourceState, Potency, PotencyModifier, PotencyModifierType} from "./Potency";
import {Buff} from "./Buffs";
import {TraitName, Traits} from "./Traits";

import {BLMState} from "./Jobs/BLM";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;


// GameState := resources + events queue
export abstract class GameState {
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	lucidTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList<GameState>;
	displayedSkills: DisplayedSkills;

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = new SeedRandom(config.randomSeed);
		this.nonProcRng = new SeedRandom(config.randomSeed + "_nonProcs");
		this.lucidTickOffset = this.nonProcRng() * 3.0;

		// TIME (raw time which starts at 0 regardless of countdown)
		this.time = 0;

		this.displayedSkills = new DisplayedSkills(config.level);

		// RESOURCES (checked when using skills)
		this.resources = new ResourceState(this);
		this.resources.set(new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(new Resource(ResourceType.Sprint, 1, 0));

		this.resources.set(new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(new Resource(ResourceType.NotCasterTaxed, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(new CoolDown(ResourceType.cd_GCD, config.getAfterTaxGCD(config.adjustedGCD()), 1, 1));
		this.cooldowns.set(new CoolDown(ResourceType.cd_Sprint, 60, 1, 1));

		// EVENTS QUEUE (events decide future changes to resources)
		// which might include:
		// - damage calc (enqueues damage application)
		// - damage application
		// - dot application / refresh (put dot up, refresh timer by removing and re-enqueueing "thunder fall off" event)
		// - dot fall off (by dot application)
		// - modifiers up (which potentially enqueues modifier down)
		// - modifiers down (by modifiers up)
		this.eventsQueue = [];

		// SKILLS (instantiated once, read-only later)
		this.skillsList = new SkillsList(this);

		this.#init();
	}

	abstract registerRecurringEvents(): void;

	// get mp tick, lucid tick, thunder DoT tick and polyglot rolling
	#init() {
		let game = this;
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			let recurringManaRegen = ()=>{
				// mana regen
				let mana = this.resources.get(ResourceType.Mana);
				let gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				let currentAmount = mana.availableAmount();
				controller.reportManaTick(game.time, "+" + gainAmount + " (MP="+currentAmount+")");
				// queue the next tick
				this.resources.addResourceEvent({
					rscType: ResourceType.Mana,
					name: "mana tick",
					delay: 3,
					fnOnRsc: rsc=>{
						recurringManaRegen();
					},
					// would ideally want to only have ManaGain tag if there's no AF... too much work for now
					tags: [EventTag.MpTick, EventTag.ManaGain]
				});
			};
			this.resources.addResourceEvent({
				rscType: ResourceType.Mana,
				name: "initial mana tick",
				delay: this.config.timeTillFirstManaTick,
				fnOnRsc: recurringManaRegen,
				// would ideally want to only have ManaGain tag if there's no AF... too much work for now
				tags: [EventTag.MpTick, EventTag.ManaGain]
			});
		}

		// lucid ticks
		let recurringLucidTick = (state: GameState, node: ActionNode) => {
			// do work at lucid tick
			let lucid = state.resources.get(ResourceType.LucidDreaming) as DoTBuff;
			if (lucid.available(1)) {
				lucid.tickCount++;
				if (!(ShellInfo.job === ShellJob.BLM && (state as BLMState).getFireStacks() === 0)) {
					let mana = state.resources.get(ResourceType.Mana);
					mana.gain(550);
					let msg = "+550";
					console.assert(lucid.node !== undefined);
					if (lucid.node) {
						let t = "??";
						if (lucid.node.tmp_startLockTime) {
							t = (lucid.node.tmp_startLockTime - state.config.countdown).toFixed(3);
						}
						msg += " {skill}@" + t;
						msg += " (" + lucid.tickCount + "/7)";
					}
					msg += " (MP=" + mana.availableAmount() + ")";
					controller.reportLucidTick(state.time, msg);
				}
			}
			// queue the next tick
			let recurringLucidTickEvt = new Event("lucid tick", 3, (state: GameState, node: ActionNode) => {
				recurringLucidTick(state, node);
			});
			recurringLucidTickEvt.addTag(EventTag.LucidTick);
			// potentially also give mp gain tag
			if (lucid.available(1) && lucid.pendingChange) {
				let timeTillDropLucid = lucid.pendingChange.timeTillEvent;
				if (timeTillDropLucid >= 3) {
					recurringLucidTickEvt.addTag(EventTag.ManaGain);
				}
			}
			state.addEvent(recurringLucidTickEvt);
		};
		let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
		while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
		let firstLucidTickEvt = new Event("initial lucid tick", timeTillFirstLucidTick, recurringLucidTick);
		firstLucidTickEvt.addTag(EventTag.LucidTick);
		this.addEvent(firstLucidTickEvt);

		this.registerRecurringEvents();
	}

	// advance game state by this much time
	tick(deltaTime: number, prematureStopCondition=()=>{ return false; }) {
		//======== events ========
		let cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime && this.eventsQueue.length > 0 && !prematureStopCondition())
		{
			// make sure events are in proper order (qol: optimize using a priority queue...)
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);
			cumulativeDeltaTime = Math.min(cumulativeDeltaTime + timeToTick, deltaTime);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);
			if (Debug.consoleLogEvents) console.log("====== tick " + timeToTick + " now at " + this.time);

			const newEventsToQueue: Event[] = [];
			// make a deep copy of events to advance for this round...
			const eventsToExecuteOld = [];
			for (let i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			let executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				e.timeTillEvent -= timeToTick;
				if (Debug.consoleLogEvents) console.log(e.name + " in " + e.timeTillEvent);
				if (e.timeTillEvent <= Debug.epsilon)
				{
					if (!e.canceled)
					{
						// TODO access node here
						const effectResult = e.effectFn();
						// TODO handle error case
						// TODO check if any new events have a delay of 0
						if (Array.isArray(effectResult)) {
							newEventsToQueue.concat(effectResult);
						}
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);
			// add newly queued events
			this.eventsQueue.concat(newEventsToQueue);
		}
		if (Debug.consoleLogEvents) {
			console.log(this.toString());
			console.log(this.resources);
			console.log(this.cooldowns);
		}
		return cumulativeDeltaTime;
	}

	addEvent(evt: Event) {
		this.eventsQueue.push(evt);
	}

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

	captureManaRegenAmount() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	gcdRecastTimeScale() {
		let ll = this.resources.get(ResourceType.LeyLines);
		if (ll.available(1)) {
			// should be approximately 0.85
			const num = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5, ResourceType.LeyLines));
			const denom = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5, ResourceType.LeyLines));
			return num / denom;
		} else {
			return 1;
		}
	}

	requestToggleBuff(buffName: ResourceType) {
		let rsc = this.resources.get(buffName);
		// only ley lines can be enabled / disabled. Everything else will just be canceled
		if (buffName === ResourceType.LeyLines) {
			if (rsc.available(1)) { // buff exists and enabled
				rsc.enabled = false;
				return true;
			} else {
				// currently nothing happens if trying to toggle a buff that isn't applied
				rsc.enabled = true;
				return true;
			}
		} else {
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
			return true;
		}
	}

	castSpell(props: {
		skillName: SkillName,
		onCapture: (cap: SkillCaptureCallbackInfo)=>void,
		onApplication: (app: SkillApplicationCallbackInfo)=>void,
		node: ActionNode})
	{
		let skill = this.skillsList.get(props.skillName) as Spell<PlayerState>;
		console.assert(skill.kind === "spell");
		let cd = this.cooldowns.get(skill.cdName);
		let [capturedManaCost, uhConsumption] = this.captureManaCostAndUHConsumption(skill.aspect, skill.manaCostFn(this));
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		let capturedCastTime = skill.castTimeFn(this);
		if (llCovered && skill.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}

		// attach potency node
		const potencyNumber = skill.potencyFn(this);
		let potency: Potency | undefined = undefined;
		if (potencyNumber > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: props.skillName,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: undefined,
				description: "",
			});
			props.node.addPotency(potency);
		}

		let takeEffect = function(game: GameState) {
			// TODO propagate error
			let resourcesStillAvailable = skill.validateAttempt(game) === undefined;
			if (resourcesStillAvailable) {
				// re-capture them here, since game state might've changed (say, AF/UI fell off)
				[capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(skill.aspect, skill.manaCostFn(game));

				// actually deduct MP and UH (except some special ones like Despair, Flare and Flare Star that deduct resources in onCapture fn)
				if (props.skillName !== SkillName.Flare && props.skillName !== SkillName.Despair && props.skillName !== SkillName.FlareStar) {
					if (!(props.skillName===SkillName.Paradox && game.getIceStacks()>0)) {
						game.resources.get(ResourceType.Mana).consume(capturedManaCost);
					}
					if (uhConsumption > 0) game.resources.get(ResourceType.UmbralHeart).consume(uhConsumption);
				}

				// potency
				if (potency) {
					potency.snapshotTime = game.getDisplayTime();
					potency.modifiers = getPotencyModifiersFromResourceState(game.resources, skill.aspect);
				}

				// tincture
				if (game.resources.get(ResourceType.Tincture).available(1) && skill.potencyFn(game) > 0) {
					props.node.addBuff(BuffType.Tincture);
				}

				// ice spells: gain mana if in UI
				if (skill.aspect === Aspect.Ice) {
					game.gainUmbralMana(skill.applicationDelay);
				}

				let captureInfo: SkillCaptureCallbackInfo = {
					capturedManaCost: capturedManaCost
					//...
				};
				props.onCapture(captureInfo);

				// effect application
				game.addEvent(new Event(
					skill.name + " applied",
					skill.applicationDelay,
					(state, node)=>{
						if (potency) {
							controller.resolvePotency(potency);
						}
						let applicationInfo: SkillApplicationCallbackInfo = {
							//...
						};
						props.onApplication(applicationInfo);
					}));
				return true;
			} else {
				return false;
			}
		}

		let instantCast = function(game: GameState, rsc?: Resource) {
			if (rsc) rsc.consume(1);
			takeEffect(game);

			// recast
			cd.useStack(game);

			// animation lock
			game.resources.takeResourceLock(ResourceType.NotAnimationLocked, game.config.getSkillAnimationLock(props.skillName));
		}

		// Paradox made instant via Dawntrail
		if (props.skillName === SkillName.Paradox || props.skillName === SkillName.UmbralSoul) {
			instantCast(this, undefined);
			return;
		}

		// Swiftcast
		let swift = this.resources.get(ResourceType.Swiftcast);
		if (swift.available(1)) {
			swift.removeTimer();
			instantCast(this, swift);
			return;
		}

		// Triplecast charge
		let triple = this.resources.get(ResourceType.Triplecast);
		if (triple.available(1)) {
			instantCast(this, triple);
			if (!triple.available(1)) {
				triple.removeTimer();
			}
			return;
		}

		// there are no triplecast charges. cast and apply effect

		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));

		// (basically done casting) deduct MP, calc damage, queue damage
		this.addEvent(new Event(skill.name + " captured", capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime), (state, node)=>{
			let success = takeEffect(this);
			if (!success) {
				controller.reportInterruption({
					failNode: props.node
				});
			}
		}));

		// recast
		cd.useStack(this);

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotCasterTaxed, this.config.getAfterTaxCastTime(capturedCastTime));
	}

	useInstantSkill(props: {
		skillName: SkillName,
		onCapture?: () => void,
		onApplication?: () => void,
		dealDamage: boolean,
		node: ActionNode
	}) {
		console.assert(props.node);
		let skill = this.skillsList.get(props.skillName);
		let cd = this.cooldowns.get(skill.cdName);

		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		if (llCovered && skill.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}

		// potency
		const potencyNumber = skill.potencyFn(this);
		let potency : Potency | undefined = undefined;
		if (props.dealDamage) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: this.getDisplayTime(),
				description: "",
			});
			potency.modifiers = getPotencyModifiersFromResourceState(this.resources, skill.aspect);
			props.node.addPotency(potency);
		}

		// tincture
		if (this.resources.get(ResourceType.Tincture).available(1) && potencyNumber > 0) {
			props.node.addBuff(BuffType.Tincture);
		}

		if (props.onCapture) props.onCapture();

		let skillEvent = new Event(
			skill.name + " captured",
			skill.applicationDelay,
			(state, node) => {
				if (props.dealDamage && potency) controller.resolvePotency(potency);
				if (props.onApplication) props.onApplication();
			});
		this.addEvent(skillEvent);

		// recast
		cd.useStack(this);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.getSkillAnimationLock(props.skillName));

		return skillEvent;
	}

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.cdName;
		let tillAnyCDStack = this.cooldowns.timeTillAnyStackAvailable(cdName);
		return Math.max(this.timeTillAnySkillAvailable(), tillAnyCDStack);
	}

	timeTillAnySkillAvailable() {
		let tillNotAnimationLocked = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNotCasterTaxed = this.resources.timeTillReady(ResourceType.NotCasterTaxed);
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	findNextQueuedEventByTag(tag : EventTag) {
		for (let i = 0; i < this.eventsQueue.length; i++) {
			let evt = this.eventsQueue[i];
			if (evt.hasTag(tag)) return evt;
		}
		return undefined;
	}

	timeTillNextMpGainEvent() {
		let foundEvt = this.findNextQueuedEventByTag(EventTag.ManaGain);
		return foundEvt ? foundEvt.timeTillEvent : 0;
	}

	getSkillAvailabilityStatus(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.name);
		let [capturedManaCost] = skill.kind === "spell" ? this.captureManaCostAndUHConsumption(skill.aspect, skill.manaCostFn(this)) : [0,0];
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		let capturedCastTime = skill.castTimeFn(this);
		let instantCastAvailable = this.resources.get(ResourceType.Triplecast).available(1)
			|| this.resources.get(ResourceType.Swiftcast).available(1)
			|| skillName===SkillName.Paradox
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)))
			|| (skillName===SkillName.Xenoglossy && this.resources.get(ResourceType.Polyglot).available(1))
			|| (skillName===SkillName.UmbralSoul && this.getIceStacks()>0); // lmfao why does this count as a spell
		let currentMana = this.resources.get(ResourceType.Mana).availableAmount();
		let notBlocked = timeTillAvailable <= Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana
			|| (skillName===SkillName.Paradox && this.getIceStacks() > 0)
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)));
		let reqsMet = skill.validateAttempt(this) !== undefined;
		let skillUnlocked = this.config.level >= skill.unlockLevel;
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!skillUnlocked) status = SkillReadyStatus.SkillNotUnlocked;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;

		let cd = this.cooldowns.get(skill.cdName);
		let timeTillNextStackReady = this.cooldowns.timeTillNextStackAvailable(skill.cdName);
		let cdRecastTime = cd.currentStackCd();

		// to be displayed together when hovered on a skill
		let timeTillDamageApplication = 0;
		if (status === SkillReadyStatus.Ready) {
			if (skill.kind === "spell") {
				let timeTillCapture = instantCastAvailable ? 0 : (capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));
				timeTillDamageApplication = timeTillCapture + skill.applicationDelay;
			} else {
				timeTillDamageApplication = skill.applicationDelay;
			}
		}

		// conditions that make the skills show proc
		let highlight = false;

		if (skillName === SkillName.Paradox) {// paradox
			highlight = true;
		} else if (skillName === SkillName.Fire3) {// F3P
			if (this.resources.get(ResourceType.Firestarter).available(1)) highlight = true;
		} else if (skillName === SkillName.Thunder3 || skillName === SkillName.HighThunder) {
			if (this.resources.get(ResourceType.Thunderhead).available(1)) highlight = true;
		} else if (skillName === SkillName.Foul || skillName === SkillName.Xenoglossy) {// polyglot
			if (this.resources.get(ResourceType.Polyglot).available(1)) highlight = true;
		} else if (skillName === SkillName.FlareStar) {
			if (this.resources.get(ResourceType.AstralSoul).available(6)) highlight = true;
		}

		return {
			status: status,
			description: "",
			stacksAvailable: cd.stacksAvailable(),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: cdRecastTime,
			timeTillNextStackReady: timeTillNextStackReady,
			timeTillAvailable: timeTillAvailable,
			timeTillDamageApplication: timeTillDamageApplication,
			capturedManaCost: capturedManaCost,
			highlight: highlight,
			llCovered: llCovered
		};
	}

	useSkill(skillName: SkillName, node: ActionNode) {
		let skill = this.skillsList.get(skillName);
		skill.onConfirm(this, node);
	}

	getPartyBuffs(time: number) {
		const buffCollection = new Map<BuffType, PotencyModifier>();
		const buffMarkers = controller.timeline.getBuffMarkers();
		buffMarkers.filter(marker => {
			return marker.time <= time && (marker.time + marker.duration) >= time;
		}).forEach(marker => {
			const buff = new Buff(marker.description as BuffType);
			if (!buffCollection.has(buff.name)) {
				buffCollection.set(buff.name, {
					source: PotencyModifierType.PARTY, 
					buffType: buff.name,
					damageFactor: buff.info.damageFactor,
					critFactor: buff.info.critBonus,
					dhFactor: buff.info.dhBonus,
				});
			}
		})

		return buffCollection;
	}

	// Attempt to consume 1 stack of the specified resource.
	// When cancelTimerIfEmpty is set, then remove any associated timers if the last stack of
	// the resource was consumed.
	tryConsumeResource(rscType: ResourceType, removeTimerIfEmpty=true) {
		const resource = this.resources.get(rscType);
		if (resource.available(1)) {
			resource.consume(1);
			if (removeTimerIfEmpty && !resource.available(1)) {
				resource.removeTimer();
			}
			return true;
		}
		return false;
	}

	toString() {
		let s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).availableAmount() + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).availableAmount() + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).availableAmount() + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).availableAmount() + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).availableAmount() + "\n";
		s += "LL:\t" + this.resources.get(ResourceType.LeyLines).availableAmount() + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).availableAmount() + "\n";
		s += "GCD:\t" + this.cooldowns.get(ResourceType.cd_GCD).availableAmount().toFixed(3) + "\n";
		s += "LLCD:\t" + this.cooldowns.get(ResourceType.cd_LeyLines).availableAmount().toFixed(3) + "\n";
		return s;
	}
}

export const newGameState = (config: GameConfig): GameState => {
	// TODO specialize
	return new BLMState(config);
};

// TODO if we ever support multiple jobs running in parallel, then we will need to move a lot of
// elements out onto per-player state.
// This type alias is placed here for now to make this possible future refactor easier.
export type PlayerState = GameState;