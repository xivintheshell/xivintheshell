import { Aspect, LevelSync } from "./Common";
import { ActionNode } from "../Controller/Record";
import { GameState } from "./GameState";
import { makeCooldown, getResourceInfo, ResourceInfo } from "./Resources";
import { PotencyModifier } from "./Potency";
import { ShellJob, ALL_JOBS } from "./Data/Jobs";
import { ActionKey, ACTIONS, CooldownKey, ResourceKey, RESOURCES, TraitKey } from "./Data";
import { LimitBreakActionKey } from "./Data/Shared/LimitBreak";
import { hasUnlockedTrait } from "../utilities";
import { Data } from "./Data/Data";

// all gapclosers have the same animation lock
// from: https://nga.178.com/read.php?tid=21233094&rand=761
export const MOVEMENT_SKILL_ANIMATION_LOCK = 0.8;

// Fake skills for things like popping a shield should have a functionally minimal animation lock
export const FAKE_SKILL_ANIMATION_LOCK = 0.01;

// if skill is lower than current level, auto upgrade until (no more upgrade options) or (more upgrades will exceed current level)
// if skill is higher than current level, auto downgrade until skill is at or below current level. If run out of downgrades, throw error
export type SkillAutoReplace = {
	trait: TraitKey;
	otherSkill: ActionKey;
};

// Replace a skill on a hotbar, or replay, when a certain condition based on the game state is
// satisfied the level requirement of the replacing skill is always checked before the condition;
// multiple replacements for a single skill should have disjoint conditions.
// This replacement check is NOT performed recursively.
export type ConditionalSkillReplace<T extends GameState> = {
	newSkill: ActionKey;
	condition: (state: Readonly<T>) => boolean;
};

/*
 * A ResourceCalculationFn is called when a skill usage is attempted, and determine properties
 * like cast time, recast time, mana cost, and potency based on the current game state.
 * They should not actually consume any resources, as those are only consumed when the skill
 * usage is confirmed.
 */
export type ResourceCalculationFn<T> = (state: Readonly<T>) => number;
export type StatePredicate<T> = (state: Readonly<T>) => boolean;
// TODO encode graceful error handling into these types
export type EffectFn<T> = (state: T, node: ActionNode) => void;
export type PotencyModifierFn<T> = (state: Readonly<T>) => PotencyModifier[];

// empty function
export function NO_EFFECT<T extends GameState>(state: T, node: ActionNode) {}

/**
 * Create a new EffectFn that performs f1 followed by each function in fs.
 */
export function combineEffects<T extends GameState>(
	f1: EffectFn<T> | undefined,
	...fs: Array<EffectFn<T> | undefined>
): EffectFn<T> {
	return (state: T, node: ActionNode) => {
		if (f1 !== undefined) {
			f1(state, node);
		}
		for (const fn of fs) {
			if (fn !== undefined) {
				fn(state, node);
			}
		}
	};
}

export function combinePredicatesAnd<T extends GameState>(
	f1: StatePredicate<T>,
	...fs: Array<StatePredicate<T>>
): StatePredicate<T> {
	return (state: T) => f1(state) && fs.every((pred) => pred(state));
}

export interface CooldownGroupProperties {
	cdName: CooldownKey;
	cooldown: number;
	maxCharges: number;
}

/**
 * Base interface for common properties between different kinds of skills.
 *
 * Use the `Skill` type in type annotations instead of this interface.
 */
