import { ALL_JOBS } from "../Data/Jobs";
import {
	PhantomActionKey,
	PhantomCooldownKey,
	PhantomResourceKey,
	PHANTOM_ACTIONS,
} from "../Data/Shared/Phantom";
import {
	FAKE_SKILL_ANIMATION_LOCK,
	fnify,
	makeAbility,
	makeSpell,
	makeWeaponskill,
	MakeAbilityParams,
	MakeGCDParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
} from "../Skills";
import { makeResource, CoolDown } from "../Resources";
import { Modifiers, PotencyModifier, PotencyModifierType } from "../Potency";
import { type GameState } from "../GameState";
import { Aspect } from "../Common";
import { CASTERS, HEALERS } from "../Data/Jobs";
import { BRDResourceKey } from "../Data/Jobs/BRD";
import { BLMState, getEnochianModifier } from "./BLM";
import { BRDState } from "./BRD";

ALL_JOBS.forEach((job) => {
	makeResource(job, "PHANTOM_KICK", 3, { timeout: 40 });
	makeResource(job, "COUNTERSTANCE", 1, { timeout: 60 });
	makeResource(job, "OCCULT_QUICK", 1, { timeout: 20 });

	makeResource(job, "SHIRAHADORI", 1, { timeout: 4 });
	makeResource(job, "OCCULT_MAGE_MASHER", 1, { timeout: 60 });
	makeResource(job, "FALSE_PREDICTION", 1, { timeout: 20 }); // TODO check duration
	// TODO figure out how to properly handle predictions
	// judgement + blessing are available for 3s
	// cleansing + starfall are available for 5s
	// for now, we just pretend all of them are available for 5 + 5 + 3 + 3 = 16s
	makeResource(job, "PREDICTION_OF_JUDGMENT", 1, { timeout: 16 });
	makeResource(job, "PREDICTION_OF_CLEANSING", 1, { timeout: 16 });
	makeResource(job, "PREDICTION_OF_BLESSING", 1, { timeout: 16 });
	makeResource(job, "PREDICTION_OF_STARFALL", 1, { timeout: 16 });
	makeResource(job, "PHANTOM_REJUVENATION", 1, { timeout: 20 });
	makeResource(job, "INVULNERABILITY", 1, { timeout: 8 });
	makeResource(job, "POISED_TO_SWORD_DANCE", 1, { timeout: 30 });
	makeResource(job, "TEMPTED_TO_TANGO", 1, { timeout: 30 });
	makeResource(job, "JITTERBUGGED", 1, { timeout: 30 });
	makeResource(job, "WILLING_TO_WALTZ", 1, { timeout: 30 });
	makeResource(job, "QUICKSTEP", 1, { timeout: 90 });
	makeResource(job, "QUICKER_STEP", 1, { timeout: 1800 });
	makeResource(job, "STEADFAST_STANCE", 1, { timeout: 30 });
	makeResource(job, "ENAMORED", 1, { timeout: 4 });
	makeResource(job, "MESMERIZED", 1, { timeout: 100 });
	makeResource(job, "DRAIN_TOUCH", 1, { timeout: 6 });
});

const addDamageModifiers = (
	state: Readonly<GameState>,
	mods: PotencyModifier[],
	aspect?: Aspect,
) => {
	// RDM and BLM are the only jobs with conditional buffs on phantom actions
	if (aspect !== Aspect.Physical) {
		if (state.job === "BLM" && state.hasResourceAvailable("ENOCHIAN")) {
			mods.push({
				kind: "multiplier",
				source: PotencyModifierType.ENO,
				potencyFactor: getEnochianModifier(state as BLMState),
			});
			return;
		}
		if (state.job === "RDM" && state.hasResourceAvailable("EMBOLDEN")) {
			mods.push(Modifiers.EmboldenMagic);
			return;
		}
	}
	// hacky addition of buffs for other jobs (not crit/DH mods allowed)
	mods.push(
		...state.jobSpecificAutoPotencyModifiers().filter((mod) => mod.kind === "multiplier"),
	);
};

