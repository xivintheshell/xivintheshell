import {
	TANK_JOBS,
	RANGED_JOBS,
	MELEE_JOBS,
	CASTER_JOBS,
	HEALER_JOBS,
	ALL_JOBS,
	JOBS,
} from "../Data/Jobs";
import { WarningType } from "../Common";
import { makeAbility, makeLimitBreak, makeResourceAbility, makeSpell } from "../Skills";
import { DoTBuff, EventTag, makeResource } from "../Resources";
import type { GameState } from "../GameState";
import { controller } from "../../Controller/Controller";
import { LIMIT_BREAK, LimitBreakResourceKey } from "../Data/Resources/Shared/LimitBreak";

//#region Helper functions

// Special case for RDM, because for some twelvesforsaken reason sprint/pot cancel dualcast
// And so do limit breaks! :(
const cancelDualcast = (state: GameState) => {
	if (state.job === "RDM" && state.tryConsumeResource("DUALCAST")) {
		controller.reportWarning(WarningType.DualcastEaten);
	}
};

//#endregion

//#region Interrupts

makeAbility(TANK_JOBS, "INTERJECT", 18, "cd_HEAD_GRAZE", {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Interject.png",
});

makeAbility(RANGED_JOBS, "HEAD_GRAZE", 24, "cd_HEAD_GRAZE", {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Head Graze.png",
});

//#endregion

//#region Enemy-targeted mitigations

TANK_JOBS.forEach((job) => {
	makeResource(job, "REPRISAL", 1, { timeout: 15 });
});
makeResourceAbility(TANK_JOBS, "REPRISAL", 22, "cd_REPRISAL", {
	rscType: "REPRISAL",
	applicationDelay: 0.62,
	cooldown: 60,
	duration: (state) => (state.hasTraitUnlocked("ENHANCED_REPRISAL") && 15) || 10,
	assetPath: "Role/Reprisal.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, "FEINT", 1, { timeout: 15 });
});
makeResourceAbility(MELEE_JOBS, "FEINT", 22, "cd_FEINT", {
	rscType: "FEINT",
	applicationDelay: 0.537,
	cooldown: 90,
	duration: (state) => (state.hasTraitUnlocked("ENHANCED_FEINT") && 15) || 10,
	assetPath: "Role/Feint.png",
});

CASTER_JOBS.forEach((job) => {
	makeResource(job, "ADDLE", 1, { timeout: 15 });
});
makeResourceAbility(CASTER_JOBS, "ADDLE", 8, "cd_ADDLE", {
	rscType: "ADDLE",
	applicationDelay: 0.621, // delayed
	cooldown: 90,
	duration: (state) => (state.hasTraitUnlocked("ENHANCED_ADDLE") && 15) || 10,
	assetPath: "Role/Addle.png",
});

//#endregion

//#region Self-targeted utility

TANK_JOBS.forEach((job) => {
	makeResource(job, "RAMPART", 1, { timeout: 20 });
});
makeResourceAbility(TANK_JOBS, "RAMPART", 8, "cd_RAMPART", {
	rscType: "RAMPART",
	applicationDelay: 0.62,
	cooldown: 90,
	assetPath: "Role/Rampart.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, "TRUE_NORTH", 1, { timeout: 10 });
});
makeResourceAbility(MELEE_JOBS, "TRUE_NORTH", 50, "cd_TRUE_NORTH", {
	rscType: "TRUE_NORTH",
	applicationDelay: 0,
	cooldown: 45,
	maxCharges: 2,
	assetPath: "Role/True North.png",
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, "SWIFTCAST", 1, { timeout: 10 });
});
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], "SWIFTCAST", 18, "cd_SWIFTCAST", {
	rscType: "SWIFTCAST",
	applicationDelay: 0, // instant
	cooldown: 40, // set by trait in constructor
	assetPath: "Role/Swiftcast.png",
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, "LUCID_DREAMING", 1, { timeout: 21 });
});
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], "LUCID_DREAMING", 14, "cd_LUCID_DREAMING", {
	rscType: "LUCID_DREAMING",
	applicationDelay: 0.623, // delayed
	cooldown: 60,
	assetPath: "Role/Lucid Dreaming.png",
	onApplication: (state, node) => {
		let lucid = state.resources.get("LUCID_DREAMING") as DoTBuff;
		lucid.node = node;
		lucid.tickCount = 0;
		let nextLucidTickEvt = state.findNextQueuedEventByTag(EventTag.LucidTick);
		if (nextLucidTickEvt) {
			nextLucidTickEvt.addTag(EventTag.ManaGain);
		}
	},
});

