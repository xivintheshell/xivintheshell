import {Aspect, BuffType, LevelSync, ProcMode, ResourceType, SkillName, WarningType} from './Common'
// @ts-ignore
import {controller} from "../Controller/Controller";
import {ShellJob, ShellInfo} from "../Controller/Common";
import {Event, DoTBuff, EventTag, Resource} from "./Resources";
import {ActionNode} from "../Controller/Record";
import {PlayerState, GameState} from "./GameState";
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
// SkillError. If the skill succeeded, then return undefined or a list of events to be enqueued.
export type SkillResult = Event[] | undefined | SkillError;

// if skill is lower than current level, auto upgrade until (no more upgrade options) or (more upgrades will exceed current level)
// if skill is higher than current level, auto downgrade until skill is at or below current level. If run out of downgrades, throw error
export type SkillAutoReplace = {
	trait: TraitName,
	otherSkill: SkillName,
}

/*
 * A ResourceCalculationFn is called when a skill usage is attempted, and determine properties
 * like cast time, recast time, mana cost, and potency based on the current game state.
 * They should not actually consume any resources, as those are only consumed when the skill
 * usage is confirmed.
 */
export type ResourceCalculationFn<T> = (state: Readonly<T>) => number;
export type ValidateAttemptFn<T> = (state: Readonly<T>) => SkillError | undefined;
export type IsInstantFn<T> = (state: T) => boolean;
export type EffectFn<T> = (state: T, node?: ActionNode) => SkillResult;


type CondType<T> = (state: Readonly<T>) => boolean;
/**
 * Helper function to create a ValidateAttemptFn that returns a SkillError containing 
 * `emsg` when `cond` evaluates to false.
 */
export function validateOrSkillError<T extends PlayerState>(cond: CondType<T>, emsg: string): ValidateAttemptFn<T> {
	return (state) => cond(state) ? undefined : { message: emsg }
};

/**
 * A Skill represents an action that a player can take.
 * 
 * Skills are distinguished by a "kind" field, which should be assigned by each sub-type's
 * corresponding helper constructor function. Switching on this kind field lets us apply
 * different behavior for GCDs and oGCDs with the type checker's blessing, for example:
 * 
 * if (skill.kind === "ability") {
 *   // do something with oGCDs
 * } else if (skill.kind === "weaponskill" || skill.kind === "spell") {
 *   // do something with GCDs 
 *   // castTimeFn, recastTimeFn, etc. are valid here
 * }
 */
export interface Skill<T extends PlayerState> {
	// === COSMETIC PROPERTIES ===
	readonly name: SkillName;
	readonly assetPath: string; // path relative to the Components/Asset/Skills folder 
	readonly unlockLevel: number;
	readonly autoUpgrade?: SkillAutoReplace;
	readonly autoDowngrade?: SkillAutoReplace;
	readonly cdName: ResourceType;
	readonly aspect: Aspect;

	// Determine the potency of the ability before any party buffs or modifiers.
	readonly potencyFn: ResourceCalculationFn<T>;

	// Determine whether the skill can be executed in the current state.
	// Should be called when the button is pressed.
	readonly validateAttempt: ValidateAttemptFn<T>;

	/* === EFFECTS ===
	 * The following functions determine the effects of using a skill.
	 * On success, they will return a list of future events to be applied
	 * (an undefined return is treated as the empty list).
	 * On failure, they will return an error that should be propagated.
	 *
	 * Immediate effects should be expressed through the function's side effects, but future
	 * queued events (such as timer drops) should be returned as event objects.
	 * Because they are stateful, you can also directly enqueue a future event without returning,
	 * an Event, but doing so makes control flow harder to follow.
	 */

	/* Return a list of future Event objects when the action is applied.
	 * If the action became invalid between the start of the cast and the cast confirmation,
	 * then return a SkillError instead.
	 * This should be called at the function's cast confirm window.
	 *
	 * If this is a spell that is normally hardcast, but was somehow made instant,
	 * then the game loop will call `onConfirm` immediately after validation.
	 */
	readonly onConfirm: EffectFn<T>;

