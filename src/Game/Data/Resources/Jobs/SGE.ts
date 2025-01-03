import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const SGE_GAUGES = ensureRecord<Resource>()({});
export type SGEGauges = typeof SGE_GAUGES;
export type SGEGaugeKey = keyof SGEGauges;

export const SGE_STATUSES = ensureRecord<Resource>()({});
export type SGEStatuses = typeof SGE_STATUSES;
export type SGEStatusKey = keyof SGEStatuses;

export const SGE_TRACKERS = ensureRecord<Resource>()({});
export type SGETrackers = typeof SGE_TRACKERS;
export type SGETrackerKey = keyof SGETrackers;

export const SGE = {
	...SGE_GAUGES,
	...SGE_STATUSES,
	...SGE_TRACKERS,
};
export type SGEResources = typeof SGE;
export type SGEResourceKey = keyof SGEResources;
