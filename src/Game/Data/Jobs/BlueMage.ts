import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const BlueMage_ACTIONS = ensureRecord<ActionData>()({
	Water_Cannon: { name: "Water Cannon", label: { zh: "水泡(2秒200)" } },
	Sonic_Boom: { name: "Sonic Boom", label: { zh: "音爆(1秒210)" } },
	Sharpened_Knife: { name: "Sharpened Knife", label: { zh: "锋利菜刀(1秒220)" } },
	Hydro_Pull: { name: "Hydro Pull", label: { zh: "水力吸引(2秒220)" } },
	Moon_Flute: { name: "Moon Flute", label: { zh: "月之笛" } },
	Diamondback: { name: "Diamondback", label: { zh: "超硬化" } },
	Song_of_Torment: { name: "Song of Torment", label: { zh: "苦闷之歌" } },
	Whistle: { name: "Whistle", label: { zh: "口笛" } },
	Bristle: { name: "Bristle", label: { zh: "蓄力" } },
	Tingle: { name: "Tingle", label: { zh: "哔哩哔哩" } },
	Final_Sting: { name: "Final Sting", label: { zh: "终极针" } },
	Cold_Fog_1: { name: "Cold Fog 1", label: { zh: "彻骨雾寒" } },
	Cold_Fog_2: { name: "Cold Fog 2", label: { zh: "冰雾" } },
	Cold_Fog_3: { name: "Cold Fog 3", label: { zh: "冰雾触发" } },
	kick: { name: "kick", label: { zh: "鬼宿脚" } },
	Phantom_Flurry_B: { name: "Phantom Flurry B", label: { zh: "鬼宿脚" } },
	Matra_Magic: { name: "Matra Magic", label: { zh: "魔术" } },
	Winged_Reprobation: { name: "Winged Reprobation", label: { zh: "断罪飞翔" } },
	Conviction_Marcato: { name: "Conviction Marcato", label: { zh: "加强信音" } },
	Revenge_Blast: { name: "Revenge Blast", label: { zh: "复仇冲击" } },
	Wild_Rage: { name: "Wild Rage", label: { zh: "兽魂的愤怒" } },
	Goblin_Punch: { name: "Goblin Punch", label: { zh: "哥布林乱拳" } },
	The_Rose_of_Destruction: { name: "The Rose of Destruction", label: { zh: "斗灵弹" } },

	Eruption: { name: "Eruption", label: { zh: "地火喷发" } },
	Feather_Rain: { name: "Feather Rain", label: { zh: "飞翎雨" } },
	Mountain_Buster: { name: "Mountain Buster", label: { zh: "山崩" } },
	Shock_Strike: { name: "Shock Strike", label: { zh: "轰雷" } },
	Glass_Dance: { name: "Glass Dance", label: { zh: "冰雪乱舞" } },
	SurpanakhaA: { name: "Surpanakha", label: { zh: "穿甲散弹" } },
	SurpanakhaB: { name: "Surpanakha", label: { zh: "穿甲散弹" } },
	SurpanakhaC: { name: "Surpanakha", label: { zh: "穿甲散弹" } },
	SurpanakhaD: { name: "Surpanakha", label: { zh: "穿甲散弹" } },
	Quasar: { name: "Quasar", label: { zh: "类星体" } },
	J_Kick: { name: "J Kick", label: { zh: "正义飞踢" } },
	Triple_Trident: { name: "Triple Trident", label: { zh: "渔叉三段" } },
	Both_Ends: { name: "Both Ends", label: { zh: "如意大旋风" } },
	Phantom_Flurry: { name: "Phantom Flurry", label: { zh: "鬼宿脚" } },
	Nightbloom: { name: "Nightbloom", label: { zh: "月下彼岸花" } },
	Sea_Shanty: { name: "Sea Shanty", label: { zh: "咕噜咕噜" } },
	Apokalypsis: { name: "Apokalypsis", label: { zh: "启示录" } },
	Being_Mortal: { name: "Being Mortal", label: { zh: "终有一死" } },
	Breath_of_Magic: { name: "Breath of Magic", label: { zh: "魔法吐息" } },
	Mortal_Flame: { name: "Mortal Flame", label: { zh: "必灭之炎" } },
});

