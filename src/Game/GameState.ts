import {
	Aspect,
	BuffType,
	Debug,
	makeSkillReadyStatus,
	ProcMode,
	SkillUnavailableReason,
} from "./Common";
import { GameConfig } from "./GameConfig";
import {
	Ability,
	DisplayedSkills,
	FAKE_SKILL_ANIMATION_LOCK,
	LimitBreak,
	Skill,
	SkillsList,
	Spell,
	Weaponskill,
} from "./Skills";
import {
	CoolDown,
	CoolDownState,
	DoTBuff,
	Event,
	EventTag,
	getAllResources,
	getResourceInfo,
	Resource,
	ResourceInfo,
	ResourceState,
} from "./Resources";

import { controller } from "../Controller/Controller";
import { ActionNode } from "../Controller/Record";
import { Modifiers, Potency, PotencyModifier, PotencyModifierType } from "./Potency";
import { Buff } from "./Buffs";

import type { BLMState } from "./Jobs/BLM";
import { SkillButtonViewInfo } from "../Components/Skills";
import { ReactNode } from "react";
import { localizeResourceType } from "../Components/Localization";
import { ShellJob, HEALER_JOBS, CASTER_JOBS, JOBS } from "./Data/Jobs";
import { ActionKey, CooldownKey, ResourceKey, RESOURCES, TraitKey } from "./Data";
import { hasUnlockedTrait } from "../utilities";
import { StatusPropsGenerator } from "../Components/StatusDisplay";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require("seedrandom");

type RNG = any;

export interface DoTSkillRegistration {
	dotName: ResourceKey;
	appliedBy: ActionKey[];
	isGroundTargeted?: true;
	exclude?: boolean; // Exclude from standard DoT tick handling (Flamethrower)
}
export interface DoTRegistrationGroup {
	reportName?: ReactNode;
	groupedDots: DoTSkillRegistration[];
}

export interface DoTPotencyProps {
	node: ActionNode;
	skillName: ActionKey;
	dotName: ResourceKey;
	tickPotency: number;
	tickFrequency?: number;
	speedStat: "sks" | "sps";
	aspect?: Aspect;
	modifiers?: PotencyModifier[];
}

// GameState := resources + events queue
export class GameState {
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	lucidTickOffset: number;
	dotTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList<GameState>;
	displayedSkills: DisplayedSkills;

	dotGroups: DoTRegistrationGroup[] = [];
	dotResources: ResourceKey[] = [];
	excludedDoTs: ResourceKey[] = [];
	fullTimeDoTs: ResourceKey[] = [];
	#groundTargetDoTs: ResourceKey[] = [];
	dotSkills: ActionKey[] = [];
	#exclusiveDots: Map<ResourceKey, ResourceKey[]> = new Map();

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = new SeedRandom(config.randomSeed);
		this.nonProcRng = new SeedRandom(config.randomSeed + "_nonProcs");
		this.lucidTickOffset = this.nonProcRng() * 3.0;
		this.dotTickOffset = this.nonProcRng() * 3.0;

		// TIME (raw time which starts at 0 regardless of countdown)
		this.time = 0;

		// RESOURCES (checked when using skills)
		// and skill CDs (also a form of resource)
		this.resources = new ResourceState(this);
		this.cooldowns = new CoolDownState(this);
		getAllResources(this.job).forEach((info, rsc) => {
			if (info.isCoolDown) {
				// always start cooldowns at their max stacks (overrides will be applied later)
				this.cooldowns.set(
					new CoolDown(
						rsc as CooldownKey,
						info.cdPerStack,
						info.maxStacks,
						info.maxStacks,
					),
				);
			} else {
				this.resources.set(
					new Resource(rsc as ResourceKey, info.maxValue, info.defaultValue),
				);
			}
		});
		// GCD, movement, and animation locks are treated as special since they do not appear
		// in resource overrides
		let adjustedGCD = 2.5;
		switch (JOBS[this.job].role) {
			case "TANK":
			case "MELEE":
			case "RANGED":
				adjustedGCD = config.adjustedSksGCD();
				break;
			case "HEALER":
			case "CASTER":
				adjustedGCD = config.adjustedGCD();
				break;
		}
		this.cooldowns.set(new CoolDown("cd_GCD", config.getAfterTaxGCD(adjustedGCD), 1, 1));

		this.resources.set(new Resource("MOVEMENT", 1, 1));
		this.resources.set(new Resource("NOT_ANIMATION_LOCKED", 1, 1));
		this.resources.set(new Resource("NOT_CASTER_TAXED", 1, 1));
		// begin the encounter not in combat by default
		this.resources.set(new Resource("IN_COMBAT", 1, 0));

		this.cooldowns.set(new CoolDown("NEVER", 0, 0, 0)); // dummy cooldown for invalid skills

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