	/* Return a list of events to apply at the time of skill application. This includes
	 * damage events and buffs/debuffs.
	 * If `onConfirm` did not error, then the game loop MUST automatically enqueue this function,
	 * rather than `onConfirm` itself enqueuing an `onApplication` event.
	 */
	readonly onApplication: EffectFn<T>;

	// The simulation delay, in seconds, between which `onConfirm` and `onApplication` are called.
	readonly applicationDelay: number;
}


export type GCD<T extends PlayerState> = Skill<T> & {
	// GCDs have cast/recast + MP cost, but oGCDs do not.
	// The only exception is BLU (as far as I [sz] know). Let us pray we never cross that particular bridge.
	readonly castTimeFn: ResourceCalculationFn<T>;
	readonly recastTimeFn: ResourceCalculationFn<T>;
	// TODO can MP cost ever change between cast start + confirm, e.g. if you use an ether kit or
	// lost font of magic and cast flare with hearts?
	readonly manaCostFn: ResourceCalculationFn<T>;

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
	// TODO probably need to change this, since tooltips need to compute if the spell is instant or not
	readonly isInstantFn: IsInstantFn<T>;
}

export type Spell<T extends PlayerState> = GCD<T> & {
	kind: "spell";
}


export type Weaponskill<T extends PlayerState> = GCD<T> & {
	kind: "weaponskill";
}


export type Ability<T extends PlayerState> = Skill<T> & {
	kind: "ability";
}


// Map tracking skills for each job.
// This is automatically populated by the makeWeaponskill, makeSpell, and makeAbility helper functions.
// Unfortunately, I [sz] don't really know of a good way to encode the relationship between
// the ShellJob and Skill<T>, so we'll just have to live with performing casts at certain locations.
export const skillMap: Map<ShellJob, Map<SkillName, Skill<PlayerState>>> = new Map();

// can't iterate over a const enum so just populate manually :/
[
	ShellJob.BLM,
	ShellJob.PCT,
].forEach((job) => skillMap.set(job, new Map()));


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
export function makeSpell<T extends PlayerState>(jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, params: Partial<{
	assetPath: string,
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	aspect: Aspect,
	castTime: number | ResourceCalculationFn<T>,
	recastTime: number | ResourceCalculationFn<T>,
	manaCost: number | ResourceCalculationFn<T>,
	potency: number | ResourceCalculationFn<T>,
	applicationDelay: number,
	validateAttempt: ValidateAttemptFn<T>,
	isInstantFn: IsInstantFn<T>,
	onConfirm: EffectFn<T>,
	onApplication: EffectFn<T>,
}>): Spell<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const info: Spell<T> = {
		kind: "spell",
		name: name,
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: ResourceType.cd_GCD,
		aspect: params.aspect ?? Aspect.Other,
		castTimeFn: fnify(params.castTime, 0),
		recastTimeFn: fnify(params.recastTime, 2.5),
		manaCostFn: fnify(params.manaCost, 0),
		potencyFn: fnify(params.potency, 0),
		validateAttempt: params.validateAttempt ?? ((state) => undefined),
		isInstantFn: params.isInstantFn ?? ((state) => true),
		onConfirm: params.onConfirm ?? ((state, node) => []),
		// TODO encode damage event
		onApplication: params.onApplication ?? ((state, node) => []),
		applicationDelay: params.applicationDelay ?? 0,
	};
	jobs.forEach((job) => skillMap.get(job)!.set(info.name, info));
	return info;
};


/**
 * Declare an oGCD ability.
 *
 * Only the ability's name, unlock level, and cooldown are mandatory. All optional params default as follows:
 * - assetPath: if `jobs` is a single job, then "$JOB/$SKILLNAME.png"; otherwise "General/Missing.png"
 * - autoUpgrade + autoDowngrade: remain undefined
 * - potency: 0
 * - applicationDelay: 0 if basePotency is defined, otherwise left undefined
 * - validateAttempt: function always returning undefined (no error)
 * - onConfirm: function always returning empty list (no events enqueued)
 * - onApplication: function returning a damage event if `basePotency` is a non-zero scalar, else empty list
 */
