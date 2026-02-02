import { RPRStatusPropsGenerator } from "../../Components/Jobs/RPR";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { Aspect, BuffType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { RPRResourceKey, RPRActionKey, RPRCooldownKey } from "../Data/Jobs/RPR";
import { CommonActionKey } from "../Data/Shared/Common";
import { RoleActionKey } from "../Data/Shared/Role";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, makeResource } from "../Resources";
import {
	Ability,
	combineEffects,
	combinePredicatesAnd,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	getSkill,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	ResourceCalculationFn,
	Skill,
	Spell,
	StatePredicate,
	Weaponskill,
} from "../Skills";

function makeRPRResource(
	type: RPRResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) {
	makeResource("RPR", type, maxValue, params ?? {});
}

makeRPRResource("SOUL", 100);
makeRPRResource("SHROUD", 100);

makeRPRResource("DEATHS_DESIGN", 1, {});
makeRPRResource("SOUL_REAVER", 2, { timeout: 30 });
makeRPRResource("ENHANCED_GIBBET", 1, { timeout: 60 });
makeRPRResource("ENHANCED_GALLOWS", 1, { timeout: 60 });
makeRPRResource("EXECUTIONER", 2, { timeout: 30 });

makeRPRResource("ENSHROUDED", 1, { timeout: 30 });
makeRPRResource("LEMURE_SHROUD", 5, { timeout: 30 });
/* Not giving timeout for this because it needs to be zeroe-ed out when enshroud ends anyway
 * And I don't want the timeout to hide logic errors with that */
makeRPRResource("VOID_SHROUD", 5); // Impossible for it to last 30s, but 30s is an upper bound
makeRPRResource("OBLATIO", 1, { timeout: 30 });
makeRPRResource("ENHANCED_VOID_REAPING", 1, { timeout: 30 });
makeRPRResource("ENHANCED_CROSS_REAPING", 1, { timeout: 30 });

makeRPRResource("IDEAL_HOST", 1, { timeout: 30 });
makeRPRResource("PERFECTIO_OCCULTA", 1, { timeout: 30 });
makeRPRResource("PERFECTIO_PARATA", 1, { timeout: 30 });

makeRPRResource("ARCANE_CIRCLE", 1, { timeout: 20 }); // 20.00s exactly
makeRPRResource("CIRCLE_OF_SACRIFICE", 1, { timeout: 5 });
makeRPRResource("BLOODSOWN_CIRCLE", 1, { timeout: 6 });
makeRPRResource("IMMORTAL_SACRIFICE", 8, { timeout: 30 });

makeRPRResource("ARCANE_CREST", 1, { timeout: 5 });
makeRPRResource("CREST_OF_TIME_BORROWED", 1, { timeout: 5 });
makeRPRResource("CREST_OF_TIME_RETURNED", 1, { timeout: 15 });

makeRPRResource("SOULSOW", 1, { default: 1 });
makeRPRResource("THRESHOLD", 1, { timeout: 10 });
makeRPRResource("ENHANCED_HARPE", 1, { timeout: 10 });

// If 1, the last dash used was Ingress; if 0, the last dash was egress
// This determines which button is given the Regress replacement
makeRPRResource("HELLS_INGRESS_USED", 1);

makeRPRResource("RPR_COMBO", 2, { timeout: 30 });
makeRPRResource("RPR_AOE_COMBO", 1, { timeout: 30 });

