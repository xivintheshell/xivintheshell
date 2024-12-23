import {
	ALL_JOBS,
	CASTER_JOBS,
	HEALER_JOBS,
	MELEE_JOBS,
	PHYSICAL_RANGED_JOBS,
	ShellJob,
	TANK_JOBS,
} from "../../Controller/Common";
import { SkillName, ResourceType, TraitName, WarningType, TankLBResourceType } from "../Common";
import {
	combineEffects,
	makeAbility,
	makeLimitBreak,
	makeResourceAbility,
	makeSpell,
} from "../Skills";
import { DoTBuff, EventTag, makeResource } from "../Resources";
import type { GameState } from "../GameState";
import { controller } from "../../Controller/Controller";
import { SAMState } from "./SAM";
import { DNCState } from "./DNC";
import { MCHState } from "./MCH";

//#region Helper functions

// Special case for RDM, because for some twelvesforsaken reason sprint/pot cancel dualcast
// And so do limit breaks! :(
const cancelDualcast = (state: GameState) => {
	if (state.job === ShellJob.RDM && state.tryConsumeResource(ResourceType.Dualcast)) {
		controller.reportWarning(WarningType.DualcastEaten);
	}
};

// Special case for SAM, since all actions should cancel meditate
const cancelMeditate = (state: GameState) => {
	if (state.job === ShellJob.SAM) {
		(state as SAMState).cancelMeditate();
	}
};

// All actions cancel Improvisation
const cancelImprovisation = (state: GameState) => {
	if (state.job === ShellJob.DNC) {
		(state as DNCState).cancelImprovisation();
	}
};

const cancelFlamethrower = (state: GameState) => {
	if (state.job === ShellJob.MCH) {
		(state as MCHState).tryConsumeResource(ResourceType.Flamethrower);
	}
};

//#endregion

//#region Interrupts

makeAbility(TANK_JOBS, SkillName.Interject, 18, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Interject.png",
});

makeAbility(PHYSICAL_RANGED_JOBS, SkillName.HeadGraze, 24, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Head Graze.png",
	onExecute: cancelImprovisation,
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
	onExecute: cancelMeditate,
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
	onExecute: cancelMeditate,
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

[...TANK_JOBS, ...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS].forEach((job) => {
	makeResource(job, ResourceType.ArmsLength, 1, { timeout: 6.5 });
});
makeResourceAbility(
	[...TANK_JOBS, ...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS],
	SkillName.ArmsLength,
	32,
	ResourceType.cd_ArmsLength,
	{
		rscType: ResourceType.ArmsLength,
		applicationDelay: 0.62,
		cooldown: 120,
		assetPath: "Role/Arms Length.png",
		onExecute: combineEffects(cancelMeditate, cancelImprovisation, cancelFlamethrower),
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
	onExecute: cancelMeditate,
});

makeAbility(
	[...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS],
	SkillName.SecondWind,
	12,
	ResourceType.cd_SecondWind,
	{
		applicationDelay: 0.625,
		cooldown: 120,
		assetPath: "Role/Second Wind.png",
		onExecute: combineEffects(cancelMeditate, cancelImprovisation, cancelFlamethrower),
	},
);

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
	onExecute: cancelMeditate,
});

//#endregion

//#region All-jobs (Tincture and Sprint)

makeResourceAbility(ALL_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	rscType: ResourceType.Tincture,
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	cooldown: 270,
	assetPath: "Role/Tincture.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation, cancelFlamethrower),
	onConfirm: cancelDualcast,
});

