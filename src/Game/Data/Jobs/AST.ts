import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const AST_ACTIONS = ensureRecord<ActionData>()({
	MALEFIC: {
		id: 3596,
		name: "Malefic",
		label: {
			zh: "凶星",
			ja: "マレフィク",
		},
	},
	BENEFIC: {
		id: 3594,
		name: "Benefic",
		label: {
			zh: "吉星",
			ja: "ベネフィク",
		},
	},
	LIGHTSPEED: {
		id: 3606,
		name: "Lightspeed",
		label: {
			zh: "光速",
			ja: "ライトスピード",
		},
	},
	HELIOS: {
		id: 3600,
		name: "Helios",
		label: {
			zh: "阳星",
			ja: "ヘリオス",
		},
	},
	ASCEND: {
		id: 3603,
		name: "Ascend",
		label: {
			zh: "生辰",
			ja: "アセンド",
		},
	},
	ESSENTIAL_DIGNITY: {
		id: 3614,
		name: "Essential Dignity",
		label: {
			zh: "先天禀赋",
			ja: "ディグニティ",
		},
	},
	BENEFIC_II: {
		id: 3610,
		name: "Benefic II",
		label: {
			zh: "福星",
			ja: "ベネフィラ",
		},
	},
	ASTRAL_DRAW: {
		id: 37017,
		name: "Astral Draw",
		label: {
			zh: "星极抽卡",
			ja: "アストラルドロー",
		},
	},
	UMBRAL_DRAW: {
		id: 37018,
		name: "Umbral Draw",
		label: {
			zh: "灵极抽卡",
			ja: "アンブラルドロー",
		},
	},
	PLAY_I: {
		id: 37019,
		name: "Play I",
		label: {
			zh: "出卡I",
			ja: "プレイI",
		},
	},
	PLAY_II: {
		id: 37020,
		name: "Play II",
		label: {
			zh: "出卡II",
			ja: "プレイII",
		},
	},
	PLAY_III: {
		id: 37021,
		name: "Play III",
		label: {
			zh: "出卡III",
			ja: "プレイIII",
		},
	},
	ASPECTED_BENEFIC: {
		id: 3595,
		name: "Aspected Benefic",
		label: {
			zh: "吉星相位",
			ja: "アスペクト・ベネフィク",
		},
	},
	ASPECTED_HELIOS: {
		id: 3601,
		name: "Aspected Helios",
		label: {
			zh: "阳星相位",
			ja: "アスペクト・ヘリオス",
		},
	},
	GRAVITY: {
		id: 3615,
		name: "Gravity",
		label: {
			zh: "重力",
			ja: "グラビデ",
		},
	},
	COMBUST_II: {
		id: 3608,
		name: "Combust II",
		label: {
			zh: "炽灼",
			ja: "コンバラ",
		},
	},
	SYNASTRY: {
		id: 3612,
		name: "Synastry",
		label: {
			zh: "星位合图",
			ja: "シナストリー",
		},
	},
	DIVINATION: {
		id: 16552,
		name: "Divination",
		label: {
			zh: "占卜",
			ja: "ディヴィネーション",
		},
	},
	COLLECTIVE_UNCONSCIOUS: {
		id: 3613,
		name: "Collective Unconscious",
		label: {
			zh: "命运之轮",
			ja: "運命の輪",
		},
	},
	CELESTIAL_OPPOSITION: {
		id: 16553,
		name: "Celestial Opposition",
		label: {
			zh: "天星冲日",
			ja: "星天対抗",
		},
	},
	EARTHLY_STAR: {
		id: 7439,
		name: "Earthly Star",
		label: {
			zh: "地星",
			ja: "アーサリースター",
		},
	},
	STELLAR_DETONATION: {
		id: 8324,
		name: "Stellar Detonation",
		label: {
			zh: "星体爆轰",
			ja: "ステラデトネーション",
		},
	},
	MALEFIC_III: {
		id: 7442,
		name: "Malefic III",
		label: {
			zh: "祸星",
			ja: "マレフィガ",
		},
	},
	MINOR_ARCANA: {
		id: 37022,
		name: "Minor Arcana",
		label: {
			zh: "小奥秘卡",
			ja: "マイナーアルカナ",
		},
	},
	COMBUST_III: {
		id: 16554,
		name: "Combust III",
		label: {
			zh: "焚灼",
			ja: "コンバガ",
		},
	},
	MALEFIC_IV: {
		id: 16555,
		name: "Malefic IV",
		label: {
			zh: "煞星",
			ja: "マレフィジャ",
		},
	},
	CELESTIAL_INTERSECTION: {
		id: 16556,
		name: "Celestial Intersection",
		label: {
			zh: "天星交错",
			ja: "星天交差",
		},
	},
	HOROSCOPE: {
		id: 16557,
		name: "Horoscope",
		label: {
			zh: "天宫图",
			ja: "ホロスコープ",
		},
	},
	HOROSCOPE_RECAST: {
		id: 16558,
		name: "Horoscope (Recast)",
		label: {
			zh: "天宫图（重复）",
			ja: "ホロスコープ",
		},
	},
	NEUTRAL_SECT: {
		id: 16559,
		name: "Neutral Sect",
		label: {
			zh: "中间学派",
			ja: "ニュートラルセクト",
		},
	},
	FALL_MALEFIC: {
		id: 25871,
		name: "Fall Malefic",
		label: {
			zh: "落陷凶星",
			ja: "フォールマレフィク",
		},
	},
	GRAVITY_II: {
		id: 25872,
		name: "Gravity II",
		label: {
			zh: "中重力",
			ja: "グラビラ",
		},
	},
	EXALTATION: {
		id: 25873,
		name: "Exaltation",
		label: {
			zh: "擢升",
			ja: "エクザルテーション",
		},
	},
	MACROCOSMOS: {
		id: 25874,
		name: "Macrocosmos",
		label: {
			zh: "大宇宙",
			ja: "マクロコスモス",
		},
	},
	MICROCOSMOS: {
		id: 25875,
		name: "Microcosmos",
		label: {
			zh: "小宇宙",
			ja: "ミクロコスモス",
		},
	},
	ORACLE: {
		id: 37029,
		name: "Oracle",
		label: {
			zh: "神谕",
			ja: "オラクル",
		},
	},
	HELIOS_CONJUNCTION: {
		id: 37030,
		name: "Helios Conjunction",
		label: {
			zh: "阳星合相",
			ja: "コンジャンクション・ヘリオス",
		},
	},
	SUN_SIGN: {
		id: 37031,
		name: "Sun Sign",
		label: {
			zh: "太阳星座",
			ja: "サンサイン",
		},
	},
	THE_BALANCE: {
		id: 37023,
		name: "The Balance",
		label: {
			zh: "太阳神之衡",
			ja: "アーゼマの均衡",
		},
	},
	THE_ARROW: {
		id: 37024,
		name: "The Arrow",
		label: {
			zh: "放浪神之箭",
			ja: "オシュオンの矢",
		},
	},
	THE_SPIRE: {
		id: 37025,
		name: "The Spire",
		label: {
			zh: "建筑神之塔",
			ja: "ビエルゴの塔",
		},
	},
	THE_SPEAR: {
		id: 37026,
		name: "The Spear",
		label: {
			zh: "战争神之枪",
			ja: "ハルオーネの槍",
		},
	},
	THE_BOLE: {
		id: 37027,
		name: "The Bole",
		label: {
			zh: "世界树之干",
			ja: "世界樹の幹",
		},
	},
	THE_EWER: {
		id: 37028,
		name: "The Ewer",
		label: {
			zh: "河流神之瓶",
			ja: "サリャクの水瓶",
		},
	},
	LORD_OF_CROWNS: {
		id: 7444,
		name: "Lord of Crowns",
		label: {
			zh: "王冠之领主",
			ja: "クラウンロード",
		},
	},
	LADY_OF_CROWNS: {
		id: 7445,
		name: "Lady of Crowns",
		label: {
			zh: "王冠之贵妇",
			ja: "クラウンレディ",
		},
	},
});

