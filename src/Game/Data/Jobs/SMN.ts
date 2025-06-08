import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SMN_ACTIONS = ensureRecord<ActionData>()({
	SUMMON_CARBUNCLE: {
		id: 25798,
		name: "Summon Carbuncle",
		label: { zh: "宝石兽召唤" },
	},
	RADIANT_AEGIS: {
		id: 25799,
		name: "Radiant Aegis",
		label: { zh: "守护之光" },
	},
	PHYSICK: {
		id: 16230,
		name: "Physick",
		label: { zh: "医术" },
	},
	GEMSHINE: {
		id: 25883,
		name: "Gemshine",
		label: { zh: "宝石耀" },
	},
	FESTER: {
		id: 181,
		name: "Fester",
		label: { zh: "溃烂爆发" },
	},
	ENERGY_DRAIN: {
		id: 16508,
		name: "Energy Drain",
		label: { zh: "能量吸收" },
	},
	RESURRECTION: {
		//Note: shared with SCH, that'll be fun to deal with...
		id: 173,
		name: "Resurrection",
		label: { zh: "复生" },
	},
	OUTBURST: {
		id: 16511,
		name: "Outburst",
		label: { zh: "迸裂" },
	},
	PRECIOUS_BRILLIANCE: {
		id: 25884,
		name: "Precious Brilliance",
		label: { zh: "宝石辉" },
	},
	RUBY_OUTBURST: {
		id: 25814,
		name: "Ruby Outburst",
		label: { zh: "红宝石迸裂" },
	},
	TOPAZ_OUTBURST: {
		id: 25815,
		name: "Topaz Outburst",
		label: { zh: "黄宝石迸裂" },
	},
	EMERALD_OUTBURST: {
		id: 25816,
		name: "Emerald Outburst",
		label: { zh: "绿宝石迸裂" },
	},
	SUMMON_IFRIT: {
		id: 25805,
		name: "Summon Ifrit",
		label: { zh: "火神召唤" },
	},
	PAINFLARE: {
		id: 3578,
		name: "Painflare",
		label: { zh: "痛苦核爆" },
	},
	SUMMON_TITAN: {
		id: 25806,
		name: "Summon Titan",
		label: { zh: "土神召唤" },
	},
	SUMMON_GARUDA: {
		id: 25807,
		name: "Summon Garuda",
		label: { zh: "风神召唤" },
	},
	ENERGY_SIPHON: {
		id: 16510,
		name: "Energy Siphon",
		label: { zh: "能量抽取" },
	},
	RUBY_RUIN_III: {
		id: 25817,
		name: "Ruby Ruin III",
		label: { zh: "红宝石毁荡" },
	},
	TOPAZ_RUIN_III: {
		id: 25818,
		name: "Topaz Ruin III",
		label: { zh: "黄宝石毁荡" },
	},
	EMERALD_RUIN_III: {
		id: 25819,
		name: "Emerald Ruin III",
		label: { zh: "绿宝石毁荡" },
	},
	RUIN_III: {
		id: 3579,
		name: "Ruin III",
		label: { zh: "毁荡" },
	},
	ASTRAL_IMPULSE: {
		id: 25820,
		name: "Astral Impulse",
		label: { zh: "星极脉冲" },
	},
	ASTRAL_FLARE: {
		id: 25821,
		name: "Astral Flare",
		label: { zh: "星极核爆" },
	},
	ASTRAL_FLOW: {
		id: 25822,
		name: "Astral Flow",
		label: { zh: "星极超流" },
	},
	DEATHFLARE: {
		id: 3582,
		name: "Deathflare",
		label: { zh: "死星核爆" },
	},
	RUIN_IV: {
		id: 7426,
		name: "Ruin IV",
		label: { zh: "毁绝" },
	},
	SEARING_LIGHT: {
		id: 25801,
		name: "Searing Light",
		label: { zh: "灼热之光" },
	},
	SUMMON_BAHAMUT: {
		id: 7427,
		name: "Summon Bahamut",
		label: { zh: "龙神召唤" },
	},
	ENKINDLE_BAHAMUT: {
		id: 7429,
		name: "Enkindle Bahamut",
		label: { zh: "龙神迸发" },
	},
	RUBY_RITE: {
		id: 25823,
		name: "Ruby Rite",
		label: { zh: "红宝石之仪" },
	},
	TOPAZ_RITE: {
		id: 25824,
		name: "Topaz Rite",
		label: { zh: "黄宝石之仪" },
	},
	EMERALD_RITE: {
		id: 25825,
		name: "Emerald Rite",
		label: { zh: "绿宝石之仪" },
	},
	TRI_DISASTER: {
		id: 25826,
		name: "Tri-disaster",
		label: { zh: "三重灾祸" },
	},
	RUBY_DISASTER: {
		id: 25827,
		name: "Ruby Disaster",
		label: { zh: "红宝石灾祸" },
	},
	TOPAZ_DISASTER: {
		id: 25828,
		name: "Topaz Disaster",
		label: { zh: "黄宝石灾祸" },
	},
	EMERALD_DISASTER: {
		id: 25829,
		name: "Emerald Disaster",
		label: { zh: "绿宝石灾祸" },
	},
	SUMMON_PHOENIX: {
		id: 25831,
		name: "Summon Phoenix",
		label: { zh: "不死鸟召唤" },
	},
	FOUNTAIN_OF_FIRE: {
		id: 16514,
		name: "Fountain of Fire",
		label: { zh: "灵泉之炎" },
	},
	BRAND_OF_PURGATORY: {
		id: 16515,
		name: "Brand of Purgatory",
		label: { zh: "炼狱之炎" },
	},
	REKINDLE: {
		id: 25830,
		name: "Rekindle",
		label: { zh: "苏生之炎" },
	},
	ENKINDLE_PHOENIX: {
		id: 16516,
		name: "Enkindle Phoenix",
		label: { zh: "不死鸟迸发" },
	},
	RUBY_CATASTROPHE: {
		id: 25832,
		name: "Ruby Catastrophe",
		label: { zh: "红宝石灾变" },
	},
	TOPAZ_CATASTROPHE: {
		id: 25833,
		name: "Topaz Catastrophe",
		label: { zh: "黄宝石灾变" },
	},
	EMERALD_CATASTROPHE: {
		id: 25834,
		name: "Emerald Catastrophe",
		label: { zh: "绿宝石灾变" },
	},
	CRIMSON_CYCLONE: {
		id: 25835,
		name: "Crimson Cyclone",
		label: { zh: "深红旋风" },
	},
	CRIMSON_STRIKE: {
		id: 25885,
		name: "Crimson Strike",
		label: { zh: "深红强袭" },
	},
	MOUNTAIN_BUSTER: {
		id: 25836,
		name: "Mountain Buster",
		label: { zh: "山崩" },
	},
	SLIPSTREAM: {
		id: 25837,
		name: "Slipstream",
		label: { zh: "螺旋气流" },
	},
	SUMMON_IFRIT_II: {
		id: 25838,
		name: "Summon Ifrit II",
		label: { zh: "火神召唤 II" },
	},
	SUMMON_TITAN_II: {
		id: 25839,
		name: "Summon Titan II",
		label: { zh: "土神召唤 II" },
	},
	SUMMON_GARUDA_II: {
		id: 25840,
		name: "Summon Garuda II",
		label: { zh: "风神召唤 II" },
	},
	NECROTIZE: {
		id: 36990,
		name: "Necrotize",
		label: { zh: "坏死爆发" },
	},
	SEARING_FLASH: {
		id: 36991,
		name: "Searing Flash",
		label: { zh: "灼热之闪" },
	},
	SUMMON_SOLAR_BAHAMUT: {
		id: 36992,
		name: "Summon Solar Bahamut",
		label: { zh: "烈日龙神召唤" },
	},
	UMBRAL_IMPULSE: {
		id: 36994,
		name: "Umbral Impulse",
		label: { zh: "灵极脉冲" },
	},
	UMBRAL_FLARE: {
		id: 36995,
		name: "Umbral Flare",
		label: { zh: "灵极核爆" },
	},
	SUNFLARE: {
		id: 36996,
		name: "Sunflare",
		label: { zh: "烈日核爆" },
	},
	ENKINDLE_SOLAR_BAHAMUT: {
		id: 36998,
		name: "Enkindle Solar Bahamut",
		label: { zh: "烈日龙神迸发" },
	},
	LUX_SOLARIS: {
		id: 36997,
		name: "Lux Solaris",
		label: { zh: "日光普照" },
	},
	// pet actions
	INFERNO: {
		id: 25852,
		name: "Inferno",
		label: { zh: "地狱之火炎" },
	},
	EARTHEN_FURY: {
		id: 25853,
		name: "Earthen Fury",
		label: { zh: "大地之怒" },
	},
	AERIAL_BLAST: {
		id: 25854,
		name: "Aerial Blast",
		label: { zh: "大气爆发" },
	},
	WYRMWAVE: {
		id: 7428,
		name: "Wyrmwave",
		label: { zh: "真龙波" },
	},
	SCARLET_FLAME: {
		id: 16519,
		name: "Scarlet Flame",
		label: { zh: "赤焰" },
	},
	LUXWAVE: {
		id: 36993,
		name: "Luxwave",
		label: { zh: "光芒" },
	},
	AKH_MORN: {
		id: 7449,
		name: "Akh Morn",
		label: { zh: "死亡轮回" },
	},
	REVELATION: {
		id: 16518,
		name: "Revelation",
		label: { zh: "天启" },
	},
	EXODUS: {
		id: 36999,
		name: "Exodus",
		label: { zh: "众生离绝" },
	},
});

