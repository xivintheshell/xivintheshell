import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DRK_ACTIONS = ensureRecord<ActionData>()({
	HARD_SLASH: { name: "Hard Slash" },
	SYPHON_STRIKE: { name: "Syphon Strike" },
	UNLEASH: { name: "Unleash" },
	GRIT: { name: "Grit" },
	RELEASE_GRIT: { name: "Release Grit" },
	UNMEND: { name: "Unmend" },
	SOULEATER: { name: "Souleater" },
	FLOOD_OF_DARKNESS: { name: "Flood of Darkness" },
	BLOOD_WEAPON: { name: "Blood Weapon" },
	SHADOW_WALL: { name: "Shadow Wall" },
	STALWART_SOUL: { name: "Stalwart Soul" },
	EDGE_OF_DARKNESS: { name: "Edge of Darkness" },
	DARK_MIND: { name: "Dark Mind" },
	LIVING_DEAD: { name: "Living Dead" },
	SALTED_EARTH: { name: "Salted Earth" },
	SHADOWSTRIDE: { name: "Shadowstride" },
	ABYSSAL_DRAIN: { name: "Abyssal Drain" },
	CARVE_AND_SPIT: { name: "Carve and Spit" },
	BLOODSPILLER: { name: "Bloodspiller" },
	QUIETUS: { name: "Quietus" },
	DARK_MISSIONARY: { name: "Dark Missionary" },
	DELIRIUM: { name: "Delirium" },
	THE_BLACKEST_NIGHT: { name: "The Blackest Night" },
	THE_BLACKEST_NIGHT_POP: { name: "Pop The Blackest Night" },
	FLOOD_OF_SHADOW: { name: "Flood of Shadow" },
	EDGE_OF_SHADOW: { name: "Edge of Shadow" },
	LIVING_SHADOW: { name: "Living Shadow" },
	OBLATION: { name: "Oblation" },
	SALT_AND_DARKNESS: { name: "Salt and Darkness" },
	SHADOWBRINGER: { name: "Shadowbringer" },
	SHADOWED_VIGIL: { name: "Shadowed Vigil" },
	SCARLET_DELIRIUM: { name: "Scarlet Delirium" },
	COMEUPPANCE: { name: "Comeuppance" },
	TORCLEAVER: { name: "Torcleaver" },
	IMPALEMENT: { name: "Impalement" },
	DISESTEEM: { name: "Disesteem" },
});

export const DRK_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_GRIT: { name: "cd_Grit" },
	cd_RELEASE_GRIT: { name: "cd_ReleaseGrit" },
	// shared with edge of darkness + upgrades
	cd_FLOOD_OF_DARKNESS: { name: "cd_FloodOfDarkness" },
	// shared with shadowed vigil upgrade
	cd_SHADOW_WALL: { name: "cd_ShadowWall" },
	cd_DARK_MIND: { name: "cd_DarkMind" },
	cd_LIVING_DEAD: { name: "cd_LivingDead" },
	cd_SALTED_EARTH: { name: "cd_SaltedEarth" },
	cd_SHADOWSTRIDE: { name: "cd_Shadowstride" },
	// shard with carve and spit
	cd_ABYSSAL_DRAIN: { name: "cd_AbyssalDrain" },
	cd_DARK_MISSIONARY: { name: "cd_DarkMissionary" },
	cd_DELIRIUM: { name: "cd_Delirium" },
	cd_THE_BLACKEST_NIGHT: { name: "cd_TheBlackestNight" },
	cd_THE_BLACKEST_NIGHT_POP: { name: "cd_TheBlackestNightPop" },
	cd_LIVING_SHADOW: { name: "cd_LivingShadow" },
	cd_OBLATION: { name: "cd_Oblation" },
	cd_SALT_AND_DARKNESS: { name: "cd_SaltAndDarkness" },
	cd_SHADOWBRINGER: { name: "cd_Shadowbringer" },
	// fake
	cd_POP_TBN: { name: "cd_PopTBN" },
});

export const DRK_GAUGES = ensureRecord<ResourceData>()({
	DARKSIDE: { name: "Darkside" },
	BLOOD_GAUGE: { name: "Blood Gauge" },
});

export const DRK_STATUSES = ensureRecord<ResourceData>()({
	SALTED_EARTH: { name: "Salted Earth", mayBeToggled: true },
	GRIT: { name: "Grit" },
	SHADOW_WALL: { name: "Shadow Wall" },
	DARK_MIND: { name: "Dark Mind" },
	LIVING_DEAD: { name: "Living Dead" },
	WALKING_DEAD: { name: "Walking Dead" },
	UNDEAD_REBIRTH: { name: "Undead Rebirth" },
	DARK_MISSIONARY: { name: "Dark Missionary" },
	DELIRIUM: { name: "Delirium" },
	BLOOD_WEAPON: { name: "Blood Weapon" },
	BLACKEST_NIGHT: { name: "Blackest Night" },
	SCORN: { name: "Scorn" },
	OBLATION: { name: "Oblation" },
	SHADOWED_VIGIL: { name: "Shadowed Vigil" },
	VIGILANT: { name: "Vigilant" },
});

export const DRK_TRACKERS = ensureRecord<ResourceData>()({
	DRK_COMBO_TRACKER: { name: "DRK Combo" }, // [0, 2]
	DRK_AOE_COMBO_TRACKER: { name: "DRK AOE Combo" }, // [0, 1]
	DRK_DELIRIUM_COMBO_TRACKER: { name: "DRK Delirium Combo" }, // [0, 2]
	DARK_ARTS: { name: "Dark Arts" }, // [0, 1]
	ESTEEM_TRACKER: { name: "Esteem Attacks" }, // [0, 5]
});

export const DRK_TRAITS = ensureRecord<TraitData>()({
	DAKRSIDE_MASTERY: { name: "Darkside Mastery", level: 74 },
	ENHANCED_UNMEND: { name: "Enhanced Unmend", level: 84 },
	ENHANCED_LIVING_SHADOW: { name: "Enhanced Living Shadow", level: 88 },
	ENHANCED_LIVING_SHADOW_II: { name: "Enhanced Living Shadow II", level: 90 },
	SHADOW_WALL_MASTERY: { name: "Shadow Wall Mastery", level: 92 },
	ENHANCED_DELIRIUM: { name: "Enhanced Delirium", level: 96 },
	ENHANCED_LIVING_SHADOW_III: { name: "Enhanced Living Shadow III", level: 100 },
});

export type DRKActions = typeof DRK_ACTIONS;
export type DRKActionKey = keyof DRKActions;

export type DRKCooldowns = typeof DRK_COOLDOWNS;
export type DRKCooldownKey = keyof DRKCooldowns;

export type DRKGauges = typeof DRK_GAUGES;
export type DRKGaugeKey = keyof DRKGauges;

export type DRKStatuses = typeof DRK_STATUSES;
export type DRKStatusKey = keyof DRKStatuses;

export type DRKTrackers = typeof DRK_TRACKERS;
export type DRKTrackerKey = keyof DRKTrackers;

export const DRK_RESOURCES = {
	...DRK_GAUGES,
	...DRK_STATUSES,
	...DRK_TRACKERS,
};
export type DRKResources = typeof DRK_RESOURCES;
export type DRKResourceKey = keyof DRKResources;

export type DRKTraits = typeof DRK_TRAITS;
export type DRKTraitKey = keyof DRKTraits;
