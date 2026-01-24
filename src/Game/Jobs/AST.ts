// Skill and state declarations for AST.

import { ASTStatusPropsGenerator } from "../../Components/Jobs/AST";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { Aspect, BuffType } from "../Common";
import { TraitKey } from "../Data";
import { ASTActionKey, ASTCooldownKey, ASTResourceKey } from "../Data/Jobs/AST";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, Potency, PotencyModifier } from "../Potency";
import { makeResource, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	MakeAbilityParams,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	ResourceCalculationFn,
} from "../Skills";
import { localize } from "../../Components/Localization";

const makeASTResource = (
	rsc: ASTResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warnOnTimeout?: boolean },
) => {
	makeResource("AST", rsc, maxValue, params ?? {});
};

// Gauge resources
makeASTResource("ARCANA", 1);
makeASTResource("MINOR_ARCANA", 1, { default: 1 });

// Statuses
makeASTResource("LIGHTSPEED", 1, { timeout: 15 });
makeASTResource("THE_BALANCE", 1, { timeout: 15 });
makeASTResource("THE_ARROW", 1, { timeout: 15 });
makeASTResource("THE_SPIRE", 1, { timeout: 30 });
makeASTResource("THE_SPEAR", 1, { timeout: 15 });
makeASTResource("THE_BOLE", 1, { timeout: 15 });
makeASTResource("THE_EWER", 1, { timeout: 15 });
makeASTResource("ASPECTED_BENEFIC", 1, { timeout: 15 });
makeASTResource("ASPECTED_HELIOS", 1, { timeout: 15 });
makeASTResource("SYNASTRY", 1, { timeout: 20 });
makeASTResource("DIVINATION", 1, { timeout: 20 });
makeASTResource("DIVINING", 1, { timeout: 30, warnOnTimeout: true });
makeASTResource("COLLECTIVE_UNCONSCIOUS", 1, { timeout: 18 });
makeASTResource("COLLECTIVE_UNCONSCIOUS_MIT", 1, { timeout: 10 });
makeASTResource("WHEEL_OF_FORTUNE", 1, { timeout: 15 });
makeASTResource("OPPOSITION", 1, { timeout: 15 });
makeASTResource("EARTHLY_DOMINANCE", 1, { timeout: 10 });
makeASTResource("GIANT_DOMINANCE", 1, { timeout: 10 });
makeASTResource("COMBUST_II", 1, { timeout: 30 });
makeASTResource("COMBUST_III", 1, { timeout: 30 });
makeASTResource("INTERSECTION", 1, { timeout: 30 });
makeASTResource("NEUTRAL_SECT", 1, { timeout: 20 });
makeASTResource("NEUTRAL_SECT_SHIELD", 1, { timeout: 30 });
makeASTResource("HOROSCOPE", 1, { timeout: 10 });
makeASTResource("HOROSCOPE_HELIOS", 1, { timeout: 30 });
makeASTResource("SUNTOUCHED", 1, { timeout: 30 });
makeASTResource("EXALTATION", 1, { timeout: 8 });
makeASTResource("MACROCOSMOS", 1, { timeout: 15 });
makeASTResource("HELIOS_CONJUNCTION", 1, { timeout: 15 });
makeASTResource("SUN_SIGN", 1, { timeout: 15 });

// Trackers
makeASTResource("ARCANA_1", 1, { default: 1 });
makeASTResource("ARCANA_2", 1, { default: 1 });
makeASTResource("ARCANA_3", 1, { default: 1 });
makeASTResource("NEXT_DRAW", 1);