const adjustCooldown = (
	state: GameState,
	baseCd: number,
	cdName: PhantomCooldownKey,
	stat?: "sks" | "sps",
) => {
	// Hack to dynamically adjust the cooldown of a weaponskill/spell to reflect haste and sps/sks.
	// Fortunately, no phantom GCD cooldowns (currently) have stacks to worry about.
	// TODO is the formula for cooldowns rounded differently from GCDs?
	// https://discord.com/channels/277897135515762698/1432854607989575782/1432854607989575782
	// seems like to apply quick, we would just multiply by quick modifier and round before applying any other hastes
	state.cooldowns.set(
		new CoolDown(
			cdName,
			stat === "sks"
				? state.config.adjustedSksGCD(baseCd, speedMod(state))
				: stat === "sps"
					? state.config.adjustedGCD(baseCd, speedMod(state))
					: baseCd,
			1,
			1,
		),
	);
};

const makePhantomAbility = (
	name: PhantomActionKey,
	cdName: PhantomCooldownKey,
	params: Partial<MakeAbilityParams<GameState>>,
) => {
	makeAbility(ALL_JOBS, name, 1, cdName, {
		...params,
		assetPath: "Phantom/" + PHANTOM_ACTIONS[name].name + ".png",
		onExecute: (state) => adjustCooldown(state, params.cooldown!, cdName),
		jobPotencyModifiers: (state) => {
			const result = params.jobPotencyModifiers?.(state) ?? [];
			result.push(Modifiers.Phantom);
			addDamageModifiers(state, result, params.aspect);
			return result;
		},
	});
};

const speedMod = (state: Readonly<GameState>) => {
	// Hack to account for speed buffs on each job.
	// Melees: SAM + MNK + NIN + VPR
	// Phys ranged: BRD Army's Paeon/Army's Muse
	// Casters: Ley Lines
	// Healers: Presence of Mind
	if (state.job === "BLM" && state.hasResourceAvailable("LEY_LINES")) {
		return 15;
	}
	if (state.job === "WHM" && state.hasResourceAvailable("PRESENCE_OF_MIND")) {
		return 20;
	}
	if (state.job === "SAM") {
		// SAM + VPR uses buffs for GCD tooltip display, but must still apply it during the rotation.
		return state.hasResourceAvailable("FUKA") ? 13 : 0;
	}
	if (state.job === "VPR") {
		return state.hasResourceAvailable("SWIFTSCALED") ? 15 : 0;
	}
	if (state.job === "BRD") {
		let speedBuff: BRDResourceKey | undefined = undefined;
		if (state.hasResourceAvailable("ARMYS_PAEON")) {
			speedBuff = "ARMYS_PAEON";
		} else if (state.hasResourceAvailable("ARMYS_MUSE")) {
			speedBuff = "ARMYS_MUSE";
		}
		if (speedBuff) {
			return (state as BRDState).getSpeedModifier(speedBuff);
		}
	}
	return state.inherentSpeedModifier();
};

const makePhantomWeaponskill = (
	name: PhantomActionKey,
	cdName: PhantomCooldownKey,
	cd: number,
	params: Partial<MakeGCDParams<GameState>>,
) => {
	makeWeaponskill(ALL_JOBS, name, 1, {
		...params,
		assetPath: "Phantom/" + PHANTOM_ACTIONS[name].name + ".png",
		castTime: (state) =>
			state.config.adjustedSksCastTime(fnify(params.castTime, 0)(state), speedMod(state)),
		recastTime: (state) =>
			state.config.adjustedSksGCD(fnify(params.recastTime, 2.5)(state), speedMod(state)),
		isInstantFn: (state) => !params.castTime,
		jobPotencyModifiers: (state) => {
			const result = params.jobPotencyModifiers?.(state) ?? [];
			result.push(Modifiers.Phantom);
			addDamageModifiers(state, result, params.aspect);
			return result;
		},
		onExecute: (state) => {
			adjustCooldown(state, cd, cdName, "sks");
			if (state.job === "RDM") {
				state.tryConsumeResource("DUALCAST");
			}
		},
		secondaryCooldown: {
			cdName,
			cooldown: cd,
			maxCharges: 1,
		},
	});
};

