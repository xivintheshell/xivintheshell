import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SMN_ACTIONS = ensureRecord<ActionData>()({
	SUMMON_CARBUNCLE: {
		name: "Summon Carbuncle",
	},
	RADIANT_AEGIS: {
		name: "Radiant Aegis",
	},
	PHYSICK: {
		name: "Physick",
	},
	GEMSHINE: {
		name: "Gemshine",
	},
	FESTER: {
		name: "Fester",
	},
	ENERGY_DRAIN: {
		name: "Energy Drain",
	},
	RESURRECTION: {
		name: "Resurrection",
	},
	OUTBURST: {
		name: "Outburst",
	},
	PRECIOUS_BRILLIANCE: {
		name: "Precious Brilliance",
	},
	RUBY_OUTBURST: {
		name: "Ruby Outburst",
	},
	TOPAZ_OUTBURST: {
		name: "Topaz Outburst",
	},
	EMERALD_OUTBURST: {
		name: "Emerald Outburst",
	},
	SUMMON_IFRIT: {
		name: "Summon Ifrit",
	},
	PAINFLARE: {
		name: "Painflare",
	},
	SUMMON_TITAN: {
		name: "Summon Titan",
	},
	SUMMON_GARUDA: {
		name: "Summon Garuda",
	},
	ENERGY_SIPHON: {
		name: "Energy Siphon",
	},
	RUBY_RUIN_III: {
		name: "Ruby Ruin III",
	},
	TOPAZ_RUIN_III: {
		name: "Topaz Ruin III",
	},
	EMERALD_RUIN_III: {
		name: "Emerald Ruin III",
	},
	RUIN_III: {
		name: "Ruin III",
	},
	ASTRAL_IMPULSE: {
		name: "Astral Impulse",
	},
	ASTRAL_FLARE: {
		name: "Astral Flare",
	},
	ASTRAL_FLOW: {
		name: "Astral Flow",
	},
	DEATHFLARE: {
		name: "Deathflare",
	},
	RUIN_IV: {
		name: "Ruin IV",
	},
	SEARING_LIGHT: {
		name: "Searing Light",
	},
	SUMMON_BAHAMUT: {
		name: "Summon Bahamut",
	},
	ENKINDLE_BAHAMUT: {
		name: "Enkindle Bahamut",
	},
	RUBY_RITE: {
		name: "Ruby Rite",
	},
	TOPAZ_RITE: {
		name: "Topaz Rite",
	},
	EMERALD_RITE: {
		name: "Emerald Rite",
	},
	TRI_DISASTER: {
		name: "Tri-disaster",
	},
	RUBY_DISASTER: {
		name: "Ruby Disaster",
	},
	TOPAZ_DISASTER: {
		name: "Topaz Disaster",
	},
	EMERALD_DISASTER: {
		name: "Emerald Disaster",
	},
	SUMMON_PHOENIX: {
		name: "Summon Phoenix",
	},
	FOUNTAIN_OF_FIRE: {
		name: "Fountain of Fire",
	},
	BRAND_OF_PURGATORY: {
		name: "Brand of Purgatory",
	},
	REKINDLE: {
		name: "Rekindle",
	},
	ENKINDLE_PHOENIX: {
		name: "Enkindle Phoenix",
	},
	RUBY_CATASTROPHE: {
		name: "Ruby Catastrophe",
	},
	TOPAZ_CATASTROPHE: {
		name: "Topaz Catastrophe",
	},
	EMERALD_CATASTROPHE: {
		name: "Emerald Catastrophe",
	},
	SUMMON_IFRIT_II: {
		name: "Summon Ifrit II",
	},
	SUMMON_TITAN_II: {
		name: "Summon Titan II",
	},
	SUMMON_GARUDA_II: {
		name: "Summon Garuda II",
	},
	NECROTIZE: {
		name: "Necrotize",
	},
	SEARING_FLASH: {
		name: "Searing Flash",
	},
	LUX_SOLARIS: {
		name: "Lux Solaris",
	},
	SUMMON_SOLAR_BAHAMUT: {
		name: "Summon Solar Bahamut"
	},
	UMBRAL_IMPULSE: {
		name: "Umbral Impulse",
	},
	UMBRAL_FLARE: {
		name: "Umbral Flare",
	},
	SUNFLARE: {
		name: "Sunflare",
	},
	ENKINDLE_SOLAR_BAHAMUT: {
		name: "Enkindle Solar Bahamut",
	},
});

