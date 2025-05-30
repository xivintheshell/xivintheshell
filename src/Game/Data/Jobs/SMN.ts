import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SMN_ACTIONS = ensureRecord<ActionData>()({
	SUMMON_CARBUNCLE: { name: "Summon Carbuncle", label: { zh: "宝石兽召唤" } },
	RADIANT_AEGIS: { name: "Radiant Aegis", label: { zh: "守护之光" } },
	PHYSICK: { name: "Physick", label: { zh: "医术" } },
	GEMSHINE: { name: "Gemshine", label: { zh: "宝石耀" } },
	FESTER: { name: "Fester", label: { zh: "溃烂爆发" } },
	ENERGY_DRAIN: { name: "Energy Drain", label: { zh: "能量吸收" } },
	RESURRECTION: { name: "Resurrection", label: { zh: "复生" } },
	OUTBURST: { name: "Outburst", label: { zh: "迸裂" } },
	PRECIOUS_BRILLIANCE: { name: "Precious Brilliance", label: { zh: "宝石辉" } },
	RUBY_OUTBURST: { name: "Ruby Outburst", label: { zh: "红宝石迸裂" } },
	TOPAZ_OUTBURST: { name: "Topaz Outburst", label: { zh: "黄宝石迸裂" } },
	EMERALD_OUTBURST: { name: "Emerald Outburst", label: { zh: "绿宝石迸裂" } },
	SUMMON_IFRIT: { name: "Summon Ifrit", label: { zh: "火神召唤" } },
	PAINFLARE: { name: "Painflare", label: { zh: "痛苦核爆" } },
	SUMMON_TITAN: { name: "Summon Titan", label: { zh: "土神召唤" } },
	SUMMON_GARUDA: { name: "Summon Garuda", label: { zh: "风神召唤" } },
	ENERGY_SIPHON: { name: "Energy Siphon", label: { zh: "能量抽取" } },
	RUBY_RUIN_III: { name: "Ruby Ruin III", label: { zh: "红宝石毁荡" } },
	TOPAZ_RUIN_III: { name: "Topaz Ruin III", label: { zh: "黄宝石毁荡" } },
	EMERALD_RUIN_III: { name: "Emerald Ruin III", label: { zh: "绿宝石毁荡" } },
	RUIN_III: { name: "Ruin III", label: { zh: "毁荡" } },
	ASTRAL_IMPULSE: { name: "Astral Impulse", label: { zh: "星极脉冲" } },
	ASTRAL_FLARE: { name: "Astral Flare", label: { zh: "星极核爆" } },
	ASTRAL_FLOW: { name: "Astral Flow", label: { zh: "星极超流" } },
	DEATHFLARE: { name: "Deathflare", label: { zh: "死星核爆" } },
	RUIN_IV: { name: "Ruin IV", label: { zh: "毁绝" } },
	SEARING_LIGHT: { name: "Searing Light", label: { zh: "灼热之光" } },
	SUMMON_BAHAMUT: { name: "Summon Bahamut", label: { zh: "龙神召唤" } },
	ENKINDLE_BAHAMUT: { name: "Enkindle Bahamut", label: { zh: "龙神迸发" } },
	RUBY_RITE: { name: "Ruby Rite", label: { zh: "红宝石之仪" } },
	TOPAZ_RITE: { name: "Topaz Rite", label: { zh: "黄宝石之仪" } },
	EMERALD_RITE: { name: "Emerald Rite", label: { zh: "绿宝石之仪" } },
	TRI_DISASTER: { name: "Tri-disaster", label: { zh: "三重灾祸" } },
	RUBY_DISASTER: { name: "Ruby Disaster", label: { zh: "红宝石灾祸" } },
	TOPAZ_DISASTER: { name: "Topaz Disaster", label: { zh: "黄宝石灾祸" } },
	EMERALD_DISASTER: { name: "Emerald Disaster", label: { zh: "绿宝石灾祸" } },
	SUMMON_PHOENIX: { name: "Summon Phoenix", label: { zh: "不死鸟召唤" } },
	FOUNTAIN_OF_FIRE: { name: "Fountain of Fire", label: { zh: "灵泉之炎" } },
	BRAND_OF_PURGATORY: { name: "Brand of Purgatory", label: { zh: "炼狱之炎" } },
	REKINDLE: { name: "Rekindle", label: { zh: "苏生之炎" } },
	ENKINDLE_PHOENIX: { name: "Enkindle Phoenix", label: { zh: "不死鸟迸发" } },
	RUBY_CATASTROPHE: { name: "Ruby Catastrophe", label: { zh: "红宝石灾变" } },
	TOPAZ_CATASTROPHE: { name: "Topaz Catastrophe", label: { zh: "黄宝石灾变" } },
	EMERALD_CATASTROPHE: { name: "Emerald Catastrophe", label: { zh: "绿宝石灾变" } },
	CRIMSON_CYCLONE: { name: "Crimson Cyclone", label: { zh: "深红旋风" } },
	CRIMSON_STRIKE: { name: "Crimson Strike", label: { zh: "深红强袭" } },
	MOUNTAIN_BUSTER: { name: "Mountain Buster", label: { zh: "山崩" } },
	SLIPSTREAM: { name: "Slipstream", label: { zh: "螺旋气流" } },
	SUMMON_IFRIT_II: { name: "Summon Ifrit II", label: { zh: "火神召唤 II" } },
	SUMMON_TITAN_II: { name: "Summon Titan II", label: { zh: "土神召唤 II" } },
	SUMMON_GARUDA_II: { name: "Summon Garuda II", label: { zh: "风神召唤 II" } },
	NECROTIZE: { name: "Necrotize", label: { zh: "坏死爆发" } },
	SEARING_FLASH: { name: "Searing Flash", label: { zh: "灼热之闪" } },
	SUMMON_SOLAR_BAHAMUT: { name: "Summon Solar Bahamut", label: { zh: "烈日龙神召唤" } },
	UMBRAL_IMPULSE: { name: "Umbral Impulse", label: { zh: "灵极脉冲" } },
	UMBRAL_FLARE: { name: "Umbral Flare", label: { zh: "灵极核爆" } },
	SUNFLARE: { name: "Sunflare", label: { zh: "烈日核爆" } },
	ENKINDLE_SOLAR_BAHAMUT: { name: "Enkindle Solar Bahamut", label: { zh: "烈日龙神迸发" } },
	LUX_SOLARIS: { name: "Lux Solaris", label: { zh: "日光普照" } },
	// pet actions
	INFERNO: { name: "Inferno", label: { zh: "地狱之火炎" } },
	EARTHEN_FURY: { name: "Earthen Fury", label: { zh: "大地之怒" } },
	AERIAL_BLAST: { name: "Aerial Blast", label: { zh: "大气爆发" } },
	WYRMWAVE: { name: "Wyrmwave", label: { zh: "真龙波" } },
	SCARLET_FLAME: { name: "Scarlet Flame", label: { zh: "赤焰" } },
	LUXWAVE: { name: "Luxwave", label: { zh: "光芒" } },
	AKH_MORN: { name: "Akh Morn", label: { zh: "死亡轮回" } },
	REVELATION: { name: "Revelation", label: { zh: "天启" } },
	EXODUS: { name: "Exodus", label: { zh: "众生离绝" } },
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
