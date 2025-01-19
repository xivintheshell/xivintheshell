import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DRK_ACTIONS = ensureRecord<ActionData>()({});

export const DRK_COOLDOWNS = ensureRecord<CooldownData>()({});

export const DRK_GAUGES = ensureRecord<ResourceData>()({});

export const DRK_STATUSES = ensureRecord<ResourceData>()({});

export const DRK_TRACKERS = ensureRecord<ResourceData>()({});

export const DRK_TRAITS = ensureRecord<TraitData>()({});

export type DRKActions = typeof DRK_ACTIONS;
export type DRKActionKey = keyof DRKActions;

export type DRKCooldowns = typeof DRK_COOLDOWNS;
export type DRKCooldownKey = keyof DRKCooldowns;

export type DRKGauges = typeof DRK_GAUGES;
export type DRKGaugeKey = keyof DRKGauges;

export type DRKStatuses = typeof DRK_STATUSES;
export type DRKStatusKey = keyof DRKStatuses;

export type DRKTrackers = typeof DRK_TRACKERS;
export type DRKTrackerKey = keyof DRKTrackers;

export const DRK_RESOURCES = {
	...DRK_GAUGES,
	...DRK_STATUSES,
	...DRK_TRACKERS,
};
export type DRKResources = typeof DRK_RESOURCES;
export type DRKResourceKey = keyof DRKResources;

export type DRKTraits = typeof DRK_TRAITS;
export type DRKTraitKey = keyof DRKTraits;
