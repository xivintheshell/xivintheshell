import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const SMN_ACTIONS = ensureRecord<Action>()({});

export const SMN_COOLDOWNS = ensureRecord<Cooldown>()({});

export const SMN_GAUGES = ensureRecord<Resource>()({});

export const SMN_STATUSES = ensureRecord<Resource>()({});

export const SMN_TRACKERS = ensureRecord<Resource>()({});

export const SMN_TRAITS = ensureRecord<Trait>()({});

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