export const SMN_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_RADIANT_AEGIS: { name: "cd_RADIANT_AEGIS" }, // 60s
	cd_ENKINDLE: { name: "cd_ENKINDLE" }, // 20s
	cd_DEMI_SUMMON: { name: "cd_DEMI_SUMMON" }, // 60s scaled to sps
	cd_ENERGY_DRAIN: { name: "cd_ENERGY_DRAIN" }, // 60s
	cd_AETHERFLOW: { name: "cd_AETHERFLOW" }, // 1s, used for fester/necrotize/painflare
	cd_SEARING_LIGHT: { name: "cd_SEARING_LIGHT" }, // 120s
	cd_SEARING_FLASH: { name: "cd_SEARING_FLASH" }, // 1s
	cd_LUX_SOLARIS: { name: "cd_LUX_SOLARIS" }, // 60s
});

export const SMN_GAUGES = ensureRecord<ResourceData>()({
	AETHERFLOW: { name: "Aetherflow" },
	RUBY_ARCANUM: { name: "Ruby Arcanum" },
	TOPAZ_ARCANUM: { name: "Topaz Arcanum" },
	EMERALD_ARCANUM: { name: "Emerald Arcanum" },
	ATTUNEMENT: { name: "Attunement" },
	// time remaining on attunement stacks
	ATTUNEMENT_TIMER: { name: "Attunement Timer" },
	// time remaining before summoned egi leaves
	SUMMON_TIMER: { name: "Summon Timer" },
});

export const SMN_STATUSES = ensureRecord<ResourceData>()({
	AETHERFLOW: { name: "Aetherflow", maximumStacks: 2 },
	CRIMSON_STRIKE_READY: { name: "Crimson Strike Reaady" },
	EVERLASTING_FLIGHT: { name: "Everlasting Flight" },
	FURTHER_RUIN: { name: "Further Ruin" },
	GARUDAS_FAVOR: { name: "Garuda's Favor" },
	IFRITS_FAVOR: { name: "Ifrit's Favor" },
	RADIANT_AEGIS: { name: "Radiant Aegis" },
	REFULGENT_LUX: { name: "Refulgent Lux" },
	REKINDLE: { name: "Rekindle" },
	RUBYS_GLIMMER: { name: "Ruby's Glimmer" },
	SEARING_LIGHT: { name: "Searing Light" },
	SLIPSTREAM: { name: "Slipstream" },
	TITANS_FAVOR: { name: "Titan's Favor" },
	UNDYING_FLAME: { name: "Undying Flame" },
});

export const SMN_TRACKERS = ensureRecord<ResourceData>()({});

export const SMN_TRAITS = ensureRecord<TraitData>()({
	// smn's 72-82 traits just upgrade skills, so we can just check level directly
	RUIN_MASTERY_IV: { name: "Ruin Mastery IV", level: 84 },
	ENHANCED_RADIANT_AEGIS: { name: "Enhanced Radiant Aegis", level: 88 },
	ARCANE_MASTERY: { name: "Arcane Mastery", level : 94 },
});

export type SMNActions = typeof SMN_ACTIONS;
export type SMNActionKey = keyof SMNActions;

export type SMNCooldowns = typeof SMN_COOLDOWNS;
export type SMNCooldownKey = keyof SMNCooldowns;

export type SMNGauges = typeof SMN_GAUGES;
export type SMNGaugeKey = keyof SMNGauges;

export type SMNStatuses = typeof SMN_STATUSES;
export type SMNStatusKey = keyof SMNStatuses;

export type SMNTrackers = typeof SMN_TRACKERS;
export type SMNTrackerKey = keyof SMNTrackers;

export const SMN_RESOURCES = {
	...SMN_GAUGES,
	...SMN_STATUSES,
	...SMN_TRACKERS,
};
export type SMNResources = typeof SMN_RESOURCES;
export type SMNResourceKey = keyof SMNResources;

export type SMNTraits = typeof SMN_TRAITS;
export type SMNTraitKey = keyof SMNTraits;
