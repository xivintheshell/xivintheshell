import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const PCT_ACTIONS = ensureRecord<ActionData>()({
	FIRE_IN_RED: { name: "Fire in Red", label: { zh: "火炎之红", ja: "レッドファイア" } },
	AERO_IN_GREEN: { name: "Aero in Green", label: { zh: "疾风之绿", ja: "グリーンエアロ" } },
	WATER_IN_BLUE: { name: "Water in Blue", label: { zh: "流水之蓝", ja: "ブルーウォータ" } },
	FIRE_II_IN_RED: { name: "Fire II in Red", label: { zh: "烈炎之红", ja: "レッドファイラ" } },
	AERO_II_IN_GREEN: {
		name: "Aero II in Green",
		label: { zh: "烈风之绿", ja: "グリーンエアロラ" },
	},
	WATER_II_IN_BLUE: { name: "Water II in Blue", label: { zh: "激水之蓝", ja: "ブルーウォタラ" } },
	BLIZZARD_IN_CYAN: {
		name: "Blizzard in Cyan",
		label: { zh: "冰结之蓝青", ja: "シアンブリザド" },
	},
	STONE_IN_YELLOW: {
		name: "Stone in Yellow",
		label: { zh: "飞石之纯黄", ja: "イエローストーン" },
	},
	THUNDER_IN_MAGENTA: {
		name: "Thunder in Magenta",
		label: { zh: "闪雷之品红", ja: "マゼンタサンダー" },
	},
	BLIZZARD_II_IN_CYAN: {
		name: "Blizzard II in Cyan",
		label: { zh: "冰冻之蓝青", ja: "イエローストンラ" },
	},
	STONE_II_IN_YELLOW: {
		name: "Stone II in Yellow",
		label: { zh: "坚石之纯黄", ja: "マゼンタサンダラ" },
	},
	THUNDER_II_IN_MAGENTA: { name: "Thunder II in Magenta", label: { zh: "震雷之品红", ja: "" } },
	HOLY_IN_WHITE: { name: "Holy in White", label: { zh: "神圣之白", ja: "ホワイトホーリー" } },
	COMET_IN_BLACK: { name: "Comet in Black", label: { zh: "彗星之黑", ja: "ブラックコメット" } },
	RAINBOW_DRIP: { name: "Rainbow Drip", label: { zh: "彩虹点滴", ja: "レインボードリップ" } },
	STAR_PRISM: { name: "Star Prism", label: { zh: "天星棱光", ja: "スタープリズム" } },

	TEMPERA_COAT: { name: "Tempera Coat", label: { zh: "坦培拉涂层", ja: "テンペラコート" } },
	TEMPERA_GRASSA: {
		name: "Tempera Grassa",
		label: { zh: "油性坦培拉涂层", ja: "テンペラグラッサ" },
	},
	TEMPERA_COAT_POP: {
		name: "Pop Tempera Coat",
		label: { zh: "坦培拉涂层破盾", ja: "テンペラコート【ブレイク】" },
	},
	TEMPERA_GRASSA_POP: {
		name: "Pop Tempera Grassa",
		label: { zh: "油性坦培拉涂层破盾", ja: "テンペラグラッサ【ブレイク】" },
	},
	SMUDGE: { name: "Smudge", label: { zh: "速涂", ja: "スマッジ" } },
	SUBTRACTIVE_PALETTE: {
		name: "Subtractive Palette",
		label: { zh: "减色混合", ja: "サブトラクティブパレット" },
	},

	CREATURE_MOTIF: { name: "Creature Motif", label: { zh: "动物彩绘", ja: "ピクトアニマル" } },
	POM_MOTIF: { name: "Pom Motif", label: { zh: "绒球彩绘", ja: "ピクトアニマル" } },
	WING_MOTIF: { name: "Wing Motif", label: { zh: "翅膀彩绘", ja: "ピクトスケープ" } },
	CLAW_MOTIF: { name: "Claw Motif", label: { zh: "兽爪彩绘", ja: "ピクトクロー" } },
	MAW_MOTIF: { name: "Maw Motif", label: { zh: "尖牙彩绘", ja: "ピクトファング" } },
	LIVING_MUSE: { name: "Living Muse", label: { zh: "动物构想", ja: "イマジンアニマル" } },
	POM_MUSE: { name: "Pom Muse", label: { zh: "绒球构想", ja: "ピクトポンポン" } },
	WINGED_MUSE: { name: "Winged Muse", label: { zh: "翅膀构想", ja: "ピクトウィング" } },
	CLAWED_MUSE: { name: "Clawed Muse", label: { zh: "兽爪构想", ja: "イマジンクロー" } },
	FANGED_MUSE: { name: "Fanged Muse", label: { zh: "尖牙构想", ja: "イマジンファング" } },
	MOG_OF_THE_AGES: {
		name: "Mog of the Ages",
		label: { zh: "莫古力激流", ja: "モーグリストリーム" },
	},
	RETRIBUTION_OF_THE_MADEEN: {
		name: "Retribution of the Madeen",
		label: { zh: "马蒂恩惩罚", ja: "マディーンレトリビューション" },
	},

	WEAPON_MOTIF: { name: "Weapon Motif", label: { zh: "武器彩绘", ja: "ピクトウェポン" } },
	STEEL_MUSE: { name: "Steel Muse", label: { zh: "武器构想", ja: "イマジンウェポン" } },
	HAMMER_MOTIF: { name: "Hammer Motif", label: { zh: "重锤彩绘", ja: "ピクトハンマー" } },
	STRIKING_MUSE: { name: "Striking Muse", label: { zh: "重锤构想", ja: "イマジンハンマー" } },
	HAMMER_STAMP: { name: "Hammer Stamp", label: { zh: "重锤敲章", ja: "ハンマースタンプ" } },
	HAMMER_BRUSH: { name: "Hammer Brush", label: { zh: "重锤掠刷", ja: "ハンマーブラッシュ" } },
	POLISHING_HAMMER: {
		name: "Polishing Hammer",
		label: { zh: "重锤抛光", ja: "ハンマーポリッシュ" },
	},

	LANDSCAPE_MOTIF: { name: "Landscape Motif", label: { zh: "风景彩绘", ja: "ピクトスケープ" } },
	SCENIC_MUSE: { name: "Scenic Muse", label: { zh: "风景构想", ja: "イマジンスケープ" } },
	STARRY_SKY_MOTIF: { name: "Starry Sky Motif", label: { zh: "星空彩绘", ja: "ピクトスカイ" } },
	STARRY_MUSE: { name: "Starry Muse", label: { zh: "星空构想", ja: "イマジンスカイ" } },
});

