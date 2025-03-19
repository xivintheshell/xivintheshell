import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const ROLE_ACTIONS = ensureRecord<ActionData>()({
	ARMS_LENGTH: { name: "Arm's Length", label: { zh: "亲疏自行" } }, // Tanks, Melee, Phys Ranged

	SECOND_WIND: { name: "Second Wind", label: { zh: "内丹" } }, // Melee & Phys Ranged

	HEAD_GRAZE: { name: "Head Graze", label: { zh: "伤头" } }, // Phys Ranged. Not bothering with Leg/Foot Graze at this point

	ESUNA: { name: "Esuna", label: { zh: "康复" } },
	RESCUE: { name: "Rescue", label: { zh: "营救" } },

	ADDLE: { name: "Addle", label: { zh: "病毒", ja: "アドル" } },
	SWIFTCAST: { name: "Swiftcast", label: { zh: "即刻咏唱", ja: "迅速魔" } },
	LUCID_DREAMING: {
		name: "Lucid Dreaming",
		label: { zh: "醒梦", ja: "ルーシッドドリーム" },
	},
	SURECAST: { name: "Surecast", label: { zh: "沉稳咏唱", ja: "堅実魔" } },

	FEINT: { name: "Feint", label: { zh: "牵制" } },
	BLOODBATH: { name: "Bloodbath", label: { zh: "浴血" } },
	TRUE_NORTH: { name: "True North", label: { zh: "真北" } },
	LEG_SWEEP: { name: "Leg Sweep", label: { zh: "扫腿" } },

	RAMPART: { name: "Rampart", label: { zh: "铁壁" } },
	REPRISAL: { name: "Reprisal", label: { zh: "雪仇" } },
	LOW_BLOW: { name: "Low Blow", label: { zh: "下踢" } },
	INTERJECT: { name: "Interject", label: { zh: "插言" } },
	PROVOKE: { name: "Provoke", label: { zh: "挑衅" } },
	SHIRK: { name: "Shirk", label: { zh: "退避" } },
});

export const ROLE_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_ADDLE: { name: "cd_Addle" }, // [0, 1x]
	cd_SWIFTCAST: { name: "cd_Swiftcast" }, // [0, 1x]
	cd_LUCID_DREAMING: { name: "cd_LucidDreaming" }, // [0, 1x]
	cd_SURECAST: { name: "cd_Surecast" }, // [0, 1x]
	cd_SECOND_WIND: { name: "cd_SecondWind" },
	cd_ARMS_LENGTH: { name: "cd_ArmsLength" },

	cd_RESCUE: { name: "cd_Rescue" },

	cd_FEINT: { name: "cd_Feint" },
	cd_TRUE_NORTH: { name: "cd_TrueNorth" },
	cd_BLOODBATH: { name: "cd_Bloodbath" },
	cd_LEG_SWEEP: { name: "cd_LegSweep" },

	cd_RAMPART: { name: "cd_Rampart" },
	cd_REPRISAL: { name: "cd_Reprisal" },
	cd_LOW_BLOW: { name: "cd_LowBlow" },
	cd_INTERJECT: { name: "cd_Interject" },
	cd_PROVOKE: { name: "cd_Provoke" },
	cd_SHIRK: { name: "cd_Shirk" },

	cd_HEAD_GRAZE: { name: "cd_HeadGraze" },
});

// There are not currently any role-specific gauge-like resources to track

export const ROLE_STATUSES = ensureRecord<ResourceData>()({
	ADDLE: { name: "Addle", label: { zh: "昏乱" } }, // [0, 1]
	SWIFTCAST: { name: "Swiftcast", label: { zh: "即刻咏唱" } }, // [0, 1]
	LUCID_DREAMING: { name: "Lucid Dreaming", label: { zh: "醒梦" } }, // [0, 1] also just for timing display
	SURECAST: { name: "Surecast", label: { zh: "沉稳咏唱" } }, // [0, 1]
	ARMS_LENGTH: { name: "Arms Length", label: { zh: "亲疏自行" } },

	FEINT: { name: "Feint", label: { zh: "牵制" } }, // [0, 1]
	TRUE_NORTH: { name: "True North", label: { zh: "真北" } }, // [0, 1]
	BLOODBATH: { name: "Bloodbath", label: { zh: "浴血" } }, // [0, 1]

	RAMPART: { name: "Rampart", label: { zh: "铁壁buff" } }, // [0, 1]
	REPRISAL: { name: "Reprisal", label: { zh: "雪仇buff" } }, // [0, 1]
});

export const ROLE_TRACKERS = ensureRecord<ResourceData>()({
	REAR_POSITIONAL: {
		name: "Rear Positional",
		label: { zh: "身位加成（后）" },
		mayBeToggled: true,
	}, // [0, 1]
	FLANK_POSITIONAL: {
		name: "Flank Positional",
		label: { zh: "身位加成（侧）" },
		mayBeToggled: true,
	}, // [0, 1]
});

export const ROLE_TRAITS = ensureRecord<TraitData>()({
	ENHANCED_SWIFTCAST: { name: "Enhanced Swiftcast", level: 94 },
	ENHANCED_ADDLE: { name: "Enhanced Addle", level: 98 },

	MAGICK_MASTERY_HEALER: { name: "Magick_Mastery", level: 94 },

	ENHANCED_SECOND_WIND: { name: "Enhanced Second Wind", level: 94 },
	ENHANCED_FEINT: { name: "Enhanced Feint", level: 98 },

	MELEE_MASTERY_TANK: { name: "Melee Mastery", level: 84 },
	ENHANCED_RAMPART: { name: "Enhanced Rampart", level: 94 },
	MELEE_MASTERY_II_TANK: { name: "Melee Mastery II", level: 94 },
	ENHANCED_REPRISAL: { name: "Enhanced Reprisal", level: 98 },
});

export type RoleActions = typeof ROLE_ACTIONS;
export type RoleActionKey = keyof RoleActions;

export type RoleCooldowns = typeof ROLE_COOLDOWNS;
export type RoleCooldownKey = keyof RoleCooldowns;

export type RoleStatuses = typeof ROLE_STATUSES;
export type RoleStatusKey = keyof RoleStatuses;

export type RoleTrackers = typeof ROLE_TRACKERS;
export type RoleTrackerKey = keyof RoleTrackers;

export const ROLE_RESOURCES = {
	...ROLE_STATUSES,
	...ROLE_TRACKERS,
};
export type RoleResources = typeof ROLE_RESOURCES;
export type RoleResourceKey = keyof RoleResources;

export type RoleTraits = typeof ROLE_TRAITS;
export type RoleTraitKey = keyof RoleTraits;
