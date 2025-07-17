// Skill and state declarations for VPR.

// TODO: test coils and buff timeouts

import { VPRStatusPropsGenerator } from "../../Components/Jobs/VPR";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { BuffType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { VPRActionKey, VPRCooldownKey, VPRResourceKey } from "../Data/Jobs/VPR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, makeComboModifier, makePositionalModifier } from "../Potency";
import { getResourceInfo, makeResource, ResourceInfo, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	combinePredicatesAnd,
	ConditionalSkillReplace,
	ComboPotency,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	makeWeaponskill,
	MakeAbilityParams,
	MakeGCDParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PositionalPotency,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	Weaponskill,
} from "../Skills";

const makeVPRResource = (
	rsc: VPRResourceKey,
	maxValue: number,
	params?: {
		timeout?: number;
		default?: number;
		warnOnOvercap?: boolean;
		warnOnTimeout?: boolean;
	},
) => {
	makeResource("VPR", rsc, maxValue, params ?? {});
};

// Gauge resources
makeVPRResource("RATTLING_COIL", 3, { warnOnOvercap: true });
makeVPRResource("SERPENT_OFFERINGS", 100, { warnOnOvercap: true });
makeVPRResource("ANGUINE_TRIBUTE", 5, { timeout: 30 });

// Statuses
// Self-buffs
makeVPRResource("HUNTERS_INSTINCT", 1, { timeout: 40 });
makeVPRResource("SWIFTSCALED", 1, { timeout: 40 });
// Starters
makeVPRResource("HONED_STEEL", 1, { timeout: 60 });
makeVPRResource("HONED_REAVERS", 1, { timeout: 60 });
// Single-target finishers
makeVPRResource("FLANKSTUNG_VENOM", 1, { timeout: 60 });
makeVPRResource("HINDSTUNG_VENOM", 1, { timeout: 60 });
makeVPRResource("FLANKSBANE_VENOM", 1, { timeout: 60 });
makeVPRResource("HINDSBANE_VENOM", 1, { timeout: 60 });
// AoE finishers
makeVPRResource("GRIMSKINS_VENOM", 1, { timeout: 60 });
makeVPRResource("GRIMHUNTERS_VENOM", 1, { timeout: 60 });
// Coil oGCD buffs
makeVPRResource("HUNTERS_VENOM", 1, { timeout: 30 });
makeVPRResource("SWIFTSKINS_VENOM", 1, { timeout: 30 });
// Uncoiled Fury oGCD buffs
makeVPRResource("POISED_FOR_TWINFANG", 1, { timeout: 60 });
makeVPRResource("POISED_FOR_TWINBLOOD", 1, { timeout: 60 });
// Den oGCD buffs
makeVPRResource("FELLHUNTERS_VENOM", 1, { timeout: 30 });
makeVPRResource("FELLSKINS_VENOM", 1, { timeout: 30 });
// Reawaken stuff
makeVPRResource("READY_TO_REAWAKEN", 1, { timeout: 30 });
makeVPRResource("REAWAKENED", 1, { timeout: 30 });

// Trackers
// These all are cleared on using a Weaponskill (or Spell), not on a timeout.
makeVPRResource("DEATH_RATTLE_READY", 1);
makeVPRResource("COIL_OGCD_READY", 2);
makeVPRResource("DEN_OGCD_READY", 2);
makeVPRResource("UNCOILED_OGCD_READY", 2);
makeVPRResource("HUNTERS_COIL_READY", 1);
makeVPRResource("HUNTERS_DEN_READY", 1);
makeVPRResource("SWIFTSKINS_COIL_READY", 1);
makeVPRResource("SWIFTSKINS_DEN_READY", 1);
makeVPRResource("LAST_LASH_READY", 1);
// In addition to using GCD actions, Legacies are cleared when leaving Reawaken.
makeVPRResource("LEGACY_READY", 4);
makeVPRResource("VPR_COMBO", 4, { timeout: 30 });
makeVPRResource("VPR_AOE_COMBO", 2, { timeout: 30 });
makeVPRResource("REAWAKEN_COMBO", 4);

export class VPRState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override inherentSpeedModifier(): number {
		return 15;
	}

	override get statusPropsGenerator(): StatusPropsGenerator<VPRState> {
		return new VPRStatusPropsGenerator(this);
	}

	getSwiftscaledModifier(): number {
		return this.hasResourceAvailable("SWIFTSCALED") ? this.inherentSpeedModifier() : 0;
	}

	isNoReawakenComboAt(n: number): boolean {
		return !this.hasResourceAvailable("REAWAKENED") && this.hasResourceExactly("VPR_COMBO", n);
	}

	isNoReawakenAoeComboAt(n: number): boolean {
		return (
			!this.hasResourceAvailable("REAWAKENED") && this.hasResourceExactly("VPR_AOE_COMBO", n)
		);
	}

	gainOfferings(n: number) {
		return this.resources.get("SERPENT_OFFERINGS").gain(n);
	}

	// All of these procs are mutually exclusive with each-other.
	clearProcs() {
		if (this.tryConsumeResource("DEATH_RATTLE_READY")) {
			return;
		}
		if (this.tryConsumeResource("LAST_LASH_READY")) {
			return;
		}
		if (this.tryConsumeResource("COIL_OGCD_READY")) {
			this.tryConsumeResource("HUNTERS_VENOM") || this.tryConsumeResource("SWIFTSKINS_VENOM");
			return;
		}
		if (this.tryConsumeResource("UNCOILED_OGCD_READY", true)) {
			this.tryConsumeResource("POISED_FOR_TWINFANG") ||
				this.tryConsumeResource("POISED_FOR_TWINBLOOD");
			return;
		}
		if (this.tryConsumeResource("DEN_OGCD_READY", true)) {
			this.tryConsumeResource("FELLHUNTERS_VENOM") ||
				this.tryConsumeResource("FELLSKINS_VENOM");
			return;
		}
		if (this.tryConsumeResource("LEGACY_READY", true)) {
			return;
		}
	}

	clearComboEnders() {
		if (this.tryConsumeResource("FLANKSBANE_VENOM")) {
			return;
		}
		if (this.tryConsumeResource("HINDSBANE_VENOM")) {
			return;
		}
		if (this.tryConsumeResource("FLANKSTUNG_VENOM")) {
			return;
		}
		if (this.tryConsumeResource("HINDSTUNG_VENOM")) {
			return;
		}
		if (this.tryConsumeResource("GRIMHUNTERS_VENOM")) {
			return;
		}
		if (this.tryConsumeResource("GRIMSKINS_VENOM")) {
			return;
		}
	}

	processCombo(skill: VPRActionKey) {
		// Reawaken GCDs don't affect normal combo state
		const reawakenList = [
			"REAWAKEN",
			"FIRST_GENERATION",
			"SECOND_GENERATION",
			"THIRD_GENERATION",
			"FOURTH_GENERATION",
		];
		const reawakenIdx = reawakenList.indexOf(skill);
		if (reawakenIdx !== -1) {
			// Reawaken GCDs always will set combo counter to the next value,
			// regardless of whether the action was actually combo'd properly
			this.setComboState("REAWAKEN_COMBO", reawakenIdx + 1);
			return;
		}
		const currCombo = this.resources.get("VPR_COMBO").availableAmount();
		const currAoeCombo = this.resources.get("VPR_AOE_COMBO").availableAmount();

		// No need to check old value of combo due to built-in validation requirements.
		const [newCombo, newAoeCombo] = new Map<VPRActionKey, [number, number]>([
			["STEEL_FANGS", [1, 0]],
			["REAVING_FANGS", [1, 0]],
			["HUNTERS_STING", [2, 0]],
			["SWIFTSKINS_STING", [3, 0]],
			["FLANKSTING_STRIKE", [0, 0]],
			["FLANKSBANE_FANG", [0, 0]],
			["HINDSTING_STRIKE", [0, 0]],
			["HINDSBANE_FANG", [0, 0]],
			["STEEL_MAW", [0, 1]],
			["REAVING_MAW", [0, 1]],
			["HUNTERS_BITE", [0, 2]],
			["SWIFTSKINS_BITE", [0, 2]],
			["JAGGED_MAW", [0, 0]],
			["BLOODIED_MAW", [0, 0]],
		]).get(skill) ?? [currCombo, currAoeCombo]; // Any other gcd leaves combo unchanged

		if (newCombo !== currCombo) this.setComboState("VPR_COMBO", newCombo);
		if (newAoeCombo !== currAoeCombo) this.setComboState("VPR_AOE_COMBO", newAoeCombo);
		this.setComboState("REAWAKEN_COMBO", 0);
	}

	cancelVicewinderCombo() {
		this.tryConsumeResource("HUNTERS_COIL_READY", true);
		this.tryConsumeResource("SWIFTSKINS_COIL_READY", true);
		this.tryConsumeResource("HUNTERS_DEN_READY", true);
		this.tryConsumeResource("SWIFTSKINS_DEN_READY", true);
	}

	cancelReawaken() {
		this.tryConsumeResource("LEGACY_READY", true);
		this.tryConsumeResource("ANGUINE_TRIBUTE", true);
		this.tryConsumeResource("REAWAKENED");
		this.setComboState("REAWAKEN_COMBO", 0);
	}
}

