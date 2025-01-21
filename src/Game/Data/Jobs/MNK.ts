import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const MNK_ACTIONS = ensureRecord<ActionData>()({});

export const MNK_COOLDOWNS = ensureRecord<CooldownData>()({});

export const MNK_GAUGES = ensureRecord<ResourceData>()({});

export const MNK_STATUSES = ensureRecord<ResourceData>()({});

export const MNK_TRACKERS = ensureRecord<ResourceData>()({});

export const MNK_TRAITS = ensureRecord<TraitData>()({});

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
