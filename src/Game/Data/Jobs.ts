import { ReactNode } from "react";
import { localize } from "../../Components/Localization";
import { ensureRecord } from "../../Utilities/ensureRecord";
import { LimitBreak3ActionKey, TankLimitBreak3ResourceKey } from "./Shared/LimitBreak";

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
	limitBreak?: LimitBreak3ActionKey; // Enforce actually specifying an LB3 action
	limitBreakBuff?: TankLimitBreak3ResourceKey; // Only Tank LBs have a buff at the moment, so limit it to those
}

// jobs are in the order they appear in the job guide
export const TANKS = ensureRecord<Job>()({
	PLD: {
		role: "TANK",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		usesMp: true,
		limitBreak: "LAST_BASTION",
		limitBreakBuff: "LAST_BASTION",
	},
	WAR: {
		role: "TANK",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: "LAND_WAKER",
		limitBreakBuff: "LAND_WAKER",
	},
	DRK: {
		role: "TANK",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		usesMp: true,
		limitBreak: "DARK_FORCE",
		limitBreakBuff: "DARK_FORCE",
	},
	GNB: {
		role: "TANK",
		implementationLevel: "TESTING",
		speedStat: "sks",
		limitBreak: "GUNMETAL_SOUL",
		limitBreakBuff: "GUNMETAL_SOUL",
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
		limitBreak: "PULSE_OF_LIFE",
	},
	SCH: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "ANGEL_FEATHERS",
	},
	AST: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "ASTRAL_STASIS",
	},
	SGE: {
		role: "HEALER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "TECHNE_MAKRE",
	},
});
export type Healers = typeof HEALERS;
export type HealerKey = keyof Healers;

export const MELEE = ensureRecord<Job>()({
	MNK: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: "FINAL_HEAVEN",
	},
	DRG: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: "DRAGONSONG_DIVE",
	},
	NIN: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: "CHIMATSURI",
	},
	SAM: {
		role: "MELEE",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: "DOOM_OF_THE_LIVING",
	},
	RPR: {
		role: "MELEE",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: "THE_END",
	},
	VPR: {
		role: "MELEE",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sks",
		limitBreak: "WORLD_SWALLOWER",
	},
});
export type Melee = typeof MELEE;
export type MeleeKey = keyof Melee;

export const RANGED = ensureRecord<Job>()({
	BRD: {
		role: "RANGED",
		implementationLevel: "TESTING",
		speedStat: "sks",
		limitBreak: "SAGITTARIUS_ARROW",
	},
	MCH: {
		role: "RANGED",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: "SATELLITE_BEAM",
	},
	DNC: {
		role: "RANGED",
		implementationLevel: "LIVE",
		speedStat: "sks",
		limitBreak: "CRIMSON_LOTUS",
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
		limitBreak: "METEOR",
	},
	SMN: {
		role: "CASTER",
		implementationLevel: "UNIMPLEMENTED",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "TERAFLARE",
	},
	RDM: {
		role: "CASTER",
		implementationLevel: "LIVE",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "VERMILLION_SCOURGE",
	},
	PCT: {
		role: "CASTER",
		implementationLevel: "LIVE",
		speedStat: "sps",
		usesMp: true,
		limitBreak: "CHROMATIC_FANTASY",
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
