import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const PCT_GAUGES = ensureRecord<Resource>()({
	PORTRAIT: { name: "Portrait" }, // [0, 2] 1 = moogle, 2 = madeen
	DEPICTIONS: { name: "Depictions" }, // [0, 3] used to show which creature motifs have been drawn
	CREATURE_CANVAS: { name: "Creature Canvas" }, // [0, 1]
	WEAPON_CANVAS: { name: "Weapon Canvas" }, // [0, 1]
	LANDSCAPE_CANVAS: { name: "Landscape Canvas" }, // [0, 1]
	PALETTE_GAUGE: { name: "Palette Gauge" }, // [0, 100]
	PAINT: { name: "Paint" }, // [0, 5]
});
export type PCTGauges = typeof PCT_GAUGES;
export type PCTGaugeKey = keyof PCTGauges;

export const PCT_STATUSES = ensureRecord<Resource>()({
	// Technically two different buffs, but we're treating it like a stacked buff here
	AETHERHUES: { name: "Aetherhues", mayNotBeCanceled: true, maximumStacks: 2 }, // [0, 2]
	MONOCHROME_TONES: { name: "Monochrome Tones" }, // [0, 1]
	SUBTRACTIVE_PALETTE: { name: "Subtractive Palette", mayNotBeCanceled: true, maximumStacks: 3 }, // [0, 3]
	HAMMER_TIME: { name: "Hammer Time", mayNotBeCanceled: true, maximumStacks: 3 }, // [0, 3]
	INSPIRATION: { name: "Inspiration", mayBeToggled: true }, // [0, 1]
	SUBTRACTIVE_SPECTRUM: { name: "Subtractive Spectrum" }, // [0, 1]
	HYPERPHANTASIA: { name: "Hyperphantasia", maximumStacks: 5 }, // [0, 5]
	RAINBOW_BRIGHT: { name: "Rainbow Bright" }, // [0, 1]
	STARSTRUCK: { name: "Starstruck" }, // [0, 1]
	STARRY_MUSE: { name: "Starry Muse" }, // [0, 1]
	TEMPERA_COAT: { name: "Tempera Coat" },
	TEMPERA_GRASSA: { name: "Tempera Grassa" },
	SMUDGE: { name: "Smudge" },
});
export type PCTStatuses = typeof PCT_STATUSES;
export type PCTStatusKey = keyof PCTStatuses;

export const PCT_TRACKERS = ensureRecord<Resource>()({
	// Hammer actions are a proper combo, not strictly tied to Hammer Time buff
	HAMMER_COMBO: { name: "Hammer Combo Counter" }, // [0, 2]
});
export type PCTTrackers = typeof PCT_TRACKERS;
export type PCTTrackerKey = keyof PCTTrackers;

export const PCT = {
	...PCT_GAUGES,
	...PCT_STATUSES,
	...PCT_TRACKERS,
};
export type PCTResources = typeof PCT;
export type PCTResourceKey = keyof PCTResources;