export const AST_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_LIGHTSPEED: { name: "cd_Lightspeed" },
	cd_ESSENTIAL_DIGNITY: { name: "cd_EssentialDignity" },
	cd_ASTRAL_DRAW: { name: "cd_AstralDraw" },
	cd_UMBRAL_DRAW: { name: "cd_UmbralDraw" },
	cd_PLAY_I: { name: "cd_PlayI" },
	cd_PLAY_II: { name: "cd_PlayII" },
	cd_PLAY_III: { name: "cd_PlayIII" },
	cd_SYNASTRY: { name: "cd_Synastry" },
	cd_DIVINATION: { name: "cd_Divination" },
	cd_COLLECTIVE_UNCONSCIOUS: { name: "cd_CollectiveUnconscious" },
	cd_CELESTIAL_OPPOSITION: { name: "cd_CelestialOpposition" },
	cd_EARTHLY_STAR: { name: "cd_EarthlyStar" },
	cd_STELLAR_DETONATION: { name: "cd_StellarDetonation" },
	cd_MINOR_ARCANA: { name: "cd_MinorArcana" },
	cd_CELESTIAL_INTERSECTION: { name: "cd_CelestialIntersection" },
	cd_HOROSCOPE: { name: "cd_Horoscope" },
	cd_NEUTRAL_SECT: { name: "cd_NeutralSect" },
	cd_EXALTATION: { name: "cd_Exaltation" },
	cd_MICROCOSMOS: { name: "cd_Microcosmos" },
	cd_ORACLE: { name: "cd_Oracle" },
	cd_SUN_SIGN: { name: "cd_SunSign" },
});