interface BaseSkill<T extends GameState> {
	// === COSMETIC PROPERTIES ===
	readonly name: ActionKey;
	readonly assetPath: string; // path relative to the Components/Asset/Skills folder
	readonly unlockLevel: number;
	readonly requiresCombat?: boolean; // Set to true if the action requires being in combat to use
	readonly autoUpgrade?: SkillAutoReplace;
	readonly autoDowngrade?: SkillAutoReplace;
	readonly cdName: CooldownKey;
	// TODO: Technically, actions are defined with an array of cooldown groups, one of which is the GCD cooldown group for actions that affect the GCD.
	// Functionally, actions have at most the GCD and a second cooldown group, so this is enough for now.
	readonly secondaryCd?: CooldownGroupProperties;
	readonly aspect: Aspect;
	readonly replaceIf: ConditionalSkillReplace<T>[]; // list of skills that can replace this one
	readonly startOnHotbar: boolean; // false if this skill only replaces others (like paradox)
	readonly animationLockFn: ResourceCalculationFn<T>; // function to determine the action's animation lock
	readonly highlightIf: StatePredicate<T>; // condition for highlighting this skill on the hotbar

	// === VALIDATION ===

	// TODO can MP cost ever change between cast start + confirm, e.g. if you use an ether kit or
	// lost font of magic and cast flare with hearts?
	readonly manaCostFn: ResourceCalculationFn<T>;

	// Determine the potency of the ability before any party buffs or modifiers.
	readonly potencyFn: ResourceCalculationFn<T>;
	// Determine job-specific potency modifiers.
	readonly jobPotencyModifiers: PotencyModifierFn<T>;

	// If defined, this button is treated as AoE damage with specified falloff for all enemies
	// after the first, e.g. a value of 0.6 does 100% potency to one target, and 40% potency
	// to all remaining. This is consistent with the way most skills are listed in the job guide.
	// If undefined, this skill is assumed to only hit a single target.
	// CAUTION: Skills may have a falloff of 0, implying that all secondary targets take the
	// same damage as the primary. Accordingly, conditionals involving this field should explicitly
	// check for undefined, not truthiness.
	readonly falloff?: number;

	readonly healingPotencyFn: ResourceCalculationFn<T>;
	readonly jobHealingPotencyModifiers: PotencyModifierFn<T>;

	// If true, this button is treated as an AoE heal, and will apply that healing amount for the number
	// of party members defined in the PARTY_SIZE resource, which defaults to 8
	readonly aoeHeal: boolean;

	// Determine whether the skill can be executed in the current state.
	// Should be called when the button is pressed.
	readonly validateAttempt: StatePredicate<T>;

	// === EFFECTS ===

	// If true, then this ability draws aggro at application time. This should be used for
	// abilities like DRK/GNB gap-closers and SMN's demi-summons that begin an encounter without
	// dealing any damage; having the tick mark on the timeline is still useful for players to
	// determine when the prepull should occur.
	readonly drawsAggro: boolean;

	// Perform side effects that occur at the time the player presses the button
	// This is mainly for things like cancelling channeled abilites, such as Meditate, Improvisation, Collective Unconscious, and Flamethrower
	readonly onExecute: EffectFn<T>;

	// Perform side effects that occur on the cast confirm window.
	// If the action became invalid between the start of the cast and the cast confirmation,
	// then return a SkillError instead.
	//
	// Universal effects like MP consumption and queueing the damage application event should not
	// be specified here, and are automatically handled in GameState.useSkill.
	readonly onConfirm: EffectFn<T>;

	// Perform events at skill application. This function should always be called `applicationDelay`
	// simulation seconds after `onConfirm`, assuming `onConfirm` did not produce any errors.
	//
	// Universal effects like damage application should not be specified here, and are automatically
	// handled in GameState.useSkill.
	readonly onApplication: EffectFn<T>;

	// The simulation delay, in seconds, between which `onConfirm` and `onApplication` are called.
	readonly applicationDelay: number;

	// Skill starts auto if true. Weaponskills defaulted to true, Spells defaulted to false.
	// Set this if you want to overwrite the default.
	readonly startsAuto: boolean;
}

export type GCD<T extends GameState> = BaseSkill<T> & {
	// GCDs have cast/recast + MP cost, but oGCDs do not.
	// The only exception is BLU (as far as I [sz] know). Let us pray we never cross that particular bridge.
	readonly castTimeFn: ResourceCalculationFn<T>;
	readonly recastTimeFn: ResourceCalculationFn<T>;

	// Determine whether or not this cast can be made instant, based on the current game state.
	readonly isInstantFn: StatePredicate<T>;
};

