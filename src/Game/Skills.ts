import {Aspect, BuffType, LevelSync, ProcMode, ResourceType, SkillName, WarningType} from './Common'
// @ts-ignore
import {controller} from "../Controller/Controller";
import {ShellJob, ShellInfo} from "../Controller/Common";
import {Event, DoTBuff, EventTag, Resource} from "./Resources";
import {ActionNode} from "../Controller/Record";
import {GameState} from "./GameState";
import {getPotencyModifiersFromResourceState, Potency} from "./Potency";
import {TraitName, Traits} from './Traits';

export interface SkillCaptureCallbackInfo {
	capturedManaCost: number
}

export interface SkillApplicationCallbackInfo {

}

export interface SkillError {
	message: string; // TODO localize
}

// Represent the result of attempting to perform a skill. If an error occurs (for example, enochian
// dropped after the start of an F4 cast but before the cast confirm window), then return a
// SkillError. If the skill succeeded, then return a list of events to be enqueued.
export type SkillResult = Event[] | SkillError;

// if skill is lower than current level, auto upgrade until (no more upgrade options) or (more upgrades will exceed current level)
// if skill is higher than current level, auto downgrade until skill is at or below current level. If run out of downgrades, throw error
export type SkillAutoReplace = {
	trait: TraitName,
	otherSkill: SkillName,
}

export type ResourceCalculationFn<T> = (state: ReadOnly<T>) => number;
export type ValidateAttemptFn<T> = (state: ReadOnly<T>) => SkillError?;
export type IsInstantFn<T> = (state: T) => bool;
export type EffectFn<T> = (state: ReadOnly<T>) => SkillResult;


// TODO split this interface between GCDs + oGCD abilities, as some properties are only relevant
// to one or the other
export interface Skill<T extends GameState> {
	// === COSMETIC PROPERTIES ===
	readonly name: SkillName;
	readonly assetPath: string; // path relative to the Components/Asset/Skills folder 
	readonly unlockLevel: number;
	readonly autoUpgrade?: SkillAutoReplace;
	readonly autoDowngrade?: SkillAutoReplace;
	readonly cdName: ResourceType;
	readonly aspect: Aspect;
	readonly isSpell: boolean;

	/* === RESOURCE VALIDATION ===
	 * The following functions are all called when a skill usage is attempted, and determine properties
	 * like cast time, recast time, mana cost, and potency based on the current game state.
	 * They should not actually consume any resources, as those are only consumed when the skill
	 * usage is confirmed.
	 */
	readonly castTimeFn: ResourceCalculationFn;
	readonly recastTimeFn: ResourceCalculationFn;
	// TODO can MP cost ever change between cast start + confirm, e.g. if you use an ether kit or
	// lost font of magic and cast flare with hearts?
	readonly manaCostFn: ResourceCalculationFn;
	// Determine the potency of the ability before any party buffs or modifiers.
	readonly potencyFn: ResourceCalculationFn;

	// Determine whether the skill can be executed in the current state.
	// Should be called when the button is pressed.
	readonly validateAttempt: ValidateAttemptFn;

	/*
	 * Consume any resource that would make this skill instant cast, and return
	 * true if the skill is instant. 
	 * 	
	 * This function should be called when determining whether to perform `onConfirm` immediately;
	 * `onApplication` will still only be called after the application delay of this skill.
	 *	
	 * Unlike the cast time/MP cost functions, this function SHOULD consume resources (such as
	 * the Swiftcast buff) from the GameState. This should always be called directly after `validateAttempt`,
	 * so the GameState should be valid, and this lets us define resource consumption priority
	 * for each individual skill without repetition.
	 *	
	 * Because this may mutate the state, this function must be called only ONCE per skill usage.
	 */
	readonly isInstantFn: IsInstantFn;

	/* === EFFECTS ===
	 * The following functions determine the effects of using a skill.
	 * On success, they will return a list of events to be applied.
	 * On failure, they will return an error that should be propagated.
	 * 
	 * Return a list of Event objects when the action is applied.
	 * If the action became invalid between the start of the cast and the cast confirmation,
	 * then return a SkillError instead.
	 * This should be called at the function's cast confirm window.
	 *
	 * If this is a spell that is normally hardcast, but was somehow made instant,
	 * then the game loop will call `onConfirm` immediately after validation.
	 */
	readonly onConfirm: EffectFn;

