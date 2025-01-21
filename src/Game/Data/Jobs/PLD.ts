import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const PLD_ACTIONS = ensureRecord<ActionData>()({});

export const PLD_COOLDOWNS = ensureRecord<CooldownData>()({});

export const PLD_GAUGES = ensureRecord<ResourceData>()({});

export const PLD_STATUSES = ensureRecord<ResourceData>()({});

export const PLD_TRACKERS = ensureRecord<ResourceData>()({});

export const PLD_TRAITS = ensureRecord<TraitData>()({});

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