const makePhantomSpell = (
	name: PhantomActionKey,
	cdName: PhantomCooldownKey,
	cd: number,
	params: Partial<MakeGCDParams<GameState>>,
) => {
	makeSpell(ALL_JOBS, name, 1, {
		...params,
		assetPath: "Phantom/" + PHANTOM_ACTIONS[name].name + ".png",
		castTime: (state) =>
			state.config.adjustedCastTime(fnify(params.castTime, 0)(state), speedMod(state)),
		recastTime: (state) =>
			state.config.adjustedGCD(fnify(params.recastTime, 2.5)(state), speedMod(state)),
		isInstantFn: (state) =>
			(state.job in CASTERS || state.job in HEALERS) &&
			(state.hasResourceAvailable("SWIFTCAST") ||
				(state.job === "BLM" && state.hasResourceAvailable("TRIPLECAST")) ||
				(state.job === "RDM" && state.hasResourceAvailable("DUALCAST")) ||
				(state.job === "PLD" && state.hasResourceAvailable("REQUIESCAT"))),
		jobPotencyModifiers: (state) => {
			const result = params.jobPotencyModifiers?.(state) ?? [];
			result.push(Modifiers.Phantom);
			addDamageModifiers(state, result, params.aspect);
			return result;
		},
		onExecute: (state: GameState) => adjustCooldown(state, cd, cdName, "sps"),
		onConfirm: (state, node) => {
			params.onConfirm?.(state, node);
			if (state.job in CASTERS || state.job in HEALERS) {
				state.tryConsumeResource("SWIFTCAST") ||
					(state.job === "BLM" && state.tryConsumeResource("TRIPLECAST", false)) ||
					(state.job === "RDM" && state.tryConsumeResource("DUALCAST")) ||
					(state.job === "PLD" && state.tryConsumeResource("REQUIESCAT"));
			}
		},
		secondaryCooldown: {
			cdName,
			cooldown: cd,
			maxCharges: 1,
		},
	});
};

// PSMN spells are unaffected by cast/recast time effects.
const makePSMNSpell = (
	name: PhantomActionKey,
	cdName: PhantomCooldownKey,
	cd: number,
	params: Partial<MakeGCDParams<GameState>>,
) => {
	makeSpell(ALL_JOBS, name, 1, {
		...params,
		assetPath: "Phantom/" + PHANTOM_ACTIONS[name].name + ".png",
		castTime: (state) => fnify(params.castTime, 0)(state),
		recastTime: (state) => fnify(params.recastTime, 2.5)(state),
		isInstantFn: (state) => false,
		jobPotencyModifiers: (state) => {
			const result = params.jobPotencyModifiers?.(state) ?? [];
			result.push(Modifiers.Phantom);
			addDamageModifiers(state, result);
			return result;
		},
		onExecute: (state: GameState) => adjustCooldown(state, cd, cdName),
		secondaryCooldown: {
			cdName,
			cooldown: cd,
			maxCharges: 1,
		},
	});
};

makePhantomAbility("PHANTOM_KICK", "cd_OC_GROUP_A", {
	cooldown: 30,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	potency: 100,
	aspect: Aspect.Physical,
	falloff: 0,
	onApplication: (state) =>
		state.gainStatus(
			"PHANTOM_KICK",
			Math.min(3, state.resources.get("PHANTOM_KICK").availableAmount() + 1),
		),
});

// makePhantomAbility("OCCULT_COUNTER", "cd_PHANTOM_KICK", {
// 	cooldown: 30,
// 	potency: 150,
// 	falloff: 0,
// 	highlightIf: (state) => state.hasResourceAvailable("COUNTERSTANCE"),
// 	validateAttempt: (state) => state.hasResourceAvailable("COUNTERSTANCE"),
// });

// makePhantomWeaponskill("COUNTERSTANCE", 1, {
// 	onApplication: (state) => state.gainStatus("COUNTERSTANCE"),
// 	assetPath: "Phantom/Counterstance.png",
// });

makePhantomAbility("OCCULT_CHAKRA", "cd_OC_GROUP_B", {
	applicationDelay: 1, // anecdotal, need to check footage to be sure
	cooldown: 90,
	onApplication: (state) => {
		const mpResource = state.resources.get("MANA");
		mpResource.gain(mpResource.availableAmount() < 3000 ? 7000 : 3000);
	},
});

makePhantomAbility("SHIRAHADORI", "cd_OC_GROUP_D", {
	cooldown: 30,
	onApplication: (state) => state.gainStatus("SHIRAHADORI"),
});

makePhantomWeaponskill("IAINUKI", "cd_OC_GROUP_A", 40, {
	castTime: 1.3,
	potency: 500,
	aspect: Aspect.Physical,
	falloff: 0,
});