	/* Return a list of events to apply at the time of skill application. This includes
	 * damage events and buffs/debuffs.
	 * If `onConfirm` did not error, then the game loop MUST automatically enqueue this function,
	 * rather than `onConfirm` itself enqueuing an `onApplication` event.
	 */
	readonly onApplication: EffectFn;

	// The simulation delay, in seconds, between which `onConfirm` and `onApplication` are called.
	readonly applicationDelay: number;
}


// Map tracking skills for each job.
// This is automatically populated by the makeGCD and makeAbility helper functions.
// Unfortunately, I [sz] don't really know of a good way to encode the relationship between
// the ShellJob and Skill<T>, so we'll just have to live with performing casts at certain locations.
export const skillMap: Map<ShellJob, Map<SkillName, Skill<GenericState>>> = new Map();

// can't iterate over a const enum so just populate manually :/
[
	ShellJob.BLM,
	ShellJob.PCT,
].forEach((job) => skillMap.set(job, new Map()));


/**
 * Declare a GCD skill.
 *
 * Only the skill's name and unlock level are mandatory. All optional params default as follows:
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 * - autoUpgrade + autoDowngrade: remain undefined
 * - aspect: Aspect.Other
 * - castTime: 0
 * - recastTime: 2.5
 * - manaCost: 0
 * - potency: 0
 * - applicationDelay: 0
 * - validateAttempt: function always returning undefined (no error)
 * - isInstantFn: function consuming no resources and always returning true
 * - onConfirm: function always returning empty list (no events enqueued)
 * - onApplication: function returning a damage event if `basePotency` is a non-zero scalar, else empty list
 * 
 * TODO: If we ever branch out to non-BLM/PCT jobs, we should distinguish between
 * spells and weaponskills for sps/sks calculation purposes.
 */
export const makeGCD<T> = (jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, params: Partial<{
	assetPath: string,
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	aspect: Aspect,
	castTime: number | ResourceCalculationFn,
	recastTime: number | ResourceCalculationFn,
	manaCost: number | ResourceCalculationFn,
	potency: number | ResourceCalculationFn,
	applicationDelay: number,
	validateAttempt: ValidateAttemptFn,
	isInstantFn: IsInstantFn,
	onConfirm: EffectFn,
	onApplication: EffectFn,
}>): Skill<T> => {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const fnify = (arg?: number | ResourceCalculationFn, defaultValue: number): ResourceCalculationFn => {
		if (arg === undefined) {
			return (state) => defaultValue;
		} else if (typeof arg === "number") {
			return (state) => arg;
		} else {
			return arg;
		}
	};
	const info = {
		name: name,
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: ResourceType.cd_GCD,
		aspect: params.aspect ?? Aspect.Other,
		isSpell: true,
		castTimeFn: fnify(params.castTime, 0),
		recastTimeFn: fnify(params.recastTime, 2.5),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: fnify(params.potency, 0),
		validateAttempt: params.validateAttempt ?? ((state) => undefined);
		isInstantFn: params.isInstant ?? ((state) => true);
		onConfirm: params.onConfirm ?? ((state) => []);
		// TODO encode damage event
		onApplication: params.onApplication ?? ((state) => []);
		applicationDelay: params.applicationDelay ?? 0,
	};
	jobs.forEach((job) => skillInfosMap.get(job)!.set(info.name, info));
	return info;
};


/**
 * Declare an oGCD ability.
 *
 * Only the ability's name, unlock level, and cooldown are mandatory. All optional params default as follows:
 * - autoUpgrade + autoDowngrade: remain undefined
 * - basePotency: 0
 * - applicationDelay: 0 if basePotency is defined, otherwise left undefined
 * - onCapture: empty function
 * - onApplication: empty function
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 *
 * Cast time and mana cost are only relevant for BLU (as far as I [sz] know). Let us pray we never
 * cross that particular bridge.
 */