export class RPRState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const soulSliceStacks = this.hasTraitUnlocked("TEMPERED_SOUL") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_SOUL_SLICE", 30, soulSliceStacks, soulSliceStacks));

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<RPRState> {
		return new RPRStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("ARCANE_CIRCLE")) {
			node.addBuff(BuffType.ArcaneCircle);
		}

		if (
			node.targetList.some((targetNumber) =>
				this.hasDebuffActive("DEATHS_DESIGN", targetNumber),
			)
		) {
			node.addBuff(BuffType.DeathsDesign);
		}
	}

	refreshDeathsDesign(targetNumber: number) {
		const dd = this.debuffs.get("DEATHS_DESIGN", targetNumber);

		const newTime = Math.min(
			this.debuffs.timeTillExpiry("DEATHS_DESIGN", targetNumber) + 30,
			60,
		);
		if (dd.available(1)) {
			dd.overrideTimer(this, newTime);
			return;
		}

		dd.gain(1);
		this.debuffs.addDebuffEvent({
			rscType: "DEATHS_DESIGN",
			name: "drop Death's Design on target " + targetNumber,
			targetNumber,
			delay: newTime,
			fnOnRsc: (rsc) => {
				rsc.consume(1);
			},
		});
	}

	setTimedResource(rscType: RPRResourceKey, amount: number) {
		this.tryConsumeResource(rscType);
		this.resources.get(rscType).gain(amount);
		this.enqueueResourceDrop(rscType);
	}

	processCombo(skill: RPRActionKey) {
		const currCombo = this.resources.get("RPR_COMBO").availableAmount();
		const currAoeCombo = this.resources.get("RPR_AOE_COMBO").availableAmount();

		const [newCombo, newAoeCombo] = new Map<RPRActionKey, [number, number]>([
			["SLICE", [1, 0]],
			["WAXING_SLICE", [currCombo === 1 ? 2 : 0, 0]],
			["INFERNAL_SLICE", [0, 0]],
			["SPINNING_SCYTHE", [0, 1]],
			["NIGHTMARE_SCYTHE", [0, 0]],
		]).get(skill) ?? [currCombo, currAoeCombo]; // Any other gcd leaves combo unchanged

		if (newCombo !== currCombo) this.setComboState("RPR_COMBO", newCombo);
		if (newAoeCombo !== currAoeCombo) this.setComboState("RPR_AOE_COMBO", newAoeCombo);
	}

	processSoulGauge(skill: RPRActionKey) {
		const soul = this.resources.get("SOUL");
		if (
			(
				[
					"SLICE",
					"WAXING_SLICE",
					"INFERNAL_SLICE",
					"SPINNING_SCYTHE",
					"NIGHTMARE_SCYTHE",
					"HARPE",
					"HARVEST_MOON",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soul.gain(10);
			return;
		}

		if ((["SOUL_SLICE", "SOUL_SCYTHE"] as RPRActionKey[]).includes(skill)) {
			soul.gain(50);
			return;
		}

		if (
			(
				[
					"BLOOD_STALK",
					"UNVEILED_GALLOWS",
					"UNVEILED_GIBBET",
					"GRIM_SWATHE",
					"GLUTTONY",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soul.consume(50);
			return;
		}
	}

	processShroudGauge(skill: RPRActionKey) {
		const shroud = this.resources.get("SHROUD");

		if (
			(
				[
					"GALLOWS",
					"GIBBET",
					"EXECUTIONERS_GALLOWS",
					"EXECUTIONERS_GIBBET",
					"GUILLOTINE",
					"EXECUTIONERS_GUILLOTINE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			shroud.gain(10);
			return;
		}

		if (skill === "ENSHROUD" && !this.resources.get("IDEAL_HOST").available(1)) {
			shroud.consume(50);
		}
	}

	processReaversExecutioner(skill: RPRActionKey) {
		const reavers = this.resources.get("SOUL_REAVER");
		const executioners = this.resources.get("EXECUTIONER");

		// Gibbet, Gallows, Guillotine
		if ((["GIBBET", "GALLOWS", "GUILLOTINE"] as RPRActionKey[]).includes(skill)) {
			reavers.consume(1);
			return;
		}

		if (
			(
				[
					"EXECUTIONERS_GIBBET",
					"EXECUTIONERS_GALLOWS",
					"EXECUTIONERS_GUILLOTINE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			executioners.consume(1);
			return;
		}

		// Any other action resets Soul reavers, even if it then gives more
		if (this.skillsList.get(skill).cdName === "cd_GCD") {
			reavers.consume(reavers.availableAmount());
			executioners.consume(executioners.availableAmount());
		}

		// Unveiled actions
		if (
			(
				[
					"BLOOD_STALK",
					"UNVEILED_GALLOWS",
					"UNVEILED_GIBBET",
					"GRIM_SWATHE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			reavers.consume(reavers.availableAmount());
			executioners.consume(executioners.availableAmount());
			this.setTimedResource("SOUL_REAVER", 1);
			return;
		}

		// Pre-96 gluttony
		if (skill === "GLUTTONY") {
			reavers.consume(reavers.availableAmount());
			executioners.consume(executioners.availableAmount());
			if (this.hasTraitUnlocked("ENHANCED_GLUTTONY")) {
				this.setTimedResource("EXECUTIONER", 2);
				return;
			}

			this.setTimedResource("SOUL_REAVER", 2);
			return;
		}
	}

	processGibbetGallows(skill: RPRActionKey) {
		const soulReavers = this.resources.get("SOUL_REAVER");
		const executioners = this.resources.get("EXECUTIONER");

		if (
			!(
				[
					"GIBBET",
					"GALLOWS",
					"EXECUTIONERS_GIBBET",
					"EXECUTIONERS_GALLOWS",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soulReavers.consume(soulReavers.availableAmount());
			executioners.consume(executioners.availableAmount());
		}
		const matchingBuffs = new Map<RPRActionKey, RPRResourceKey>([
			["GIBBET", "ENHANCED_GIBBET"],
			["EXECUTIONERS_GIBBET", "ENHANCED_GIBBET"],
			["GALLOWS", "ENHANCED_GALLOWS"],
			["EXECUTIONERS_GALLOWS", "ENHANCED_GALLOWS"],
		]);
		const otherBuffs = new Map<ActionKey, RPRResourceKey>([
			["GIBBET", "ENHANCED_GALLOWS"],
			["EXECUTIONERS_GIBBET", "ENHANCED_GALLOWS"],
			["GALLOWS", "ENHANCED_GIBBET"],
			["EXECUTIONERS_GALLOWS", "ENHANCED_GIBBET"],
		]);

		//Already verified that map lookup will be successful.
		const matchingBuff = this.resources.get(matchingBuffs.get(skill) as RPRResourceKey);
		const otherBuff = this.resources.get(otherBuffs.get(skill) as RPRResourceKey);

		matchingBuff.consume(matchingBuff.availableAmount());
		otherBuff.consume(otherBuff.availableAmount());
		otherBuff.gain(1);
	}

	processCircleOfSacrifice(skill: RPRActionKey) {
		if (!this.hasResourceAvailable("CIRCLE_OF_SACRIFICE")) {
			return;
		}
		const skillInfo = getSkill("RPR", skill);
		if (skillInfo.potencyFn(this) > 0) {
			const immortalSac = this.resources.get("IMMORTAL_SACRIFICE");
			if (immortalSac.availableAmount() === 0) {
				this.setTimedResource("IMMORTAL_SACRIFICE", 1);
			} else {
				this.resources.get("IMMORTAL_SACRIFICE").gain(1);
			}
			this.tryConsumeResource("CIRCLE_OF_SACRIFICE", true);
		}
	}

	enterEnshroud() {
		if (this.hasResourceAvailable("IDEAL_HOST")) this.resources.get("IDEAL_HOST").consume(1);
		if (this.hasTraitUnlocked("ENHANCED_ENSHROUD")) this.setTimedResource("OBLATIO", 1);
		this.setTimedResource("LEMURE_SHROUD", 5);
		this.tryConsumeResource("PERFECTIO_PARATA", true);
	}

	exitEnshroud() {
		this.tryConsumeResource("ENSHROUDED");
		this.tryConsumeResource("OBLATIO");
		this.tryConsumeResource("LEMURE_SHROUD");
		this.tryConsumeResource("VOID_SHROUD");
		this.tryConsumeResource("ENHANCED_CROSS_REAPING");
		this.tryConsumeResource("ENHANCED_VOID_REAPING");
	}
}

const enshroudSkills = new Set<RPRActionKey | RoleActionKey | CommonActionKey>([
	"SHADOW_OF_DEATH",
	"WHORL_OF_DEATH",

	"HARVEST_MOON",
	"HARPE",
	"SOULSOW",

	"VOID_REAPING",
	"CROSS_REAPING",
	"GRIM_REAPING",
	"LEMURES_SLICE",
	"LEMURES_SCYTHE",
	"SACRIFICIUM",
	"COMMUNIO",

	"ARCANE_CIRCLE",
	"HELLS_EGRESS",
	"HELLS_INGRESS",
	"REGRESS",
	"ARCANE_CREST",

	"FEINT",
	"LEG_SWEEP",
	"BLOODBATH",
	"TRUE_NORTH",
	"ARMS_LENGTH",
	"SECOND_WIND",
	"SPRINT",
	"TINCTURE",
]);

const gibgalHighlightPredicate: (
	enhancedRsc: RPRResourceKey,
	skill: RPRActionKey,
) => StatePredicate<RPRState> = (enhancedRsc, skill) => (state: Readonly<RPRState>) => {
	const resource = (["GIBBET", "GALLOWS", "GUILLOTINE"] as RPRActionKey[]).includes(skill)
		? state.resources.get("SOUL_REAVER")
		: state.resources.get("EXECUTIONER");

	return (
		state.resources.get(enhancedRsc).available(1) ||
		(resource.available(1) &&
			!state.hasResourceAvailable("ENHANCED_GIBBET") &&
			!state.hasResourceAvailable("ENHANCED_GALLOWS"))
	);
};

const reaverPredicate: StatePredicate<RPRState> = (state) =>
	state.hasResourceAvailable("SOUL_REAVER");
const executionerPredicate: StatePredicate<RPRState> = (state) =>
	state.hasResourceAvailable("EXECUTIONER");

const soulSpendPredicate: (cost: number) => StatePredicate<RPRState> = (cost) => (state) =>
	state.resources.get("SOUL").availableAmount() >= cost;
const isEnshroudSkill = (skill: RPRActionKey) => enshroudSkills.has(skill);

const baseOnConfirm = (name: RPRActionKey): EffectFn<RPRState> => {
	return combineEffects(
		(state) => state.processCombo(name),
		(state) => state.processSoulGauge(name),
		(state) => state.processShroudGauge(name),
		(state) => state.processReaversExecutioner(name),
		(state) => state.processCircleOfSacrifice(name),
	);
};

const basePotencyModifiers = (state: Readonly<RPRState>): PotencyModifier[] => {
	const mods: PotencyModifier[] = [];

	if (state.hasResourceAvailable("ARCANE_CIRCLE")) {
		mods.push(Modifiers.ArcaneCircle);
	}

	if (state.debuffs.hasAnyActive("DEATHS_DESIGN")) {
		mods.push(Modifiers.DeathsDesign);
	}

	return mods;
};

const makeRPRSpell = (
	name: RPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		secondaryCooldown?: CooldownGroupProperties;
		aspect: Aspect;
		castTime: number | ResourceCalculationFn<RPRState>;
		recastTime: number;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		highlightIf?: StatePredicate<RPRState>;
		onApplication?: EffectFn<RPRState>;
	},
): Spell<RPRState> => {
	const onConfirm: EffectFn<RPRState> = combineEffects(baseOnConfirm(name), params.onConfirm);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) => !state.resources.get("ENSHROUDED").available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);

	return makeSpell("RPR", name, unlockLevel, {
		...params,
		recastTime: (state) => state.config.adjustedGCD(params.recastTime),
		onConfirm,
		validateAttempt,
		isInstantFn: (state) =>
			!(
				name === "COMMUNIO" ||
				(name === "HARPE" && !state.hasResourceAvailable("ENHANCED_HARPE")) ||
				(name === "SOULSOW" && state.isInCombat())
			),
		jobPotencyModifiers: basePotencyModifiers,
	});
};

const makeRPRWeaponskill = (
	name: RPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: RPRResourceKey;
			resourceValue: number;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		secondaryCooldown?: CooldownGroupProperties;
		aspect: Aspect;
		recastTime: number | ResourceCalculationFn<RPRState>;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		highlightIf?: StatePredicate<RPRState>;
	},
): Weaponskill<RPRState> => {
	const onConfirm: EffectFn<RPRState> = combineEffects(baseOnConfirm(name), params.onConfirm);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) => !state.resources.get("ENSHROUDED").available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);
	return makeWeaponskill("RPR", name, unlockLevel, {
		...params,
		onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = basePotencyModifiers(state);
			if (
				["GIBBET", "EXECUTIONERS_GIBBET"].includes(name) &&
				state.hasResourceAvailable("ENHANCED_GIBBET")
			) {
				mods.push(Modifiers.EnhancedGibbetGallows);
			}

			if (
				["GALLOWS", "EXECUTIONERS_GALLOWS"].includes(name) &&
				state.hasResourceAvailable("ENHANCED_GALLOWS")
			) {
				mods.push(Modifiers.EnhancedGibbetGallows);
			}

			if (name === "VOID_REAPING" && state.hasResourceAvailable("ENHANCED_VOID_REAPING")) {
				mods.push(Modifiers.EnhancedReaping);
			}

			if (name === "CROSS_REAPING" && state.hasResourceAvailable("ENHANCED_CROSS_REAPING")) {
				mods.push(Modifiers.EnhancedReaping);
			}

			if (name === "PLENTIFUL_HARVEST" && state.hasResourceAvailable("IMMORTAL_SACRIFICE")) {
				for (
					let i = 0;
					i < state.resources.get("IMMORTAL_SACRIFICE").availableAmount();
					i++
				) {
					mods.push(Modifiers.ImmortalSacrifice);
				}
			}

			return mods;
		},
		validateAttempt,
	});
};

const makeRPRAbility = (
	name: RPRActionKey,
	unlockLevel: number,
	cdName: RPRCooldownKey,
	params: {
		isPhysical?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		highlightIf?: StatePredicate<RPRState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		onApplication?: EffectFn<RPRState>;
	},
): Ability<RPRState> => {
	const onConfirm = combineEffects(baseOnConfirm(name), params.onConfirm);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) => !state.resources.get("ENSHROUDED").available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);

	return makeAbility("RPR", name, unlockLevel, cdName, {
		...params,
		onConfirm,
		validateAttempt,
		jobPotencyModifiers: basePotencyModifiers,
	});
};

makeRPRWeaponskill("SHADOW_OF_DEATH", 10, {
	potency: 300,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 1.15,
	onConfirm: (state, node) => state.refreshDeathsDesign(node.targetList[0]),
});

makeRPRWeaponskill("SLICE", 1, {
	potency: [
		["NEVER", 260],
		["MELEE_MASTERY_II_RPR", 320],
		["MELEE_MASTERY_III_RPR", 420],
	],
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.49,
});

makeRPRWeaponskill("WAXING_SLICE", 5, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_II_RPR", 160],
		["MELEE_MASTERY_III_RPR", 260],
	],
	combo: {
		potency: [
			["NEVER", 340],
			["MELEE_MASTERY_II_RPR", 400],
			["MELEE_MASTERY_III_RPR", 500],
		],
		resource: "RPR_COMBO",
		resourceValue: 1,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.58,
	highlightIf: (state) => state.hasResourceExactly("RPR_COMBO", 1),
});

makeRPRWeaponskill("INFERNAL_SLICE", 30, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_II_RPR", 180],
		["MELEE_MASTERY_III_RPR", 280],
	],
	combo: {
		potency: [
			["NEVER", 420],
			["MELEE_MASTERY_II_RPR", 500],
			["MELEE_MASTERY_III_RPR", 600],
		],
		resource: "RPR_COMBO",
		resourceValue: 2,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.54,
	highlightIf: (state) => state.hasResourceExactly("RPR_COMBO", 2),
});