export class ASTState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const edStacks = this.hasTraitUnlocked("ENHANCED_ESSENTIAL_DIGNITY_II")
			? 3
			: this.hasTraitUnlocked("ENHANCED_ESSENTIAL_DIGNITY")
				? 2
				: 1;
		const ciStacks = this.hasTraitUnlocked("ENHANCED_CELESTIAL_INTERSECTION") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_ESSENTIAL_DIGNITY", 40, edStacks, edStacks));
		this.cooldowns.set(new CoolDown("cd_CELESTIAL_INTERSECTION", 30, ciStacks, ciStacks));
		this.cooldowns.set(
			new CoolDown(
				"cd_SWIFTCAST",
				this.hasTraitUnlocked("ENHANCED_SWIFTCAST") ? 40 : 60,
				1,
				1,
			),
		);

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Combust DoT", zh: "焚灼DoT" }),
				groupedEffects: [
					{
						effectName: "COMBUST_II",
						appliedBy: ["COMBUST_II"],
					},
					{
						effectName: "COMBUST_III",
						appliedBy: ["COMBUST_III"],
					},
				],
			},
			// skipping over the ewer's HoT for ease of implementation
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "WHEEL_OF_FORTUNE",
						appliedBy: ["COLLECTIVE_UNCONSCIOUS"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "OPPOSITION",
						appliedBy: ["CELESTIAL_OPPOSITION"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "ASPECTED_BENEFIC",
						appliedBy: ["ASPECTED_BENEFIC"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "ASPECTED_HELIOS",
						appliedBy: ["ASPECTED_HELIOS"],
					},
					{
						effectName: "HELIOS_CONJUNCTION",
						appliedBy: ["HELIOS_CONJUNCTION"],
					},
				],
			},
		]);
	}

	drawnAstral(): boolean {
		// If NEXT_DRAW is 0, then the currently-drawn set of cards is ASTRAL (Balance, Arrow, Spire, Lord).
		// If NEXT_DRAW is 1, then the currently-drawn set of cards is UMBRAL (Spear, Bole, Ewer, Lady).
		return !this.hasResourceAvailable("NEXT_DRAW");
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource("COLLECTIVE_UNCONSCIOUS");
	}

	override jobSpecificAddHealingBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (skill.cdName === "cd_GCD" && this.hasResourceAvailable("NEUTRAL_SECT")) {
			node.addBuff(BuffType.NeutralSect);
		}
		if (skill.cdName === "cd_GCD" && !skill.aoeHeal && this.hasResourceAvailable("SYNASTRY")) {
			node.addBuff(BuffType.Synastry);
		}
		if (this.hasResourceAvailable("THE_ARROW")) {
			node.addBuff(BuffType.TheArrow);
		}
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("DIVINATION")) {
			node.addBuff(BuffType.Divination);
		}
	}

	override get statusPropsGenerator(): StatusPropsGenerator<ASTState> {
		return new ASTStatusPropsGenerator(this);
	}
}

const makeASTSpell = (
	name: ASTActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		startOnHotbar?: boolean;
		baseCastTime?: number;
		manaCost: number | ResourceCalculationFn<ASTState>;
		potency?: number | Array<[TraitKey, number]>;
		healingPotency?: number | Array<[TraitKey, number]>;
		secondaryCooldown?: CooldownGroupProperties;
		aoeHeal?: boolean;
		falloff?: number;
		drawsAggro?: boolean;
		applicationDelay: number;
		replaceIf?: ConditionalSkillReplace<ASTState>[];
		highlightIf?: StatePredicate<ASTState>;
		validateAttempt?: StatePredicate<ASTState>;
		onConfirm?: EffectFn<ASTState>;
		onApplication?: EffectFn<ASTState>;
	},
): Spell<ASTState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<ASTState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("SYNASTRY") && !params.aoeHeal) {
			modifiers.push(Modifiers.Synastry);
		}
		if (state.hasResourceAvailable("NEUTRAL_SECT")) {
			modifiers.push(Modifiers.NeutralSect);
		}
		if (state.hasResourceAvailable("THE_ARROW")) {
			modifiers.push(Modifiers.TheArrow);
		}
		return modifiers;
	};
	const baseCastTime = params.baseCastTime ?? 0;
	return makeSpell("AST", name, unlockLevel, {
		...params,
		jobHealingPotencyModifiers,
		// Do not apply cards as a potency modifier on the AST's self, since they always should
		// be used on an ally DPS instead.
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("DIVINATION") ? [Modifiers.Divination] : [],
		castTime: (state) =>
			Math.max(
				0,
				state.config.adjustedCastTime(
					state.hasResourceAvailable("LIGHTSPEED") ? baseCastTime - 2.5 : baseCastTime,
				),
			),
		recastTime: (state) => state.config.adjustedGCD(2.5),
		isInstantFn: (state) => !params.baseCastTime || state.hasResourceAvailable("SWIFTCAST"),
		// swiftcast is used if lightspeed is active
		onConfirm: combineEffects(
			baseCastTime ? (state) => state.tryConsumeResource("SWIFTCAST") : undefined,
			params.onConfirm,
		),
	});
};

