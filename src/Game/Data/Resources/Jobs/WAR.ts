import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const WAR_GAUGES = ensureRecord<Resource>()({
	BEAST_GAUGE: { name: "Beast Gauge" },
});
export type WARGauges = typeof WAR_GAUGES;
export type WARGaugeKey = keyof WARGauges;

export const WAR_STATUSES = ensureRecord<Resource>()({
	SURGING_TEMPEST: { name: "Surging Tempest" },
	INNER_RELEASE: { name: "Inner Release", maximumStacks: 3 }, // Free Fell Cleaves
	INNER_STRENGTH: { name: "Inner Strength" }, // KB/Stun immune
	BURGEONING_FURY: { name: "Burgeoning Fury", maximumStacks: 3 }, // Fell Cleave usage counter
	WRATHFUL: { name: "Wrathful" }, // Primal Wrath Ready
	PRIMAL_REND_READY: { name: "Primal Rend Ready" },
	PRIMAL_RUINATION_READY: { name: "Primal Ruination Ready" },

	NASCENT_CHAOS: { name: "Nascent Chaos" },

	// TODO: Nascent Glint when multiple players in a timeline is fully supported.
	NASCENT_FLASH: { name: "Nascent Flash" }, // health-on-hit (self)
	THRILL_OF_BATTLE: { name: "Thrill of Battle" },
	EQUILIBRIUM: { name: "Equilibrium" }, // HoT
	SHAKE_IT_OFF: { name: "Shake It Off" }, // Barrier
	SHAKE_IT_OFF_OVER_TIME: { name: "Shake It Off Over Time" }, // HoT
	RAW_INTUITION: { name: "Raw Intuition" },
	STEM_THE_TIDE: { name: "Stem the Tide" }, // Barrier
	STEM_THE_FLOW: { name: "Stem the Flow" }, // 4s extra DR
	BLOODWHETTING: { name: "Bloodwhetting" },

	VENGEANCE: { name: "Vengeance" }, // Phys Ref. / 30% DR
	DAMNATION: { name: "Damnation" }, // Phys Ref. / 40% DR
	PRIMEVAL_IMPULSE: { name: "Primeval Impulse" }, // HoT

	HOLMGANG: { name: "Holmgang" }, // Invuln

	DEFIANCE: { name: "Defiance", mayNotBeCanceled: true }, // Tank Stance
});
export type WARStatuses = typeof WAR_STATUSES;
export type WARStatusKey = keyof WARStatuses;

export const WAR_TRACKERS = ensureRecord<Resource>()({
	STORM_COMBO: { name: "Storm Combo" },
	TEMPEST_COMBO: { name: "Tempest Combo" },
});
export type WARTrackers = typeof WAR_TRACKERS;
export type WARTrackerKeys = keyof WARTrackers;

export const WAR = {
	...WAR_GAUGES,
	...WAR_STATUSES,
	...WAR_TRACKERS,
};
export type WARResources = typeof WAR;
export type WARResourceKey = keyof WARResources;
