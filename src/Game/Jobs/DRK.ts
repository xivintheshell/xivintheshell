// Skill and state declarations for DRK.

// TODO write tests for:
// darkside is applied properly
// unmend reduces shadowstride cd
// delirium combo gets broken appropriately

import { DRKStatusPropsGenerator } from "../../Components/Jobs/DRK";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { controller } from "../../Controller/Controller";
import { WarningType } from "../Common";
import { Modifiers } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	makeWeaponskill,
	MakeAbilityParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	Spell,
	StatePredicate,
	Weaponskill,
	MakeResourceAbilityParams,
	SkillAutoReplace,
	ResourceCalculationFn,
	CooldownGroupProperties,
} from "../Skills";
import { GameState } from "../GameState";
import { getResourceInfo, makeResource, Event, CoolDown, ResourceInfo } from "../Resources";
import { TraitKey } from "../Data";
import { DRKResourceKey, DRKActionKey, DRKCooldownKey } from "../Data/Jobs/DRK";

const makeDRKResource = (
	rsc: DRKResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("DRK", rsc, maxValue, params ?? {});
};

// Gauge resources
makeDRKResource("DARKSIDE", 1, { timeout: 60 });
makeDRKResource("BLOOD_GAUGE", 100);

// Buffs
makeDRKResource("SALTED_EARTH", 1, { timeout: 15 });
makeDRKResource("GRIT", 1);
makeDRKResource("SHADOW_WALL", 1, { timeout: 15 });
makeDRKResource("DARK_MIND", 1, { timeout: 10 });
makeDRKResource("LIVING_DEAD", 1, { timeout: 10 });
makeDRKResource("WALKING_DEAD", 1, { timeout: 10 });
// The timer of Undead Rebirth is whatever remains of Walking Dead's duration when
// the DRK has healed sufficiently.
// For the purposes of planning, we can assume that it always pops successfully since
// we don't support full HP planning.
makeDRKResource("UNDEAD_REBIRTH", 1);
makeDRKResource("DARK_MISSIONARY", 1, { timeout: 15 });
makeDRKResource("DELIRIUM", 3, { timeout: 15 });
makeDRKResource("BLOOD_WEAPON", 3, { timeout: 15 });
makeDRKResource("BLACKEST_NIGHT", 1, { timeout: 7 });
// Scorn allows the cast of Disesteem.
makeDRKResource("SCORN", 1, { timeout: 30 });
makeDRKResource("OBLATION", 1, { timeout: 10 });
makeDRKResource("SHADOWED_VIGIL", 1, { timeout: 15 });
// Excog effect of Shadowed Vigil.
makeDRKResource("VIGILANT", 1, { timeout: 20 });

makeDRKResource("DARK_ARTS", 1);

// Combo trackers
makeDRKResource("DRK_COMBO_TRACKER", 2, { timeout: 30 });
makeDRKResource("DRK_AOE_COMBO_TRACKER", 1, { timeout: 30 });
makeDRKResource("DRK_DELIRIUM_COMBO_TRACKER", 2, { timeout: 30 });
makeDRKResource("ESTEEM_TRACKER", 5);

