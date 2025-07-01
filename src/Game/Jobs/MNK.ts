// Skill and state declarations for MNK.

// - different PB chakras, and pressing abilities between beast chakra and blitz
// - beast chakra timer
// - opo abilities without form

import { MNKStatusPropsGenerator } from "../../Components/Jobs/MNK";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { BuffType, ProcMode } from "../Common";
import { TraitKey } from "../Data";
import { MNKActionKey, MNKCooldownKey, MNKResourceKey } from "../Data/Jobs/MNK";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, makePositionalModifier, PotencyModifierType } from "../Potency";
import { makeResource, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeWeaponskill,
	MakeAbilityParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	SkillAutoReplace,
	StatePredicate,
	Skill,
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
makeMNKResource("RAPTORS_FURY", 1);
makeMNKResource("COEURLS_FURY", 2);

// Statuses
// extended durations taken from ama's combat sim
// https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim_source/blob/fb7f88ec42ab27825ef271cca6a00f2ff57acf85/ama_xiv_combat_sim/simulator/game_data/class_skills/melee/mnk_data.py#L7
makeMNKResource("MANTRA", 1, { timeout: 15 });
makeMNKResource("OPO_OPO_FORM", 1, { timeout: 30 });
makeMNKResource("RAPTOR_FORM", 1, { timeout: 30 });
makeMNKResource("COEURL_FORM", 1, { timeout: 30 });
makeMNKResource("PERFECT_BALANCE", 3, { timeout: 20 });
makeMNKResource("FORMLESS_FIST", 1, { timeout: 30 });
makeMNKResource("RIDDLE_OF_EARTH", 1, { timeout: 10 });
makeMNKResource("EARTHS_RESOLVE", 1, { timeout: 15 });
makeMNKResource("EARTHS_RUMINATION", 1, { timeout: 30 });
makeMNKResource("RIDDLE_OF_FIRE", 1, { timeout: 20.72 });
makeMNKResource("FIRES_RUMINATION", 1, { timeout: 20 });
makeMNKResource("BROTHERHOOD", 1, { timeout: 20 });
makeMNKResource("MEDITATIVE_BROTHERHOOD", 1, { timeout: 20 });
makeMNKResource("RIDDLE_OF_WIND", 1, { timeout: 15.78 });
makeMNKResource("WINDS_RUMINATION", 1, { timeout: 15 });
makeMNKResource("SIX_SIDED_STAR", 1, { timeout: 5 });

// Trackers
const BEAST_CHAKRA_KEYS: MNKResourceKey[] = ["BEAST_CHAKRA_1", "BEAST_CHAKRA_2", "BEAST_CHAKRA_3"];
// 0 = empty
// 1 = opo
// 2 = raptor
// 3 = coeurl
makeMNKResource("BEAST_CHAKRA_1", 3);
makeMNKResource("BEAST_CHAKRA_2", 3);
makeMNKResource("BEAST_CHAKRA_3", 3);
makeMNKResource("LUNAR_NADI", 1);
makeMNKResource("SOLAR_NADI", 1);

type Form = "opo" | "raptor" | "coeurl";

export class MNKState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const thunderclapStacks = this.hasTraitUnlocked("ENHANCED_THUNDERCLAP") ? 3 : 2;
		this.cooldowns.set(
			new CoolDown("cd_THUNDERCLAP", 30, thunderclapStacks, thunderclapStacks),
		);

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
		(
			["OPO_OPO_FORM", "RAPTOR_FORM", "COEURL_FORM", "FORMLESS_FIST"] as MNKResourceKey[]
		).forEach((key) => this.tryConsumeResource(key));
		const rsc: MNKResourceKey =
			form === "opo"
				? "OPO_OPO_FORM"
				: form === "raptor"
					? "RAPTOR_FORM"
					: form === "coeurl"
						? "COEURL_FORM"
						: "FORMLESS_FIST";
		this.gainStatus(rsc);
	}

	canDoForm(form: Form) {
		return (
			this.hasResourceAvailable("PERFECT_BALANCE") ||
			this.hasResourceAvailable("FORMLESS_FIST") ||
			this.getForm() === form
		);
	}

	gainChakra() {
		// TODO: handle overflow under BH
		this.resources.get("CHAKRA").gain(1);
	}

	maybeGainChakra(autoCrit: boolean) {
		// There are 2 layers of RNG at play. After learning "Deep Meditation II", chakra is always
		// gained on a crit, so we roll against the crit chance of the ability does not auto-crit.
		// If that trait is not learned, there is an 80% chance to gain a chakra.
		const rand = this.rng();
		const critChance = autoCrit ? 1 : this.config.critRate;
		if (
			autoCrit ||
			this.config.procMode === ProcMode.Always ||
			(this.config.procMode === ProcMode.RNG && rand < critChance)
		) {
			const chakraChance = this.hasTraitUnlocked("DEEP_MEDITATION_II") ? 1 : 0.8;
			const rand2 = this.rng();
			if (
				chakraChance === 1 ||
				this.config.procMode === ProcMode.Always ||
				(this.config.procMode === ProcMode.RNG && rand2 < chakraChance)
			) {
				this.gainChakra();
			}
		}
	}

	startPB() {
		// PB clears all your forms
		(
			["OPO_OPO_FORM", "RAPTOR_FORM", "COEURL_FORM", "FORMLESS_FIST"] as MNKResourceKey[]
		).forEach((key) => this.tryConsumeResource(key));
		this.gainStatus("PERFECT_BALANCE");
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<MNKState>): void {
		if (this.hasResourceAvailable("RIDDLE_OF_FIRE")) {
			node.addBuff(BuffType.RiddleOfFire);
		}
		if (this.hasResourceAvailable("BROTHERHOOD")) {
			node.addBuff(BuffType.Brotherhood);
		}
	}

	override get statusPropsGenerator(): StatusPropsGenerator<MNKState> {
		return new MNKStatusPropsGenerator(this);
	}
}

