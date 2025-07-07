import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const WHM_ACTIONS = ensureRecord<ActionData>()({
	CURE: {
		id: 120,
		name: "Cure",
		label: {
			zh: "治疗",
			ja: "ケアル",
		},
	},
	MEDICA: {
		id: 124,
		name: "Medica",
		label: {
			zh: "医治",
			ja: "メディカ",
		},
	},
	RAISE: {
		id: 125,
		name: "Raise",
		label: {
			zh: "复活",
			ja: "レイズ",
		},
	},
	CURE_II: {
		id: 135,
		name: "Cure II",
		label: {
			zh: "救疗",
			ja: "ケアルラ",
		},
	},
	PRESENCE_OF_MIND: {
		id: 136,
		name: "Presence of Mind",
		label: {
			zh: "神速咏唱",
			ja: "神速魔",
		},
	},
	REGEN: {
		id: 137,
		name: "Regen",
		label: {
			zh: "再生",
			ja: "リジェネ",
		},
	},
	CURE_III: {
		id: 131,
		name: "Cure III",
		label: {
			zh: "愈疗",
			ja: "ケアルガ",
		},
	},
	AETHERIAL_SHIFT: {
		id: 37008,
		name: "Aetherial Shift",
		label: {
			zh: "以太变移",
			ja: "エーテリアルシフト",
		},
	},
	HOLY: {
		id: 139,
		name: "Holy",
		label: {
			zh: "神圣",
			ja: "ホーリー",
		},
	},
	AERO_II: {
		id: 132,
		name: "Aero II",
		label: {
			zh: "烈风",
			ja: "エアロラ",
		},
	},
	MEDICA_II: {
		id: 133,
		name: "Medica II",
		label: {
			zh: "医济",
			ja: "メディカラ",
		},
	},
	BENEDICTION: {
		id: 140,
		name: "Benediction",
		label: {
			zh: "天赐祝福",
			ja: "ベネディクション",
		},
	},
	AFFLATUS_SOLACE: {
		id: 16531,
		name: "Afflatus Solace",
		label: {
			zh: "安慰之心",
			ja: "ハート・オブ・ソラス",
		},
	},
	ASYLUM: {
		id: 3569,
		name: "Asylum",
		label: {
			zh: "庇护所",
			ja: "アサイラム",
		},
	},
	ASSIZE: {
		id: 3571,
		name: "Assize",
		label: {
			zh: "法令",
			ja: "アサイズ",
		},
	},
	THIN_AIR: {
		id: 7430,
		name: "Thin Air",
		label: {
			zh: "无中生有",
			ja: "シンエアー",
		},
	},
	TETRAGRAMMATON: {
		id: 3570,
		name: "Tetragrammaton",
		label: {
			zh: "神名",
			ja: "テトラグラマトン",
		},
	},
	STONE_IV: {
		id: 7431,
		name: "Stone IV",
		label: {
			zh: "崩石",
			ja: "ストンジャ",
		},
	},
	DIVINE_BENISON: {
		id: 7432,
		name: "Divine Benison",
		label: {
			zh: "神祝祷",
			ja: "ディヴァインベニゾン",
		},
	},
	PLENARY_INDULGENCE: {
		id: 7433,
		name: "Plenary Indulgence",
		label: {
			zh: "全大赦",
			ja: "インドゥルゲンティア",
		},
	},
	DIA: {
		id: 16532,
		name: "Dia",
		label: {
			zh: "天辉",
			ja: "ディア",
		},
	},
	GLARE: {
		id: 16533,
		name: "Glare",
		label: {
			zh: "闪耀",
			ja: "グレア",
		},
	},
	AFFLATUS_MISERY: {
		id: 16535,
		name: "Afflatus Misery",
		label: {
			zh: "苦难之心",
			ja: "ハート・オブ・ミゼリ",
		},
	},
	AFFLATUS_RAPTURE: {
		id: 16534,
		name: "Afflatus Rapture",
		label: {
			zh: "狂喜之心",
			ja: "ハート・オブ・ラプチャー",
		},
	},
	TEMPERANCE: {
		id: 16536,
		name: "Temperance",
		label: {
			zh: "节制",
			ja: "テンパランス",
		},
	},
	GLARE_III: {
		id: 25859,
		name: "Glare III",
		label: {
			zh: "闪灼",
			ja: "グレアガ",
		},
	},
	HOLY_III: {
		id: 25860,
		name: "Holy III",
		label: {
			zh: "豪圣",
			ja: "ホーリガ",
		},
	},
	AQUAVEIL: {
		id: 25861,
		name: "Aquaveil",
		label: {
			zh: "水流幕",
			ja: "アクアヴェール",
		},
	},
	LITURGY_OF_THE_BELL: {
		id: 25862,
		name: "Liturgy of the Bell",
		label: {
			zh: "礼仪之铃",
			ja: "リタージー・オブ・ベル",
		},
	},
	LITURGY_POP: {
		name: "Pop Liturgy of the Bell",
		label: {
			zh: "礼仪之铃破盾",
		},
	},
	LITURGY_TRIGGER: {
		name: "Trigger Liturgy of the Bell",
		label: {
			zh: "礼仪之铃被打",
		},
	},
	GLARE_IV: {
		id: 37009,
		name: "Glare IV",
		label: {
			zh: "闪飒",
			ja: "グレアジャ",
		},
	},
	MEDICA_III: {
		id: 37010,
		name: "Medica III",
		label: {
			zh: "医养",
			ja: "メディガ",
		},
	},
	DIVINE_CARESS: {
		id: 37011,
		name: "Divine Caress",
		label: {
			zh: "神爱抚",
			ja: "ディヴァインカレス",
		},
	},
});