export class DRKState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "SALTED_EARTH",
						appliedBy: ["SALTED_EARTH"],
						isGroundTargeted: true,
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<DRKState> {
		return new DRKStatusPropsGenerator(this);
	}

	refreshDarkside() {
		// TODO is this done on application or immediately?
		if (this.hasResourceAvailable("DARKSIDE")) {
			const resource = this.resources.get("DARKSIDE");
			const maxDuration = (getResourceInfo("DRK", "DARKSIDE") as ResourceInfo).maxTimeout;
			const newDuration = (resource.pendingChange?.timeTillEvent ?? 0.0) + 30;
			resource.overrideTimer(this, Math.min(maxDuration, newDuration));
		} else {
			this.resources.get("DARKSIDE").gain(1);
			this.enqueueResourceDrop("DARKSIDE", 30);
		}
	}

	gainBloodGauge(amt: number) {
		const rsc = this.resources.get("BLOOD_GAUGE");
		if (rsc.availableAmount() + amt > 100) {
			controller.reportWarning(WarningType.BloodGaugeOvercap);
		}
		rsc.gain(amt);
	}

	bloodWeaponConfirm(applicationDelay: number) {
		// Buff consumption and Blood Gauge gain occur instantly, but MP is restored after delay.
		if (this.hasResourceAvailable("BLOOD_WEAPON")) {
			this.tryConsumeResource("BLOOD_WEAPON");
			this.gainBloodGauge(10);
			this.addEvent(
				new Event("gain blood weapon mana", applicationDelay, () => {
					this.resources.get("MANA").gain(600);
				}),
			);
		}
	}

	// Advance the appropriate combo resources on skill confirmation.
	processComboStatus(skill: DRKActionKey) {
		if (["DISESTEEM", "UNMEND", "DELIRIUM", "QUIETUS"].includes(skill)) {
			// Unmend, Delirium/Quietus, and Disesteem do not affect combo state.
			return;
		}
		// [melee, aoe, delirium]
		let counters = [
			this.resources.get("DRK_COMBO_TRACKER").availableAmount(),
			this.resources.get("DRK_AOE_COMBO_TRACKER").availableAmount(),
			this.resources.get("DRK_DELIRIUM_COMBO_TRACKER").availableAmount(),
		];
		// Filler combo/AoE combo breaks Scarlet Delirium combo.
		// Scarlet Delirium combo actions preserve filler/AoE combo state.
		// AoE/single-target filler combos break each other.
		if (skill === "HARD_SLASH") {
			counters = [1, 0, 0];
		} else if (skill === "SYPHON_STRIKE") {
			// If the skill was not combo'd, then set the counter at 0.
			counters = [counters[0] === 1 ? 2 : 0, 0, 0];
		} else if (skill === "SOULEATER") {
			counters = [0, 0, 0];
		} else if (skill === "IMPALEMENT") {
			// Impalement (Quietus upgrade) breaks the Delirium combo if it is active, but preserves
			// filler/AoE combo state.
			counters[2] = 0;
		} else if (skill === "SCARLET_DELIRIUM") {
			counters[2] = 1;
		} else if (skill === "COMEUPPANCE") {
			// No need to check combo status (was already validated before skill usage).
			counters[2] = 2;
		} else if (skill === "TORCLEAVER") {
			counters[2] = 0;
		} else if (skill === "UNLEASH") {
			counters = [0, 1, 0];
		} else if (skill === "STALWART_SOUL") {
			counters = [0, 0, 0];
		} else {
			// Non-combo abilities should cancel all combos.
			counters = [0, 0, 0];
		}
		this.setComboState("DRK_COMBO_TRACKER", counters[0]);
		this.setComboState("DRK_AOE_COMBO_TRACKER", counters[1]);
		this.setComboState("DRK_DELIRIUM_COMBO_TRACKER", counters[2]);
	}
}

type DRKGCDParams = {
	autoUpgrade?: SkillAutoReplace;
	replaceIf?: ConditionalSkillReplace<DRKState>[];
	startOnHotbar?: boolean;
	potency: number | Array<[TraitKey, number]>;
	combo?: {
		potency: number | Array<[TraitKey, number]>;
		resource: DRKResourceKey;
		resourceValue: number;
	};
	falloff?: number;
	applicationDelay: number;
	validateAttempt?: StatePredicate<DRKState>;
	onConfirm?: EffectFn<DRKState>;
	highlightIf?: StatePredicate<DRKState>;
	onApplication?: EffectFn<DRKState>;
	secondaryCooldown?: CooldownGroupProperties;
};

const makeDRKWeaponskill = (
	name: DRKActionKey,
	unlockLevel: number,
	params: DRKGCDParams,
): Weaponskill<DRKState> => {
	return makeWeaponskill("DRK", name, unlockLevel, {
		...params,
		onConfirm: combineEffects(
			params.onConfirm ?? NO_EFFECT,
			(state) => state.bloodWeaponConfirm(params.applicationDelay),
			(state) => state.processComboStatus(name),
		),
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("DARKSIDE") ? [Modifiers.Darkside] : [],
	});
};

const makeDRKSpell = (
	name: DRKActionKey,
	unlockLevel: number,
	params: DRKGCDParams,
): Spell<DRKState> => {
	return makeSpell("DRK", name, unlockLevel, {
		...params,
		onConfirm: combineEffects(params.onConfirm ?? NO_EFFECT, (state) =>
			state.processComboStatus(name),
		),
		recastTime: (state) => state.config.adjustedGCD(), // sps
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("DARKSIDE") ? [Modifiers.Darkside] : [],
	});
};

