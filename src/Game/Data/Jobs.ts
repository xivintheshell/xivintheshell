import { ReactNode } from "react";
import { localize, LocalizedContent } from "../../Components/Localization";
import { ensureRecord } from "../../utilities";
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
	label?: LocalizedContent;
	warningContent?: LocalizedContent;
}
export const IMPLEMENTATION_LEVELS = ensureRecord<ImplementationDetails>()({
	UNIMPLEMENTED: {},
	OUTDATED: {
		label: { en: "Outdated", zh: "待更新" },
		warningContent: {
			en: "WARNING: This job recently had significant changes, and may not have been fully updated to reflect them. Exported plans may not load correctly following these changes, so be cautious about relying on them until the job has been fully updated.",
			zh: "警告：此职业最近经历的技改还未被完整实现到排轴器中。当前排轴器的此职业可能有bug，或在近期经历更新，所以暂时不要太依赖txt，记得勤在别处保存排轴进度。",
		},
	},
	TESTING: {
		label: { en: "Testing", zh: "测试中" },
		warningContent: {
			en: "WARNING: This job was recently added to XIV in the Shell and is still being tested. There may be bugs or changes in the near future, so make sure to frequently export and save timelines for this job to make sure you don't lose your work.",
			zh: "警告：此职业刚被实现没多久，可能还不是很稳定，目前暂时不要太依赖txt文件，记得勤在别处保存进度。",
		},
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
	LIMITED: {
		label: localize({ en: "Limited" }),
	},
});
export type RoleType = typeof ROLES;
export type RoleKey = keyof RoleType;

export interface Job {
	role: RoleKey;
	implementationLevel: ImplementationKey;
	usesMp?: boolean;
	limitBreak?: LimitBreak3ActionKey; // Enforce actually specifying an LB3 action
	limitBreakBuff?: TankLimitBreak3ResourceKey; // Only Tank LBs have a buff at the moment, so limit it to those
	mainStat: "strength" | "dexterity" | "intelligence" | "mind";
	zh: string; // Localized CN name
}

// jobs are in the order they appear in the job guide
export const TANKS = ensureRecord<Job>()({
	PLD: {
		role: "TANK",
		implementationLevel: "TESTING",
		usesMp: true,
		limitBreak: "LAST_BASTION",
		limitBreakBuff: "LAST_BASTION",
		mainStat: "strength",
		zh: "骑士",
	},
	WAR: {
		role: "TANK",
		implementationLevel: "LIVE",
		limitBreak: "LAND_WAKER",
		limitBreakBuff: "LAND_WAKER",
		mainStat: "strength",
		zh: "战士",
	},
	DRK: {
		role: "TANK",
		implementationLevel: "LIVE",
		usesMp: true,
		limitBreak: "DARK_FORCE",
		limitBreakBuff: "DARK_FORCE",
		mainStat: "strength",
		zh: "暗黑骑士",
	},
	GNB: {
		role: "TANK",
		implementationLevel: "LIVE",
		limitBreak: "GUNMETAL_SOUL",
		limitBreakBuff: "GUNMETAL_SOUL",
		mainStat: "strength",
		zh: "绝枪战士",
	},
});
export type Tanks = typeof TANKS;
export type TankKey = keyof Tanks;

export const HEALERS = ensureRecord<Job>()({
	WHM: {
		role: "HEALER",
		implementationLevel: "TESTING",
		usesMp: true,
		limitBreak: "PULSE_OF_LIFE",
		mainStat: "mind",
		zh: "白魔法师",
	},
	SCH: {
		role: "HEALER",
		implementationLevel: "TESTING",
		usesMp: true,
		limitBreak: "ANGEL_FEATHERS",
		mainStat: "mind",
		zh: "学者",
	},
	AST: {
		role: "HEALER",
		implementationLevel: "TESTING",
		usesMp: true,
		limitBreak: "ASTRAL_STASIS",
		mainStat: "mind",
		zh: "占星术士",
	},
	SGE: {
		role: "HEALER",
		implementationLevel: "TESTING",
		usesMp: true,
		limitBreak: "TECHNE_MAKRE",
		mainStat: "mind",
		zh: "贤者",
	},
});
export type Healers = typeof HEALERS;
export type HealerKey = keyof Healers;

export const MELEE = ensureRecord<Job>()({
	MNK: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "FINAL_HEAVEN",
		mainStat: "strength",
		zh: "武僧",
	},
	DRG: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "DRAGONSONG_DIVE",
		mainStat: "strength",
		zh: "龙骑士",
	},
	NIN: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "CHIMATSURI",
		mainStat: "dexterity",
		zh: "忍者",
	},
	SAM: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "DOOM_OF_THE_LIVING",
		mainStat: "strength",
		zh: "武士",
	},
	RPR: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "THE_END",
		mainStat: "strength",
		zh: "钐镰客",
	},
	VPR: {
		role: "MELEE",
		implementationLevel: "LIVE",
		limitBreak: "WORLD_SWALLOWER",
		mainStat: "dexterity",
		zh: "蝰蛇剑士",
	},
});
export type Melee = typeof MELEE;
export type MeleeKey = keyof Melee;

