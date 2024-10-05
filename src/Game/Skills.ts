import {Aspect, LevelSync, ResourceType, SkillName} from './Common'
import {ShellJob, ShellInfo, ALL_JOBS} from "../Controller/Common";
import {ActionNode} from "../Controller/Record";
import {PlayerState, GameState} from "./GameState";
import {TraitName, Traits} from './Traits';
import {makeCooldown, getResourceInfo, ResourceInfo} from "./Resources";

// if skill is lower than current level, auto upgrade until (no more upgrade options) or (more upgrades will exceed current level)
// if skill is higher than current level, auto downgrade until skill is at or below current level. If run out of downgrades, throw error
export type SkillAutoReplace = {
	trait: TraitName,
	otherSkill: SkillName,
}

// Replace a skill on a hotbar, or replay, when a certain condition based on the game state is
// satisfied the level requirement of the replacing skill is always checked before the condition;
// multiple replacements for a single skill should have disjoint conditions.
// This replacement check is NOT performed recursively.
export type ConditionalSkillReplace<T extends PlayerState> = {
	newSkill: SkillName,
	condition: (state: Readonly<T>) => boolean,
}

/*
 * A ResourceCalculationFn is called when a skill usage is attempted, and determine properties
 * like cast time, recast time, mana cost, and potency based on the current game state.
 * They should not actually consume any resources, as those are only consumed when the skill
 * usage is confirmed.
 */
export type ResourceCalculationFn<T> = (state: Readonly<T>) => number;
// TODO encode graceful error handling into these types
export type ValidateAttemptFn<T> = (state: Readonly<T>) => boolean;
export type IsInstantFn<T> = (state: T) => boolean;
export type EffectFn<T> = (state: T, node: ActionNode) => void;

// empty function
export function NO_EFFECT<T extends PlayerState>(state: T, node: ActionNode) {};

/**
 * Create a new EffectFn that performs f1 followed by each function in fs.
 */
export function combineEffects<T extends PlayerState>(f1: EffectFn<T>, ...fs: Array<EffectFn<T>>): EffectFn<T> {
	return (state: T, node: ActionNode) => {
		f1(state, node);
		for (const fn of fs) {
			fn(state, node);
		}
	};
}

/**
 * Base interface for common properties between different kinds of skills.
 *
 * Use the `Skill` type in type annotations instead of this interface.
 */
interface BaseSkill<T extends PlayerState> {
	// === COSMETIC PROPERTIES ===
	readonly name: SkillName;
	readonly assetPath: string; // path relative to the Components/Asset/Skills folder 
	readonly unlockLevel: number;
	readonly autoUpgrade?: SkillAutoReplace;
	readonly autoDowngrade?: SkillAutoReplace;
	readonly cdName: ResourceType;
	readonly aspect: Aspect;
	readonly replaceIf: ConditionalSkillReplace<T>[]; // list of skills that can replace this one
	readonly startOnHotbar: boolean; // false if this skill only replaces others (like paradox)

	// === VALIDATION ===

	// TODO can MP cost ever change between cast start + confirm, e.g. if you use an ether kit or
	// lost font of magic and cast flare with hearts?
	readonly manaCostFn: ResourceCalculationFn<T>;

	// Determine the potency of the ability before any party buffs or modifiers.
	readonly potencyFn: ResourceCalculationFn<T>;

	// Determine whether the skill can be executed in the current state.
	// Should be called when the button is pressed.
	readonly validateAttempt: ValidateAttemptFn<T>;

	// === EFFECTS ===

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
}

export type GCD<T extends PlayerState> = BaseSkill<T> & {
	// GCDs have cast/recast + MP cost, but oGCDs do not.
	// The only exception is BLU (as far as I [sz] know). Let us pray we never cross that particular bridge.
	readonly castTimeFn: ResourceCalculationFn<T>;
	readonly recastTimeFn: ResourceCalculationFn<T>;

	// Determine whether or not this cast can be made instant, based on the current game state.
	readonly isInstantFn: IsInstantFn<T>;
}

export type Spell<T extends PlayerState> = GCD<T> & {
	kind: "spell";
}

export type Weaponskill<T extends PlayerState> = GCD<T> & {
	kind: "weaponskill";
}

export type Ability<T extends PlayerState> = BaseSkill<T> & {
	kind: "ability";
}

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
export type Skill<T extends PlayerState> = Spell<T> | Weaponskill<T> | Ability<T>;

// Map tracking skills for each job.
// This is automatically populated by the makeWeaponskill, makeSpell, and makeAbility helper functions.
// Unfortunately, I [sz] don't really know of a good way to encode the relationship between
// the ShellJob and Skill<T>, so we'll just have to live with performing casts at certain locations.
const skillMap: Map<ShellJob, Map<SkillName, Skill<PlayerState>>> = new Map();

// Return a particular skill for a job.
// Raises if the skill is not found.
export function getSkill<T extends PlayerState>(job: ShellJob, skillName: SkillName): Skill<T> {
	return skillMap.get(job)!.get(skillName)!;
}

