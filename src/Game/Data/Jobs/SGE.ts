import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const SGE_ACTIONS = ensureRecord<Action>()({});

export const SGE_COOLDOWNS = ensureRecord<Cooldown>()({});

export const SGE_GAUGES = ensureRecord<Resource>()({});

export const SGE_STATUSES = ensureRecord<Resource>()({});

export const SGE_TRACKERS = ensureRecord<Resource>()({});

export const SGE_TRAITS = ensureRecord<Trait>()({});

export type SGEActions = typeof SGE_ACTIONS;
export type SGEActionKey = keyof SGEActions;

export type SGECooldowns = typeof SGE_COOLDOWNS;
export type SGECooldownKey = keyof SGECooldowns;

export type SGEGauges = typeof SGE_GAUGES;
export type SGEGaugeKey = keyof SGEGauges;

export type SGEStatuses = typeof SGE_STATUSES;
export type SGEStatusKey = keyof SGEStatuses;

export type SGETrackers = typeof SGE_TRACKERS;
export type SGETrackerKey = keyof SGETrackers;

export const SGE_RESOURCES = {
	...SGE_GAUGES,
	...SGE_STATUSES,
	...SGE_TRACKERS,
};
export type SGEResources = typeof SGE_RESOURCES;
export type SGEResourceKey = keyof SGEResources;

export type SGETraits = typeof SGE_TRAITS;
export type SGETraitKey = keyof SGETraits;
