import { ALL_JOBS } from "../Data/Jobs";
import { PhantomActionKey, PhantomCooldownKey, PHANTOM_ACTIONS } from "../Data/Shared/Phantom";
import {
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	makeWeaponskill,
	MakeAbilityParams,
	MOVEMENT_SKILL_ANIMATION_LOCK,
} from "../Skills";
import { makeResource } from "../Resources";
import { Modifiers } from "../Potency";
import type { GameState } from "../GameState";

ALL_JOBS.forEach((job) => {
	makeResource(job, "PHANTOM_KICK", 3, { timeout: 40 });
	makeResource(job, "COUNTERSTANCE", 1, { timeout: 60 });
	makeResource(job, "OCCULT_QUICK", 1, { timeout: 20 });
});

const makePhantomAbility = (
	name: PhantomActionKey,
	cdName: PhantomCooldownKey,
	params: Partial<MakeAbilityParams<GameState>>,
) => {
	makeAbility(ALL_JOBS, name, 1, cdName, {
		...params,
		assetPath: "Phantom/" + PHANTOM_ACTIONS[name].name + ".png",
		jobPotencyModifiers: (state) => [Modifiers.Phantom],
	});
};

makePhantomAbility("PHANTOM_KICK", "cd_PHANTOM_KICK", {
	cooldown: 30,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	potency: 100,
	falloff: 0,
	onApplication: (state) =>
		state.gainStatus("PHANTOM_KICK", state.resources.get("PHANTOM_KICK").availableAmount() + 1),
});

makePhantomAbility("OCCULT_COUNTER", "cd_PHANTOM_KICK", {
	cooldown: 30,
	potency: 150,
	falloff: 0,
	highlightIf: (state) => state.hasResourceAvailable("COUNTERSTANCE"),
	validateAttempt: (state) => state.hasResourceAvailable("COUNTERSTANCE"),
});

makeWeaponskill(ALL_JOBS, "COUNTERSTANCE", 1, {
	onApplication: (state) => state.gainStatus("COUNTERSTANCE"),
	assetPath: "Phantom/Counterstance.png",
});

makePhantomAbility("OCCULT_CHAKRA", "cd_OCCULT_CHAKRA", {
	cooldown: 90,
	onApplication: (state) => {
		const mpResource = state.resources.get("MANA");
		mpResource.gain(mpResource.availableAmount() < 3000 ? 7000 : 3000);
	},
});

// each job has independent logic for determining haste buffs; generalizing haste buffs would be a very
// destructive change (and we need to double check how haste buffs stack)
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
