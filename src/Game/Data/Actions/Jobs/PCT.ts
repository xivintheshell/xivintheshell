import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const PCT = ensureRecord<Action>()({
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

export type PCTActions = typeof PCT;
export type PCTActionKey = keyof PCTActions;
