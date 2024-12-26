import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const SMN_GAUGES = ensureRecord<Resource>()({});
export type SMNGauges = typeof SMN_GAUGES;
export type SMNGaugeKey = keyof SMNGauges;

export const SMN_STATUSES = ensureRecord<Resource>()({});
export type SMNStatuses = typeof SMN_STATUSES;
export type SMNStatusKey = keyof SMNStatuses;

export const SMN_TRACKERS = ensureRecord<Resource>()({});
export type SMNTrackers = typeof SMN_TRACKERS;
export type SMNTrackerKey = keyof SMNTrackers;

export const SMN = {
	...SMN_GAUGES,
	...SMN_STATUSES,
	...SMN_TRACKERS,
};
export type SMNResources = typeof SMN;
export type SMNResourceKey = keyof SMNResources;