// Return the map of all skills for a job.
export function getAllSkills<T extends PlayerState>(job: ShellJob): Map<SkillName, Skill<T>> {
	return skillMap.get(job)!;
}


ALL_JOBS.forEach((job) => skillMap.set(job, new Map()));


// Helper function to transform an optional<number | function> that has a default number value into a function.
// If no default is provided, 0 is used instead.
function fnify<T extends PlayerState>(arg?: number | ResourceCalculationFn<T>, defaultValue?: number): ResourceCalculationFn<T> {
	if (arg === undefined) {
		return (state) => defaultValue || 0;
	} else if (typeof arg === "number") {
		return (state) => arg;
	} else {
		return arg;
	}
};

function convertTraitPotencyArray<T extends PlayerState>(arr: Array<[TraitName, number]>): ResourceCalculationFn<T> {
	console.assert(arr.length > 0, `invalid trait potency array: ${arr}`);
	return (state) => {
		let currPotency = undefined;
		const level = state.config.level;
		// this iteration assumes the highest level trait is last, and is a little algorithmically
		// inefficient but who cares
		for (const [traitName, potency] of arr) {
			if (Traits.hasUnlocked(traitName, level)) {
				currPotency = potency;
			}
		}
		console.assert(currPotency !== undefined, `no applicable potency at level ${level} found in array ${arr}`)
		return currPotency || 0;
	};
}

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
 * - validateAttempt: function always returning true (valid)
 * - isInstantFn: function always returning true
 * - onConfirm: empty function
 * - onApplication: empty function
 * 
 * TODO: If we ever branch out to non-BLM/PCT jobs, we should distinguish between
 * spells and weaponskills for sps/sks calculation purposes.
 */
export function makeSpell<T extends PlayerState>(jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, params: Partial<{
	assetPath: string,
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	aspect: Aspect,
	replaceIf: ConditionalSkillReplace<T>[],
	startOnHotbar: boolean,
	castTime: number | ResourceCalculationFn<T>,
	recastTime: number | ResourceCalculationFn<T>,
	manaCost: number | ResourceCalculationFn<T>,
	potency: number | ResourceCalculationFn<T> | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt: ValidateAttemptFn<T>,
	isInstantFn: IsInstantFn<T>,
	onConfirm: EffectFn<T>,
	onApplication: EffectFn<T>,
}>): Spell<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	let potencyFn = Array.isArray(params.potency) ? convertTraitPotencyArray(params.potency) : fnify(params.potency, 0);
	const info: Spell<T> = {
		kind: "spell",
		name: name,
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: ResourceType.cd_GCD,
		aspect: params.aspect ?? Aspect.Other,
		replaceIf: params.replaceIf ?? [],
		startOnHotbar: params.startOnHotbar ?? true,
		castTimeFn: fnify(params.castTime, 0),
		recastTimeFn: fnify(params.recastTime, 2.5),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: potencyFn,
		validateAttempt: params.validateAttempt ?? ((state) => true),
		isInstantFn: params.isInstantFn ?? ((state) => true),
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication: params.onApplication ?? NO_EFFECT,
		applicationDelay: params.applicationDelay ?? 0,
	};
	jobs.forEach((job) => skillMap.get(job)!.set(info.name, info as Spell<PlayerState>));
	return info;
};


/**
 * Declare an oGCD ability.
 *
 * Only the ability's name, unlock level, and cooldown name are mandatory. All optional params default as follows:
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 * - autoUpgrade + autoDowngrade: remain undefined
 * - potency: 0
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
export function makeAbility<T extends PlayerState>(jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, cdName: ResourceType, params: Partial<{
	assetPath: string,
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	replaceIf: ConditionalSkillReplace<T>[],
	startOnHotbar: boolean,
	potency: number | ResourceCalculationFn<T> | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt: ValidateAttemptFn<T>,
	onConfirm: EffectFn<T>,
	onApplication: EffectFn<T>,
	cooldown: number,
	maxCharges: number,
}>): Ability<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	let potencyFn = Array.isArray(params.potency) ? convertTraitPotencyArray(params.potency) : fnify(params.potency, 0);
	const info: Ability<T> = {
		kind: "ability",
		name: name,
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: cdName,
		aspect: Aspect.Other,
		replaceIf: params.replaceIf ?? [],
		startOnHotbar: params.startOnHotbar ?? true,
		manaCostFn: (state) => 0,
		potencyFn: potencyFn,
		applicationDelay: params.applicationDelay ?? 0,
		validateAttempt: params.validateAttempt ?? ((state) => true),
		onConfirm: params.onConfirm ?? NO_EFFECT,
		onApplication: params.onApplication ?? NO_EFFECT,
	};
	jobs.forEach((job) => skillMap.get(job)!.set(info.name, info as Ability<PlayerState>));
	if (params.cooldown !== undefined) {
		jobs.forEach((job) => makeCooldown(job, cdName, params.cooldown!, params.maxCharges ?? 1));
	}
	return info;
}

/**
 * Helper function to create an Ability that applies a buff or debuff (`rscType`) for a certain duration.
 *
 * The duration is retrieved from `getResourceInfo`.
 *
 * Any additional effects should be encoded in `onConfirm` or `onApplication`.
 */
