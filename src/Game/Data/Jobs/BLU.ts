import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const BLU_ACTIONS = ensureRecord<ActionData>()({
	WATER_CANNON: { name: "Water Cannon", label: { zh: "水泡(2秒200)" } },
	SONIC_BOOM: { name: "Sonic Boom", label: { zh: "音爆(1秒210)" } },
	SHARPENED_KNIFE: { name: "Sharpened Knife", label: { zh: "锋利菜刀(1秒220)" } },
	HYDRO_PULL: { name: "Hydro Pull", label: { zh: "水力吸引(2秒220)" } },
	MOON_FLUTE: { name: "Moon Flute", label: { zh: "月之笛" } },
	DIAMONDBACK: { name: "Diamondback", label: { zh: "超硬化" } },
	SONG_OF_TORMENT: { name: "Song of Torment", label: { zh: "苦闷之歌" } },
	WHISTLE: { name: "Whistle", label: { zh: "口笛" } },
	BRISTLE: { name: "Bristle", label: { zh: "蓄力" } },
	TINGLE: { name: "Tingle", label: { zh: "哔哩哔哩" } },
	FINAL_STING: { name: "Final Sting", label: { zh: "终极针" } },
	COLD_FOG: { name: "Cold Fog", label: { zh: "彻骨雾寒" } },
	WHITE_DEATH: { name: "White Death", label: { zh: "冰雾" } },
	POP_COLD_FOG: { name: "Pop Cold Fog", label: { zh: "冰雾触发" } },
	PHANTOM_FLURRY: { name: "Phantom Flurry", label: { zh: "鬼宿脚" } },
	END_PHANTOM_FLURRY: { name: "End Phantom Flurry", label: { zh: "鬼宿脚" } },
	MATRA_MAGIC: { name: "Matra Magic", label: { zh: "魔术" } },
	WINGED_REPROBATION: { name: "Winged Reprobation", label: { zh: "断罪飞翔" } },
	CONVICTION_MARCATO: { name: "Conviction Marcato", label: { zh: "加强信音" } },
	REVENGE_BLAST: { name: "Revenge Blast", label: { zh: "复仇冲击" } },
	WILD_RAGE: { name: "Wild Rage", label: { zh: "兽魂的愤怒" } },
	GOBLIN_PUNCH: { name: "Goblin Punch", label: { zh: "哥布林乱拳" } },
	THE_ROSE_OF_DESTRUCTION: { name: "The Rose of Destruction", label: { zh: "斗灵弹" } },

	ERUPTION: { name: "Eruption", label: { zh: "地火喷发" } },
	FEATHER_RAIN: { name: "Feather Rain", label: { zh: "飞翎雨" } },
	MOUNTAIN_BUSTER: { name: "Mountain Buster", label: { zh: "山崩" } },
	SHOCK_STRIKE: { name: "Shock Strike", label: { zh: "轰雷" } },
	GLASS_DANCE: { name: "Glass Dance", label: { zh: "冰雪乱舞" } },

	QUASAR: { name: "Quasar", label: { zh: "类星体" } },
	J_KICK: { name: "J Kick", label: { zh: "正义飞踢" } },
	TRIPLE_TRIDENT: { name: "Triple Trident", label: { zh: "渔叉三段" } },
	BOTH_ENDS: { name: "Both Ends", label: { zh: "如意大旋风" } },
	NIGHTBLOOM: { name: "Nightbloom", label: { zh: "月下彼岸花" } },
	SEA_SHANTY: { name: "Sea Shanty", label: { zh: "咕噜咕噜" } },
	APOKALYPSIS: { name: "Apokalypsis", label: { zh: "启示录" } },
	BEING_MORTAL: { name: "Being Mortal", label: { zh: "终有一死" } },
	BREATH_OF_MAGIC: { name: "Breath of Magic", label: { zh: "魔法吐息" } },
	MORTAL_FLAME: { name: "Mortal Flame", label: { zh: "必灭之炎" } },
	SURPANAKHA: { name: "Surpanakha", label: { zh: "穿甲散弹" } },
});