//#endregion

//#region Anti-knockback

[...TANK_JOBS, ...MELEE_JOBS, ...RANGED_JOBS].forEach((job) => {
	makeResource(job, "ARMS_LENGTH", 1, { timeout: 6.5 });
});
makeResourceAbility(
	[...TANK_JOBS, ...MELEE_JOBS, ...RANGED_JOBS],
	"ARMS_LENGTH",
	32,
	"cd_ARMS_LENGTH",
	{
		rscType: "ARMS_LENGTH",
		applicationDelay: 0.62,
		cooldown: 120,
		assetPath: "Role/Arms Length.png",
	},
);

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, "SURECAST", 1, { timeout: 6.5 });
});
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], "SURECAST", 44, "cd_SURECAST", {
	rscType: "SURECAST",
	applicationDelay: 0, // surprisingly instant because arms length is not
	cooldown: 120,
	assetPath: "Role/Surecast.png",
});

//#endregion

//#region Self-targeted healing

MELEE_JOBS.forEach((job) => {
	makeResource(job, "BLOODBATH", 1, { timeout: 20 });
});
makeResourceAbility(MELEE_JOBS, "BLOODBATH", 8, "cd_BLOODBATH", {
	rscType: "BLOODBATH",
	applicationDelay: 0.625,
	cooldown: 90,
	assetPath: "Role/Bloodbath.png",
});

makeAbility([...MELEE_JOBS, ...RANGED_JOBS], "SECOND_WIND", 12, "cd_SECOND_WIND", {
	applicationDelay: 0.625,
	cooldown: 120,
	assetPath: "Role/Second Wind.png",
});

//#endregion

//#region Other-targeted utility

makeAbility(TANK_JOBS, "PROVOKE", 15, "cd_PROVOKE", {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Provoke.png",
});

makeAbility(TANK_JOBS, "SHIRK", 48, "cd_SHIRK", {
	applicationDelay: 0,
	cooldown: 120,
	assetPath: "Role/Shirk.png",
});

makeAbility(TANK_JOBS, "LOW_BLOW", 25, "cd_LOW_BLOW", {
	applicationDelay: 0.62,
	cooldown: 25,
	assetPath: "Role/Low Blow.png",
});

makeSpell(HEALER_JOBS, "ESUNA", 10, {
	manaCost: 400,
	castTime: 0,
	applicationDelay: 1.14,
	assetPath: "Role/Esuna.png",
});

makeAbility(HEALER_JOBS, "RESCUE", 48, "cd_RESCUE", {
	applicationDelay: 0, // Who knows
	cooldown: 120,
	assetPath: "Role/Rescue.png",
});

makeAbility(MELEE_JOBS, "LEG_SWEEP", 10, "cd_LEG_SWEEP", {
	applicationDelay: 0.625,
	cooldown: 40,
	assetPath: "Role/Leg Sweep.png",
});

//#endregion

//#region All-jobs (Tincture and Sprint)

makeResourceAbility(ALL_JOBS, "TINCTURE", 1, "cd_TINCTURE", {
	rscType: "TINCTURE",
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	cooldown: 270,
	assetPath: "General/Tincture.png",
	onConfirm: cancelDualcast,
});

makeResourceAbility(ALL_JOBS, "SPRINT", 1, "cd_SPRINT", {
	rscType: "SPRINT",
	applicationDelay: 0.133, // delayed
	cooldown: 60,
	assetPath: "General/Sprint.png",
	onConfirm: cancelDualcast,
});

//#endregion

//#region Limit Breaks

// Tank
TANK_JOBS.forEach((job) => {
	makeResource(job, "SHIELD_WALL", 1, { timeout: 10 });
	makeResource(job, "STRONGHOLD", 1, { timeout: 12 });
});
makeLimitBreak(TANK_JOBS, "SHIELD_WALL", "cd_TANK_LB1", {
	tier: "1",
	applicationDelay: 0.45,
	animationLock: 1.93,
	onApplication: (state) => {
		// Realistically this is only possible if you're fooling around in Explorer mode but still
		Object.keys(LIMIT_BREAK).forEach((rscType) =>
			state.tryConsumeResource(rscType as LimitBreakResourceKey),
		);
		state.gainStatus("SHIELD_WALL");
	},
});
makeLimitBreak(TANK_JOBS, "STRONGHOLD", "cd_TANK_LB2", {
	tier: "2",
	applicationDelay: 0.89,
	animationLock: 3.86,
	onApplication: (state) => {
		Object.keys(LIMIT_BREAK).forEach((rscType) =>
			state.tryConsumeResource(rscType as LimitBreakResourceKey),
		);
		state.gainStatus("STRONGHOLD");
	},
});
TANK_JOBS.forEach((job) => {
	const buff = JOBS[job].limitBreakBuff;
	// Bail out if the limit break hasn't been fully-defined
	if (!(buff && JOBS[job].limitBreak)) {
		return;
	}
	makeResource(job, buff, 1, { timeout: 8 });
	makeLimitBreak(job, JOBS[job].limitBreak, "cd_TANK_LB3", {
		tier: "3",
		applicationDelay: 1.34,
		animationLock: 3.86,
		onApplication: (state) => {
			Object.keys(LIMIT_BREAK).forEach((rscType) =>
				state.tryConsumeResource(rscType as LimitBreakResourceKey),
			);
			state.gainStatus(buff);
		},
	});
});