makePhantomWeaponskill("ZENINAGE", "cd_OC_GROUP_C", 120, {
	potency: 1500,
	aspect: Aspect.Physical,
});

const PREDICTIONS: PhantomResourceKey[] = [
	"PREDICTION_OF_BLESSING",
	"PREDICTION_OF_STARFALL",
	"PREDICTION_OF_CLEANSING",
	"PREDICTION_OF_JUDGMENT",
];

const stopPredictions = (state: GameState) =>
	PREDICTIONS.forEach((p) => state.tryConsumeResource(p));

makePhantomSpell("PREDICT", "cd_OC_GROUP_A", 60, {
	// First prediction buff appears about 0.9s after casting predict
	applicationDelay: 0.9,
	onApplication: (state) => PREDICTIONS.forEach((p) => state.gainStatus(p)),
});

makePhantomAbility("PHANTOM_JUDGMENT", "cd_PREDICTION", {
	cooldown: 1,
	potency: 400,
	falloff: 0,
	validateAttempt: (state) => state.hasResourceAvailable("PREDICTION_OF_JUDGMENT"),
	onConfirm: stopPredictions,
});

makePhantomAbility("CLEANSING", "cd_PREDICTION", {
	cooldown: 1,
	potency: 500,
	falloff: 0,
	validateAttempt: (state) => state.hasResourceAvailable("PREDICTION_OF_CLEANSING"),
	onConfirm: stopPredictions,
});

makePhantomAbility("STARFALL", "cd_PREDICTION", {
	cooldown: 1,
	potency: 1000,
	falloff: 0,
	validateAttempt: (state) => state.hasResourceAvailable("PREDICTION_OF_STARFALL"),
	onConfirm: stopPredictions,
});

makePhantomAbility("BLESSING", "cd_PREDICTION", {
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("PREDICTION_OF_BLESSING"),
	onConfirm: stopPredictions,
});

makePhantomAbility("PHANTOM_REJUVENATION", "cd_OC_GROUP_D", {
	cooldown: 60,
	onConfirm: (state) => state.gainStatus("PHANTOM_REJUVENATION"),
});

makePhantomAbility("INVULNERABILITY", "cd_OC_GROUP_C", {
	cooldown: 180,
	onConfirm: (state) => state.gainStatus("INVULNERABILITY"),
});

const DANCES: PhantomResourceKey[] = [
	"POISED_TO_SWORD_DANCE",
	"TEMPTED_TO_TANGO",
	"JITTERBUGGED",
	"WILLING_TO_WALTZ",
];

const stopDances = (state: GameState) => DANCES.forEach((d) => state.tryConsumeResource(d));

makePhantomAbility("DANCE", "cd_OC_GROUP_A", {
	// TODO verify application time
	applicationDelay: 0.9,
	cooldown: 30,
	onConfirm: (state) => DANCES.forEach((d) => state.gainStatus(d)),
});

makePhantomWeaponskill("PHANTOM_SWORD_DANCE", "cd_DANCE_GCD", 1, {
	potency: 600,
	aspect: Aspect.Physical,
	validateAttempt: (state) => state.hasResourceAvailable("POISED_TO_SWORD_DANCE"),
	onConfirm: stopDances,
});

makePhantomWeaponskill("TEMPTING_TANGO", "cd_DANCE_GCD", 1, {
	potency: 400,
	validateAttempt: (state) => state.hasResourceAvailable("TEMPTED_TO_TANGO"),
	onConfirm: stopDances,
});

makePhantomWeaponskill("JITTERBUG", "cd_DANCE_GCD", 1, {
	potency: 400,
	validateAttempt: (state) => state.hasResourceAvailable("JITTERBUGGED"),
	onConfirm: stopDances,
});

makePhantomWeaponskill("MYSTERY_WALTZ", "cd_DANCE_GCD", 1, {
	potency: 400,
	validateAttempt: (state) => state.hasResourceAvailable("WILLING_TO_WALTZ"),
	onConfirm: (state) => {
		stopDances(state);
		state.resources.get("MANA").gain(10000);
	},
});

makePhantomWeaponskill("QUICKSTEP", "cd_DANCE_GCD", 1, {
	onConfirm: (state) => state.gainStatus("QUICKSTEP"),
});

makePhantomAbility("STEADFAST_STANCE", "cd_OC_GROUP_B", {
	cooldown: 60,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	onConfirm: (state) => state.gainStatus("STEADFAST_STANCE"),
});

