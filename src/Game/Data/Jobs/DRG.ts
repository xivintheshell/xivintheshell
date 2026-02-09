import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DRG_ACTIONS = ensureRecord<ActionData>()({
	PIERCING_TALON: { id: 90, name: "Piercing Talon", label: { zh: "Piercing Talon" } },
	TRUE_THRUST: { id: 75, name: "True Thrust", label: { zh: "精准刺" } },
	RAIDEN_THRUST: { id: 16479, name: "Raiden Thrust", label: { zh: "龙眼雷电" } },

	DISEMBOWEL: { id: 87, name: "Disembowel", label: { zh: "开膛枪" } },
	SPIRAL_BLOW: { id: 36955, name: "Spiral Blow", label: { zh: "螺旋击" } },
	CHAOS_THRUST: { id: 88, name: "Chaos Thrust", label: { zh: "樱花怒放" } },
	CHAOTIC_SPRING: { id: 25772, name: "Chaotic Spring", label: { zh: "樱花缭乱" } },
	WHEELING_THRUST: { id: 3556, name: "Wheeling Thrust", label: { zh: "龙尾大回旋" } },

	VORPAL_THRUST: { id: 78, name: "Vorpal Thrust", label: { zh: "贯通刺" } },
	LANCE_BARRAGE: { id: 36954, name: "Lance Barrage", label: { zh: "前冲刺" } },
	FULL_THRUST: { id: 84, name: "Full Thrust", label: { zh: "直刺" } },
	HEAVENS_THRUST: { id: 25771, name: "Heavens' Thrust", label: { zh: "苍穹刺" } },
	FANG_AND_CLAW: { id: 3554, name: "Fang and Claw", label: { zh: "龙牙龙爪" } },

	DRAKESBANE: { id: 36952, name: "Drakesbane", label: { zh: "云蒸龙变" } },

	DOOM_SPIKE: { id: 86, name: "Doom Spike", label: { zh: "死天枪" } },
	DRACONIAN_FURY: { id: 25770, name: "Draconian Fury", label: { zh: "龙眼苍穹" } },
	SONIC_THRUST: { id: 7397, name: "Sonic Thrust", label: { zh: "音速刺" } },
	COERTHAN_TORMENT: { id: 16477, name: "Coerthan Torment", label: { zh: "山境酷刑" } },

	LIFE_SURGE: { id: 83, name: "Life Surge", label: { zh: "龙剑" } },
	LANCE_CHARGE: { id: 85, name: "Lance Charge", label: { zh: "猛枪" } },
	JUMP: { id: 92, name: "Jump", label: { zh: "跳跃" } },
	HIGH_JUMP: { id: 16478, name: "High Jump", label: { zh: "高跳" } },
	MIRAGE_DIVE: { id: 7399, name: "Mirage Dive", label: { zh: "幻象冲" } },
	DRAGONFIRE_DIVE: { id: 96, name: "Dragonfire Dive", label: { zh: "龙炎冲" } },
	RISE_OF_THE_DRAGON: { id: 36953, name: "Rise of the Dragon", label: { zh: "龙炎升" } },
	BATTLE_LITANY: { id: 3557, name: "Battle Litany", label: { zh: "战斗连祷" } },
	WYRMWIND_THRUST: { id: 25773, name: "Wyrmwind Thrust", label: { zh: "天龙点睛" } },

	GEIRSKOGUL: { id: 3555, name: "Geirskogul", label: { zh: "武神枪" } },
	NASTROND: { id: 7400, name: "Nastrond", label: { zh: "死者之岸" } },
	STARDIVER: { id: 16480, name: "Stardiver", label: { zh: "坠星冲" } },
	STARCROSS: { id: 36956, name: "Starcross", label: { zh: "渡星冲" } },

	ELUSIVE_JUMP: { id: 94, name: "Elusive Jump", label: { zh: "回避跳跃" } },
	WINGED_GLIDE: { id: 36951, name: "Winged Glide", label: { zh: "龙翼滑翔" } },
});

export const DRG_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_LIFE_SURGE: { name: "cd_LifeSurge" }, // 40 sec
	cd_LANCE_CHARGE: { name: "cd_LanceCharge" }, // 60 sec
	cd_JUMP: { name: "cd_Jump" }, // 30 sec
	cd_HIGH_JUMP: { name: "cd_HighJump" }, // 30 sec
	cd_ELUSIVE_JUMP: { name: "cd_ElusiveJump" }, // 30 sec
	cd_WINGED_GLIDE: { name: "cd_WingedGlide" }, // 60 sec
	cd_DRAGONFIRE_DIVE: { name: "cd_DragonfireDive" }, // 120 sec
	cd_BATTLE_LITANY: { name: "cd_BattleLitany" }, // 120 sec
	cd_GEIRSKOGUL: { name: "cd_Geirskogul" }, // 60 sec
	cd_MIRAGE_DIVE: { name: "cd_MirageDive" }, // 1 sec
	cd_NASTROND: { name: "cd_Nastrond" }, // 2 sec
	cd_STARDIVER: { name: "cd_Stardiver" }, // 30 sec
	cd_WYRMWIND_THRUST: { name: "cd_WyrmwindThrust" }, // 10 sec
	cd_RISE_OF_THE_DRAGON: { name: "cd_RiseOfTheDragon" }, // 1 sec
	cd_STARCROSS: { name: "cd_Starcross" }, // 1 sec
});

