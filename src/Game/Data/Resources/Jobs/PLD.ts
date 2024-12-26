import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const PLD_GAUGES = ensureRecord<Resource>()({});
export type PLDGauges = typeof PLD_GAUGES;
export type PLDGaugeKey = keyof PLDGauges;

export const PLD_STATUSES = ensureRecord<Resource>()({});
export type PLDStatuses = typeof PLD_STATUSES;
export type PLDStatusKey = keyof PLDStatuses;

export const PLD_TRACKERS = ensureRecord<Resource>()({});
export type PLDTrackers = typeof PLD_TRACKERS;
export type PLDTrackerKey = keyof PLDTrackers;

export const PLD = {
	...PLD_GAUGES,
	...PLD_STATUSES,
	...PLD_TRACKERS,
};
export type PLDResources = typeof PLD;
export type PLDResourceKey = keyof PLDResources;
