
// Skill and state declarations for MNK.

// AUTO-GENERATED FROM generate_job_data.py, MAY OR MAY NOT COMPILE

// TODO: write some stuff about what you want to test

import { MNKStatusPropsGenerator } from "../../Components/Jobs/MNK";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { MNKActionKey, MNKCooldownKey, MNKResourceKey } from "../Data/Jobs/MNK";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, makeComboModifier, makePositionalModifier, PotencyModifierType } from "../Potency";
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
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	Weaponskill,
} from "../Skills";

const makeMNKResource = (
	rsc: MNKResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("MNK", rsc, maxValue, params ?? {});
};

// Gauge resources
makeMNKResource("CHAKRA", 5, { default: 5 });
makeMNKResource("BEAST_CHAKRA", 1);
makeMNKResource("NADI", 1);
makeMNKResource("OPO_OPOS_FURY", 1);
makeMNKResource("RAPTORS_FURY", 2);
makeMNKResource("COEURLS_FURY", 3);

// Statuses
makeMNKResource("MANTRA", 1, { timeout: 15 });
makeMNKResource("OPO_OPO_FORM", 1, { timeout: 30 });
makeMNKResource("RAPTOR_FORM", 1, { timeout: 30 });
makeMNKResource("COEURL_FORM", 1, { timeout: 30 });
makeMNKResource("PERFECT_BALANCE", 3, { timeout: 20 });
makeMNKResource("FORMLESS_FIST", 1, { timeout: 30 });
makeMNKResource("RIDDLE_OF_EARTH", 1, { timeout: 10 });
makeMNKResource("EARTHS_RESOLVE", 1, { timeout: 15 });
makeMNKResource("EARTHS_RUMINATION", 1, { timeout: 30 });
makeMNKResource("RIDDLE_OF_FIRE", 1, { timeout: 20 });
makeMNKResource("FIRES_RUMINATION", 1, { timeout: 20 });
makeMNKResource("BROTHERHOOD", 1, { timeout: 20 });
makeMNKResource("MEDITATIVE_BROTHERHOOD", 1, { timeout: 20 });
makeMNKResource("RIDDLE_OF_WIND", 1, { timeout: 15 });
makeMNKResource("WINDS_RUMINATION", 1, { timeout: 15 });
makeMNKResource("SIX_SIDED_STAR", 1, { timeout: 5 });

// Trackers
makeMNKResource("BEAST_CHAKRA_1", 1);
makeMNKResource("BEAST_CHAKRA_2", 1);
makeMNKResource("BEAST_CHAKRA_3", 1);
makeMNKResource("NADI_1", 1);
makeMNKResource("NADI_2", 1);

type Form = "opo" | "raptor" | "coeurl";

export class MNKState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	getForm(): Form | undefined {
		if (this.hasResourceAvailable("OPO_OPO_FORM")) {
			return "opo";
		}
		if (this.hasResourceAvailable("RAPTOR_FORM")) {
			return "raptor";
		}
		if (this.hasResourceAvailable("COEURL_FORM")) {
			return "coeurl";
		}
		return undefined;
	}

	setForm(form: Form | "formless") {
		(["OPO_OPO_FORM", "RAPTOR_FORM", "COEURL_FORM", "FORMLESS_FIST"] as MNKResourceKey[]).forEach((key) =>
			this.tryConsumeResource(key)
		);
		const rsc: MNKResourceKey = form === "opo" ? "OPO_OPO_FORM" : form === "raptor" ? "RAPTOR_FORM" : form === "coeurl" ? "COEURL_FORM" : "FORMLESS_FIST";
		this.gainStatus(rsc);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<MNKState> {
		return new MNKStatusPropsGenerator(this);
	}
}

