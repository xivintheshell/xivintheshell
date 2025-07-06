// Skill and state declarations for AST.

// AUTO-GENERATED FROM generate_job_data.py, MAY OR MAY NOT COMPILE

// TODO: write some stuff about what you want to test

import { ASTStatusPropsGenerator } from "../../Components/Jobs/AST";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { ASTActionKey, ASTCooldownKey, ASTResourceKey } from "../Data/Jobs/AST";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, makeComboModifier, makePositionalModifier } from "../Potency";
import { getResourceInfo, makeResource, ResourceInfo, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
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
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	Weaponskill,
} from "../Skills";

const makeASTResource = (
	rsc: ASTResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("AST", rsc, maxValue, params ?? {});
};

// Gauge resources
makeASTResource("ARCANA", 1);
makeASTResource("MINOR_ARCANA", 2);

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
makeASTResource("DIVINING", 1, { timeout: 30 });
makeASTResource("WHEEL_OF_FORTUNE", 1, { timeout: 15 });
makeASTResource("OPPOSITION", 1, { timeout: 15 });
makeASTResource("EARTHLY_DOMINANCE", 1, { timeout: 10 });
makeASTResource("GIANT_DOMINANCE", 1, { timeout: 10 });
makeASTResource("COMBUST_II", 1, { timeout: 30 });
makeASTResource("COMBUST_III", 1, { timeout: 30 });
makeASTResource("INTERSECTION", 1, { timeout: 30 });
makeASTResource("HOROSCOPE", 1, { timeout: 10 });
makeASTResource("HOROSCOPE_HELIOS", 1, { timeout: 10 });
makeASTResource("SUNTOUCHED", 1, { timeout: 30 });
makeASTResource("EXALTATION", 1, { timeout: 8 });
makeASTResource("MACROCOSMOS", 1, { timeout: 15 });
makeASTResource("HELIOS_CONJUNCTION", 1, { timeout: 15 });
makeASTResource("SUN_SIGN", 1, { timeout: 15 });

// Trackers
makeASTResource("ARCANA_1", 3);
makeASTResource("ARCANA_2", 3);
makeASTResource("ARCANA_3", 3);
makeASTResource("NEXT_DRAW", 1);

export class ASTState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<ASTState> {
		return new ASTStatusPropsGenerator(this);
	}
}

const makeASTWeaponskill = (
	name: ASTActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<ASTState>>,
): Weaponskill<ASTState> => {
	return makeWeaponskill("AST", name, unlockLevel, {
		...params,
	});
};

const makeASTSpell = (
	name: ASTActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<ASTState>>,
): Spell<ASTState> => {
	return makeSpell("AST", name, unlockLevel, {
		...params,
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
	});
};

const makeASTResourceAbility = (
	name: ASTActionKey,
	unlockLevel: number,
	cdName: ASTCooldownKey,
	params: MakeResourceAbilityParams<ASTState>,
): Ability<ASTState> => {
	return makeResourceAbility("AST", name, unlockLevel, cdName, params);
};

makeASTSpell("MALEFIC", 1, {
	applicationDelay: 0, // TODO
	potency: 150,
});

makeASTSpell("BENEFIC", 2, {
	applicationDelay: 0.98,
	healingPotency: 500,
});

makeASTResourceAbility("LIGHTSPEED", 6, "cd_LIGHTSPEED", {
	rscType: "LIGHTSPEED",
	applicationDelay: 0,
	cooldown: 90,
	maxCharges: 2,
});

makeASTSpell("HELIOS", 10, {
	applicationDelay: 1.07,
	healingPotency: 400,
});

makeASTSpell("ASCEND", 12, {
	applicationDelay: 1.07,
});

makeASTAbility("ESSENTIAL_DIGNITY", 15, "cd_ESSENTIAL_DIGNITY", {
	applicationDelay: 0.62,
	cooldown: 40,
	maxCharges: 1,
	healingPotency: 400,
});

makeASTSpell("BENEFIC_II", 26, {
	applicationDelay: 1.07,
	healingPotency: 800,
});

makeASTAbility("ASTRAL_DRAW", 30, "cd_ASTRAL_DRAW", {
	applicationDelay: 0, // TODO
	cooldown: 55,
});

makeASTAbility("UMBRAL_DRAW", 30, "cd_UMBRAL_DRAW", {
	applicationDelay: 0, // TODO
	cooldown: 55,
});

