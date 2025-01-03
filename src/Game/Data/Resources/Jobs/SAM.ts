import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const SAM_GAUGES = ensureRecord<Resource>()({
	KENKI: { name: "Kenki", label: { zh: "剑气" } }, // [0, 100]
	SETSU: { name: "Setsu", label: { zh: "雪闪" } }, // [0, 1]
	GETSU: { name: "Getsu", label: { zh: "月闪" } }, // [0, 1]
	KA_SEN: { name: "Ka", label: { zh: "花闪" } }, // [0, 1]
	MEDITATION: { name: "Meditation", label: { zh: "默想" } }, // [0, 3]
});
export type SAMGauges = typeof SAM_GAUGES;
export type SAMGaugeKey = keyof SAMGauges;

export const SAM_STATUSES = ensureRecord<Resource>()({
	MEIKYO_SHISUI: { name: "Meikyo Shisui", label: { zh: "明镜止水" }, maximumStacks: 3 }, // [0, 3]
	FUGETSU: { name: "Fugetsu", label: { zh: "风月" } }, // [0, 1]
	FUKA: { name: "Fuka", label: { zh: "风花" } }, // [0, 1]
	ZANSHIN_READY: { name: "Zanshin Ready", label: { zh: "残心预备" } }, // [0, 1]
	TENDO: { name: "Tendo", label: { zh: "天道" } }, // [0, 1]
	OGI_READY: { name: "Ogi Namikiri Ready", label: { zh: "奥义斩浪预备" } }, // [0, 1]
	TSUBAME_GAESHI_READY: { name: "Tsubame-gaeshi Ready", label: { zh: "燕回返预备" } }, // [0, 1]
	THIRD_EYE: { name: "Third Eye", label: { zh: "心眼" } }, // [0, 1]
	TENGENTSU: { name: "Tengentsu", label: { zh: "天眼通" } }, // [0, 1]
	TENGENTSUS_FORESIGHT: { name: "Tengentsu's Foresight", label: { zh: "通天眼" } }, // [0, 1]
	MEDITATE: { name: "Meditate", label: { zh: "默想" } }, // [0, 5]
	ENHANCED_ENPI: { name: "Enhanced Enpi", label: { zh: "燕飞效果提高" } }, // [0, 1]
	HIGANBANA_DOT: { name: "HiganbanaDoT", label: { zh: "彼岸花dot" } }, // [0, 1]
});
export type SAMStatuses = typeof SAM_STATUSES;
export type SAMStatusKey = keyof SAMStatuses;

export const SAM_TRACKERS = ensureRecord<Resource>()({
	SAM_TWO_READY: { name: "SAMTwoReady", label: { zh: "连击2预备" } }, // [0, 1] for jinpu/shifu
	SAM_TWO_AOE_READY: { name: "SAMTwoAoeReady", label: { zh: "AOE2预备" } }, // [0, 1] for mangetsu/oka
	GEKKO_READY: { name: "GekkoReady", label: { zh: "月光预备" } }, // [0, 1]
	KASHA_READY: { name: "KashaReady", label: { zh: "花车预备" } }, // [0, 1]
	KAESHI_OGI_READY: { name: "KaeshiOgiReady", label: { zh: "回返斩浪预备" } }, // [0 , 1]

	// samurai kaeshi resources (behind the scenes)
	// 0 - nothing, 1 - kaeshi goken, 2 - tendo kaeshi goken, 3 - kaeshi midare, 4 - tendo kaeshi midare
	KAESHI_TRACKER: { name: "KaeshiTracker", label: { zh: "回返状态" } }, // [0, 4]
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