export type Spell<T extends GameState> = GCD<T> & {
	kind: "spell";
};

export type Weaponskill<T extends GameState> = GCD<T> & {
	kind: "weaponskill";
};

export type Ability<T extends GameState> = BaseSkill<T> & {
	kind: "ability";
};

// Limit breaks (mostly) have a cast time but don't otherwise actually interact with the GCD
export type LimitBreak<T extends GameState> = BaseSkill<T> & {
	kind: "limitbreak";
	readonly castTimeFn: ResourceCalculationFn<T>;
};

/**
 * A Skill represents an action that a player can take.
 *
 * Each sub-type has a `kind` field, which should be assigned in the type's corresponding helper
 * constructor function. Switching on `kind` lets us apply different behavior for GCDs and oGCDs
 * with the type checker's blessing, for example:
 *
 * if (skill.kind === "ability") {
 *   // do something with oGCDs
 * } else if (skill.kind === "weaponskill" || skill.kind === "spell") {
 *   // do something with GCDs
 *   // castTimeFn, recastTimeFn, etc. are valid here
 * }
 */
export type Skill<T extends GameState> = Spell<T> | Weaponskill<T> | Ability<T> | LimitBreak<T>;

// Map tracking skills for each job.
// This is automatically populated by the makeWeaponskill, makeSpell, and makeAbility helper functions.
// Unfortunately, I [sz] don't really know of a good way to encode the relationship between
// the ShellJob and Skill<T>, so we'll just have to live with performing casts at certain locations.
const skillMap: Map<ShellJob, Map<ActionKey, Skill<GameState>>> = new Map();
// Track asset paths for all skills so we can load icons for multiple timelines
const skillAssetPaths: Map<ActionKey, string> = new Map();

const normalizedSkillNameMap = new Map<string, ActionKey>();
/**
 * Attempt to retrieve an ActionKey member from the specified string. This function is run
 * when a line is loaded to fix skill naming errors in earlier versions of XIV in the Shell.
 *
 * The affected skills include the following:
 * - [PCT] "Thunder In Magenta" was capitalized inappropriately (should be
 *   "Thunder in Magenta" with "in" not capitalized
 * - [GNB] "Lightning Shot" was incorrectly written as "Lightning Shock"
 */
export function getNormalizedSkillName(s: string): ActionKey | undefined {
	if (s === "Lightning Shock") {
		s = "Lightning Shot";
	}
	s = s.toLowerCase();
	if (!normalizedSkillNameMap.has(s)) {
		console.error("cannot find skill: " + s);
	}
	return normalizedSkillNameMap.get(s);
}

export function getResourceKeyFromBuffName(s: string): ResourceKey | undefined {
	// If the provided string is already a key in the RESOURCES object, return it
	if (s in RESOURCES) {
		return s as ResourceKey;
	}
	// See if we can find a key in the RESOURCES where the incoming string matches the name of the resources
	return Data.findResourceKey(s);
}

// Return a particular skill for a job.
// Raises if the skill is not found.
export function getSkill<T extends GameState>(job: ShellJob, skillName: ActionKey): Skill<T> {
	return skillMap.get(job)!.get(skillName)!;
}

export function getSkillAssetPath(skillName: ActionKey): string | undefined {
	return skillAssetPaths.get(skillName);
}

// Return true if the provided skill is valid for the job.
export function jobHasSkill(job: ShellJob, skillName: ActionKey): boolean {
	return skillMap.get(job)!.has(skillName);
}

// Return the map of all skills for a job.
export function getAllSkills<T extends GameState>(job: ShellJob): Map<ActionKey, Skill<T>> {
	return skillMap.get(job)!;
}

function setSkill<T extends GameState>(job: ShellJob, skillName: ActionKey, skill: Skill<T>) {
	skillMap.get(job)!.set(skillName, skill as Skill<GameState>);
	normalizedSkillNameMap.set(ACTIONS[skillName].name.toLowerCase(), skillName);
	skillAssetPaths.set(skillName, skill.assetPath);
}

