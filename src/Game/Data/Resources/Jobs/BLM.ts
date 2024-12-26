import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const BLM_GAUGES = ensureRecord<Resource>()({
	POLYGLOT: { name: "Polyglot", label: { zh: "通晓" } }, // [0, 3]
	ASTRAL_FIRE: { name: "AstralFire", label: { zh: "星极火" } }, // [0, 3]
	UMBRAL_ICE: { name: "UmbralIce", label: { zh: "灵极冰" } }, // [0, 3]
	UMBRAL_HEART: { name: "UmbralHeart", label: { zh: "冰针" } }, // [0, 3]
	ENOCHIAN: { name: "Enochian", label: { zh: "天语" } }, // [0, 1]
	PARADOX: { name: "Paradox", label: { zh: "悖论" } }, // [0, 1]
	ASTRAL_SOUL: { name: "Astral Soul", label: { zh: "星极魂" } }, // [0, 6]
});
export type BLMGauges = typeof BLM_GAUGES;
export type BLMGaugeKey = keyof BLMGauges;

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
export type BLMStatuses = typeof BLM_STATUSES;
export type BLMStatusKey = keyof BLMStatuses;

export const BLM_TRACKERS = ensureRecord<Resource>()({});
export type BLMTrackers = typeof BLM_TRACKERS;
export type BLMTrackerKey = keyof BLMTrackers;

export const BLM = {
	...BLM_GAUGES,
	...BLM_STATUSES,
	...BLM_TRACKERS,
};
export type BLMResources = typeof BLM;
export type BLMResourceKey = keyof BLMResources;