const makeASTAbility = (
	name: ASTActionKey,
	unlockLevel: number,
	cdName: ASTCooldownKey,
	params: Partial<MakeAbilityParams<ASTState>>,
): Ability<ASTState> => {
	return makeAbility("AST", name, unlockLevel, cdName, {
		...params,
		jobHealingPotencyModifiers: params.healingPotency
			? (state) => {
					const modifiers: PotencyModifier[] = [];
					if (state.hasResourceAvailable("THE_ARROW")) {
						modifiers.push(Modifiers.TheArrow);
					}
					if (name === "STELLAR_DETONATION") {
						modifiers.push(Modifiers.AstPet);
					}
					return modifiers;
				}
			: undefined,
		jobPotencyModifiers: (state) => {
			const modifiers: PotencyModifier[] = [];
			if (state.hasResourceAvailable("DIVINATION")) {
				modifiers.push(Modifiers.Divination);
			}
			if (name === "STELLAR_DETONATION") {
				modifiers.push(Modifiers.AstPet);
			}
			return modifiers;
		},
	});
};

const makeASTResourceAbility = (
	name: ASTActionKey,
	unlockLevel: number,
	cdName: ASTCooldownKey,
	params: MakeResourceAbilityParams<ASTState>,
): Ability<ASTState> => {
	return makeResourceAbility("AST", name, unlockLevel, cdName, {
		...params,
		jobHealingPotencyModifiers: (state) =>
			params.healingPotency && state.hasResourceAvailable("THE_ARROW")
				? [Modifiers.TheArrow]
				: [],
		jobPotencyModifiers: params.potency
			? (state) => (state.hasResourceAvailable("DIVINATION") ? [Modifiers.Divination] : [])
			: undefined,
	});
};