export const BLU_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_ERUPTION: { name: "cd_Eruption", label: { zh: "CD: 地火/飞翎雨" } },
	cd_SHOCK_STRIKE: { name: "cd_Shock_Strike", label: { zh: "CD: 轰雷/地裂" } },
	cd_GLASS_DANCE: { name: "cd_Glass_Dance", label: { zh: "CD: 冰雪乱舞" } },
	cd_SURPANAKHA: { name: "cd_Surpanakha", label: { zh: "CD: 穿甲散弹" } },
	cd_QUASAR: { name: "cd_Quasar", label: { zh: "CD: 类星体/飞踢" } },
	cd_NIGHTBLOOM: { name: "cd_Nightbloom", label: { zh: "CD: 大旋风/彼岸花" } },
	cd_SEA_SHANTY: { name: "cd_Sea_Shanty", label: { zh: "CD: 咕噜咕噜" } },
	cd_BEING_MORTAL: { name: "cd_Being_Mortal", label: { zh: "CD: 启示录/终有一死" } },
	cd_COLD_FOG: { name: "cd_Cold_Fog", label: { zh: "CD: 彻骨雾寒" } },
	cd_TRIPLE_TRIDENT: { name: "cd_Triple_Trident", label: { zh: "CD: 渔叉三段" } },
	cd_PHANTOM_FLURRY: { name: "cd_Phantom_Flurry", label: { zh: "CD: 鬼宿脚" } },
	cd_COLD_FOG_POP: { name: "cd_Cold_Fog_Pop", label: { zh: "CD: 彻骨雾寒触发" } },
	cd_MATRA_MAGIC: { name: "cd_Matra_Magic", label: { zh: "CD: 魔术" } },
	cd_WINGED_REPROBATION: { name: "cd_Winged_Reprobation", label: { zh: "CD: 断罪飞翔" } },
	cd_THE_ROSE_OF_DESTRUCTION: { name: "cd_The_Rose_of_Destruction", label: { zh: "CD: 斗灵弹" } },
	cd_SURPANAKHA_LOCKOUT: { name: "cd_SurpanakhaLockout", label: { zh: "CD: 穿甲散弹" } },
});

export const BLU_GAUGES = ensureRecord<ResourceData>()({});

export const BLU_STATUSES = ensureRecord<ResourceData>()({
	NIGHTBLOOM: { name: "Bleeding", label: { zh: "出血（彼岸花）" } },
	SONG_OF_TORMENT: { name: "Bleeding", label: { zh: "出血（苦闷）" } },
	FEATHER_RAIN: { name: "Feather Rain", label: { zh: "裂伤" } },
	WAXING_NOCTURNE: { name: "Waxing Nocturne", label: { zh: "狂战士化" } },
	WANING_NOCTURNE: { name: "Waning Nocturne", label: { zh: "狂战士化的副作用" } },
	WHISTLE: { name: "Whistle", label: { zh: "口笛" } },
	BRISTLE: { name: "Bristle", label: { zh: "蓄力" } },
	TINGLE: { name: "Tingle", label: { zh: "哔哩哔哩" } },
	COLD_FOG: { name: "Cold Fog", label: { zh: "彻骨雾寒" } },
	TOUCH_OF_FROST: { name: "Touch of Frost", label: { zh: "冰雾" } },
	PHANTOM_FLURRY: { name: "Phantom Flurry", label: { zh: "鬼宿脚" } },
	DIAMONDBACK: { name: "Diamondback", label: { zh: "超硬化" } },
	APOKALYPSIS: { name: "Apokalypsis", label: { zh: "启示录" } },
	WINGED_REDEMPTION: { name: "Winged Redemption", label: { zh: "完美神的祝福" } },
	BREATH_OF_MAGIC: { name: "Breath of Magic", label: { zh: "魔法吐息" } },
	MORTAL_FLAME: { name: "Mortal Flame", label: { zh: "必灭之炎" } },
	WINGED_REPROBATION: { name: "Winged Reprobation", label: { zh: "断罪飞翔" }, maximumStacks: 4 },
	SURPANAKHAS_FURY: { name: "Surpanakha's Fury", label: { zh: "穿甲散弹" }, maximumStacks: 4 },
	BRUSH_WITH_DEATH: { name: "Brush with Death", label: { zh: "意志薄弱" } },
});

export const BLU_TRACKERS = ensureRecord<ResourceData>()({
	SURPANAKHA_LOCKOUT: { name: "Supranakha Lockout", label: { zh: "断罪飞翔" } },
});

export const BLU_TRAITS = ensureRecord<TraitData>()({});

export type BLUActions = typeof BLU_ACTIONS;
export type BLUActionKey = keyof BLUActions;

export type BLUCooldowns = typeof BLU_COOLDOWNS;
export type BLUCooldownKey = keyof BLUCooldowns;

export type BLUGauges = typeof BLU_GAUGES;
export type BLUGaugeKey = keyof BLUGauges;

export type BLUStatuses = typeof BLU_STATUSES;
export type BLUStatusKey = keyof BLUStatuses;

export type BLUTrackers = typeof BLU_TRACKERS;
export type BLUTrackerKey = keyof BLUTrackers;

export const BLU_RESOURCES = {
	...BLU_GAUGES,
	...BLU_STATUSES,
	...BLU_TRACKERS,
};
export type BLUResources = typeof BLU_RESOURCES;
export type BLUResourceKey = keyof BLUResources;

export type BLUTraits = typeof BLU_TRAITS;
export type BLUTraitKey = keyof BLUTraits;
