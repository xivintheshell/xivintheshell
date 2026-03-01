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
	ComboPotency,
	DisplayedSkills,
	FAKE_SKILL_ANIMATION_LOCK,
	getBasePotency,
	LimitBreak,
	PositionalPotency,
	Skill,
	SkillsList,
	Spell,
	Weaponskill,
} from "./Skills";
import {
	CoolDown,
	CoolDownState,
	OverTimeBuff,
	DebuffState,
	Event,
	EventTag,
	getAllResources,
	getResourceInfo,
	Resource,
	ResourceInfo,
	ResourceState,
} from "./Resources";

import { controller } from "../Controller/Controller";
import { MAX_ABILITY_TARGETS } from "../Controller/Common";
import { skillNode, ActionNode } from "../Controller/Record";
import {
	Modifiers,
	Potency,
	PotencyKind,
	PotencyModifier,
	PotencyModifierType,
	makeComboModifier,
	makePositionalModifier,
} from "./Potency";
import { Buff } from "./Buffs";

import { SkillButtonViewInfo } from "../Components/Skills";
import { ReactNode } from "react";
import { localizeResourceType } from "../Components/Localization";
import { ShellJob, HEALER_JOBS, CASTER_JOBS, JOBS, HEALERS } from "./Data/Jobs";
import { ActionKey, CooldownKey, ResourceKey, RESOURCES, TraitKey } from "./Data";
import { hasUnlockedTrait } from "../utilities";
import { StatusPropsGenerator } from "../Components/StatusDisplay";
import { XIVMath } from "./XIVMath";

//https://www.npmjs.com/package/seedrandom
import seedrandom from "seedrandom";

type RNG = any;

export interface OverTimeSkillRegistration {
	effectName: ResourceKey;
	appliedBy: ActionKey[];
	isGroundTargeted?: true;
	exclude?: boolean; // Exclude from standard tick handling (Flamethrower)
}
export interface OverTimeRegistrationGroup {
	reportName?: ReactNode;
	groupedEffects: OverTimeSkillRegistration[];
	isHealing?: boolean;
}

export interface OverTimePotencyProps {
	node: ActionNode;
	skillName: ActionKey;
	effectName: ResourceKey;
	tickPotency: number;
	tickFrequency?: number;
	speedStat: "sks" | "sps" | "unscaled";
	aspect?: Aspect;
	modifiers?: PotencyModifier[];
	targetModifiers?: Map<number, PotencyModifier[]>;
}

// GameState := resources + events queue
export class GameState {
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	lucidTickOffset: number;
	dotTickOffset: number;
	hotTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	debuffs: DebuffState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList<GameState>;
	displayedSkills: DisplayedSkills;

	overTimeEffectGroups: OverTimeRegistrationGroup[] = [];
	dotResources: ResourceKey[] = [];
	hotResources: ResourceKey[] = [];
	excludedDoTs: ResourceKey[] = [];
	excludedHoTs: ResourceKey[] = [];
	fullTimeDoTs: ResourceKey[] = [];
	#groundTargetDoTs: ResourceKey[] = [];
	#groundTargetHoTs: ResourceKey[] = [];
	dotSkills: ActionKey[] = [];
	petSkills: ActionKey[] = [];
	hotSkills: ActionKey[] = [];
	#exclusiveDots: Map<ResourceKey, ResourceKey[]> = new Map();
	#exclusiveHots: Map<ResourceKey, ResourceKey[]> = new Map();
	autoStartTimes: number[];
	autoStopTimes: number[];
	fakeAutoActionNodes: ActionNode[] = [];

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = seedrandom(config.randomSeed);
		this.nonProcRng = seedrandom(config.randomSeed + "_nonProcs");
		this.lucidTickOffset = this.nonProcRng() * 3.0;
		this.dotTickOffset = this.nonProcRng() * 3.0;
		this.hotTickOffset = this.nonProcRng() * 3.0;

		// TIME (raw time which starts at 0 regardless of countdown)
		this.time = 0;