makeASTSpell("MALEFIC_III", 64, {
	autoUpgrade: {
		otherSkill: "MALEFIC_IV",
		trait: "MALEFIC_MASTERY_III",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	potency: 190,
	manaCost: 400,
});

makeASTSpell("MALEFIC_IV", 72, {
	autoDowngrade: {
		otherSkill: "MALEFIC_III",
		trait: "MALEFIC_MASTERY_III",
	},
	autoUpgrade: {
		otherSkill: "FALL_MALEFIC",
		trait: "MALEFIC_MASTERY_IV",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	potency: 230,
	manaCost: 400,
});

makeASTSpell("FALL_MALEFIC", 82, {
	autoDowngrade: {
		otherSkill: "MALEFIC_IV",
		trait: "MALEFIC_MASTERY_IV",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	potency: [
		["NEVER", 250],
		["MAGICK_MASTERY_HEALER", 270],
	],
	manaCost: 400,
});

makeASTSpell("COMBUST_II", 46, {
	autoUpgrade: {
		otherSkill: "COMBUST_III",
		trait: "COMBUST_MASTERY_II",
	},
	applicationDelay: 0.62,
	manaCost: 400,
	drawsAggro: true,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "COMBUST_II",
			skillName: "COMBUST_II",
			tickPotency: 60,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => state.applyDoT("COMBUST_II", node),
});

makeASTSpell("COMBUST_III", 72, {
	autoDowngrade: {
		otherSkill: "COMBUST_II",
		trait: "COMBUST_MASTERY_II",
	},
	applicationDelay: 0.62,
	manaCost: 400,
	drawsAggro: true,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "COMBUST_III",
			skillName: "COMBUST_III",
			tickPotency: state.hasTraitUnlocked("MAGICK_MASTERY_HEALER") ? 70 : 65,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => state.applyDoT("COMBUST_III", node),
});

makeASTSpell("GRAVITY", 45, {
	autoUpgrade: {
		otherSkill: "GRAVITY_II",
		trait: "GRAVITY_MASTERY",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.16,
	potency: 120,
	falloff: 0,
	manaCost: 400,
});

makeASTSpell("GRAVITY_II", 82, {
	autoDowngrade: {
		otherSkill: "GRAVITY",
		trait: "GRAVITY_MASTERY",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.16,
	potency: [
		["NEVER", 130],
		["MAGICK_MASTERY_HEALER", 140],
	],
	falloff: 0,
	manaCost: 400,
});

makeASTSpell("MACROCOSMOS", 90, {
	applicationDelay: 0.75,
	secondaryCooldown: {
		cdName: "cd_MACROCOSMOS",
		cooldown: 180,
		maxCharges: 1,
	},
	potency: [
		["NEVER", 250],
		["MAGICK_MASTERY_HEALER", 270],
	],
	falloff: 0.4,
	manaCost: 600,
	replaceIf: [
		{
			newSkill: "MICROCOSMOS",
			condition: (state) => state.hasResourceAvailable("MACROCOSMOS"),
		},
	],
	onConfirm: (state) => state.gainStatus("MACROCOSMOS"),
});

makeASTAbility("MICROCOSMOS", 90, "cd_MICROCOSMOS", {
	startOnHotbar: false,
	applicationDelay: 0.045,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("MACROCOSMOS"),
	onConfirm: (state) => state.tryConsumeResource("MACROCOSMOS"),
});

makeASTSpell("ASPECTED_BENEFIC", 34, {
	applicationDelay: 0.98,
	healingPotency: [
		["NEVER", 200],
		["ENHANCED_HEALING_MAGIC", 250],
	],
	manaCost: 400,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "ASPECTED_BENEFIC",
			effectName: "ASPECTED_BENEFIC",
			speedStat: "sps",
			tickPotency: state.hasTraitUnlocked("ENHANCED_HEALING_MAGIC") ? 250 : 200,
		});
		// neutral sect and horoscope helios are converted on spell snapshot, not application
		if (state.hasResourceAvailable("NEUTRAL_SECT")) {
			state.gainStatus("NEUTRAL_SECT_SHIELD");
		}
	},
	onApplication: (state, node) => {
		state.applyHoT("ASPECTED_BENEFIC", node);
		state.gainStatus("ASPECTED_BENEFIC");
	},
});

makeASTSpell("BENEFIC", 2, {
	baseCastTime: 1.5,
	applicationDelay: 0.98,
	healingPotency: [
		["NEVER", 450],
		["ENHANCED_HEALING_MAGIC", 500],
	],
	manaCost: 400,
});

makeASTSpell("BENEFIC_II", 26, {
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	healingPotency: [
		["NEVER", 700],
		["ENHANCED_HEALING_MAGIC", 800],
	],
	manaCost: 700,
});

makeASTSpell("ASPECTED_HELIOS", 40, {
	autoUpgrade: {
		otherSkill: "HELIOS_CONJUNCTION",
		trait: "ASPECTED_HELIOS_MASTERY",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	healingPotency: [
		["NEVER", 200],
		["ENHANCED_HEALING_MAGIC", 250],
	],
	aoeHeal: true,
	manaCost: 800,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "ASPECTED_HELIOS",
			effectName: "ASPECTED_HELIOS",
			speedStat: "sps",
			tickPotency: state.hasTraitUnlocked("ENHANCED_HEALING_MAGIC") ? 150 : 100,
		});
		if (state.tryConsumeResource("HOROSCOPE")) {
			state.gainStatus("HOROSCOPE_HELIOS");
		}
		if (state.hasResourceAvailable("NEUTRAL_SECT")) {
			state.gainStatus("NEUTRAL_SECT_SHIELD");
		}
	},
	onApplication: (state, node) => {
		state.applyHoT("ASPECTED_HELIOS", node);
		state.gainStatus("ASPECTED_HELIOS");
	},
});

