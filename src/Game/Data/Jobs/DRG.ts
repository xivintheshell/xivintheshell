import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource, Trait } from "../types";

export const DRG_ACTIONS = ensureRecord<Action>()({});

export const DRG_COOLDOWNS = ensureRecord<Cooldown>()({});

export const DRG_GAUGES = ensureRecord<Resource>()({});

export const DRG_STATUSES = ensureRecord<Resource>()({});
export const DRG_TRACKERS = ensureRecord<Resource>()({});

export const DRG_TRAITS = ensureRecord<Trait>()({});

export type DRGActions = typeof DRG_ACTIONS;
export type DRGActionKey = keyof DRGActions;

export type DRGCooldowns = typeof DRG_COOLDOWNS;
export type DRGCooldownKey = keyof DRGCooldowns;

export type DRGGauges = typeof DRG_GAUGES;
export type DRGGaugeKey = keyof DRGGauges;

export type DRGStatuses = typeof DRG_STATUSES;
export type DRGStatusKey = keyof DRGStatuses;

export type DRGTrackers = typeof DRG_TRACKERS;
export type DRGTrackerKey = keyof DRGTrackers;

export const DRG_RESOURCES = {
	...DRG_GAUGES,
	...DRG_STATUSES,
	...DRG_TRACKERS,
};
export type DRGResources = typeof DRG_RESOURCES;
export type DRGResourceKey = keyof DRGResources;

export type DRGTraits = typeof DRG_TRAITS;
export type DRGTraitKey = keyof DRGTraits;