const makeVPRWeaponskill = (
	name: VPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<VPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		potencyModifier?: {
			addedPotency: number;
			resource: VPRResourceKey;
		}; // TODO use this
		combo?: ComboPotency;
		positional?: PositionalPotency;
		secondaryCooldown?: CooldownGroupProperties;
		baseRecastTime?: number;
		falloff?: number;
		applicationDelay?: number;
		jobPotencyModifiers?: PotencyModifierFn<VPRState>;
		onConfirm?: EffectFn<VPRState>;
		validateAttempt?: StatePredicate<VPRState>;
		onApplication?: EffectFn<VPRState>;
		highlightIf?: StatePredicate<VPRState>;
	},
): Weaponskill<VPRState> => {
	const replaceCondition: StatePredicate<VPRState> | undefined = params.replaceIf?.find(
		(rep) => rep.newSkill === name,
	)?.condition;
	return makeWeaponskill("VPR", name, unlockLevel, {
		...params,
		recastTime: (state) =>
			state.config.adjustedSksGCD(
				params.baseRecastTime ?? 2.5,
				state.getSwiftscaledModifier(),
			),
		// Find the replacer for this skill, and use its condition as part of validation.
		validateAttempt: combinePredicatesAnd(params.validateAttempt, replaceCondition),
		onConfirm: combineEffects(
			params.onConfirm,
			(state) => state.processCombo(name),
			(state) => state.clearProcs(),
			(state) => state.clearComboEnders(),
		),
	});
};