makeASTSpell("HELIOS_CONJUNCTION", 96, {
	autoDowngrade: {
		otherSkill: "ASPECTED_HELIOS",
		trait: "ASPECTED_HELIOS_MASTERY",
	},
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	healingPotency: 250,
	aoeHeal: true,
	manaCost: 800,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "HELIOS_CONJUNCTION",
			effectName: "HELIOS_CONJUNCTION",
			speedStat: "sps",
			tickPotency: 175,
		});
		if (state.tryConsumeResource("HOROSCOPE")) {
			state.gainStatus("HOROSCOPE_HELIOS");
		}
		if (state.hasResourceAvailable("NEUTRAL_SECT")) {
			state.gainStatus("NEUTRAL_SECT_SHIELD");
		}
	},
	onApplication: (state, node) => {
		state.applyHoT("HELIOS_CONJUNCTION", node);
		state.gainStatus("HELIOS_CONJUNCTION");
	},
});

makeASTSpell("HELIOS", 10, {
	baseCastTime: 1.5,
	applicationDelay: 1.07,
	healingPotency: [
		["NEVER", 300],
		["ENHANCED_HEALING_MAGIC", 400],
	],
	aoeHeal: true,
	manaCost: 700,
	onConfirm: (state) => {
		if (state.tryConsumeResource("HOROSCOPE")) {
			state.gainStatus("HOROSCOPE_HELIOS");
		}
	},
});

makeASTSpell("ASCEND", 12, {
	baseCastTime: 8,
	applicationDelay: 1.07,
	manaCost: 2400,
});

const ASTRAL_CONDITION: StatePredicate<ASTState> = (state) => state.drawnAstral();
const UMBRAL_CONDITION: StatePredicate<ASTState> = (state) => !state.drawnAstral();

const DRAW_CONFIRM: EffectFn<ASTState> = (state) => {
	if (
		state.hasResourceAvailable("ARCANA_1") ||
		(state.drawnAstral() && state.hasResourceAvailable("MINOR_ARCANA"))
	) {
		controller.reportWarning({
			kind: "custom",
			en: "damage card overwritten!",
			zh: "伤害卡被覆盖！",
		});
	}
	state.resources.get("NEXT_DRAW").gainWrapping(1);
	["MINOR_ARCANA", "ARCANA_1", "ARCANA_2", "ARCANA_3"].forEach((rsc) =>
		state.resources.get(rsc as ASTResourceKey).gain(1),
	);
};
const DRAW_APPLY: EffectFn<ASTState> = (state) => state.resources.get("MANA").gain(2000);

makeASTAbility("ASTRAL_DRAW", 30, "cd_ASTRAL_DRAW", {
	// Astral draw can only be executed if the currently drawn cards are umbral.
	replaceIf: [
		{
			newSkill: "UMBRAL_DRAW",
			condition: ASTRAL_CONDITION,
		},
	],
	applicationDelay: 0,
	cooldown: 55,
	validateAttempt: UMBRAL_CONDITION,
	onConfirm: DRAW_CONFIRM,
	onApplication: DRAW_APPLY,
});

makeASTAbility("UMBRAL_DRAW", 30, "cd_ASTRAL_DRAW", {
	startOnHotbar: false,
	// Umbral draw can only be executed if the currently drawn cards are astral.
	replaceIf: [
		{
			newSkill: "ASTRAL_DRAW",
			condition: UMBRAL_CONDITION,
		},
	],
	applicationDelay: 0,
	cooldown: 55,
	validateAttempt: ASTRAL_CONDITION,
	onConfirm: DRAW_CONFIRM,
	onApplication: DRAW_APPLY,
});

const arcanaMaker = (cd: ASTCooldownKey, rsc: ASTResourceKey, cards: ASTActionKey[]) => {
	console.assert(cards.length === 3);
	const replaceList: ConditionalSkillReplace<ASTState>[] = [
		{
			newSkill: cards[0],
			condition: (state) => !state.hasResourceAvailable(rsc),
		},
		{
			newSkill: cards[1],
			condition: (state) => ASTRAL_CONDITION(state) && state.hasResourceAvailable(rsc),
		},
		{
			newSkill: cards[2],
			condition: (state) => UMBRAL_CONDITION(state) && state.hasResourceAvailable(rsc),
		},
	];
	replaceList.forEach(({ newSkill, condition }, i) => {
		// manual stand-in for toSpliced, available in ES2023
		const newReplace = replaceList.slice();
		newReplace.splice(i, 1);
		makeASTAbility(newSkill as ASTActionKey, 30, cd, {
			startOnHotbar: i === 0,
			replaceIf: newReplace,
			applicationDelay: 0.62,
			cooldown: 1,
			validateAttempt: i === 0 ? () => false : condition,
			onConfirm: i !== 0 ? (state) => state.tryConsumeResource(rsc) : undefined,
			onApplication:
				i !== 0 ? (state) => state.gainStatus(newSkill as ASTResourceKey) : undefined,
		});
	});
};