const makeMNKWeaponskill = (
	name: MNKActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		recastTime?: number;
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		form?: {
			requiredForm?: Form;
			nextForm: Form;
		};
		ball?: {
			potency: number | Array<[TraitKey, number]>;
			rsc: MNKResourceKey;
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
	const formCondition = params.form
		? (state: Readonly<MNKState>) => {
				// Gainers should light up when the correct form is active and there are no balls.
				// Drainers should light up when the correct form is active and there are balls to spend.
				// These conditions are a little more complicated, and validation only requires the
				// correct form to be set, so we handle ball highlight conditions separately.
				return (
					params.form!.requiredForm === undefined ||
					state.canDoForm(params.form!.requiredForm)
				);
			}
		: undefined;
	return makeWeaponskill("MNK", name, unlockLevel, {
		...params,
		highlightIf: (state) => {
			// probably a more efficient way to write this expression but i'm lazy
			if (!formCondition && !params.ball && !params.highlightIf) {
				return false;
			}
			return (
				(formCondition?.(state) ?? true) &&
				(params.ball ? state.hasResourceAvailable(params.ball.rsc) : true) &&
				(params.highlightIf?.(state) ?? true)
			);
		},
		validateAttempt: (state) =>
			(formCondition?.(state) ?? true) && (params.validateAttempt?.(state) ?? true),
		recastTime: (state) =>
			state.config.adjustedSksGCD(
				params.recastTime ?? 2.5,
				state.hasTraitUnlocked("ENHANCED_GREASED_LIGHTNING_III") ? 20 : 15,
			),
		onConfirm: combineEffects(
			params.onConfirm ?? NO_EFFECT,
			name !== "SIX_SIDED_STAR" && params.potency
				? (state, node) => {
						const potency = node.getInitialPotency();
						if (potency) {
							state.maybeGainChakra(potency.modifiers.includes(Modifiers.AutoCrit));
						}
					}
				: NO_EFFECT,
			params.form
				? (state) => {
						const nextForm = params.form!.nextForm;
						const usedPb = state.tryConsumeResource("PERFECT_BALANCE");
						if (usedPb) {
							// Gain a beast chakra if possible
							for (const rscToGain of BEAST_CHAKRA_KEYS) {
								if (!state.hasResourceAvailable(rscToGain)) {
									let amt = 3;
									if (nextForm === "raptor") {
										amt = 1;
									} else if (nextForm === "coeurl") {
										amt = 2;
									}
									state.resources.get(rscToGain).gain(amt);
									// If this was the last beast chakra, enqueue all of them to expire in 20s.
									if (rscToGain === "BEAST_CHAKRA_3") {
										BEAST_CHAKRA_KEYS.forEach((key) =>
											state.enqueueResourceDrop(key, 20),
										);
									}
									break;
								}
							}
						} else {
							// Consuming PB does not set the form afterwards
							state.setForm(nextForm);
						}
					}
				: NO_EFFECT,
			params.ball ? (state) => state.tryConsumeResource(params.ball!.rsc) : NO_EFFECT,
		),
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			const hitPositional =
				params.positional && state.hitPositional(params.positional.location);
			if (state.hasResourceAvailable("BROTHERHOOD")) {
				mods.push(Modifiers.Brotherhood);
			}
			if (state.hasResourceAvailable("RIDDLE_OF_FIRE")) {
				mods.push(Modifiers.RiddleOfFire);
			}
			if (params.ball && state.hasResourceAvailable(params.ball.rsc)) {
				mods.push({
					kind: "adder",
					source: PotencyModifierType.MNK_BALL,
					additiveAmount:
						getBasePotency(state, params.ball.potency) -
						getBasePotency(state, params.potency),
				});
				if (params.positional && hitPositional) {
					mods.push(
						makePositionalModifier(
							getBasePotency(state, params.positional.ballPotency) -
								getBasePotency(state, params.ball.potency),
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
		},
	});
};

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

(
	[
		[
			"BOOTSHINE",
			1,
			1.11,
			[
				["NEVER", 180],
				["MELEE_MASTERY_MNK", 220],
			],
		],
		["LEAPING_OPO", 92, 0.62, 260],
	] as Array<[MNKActionKey, number, number, number | Array<[TraitKey, number]>]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "LEAPING_OPO",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "BOOTSHINE",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		form: {
			nextForm: "raptor",
		},
		ball: {
			potency:
				i === 0
					? [
							["NEVER", 380],
							["MELEE_MASTERY_MNK", 420],
						]
					: 460,
			rsc: "OPO_OPOS_FURY",
		},
		applicationDelay,
		potency,
		highlightIf: (state) => state.canDoForm("opo"),
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("OPO_OPO_FORM") ? [Modifiers.AutoCrit] : [],
	});
});

(
	[
		[
			"TRUE_STRIKE",
			4,
			0.8,
			[
				["NEVER", 260],
				["MELEE_MASTERY_MNK", 300],
			],
		],
		["RISING_RAPTOR", 92, 0.89, 340],
	] as Array<[MNKActionKey, number, number, number | Array<[TraitKey, number]>]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "RISING_RAPTOR",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "TRUE_STRIKE",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		form: {
			requiredForm: "raptor",
			nextForm: "coeurl",
		},
		ball: {
			potency:
				i === 0
					? [
							["NEVER", 460],
							["MELEE_MASTERY_MNK", 500],
						]
					: 540,
			rsc: "RAPTORS_FURY",
		},
		applicationDelay,
		potency,
	});
});

