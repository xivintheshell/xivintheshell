import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource, Trait } from "../types";

export const PLD_ACTIONS = ensureRecord<Action>()({});

export const PLD_COOLDOWNS = ensureRecord<Cooldown>()({});

export const PLD_GAUGES = ensureRecord<Resource>()({});

export const PLD_STATUSES = ensureRecord<Resource>()({});

export const PLD_TRACKERS = ensureRecord<Resource>()({});

export const PLD_TRAITS = ensureRecord<Trait>()({});

export type PLDActions = typeof PLD_ACTIONS;
export type PLDActionKey = keyof PLDActions;

export type PLDCooldowns = typeof PLD_COOLDOWNS;
export type PLDCooldownKey = keyof PLDCooldowns;

export type PLDGauges = typeof PLD_GAUGES;
export type PLDGaugeKey = keyof PLDGauges;

export type PLDStatuses = typeof PLD_STATUSES;
export type PLDStatusKey = keyof PLDStatuses;

export type PLDTrackers = typeof PLD_TRACKERS;
export type PLDTrackerKey = keyof PLDTrackers;

export const PLD_RESOURCES = {
	...PLD_GAUGES,
	...PLD_STATUSES,
	...PLD_TRACKERS,
};
export type PLDResources = typeof PLD_RESOURCES;
export type PLDResourceKey = keyof PLDResources;

export type PLDTraits = typeof PLD_TRAITS;
export type PLDTraitKey = keyof PLDTraits;
