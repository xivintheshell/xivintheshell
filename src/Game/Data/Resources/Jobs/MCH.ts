import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const MCH_GAUGES = ensureRecord<Resource>()({
	HEAT_GAUGE: { name: "Heat", label: { zh: "枪管热度" } },
	BATTERY_GAUGE: { name: "Battery", label: { zh: "电能" } },
});
export type MCHGauges = typeof MCH_GAUGES;
export type MCHGaugeKey = keyof MCHGauges;

export const MCH_STATUSES = ensureRecord<Resource>()({
	REASSEMBLED: { name: "Reassembled", label: { zh: "整备预备" } },
	OVERHEATED: { name: "Overheated", label: { zh: "过热状态" }, maximumStacks: 5 },
	WILDFIRE: { name: "Wildfire", label: { zh: "野火（敌）" } },
	WILDFIRE_SELF: { name: "Wildfire Self", label: { zh: "野火（我）" } },
	FLAMETHROWER: { name: "Flamethrower", label: { zh: "火焰喷射器持续中" } },
	BIOBLASTER: { name: "Bioblaster", label: { zh: "毒菌冲击" } },
	TACTICIAN: { name: "Tactician", label: { zh: "策动" } },
	HYPERCHARGED: { name: "Hypercharged", label: { zh: "超荷预备" } },
	EXCAVATOR_READY: { name: "Excavator Ready", label: { zh: "掘地飞轮预备" } },
	FULL_METAL_MACHINIST: { name: "Full Metal Machinist", label: { zh: "全金属爆发预备" } },
});
export type MCHStatuses = typeof MCH_STATUSES;
export type MCHStatusKey = keyof MCHStatuses;

export const MCH_TRACKERS = ensureRecord<Resource>()({
	HEAT_COMBO: { name: "Heat Combo", label: { zh: "热连击" } },
	QUEEN: { name: "Queen", label: { zh: "人偶预备" } },
	QUEEN_PUNCHES: { name: "QueenPunches", label: { zh: "人偶铁壁拳" } },
	QUEEN_FINISHERS: { name: "QueenFinishers", label: { zh: "人偶离场" } },
	BATTERY_BONUS: { name: "BatteryBonus", label: { zh: "额外电量" } },
	WILDFIRE_HITS: { name: "WildfireHits", label: { zh: "野火命中" } },
});
export type MCHTrackers = typeof MCH_TRACKERS;
export type MCHTrackerKey = keyof MCHTrackers;

export const MCH = {
	...MCH_GAUGES,
	...MCH_STATUSES,
	...MCH_TRACKERS,
};
export type MCHResources = typeof MCH;
export type MCHResourceKey = keyof MCHResources;
