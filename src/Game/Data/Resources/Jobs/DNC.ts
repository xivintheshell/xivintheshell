import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const DNC_GAUGES = ensureRecord<Resource>()({
	ESPRIT_GAUGE: { name: "EspritGauge" },
	FEATHER_GAUGE: { name: "Feathers" },
	STANDARD_DANCE: { name: "Standard Dance" },
	TECHNICAL_DANCE: { name: "Technical Dance" },
});
export type DNCGauges = typeof DNC_GAUGES;
export type DNCGaugeKey = keyof DNCGauges;

export const DNC_STATUSES = ensureRecord<Resource>()({
	// Self Buffs
	SILKEN_SYMMETRY: { name: "Silken Symmetry" },
	SILKEN_FLOW: { name: "Silken Flow" },
	FLOURISHING_SYMMETRY: { name: "Flourishing Symmetry" },
	FLOURISHING_FLOW: { name: "Flourishing Flow" },
	THREEFOLD_FAN_DANCE: { name: "Threefold Fan Dance" },
	FOURFOLD_FAN_DANCE: { name: "Fourfold Fan Dance" },
	FINISHING_MOVE_READY: { name: "Finishing Move Ready" },
	FLOURISHING_STARFALL: { name: "Flourishing Starfall" },
	STANDARD_STEP: { name: "Standard Step", mayNotBeCanceled: true },
	TECHNICAL_STEP: { name: "Technical Step", mayNotBeCanceled: true },
	LAST_DANCE_READY: { name: "Last Dance Ready" },
	DANCE_OF_THE_DAWN_READY: { name: "Dance of the Dawn Ready" },
	FLOURISHING_FINISH: { name: "Flourishing Finish" },
	SHIELD_SAMBA: { name: "Shield Samba" },
	IMPROVISATION: { name: "Improvisation", mayNotBeCanceled: true },
	RISING_RHYTHM: { name: "Rising Rhythm", maximumStacks: 4 },
	IMPROVISATION_REGEN: { name: "Improvisation Regen" },
	IMPROVISED_FINISH: { name: "Improvised Finish" },
	DEVILMENT: { name: "Devilment" },
	TECHNICAL_FINISH: { name: "Technical Finish" },
	ESPRIT: { name: "Esprit", mayNotBeCanceled: true },
	STANDARD_FINISH: { name: "Standard Finish" },
	CLOSED_POSITION: { name: "Closed Position", mayNotBeCanceled: true },

	// Partner buffs
	DANCE_PARTNER: { name: "Dance Partner" },
	STANDARD_FINISH_PARTNER: { name: "Standard Finish Partner" },
	ESPRIT_PARTNER: { name: "Esprit Partner" },
	ESPRIT_TECHNICAL: { name: "Esprit Technical" },
});
export type DNCStatuses = typeof DNC_STATUSES;
export type DNCStatusKey = keyof DNCStatuses;

export const DNC_TRACKERS = ensureRecord<Resource>()({
	CASCADE_COMBO: { name: "CascadeCombo" },
	WINDMILL_COMBO: { name: "WindmillCombo" },
	STANDARD_BONUS: { name: "StandardBonus" },
	TECHNICAL_BONUS: { name: "TechnicalBonus" },
});
export type DNCTrackers = typeof DNC_TRACKERS;
export type DNCTrackerKey = keyof DNCTrackers;

export const DNC = {
	...DNC_GAUGES,
	...DNC_STATUSES,
	...DNC_TRACKERS,
};
export type DNCResources = typeof DNC;
export type DNCResourceKey = keyof DNCResources;
