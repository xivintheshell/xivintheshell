import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const RPR_GAUGES = ensureRecord<Resource>()({
	SOUL: { name: "Soul" }, // [0, 100]
	SHROUD: { name: "Shroud" }, // [0, 100]

	LEMURE_SHROUD: { name: "Lemure Shroud" }, // [0, 5]
	VOID_SHROUD: { name: "Void Shroud" }, // [0, 5]
});
export type RPRGauges = typeof RPR_GAUGES;
export type RPRGaugeKey = keyof RPRGauges;

export const RPR_STATUSES = ensureRecord<Resource>()({
	DEATHS_DESIGN: { name: "Death's Design" }, // [0, 1]

	SOUL_REAVER: { name: "Soul Reaver", maximumStacks: 2 }, // [0, 2], Gibbet/Gallows
	ENHANCED_GIBBET: { name: "Enhanced Gibbet" }, // [0, 1]
	ENHANCED_GALLOWS: { name: "Enhanced Gallows" }, // [0, 1]
	EXECUTIONER: { name: "Executioner", maximumStacks: 2 }, // [0, 2], Executioner's Gibbet/Gallows

	ENSHROUDED: { name: "Enshrouded" }, // [0, 1]
	ENHANCED_VOID_REAPING: { name: "Enhanced Void Reaping" }, // [0, 1]
	ENHANCED_CROSS_REAPING: { name: "Enhanced Cross Reaping" }, // [0, 1]
	OBLATIO: { name: "Oblatio" }, // [0, 1]

	IDEAL_HOST: { name: "Ideal Host" }, // [0, 1]
	PERFECTIO_OCCULTA: { name: "Perfectio Occulta" }, // [0, 1]
	PERFECTIO_PARATA: { name: "Perfectio Parata" }, // [0, 1]

	ARCANE_CIRCLE: { name: "Arcane Circle" }, // [0, 1]
	CIRCLE_OF_SACRIFICE: { name: "Circle of Sacrifice" }, // [0, 1], PH Stack sender
	BLOODSOWN_CIRCLE: { name: "Bloodsown Circle" }, // [0, 1], PH Lockout & PH Stack Receiver
	IMMORTAL_SACRIFICE: { name: "Immortal Sacrifice", maximumStacks: 8 }, // [0, 8], PH Stacks

	CREST_OF_TIME_BORROWED: { name: "Crest of Time Borrowed" }, // [0, 1]
	CREST_OF_TIME_RETURNED: { name: "Crest of Time Returned" }, // [0, 1]

	SOULSOW: { name: "Soulsow" },
	THRESHOLD: { name: "Threshold" },
	ENHANCED_HARPE: { name: "Enhanced Harpe" },
});
export type RPRStatuses = typeof RPR_STATUSES;
export type RPRStatusKey = keyof RPRStatuses;

export const RPR_TRACKERS = ensureRecord<Resource>()({
	ARCANE_CREST: { name: "Arcane Crest" }, // [0, 1]
	HELLS_INGRESS_USED: { name: "Hell's Ingress Used" }, // For tracking which ability turns into the return

	// 0 = no combo, 1 = after slice, 2 = after waxing
	RPR_COMBO: { name: "RPR Combo" }, // [0, 2]
	// 0 = no combo, 1 = after spinning slice
	RPR_AOE_COMBO: { name: "RPR AoE Combo" }, // [0, 1]
});
export type RPRTrackers = typeof RPR_TRACKERS;
export type RPRTrackerKey = keyof RPRTrackers;

export const RPR = {
	...RPR_GAUGES,
	...RPR_STATUSES,
	...RPR_TRACKERS,
};
export type RPRResources = typeof RPR;
export type RPRResourceKey = keyof RPRResources;
