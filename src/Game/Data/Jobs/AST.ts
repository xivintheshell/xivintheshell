import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const AST_ACTIONS = ensureRecord<ActionData>()({});

export const AST_COOLDOWNS = ensureRecord<CooldownData>()({});

export const AST_GAUGES = ensureRecord<ResourceData>()({});

export const AST_STATUSES = ensureRecord<ResourceData>()({});

export const AST_TRACKERS = ensureRecord<ResourceData>()({});

export const AST_TRAITS = ensureRecord<TraitData>()({});

export type ASTActions = typeof AST_ACTIONS;
export type ASTActionKey = keyof ASTActions;

export type ASTCooldowns = typeof AST_COOLDOWNS;
export type ASTCooldownKey = keyof ASTCooldowns;

export type ASTGauges = typeof AST_GAUGES;
export type ASTGaugeKey = keyof ASTGauges;

export type ASTStatuses = typeof AST_STATUSES;
export type ASTStatusKey = keyof ASTStatuses;

export type ASTTrackers = typeof AST_TRACKERS;
export type ASTTrackerKey = keyof ASTTrackers;

export const AST_RESOURCES = {
	...AST_GAUGES,
	...AST_STATUSES,
	...AST_TRACKERS,
};
export type ASTResources = typeof AST_RESOURCES;
export type ASTResourceKey = keyof ASTResources;

export type ASTTraits = typeof AST_TRAITS;
export type ASTTraitKey = keyof ASTTraits;
