// Skill and state declarations for VPR.

import { controller } from "../../Controller/Controller";
import { VPRStatusPropsGenerator } from "../../Components/Jobs/VPR";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { BuffType } from "../Common";
import { TraitKey } from "../Data";
import { VPRActionKey, VPRCooldownKey, VPRResourceKey, VPRStatusKey } from "../Data/Jobs/VPR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { getResourceInfo, makeResource, ResourceInfo, CoolDown, Resource } from "../Resources";
import {
	Ability,
	combineEffects,
	combinePredicatesAnd,
	ConditionalSkillReplace,
	ComboPotency,
	CooldownGroupProperties,
	EffectFn,
	makeAbility,
	makeWeaponskill,
	MakeAbilityParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PositionalPotency,
	PotencyModifierFn,
	Skill,
	StatePredicate,
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
// Buffs are applied at snapshot, but start counting down at application. We model this behavior by
// explicitly setting durations in ability confirms.
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
makeVPRResource("READY_TO_REAWAKEN", 1, { timeout: 30, warnOnTimeout: true });
makeVPRResource("REAWAKENED", 1, { timeout: 30, warnOnTimeout: true });

// Trackers
// These all are cleared on using a Weaponskill (or Spell), not on a timeout.
makeVPRResource("DEATH_RATTLE_READY", 1);
makeVPRResource("COIL_OGCD_READY", 2);
makeVPRResource("DEN_OGCD_READY", 2);
makeVPRResource("UNCOILED_OGCD_READY", 2);
makeVPRResource("HUNTERS_COIL_READY", 1, { timeout: 30, warnOnTimeout: true });
makeVPRResource("HUNTERS_DEN_READY", 1, { timeout: 30, warnOnTimeout: true });
makeVPRResource("SWIFTSKINS_COIL_READY", 1, { timeout: 30, warnOnTimeout: true });
makeVPRResource("SWIFTSKINS_DEN_READY", 1, { timeout: 30, warnOnTimeout: true });
makeVPRResource("LAST_LASH_READY", 1);
// In addition to using GCD actions, Legacies are cleared when leaving Reawaken.
makeVPRResource("LEGACY_READY", 4);
makeVPRResource("VPR_COMBO", 4, { timeout: 30 });
makeVPRResource("VPR_AOE_COMBO", 2, { timeout: 30 });
makeVPRResource("REAWAKEN_COMBO", 4);

const FOLLOWUP_STATUSES: VPRResourceKey[] = [
	"DEATH_RATTLE_READY",
	"LAST_LASH_READY",
	"COIL_OGCD_READY",
	"UNCOILED_OGCD_READY",
	"HUNTERS_VENOM",
	"SWIFTSKINS_VENOM",
	"POISED_FOR_TWINFANG",
	"POISED_FOR_TWINBLOOD",
	"DEN_OGCD_READY",
	"LEGACY_READY",
];

const FLANK_FINISHER_BUFFS: VPRStatusKey[] = ["FLANKSBANE_VENOM", "FLANKSTUNG_VENOM"];
const REAR_FINISHER_BUFFS: VPRStatusKey[] = ["HINDSBANE_VENOM", "HINDSTUNG_VENOM"];
const ALL_FINISHER_BUFFS: VPRStatusKey[] = [...FLANK_FINISHER_BUFFS, ...REAR_FINISHER_BUFFS];

export class VPRState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const slitherStacks = this.hasTraitUnlocked("ENHANCED_SLITHER") ? 3 : 2;
		this.cooldowns.set(new CoolDown("cd_SLITHER", 30, slitherStacks, slitherStacks));

		const coilStacks = this.hasTraitUnlocked("ENHANCED_VIPERS_RATTLE") ? 3 : 2;
		const anguineStacks = this.hasTraitUnlocked("ENHANCED_SERPENTS_LINEAGE") ? 5 : 4;
		this.resources.set(new Resource("RATTLING_COIL", coilStacks, 0, true));
		this.resources.set(new Resource("ANGUINE_TRIBUTE", anguineStacks, 0));

		this.registerRecurringEvents();
	}

	override inherentSpeedModifier(): number {
		return 15;
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("HUNTERS_INSTINCT")) {
			node.addBuff(BuffType.HuntersInstinct);
		}
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("SWIFTSCALED") && skill.cdName === "cd_GCD") {
			node.addBuff(BuffType.Swiftscaled);
		}
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

	setLegacy(n: number) {
		if (this.hasTraitUnlocked("SERPENTS_LEGACY")) {
			this.resources.get("LEGACY_READY").overrideCurrentValue(n);
		}
	}

	gainOfferings(n: number) {
		if (this.hasTraitUnlocked("SERPENTS_LINEAGE")) {
			this.resources.get("SERPENT_OFFERINGS").gain(n);
		}
	}

	processCombo(skill: VPRActionKey) {
		// Ranged filler and coils do not affect combo state, including reawaken
		if (skill === "WRITHING_SNAP" || skill === "UNCOILED_FURY") {
			return;
		}
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
			this.setComboState("REAWAKEN_COMBO", (reawakenIdx + 1) % 5);
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

	cancelVicewinderCombo(name: VPRActionKey) {
		if (name !== "SWIFTSKINS_COIL") {
			this.tryConsumeResource("HUNTERS_COIL_READY");
		}
		if (name !== "HUNTERS_COIL") {
			this.tryConsumeResource("SWIFTSKINS_COIL_READY");
		}
		if (name !== "SWIFTSKINS_DEN") {
			this.tryConsumeResource("HUNTERS_DEN_READY");
		}
		if (name !== "HUNTERS_DEN") {
			this.tryConsumeResource("SWIFTSKINS_DEN_READY");
		}
	}

	consumeAnguine() {
		this.tryConsumeResource("ANGUINE_TRIBUTE");
		if (!this.hasResourceAvailable("ANGUINE_TRIBUTE")) {
			this.cancelReawaken();
		}
	}

	cancelReawaken() {
		// Legacy follow-ups are canceled by the last reawaken skill
		this.tryConsumeResource("LEGACY_READY", true);
		this.tryConsumeResource("ANGUINE_TRIBUTE", true);
		this.tryConsumeResource("REAWAKENED");
		this.setComboState("REAWAKEN_COMBO", 0);
	}

	applyExtendedStatus(rscType: VPRStatusKey, applicationDelay: number) {
		// Most buffs are applied at confirm, but do not start ticking down until application.
		// We model this by extending its duration by applicationDelay.
		// If the buff is a combo ender, consume all other combo enders first.
		if (ALL_FINISHER_BUFFS.includes(rscType)) {
			// Combo ender "venom" buffs are mutually exclusive with each other.
			ALL_FINISHER_BUFFS.forEach((rsc) => rsc !== rscType && this.tryConsumeResource(rsc));
		}

		const resource = this.resources.get(rscType);
		const resourceInfo = getResourceInfo("VPR", rscType) as ResourceInfo;
		if (this.hasResourceAvailable(rscType)) {
			if (resourceInfo.maxTimeout > 0) {
				resource.overrideTimer(this, resourceInfo.maxTimeout + applicationDelay);
			}
		} else {
			resource.gain(1);
			if (resourceInfo.maxTimeout > 0) {
				this.enqueueResourceDrop(rscType, resourceInfo.maxTimeout + applicationDelay);
			}
		}
	}
}

