import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const MCH_GAUGES = ensureRecord<Resource>()({
	HEAT_GAUGE: { name: "Heat" },
	BATTERY_GAUGE: { name: "Battery" },
});
export type MCHGauges = typeof MCH_GAUGES;
export type MCHGaugeKey = keyof MCHGauges;

export const MCH_STATUSES = ensureRecord<Resource>()({
	REASSEMBLED: { name: "Reassembled" },
	OVERHEATED: { name: "Overheated", maximumStacks: 5 },
	WILDFIRE: { name: "Wildfire" },
	WILDFIRE_SELF: { name: "Wildfire Self" },
	FLAMETHROWER: { name: "Flamethrower" },
	BIOBLASTER: { name: "Bioblaster" },
	TACTICIAN: { name: "Tactician" },
	HYPERCHARGED: { name: "Hypercharged" },
	EXCAVATOR_READY: { name: "Excavator Ready" },
	FULL_METAL_MACHINIST: { name: "Full Metal Machinist" },
});
export type MCHStatuses = typeof MCH_STATUSES;
export type MCHStatusKey = keyof MCHStatuses;

export const MCH_TRACKERS = ensureRecord<Resource>()({
	HEAT_COMBO: { name: "Heat Combo" },
	QUEEN: { name: "Queen" },
	QUEEN_PUNCHES: { name: "QueenPunches" },
	QUEEN_FINISHERS: { name: "QueenFinishers" },
	BATTERY_BONUS: { name: "BatteryBonus" },
	WILDFIRE_HITS: { name: "WildfireHits" },
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
