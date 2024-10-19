import {Aspect, BuffType, Debug, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {GameConfig} from "./GameConfig"
import {StatsModifier} from "./StatsModifier";
import {
	DisplayedSkills,
	SkillsList,
	Spell,
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
import {ShellInfo, ShellJob} from "../Controller/Common";
import {getPotencyModifiersFromResourceState, Potency, PotencyModifier, PotencyModifierType} from "./Potency";
import {Buff} from "./Buffs";

import type {BLMState} from "./Jobs/BLM";
import {SkillButtonViewInfo} from "../Components/Skills";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;

// GameState := resources + events queue
export abstract class GameState {
	config: GameConfig;
	job: ShellJob;
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
		this.job = ShellInfo.job; // TODO make this configurable
		this.rng = new SeedRandom(config.randomSeed);
		this.nonProcRng = new SeedRandom(config.randomSeed + "_nonProcs");
		this.lucidTickOffset = this.nonProcRng() * 3.0;

		// TIME (raw time which starts at 0 regardless of countdown)
		this.time = 0;

		this.displayedSkills = new DisplayedSkills(this.job, config.level);

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
		this.cooldowns.set(new CoolDown(ResourceType.cd_GCD, config.getAfterTaxGCD(config.adjustedGCD()), 1, 1));

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
		let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
		while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
		let firstLucidTickEvt = new Event("initial lucid tick", timeTillFirstLucidTick, recurringLucidTick);
		firstLucidTickEvt.addTag(EventTag.LucidTick);
		this.addEvent(firstLucidTickEvt);
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

	captureManaRegenAmount() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	// BLM uses this for LL GCD scaling, but PCT does not
	gcdRecastTimeScale() {
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
		// only ley lines can be enabled / disabled. Everything else will just be canceled
		if (buffName === ResourceType.LeyLines || buffName === ResourceType.Inspiration) {
			if (rsc.available(1)) { // buff exists and enabled
				rsc.enabled = false;
				return true;
			} else {
				// currently nothing happens if trying to toggle a buff that isn't applied
				rsc.enabled = true;
				return true;
			}
		} else if ([
			ResourceType.HammerTime,
			ResourceType.Aetherhues,
			ResourceType.SubtractivePalette,
		].includes(buffName)) {
			// subtractive spectrum, starstruck, monochrome tones, rainbow drip,
			// tempera coat/grassa, smudge can be clicked off
			// but these buffs cannot be
			return true;
		} else {
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
			return true;
		}
	}

	/**
	 * Attempt to use a spell. Assumes that resources for the spell are currently available,
	 * i.e. `skill.validateAttempt` succeeded.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useSpell(skill: Spell<PlayerState>, node: ActionNode) {
		let cd = this.cooldowns.get(skill.cdName);
		let capturedManaCost = skill.manaCostFn(this);
		// TODO refactor logic to determine self-buffs
		let llCovered = this.job === ShellJob.BLM && this.hasResourceAvailable(ResourceType.LeyLines);
		const inspireSkills = [
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

		// create potency node object (snapshotted buffs will populate on confirm)
		const potencyNumber = skill.potencyFn(this);
		let potency: Potency | undefined = undefined;
		// Potency object for DoT effects was already created separately
		if (skill.aspect === Aspect.Lightning) {
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
			if (capturedManaCost > 0) {
				this.resources.get(ResourceType.Mana).consume(capturedManaCost);
			}

			// potency
			if (potency) {
				potency.snapshotTime = this.getDisplayTime();
				potency.modifiers = getPotencyModifiersFromResourceState(this.resources, skill.aspect);
			}

			// tincture
			if (this.hasResourceAvailable(ResourceType.Tincture) && skill.potencyFn(this) > 0) {
				node.addBuff(BuffType.Tincture);
			}

			if (this.hasResourceAvailable(ResourceType.StarryMuse) && skill.potencyFn(this) > 0) {
				node.addBuff(BuffType.StarryMuse);
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
			potency.modifiers = getPotencyModifiersFromResourceState(this.resources, skill.aspect);
			node.addPotency(potency);
		}

		// tincture
		if (this.hasResourceAvailable(ResourceType.Tincture) && potencyNumber > 0) {
			node.addBuff(BuffType.Tincture);
		}

		// starry muse
		if (this.resources.get(ResourceType.StarryMuse).available(1) && potencyNumber > 0) {
			node.addBuff(BuffType.StarryMuse);
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

	hasResourceAvailable(rscType: ResourceType, atLeast?: number): boolean {
		return this.resources.get(rscType).available(atLeast ?? 1);
	}

	// Add a resource drop event after `delay` seconds.
	// If `rscType` has a corresponding cooldown duration for the job, then that delay will be
	// used by default.
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
		this.resources.addResourceEvent({
			rscType: rscType,
			name: name,
			delay: delay,
			fnOnRsc: (rsc: Resource) => {
				rsc.consume(toConsume ?? rsc.availableAmount());
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

	getSkillAvailabilityStatus(skillName: SkillName): SkillButtonViewInfo {
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

		// Special case for striking/starry muse, which require being in combat
		if ([SkillName.StrikingMuse, SkillName.StarryMuse].includes(skillName) && status === SkillReadyStatus.RequirementsNotMet) {
			status = SkillReadyStatus.NotInCombat;
			timeTillAvailable = this.timeTillNextDamageEvent();
		}

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

		// TODO refactor out
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
		} else if (skillName === SkillName.CometInBlack) {
			// if comet is ready, it glows regardless of paint status
			highlight = this.resources.get(ResourceType.MonochromeTones).available(1);
		} else if (skillName === SkillName.HolyInWhite) {
			// holy doesn't glow if comet is ready
			highlight = !this.resources.get(ResourceType.MonochromeTones).available(1)
				&& this.resources.get(ResourceType.Paint).available(1);
		} else if (skillName === SkillName.SubtractivePalette) {
			highlight = this.resources.get(ResourceType.SubtractiveSpectrum).available(1) ||
				this.resources.get(ResourceType.PaletteGauge).available(50);
		} else if (skillName === SkillName.MogOfTheAges || skillName === SkillName.RetributionOfTheMadeen) {
			highlight = this.resources.get(ResourceType.Portrait).available(1);
		} else if (skill.aspect === Aspect.Hammer) {
			highlight = this.resources.get(ResourceType.HammerTime).available(1);
		} else if (skillName === SkillName.RainbowDrip) {
			highlight = this.resources.get(ResourceType.RainbowBright).available(1);
		} else if (skillName === SkillName.StarPrism) {
			highlight = this.resources.get(ResourceType.Starstruck).available(1);
		} else if (skillName === SkillName.TemperaGrassa || skillName === SkillName.TemperaCoatPop) {
			highlight = this.resources.get(ResourceType.TemperaCoat).available(1);
		} else if (skillName === SkillName.TemperaGrassaPop) {
			highlight = this.resources.get(ResourceType.TemperaGrassa).available(1);
		} else if ([
			SkillName.PomMuse,
			SkillName.WingedMuse,
			SkillName.ClawedMuse,
			SkillName.FangedMuse,
		].includes(skillName)) {
			highlight = this.resources.get(ResourceType.CreatureCanvas).available(1);
		} else if ([SkillName.HammerStamp, SkillName.HammerBrush, SkillName.PolishingHammer].includes(skillName)) {
			highlight = this.resources.get(ResourceType.HammerTime).available(1);
		} else if (skillName === SkillName.StrikingMuse) {
			highlight = this.resources.get(ResourceType.WeaponCanvas).available(1);
		} else if (skillName === SkillName.StarryMuse) {
			highlight = this.resources.get(ResourceType.LandscapeCanvas).available(1);
		} else if ([
			SkillName.AeroInGreen,
			SkillName.Aero2InGreen,
			SkillName.WaterInBlue,
			SkillName.Water2InBlue,
		].includes(skillName)) {
			highlight = !this.resources.get(ResourceType.SubtractivePalette).available(1);
		} else if ([
			SkillName.BlizzardInCyan,
			SkillName.Blizzard2InCyan,
			SkillName.StoneInYellow,
			SkillName.Stone2InYellow,
			SkillName.ThunderInMagenta,
			SkillName.Thunder2InMagenta,
		].includes(skillName)) {
			highlight = this.resources.get(ResourceType.SubtractivePalette).available(1);
		}

		return {
			skillName: skill.name,
			status: status,
			stacksAvailable: cd.stacksAvailable(),
			maxStacks: cd.maxStacks(),
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
		// TODO implement weaponskills
		if (skill.kind === "spell") {
			this.useSpell(skill, node);
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

	isInCombat() {
		return this.hasResourceAvailable(ResourceType.InCombat);
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

	isBLMState(): this is BLMState {
		return this.job === ShellJob.BLM;
	}
}

// TODO if we ever support multiple jobs running in parallel, then we will need to move a lot of
// elements out onto per-player state.
// This type alias is placed here for now to make this possible future refactor easier.
export type PlayerState = GameState;