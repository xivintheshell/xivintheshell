import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const WHM_GAUGES = ensureRecord<Resource>()({});
export type WHMGauges = typeof WHM_GAUGES;
export type WHMGaugeKey = keyof WHMGauges;

export const WHM_STATUSES = ensureRecord<Resource>()({});
export type WHMStatuses = typeof WHM_STATUSES;
export type WHMStatusKey = keyof WHMStatuses;

export const WHM_TRACKERS = ensureRecord<Resource>()({});
export type WHMTrackers = typeof WHM_TRACKERS;
export type WHMTrackerKey = keyof WHMTrackers;

export const WHM = {
	...WHM_GAUGES,
	...WHM_STATUSES,
	...WHM_TRACKERS,
};
export type WHMResources = typeof WHM;
export type WHMResourceKey = keyof WHMResources;
