import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const WAR_ACTIONS = ensureRecord<Action>()({
	HEAVY_SWING: { name: "Heavy Swing" },
	MAIM: { name: "Maim" },
	STORMS_PATH: { name: "Storms Path" },
	STORMS_EYE: { name: "Storms Eye" },
	FELL_CLEAVE: { name: "Fell Cleave" },
	UPHEAVAL: { name: "Upheaval" },
	ONSLAUGHT: { name: "Onslaught" },

	TOMAHAWK: { name: "Tomahawk" },

	OVERPOWER: { name: "Overpower" },
	MYTHRIL_TEMPEST: { name: "Mythril Tempest" },
	DECIMATE: { name: "Decimate" },
	OROGENY: { name: "Orogeny" },

	INNER_RELEASE: { name: "Inner Release" },
	PRIMAL_WRATH: { name: "Primal Wrath" },
	PRIMAL_REND: { name: "Primal Rend" },
	PRIMAL_RUINATION: { name: "Primal Ruination" },

	INFURIATE: { name: "Infuriate" },
	INNER_CHAOS: { name: "Inner Chaos" },
	CHAOTIC_CYCLONE: { name: "Chaotic Cyclone" },

	THRILL_OF_BATTLE: { name: "Thrill of Battle" },
	EQUILIBRIUM: { name: "Equilibrium" },
	SHAKE_IT_OFF: { name: "Shake It Off" },
	RAW_INTUITION: { name: "Raw Intuition" }, // Lv56-81
	NASCENT_FLASH: { name: "Nascent Flash" },
	BLOODWHETTING: { name: "Bloodwhetting" }, // Lv82-
	VENGEANCE: { name: "Vengeance" }, // Lv38-91
	DAMNATION: { name: "Damnation" }, // Lv92-
	HOLMGANG: { name: "Holmgang" },

	DEFIANCE: { name: "Defiance" },
	RELEASE_DEFIANCE: { name: "Release Defiance" },
});

export const WAR_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_INNER_RELEASE: { name: "cd_InnerRelease" },
	cd_PRIMAL_WRATH: { name: "cd_PrimalWrath" },
	cd_UPHEAVAL: { name: "cd_Upheaval" },
	cd_ONSLAUGHT: { name: "cd_Onslaught" },
	cd_INFURIATE: { name: "cd_Infuriate" },

	cd_VENGEANCE: { name: "cd_Vengeance" },
	cd_THRILL_OF_BATTLE: { name: "cd_ThrillOfBattle" },
	cd_RAW_INTUITION: { name: "cd_RawIntuition" },
	cd_EQUILIBRIUM: { name: "cd_Equilibrium" },
	cd_SHAKE_IT_OFF: { name: "cd_ShakeItOff" },
	cd_HOLMGANG: { name: "cd_Holmgang" },

	cd_DEFIANCE: { name: "cd_Defiance" },
	cd_RELEASE_DEFIANCE: { name: "cd_ReleaseDefiance" },
});

export const WAR_GAUGES = ensureRecord<Resource>()({
	BEAST_GAUGE: { name: "Beast Gauge" },
});

export const WAR_STATUSES = ensureRecord<Resource>()({
	SURGING_TEMPEST: { name: "Surging Tempest" },
	INNER_RELEASE: { name: "Inner Release", maximumStacks: 3 }, // Free Fell Cleaves
	INNER_STRENGTH: { name: "Inner Strength" }, // KB/Stun immune
	BURGEONING_FURY: { name: "Burgeoning Fury", maximumStacks: 3 }, // Fell Cleave usage counter
	WRATHFUL: { name: "Wrathful" }, // Primal Wrath Ready
	PRIMAL_REND_READY: { name: "Primal Rend Ready" },
	PRIMAL_RUINATION_READY: { name: "Primal Ruination Ready" },

	NASCENT_CHAOS: { name: "Nascent Chaos" },

	// TODO: Nascent Glint when multiple players in a timeline is fully supported.
	NASCENT_FLASH: { name: "Nascent Flash" }, // health-on-hit (self)
	THRILL_OF_BATTLE: { name: "Thrill of Battle" },
	EQUILIBRIUM: { name: "Equilibrium" }, // HoT
	SHAKE_IT_OFF: { name: "Shake It Off" }, // Barrier
	SHAKE_IT_OFF_OVER_TIME: { name: "Shake It Off Over Time" }, // HoT
	RAW_INTUITION: { name: "Raw Intuition" },
	STEM_THE_TIDE: { name: "Stem the Tide" }, // Barrier
	STEM_THE_FLOW: { name: "Stem the Flow" }, // 4s extra DR
	BLOODWHETTING: { name: "Bloodwhetting" },

	VENGEANCE: { name: "Vengeance" }, // Phys Ref. / 30% DR
	DAMNATION: { name: "Damnation" }, // Phys Ref. / 40% DR
	PRIMEVAL_IMPULSE: { name: "Primeval Impulse" }, // HoT

	HOLMGANG: { name: "Holmgang" }, // Invuln

	DEFIANCE: { name: "Defiance", mayNotBeCanceled: true }, // Tank Stance
});

export const WAR_TRACKERS = ensureRecord<Resource>()({
	STORM_COMBO: { name: "Storm Combo" },
	TEMPEST_COMBO: { name: "Tempest Combo" },
});

export const WAR_TRAITS = ensureRecord<Trait>()({
	NASCENT_CHAOS: { name: "Nascent Chaos", level: 72 },
	MASTERING_THE_BEAST: { name: "Mastering the Beast", level: 74 },
	ENHANCED_SHAKE_IT_OFF: { name: "Enhanced Shake It Off", level: 76 },
	ENHANCED_THRILL_OF_BATTLE: { name: "Enhanced Thrill of Battle", level: 78 },
	RAW_INTUITION_MASTERY: { name: "Raw Intuition Mastery", level: 82 },
	ENHANCED_NASCENT_FLASH: { name: "Enhanced Nascent Flash", level: 82 },
	ENHANCED_EQUILIBRIUM: { name: "Enhanced Equilibrium", level: 84 },
	ENHANCED_ONSLAUGHT: { name: "Enhanced Onslaught", level: 88 },
	VENGEANCE_MASTERY: { name: "Vengeance Mastery", level: 92 },
	ENHANCED_INNER_RELEASE: { name: "Enhanced Inner Release", level: 96 },
	ENHANCED_PRIMAL_REND: { name: "Enhanced Primal Rend", level: 100 },
});

export type WARActions = typeof WAR_ACTIONS;
export type WARActionKey = keyof WARActions;

export type WARCooldowns = typeof WAR_COOLDOWNS;
export type WARCooldownKey = keyof WARCooldowns;

export type WARGauges = typeof WAR_GAUGES;
export type WARGaugeKey = keyof WARGauges;

export type WARStatuses = typeof WAR_STATUSES;
export type WARStatusKey = keyof WARStatuses;

export type WARTrackers = typeof WAR_TRACKERS;
export type WARTrackerKeys = keyof WARTrackers;

export const WAR_RESOURCES = {
	...WAR_GAUGES,
	...WAR_STATUSES,
	...WAR_TRACKERS,
};
export type WARResources = typeof WAR_RESOURCES;
export type WARResourceKey = keyof WARResources;

export type WARTraits = typeof WAR_TRAITS;
export type WARTraitKey = keyof WARTraits;