// TODO allow specifying cooldown + number of charges here
export function makeResourceAbility<T extends PlayerState>(
	jobs: ShellJob | ShellJob[],
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		rscType: ResourceType,
		replaceIf?: ConditionalSkillReplace<T>[],
		startOnHotbar?: boolean,
		applicationDelay: number,
		duration?: number | ResourceCalculationFn<T>, // TODO push to resources
		potency?: number | ResourceCalculationFn<T> | Array<[TraitName, number]>,
		validateAttempt?: ValidateAttemptFn<T>,
		onConfirm?: EffectFn<T>,
		onApplication?: EffectFn<T>,
		assetPath?: string,
		cooldown: number,
		maxCharges?: number,
	}
): Ability<T> {
	// When the ability is applied:
	// 1. Immediate gain resources
	// 2. Enqueue a resource drop event after a duration, overriding an existing timer if needed
	const onApplication = combineEffects(
		(state: T, node: ActionNode) => {
			const resource = state.resources.get(params.rscType);
			const duration = params.duration ?? (getResourceInfo(ShellInfo.job, params.rscType) as ResourceInfo).maxTimeout;
			const durationFn: ResourceCalculationFn<T> = (typeof duration === "number") ? ((state: T) => duration) : duration;
			// TODO automatically tell scheduler to override existing drop event if necessary
			if (resource.available(1)) {
				resource.overrideTimer(state, durationFn(state));
			} else {
				resource.gain(1);
				state.enqueueResourceDrop(
					params.rscType,
					durationFn(state),
				);
			}
		},
		params?.onApplication ?? NO_EFFECT, 
	);
	return makeAbility(jobs, name, unlockLevel, cdName, {
		potency: params.potency,
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		applicationDelay: params.applicationDelay,
		validateAttempt: params.validateAttempt,
		onConfirm: params.onConfirm,
		onApplication: onApplication,
		assetPath: params.assetPath,
		cooldown: params.cooldown,
		maxCharges: params.maxCharges,
	});
};

// Dummy skill to avoid a hard crash when a skill info isn't found
const NEVER_SKILL = makeAbility(ALL_JOBS, SkillName.Never, 1, ResourceType.Never, {
	validateAttempt: (state) => false,
});

export class SkillsList<T extends PlayerState> {
	job: ShellJob;

	constructor(state: GameState) {
		this.job = state.job;
	}

	get(key: SkillName): Skill<T> {
		let skill = skillMap.get(this.job)!.get(key) as Skill<T>;
		if (skill) return skill;
		else {
			console.error(`could not find skill with name: ${key}`);
			return NEVER_SKILL;
		}
	}

	getAutoReplaced(key: SkillName, level: number): Skill<T> {
		let skill = this.get(key);
		// upgrade: if level >= upgrade options
		while (skill.autoUpgrade && Traits.hasUnlocked(skill.autoUpgrade.trait, level)) {
			skill = this.getAutoReplaced(skill.autoUpgrade.otherSkill, level);
		}
		// downgrade: if level < current skill required level
		while (skill.autoDowngrade && level < skill.unlockLevel) {
			skill = this.getAutoReplaced(skill.autoDowngrade.otherSkill, level);
		}
		return skill;
	}
}

export function getConditionalReplacement<T extends PlayerState>(key: SkillName, state: T): SkillName {
	// Attempt to replace a skill if required by the current state
	const skill = getSkill(state.job, key);
	for (const candidate of skill.replaceIf) {
		if (candidate.newSkill === key) {
			console.error(`Skill ${key} tried to replace itself with the same skill`);
		}
		const candidateSkill = getSkill(state.job, candidate.newSkill);
		if (state.config.level >= candidateSkill.unlockLevel && candidate.condition(state)) {
			return candidate.newSkill;
		}
	}
	return skill.name;
}

export class DisplayedSkills  {
	#skills: SkillName[];

	constructor(level: LevelSync) {
		this.#skills = [];
		console.assert(skillMap.has(ShellInfo.job), `No skill map found for job: ${ShellInfo.job}`)
		for (const skillInfo of skillMap.get(ShellInfo.job)!.values()) {
			// Leave off abilities that are above the current level sync.
			// Also leave off any abilities that auto-downgrade, like HF2/HB2/HT,
			// since their downgrade versions will already be on the hotbar.
			if (
				skillInfo.name !== SkillName.Never
				&& level >= skillInfo.unlockLevel
				&& skillInfo.autoDowngrade === undefined
				&& skillInfo.startOnHotbar
			) {
				this.#skills.push(skillInfo.name);
			}
		}
	}

	// Get the list of skills to display in the current game state.
	// `replaceIf` conditions are checked here.
	// `autoUpgrade`/`autoDowngrade` are not checked here, and are checked in the constructor instead.
	getCurrentSkillNames<T extends PlayerState>(state: T): SkillName[] {
		return this.#skills.map((skillName) => getConditionalReplacement(skillName, state));
	}
}
