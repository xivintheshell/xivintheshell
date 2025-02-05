import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DRG_ACTIONS = ensureRecord<ActionData>()({
	PIERCING_TALON: { name: "Piercing Talon" },
	TRUE_THRUST: { name: "True Thrust" },
	RAIDEN_THRUST: { name: "Raiden Thrust" },

	DISEMBOWEL: { name: "Disembowel" },
	SPIRAL_BLOW: { name: "Spiral Blow" },
	CHAOS_THRUST: { name: "Chaos Thrust" },
	CHAOTIC_SPRING: { name: "Chaotic Spring" },
	WHEELING_THRUST: { name: "Wheeling Thrust" },

	VORPAL_THRUST: { name: "Vorpal Thrust" },
	LANCE_BARRAGE: { name: "Lance Barrage" },
	FULL_THRUST: { name: "Full Thrust" },
	HEAVENS_THRUST: { name: "Heavens' Thrust" },
	FANG_AND_CLAW: { name: "Fang and Claw" },

	DRAKESBANE: { name: "Drakesbane" },

	DOOM_SPIKE: { name: "Doom Spike" },
	DRACONIAN_FURY: { name: "Draconian Fury" },
	SONIC_THRUST: { name: "Sonic Thrust" },
	COERTHAN_TORMENT: { name: "Coerthan Torment" },

	LIFE_SURGE: { name: "Life Surge" },
	LANCE_CHARGE: { name: "Lance Charge" },
	JUMP: { name: "Jump" },
	HIGH_JUMP: { name: "High Jump" },
	MIRAGE_DIVE: { name: "Mirage Dive" },
	DRAGONFIRE_DIVE: { name: "Dragonfire Dive" },
	RISE_OF_THE_DRAGON: { name: "Rise of the Dragon" },
	BATTLE_LITANY: { name: "Battle Litany" },
	WYRMWIND_THRUST: { name: "Wyrmwind Thrust" },

	GEIRSKOGUL: { name: "Geirskogul" },
	NASTROND: { name: "Nastrond" },
	STARDIVER: { name: "Stardiver" },
	STARCROSS: { name: "Starcross" },

	ELUSIVE_JUMP: { name: "Elusive Jump" },
	WINGED_GLIDE: { name: "Winged Glide" },
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
	LIFE_OF_THE_DRAGON: { name: "Life of the Dragon" }, // [0, 1]
	FIRSTMINDS_FOCUS: { name: "Firstminds' Focus" }, // [0, 2]
});

export const DRG_STATUSES = ensureRecord<ResourceData>()({
	LIFE_SURGE: { name: "Life Surge" }, // [0, 1]
	ENHANCED_PIERCING_TALON: { name: "Enhanced Piercing Talon" }, // [0, 1]
	POWER_SURGE: { name: "Power Surge" }, // [0, 1]
	LANCE_CHARGE: { name: "Lance Charge" }, // [0, 1]
	DIVE_READY: { name: "Dive Ready" }, // [0, 1]
	CHAOS_THRUST_DOT: { name: "Chaos Thrust DoT" }, // [0, 1]
	CHAOTIC_SPRING_DOT: { name: "Chaotic Spring DoT" }, // [0, 1]
	DRAGONS_FLIGHT: { name: "Dragon's Flight" }, // [0, 1]
	BATTLE_LITANY: { name: "Battle Litany" }, // [0, 1]
	NASTROND_READY: { name: "Nastrond Ready" }, // [0, 1]
	DRACONIAN_FIRE: { name: "Draconian Fire" }, // [0, 1]
	STARCROSS_READY: { name: "Starcross Ready" }, // [0, 1]
});

export const DRG_TRACKERS = ensureRecord<ResourceData>()({
	// 0 - no combo, 1 - disembowelready, 2 - chaosready, 3 - wheelingthrustready, 4 - drakesbane
	DRG_CHAOS_COMBO_TRACKER: { name: "DRG Chaos Combo" }, // [0, 4]
	// 0 - no combo, 1 - vorpalready, 2 - fullready, 3 - fangready, 4 - drakesbane
	DRG_HEAVENS_COMBO_TRACKER: { name: "DRG Heavens Combo" }, // [0, 4]
	// 0 - no combo, 1 - sonic thrust ready, 2 - coerthian ready
	DRG_AOE_COMBO_TRACKER: { name: "DRG AOE Combo" }, // [0, 2]
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