export const SMN_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_RADIANT_AEGIS: { name: "cd_RADIANT_AEGIS" }, // 60s
	cd_ASTRAL_FLOW: { name: "cd_ASTRAL_FLOW" }, // 20s
	cd_ENKINDLE: { name: "cd_ENKINDLE", label: { zh: "CD：龙神/烈日龙神/不死鸟迸发" } }, // 20s
	cd_DEMI_SUMMON: { name: "cd_DEMI_SUMMON", label: { zh: "CD：亚灵神召唤" } }, // 60s scaled to sps
	cd_ENERGY_DRAIN: { name: "cd_ENERGY_DRAIN" }, // 60s
	cd_AETHERFLOW: { name: "cd_AETHERFLOW", label: { zh: "CD：以太超流" } }, // 1s, used for fester/necrotize/painflare
	cd_SEARING_LIGHT: { name: "cd_SEARING_LIGHT" }, // 120s
	cd_SEARING_FLASH: { name: "cd_SEARING_FLASH" }, // 1s
	cd_LUX_SOLARIS: { name: "cd_LUX_SOLARIS" }, // 60s
	cd_MOUNTAIN_BUSTER: { name: "cd_MOUNTAIN_BUSTER" }, // 1s
	// per hauffen: lockout is 4.05s for ifrit/titan; 3.38s for garuda:
	// https://discord.com/channels/277897135515762698/277968477233479680/1331466393430003793
	// this number is lower for egis below level 90; need to double check
	cd_SUMMON_LOCKOUT: { name: "cd_SUMMON_LOCKOUT" },
});