arcanaMaker("cd_PLAY_I", "ARCANA_1", ["PLAY_I", "THE_BALANCE", "THE_SPEAR"]);
arcanaMaker("cd_PLAY_II", "ARCANA_2", ["PLAY_II", "THE_ARROW", "THE_BOLE"]);
arcanaMaker("cd_PLAY_III", "ARCANA_3", ["PLAY_III", "THE_SPIRE", "THE_EWER"]);

makeASTAbility("MINOR_ARCANA", 70, "cd_MINOR_ARCANA", {
	applicationDelay: 0,
	replaceIf: [
		{
			newSkill: "LORD_OF_CROWNS",
			condition: (state) =>
				ASTRAL_CONDITION(state) && state.hasResourceAvailable("MINOR_ARCANA"),
		},
		{
			newSkill: "LADY_OF_CROWNS",
			condition: (state) =>
				UMBRAL_CONDITION(state) && state.hasResourceAvailable("MINOR_ARCANA"),
		},
	],
	cooldown: 1,
	validateAttempt: () => false,
});

makeASTAbility("LORD_OF_CROWNS", 70, "cd_MINOR_ARCANA", {
	startOnHotbar: false,
	replaceIf: [
		{
			newSkill: "MINOR_ARCANA",
			condition: (state) => !state.hasResourceAvailable("MINOR_ARCANA"),
		},
		{
			newSkill: "LADY_OF_CROWNS",
			condition: (state) =>
				UMBRAL_CONDITION(state) && state.hasResourceAvailable("MINOR_ARCANA"),
		},
	],
	applicationDelay: 0.62,
	cooldown: 1,
	potency: 400,
	falloff: 0,
	onConfirm: (state) => state.tryConsumeResource("MINOR_ARCANA"),
});

makeASTAbility("LADY_OF_CROWNS", 70, "cd_MINOR_ARCANA", {
	startOnHotbar: false,
	replaceIf: [
		{
			newSkill: "MINOR_ARCANA",
			condition: (state) => !state.hasResourceAvailable("MINOR_ARCANA"),
		},
		{
			newSkill: "LORD_OF_CROWNS",
			condition: (state) =>
				ASTRAL_CONDITION(state) && state.hasResourceAvailable("MINOR_ARCANA"),
		},
	],
	applicationDelay: 0.62,
	cooldown: 1,
	healingPotency: 400,
	aoeHeal: true,
	onConfirm: (state) => state.tryConsumeResource("MINOR_ARCANA"),
});

// Even though I personally would want to put lightspeed + div + star in front of cards, this ordering
// allows all 3 cards + the minor arcana to remain on the same hotbar row.

makeASTResourceAbility("LIGHTSPEED", 6, "cd_LIGHTSPEED", {
	rscType: "LIGHTSPEED",
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 2,
});

