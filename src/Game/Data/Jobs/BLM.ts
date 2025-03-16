import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const BLM_ACTIONS = ensureRecord<ActionData>()({
	BLIZZARD: {
		id: 142,
		name: "Blizzard",
		label: { zh: "冰1", ja: "ブリザド" },
	},
	FIRE: {
		id: 141,
		name: "Fire",
		label: { zh: "火1", ja: "ファイア" },
	},
	BLIZZARD_II: {
		id: 25793,
		name: "Blizzard 2",
		label: { zh: "冰2", ja: "ブリザラ" },
	},
	FIRE_II: { id: 147, name: "Fire 2", label: { zh: "火2", ja: "ファイラ" } },
	TRANSPOSE: { id: 149, name: "Transpose", label: { zh: "星灵移位", ja: "トランス" } },
	THUNDER_III: { id: 153, name: "Thunder 3", label: { zh: "雷3", ja: "サンダガ" } },
	THUNDER_IV: { id: 7420, name: "Thunder 4", label: { zh: "霹雷" } }, // TODO - Needs Japanese translation
	MANAWARD: { id: 157, name: "Manaward", label: { zh: "魔罩", ja: "マバリア" } },
	MANAFONT: { id: 158, name: "Manafont", label: { zh: "魔泉", ja: "マナフォント" } },
	LEY_LINES: { id: 3573, name: "Ley Lines", label: { zh: "黑魔纹", ja: "黒魔紋" } },
	FIRE_III: { id: 152, name: "Fire 3", label: { zh: "火3", ja: "ファイガ" } },
	BLIZZARD_III: { id: 154, name: "Blizzard 3", label: { zh: "冰3", ja: "ブリザガ" } },
	FREEZE: { id: 159, name: "Freeze", label: { zh: "玄冰", ja: "フリーズ" } },
	FLARE: { id: 162, name: "Flare", label: { zh: "核爆", ja: "フレア" } },
	BLIZZARD_IV: { id: 3576, name: "Blizzard 4", label: { zh: "冰4", ja: "ブリザジャ" } },
	FIRE_IV: { id: 3577, name: "Fire 4", label: { zh: "火4", ja: "ファイジャ" } },
	BETWEEN_THE_LINES: {
		id: 7419,
		name: "Between the Lines",
		label: { zh: "魔纹步", ja: "ラインズステップ" },
	},
	AETHERIAL_MANIPULATION: {
		id: 155,
		name: "Aetherial Manipulation",
		label: { zh: "以太步", ja: "エーテリアルテップ" },
	},
	TRIPLECAST: { id: 7421, name: "Triplecast", label: { zh: "三连咏唱", ja: "三連魔" } },
	FOUL: { id: 7422, name: "Foul", label: { zh: "秽浊", ja: "ファウル" } },
	DESPAIR: { id: 16505, name: "Despair", label: { zh: "绝望", ja: "デスペア" } },
	UMBRAL_SOUL: {
		id: 16506,
		name: "Umbral Soul",
		label: { zh: "灵极魂", ja: "アンブラルソウル" },
	},
	XENOGLOSSY: { id: 16507, name: "Xenoglossy", label: { zh: "异言", ja: "ゼノグロシー" } },
	HIGH_FIRE_II: { id: 25794, name: "High Fire 2", label: { zh: "高火2", ja: "ハイファイラ" } },
	HIGH_BLIZZARD_II: {
		id: 25795,
		name: "High Blizzard 2",
		label: { zh: "高冰冻2", ja: "ハイブリザラ" },
	},
	AMPLIFIER: { id: 25796, name: "Amplifier", label: { zh: "详述", ja: "アンプリファイア" } },
	PARADOX: { id: 25797, name: "Paradox", label: { zh: "悖论", ja: "パラドックス" } },
	HIGH_THUNDER: { id: 36986, name: "High Thunder", label: { zh: "高闪雷", ja: "ハイサンダー" } },
	HIGH_THUNDER_II: { id: 36987, name: "High Thunder 2", label: { zh: "高震雷" } }, // TODO - Needs Japanese translation
	FLARE_STAR: { id: 36989, name: "Flare Star", label: { zh: "耀星", ja: "フレアスター" } },
	RETRACE: { id: 36988, name: "Retrace", label: { zh: "魔纹重置", ja: "魔紋再設置" } },
});

export const BLM_COOLDOWNS = ensureRecord<CooldownData>()({
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

export const BLM_GAUGES = ensureRecord<ResourceData>()({
	POLYGLOT: { name: "Polyglot", label: { zh: "通晓" } }, // [0, 3]
	ASTRAL_FIRE: { name: "Astral Fire", label: { zh: "星极火" } }, // [0, 3]
	UMBRAL_ICE: { name: "Umbral Ice", label: { zh: "灵极冰" } }, // [0, 3]
	UMBRAL_HEART: { name: "Umbral Heart", label: { zh: "冰针" } }, // [0, 3]
	ENOCHIAN: { name: "Enochian", label: { zh: "天语" } }, // [0, 1]
	PARADOX: { name: "Paradox", label: { zh: "悖论" } }, // [0, 1]
	ASTRAL_SOUL: { name: "Astral Soul", label: { zh: "星极魂" } }, // [0, 6]
});

export const BLM_STATUSES = ensureRecord<ResourceData>()({
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

export const BLM_TRACKERS = ensureRecord<ResourceData>()({});

export const BLM_TRAITS = ensureRecord<TraitData>()({
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