	get statusPropsGenerator(): StatusPropsGenerator<PlayerState> {
		return new StatusPropsGenerator(this);
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
	protected registerRecurringEvents(dotGroups: DoTRegistrationGroup[] = []) {
		let game = this;
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			let recurringManaRegen = () => {
				// mana regen
				let mana = this.resources.get("MANA");
				let gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				let currentAmount = mana.availableAmount();
				controller.reportManaTick(
					game.time,
					"+" + gainAmount + " (MP=" + currentAmount + ")",
				);
				// queue the next tick
				this.resources.addResourceEvent({
					rscType: "MANA",
					name: "mana tick",
					delay: 3,
					fnOnRsc: (rsc) => {
						recurringManaRegen();
					},
					// would ideally want to only have ManaGain tag if there's no AF... too much work for now
					tags: [EventTag.MpTick, EventTag.ManaGain],
				});
			};
			this.resources.addResourceEvent({
				rscType: "MANA",
				name: "initial mana tick",
				delay: this.config.timeTillFirstManaTick,
				fnOnRsc: recurringManaRegen,
				// would ideally want to only have ManaGain tag if there's no AF... too much work for now
				tags: [EventTag.MpTick, EventTag.ManaGain],
			});
		}

		// lucid ticks
		let recurringLucidTick = () => {
			// do work at lucid tick
			let lucid = this.resources.get("LUCID_DREAMING") as DoTBuff;
			if (lucid.available(1)) {
				lucid.tickCount++;
				if (!(this.isBLMState() && this.getFireStacks() > 0)) {
					// Block lucid ticks for BLM in fire
					let mana = this.resources.get("MANA");
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
			let firstLucidTickEvt = new Event(
				"initial lucid tick",
				timeTillFirstLucidTick,
				recurringLucidTick,
			);
			firstLucidTickEvt.addTag(EventTag.LucidTick);
			this.addEvent(firstLucidTickEvt);
		}

		let recurringDotTick = () => {
			this.dotResources
				.filter((dotResource) => !this.excludedDoTs.includes(dotResource))
				.forEach((dotResource) => this.handleDoTTick(dotResource));

			// increment count
			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time);
			}

			// queue the next tick
			this.addEvent(
				new Event("DoT tick", 3, () => {
					recurringDotTick();
				}),
			);
		};
		dotGroups.forEach((dotGroup) => {
			dotGroup.groupedDots.forEach((registeredDot) => {
				if (!this.dotResources.includes(registeredDot.dotName)) {
					this.dotResources.push(registeredDot.dotName);
					registeredDot.appliedBy.forEach((dotSkill) => {
						if (!this.dotSkills.includes(dotSkill)) {
							this.dotSkills.push(dotSkill);
						}
					});
					this.#exclusiveDots.set(
						registeredDot.dotName,
						dotGroup.groupedDots
							.filter((dot) => dot !== registeredDot)
							.map((dot) => dot.dotName),
					);

					// Keep track of DoTs that are ground targeted, so we can handle their special on-application tick
					if (
						registeredDot.isGroundTargeted &&
						!this.#groundTargetDoTs.includes(registeredDot.dotName)
					) {
						this.#groundTargetDoTs.push(registeredDot.dotName);
					}

					// Keep track of which DoTs are going to be handled separately from the main DoT tick
					if (
						registeredDot.exclude &&
						!this.excludedDoTs.includes(registeredDot.dotName)
					) {
						this.excludedDoTs.push(registeredDot.dotName);
					}

					// Keep track of which DoTs we have a reportName label for, meaning the job wants an uptime report for them
					if (dotGroup.reportName && !this.fullTimeDoTs.includes(registeredDot.dotName)) {
						this.fullTimeDoTs.push(registeredDot.dotName);
					}
				} else {
					console.assert(
						false,
						`${registeredDot.dotName} was registered as a dot multiple times for ${this.job}`,
					);
				}
			});
		});
		this.dotGroups = dotGroups;
		let timeTillFirstDotTick = this.config.timeTillFirstManaTick + this.dotTickOffset;
		while (timeTillFirstDotTick > 3) timeTillFirstDotTick -= 3;
		this.addEvent(new Event("initial DoT tick", timeTillFirstDotTick, recurringDotTick));

