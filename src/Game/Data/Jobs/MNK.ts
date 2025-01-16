import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const MNK_ACTIONS = ensureRecord<Action>()({});

export const MNK_COOLDOWNS = ensureRecord<Cooldown>()({});

export const MNK_GAUGES = ensureRecord<Resource>()({});

export const MNK_STATUSES = ensureRecord<Resource>()({});

export const MNK_TRACKERS = ensureRecord<Resource>()({});

export const MNK_TRAITS = ensureRecord<Trait>()({});

export type MNKActions = typeof MNK_ACTIONS;
export type MNKActionKey = keyof MNKActions;

export type MNKCooldowns = typeof MNK_COOLDOWNS;
export type MNKCooldownKey = keyof MNKCooldowns;

export type MNKGauges = typeof MNK_GAUGES;
export type MNKGaugeKey = keyof MNKGauges;

export type MNKStatuses = typeof MNK_STATUSES;
export type MNKStatusKey = keyof MNKStatuses;

export type MNKTrackers = typeof MNK_TRACKERS;
export type MNKTrackerKey = keyof MNKTrackers;

export const MNK_RESOURCES = {
	...MNK_GAUGES,
	...MNK_STATUSES,
	...MNK_TRACKERS,
};
export type MNKResources = typeof MNK_RESOURCES;
export type MNKResourceKey = keyof MNKResources;

export type MNKTraits = typeof MNK_TRAITS;
export type MNKTraitKey = keyof MNKTraits;
