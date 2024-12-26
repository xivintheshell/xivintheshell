import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const RDM_GAUGES = ensureRecord<Resource>()({
	WHITE_MANA: { name: "White Mana" }, // [0, 100]
	BLACK_MANA: { name: "Black Mana" }, // [0, 100]
	MANA_STACKS: { name: "Mana Stacks" }, // [0, 3]
});
export type RDMGauges = typeof RDM_GAUGES;
export type RDMGaugeKey = keyof RDMGauges;

export const RDM_STATUSES = ensureRecord<Resource>()({
	ACCELERATION: { name: "Acceleration" }, // [0, 1]
	DUALCAST: { name: "Dualcast" }, // [0, 1]
	EMBOLDEN: { name: "Embolden" }, // [0, 1]
	GRAND_IMPACT_READY: { name: "Grand Impact Ready" }, // [0, 1]
	MAGICK_BARRIER: { name: "Magick Barrier" }, // [0, 1]
	MAGICKED_SWORDPLAY: { name: "Magicked Swordplay", maximumStacks: 3 }, // [0, 3]
	MANAFICATION: { name: "Manafication", maximumStacks: 6 }, // [0, 6]
	PREFULGENCE_READY: { name: "Prefulgence Ready" }, // [0, 1]
	THORNED_FLOURISH: { name: "Thorned Flourish" }, // [0, 1]
	VERFIRE_READY: { name: "Verfire Ready" }, // [0, 1]
	VERSTONE_READY: { name: "Verstone Ready" }, // [0, 1]
});
export type RDMStatuses = typeof RDM_STATUSES;
export type RDMStatusKey = keyof RDMStatuses;

export const RDM_TRACKERS = ensureRecord<Resource>()({
	// secret combo trackers
	// 0 = no melee combo, 1 = after 1st, 2 = after 2nd
	RDM_MELEE_COUNTER: { name: "RDM Melee Combo" }, // [0, 2]
	// 0 = finishers not started, 1 = after verflare/holy, 2 = after scorch
	RDM_FINISHER_COUNTER: { name: "RDM Finisher Combo" }, // [0, 2]
	// 0 = no moulinet combo, 1 = after 1st, 2 = after 2nd
	RDM_AOE_COUNTER: { name: "RDM AoE Combo" }, // [0, 2]
});
export type RDMTrackers = typeof RDM_TRACKERS;
export type RDMTrackerKey = keyof RDMTrackers;

export const RDM = {
	...RDM_GAUGES,
	...RDM_STATUSES,
	...RDM_TRACKERS,
};
export type RDMResources = typeof RDM;
export type RDMResourceKey = keyof RDMResources;