(
	[
		[
			"SNAP_PUNCH",
			6,
			0.76,
			[
				["NEVER", 230],
				["MELEE_MASTERY_MNK", 270],
			],
		],
		["POUNCING_COEURL", 92, 1.02, 310],
	] as Array<[MNKActionKey, number, number, number | Array<[TraitKey, number]>]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "POUNCING_COEURL",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "SNAP_PUNCH",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		form: {
			requiredForm: "coeurl",
			nextForm: "opo",
		},
		ball: {
			potency:
				i === 0
					? [
							["NEVER", 380],
							["MELEE_MASTERY_MNK", 420],
						]
					: 460,
			rsc: "COEURLS_FURY",
		},
		positional: {
			potency:
				i === 0
					? [
							["NEVER", 290],
							["MELEE_MASTERY_MNK", 330],
						]
					: 370,
			ballPotency:
				i === 0
					? [
							["NEVER", 440],
							["MELEE_MASTERY_MNK", 480],
						]
					: 520,
			location: "flank",
		},
		applicationDelay,
		potency,
	});
});

makeMNKWeaponskill("DRAGON_KICK", 50, {
	applicationDelay: 1.29,
	potency: [
		["NEVER", 240],
		["MELEE_MASTERY_MNK", 280],
		["MELEE_MASTERY_II_MNK", 320],
	],
	form: {
		nextForm: "raptor",
	},
	highlightIf: (state) => state.canDoForm("opo") && !state.hasResourceAvailable("OPO_OPOS_FURY"),
	onConfirm: (state) => state.resources.get("OPO_OPOS_FURY").gain(1),
});

