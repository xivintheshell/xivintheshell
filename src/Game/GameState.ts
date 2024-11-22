import {Aspect, BuffType, Debug, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {GameConfig} from "./GameConfig"
import {
	DisplayedSkills,
	SkillsList,
	Spell,
	Weaponskill,
	Ability,
} from "./Skills"
import {
	getAllResources,
	getResourceInfo,
	CoolDown,
	CoolDownState,
	DoTBuff,
	Event,
	EventTag,
	Resource,
	ResourceInfo,
	ResourceState
} from "./Resources"

import {controller} from "../Controller/Controller";
import {ActionNode} from "../Controller/Record";
import {CASTER_JOBS, HEALER_JOBS, ShellJob, SKS_JOBS, SPS_JOBS} from "../Controller/Common";
import {Modifiers, Potency, PotencyModifier, PotencyModifierType} from "./Potency";
import {Buff} from "./Buffs";

import type {BLMState} from "./Jobs/BLM";
import type {SAMState} from "./Jobs/SAM";
import {SkillButtonViewInfo} from "../Components/Skills";

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

		// RESOURCES (checked when using skills)
		// and skill CDs (also a form of resource)
		this.resources = new ResourceState(this);
		this.cooldowns = new CoolDownState(this);
		getAllResources(this.job).forEach((info, rsc) => {
			if (info.isCoolDown) {
				// always start cooldowns at their max stacks (overrides will be applied later)
				this.cooldowns.set(new CoolDown(rsc, info.cdPerStack, info.maxStacks, info.maxStacks));
			} else {
				this.resources.set(new Resource(rsc, info.maxValue, info.defaultValue));
			}
		});
		// GCD, movement, and animation locks are treated as special since they do not appear
		// in resource overrides
		let adjustedGCD = 2.5;
		if (SKS_JOBS.includes(this.job)) {
			adjustedGCD = config.adjustedSksGCD()
		}
		if (SPS_JOBS.includes(this.job)) {
			adjustedGCD = config.adjustedGCD()
		}
		this.cooldowns.set(new CoolDown(ResourceType.cd_GCD, config.getAfterTaxGCD(adjustedGCD), 1, 1));

		this.resources.set(new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(new Resource(ResourceType.NotCasterTaxed, 1, 1));
		// begin the encounter not in combat by default
		this.resources.set(new Resource(ResourceType.InCombat, 1, 0));

		this.cooldowns.set(new CoolDown(ResourceType.Never, 0, 0, 0)); // dummy cooldown for invalid skills

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
		this.displayedSkills = new DisplayedSkills(this.job, config.level);
	}

	get job(): ShellJob {
		return this.config.job;
	}

	/**
	 * Get mp tick, lucid tick, and class-specific recurring timers rolling.
	 *
	 * This cannot be called by the base GameState constructor because sub-classes
	 * have not yet initialized their resource/cooldown objects. Instead, all
	 * sub-classes must explicitly call this at the end of their constructor.
	 */
	protected registerRecurringEvents() {
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
				if (!(this.isBLMState() && this.getFireStacks() > 0)) {
					// Block lucid ticks for BLM in fire
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
			let recurringLucidTickEvt = new Event("lucid tick", 3, () => {
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
		if ([...HEALER_JOBS, ...CASTER_JOBS].includes(this.job)) {
			let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
			while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
			let firstLucidTickEvt = new Event("initial lucid tick", timeTillFirstLucidTick, recurringLucidTick);
			firstLucidTickEvt.addTag(EventTag.LucidTick);
			this.addEvent(firstLucidTickEvt);
		}
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

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

	captureManaRegenAmount(): number {
		if (!this.isInCombat()) {
			return 600;
		}
		return 200;
	}

	// BLM uses this for LL GCD scaling, but PCT and SAM do not.
	gcdRecastTimeScale(): number {
		// TODO move this to child class methods
		if (this.job === ShellJob.BLM && this.hasResourceAvailable(ResourceType.LeyLines)) {
			// should be approximately 0.85
			const num = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5, ResourceType.LeyLines));
			const denom = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5));
			return num / denom;
		} else {
			return 1;
		}
	}

	requestToggleBuff(buffName: ResourceType) {
		let rsc = this.resources.get(buffName);
		// Ley lines, paint lines, and positionals can be toggled.
		if (([
			ResourceType.LeyLines,
			ResourceType.Inspiration,
			ResourceType.FlankPositional,
			ResourceType.RearPositional,
		] as ResourceType[]).includes(buffName)) {
			if (rsc.available(1)) { // buff exists and enabled
				rsc.enabled = false;
				return true;
			} else {
				// currently nothing happens if trying to toggle a buff that isn't applied
				rsc.enabled = true;
				return true;
			}
		} else if (([
			ResourceType.HammerTime,
			ResourceType.Aetherhues,
			ResourceType.SubtractivePalette,
			ResourceType.ClosedPosition,
			ResourceType.StandardStep,
			ResourceType.TechnicalStep,
			ResourceType.Esprit,
			ResourceType.Improvisation,
		] as ResourceType[]).includes(buffName)) {
			// subtractive spectrum, starstruck, monochrome tones, rainbow drip,
			// tempera coat/grassa, smudge can be clicked off
			// but these buffs cannot be
			return true;
		} else {
			// All other buffs are outright canceled.
			// Special case for meditate: cancel future meditate ticks (assume only one active event).
			if (buffName === ResourceType.Meditate) {
				const evt = this.findNextQueuedEventByTag(EventTag.MeditateTick);
				if (evt) {
					evt.canceled = true;
				}
			}
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
			return true;
		}
	}

	/**
	 * Attempt to use a spell or weaponskill. Assumes that resources for the spell are currently available,
	 * i.e. `skill.validateAttempt` succeeded.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useSpellOrWeaponskill(skill: Spell<PlayerState> | Weaponskill<PlayerState>, node: ActionNode) {
		const cd = this.cooldowns.get(skill.cdName);
		const secondaryCd = skill.secondaryCd ? this.cooldowns.get(skill.secondaryCd.cdName) : undefined

		// TODO refactor logic to determine self-buffs
		let llCovered = this.job === ShellJob.BLM && this.hasResourceAvailable(ResourceType.LeyLines);
		const fukaCovered = this.job === ShellJob.SAM && this.hasResourceAvailable(ResourceType.Fuka);
		const fugetsuCovered = this.job === ShellJob.SAM && this.hasResourceAvailable(ResourceType.Fugetsu);
		const inspireSkills: SkillName[] = [
			SkillName.FireInRed,
			SkillName.Fire2InRed,
			SkillName.AeroInGreen,
			SkillName.Aero2InGreen,
			SkillName.WaterInBlue,
			SkillName.Water2InBlue,
			SkillName.HolyInWhite,
			SkillName.BlizzardInCyan,
			SkillName.Blizzard2InCyan,
			SkillName.StoneInYellow,
			SkillName.Stone2InYellow,
			SkillName.ThunderInMagenta,
			SkillName.Thunder2InMagenta,
			SkillName.CometInBlack,
			SkillName.StarPrism,
		];
		let inspired = this.job === ShellJob.PCT && this.resources.get(ResourceType.Inspiration).available(1) && inspireSkills.includes(skill.name);
		let capturedCastTime = skill.castTimeFn(this);
		const recastTime = skill.recastTimeFn(this);
		if (llCovered && skill.cdName === ResourceType.cd_GCD) {
			node.addBuff(BuffType.LeyLines);
		}
		if (inspired) {
			node.addBuff(BuffType.Hyperphantasia);
		}
		if (fukaCovered && skill.cdName === ResourceType.cd_GCD) {
			node.addBuff(BuffType.Fuka);
		}
		if (fugetsuCovered) {
			node.addBuff(BuffType.Fugetsu);
		}

		// create potency node object (snapshotted buffs will populate on confirm)
		const potencyNumber = skill.potencyFn(this);
		let potency: Potency | undefined = undefined;
		// Potency object for DoT effects was already created separately
		if (skill.aspect === Aspect.Lightning || skill.name === SkillName.Higanbana) {
			potency = node.getPotencies()[0];
		} else if (potencyNumber > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: undefined,
				description: "",
			});
			node.addPotency(potency);
		}

		/**
		 * Perform operations common to casting a spell (consuming mana, rolling the GCD).
		 *
		 * This should be called at the timestamp of the cast confirm window.
		 *
		 * Also snapshot potencies and enqueue the spell application event.
		 */
		const onSpellConfirm = () => {
			// actually deduct MP
			// special cases like Flare/Despair should set their base MP to 0 and perform
			// this deduction in their onCapture function
			// note that MP costs are re-checked at the end of the cast bar: notably, if enochian
			// drops in the middle of a an AF3 B3 cast, the spell will cost mana; this also applies
			// to WHM Thin Air and SCH Recitation if the buffs fall off mid-cast
			let manaCost = skill.manaCostFn(this);
			if (manaCost > this.resources.get(ResourceType.Mana).availableAmount()) {
				controller.reportInterruption({
					failNode: node,
				});
			} else if (manaCost > 0) {
				this.resources.get(ResourceType.Mana).consume(manaCost);
			}

			// potency
			if (potency) {
				potency.snapshotTime = this.getDisplayTime();
				const mods: PotencyModifier[] = [];
				if (this.hasResourceAvailable(ResourceType.Tincture)) {
					mods.push(Modifiers.Tincture);
				}
				mods.push(...skill.jobPotencyModifiers(this));
				potency.modifiers = mods;
			}

			const doesDamage = skill.potencyFn(this) > 0;

			// TODO automate buff covers
			// tincture
			if (this.hasResourceAvailable(ResourceType.Tincture) && doesDamage) {
				node.addBuff(BuffType.Tincture);
			}

			if (this.job === ShellJob.PCT && this.hasResourceAvailable(ResourceType.StarryMuse) && doesDamage) {
				node.addBuff(BuffType.StarryMuse);
			}

			if (this.job === ShellJob.RDM && doesDamage) {
				if (this.hasResourceAvailable(ResourceType.Embolden) && skill.aspect !== Aspect.Physical) {
					node.addBuff(BuffType.Embolden);
				}
				if (this.hasResourceAvailable(ResourceType.Manafication)) {
					node.addBuff(BuffType.Manafication);
				}
				if (skill.name === SkillName.Impact && this.hasResourceAvailable(ResourceType.Acceleration)) {
					node.addBuff(BuffType.Acceleration);
				}
			}

			if (this.job === ShellJob.DNC && doesDamage) {
				if (this.hasResourceAvailable(ResourceType.TechnicalFinish)) {
					node.addBuff(BuffType.TechnicalFinish)
				}
				if (this.hasResourceAvailable(ResourceType.Devilment)) {
					node.addBuff(BuffType.Devilment)
				}
			}

			if (this.job === ShellJob.SAM && doesDamage
				&& this.hasResourceAvailable(ResourceType.EnhancedEnpi)
				&& skill.name === SkillName.Enpi) {
				node.addBuff(BuffType.EnhancedEnpi);
			}

			// Perform additional side effects
			skill.onConfirm(this, node);

			// Enqueue effect application
			this.addEvent(new Event(
				skill.name + " applied",
				skill.applicationDelay,
				() => {
					if (potency) {
						controller.resolvePotency(potency);
					}
					skill.onApplication(this, node);
				}
			));

			if (potency) {
				this.resources.addResourceEvent({
					rscType: ResourceType.InCombat,
					name: "begin combat if necessary",
					delay: skill.applicationDelay,
					fnOnRsc: (rsc: Resource) => rsc.gain(1),
				});
			}
		};

		const isInstant = capturedCastTime === 0 || skill.isInstantFn(this);
		if (isInstant) {
			this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.getSkillAnimationLock(skill.name));
			// Immediately do confirmation (no need to validate again)
			onSpellConfirm();
		} else {
			// movement lock
			this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));
			// caster tax
			this.resources.takeResourceLock(ResourceType.NotCasterTaxed, this.config.getAfterTaxCastTime(capturedCastTime));
			const timeToConfirmation = capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime)
			// Enqueue confirm event
			this.addEvent(new Event(skill.name + " captured", timeToConfirmation, () => {
				// TODO propagate error more cleanly
				if (skill.validateAttempt(this)) {
					onSpellConfirm();
				} else {
					controller.reportInterruption({
						failNode: node,
					});
				}
			}));
		}
		// recast
		cd.useStackWithRecast(this, this.config.getAfterTaxGCD(recastTime));
		if (secondaryCd) {
			secondaryCd.useStack(this);
		}
	}

	/**
	 * Attempt to use an ability. Assumes that resources for the ability are currently available,
	 * i.e. `skill.validateAttempt` succeeded.
	 *
	 * Because abilities have no cast time, this function snapshots potencies and enqueues the
	 * application event immediately.
	 */
	useAbility(skill: Ability<PlayerState>, node: ActionNode) {
		console.assert(node);
		let cd = this.cooldowns.get(skill.cdName);

		// potency
		const potencyNumber = skill.potencyFn(this);
		let potency : Potency | undefined = undefined;
		if (potencyNumber > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: this.getDisplayTime(),
				description: "",
			});
			const mods: PotencyModifier[] = [];
			if (this.hasResourceAvailable(ResourceType.Tincture)) {
				mods.push(Modifiers.Tincture);
			}
			mods.push(...skill.jobPotencyModifiers(this));
			potency.modifiers = mods;
			node.addPotency(potency);
		}

		// TODO automate buff covers
		// tincture
		if (this.hasResourceAvailable(ResourceType.Tincture) && potencyNumber > 0) {
			node.addBuff(BuffType.Tincture);
		}

		// starry muse
		if (this.job === ShellJob.PCT && this.resources.get(ResourceType.StarryMuse).available(1) && potencyNumber > 0) {
			node.addBuff(BuffType.StarryMuse);
		}

		if (this.job === ShellJob.RDM
			&& this.hasResourceAvailable(ResourceType.Embolden)
			&& potencyNumber > 0
			&& skill.aspect !== Aspect.Physical) {
			node.addBuff(BuffType.Embolden);
		}

		if (this.job === ShellJob.DNC && potencyNumber > 0) {
			if (this.hasResourceAvailable(ResourceType.TechnicalFinish)) {
				node.addBuff(BuffType.TechnicalFinish)
			}
			if (this.hasResourceAvailable(ResourceType.Devilment)) {
				node.addBuff(BuffType.Devilment)
			}
		}

		if (this.job === ShellJob.SAM && potencyNumber > 0 && this.hasResourceAvailable(ResourceType.Fugetsu)) {
			node.addBuff(BuffType.Fugetsu);
		}

		skill.onConfirm(this, node);

		if (potency) {
			this.resources.addResourceEvent({
				rscType: ResourceType.InCombat,
				name: "begin combat if necessary",
				delay: skill.applicationDelay,
				fnOnRsc: (rsc: Resource) => rsc.gain(1),
			});
		}

		if (skill.applicationDelay > 0) {
			this.addEvent(new Event(
				skill.name + " applied",
				skill.applicationDelay,
				() => {
					if (potency) controller.resolvePotency(potency);
					skill.onApplication(this, node);
				}
			));
		} else {
			if (potency) controller.resolvePotency(potency);
			skill.onApplication(this, node);
		}

		// recast
		cd.useStack(this);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.getSkillAnimationLock(skill.name));
	}

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.cdName;
		const secondaryCd = skill.secondaryCd?.cdName
		let tillAnyCDStack = this.cooldowns.timeTillAnyStackAvailable(cdName);
		if (secondaryCd) {
			tillAnyCDStack = Math.max(tillAnyCDStack, this.cooldowns.timeTillAnyStackAvailable(secondaryCd));
		}
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

	hasResourceAvailable(rscType: ResourceType, atLeast?: number): boolean {
		return this.resources.get(rscType).available(atLeast ?? 1);
	}

	// Add a resource drop event after `delay` seconds.
	// If `rscType` has a corresponding cooldown duration for the job, then that delay will be
	// used if `rscType` is undefined.
	enqueueResourceDrop(
		rscType: ResourceType,
		delay?: number,
		toConsume?: number,
	) {
		if (delay === undefined) {
			const rscInfo = getResourceInfo(this.job, rscType) as ResourceInfo;
			console.assert(rscInfo?.maxTimeout, `could not find timeout declaration for resource ${rscType}`)
			delay = rscInfo.maxTimeout;
		}
		const name = (toConsume === undefined ? "drop all " : `drop ${toConsume} `) + rscType;
		// Cancel any existing timers
		this.resources.get(rscType).removeTimer();
		this.resources.addResourceEvent({
			rscType: rscType,
			name: name,
			delay: delay,
			fnOnRsc: (rsc: Resource) => {
				rsc.consume(toConsume ?? rsc.availableAmount());
				// Make sure the timer is canceled to avoid this warning
				const rscInfo = getResourceInfo(this.job, rsc.type) as ResourceInfo;
				if (rscInfo.warningOnTimeout) {
					controller.reportWarning(rscInfo.warningOnTimeout);
				}
			}
		})
	}

	timeTillNextMpGainEvent() {
		let foundEvt = this.findNextQueuedEventByTag(EventTag.ManaGain);
		return foundEvt ? foundEvt.timeTillEvent : 0;
	}

	timeTillNextDamageEvent() {
		// Find when the next damage event is. Used to block starry + striking muse when out of combat.
		return this.resources.timeTillReady(ResourceType.InCombat);
	}

	getSkillAvailabilityStatus(skillName: SkillName, primaryRecastOnly: boolean = false): SkillButtonViewInfo {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.name);
		let capturedManaCost = skill.manaCostFn(this);
		let llCovered = this.job === ShellJob.BLM && this.resources.get(ResourceType.LeyLines).available(1);
		let capturedCastTime = skill.kind === "weaponskill" || skill.kind === "spell" ? skill.castTimeFn(this) : 0;
		let instantCastAvailable = capturedCastTime === 0 || skill.kind === "ability" || skill.isInstantFn(this);
		let currentMana = this.resources.get(ResourceType.Mana).availableAmount();
		let notBlocked = timeTillAvailable <= Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana;
		let reqsMet = skill.validateAttempt(this);
		let skillUnlocked = this.config.level >= skill.unlockLevel;
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!skillUnlocked) status = SkillReadyStatus.SkillNotUnlocked;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;

		// Special case for skills that require being in combat
		if (([
			SkillName.StrikingMuse,
			SkillName.StarryMuse,
			SkillName.Manafication,
			SkillName.Ikishoten,
		] as SkillName[]).includes(skillName) && status === SkillReadyStatus.RequirementsNotMet) {
			status = SkillReadyStatus.NotInCombat;
			timeTillAvailable = this.timeTillNextDamageEvent();
		}

		let cd = this.cooldowns.get(skill.cdName);
		const secondaryCd = skill.secondaryCd ? this.cooldowns.get(skill.secondaryCd.cdName) : undefined;
		let timeTillNextStackReady = this.cooldowns.timeTillNextStackAvailable(skill.cdName);
		const timeTillSecondaryReady = skill.secondaryCd ? this.cooldowns.timeTillNextStackAvailable(skill.secondaryCd.cdName) : 0
		let cdRecastTime = cd.currentStackCd();
		// special case for meditate: if meditate is off CD, use the GCD cooldown instead if it's rolling
		// this fails the edge case where a GCD is pressed ~58 seconds after meditate was last pressed
		// and meditate would become available in the middle of the CD
		if (skillName === SkillName.Meditate && timeTillNextStackReady === 0) {
			const gcd = this.cooldowns.get(ResourceType.cd_GCD);
			const gcdRecastTime = gcd.currentStackCd();
			if (gcd.timeTillNextStackAvailable() > timeTillNextStackReady) {
				cd = gcd;
				cdRecastTime = gcdRecastTime;
				timeTillNextStackReady = gcd.timeTillNextStackAvailable();
				timeTillAvailable = timeTillNextStackReady;
			}
		}
		const primaryStacksAvailable = cd.stacksAvailable();
		const primaryMaxStacks = cd.maxStacks();

		let secondaryRecastTime = secondaryCd?.currentStackCd() ?? 0

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

		const secondaryStacksAvailable = secondaryCd?.stacksAvailable() ?? 0
		const secondaryMaxStacks = secondaryCd?.maxStacks() ?? 0
		// conditions that make the skills show proc
		const highlight = skill.highlightIf(this);
		return {
			skillName: skill.name,
			status: status,
			stacksAvailable: secondaryMaxStacks > 0 ? secondaryStacksAvailable : primaryStacksAvailable,
			maxStacks: Math.max(primaryMaxStacks, secondaryMaxStacks),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: primaryRecastOnly ? cdRecastTime : Math.max(cdRecastTime, secondaryRecastTime),
			timeTillNextStackReady: Math.max(timeTillNextStackReady, timeTillSecondaryReady),
			timeTillAvailable: timeTillAvailable,
			timeTillDamageApplication: timeTillDamageApplication,
			capturedManaCost: capturedManaCost,
			highlight: highlight,
			llCovered: llCovered
		};
	}

	useSkill(skillName: SkillName, node: ActionNode) {
		let skill = this.skillsList.get(skillName);
		if (skill.kind === "spell" || skill.kind === "weaponskill") {
			this.useSpellOrWeaponskill(skill, node);
		} else if (skill.kind === "ability") {
			this.useAbility(skill, node);
		}
	}

	getPartyBuffs(time: number) {
		const buffCollection = new Map<BuffType, PotencyModifier>();
		const buffMarkers = controller.timeline.getBuffMarkers();
		buffMarkers.filter(marker => {
			return marker.time <= time && (marker.time + marker.duration) >= time;
		}).forEach(marker => {
			const buff = new Buff(marker.description as BuffType);
			if (!buffCollection.has(buff.name)) {
				// Assume all buffs are either crit/DH multipliers, or flat damage multipliers,
				// but not both. This is currently true for all party buffs in the game.
				if (buff.info.damageFactor === 1) {
					buffCollection.set(buff.name, {
						kind: "critDirect",
						source: PotencyModifierType.PARTY, 
						buffType: buff.name,
						critFactor: buff.info.critBonus,
						dhFactor: buff.info.dhBonus,
					});
				} else {
					buffCollection.set(buff.name, {
						kind: "multiplier",
						source: PotencyModifierType.PARTY,
						buffType: buff.name,
						damageFactor: buff.info.damageFactor,
					});
				}
			}
		})

		return buffCollection;
	}

	// Attempt to consume stacks of the specified resource, removing any active timers if
	// all stacks have been consumed.
	// Consumes only 1 stack by default; consumes all available stacks when `consumeAll` is set.
	tryConsumeResource(rscType: ResourceType, consumeAll: boolean = false) {
		const resource = this.resources.get(rscType);
		const toConsume = consumeAll ? resource.availableAmount() : 1;
		if (resource.available(toConsume)) {
			resource.consume(toConsume);
			if (!resource.available(toConsume)) {
				resource.removeTimer();
			}
			return true;
		}
		return false;
	}

	// Attempt to set a combo counter to a specific value, and reset its timer to 30 seconds.
	// If `newValue` is 0, then any existing timers will be canceled.
	setComboState(rscType: ResourceType, newValue: number) {
		if (newValue === 0) {
			this.tryConsumeResource(rscType, true);
		} else {
			this.resources.get(rscType).overrideCurrentValue(newValue);
			this.enqueueResourceDrop(rscType, 30);
		}
	}

	isInCombat() {
		return this.hasResourceAvailable(ResourceType.InCombat);
	}

	// These methods enforce type specialization so we can avoid some casts on the frontend
	isBLMState(): this is BLMState {
		return this.job === ShellJob.BLM;
	}

	isSAMState(): this is SAMState {
		return this.job === ShellJob.SAM;
	}
}

// TODO if we ever support multiple jobs running in parallel, then we will need to move a lot of
// elements out onto per-player state.
// This type alias is placed here for now to make this possible future refactor easier.
export type PlayerState = GameState;