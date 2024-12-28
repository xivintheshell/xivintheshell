import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const BLM = ensureRecord<Action>()({
	BLIZZARD: { name: "Blizzard", label: { zh: "冰1", ja: "ブリザド" } },
	FIRE: { name: "Fire", label: { zh: "火1", ja: "ファイア" } },
	BLIZZARD_II: { name: "Blizzard 2", label: { zh: "冰2", ja: "ブリザラ" } },
	FIRE_II: { name: "Fire 2", label: { zh: "火2", ja: "ファイラ" } },
	TRANSPOSE: { name: "Transpose", label: { zh: "星灵移位", ja: "トランス" } },
	THUNDER_III: { name: "Thunder 3", label: { zh: "雷3", ja: "サンダガ" } },
	THUNDER_IV: { name: "Thunder 4", label: { zh: "霹雷" } }, // TODO - Needs Japanese translation
	MANAWARD: { name: "Manaward", label: { zh: "魔罩", ja: "マバリア" } },
	MANAFONT: { name: "Manafont", label: { zh: "魔泉", ja: "マナフォント" } },
	LEY_LINES: { name: "Ley Lines", label: { zh: "黑魔纹", ja: "黒魔紋" } },
	FIRE_III: { name: "Fire 3", label: { zh: "火3", ja: "ファイガ" } },
	BLIZZARD_III: { name: "Blizzard 3", label: { zh: "冰3", ja: "ブリザガ" } },
	FREEZE: { name: "Freeze", label: { zh: "玄冰", ja: "フリーズ" } },
	FLARE: { name: "Flare", label: { zh: "核爆", ja: "フレア" } },
	BLIZZARD_IV: { name: "Blizzard 4", label: { zh: "冰4", ja: "ブリザジャ" } },
	FIRE_IV: { name: "Fire 4", label: { zh: "火4", ja: "ファイジャ" } },
	BETWEEN_THE_LINES: {
		name: "Between the Lines",
		label: { zh: "魔纹步", ja: "ラインズステップ" },
	},
	AETHERIAL_MANIPULATION: {
		name: "Aetherial Manipulation",
		label: { zh: "以太步", ja: "エーテリアルテップ" },
	},
	TRIPLECAST: { name: "Triplecast", label: { zh: "三连咏唱", ja: "三連魔" } },
	FOUL: { name: "Foul", label: { zh: "秽浊", ja: "ファウル" } },
	DESPAIR: { name: "Despair", label: { zh: "绝望", ja: "デスペア" } },
	UMBRAL_SOUL: { name: "Umbral Soul", label: { zh: "灵极魂", ja: "アンブラルソウル" } },
	XENOGLOSSY: { name: "Xenoglossy", label: { zh: "异言", ja: "ゼノグロシー" } },
	HIGH_FIRE_II: { name: "High Fire 2", label: { zh: "高火2", ja: "ハイファイラ" } },
	HIGH_BLIZZARD_II: { name: "High Blizzard 2", label: { zh: "高冰冻2", ja: "ハイブリザラ" } },
	AMPLIFIER: { name: "Amplifier", label: { zh: "详述", ja: "アンプリファイア" } },
	PARADOX: { name: "Paradox", label: { zh: "悖论", ja: "パラドックス" } },
	HIGH_THUNDER: { name: "High Thunder", label: { zh: "高闪雷", ja: "ハイサンダー" } },
	HIGH_THUNDER_II: { name: "High Thunder 2", label: { zh: "高震雷" } }, // TODO - Needs Japanese translation
	FLARE_STAR: { name: "Flare Star", label: { zh: "耀星", ja: "フレアスター" } },
	RETRACE: { name: "Retrace", label: { zh: "魔纹重置", ja: "魔紋再設置" } },
});

export type BLMActions = typeof BLM;
export type BLMActionKey = keyof BLMActions;
