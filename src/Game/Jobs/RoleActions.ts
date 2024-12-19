import {
	TANK_JOBS,
	RANGED_JOBS,
	MELEE_JOBS,
	CASTER_JOBS,
	HEALER_JOBS,
	ALL_JOBS,
	JOBS,
} from "../Constants/Common";
import { SkillName, ResourceType, TraitName, WarningType, TankLBResourceType } from "../Common";
import { makeAbility, makeLimitBreak, makeResourceAbility, makeSpell } from "../Skills";
import { DoTBuff, EventTag, makeResource } from "../Resources";
import type { GameState } from "../GameState";
import { controller } from "../../Controller/Controller";

//#region Helper functions

// Special case for RDM, because for some twelvesforsaken reason sprint/pot cancel dualcast
// And so do limit breaks! :(
const cancelDualcast = (state: GameState) => {
	if (state.job === "RDM" && state.tryConsumeResource(ResourceType.Dualcast)) {
		controller.reportWarning(WarningType.DualcastEaten);
	}
};

//#endregion

//#region Interrupts

makeAbility(TANK_JOBS, SkillName.Interject, 18, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Interject.png",
});

makeAbility(RANGED_JOBS, SkillName.HeadGraze, 24, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Head Graze.png",
});

//#endregion

//#region Enemy-targeted mitigations

TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Reprisal, 1, { timeout: 15 });
});
makeResourceAbility(TANK_JOBS, SkillName.Reprisal, 22, ResourceType.cd_Reprisal, {
	rscType: ResourceType.Reprisal,
	applicationDelay: 0.62,
	cooldown: 60,
	duration: (state) => (state.hasTraitUnlocked(TraitName.EnhancedReprisal) && 15) || 10,
	assetPath: "Role/Reprisal.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Feint, 1, { timeout: 15 });
});
makeResourceAbility(MELEE_JOBS, SkillName.Feint, 22, ResourceType.cd_Feint, {
	rscType: ResourceType.Feint,
	applicationDelay: 0.537,
	cooldown: 90,
	duration: (state) => (state.hasTraitUnlocked(TraitName.EnhancedFeint) && 15) || 10,
	assetPath: "Role/Feint.png",
});

CASTER_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Addle, 1, { timeout: 15 });
});
makeResourceAbility(CASTER_JOBS, SkillName.Addle, 8, ResourceType.cd_Addle, {
	rscType: ResourceType.Addle,
	applicationDelay: 0.621, // delayed
	cooldown: 90,
	duration: (state) => (state.hasTraitUnlocked(TraitName.EnhancedAddle) && 15) || 10,
	assetPath: "Role/Addle.png",
});

//#endregion

//#region Self-targeted utility

TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Rampart, 1, { timeout: 20 });
});
makeResourceAbility(TANK_JOBS, SkillName.Rampart, 8, ResourceType.cd_Rampart, {
	rscType: ResourceType.Rampart,
	applicationDelay: 0.62,
	cooldown: 90,
	assetPath: "Role/Rampart.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.TrueNorth, 1, { timeout: 10 });
});
makeResourceAbility(MELEE_JOBS, SkillName.TrueNorth, 50, ResourceType.cd_TrueNorth, {
	rscType: ResourceType.TrueNorth,
	applicationDelay: 0,
	cooldown: 45,
	maxCharges: 2,
	assetPath: "Role/True North.png",
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.Swiftcast, 1, { timeout: 10 });
});
makeResourceAbility(
	[...HEALER_JOBS, ...CASTER_JOBS],
	SkillName.Swiftcast,
	18,
	ResourceType.cd_Swiftcast,
	{
		rscType: ResourceType.Swiftcast,
		applicationDelay: 0, // instant
		cooldown: 40, // set by trait in constructor
		assetPath: "Role/Swiftcast.png",
	},
);

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.LucidDreaming, 1, { timeout: 21 });
});
makeResourceAbility(
	[...HEALER_JOBS, ...CASTER_JOBS],
	SkillName.LucidDreaming,
	14,
	ResourceType.cd_LucidDreaming,
	{
		rscType: ResourceType.LucidDreaming,
		applicationDelay: 0.623, // delayed
		cooldown: 60,
		assetPath: "Role/Lucid Dreaming.png",
		onApplication: (state, node) => {
			let lucid = state.resources.get(ResourceType.LucidDreaming) as DoTBuff;
			lucid.node = node;
			lucid.tickCount = 0;
			let nextLucidTickEvt = state.findNextQueuedEventByTag(EventTag.LucidTick);
			if (nextLucidTickEvt) {
				nextLucidTickEvt.addTag(EventTag.ManaGain);
			}
		},
	},
);