makeRPRWeaponskill("SOUL_SLICE", 60, {
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 520],
	],
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.99,
	secondaryCooldown: {
		cdName: "cd_SOUL_SLICE",
		cooldown: 30,
		maxCharges: 2,
	},
});

makeRPRWeaponskill("GIBBET", 70, {
	replaceIf: [
		{
			newSkill: "VOID_REAPING",
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
		},
		{
			newSkill: "EXECUTIONERS_GIBBET",
			condition: (state) => state.hasResourceAvailable("EXECUTIONER"),
		},
	],
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	positional: {
		potency: [
			["NEVER", 520],
			["MELEE_MASTERY_III_RPR", 560],
		],
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.5,
	highlightIf: gibgalHighlightPredicate("ENHANCED_GIBBET", "GIBBET"),
	validateAttempt: reaverPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_GIBBET");
		state.setTimedResource("ENHANCED_GALLOWS", 1);
	},
});

makeRPRWeaponskill("GALLOWS", 70, {
	replaceIf: [
		{
			newSkill: "CROSS_REAPING",
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
		},
		{
			newSkill: "EXECUTIONERS_GALLOWS",
			condition: (state) => state.resources.get("EXECUTIONER").available(1),
		},
	],
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	positional: {
		potency: [
			["NEVER", 520],
			["MELEE_MASTERY_III_RPR", 560],
		],
		location: "rear",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.53,
	highlightIf: gibgalHighlightPredicate("ENHANCED_GALLOWS", "GALLOWS"),
	validateAttempt: reaverPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_GALLOWS");
		state.setTimedResource("ENHANCED_GIBBET", 1);
	},
});