ALL_JOBS.forEach((job) => skillMap.set(job, new Map()));

// Helper function to transform an optional<number | function> that has a default number value into a function.
// If no default is provided, 0 is used instead.
export function fnify<T extends GameState>(
	arg?: number | ResourceCalculationFn<T>,
	defaultValue?: number,
): ResourceCalculationFn<T> {
	if (arg === undefined) {
		return (state) => defaultValue || 0;
	} else if (typeof arg === "number") {
		return (state) => arg;
	} else {
		return arg;
	}
}

function convertTraitPotencyArray<T extends GameState>(
	arr: Array<[TraitKey, number]>,
): ResourceCalculationFn<T> {
	console.assert(arr.length > 0, `invalid trait potency array: ${arr}`);
	return (state) => {
		let currPotency = undefined;
		const level = state.config.level;
		// this iteration assumes the highest level trait is last, and is a little algorithmically
		// inefficient but who cares
		for (const [traitName, potency] of arr) {
			if (state.hasTraitUnlocked(traitName)) {
				currPotency = potency;
			}
		}
		console.assert(
			currPotency !== undefined,
			`no applicable potency at level ${level} found in array ${arr}`,
		);
		return currPotency || 0;
	};
}

export function getBasePotency<T extends GameState>(
	state: Readonly<T>,
	potencyArg?: number | Array<[TraitKey, number]> | ResourceCalculationFn<T>,
): number {
	return (
		Array.isArray(potencyArg) ? convertTraitPotencyArray(potencyArg) : fnify(potencyArg, 0)
	)(state);
}

function normalizeAssetPath(job: ShellJob, key: ActionKey) {
	const name = ACTIONS[key].name;
	// Remove colons from the path because it's hard to put those into a file name
	return `${job}/${name.replace(":", "")}.png`;
}

// Shared parameters for all skill kinds
export interface MakeSkillParams<T extends GameState> {
	assetPath: string;
	autoUpgrade: SkillAutoReplace;
	autoDowngrade: SkillAutoReplace;
	aspect: Aspect;
	replaceIf: ConditionalSkillReplace<T>[];
	startOnHotbar: boolean;
	highlightIf: StatePredicate<T>;
	animationLock: number | ResourceCalculationFn<T>;
	manaCost: number | ResourceCalculationFn<T>;
	potency: number | ResourceCalculationFn<T> | Array<[TraitKey, number]>;
	jobPotencyModifiers: PotencyModifierFn<T>;
	drawsAggro: boolean;
	falloff: number;
	healingPotency: number | ResourceCalculationFn<T> | Array<[TraitKey, number]>;
	jobHealingPotencyModifiers: PotencyModifierFn<T>;
	aoeHeal: boolean;
	applicationDelay: number;
	validateAttempt: StatePredicate<T>;
	isInstantFn: StatePredicate<T>;
	onExecute: EffectFn<T>;
	onConfirm: EffectFn<T>;
	onApplication: EffectFn<T>;
	secondaryCooldown?: CooldownGroupProperties;
	startsAuto: boolean;
}

// Parameters for a spell or weaponskill
export interface MakeGCDParams<T extends GameState> extends MakeSkillParams<T> {
	castTime: number | ResourceCalculationFn<T>;
	recastTime: number | ResourceCalculationFn<T>;
	isInstantFn: StatePredicate<T>;
}

/**
 * Declare a GCD skill.
 *
 * Only the skill's name and unlock level are mandatory. All optional params default as follows:
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 * - autoUpgrade + autoDowngrade: remain undefined
 * - aspect: Aspect.Other
 * - castTime: 0
 * - recastTime: 2.5 (not adjusted to sps)
 * - manaCost: 0
 * - potency: 0
 * - drawsAggro: false
 * - applicationDelay: 0
 * - validateAttempt: function always returning true (valid)
 * - isInstantFn: return true to indicate if this action is an instant cast. Defaults to false for spells and true for weapon skills
 * - onConfirm: empty function
 * - onApplication: empty function
 */