const makeVPRWeaponskill = (
	name: VPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<VPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		combo?: ComboPotency;
		positional?: PositionalPotency;
		secondaryCooldown?: CooldownGroupProperties;
		baseRecastTime?: number;
		falloff?: number;
		applicationDelay: number;
		jobPotencyModifiers?: PotencyModifierFn<VPRState>;
		onConfirm?: EffectFn<VPRState>;
		validateAttempt?: StatePredicate<VPRState>;
		onApplication?: EffectFn<VPRState>;
		highlightIf?: StatePredicate<VPRState>;
		extendedStatus?: VPRStatusKey;
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
			// Cancel coil/den/reawaken/follow-up states before onConfirm to ensure their own follow-up states are set correctly
			(state) => {
				if (name !== "UNCOILED_FURY" && name !== "WRITHING_SNAP") {
					state.cancelVicewinderCombo(name);
				}
				FOLLOWUP_STATUSES.forEach((key) => {
					if (state.tryConsumeResource(key, true)) {
						controller.reportWarning({ kind: "overwrite", rsc: key });
					}
				});
			},
			params.onConfirm,
			params.extendedStatus
				? (state) =>
						state.applyExtendedStatus(params.extendedStatus!, params.applicationDelay)
				: undefined,
			(state) => state.processCombo(name),
		),
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			if (state.hasResourceAvailable("HUNTERS_INSTINCT")) {
				mods.push(Modifiers.HuntersInstinct);
			}
			return mods;
		},
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
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			if (state.hasResourceAvailable("HUNTERS_INSTINCT")) {
				mods.push(Modifiers.HuntersInstinct);
			}
			return mods;
		},
	});
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
		condition: (state) => !FOLLOWUP_STATUSES.some((key) => state.hasResourceAvailable(key)),
	},
	{
		newSkill: "DEATH_RATTLE",
		condition: (state) => state.hasResourceAvailable("DEATH_RATTLE_READY"),
	},
	{
		newSkill: "LAST_LASH",
		condition: (state) => state.hasResourceAvailable("LAST_LASH_READY"),
	},
	{
		newSkill: "FIRST_LEGACY",
		condition: (state) => state.hasResourceExactly("LEGACY_READY", 1),
	},
	{
		newSkill: "SECOND_LEGACY",
		condition: (state) => state.hasResourceExactly("LEGACY_READY", 2),
	},
	{
		newSkill: "THIRD_LEGACY",
		condition: (state) => state.hasResourceExactly("LEGACY_READY", 3),
	},
	{
		newSkill: "FOURTH_LEGACY",
		condition: (state) => state.hasResourceExactly("LEGACY_READY", 4),
	},
];
const TWINFANG_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "TWINFANG",
		condition: (state) =>
			!(
				["COIL_OGCD_READY", "UNCOILED_OGCD_READY", "DEN_OGCD_READY"] as VPRResourceKey[]
			).some((rsc) => state.hasResourceAvailable(rsc)),
	},
	{
		newSkill: "TWINFANG_BITE",
		condition: (state) => state.hasResourceAvailable("COIL_OGCD_READY"),
	},
	{
		newSkill: "TWINFANG_THRESH",
		condition: (state) => state.hasResourceAvailable("DEN_OGCD_READY"),
	},
	{
		newSkill: "UNCOILED_TWINFANG",
		condition: (state) => state.hasResourceAvailable("UNCOILED_OGCD_READY"),
	},
];
const TWINBLOOD_REPLACEMENTS: ConditionalSkillReplace<VPRState>[] = [
	{
		newSkill: "TWINBLOOD",
		condition: (state) =>
			!(
				["COIL_OGCD_READY", "UNCOILED_OGCD_READY", "DEN_OGCD_READY"] as VPRResourceKey[]
			).some((rsc) => state.hasResourceAvailable(rsc)),
	},
	{
		newSkill: "TWINBLOOD_BITE",
		condition: (state) => state.hasResourceAvailable("COIL_OGCD_READY"),
	},
	{
		newSkill: "TWINBLOOD_THRESH",
		condition: (state) => state.hasResourceAvailable("DEN_OGCD_READY"),
	},
	{
		newSkill: "UNCOILED_TWINBLOOD",
		condition: (state) => state.hasResourceAvailable("UNCOILED_OGCD_READY"),
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

makeVPRWeaponskill("WRITHING_SNAP", 15, {
	applicationDelay: 0.488,
	potency: 200,
});

makeVPRWeaponskill("STEEL_FANGS", 1, {
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 1.158,
	potency: [
		["NEVER", 140], // TODO verify
		["MELEE_MASTERY_VPR", 200],
	],
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("HONED_STEEL") ? [Modifiers.HonedST] : [],
	highlightIf: (state) => state.hasResourceAvailable("HONED_STEEL"),
	onConfirm: (state) => state.tryConsumeResource("HONED_STEEL"),
	extendedStatus: "HONED_REAVERS",
});

makeVPRWeaponskill("REAVING_FANGS", 10, {
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 1.293,
	potency: [
		["NEVER", 140], // TODO verify
		["MELEE_MASTERY_VPR", 200],
	],
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("HONED_REAVERS") ? [Modifiers.HonedST] : [],
	highlightIf: (state) => state.hasResourceAvailable("HONED_REAVERS"),
	onConfirm: (state) => state.tryConsumeResource("HONED_REAVERS"),
	extendedStatus: "HONED_STEEL",
});

makeVPRWeaponskill("HUNTERS_STING", 5, {
	startOnHotbar: false,
	replaceIf: STEEL_FANGS_REPLACEMENTS,
	applicationDelay: 0.89,
	potency: [
		["NEVER", 240], // TODO verify
		["MELEE_MASTERY_VPR", 300],
	],
	// Hunter's Sting highlights when a flank buff is active, or if there is no flank/rear buff
	highlightIf: (state) =>
		!ALL_FINISHER_BUFFS.some((rsc) => state.hasResourceAvailable(rsc)) ||
		FLANK_FINISHER_BUFFS.some((rsc) => state.hasResourceAvailable(rsc)),
	extendedStatus: "HUNTERS_INSTINCT",
});

makeVPRWeaponskill("SWIFTSKINS_STING", 20, {
	startOnHotbar: false,
	replaceIf: REAVING_FANGS_REPLACEMENTS,
	applicationDelay: 1.16,
	potency: [
		["NEVER", 240], // TODO verify
		["MELEE_MASTERY_VPR", 300],
	],
	// Swiftskin's Sting highlights when a flank buff is active, or if there is no flank/rear buff
	highlightIf: (state) =>
		!ALL_FINISHER_BUFFS.some((rsc) => state.hasResourceAvailable(rsc)) ||
		REAR_FINISHER_BUFFS.some((rsc) => state.hasResourceAvailable(rsc)),
	extendedStatus: "SWIFTSCALED",
});

const finishers = [
	[
		"FLANKSTING_STRIKE",
		1.649,
		"flank",
		"FLANKSTUNG_VENOM",
		"HINDSTUNG_VENOM",
		STEEL_FANGS_REPLACEMENTS,
	],
	[
		"FLANKSBANE_FANG",
		1.604,
		"flank",
		"FLANKSBANE_VENOM",
		"HINDSBANE_VENOM",
		REAVING_FANGS_REPLACEMENTS,
	],
	[
		"HINDSTING_STRIKE",
		0.98,
		"rear",
		"HINDSTUNG_VENOM",
		"FLANKSBANE_VENOM",
		STEEL_FANGS_REPLACEMENTS,
	],
	[
		"HINDSBANE_FANG",
		1.203,
		"rear",
		"HINDSBANE_VENOM",
		"FLANKSTUNG_VENOM",
		REAVING_FANGS_REPLACEMENTS,
	],
] as Array<
	[
		VPRActionKey,
		number,
		"rear" | "flank",
		VPRStatusKey,
		VPRStatusKey,
		ConditionalSkillReplace<VPRState>[],
	]
>;
finishers.forEach(([name, applicationDelay, location, consumes, applies, replaceIf]) => {
	makeVPRWeaponskill(name, 30, {
		startOnHotbar: false,
		replaceIf,
		applicationDelay,
		potency: [
			["NEVER", 280], // TODO verify
			["MELEE_MASTERY_II_VPR", 340],
		],
		positional: {
			potency: [
				["NEVER", 360], // TODO verify
				["MELEE_MASTERY_II_VPR", 400],
			],
			location,
		},
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable(consumes) ? [Modifiers.VenomST] : [],
		highlightIf: (state) =>
			!ALL_FINISHER_BUFFS.some((rsc) => state.hasResourceAvailable(rsc)) ||
			state.hasResourceAvailable(consumes),
		onConfirm: (state) => {
			state.gainStatus("DEATH_RATTLE_READY");
			state.resources.get("SERPENT_OFFERINGS").gain(10);
			if (ALL_FINISHER_BUFFS.filter((rsc) => rsc !== consumes).some((rsc) => state.hasResourceAvailable(rsc))) {
				controller.reportWarning({kind: "custom", en: "incorrect combo ender!"});
			}
		},
		extendedStatus: applies,
	});
});

makeVPRWeaponskill("HUNTERS_COIL", 65, {
	replaceIf: HUNTERS_COIL_REPLACEMENTS,
	applicationDelay: 0.982,
	potency: 570,
	positional: { potency: 620, location: "flank" },
	baseRecastTime: 3,
	highlightIf: (state) => state.hasResourceAvailable("HUNTERS_COIL_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("HUNTERS_COIL_READY"),
	onConfirm: (state) => {
		// hunter's coil ready is consumed in skill constructor
		state.gainOfferings(5);
		if (state.hasTraitUnlocked("VIPERS_BITE")) {
			state.gainStatus("HUNTERS_VENOM");
			state.gainStatus("COIL_OGCD_READY", 2);
		}
		// Refresh timer for Swiftskin's Coil (was previously set by Vicewinder)
		if (state.hasResourceAvailable("SWIFTSKINS_COIL_READY")) {
			state.gainStatus("SWIFTSKINS_COIL_READY");
		}
	},
	extendedStatus: "HUNTERS_INSTINCT",
});

makeVPRWeaponskill("SWIFTSKINS_COIL", 65, {
	replaceIf: SWIFTSKINS_COIL_REPLACEMENTS,
	applicationDelay: 1.473,
	potency: 570,
	positional: { potency: 620, location: "rear" },
	baseRecastTime: 3,
	highlightIf: (state) => state.hasResourceAvailable("SWIFTSKINS_COIL_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("SWIFTSKINS_COIL_READY"),
	onConfirm: (state) => {
		// swiftskin's coil ready is consumed in skill constructor
		state.gainOfferings(5);
		if (state.hasTraitUnlocked("VIPERS_BITE")) {
			state.gainStatus("SWIFTSKINS_VENOM");
			state.gainStatus("COIL_OGCD_READY", 2);
		}
		// Refresh timer for Swiftskin's Coil (was previously set by Vicewinder)
		if (state.hasResourceAvailable("HUNTERS_COIL_READY")) {
			state.gainStatus("HUNTERS_COIL_READY");
		}
	},
	extendedStatus: "SWIFTSCALED",
});

makeVPRWeaponskill("REAWAKEN", 90, {
	replaceIf: REAWAKEN_REPLACEMENTS,
	applicationDelay: 0.625,
	potency: 750,
	falloff: 0.6,
	baseRecastTime: 2.2,
	highlightIf: (state) =>
		state.hasResourceAvailable("SERPENT_OFFERINGS", 50) ||
		state.hasResourceAvailable("READY_TO_REAWAKEN"),
	validateAttempt: (state) =>
		state.hasResourceAvailable("SERPENT_OFFERINGS", 50) ||
		state.hasResourceAvailable("READY_TO_REAWAKEN"),
	onConfirm: (state) => {
		if (!state.tryConsumeResource("READY_TO_REAWAKEN")) {
			state.resources.get("SERPENT_OFFERINGS").consume(50);
		}
		state.gainStatus("ANGUINE_TRIBUTE", state.resources.get("ANGUINE_TRIBUTE").maxValue);
		state.gainStatus("REAWAKENED");
		// Consume relevant gauge elements if reawaken expires naturally.
		// To work around a possible bug in resource management, we must cancel
		// the original reawaken resource expiry event since adding a new resource event
		// overwrites the existing event without removing it from the event queue.
		// We should eventually fix this globally, but doing so would require extensive testing.
		state.resources.get("REAWAKENED").removeTimer();
		state.resources.addResourceEvent({
			rscType: "REAWAKENED",
			name: "cancel reawaken",
			delay: (getResourceInfo("VPR", "REAWAKENED") as ResourceInfo).maxTimeout,
			fnOnRsc: () => state.cancelReawaken(),
		});
	},
});

makeVPRWeaponskill("OUROBOROS", 96, {
	startOnHotbar: false,
	replaceIf: REAWAKEN_REPLACEMENTS,
	applicationDelay: 2.313,
	potency: 1150,
	falloff: 0.6,
	baseRecastTime: 3,
	highlightIf: (state) => state.hasResourceExactly("ANGUINE_TRIBUTE", 1),
	onConfirm: (state) => state.cancelReawaken(),
});

makeVPRWeaponskill("VICEWINDER", 65, {
	applicationDelay: 0.581,
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
		if (state.hasTraitUnlocked("VIPERS_RATTLE")) {
			state.resources.get("RATTLING_COIL").gain(1);
		}
		state.gainStatus("HUNTERS_COIL_READY");
		state.gainStatus("SWIFTSKINS_COIL_READY");
	},
});

makeVPRWeaponskill("UNCOILED_FURY", 82, {
	applicationDelay: 0.804,
	potency: 680,
	falloff: 0.5,
	baseRecastTime: 3.5,
	highlightIf: (state) => state.hasResourceAvailable("RATTLING_COIL"),
	validateAttempt: (state) => state.hasResourceAvailable("RATTLING_COIL"),
	onConfirm: (state) => {
		state.tryConsumeResource("RATTLING_COIL");
		if (state.hasTraitUnlocked("UNCOILED_FANGS")) {
			state.gainStatus("POISED_FOR_TWINFANG");
			state.gainStatus("UNCOILED_OGCD_READY", 2);
		}
	},
});

makeVPRWeaponskill("STEEL_MAW", 25, {
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.091,
	potency: 100,
	falloff: 0,
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("HONED_STEEL") ? [Modifiers.HonedAoE] : [],
	highlightIf: (state) => state.hasResourceAvailable("HONED_STEEL"),
	onConfirm: (state) => state.tryConsumeResource("HONED_STEEL"),
	extendedStatus: "HONED_REAVERS",
});

makeVPRWeaponskill("REAVING_MAW", 35, {
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 0.908,
	potency: 100,
	falloff: 0,
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("HONED_REAVERS") ? [Modifiers.HonedAoE] : [],
	highlightIf: (state) => state.hasResourceAvailable("HONED_REAVERS"),
	onConfirm: (state) => state.tryConsumeResource("HONED_REAVERS"),
	extendedStatus: "HONED_STEEL",
});

makeVPRWeaponskill("HUNTERS_BITE", 40, {
	startOnHotbar: false,
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.134,
	potency: 130,
	falloff: 0,
	highlightIf: (state) => true,
	extendedStatus: "HUNTERS_INSTINCT",
});

makeVPRWeaponskill("SWIFTSKINS_BITE", 45, {
	startOnHotbar: false,
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 1.445,
	potency: 130,
	falloff: 0,
	highlightIf: (state) => true,
	extendedStatus: "SWIFTSCALED",
});

makeVPRWeaponskill("JAGGED_MAW", 50, {
	startOnHotbar: false,
	replaceIf: STEEL_MAW_REPLACEMENTS,
	applicationDelay: 1.127,
	potency: 140,
	falloff: 0,
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("GRIMSKINS_VENOM") ? [Modifiers.VenomAoE] : [],
	highlightIf: (state) =>
		state.hasResourceAvailable("GRIMSKINS_VENOM") ||
		!state.hasResourceAvailable("GRIMHUNTERS_VENOM"),
	onConfirm: (state) => {
		state.gainStatus("LAST_LASH_READY");
		state.resources.get("SERPENT_OFFERINGS").gain(10);
	},
	extendedStatus: "GRIMHUNTERS_VENOM",
});

makeVPRWeaponskill("BLOODIED_MAW", 50, {
	startOnHotbar: false,
	replaceIf: REAVING_MAW_REPLACEMENTS,
	applicationDelay: 0.866,
	potency: 140,
	falloff: 0,
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("GRIMHUNTERS_VENOM") ? [Modifiers.VenomAoE] : [],
	highlightIf: (state) =>
		state.hasResourceAvailable("GRIMHUNTERS_VENOM") ||
		!state.hasResourceAvailable("GRIMSKINS_VENOM"),
	onConfirm: (state) => {
		state.gainStatus("LAST_LASH_READY");
		state.resources.get("SERPENT_OFFERINGS").gain(10);
	},
	extendedStatus: "GRIMSKINS_VENOM",
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
	applicationDelay: 0.569,
	potency: 280,
	falloff: 0,
	baseRecastTime: 3,
	highlightIf: (state) => state.hasResourceAvailable("HUNTERS_DEN_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("HUNTERS_DEN_READY"),
	onConfirm: (state) => {
		// hunter's den ready is consumed in skill constructor
		state.gainOfferings(5);
		if (state.hasTraitUnlocked("VIPERS_THRESH")) {
			state.gainStatus("FELLHUNTERS_VENOM");
			state.gainStatus("DEN_OGCD_READY", 2);
		}
		// Refresh timer for Swiftskin's Den (was previously set by Vicepit)
		if (state.hasResourceAvailable("SWIFTSKINS_DEN_READY")) {
			state.gainStatus("SWIFTSKINS_DEN_READY");
		}
	},
	extendedStatus: "HUNTERS_INSTINCT",
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
	applicationDelay: 0.999,
	potency: 280,
	falloff: 0,
	baseRecastTime: 3,
	highlightIf: (state) => state.hasResourceAvailable("SWIFTSKINS_DEN_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("SWIFTSKINS_DEN_READY"),
	onConfirm: (state) => {
		// swiftskin's den ready is consumed in skill constructor
		// hunter's den ready was already granted by vicepit
		state.gainOfferings(5);
		if (state.hasTraitUnlocked("VIPERS_THRESH")) {
			state.gainStatus("FELLSKINS_VENOM");
			state.gainStatus("DEN_OGCD_READY", 2);
		}
		// Refresh timer for Hunter's Den (was previously set by Vicepit)
		if (state.hasResourceAvailable("HUNTERS_DEN_READY")) {
			state.gainStatus("HUNTERS_DEN_READY");
		}
	},
	extendedStatus: "SWIFTSCALED",
});

makeVPRWeaponskill("VICEPIT", 70, {
	applicationDelay: 0.827,
	potency: 220,
	secondaryCooldown: {
		cdName: "cd_VICEWINDER",
		cooldown: 40,
		maxCharges: 2,
	},
	falloff: 0,
	baseRecastTime: 3,
	validateAttempt: (state) =>
		!state.hasResourceAvailable("REAWAKENED") &&
		!state.hasResourceAvailable("HUNTERS_COIL_READY") &&
		!state.hasResourceAvailable("SWIFTSKINS_COIL_READY") &&
		!state.hasResourceAvailable("HUNTERS_DEN_READY") &&
		!state.hasResourceAvailable("SWIFTSKINS_DEN_READY"),
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("VIPERS_RATTLE")) {
			// If used during an untargetable phase, do not gain the coil.
			// We don't apply this logic to Vicewinder because it is sometimes necessary to
			// press Vicepit during untargetable phases to prepare a twinblade button.
			if (!controller.timeline.duringUntargetable(state.getDisplayTime())) {
				state.resources.get("RATTLING_COIL").gain(1);
			}
		}
		state.gainStatus("HUNTERS_DEN_READY");
		state.gainStatus("SWIFTSKINS_DEN_READY");
	},
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

makeVPRAbility("SLITHER", 40, "cd_SLITHER", {
	applicationDelay: 0,
	cooldown: 30,
	maxCharges: 3, // set by trait in constructor
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	// drawsAggro: true, // TODO find application delay
});

makeVPRAbility("SERPENTS_TAIL", 55, "cd_SERPENTS_TAIL", {
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => false,
});

makeVPRAbility("DEATH_RATTLE", 55, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.697,
	cooldown: 1,
	potency: 280,
	highlightIf: (state) => true,
	onConfirm: (state) => state.tryConsumeResource("DEATH_RATTLE_READY"),
});

makeVPRAbility("LAST_LASH", 60, "cd_SERPENTS_TAIL", {
	startOnHotbar: false,
	replaceIf: SERPENTS_TAIL_REPLACEMENTS,
	applicationDelay: 1.226,
	cooldown: 1,
	potency: 100,
	falloff: 0,
	highlightIf: (state) => true,
	onConfirm: (state) => state.tryConsumeResource("LAST_LASH_READY"),
});

makeVPRAbility("TWINFANG", 75, "cd_TWINFANG", {
	replaceIf: TWINFANG_REPLACEMENTS,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => false,
});

makeVPRAbility("TWINBLOOD", 75, "cd_TWINBLOOD", {
	replaceIf: TWINBLOOD_REPLACEMENTS,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => false,
});

const fangsAndBloods: Array<
	[
		VPRActionKey,
		number,
		"fang" | "blood",
		number,
		number,
		number | undefined,
		VPRResourceKey,
		VPRStatusKey,
		PotencyModifier,
		VPRStatusKey,
	]
> = [
	[
		"TWINFANG_BITE",
		75,
		"fang",
		0.629,
		120,
		undefined,
		"COIL_OGCD_READY",
		"HUNTERS_VENOM",
		Modifiers.VenomOGCDST,
		"SWIFTSKINS_VENOM",
	],
	[
		"TWINBLOOD_BITE",
		75,
		"blood",
		0.714,
		120,
		undefined,
		"COIL_OGCD_READY",
		"SWIFTSKINS_VENOM",
		Modifiers.VenomOGCDST,
		"HUNTERS_VENOM",
	],
	[
		"TWINFANG_THRESH",
		80,
		"fang",
		0.666,
		50,
		0,
		"DEN_OGCD_READY",
		"FELLHUNTERS_VENOM",
		Modifiers.VenomOGCDAoE,
		"FELLSKINS_VENOM",
	],
	[
		"TWINBLOOD_THRESH",
		80,
		"blood",
		0.764,
		50,
		0,
		"DEN_OGCD_READY",
		"FELLSKINS_VENOM",
		Modifiers.VenomOGCDAoE,
		"FELLHUNTERS_VENOM",
	],
	[
		"UNCOILED_TWINFANG",
		92,
		"fang",
		1.04,
		120,
		0.5,
		"UNCOILED_OGCD_READY",
		"POISED_FOR_TWINFANG",
		Modifiers.Poised,
		"POISED_FOR_TWINBLOOD",
	],
	[
		"UNCOILED_TWINBLOOD",
		92,
		"blood",
		0.977,
		120,
		0.5,
		"UNCOILED_OGCD_READY",
		"POISED_FOR_TWINBLOOD",
		Modifiers.Poised,
		"POISED_FOR_TWINFANG",
	],
];
fangsAndBloods.forEach(
	([
		name,
		level,
		which,
		applicationDelay,
		potency,
		falloff,
		tracker,
		consumes,
		modifier,
		applies,
	]) => {
		makeVPRAbility(name, level, which === "fang" ? "cd_TWINFANG" : "cd_TWINBLOOD", {
			startOnHotbar: false,
			replaceIf: which === "fang" ? TWINFANG_REPLACEMENTS : TWINBLOOD_REPLACEMENTS,
			applicationDelay,
			cooldown: 1,
			potency,
			falloff,
			highlightIf: (state) => state.hasResourceAvailable(consumes),
			jobPotencyModifiers: (state) =>
				state.hasResourceAvailable(consumes) ? [modifier] : [],
			onConfirm: (state) => {
				state.tryConsumeResource(tracker);
				if (!state.hasResourceAvailable(consumes)) {
					controller.reportWarning({kind: "custom", en: `unbuffed twin${which} ability!`})
				}
				if (state.tryConsumeResource(consumes) && state.hasResourceAvailable(tracker)) {
					state.gainStatus(applies);
				} else {
					state.tryConsumeResource(applies);
				}
			},
		});
	},
);

const generations = [
	["FIRST_GENERATION", 1.702, STEEL_FANGS_REPLACEMENTS],
	["SECOND_GENERATION", 1.473, REAVING_FANGS_REPLACEMENTS],
	["THIRD_GENERATION", 1.473, HUNTERS_COIL_REPLACEMENTS],
	["FOURTH_GENERATION", 1.473, SWIFTSKINS_COIL_REPLACEMENTS],
] as Array<[VPRActionKey, number, ConditionalSkillReplace<VPRState>[]]>;
generations.forEach(([name, applicationDelay, replaceIf], i) => {
	makeVPRWeaponskill(name, 90, {
		// Generation skills may also repalce the AoE buttons, we choose single target for simplicity.
		// When moving skills around in the timeline editor, we can usually assume the user would want
		// the ST version anyway.
		replaceIf,
		startOnHotbar: false,
		applicationDelay,
		potency: 420,
		falloff: 0.6,
		baseRecastTime: 2,
		combo: {
			resource: "REAWAKEN_COMBO",
			resourceValue: i + 1,
			potency: 680,
		},
		highlightIf: (state) => state.hasResourceExactly("REAWAKEN_COMBO", i + 1),
		onConfirm: (state) => {
			state.setLegacy(i + 1);
			state.consumeAnguine();
		},
	});
});

const legacies: Array<[VPRActionKey, number]> = [
	["FIRST_LEGACY", 1.289],
	["SECOND_LEGACY", 1.065],
	["THIRD_LEGACY", 1.19],
	["FOURTH_LEGACY", 1.065],
];
legacies.forEach(([name, applicationDelay]) => {
	makeVPRAbility(name, 100, "cd_SERPENTS_TAIL", {
		startOnHotbar: false,
		replaceIf: SERPENTS_TAIL_REPLACEMENTS,
		applicationDelay,
		cooldown: 1,
		potency: 320,
		falloff: 0.6,
		highlightIf: (state) => true,
		onConfirm: (state) => state.tryConsumeResource("LEGACY_READY", true),
	});
});
