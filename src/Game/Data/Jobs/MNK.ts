
import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const MNK_ACTIONS = ensureRecord<ActionData>()({
	BOOTSHINE: {
		id: 53,
		name: "Bootshine",
		label: {
			zh: "连击",
			ja: "連撃",
		},
	},
	TRUE_STRIKE: {
		id: 54,
		name: "True Strike",
		label: {
			zh: "正拳",
			ja: "正拳突き",
		},
	},
	SNAP_PUNCH: {
		id: 56,
		name: "Snap Punch",
		label: {
			zh: "崩拳",
			ja: "崩拳",
		},
	},
	TWIN_SNAKES: {
		id: 61,
		name: "Twin Snakes",
		label: {
			zh: "双掌打",
			ja: "双掌打",
		},
	},
	ARM_OF_THE_DESTROYER: {
		id: 62,
		name: "Arm of the Destroyer",
		label: {
			zh: "破坏神冲",
			ja: "壊神衝",
		},
	},
	DEMOLISH: {
		id: 66,
		name: "Demolish",
		label: {
			zh: "破碎拳",
			ja: "破砕拳",
		},
	},
	ROCKBREAKER: {
		id: 70,
		name: "Rockbreaker",
		label: {
			zh: "地烈劲",
			ja: "地烈斬",
		},
	},
	THUNDERCLAP: {
		id: 25762,
		name: "Thunderclap",
		label: {
			zh: "轻身步法",
			ja: "抜重歩法",
		},
	},
	HOWLING_FIST: {
		id: 25763,
		name: "Howling Fist",
		label: {
			zh: "空鸣拳",
			ja: "空鳴拳",
		},
	},
	MANTRA: {
		id: 65,
		name: "Mantra",
		label: {
			zh: "真言",
			ja: "マントラ",
		},
	},
	FOUR_POINT_FURY: {
		id: 16473,
		name: "Four-point Fury",
		label: {
			zh: "四面脚",
			ja: "四面脚",
		},
	},
	DRAGON_KICK: {
		id: 74,
		name: "Dragon Kick",
		label: {
			zh: "双龙脚",
			ja: "双竜脚",
		},
	},
	PERFECT_BALANCE: {
		id: 69,
		name: "Perfect Balance",
		label: {
			zh: "震脚",
			ja: "踏鳴",
		},
	},
	FORM_SHIFT: {
		id: 4262,
		name: "Form Shift",
		label: {
			zh: "演武",
			ja: "演武",
		},
	},
	FORBIDDEN_MEDITATION: {
		id: 36942,
		name: "Forbidden Meditation",
		label: {
			zh: "阴阳斗气",
			ja: "陰陽闘気",
		},
	},
	THE_FORBIDDEN_CHAKRA: {
		id: 3547,
		name: "The Forbidden Chakra",
		label: {
			zh: "阴阳斗气斩",
			ja: "陰陽闘気斬",
		},
	},
	MASTERFUL_BLITZ: {
		id: 25764,
		name: "Masterful Blitz",
		label: {
			zh: "必杀技",
			ja: "必殺技",
		},
	},
	TORNADO_KICK: {
		id: 3543,
		name: "Tornado Kick",
		label: {
			zh: "斗魂旋风脚",
			ja: "闘魂旋風脚",
		},
	},
	ELIXIR_FIELD: {
		id: 3545,
		name: "Elixir Field",
		label: {
			zh: "苍气炮",
			ja: "蒼気砲",
		},
	},
	CELESTIAL_REVOLUTION: {
		id: 25765,
		name: "Celestial Revolution",
		label: {
			zh: "翻天脚",
			ja: "天宙脚",
		},
	},
	FLINT_STRIKE: {
		id: 25882,
		name: "Flint Strike",
		label: {
			zh: "爆裂脚",
			ja: "爆裂脚",
		},
	},
	RIDDLE_OF_EARTH: {
		id: 7394,
		name: "Riddle of Earth",
		label: {
			zh: "金刚极意",
			ja: "金剛の極意",
		},
	},
	EARTHS_REPLY: {
		id: 36944,
		name: "Earth's Reply",
		label: {
			zh: "金刚周天",
			ja: "金剛周天",
		},
	},
	RIDDLE_OF_FIRE: {
		id: 7395,
		name: "Riddle of Fire",
		label: {
			zh: "红莲极意",
			ja: "紅蓮の極意",
		},
	},
	BROTHERHOOD: {
		id: 7396,
		name: "Brotherhood",
		label: {
			zh: "义结金兰",
			ja: "桃園結義",
		},
	},
	RIDDLE_OF_WIND: {
		id: 25766,
		name: "Riddle of Wind",
		label: {
			zh: "疾风极意",
			ja: "疾風の極意",
		},
	},
	ENLIGHTENED_MEDITATION: {
		id: 36943,
		name: "Enlightened Meditation",
		label: {
			zh: "万象斗气",
			ja: "万象闘気",
		},
	},
	ENLIGHTENMENT: {
		id: 16474,
		name: "Enlightenment",
		label: {
			zh: "万象斗气圈",
			ja: "万象闘気圏",
		},
	},
	SIX_SIDED_STAR: {
		id: 16476,
		name: "Six-sided Star",
		label: {
			zh: "六合星导脚",
			ja: "六合星導脚",
		},
	},
	SHADOW_OF_THE_DESTROYER: {
		id: 25767,
		name: "Shadow of the Destroyer",
		label: {
			zh: "破坏神脚",
			ja: "壊神脚",
		},
	},
	RISING_PHOENIX: {
		id: 25768,
		name: "Rising Phoenix",
		label: {
			zh: "凤凰舞",
			ja: "鳳凰の舞",
		},
	},
	PHANTOM_RUSH: {
		id: 25769,
		name: "Phantom Rush",
		label: {
			zh: "梦幻斗舞",
			ja: "夢幻闘舞",
		},
	},
	LEAPING_OPO: {
		id: 36945,
		name: "Leaping Opo",
		label: {
			zh: "猿舞连击",
			ja: "猿舞連撃",
		},
	},
	RISING_RAPTOR: {
		id: 36946,
		name: "Rising Raptor",
		label: {
			zh: "龙颚正拳",
			ja: "竜頷正拳撃",
		},
	},
	POUNCING_COEURL: {
		id: 36947,
		name: "Pouncing Coeurl",
		label: {
			zh: "豹袭崩拳",
			ja: "虎襲崩拳",
		},
	},
	ELIXIR_BURST: {
		id: 36948,
		name: "Elixir Burst",
		label: {
			zh: "真空波",
			ja: "真空波",
		},
	},
	WINDS_REPLY: {
		id: 36949,
		name: "Wind's Reply",
		label: {
			zh: "绝空拳",
			ja: "絶空拳",
		},
	},
	FIRES_REPLY: {
		id: 36950,
		name: "Fire's Reply",
		label: {
			zh: "乾坤斗气弹",
			ja: "乾坤闘気弾",
		},
	}
});

