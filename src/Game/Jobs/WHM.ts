// Skill and state declarations for WHM.

// AUTO-GENERATED FROM generate_job_data.py, MAY OR MAY NOT COMPILE

// TODO: write some stuff about what you want to test

import { WHMStatusPropsGenerator } from "../../Components/Jobs/WHM";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { WHMActionKey, WHMCooldownKey, WHMResourceKey } from "../Data/Jobs/WHM";
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

const makeWHMResource = (
	rsc: WHMResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("WHM", rsc, maxValue, params ?? {});
};

// Gauge resources
makeWHMResource("LILLIES", 3);
makeWHMResource("BLOOD_LILY", 3);

// Statuses
makeWHMResource("PRESENCE_OF_MIND", 1, { timeout: 15 });
makeWHMResource("SACRED_SIGHT", 1, { timeout: 30 });
makeWHMResource("REGEN", 1, { timeout: 18 });
makeWHMResource("AERO_II", 1, { timeout: 30 });
makeWHMResource("MEDICA_II", 1, { timeout: 15 });
makeWHMResource("ASYLUM", 1, { timeout: 24 });
makeWHMResource("THIN_AIR", 1, { timeout: 12 });
makeWHMResource("DIVINE_BENISON", 1, { timeout: 15 });
makeWHMResource("CONFESSION", 1, { timeout: 10 });
makeWHMResource("DIA", 1, { timeout: 30 });
makeWHMResource("TEMPERANCE", 1, { timeout: 20 });
makeWHMResource("DIVINE_GRACE", 1, { timeout: 30 });
makeWHMResource("AQUAVEIL", 1, { timeout: 8 });
makeWHMResource("LITURGY_OF_THE_BELL", 5, { timeout: 20 });
makeWHMResource("MEDICA_III", 1, { timeout: 15 });
makeWHMResource("DIVINE_CARESS", 1, { timeout: 10 });
makeWHMResource("DIVINE_AURA", 1, { timeout: 15 });

// Trackers

export class WHMState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<WHMState> {
		return new WHMStatusPropsGenerator(this);
	}
}

const makeWHMWeaponskill = (
	name: WHMActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<WHMState>>,
): Weaponskill<WHMState> => {
	return makeWeaponskill("WHM", name, unlockLevel, {
		...params,
	});
};

const makeWHMSpell = (
	name: WHMActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<WHMState>>,
): Spell<WHMState> => {
	return makeSpell("WHM", name, unlockLevel, {
		...params,
	});
};

const makeWHMAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: Partial<MakeAbilityParams<WHMState>>,
): Ability<WHMState> => {
	return makeAbility("WHM", name, unlockLevel, cdName, {
		...params,
	});
};

const makeWHMResourceAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: MakeResourceAbilityParams<WHMState>,
): Ability<WHMState> => {
	return makeResourceAbility("WHM", name, unlockLevel, cdName, params);
};

makeWHMSpell("STONE", 1, {
	applicationDelay: 0, // TODO
	potency: 140,
});

makeWHMSpell("CURE", 2, {
	applicationDelay: 1.03,
	healingPotency: 500,
});

makeWHMSpell("MEDICA", 10, {
	applicationDelay: 1.02,
	healingPotency: 400,
});

makeWHMSpell("RAISE", 12, {
	applicationDelay: 1.16,
});

makeWHMSpell("CURE_II", 30, {
	applicationDelay: 0.98,
	healingPotency: 800,
});

makeWHMResourceAbility("PRESENCE_OF_MIND", 30, "cd_PRESENCE_OF_MIND", {
	rscType: "PRESENCE_OF_MIND",
	applicationDelay: 0.53,
	cooldown: 120,
});

makeWHMSpell("REGEN", 35, {
	applicationDelay: 1.02,
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("REGEN"),
});

makeWHMSpell("CURE_III", 40, {
	applicationDelay: 0.98,
	healingPotency: 600,
});

makeWHMAbility("AETHERIAL_SHIFT", 40, "cd_AETHERIAL_SHIFT", {
	applicationDelay: 0, // TODO
	cooldown: 60,
});