const makeMNKWeaponskill = (
	name:MNKActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		recastTime?: number;
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		form?: {
			ballPotency?: number | Array<[TraitKey, number]>;
			requiredForm?: Form;
			nextForm: Form;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			ballPotency?: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		falloff?: number;
		applicationDelay: number;
		replaceIf?: ConditionalSkillReplace<MNKState>[];
		validateAttempt?: StatePredicate<MNKState>;
		onConfirm?: EffectFn<MNKState>;
		highlightIf?: StatePredicate<MNKState>;
		onApplication?: EffectFn<MNKState>;
		jobPotencyModifiers?: PotencyModifierFn<MNKState>;
		animationLock?: number;
	},
): Weaponskill<MNKState> => {
	const formCondition = params.form ? (state: Readonly<MNKState>) => state.getForm() === params.form!.requiredForm : undefined;
	return makeWeaponskill("MNK", name, unlockLevel, {
		...params,
		highlightIf: (state) => (formCondition?.(state) ?? false) && (params.highlightIf?.(state) ?? false),
		validateAttempt: (state) => (formCondition?.(state) ?? true) && (params.validateAttempt?.(state) ?? true),
		recastTime: (state) => state.config.adjustedSksGCD(params.recastTime ?? 2.5, state.hasTraitUnlocked("ENHANCED_GREASED_LIGHTNING_III") ? 20 : 15),
		onConfirm: combineEffects(
			params.onConfirm ?? NO_EFFECT,
			params.form ? (state) => state.setForm(params.form!.nextForm) : NO_EFFECT,
		),
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			const hitPositional = params.positional && state.hitPositional(params.positional.location);
			if (state.hasResourceAvailable("BROTHERHOOD")) {
				mods.push(Modifiers.Brotherhood);
			}
			if (state.hasResourceAvailable("RIDDLE_OF_FIRE")) {
				mods.push(Modifiers.RiddleOfFire);
			}
			if (params.form?.ballPotency && state.getForm() === params.form?.requiredForm) {
				mods.push(
					{
						kind: "adder",
						source: PotencyModifierType.MNK_BALL,
						additiveAmount: getBasePotency(state, params.form.ballPotency) - getBasePotency(state, params.potency)
					}
				);
				if (params.positional && hitPositional) {
					mods.push(
						makePositionalModifier(
							getBasePotency(state, params.positional.ballPotency) -
								getBasePotency(state, params.form.ballPotency),
						),
					);
				}
			} else if (params.positional && hitPositional) {
				mods.push(
					makePositionalModifier(
						getBasePotency(state, params.positional.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			return mods;
		}
	});
}

const makeMNKAbility = (
	name: MNKActionKey,
	unlockLevel: number,
	cdName: MNKCooldownKey,
	params: Partial<MakeAbilityParams<MNKState>>,
): Ability<MNKState> => {
	return makeAbility("MNK", name, unlockLevel, cdName, {
		...params,
	});
};

const makeMNKResourceAbility = (
	name: MNKActionKey,
	unlockLevel: number,
	cdName: MNKCooldownKey,
	params: MakeResourceAbilityParams<MNKState>,
): Ability<MNKState> => {
	return makeResourceAbility("MNK", name, unlockLevel, cdName, params);
};

makeMNKWeaponskill("BOOTSHINE", 1, {
	applicationDelay: 1.11,
	potency: 220,

});

makeMNKWeaponskill("TRUE_STRIKE", 4, {
	applicationDelay: 0.80,
	potency: 300,
});

makeMNKWeaponskill("SNAP_PUNCH", 6, {
	applicationDelay: 0.76,
	potency: 270,
});

makeMNKWeaponskill("DRAGON_KICK", 50, {
	applicationDelay: 1.29,
	potency: 320,
});

makeMNKWeaponskill("TWIN_SNAKES", 18, {
	applicationDelay: 0.84,
	potency: 420,
});

makeMNKWeaponskill("DEMOLISH", 30, {
	applicationDelay: 1.60,
	potency: 360,
});

makeMNKWeaponskill("ARM_OF_THE_DESTROYER", 26, {
	applicationDelay: 0.54,
	potency: 110,
	falloff: 0,
});

makeMNKWeaponskill("ROCKBREAKER", 30, {
	applicationDelay: 0.94,
	potency: 150,
	falloff: 0,
});

makeMNKWeaponskill("FOUR_POINT_FURY", 45, {
	applicationDelay: 0.97,
	potency: 140,
	falloff: 0,
});

makeMNKWeaponskill("MASTERFUL_BLITZ", 60, {
	applicationDelay: 0, // TODO
});

makeMNKWeaponskill("SIX_SIDED_STAR", 80, {
	// job guide says 4s, but that's after the 20% innate haste
	recastTime: 5,
	applicationDelay: 0.62,
	potency: 780,
	onConfirm: (state) => state.gainStatus("SIX_SIDED_STAR"),
});

makeMNKWeaponskill("FORM_SHIFT", 52, {
	applicationDelay: 0,
	onConfirm: (state) => state.setForm("formless"),
});

// Treat meditation as a GCD, even out of combat
([
	["FORBIDDEN_MEDITATION", 54],
	["ENLIGHTENED_MEDITATION", 74],
] as Array<[MNKActionKey, number]>).forEach(([key, level], i) => {
	const traitKey = i === 0 ? {
		autoUpgrade: {
			otherSkill: "ENLIGHTENED_MEDITATION",
			trait: "HOWLING_FIST_MASTERY",
		} as SkillAutoReplace,
	} : {
		autoDowngrade: {
			otherSkill: "FORBIDDEN_MEDITATION",
			trait: "HOWLING_FIST_MASTERY",
		} as SkillAutoReplace,
	};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		recastTime: 1,
		applicationDelay: 0,
		replaceIf: [{
			newSkill: "THE_FORBIDDEN_CHAKRA",
			condition: (state) => state.resources.get("CHAKRA").available(5),
		}],
		validateAttempt: (state) => !state.resources.get("CHAKRA").available(5),
		onConfirm: (state) => state.resources.get("CHAKRA").gain(state.isInCombat() ? 1 : 5),
	})
});

makeMNKAbility("THE_FORBIDDEN_CHAKRA", 54, "cd_THE_FORBIDDEN_CHAKRA", {
	startOnHotbar: false,
	replaceIf: [{
		newSkill: "FORBIDDEN_MEDITATION",
		condition: (state) => !state.resources.get("CHAKRA").available(5),
	}],
	applicationDelay: 1.48,
	cooldown: 1,
	potency: 400,
	requiresCombat: true,
	highlightIf: (state) => state.resources.get("CHAKRA").available(5),
	validateAttempt: (state) => state.resources.get("CHAKRA").available(5),
	onConfirm: (state) => state.tryConsumeResource("CHAKRA", true),
});

([
	["HOWLING_FIST", 40, 1.16, 100],
	["ENLIGHTENMENT", 74, 0.76, 160],
] as Array<[MNKActionKey, number, number, number]>).forEach(
	([key, level, applicationDelay, potency]) => {
		makeMNKAbility(key, level, "cd_THE_FORBIDDEN_CHAKRA", {
			applicationDelay,
			cooldown: 1,
			potency,
			falloff: 0,
			requiresCombat: true,
			highlightIf: (state) => state.resources.get("CHAKRA").available(5),
			validateAttempt: (state) => state.resources.get("CHAKRA").available(5),
			onConfirm: (state) => state.tryConsumeResource("CHAKRA", true),
		});
	}
);

makeMNKResourceAbility("PERFECT_BALANCE", 50, "cd_PERFECT_BALANCE", {
	rscType: "PERFECT_BALANCE",
	applicationDelay: 0,
	cooldown: 40,
	maxCharges: 2,
	requiresCombat: true,
	validateAttempt: (state) => !(["BEAST_CHAKRA_1", "BEAST_CHAKRA_2", "BEAST_CHAKRA_3"] as MNKResourceKey[]).map((key) => state.hasResourceAvailable(key)).some((x) => x),
});

makeMNKResourceAbility("RIDDLE_OF_FIRE", 68, "cd_RIDDLE_OF_FIRE", {
	rscType: "RIDDLE_OF_FIRE",
	applicationDelay: 0,
	cooldown: 60,
});

makeMNKResourceAbility("BROTHERHOOD", 70, "cd_BROTHERHOOD", {
	rscType: "BROTHERHOOD",
	applicationDelay: 0.76,
	cooldown: 120,
});

makeMNKResourceAbility("RIDDLE_OF_WIND", 72, "cd_RIDDLE_OF_WIND", {
	rscType: "RIDDLE_OF_WIND",
	applicationDelay: 0,
	cooldown: 90,
});

makeMNKAbility("THUNDERCLAP", 35, "cd_THUNDERCLAP", {
	applicationDelay: 0, // TODO
	cooldown: 30,
	maxCharges: 2,
});

makeMNKResourceAbility("MANTRA", 42, "cd_MANTRA", {
	rscType: "MANTRA",
	applicationDelay: 1.50,
	cooldown: 90,
});

makeMNKResourceAbility("RIDDLE_OF_EARTH", 64, "cd_RIDDLE_OF_EARTH", {
	rscType: "RIDDLE_OF_EARTH",
	applicationDelay: 0,
	cooldown: 120,
	healingPotency: 100,
	replaceIf: [{
		newSkill: "EARTHS_REPLY",
		condition: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
	}],
	onConfirm: (state) => state.gainStatus("EARTHS_RUMINATION"),
});

makeMNKAbility("EARTHS_REPLY", 64, "cd_EARTHS_REPLY", {
	applicationDelay: 1.07,
	cooldown: 1,
	healingPotency: 300,
	highlightIf: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
	onConfirm: (state) => state.tryConsumeResource("EARTHS_RUMINATION"),
});

// blitzes
makeMNKWeaponskill("TORNADO_KICK", 60, {
	startOnHotbar: false,
	applicationDelay: 1.69,
	potency: 1200,
	falloff: 0.40,
});

makeMNKWeaponskill("ELIXIR_FIELD", 60, {
	startOnHotbar: false,
	applicationDelay: 1.07,
	potency: 800,
	falloff: 0.40,
});

makeMNKWeaponskill("ELIXIR_BURST", 92, {
	applicationDelay: 1.42,
	potency: 900,
	falloff: 0.40,
});

makeMNKWeaponskill("CELESTIAL_REVOLUTION", 60, {
	startOnHotbar: false,
	applicationDelay: 0.89,
	potency: 600,
});

makeMNKWeaponskill("FLINT_STRIKE", 60, {
	startOnHotbar: false,
	applicationDelay: 0.53,
	potency: 800,
	falloff: 0.40,
});

makeMNKWeaponskill("RISING_PHOENIX", 86, {
	applicationDelay: 0.76,
	potency: 900,
	falloff: 0.40,
});

makeMNKWeaponskill("PHANTOM_RUSH", 90, {
	applicationDelay: 0.40,
	potency: 1500,
	falloff: 0.40,
});

makeMNKWeaponskill("SHADOW_OF_THE_DESTROYER", 82, {
	applicationDelay: 0.40,
	potency: 120,
	falloff: 0,
});

makeMNKWeaponskill("LEAPING_OPO", 92, {
	applicationDelay: 0.62,
	potency: 260,
});

makeMNKWeaponskill("RISING_RAPTOR", 92, {
	applicationDelay: 0.89,
	potency: 340,
});

makeMNKWeaponskill("POUNCING_COEURL", 92, {
	applicationDelay: 0, // TODO
	potency: 310,
});

makeMNKWeaponskill("WINDS_REPLY", 96, {
	startOnHotbar: false,
	applicationDelay: 1.20,
	potency: 1040,
	falloff: 0.40,
	highlightIf: (state) => state.hasResourceAvailable("WINDS_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("WINDS_RUMINATION"),
	onConfirm: (state) => state.tryConsumeResource("WINDS_RUMINATION"),
});

makeMNKWeaponskill("FIRES_REPLY", 100, {
	startOnHotbar: false,
	applicationDelay: 1.42,
	potency: 1400,
	falloff: 0.40,
	highlightIf: (state) => state.hasResourceAvailable("FIRES_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("FIRES_RUMINATION"),
	onConfirm: (state) => state.tryConsumeResource("FIRES_RUMINATION"),
});