export const PCT_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_TEMPERA_COAT: { name: "cd_TemperaCoat" }, // [0, 120]
	cd_SMUDGE: { name: "cd_Smudge" }, // [0, 20]
	cd_LIVING_MUSE: { name: "cd_LivingMuse" }, // [0, 40]
	cd_PORTRAIT: { name: "cd_Portrait", label: { zh: "CD：莫古力激流/马蒂恩惩罚" } }, // [0, 30]
	cd_STEEL_MUSE: { name: "cd_SteelMuse" }, // [0, 60]
	cd_SCENIC_MUSE: { name: "cd_ScenicMuse" }, // [0, 120]
	cd_SUBTRACTIVE: { name: "cd_Subtractive", label: { zh: "CD：减色混合" } }, // [0, 1], not real
	cd_GRASSA: { name: "cd_Grassa", label: { zh: "CD：油性坦培拉涂层" } }, // [0, 1], not real
	cd_TEMPERA_POP: { name: "cd_TemperaPop", label: { zh: "CD：坦培拉涂层破盾" } }, // [0, 1], also not real
});
export const PCT_GAUGES = ensureRecord<ResourceData>()({
	PORTRAIT: { name: "Portrait", label: { zh: "肖像标识（无/莫古力/马蒂恩）" } }, // [0, 2] 1 = moogle, 2 = madeen
	DEPICTIONS: { name: "Depictions", label: { zh: "动物标识（绒球/翅膀/兽爪/尖牙）" } }, // [0, 3] used to show which creature motifs have been drawn
	CREATURE_CANVAS: { name: "Creature Canvas", label: { zh: "动物画" } }, // [0, 1]
	WEAPON_CANVAS: { name: "Weapon Canvas", label: { zh: "武器画" } }, // [0, 1]
	LANDSCAPE_CANVAS: { name: "Landscape Canvas", label: { zh: "风景画" } }, // [0, 1]
	PALETTE_GAUGE: { name: "Palette Gauge", label: { zh: "调色量谱" } }, // [0, 100]
	PAINT: { name: "Paint", label: { zh: "颜料量谱" } }, // [0, 5]
});

