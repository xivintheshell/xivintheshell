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
	OverTimeBuff,
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
import { Modifiers, Potency, PotencyKind, PotencyModifier, PotencyModifierType } from "./Potency";
import { Buff } from "./Buffs";

import type { BLMState } from "./Jobs/BLM";
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
	hotTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList<GameState>;
	displayedSkills: DisplayedSkills;
	private autoAttackDelay: number; // auto attack delay

	overTimeEffectGroups: OverTimeRegistrationGroup[] = [];
	dotResources: ResourceKey[] = [];
	hotResources: ResourceKey[] = [];
	excludedDoTs: ResourceKey[] = [];
	excludedHoTs: ResourceKey[] = [];
	fullTimeDoTs: ResourceKey[] = [];
	#groundTargetDoTs: ResourceKey[] = [];
	#groundTargetHoTs: ResourceKey[] = [];
	dotSkills: ActionKey[] = [];
	hotSkills: ActionKey[] = [];
	#exclusiveDots: Map<ResourceKey, ResourceKey[]> = new Map();
	#exclusiveHots: Map<ResourceKey, ResourceKey[]> = new Map();

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

		this.autoAttackDelay = 2.5; // defaults to 2.5
	}

	get statusPropsGenerator(): StatusPropsGenerator<PlayerState> {
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
			let lucid = this.resources.get("LUCID_DREAMING") as OverTimeBuff;
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

		let recurringHotTick = () => {
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
		petSkills.forEach((skill) => this.dotSkills.push(skill));

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

	// Job code may override to handle setting up any job-specific recurring events, such as BLM's Polyglot timer
	jobSpecificRegisterRecurringEvents() {}

	// Job code may override to handle any on-tick effects of a DoT, like pre-Dawntrail Thundercloud
	jobSpecificOnResolveDotTick(_dotResource: ResourceKey) {}
	jobSpecificOnResolveHotTick(_hotResource: ResourceKey) {}

	// Job code may override to handle adding buff covers for the timeline
	jobSpecificAddDamageBuffCovers(_node: ActionNode, _skill: Skill<PlayerState>) {}
	jobSpecificAddSpeedBuffCovers(_node: ActionNode, _skill: Skill<PlayerState>) {}
	jobSpecificAddHealingBuffCovers(_node: ActionNode, _skill: Skill<PlayerState>) {}

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
		// TODO: HANDLE AUTO ATTACK POTENCY
		this.jobSpecificOnAutoAttack();
	}

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
		this.handleOverTimeTick(dotResource, "damage");
	}
	handleHoTTick(hotResource: ResourceKey) {
		this.handleOverTimeTick(hotResource, "healing");
	}
	handleOverTimeTick(effect: ResourceKey, kind: PotencyKind) {
		const effectBuff = this.resources.get(effect) as OverTimeBuff;
		if (effectBuff.availableAmountIncludingDisabled() > 0) {
			// For floor effects that are toggled off, don't resolve its potency, but increment the tick count.
			if (effectBuff.node && effectBuff.enabled) {
				const p = effectBuff.node.getOverTimePotencies(effect, kind)[effectBuff.tickCount];
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

	requestToggleBuff(buffName: ResourceKey) {
		let rsc = this.resources.get(buffName);

		// autos are different
		if (buffName === "AUTOS_ENGAGED") {
			this.toggleAutosEngaged();
			return true;
		}

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
			// Special case: cancelling Kardia on self also cancels Kardion on partner
			if (buffName === "KARDIA") {
				this.tryConsumeResource("KARDION");
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
	addRecurringAutoAttackEvent(initialDelay: number, recurringDelay: number) {
		const autoAttackEvent = (initialDelay: number, recurringDelay: number) => {
			const event = new Event("aa tick", initialDelay, () => {
				if (this.resources.get("AUTOS_ENGAGED").available(1) && this.isInCombat()) {
					// do an auto
					this.onAutoAttack();
				}
				this.addEvent(autoAttackEvent(recurringDelay, recurringDelay));
			});
			event.addTag(EventTag.AutoTick);
			return event;
		};
		this.addEvent(autoAttackEvent(initialDelay, recurringDelay));
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
		}

		// calculate reccuring delay
		const defaultAutoDelay = 3;
		const autoDelay = reccuringDelay ? reccuringDelay : defaultAutoDelay;

		let initDelay = 0;
		if (initialDelay === -1) {
			initDelay = autoDelay;
		} else {
			initDelay = initialDelay ?? autoDelay;
		}
		// start reccuring event with a delay
		this.addRecurringAutoAttackEvent(initDelay, autoDelay);
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
			this.startAutoAttackTimer(currentTimer === -1 ? 3 : currentTimer);
		} else {
			// toggle autos OFF
			this.resources.get("AUTOS_ENGAGED").consume(1);
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
		skill: Spell<PlayerState> | Weaponskill<PlayerState>,
		capturedCastTime: number,
		doesDamage: boolean,
	) {
		// autos helper constants
		const hasCast = capturedCastTime !== 0;
		const autosEngaged = this.resources.get("AUTOS_ENGAGED").available(1);
		const recurringAutoDelay = this.autoAttackDelay; // <<---- placeholder for changing auto attack speed
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
					const aaDelay =
						capturedCastTime +
						(currentDelay === -1 ? recurringAutoDelay : currentDelay);
					this.startAutoAttackTimer(aaDelay, recurringAutoDelay, capturedCastTime);
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
		skill: Spell<PlayerState> | Weaponskill<PlayerState>,
		node: ActionNode,
		actionIndex: number,
	) {
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
				targetCount: node.targetCount,
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
				targetCount: node.healTargetCount,
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
			let manaCost = skill.manaCostFn(this);
			if (manaCost > this.resources.get("MANA").availableAmount()) {
				controller.reportInterruption({
					failNode: node,
					failIndex: actionIndex,
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
				if (this.hasResourceAvailable("TINCTURE") && !node.hasBuff(BuffType.Tincture)) {
					node.addBuff(BuffType.Tincture);
				}

				this.jobSpecificAddDamageBuffCovers(node, skill);
			}

			const heals = healingPotencyNumber > 0;
			if (healingPotency) {
				healingPotency.snapshotTime = this.getDisplayTime();
				const mods: PotencyModifier[] = [];
				if (this.hasResourceAvailable("TINCTURE")) {
					mods.push(Modifiers.Tincture);
				}
				mods.push(...skill.jobHealingPotencyModifiers(this));
				healingPotency.modifiers = mods;
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
		if (secondaryCd) {
			secondaryCd.useStack();
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
		if (potencyNumber > 0 || skill.drawsAggro) {
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
		}

		// AUTO ATTACK HANDLING
		// If ability has a potency or an ability targets a boss like provoke/reprisal, start the auto
		// by default abilities dont start autos

		const autosEngaged = this.resources.get("AUTOS_ENGAGED").available(1);
		const recurringAutoDelay = this.autoAttackDelay; // <<---- placeholder for changing auto attack speed
		const currentDelay = this.findAutoAttackTimerInQueue();
		const startsAutos = skill.startsAuto || (potency && potencyNumber > 0); // <<---  for spells starting autos

		if (startsAutos) {
			if (!this.isInCombat()) {
				const aaDelay = currentDelay === -1 ? recurringAutoDelay : currentDelay;
				this.startAutoAttackTimer(aaDelay, recurringAutoDelay, undefined);
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
				targetCount: node.healTargetCount,
				falloff: 0, // Heals do not have AoE falloff
			});
			const mods: PotencyModifier[] = [];
			if (this.hasResourceAvailable("TINCTURE")) {
				mods.push(Modifiers.Tincture);
			}
			mods.push(...skill.jobHealingPotencyModifiers(this));
			healingPotency.modifiers = mods;
			node.addHealingPotency(healingPotency);
		}

		if (potencyNumber > 0 && !node.hasBuff(BuffType.Tincture)) {
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

		// animation lock
		this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", skill.animationLockFn(this));
	}

	/**
	 * Attempt to use a limit break.
	 *
	 * If the spell is a hardcast, this enqueues the cast confirm event. If it is instant, then
	 * it performs the confirmation immediately.
	 */
	useLimitBreak(skill: LimitBreak<PlayerState>, node: ActionNode, actionIndex: number) {
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
				targetCount: node.healTargetCount,
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
	getOverriddenHots(hotName: ResourceKey): ResourceKey[] {
		return this.#exclusiveHots.get(hotName) ?? [];
	}

	applyDoT(dotName: ResourceKey, node: ActionNode) {
		this.applyOverTimeEffect(dotName, node, "damage");
	}
	applyHoT(hotName: ResourceKey, node: ActionNode) {
		this.applyOverTimeEffect(hotName, node, "healing");
	}
	applyOverTimeEffect(effectName: ResourceKey, node: ActionNode, kind: PotencyKind) {
		const effectBuff = this.resources.get(effectName) as OverTimeBuff;
		const effectDuration = (getResourceInfo(this.config.job, effectName) as ResourceInfo)
			.maxTimeout;

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
			controller.reportOverTimeDrop(this.getDisplayTime(), removeEffect, kind);
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
			controller.reportOverTimeStart(this.getDisplayTime(), effectName, kind);
			this.resources.addResourceEvent({
				rscType: effectName,
				name: "drop " + effectName + otName,
				delay: effectDuration,
				fnOnRsc: (rsc) => {
					rsc.consume(1);
					controller.reportOverTimeDrop(this.getDisplayTime(), effectName, kind);
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
	addHoTPotencies(props: OverTimePotencyProps) {
		this.addOverTimePotencies(props, "healing");
	}
	addOverTimePotencies(props: OverTimePotencyProps, kind: PotencyKind) {
		const mods: PotencyModifier[] = props.modifiers ?? [];
		// If the job call didn't add Tincture, we can do that here
		if (this.hasResourceAvailable("TINCTURE") && !mods.includes(Modifiers.Tincture)) {
			mods.push(Modifiers.Tincture);
			props.node.addBuff(BuffType.Tincture);
		}

		const effectDuration = (getResourceInfo(this.config.job, props.effectName) as ResourceInfo)
			.maxTimeout;
		const isGroundTargeted =
			this.#groundTargetDoTs.includes(props.effectName) ||
			this.#groundTargetHoTs.includes(props.effectName);
		const effectTicks =
			effectDuration / (props.tickFrequency ?? 3) + (isGroundTargeted ? 1 : 0);

		const tickDescriptor = kind === "damage" ? "DoT" : "HoT";
		const targetCount = kind === "damage" ? props.node.targetCount : props.node.healTargetCount;

		for (let i = 0; i < effectTicks; i++) {
			let overtimePotency = new Potency({
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
				targetCount,
				falloff: 0, // assume all overtime effects have no falloff
			});
			overtimePotency.modifiers = mods;
			props.node.addOverTimePotency(overtimePotency, props.effectName, kind);
		}
	}

	refreshDot(props: OverTimePotencyProps, forceRefresh: boolean = false) {
		this.refreshOverTimeEffect(props, "damage", forceRefresh);
	}
	refreshHot(props: OverTimePotencyProps) {
		this.refreshOverTimeEffect(props, "healing", false);
	}
	refreshOverTimeEffect(props: OverTimePotencyProps, kind: PotencyKind, forceRefresh: boolean) {
		if (!forceRefresh && !this.hasResourceAvailable(props.effectName)) {
			return;
		}

		this.addOverTimePotencies(props, kind);

		this.applyOverTimeEffect(props.effectName, props.node, kind);
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
		let timeTillNextStackReady = cd.timeTillNextStackAvailable() % cd.currentStackCd();
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
		if (skill.falloff === undefined) {
			node.setTargetCount(1);
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
			node.setTargetCount(1);
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