const makeDRKAbility = (
	name: DRKActionKey,
	unlockLevel: number,
	cdName: DRKCooldownKey,
	params: Partial<MakeAbilityParams<DRKState>>,
): Ability<DRKState> => {
	return makeAbility("DRK", name, unlockLevel, cdName, {
		...params,
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("DARKSIDE") ? [Modifiers.Darkside] : [],
	});
};

const makeDRKResourceAbility = (
	name: DRKActionKey,
	unlockLevel: number,
	cdName: DRKCooldownKey,
	params: MakeResourceAbilityParams<DRKState>,
): Ability<DRKState> => {
	return makeResourceAbility("DRK", name, unlockLevel, cdName, params);
};

makeDRKSpell("UNMEND", 15, {
	applicationDelay: 0.98,
	potency: 150,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_UNMEND")) {
			// Reduce the cooldown of shadowstride by 5s
			let gapCloserElapsed = state.cooldowns
				.get("cd_SHADOWSTRIDE")
				.timeTillNextStackAvailable();
			state.cooldowns
				.get("cd_SHADOWSTRIDE")
				.overrideTimeTillNextStack(Math.max(0, gapCloserElapsed - 5));
		}
	},
});

makeDRKWeaponskill("HARD_SLASH", 1, {
	applicationDelay: 0.58,
	potency: [
		["NEVER", 150],
		["MELEE_MASTERY_TANK", 180],
		["MELEE_MASTERY_II_TANK", 300],
	],
});

makeDRKWeaponskill("SYPHON_STRIKE", 2, {
	applicationDelay: 0.62,
	highlightIf: (state) => state.hasResourceExactly("DRK_COMBO_TRACKER", 1),
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 120],
		["MELEE_MASTERY_II_TANK", 240],
	],
	combo: {
		potency: [
			["NEVER", 240],
			["MELEE_MASTERY_TANK", 260],
			["MELEE_MASTERY_II_TANK", 380],
		],
		resource: "DRK_COMBO_TRACKER",
		resourceValue: 1,
	},
	onConfirm: (state) => {
		// Enqueue an MP gain event at application time.
		// This must be checked on confirm to properly validate combo status.
		if (state.hasResourceExactly("DRK_COMBO_TRACKER", 1)) {
			state.addEvent(
				new Event("gain syphon strike mana", 0.62, () => {
					state.resources.get("MANA").gain(600);
				}),
			);
		}
	},
});

// Healing potency is conditional, which is annoying to encode.
// We'll take care of it someday.
makeDRKWeaponskill("SOULEATER", 26, {
	applicationDelay: 0.62,
	highlightIf: (state) => state.hasResourceExactly("DRK_COMBO_TRACKER", 2),
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 140],
		["MELEE_MASTERY_II_TANK", 260],
	],
	combo: {
		potency: [
			["NEVER", 320],
			["MELEE_MASTERY_TANK", 360],
			["MELEE_MASTERY_II_TANK", 480],
		],
		resource: "DRK_COMBO_TRACKER",
		resourceValue: 2,
	},
	onConfirm: (state) => state.gainBloodGauge(20),
});

makeDRKSpell("UNLEASH", 6, {
	applicationDelay: 0.71,
	potency: 120,
	falloff: 0,
});

makeDRKSpell("STALWART_SOUL", 40, {
	applicationDelay: 0.62, // not listed in spreadsheet, just roughly taken from logs
	highlightIf: (state) => state.hasResourceExactly("DRK_AOE_COMBO_TRACKER", 1),
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_II_TANK", 120],
	],
	combo: {
		potency: [
			["NEVER", 140],
			["MELEE_MASTERY_II_TANK", 160],
		],
		resource: "DRK_AOE_COMBO_TRACKER",
		resourceValue: 1,
	},
	falloff: 0,
	onConfirm: (state) => {
		// Enqueue an MP gain event at application time.
		// This must be checked on confirm to properly validate combo status.
		if (state.hasResourceExactly("DRK_AOE_COMBO_TRACKER", 1)) {
			state.gainBloodGauge(20);
			state.addEvent(
				new Event("gain stalwart soul mana", 0.62, () => {
					state.resources.get("MANA").gain(600);
				}),
			);
		}
	},
});

