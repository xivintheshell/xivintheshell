import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const AST_GAUGES = ensureRecord<Resource>()({});
export type ASTGauges = typeof AST_GAUGES;
export type ASTGaugeKey = keyof ASTGauges;

export const AST_STATUSES = ensureRecord<Resource>()({});
export type ASTStatuses = typeof AST_STATUSES;
export type ASTStatusKey = keyof ASTStatuses;

export const AST_TRACKERS = ensureRecord<Resource>()({});
export type ASTTrackers = typeof AST_TRACKERS;
export type ASTTrackerKey = keyof ASTTrackers;

export const AST = {
	...AST_GAUGES,
	...AST_STATUSES,
	...AST_TRACKERS,
};
export type ASTResources = typeof AST;
export type ASTResourceKey = keyof ASTResources;