makeRPRWeaponskill("EXECUTIONERS_GIBBET", 96, {
	startOnHotbar: false,
	potency: 700,
	positional: {
		potency: 760,
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.62,
	highlightIf: gibgalHighlightPredicate("ENHANCED_GIBBET", "EXECUTIONERS_GIBBET"),
	validateAttempt: executionerPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_GIBBET");
		state.setTimedResource("ENHANCED_GALLOWS", 1);
	},
});

makeRPRWeaponskill("EXECUTIONERS_GALLOWS", 96, {
	startOnHotbar: false,
	potency: 700,
	positional: {
		potency: 760,
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.62,
	highlightIf: gibgalHighlightPredicate("ENHANCED_GALLOWS", "EXECUTIONERS_GALLOWS"),
	validateAttempt: executionerPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_GALLOWS");
		state.setTimedResource("ENHANCED_GIBBET", 1);
	},
});

makeRPRWeaponskill("PLENTIFUL_HARVEST", 88, {
	potency: 720,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.2,
	applicationDelay: 1.16,
	highlightIf: (state) => state.hasResourceAvailable("IMMORTAL_SACRIFICE", 1),
	validateAttempt: (state) =>
		state.hasResourceAvailable("IMMORTAL_SACRIFICE", 1) &&
		!state.hasResourceAvailable("BLOODSOWN_CIRCLE"),
	onConfirm: (state) => {
		state.tryConsumeResource("IMMORTAL_SACRIFICE", true);
		state.setTimedResource("IDEAL_HOST", 1);
		if (state.hasTraitUnlocked("ENHANCED_PLENTIFUL_HARVEST")) {
			state.setTimedResource("PERFECTIO_OCCULTA", 1);
		}
	},
});

