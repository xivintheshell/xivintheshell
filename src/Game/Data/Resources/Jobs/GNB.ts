import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const GNB_GAUGES = ensureRecord<Resource>()({
	POWDER_GAUGE: { name: "Powder Gauge" }, // [0, 3]
});
export type GNBGauges = typeof GNB_GAUGES;
export type GNBGaugeKey = keyof GNBGauges;

export const GNB_STATUSES = ensureRecord<Resource>()({
	NO_MERCY: { name: "No Mercy" }, // [0, 1]
	AURORA: { name: "Aurora" }, // [0, 1]
	BOW_SHOCK_DOT: { name: "Bow Shock DoT" }, // [0, 1]
	CAMOUFLAGE: { name: "Camouflage" }, // [0, 1]
	HEART_OF_CORUNDUM: { name: "Heart of Corundum" }, // [0, 1]
	CLARITY_OF_CORUNDUM: { name: "Clarity of Corundum" }, // [0, 1]
	CATHARSIS_OF_CORUNDUM: { name: "Catharsis of Corundum" }, // [0, 1]
	NEBULA: { name: "Nebula" }, // [0, 1]
	GREAT_NEBULA: { name: "Great Nebula" }, // [0, 1]
	HEART_OF_LIGHT: { name: "Heart of Light" }, // [0, 1]
	HEART_OF_STONE: { name: "Heart of Stone" }, // [0, 1]

	READY_TO_BLAST: { name: "Ready to Blast" }, // [0, 1]
	READY_TO_BREAK: { name: "Ready to Break" }, // [0, 1]
	READY_TO_GOUGE: { name: "Ready to Gouge" }, // [0, 1]
	READY_TO_RAZE: { name: "Ready to Raze" }, // [0, 1]
	READY_TO_REIGN: { name: "Ready to Reign" }, // [0, 1]
	READY_TO_RIP: { name: "Ready to Rip" }, // [0, 1]
	READY_TO_TEAR: { name: "Ready to Tear" }, // [0, 1]

	ROYAL_GUARD: { name: "Royal Guard" }, // [0, 1]
	SONIC_BREAK_DOT: { name: "Sonic Break DoT" }, // [0, 1]
	SUPERBOLIDE: { name: "Superbolide" }, // [0, 1]
	BRUTAL_SHELL: { name: "Brutal Shell" }, // [0, 1]
});
export type GNBStatuses = typeof GNB_STATUSES;
export type GNBStatusKey = keyof GNBStatuses;

export const GNB_TRACKERS = ensureRecord<Resource>()({
	// 0 - combo neutral, 1 - brutal shell ready, 2 - solid barrel ready
	GNB_COMBO_TRACKER: { name: "GNB Combo" }, // [0, 2]
	// 0 - combo neutral, 1 - demon slaughter ready
	GNB_AOE_COMBO_TRACKER: { name: "GNB AOE Combo" }, // [0, 1]
	// 0 - combo neutral, 1 - savage claw ready, 2 - wicked talon ready
	GNB_GNASHING_COMBO_TRACKER: { name: "GNB Gnashing Combo" }, // [0, 2]
	// 0 - combo neutral, 1 - noble blood ready, 3 - lionheart ready
	GNB_REIGN_COMBO_TRACKER: { name: "GNB Reign Combo" }, // [0, 2]
});
export type GNBTrackers = typeof GNB_TRACKERS;
export type GNBTrackerKey = keyof GNBTrackers;

export const GNB = {
	...GNB_GAUGES,
	...GNB_STATUSES,
	...GNB_TRACKERS,
};
export type GNBResources = typeof GNB;
export type GNBResourceKey = keyof GNBResources;
