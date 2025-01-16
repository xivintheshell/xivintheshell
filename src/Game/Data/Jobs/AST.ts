import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const AST_ACTIONS = ensureRecord<Action>()({});

export const AST_COOLDOWNS = ensureRecord<Cooldown>()({});

export const AST_GAUGES = ensureRecord<Resource>()({});

export const AST_STATUSES = ensureRecord<Resource>()({});

export const AST_TRACKERS = ensureRecord<Resource>()({});

export const AST_TRAITS = ensureRecord<Trait>()({});

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