makeRPRSpell("COMMUNIO", 90, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("PERFECTIO_PARATA"),
			newSkill: "PERFECTIO",
		},
	],
	potency: 1100,
	aspect: Aspect.Other,
	castTime: 1.3,
	recastTime: 2.5,
	falloff: 0.2,
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable("ENSHROUDED"),
	highlightIf: (state) =>
		state.hasResourceAvailable("ENSHROUDED") &&
		state.resources.get("LEMURE_SHROUD").availableAmount() === 1,
	onConfirm: (state) => {
		if (
			state.tryConsumeResource("PERFECTIO_OCCULTA") &&
			state.hasTraitUnlocked("ENHANCED_PLENTIFUL_HARVEST")
		) {
			state.setTimedResource("PERFECTIO_PARATA", 1);
		}
		state.exitEnshroud();
		state.tryConsumeResource("ENHANCED_CROSS_REAPING");
		state.tryConsumeResource("ENHANCED_VOID_REAPING");
	},
});

makeRPRSpell("HARPE", 15, {
	potency: 300,
	aspect: Aspect.Other,
	castTime: 1.3,
	recastTime: 2.5,
	applicationDelay: 0.9,
	highlightIf: (state) => state.hasResourceAvailable("ENHANCED_HARPE"),
	onConfirm: (state) => state.tryConsumeResource("ENHANCED_HARPE"),
});