makeASTAbility("PLAY_I", 30, "cd_PLAY_I", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeASTAbility("PLAY_II", 30, "cd_PLAY_II", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeASTAbility("PLAY_III", 30, "cd_PLAY_III", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeASTSpell("ASPECTED_BENEFIC", 34, {
	applicationDelay: 0.98,
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("ASPECTED_BENEFIC"),
});

makeASTSpell("ASPECTED_HELIOS", 40, {
	applicationDelay: 0, // TODO
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("ASPECTED_HELIOS"),
});

makeASTSpell("GRAVITY", 45, {
	applicationDelay: 0, // TODO
	potency: 120,
	falloff: 0,
});

makeASTSpell("COMBUST_II", 46, {
	applicationDelay: 0, // TODO
	onConfirm: (state) => state.gainStatus("COMBUST_II"),
});

makeASTResourceAbility("SYNASTRY", 50, "cd_SYNASTRY", {
	rscType: "SYNASTRY",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeASTResourceAbility("DIVINATION", 50, "cd_DIVINATION", {
	rscType: "DIVINATION",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeASTAbility("COLLECTIVE_UNCONSCIOUS", 58, "cd_COLLECTIVE_UNCONSCIOUS", {
	applicationDelay: 0, // TODO
	cooldown: 60,
	healingPotency: 100,
});

makeASTAbility("CELESTIAL_OPPOSITION", 60, "cd_CELESTIAL_OPPOSITION", {
	applicationDelay: 1.07,
	cooldown: 60,
	healingPotency: 200,
});

makeASTAbility("EARTHLY_STAR", 62, "cd_EARTHLY_STAR", {
	applicationDelay: 0, // TODO
	cooldown: 60,
	potency: 205,
	falloff: 0,
	healingPotency: 540,
});

makeASTAbility("STELLAR_DETONATION", 62, "cd_STELLAR_DETONATION", {
	applicationDelay: 0, // TODO
	cooldown: 3,
	potency: 205,
	falloff: 0,
	healingPotency: 540,
});

makeASTSpell("MALEFIC_III", 64, {
	applicationDelay: 0, // TODO
	potency: 190,
});

makeASTAbility("MINOR_ARCANA", 70, "cd_MINOR_ARCANA", {
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeASTSpell("COMBUST_III", 72, {
	applicationDelay: 0.62,
	onConfirm: (state) => state.gainStatus("COMBUST_III"),
});

makeASTSpell("MALEFIC_IV", 72, {
	applicationDelay: 0, // TODO
	potency: 230,
});

makeASTAbility("CELESTIAL_INTERSECTION", 74, "cd_CELESTIAL_INTERSECTION", {
	applicationDelay: 0,
	cooldown: 30,
	maxCharges: 1,
	healingPotency: 200,
});

makeASTResourceAbility("HOROSCOPE", 76, "cd_HOROSCOPE", {
	rscType: "HOROSCOPE",
	applicationDelay: 0, // TODO
	cooldown: 60,
	healingPotency: 200,
});

makeASTResourceAbility("HOROSCOPE", 76, "cd_HOROSCOPE", {
	rscType: "HOROSCOPE",
	applicationDelay: 0, // TODO
	cooldown: 60,
});

makeASTAbility("NEUTRAL_SECT", 80, "cd_NEUTRAL_SECT", {
	applicationDelay: 0.62,
	cooldown: 120,
});

makeASTSpell("FALL_MALEFIC", 82, {
	applicationDelay: 1.07,
	potency: 270,
});

makeASTSpell("GRAVITY_II", 82, {
	applicationDelay: 1.16,
	potency: 140,
	falloff: 0,
});

makeASTResourceAbility("EXALTATION", 86, "cd_EXALTATION", {
	rscType: "EXALTATION",
	applicationDelay: 0.71,
	cooldown: 60,
	healingPotency: 500,
});

makeASTSpell("MACROCOSMOS", 90, {
	applicationDelay: 0, // TODO
	potency: 270,
	falloff: 0.4,
	onConfirm: (state) => state.gainStatus("MACROCOSMOS"),
});

makeASTAbility("MICROCOSMOS", 90, "cd_MICROCOSMOS", {
	applicationDelay: 0.045,
	cooldown: 1,
});

makeASTAbility("ORACLE", 92, "cd_ORACLE", {
	applicationDelay: 1.74,
	cooldown: 1,
});

makeASTSpell("HELIOS_CONJUNCTION", 96, {
	applicationDelay: 1.07,
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("HELIOS_CONJUNCTION"),
});

makeASTResourceAbility("SUN_SIGN", 100, "cd_SUN_SIGN", {
	rscType: "SUN_SIGN",
	applicationDelay: 1.47,
	cooldown: 1,
});

makeASTResourceAbility("THE_BALANCE", 30, "cd_PLAY_I", {
	rscType: "THE_BALANCE",
	applicationDelay: 0.62,
	cooldown: 1,
});

makeASTResourceAbility("THE_ARROW", 30, "cd_PLAY_II", {
	rscType: "THE_ARROW",
	applicationDelay: 0.62,
	cooldown: 1,
});

makeASTResourceAbility("THE_SPIRE", 30, "cd_PLAY_III", {
	rscType: "THE_SPIRE",
	applicationDelay: 0.62,
	cooldown: 1,
});

makeASTResourceAbility("THE_SPEAR", 30, "cd_PLAY_I", {
	rscType: "THE_SPEAR",
	applicationDelay: 0, // TODO
	cooldown: 1,
});

makeASTResourceAbility("THE_BOLE", 30, "cd_PLAY_II", {
	rscType: "THE_BOLE",
	applicationDelay: 0.62,
	cooldown: 1,
});

makeASTResourceAbility("THE_EWER", 30, "cd_PLAY_III", {
	rscType: "THE_EWER",
	applicationDelay: 0.62,
	cooldown: 1,
	healingPotency: 200,
});

makeASTAbility("LORD_OF_CROWNS", 70, "cd_MINOR_ARCANA", {
	applicationDelay: 0.62,
	cooldown: 1,
	potency: 400,
	falloff: 0,
});

makeASTAbility("LADY_OF_CROWNS", 70, "cd_MINOR_ARCANA", {
	applicationDelay: 0.62,
	cooldown: 1,
	healingPotency: 400,
});
