import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource, Trait } from "../types";

export const GNB_ACTIONS = ensureRecord<Action>()({
	LIGHTNING_SHOCK: { name: "Lightning Shock" },
	KEEN_EDGE: { name: "Keen Edge" },
	BRUTAL_SHELL: { name: "Brutal Shell" },
	SOLID_BARREL: { name: "Solid Barrel" },
	DEMON_SLICE: { name: "Demon Slice" },
	DEMON_SLAUGHTER: { name: "Demon Slaughter" },

	BURST_STRIKE: { name: "Burst Strike" },
	FATED_CIRCLE: { name: "Fated Circle" },

	BLOODFEST: { name: "Bloodfest" },
	NO_MERCY: { name: "No Mercy" },
	SONIC_BREAK: { name: "Sonic Break" },

	GNASHING_FANG: { name: "Gnashing Fang" },
	SAVAGE_CLAW: { name: "Savage Claw" },
	WICKED_TALON: { name: "Wicked Talon" },

	DOUBLE_DOWN: { name: "Double Down" },

	REIGN_OF_BEASTS: { name: "Reign of Beasts" },
	NOBLE_BLOOD: { name: "Noble Blood" },
	LION_HEART: { name: "Lion Heart" },

	CONTINUATION: { name: "Continuation" },
	HYPERVELOCITY: { name: "Hypervelocity" },
	FATED_BRAND: { name: "Fated Brand" },
	JUGULAR_RIP: { name: "Jugular Rip" },
	ABDOMEN_TEAR: { name: "Abdomen Tear" },
	EYE_GOUGE: { name: "Eye Gouge" },

	DANGER_ZONE: { name: "Danger Zone" },
	BLASTING_ZONE: { name: "Blasting Zone" },
	BOW_SHOCK: { name: "Bow Shock" },
	TRAJECTORY: { name: "Trajectory" },

	HEART_OF_STONE: { name: "Heart of Stone" },
	HEART_OF_CORUNDUM: { name: "Heart of Corundum" },
	SUPERBOLIDE: { name: "Superbolide" },
	CAMOUFLAGE: { name: "Camouflage" },
	NEBULA: { name: "Nebula" },
	GREAT_NEBULA: { name: "Great Nebula" },
	HEART_OF_LIGHT: { name: "Heart of Light" },
	AURORA: { name: "Aurora" },
	ROYAL_GUARD: { name: "Royal Guard" },
	RELEASE_ROYAL_GUARD: { name: "Release Royal Guard" },
});

export const GNB_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_NO_MERCY: { name: "cd_NoMercy" }, // 60 sec
	cd_BLOODFEST: { name: "cd_Bloodfest" }, // 120 sec
	cd_CAMOUFLAGE: { name: "cd_Camouflage" }, // 90 sec
	cd_ROYAL_GUARD: { name: "cd_RoyalGuard" }, // 2 sec
	cd_RELEASE_ROYAL_GUARD: { name: "cd_ReleaseRoyalGuard" }, // 1 sec
	cd_DANGER_ZONE: { name: "cd_DangerZone" }, // 30 sec
	cd_BLASTING_ZONE: { name: "cd_BlastingZone" }, // 30 sec
	cd_NEBULA: { name: "cd_Nebula" }, // 120 sec
	cd_GREAT_NEBULA: { name: "cd_GreatNebula" }, // 120 sec
	cd_AURORA: { name: "cd_Aurora" }, // 60 sec
	cd_SUPERBOLIDE: { name: "cd_Superbolide" }, // 360 sec
	cd_TRAJECTORY: { name: "cd_Trajectory" }, // 30 sec
	cd_GNASHING_FANG: { name: "cd_GnashingFang" }, // 30 sec
	cd_BOW_SHOCK: { name: "cd_BowShock" }, // 60 sec
	cd_HEART_OF_LIGHT: { name: "cd_HeartOfLight" }, // 90 sec
	cd_HEART_OF_STONE: { name: "cd_HeartOfStone" }, // 25 sec
	cd_HEART_OF_CORUNDUM: { name: "cd_HeartOfCorundum" }, // 25 sec
	cd_DOUBLE_DOWN: { name: "cd_DoubleDown" }, // 60 sec
	cd_CONTINUATION: { name: "cd_Continuation" }, // 1 sec
	cd_HYPERVELOCITY: { name: "cd_Hypervelocity" },
	cd_FATED_BRAND: { name: "cd_FatedBrand" },
	cd_JUGULAR_RIP: { name: "cd_JugularRip" },
	cd_ABDOMEN_TEAR: { name: "cd_AbdomenTear" },
	cd_EYE_GOUGE: { name: "cd_EyeGouge" },
});