const edgeConfirm: EffectFn<DRKState> = (state) => {
	state.tryConsumeResource("DARK_ARTS");
	state.refreshDarkside();
};
const highlightIfTbn: StatePredicate<DRKState> = (state) => state.hasResourceAvailable("DARK_ARTS");
const edgeMPCost: ResourceCalculationFn<DRKState> = (state) =>
	state.hasResourceAvailable("DARK_ARTS") ? 0 : 3000;

makeDRKAbility("EDGE_OF_DARKNESS", 40, "cd_FLOOD_OF_DARKNESS", {
	applicationDelay: 0.62,
	autoUpgrade: { trait: "DAKRSIDE_MASTERY", otherSkill: "EDGE_OF_SHADOW" },
	cooldown: 1,
	manaCost: edgeMPCost,
	highlightIf: highlightIfTbn,
	potency: 300,
	onConfirm: edgeConfirm,
});

makeDRKAbility("EDGE_OF_SHADOW", 74, "cd_FLOOD_OF_DARKNESS", {
	applicationDelay: 0.62,
	autoDowngrade: { trait: "DAKRSIDE_MASTERY", otherSkill: "EDGE_OF_DARKNESS" },
	cooldown: 1,
	manaCost: edgeMPCost,
	highlightIf: highlightIfTbn,
	potency: 460,
	onConfirm: edgeConfirm,
});

makeDRKAbility("FLOOD_OF_DARKNESS", 30, "cd_FLOOD_OF_DARKNESS", {
	applicationDelay: 0.62,
	autoUpgrade: { trait: "DAKRSIDE_MASTERY", otherSkill: "FLOOD_OF_SHADOW" },
	cooldown: 1,
	manaCost: edgeMPCost,
	highlightIf: highlightIfTbn,
	potency: 100,
	falloff: 0,
	onConfirm: edgeConfirm,
});

makeDRKAbility("FLOOD_OF_SHADOW", 74, "cd_FLOOD_OF_DARKNESS", {
	applicationDelay: 0.62,
	autoDowngrade: { trait: "DAKRSIDE_MASTERY", otherSkill: "FLOOD_OF_DARKNESS" },
	cooldown: 1,
	manaCost: edgeMPCost,
	highlightIf: highlightIfTbn,
	potency: 160,
	falloff: 0,
	onConfirm: edgeConfirm,
});

const hasBloodOrDelirium: StatePredicate<DRKState> = (state) =>
	state.hasResourceAvailable("BLOOD_GAUGE", 50) || state.hasResourceAvailable("DELIRIUM");

const deliriumReplacements: ConditionalSkillReplace<DRKState>[] = [
	{
		newSkill: "BLOODSPILLER",
		condition: (state) =>
			!state.hasTraitUnlocked("ENHANCED_DELIRIUM") || !state.hasResourceAvailable("DELIRIUM"),
	},
	{
		newSkill: "SCARLET_DELIRIUM",
		condition: (state) =>
			state.hasTraitUnlocked("ENHANCED_DELIRIUM") &&
			state.hasResourceAvailable("DELIRIUM") &&
			state.hasResourceExactly("DRK_DELIRIUM_COMBO_TRACKER", 0),
	},
	{
		newSkill: "COMEUPPANCE",
		condition: (state) =>
			state.hasTraitUnlocked("ENHANCED_DELIRIUM") &&
			state.hasResourceAvailable("DELIRIUM") &&
			state.hasResourceExactly("DRK_DELIRIUM_COMBO_TRACKER", 1),
	},
	{
		newSkill: "TORCLEAVER",
		condition: (state) =>
			state.hasTraitUnlocked("ENHANCED_DELIRIUM") &&
			state.hasResourceAvailable("DELIRIUM") &&
			state.hasResourceExactly("DRK_DELIRIUM_COMBO_TRACKER", 2),
	},
];

makeDRKWeaponskill("BLOODSPILLER", 62, {
	applicationDelay: 0.8,
	validateAttempt: hasBloodOrDelirium,
	highlightIf: hasBloodOrDelirium,
	replaceIf: deliriumReplacements.filter((rep) => rep.newSkill !== "BLOODSPILLER"),
	potency: [
		["NEVER", 500],
		["MELEE_MASTERY_II_TANK", 600],
	],
	onConfirm: (state) =>
		state.tryConsumeResource("DELIRIUM") || state.resources.get("BLOOD_GAUGE").consume(50),
});