const makeVPRAbility = (
	name: VPRActionKey,
	unlockLevel: number,
	cdName: VPRCooldownKey,
	params: Partial<MakeAbilityParams<VPRState>>,
): Ability<VPRState> => {
	return makeAbility("VPR", name, unlockLevel, cdName, {
		...params,
	});
};

const makeVPRResourceAbility = (
	name: VPRActionKey,
	unlockLevel: number,
	cdName: VPRCooldownKey,
	params: MakeResourceAbilityParams<VPRState>,
): Ability<VPRState> => {
	return makeResourceAbility("VPR", name, unlockLevel, cdName, params);
};

const firstGenerationCondition: ConditionalSkillReplace<VPRState> = {
	newSkill: "FIRST_GENERATION",
	condition: (state) => state.hasResourceAvailable("REAWAKENED"),
};

const secondGenerationCondition: ConditionalSkillReplace<VPRState> = {
	newSkill: "SECOND_GENERATION",
	condition: (state) => state.hasResourceAvailable("REAWAKENED"),
};

const STEEL_FANGS_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [firstGenerationCondition];
STEEL_FANGS_REPLACEMENTS.push(
	...(
		["STEEL_FANGS", "HUNTERS_STING", "FLANKSTING_STRIKE", "HINDSTING_STRIKE"] as VPRActionKey[]
	).map((key, i) => {
		return {
			newSkill: key,
			condition: (state: Readonly<VPRState>) => state.isNoReawakenComboAt(i),
		};
	}),
);
const REAVING_FANGS_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [secondGenerationCondition];
REAVING_FANGS_REPLACEMENTS.push(
	...(
		["REAVING_FANGS", "SWIFTSKINS_STING", "FLANKSBANE_FANG", "HINDSBANE_FANG"] as VPRActionKey[]
	).map((key, i) => {
		return {
			newSkill: key,
			condition: (state: Readonly<VPRState>) => state.isNoReawakenComboAt(i),
		};
	}),
);
const STEEL_MAW_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [firstGenerationCondition];
STEEL_MAW_REPLACEMENTS.push(
	...(["STEEL_MAW", "HUNTERS_BITE", "JAGGED_MAW"] as VPRActionKey[]).map((key, i) => {
		return {
			newSkill: key,
			condition: (state: Readonly<VPRState>) => state.isNoReawakenAoeComboAt(i),
		};
	}),
);
const REAVING_MAW_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [secondGenerationCondition];
REAVING_MAW_REPLACEMENTS.push(
	...(["REAVING_MAW", "SWIFTSKINS_BITE", "BLOODIED_MAW"] as VPRActionKey[]).map((key, i) => {
		return {
			newSkill: key,
			condition: (state: Readonly<VPRState>) => state.isNoReawakenAoeComboAt(i),
		};
	}),
);

