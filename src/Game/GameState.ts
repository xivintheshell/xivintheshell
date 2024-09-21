import {Aspect, BuffType, Debug, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {GameConfig} from "./GameConfig"
import {StatsModifier} from "./StatsModifier";
import {DisplayedSkills, SkillApplicationCallbackInfo, SkillCaptureCallbackInfo, SkillsList} from "./Skills"
import {CoolDown, CoolDownState, DoTBuff, Event, EventTag, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {ActionNode} from "../Controller/Record";
import {ShellInfo, ShellJob} from "../Controller/Common";
import {getPotencyModifiersFromResourceState, Potency, PotencyModifier, PotencyModifierType} from "./Potency";
import {Buff} from "./Buffs";
import {TraitName, Traits} from "./Traits";

import {BLMState} from "./Jobs/BLM";
import {SkillButtonViewInfo} from "../Components/Skills";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;

// Job-specific resource and state representation.
// All implementors of JobState should initialize their own resources within the constructor.
export interface JobState {
	gameState: GameState;
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];

	// Register persistent timers, like BLM's Polyglot gauge.
	registerRecurringEvents(): void;
};


class EmptyJobState implements JobState {
	gameState: GameState;
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	
	constructor(gameState: GameState) {
		this.gameState = gameState;
		this.config = gameState.config;
		this.rng = gameState.rng;
		this.nonProcRng = gameState.nonProcRng;
		this.resources = gameState.resources;
		this.cooldowns = gameState.cooldowns;
		this.eventsQueue = gameState.eventsQueue;
	}

	registerRecurringEvents() {};
}

// GameState := resources + events queue
export class GameState {
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	lucidTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList;
	displayedSkills: DisplayedSkills;
	jobState: JobState;

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
		this.cooldowns.set(new CoolDown(ResourceType.cd_GCD, config.getAfterTaxGCD(config.adjustedGCD(false)), 1, 1));
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

		switch (ShellInfo.job) {
			case ShellJob.BLM:
				this.jobState = new BLMState(this);
				break;
			default:
				console.error(`Could not construct job state for job: ${ShellInfo.job}`)
				this.jobState = new EmptyJobState(this);
		}

		this.#init();
	}

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
		let recurringLucidTick = () => {
			// do work at lucid tick
			let lucid = this.resources.get(ResourceType.LucidDreaming) as DoTBuff;
			if (lucid.available(1)) {
				lucid.tickCount++;
				if (this.getFireStacks() === 0) {
					let mana = this.resources.get(ResourceType.Mana);
					mana.gain(550);
					let msg = "+550";
					console.assert(lucid.node !== undefined);
					if (lucid.node) {
						let t = "??";
						if (lucid.node.tmp_startLockTime) {
							t = (lucid.node.tmp_startLockTime - this.config.countdown).toFixed(3);
						}
						msg += " {skill}@" + t;
						msg += " (" + lucid.tickCount + "/7)";
					}
					msg += " (MP=" + mana.availableAmount() + ")";
					controller.reportLucidTick(this.time, msg);
				}
			}
			// queue the next tick
			let recurringLucidTickEvt = new Event("lucid tick", 3, ()=>{
				recurringLucidTick();
			});
			recurringLucidTickEvt.addTag(EventTag.LucidTick);
			// potentially also give mp gain tag
			if (lucid.available(1) && lucid.pendingChange) {
				let timeTillDropLucid = lucid.pendingChange.timeTillEvent;
				if (timeTillDropLucid >= 3) {
					recurringLucidTickEvt.addTag(EventTag.ManaGain);
				}
			}
			this.addEvent(recurringLucidTickEvt);
		};
		let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
		while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
		let firstLucidTickEvt = new Event("initial lucid tick", timeTillFirstLucidTick, recurringLucidTick);
		firstLucidTickEvt.addTag(EventTag.LucidTick);
		this.addEvent(firstLucidTickEvt);

		this.jobState.registerRecurringEvents();
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
						e.effectFn();
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);
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

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).availableAmount(); }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).availableAmount(); }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).availableAmount(); }
	getMP() { return this.resources.get(ResourceType.Mana).availableAmount(); }

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

	gainThunderhead() {
		let thunderhead = this.resources.get(ResourceType.Thunderhead);
		// [6/29/24] note: from screen recording it looks more like: button press (0.1s) gain buff (30.0s) lose buff
		// see: https://drive.google.com/file/d/11KEAEjgezCKxhvUsaLTjugKAH_D1glmy/view?usp=sharing
		let duration = 30;
		if (thunderhead.available(1)) { // already has a proc; reset its timer
			thunderhead.overrideTimer(this, duration);
		} else { // there's currently no proc. gain one.
			thunderhead.gain(1);
			this.resources.addResourceEvent({
				rscType: ResourceType.Thunderhead,
				name: "drop thunderhead",
				delay: duration,
				fnOnRsc: (rsc: Resource) => {
					rsc.consume(1);
				}
			});
		}
	}

	// call this whenever gaining af or ui from a different af/ui/unaspected state
	switchToAForUI(rscType: ResourceType.AstralFire | ResourceType.UmbralIce, numStacksToGain: number) {
		console.assert(numStacksToGain > 0);

		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		let as = this.resources.get(ResourceType.AstralSoul);

		if (rscType===ResourceType.AstralFire)
		{
			if (af.availableAmount() === 0) {
				this.gainThunderhead();
			}
			af.gain(numStacksToGain);

			if (Traits.hasUnlocked(TraitName.AspectMasteryV, this.config.level)) {
				if (ui.available(3) && uh.available(3)) {
					paradox.gain(1);
				}  
			}

			ui.consume(ui.availableAmount());
		}
		else if (rscType===ResourceType.UmbralIce)
		{
			if (ui.availableAmount() === 0) {
				this.gainThunderhead();
			}
			ui.gain(numStacksToGain);

			if (Traits.hasUnlocked(TraitName.AspectMasteryV, this.config.level)) {
				if (af.available(3)) {
					paradox.gain(1);
				}
			}

			af.consume(af.availableAmount());
			as.consume(as.availableAmount());
		}
	}

	gainUmbralMana(effectApplicationDelay: number = 0) {
		let mpToGain = 0;
		switch(this.resources.get(ResourceType.UmbralIce).availableAmount()) {
			case 1: mpToGain = 2500;  break;
			case 2: mpToGain = 5000;  break;
			case 3: mpToGain = 10000; break;
			default: mpToGain = 0; break;
		}
		this.addEvent(new Event(
			"gain umbral mana",
				effectApplicationDelay,
			() => {
				this.resources.get(ResourceType.Mana).gain(mpToGain);
			}));
	}

	captureManaCostAndUHConsumption(aspect: Aspect, baseManaCost: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let manaCost;
		let uhConsumption = 0;

		if (aspect === Aspect.Fire) {
			manaCost = baseManaCost * mod.manaCostFire;
			uhConsumption = mod.uhConsumption;
		}
		else if (aspect === Aspect.Ice) {
			manaCost = baseManaCost * mod.manaCostIce;
		}
		else {
			manaCost = baseManaCost;
		}
		return [manaCost, uhConsumption];
	}

	captureManaRegenAmount() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	captureSpellCastTimeAFUI(aspect: Aspect, llAdjustedCastTime: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = llAdjustedCastTime;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return castTime;
	}

	gcdRecastTimeScale() {
		let ll = this.resources.get(ResourceType.LeyLines);
		if (ll.available(1)) {
			// should be approximately 0.85
			const num = this.config.getAfterTaxGCD(this.config.adjustedGCD(true));
			const denom = this.config.getAfterTaxGCD(this.config.adjustedGCD(false));
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
		let skill = this.skillsList.get(props.skillName);
		let skillInfo = skill.info;
		console.assert(skillInfo.isSpell);
		let cd = this.cooldowns.get(skillInfo.cdName);
		let [capturedManaCost, uhConsumption] = this.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		let capturedCastTime = this.captureSpellCastTimeAFUI(
			skillInfo.aspect,
			this.config.adjustedCastTime(skillInfo.baseCastTime, llCovered));
		if (llCovered && skillInfo.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}

		// attach potency node
		let potency: Potency | undefined = undefined;
		if (skillInfo.basePotency > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: props.skillName,
				aspect: skillInfo.aspect,
				basePotency: skillInfo.basePotency,
				snapshotTime: undefined,
				description: "",
			});
			props.node.addPotency(potency);
		}

		let takeEffect = function(game: GameState) {
			let resourcesStillAvailable = skill.available();
			if (resourcesStillAvailable) {
				// re-capture them here, since game state might've changed (say, AF/UI fell off)
				[capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);

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
					potency.modifiers = getPotencyModifiersFromResourceState(game.resources, skillInfo.aspect);
				}

				// tincture
				if (game.resources.get(ResourceType.Tincture).available(1) && skillInfo.basePotency > 0) {
					props.node.addBuff(BuffType.Tincture);
				}

				// ice spells: gain mana if in UI
				if (skillInfo.aspect === Aspect.Ice) {
					game.gainUmbralMana(skillInfo.applicationDelay);
				}

				let captureInfo: SkillCaptureCallbackInfo = {
					capturedManaCost: capturedManaCost
					//...
				};
				props.onCapture(captureInfo);

				// effect application
				game.addEvent(new Event(
					skillInfo.name + " applied",
					skillInfo.applicationDelay,
					()=>{
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
		this.addEvent(new Event(skillInfo.name + " captured", capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime), ()=>{
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
		let skillInfo = this.skillsList.get(props.skillName).info;
		let cd = this.cooldowns.get(skillInfo.cdName);

		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		if (llCovered && skillInfo.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}

		// potency
		let potency : Potency | undefined = undefined;
		if (props.dealDamage) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skillInfo.name,
				aspect: skillInfo.aspect,
				basePotency: skillInfo.basePotency,
				snapshotTime: this.getDisplayTime(),
				description: "",
			});
			potency.modifiers = getPotencyModifiersFromResourceState(this.resources, skillInfo.aspect);
			props.node.addPotency(potency);
		}

		// tincture
		if (this.resources.get(ResourceType.Tincture).available(1) && skillInfo.basePotency > 0) {
			props.node.addBuff(BuffType.Tincture);
		}

		if (props.onCapture) props.onCapture();

		let skillEvent = new Event(
			skillInfo.name + " captured",
			skillInfo.applicationDelay,
			()=>{
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

	hasEnochian() {
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		let enochian = this.resources.get(ResourceType.Enochian);
		return enochian.available(1);
	}

	// falls off after 15s unless refreshed by AF / UI
	startOrRefreshEnochian() {
		let enochian = this.resources.get(ResourceType.Enochian);

		if (enochian.available(1) && enochian.pendingChange) {
			// refresh timer (if there's already a timer)
			enochian.overrideTimer(this, 15);

		} else {
			// reset polyglot countdown to 30s if enochian wasn't actually active
			if (!enochian.available(1)) {
				this.resources.get(ResourceType.Polyglot).overrideTimer(this, 30);
			}

			// either fresh gain, or there's enochian but no timer
			enochian.gain(1);

			// add the event for losing it
			this.resources.addResourceEvent({
				rscType: ResourceType.Enochian,
				name: "lose enochian, clear all AF, UI, UH, stop poly timer",
				delay: 15,
				fnOnRsc: rsc=>{
					this.loseEnochian();
				}
			});
		}
	}

	loseEnochian() {
		this.resources.get(ResourceType.Enochian).consume(1);
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		let as = this.resources.get(ResourceType.AstralSoul);

		af.consume(af.availableAmount());
		ui.consume(ui.availableAmount());
		uh.consume(uh.availableAmount());
		paradox.consume(paradox.availableAmount());
		as.consume(as.availableAmount());
	}

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.info.cdName;
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

	getSkillAvailabilityStatus(skillName: SkillName): SkillButtonViewInfo {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.info.name);
		let [capturedManaCost] = skill.info.isSpell ? this.captureManaCostAndUHConsumption(skill.info.aspect, skill.info.baseManaCost) : [0,0];
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		let capturedCastTime = this.captureSpellCastTimeAFUI(
			skill.info.aspect,
			this.config.adjustedCastTime(skill.info.baseCastTime, llCovered));
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
		let reqsMet = skill.available();
		let skillUnlocked = this.config.level >= skill.info.unlockLevel;
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!skillUnlocked) status = SkillReadyStatus.SkillNotUnlocked;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;

		let cd = this.cooldowns.get(skill.info.cdName);
		let timeTillNextStackReady = this.cooldowns.timeTillNextStackAvailable(skill.info.cdName);
		let cdRecastTime = cd.currentStackCd();

		// to be displayed together when hovered on a skill
		let timeTillDamageApplication = 0;
		if (status === SkillReadyStatus.Ready) {
			if (skill.info.isSpell) {
				let timeTillCapture = instantCastAvailable ? 0 : (capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));
				timeTillDamageApplication = timeTillCapture + skill.info.applicationDelay;
			} else {
				timeTillDamageApplication = skill.info.applicationDelay;
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
			skillName: skill.name,
			status: status,
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
		skill.use(this, node);
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