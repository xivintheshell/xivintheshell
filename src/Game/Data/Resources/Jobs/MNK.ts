import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const MNK_GAUGES = ensureRecord<Resource>()({});
export type MNKGauges = typeof MNK_GAUGES;
export type MNKGaugeKey = keyof MNKGauges;

export const MNK_STATUSES = ensureRecord<Resource>()({});
export type MNKStatuses = typeof MNK_STATUSES;
export type MNKStatusKey = keyof MNKStatuses;

export const MNK_TRACKERS = ensureRecord<Resource>()({});
export type MNKTrackers = typeof MNK_TRACKERS;
export type MNKTrackerKey = keyof MNKTrackers;

export const MNK = {
	...MNK_GAUGES,
	...MNK_STATUSES,
	...MNK_TRACKERS,
};
export type MNKResources = typeof MNK;
export type MNKResourceKey = keyof MNKResources;