export const SMN_GAUGES = ensureRecord<ResourceData>()({
	AETHERFLOW: { name: "Aetherflow", label: { zh: "以太超流" } },
	RUBY_ARCANUM: { name: "Ruby Arcanum", label: { zh: "红宝石的奥秘" } },
	TOPAZ_ARCANUM: { name: "Topaz Arcanum", label: { zh: "黄宝石的奥秘" } },
	EMERALD_ARCANUM: { name: "Emerald Arcanum", label: { zh: "绿宝石的奥秘" } },
	FIRE_ATTUNEMENT: { name: "Fire Attunement", label: { zh: "火属性以太" } },
	EARTH_ATTUNEMENT: { name: "Earth Attunement", label: { zh: "土属性以太" } },
	WIND_ATTUNEMENT: { name: "Wind Attunement", label: { zh: "风属性以太" } },
	ACTIVE_DEMI: { name: "Active Demi", label: { zh: "同调量谱" } },
});

export const SMN_STATUSES = ensureRecord<ResourceData>()({
	AETHERFLOW: { name: "Aetherflow", maximumStacks: 2, label: { zh: "以太超流" } },
	CRIMSON_STRIKE_READY: { name: "Crimson Strike Ready", label: { zh: "深红强袭预备" } },
	EVERLASTING_FLIGHT: { name: "Everlasting Flight", label: { zh: "不死鸟之翼" } },
	FURTHER_RUIN: { name: "Further Ruin", label: { zh: "毁绝预备" } },
	GARUDAS_FAVOR: { name: "Garuda's Favor", label: { zh: "螺旋气流预备" } },
	IFRITS_FAVOR: { name: "Ifrit's Favor", label: { zh: "深红旋风预备" } },
	RADIANT_AEGIS: { name: "Radiant Aegis", label: { zh: "守护之光" } },
	REFULGENT_LUX: { name: "Refulgent Lux", label: { zh: "日光普照预备" } },
	REKINDLE: { name: "Rekindle", label: { zh: "苏生之炎" } },
	RUBYS_GLIMMER: { name: "Ruby's Glimmer", label: { zh: "灼热之闪预备" } },
	SEARING_LIGHT: { name: "Searing Light", label: { zh: "灼热之光" } },
	SLIPSTREAM: { name: "Slipstream", mayBeToggled: true, label: { zh: "螺旋气流" } },
	TITANS_FAVOR: { name: "Titan's Favor", label: { zh: "山崩预备" } },
	UNDYING_FLAME: { name: "Undying Flame", label: { zh: "苏生之炎" } },
});