makeMNKWeaponskill("TWIN_SNAKES", 18, {
	applicationDelay: 0.84,
	potency: [
		["NEVER", 340],
		["MELEE_MASTERY_MNK", 380],
		["MELEE_MASTERY_II_MNK", 420],
	],
	form: {
		requiredForm: "raptor",
		nextForm: "coeurl",
	},
	highlightIf: (state) => !state.hasResourceAvailable("RAPTORS_FURY"),
	onConfirm: (state) => state.resources.get("RAPTORS_FURY").gain(1),
});

makeMNKWeaponskill("DEMOLISH", 30, {
	applicationDelay: 1.6,
	potency: [
		["NEVER", 280],
		["MELEE_MASTERY_MNK", 320],
		["MELEE_MASTERY_II_MNK", 360],
	],
	form: {
		requiredForm: "coeurl",
		nextForm: "opo",
	},
	positional: {
		potency: [
			["NEVER", 340],
			["MELEE_MASTERY_MNK", 380],
			["MELEE_MASTERY_II_MNK", 420],
		],
		location: "rear",
	},
	highlightIf: (state) => !state.hasResourceAvailable("COEURLS_FURY"),
	onConfirm: (state) => state.resources.get("COEURLS_FURY").gain(2),
});

(
	[
		["ARM_OF_THE_DESTROYER", 26, 0.54, 110],
		["SHADOW_OF_THE_DESTROYER", 82, 0.4, 120],
	] as Array<[MNKActionKey, number, number, number]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "SHADOW_OF_THE_DESTROYER",
						trait: "ARM_OF_THE_DESTROYER_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "ARM_OF_THE_DESTROYER",
						trait: "ARM_OF_THE_DESTROYER_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		applicationDelay,
		potency,
		falloff: 0,
		form: {
			nextForm: "raptor",
		},
		highlightIf: (state) => state.canDoForm("opo"),
		jobPotencyModifiers:
			i === 1
				? (state) =>
						state.hasResourceAvailable("OPO_OPO_FORM") ? [Modifiers.AutoCrit] : []
				: undefined,
	});
});

makeMNKWeaponskill("ROCKBREAKER", 30, {
	applicationDelay: 0.94,
	potency: 150,
	falloff: 0,
	form: {
		requiredForm: "raptor",
		nextForm: "coeurl",
	},
});

makeMNKWeaponskill("FOUR_POINT_FURY", 45, {
	applicationDelay: 0.97,
	potency: 140,
	falloff: 0,
	form: {
		requiredForm: "coeurl",
		nextForm: "opo",
	},
});

// blitzes
const TK_BLITZ: StatePredicate<MNKState> = (state) => {
	const blitzValues = BEAST_CHAKRA_KEYS.map((key) =>
		state.resources.get(key as MNKResourceKey).availableAmount(),
	);
	return (
		state.hasResourceAvailable("LUNAR_NADI") &&
		state.hasResourceAvailable("SOLAR_NADI") &&
		blitzValues.every((x) => x > 0)
	);
};
const LUNAR_BLITZ: StatePredicate<MNKState> = (state) => {
	const blitzValues = BEAST_CHAKRA_KEYS.map((key) =>
		state.resources.get(key as MNKResourceKey).availableAmount(),
	);
	const firstBeast = blitzValues[0];
	const allEqual =
		firstBeast > 0 && blitzValues[1] === firstBeast && blitzValues[2] === firstBeast;
	return (
		allEqual &&
		!(state.hasResourceAvailable("LUNAR_NADI") && state.hasResourceAvailable("SOLAR_NADI"))
	);
};
const SOLAR_BLITZ: StatePredicate<MNKState> = (state) => {
	const blitzValues = BEAST_CHAKRA_KEYS.map((key) =>
		state.resources.get(key as MNKResourceKey).availableAmount(),
	);
	const seen = [false, false, false];
	blitzValues.forEach((value) => {
		console.assert(value < 4, "beast chakra had invalid value");
		if (value < 4 && value > 0) {
			seen[value - 1] = true;
		}
	});
	return (
		seen.every((x) => x) &&
		blitzValues.every((x) => x > 0) &&
		!(state.hasResourceAvailable("LUNAR_NADI") && state.hasResourceAvailable("SOLAR_NADI"))
	);
};
const CELESTIAL_BLITZ: StatePredicate<MNKState> = (state) => {
	const blitzValues = BEAST_CHAKRA_KEYS.map((key) =>
		state.resources.get(key as MNKResourceKey).availableAmount(),
	);
	return (
		!LUNAR_BLITZ(state) &&
		!SOLAR_BLITZ(state) &&
		blitzValues.every((x) => x > 0) &&
		!(state.hasResourceAvailable("LUNAR_NADI") && state.hasResourceAvailable("SOLAR_NADI"))
	);
};
const NO_BLITZ: StatePredicate<MNKState> = (state) =>
	!TK_BLITZ(state) && !LUNAR_BLITZ(state) && !SOLAR_BLITZ(state) && !CELESTIAL_BLITZ(state);