		// RESOURCES (checked when using skills)
		// and skill CDs (also a form of resource)
		this.resources = new ResourceState(this);
		// Debuffs are registered when the corresponding DoT status is registered.
		this.debuffs = new DebuffState(this);
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
			} else if (RESOURCES[rsc as ResourceKey].specialDebuff) {
				this.debuffs.initialize(rsc as ResourceKey);
			} else {
				this.resources.set(
					new Resource(
						rsc as ResourceKey,
						info.maxValue,
						info.defaultValue,
						info.warnOnOvercap,
					),
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

		// Tracked for compatibility with sleeposim
		this.autoStartTimes = [];
		this.autoStopTimes = [];
	}

	get statusPropsGenerator(): StatusPropsGenerator<GameState> {
		return new StatusPropsGenerator(this);
	}

	get job(): ShellJob {
		return this.config.job;
	}

	get partySize(): number {
		return this.resources.get("PARTY_SIZE").availableAmount();
	}

	/**
	 * Get mp tick, lucid tick, and class-specific recurring timers rolling. Jobs may also
	 * register a list of pet resources to be treated as DoT effects.
	 *
	 * This cannot be called by the base GameState constructor because sub-classes
	 * have not yet initialized their resource/cooldown objects. Instead, all
	 * sub-classes must explicitly call this at the end of their constructor.
	 */
	protected registerRecurringEvents(
		effectGroups: OverTimeRegistrationGroup[] = [],
		petSkills: ActionKey[] = [],
	) {
		const game = this;
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			const recurringManaRegen = () => {
				// mana regen
				const mana = this.resources.get("MANA");
				const gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				const currentAmount = mana.availableAmount();
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
		const recurringLucidTick = () => {
			// do work at lucid tick
			const lucid = this.resources.get("LUCID_DREAMING") as OverTimeBuff;
			if (lucid.available(1)) {
				lucid.tickCount++;
				if (!(this.job === "BLM" && this.hasResourceAvailable("ASTRAL_FIRE"))) {
					// Block lucid ticks for BLM in fire
					const mana = this.resources.get("MANA");
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
			const recurringLucidTickEvt = new Event("lucid tick", 3, () => {
				recurringLucidTick();
			});
			recurringLucidTickEvt.addTag(EventTag.LucidTick);
			// potentially also give mp gain tag
			if (lucid.available(1) && lucid.pendingChange) {
				const timeTillDropLucid = lucid.pendingChange.timeTillEvent;
				if (timeTillDropLucid >= 3) {
					recurringLucidTickEvt.addTag(EventTag.ManaGain);
				}
			}
			this.addEvent(recurringLucidTickEvt);
		};
		if ([...HEALER_JOBS, ...CASTER_JOBS].includes(this.job)) {
			let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
			while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
			const firstLucidTickEvt = new Event(
				"initial lucid tick",
				timeTillFirstLucidTick,
				recurringLucidTick,
			);
			firstLucidTickEvt.addTag(EventTag.LucidTick);
			this.addEvent(firstLucidTickEvt);
		}

		const recurringDotTick = () => {
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

		const recurringHotTick = () => {
			this.hotResources
				.filter((hotResource) => !this.excludedHoTs.includes(hotResource))
				.forEach((hotResource) => this.handleHoTTick(hotResource));

			// increment count
			if (this.getDisplayTime() >= 0) {
				controller.reportHotTick(this.time);
			}

			// queue the next tick
			this.addEvent(
				new Event("HoT tick", 3, () => {
					recurringHotTick();
				}),
			);
		};
		effectGroups.forEach((effectGroup) => {
			effectGroup.groupedEffects.forEach((registeredEffect) => {
				let resourceArray = this.dotResources;
				let groundTargetArray = this.#groundTargetDoTs;
				let exclusiveEffectsArray = this.#exclusiveDots;
				let excludedArray = this.excludedDoTs;

				if (effectGroup.isHealing) {
					resourceArray = this.hotResources;
					groundTargetArray = this.#groundTargetHoTs;
					exclusiveEffectsArray = this.#exclusiveHots;
					excludedArray = this.excludedHoTs;
				}

				if (!resourceArray.includes(registeredEffect.effectName)) {
					if (!registeredEffect.isGroundTargeted && !effectGroup.isHealing) {
						// Ground-target effects do not need special debuff handling, but others
						// do for uptime calculation purposes.
						this.debuffs.initialize(registeredEffect.effectName);
					}
					resourceArray.push(registeredEffect.effectName);
					registeredEffect.appliedBy.forEach((effectSkill) => {
						if (!effectGroup.isHealing && !this.dotSkills.includes(effectSkill)) {
							this.dotSkills.push(effectSkill);
						}
						if (effectGroup.isHealing && !this.hotSkills.includes(effectSkill)) {
							this.hotSkills.push(effectSkill);
						}
					});

					exclusiveEffectsArray.set(
						registeredEffect.effectName,
						effectGroup.groupedEffects
							.filter((effect) => effect !== registeredEffect)
							.map((effect) => effect.effectName),
					);

					// Keep track of effects that are ground targeted, so we can handle their special on-application tick
					if (
						registeredEffect.isGroundTargeted &&
						!groundTargetArray.includes(registeredEffect.effectName)
					) {
						groundTargetArray.push(registeredEffect.effectName);
					}

					// Keep track of which effects are going to be handled separately from the main tick
					if (
						registeredEffect.exclude &&
						!excludedArray.includes(registeredEffect.effectName)
					) {
						excludedArray.push(registeredEffect.effectName);
					}

					// Keep track of which DoTs we have a reportName label for, meaning the job wants an uptime report for them
					// Uptime report tracking is not supported for HoTs, since they should not be maintained full-time
					if (
						!effectGroup.isHealing &&
						effectGroup.reportName &&
						!this.fullTimeDoTs.includes(registeredEffect.effectName)
					) {
						this.fullTimeDoTs.push(registeredEffect.effectName);
					}
				} else {
					console.assert(
						false,
						`${registeredEffect.effectName} was registered as an over time effect multiple times for ${this.job}`,
					);
				}
			});
		});
		// Register pet summoning skills as DoTs for the purposes of damage reporting
		petSkills.forEach((skill) => {
			this.dotSkills.push(skill);
			// Hard-coded case for Wildfire because we do some jank for it
			if (skill !== "WILDFIRE") {
				this.petSkills.push(skill);
			}
		});

		this.overTimeEffectGroups = effectGroups;

		// If we registered any over time effects that tick on the standard Ticks, begin the tick recurrences
		if (this.dotResources.filter((rsc) => !this.excludedDoTs.includes(rsc)).length > 0) {
			let timeTillFirstDotTick = this.config.timeTillFirstManaTick + this.dotTickOffset;
			while (timeTillFirstDotTick > 3) timeTillFirstDotTick -= 3;
			this.addEvent(new Event("initial DoT tick", timeTillFirstDotTick, recurringDotTick));
		}
		if (this.hotResources.filter((rsc) => !this.excludedHoTs.includes(rsc)).length > 0) {
			let timeTillFirstHotTick = this.config.timeTillFirstManaTick + this.hotTickOffset;
			while (timeTillFirstHotTick > 3) timeTillFirstHotTick -= 3;
			this.addEvent(new Event("initial HoT tick", timeTillFirstHotTick, recurringHotTick));
		}

		this.jobSpecificRegisterRecurringEvents();
	}

	private onResolveOverTimeTick(effect: ResourceKey, kind: PotencyKind) {
		if (kind === "damage") {
			this.jobSpecificOnResolveDotTick(effect);
		} else {
			this.jobSpecificOnResolveHotTick(effect);
		}
	}

	// Inherent haste modifiers that are always active on the job. This is only used in GCD previews.
	inherentSpeedModifier(): number | undefined {
		return undefined;
	}

	// Job code may override to handle setting up any job-specific recurring events, such as BLM's Polyglot timer
	jobSpecificRegisterRecurringEvents() {}

	// Job code may override to handle any on-tick effects of a DoT, like pre-Dawntrail Thundercloud
	jobSpecificOnResolveDotTick(_dotResource: ResourceKey) {}
	jobSpecificOnResolveHotTick(_hotResource: ResourceKey) {}

	// Job code may override to handle adding buff covers for the timeline
	jobSpecificAddDamageBuffCovers(_node: ActionNode, _skill: Skill<GameState>) {}
	jobSpecificAddSpeedBuffCovers(_node: ActionNode, _skill: Skill<GameState>) {}
	jobSpecificAddHealingBuffCovers(_node: ActionNode, _skill: Skill<GameState>) {}

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

	// Job code may override to handle what happens on an auto attack
	jobSpecificOnAutoAttack() {}

	private onAutoAttack() {
		// Auto-attacks have a universal application delay of 0.53s.
		// This value is also currently hardcoded in RoleActions.ts
		const AUTO_DELAY = 0.53;
		const autoPotencyAmount = this.config.adjustedOvertimePotency(
			this.jobSpecificAutoBasePotency(),
			// Assume that we only care about auto-attacks for melee/ranged/tanks. If we ever
			// need to model it for casters, then we need to account for sps here.
			"sks",
		);
		const potency = new Potency({
			config: this.config,
			sourceTime: this.getDisplayTime() + AUTO_DELAY,
			sourceSkill: "ATTACK",
			aspect: Aspect.Physical,
			basePotency: autoPotencyAmount,
			snapshotTime: this.getDisplayTime(),
			description: "auto-attack",
			// For now, assume that autos always hit the first available boss.
			targetList: [1],
			falloff: undefined,
		});
		if (this.hasResourceAvailable("TINCTURE")) {
			potency.addModifiers(Modifiers.Tincture);
		}
		potency.addModifiers(...this.jobSpecificAutoPotencyModifiers());
		// TODO:auto account for job-specific damage buffs
		// Create a fake ActionNode for damage tracking purposes.
		const autoNode = skillNode("ATTACK");
		autoNode.applicationTime = this.time;
		autoNode.addPotency(potency);
		this.fakeAutoActionNodes.push(autoNode);
		this.addEvent(
			new Event("aa applied", AUTO_DELAY, () => {
				controller.resolvePotency(potency);
				if (!this.hasResourceAvailable("IN_COMBAT")) {
					this.resources.get("IN_COMBAT").gain(1);
				}
			}),
		);
		controller.reportAutoTick(this.time);
		// Assume all effects are resolved on snapshot rather than on application.
		this.jobSpecificOnAutoAttack();
	}

	/**
	 * The auto-attack delay for this job, determined by its highest-ilvl equippable weapon.
	 * For the most part, this is the same for all weapons; the only notable exception where it
	 * could be relevant is Q40, where PLDs can equip a Garuda EX weapon that gets ilvl synced but
	 * has a shorter AA delay, increasing Oath Gauge generation.
	 *
	 * If a job has an active haste buff, the returned value should change to reflect it.
	 *
	 * All jobs have a different base value, but we return a default value so healers/casters can
	 * ignore it.
	 */
	jobSpecificAutoAttackDelay(): number {
		// copied from ama's sim code
		const WEAPON_DELAYS = {
			PLD: 2.24,
			WAR: 3.36,
			DRK: 2.96,
			GNB: 2.8,
			DRG: 2.8,
			RPR: 3.2,
			MNK: 2.56,
			SAM: 2.64,
			NIN: 2.56,
			VPR: 2.64,
			BRD: 3.04,
			MCH: 2.64,
			DNC: 3.12,
			BLM: 3.28,
			SMN: 3.12,
			RDM: 3.44,
			PCT: 2.96,
			WHM: 3.44,
			SCH: 3.12,
			AST: 3.2,
			SGE: 2.8,
			BLU: 2.5, // ???
			NEVER: 2.5,
		};
		// I choose not to care about rounding/flooring
		// until we become forced to care about rounding/flooring
		return (WEAPON_DELAYS[this.job] * (100 - this.jobSpecificAutoReduction())) / 100;
	}

	jobSpecificAutoReduction(): number {
		// I'm deliberately too lazy to code this + potency modifiers for casters and healers.
		// Maybe someday we'll care about it for SCH/SMN.
		return 0;
	}

	jobSpecificAutoBasePotency(): number {
		// Copied from xivgear:
		// https://github.com/xiv-gear-planner/gear-planner/blob/505398e19a45cc0304a7746e4acd3e694051b908/packages/xivmath/src/xivconstants.ts#L113-L120
		return this.job === "BRD" || this.job === "MCH" ? 80 : 90;
	}

	jobSpecificAutoPotencyModifiers(): PotencyModifier[] {
		return [];
	}

	getStatusDuration(rscType: ResourceKey): number {
		return (getResourceInfo(this.job, rscType) as ResourceInfo).maxTimeout;
	}

	gainDebuff(rscType: ResourceKey, targetList: number[]) {
		targetList.forEach((targetNumber) => {
			const debuff = this.debuffs.get(rscType, targetNumber);
			const resourceInfo = getResourceInfo(this.job, rscType) as ResourceInfo;
			if (debuff.availableAmountIncludingDisabled() > 0) {
				debuff.overrideTimer(this, resourceInfo.maxTimeout);
			} else {
				debuff.gain(1);
				this.debuffs.addDebuffEvent({
					rscType,
					targetNumber,
					name: `drop ${rscType} on target ${targetNumber}`,
					delay: resourceInfo.maxTimeout,
					fnOnRsc: (rsc) => rsc.consume(1),
				});
			}
		});
	}

	gainStatus(rscType: ResourceKey, stacks: number = 1) {
		const resource = this.resources.get(rscType);
		const resourceInfo = getResourceInfo(this.job, rscType) as ResourceInfo;
		if (this.hasResourceAvailable(rscType)) {
			if (resourceInfo.warnOnOvercap && stacks >= resource.availableAmount()) {
				controller.reportWarning({ kind: "overcap", rsc: rscType });
			}
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

	/**
	 * Check if a random effect would be triggered.
	 *
	 * The `alwaysRoll` parameter exists for backwards compatibility; some implementations that didn't use
	 * this helper function would always trigger a prng call regardless of if ProcMode was set to Always.
	 */
	maybeGainProc(proc: ResourceKey, chance: number = 0.5, alwaysRoll: boolean = false) {
		if (!this.triggersEffect(chance, alwaysRoll)) {
			return;
		}

		this.gainStatus(proc);
	}

	triggersEffect(chance: number, alwaysRoll: boolean = false): boolean {
		if (this.config.procMode === ProcMode.Never) {
			return false;
		}
		const preRoll = alwaysRoll ? this.rng() : undefined;
		if (this.config.procMode === ProcMode.Always) {
			return true;
		}

		const rand = preRoll ?? this.rng();
		return rand < chance;
	}

	handleDoTTick(dotResource: ResourceKey) {
		this.handleOverTimeTick(dotResource, "damage");
	}
	handleHoTTick(hotResource: ResourceKey) {
		this.handleOverTimeTick(hotResource, "healing");
	}
	handleOverTimeTick(effect: ResourceKey, kind: PotencyKind) {
		if (this.debuffs.hasAny(effect)) {
			// Perform one pass over all targets to check if the status has been disabled on any.
			// This handles cases like BLM's High Thunder II, which may have been toggled off on
			// specific enemies.
			// Since all targets of an AoE DoT share the same potency object, we perform resolution
			// after having pruned the target lists in this first loop.
			for (let i = 1; i <= MAX_ABILITY_TARGETS; i++) {
				const effectBuff = this.debuffs.get(effect, i);
				if (
					effectBuff.availableAmountIncludingDisabled() > 0 &&
					effectBuff.node &&
					!effectBuff.enabled
				) {
					const p = effectBuff.node.getOverTimePotencies(effect, kind)[
						effectBuff.tickCount
					];
					p.tryRemoveTarget(i);
				}
			}
			for (let i = 1; i <= MAX_ABILITY_TARGETS; i++) {
				const effectBuff = this.debuffs.get(effect, i);
				if (effectBuff.availableAmountIncludingDisabled() > 0) {
					// For floor effects that are toggled off, don't resolve its potency, but increment the tick count.
					if (effectBuff.node && effectBuff.enabled) {
						const p = effectBuff.node.getOverTimePotencies(effect, kind)[
							effectBuff.tickCount
						];
						// Since we may be resolving an AoE dot, check if this was already resolved.
						if (!p?.hasResolved()) {
							controller.resolveOverTimePotency(p, kind);
						}
						// on-tick effects should still occur once per target
						this.onResolveOverTimeTick(effect, kind);
					}
					effectBuff.tickCount++;
				} else {
					// If the effect has expired and was not simply toggled off, then remove
					// all future dot tick potencies for this target.
					// Overwrites should already have been handled.
					if (effectBuff.node) {
						effectBuff.node.removeUnresolvedOvertimePotencies(kind, i);
						effectBuff.node = undefined;
					}
				}
			}
		} else {
			const effectBuff = this.resources.get(effect) as OverTimeBuff;
			if (effectBuff.availableAmountIncludingDisabled() > 0) {
				// For floor effects that are toggled off, don't resolve its potency, but increment the tick count.
				if (effectBuff.node && effectBuff.enabled) {
					const p = effectBuff.node.getOverTimePotencies(effect, kind)[
						effectBuff.tickCount
					];
					controller.resolveOverTimePotency(p, kind);
					this.onResolveOverTimeTick(effect, kind);
				}
				effectBuff.tickCount++;
			} else {
				// If the effect has expired and was not simply toggled off, then remove
				// all future dot tick potencies.
				if (effectBuff.node) {
					effectBuff.node.removeUnresolvedOvertimePotencies(kind);
					effectBuff.node = undefined;
				}
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
			const timeToTick = Math.min(
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
			// to ensure remaining time on cooldowns is correct, tick each event before calling their effects
			eventsToExecuteOld.forEach((e) => {
				e.timeTillEvent -= timeToTick;
			});
			let executedEvents = 0;
			eventsToExecuteOld.forEach((e) => {
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
		if (this.job in HEALERS) {
			return XIVMath.mpTick(this.config.level, this.config.piety);
		}
		return 200;
	}

	requestToggleBuff(buffName: ResourceKey, targetNumber?: number) {
		// If the buff corresponds to a DoT effect, then allow it to be re-enabled to simulate cases
		// where a boss jumps away, then returns before it expires.
		if (this.debuffs.hasAny(buffName)) {
			const dot = this.debuffs.get(buffName, targetNumber ?? 1);
			if (dot.available(1)) {
				dot.enabled = false;
			} else {
				dot.enabled = true;
			}
			return true;
		}

		// autos are handled separately
		if (buffName === "AUTOS_ENGAGED") {
			this.toggleAutosEngaged();
			return true;
		}

		const rsc = this.resources.get(buffName);

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
			return false;
		} else {
			// All other buffs are outright canceled.
			// Special case for meditate: cancel future meditate ticks (assume only one active event).
			if (buffName === "MEDITATE") {
				const evt = this.findNextQueuedEventByTag(EventTag.MeditateTick);
				if (evt) {
					evt.canceled = true;
				}
			}
			// Special case: cancelling Kardia on self also cancels Kardion on partner
			if (buffName === "KARDIA") {
				this.tryConsumeResource("KARDION");
			}
			// Special case: canceling TCJ/Mudra must reset mudra state
			if (buffName === "TEN_CHI_JIN" || buffName === "MUDRA") {
				// special casing to fix mudra state if TCJ is clicked off manually
				// TODO move to generic buff expiry logic
				this.tryConsumeResource("MUDRA");
				this.tryConsumeResource("KASSATSU");
				this.resources.get("MUDRA_TRACKER").overrideCurrentValue(0);
				this.resources.get("BUNNY").overrideCurrentValue(0);
			}
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
			return true;
		}
	}

	// ---- AUTO ATTACK FUNCTIONS ------

	/**
	 * add recurring auto attack event with an initial delay
	 */
	addRecurringAutoAttackEvent(initialDelay: number) {
		const autoAttackEvent = (initialDelay: number) => {
			const event = new Event("aa tick", initialDelay, () => {
				let nextAutoDelay = this.jobSpecificAutoAttackDelay();
				if (this.resources.get("AUTOS_ENGAGED").available(1) && this.isInCombat()) {
					// If the boss is untargetable, then do not trigger the auto-attack event.
					// Instead, store the auto until the untargetable event ends.
					// We assume that changing the untargetable track will force a re-simulation,
					// so this will always be reliable.
					const now = this.getDisplayTime();
					if (!controller.timeline.duringUntargetable(now)) {
						this.onAutoAttack();
					} else {
						nextAutoDelay = controller.timeline.nextTargetableAfter(now) - now;
					}
				}
				this.addEvent(autoAttackEvent(nextAutoDelay));
			});
			event.addTag(EventTag.AutoTick);
			return event;
		};
		this.addEvent(autoAttackEvent(initialDelay));
	}

	/**
	 * returns the time til next auto attack, -1 if nothing queued
	 */
	findAutoAttackTimerInQueue() {
		let timer = -1;
		this.eventsQueue.forEach((event) => {
			if (event.name === "aa tick") {
				timer = event.timeTillEvent;
			}
		});
		return timer;
	}

	/**
	 * Function to start auto attacks
	 * removes old auto attack timer
	 * starts a new recurring auto attack timer
	 * timer for auto initial + recurringDelay(defaults 3)
	 * initialDelay: delay to next auto attack event.
	 * recurringDelay: delay between auto attack events (not the first one!)
	 * Both can be different as this function is called again if downtime/cast bars can interrupt the flow of the timer.
	 * This is called many times to overwrite the auto timer.
	 * NOTE BENE: castTime only modifies stored auto
	 */
	startAutoAttackTimer(initialDelay?: number, reccuringDelay?: number, castTime?: number) {
		// remove previous auto attack timer if ticking
		if (this.findAutoAttackTimerInQueue() !== -1) {
			this.removeAutoAttackTimer();
		} else if (this.resources.get("STORED_AUTO").available(1)) {
			// do an auto attack on a delay according to castTime
			const event = new Event("stored auto", castTime ? castTime : 0, () => {
				this.onAutoAttack();
			});
			this.addEvent(event);
		}
		this.tryConsumeResource("STORED_AUTO");

		// make sure "AUTOS_ENGAGED" set to 1
		if (this.resources.get("AUTOS_ENGAGED").availableAmount() === 0) {
			this.resources.get("AUTOS_ENGAGED").gain(1);
			this.autoStartTimes.push(this.getDisplayTime());
		}

		// calculate reccuring delay
		const autoDelay = reccuringDelay ?? this.jobSpecificAutoAttackDelay();

		let initDelay = 0;
		if (initialDelay === -1) {
			initDelay = autoDelay;
		} else {
			initDelay = initialDelay ?? autoDelay;
		}
		// start reccuring event with a delay
		this.addRecurringAutoAttackEvent(initDelay);
	}

	// removes current auto attack timer
	removeAutoAttackTimer() {
		let index = 0;
		this.eventsQueue.forEach((event) => {
			if (event.name === "aa tick") {
				this.eventsQueue.splice(index, 1);
			}
			index++;
		});
	}

	toggleAutosEngaged() {
		const currentTimer = this.findAutoAttackTimerInQueue();
		if (this.resources.get("AUTOS_ENGAGED").availableAmount() === 0) {
			// toggle autos ON
			this.startAutoAttackTimer(
				currentTimer === -1 ? this.jobSpecificAutoAttackDelay() : currentTimer,
			);
		} else {
			// toggle autos OFF
			this.resources.get("AUTOS_ENGAGED").consume(1);
			this.autoStopTimes.push(this.getDisplayTime());
			if (currentTimer !== -1) {
				// create a new event that turns on stored auto at the end
				this.removeAutoAttackTimer();
				const event = new Event("aa tick", currentTimer, () => {
					if (this.resources.get("STORED_AUTO").available(0)) {
						this.resources.get("STORED_AUTO").gain(1);
					}
				});
				this.addEvent(event);
			}
		}
	}

	/**
	 * AUTO ATTACK LOGIC
	 *
	 * WEAPONSKILL:
	 * no cast: continue auto attack, start auto attack if out of combat
	 * cast: pauses auto attack timer, always start auto attack if out of combat
	 *
	 * SPELL:
	 * no cast/insta: continue auto attacking if autoing, if out of combat, depends if it starts autos
	 * cast: pause auto attack timer, if out of combat, depends if it starts it
	 *
	 * NO DMG SPELL:
	 * pause auto attack, doesn't start if out of combat
	 *
	 * RIGHT CLICK AUTO ATTACKS:
	 * start auto attack if not already
	 * if "about full", hit an auto, and start a new timer,
	 * starts combat if out
	 *
	 * DISENGAGE/LEFT CLICK OFF:
	 * continue auto attack timer, and stop when "about full"
	 *
	 */
	refreshAutoBasedOnSkill(
		skill: Spell<GameState> | Weaponskill<GameState>,
		capturedCastTime: number,
		doesDamage: boolean,
	) {
		// autos helper constants
		const hasCast = capturedCastTime !== 0;
		const autosEngaged = this.resources.get("AUTOS_ENGAGED").available(1);
		const recurringAutoDelay = this.jobSpecificAutoAttackDelay();
		const currentDelay = this.findAutoAttackTimerInQueue();
		const startsAutos = skill.startsAuto; // <<---  for spells starting autos

		if (doesDamage) {
			if (this.isInCombat()) {
				// AUTOS IN COMBAT

				// has a cast time AND autos are already ticking
				if (hasCast && autosEngaged) {
					// delay autos
					const aaDelay =
						capturedCastTime +
						(currentDelay === -1 ? recurringAutoDelay : currentDelay);
					this.startAutoAttackTimer(aaDelay, recurringAutoDelay, capturedCastTime);
				}
				// has no cast time AND autos not ticking: CHECK startsAutos
				else if (!hasCast && !autosEngaged) {
					// start autos with current delay
					if (startsAutos) {
						this.startAutoAttackTimer(currentDelay, recurringAutoDelay);
					} else {
						// do nothing!
					}
				}
				// has cast time AND autos not ticking: CHECK startsAutos
				else if (hasCast && !autosEngaged) {
					if (startsAutos) {
						const aaDelay =
							capturedCastTime +
							(currentDelay === -1 ? recurringAutoDelay : currentDelay);
						this.startAutoAttackTimer(aaDelay, recurringAutoDelay, capturedCastTime);
					} else {
						// SINGLE AUTO ATTACK INSTANCE, OVERWRITE STORED AUTO
						if (currentDelay > 0) {
							this.removeAutoAttackTimer();
							const event = new Event(
								"aa tick",
								currentDelay + capturedCastTime,
								() => {
									if (this.resources.get("STORED_AUTO").available(0)) {
										this.resources.get("STORED_AUTO").gain(1);
									}
								},
							);
							this.addEvent(event);
						}
					}
				}
			} else {
				// AUTOS OUT OF COMBAT
				if (startsAutos) {
					// If we're out of combat, perform an auto  with timing depending on
					// 1. Application delay of this ability (to simulate macro pulling)
					// 2. t=0 (in case users deliberately want to weave something that requires starting combat)
					const displayTime = this.getDisplayTime();
					const applicationDelay =
						skill.applicationDelay +
						(capturedCastTime > 0
							? capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime)
							: 0);
					const applicationTime = displayTime + applicationDelay;
					const initialDelay =
						applicationTime < 0
							? applicationDelay
							: Math.min(applicationDelay, -displayTime) + Debug.epsilon;
					this.startAutoAttackTimer(
						initialDelay + recurringAutoDelay,
						recurringAutoDelay,
						initialDelay,
					);
				}
			}
		} else {
			// auto refresh if does no damage
			if (this.isInCombat()) {
				if (hasCast && autosEngaged) {
					// autos engaged
					const currentDelay = this.findAutoAttackTimerInQueue();
					const aaDelay =
						capturedCastTime +
						(currentDelay === -1 ? recurringAutoDelay : currentDelay);
					this.startAutoAttackTimer(aaDelay);
				} else if (hasCast && !autosEngaged) {
					// OVERWRITE STORED AUTO, and let timer fizzle out
					if (currentDelay > 0) {
						this.removeAutoAttackTimer();
						const event = new Event("aa tick", currentDelay + capturedCastTime, () => {
							if (this.resources.get("STORED_AUTO").available(0)) {
								this.resources.get("STORED_AUTO").gain(1);
							}
						});
						this.addEvent(event);
					}
				}
			}
		}
	}

	/**
	 * Attempt to use a spell or weaponskill. Assumes that resources for the spell are currently available,
	 * i.e. `skill.validateAttempt` succeeded.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useSpellOrWeaponskill(
		skill: Spell<GameState> | Weaponskill<GameState>,
		node: ActionNode,
		actionIndex: number,
	) {
		const cd = this.cooldowns.get(skill.cdName);
		const isFollowUpOrKassatsuMudra =
			this.job === "NIN" &&
			(this.hasResourceAvailable("MUDRA") || this.hasResourceAvailable("KASSATSU")) &&
			["TEN", "CHI", "JIN"].includes(skill.name);
		const secondaryCd =
			!isFollowUpOrKassatsuMudra && skill.secondaryCd
				? this.cooldowns.get(skill.secondaryCd.cdName)
				: undefined;

		const capturedCastTime = skill.castTimeFn(this);
		const recastTime = skill.recastTimeFn(this);

		this.jobSpecificAddSpeedBuffCovers(node, skill);

		// create potency node object (snapshotted buffs will populate on confirm)
		const potencyNumber = skill.potencyFn(this);

		// See if the initial potency was already created
		let potency: Potency | undefined = node.getInitialPotency();
		const appliesDoT = this.dotSkills.includes(skill.name);
		// If it was not, and this action is supposed to do damage, go ahead and add it now
		// If the skill draws aggro without dealing damage (such as Summon Bahamut), then
		// create a potency object so a damage mark can be drawn if we're not already in combat.
		// If the skill applies a DoT with no initial damage, also create a placeholder potency
		// to ensure buffs snapshot properly.
		if (
			!potency &&
			(potencyNumber > 0 || (skill.drawsAggro && !this.isInCombat()) || appliesDoT)
		) {
			// refresh autos for skills with potency here
			this.refreshAutoBasedOnSkill(skill, capturedCastTime, true);

			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: undefined,
				description: "",
				targetList: node.targetList,
				falloff: skill.falloff,
			});
			node.addPotency(potency);
		} else {
			// NO POTENCY AUTO ATTACK DELAY
			this.refreshAutoBasedOnSkill(skill, capturedCastTime, false);
		}

		const healingPotencyNumber = skill.healingPotencyFn(this);
		let healingPotency: Potency | undefined = node.getInitialHealingPotency();
		if (!healingPotency && healingPotencyNumber > 0) {
			healingPotency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: healingPotencyNumber,
				snapshotTime: undefined,
				description: "",
				healTargetCount: node.healTargetCount,
				falloff: 0, // Heals do not have AoE falloff
			});
			node.addHealingPotency(healingPotency);
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
			const manaCost = skill.manaCostFn(this);
			if (manaCost > this.resources.get("MANA").availableAmount()) {
				controller.reportInterruption({
					failNode: node,
					failIndex: actionIndex,
				});
			} else if (manaCost > 0) {
				this.resources.get("MANA").consume(manaCost);
			}

			const doesDamage = potencyNumber > 0 || appliesDoT;
			// Skills that draw aggro (Provoke, Summon Bahamut) should generate a snapshot time
			// but no modifiers.
			if (potency) {
				potency.snapshotTime = this.getDisplayTime();
				if (doesDamage) {
					if (this.hasResourceAvailable("TINCTURE")) {
						potency.addModifiers(Modifiers.Tincture);
					}
					potency.addModifiers(...skill.jobPotencyModifiers(this));
					potency.addTargetSpecificModifiers(skill.jobTargetPotencyModifiers(this, node));
				}
			}
			if (doesDamage) {
				// tincture
				if (this.hasResourceAvailable("TINCTURE") && !node.hasBuff(BuffType.Tincture)) {
					node.addBuff(BuffType.Tincture);
				}

				this.jobSpecificAddDamageBuffCovers(node, skill);
			}

			const heals = healingPotencyNumber > 0;
			if (healingPotency) {
				healingPotency.snapshotTime = this.getDisplayTime();
				if (this.hasResourceAvailable("TINCTURE")) {
					healingPotency.addModifiers(Modifiers.Tincture);
				}
				healingPotency.addModifiers(...skill.jobHealingPotencyModifiers(this));
			}
			if (heals) {
				// tincture
				if (this.hasResourceAvailable("TINCTURE") && !node.hasBuff(BuffType.Tincture)) {
					node.addBuff(BuffType.Tincture);
				}

				this.jobSpecificAddHealingBuffCovers(node, skill);
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
					if (healingPotency) {
						controller.resolveHealingPotency(healingPotency);
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
							failIndex: actionIndex,
						});
					}
				}),
			);
		}
		// recast
		cd.useStackWithRecast(this.config.getAfterTaxGCD(recastTime));
		secondaryCd?.useStack();
	}

	/**
	 * Attempt to use an ability. Assumes that resources for the ability are currently available,
	 * i.e. `skill.validateAttempt` succeeded.
	 *
	 * Because abilities have no cast time, this function snapshots potencies and enqueues the
	 * application event immediately.
	 */
	useAbility(skill: Ability<GameState>, node: ActionNode) {
		console.assert(node);
		const cd = this.cooldowns.get(skill.cdName);
		const secondaryCd = skill.secondaryCd
			? this.cooldowns.get(skill.secondaryCd.cdName)
			: undefined;
		// potency
		const potencyNumber = skill.potencyFn(this);
		let potency: Potency | undefined = undefined;
		const appliesDoT = this.dotSkills.includes(skill.name);
		if (potencyNumber > 0 || skill.drawsAggro || appliesDoT) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: potencyNumber,
				snapshotTime: this.getDisplayTime(),
				description: "",
				targetList: node.targetList,
				falloff: skill.falloff,
			});
		}
		if (potency && (potencyNumber > 0 || appliesDoT)) {
			if (this.hasResourceAvailable("TINCTURE")) {
				potency.addModifiers(Modifiers.Tincture);
			}
			potency.addModifiers(...skill.jobPotencyModifiers(this));
			potency.addTargetSpecificModifiers(skill.jobTargetPotencyModifiers(this, node));
			node.addPotency(potency);
		}

		// AUTO ATTACK HANDLING
		// If ability has a potency or an ability targets a boss like provoke/reprisal, start the auto
		// by default abilities dont start autos

		const autosEngaged = this.resources.get("AUTOS_ENGAGED").available(1);
		const recurringAutoDelay = this.jobSpecificAutoAttackDelay();
		const currentDelay = this.findAutoAttackTimerInQueue();
		// Abilities with startsAuto explicitly set to false should not begin auto-attacks, even if they do potency.
		const startsAutos =
			skill.startsAuto || (skill.startsAuto !== false && potency && potencyNumber > 0);

		if (startsAutos) {
			if (!this.isInCombat()) {
				// If we're out of combat, perform an auto  with timing depending on
				// 1. Application delay of this ability (to simulate macro pulling)
				// 2. t=0 (in case users deliberately want to weave something that requires starting combat)
				const displayTime = this.getDisplayTime();
				const applicationTime = displayTime + skill.applicationDelay;
				const initialDelay =
					applicationTime < 0
						? skill.applicationDelay
						: Math.min(skill.applicationDelay, -displayTime) + Debug.epsilon;
				this.startAutoAttackTimer(
					recurringAutoDelay + initialDelay,
					recurringAutoDelay,
					initialDelay,
				);
			} else {
				if (!autosEngaged) {
					// start autos with current delay
					if (startsAutos) {
						this.startAutoAttackTimer(currentDelay, recurringAutoDelay);
					} else {
						// do nothing!
					}
				}
			}
		}

		const healingPotencyNumber = skill.healingPotencyFn(this);
		let healingPotency: Potency | undefined = undefined;
		if (healingPotencyNumber > 0) {
			healingPotency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: healingPotencyNumber,
				snapshotTime: this.getDisplayTime(),
				description: "",
				healTargetCount: node.healTargetCount,
				falloff: 0, // Heals do not have AoE falloff
			});
			if (this.hasResourceAvailable("TINCTURE")) {
				healingPotency.addModifiers(Modifiers.Tincture);
			}
			healingPotency.addModifiers(...skill.jobHealingPotencyModifiers(this));
			node.addHealingPotency(healingPotency);
		}

		if ((potencyNumber > 0 || appliesDoT) && !node.hasBuff(BuffType.Tincture)) {
			// tincture
			if (this.hasResourceAvailable("TINCTURE")) {
				node.addBuff(BuffType.Tincture);
			}
			this.jobSpecificAddDamageBuffCovers(node, skill);
		}

		if (healingPotencyNumber > 0) {
			// tincture
			if (this.hasResourceAvailable("TINCTURE") && !node.hasBuff(BuffType.Tincture)) {
				node.addBuff(BuffType.Tincture);
			}

			this.jobSpecificAddHealingBuffCovers(node, skill);
		}

		const manaCost = skill.manaCostFn(this);
		if (manaCost > 0) {
			this.resources.get("MANA").consume(manaCost);
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
					if (potency) {
						controller.resolvePotency(potency);
					}
					if (healingPotency) {
						controller.resolveHealingPotency(healingPotency);
					}
					skill.onApplication(this, node);
				}),
			);
		} else {
			if (potency) {
				controller.resolvePotency(potency);
			}
			if (healingPotency) {
				controller.resolveHealingPotency(healingPotency);
			}
			skill.onApplication(this, node);
		}

		// recast
		cd.useStack();
		secondaryCd?.useStack();

		// animation lock
		this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", skill.animationLockFn(this));
	}

	/**
	 * Attempt to use a limit break.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useLimitBreak(skill: LimitBreak<GameState>, node: ActionNode, actionIndex: number) {
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
				targetList: node.targetList,
				falloff: skill.falloff,
			});
			node.addPotency(potency);
		}

		const healingPotencyNumber = skill.healingPotencyFn(this);
		let healingPotency: Potency | undefined = undefined;
		if (healingPotencyNumber > 0) {
			healingPotency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skill.name,
				aspect: skill.aspect,
				basePotency: healingPotencyNumber,
				snapshotTime: undefined,
				description: "",
				healTargetCount: node.healTargetCount,
				falloff: 0, // Heals do not have AoE falloff
			});
			node.addHealingPotency(healingPotency);
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
			if (healingPotency) {
				healingPotency.snapshotTime = this.getDisplayTime();
			}

			// Enqueue effect application
			this.addEvent(
				new Event(skill.name + " applied", skill.applicationDelay, () => {
					if (potency) {
						controller.resolvePotency(potency);
					}
					if (healingPotency) {
						controller.resolveHealingPotency(healingPotency);
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
							failIndex: actionIndex,
						});
					}
				}),
			);
		}
		// recast
		cd.useStack();
	}

	#timeTillSkillAvailable(skillName: ActionKey) {
		const skill = this.skillsList.get(skillName);
		const isFollowUpOrKassatsuMudra =
			this.job === "NIN" &&
			(this.hasResourceAvailable("MUDRA") || this.hasResourceAvailable("KASSATSU")) &&
			["TEN", "CHI", "JIN"].includes(skill.name);
		// Mudras with the MUDRA buff active roll the GCD, not the actual mudra CD.
		const secondaryCd = isFollowUpOrKassatsuMudra ? undefined : skill.secondaryCd?.cdName;
		let tillAnyCDStack = this.cooldowns.timeTillAnyStackAvailable(skill.cdName);

		if (secondaryCd) {
			tillAnyCDStack = Math.max(
				tillAnyCDStack,
				this.cooldowns.timeTillAnyStackAvailable(secondaryCd),
			);
		}
		return Math.max(this.timeTillAnySkillAvailable(), tillAnyCDStack);
	}

	timeTillAnySkillAvailable() {
		const tillNotAnimationLocked = this.resources.timeTillReady("NOT_ANIMATION_LOCKED");
		const tillNotCasterTaxed = this.resources.timeTillReady("NOT_CASTER_TAXED");
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	findNextQueuedEventByTag(tag: EventTag) {
		for (let i = 0; i < this.eventsQueue.length; i++) {
			const evt = this.eventsQueue[i];
			if (evt.hasTag(tag)) return evt;
		}
		return undefined;
	}

	hasResourceAvailable(rscType: ResourceKey, atLeast?: number): boolean {
		return this.resources.get(rscType).available(atLeast ?? 1);
	}

	hasResourceExactly(rscType: ResourceKey, target: number): boolean {
		return this.resources.get(rscType).availableAmount() === target;
	}

	hasDebuffActive(rscType: ResourceKey, targetNumber: number): boolean {
		return this.debuffs.get(rscType, targetNumber).available(1);
	}

	hitPositional(location: "flank" | "rear"): boolean {
		return (
			this.hasResourceAvailable("TRUE_NORTH") ||
			(location === "flank" && this.hasResourceAvailable("FLANK_POSITIONAL")) ||
			(location === "rear" && this.hasResourceAvailable("REAR_POSITIONAL"))
		);
	}

	// Overide this function if special buffs (like Meikyo Shisui) would override the combo requirement.
	hitCombo(combo: ComboPotency): boolean {
		return this.hasResourceExactly(combo.resource, combo.resourceValue);
	}

	computeComboAndPositionalModifiers(
		potency: number,
		combo?: ComboPotency,
		positional?: PositionalPotency,
	): PotencyModifier[] {
		const mods = [];
		if (combo && this.hitCombo(combo)) {
			mods.push(makeComboModifier(getBasePotency(this, combo.potency) - potency));
			if (positional && this.hitPositional(positional.location)) {
				mods.push(
					makePositionalModifier(
						getBasePotency(this, positional.comboPotency) -
							getBasePotency(this, combo.potency),
					),
				);
			}
		} else if (positional && this.hitPositional(positional.location)) {
			mods.push(makePositionalModifier(getBasePotency(this, positional.potency) - potency));
		}
		return mods;
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
				if (rscInfo.warnOnTimeout) {
					controller.reportWarning({ kind: "timeout", rsc: rsc.type });
				}
			},
		});
	}

	getOverriddenDots(dotName: ResourceKey): ResourceKey[] {
		return this.#exclusiveDots.get(dotName) ?? [];
	}
	getOverriddenHots(hotName: ResourceKey): ResourceKey[] {
		return this.#exclusiveHots.get(hotName) ?? [];
	}

	applyDoT(dotName: ResourceKey, node: ActionNode) {
		this.applyOverTimeEffect(dotName, node, "damage");
	}
	applyHoT(hotName: ResourceKey, node: ActionNode, duration?: number) {
		this.applyOverTimeEffect(hotName, node, "healing", duration);
	}
	applyOverTimeEffect(
		effectName: ResourceKey,
		node: ActionNode,
		kind: PotencyKind,
		duration?: number,
	) {
		// If the effect is applied as a debuff, we have slightly different logic to handle uptime
		// tracking across different targets.
		if (this.debuffs.hasAny(effectName)) {
			if (kind !== "damage") {
				console.error(
					`over time debuff ${effectName} must have kind="damage", instead got ${kind}`,
				);
				return;
			}
			const effectDuration = duration ?? this.getStatusDuration(effectName);
			node.targetList.forEach((targetNumber) => {
				const effectBuff = this.debuffs.get(effectName, targetNumber);
				let effectGap: number | undefined = undefined;
				const overriddenEffects = this.getOverriddenDots(effectName);
				overriddenEffects.forEach((removeEffect: ResourceKey) => {
					if (!this.hasDebuffActive(removeEffect, targetNumber)) {
						const lastExpiration = this.debuffs
							.get(removeEffect, targetNumber)
							.getLastExpirationTime();

						// If a mutually exclusive effect was previously applied but has fallen off,
						// the gap is the smallest of the times since any of those effects expired
						if (lastExpiration) {
							const thisGap = this.getDisplayTime() - lastExpiration;
							effectGap =
								effectGap === undefined ? thisGap : Math.min(effectGap, thisGap);
						}
						return;
					}

					node.setOverTimeOverrideAmount(
						effectName,
						node.getOverTimeOverrideAmount(effectName, kind, targetNumber) +
							this.debuffs.timeTillExpiry(removeEffect, targetNumber),
						kind,
						targetNumber,
					);
					controller.reportOverTimeDrop(this.getDisplayTime(), removeEffect, kind, [
						targetNumber,
					]);
					effectGap = 0;
					this.tryRemoveDebuff(removeEffect, targetNumber);
				});

				if (effectBuff.availableAmountIncludingDisabled() > 0) {
					if (effectBuff.node === undefined) {
						console.error(
							`DoT debuff for ${effectName}, target ${targetNumber} has no node`,
						);
						return;
					}
					// Always enable the DoT buff in case it was previously toggled off
					effectBuff.enabled = true;
					effectBuff.node.removeUnresolvedOvertimePotencies(kind);
					node.setOverTimeOverrideAmount(
						effectName,
						node.getOverTimeOverrideAmount(effectName, kind, targetNumber) +
							this.debuffs.timeTillExpiry(effectName, targetNumber),
						kind,
						targetNumber,
					);
					effectBuff.overrideTimer(this, effectDuration);
				} else {
					const thisGap =
						this.getDisplayTime() - (effectBuff.getLastExpirationTime() ?? 0);
					effectGap = effectGap === undefined ? thisGap : Math.min(effectGap, thisGap);

					effectBuff.gain(1);

					const otName = kind === "damage" ? " DoT" : " HoT";
					controller.reportOverTimeStart(this.getDisplayTime(), effectName, kind, [
						targetNumber,
					]);
					this.debuffs.addDebuffEvent({
						rscType: effectName,
						name: "drop " + effectName + otName + " on " + targetNumber,
						targetNumber: targetNumber,
						delay: effectDuration,
						fnOnRsc: (rsc) => {
							rsc.consume(1);
							controller.reportOverTimeDrop(this.getDisplayTime(), effectName, kind, [
								targetNumber,
							]);
						},
					});
				}

				node.setOverTimeGap(effectName, effectGap ?? 0, kind, targetNumber);

				effectBuff.node = node;
				effectBuff.tickCount = 0;
			});
			return;
		}

		const effectBuff = this.resources.get(effectName) as OverTimeBuff;
		const effectDuration = duration ?? this.getStatusDuration(effectName);

		let effectGap: number | undefined = undefined;
		const overriddenEffects =
			kind === "damage"
				? this.getOverriddenDots(effectName)
				: this.getOverriddenHots(effectName);
		overriddenEffects.forEach((removeEffect: ResourceKey) => {
			// Ignore self for the purposes of overriding other HoTs
			if (removeEffect === effectName) {
				return;
			}
			if (!this.hasResourceAvailable(removeEffect)) {
				const lastExpiration = this.resources.get(removeEffect).getLastExpirationTime();

				// If a mutually exclusive effect was previously applied but has fallen off, the gap is the smallest of the times since any of those effects expired
				if (lastExpiration) {
					const thisGap = this.getDisplayTime() - lastExpiration;
					effectGap = effectGap === undefined ? thisGap : Math.min(effectGap, thisGap);
				}
				return;
			}

			node.setOverTimeOverrideAmount(
				effectName,
				node.getOverTimeOverrideAmount(effectName, kind) +
					this.resources.timeTillReady(removeEffect),
				kind,
			);
			controller.reportOverTimeDrop(
				this.getDisplayTime(),
				removeEffect,
				kind,
				node.targetList,
			);
			effectGap = 0;
			this.tryConsumeResource(removeEffect);
		});

		if (effectBuff.available(1)) {
			console.assert(effectBuff.node);
			(effectBuff.node as ActionNode).removeUnresolvedOvertimePotencies(kind);
			node.setOverTimeOverrideAmount(
				effectName,
				node.getOverTimeOverrideAmount(effectName, kind) +
					this.resources.timeTillReady(effectName),
				kind,
			);
			effectBuff.overrideTimer(this, effectDuration);
		} else {
			const thisGap = this.getDisplayTime() - (effectBuff.getLastExpirationTime() ?? 0);
			effectGap = effectGap === undefined ? thisGap : Math.min(effectGap, thisGap);

			effectBuff.gain(1);

			const otName = kind === "damage" ? " DoT" : " HoT";
			controller.reportOverTimeStart(
				this.getDisplayTime(),
				effectName,
				kind,
				node.targetList,
			);
			this.resources.addResourceEvent({
				rscType: effectName,
				name: "drop " + effectName + otName,
				delay: effectDuration,
				fnOnRsc: (rsc) => {
					rsc.consume(1);
					controller.reportOverTimeDrop(
						this.getDisplayTime(),
						effectName,
						kind,
						node.targetList,
					);
				},
			});
		}

		node.setOverTimeGap(effectName, effectGap ?? 0, kind);

		effectBuff.node = node;
		effectBuff.tickCount = 0;

		// Immediately tick any ground-targeted effects on application
		if (this.#groundTargetDoTs.includes(effectName)) {
			this.handleDoTTick(effectName);
			controller.reportDotTick(this.time, effectName);
		}
		if (this.#groundTargetHoTs.includes(effectName)) {
			this.handleHoTTick(effectName);
			controller.reportHotTick(this.time, effectName);
		}
	}

	addDoTPotencies(props: OverTimePotencyProps) {
		this.addOverTimePotencies(props, "damage");
	}
	addHoTPotencies(props: OverTimePotencyProps, duration?: number) {
		this.addOverTimePotencies(props, "healing", duration);
	}
	addOverTimePotencies(props: OverTimePotencyProps, kind: PotencyKind, duration?: number) {
		const mods: PotencyModifier[] = props.modifiers ?? [];
		// If the job call didn't add Tincture, we can do that here
		if (this.hasResourceAvailable("TINCTURE") && !mods.includes(Modifiers.Tincture)) {
			mods.push(Modifiers.Tincture);
			props.node.addBuff(BuffType.Tincture);
		}

		const effectDuration = duration ?? this.getStatusDuration(props.effectName);
		const isGroundTargeted =
			this.#groundTargetDoTs.includes(props.effectName) ||
			this.#groundTargetHoTs.includes(props.effectName);
		// TODO do more precise calculation if the duration does not round.
		const effectTicks =
			Math.ceil(effectDuration / (props.tickFrequency ?? 3)) + (isGroundTargeted ? 1 : 0);

		const tickDescriptor = kind === "damage" ? "DoT" : "HoT";

		for (let i = 0; i < effectTicks; i++) {
			const overtimePotency = new Potency({
				config: controller.record.config ?? controller.gameConfig,
				sourceTime: this.getDisplayTime(),
				sourceSkill: props.skillName,
				aspect: props.aspect ?? Aspect.Other,
				basePotency: this.config.adjustedOvertimePotency(
					props.tickPotency,
					props.speedStat,
				),
				snapshotTime: this.getDisplayTime(),
				description:
					localizeResourceType(props.effectName) +
					` ${tickDescriptor} ` +
					(i + 1) +
					`/${effectTicks}`,
				targetList: kind === "damage" ? props.node.targetList : undefined,
				healTargetCount: kind === "healing" ? props.node.healTargetCount : undefined,
				falloff: 0, // assume all overtime effects have no falloff
			});
			overtimePotency.addModifiers(...mods);
			if (props.targetModifiers) {
				overtimePotency.addTargetSpecificModifiers(props.targetModifiers);
			}
			props.node.addOverTimePotency(overtimePotency, props.effectName, kind);
		}
	}

	refreshDoT(props: OverTimePotencyProps, forceRefresh: boolean = false) {
		this.refreshOverTimeEffect(props, "damage", forceRefresh);
	}
	refreshHoT(props: OverTimePotencyProps, forceRefresh: boolean = false) {
		this.refreshOverTimeEffect(props, "healing", forceRefresh);
	}
	refreshOverTimeEffect(props: OverTimePotencyProps, kind: PotencyKind, forceRefresh: boolean) {
		if (!forceRefresh && !this.hasResourceAvailable(props.effectName)) {
			return;
		}

		this.addOverTimePotencies(props, kind);

		this.applyOverTimeEffect(props.effectName, props.node, kind);
	}

	timeTillNextMpGainEvent() {
		const foundEvt = this.findNextQueuedEventByTag(EventTag.ManaGain);
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
		const skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.name);
		const capturedManaCost = skill.manaCostFn(this);
		const llCovered = this.job === "BLM" && this.resources.get("LEY_LINES").available(1);
		const capturedCastTime =
			skill.kind === "weaponskill" || skill.kind === "spell" || skill.kind === "limitbreak"
				? skill.castTimeFn(this)
				: 0;
		const instantCastAvailable =
			capturedCastTime === 0 ||
			skill.kind === "ability" ||
			(skill.kind !== "limitbreak" && skill.kind !== "unknown" && skill.isInstantFn(this)); // LBs can't be swiftcasted
		const currentMana = this.resources.get("MANA").availableAmount();
		const blocked = timeTillAvailable > Debug.epsilon;
		const enoughMana = capturedManaCost <= currentMana;
		const reqsMet = skill.validateAttempt(this);
		const skillUnlocked = this.config.level >= skill.unlockLevel;
		const isFollowUpOrKassatsuMudra =
			this.job === "NIN" &&
			(this.hasResourceAvailable("MUDRA") || this.hasResourceAvailable("KASSATSU")) &&
			["TEN", "CHI", "JIN"].includes(skill.name);
		const status = makeSkillReadyStatus();

		if (blocked) status.addUnavailableReason(SkillUnavailableReason.Blocked);
		if (
			!isFollowUpOrKassatsuMudra &&
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
		const secondaryCd =
			!isFollowUpOrKassatsuMudra && skill.secondaryCd
				? this.cooldowns.get(skill.secondaryCd.cdName)
				: undefined;
		let timeTillNextStackReady = cd.timeTillNextStackAvailable() % cd.currentStackCd();
		const timeTillSecondaryReady =
			!isFollowUpOrKassatsuMudra && skill.secondaryCd
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

		// Special case for mudras: ignore secondary CD if buff is up
		if (isFollowUpOrKassatsuMudra) {
			const gcd = this.cooldowns.get("cd_GCD");
			const gcdRecastTime = gcd.currentStackCd();
			cd = gcd;
			cdRecastTime = gcdRecastTime;
			timeTillNextStackReady = gcd.timeTillNextStackAvailable();
			timeTillAvailable = timeTillNextStackReady;
		}

		const primaryStacksAvailable = cd.stacksAvailable();
		const primaryMaxStacks = cd.maxStacks();

		const secondaryRecastTime = secondaryCd?.currentStackCd() ?? 0;

		// to be displayed together when hovered on a skill
		let timeTillDamageApplication = 0;
		if (status.ready()) {
			// TODO, should this be changed to capturedCastTime > 0 because of stuff like Iaijutsu?
			if (skill.kind === "spell") {
				const timeTillCapture = instantCastAvailable
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
			status,
			stacksAvailable:
				secondaryMaxStacks > 0 ? secondaryStacksAvailable : primaryStacksAvailable,
			maxStacks: Math.max(primaryMaxStacks, secondaryMaxStacks),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime,
			secondaryCdRecastTime: secondaryRecastTime,
			timeTillNextStackReady,
			timeTillSecondaryReady,
			timeTillAvailable,
			timeTillDamageApplication,
			capturedManaCost,
			highlight,
			llCovered,
			usedAt: this.getDisplayTime(),
		};
	}

	useSkill(skillName: ActionKey, node: ActionNode, actionIndex: number) {
		const skill = this.skillsList.get(skillName);

		// Process skill execution effects regardless of skill kind
		skill.onExecute(this, node);

		// If there is no falloff field specified, then reset the node's targetCount to 1,
		// ignoring whatever input the user gave
		if (skill.falloff === undefined && !skill.savesTargets) {
			node.forceOneTarget();
		}
		if (skill.aoeHeal) {
			node.setHealTargetCount(this.resources.get("PARTY_SIZE").availableAmount());
		}
		// Process the remainder of the skills effects dependent on the kind of skill
		if (skill.kind === "spell" || skill.kind === "weaponskill") {
			this.useSpellOrWeaponskill(skill, node, actionIndex);
		} else if (skill.kind === "ability") {
			this.useAbility(skill, node);
		} else if (skill.kind === "limitbreak") {
			this.useLimitBreak(skill, node, actionIndex);
		}
	}

	// When a skill from a timeline editor change/old file load would be invalid, we still want
	// to roll its cast/recast and animation locks.
	useInvalidSkill(skillName: ActionKey, node: ActionNode) {
		const skill = this.skillsList.get(skillName);
		if (skill.falloff === undefined) {
			node.forceOneTarget();
		}
		if (skill.aoeHeal) {
			node.setHealTargetCount(this.resources.get("PARTY_SIZE").availableAmount());
		}
		if (skill.kind === "spell" || skill.kind === "weaponskill") {
			const capturedCastTime = skill.castTimeFn(this);
			const recastTime = skill.recastTimeFn(this);
			const isInstant = capturedCastTime === 0 || skill.isInstantFn(this);
			if (isInstant) {
				this.resources.takeResourceLock(
					"NOT_ANIMATION_LOCKED",
					skill.animationLockFn(this),
				);
			} else {
				this.resources.takeResourceLock(
					"NOT_CASTER_TAXED",
					this.config.getAfterTaxCastTime(capturedCastTime),
				);
			}
			this.cooldowns.get("cd_GCD").useStackWithRecast(this.config.getAfterTaxGCD(recastTime));
		} else if (skill.kind === "ability") {
			this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", skill.animationLockFn(this));
		} else if (skill.kind === "limitbreak") {
			const capturedCastTime = skill.castTimeFn(this);
			const slidecastTime = GameConfig.getSlidecastWindow(capturedCastTime);
			this.resources.takeResourceLock(
				"NOT_ANIMATION_LOCKED",
				slidecastTime + skill.animationLockFn(this),
			);
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
							potencyFactor: buff.info.damageFactor,
						});
					}
				}
			});

		return buffCollection;
	}

	// Attempt to consume stacks of the specified resource, removing any active timers if
	// all stacks have been consumed.
	// Consumes only 1 stack by default; consumes all available stacks when `consumeAll` is set.
	// Returns true if at least one stack was consumed.
	tryConsumeResource(rscType: ResourceKey, consumeAll: boolean = false) {
		const resource = this.resources.get(rscType);
		const toConsume = consumeAll ? resource.availableAmount() : 1;
		if (toConsume > 0 && resource.available(toConsume)) {
			resource.consume(toConsume);
			if (!resource.available(toConsume)) {
				resource.removeTimer();
			}
			return true;
		}
		return false;
	}

	tryRemoveDebuff(rscType: ResourceKey, targetNumber: number) {
		const resource = this.debuffs.get(rscType, targetNumber);
		const toConsume = resource.availableAmount();
		if (toConsume > 0) {
			resource.consume(toConsume);
			resource.removeTimer();
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
}
