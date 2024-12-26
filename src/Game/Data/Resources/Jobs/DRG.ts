import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const DRG_GAUGES = ensureRecord<Resource>()({});
export type DRGGauges = typeof DRG_GAUGES;
export type DRGGaugeKey = keyof DRGGauges;

export const DRG_STATUSES = ensureRecord<Resource>()({});
export type DRGStatuses = typeof DRG_STATUSES;
export type DRGStatusKey = keyof DRGStatuses;

export const DRG_TRACKERS = ensureRecord<Resource>()({});
export type DRGTrackers = typeof DRG_TRACKERS;
export type DRGTrackerKey = keyof DRGTrackers;

export const DRG = {
	...DRG_GAUGES,
	...DRG_STATUSES,
	...DRG_TRACKERS,
};
export type DRGResources = typeof DRG;
export type DRGResourceKey = keyof DRGResources;
