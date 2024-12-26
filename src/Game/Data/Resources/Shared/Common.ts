import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const COMMON_GAUGES = ensureRecord<Resource>()({
	// Mana's not really a gauge, but we display it alongside gauge and similar resources
	MANA: { name: "Mana", label: { zh: "MP" } },
});
export type CommonGauges = typeof COMMON_GAUGES;
export type CommonGaugeKey = keyof CommonGauges;

export const COMMON_STATUSES = ensureRecord<Resource>()({
	TINCTURE: { name: "Tincture", label: { zh: "爆发药" } }, // [0, 1]
	SPRINT: { name: "Sprint", label: { zh: "疾跑" } }, // [0, 1]
});
export type CommonStatuses = typeof COMMON_STATUSES;
export type CommonStatusKey = keyof CommonStatuses;

export const COMMON_TRACKERS = ensureRecord<Resource>()({
	MOVEMENT: { name: "Movement" }, // [0, 1]
	NOT_ANIMATION_LOCKED: { name: "NotAnimationLocked" }, // [0, 1]
	NOT_CASTER_TAXED: { name: "NotCasterTaxed" }, // [0, 1]
	IN_COMBAT: { name: "InCombat", label: { zh: "战斗中" } }, // [0, 1], used for abilities that can only execute in combat

	PARTY_SIZE: { name: "PartySize" },

	NEVER: { name: "Never" },
});
export type CommonTrackers = typeof COMMON_TRACKERS;
export type CommonTrackerKey = keyof CommonTrackers;

export const COMMON = {
	...COMMON_GAUGES,
	...COMMON_STATUSES,
	...COMMON_TRACKERS,
};
export type CommonResources = typeof COMMON;
export type CommonResourceKey = keyof CommonResources;
