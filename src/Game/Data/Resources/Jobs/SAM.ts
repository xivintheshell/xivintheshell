import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const SAM_GAUGES = ensureRecord<Resource>()({
	KENKI: { name: "Kenki" }, // [0, 100]
	SETSU: { name: "Setsu" }, // [0, 1]
	GETSU: { name: "Getsu" }, // [0, 1]
	KA_SEN: { name: "Ka" }, // [0, 1]
	MEDITATION: { name: "Meditation" }, // [0, 3]
});
export type SAMGauges = typeof SAM_GAUGES;
export type SAMGaugeKey = keyof SAMGauges;

export const SAM_STATUSES = ensureRecord<Resource>()({
	MEIKYO_SHISUI: { name: "Meikyo Shisui", maximumStacks: 3 }, // [0, 3]
	FUGETSU: { name: "Fugetsu" }, // [0, 1]
	FUKA: { name: "Fuka" }, // [0, 1]
	ZANSHIN_READY: { name: "Zanshin Ready" }, // [0, 1]
	TENDO: { name: "Tendo" }, // [0, 1]
	OGI_READY: { name: "Ogi Namikiri Ready" }, // [0, 1]
	TSUBAME_GAESHI_READY: { name: "Tsubame-gaeshi Ready" }, // [0, 1]
	THIRD_EYE: { name: "Third Eye" }, // [0, 1]
	TENGENTSU: { name: "Tengentsu" }, // [0, 1]
	TENGENTSUS_FORESIGHT: { name: "Tengentsu's Foresight" }, // [0, 1]
	MEDITATE: { name: "Meditate" }, // [0, 5]
	ENHANCED_ENPI: { name: "Enhanced Enpi" }, // [0, 1]
	HIGANBANA_DOT: { name: "HiganbanaDoT" }, // [0, 1]
});
export type SAMStatuses = typeof SAM_STATUSES;
export type SAMStatusKey = keyof SAMStatuses;

export const SAM_TRACKERS = ensureRecord<Resource>()({
	SAM_TWO_READY: { name: "SAMTwoReady" }, // [0, 1] for jinpu/shifu
	SAM_TWO_AOE_READY: { name: "SAMTwoAoeReady" }, // [0, 1] for mangetsu/oka
	GEKKO_READY: { name: "GekkoReady" }, // [0, 1]
	KASHA_READY: { name: "KashaReady" }, // [0, 1]
	KAESHI_OGI_READY: { name: "KaeshiOgiReady" }, // [0 , 1]

	// samurai kaeshi resources (behind the scenes)
	// 0 - nothing, 1 - kaeshi goken, 2 - tendo kaeshi goken, 3 - kaeshi midare, 4 - tendo kaeshi midare
	KAESHI_TRACKER: { name: "KaeshiTracker" }, // [0, 4]
});
export type SAMTrackers = typeof SAM_TRACKERS;
export type SAMTrackerKeys = keyof SAMTrackers;

export const SAM = {
	...SAM_GAUGES,
	...SAM_STATUSES,
	...SAM_TRACKERS,
};
export type SAMResources = typeof SAM;
export type SAMResourceKey = keyof SAMResources;