export const makeAbility = (jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, cdName: ResourceType, params: Partial<{
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	basePotency: number,
	applicationDelay: number,
	onCapture: any,  // TODO
	onApplication: any,  // TODO
	assetPath: string,
}>): SkillInfo => {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const info = {
		name: name,
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: cdName,
		aspect: Aspect.Other,
		isSpell: false,
		baseCastTime: 0,
		baseManaCost: 0,
		basePotency: params.basePotency ?? 0,
		applicationDelay: params.applicationDelay ?? 0,
		onCapture: params.onCapture ?? (() => {}),
		onApplication: params.onApplication ?? (() => {}),
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
	};
	jobs.forEach((job) => skillInfosMap.get(job)!.set(info.name, info));
	return info;
}

// Dummy skill to avoid a hard crash when a skill info isn't found
const NEVER_SKILL = makeGCD([], SkillName.Never, 1, {});


export class Skill {
	readonly name: SkillName;
	readonly available: () => boolean;
	readonly use: (game: GameState, node: ActionNode) => void;
	info: SkillInfo;

	constructor(name: SkillName, requirementFn: ()=>boolean, effectFn: (game: GameState, node: ActionNode)=>void) {
		this.name = name;
		this.available = requirementFn;
		this.use = effectFn;
		let info = skillInfosMap.get(ShellInfo.job)!.get(name);
		if (!info) {
			info = NEVER_SKILL;
			console.error(`Skill info for ${name} not found!`);
		}
		this.info = info;
	}
}