const BLITZ_REPLACES: ConditionalSkillReplace<MNKState>[] = [
	{
		newSkill: "MASTERFUL_BLITZ",
		condition: NO_BLITZ,
	},
	{
		newSkill: "ELIXIR_FIELD",
		condition: LUNAR_BLITZ,
	},
	{
		newSkill: "FLINT_STRIKE",
		condition: SOLAR_BLITZ,
	},
	{
		newSkill: "CELESTIAL_REVOLUTION",
		condition: CELESTIAL_BLITZ,
	},
	{
		newSkill: "TORNADO_KICK",
		condition: TK_BLITZ,
	},
];

const getBlitzReplacer = (i: number) =>
	BLITZ_REPLACES.slice(0, i).concat(BLITZ_REPLACES.slice(i + 1));

const clearBeastChakra: EffectFn<MNKState> = (state) => {
	BEAST_CHAKRA_KEYS.forEach((key) => state.tryConsumeResource(key, true));
	state.gainStatus("FORMLESS_FIST");
};
const gainNadi: (nadi: "lunar" | "solar") => EffectFn<MNKState> =
	(nadi: "lunar" | "solar") => (state) =>
		state.resources.get(nadi === "lunar" ? "LUNAR_NADI" : "SOLAR_NADI").gain(1);

makeMNKWeaponskill("MASTERFUL_BLITZ", 60, {
	applicationDelay: 0,
	replaceIf: getBlitzReplacer(0),
	validateAttempt: (state) => false,
});

(
	[
		["TORNADO_KICK", 60, 1.69, 1200],
		["PHANTOM_RUSH", 90, 0.4, 1500],
	] as Array<[MNKActionKey, number, number, number]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "PHANTOM_RUSH",
						trait: "TORNADO_KICK_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "TORNADO_KICK",
						trait: "TORNADO_KICK_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		startOnHotbar: false,
		applicationDelay,
		replaceIf: getBlitzReplacer(4),
		highlightIf: (state) => true,
		potency,
		falloff: 0.4,
		onConfirm: combineEffects(clearBeastChakra, (state) => {
			state.tryConsumeResource("LUNAR_NADI");
			state.tryConsumeResource("SOLAR_NADI");
		}),
	});
});

(
	[
		["ELIXIR_FIELD", 60, 1.07, 800],
		["ELIXIR_BURST", 92, 1.42, 900],
	] as Array<[MNKActionKey, number, number, number]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "ELIXIR_BURST",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "ELIXIR_FIELD",
						trait: "BEAST_CHAKRA_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		startOnHotbar: false,
		applicationDelay,
		replaceIf: getBlitzReplacer(1),
		highlightIf: (state) => true,
		potency,
		falloff: 0.4,
		onConfirm: combineEffects(clearBeastChakra, gainNadi("lunar")),
	});
});

makeMNKWeaponskill("CELESTIAL_REVOLUTION", 60, {
	startOnHotbar: false,
	applicationDelay: 0.89,
	replaceIf: getBlitzReplacer(3),
	highlightIf: (state) => true,
	potency: 600,
	onConfirm: combineEffects(clearBeastChakra, (state) =>
		state.resources
			.get(state.hasResourceAvailable("LUNAR_NADI") ? "SOLAR_NADI" : "LUNAR_NADI")
			.gain(1),
	),
});