export const MNK_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_THUNDERCLAP: { name: "cd_Thunderclap" },
	cd_MANTRA: { name: "cd_Mantra" },
	cd_PERFECT_BALANCE: { name: "cd_PerfectBalance" },
	cd_THE_FORBIDDEN_CHAKRA: { name: "cd_TheForbiddenChakra" },
	cd_RIDDLE_OF_EARTH: { name: "cd_RiddleOfEarth" },
	cd_EARTHS_REPLY: { name: "cd_EarthsReply" },
	cd_RIDDLE_OF_FIRE: { name: "cd_RiddleOfFire" },
	cd_BROTHERHOOD: { name: "cd_Brotherhood" },
	cd_RIDDLE_OF_WIND: { name: "cd_RiddleOfWind" },
});

export const MNK_GAUGES = ensureRecord<ResourceData>()({
	CHAKRA: { name: "Chakra", label: { zh: "斗气" } },
	BEAST_CHAKRA: { name: "Beast Chakra", label: { zh: "脉轮" } },
	NADI: { name: "Nadi", label: { zh: "太阴斗气/太阳斗气" } },
	OPO_OPOS_FURY: { name: "Opo-opo's Fury", label: { zh: "魔猿功力" } },
	RAPTORS_FURY: { name: "Raptor's Fury", label: { zh: "盗龙功力" } },
	COEURLS_FURY: { name: "Coeurl's Fury", label: { zh: "猛豹功力" } },
});