export class SkillsList extends Map<SkillName, Skill> {
	constructor(game: GameState) {
		super();

		let skillsList = this;

		let addResourceAbility = function(props: {
			skillName: SkillName,
			rscType: ResourceType,
			instant: boolean,
			duration: number,
			additionalEffect?: () => void
		}) {
			let takeEffect = (node: ActionNode) => {
				let resource = game.resources.get(props.rscType);
				if (resource.available(1)) {
					resource.overrideTimer(game, props.duration);
				} else {
					resource.gain(1);
					game.resources.addResourceEvent({
						rscType: props.rscType,
						name: "drop " + props.rscType,
						delay: props.duration,
						fnOnRsc: (rsc: Resource) => {
							rsc.consume(1);
						}
					});
				}
				node.resolveAll(game.getDisplayTime());
				if (props.additionalEffect) {
					props.additionalEffect();
				}
			};
			skillsList.set(props.skillName, new Skill(props.skillName,
				() => {
					return true;
				},
				(game, node) => {
					game.useInstantSkill({
						skillName: props.skillName,
						onCapture: props.instant ? ()=>takeEffect(node) : undefined,
						onApplication: props.instant ? undefined : ()=>takeEffect(node),
						dealDamage: false,
						node: node
					});
				}
			));
		}

		// Blizzard
		skillsList.set(SkillName.Blizzard, new Skill(SkillName.Blizzard,
			() => {
				return true;
			},
			(game: GameState, node: ActionNode) => {
				if (game.getFireStacks() === 0) // no AF
				{
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.UmbralIce, 1);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else // in AF
				{
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		let gainFirestarterProc = function(game: GameState) {
			let fs = game.resources.get(ResourceType.Firestarter);
			// re-measured in DT, screen recording at: https://drive.google.com/file/d/1MEFnd-m59qx1yIaZeehSsAxjhLMsWBuw/view?usp=drive_link
			let duration = 30.5;
			if (fs.available(1)) {
				fs.overrideTimer(game, duration);
			} else {
				fs.gain(1);
				game.resources.addResourceEvent({
					rscType: ResourceType.Firestarter,
					name: "drop firestarter proc",
					delay: duration,
					fnOnRsc: (rsc: Resource)=>{
						rsc.consume(1);
					}
				});
			}
		}

		let potentiallyGainFirestarter = function(game: GameState) {
			let rand = game.rng(); // firestarter proc
			if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) gainFirestarterProc(game);
		}

		// Fire
		skillsList.set(SkillName.Fire, new Skill(SkillName.Fire,
			() => {
				return true;
			},
			(game, node) => {
				if (game.getIceStacks() === 0) { // in fire or no enochian
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 1);
						game.startOrRefreshEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else {
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Transpose
		skillsList.set(SkillName.Transpose, new Skill(SkillName.Transpose,
			() => {
				return game.getFireStacks() > 0 || game.getIceStacks() > 0; // has UI or AF
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Transpose,
					onCapture: () => {
						if (game.getFireStacks() === 0 && game.getIceStacks() === 0) {
							return;
						}
						if (game.getFireStacks() > 0) {
							game.switchToAForUI(ResourceType.UmbralIce, 1);
						} else {
							game.switchToAForUI(ResourceType.AstralFire, 1);
						}
						game.startOrRefreshEnochian();
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Ley Lines
		addResourceAbility({
			skillName: SkillName.LeyLines,
			rscType: ResourceType.LeyLines,
			instant: false,
			duration: 30,
			additionalEffect: () => {
				game.resources.get(ResourceType.LeyLines).enabled = true;
			}
		});

		let applyThunderDoT = function(game: GameState, node: ActionNode, skillName: SkillName) {
			let thunder = game.resources.get(ResourceType.ThunderDoT) as DoTBuff;
			const thunderDuration = (skillName === SkillName.Thunder3 && 27) || 30;
			if (thunder.available(1)) {
				console.assert(thunder.node);
				(thunder.node as ActionNode).removeUnresolvedPotencies();

				thunder.overrideTimer(game, thunderDuration);
			} else {
				thunder.gain(1);
				controller.reportDotStart(game.getDisplayTime());
				game.resources.addResourceEvent({
					rscType: ResourceType.ThunderDoT,
					name: "drop thunder DoT",
					delay: thunderDuration,
					fnOnRsc: rsc=>{
						  rsc.consume(1);
						  controller.reportDotDrop(game.getDisplayTime());
					 }
				});
			}
			thunder.node = node;
			thunder.tickCount = 0;
		}

		let addThunderPotencies = function(node: ActionNode, skillName: SkillName.Thunder3 | SkillName.HighThunder) {
			let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Lightning);
			let thunder = skillsList.get(skillName);

			// initial potency
			let pInitial = new Potency({
				config: controller.record.config ?? controller.gameConfig,
				sourceTime: game.getDisplayTime(),
				sourceSkill: skillName,
				aspect: Aspect.Lightning,
				basePotency: thunder ? thunder.info.basePotency : 150,
				snapshotTime: undefined,
				description: ""
			});
			pInitial.modifiers = mods;
			node.addPotency(pInitial);

			// dots
			const thunderTicks = (skillName === SkillName.Thunder3 && 9) || 10;
			const thunderTickPotency = (skillName === SkillName.Thunder3 && 50) || 60;
			for (let i = 0; i < thunderTicks; i++) {
				let pDot = new Potency({
					config: controller.record.config ?? controller.gameConfig,
					sourceTime: game.getDisplayTime(),
					sourceSkill: skillName,
					aspect: Aspect.Lightning,
					basePotency: game.config.adjustedDoTPotency(thunderTickPotency),
					snapshotTime: undefined,
					description: "DoT " + (i+1) + `/${thunderTicks}`
				});
				pDot.modifiers = mods;
				node.addPotency(pDot);
			}
		}

		let addThunders = function(skillName: SkillName.Thunder3 | SkillName.HighThunder) {
			skillsList.set(skillName, new Skill(skillName,
				() => {
					return game.resources.get(ResourceType.Thunderhead).available(1);
				},
				(game, node) => {
					// potency
					addThunderPotencies(node, skillName); // should call on capture
					let onHitPotency = node.getPotencies()[0];
					node.getPotencies().forEach(p=>{ p.snapshotTime = game.getDisplayTime(); });
	
					// tincture
					if (game.resources.get(ResourceType.Tincture).available(1)) {
						node.addBuff(BuffType.Tincture);
					}
	
					game.useInstantSkill({
						skillName: skillName,
						onApplication: () => {
							controller.resolvePotency(onHitPotency);
							applyThunderDoT(game, node, skillName);
						},
						dealDamage: false,
						node: node
					});
					let thunderhead = game.resources.get(ResourceType.Thunderhead);
					thunderhead.consume(1);
					thunderhead.removeTimer();
				}
			));
		}
		addThunders(SkillName.Thunder3);
		addThunders(SkillName.HighThunder);

		// Manaward
		addResourceAbility({skillName: SkillName.Manaward, rscType: ResourceType.Manaward, instant: false, duration: 20});

		// Manafont
		skillsList.set(SkillName.Manafont, new Skill(SkillName.Manafont,
			() => {
				return game.resources.get(ResourceType.AstralFire).availableAmount() > 0;
			},
			(game, node) => {
				let useSkillEvent = game.useInstantSkill({
					skillName: SkillName.Manafont,
					onCapture: () => {
						game.resources.get(ResourceType.AstralFire).gain(3);
						game.resources.get(ResourceType.UmbralHeart).gain(3);

						if (Traits.hasUnlocked(TraitName.AspectMasteryV, game.config.level))
							game.resources.get(ResourceType.Paradox).gain(1);

						game.gainThunderhead();
						game.startOrRefreshEnochian();
						node.resolveAll(game.getDisplayTime());
					},
					onApplication: () => {
						game.resources.get(ResourceType.Mana).gain(10000);
					},
					dealDamage: false,
					node: node
				});
				useSkillEvent.addTag(EventTag.ManaGain);
			}
		));

		// Fire 3
		skillsList.set(SkillName.Fire3, new Skill(SkillName.Fire3,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Firestarter).available(1)) {
					game.useInstantSkill({
						skillName: SkillName.Fire3,
						dealDamage: true,
						node: node
					});
					game.switchToAForUI(ResourceType.AstralFire, 3);
					game.startOrRefreshEnochian();
					game.resources.get(ResourceType.Firestarter).consume(1);
					game.resources.get(ResourceType.Firestarter).removeTimer();
				} else {
					game.castSpell({skillName: SkillName.Fire3, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Blizzard 3
		skillsList.set(SkillName.Blizzard3, new Skill(SkillName.Blizzard3,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard3, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Freeze
		skillsList.set(SkillName.Freeze, new Skill(SkillName.Freeze,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Freeze, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Flare
		skillsList.set(SkillName.Flare, new Skill(SkillName.Flare,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Flare, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let uh = game.resources.get(ResourceType.UmbralHeart);
					let mana = game.resources.get(ResourceType.Mana);
					let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
					// mana
					game.resources.get(ResourceType.Mana).consume(manaCost);
					uh.consume(uh.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);

					if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, game.config.level))
						game.resources.get(ResourceType.AstralSoul).gain(3);

					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Blizzard 4
		skillsList.set(SkillName.Blizzard4, new Skill(SkillName.Blizzard4,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard4, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Fire 4
		skillsList.set(SkillName.Fire4, new Skill(SkillName.Fire4,
			() => {
				return game.getFireStacks() > 0; // in AF
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Fire4, onCapture: (cap: SkillCaptureCallbackInfo) => {
					if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, game.config.level))
						game.resources.get(ResourceType.AstralSoul).gain(1);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Between the Lines
		skillsList.set(SkillName.BetweenTheLines, new Skill(SkillName.BetweenTheLines,
			() => {
				let ll = game.resources.get(ResourceType.LeyLines);
				return ll.availableAmountIncludingDisabled() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.BetweenTheLines,
					dealDamage: false,
					onCapture: ()=>{node.resolveAll(game.getDisplayTime())},
					node: node
				});
			}
		));

		// Aetherial Manipulation
		skillsList.set(SkillName.AetherialManipulation, new Skill(SkillName.AetherialManipulation,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.AetherialManipulation,
					dealDamage: false,
					onCapture: ()=>{node.resolveAll(game.getDisplayTime())},
					node: node
				});
			}
		));

		// Triplecast
		skillsList.set(SkillName.Triplecast, new Skill(SkillName.Triplecast,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Triplecast,
					onCapture: () => {
						let triple = game.resources.get(ResourceType.Triplecast);
						if (triple.pendingChange) triple.removeTimer(); // should never need this, but just in case
						triple.gain(3);
						// 15.7s: see screen recording: https://drive.google.com/file/d/1qoIpAMK2KAKETgID6a3p5dqkeWRcNDdB/view?usp=drive_link
						game.resources.addResourceEvent({
							rscType: ResourceType.Triplecast,
							name: "drop remaining Triple charges", delay: 15.7, fnOnRsc:(rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							}
						});
						node.resolveAll(game.getDisplayTime());
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Foul
		skillsList.set(SkillName.Foul, new Skill(SkillName.Foul,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				if (Traits.hasUnlocked(TraitName.EnhancedFoul, game.config.level)) {
					game.resources.get(ResourceType.Polyglot).consume(1);
					game.useInstantSkill({
						skillName: SkillName.Foul,
						dealDamage: true,
						node: node
					});
				}
				else {
					game.castSpell({skillName: SkillName.Foul, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Polyglot).consume(1);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Despair
		skillsList.set(SkillName.Despair, new Skill(SkillName.Despair,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Despair, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let mana = game.resources.get(ResourceType.Mana);
					// mana
					mana.consume(mana.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Umbral Soul
		skillsList.set(SkillName.UmbralSoul, new Skill(SkillName.UmbralSoul,
			() => {
				return game.getIceStacks() > 0;
			},
			(game, node) => {
				game.castSpell({
					skillName: SkillName.UmbralSoul,
					onCapture: () => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.resources.get(ResourceType.UmbralHeart).gain(1);
						game.startOrRefreshEnochian();
						// halt
						let enochian = game.resources.get(ResourceType.Enochian);
						enochian.removeTimer();
					},
					onApplication: (app: SkillApplicationCallbackInfo) => {},
					node: node
				});
			}
		));

		// Xenoglossy
		skillsList.set(SkillName.Xenoglossy, new Skill(SkillName.Xenoglossy,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				game.resources.get(ResourceType.Polyglot).consume(1);
				game.useInstantSkill({
					skillName: SkillName.Xenoglossy,
					dealDamage: true,
					node: node
				});
			}
		));

		let addFire2 = function(skillName: SkillName) {
			skillsList.set(skillName, new Skill(skillName,
				() => { return true; },
				(game, node) => {
					game.castSpell({skillName: skillName, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			))};
		[SkillName.Fire2, SkillName.HighFire2].forEach(addFire2);

		let addBlizzard2 = function(skillName: SkillName) {
			skillsList.set(skillName, new Skill(skillName,
				() => { return true; },
				(game, node) => {
					game.castSpell({skillName: skillName, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.UmbralIce, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			))};
		[SkillName.Blizzard2, SkillName.HighBlizzard2].forEach(addBlizzard2);

		// Amplifier
		skillsList.set(SkillName.Amplifier, new Skill(SkillName.Amplifier,
			() => {
				return game.getIceStacks() > 0 || game.getFireStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Amplifier,
					onCapture: () => {
						let polyglot = game.resources.get(ResourceType.Polyglot);
						if (polyglot.available(polyglot.maxValue)) {
							controller.reportWarning(WarningType.PolyglotOvercap)
						}
						polyglot.gain(1);
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Paradox
		skillsList.set(SkillName.Paradox, new Skill(SkillName.Paradox,
			() => {
				return game.resources.get(ResourceType.Paradox).available(1);
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Paradox, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.Paradox).consume(1);
					// enochian (refresh only) (which also clears the halt status)
					if (game.hasEnochian()) {
						game.startOrRefreshEnochian();
					}
					if (game.getIceStacks() > 0) {
						game.resources.get(ResourceType.UmbralIce).gain(1);
					} else if (game.getFireStacks() > 0) {// firestarter proc
						game.resources.get(ResourceType.AstralFire).gain(1);
						gainFirestarterProc(game);
					} else {
						console.assert(false);
					}
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Flare Star
		skillsList.set(SkillName.FlareStar, new Skill(SkillName.FlareStar,
			() => {
				return game.resources.get(ResourceType.AstralSoul).available(6);
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.FlareStar, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.AstralSoul).consume(6);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Retrace
		skillsList.set(SkillName.Retrace, new Skill(SkillName.Retrace,
			() => {
				return Traits.hasUnlocked(TraitName.EnhancedLeyLines, game.config.level) &&
					game.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Retrace,
					onCapture: () => {
						game.resources.get(ResourceType.LeyLines).enabled = true;
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Addle
		const addleDuration = (Traits.hasUnlocked(TraitName.EnhancedAddle, game.config.level) && 15) || 10;
		addResourceAbility({skillName: SkillName.Addle, rscType: ResourceType.Addle, instant: false, duration: addleDuration});

		// Swiftcast
		addResourceAbility({skillName: SkillName.Swiftcast, rscType: ResourceType.Swiftcast, instant: true, duration: 10});

		// Lucid Dreaming
		skillsList.set(SkillName.LucidDreaming, new Skill(SkillName.LucidDreaming,
			() => { return true; },
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.LucidDreaming,
					onApplication: () => {
						let lucid = game.resources.get(ResourceType.LucidDreaming) as DoTBuff;
						if (lucid.available(1)) {
							lucid.overrideTimer(game, 21);
						} else {
							lucid.gain(1);
							game.resources.addResourceEvent({
								rscType: ResourceType.LucidDreaming,
								name: "drop lucid dreaming", delay: 21, fnOnRsc: (rsc: Resource) => {
									rsc.consume(1);
								}
							});
						}
						lucid.node = node;
						lucid.tickCount = 0;
						let nextLucidTickEvt = game.findNextQueuedEventByTag(EventTag.LucidTick);
						if (nextLucidTickEvt) {
							nextLucidTickEvt.addTag(EventTag.ManaGain);
						}
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}))

		// Surecast
		addResourceAbility({skillName: SkillName.Surecast, rscType: ResourceType.Surecast, instant: true, duration: 6});

		// Tincture
		addResourceAbility({skillName: SkillName.Tincture, rscType: ResourceType.Tincture, instant: false, duration: 30});

		// Sprint
		addResourceAbility({skillName: SkillName.Sprint, rscType: ResourceType.Sprint, instant: false, duration: 10});

		return skillsList;
	}
	get(key: SkillName): Skill {
		let skill = super.get(key);
		if (skill) return skill;
		else {
			console.assert(false);
			return new Skill(
				SkillName.Never,
				()=>{return false},
				(game: GameState, node: ActionNode)=>{});
		}
	}
	getAutoReplaced(key: SkillName, level: number): Skill {
		let skill = this.get(key);
		// upgrade: if level >= upgrade options
		while (skill.info.autoUpgrade && Traits.hasUnlocked(skill.info.autoUpgrade.trait, level)) {
			skill = this.getAutoReplaced(skill.info.autoUpgrade.otherSkill, level);
		}
		// downgrade: if level < current skill required level
		while (skill.info.autoDowngrade && level < skill.info.unlockLevel) {
			skill = this.getAutoReplaced(skill.info.autoDowngrade.otherSkill, level);
		}
		return skill;
	}
}

export class DisplayedSkills extends Array<SkillName> {
	constructor(level: LevelSync) {
		super();
		console.assert(skillInfosMap.has(ShellInfo.job), `No skill map found for job: ${ShellInfo.job}`)
		// TODO move contextual hotbar info (paradox, retrace) to here
		const hotbarExcludeSkills = [
			SkillName.Paradox,
			SkillName.Retrace
		];
		for (const skillInfo of skillInfosMap.get(ShellInfo.job)!.values()) {
			// Leave off abilities that are above the current level sync.
			// Also leave off any abilities that auto-downgrade, like HF2/HB2/HT,
			// since their downgrade versions will already be on the hotbar.
			if (
				level >= skillInfo.unlockLevel
				&& !hotbarExcludeSkills.includes(skillInfo.name)
				&& skillInfo.autoDowngrade === undefined
			) {
				this.push(skillInfo.name);
			}
		}
	}
}