(
	[
		["FLINT_STRIKE", 60, 0.53, 800],
		["RISING_PHOENIX", 86, 0.76, 900],
	] as Array<[MNKActionKey, number, number, number]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "RISING_PHOENIX",
						trait: "FLINT_STRIKE_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "FLINT_STRIKE",
						trait: "FLINT_STRIKE_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKWeaponskill(key, level, {
		...traitKey,
		startOnHotbar: false,
		applicationDelay,
		replaceIf: getBlitzReplacer(2),
		highlightIf: (state) => true,
		potency,
		falloff: 0.4,
		onConfirm: combineEffects(clearBeastChakra, gainNadi("solar")),
	});
});

makeMNKWeaponskill("SIX_SIDED_STAR", 80, {
	// job guide says 4s, but that's after the 20% innate haste
	recastTime: 5,
	applicationDelay: 0.62,
	potency: [
		["NEVER", 710],
		["MELEE_MASTERY_II_MNK", 780],
	],
	onConfirm: (state) => {
		// TODO handle BH overflow chakra
		state.tryConsumeResource("CHAKRA", true);
		state.gainStatus("SIX_SIDED_STAR");
	},
	jobPotencyModifiers: (state) => {
		const chakraAmt = state.resources.get("CHAKRA").availableAmount();
		// TODO these currently all blend into the same row in the damage table due to sharing a modifier type
		// may need to rewrite some damage statistics logic
		return chakraAmt > 0
			? [
					{
						kind: "adder",
						additiveAmount: 80 * chakraAmt,
						source: PotencyModifierType.SSS_CHAKRA,
					},
				]
			: [];
	},
});

makeMNKWeaponskill("FORM_SHIFT", 52, {
	applicationDelay: 0,
	onConfirm: (state) => state.setForm("formless"),
});

// Treat meditation as a GCD, even out of combat
// I'm pretty sure forbidden meditation and enlightened meditation do the same thing, so we only include one.
makeMNKWeaponskill("FORBIDDEN_MEDITATION", 54, {
	recastTime: 1,
	applicationDelay: 0,
	replaceIf: [
		{
			newSkill: "THE_FORBIDDEN_CHAKRA",
			condition: (state) => state.resources.get("CHAKRA").available(5),
		},
	],
	validateAttempt: (state) => !state.resources.get("CHAKRA").available(5),
	onConfirm: (state) => state.resources.get("CHAKRA").gain(state.isInCombat() ? 1 : 5),
});

// according to consolegameswiki, TFC shares a recast timer with howling fist but not enlightenment?
// i don't think that will matter to anybody so whatever
makeMNKAbility("THE_FORBIDDEN_CHAKRA", 54, "cd_THE_FORBIDDEN_CHAKRA", {
	startOnHotbar: false,
	replaceIf: [
		{
			newSkill: "FORBIDDEN_MEDITATION",
			condition: (state) => !state.resources.get("CHAKRA").available(5),
		},
	],
	applicationDelay: 1.48,
	cooldown: 1,
	potency: [
		["NEVER", 310],
		["MELEE_MASTERY_MNK", 400],
	],
	requiresCombat: true,
	highlightIf: (state) => state.resources.get("CHAKRA").available(5),
	validateAttempt: (state) => state.resources.get("CHAKRA").available(5),
	onConfirm: (state) => state.tryConsumeResource("CHAKRA", true),
});

(
	[
		["HOWLING_FIST", 40, 1.16, 100],
		["ENLIGHTENMENT", 74, 0.76, 160],
	] as Array<[MNKActionKey, number, number, number]>
).forEach(([key, level, applicationDelay, potency], i) => {
	const traitKey =
		i === 0
			? {
					autoUpgrade: {
						otherSkill: "ENLIGHTENMENT",
						trait: "HOWLING_FIST_MASTERY",
					} as SkillAutoReplace,
				}
			: {
					autoDowngrade: {
						otherSkill: "HOWLING_FIST",
						trait: "HOWLING_FIST_MASTERY",
					} as SkillAutoReplace,
				};
	makeMNKAbility(key, level, "cd_THE_FORBIDDEN_CHAKRA", {
		...traitKey,
		applicationDelay,
		cooldown: 1,
		potency,
		falloff: 0,
		requiresCombat: true,
		highlightIf: (state) => state.resources.get("CHAKRA").available(5),
		validateAttempt: (state) => state.resources.get("CHAKRA").available(5),
		onConfirm: (state) => state.tryConsumeResource("CHAKRA", true),
	});
});