export const SMN_TRACKERS = ensureRecord<ResourceData>()({
	// (next demi summon) 0 = solar, 1 = baha, 2 = solar, 3 = phoenix
	NEXT_DEMI_CYCLE: { name: "Next Demi Cycle", label: { zh: "亚灵神循环" } },
	// # of remaining demi autos during this summon
	DEMI_AUTO: { name: "Demi Auto-attack", label: { zh: "亚灵神自动攻击" } },
});

export const SMN_TRAITS = ensureRecord<TraitData>()({
	RUIN_MASTERY_III: { name: "Ruin Mastery III", level: 72 },
	OUTBURST_MASTERY: { name: "Outburst Mastery", level: 74 },
	ENHANCED_SUMMON_BAHAMUT: { name: "Enhanced Summon Bahamut", level: 80 },
	OUTBURST_MASTERY_II: { name: "Outburst Mastery II", level: 82 },
	RUIN_MASTERY_IV: { name: "Ruin Mastery IV", level: 84 },
	ELEMENTAL_MASTERY: { name: "Elemental Mastery", level: 86 },
	ENHANCED_RADIANT_AEGIS: { name: "Enhanced Radiant Aegis", level: 88 },
	ENKINDLE_II: { name: "Enkindle II", level: 90 },
	ENHANCED_FESTER: { name: "Enhanced Fester", level: 92 },
	ARCANE_MASTERY: { name: "Arcane Mastery", level: 94 },
	ENHANCED_SEARING_LIGHT: { name: "Enhanced Searing Light", level: 96 },
	ENHANCED_SUMMON_BAHAMUT_II: { name: "Enhanced Summon Bahamut II", level: 100 },
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
