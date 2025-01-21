import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const NIN_ACTIONS = ensureRecord<ActionData>()({});

export const NIN_COOLDOWNS = ensureRecord<CooldownData>()({});

export const NIN_GAUGES = ensureRecord<ResourceData>()({});

export const NIN_STATUSES = ensureRecord<ResourceData>()({});

export const NIN_TRACKERS = ensureRecord<ResourceData>()({});

export const NIN_TRAITS = ensureRecord<TraitData>()({});

export type NINActions = typeof NIN_ACTIONS;
export type NINActionKey = keyof NINActions;

export type NINCooldowns = typeof NIN_COOLDOWNS;
export type NINCooldownKey = keyof NINCooldowns;

export type NINGauges = typeof NIN_GAUGES;
export type NINGaugeKey = keyof NINGauges;

export type NINStatuses = typeof NIN_STATUSES;
export type NINStatusKey = keyof NINStatuses;

export type NINTrackers = typeof NIN_TRACKERS;
export type NINTrackerKey = keyof NINTrackers;

export const NIN_RESOURCES = {
	...NIN_GAUGES,
	...NIN_STATUSES,
	...NIN_TRACKERS,
};
export type NINResources = typeof NIN_RESOURCES;
export type NINResourceKey = keyof NINResources;

export type NINTraits = typeof NIN_TRAITS;
export type NINTraitKey = keyof NINTraits;