export const GNB_GAUGES = ensureRecord<Resource>()({
	POWDER_GAUGE: { name: "Powder Gauge" }, // [0, 3]
});

export const GNB_STATUSES = ensureRecord<Resource>()({
	NO_MERCY: { name: "No Mercy" }, // [0, 1]
	AURORA: { name: "Aurora" }, // [0, 1]
	BOW_SHOCK_DOT: { name: "Bow Shock DoT" }, // [0, 1]
	CAMOUFLAGE: { name: "Camouflage" }, // [0, 1]
	HEART_OF_CORUNDUM: { name: "Heart of Corundum" }, // [0, 1]
	CLARITY_OF_CORUNDUM: { name: "Clarity of Corundum" }, // [0, 1]
	CATHARSIS_OF_CORUNDUM: { name: "Catharsis of Corundum" }, // [0, 1]
	NEBULA: { name: "Nebula" }, // [0, 1]
	GREAT_NEBULA: { name: "Great Nebula" }, // [0, 1]
	HEART_OF_LIGHT: { name: "Heart of Light" }, // [0, 1]
	HEART_OF_STONE: { name: "Heart of Stone" }, // [0, 1]

	READY_TO_BLAST: { name: "Ready to Blast" }, // [0, 1]
	READY_TO_BREAK: { name: "Ready to Break" }, // [0, 1]
	READY_TO_GOUGE: { name: "Ready to Gouge" }, // [0, 1]
	READY_TO_RAZE: { name: "Ready to Raze" }, // [0, 1]
	READY_TO_REIGN: { name: "Ready to Reign" }, // [0, 1]
	READY_TO_RIP: { name: "Ready to Rip" }, // [0, 1]
	READY_TO_TEAR: { name: "Ready to Tear" }, // [0, 1]

	ROYAL_GUARD: { name: "Royal Guard" }, // [0, 1]
	SONIC_BREAK_DOT: { name: "Sonic Break DoT" }, // [0, 1]
	SUPERBOLIDE: { name: "Superbolide" }, // [0, 1]
	BRUTAL_SHELL: { name: "Brutal Shell" }, // [0, 1]
});

export const GNB_TRACKERS = ensureRecord<Resource>()({
	// 0 - combo neutral, 1 - brutal shell ready, 2 - solid barrel ready
	GNB_COMBO_TRACKER: { name: "GNB Combo" }, // [0, 2]
	// 0 - combo neutral, 1 - demon slaughter ready
	GNB_AOE_COMBO_TRACKER: { name: "GNB AOE Combo" }, // [0, 1]
	// 0 - combo neutral, 1 - savage claw ready, 2 - wicked talon ready
	GNB_GNASHING_COMBO_TRACKER: { name: "GNB Gnashing Combo" }, // [0, 2]
	// 0 - combo neutral, 1 - noble blood ready, 3 - lionheart ready
	GNB_REIGN_COMBO_TRACKER: { name: "GNB Reign Combo" }, // [0, 2]
});

export const GNB_TRAITS = ensureRecord<Trait>()({
	DANGER_ZONE_MASTERY: { name: "Danger Zone Mastery", level: 80 },
	HEART_OF_STONE_MASTERY: { name: "Heart Of Stone Mastery", level: 82 },
	ENHANCED_AURORA: { name: "Enhanced Aurora", level: 84 },
	ENHANCED_CONTINUATION: { name: "Enhanced Continuation", level: 86 },
	CARTRIDGE_CHARGE_II: { name: "Cartridge Charge II", level: 88 },
	NEBULA_MASTERY: { name: "Nebula Mastery", level: 92 },
	ENHANCED_CONTINUATION_II: { name: "Enhanced Continuation II", level: 96 },
	ENHANCED_BLOODFEST: { name: "Enhanced Bloodfest", level: 100 },
});

export type GNBActions = typeof GNB_ACTIONS;
export type GNBActionKey = keyof GNBActions;

export type GNBCooldowns = typeof GNB_COOLDOWNS;
export type GNBCooldownKey = keyof GNBCooldowns;

export type GNBGauges = typeof GNB_GAUGES;
export type GNBGaugeKey = keyof GNBGauges;

export type GNBStatuses = typeof GNB_STATUSES;
export type GNBStatusKey = keyof GNBStatuses;

export type GNBTrackers = typeof GNB_TRACKERS;
export type GNBTrackerKey = keyof GNBTrackers;

export const GNB_RESOURCES = {
	...GNB_GAUGES,
	...GNB_STATUSES,
	...GNB_TRACKERS,
};
export type GNBResources = typeof GNB_RESOURCES;
export type GNBResourceKey = keyof GNBResources;

export type GNBTraits = typeof GNB_TRAITS;
export type GNBTraitKey = keyof GNBTraits;