const HUNTERS_COIL_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "HUNTERS_COIL",
		condition: (state) => !state.hasResourceAvailable("REAWAKENED"),
	},
	{
		newSkill: "THIRD_GENERATION",
		condition: (state) => state.hasResourceAvailable("REAWAKENED"),
	},
];
const SWIFTSKINS_COIL_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "SWIFTSKINS_COIL",
		condition: (state) => !state.hasResourceAvailable("REAWAKENED"),
	},
	{
		newSkill: "FOURTH_GENERATION",
		condition: (state) => state.hasResourceAvailable("REAWAKENED"),
	},
];
const SERPENTS_TAIL_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "SERPENTS_TAIL",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "DEATH_RATTLE",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "LAST_LASH",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "FIRST_LEGACY",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "SECOND_LEGACY",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "THIRD_LEGACY",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "FOURTH_LEGACY",
		condition: (state) => false, // TODO
	},
];
const TWINFANG_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "TWINFANG",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "TWINFANG_BITE",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "TWINFANG_THRESH",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "UNCOILED_TWINFANG",
		condition: (state) => false, // TODO
	},
];
const TWINBLOOD_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "TWINBLOOD",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "TWINBLOOD_BITE",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "TWINBLOOD_THRESH",
		condition: (state) => false, // TODO
	},
	{
		newSkill: "UNCOILED_TWINBLOOD",
		condition: (state) => false, // TODO
	},
];
const REAWAKEN_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "REAWAKEN",
		condition: (state) => !state.hasResourceAvailable("ANGUINE_TRIBUTE"),
	},
	{
		newSkill: "OUROBOROS",
		condition: (state) => state.hasResourceAvailable("ANGUINE_TRIBUTE"),
	},
];

makeVPRWeaponskill("STEEL_FANGS", 1, {
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 1.16,
	potency: [
		["NEVER", 140], // ?
		["MELEE_MASTERY_VPR", 200],
	],
	onConfirm: (state) => {
		state.tryConsumeResource("HONED_STEEL");
		state.gainStatus("HONED_REAVERS");
	},
	highlightIf: (state) => state.hasResourceAvailable("HONED_STEEL"),
});