makeResourceAbility(ALL_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	rscType: ResourceType.Sprint,
	applicationDelay: 0.133, // delayed
	cooldown: 60,
	assetPath: "General/Sprint.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation, cancelFlamethrower),
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
const tankLB3s = [
	{ job: ShellJob.PLD, skill: SkillName.LastBastion, buff: ResourceType.LastBastion },
	{ job: ShellJob.WAR, skill: SkillName.LandWaker, buff: ResourceType.LandWaker },
	{ job: ShellJob.DRK, skill: SkillName.DarkForce, buff: ResourceType.DarkForce },
	{ job: ShellJob.GNB, skill: SkillName.GunmetalSoul, buff: ResourceType.GunmetalSoul },
];
tankLB3s.forEach((params) => {
	if (!TANK_JOBS.includes(params.job)) {
		return;
	} // Bail if it's not a defined job
	makeResource(params.job, params.buff, 1, { timeout: 8 });
	makeLimitBreak(params.job, params.skill, ResourceType.cd_TankLB3, {
		tier: "3",
		applicationDelay: 1.34,
		animationLock: 3.86,
		onApplication: (state) => {
			Object.values(TankLBResourceType).forEach((rscType) =>
				state.tryConsumeResource(rscType),
			);
			state.gainStatus(params.buff);
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
const healerLB3s = [
	{ job: ShellJob.WHM, skill: SkillName.PulseOfLife },
	{ job: ShellJob.SCH, skill: SkillName.AngelFeathers },
	{ job: ShellJob.AST, skill: SkillName.AstralStasis },
	{ job: ShellJob.SGE, skill: SkillName.TechneMakre },
];
healerLB3s.forEach((params) => {
	if (!HEALER_JOBS.includes(params.job)) {
		return;
	} // Bail if it's not a defined job
	makeLimitBreak(params.job, params.skill, ResourceType.cd_HealerLB3, {
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
	onExecute: cancelMeditate,
	potency: 1000,
});
makeLimitBreak(MELEE_JOBS, SkillName.Bladedance, ResourceType.cd_MeleeLB2, {
	tier: "2",
	castTime: 3,
	applicationDelay: 3.28,
	animationLock: 3.86,
	onExecute: cancelMeditate,
	potency: 2200,
});
const meleeLB3s = [
	{ job: ShellJob.MNK, skill: SkillName.FinalHeaven },
	{ job: ShellJob.DRG, skill: SkillName.DragonsongDive },
	{ job: ShellJob.NIN, skill: SkillName.Chimatsuri },
	{ job: ShellJob.SAM, skill: SkillName.DoomOfTheLiving },
	{ job: ShellJob.RPR, skill: SkillName.TheEnd },
	{ job: ShellJob.VPR, skill: SkillName.WorldSwallower },
];
meleeLB3s.forEach((params) => {
	if (!MELEE_JOBS.includes(params.job)) {
		return;
	} // Bail if it's not a defined job
	makeLimitBreak(params.job, params.skill, ResourceType.cd_MeleeLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 2.26,
		animationLock: 3.7,
		onExecute: params.job === ShellJob.SAM ? cancelMeditate : undefined,
		potency: 3500,
	});
});

// Ranged
makeLimitBreak(PHYSICAL_RANGED_JOBS, SkillName.BigShot, ResourceType.cd_RangedLB1, {
	tier: "1",
	castTime: 2,
	applicationDelay: 2.23,
	animationLock: 3.1,
	onExecute: combineEffects(cancelImprovisation, cancelFlamethrower),
	potency: 540,
});
makeLimitBreak(PHYSICAL_RANGED_JOBS, SkillName.Desperado, ResourceType.cd_RangedLB2, {
	tier: "2",
	castTime: 3,
	applicationDelay: 2.49,
	animationLock: 3.1,
	onExecute: combineEffects(cancelImprovisation, cancelFlamethrower),
	potency: 1170,
});
const rangedLB3s = [
	{ job: ShellJob.BRD, skill: SkillName.SagittariusArrow },
	{ job: ShellJob.MCH, skill: SkillName.SatelliteBeam },
	{ job: ShellJob.DNC, skill: SkillName.CrimsonLotus },
];
rangedLB3s.forEach((params) => {
	if (!PHYSICAL_RANGED_JOBS.includes(params.job)) {
		return;
	} // Bail if it's not a defined job
	makeLimitBreak(params.job, params.skill, ResourceType.cd_RangedLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 3.16,
		animationLock: 3.7,
		onExecute: combineEffects(cancelImprovisation, cancelFlamethrower),
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
const casterLB3s = [
	{ job: ShellJob.BLM, skill: SkillName.Meteor },
	{ job: ShellJob.SMN, skill: SkillName.Teraflare },
	{ job: ShellJob.RDM, skill: SkillName.VermillionScourge },
	{ job: ShellJob.PCT, skill: SkillName.ChromaticFantasy },
];
casterLB3s.forEach((params) => {
	if (!CASTER_JOBS.includes(params.job)) {
		return;
	} // Bail if it's not a defined job
	makeLimitBreak(params.job, params.skill, ResourceType.cd_CasterLB3, {
		tier: "3",
		castTime: 4.5,
		applicationDelay: 4.5,
		animationLock: 8.1,
		onConfirm: params.job === ShellJob.RDM ? cancelDualcast : undefined,
		potency: 2100,
	});
});

//#region