const GIANT_DOMINANCE_POTENCY = 437;
const GIANT_DOMINANCE_HEAL_POTENCY = 1015;
makeASTAbility("EARTHLY_STAR", 62, "cd_EARTHLY_STAR", {
	applicationDelay: 0,
	cooldown: 60,
	falloff: 0,
	replaceIf: [
		{
			newSkill: "STELLAR_DETONATION",
			condition: (state) =>
				state.hasResourceAvailable("EARTHLY_DOMINANCE") ||
				state.hasResourceAvailable("GIANT_DOMINANCE"),
		},
	],
	onConfirm: (state, node) => {
		state.gainStatus("EARTHLY_DOMINANCE");
		state.resources.addResourceEvent({
			rscType: "EARTHLY_DOMINANCE",
			name: "expand earthly star",
			delay: 10,
			fnOnRsc: () => {
				state.gainStatus("GIANT_DOMINANCE");
				// If the star is automatically detonated, register the damage to this node.
				state.resources.addResourceEvent({
					rscType: "GIANT_DOMINANCE",
					name: "auto-detonate earthly star",
					delay: 10,
					fnOnRsc: () => {
						const modifiers: PotencyModifier[] = [];
						const healModifiers: PotencyModifier[] = [];
						const potency = new Potency({
							config: state.config,
							sourceTime: state.getDisplayTime(),
							sourceSkill: "STELLAR_DETONATION",
							aspect: Aspect.Other,
							basePotency: GIANT_DOMINANCE_POTENCY,
							snapshotTime: state.getDisplayTime(),
							description: "",
							targetCount: node.targetCount,
							falloff: 0,
						});
						if (state.hasResourceAvailable("TINCTURE")) {
							modifiers.push(Modifiers.Tincture);
							healModifiers.push(Modifiers.Tincture);
						}
						if (state.hasResourceAvailable("DIVINATION")) {
							modifiers.push(Modifiers.Divination);
						}
						modifiers.push(Modifiers.AstPet);
						potency.modifiers = modifiers;
						node.addPotency(potency);
						const healingPotency = new Potency({
							config: state.config,
							sourceTime: state.getDisplayTime(),
							sourceSkill: "STELLAR_DETONATION",
							aspect: Aspect.Other,
							basePotency: GIANT_DOMINANCE_HEAL_POTENCY,
							snapshotTime: state.getDisplayTime(),
							description: "",
							targetCount: node.healTargetCount,
							falloff: 0,
						});
						if (state.hasResourceAvailable("THE_ARROW")) {
							healModifiers.push(Modifiers.TheArrow);
						}
						node.addHealingPotency(healingPotency);
						controller.resolvePotency(potency);
						controller.resolveHealingPotency(healingPotency);
					},
				});
			},
		});
	},
});

makeASTAbility("STELLAR_DETONATION", 62, "cd_STELLAR_DETONATION", {
	startOnHotbar: false,
	applicationDelay: 0.53,
	cooldown: 3,
	// TODO make this a modifier
	// per pet scaling sheet, actual potencies are higher than on tooltip
	// https://docs.google.com/spreadsheets/d/1Yt7Px7VHuKG1eJR9CRKs3RpvcR5IZKAAA3xjekvv0LY/edit?gid=0#gid=0
	potency: (state) =>
		state.hasResourceAvailable("GIANT_DOMINANCE") ? GIANT_DOMINANCE_POTENCY : 290,
	falloff: 0,
	healingPotency: (state) =>
		state.hasResourceAvailable("GIANT_DOMINANCE") ? GIANT_DOMINANCE_HEAL_POTENCY : 762,
	aoeHeal: true,
	validateAttempt: (state) =>
		state.hasResourceAvailable("EARTHLY_DOMINANCE") ||
		state.hasResourceAvailable("GIANT_DOMINANCE"),
	onConfirm: (state) => {
		state.tryConsumeResource("EARTHLY_DOMINANCE");
		state.tryConsumeResource("GIANT_DOMINANCE");
	},
});

makeASTResourceAbility("DIVINATION", 50, "cd_DIVINATION", {
	rscType: "DIVINATION",
	applicationDelay: 0.62,
	cooldown: 120,
	replaceIf: [
		{
			newSkill: "ORACLE",
			condition: (state) => state.hasResourceAvailable("DIVINING"),
		},
	],
	onConfirm: (state) => state.gainStatus("DIVINING"),
});

makeASTAbility("ORACLE", 92, "cd_ORACLE", {
	startOnHotbar: false,
	applicationDelay: 1.74,
	cooldown: 1,
	potency: 860,
	falloff: 0.5,
	highlightIf: (state) => state.hasResourceAvailable("DIVINING"),
	validateAttempt: (state) => state.hasResourceAvailable("DIVINING"),
	onConfirm: (state) => state.tryConsumeResource("DIVINING"),
});

