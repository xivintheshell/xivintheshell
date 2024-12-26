import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const VPR_GAUGES = ensureRecord<Resource>()({});
export type VPRGauges = typeof VPR_GAUGES;
export type VPRGaugeKey = keyof VPRGauges;

export const VPR_STATUSES = ensureRecord<Resource>()({});
export type VPRStatuses = typeof VPR_STATUSES;
export type VPRStatusKey = keyof VPRStatuses;

export const VPR_TRACKERS = ensureRecord<Resource>()({});
export type VPRTrackers = typeof VPR_TRACKERS;
export type VPRTrackerKey = keyof VPRTrackers;

export const VPR = {
	...VPR_GAUGES,
	...VPR_STATUSES,
	...VPR_TRACKERS,
};
export type VPRResources = typeof VPR;
export type VPRResourceKey = keyof VPRResources;