//#endregion

//#region Anti-knockback

[...TANK_JOBS, ...MELEE_JOBS, ...RANGED_JOBS].forEach((job) => {
	makeResource(job, ResourceType.ArmsLength, 1, { timeout: 6.5 });
});
makeResourceAbility(
	[...TANK_JOBS, ...MELEE_JOBS, ...RANGED_JOBS],
	SkillName.ArmsLength,
	32,
	ResourceType.cd_ArmsLength,
	{
		rscType: ResourceType.ArmsLength,
		applicationDelay: 0.62,
		cooldown: 120,
		assetPath: "Role/Arms Length.png",
	},
);

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.Surecast, 1, { timeout: 6.5 });
});
makeResourceAbility(
	[...HEALER_JOBS, ...CASTER_JOBS],
	SkillName.Surecast,
	44,
	ResourceType.cd_Surecast,
	{
		rscType: ResourceType.Surecast,
		applicationDelay: 0, // surprisingly instant because arms length is not
		cooldown: 120,
		assetPath: "Role/Surecast.png",
	},
);

//#endregion

//#region Self-targeted healing

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Bloodbath, 1, { timeout: 20 });
});
makeResourceAbility(MELEE_JOBS, SkillName.Bloodbath, 8, ResourceType.cd_Bloodbath, {
	rscType: ResourceType.Bloodbath,
	applicationDelay: 0.625,
	cooldown: 90,
	assetPath: "Role/Bloodbath.png",
});

makeAbility([...MELEE_JOBS, ...RANGED_JOBS], SkillName.SecondWind, 12, ResourceType.cd_SecondWind, {
	applicationDelay: 0.625,
	cooldown: 120,
	assetPath: "Role/Second Wind.png",
});

//#endregion

//#region Other-targeted utility

makeAbility(TANK_JOBS, SkillName.Provoke, 15, ResourceType.cd_Provoke, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Provoke.png",
});

makeAbility(TANK_JOBS, SkillName.Shirk, 48, ResourceType.cd_Shirk, {
	applicationDelay: 0,
	cooldown: 120,
	assetPath: "Role/Shirk.png",
});

makeAbility(TANK_JOBS, SkillName.LowBlow, 25, ResourceType.cd_LowBlow, {
	applicationDelay: 0.62,
	cooldown: 25,
	assetPath: "Role/Low Blow.png",
});

makeSpell(HEALER_JOBS, SkillName.Esuna, 10, {
	manaCost: 400,
	castTime: 0,
	applicationDelay: 1.14,
	assetPath: "Role/Esuna.png",
});

makeAbility(HEALER_JOBS, SkillName.Rescue, 48, ResourceType.cd_Rescue, {
	applicationDelay: 0, // Who knows
	cooldown: 120,
	assetPath: "Role/Rescue.png",
});

makeAbility(MELEE_JOBS, SkillName.LegSweep, 10, ResourceType.cd_LegSweep, {
	applicationDelay: 0.625,
	cooldown: 40,
	assetPath: "Role/Leg Sweep.png",
});

//#endregion

//#region All-jobs (Tincture and Sprint)

makeResourceAbility(ALL_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	rscType: ResourceType.Tincture,
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	cooldown: 270,
	assetPath: "Role/Tincture.png",
	onConfirm: cancelDualcast,
});

makeResourceAbility(ALL_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	rscType: ResourceType.Sprint,
	applicationDelay: 0.133, // delayed
	cooldown: 60,
	assetPath: "General/Sprint.png",
	onConfirm: cancelDualcast,
});

//#endregion

//#region Limit Breaks