export const AST_GAUGES = ensureRecord<ResourceData>()({
	ARCANA: { name: "Arcana", label: { zh: "奥秘卡" } },
	MINOR_ARCANA: { name: "Minor Arcana", maximumCharges: 2, label: { zh: "小奥秘卡" } },
});

export const AST_STATUSES = ensureRecord<ResourceData>()({
	LIGHTSPEED: { name: "Lightspeed", label: { zh: "光速" } },
	THE_BALANCE: { name: "The Balance", label: { zh: "太阳神之衡" } },
	THE_ARROW: { name: "The Arrow", label: { zh: "放浪神之箭" } },
	THE_SPIRE: { name: "The Spire", label: { zh: "建筑神之塔" } },
	THE_SPEAR: { name: "The Spear", label: { zh: "战争神之枪" } },
	THE_BOLE: { name: "The Bole", label: { zh: "世界树之干" } },
	THE_EWER: { name: "The Ewer", label: { zh: "河流神之瓶" } },
	ASPECTED_BENEFIC: { name: "Aspected Benefic", label: { zh: "吉星相位" } },
	ASPECTED_HELIOS: { name: "Aspected Helios", label: { zh: "阳星相位" } },
	SYNASTRY: { name: "Synastry", label: { zh: "星位合图" } },
	DIVINATION: { name: "Divination", label: { zh: "占卜" } },
	DIVINING: { name: "Divining", label: { zh: "神谕预备" } },
	WHEEL_OF_FORTUNE: { name: "Wheel of Fortune", label: { zh: "命运之轮" } },
	OPPOSITION: { name: "Opposition", label: { zh: "天星冲日" } },
	EARTHLY_DOMINANCE: { name: "Earthly Dominance", label: { zh: "地星主宰" } },
	GIANT_DOMINANCE: { name: "Giant Dominance", label: { zh: "巨星主宰" } },
	COMBUST_II: { name: "Combust II", label: { zh: "炽灼" } },
	COMBUST_III: { name: "Combust III", label: { zh: "焚灼" } },
	INTERSECTION: { name: "Intersection", label: { zh: "天星交错" } },
	HOROSCOPE: { name: "Horoscope", label: { zh: "天宫图" } },
	HOROSCOPE_HELIOS: { name: "Horoscope Helios", label: { zh: "阳星天宫图" } },
	SUNTOUCHED: { name: "Suntouched", label: { zh: "太阳星座预备" } },
	EXALTATION: { name: "Exaltation", label: { zh: "擢升" } },
	MACROCOSMOS: { name: "Macrocosmos", label: { zh: "大宇宙" } },
	HELIOS_CONJUNCTION: { name: "Helios Conjunction", label: { zh: "阳星合相" } },
	SUN_SIGN: { name: "Sun Sign", label: { zh: "太阳星座" } },
});

export const AST_TRACKERS = ensureRecord<ResourceData>()({
	ARCANA_1: { name: "Arcana 1", maximumCharges: 3, label: { zh: "奥秘卡1" } },
	ARCANA_2: { name: "Arcana 2", maximumCharges: 3, label: { zh: "奥秘卡2" } },
	ARCANA_3: { name: "Arcana 3", maximumCharges: 3, label: { zh: "奥秘卡3" } },
	NEXT_DRAW: { name: "Next Draw", label: { zh: "下一张卡" } },
});

export const AST_TRAITS = ensureRecord<TraitData>()({
	COMBUST_MASTERY_II: { name: "Combust Mastery II", level: 94 },
	MALEFIC_MASTERY_III: { name: "Malefic Mastery III", level: 96 },
	ENHANCED_ESSENTIAL_DIGNITY: { name: "Enhanced Essential Dignity", level: 98 },
	MALEFIC_MASTERY_IV: { name: "Malefic Mastery IV", level: 100 },
	GRAVITY_MASTERY: { name: "Gravity Mastery", level: 94 },
});

export type ASTActions = typeof AST_ACTIONS;
export type ASTActionKey = keyof ASTActions;

export type ASTCooldowns = typeof AST_COOLDOWNS;
export type ASTCooldownKey = keyof ASTCooldowns;

export type ASTGauges = typeof AST_GAUGES;
export type ASTGaugeKey = keyof ASTGauges;

export type ASTStatuses = typeof AST_STATUSES;
export type ASTStatusKey = keyof ASTStatuses;

export type ASTTrackers = typeof AST_TRACKERS;
export type ASTTrackerKey = keyof ASTTrackers;

export const AST_RESOURCES = {
	...AST_GAUGES,
	...AST_STATUSES,
	...AST_TRACKERS,
};
export type ASTResources = typeof AST_RESOURCES;
export type ASTResourceKey = keyof ASTResources;

export type ASTTraits = typeof AST_TRAITS;
export type ASTTraitKey = keyof ASTTraits;