export function makeSpell<T extends GameState>(
	jobs: ShellJob | ShellJob[],
	name: ActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<T>>,
): Spell<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const onApplication: EffectFn<T> = combineEffects(
		(state, node) => (node.applicationTime = state.time),
		params.onApplication,
	);
	const onExecute: EffectFn<T> = combineEffects(
		(state) => state.maybeCancelChanneledSkills(name),
		params.onExecute,
	);
	const info: Spell<T> = {
		kind: "spell",
		name: name,
		assetPath:
			params.assetPath ??
			(jobs.length === 1 ? normalizeAssetPath(jobs[0], name) : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: "cd_GCD",
		secondaryCd: params.secondaryCooldown,
		aspect: params.aspect ?? Aspect.Other,
		replaceIf: params.replaceIf ?? [],
		startOnHotbar: params.startOnHotbar ?? true,
		highlightIf: params.highlightIf ?? ((state) => false),
		castTimeFn: fnify(params.castTime, 0),
		recastTimeFn: fnify(params.recastTime, 2.5),
		animationLockFn: (state) => fnify(params.animationLock, state.config.animationLock)(state),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: (state) => getBasePotency(state, params.potency),
		jobPotencyModifiers: params.jobPotencyModifiers ?? ((state) => []),
		drawsAggro: params.drawsAggro ?? false,
		falloff: params.falloff,
		healingPotencyFn: (state) => getBasePotency(state, params.healingPotency),
		jobHealingPotencyModifiers: params.jobHealingPotencyModifiers ?? ((state) => []),
		aoeHeal: params.aoeHeal ?? false,
		validateAttempt: params.validateAttempt ?? ((state) => true),
		isInstantFn: params.isInstantFn ?? ((state) => false), // Spells should be assumed to have a cast time unless otherwise specified
		onExecute,
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication,
		applicationDelay: params.applicationDelay ?? 0,
		startsAuto: params.startsAuto ?? false,
	};
	jobs.forEach((job) => setSkill(job, info.name, info));
	if (params.secondaryCooldown !== undefined) {
		const { cdName, cooldown, maxCharges } = params.secondaryCooldown;
		jobs.forEach((job) => makeCooldown(job, cdName, cooldown!, maxCharges));
	}
	return info;
}

export function makeWeaponskill<T extends GameState>(
	jobs: ShellJob | ShellJob[],
	name: ActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<T>>,
): Weaponskill<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const onApplication: EffectFn<T> = combineEffects(
		(state, node) => (node.applicationTime = state.time),
		params.onApplication,
	);
	const onExecute: EffectFn<T> = combineEffects(
		(state) => state.maybeCancelChanneledSkills(name),
		params.onExecute,
	);
	const info: Weaponskill<T> = {
		kind: "weaponskill",
		name: name,
		assetPath:
			params.assetPath ??
			(jobs.length === 1 ? normalizeAssetPath(jobs[0], name) : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: "cd_GCD",
		secondaryCd: params.secondaryCooldown,
		aspect: params.aspect ?? Aspect.Other,
		replaceIf: params.replaceIf ?? [],
		startOnHotbar: params.startOnHotbar ?? true,
		highlightIf: params.highlightIf ?? ((state) => false),
		castTimeFn: fnify(params.castTime, 0),
		recastTimeFn: fnify(params.recastTime, 2.5),
		animationLockFn: (state) => fnify(params.animationLock, state.config.animationLock)(state),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: (state) => getBasePotency(state, params.potency),
		jobPotencyModifiers: params.jobPotencyModifiers ?? ((state) => []),
		drawsAggro: params.drawsAggro ?? false,
		falloff: params.falloff,
		healingPotencyFn: (state) => getBasePotency(state, params.healingPotency),
		jobHealingPotencyModifiers: params.jobHealingPotencyModifiers ?? ((state) => []),
		aoeHeal: params.aoeHeal ?? false,
		validateAttempt: params.validateAttempt ?? ((state) => true),
		isInstantFn: params.isInstantFn ?? ((state) => true), // Weaponskills should be assumed to be instant unless otherwise specified
		onExecute,
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication,
		applicationDelay: params.applicationDelay ?? 0,
		startsAuto: params.startsAuto ?? true,
	};
	jobs.forEach((job) => setSkill(job, info.name, info));
	if (params.secondaryCooldown !== undefined) {
		const { cdName, cooldown, maxCharges } = params.secondaryCooldown;
		jobs.forEach((job) => makeCooldown(job, cdName, cooldown!, maxCharges));
	}
	return info;
}