makePhantomAbility("MESMERIZE", "cd_OC_GROUP_C", {
	cooldown: 90,
	onConfirm: (state) => {
		state.gainStatus("MESMERIZED");
		state.gainStatus("ENAMORED");
	},
});

// TODO: cast time reduction in BLM ice/fire
(["OCCULT_FIRE_III", "OCCULT_BLIZZARD_III", "OCCULT_THUNDER_III"] as PhantomActionKey[]).forEach(
	(key) =>
		makePhantomSpell(key, "cd_OC_GROUP_A", 40, {
			castTime: 1.5,
			potency: 400,
			falloff: 0,
			jobPotencyModifiers: (state) => {
				if (state.hasResourceAvailable("ELEMENTAL_WEAKNESS")) {
					return state.hasResourceAvailable("LIBRA")
						? [Modifiers.PhantomHitsLibra]
						: [Modifiers.PhantomHitsWeakness];
				}
				return [];
			},
		}),
);

makePhantomSpell("OCCULT_FLARE", "cd_OC_GROUP_B", 60, { castTime: 2.3, potency: 500, falloff: 0 });

(["HELLFIRE", "JUDGMENT_BOLT", "THUNDERSTORM"] as PhantomActionKey[]).forEach((key) =>
	makePSMNSpell(key, "cd_OC_GROUP_B", 60, {
		castTime: 4,
		potency: 600,
		falloff: 0,
		jobPotencyModifiers: (state) => {
			if (state.hasResourceAvailable("ELEMENTAL_WEAKNESS")) {
				return state.hasResourceAvailable("LIBRA")
					? [Modifiers.PhantomHitsLibra]
					: [Modifiers.PhantomHitsWeakness];
			}
			return [];
		},
	}),
);

makePSMNSpell("MEGAFLARE", "cd_OC_GROUP_C", 90, { castTime: 6, potency: 1000, falloff: 0 });

makePhantomAbility("DRAIN_TOUCH", "cd_OC_GROUP_A", {
	cooldown: 40,
	potency: 150,
	onConfirm: (state) => state.gainStatus("DRAIN_TOUCH"),
});

(["DEEP_FREEZE", "HELL_WIND", "CHAOS_DRIVE"] as PhantomActionKey[]).forEach((key) =>
	makePhantomSpell(key, "cd_OC_GROUP_E", 40, {
		castTime: 1.5,
		potency: 300,
		falloff: 0,
		jobPotencyModifiers: (state) => {
			const modifiers: PotencyModifier[] = [];
			if (state.hasResourceAvailable("ELEMENTAL_WEAKNESS")) {
				modifiers.push(
					state.hasResourceAvailable("LIBRA")
						? Modifiers.PhantomHitsLibra
						: Modifiers.PhantomHitsWeakness,
				);
			}
			if (state.hasResourceAvailable("DRAIN_TOUCH")) {
				modifiers.push(Modifiers.DrainTouch);
			}
			return modifiers;
		},
	}),
);

makePhantomSpell("DOOMSDAY", "cd_OC_GROUP_C", 120, {
	castTime: 1.5,
	potency: 350,
	falloff: 0,
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("DRAIN_TOUCH") ? [Modifiers.DrainTouch] : [],
});

makePhantomAbility("WISDOM_ON_THE_WINDS", "cd_OC_GROUP_C", {
	cooldown: 360,
	onConfirm: (state) => {
		// Wisdom on the Winds is known to not properly reset cooldowns for some job actions.
		// If we ever get around to supporting it, I guess I'll just hard-code it.
		state.cooldowns.forEach((cd, cdName) => {
			if (!cdName.startsWith("cd_OC_GROUP")) {
				cd.makeFullyAvailable();
			}
		});
	},
});

// makePhantomAbility("APPLY_QUICK", "cd_APPLY_BUFF", {
//     animationLock: FAKE_SKILL_ANIMATION_LOCK,
//     cooldown: FAKE_SKILL_ANIMATION_LOCK,
//     onApplication: (state) => state.gainStatus("OCCULT_QUICK"),
// });

makePhantomAbility("APPLY_ETHER", "cd_APPLY_BUFF", {
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: FAKE_SKILL_ANIMATION_LOCK,
	onApplication: (state) => state.resources.get("MANA").gain(10_000),
});
