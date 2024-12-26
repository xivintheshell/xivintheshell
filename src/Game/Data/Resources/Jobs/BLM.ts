import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const BLM_GAUGES = ensureRecord<Resource>()({
	POLYGLOT: { name: "Polyglot" }, // [0, 3]
	ASTRAL_FIRE: { name: "AstralFire" }, // [0, 3]
	UMBRAL_ICE: { name: "UmbralIce" }, // [0, 3]
	UMBRAL_HEART: { name: "UmbralHeart" }, // [0, 3]
	ENOCHIAN: { name: "Enochian" }, // [0, 1]
	PARADOX: { name: "Paradox" }, // [0, 1]
	ASTRAL_SOUL: { name: "Astral Soul" }, // [0, 6]
});
export type BLMGauges = typeof BLM_GAUGES;
export type BLMGaugeKey = keyof BLMGauges;

export const BLM_STATUSES = ensureRecord<Resource>()({
	LEY_LINES: { name: "Ley Lines", mayBeToggled: true }, // [0, 1]
	TRIPLECAST: { name: "Triplecast", maximumStacks: 3 }, // [0, 3]
	FIRESTARTER: { name: "Firestarter" }, // [0, 1]
	THUNDERHEAD: { name: "Thunderhead" }, // [0, 1]
	THUNDER_III: { name: "Thunder III" },
	THUNDER_IV: { name: "Thunder IV" },
	HIGH_THUNDER: { name: "High Thunder" },
	HIGH_THUNDER_II: { name: "High Thunder II" },
	MANAWARD: { name: "Manaward" }, // [0, 1]
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