		this.jobSpecificRegisterRecurringEvents();
	}

	// Job code may override to handle setting up any job-specific recurring events, such as BLM's Polyglot timer
	jobSpecificRegisterRecurringEvents() {}

	// Job code may override to handle any on-tick effects of a DoT, like pre-Dawntrail Thundercloud
	jobSpecificOnResolveDotTick(_dotResource: ResourceKey) {}

	// Job code may override to handle adding buff covers for the timeline
	jobSpecificAddDamageBuffCovers(_node: ActionNode, _skill: Skill<PlayerState>) {}
	jobSpecificAddSpeedBuffCovers(_node: ActionNode, _skill: Skill<PlayerState>) {}

	maybeCancelChanneledSkills(nextSkillName: ActionKey) {
		const nextSkill = this.skillsList.get(nextSkillName);

		// Bail if we don't actually have this skill defined for this job
		if (!nextSkill) {
			return;
		}

		// If the next action is a fake action, don't actually cancel, the player didn't really do anything
		if (nextSkill.animationLockFn(this) <= FAKE_SKILL_ANIMATION_LOCK) {
			return;
		}

		// Now that we know it's a real skill for this job, go ahead and cancel any of the jobs channeled skills
		this.cancelChanneledSkills();
	}

	// Job code may override to handle cancelling any of their channeled skills
	cancelChanneledSkills() {}

	getStatusDuration(rscType: ResourceKey): number {
		return (getResourceInfo(this.job, rscType) as ResourceInfo).maxTimeout;
	}

	gainStatus(rscType: ResourceKey, stacks: number = 1) {
		const resource = this.resources.get(rscType);
		const resourceInfo = getResourceInfo(this.job, rscType) as ResourceInfo;
		if (this.hasResourceAvailable(rscType)) {
			if (resourceInfo.maxTimeout > 0) {
				resource.overrideTimer(this, resourceInfo.maxTimeout);
			}
			if (resource.availableAmount() !== stacks) {
				resource.overrideCurrentValue(stacks);
			}
		} else {
			resource.gain(stacks);
			if (resourceInfo.maxTimeout > 0) {
				this.enqueueResourceDrop(rscType);
			}
		}
	}

	maybeGainProc(proc: ResourceKey, chance: number = 0.5) {
		if (!this.triggersEffect(chance)) {
			return;
		}

		this.gainStatus(proc);
	}

	triggersEffect(chance: number): boolean {
		if (this.config.procMode === ProcMode.Never) {
			return false;
		}
		if (this.config.procMode === ProcMode.Always) {
			return true;
		}

		const rand = this.rng();
		return rand < chance;
	}

	handleDoTTick(dotResource: ResourceKey) {
		const dotBuff = this.resources.get(dotResource) as DoTBuff;
		if (dotBuff.availableAmountIncludingDisabled() > 0) {
			// For floor dots that are toggled off, don't resolve its potency but do
			// advance the tickCount.
			if (dotBuff.node && dotBuff.enabled) {
				const p = dotBuff.node.getDotPotencies(dotResource)[dotBuff.tickCount];
				controller.resolvePotency(p);
				this.jobSpecificOnResolveDotTick(dotResource);
			}
			dotBuff.tickCount++;
		} else {
			// If the dot buff has expired and was not simply toggled off, then remove
			// all future dot tick potencies.
			if (dotBuff.node) {
				dotBuff.node.removeUnresolvedDoTPotencies();
				dotBuff.node = undefined;
			}
		}
	}

	// advance game state by this much time
	tick(
		deltaTime: number,
		prematureStopCondition = () => {
			return false;
		},
	) {
		//======== events ========
		let cumulativeDeltaTime = 0;
		while (
			cumulativeDeltaTime < deltaTime &&
			this.eventsQueue.length > 0 &&
			!prematureStopCondition()
		) {
			// make sure events are in proper order (qol: optimize using a priority queue...)
			this.eventsQueue.sort((a, b) => {
				return a.timeTillEvent - b.timeTillEvent;
			});

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(
				deltaTime - cumulativeDeltaTime,
				this.eventsQueue[0].timeTillEvent,
			);
			cumulativeDeltaTime = Math.min(cumulativeDeltaTime + timeToTick, deltaTime);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);
			if (Debug.consoleLogEvents)
				console.log("====== tick " + timeToTick + " now at " + this.time);

			// make a deep copy of events to advance for this round...
			const eventsToExecuteOld = [];
			for (let i = 0; i < this.eventsQueue.length; i++) {
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			let executedEvents = 0;
			eventsToExecuteOld.forEach((e) => {
				e.timeTillEvent -= timeToTick;
				if (Debug.consoleLogEvents) console.log(e.name + " in " + e.timeTillEvent);
				if (e.timeTillEvent <= Debug.epsilon) {
					if (!e.canceled) {
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
		return this.time - this.config.countdown;
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
		if (this.job === "BLM" && this.hasResourceAvailable("LEY_LINES")) {
			// should be approximately 0.85
			const num = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5, 15));
			const denom = this.config.getAfterTaxGCD(this.config.adjustedGCD(2.5));
			return num / denom;
		} else {
			return 1;
		}
	}

	requestToggleBuff(buffName: ResourceKey) {
		let rsc = this.resources.get(buffName);
		// Ley lines, paint lines, and positionals can be toggled.
		if (RESOURCES[buffName].mayBeToggled) {
			if (rsc.available(1)) {
				// buff exists and enabled
				rsc.enabled = false;
				return true;
			} else {
				// currently nothing happens if trying to toggle a buff that isn't applied
				rsc.enabled = true;
				return true;
			}
		} else if (RESOURCES[buffName].mayNotBeCanceled) {
			// subtractive spectrum, starstruck, monochrome tones, rainbow drip,
			// tempera coat/grassa, smudge can be clicked off
			// but these buffs cannot be
			return true;
		} else {
			// All other buffs are outright canceled.
			// Special case for meditate: cancel future meditate ticks (assume only one active event).
			if (buffName === "MEDITATE") {
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
		const secondaryCd = skill.secondaryCd
			? this.cooldowns.get(skill.secondaryCd.cdName)
			: undefined;

		let capturedCastTime = skill.castTimeFn(this);
		const recastTime = skill.recastTimeFn(this);

		this.jobSpecificAddSpeedBuffCovers(node, skill);

		// create potency node object (snapshotted buffs will populate on confirm)
		const potencyNumber = skill.potencyFn(this);

		// See if the initial potency was already created
		let potency: Potency | undefined = node.getInitialPotency();
		// If it was not, and this action is supposed to do damage, go ahead and add it now
		// If the skill draws aggro without dealing damage (such as Summon Bahamut), then
		// create a potency object so a damage mark can be drawn if we're not already in combat.
		if (!potency && (potencyNumber > 0 || (skill.drawsAggro && !this.isInCombat()))) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: undefined,
				description: "",
				targetCount: node.targetCount,
				falloff: skill.falloff,
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
			if (manaCost > this.resources.get("MANA").availableAmount()) {
				controller.reportInterruption({
					failNode: node,
				});
			} else if (manaCost > 0) {
				this.resources.get("MANA").consume(manaCost);
			}

			const doesDamage = potencyNumber > 0;
			// Skills that draw aggro (Provoke, Summon Bahamut) should generate a snapshot time
			// but no modifiers.
			if (potency) {
				potency.snapshotTime = this.getDisplayTime();
				if (doesDamage) {
					const mods: PotencyModifier[] = [];
					if (this.hasResourceAvailable("TINCTURE")) {
						mods.push(Modifiers.Tincture);
					}
					mods.push(...skill.jobPotencyModifiers(this));
					potency.modifiers = mods;
				}
			}

			if (doesDamage) {
				// tincture
				if (this.hasResourceAvailable("TINCTURE")) {
					node.addBuff(BuffType.Tincture);
				}

				this.jobSpecificAddDamageBuffCovers(node, skill);
			}

			// Perform additional side effects
			skill.onConfirm(this, node);

			// Enqueue effect application
			this.addEvent(
				new Event(skill.name + " applied", skill.applicationDelay, () => {
					if (potency) {
						controller.resolvePotency(potency);
						if (!this.hasResourceAvailable("IN_COMBAT")) {
							this.resources.get("IN_COMBAT").gain(1);
						}
					}
					skill.onApplication(this, node);
				}),
			);

			if (potency && !this.hasResourceAvailable("IN_COMBAT")) {
				const combatStart = this.resources.timeTillReady("IN_COMBAT");
				if (combatStart === 0 || combatStart > skill.applicationDelay) {
					this.resources.addResourceEvent({
						rscType: "IN_COMBAT",
						name: "begin combat if necessary",
						delay: skill.applicationDelay,
						fnOnRsc: (rsc: Resource) => {
							rsc.gain(1);
						},
					});
				}
			}
		};

		const isInstant = capturedCastTime === 0 || skill.isInstantFn(this);
		if (isInstant) {
			this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", skill.animationLockFn(this));
			// Immediately do confirmation (no need to validate again)
			onSpellConfirm();
		} else {
			// movement lock
			this.resources.takeResourceLock(
				"MOVEMENT",
				capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime),
			);
			// caster tax
			this.resources.takeResourceLock(
				"NOT_CASTER_TAXED",
				this.config.getAfterTaxCastTime(capturedCastTime),
			);
			const timeToConfirmation =
				capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime);
			// Enqueue confirm event
			this.addEvent(
				new Event(skill.name + " captured", timeToConfirmation, () => {
					// TODO propagate error more cleanly
					if (skill.validateAttempt(this)) {
						onSpellConfirm();
					} else {
						controller.reportInterruption({
							failNode: node,
						});
					}
				}),
			);
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
		let potency: Potency | undefined = undefined;
		if (potencyNumber > 0 || (skill.drawsAggro && !this.isInCombat()!)) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: this.getDisplayTime(),
				description: "",
				targetCount: node.targetCount,
				falloff: skill.falloff,
			});
		}
		if (potency && potencyNumber > 0) {
			const mods: PotencyModifier[] = [];
			if (this.hasResourceAvailable("TINCTURE")) {
				mods.push(Modifiers.Tincture);
			}
			mods.push(...skill.jobPotencyModifiers(this));
			potency.modifiers = mods;
			node.addPotency(potency);
			// tincture
			if (this.hasResourceAvailable("TINCTURE")) {
				node.addBuff(BuffType.Tincture);
			}
			this.jobSpecificAddDamageBuffCovers(node, skill);
		}

		skill.onConfirm(this, node);

		if (potency && !this.hasResourceAvailable("IN_COMBAT")) {
			const combatStart = this.resources.timeTillReady("IN_COMBAT");
			if (combatStart === 0 || combatStart > skill.applicationDelay) {
				this.resources.addResourceEvent({
					rscType: "IN_COMBAT",
					name: "begin combat if necessary",
					delay: skill.applicationDelay,
					fnOnRsc: (rsc: Resource) => {
						rsc.gain(1);
					},
				});
			}
		}

		if (skill.applicationDelay > 0) {
			this.addEvent(
				new Event(skill.name + " applied", skill.applicationDelay, () => {
					if (potency) controller.resolvePotency(potency);
					skill.onApplication(this, node);
				}),
			);
		} else {
			if (potency) controller.resolvePotency(potency);
			skill.onApplication(this, node);
		}

		// recast
		cd.useStack(this);

		// animation lock
		this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", skill.animationLockFn(this));
	}

	/**
	 * Attempt to use a limit break.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useLimitBreak(skill: LimitBreak<PlayerState>, node: ActionNode) {
		const cd = this.cooldowns.get(skill.cdName);

		const capturedCastTime = skill.castTimeFn(this);
		const slideCastTime =
			capturedCastTime > 0 ? GameConfig.getSlidecastWindow(capturedCastTime) : 0;

		// create potency node object
		const potencyNumber = skill.potencyFn(this);
		let potency: Potency | undefined = undefined;
		if (potencyNumber > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: undefined,
				description: "",
				targetCount: node.targetCount,
				falloff: skill.falloff,
			});
			node.addPotency(potency);
		}

		/**
		 * Perform operations common to casting a limit break.
		 *
		 * This should be called at the timestamp of the cast confirm window.
		 *
		 * Also enqueue the limit break application event.
		 */
		const onLimitBreakConfirm = () => {
			// Perform additional side effects
			skill.onConfirm(this, node);

			// potency
			if (potency) {
				potency.snapshotTime = this.getDisplayTime();
			}

			// Enqueue effect application
			this.addEvent(
				new Event(skill.name + " applied", skill.applicationDelay, () => {
					if (potency) {
						controller.resolvePotency(potency);
					}
					skill.onApplication(this, node);
				}),
			);

			this.resources.takeResourceLock(
				"NOT_ANIMATION_LOCKED",
				slideCastTime + skill.animationLockFn(this),
			);
		};

		const isInstant = capturedCastTime === 0;
		if (isInstant) {
			// Immediately do confirmation (no need to validate again)
			onLimitBreakConfirm();
		} else {
			// movement lock
			this.resources.takeResourceLock("MOVEMENT", capturedCastTime - slideCastTime);
			// caster tax
			this.resources.takeResourceLock(
				"NOT_CASTER_TAXED",
				this.config.getAfterTaxCastTime(capturedCastTime),
			);
			const timeToConfirmation = capturedCastTime - slideCastTime;
			// Enqueue confirm event
			this.addEvent(
				new Event(skill.name + " captured", timeToConfirmation, () => {
					// TODO propagate error more cleanly
					if (skill.validateAttempt(this)) {
						onLimitBreakConfirm();
					} else {
						controller.reportInterruption({
							failNode: node,
						});
					}
				}),
			);
		}
		// recast
		cd.useStack(this);
	}

	#timeTillSkillAvailable(skillName: ActionKey) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.cdName;
		const secondaryCd = skill.secondaryCd?.cdName;
		let tillAnyCDStack = this.cooldowns.timeTillAnyStackAvailable(cdName);
		if (secondaryCd) {
			tillAnyCDStack = Math.max(
				tillAnyCDStack,
				this.cooldowns.timeTillAnyStackAvailable(secondaryCd),
			);
		}
		return Math.max(this.timeTillAnySkillAvailable(), tillAnyCDStack);
	}

	timeTillAnySkillAvailable() {
		let tillNotAnimationLocked = this.resources.timeTillReady("NOT_ANIMATION_LOCKED");
		let tillNotCasterTaxed = this.resources.timeTillReady("NOT_CASTER_TAXED");
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	findNextQueuedEventByTag(tag: EventTag) {
		for (let i = 0; i < this.eventsQueue.length; i++) {
			let evt = this.eventsQueue[i];
			if (evt.hasTag(tag)) return evt;
		}
		return undefined;
	}

	hasResourceAvailable(rscType: ResourceKey, atLeast?: number): boolean {
		return this.resources.get(rscType).available(atLeast ?? 1);
	}

	// Add a resource drop event after `delay` seconds.
	// If `rscType` has a corresponding cooldown duration for the job, then that delay will be
	// used if `rscType` is undefined.
	enqueueResourceDrop(rscType: ResourceKey, delay?: number, toConsume?: number) {
		if (delay === undefined) {
			const rscInfo = getResourceInfo(this.job, rscType) as ResourceInfo;
			console.assert(
				rscInfo?.maxTimeout,
				`could not find timeout declaration for resource ${rscType}`,
			);
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
				rsc.consume(toConsume ?? rsc.availableAmountIncludingDisabled());
				// Make sure the timer is canceled to avoid this warning
				const rscInfo = getResourceInfo(this.job, rsc.type) as ResourceInfo;
				if (rscInfo.warningOnTimeout) {
					controller.reportWarning(rscInfo.warningOnTimeout);
				}
			},
		});
	}

	getOverriddenDots(dotName: ResourceKey): ResourceKey[] {
		return this.#exclusiveDots.get(dotName) ?? [];
	}

	applyDoT(dotName: ResourceKey, node: ActionNode) {
		const dotBuff = this.resources.get(dotName) as DoTBuff;
		const dotDuration = (getResourceInfo(this.config.job, dotName) as ResourceInfo).maxTimeout;

		let dotGap: number | undefined = undefined;
		this.getOverriddenDots(dotName).forEach((removeDot: ResourceKey) => {
			// Ignore self for the purposes of overriding other DoTs
			if (removeDot === dotName) {
				return;
			}
			if (!this.hasResourceAvailable(removeDot)) {
				const lastExpiration = this.resources.get(removeDot).getLastExpirationTime();

				// If a mutually exclusive DoT was previously applied but has fallen off, the gap is the smallest of the times since any of those DoTs expired
				if (lastExpiration) {
					const thisGap = this.getDisplayTime() - lastExpiration;
					dotGap = dotGap === undefined ? thisGap : Math.min(dotGap, thisGap);
				}
				return;
			}

			node.setDotOverrideAmount(
				dotName,
				node.getDotOverrideAmount(dotName) + this.resources.timeTillReady(removeDot),
			);
			dotGap = 0;
			this.tryConsumeResource(removeDot);
			controller.reportDotDrop(this.getDisplayTime(), removeDot);
		});

		if (dotBuff.available(1)) {
			console.assert(dotBuff.node);
			(dotBuff.node as ActionNode).removeUnresolvedDoTPotencies();
			node.setDotOverrideAmount(
				dotName,
				node.getDotOverrideAmount(dotName) + this.resources.timeTillReady(dotName),
			);
			dotBuff.overrideTimer(this, dotDuration);
		} else {
			const thisGap = this.getDisplayTime() - (dotBuff.getLastExpirationTime() ?? 0);
			dotGap = dotGap === undefined ? thisGap : Math.min(dotGap, thisGap);

			dotBuff.gain(1);
			controller.reportDotStart(this.getDisplayTime(), dotName);
			this.resources.addResourceEvent({
				rscType: dotName,
				name: "drop " + dotName + " DoT",
				delay: dotDuration,
				fnOnRsc: (rsc) => {
					rsc.consume(1);
					controller.reportDotDrop(this.getDisplayTime(), dotName);
				},
			});
		}
		node.setDotTimeGap(dotName, dotGap ?? 0);
		dotBuff.node = node;
		dotBuff.tickCount = 0;

		// Immediately tick any ground-targeted DoTs on application
		if (this.#groundTargetDoTs.includes(dotName)) {
			this.handleDoTTick(dotName);
			controller.reportDotTick(this.time, dotName);
		}
	}

	addDoTPotencies(props: DoTPotencyProps) {
		const mods: PotencyModifier[] = [];
		// If the job call didn't add Tincture, we can do that here
		if (
			this.hasResourceAvailable("TINCTURE") &&
			!(props.modifiers ?? []).includes(Modifiers.Tincture)
		) {
			mods.push(Modifiers.Tincture);
			props.node.addBuff(BuffType.Tincture);
		}

		const dotDuration = (getResourceInfo(this.config.job, props.dotName) as ResourceInfo)
			.maxTimeout;
		const isGroundTargeted = this.#groundTargetDoTs.includes(props.dotName);
		const dotTicks = dotDuration / (props.tickFrequency ?? 3) + (isGroundTargeted ? 1 : 0);

		for (let i = 0; i < dotTicks; i++) {
			let pDot = new Potency({
				config: controller.record.config ?? controller.gameConfig,
				sourceTime: this.getDisplayTime(),
				sourceSkill: props.skillName,
				aspect: props.aspect ?? Aspect.Other,
				basePotency: this.config.adjustedDoTPotency(props.tickPotency, props.speedStat),
				snapshotTime: this.getDisplayTime(),
				description:
					localizeResourceType(props.dotName) + " DoT " + (i + 1) + `/${dotTicks}`,
				targetCount: props.node.targetCount,
				falloff: 0, // assume all DoTs have no falloff
			});
			pDot.modifiers = [...mods, ...(props?.modifiers ?? [])];
			props.node.addDoTPotency(pDot, props.dotName);
		}
	}

	refreshDot(props: DoTPotencyProps) {
		if (!this.hasResourceAvailable(props.dotName)) {
			return;
		}

		this.addDoTPotencies({
			...props,
		});

		this.applyDoT(props.dotName, props.node);
	}

	timeTillNextMpGainEvent() {
		let foundEvt = this.findNextQueuedEventByTag(EventTag.ManaGain);
		return foundEvt ? foundEvt.timeTillEvent : 0;
	}

	timeTillNextDamageEvent() {
		// Find when the next damage event is. Used to block starry + striking muse when out of combat.
		return this.resources.timeTillReady("IN_COMBAT");
	}

	getSkillAvailabilityStatus(
		skillName: ActionKey,
		primaryRecastOnly: boolean = false,
	): SkillButtonViewInfo {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.name);
		let capturedManaCost = skill.manaCostFn(this);
		let llCovered = this.job === "BLM" && this.resources.get("LEY_LINES").available(1);
		let capturedCastTime =
			skill.kind === "weaponskill" || skill.kind === "spell" || skill.kind === "limitbreak"
				? skill.castTimeFn(this)
				: 0;
		let instantCastAvailable =
			capturedCastTime === 0 ||
			skill.kind === "ability" ||
			(skill.kind !== "limitbreak" && skill.isInstantFn(this)); // LBs can't be swiftcasted
		let currentMana = this.resources.get("MANA").availableAmount();
		let blocked = timeTillAvailable > Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana;
		let reqsMet = skill.validateAttempt(this);
		let skillUnlocked = this.config.level >= skill.unlockLevel;

		let status = makeSkillReadyStatus();

		if (blocked) status.addUnavailableReason(SkillUnavailableReason.Blocked);
		if (
			skill.secondaryCd &&
			this.cooldowns.get(skill.secondaryCd.cdName).stacksAvailable() === 0
		)
			status.addUnavailableReason(SkillUnavailableReason.SecondaryBlocked);
		if (!skillUnlocked) status.addUnavailableReason(SkillUnavailableReason.SkillNotUnlocked);
		if (!reqsMet) status.addUnavailableReason(SkillUnavailableReason.RequirementsNotMet);
		if (!enoughMana) status.addUnavailableReason(SkillUnavailableReason.NotEnoughMP);

		if (skill.name === "MEDITATE") {
			// Special case for Meditate
			if (
				timeTillAvailable > Debug.epsilon ||
				this.cooldowns.get("cd_GCD").timeTillNextStackAvailable() > Debug.epsilon
			) {
				// if the skill is on CD or the GCD is rolling, mark it as blocked
				const idx = status.unavailableReasons.indexOf(
					SkillUnavailableReason.RequirementsNotMet,
				);
				if (idx >= 0) status.unavailableReasons.splice(idx, 1);
				status.addUnavailableReason(SkillUnavailableReason.Blocked);
			}
		}

		// Special case for skills that require being in combat
		if (
			skill.requiresCombat &&
			status.unavailableReasons.includes(SkillUnavailableReason.RequirementsNotMet)
		) {
			status.addUnavailableReason(SkillUnavailableReason.NotInCombat);
			timeTillAvailable = this.timeTillNextDamageEvent();
		}

		let cd = this.cooldowns.get(skill.cdName);
		const secondaryCd = skill.secondaryCd
			? this.cooldowns.get(skill.secondaryCd.cdName)
			: undefined;
		let timeTillNextStackReady = this.cooldowns.timeTillNextStackAvailable(skill.cdName);
		const timeTillSecondaryReady = skill.secondaryCd
			? this.cooldowns.timeTillNextStackAvailable(skill.secondaryCd.cdName)
			: undefined;
		let cdRecastTime = cd.currentStackCd();
		// special case for meditate: if meditate is off CD, use the GCD cooldown instead if it's rolling
		// this fails the edge case where a GCD is pressed ~58 seconds after meditate was last pressed
		// and meditate would become available in the middle of the CD
		if (skillName === "MEDITATE" && timeTillNextStackReady < Debug.epsilon) {
			const gcd = this.cooldowns.get("cd_GCD");
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

		let secondaryRecastTime = secondaryCd?.currentStackCd() ?? 0;

		// to be displayed together when hovered on a skill
		let timeTillDamageApplication = 0;
		if (status.ready()) {
			// TODO, should this be changed to capturedCastTime > 0 because of stuff like Iaijutsu?
			if (skill.kind === "spell") {
				let timeTillCapture = instantCastAvailable
					? 0
					: capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime);
				timeTillDamageApplication = timeTillCapture + skill.applicationDelay;
			} else if (skill.kind === "limitbreak") {
				timeTillDamageApplication = capturedCastTime + skill.applicationDelay;
			} else {
				timeTillDamageApplication = skill.applicationDelay;
			}
		}

		const secondaryStacksAvailable = secondaryCd?.stacksAvailable() ?? 0;
		const secondaryMaxStacks = secondaryCd?.maxStacks() ?? 0;
		// conditions that make the skills show proc
		const highlight = skill.highlightIf(this);
		return {
			skillName: skill.name,
			status: status,
			stacksAvailable:
				secondaryMaxStacks > 0 ? secondaryStacksAvailable : primaryStacksAvailable,
			maxStacks: Math.max(primaryMaxStacks, secondaryMaxStacks),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: cdRecastTime,
			secondaryCdRecastTime: secondaryRecastTime,
			timeTillNextStackReady: timeTillNextStackReady,
			timeTillSecondaryReady: timeTillSecondaryReady,
			timeTillAvailable: timeTillAvailable,
			timeTillDamageApplication: timeTillDamageApplication,
			capturedManaCost: capturedManaCost,
			highlight: highlight,
			llCovered: llCovered,
		};
	}

	useSkill(skillName: ActionKey, node: ActionNode) {
		let skill = this.skillsList.get(skillName);

		// Process skill execution effects regardless of skill kind
		skill.onExecute(this, node);

		// If there is no falloff field specified, then reset the node's targetCount to 1,
		// ignoring whatever input the user gave
		if (skill.falloff === undefined) {
			node.targetCount = 1;
		}
		// Process the remainder of the skills effects dependent on the kind of skill
		if (skill.kind === "spell" || skill.kind === "weaponskill") {
			this.useSpellOrWeaponskill(skill, node);
		} else if (skill.kind === "ability") {
			this.useAbility(skill, node);
		} else if (skill.kind === "limitbreak") {
			this.useLimitBreak(skill, node);
		}
	}

	getPartyBuffs(time: number) {
		const buffCollection = new Map<BuffType, PotencyModifier>();
		const buffMarkers = controller.timeline.getBuffMarkers();
		buffMarkers
			.filter((marker) => {
				return marker.time <= time && marker.time + marker.duration >= time;
			})
			.forEach((marker) => {
				const buff = new Buff(marker.description as BuffType);
				if (!buffCollection.has(buff.name)) {
					// Assume all buffs are either crit/DH multipliers, or flat damage multipliers,
					// but not both. This is currently true for all party buffs in the game.
					if (buff.info.damageFactor === 1) {
						buffCollection.set(buff.name, {
							kind: "critDirect",
							source: PotencyModifierType.PARTY,
							buffType: buff.name,
							critBonus: buff.info.critBonus,
							dhBonus: buff.info.dhBonus,
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
			});

		return buffCollection;
	}

	// Attempt to consume stacks of the specified resource, removing any active timers if
	// all stacks have been consumed.
	// Consumes only 1 stack by default; consumes all available stacks when `consumeAll` is set.
	tryConsumeResource(rscType: ResourceKey, consumeAll: boolean = false) {
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
	setComboState(rscType: ResourceKey, newValue: number) {
		if (newValue === 0) {
			this.tryConsumeResource(rscType, true);
		} else {
			this.resources.get(rscType).overrideCurrentValue(newValue);
			this.enqueueResourceDrop(rscType, 30);
		}
	}

	hasTraitUnlocked(traitName: TraitKey) {
		return hasUnlockedTrait(traitName, this.config.level);
	}

	isInCombat() {
		return this.hasResourceAvailable("IN_COMBAT");
	}

	// These methods enforce type specialization so we can avoid some casts on the frontend
	isBLMState(): this is BLMState {
		return this.job === "BLM";
	}
}

// TODO if we ever support multiple jobs running in parallel, then we will need to move a lot of
// elements out onto per-player state.
// This type alias is placed here for now to make this possible future refactor easier.
export type PlayerState = GameState;
