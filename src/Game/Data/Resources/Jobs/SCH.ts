import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const SCH_GAUGES = ensureRecord<Resource>()({});
export type SCHGauges = typeof SCH_GAUGES;
export type SCHGaugeKey = keyof SCHGauges;

export const SCH_STATUSES = ensureRecord<Resource>()({});
export type SCHStatuses = typeof SCH_STATUSES;
export type SCHStatusKey = keyof SCHStatuses;

export const SCH_TRACKERS = ensureRecord<Resource>()({});
export type SCHTrackers = typeof SCH_TRACKERS;
export type SCHTrackerKey = keyof SCHTrackers;

export const SCH = {
	...SCH_GAUGES,
	...SCH_STATUSES,
	...SCH_TRACKERS,
};
export type SCHResources = typeof SCH;
export type SCHResourceKey = keyof SCHResources;
