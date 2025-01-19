import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const WHM_ACTIONS = ensureRecord<ActionData>()({});

export const WHM_COOLDOWNS = ensureRecord<CooldownData>()({});

export const WHM_GAUGES = ensureRecord<ResourceData>()({});

export const WHM_STATUSES = ensureRecord<ResourceData>()({});

export const WHM_TRACKERS = ensureRecord<ResourceData>()({});

export const WHM_TRAITS = ensureRecord<TraitData>()({});

export type WHMActions = typeof WHM_ACTIONS;
export type WHMActionKey = keyof WHMActions;

export type WHMCooldowns = typeof WHM_COOLDOWNS;
export type WHMCooldownKey = keyof WHMCooldowns;

export type WHMGauges = typeof WHM_GAUGES;
export type WHMGaugeKey = keyof WHMGauges;

export type WHMStatuses = typeof WHM_STATUSES;
export type WHMStatusKey = keyof WHMStatuses;

export type WHMTrackers = typeof WHM_TRACKERS;
export type WHMTrackerKey = keyof WHMTrackers;

export const WHM_RESOURCES = {
	...WHM_GAUGES,
	...WHM_STATUSES,
	...WHM_TRACKERS,
};
export type WHMResources = typeof WHM_RESOURCES;
export type WHMResourceKey = keyof WHMResources;

export type WHMTraits = typeof WHM_TRAITS;
export type WHMTraitKey = keyof WHMTraits;
