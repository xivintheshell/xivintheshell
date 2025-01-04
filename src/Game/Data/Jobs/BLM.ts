import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource, Trait } from "../types";

export const BLM_ACTIONS = ensureRecord<Action>()({
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

export const BLM_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_TRANSPOSE: { name: "cd_Transpose" }, // [0, 1x]
	cd_LEY_LINES: { name: "cd_LeyLines" }, // [0, 1x]
	cd_MANAWARD: { name: "cd_Manaward" }, // [0, 1x]
	cd_BETWEEN_THE_LINES: { name: "cd_BetweenTheLines" }, // [0, 1x]
	cd_AETHERIAL_MANIPULATION: { name: "cd_AetherialManipulation" }, // [0, 1x]
	cd_TRIPLECAST: { name: "cd_Triplecast" }, // [0, 2x]
	cd_MANAFONT: { name: "cd_Manafont" }, // [0, 1x]
	cd_AMPLIFIER: { name: "cd_Amplifier" }, // [0, 1x]
	cd_RETRACE: { name: "cd_Retrace" }, // [0, 1x]
});

export const BLM_GAUGES = ensureRecord<Resource>()({
	POLYGLOT: { name: "Polyglot", label: { zh: "通晓" } }, // [0, 3]
	ASTRAL_FIRE: { name: "AstralFire", label: { zh: "星极火" } }, // [0, 3]
	UMBRAL_ICE: { name: "UmbralIce", label: { zh: "灵极冰" } }, // [0, 3]
	UMBRAL_HEART: { name: "UmbralHeart", label: { zh: "冰针" } }, // [0, 3]
	ENOCHIAN: { name: "Enochian", label: { zh: "天语" } }, // [0, 1]
	PARADOX: { name: "Paradox", label: { zh: "悖论" } }, // [0, 1]
	ASTRAL_SOUL: { name: "Astral Soul", label: { zh: "星极魂" } }, // [0, 6]
});

export const BLM_STATUSES = ensureRecord<Resource>()({
	LEY_LINES: { name: "Ley Lines", label: { zh: "黑魔纹" }, mayBeToggled: true }, // [0, 1]
	TRIPLECAST: { name: "Triplecast", label: { zh: "三重咏唱" }, maximumStacks: 3 }, // [0, 3]
	FIRESTARTER: { name: "Firestarter", label: { zh: "火苗" } }, // [0, 1]
	THUNDERHEAD: { name: "Thunderhead", label: { zh: "雷砧" } }, // [0, 1]
	THUNDER_III: { name: "Thunder III", label: { zh: "暴雷" } },
	THUNDER_IV: { name: "Thunder IV", label: { zh: "霹雷" } },
	HIGH_THUNDER: { name: "High Thunder", label: { zh: "高闪雷" } },
	HIGH_THUNDER_II: { name: "High Thunder II", label: { zh: "高震雷" } },
	MANAWARD: { name: "Manaward", label: { zh: "魔纹罩" } }, // [0, 1]
});

export const BLM_TRACKERS = ensureRecord<Resource>()({});

export const BLM_TRAITS = ensureRecord<Trait>()({
	ENHANCED_ENOCHIAN_II: { name: "Enhanced Enochian II", level: 78 },
	ENHANCED_POLYGLOT: { name: "Enhanced Polyglot", level: 80 },
	ENHANCED_FOUL: { name: "Enhanced Foul", level: 80 },
	ASPECT_MASTERY_IV: { name: "Aspect Mastery IV", level: 82 },
	ENHANCED_MANAFONT: { name: "Enhanced Manafont", level: 84 },
	ENHANCED_ENOCHIAN_III: { name: "Enhanced Enochian III", level: 86 },
	ASPECT_MASTERY_V: { name: "Aspect Mastery V", level: 90 },
	THUNDER_MASTERY_III: { name: "Thunder Mastery III", level: 92 },
	ENHANCED_LEYLINES: { name: "Enhanced Ley Lines", level: 96 },
	ENHANCED_ENOCHIAN_IV: { name: "Enhanced Enochian IV", level: 96 },
	ENHANCED_POLYGLOT_II: { name: "Enhanced Polyglot II", level: 98 },
	ENHANCED_ASTRAL_FIRE: { name: "Enhanced Astral Fire", level: 100 },
});

export type BLMActions = typeof BLM_ACTIONS;
export type BLMActionKey = keyof BLMActions;

export type BLMCooldowns = typeof BLM_COOLDOWNS;
export type BLMCooldownKey = keyof BLMCooldowns;

export type BLMGauges = typeof BLM_GAUGES;
export type BLMGaugeKey = keyof BLMGauges;

export type BLMStatuses = typeof BLM_STATUSES;
export type BLMStatusKey = keyof BLMStatuses;

export type BLMTrackers = typeof BLM_TRACKERS;
export type BLMTrackerKey = keyof BLMTrackers;

export const BLM_RESOURCES = {
	...BLM_GAUGES,
	...BLM_STATUSES,
	...BLM_TRACKERS,
};
export type BLMResources = typeof BLM_RESOURCES;
export type BLMResourceKey = keyof BLMResources;

export type BLMTraits = typeof BLM_TRAITS;
export type BLMTraitKey = keyof BLMTraits;