// Tank
TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.ShieldWall, 1, { timeout: 10 });
	makeResource(job, ResourceType.Stronghold, 1, { timeout: 12 });
});
makeLimitBreak(TANK_JOBS, SkillName.ShieldWall, ResourceType.cd_TankLB1, {
	tier: "1",
	applicationDelay: 0.45,
	animationLock: 1.93,
	onApplication: (state) => {
		// Realistically this is only possible if you're fooling around in Explorer mode but still
		Object.values(TankLBResourceType).forEach((rscType) => state.tryConsumeResource(rscType));
		state.gainStatus(ResourceType.ShieldWall);
	},
});
makeLimitBreak(TANK_JOBS, SkillName.Stronghold, ResourceType.cd_TankLB2, {
	tier: "2",
	applicationDelay: 0.89,
	animationLock: 3.86,
	onApplication: (state) => {
		Object.values(TankLBResourceType).forEach((rscType) => state.tryConsumeResource(rscType));
		state.gainStatus(ResourceType.Stronghold);
	},
});
TANK_JOBS.forEach((job) => {
	const buff = JOBS[job].limitBreakBuff;
	// Bail out if the limit break hasn't been fully-defined
	if (!(buff && JOBS[job].limitBreak)) {
		return;
	}
	makeResource(job, buff, 1, { timeout: 8 });
	makeLimitBreak(job, JOBS[job].limitBreak, ResourceType.cd_TankLB3, {
		tier: "3",
		applicationDelay: 1.34,
		animationLock: 3.86,
		onApplication: (state) => {
			Object.values(TankLBResourceType).forEach((rscType) =>
				state.tryConsumeResource(rscType),
			);
			state.gainStatus(buff);
		},
	});
});

// Healer
makeLimitBreak(HEALER_JOBS, SkillName.HealingWind, ResourceType.cd_HealerLB1, {
	tier: "1",
	castTime: 2,
	applicationDelay: 0.76,
	animationLock: 2.1,
});
makeLimitBreak(HEALER_JOBS, SkillName.BreathOfTheEarth, ResourceType.cd_HealerLB2, {
	tier: "2",
	castTime: 2,
	applicationDelay: 0.8,
	animationLock: 5.13,
});
HEALER_JOBS.forEach((job) => {
	if (!JOBS[job].limitBreak) {
		return;
	}
	makeLimitBreak(job, JOBS[job].limitBreak, ResourceType.cd_HealerLB3, {
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
makeLimitBreak(MELEE_JOBS, SkillName.Braver, ResourceType.cd_MeleeLB1, {
	tier: "1",
	castTime: 2,
	applicationDelay: 2.23,
	animationLock: 3.86,
	potency: 1000,
});
makeLimitBreak(MELEE_JOBS, SkillName.Bladedance, ResourceType.cd_MeleeLB2, {
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
	makeLimitBreak(job, JOBS[job].limitBreak, ResourceType.cd_MeleeLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 2.26,
		animationLock: 3.7,
		potency: 3500,
	});
});

// Ranged
makeLimitBreak(RANGED_JOBS, SkillName.BigShot, ResourceType.cd_RangedLB1, {
	tier: "1",
	castTime: 2,
	applicationDelay: 2.23,
	animationLock: 3.1,
	potency: 540,
});
makeLimitBreak(RANGED_JOBS, SkillName.Desperado, ResourceType.cd_RangedLB2, {
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
	makeLimitBreak(job, JOBS[job].limitBreak, ResourceType.cd_RangedLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 3.16,
		animationLock: 3.7,
		potency: 1890,
	});
});

// Caster
makeLimitBreak(CASTER_JOBS, SkillName.Skyshard, ResourceType.cd_CasterLB1, {
	tier: "1",
	castTime: 2,
	applicationDelay: 1.64,
	animationLock: 3.1,
	onConfirm: cancelDualcast,
	potency: 600,
});
makeLimitBreak(CASTER_JOBS, SkillName.Starstorm, ResourceType.cd_CasterLB2, {
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
	makeLimitBreak(job, JOBS[job].limitBreak, ResourceType.cd_CasterLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 4.5,
		animationLock: 8.1,
		onConfirm: job === "RDM" ? cancelDualcast : undefined,
		potency: 2100,
	});
});

//#region