export const BlueMage_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_Eruption: { name: "cd_Eruption", label: { zh: "CD: 地火/飞翎雨" } },
	cd_Shock_Strike: { name: "cd_Shock_Strike", label: { zh: "CD: 轰雷/地裂" } },
	cd_Glass_Dance: { name: "cd_Glass_Dance", label: { zh: "CD: 冰雪乱舞" } },
	cd_Surpanakha: { name: "cd_Surpanakha", label: { zh: "CD: 穿甲散弹" } },
	cd_Quasar: { name: "cd_Quasar", label: { zh: "CD: 类星体/飞踢" } },
	cd_Nightbloom: { name: "cd_Nightbloom", label: { zh: "CD: 大旋风/彼岸花" } },
	cd_Sea_Shanty: { name: "cd_Sea_Shanty", label: { zh: "CD: 咕噜咕噜" } },
	cd_Being_Mortal: { name: "cd_Being_Mortal", label: { zh: "CD: 启示录/终有一死" } },
	cd_Cold_Fog: { name: "cd_Cold_Fog", label: { zh: "CD: 彻骨雾寒" } },
	cd_Triple_Trident: { name: "cd_Triple_Trident", label: { zh: "CD: 渔叉三段" } },
	cd_Phantom_Flurry: { name: "cd_Phantom_Flurry", label: { zh: "CD: 鬼宿脚" } },
	cd_Cold_Fog_Pop: { name: "cd_Cold_Fog_Pop", label: { zh: "CD: 彻骨雾寒触发" } },
	cd_Matra_Magic: { name: "cd_Matra_Magic", label: { zh: "CD: 魔术" } },
	cd_Winged_Reprobation: { name: "cd_Winged_Reprobation", label: { zh: "CD: 断罪飞翔" } },
	cd_The_Rose_of_Destruction: { name: "cd_The_Rose_of_Destruction", label: { zh: "CD: 斗灵弹" } },
});

export const BlueMage_GAUGES = ensureRecord<ResourceData>()({
	AP: { name: "AP", label: { zh: "穿甲散弹" } },
	Winged_Reprobation: { name: "Winged Reprobation", label: { zh: "断罪飞翔" } },
});

export const BlueMage_STATUSES = ensureRecord<ResourceData>()({
	Nightbloom_DOT: { name: "Nightbloom DoT", label: { zh: "彼岸花DOT" } },
	Song_of_Torment_DOT: { name: "Song of Torment DoT", label: { zh: "苦闷之歌DOT" } },
	Feather_Rain_DOT: { name: "Feather Rain DoT", label: { zh: "飞翎雨DOT" } },
	Moon_Flute: { name: "Moon Flute", label: { zh: "月之笛" } },
	Moon_Flute_OVER_TIME: { name: "Moon Flute OVER TIME", label: { zh: "月之笛副作用" } },
	Whistle: { name: "Whistle", label: { zh: "口笛" } },
	Bristle: { name: "Bristle", label: { zh: "蓄力" } },
	Tingle: { name: "Tingle", label: { zh: "哔哩哔哩" } },
	Cold_Fog_1: { name: "Cold Fog 1", label: { zh: "彻骨雾寒" } },
	Cold_Fog_2: { name: "Cold Fog 2", label: { zh: "冰雾" } },
	kick: { name: "kick", label: { zh: "鬼宿脚" } },
	Diamondback: { name: "Diamondback", label: { zh: "超硬化" } },
	Apokalypsis: { name: "Apokalypsis", label: { zh: "启示录" } },
	SurpanakhaA: { name: "SurpanakhaA", label: { zh: "穿甲散弹" } },
	SurpanakhaB: { name: "SurpanakhaB", label: { zh: "穿甲散弹" } },
	SurpanakhaC: { name: "SurpanakhaC", label: { zh: "穿甲散弹" } },
	Winged_Redemption: { name: "Winged Redemption", label: { zh: "完美神的祝福" } },
	Breath_of_Magic_DOT: { name: "Breath of Magic DoT", label: { zh: "魔法吐息" } },
	Mortal_Flame_DOT: { name: "Mortal Flame DoT", label: { zh: "必灭之炎" } },
});

export const BlueMage_TRACKERS = ensureRecord<ResourceData>()({
	Surpanakha_COMBO: { name: "Surpanakha Combo", label: { zh: "穿甲散弹连击" } },
});

export const BlueMage_TRAITS = ensureRecord<TraitData>()({});

export type BlueMageActions = typeof BlueMage_ACTIONS;
export type BlueMageActionKey = keyof BlueMageActions;

export type BlueMageCooldowns = typeof BlueMage_COOLDOWNS;
export type BlueMageCooldownKey = keyof BlueMageCooldowns;

export type BlueMageGauges = typeof BlueMage_GAUGES;
export type BlueMageGaugeKey = keyof BlueMageGauges;

export type BlueMageStatuses = typeof BlueMage_STATUSES;
export type BlueMageStatusKey = keyof BlueMageStatuses;

export type BlueMageTrackers = typeof BlueMage_TRACKERS;
export type BlueMageTrackerKey = keyof BlueMageTrackers;

export const BlueMage_RESOURCES = {
	...BlueMage_GAUGES,
	...BlueMage_STATUSES,
	...BlueMage_TRACKERS,
};
export type BlueMageResources = typeof BlueMage_RESOURCES;
export type BlueMageResourceKey = keyof BlueMageResources;

export type BlueMageTraits = typeof BlueMage_TRAITS;
export type BlueMageTraitKey = keyof BlueMageTraits;