// Parameters for an ability
export interface MakeAbilityParams<T extends GameState> extends MakeSkillParams<T> {
	requiresCombat: boolean;
	cooldown: number;
	maxCharges: number;
}
/**
 * Declare an oGCD ability.
 *
 * Only the ability's name, unlock level, and cooldown name are mandatory. All optional params default as follows:
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 * - autoUpgrade + autoDowngrade: remain undefined
 * - potency: 0
 * - drawsAggro: false
 * - applicationDelay: 0 if basePotency is defined, otherwise left undefined
 * - validateAttempt: function always returning true (no error)
 * - onConfirm: empty function
 * - onApplication: empty function
 *
 * The following optional parameters are not stored with the Ability object, but instead used to populate
 * the resourceInfos dictionary if present:
 * - cooldown: the cooldown (in seconds) of the ability; no resourceInfos entry is added if this is unspecified
 * - maxCharges: the maximum number of charges an ability has, default 1
 */
export function makeAbility<T extends GameState>(
	jobs: ShellJob | ShellJob[],
	name: ActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: Partial<MakeAbilityParams<T>>,
): Ability<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const onApplication: EffectFn<T> = combineEffects(
		(state, node) => (node.applicationTime = state.time),
		params.onApplication,
	);
	const onExecute: EffectFn<T> = combineEffects(
		(state) => state.maybeCancelChanneledSkills(name),
		params.onExecute,
	);
	// All abilities that require being in combat should check isInCombat
	const validateAttempt: StatePredicate<T> = combinePredicatesAnd(
		(state) => (params.requiresCombat ? state.isInCombat() : true),
		params.validateAttempt ?? ((state) => true),
	);
	const info: Ability<T> = {
		kind: "ability",
		name: name,
		assetPath:
			params.assetPath ??
			(jobs.length === 1 ? normalizeAssetPath(jobs[0], name) : "General/Missing.png"),
		requiresCombat: params.requiresCombat,
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: cdName,
		secondaryCd: params.secondaryCooldown,
		aspect: params.aspect ?? Aspect.Other,
		replaceIf: params.replaceIf ?? [],
		startOnHotbar: params.startOnHotbar ?? true,
		highlightIf: params.highlightIf ?? ((state) => false),
		animationLockFn: (state) => fnify(params.animationLock, state.config.animationLock)(state),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: (state) => getBasePotency(state, params.potency),
		jobPotencyModifiers: params.jobPotencyModifiers ?? ((state) => []),
		drawsAggro: params.drawsAggro ?? false,
		falloff: params.falloff,
		healingPotencyFn: (state) => getBasePotency(state, params.healingPotency),
		jobHealingPotencyModifiers: params.jobHealingPotencyModifiers ?? ((state) => []),
		aoeHeal: params.aoeHeal ?? false,
		applicationDelay: params.applicationDelay ?? 0,
		validateAttempt,
		onExecute,
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication,
		startsAuto: params.startsAuto ?? false,
	};
	jobs.forEach((job) => setSkill(job, info.name, info));
	if (params.cooldown !== undefined) {
		jobs.forEach((job) => makeCooldown(job, cdName, params.cooldown!, params.maxCharges ?? 1));
	}
	if (params.secondaryCooldown !== undefined) {
		const { cdName, cooldown, maxCharges } = params.secondaryCooldown;
		jobs.forEach((job) => makeCooldown(job, cdName, cooldown!, maxCharges));
	}
	return info;
}