export const MNK_STATUSES = ensureRecord<ResourceData>()({
	MANTRA: { name: "Mantra", label: { zh: "真言" } },
	OPO_OPO_FORM: { name: "Opo-opo Form", label: { zh: "魔猿身形" } },
	RAPTOR_FORM: { name: "Raptor Form", label: { zh: "盗龙身形" } },
	COEURL_FORM: { name: "Coeurl Form", label: { zh: "猛豹身形" } },
	PERFECT_BALANCE: { name: "Perfect Balance", label: { zh: "震脚" } },
	FORMLESS_FIST: { name: "Formless Fist", label: { zh: "无相身形" } },
	RIDDLE_OF_EARTH: { name: "Riddle of Earth", label: { zh: "金刚极意" } },
	EARTHS_RESOLVE: { name: "Earth's Resolve", label: { zh: "金刚决意" } },
	EARTHS_RUMINATION: { name: "Earth's Rumination", label: { zh: "金刚周天预备" } },
	RIDDLE_OF_FIRE: { name: "Riddle of Fire", label: { zh: "红莲极意" } },
	FIRES_RUMINATION: { name: "Fire's Rumination", label: { zh: "乾坤斗气弹预备" } },
	BROTHERHOOD: { name: "Brotherhood", label: { zh: "义结金兰" } },
	MEDITATIVE_BROTHERHOOD: { name: "Meditative Brotherhood", label: { zh: "义结金兰：斗气" } },
	RIDDLE_OF_WIND: { name: "Riddle of Wind", label: { zh: "疾风极意" } },
	WINDS_RUMINATION: { name: "Wind's Rumination", label: { zh: "绝空拳预备" } },
	SIX_SIDED_STAR: { name: "Six-sided Star", label: { zh: "六合星导脚" } },
});

export const MNK_TRACKERS = ensureRecord<ResourceData>()({
	BEAST_CHAKRA_1: { name: "Beast Chakra 1", label: { zh: "脉轮1" } },
	BEAST_CHAKRA_2: { name: "Beast Chakra 2", label: { zh: "脉轮2" } },
	BEAST_CHAKRA_3: { name: "Beast Chakra 3", label: { zh: "脉轮3" } },
	NADI_1: { name: "Nadi 1", label: { zh: "太阴斗气/太阳斗气1" } },
	NADI_2: { name: "Nadi 2", label: { zh: "太阴斗气/太阳斗气1" } },
});

export const MNK_TRAITS = ensureRecord<TraitData>()({
	DEEP_MEDITATION_II: { name: "Deep Meditation II", level: 74 },
	HOWLING_FIST_MASTERY: { name: "Howling Fist Mastery", level: 74 },
	ENHANCED_GREASED_LIGHTNING_III: { name: "Enhanced Greased Lightning III", level: 76 },
	ARM_OF_THE_DESTROYER_MASTERY: { name: "Arm of the Destroyer Mastery", level: 82 },
	ENHANCED_THUNDERCLAP: { name: "Enhanced Thunderclap", level: 84 },
	MELEE_MASTERY: { name: "Melee Mastery", level: 84 },
	FLINT_STRIKE_MASTERY: { name: "Flint Strike Mastery", level: 86 },
	ENHANCED_BROTHERHOOD: { name: "Enhanced Brotherhood", level: 88 },
	TORNADO_KICK_MASTERY: { name: "Tornado Kick Mastery", level: 90 },
	BEAST_CHAKRA_MASTERY: { name: "Beast Chakra Mastery", level: 92 },
	MELEE_MASTERY_II: { name: "Melee Mastery II", level: 94 },
	ENHANCED_RIDDLE_OF_WIND: { name: "Enhanced Riddle of Wind", level: 96 },
	ENHANCED_RIDDLE_OF_FIRE: { name: "Enhanced Riddle of Fire", level: 100 },
});

export type MNKActions = typeof MNK_ACTIONS;
export type MNKActionKey = keyof MNKActions;

export type MNKCooldowns = typeof MNK_COOLDOWNS;
export type MNKCooldownKey = keyof MNKCooldowns;

export type MNKGauges = typeof MNK_GAUGES;
export type MNKGaugeKey = keyof MNKGauges;

export type MNKStatuses = typeof MNK_STATUSES;
export type MNKStatusKey = keyof MNKStatuses;

export type MNKTrackers = typeof MNK_TRACKERS;
export type MNKTrackerKey = keyof MNKTrackers;

export const MNK_RESOURCES = {
	...MNK_GAUGES,
	...MNK_STATUSES,
	...MNK_TRACKERS,
};
export type MNKResources = typeof MNK_RESOURCES;
export type MNKResourceKey = keyof MNKResources;

export type MNKTraits = typeof MNK_TRAITS;
export type MNKTraitKey = keyof MNKTraits;