makeASTAbility("ESSENTIAL_DIGNITY", 15, "cd_ESSENTIAL_DIGNITY", {
	applicationDelay: 0.62,
	cooldown: 40,
	maxCharges: 3, // set in constructor
	healingPotency: 400,
});

makeASTResourceAbility("SYNASTRY", 50, "cd_SYNASTRY", {
	rscType: "SYNASTRY",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeASTResourceAbility("EXALTATION", 86, "cd_EXALTATION", {
	rscType: "EXALTATION",
	applicationDelay: 0.71,
	cooldown: 60,
});

makeASTAbility("COLLECTIVE_UNCONSCIOUS", 58, "cd_COLLECTIVE_UNCONSCIOUS", {
	applicationDelay: 0.42,
	cooldown: 60,
	// regen applies after 0.4s, mitigation is instant
	onConfirm: (state, node) => {
		state.gainStatus("COLLECTIVE_UNCONSCIOUS");
		state.gainStatus("COLLECTIVE_UNCONSCIOUS_MIT");
		state.addHoTPotencies({
			node,
			skillName: "COLLECTIVE_UNCONSCIOUS",
			effectName: "WHEEL_OF_FORTUNE",
			speedStat: "sps",
			tickPotency: 100,
		});
	},
	onApplication: (state) => state.gainStatus("WHEEL_OF_FORTUNE"),
});

makeASTAbility("CELESTIAL_OPPOSITION", 60, "cd_CELESTIAL_OPPOSITION", {
	applicationDelay: 1.07,
	cooldown: 60,
	healingPotency: 200,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "CELESTIAL_OPPOSITION",
			effectName: "OPPOSITION",
			speedStat: "sps",
			tickPotency: 100,
		});
	},
	onApplication: (state) => state.gainStatus("OPPOSITION"),
});

makeASTAbility("CELESTIAL_INTERSECTION", 74, "cd_CELESTIAL_INTERSECTION", {
	applicationDelay: 0,
	cooldown: 30,
	maxCharges: 1,
	healingPotency: 200,
	aoeHeal: true,
});

makeASTResourceAbility("HOROSCOPE", 76, "cd_HOROSCOPE", {
	rscType: "HOROSCOPE",
	applicationDelay: 0,
	cooldown: 60,
	replaceIf: [
		{
			newSkill: "HOROSCOPE_RECAST",
			condition: (state) =>
				state.hasResourceAvailable("HOROSCOPE_HELIOS") ||
				state.hasResourceAvailable("HOROSCOPE"),
		},
	],
});

makeASTAbility("HOROSCOPE_RECAST", 76, "cd_HOROSCOPE_RECAST", {
	startOnHotbar: false,
	applicationDelay: 0.62,
	cooldown: 1,
	healingPotency: (state) => (state.hasResourceAvailable("HOROSCOPE_HELIOS") ? 400 : 200),
	aoeHeal: true,
	validateAttempt: (state) =>
		state.hasResourceAvailable("HOROSCOPE_HELIOS") || state.hasResourceAvailable("HOROSCOPE"),
	onConfirm: (state) =>
		state.tryConsumeResource("HOROSCOPE_HELIOS") || state.tryConsumeResource("HOROSCOPE"),
});

makeASTResourceAbility("NEUTRAL_SECT", 80, "cd_NEUTRAL_SECT", {
	rscType: "NEUTRAL_SECT",
	applicationDelay: 0.62,
	cooldown: 120,
	replaceIf: [
		{
			newSkill: "SUN_SIGN",
			condition: (state) => state.hasResourceAvailable("SUNTOUCHED"),
		},
	],
	onConfirm: (state) => state.gainStatus("SUNTOUCHED"),
});

makeASTResourceAbility("SUN_SIGN", 100, "cd_SUN_SIGN", {
	startOnHotbar: false,
	rscType: "SUN_SIGN",
	applicationDelay: 1.47,
	cooldown: 1,
	highlightIf: (state) => state.hasResourceAvailable("SUNTOUCHED"),
	validateAttempt: (state) => state.hasResourceAvailable("SUNTOUCHED"),
	onConfirm: (state) => state.tryConsumeResource("SUNTOUCHED"),
});