makeWHMSpell("HOLY", 45, {
	applicationDelay: 0, // TODO
	potency: 140,
	falloff: 0,
});

makeWHMSpell("AERO_II", 46, {
	applicationDelay: 0, // TODO
	potency: 50,
	onConfirm: (state) => state.gainStatus("AERO_II"),
});

makeWHMSpell("MEDICA_II", 50, {
	applicationDelay: 0, // TODO
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("MEDICA_II"),
});

makeWHMAbility("BENEDICTION", 50, "cd_BENEDICTION", {
	applicationDelay: 0.62,
	cooldown: 180,
});

makeWHMSpell("AFFLATUS_SOLACE", 52, {
	applicationDelay: 0.53,
	healingPotency: 800,
});

makeWHMResourceAbility("ASYLUM", 52, "cd_ASYLUM", {
	rscType: "ASYLUM",
	applicationDelay: 0.85,
	cooldown: 90,
	healingPotency: 100,
});

makeWHMAbility("ASSIZE", 56, "cd_ASSIZE", {
	applicationDelay: 0.67,
	cooldown: 40,
	potency: 400,
	falloff: 0,
	healingPotency: 400,
});

makeWHMResourceAbility("THIN_AIR", 58, "cd_THIN_AIR", {
	rscType: "THIN_AIR",
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 2,
});

makeWHMAbility("TETRAGRAMMATON", 60, "cd_TETRAGRAMMATON", {
	applicationDelay: 0.53,
	cooldown: 60,
	maxCharges: 1,
	healingPotency: 700,
});

makeWHMSpell("STONE_IV", 64, {
	applicationDelay: 0, // TODO
	potency: 260,
});

makeWHMResourceAbility("DIVINE_BENISON", 66, "cd_DIVINE_BENISON", {
	rscType: "DIVINE_BENISON",
	applicationDelay: 0.8,
	cooldown: 30,
	maxCharges: 1,
});

makeWHMAbility("PLENARY_INDULGENCE", 70, "cd_PLENARY_INDULGENCE", {
	applicationDelay: 0.8,
	cooldown: 60,
	healingPotency: 200,
});

makeWHMSpell("DIA", 72, {
	applicationDelay: 1.29,
	potency: 80,
	onConfirm: (state) => state.gainStatus("DIA"),
});

makeWHMSpell("GLARE", 72, {
	applicationDelay: 0, // TODO
	potency: 290,
});

makeWHMSpell("AFFLATUS_MISERY", 74, {
	applicationDelay: 0.58,
	potency: 1360,
	falloff: 0.5,
});

makeWHMSpell("AFFLATUS_RAPTURE", 76, {
	applicationDelay: 0.58,
	healingPotency: 400,
});

makeWHMResourceAbility("TEMPERANCE", 80, "cd_TEMPERANCE", {
	rscType: "TEMPERANCE",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeWHMSpell("GLARE_III", 82, {
	applicationDelay: 1.29,
	potency: 340,
});

makeWHMSpell("HOLY_III", 82, {
	applicationDelay: 2.13,
	potency: 150,
	falloff: 0,
});

makeWHMResourceAbility("AQUAVEIL", 86, "cd_AQUAVEIL", {
	rscType: "AQUAVEIL",
	applicationDelay: 0.62,
	cooldown: 60,
});

makeWHMResourceAbility("LITURGY_OF_THE_BELL", 90, "cd_LITURGY_OF_THE_BELL", {
	rscType: "LITURGY_OF_THE_BELL",
	applicationDelay: 0, // TODO
	cooldown: 180,
	healingPotency: 400,
});

makeWHMSpell("GLARE_IV", 92, {
	applicationDelay: 0.85,
	potency: 640,
	falloff: 0.4,
});

makeWHMSpell("MEDICA_III", 96, {
	applicationDelay: 0.84,
	healingPotency: 250,
	onConfirm: (state) => state.gainStatus("MEDICA_III"),
});

makeWHMResourceAbility("DIVINE_CARESS", 100, "cd_DIVINE_CARESS", {
	rscType: "DIVINE_CARESS",
	applicationDelay: 0,
	cooldown: 1,
	healingPotency: 200,
});
