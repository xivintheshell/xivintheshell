import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const VPR_ACTIONS = ensureRecord<ActionData>()({});

export const VPR_COOLDOWNS = ensureRecord<CooldownData>()({});

export const VPR_GAUGES = ensureRecord<ResourceData>()({});

export const VPR_STATUSES = ensureRecord<ResourceData>()({});

export const VPR_TRACKERS = ensureRecord<ResourceData>()({});

export const VPR_TRAITS = ensureRecord<TraitData>()({});

export type VPRActions = typeof VPR_ACTIONS;
export type VPRActionKey = keyof VPRActions;

export type VPRCooldowns = typeof VPR_COOLDOWNS;
export type VPRCooldownKey = keyof VPRCooldowns;

export type VPRGauges = typeof VPR_GAUGES;
export type VPRGaugeKey = keyof VPRGauges;

export type VPRStatuses = typeof VPR_STATUSES;
export type VPRStatusKey = keyof VPRStatuses;

export type VPRTrackers = typeof VPR_TRACKERS;
export type VPRTrackerKey = keyof VPRTrackers;

export const VPR_RESOURCES = {
	...VPR_GAUGES,
	...VPR_STATUSES,
	...VPR_TRACKERS,
};
export type VPRResources = typeof VPR_RESOURCES;
export type VPRResourceKey = keyof VPRResources;

export type VPRTraits = typeof VPR_TRAITS;
export type VPRTraitKey = keyof VPRTraits;
