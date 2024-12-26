import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const DRK_GAUGES = ensureRecord<Resource>()({});
export type DRKGauges = typeof DRK_GAUGES;
export type DRKGaugeKey = keyof DRKGauges;

export const DRK_STATUSES = ensureRecord<Resource>()({});
export type DRKStatuses = typeof DRK_STATUSES;
export type DRKStatusKey = keyof DRKStatuses;

export const DRK_TRACKERS = ensureRecord<Resource>()({});
export type DRKTrackers = typeof DRK_TRACKERS;
export type DRKTrackerKey = keyof DRKTrackers;

export const DRK = {
	...DRK_GAUGES,
	...DRK_STATUSES,
	...DRK_TRACKERS,
};
export type DRKResources = typeof DRK;
export type DRKResourceKey = keyof DRKResources;
