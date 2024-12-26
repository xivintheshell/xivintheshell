import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const NIN_GAUGES = ensureRecord<Resource>()({});
export type NINGauges = typeof NIN_GAUGES;
export type NINGaugeKey = keyof NINGauges;

export const NIN_STATUSES = ensureRecord<Resource>()({});
export type NINStatuses = typeof NIN_STATUSES;
export type NINStatusKey = keyof NINStatuses;

export const NIN_TRACKERS = ensureRecord<Resource>()({});
export type NINTrackers = typeof NIN_TRACKERS;
export type NINTrackerKey = keyof NINTrackers;

export const NIN = {
	...NIN_GAUGES,
	...NIN_STATUSES,
	...NIN_TRACKERS,
};
export type NINResources = typeof NIN;
export type NINResourceKey = keyof NINResources;
