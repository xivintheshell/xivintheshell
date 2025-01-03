import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const GNB_GAUGES = ensureRecord<Resource>()({});
export type GNBGauges = typeof GNB_GAUGES;
export type GNBGaugeKey = keyof GNBGauges;

export const GNB_STATUSES = ensureRecord<Resource>()({});
export type GNBStatuses = typeof GNB_STATUSES;
export type GNBStatusKey = keyof GNBStatuses;

export const GNB_TRACKERS = ensureRecord<Resource>()({});
export type GNBTrackers = typeof GNB_TRACKERS;
export type GNBTrackerKey = keyof GNBTrackers;

export const GNB = {
	...GNB_GAUGES,
	...GNB_STATUSES,
	...GNB_TRACKERS,
};
export type GNBResources = typeof GNB;
export type GNBResourceKey = keyof GNBResources;