const impalementCondition: StatePredicate<DRKState> = (state) =>
	state.hasTraitUnlocked("ENHANCED_DELIRIUM") && state.hasResourceAvailable("DELIRIUM");
makeDRKWeaponskill("QUIETUS", 64, {
	applicationDelay: 0.76,
	validateAttempt: hasBloodOrDelirium,
	highlightIf: hasBloodOrDelirium,
	replaceIf: [
		{
			newSkill: "IMPALEMENT",
			condition: impalementCondition,
		},
	],
	potency: [
		["NEVER", 200],
		["MELEE_MASTERY_II_TANK", 240],
	],
	falloff: 0,
	onConfirm: (state) =>
		state.tryConsumeResource("DELIRIUM") || state.resources.get("BLOOD_GAUGE").consume(50),
});

(
	[
		["SCARLET_DELIRIUM", 0.62, 620],
		["COMEUPPANCE", 0.67, 720],
		["TORCLEAVER", 0.62, 820],
	] as Array<[DRKActionKey, number, number]>
).forEach((item, i) => {
	const [name, delay, potency] = item;
	makeDRKWeaponskill(name, 96, {
		startOnHotbar: false,
		applicationDelay: delay,
		validateAttempt: deliriumReplacements[i + 1].condition,
		highlightIf: deliriumReplacements[i + 1].condition,
		replaceIf: deliriumReplacements.filter((rep) => rep.newSkill !== name),
		potency,
		onConfirm: (state) => state.tryConsumeResource("DELIRIUM"),
	});
});

makeDRKWeaponskill("IMPALEMENT", 96, {
	startOnHotbar: false,
	applicationDelay: 0.98,
	validateAttempt: impalementCondition,
	highlightIf: impalementCondition,
	replaceIf: [
		{
			newSkill: "QUIETUS",
			condition: (state) => !impalementCondition(state),
		},
	],
	potency: 300,
	falloff: 0,
	onConfirm: (state) => state.tryConsumeResource("DELIRIUM"),
});

const hasScorn: StatePredicate<DRKState> = (state) => state.hasResourceAvailable("SCORN");
// TODO make living shadow echo
makeDRKWeaponskill("DISESTEEM", 100, {
	startOnHotbar: false,
	applicationDelay: 1.65,
	validateAttempt: hasScorn,
	highlightIf: hasScorn,
	potency: 1000,
	falloff: 0.25,
	onConfirm: (state) => state.tryConsumeResource("SCORN"),
});

makeDRKAbility("DELIRIUM", 68, "cd_DELIRIUM", {
	applicationDelay: 0,
	cooldown: 60,
	onConfirm: (state) => {
		state.gainStatus("DELIRIUM", 3);
		state.gainStatus("BLOOD_WEAPON", 3);
	},
});

makeDRKAbility("CARVE_AND_SPIT", 60, "cd_ABYSSAL_DRAIN", {
	applicationDelay: 1.47,
	cooldown: 60,
	potency: [
		["NEVER", 510],
		["MELEE_MASTERY_II_TANK", 540],
	],
	healingPotency: 500,
	onApplication: (state) => state.resources.get("MANA").gain(600),
});

makeDRKAbility("ABYSSAL_DRAIN", 56, "cd_ABYSSAL_DRAIN", {
	applicationDelay: 0.98,
	cooldown: 60,
	potency: 240,
	healingPotency: 500,
	onApplication: (state) => state.resources.get("MANA").gain(600),
});

makeDRKAbility("SALTED_EARTH", 52, "cd_SALTED_EARTH", {
	applicationDelay: 0.76,
	cooldown: 90,
	replaceIf: [
		{
			newSkill: "SALT_AND_DARKNESS",
			condition: (state) => state.hasResourceAvailable("SALTED_EARTH"),
		},
	],
	onConfirm: (state, node) => {
		state.gainStatus("SALTED_EARTH");
		state.addDoTPotencies({
			node,
			effectName: "SALTED_EARTH",
			skillName: "SALTED_EARTH",
			tickPotency: 50,
			speedStat: "sks",
		});
	},
	// TODO check if this applies properly to multiple targets
	potency: 0.00001,
	falloff: 0,
	onApplication: (state, node) => state.applyDoT("SALTED_EARTH", node),
});

makeDRKAbility("SALT_AND_DARKNESS", 86, "cd_SALT_AND_DARKNESS", {
	startOnHotbar: false,
	highlightIf: (state) => true,
	applicationDelay: 0.76,
	cooldown: 20,
	potency: 500,
	falloff: 0.25,
});