export const PCT_STATUSES = ensureRecord<ResourceData>()({
	// Technically two different buffs, but we're treating it like a stacked buff here
	AETHERHUES: {
		name: "Aetherhues",
		label: { zh: "以太色调" },
		mayNotBeCanceled: true,
		maximumStacks: 2,
	}, // [0, 2]
	MONOCHROME_TONES: { name: "Monochrome Tones", label: { zh: "色调反转" } }, // [0, 1]
	SUBTRACTIVE_PALETTE: {
		name: "Subtractive Palette",
		label: { zh: "减色混合" },
		mayNotBeCanceled: true,
		maximumStacks: 3,
	}, // [0, 3]
	HAMMER_TIME: {
		name: "Hammer Time",
		label: { zh: "重锤连击" },
		mayNotBeCanceled: true,
		maximumStacks: 3,
	}, // [0, 3]
	INSPIRATION: { name: "Inspiration", label: { zh: "绘画装置" }, mayBeToggled: true }, // [0, 1]
	SUBTRACTIVE_SPECTRUM: { name: "Subtractive Spectrum", label: { zh: "减色混合预备" } }, // [0, 1]
	HYPERPHANTASIA: { name: "Hyperphantasia", label: { zh: "绘灵幻景" }, maximumStacks: 5 }, // [0, 5]
	RAINBOW_BRIGHT: { name: "Rainbow Bright", label: { zh: "彩虹点滴效果提高" } }, // [0, 1]
	STARSTRUCK: { name: "Starstruck", label: { zh: "天星棱光预备" } }, // [0, 1]
	STARRY_MUSE: { name: "Starry Muse", label: { zh: "星空构想" } }, // [0, 1]
	TEMPERA_COAT: { name: "Tempera Coat", label: { zh: "坦培拉涂层" } },
	TEMPERA_GRASSA: { name: "Tempera Grassa", label: { zh: "油性坦培拉涂层" } },
	SMUDGE: { name: "Smudge", label: { zh: "速涂" } },
});

export const PCT_TRACKERS = ensureRecord<ResourceData>()({
	// Hammer actions are a proper combo, not strictly tied to Hammer Time buff
	HAMMER_COMBO: { name: "Hammer Combo Counter", label: { zh: "重锤连击数" } }, // [0, 2]
});

export const PCT_TRAITS = ensureRecord<TraitData>()({
	PICTOMANCY_MASTERY_II: { name: "Pictomancy Mastery II", level: 74 },
	ENHANCED_ARTISTRY: { name: "Enhanced Artistry", level: 80 },
	ENHANCED_PICTOMANCY: { name: "Enhanced Pictomancy", level: 82 },
	ENHANCED_SMUDGE: { name: "Enhanced Smudge", level: 84 },
	PICTOMANCY_MASTERY_III: { name: "Pictomancy Mastery III", level: 84 },
	ENHANCED_PICTOMANCY_II: { name: "Enhanced Pictomancy II", level: 86 },
	ENHANCED_TEMPERA: { name: "Enhanced Tempera", level: 88 },
	ENHANCED_PALETTE: { name: "Enhanced Palette", level: 90 },
	ENHANCED_PICTOMANCY_III: { name: "Enhanced Pictomancy III", level: 92 },
	PICTOMANCY_MASTERY_IV: { name: "Pictomancy Mastery IV", level: 94 },
	ENHANCED_PICTOMANCY_IV: { name: "Enhanced Pictomancy IV", level: 96 },
	ENHANCED_PICTOMANCY_V: { name: "Enhanced Pictomancy V", level: 100 },
});

export type PCTActions = typeof PCT_ACTIONS;
export type PCTActionKey = keyof PCTActions;

export type PCTCooldowns = typeof PCT_COOLDOWNS;
export type PCTCooldownKey = keyof PCTCooldowns;

export type PCTGauges = typeof PCT_GAUGES;
export type PCTGaugeKey = keyof PCTGauges;

export type PCTStatuses = typeof PCT_STATUSES;
export type PCTStatusKey = keyof PCTStatuses;

export type PCTTrackers = typeof PCT_TRACKERS;
export type PCTTrackerKey = keyof PCTTrackers;

export const PCT_RESOURCES = {
	...PCT_GAUGES,
	...PCT_STATUSES,
	...PCT_TRACKERS,
};
export type PCTResources = typeof PCT_RESOURCES;
export type PCTResourceKey = keyof PCTResources;

export type PCTTraits = typeof PCT_TRAITS;
export type PCTTraitKey = keyof PCTTraits;
