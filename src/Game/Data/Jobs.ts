import { ReactNode } from "react";
import { localize } from "../../Components/Localization";
import { ensureRecord } from "../../Utilities/ensureRecord";
import { LimitBreakSkillName, ResourceType } from "../Common";

/**
 * Description of how well supported a job is:
 * - Unimplemented: Not selectable in the UI, not currently supported
 * - Outdated: Significant changes to this job have not yet been re-implemented
 *             This will mainly occur around expansion times, or if a job gets
 *             a mid-expac rework like Endwalker Paladin
 * - Testing: Recently implemented or updated from being outdated. May be buggy
 * - Live: Well tested and good for prime time
 */
export interface ImplementationDetails {
	label?: ReactNode;
}
export const IMPLEMENTATION_LEVELS = ensureRecord<ImplementationDetails>()({
	UNIMPLEMENTED: {},
	OUTDATED: {
		label: localize({ en: "Outdated" }),
	},
	TESTING: {
		label: localize({ en: "Testing", zh: "测试中" }),
	},
	LIVE: {},
});
export type ImplementationType = typeof IMPLEMENTATION_LEVELS;
export type ImplementationKey = keyof ImplementationType;

export interface Role {
	label: ReactNode;
}
export const ROLES = ensureRecord<Role>()({
	TANK: {
		label: localize({ en: "Tank" }),
	},
	HEALER: {
		label: localize({ en: "Healer" }),
	},
	MELEE: {
		label: localize({ en: "Melee" }),
	},
	RANGED: {
		label: localize({ en: "Ranged" }),
	},
	CASTER: {
		label: localize({ en: "Caster" }),
	},
});
export type RoleType = typeof ROLES;
export type RoleKey = keyof RoleType;

export interface Job {
	role: RoleKey;
	implementationLevel: ImplementationKey;
	speedStat: "sks" | "sps";
	usesMp?: boolean;
	limitBreak?: LimitBreakSkillName;
	limitBreakBuff?: ResourceType;
}

// jobs are in the order they appear in the job guide
export const TANKS = ensureRecord<Job>()({
	PLD: {
		role: "TANK",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		usesMp: true,
		limitBreak: LimitBreakSkillName.LastBastion,
		limitBreakBuff: ResourceType.LastBastion,
	},
	WAR: {
		role: "TANK",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.LandWaker,
		limitBreakBuff: ResourceType.LandWaker,
	},
	DRK: {
		role: "TANK",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		usesMp: true,
		limitBreak: LimitBreakSkillName.DarkForce,
		limitBreakBuff: ResourceType.DarkForce,
	},
	GNB: {
		role: "TANK",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.GunmetalSoul,
		limitBreakBuff: ResourceType.GunmetalSoul,
	},
});
export type Tanks = typeof TANKS;
export type TankKey = keyof Tanks;

export const HEALERS = ensureRecord<Job>()({
	WHM: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.PulseOfLife,
	},
	SCH: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.AngelFeathers,
	},
	AST: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.AstralStasis,
	},
	SGE: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.TechneMakre,
	},
});
export type Healers = typeof HEALERS;
export type HealerKey = keyof Healers;

export const MELEE = ensureRecord<Job>()({
	MNK: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.FinalHeaven,
	},
	DRG: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.DragonsongDive,
	},
	NIN: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.Chimatsuri,
	},
	SAM: {
		role: "MELEE",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.DoomOfTheLiving,
	},
	RPR: {
		role: "MELEE",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.TheEnd,
	},
	VPR: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.WorldSwallower,
	},
});
export type Melee = typeof MELEE;
export type MeleeKey = keyof Melee;

export const RANGED = ensureRecord<Job>()({
	BRD: {
		role: "RANGED",
		implementationLevel: "TESTING",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.SagittariusArrow,
	},
	MCH: {
		role: "RANGED",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.SatelliteBeam,
	},
	DNC: {
		role: "RANGED",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: LimitBreakSkillName.CrimsonLotus,
	},
});
export type Ranged = typeof RANGED;
export type RangedKey = keyof Ranged;

export const CASTERS = ensureRecord<Job>()({
	BLM: {
		role: "CASTER",
		implementationLevel: "LIVE",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.Meteor,
	},
	SMN: {
		role: "CASTER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.Teraflare,
	},
	RDM: {
		role: "CASTER",
		implementationLevel: "LIVE",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.VermillionScourge,
	},
	PCT: {
		role: "CASTER",
		implementationLevel: "LIVE",
		speedStat: "sps",
		usesMp: true,
		limitBreak: LimitBreakSkillName.ChromaticFantasy,
	},
});
export type Casters = typeof CASTERS;
export type CasterKey = keyof Casters;

export const JOBS = {
	...TANKS,
	...HEALERS,
	...MELEE,
	...RANGED,
	...CASTERS,
};

export type JobType = typeof JOBS;
export type ShellJob = keyof JobType;

export const ALL_JOBS: ShellJob[] = Object.keys(JOBS) as ShellJob[];

export const TANK_JOBS: ShellJob[] = Object.keys(TANKS) as ShellJob[];
export const HEALER_JOBS: ShellJob[] = Object.keys(HEALERS) as ShellJob[];
export const MELEE_JOBS: ShellJob[] = Object.keys(MELEE) as ShellJob[];
export const RANGED_JOBS: ShellJob[] = Object.keys(RANGED) as ShellJob[];
export const CASTER_JOBS: ShellJob[] = Object.keys(CASTERS) as ShellJob[];