// TODO copy queen summon code
makeDRKAbility("LIVING_SHADOW", 80, "cd_LIVING_SHADOW", {
	applicationDelay: 0,
	onConfirm: (state) => state.gainStatus("SCORN"),
	replaceIf: [
		{
			newSkill: "DISESTEEM",
			condition: (state) => hasScorn(state),
		},
	],
	cooldown: 120,
});

makeDRKAbility("SHADOWBRINGER", 90, "cd_SHADOWBRINGER", {
	applicationDelay: 0.67,
	cooldown: 60,
	potency: 600,
	falloff: 0.25,
	maxCharges: 2,
	validateAttempt: (state) => state.hasResourceAvailable("DARKSIDE"),
	// TODO echo living shadow
});

makeDRKAbility("SHADOWSTRIDE", 54, "cd_SHADOWSTRIDE", {
	applicationDelay: 0.66,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	cooldown: 30,
	maxCharges: 2,
});

makeDRKResourceAbility("THE_BLACKEST_NIGHT", 70, "cd_THE_BLACKEST_NIGHT", {
	rscType: "BLACKEST_NIGHT",
	applicationDelay: 0.62,
	cooldown: 15,
});

makeDRKAbility("THE_BLACKEST_NIGHT_POP", 70, "cd_THE_BLACKEST_NIGHT_POP", {
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("DARK_ARTS")) {
			controller.reportWarning(WarningType.DarkArtsOvercap);
		}
		state.gainStatus("DARK_ARTS");
	},
});

makeDRKResourceAbility("SHADOW_WALL", 38, "cd_SHADOW_WALL", {
	rscType: "SHADOW_WALL",
	autoUpgrade: {
		otherSkill: "SHADOWED_VIGIL",
		trait: "SHADOW_WALL_MASTERY",
	},
	applicationDelay: 0.62,
	cooldown: 120,
});

makeDRKResourceAbility("SHADOWED_VIGIL", 92, "cd_SHADOW_WALL", {
	rscType: "SHADOWED_VIGIL",
	autoDowngrade: {
		otherSkill: "SHADOW_WALL",
		trait: "SHADOW_WALL_MASTERY",
	},
	applicationDelay: 0.62,
	cooldown: 120,
	onApplication: (state) => state.gainStatus("VIGILANT"),
});

makeDRKResourceAbility("DARK_MIND", 45, "cd_DARK_MIND", {
	rscType: "DARK_MIND",
	applicationDelay: 0.62,
	cooldown: 60,
});

makeDRKResourceAbility("LIVING_DEAD", 50, "cd_LIVING_DEAD", {
	rscType: "LIVING_DEAD",
	applicationDelay: 0,
	cooldown: 300,
});

makeDRKResourceAbility("DARK_MISSIONARY", 66, "cd_DARK_MISSIONARY", {
	rscType: "DARK_MISSIONARY",
	applicationDelay: 0.62,
	cooldown: 90,
});

makeDRKResourceAbility("OBLATION", 82, "cd_OBLATION", {
	rscType: "OBLATION",
	applicationDelay: 0,
	maxCharges: 2,
	cooldown: 60,
});

makeDRKAbility("GRIT", 10, "cd_GRIT", {
	applicationDelay: 0,
	cooldown: 2,
	validateAttempt: (state) => !state.hasResourceAvailable("GRIT"),
	onConfirm: (state) => state.resources.get("GRIT").gain(1),
	replaceIf: [
		{
			newSkill: "RELEASE_GRIT",
			condition: (state) => state.hasResourceAvailable("GRIT"),
		},
	],
	secondaryCooldown: {
		cdName: "cd_RELEASE_GRIT",
		cooldown: 1,
		maxCharges: 1,
	},
});

makeDRKAbility("RELEASE_GRIT", 10, "cd_RELEASE_GRIT", {
	startOnHotbar: false,
	replaceIf: [
		{
			newSkill: "GRIT",
			condition: (state) => !state.hasResourceAvailable("GRIT"),
		},
	],
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => !state.hasResourceAvailable("GRIT"),
	onConfirm: (state) => state.tryConsumeResource("GRIT"),
	secondaryCooldown: {
		cdName: "cd_GRIT",
		cooldown: 2,
		maxCharges: 1,
	},
});