export const DRG_GAUGES = ensureRecord<ResourceData>()({
	LIFE_OF_THE_DRAGON: { name: "Life of the Dragon", label: { zh: "红莲龙血" } }, // [0, 1]
	FIRSTMINDS_FOCUS: { name: "Firstminds' Focus", label: { zh: "天龙眼" } }, // [0, 2]
});

export const DRG_STATUSES = ensureRecord<ResourceData>()({
	LIFE_SURGE: { name: "Life Surge", label: { zh: "龙剑" } }, // [0, 1]
	ENHANCED_PIERCING_TALON: { name: "Enhanced Piercing Talon", label: { zh: "贯穿尖" } }, // [0, 1]
	POWER_SURGE: { name: "Power Surge", label: { zh: "龙枪" } }, // [0, 1]
	LANCE_CHARGE: { name: "Lance Charge", label: { zh: "猛枪" } }, // [0, 1]
	DIVE_READY: { name: "Dive Ready", label: { zh: "幻象冲预备" } }, // [0, 1]
	CHAOS_THRUST_DOT: { name: "Chaos Thrust DoT", label: { zh: "樱花怒放" } }, // [0, 1]
	CHAOTIC_SPRING_DOT: { name: "Chaotic Spring DoT", label: { zh: "樱花缭乱" } }, // [0, 1]
	DRAGONS_FLIGHT: { name: "Dragon's Flight", label: { zh: "龙炎升预备" } }, // [0, 1]
	BATTLE_LITANY: { name: "Battle Litany", label: { zh: "战斗连祷" } }, // [0, 1]
	NASTROND_READY: { name: "Nastrond Ready", label: { zh: "死者之岸预备" } }, // [0, 1]
	DRACONIAN_FIRE: { name: "Draconian Fire", label: { zh: "龙眼" } }, // [0, 1]
	STARCROSS_READY: { name: "Starcross Ready", label: { zh: "渡星冲预备" } }, // [0, 1]
});

export const DRG_TRACKERS = ensureRecord<ResourceData>()({
	// 0 - no combo, 1 - disembowelready, 2 - chaosready, 3 - wheelingthrustready, 4 - drakesbane
	DRG_CHAOS_COMBO_TRACKER: { name: "DRG Chaos Combo", label: { zh: "樱花连" } }, // [0, 4]
	// 0 - no combo, 1 - vorpalready, 2 - fullready, 3 - fangready, 4 - drakesbane
	DRG_HEAVENS_COMBO_TRACKER: { name: "DRG Heavens Combo", label: { zh: "苍穹刺连" } }, // [0, 4]
	// 0 - no combo, 1 - sonic thrust ready, 2 - coerthian ready
	DRG_AOE_COMBO_TRACKER: { name: "DRG AOE Combo", label: { zh: "AOE连" } }, // [0, 2]
});

export const DRG_TRAITS = ensureRecord<TraitData>()({
	JUMP_MASTERY: { name: "Jump Mastery", level: 74 },
	LANCE_MASTERY: { name: "Lance Mastery", level: 76 },
	ENHANCED_COERTHAN_TORMENT: { name: "Enhanced Coerthan Torment", level: 82 },
	ENHANCED_WINGED_GLIDE: { name: "Enhanced Winged Glide", level: 84 },
	LANCE_MASTERY_II: { name: "Lance Mastery II", level: 86 },
	ENHANCED_LIFE_SURGE: { name: "Enhanced Life Surge", level: 88 },
	LANCE_MASTERY_III: { name: "Lance Mastery III", level: 90 },
	ENHANCED_DRAGONFIRE_DIVE: { name: "Enhanced Dragonfire Dive", level: 92 },
	MELEE_MASTERY_DRG: { name: "Melee Mastery DRG", level: 94 },
	LANCE_MASTERY_IV: { name: "Lance Mastery IV", level: 96 },
	ENHANCED_STARDIVER: { name: "Enhanced Stardiver", level: 100 },
});

export type DRGActions = typeof DRG_ACTIONS;
export type DRGActionKey = keyof DRGActions;

export type DRGCooldowns = typeof DRG_COOLDOWNS;
export type DRGCooldownKey = keyof DRGCooldowns;

export type DRGGauges = typeof DRG_GAUGES;
export type DRGGaugeKey = keyof DRGGauges;

export type DRGStatuses = typeof DRG_STATUSES;
export type DRGStatusKey = keyof DRGStatuses;

export type DRGTrackers = typeof DRG_TRACKERS;
export type DRGTrackerKey = keyof DRGTrackers;

export const DRG_RESOURCES = {
	...DRG_GAUGES,
	...DRG_STATUSES,
	...DRG_TRACKERS,
};
export type DRGResources = typeof DRG_RESOURCES;
export type DRGResourceKey = keyof DRGResources;

export type DRGTraits = typeof DRG_TRAITS;
export type DRGTraitKey = keyof DRGTraits;