makeRPRSpell("SOULSOW", 82, {
	potency: 0,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("SOULSOW"),
			newSkill: "HARVEST_MOON",
		},
	],
	startOnHotbar: true,
	aspect: Aspect.Other,
	castTime: 5,
	recastTime: 2.5,
	applicationDelay: 0,
	onConfirm: (state) => state.resources.get("SOULSOW").gain(1),
});

makeRPRSpell("HARVEST_MOON", 82, {
	potency: [
		["NEVER", 600],
		["MELEE_MASTERY_III_RPR", 800],
	],
	startOnHotbar: false,
	aspect: Aspect.Other,
	castTime: 0,
	recastTime: 2.5,
	falloff: 0.4,
	applicationDelay: 0.9,
	validateAttempt: (state) => state.hasResourceAvailable("SOULSOW"),
	highlightIf: (state) => state.hasResourceAvailable("SOULSOW"),
	onConfirm: (state) => state.resources.get("SOULSOW").consume(1),
});

makeRPRAbility("GLUTTONY", 76, "cd_GLUTTONY", {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
			newSkill: "SACRIFICIUM",
		},
	],
	isPhysical: false,
	potency: 520,
	startOnHotbar: true,
	falloff: 0.25,
	applicationDelay: 1.06,
	cooldown: 60,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("BLOOD_STALK", 50, "cd_BLOOD_STALK", {
	replaceIf: [
		{
			newSkill: "LEMURES_SLICE",
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
		},
		{
			newSkill: "UNVEILED_GIBBET",
			condition: (state) => state.hasResourceAvailable("ENHANCED_GIBBET"),
		},
		{
			newSkill: "UNVEILED_GALLOWS",
			condition: (state) => state.hasResourceAvailable("ENHANCED_GALLOWS"),
		},
	],
	isPhysical: true,
	potency: 340,
	startOnHotbar: true,
	applicationDelay: 0.89,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("GRIM_SWATHE", 55, "cd_BLOOD_STALK", {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
			newSkill: "LEMURES_SCYTHE",
		},
	],
	isPhysical: true,
	potency: 140,
	startOnHotbar: true,
	falloff: 0,
	applicationDelay: 0.58,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("UNVEILED_GIBBET", 70, "cd_BLOOD_STALK", {
	isPhysical: true,
	potency: 440,
	startOnHotbar: false,
	applicationDelay: 0.54,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("UNVEILED_GALLOWS", 70, "cd_BLOOD_STALK", {
	isPhysical: true,
	potency: 440,
	startOnHotbar: false,
	applicationDelay: 0.54,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("LEMURES_SLICE", 86, "cd_LEMURES_SLICE", {
	isPhysical: true,
	potency: [
		["NEVER", 240],
		["MELEE_MASTERY_III_RPR", 280],
	],
	startOnHotbar: false,
	applicationDelay: 0.7,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("VOID_SHROUD", 2),
	highlightIf: (state) => state.hasResourceAvailable("VOID_SHROUD", 2),
	onConfirm: (state) => {
		state.resources.get("VOID_SHROUD").consume(2);
	},
});

makeRPRAbility("SACRIFICIUM", 92, "cd_SACRIFICIUM", {
	isPhysical: false,
	potency: 600,
	startOnHotbar: false,
	falloff: 0.2,
	applicationDelay: 0.76,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("OBLATIO"),
	highlightIf: (state) => state.hasResourceAvailable("OBLATIO"),
	onConfirm: (state) => state.tryConsumeResource("OBLATIO"),
});

makeResourceAbility("RPR", "ARCANE_CIRCLE", 72, "cd_ARCANE_CIRCLE", {
	rscType: "ARCANE_CIRCLE",
	applicationDelay: 0.6,
	startOnHotbar: true,
	maxCharges: 1,
	potency: 0,
	onApplication: (state: RPRState) => {
		if (state.hasTraitUnlocked("ENHANCED_ARCANE_CIRCLE")) {
			state.setTimedResource("CIRCLE_OF_SACRIFICE", 1);
			state.setTimedResource("BLOODSOWN_CIRCLE", 1);
		}
	},
	cooldown: 120,
});

makeRPRWeaponskill("VOID_REAPING", 80, {
	startOnHotbar: false,
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 540],
	],
	aspect: Aspect.Physical,
	recastTime: 1.5,
	applicationDelay: 0.53,
	highlightIf: (state) =>
		state.resources.get("LEMURE_SHROUD").availableAmount() > 1 &&
		!state.hasResourceAvailable("ENHANCED_CROSS_REAPING"),
	validateAttempt: (state) => state.hasResourceAvailable("LEMURE_SHROUD"),
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_VOID_REAPING");
		state.setTimedResource("ENHANCED_CROSS_REAPING", 1);
		state.resources.get("LEMURE_SHROUD").consume(1);
		state.resources.get("VOID_SHROUD").gain(1);

		if (state.resources.get("LEMURE_SHROUD").availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
});

makeRPRWeaponskill("CROSS_REAPING", 80, {
	startOnHotbar: false,
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 540],
	],
	aspect: Aspect.Physical,
	recastTime: 1.5,
	applicationDelay: 0.53,
	highlightIf: (state) =>
		state.resources.get("LEMURE_SHROUD").availableAmount() > 1 &&
		!state.hasResourceAvailable("ENHANCED_VOID_REAPING"),
	validateAttempt: (state) => state.hasResourceAvailable("LEMURE_SHROUD"),
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_CROSS_REAPING");
		state.setTimedResource("ENHANCED_VOID_REAPING", 1);
		state.resources.get("LEMURE_SHROUD").consume(1);
		state.resources.get("VOID_SHROUD").gain(1);

		if (state.resources.get("LEMURE_SHROUD").availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
});

makeResourceAbility("RPR", "ENSHROUD", 80, "cd_ENSHROUD", {
	rscType: "ENSHROUDED",
	highlightIf: (state) => {
		return state.hasResourceAvailable("SHROUD", 50) || state.hasResourceAvailable("IDEAL_HOST");
	},
	applicationDelay: 0,
	startOnHotbar: true,
	cooldown: 5,
	validateAttempt: (state) => {
		return state.hasResourceAvailable("SHROUD", 50) || state.hasResourceAvailable("IDEAL_HOST");
	},
	onConfirm: combineEffects(baseOnConfirm("ENSHROUD"), (state) =>
		state.enterEnshroud(),
	) as EffectFn<RPRState>,
});

makeRPRWeaponskill("PERFECTIO", 100, {
	potency: 1300,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.2,
	applicationDelay: 1.29,
	startOnHotbar: false,
	highlightIf: (state) => state.hasResourceAvailable("PERFECTIO_PARATA"),
	validateAttempt: (state) => state.hasResourceAvailable("PERFECTIO_PARATA"),
	onConfirm: (state) => {
		state.resources.get("PERFECTIO_PARATA").consume(1);
	},
});

makeRPRAbility("REGRESS", 74, "cd_BLOOD_STALK", {
	cooldown: 1,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	startOnHotbar: false,
	highlightIf: (_state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("THRESHOLD"),
	onConfirm: (state) => state.resources.get("THRESHOLD").consume(1),
});

makeRPRAbility("HELLS_INGRESS", 20, "cd_INGRESS_EGRESS", {
	replaceIf: [
		{
			condition: (state) =>
				state.hasResourceAvailable("THRESHOLD") &&
				state.hasResourceAvailable("HELLS_INGRESS_USED"),
			newSkill: "REGRESS",
		},
	],
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	onConfirm: (state) => {
		state.resources.get("HELLS_INGRESS_USED").gain(1);
		if (state.hasTraitUnlocked("HELLSGATE")) state.setTimedResource("THRESHOLD", 1);
		state.setTimedResource("ENHANCED_HARPE", 1);
	},
});

makeRPRAbility("HELLS_EGRESS", 20, "cd_INGRESS_EGRESS", {
	replaceIf: [
		{
			condition: (state) =>
				state.hasResourceAvailable("THRESHOLD") &&
				!state.hasResourceAvailable("HELLS_INGRESS_USED"),
			newSkill: "REGRESS",
		},
	],
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	onConfirm: (state) => {
		state.tryConsumeResource("HELLS_INGRESS_USED");
		if (state.hasTraitUnlocked("HELLSGATE")) state.setTimedResource("THRESHOLD", 1);
		state.setTimedResource("ENHANCED_HARPE", 1);
	},
});

makeRPRAbility("ARCANE_CREST", 40, "cd_ARCANE_CREST", {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("CREST_OF_TIME_BORROWED"),
			newSkill: "ARCANE_CREST_POP",
		},
	],
	cooldown: 30,
	onConfirm: (state) => state.setTimedResource("CREST_OF_TIME_BORROWED", 1),
});

makeRPRAbility("ARCANE_CREST_POP", 40, "cd_ARCANE_CREST_POP", {
	cooldown: 1,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	startOnHotbar: false,
	onConfirm: (state) => {
		state.tryConsumeResource("CREST_OF_TIME_BORROWED");
		state.setTimedResource("CREST_OF_TIME_RETURNED", 1);
	},
	validateAttempt: (state) => state.hasResourceAvailable("CREST_OF_TIME_BORROWED"),
	highlightIf: (state) => state.hasResourceAvailable("CREST_OF_TIME_BORROWED"),
});

makeRPRWeaponskill("WHORL_OF_DEATH", 35, {
	potency: 100,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 1.15,
	onConfirm: (state, node) =>
		node.targetList.forEach((target) => state.refreshDeathsDesign(target)),
});

makeRPRWeaponskill("SPINNING_SCYTHE", 25, {
	potency: 140,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.62,
});

makeRPRWeaponskill("NIGHTMARE_SCYTHE", 45, {
	potency: 120,
	combo: {
		potency: 180,
		resource: "RPR_AOE_COMBO",
		resourceValue: 1,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.8,
	highlightIf: (state) => state.hasResourceExactly("RPR_AOE_COMBO", 1),
});

makeRPRWeaponskill("SOUL_SCYTHE", 65, {
	potency: 180,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.66,
	secondaryCooldown: {
		cdName: "cd_SOUL_SLICE",
		cooldown: 30,
		maxCharges: 2,
	},
});

makeRPRWeaponskill("EXECUTIONERS_GUILLOTINE", 96, {
	startOnHotbar: false,
	potency: 260,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.53,
	highlightIf: (state) => state.hasResourceAvailable("EXECUTIONER"),
	validateAttempt: executionerPredicate,
});

makeRPRWeaponskill("GRIM_REAPING", 80, {
	startOnHotbar: false,
	potency: 200,
	recastTime: 1.5,
	falloff: 0,
	applicationDelay: 0.8,
	highlightIf: (state) => state.resources.get("LEMURE_SHROUD").availableAmount() > 1,
	validateAttempt: (state) => state.hasResourceAvailable("LEMURE_SHROUD"),
	onConfirm: (state) => {
		state.resources.get("LEMURE_SHROUD").consume(1);
		state.resources.get("VOID_SHROUD").gain(1);

		if (state.resources.get("LEMURE_SHROUD").availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
	aspect: Aspect.Physical,
});

makeRPRAbility("LEMURES_SCYTHE", 86, "cd_LEMURES_SLICE", {
	isPhysical: true,
	potency: 100,
	falloff: 0,
	applicationDelay: 0.66,
	cooldown: 1,
	startOnHotbar: false,
	validateAttempt: (state) => state.hasResourceAvailable("VOID_SHROUD", 2),
	highlightIf: (state) => state.hasResourceAvailable("VOID_SHROUD", 2),
	onConfirm: (state) => {
		state.resources.get("VOID_SHROUD").consume(2);
	},
});

makeRPRWeaponskill("GUILLOTINE", 70, {
	replaceIf: [
		{
			newSkill: "GRIM_REAPING",
			condition: (state) => state.hasResourceAvailable("ENSHROUDED"),
		},
		{
			newSkill: "EXECUTIONERS_GUILLOTINE",
			condition: (state) => state.resources.get("EXECUTIONER").available(1),
		},
	],
	potency: 200,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.49,
	highlightIf: (state) => state.hasResourceAvailable("SOUL_REAVER"),
	validateAttempt: reaverPredicate,
});

makeRPRAbility("GAIN_SOUL_GAUGE", 50, "cd_GAIN_SOUL_GAUGE", {
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 0.01,
	onConfirm: (state) => state.resources.get("SOUL").gain(10),
});