// Healer
makeLimitBreak(HEALER_JOBS, "HEALING_WIND", "cd_HEALER_LB1", {
	tier: "1",
	castTime: 2,
	applicationDelay: 0.76,
	animationLock: 2.1,
});
makeLimitBreak(HEALER_JOBS, "BREATH_OF_THE_EARTH", "cd_HEALER_LB2", {
	tier: "2",
	castTime: 2,
	applicationDelay: 0.8,
	animationLock: 5.13,
});
HEALER_JOBS.forEach((job) => {
	if (!JOBS[job].limitBreak) {
		return;
	}
	makeLimitBreak(job, JOBS[job].limitBreak, "cd_HEALER_LB3", {
		tier: "3",
		castTime: 2,
		applicationDelay: 0.8,
		animationLock: 8.1,
	});
});

// DPS LB potency isn't directly related to normal job potency, but we do know their potencies relative to each other
// Potencies included here mainly to help visualize whether an LB's damage will take effect before an untargetable window/end of fight
// from: https://www.akhmorning.com/allagan-studies/limit-break/tables/#relative-damage

// Melee
makeLimitBreak(MELEE_JOBS, "BRAVER", "cd_MELEE_LB1", {
	tier: "1",
	castTime: 2,
	applicationDelay: 2.23,
	animationLock: 3.86,
	potency: 1000,
});
makeLimitBreak(MELEE_JOBS, "BLADEDANCE", "cd_MELEE_LB2", {
	tier: "2",
	castTime: 3,
	applicationDelay: 3.28,
	animationLock: 3.86,
	potency: 2200,
});
MELEE_JOBS.forEach((job) => {
	if (!JOBS[job].limitBreak) {
		return;
	}
	makeLimitBreak(job, JOBS[job].limitBreak, "cd_MELEE_LB3", {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 2.26,
		animationLock: 3.7,
		potency: 3500,
	});
});

// Ranged
makeLimitBreak(RANGED_JOBS, "BIGSHOT", "cd_RANGED_LB1", {
	tier: "1",
	castTime: 2,
	applicationDelay: 2.23,
	animationLock: 3.1,
	potency: 540,
});
makeLimitBreak(RANGED_JOBS, "DESPERADO", "cd_RANGED_LB2", {
	tier: "2",
	castTime: 3,
	applicationDelay: 2.49,
	animationLock: 3.1,
	potency: 1170,
});
RANGED_JOBS.forEach((job) => {
	if (!JOBS[job].limitBreak) {
		return;
	}
	makeLimitBreak(job, JOBS[job].limitBreak, "cd_RANGED_LB3", {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 3.16,
		animationLock: 3.7,
		potency: 1890,
	});
});

// Caster
makeLimitBreak(CASTER_JOBS, "SKYSHARD", "cd_CASTER_LB1", {
	tier: "1",
	castTime: 2,
	applicationDelay: 1.64,
	animationLock: 3.1,
	onConfirm: cancelDualcast,
	potency: 600,
});
makeLimitBreak(CASTER_JOBS, "STARSTORM", "cd_CASTER_LB2", {
	tier: "2",
	castTime: 3,
	applicationDelay: 3.75,
	animationLock: 5.1,
	onConfirm: cancelDualcast,
	potency: 1300,
});
CASTER_JOBS.forEach((job) => {
	if (!JOBS[job].limitBreak) {
		return;
	}
	makeLimitBreak(job, JOBS[job].limitBreak, "cd_CASTER_LB3", {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 4.5,
		animationLock: 8.1,
		onConfirm: job === "RDM" ? cancelDualcast : undefined,
		potency: 2100,
	});
});

//#region