export type MakeResourceAbilityParams<T extends GameState> = {
	rscType: ResourceKey;
	cooldown: number;
	applicationDelay: number;
	duration?: number | ResourceCalculationFn<T>;
} & Partial<Omit<MakeAbilityParams<T>, "cooldown" | "applicationDelay">>;
/**
 * Helper function to create an Ability that applies a buff or debuff (`rscType`) for a certain duration.
 *
 * The duration is retrieved from `getResourceInfo`.
 *
 * Any additional effects should be encoded in `onConfirm` or `onApplication`.
 */
export function makeResourceAbility<T extends GameState>(
	jobs: ShellJob | ShellJob[],
	name: ActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: MakeResourceAbilityParams<T>,
): Ability<T> {
	// When the ability is applied:
	// 1. Immediate gain resources
	// 2. Enqueue a resource drop event after a duration, overriding an existing timer if needed
	const onApplication = combineEffects((state: T, node: ActionNode) => {
		const resource = state.resources.get(params.rscType);
		const duration =
			params.duration ??
			(getResourceInfo(state.job, params.rscType) as ResourceInfo).maxTimeout;
		const durationFn: ResourceCalculationFn<T> =
			typeof duration === "number" ? (state: T) => duration : duration;
		resource.gain(resource.maxValue);
		state.enqueueResourceDrop(params.rscType, durationFn(state));
	}, params?.onApplication);
	return makeAbility(jobs, name, unlockLevel, cdName, {
		...params,
		onApplication,
	});
}

/**
 * Declare a Limit Break ability.
 *
 * Only the ability's name and cooldown are mandatory.
 * Additionally, the tier, and the animation lock must be specified in the params object
 * All optional params default as follows:
 * - castTime: how long the LB takes to cast
 * - potency: for DPS LBs, the relative LB potency of the skill
 * - applicationDelay: how long after the LB confirmation are the effects applied?
 * - onExecute: function defining effects that take place on button press
 * - onConfirm: function defining effects that take place on cast confirm
 * - onApplication: function defining effects that take place on application
 *
 * The following parameter is not stored with the Ability object, but instead used to
 * select which skill icon is shown
 * - tier: which tier of limit break is this?
 */
export function makeLimitBreak<T extends GameState>(
	jobs: ShellJob | ShellJob[],
	name: LimitBreakActionKey,
	cdName: CooldownKey,
	params: {
		tier: "1" | "2" | "3";
		animationLock: number;
		applicationDelay?: number;
		onExecute?: EffectFn<T>;
		validateAttempt?: StatePredicate<T>;
		onConfirm?: EffectFn<T>;
		onApplication?: EffectFn<T>;
		castTime?: number;
		potency?: number;
		healingPotency?: number;
	},
): LimitBreak<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const assetName = "Limit Break " + params.tier;
	const onExecute: EffectFn<T> = combineEffects(
		(state) => state.maybeCancelChanneledSkills(name),
		params.onExecute,
	);
	const info: LimitBreak<T> = {
		kind: "limitbreak",
		name: name,
		animationLockFn: (state) => params.animationLock,
		assetPath: `General/${assetName}.png`,
		unlockLevel: 1,
		autoUpgrade: undefined,
		autoDowngrade: undefined,
		cdName,
		secondaryCd: undefined,
		aspect: Aspect.Other,
		replaceIf: [],
		startOnHotbar: true,
		castTimeFn: fnify(params.castTime, 0),
		highlightIf: (state) => false,
		manaCostFn: (state) => 0,
		potencyFn: fnify(params.potency, 0),
		jobPotencyModifiers: (state) => [],
		healingPotencyFn: fnify(params.healingPotency, 0),
		jobHealingPotencyModifiers: (state) => [],
		aoeHeal: false,
		drawsAggro: false,
		applicationDelay: params.applicationDelay ?? 0,
		validateAttempt: params.validateAttempt ?? ((state) => true),
		onExecute,
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication: params.onApplication ?? NO_EFFECT,
		startsAuto: false,
	};
	jobs.forEach((job) => setSkill(job, info.name, info));
	// Fudge the "cooldown" as the sum of the cast time and the animation lock to make the grey bar on the timeline look right
	jobs.forEach((job) =>
		makeCooldown(job, cdName, (params.castTime ?? 0) + params.animationLock, 1),
	);
	return info;
}

