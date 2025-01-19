import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SGE_ACTIONS = ensureRecord<ActionData>()({});

export const SGE_COOLDOWNS = ensureRecord<CooldownData>()({});

export const SGE_GAUGES = ensureRecord<ResourceData>()({});

export const SGE_STATUSES = ensureRecord<ResourceData>()({});

export const SGE_TRACKERS = ensureRecord<ResourceData>()({});

export const SGE_TRAITS = ensureRecord<TraitData>()({});

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
