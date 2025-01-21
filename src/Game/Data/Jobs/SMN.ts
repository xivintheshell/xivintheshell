import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SMN_ACTIONS = ensureRecord<ActionData>()({});

export const SMN_COOLDOWNS = ensureRecord<CooldownData>()({});

export const SMN_GAUGES = ensureRecord<ResourceData>()({});

export const SMN_STATUSES = ensureRecord<ResourceData>()({});

export const SMN_TRACKERS = ensureRecord<ResourceData>()({});

export const SMN_TRAITS = ensureRecord<TraitData>()({});

export type SMNActions = typeof SMN_ACTIONS;
export type SMNActionKey = keyof SMNActions;

export type SMNCooldowns = typeof SMN_COOLDOWNS;
export type SMNCooldownKey = keyof SMNCooldowns;

export type SMNGauges = typeof SMN_GAUGES;
export type SMNGaugeKey = keyof SMNGauges;

export type SMNStatuses = typeof SMN_STATUSES;
export type SMNStatusKey = keyof SMNStatuses;

export type SMNTrackers = typeof SMN_TRACKERS;
export type SMNTrackerKey = keyof SMNTrackers;

export const SMN_RESOURCES = {
	...SMN_GAUGES,
	...SMN_STATUSES,
	...SMN_TRACKERS,
};
export type SMNResources = typeof SMN_RESOURCES;
export type SMNResourceKey = keyof SMNResources;

export type SMNTraits = typeof SMN_TRAITS;
export type SMNTraitKey = keyof SMNTraits;