// Dummy skill to avoid a hard crash when a skill info isn't found
const NEVER_SKILL = makeAbility(ALL_JOBS, "NEVER", 1, "NEVER", {
	validateAttempt: (state) => false,
});

export class SkillsList<T extends GameState> {
	job: ShellJob;

	constructor(state: GameState) {
		this.job = state.job;
	}

	get(key: ActionKey): Skill<T> {
		const skill = skillMap.get(this.job)!.get(key) as Skill<T>;
		if (skill) return skill;
		else {
			console.error(`could not find skill with key: ${key}`);
			return NEVER_SKILL;
		}
	}
}

export function getAutoReplacedSkillName(
	job: ShellJob,
	skillName: ActionKey,
	level: LevelSync,
): ActionKey {
	let skill = getSkill(job, skillName);
	// upgrade: if level >= upgrade options
	while (skill.autoUpgrade && hasUnlockedTrait(skill.autoUpgrade.trait, level)) {
		skill = getSkill(job, getAutoReplacedSkillName(job, skill.autoUpgrade.otherSkill, level));
	}
	// downgrade: if level < current skill required level
	while (skill.autoDowngrade && level < skill.unlockLevel) {
		skill = getSkill(job, getAutoReplacedSkillName(job, skill.autoDowngrade.otherSkill, level));
	}
	return skill.name;
}

export function getConditionalReplacement<T extends GameState>(
	key: ActionKey,
	state: T,
): ActionKey {
	// Attempt to replace a skill if required by the current state
	const skill = getSkill(state.job, key);
	for (const candidate of skill.replaceIf) {
		if (candidate.newSkill === key) {
			console.error(`Skill ${key} tried to replace itself with the same skill`);
		}
		const candidateSkill = getSkill(state.job, candidate.newSkill);
		if (!candidateSkill) {
			throw new Error("couldn't find skill info for " + candidate.newSkill);
		}
		if (state.config.level >= candidateSkill.unlockLevel && candidate.condition(state)) {
			return getAutoReplacedSkillName(state.job, candidate.newSkill, state.config.level);
		}
	}
	return getAutoReplacedSkillName(state.job, skill.name, state.config.level);
}

export class DisplayedSkills {
	#skills: ActionKey[];

	constructor(job: ShellJob, level: LevelSync) {
		this.#skills = [];
		console.assert(skillMap.has(job), `No skill map found for job: ${job}`);
		for (const skillInfo of skillMap.get(job)!.values()) {
			// Leave off abilities that are above the current level sync.
			// Also leave off any abilities that auto-downgrade, like HF2/HB2/HT,
			// since their downgrade versions will already be on the hotbar.
			if (
				skillInfo.name !== "NEVER" &&
				level >= skillInfo.unlockLevel &&
				skillInfo.autoDowngrade === undefined &&
				skillInfo.startOnHotbar
			) {
				this.#skills.push(getAutoReplacedSkillName(job, skillInfo.name, level));
			}
		}
	}

	// Get the list of skills to display in the current game state.
	// `replaceIf` and `autoUpgrade`/`autoDowngrade`` conditions are checked here;
	// `autoUpgrade`/`autoDowngrade` conditions are also checked in the constructor.
	getCurrentSkillNames<T extends GameState>(state: T): ActionKey[] {
		return this.#skills.map((skillName) => getConditionalReplacement(skillName, state));
	}
}