export const WHM_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_PRESENCE_OF_MIND: { name: "cd_PresenceOfMind" },
	cd_AETHERIAL_SHIFT: { name: "cd_AetherialShift" },
	cd_BENEDICTION: { name: "cd_Benediction" },
	cd_ASYLUM: { name: "cd_Asylum" },
	cd_ASSIZE: { name: "cd_Assize" },
	cd_THIN_AIR: { name: "cd_ThinAir" },
	cd_TETRAGRAMMATON: { name: "cd_Tetragrammaton" },
	cd_DIVINE_BENISON: { name: "cd_DivineBenison" },
	cd_PLENARY_INDULGENCE: { name: "cd_PlenaryIndulgence" },
	cd_TEMPERANCE: { name: "cd_Temperance" },
	cd_AQUAVEIL: { name: "cd_Aquaveil" },
	cd_LITURGY_OF_THE_BELL: { name: "cd_LiturgyOfTheBell" },
	cd_LITURGY_POP: { name: "cd_LiturgyPop" },
	cd_LITURGY_TRIGGER: { name: "cd_LiturgyTrigger" },
	cd_DIVINE_CARESS: { name: "cd_DivineCaress" },
});

export const WHM_GAUGES = ensureRecord<ResourceData>()({
	LILLIES: { name: "Lillies", maximumCharges: 3, label: { zh: "百合" } },
	LILY_TIMER: { name: "Lily Timer", label: { zh: "百合计时" } },
	BLOOD_LILY: { name: "Blood Lily", maximumCharges: 3, label: { zh: "血百合" } },
});

export const WHM_STATUSES = ensureRecord<ResourceData>()({
	FREECURE: { name: "Freecure", label: { zh: "治疗效果提高" } },
	PRESENCE_OF_MIND: { name: "Presence of Mind", label: { zh: "神速咏唱" } },
	SACRED_SIGHT: { name: "Sacred Sight", maximumStacks: 3, label: { zh: "闪飒预备" } },
	REGEN: { name: "Regen", label: { zh: "再生" } },
	AERO_II: { name: "Aero II", label: { zh: "烈风" } },
	MEDICA_II: { name: "Medica II", label: { zh: "医济" } },
	ASYLUM: { name: "Asylum", label: { zh: "庇护所" } },
	THIN_AIR: { name: "Thin Air", label: { zh: "无中生有" } },
	DIVINE_BENISON: { name: "Divine Benison", label: { zh: "神祝祷" } },
	CONFESSION: { name: "Confession", label: { zh: "全大赦" } },
	DIA: { name: "Dia", label: { zh: "天辉" } },
	TEMPERANCE: { name: "Temperance", label: { zh: "节制" } },
	DIVINE_GRACE: { name: "Divine Grace", label: { zh: "神爱抚预备" } },
	AQUAVEIL: { name: "Aquaveil", label: { zh: "水流幕" } },
	LITURGY_OF_THE_BELL: {
		name: "Liturgy of the Bell",
		maximumStacks: 5,
		label: { zh: "礼仪之铃" },
	},
	MEDICA_III: { name: "Medica III", label: { zh: "医养" } },
	DIVINE_CARESS: { name: "Divine Caress", label: { zh: "神爱抚" } },
	DIVINE_AURA: { name: "Divine Aura", label: { zh: "神爱环" } },
});

export const WHM_TRACKERS = ensureRecord<ResourceData>()({});

export const WHM_TRAITS = ensureRecord<TraitData>()({
	AERO_MASTERY_II: { name: "Aero Mastery II", level: 72 },
	STONE_MASTERY_IV: { name: "Stone Mastery IV", level: 72 },
	TRANSCENDENT_AFFLATUS: { name: "Transcendent Afflatus", level: 74 },
	ENHANCED_ASYLUM: { name: "Enhanced Asylum", level: 78 },
	GLARE_MASTERY: { name: "Glare Mastery", level: 82 },
	HOLY_MASTERY: { name: "Holy Mastery", level: 82 },
	ENHANCED_DIVINE_BENISON: { name: "Enhanced Divine Benison", level: 88 },
	ENHANCED_PRESENCE_OF_MIND: { name: "Enhanced Presence of Mind", level: 92 },
	WHITE_MAGIC_MASTERY: { name: "White Magic Mastery", level: 94 },
	MEDICA_MASTERY: { name: "Medica Mastery", level: 96 },
	ENHANCED_TETRAGRAMMATON: { name: "Enhanced Tetragrammaton", level: 98 },
	ENHANCED_TEMPERANCE: { name: "Enhanced Temperance", level: 100 },
});

export type WHMActions = typeof WHM_ACTIONS;
export type WHMActionKey = keyof WHMActions;

export type WHMCooldowns = typeof WHM_COOLDOWNS;
export type WHMCooldownKey = keyof WHMCooldowns;

export type WHMGauges = typeof WHM_GAUGES;
export type WHMGaugeKey = keyof WHMGauges;

export type WHMStatuses = typeof WHM_STATUSES;
export type WHMStatusKey = keyof WHMStatuses;

export type WHMTrackers = typeof WHM_TRACKERS;
export type WHMTrackerKey = keyof WHMTrackers;

export const WHM_RESOURCES = {
	...WHM_GAUGES,
	...WHM_STATUSES,
	...WHM_TRACKERS,
};
export type WHMResources = typeof WHM_RESOURCES;
export type WHMResourceKey = keyof WHMResources;

export type WHMTraits = typeof WHM_TRAITS;
export type WHMTraitKey = keyof WHMTraits;
