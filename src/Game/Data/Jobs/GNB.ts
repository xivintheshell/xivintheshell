import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const GNB_ACTIONS = ensureRecord<Action>()({});

export const GNB_COOLDOWNS = ensureRecord<Cooldown>()({});

export const GNB_GAUGES = ensureRecord<Resource>()({});

export const GNB_STATUSES = ensureRecord<Resource>()({});

export const GNB_TRACKERS = ensureRecord<Resource>()({});

export const GNB_TRAITS = ensureRecord<Trait>()({});

export type GNBActions = typeof GNB_ACTIONS;
export type GNBActionKey = keyof GNBActions;

export type GNBCooldowns = typeof GNB_COOLDOWNS;
export type GNBCooldownKey = keyof GNBCooldowns;

export type GNBGauges = typeof GNB_GAUGES;
export type GNBGaugeKey = keyof GNBGauges;

export type GNBStatuses = typeof GNB_STATUSES;
export type GNBStatusKey = keyof GNBStatuses;

export type GNBTrackers = typeof GNB_TRACKERS;
export type GNBTrackerKey = keyof GNBTrackers;

export const GNB_RESOURCES = {
	...GNB_GAUGES,
	...GNB_STATUSES,
	...GNB_TRACKERS,
};
export type GNBResources = typeof GNB_RESOURCES;
export type GNBResourceKey = keyof GNBResources;

export type GNBTraits = typeof GNB_TRAITS;
export type GNBTraitKey = keyof GNBTraits;
