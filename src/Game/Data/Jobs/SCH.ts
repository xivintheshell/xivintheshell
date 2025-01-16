import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const SCH_ACTIONS = ensureRecord<Action>()({});

export const SCH_COOLDOWNS = ensureRecord<Cooldown>()({});

export const SCH_GAUGES = ensureRecord<Resource>()({});

export const SCH_STATUSES = ensureRecord<Resource>()({});

export const SCH_TRACKERS = ensureRecord<Resource>()({});

export const SCH_TRAITS = ensureRecord<Trait>()({});

export type SCHActions = typeof SCH_ACTIONS;
export type SCHActionKey = keyof SCHActions;

export type SCHCooldowns = typeof SCH_COOLDOWNS;
export type SCHCooldownKey = keyof SCHCooldowns;

export type SCHGauges = typeof SCH_GAUGES;
export type SCHGaugeKey = keyof SCHGauges;

export type SCHStatuses = typeof SCH_STATUSES;
export type SCHStatusKey = keyof SCHStatuses;

export type SCHTrackers = typeof SCH_TRACKERS;
export type SCHTrackerKey = keyof SCHTrackers;

export const SCH_RESOURCES = {
	...SCH_GAUGES,
	...SCH_STATUSES,
	...SCH_TRACKERS,
};
export type SCHResources = typeof SCH_RESOURCES;
export type SCHResourceKey = keyof SCHResources;

export type SCHTraits = typeof SCH_TRAITS;
export type SCHTraitKey = keyof SCHTraits;