export function makeAbility<T extends PlayerState>(jobs: ShellJob | ShellJob[], name: SkillName, unlockLevel: number, cdName: ResourceType, params: Partial<{
	assetPath: string,
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	potency: number | ResourceCalculationFn<T>,
	applicationDelay: number,
	validateAttempt: ValidateAttemptFn<T>,
	onConfirm: EffectFn<T>,
	onApplication: EffectFn<T>,
}>): Ability<T> {
	if (!Array.isArray(jobs)) {
		jobs = [jobs];
	}
	const info: Ability<T> = {
		kind: "ability",
		name: name,
		assetPath: params.assetPath ?? (jobs.length === 1 ? `${jobs[0]}/${name}.png` : "General/Missing.png"),
		unlockLevel: unlockLevel,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		cdName: cdName,
		aspect: Aspect.Other,
		potencyFn: fnify(params.potency, 0),
		applicationDelay: params.applicationDelay ?? 0,
		validateAttempt: params.validateAttempt ?? ((state) => undefined),
		onConfirm: params.onConfirm ?? ((state, node) => []),
		onApplication: params.onApplication ?? ((state, node) => []),
	};
	jobs.forEach((job) => skillMap.get(job)!.set(info.name, info));
	return info;
}

// Dummy skill to avoid a hard crash when a skill info isn't found
const NEVER_SKILL = makeSpell([], SkillName.Never, 1, {});


/**
 * Helper function to create an Ability that applies a buff or debuff (`rscType`) for a certain duration.
 *
 * Any additional effects should be encoded in `additionalEvents`, a list of Event objects with
 * delay relative to the application of the ability.
 */
// TODO allow specifying cooldown + number of charges here
export function makeResourceAbility<T extends PlayerState>(
	jobs: ShellJob | ShellJob[],
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		rscType: ResourceType,
		applicationDelay: number,
		duration: number | ResourceCalculationFn<T>,
		potency?: number | ResourceCalculationFn<T>,
		validateAttempt?: ValidateAttemptFn<T>,
		onConfirm?: EffectFn<T>,
		onApplication?: EffectFn<T>,
		assetPath?: string,
	}
): Ability<T> {
	// When the ability is applied, enqueue two events:
	// 1. An immediate resource gain event
	// 2. A resource drop event after a duration, overriding an existing timer if it exists
	const onApplication = (state: T, node?: ActionNode) => {
		state.resources.get(params.rscType).gain(1);
		// TODO tell scheduler to override existing drop event if necessary
		const duration = params.duration;
		const durationFn: ResourceCalculationFn<T> = (typeof duration === "number") ? ((state: T) => duration) : duration;
		const otherApplication = (params?.onApplication === undefined) ? [] : (params.onApplication(state, node) ?? []);
		if ("message" in otherApplication) {
			// error case
			return otherApplication;
		}
		return [new Event(
			"drop " + params.rscType,
			durationFn(state),
			(state: T) => state.resources.get(params.rscType).consume(1),
		)].concat(otherApplication);
	};
	return makeAbility(jobs, name, unlockLevel, cdName, {
		potency: params.potency,
		applicationDelay: params.applicationDelay,
		// TODO (state) => state.resources.get(cdName).available(1),
		validateAttempt: params.validateAttempt,
		onConfirm: params.onConfirm,
		onApplication: onApplication,
		assetPath: params.assetPath,
	});
};


export class SkillsList<T extends PlayerState> {
	job: ShellJob;

	constructor(_state: GameState /* TODO remove */) {
		this.job = ShellInfo.job;
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

export class DisplayedSkills extends Array<SkillName> {
	constructor(level: LevelSync) {
		super();
		console.assert(skillMap.has(ShellInfo.job), `No skill map found for job: ${ShellInfo.job}`)
		// TODO move contextual hotbar info (paradox, retrace) to here
		const hotbarExcludeSkills = [
			SkillName.Paradox,
			SkillName.Retrace
		];
		for (const skillInfo of skillMap.get(ShellInfo.job)!.values()) {
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