export const RANGED = ensureRecord<Job>()({
	BRD: {
		role: "RANGED",
		implementationLevel: "LIVE",
		limitBreak: "SAGITTARIUS_ARROW",
		mainStat: "dexterity",
		zh: "吟游诗人",
	},
	MCH: {
		role: "RANGED",
		implementationLevel: "LIVE",
		limitBreak: "SATELLITE_BEAM",
		mainStat: "dexterity",
		zh: "机工士",
	},
	DNC: {
		role: "RANGED",
		implementationLevel: "LIVE",
		limitBreak: "CRIMSON_LOTUS",
		mainStat: "dexterity",
		zh: "舞者",
	},
});
export type Ranged = typeof RANGED;
export type RangedKey = keyof Ranged;

export const CASTERS = ensureRecord<Job>()({
	BLM: {
		role: "CASTER",
		implementationLevel: "LIVE",
		usesMp: true,
		limitBreak: "METEOR",
		mainStat: "intelligence",
		zh: "黑魔法师",
	},
	SMN: {
		role: "CASTER",
		implementationLevel: "LIVE",
		usesMp: true,
		limitBreak: "TERAFLARE",
		mainStat: "intelligence",
		zh: "召唤师",
	},
	RDM: {
		role: "CASTER",
		implementationLevel: "LIVE",
		usesMp: true,
		limitBreak: "VERMILLION_SCOURGE",
		mainStat: "intelligence",
		zh: "赤魔法师",
	},
	PCT: {
		role: "CASTER",
		implementationLevel: "LIVE",
		usesMp: true,
		limitBreak: "CHROMATIC_FANTASY",
		mainStat: "intelligence",
		zh: "绘灵法师",
	},
});
export const LIMITED = ensureRecord<Job>()({
	BLU: {
		role: "LIMITED",
		implementationLevel: "TESTING",
		usesMp: true,
		mainStat: "intelligence",
		zh: "青魔法师",
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
	...LIMITED,
	// When no jobs use the "UNIMPLEMENTED" status, a line in PlaybackControl starts complaining.
	// I [sz] am too lazy to figure out how to properly work around type inference here, so this
	// sentinel job will be forever unimplemented to force proper inference on the implementationLevel field.
	...ensureRecord<Job>()({
		NEVER: {
			role: "LIMITED",
			implementationLevel: "UNIMPLEMENTED",
			usesMp: false,
			mainStat: "strength",
			zh: "未知",
		},
	}),
};

export type JobType = typeof JOBS;
export type ShellJob = keyof JobType;

export const ALL_JOBS: ShellJob[] = Object.keys(JOBS) as ShellJob[];

export const TANK_JOBS: ShellJob[] = Object.keys(TANKS) as ShellJob[];
export const HEALER_JOBS: ShellJob[] = Object.keys(HEALERS) as ShellJob[];
export const MELEE_JOBS: ShellJob[] = Object.keys(MELEE) as ShellJob[];
export const RANGED_JOBS: ShellJob[] = Object.keys(RANGED) as ShellJob[];
export const CASTER_JOBS: ShellJob[] = Object.keys(CASTERS) as ShellJob[];
export const LIMITED_JOBS: ShellJob[] = Object.keys(LIMITED) as ShellJob[];