makeMNKResourceAbility("PERFECT_BALANCE", 50, "cd_PERFECT_BALANCE", {
	rscType: "PERFECT_BALANCE",
	applicationDelay: 0,
	cooldown: 40,
	maxCharges: 2,
	requiresCombat: true,
	validateAttempt: (state) =>
		!BEAST_CHAKRA_KEYS.map((key) => state.hasResourceAvailable(key)).some((x) => x),
	onConfirm: (state) => state.startPB(),
});

makeMNKResourceAbility("RIDDLE_OF_FIRE", 68, "cd_RIDDLE_OF_FIRE", {
	rscType: "RIDDLE_OF_FIRE",
	applicationDelay: 0,
	cooldown: 60,
	replaceIf: [
		{
			newSkill: "FIRES_REPLY",
			condition: (state) => state.hasResourceAvailable("FIRES_RUMINATION"),
		},
	],
	onConfirm: (state) => state.gainStatus("FIRES_RUMINATION"),
});

makeMNKResourceAbility("BROTHERHOOD", 70, "cd_BROTHERHOOD", {
	rscType: "BROTHERHOOD",
	applicationDelay: 0.76,
	cooldown: 120,
	onConfirm: (state) => state.gainStatus("MEDITATIVE_BROTHERHOOD"),
});

makeMNKResourceAbility("RIDDLE_OF_WIND", 72, "cd_RIDDLE_OF_WIND", {
	rscType: "RIDDLE_OF_WIND",
	applicationDelay: 0,
	cooldown: 90,
	replaceIf: [
		{
			newSkill: "WINDS_REPLY",
			condition: (state) => state.hasResourceAvailable("WINDS_RUMINATION"),
		},
	],
	onConfirm: (state) => state.gainStatus("WINDS_RUMINATION"),
});

makeMNKAbility("THUNDERCLAP", 35, "cd_THUNDERCLAP", {
	applicationDelay: 0,
	cooldown: 30,
	maxCharges: 3,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeMNKResourceAbility("MANTRA", 42, "cd_MANTRA", {
	rscType: "MANTRA",
	applicationDelay: 1.5,
	cooldown: 90,
});

makeMNKResourceAbility("RIDDLE_OF_EARTH", 64, "cd_RIDDLE_OF_EARTH", {
	rscType: "RIDDLE_OF_EARTH",
	applicationDelay: 0,
	cooldown: 120,
	healingPotency: 100,
	replaceIf: [
		{
			newSkill: "EARTHS_REPLY",
			condition: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
		},
	],
	onConfirm: (state) => state.gainStatus("EARTHS_RUMINATION"),
});

makeMNKAbility("EARTHS_REPLY", 64, "cd_EARTHS_REPLY", {
	startOnHotbar: false,
	applicationDelay: 1.07,
	cooldown: 1,
	healingPotency: 300,
	highlightIf: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("EARTHS_RUMINATION"),
	onConfirm: (state) => state.tryConsumeResource("EARTHS_RUMINATION"),
});

makeMNKWeaponskill("WINDS_REPLY", 96, {
	startOnHotbar: false,
	applicationDelay: 1.2,
	potency: 1040,
	falloff: 0.4,
	highlightIf: (state) => state.hasResourceAvailable("WINDS_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("WINDS_RUMINATION"),
	onConfirm: (state) => state.tryConsumeResource("WINDS_RUMINATION"),
});

makeMNKWeaponskill("FIRES_REPLY", 100, {
	startOnHotbar: false,
	applicationDelay: 1.42,
	potency: 1400,
	falloff: 0.4,
	highlightIf: (state) => state.hasResourceAvailable("FIRES_RUMINATION"),
	validateAttempt: (state) => state.hasResourceAvailable("FIRES_RUMINATION"),
	onConfirm: (state) => {
		state.tryConsumeResource("FIRES_RUMINATION");
		state.gainStatus("FORMLESS_FIST");
	},
});