makeVPRWeaponskill("HUNTERS_STING", 5, {
	// TODO
	startOnHotbar: false,
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 0.89,
	potency: 300,
});

makeVPRWeaponskill("REAVING_FANGS", 10, {
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 0, // TODO
	potency: [
		["NEVER", 140], // ?
		["MELEE_MASTERY_VPR", 200],
	],
	onConfirm: (state) => {
		state.tryConsumeResource("HONED_REAVERS");
		state.gainStatus("HONED_STEEL");
	},
	highlightIf: (state) => state.hasResourceAvailable("HONED_REAVERS"),
});

// BEGIN TODO
makeVPRWeaponskill("WRITHING_SNAP", 15, {
	applicationDelay: 0.49,
	potency: 200,
});

makeVPRWeaponskill("SWIFTSKINS_STING", 20, {
	startOnHotbar: false,
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 1.16,
	potency: 300,
});

makeVPRWeaponskill("STEEL_MAW", 25, {
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.02,
	potency: 100,
	falloff: 0,
});

makeVPRWeaponskill("FLANKSTING_STRIKE", 30, {
	startOnHotbar: false,
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 1.64,
	potency: 340,
});

makeVPRWeaponskill("FLANKSBANE_FANG", 30, {
	startOnHotbar: false,
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 1.6,
	potency: 340,
});

makeVPRWeaponskill("HINDSTING_STRIKE", 30, {
	startOnHotbar: false,
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 0.98,
	potency: 340,
});

makeVPRWeaponskill("HINDSBANE_FANG", 30, {
	startOnHotbar: false,
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 1.21,
	potency: 340,
});

makeVPRWeaponskill("REAVING_MAW", 35, {
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 0, // TODO
	potency: 100,
	falloff: 0,
});

makeVPRAbility("SLITHER", 40, "cd_SLITHER", {
	applicationDelay: 0, // TODO
	cooldown: 30,
	maxCharges: 2,
});

makeVPRWeaponskill("HUNTERS_BITE", 40, {
	startOnHotbar: false,
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.07,
	potency: 130,
	falloff: 0,
});

makeVPRWeaponskill("SWIFTSKINS_BITE", 45, {
	startOnHotbar: false,
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 1.38,
	potency: 130,
	falloff: 0,
});

makeVPRWeaponskill("JAGGED_MAW", 50, {
	startOnHotbar: false,
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.07,
	potency: 140,
	falloff: 0,
});

makeVPRWeaponskill("BLOODIED_MAW", 50, {
	startOnHotbar: false,
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 0.81,
	potency: 140,
	falloff: 0,
});

makeVPRAbility("SERPENTS_TAIL", 55, "cd_SERPENTS_TAIL", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeVPRAbility("DEATH_RATTLE", 55, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.7,
	cooldown: 1,
	potency: 280,
});

makeVPRAbility("LAST_LASH", 60, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.16,
	cooldown: 1,
	potency: 100,
	falloff: 0,
});

// PAUSE TODO

makeVPRWeaponskill("VICEWINDER", 65, {
	applicationDelay: 0, // TODO
	potency: 500,
	secondaryCooldown: {
		cdName: "cd_VICEWINDER",
		cooldown: 40,
		maxCharges: 2,
	},
	baseRecastTime: 3,
	validateAttempt: (state) =>
		!state.hasResourceAvailable("REAWAKENED") &&
		!state.hasResourceAvailable("HUNTERS_COIL_READY") &&
		!state.hasResourceAvailable("SWIFTSKINS_COIL_READY") &&
		!state.hasResourceAvailable("HUNTERS_DEN_READY") &&
		!state.hasResourceAvailable("SWIFTSKINS_DEN_READY"),
	onConfirm: (state) => {
		state.resources.get("RATTLING_COIL").gain(1);
		state.gainStatus("HUNTERS_COIL_READY");
		state.gainStatus("SWIFTSKINS_COIL_READY");
	},
});

// RESUME TODO
makeVPRWeaponskill("VICEPIT", 70, {
	applicationDelay: 0, // TODO
	potency: 220,
	secondaryCooldown: {
		cdName: "cd_VICEWINDER",
		cooldown: 40,
		maxCharges: 2,
	},
	falloff: 0,
});

makeVPRWeaponskill("HUNTERS_COIL", 65, {
	replaceIf: HUNTERS_COIL_REPLACEMENTS,
	applicationDelay: 0.98,
	potency: 570,
	positional: { potency: 620, location: "flank" },
	baseRecastTime: 3,
	validateAttempt: (state) => state.hasResourceAvailable("HUNTERS_COIL_READY"),
	onConfirm: (state) => {
		state.gainStatus("HUNTERS_VENOM");
		state.gainStatus("HUNTERS_INSTINCT");
		state.tryConsumeResource("HUNTERS_COIL_READY");
		state.gainOfferings(5);
		// TODO twinfang bite and twinfang blood
	},
});

makeVPRWeaponskill("SWIFTSKINS_COIL", 65, {
	replaceIf: SWIFTSKINS_COIL_REPLACEMENTS,
	applicationDelay: 1.47,
	potency: 570,
	baseRecastTime: 3,
});

makeVPRWeaponskill("HUNTERS_DEN", 70, {
	replaceIf: [
		{
			newSkill: "HUNTERS_DEN",
			condition: (state) => !state.hasResourceAvailable("REAWAKENED"),
		},
		{
			newSkill: "THIRD_GENERATION",
			condition: (state) => state.hasResourceAvailable("REAWAKENED"),
		},
	],
	applicationDelay: 0.49,
	potency: 280,
	falloff: 0,
	baseRecastTime: 3,
});

makeVPRWeaponskill("SWIFTSKINS_DEN", 70, {
	replaceIf: [
		{
			newSkill: "SWIFTSKINS_DEN",
			condition: (state) => !state.hasResourceAvailable("REAWAKENED"),
		},
		{
			newSkill: "FOURTH_GENERATION",
			condition: (state) => state.hasResourceAvailable("REAWAKENED"),
		},
	],
	applicationDelay: 0.94,
	potency: 280,
	falloff: 0,
	baseRecastTime: 3,
});

makeVPRAbility("TWINFANG", 75, "cd_TWINFANG", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeVPRAbility("TWINBLOOD", 75, "cd_TWINBLOOD", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeVPRAbility("TWINFANG_BITE", 75, "cd_TWINFANG", {
	startOnHotbar: false,
	replaceIf: TWINFANG_REPLACEMENTS,
	applicationDelay: 0.62,
	cooldown: 1,
	potency: 120,
});

makeVPRAbility("TWINBLOOD_BITE", 75, "cd_TWINBLOOD", {
	startOnHotbar: false,
	replaceIf: TWINBLOOD_REPLACEMENTS,
	applicationDelay: 0.72,
	cooldown: 1,
	potency: 120,
});

makeVPRAbility("TWINFANG_THRESH", 80, "cd_TWINFANG", {
	startOnHotbar: false,
	replaceIf: TWINFANG_REPLACEMENTS,
	applicationDelay: 0.67,
	cooldown: 1,
	potency: 50,
	falloff: 0,
});

makeVPRAbility("TWINBLOOD_THRESH", 80, "cd_TWINBLOOD", {
	startOnHotbar: false,
	replaceIf: TWINBLOOD_REPLACEMENTS,
	applicationDelay: 0.79,
	cooldown: 1,
	potency: 50,
	falloff: 0,
});

makeVPRWeaponskill("UNCOILED_FURY", 82, {
	applicationDelay: 0.8,
	baseRecastTime: 3.5,
	potency: 680,
	falloff: 0.5,
});

makeVPRAbility("SERPENTS_IRE", 86, "cd_SERPENTS_IRE", {
	applicationDelay: 0,
	cooldown: 120,
	requiresCombat: true,
	onConfirm: (state) => {
		state.resources.get("RATTLING_COIL").gain(1);
		if (state.hasTraitUnlocked("SERPENTS_LINEAGE")) {
			state.gainStatus("READY_TO_REAWAKEN");
		}
	},
});

makeVPRWeaponskill("REAWAKEN", 90, {
	replaceIf: REAWAKEN_REPLACEMENTS,
	applicationDelay: 0.62,
	potency: 750,
	falloff: 0.6,
	validateAttempt: (state) =>
		state.hasResourceAvailable("SERPENT_OFFERINGS", 50) ||
		state.hasResourceAvailable("READY_TO_REAWAKEN"),
	onConfirm: (state) => {
		if (!state.tryConsumeResource("READY_TO_REAWAKEN")) {
			state.resources.get("SERPENT_OFFERINGS").consume(50);
		}
		state.gainStatus("ANGUINE_TRIBUTE", 5);
		state.gainStatus("REAWAKENED");
	},
});

makeVPRWeaponskill("FIRST_GENERATION", 90, {
	// Generation skills may also repalce the AoE buttons, we choose single target for simplicity.
	// When moving skills around in the timeline editor, we can usually assume the user would want
	// the ST version anyway.
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	startOnHotbar: false,
	applicationDelay: 1.7,
	potency: 420,
	falloff: 0.6,
	combo: {
		resource: "REAWAKEN_COMBO",
		resourceValue: 1,
		potency: 680,
	},
	highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", 1),
	onConfirm: (state) => state.tryConsumeResource("ANGUINE_TRIBUTE"),
});

makeVPRWeaponskill("SECOND_GENERATION", 90, {
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	startOnHotbar: false,
	applicationDelay: 1.47,
	potency: 420,
	falloff: 0.6,
	highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", 2),
	onConfirm: (state) => state.tryConsumeResource("ANGUINE_TRIBUTE"),
});

makeVPRWeaponskill("THIRD_GENERATION", 90, {
	replaceIf: HUNTERS_COIL_REPLACEMENTS,
	startOnHotbar: false,
	applicationDelay: 1.47,
	potency: 420,
	falloff: 0.6,
	highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", 3),
	onConfirm: (state) => state.tryConsumeResource("ANGUINE_TRIBUTE"),
});

makeVPRWeaponskill("FOURTH_GENERATION", 90, {
	replaceIf: SWIFTSKINS_COIL_REPLACEMENTS,
	startOnHotbar: false,
	applicationDelay: 1.47,
	potency: 420,
	falloff: 0.6,
	highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", 4),
	onConfirm: (state) => state.tryConsumeResource("ANGUINE_TRIBUTE"),
});

makeVPRAbility("UNCOILED_TWINFANG", 92, "cd_TWINFANG", {
	startOnHotbar: false,
	replaceIf: TWINFANG_REPLACEMENTS,
	applicationDelay: 1.03,
	cooldown: 1,
});

makeVPRAbility("UNCOILED_TWINBLOOD", 92, "cd_TWINBLOOD", {
	startOnHotbar: false,
	replaceIf: TWINBLOOD_REPLACEMENTS,
	applicationDelay: 0.98,
	cooldown: 1,
});

makeVPRWeaponskill("OUROBOROS", 96, {
	startOnHotbar: false,
	replaceIf: REAWAKEN_REPLACEMENTS,
	applicationDelay: 2.33, // TODO
	potency: 1150,
	falloff: 0.6,
	highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", 5),
	onConfirm: (state) => {
		state.tryConsumeResource("REAWAKENED");
		state.tryConsumeResource("ANGUINE_TRIBUTE");
	},
});

makeVPRAbility("FIRST_LEGACY", 100, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.29,
	cooldown: 1,
});

makeVPRAbility("SECOND_LEGACY", 100, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.07,
	cooldown: 1,
});

makeVPRAbility("THIRD_LEGACY", 100, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.21,
	cooldown: 1,
});

makeVPRAbility("FOURTH_LEGACY", 100, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.07,
	cooldown: 1,
});
