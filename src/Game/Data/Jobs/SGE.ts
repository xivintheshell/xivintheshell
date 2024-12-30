import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SGE_ACTIONS = ensureRecord<ActionData>()({
	DIAGNOSIS: {
		id: 24284,
		name: "Diagnosis",
	},
	EUKRASIAN_DIAGNOSIS: {
		id: 24291,
		name: "Eukrasian Diagnosis",
	},
	EUKRASIAN_DIAGNOSIS_POP: {
		name: "Pop Eukrasian Diagnosis",
	},
	HAIMA: {
		id: 24305,
		name: "Haima",
	},
	HAIMA_POP: {
		name: "Pop Haima",
	},
	EGEIRO: {
		id: 24287,
		name: "Egeiro",
	},

	/** AoE Heals/Shield */
	PROGNOSIS: {
		id: 24286,
		name: "Prognosis",
	},
	EUKRASIAN_PROGNOSIS: {
		id: 24292,
		name: "Eukrasian Prognosis",
	},
	EUKRASIAN_PROGNOSIS_II: {
		id: 37034,
		name: "Eukrasian Prognosis II",
	},
	EUKRASIAN_PROGNOSIS_POP: {
		name: "Pop Eukrasian Prognosis",
	},
	PANHAIMA: {
		id: 24311,
		name: "Panhaima",
	},
	PANHAIMA_POP: {
		name: "Pop Panhaima",
	},
	// Physis upgrades to Physis II at 60 so we don't need to support it
	PHYSIS_II: {
		id: 24302,
		name: "Physis II",
	},
	HOLOS: {
		id: 24310,
		name: "Holos",
	},
	PEPSIS: {
		id: 24301,
		name: "Pepsis",
	},

	/** Utility */
	KARDIA: {
		id: 24285,
		name: "Kardia",
	},
	EUKRASIA: {
		id: 24290,
		name: "Eukrasia",
	},
	SOTERIA: {
		id: 24294,
		name: "Soteria",
	},
	ICARUS: {
		id: 24295,
		name: "Icarus",
	},
	ZOE: {
		id: 24300,
		name: "Zoe",
	},
	KRASIS: {
		id: 24317,
		name: "Krasis",
	},
	PHILOSOPHIA: {
		id: 37035,
		name: "Philosophia",
	},

	/** Addersgall abilities */
	RHIZOMATA: {
		id: 24309,
		name: "Rhizomata",
	},
	DRUOCHOLE: {
		id: 24296,
		name: "Druochole",
	},
	IXOCHOLE: {
		id: 24299,
		name: "Ixochole",
	},
	KERACHOLE: {
		id: 24298,
		name: "Kerachole",
	},
	TAUROCHOLE: {
		id: 24303,
		name: "Taurochole",
	},

	/** Single-Target DPS Spells */
	DOSIS: {
		id: 24283,
		name: "Dosis",
	},
	DOSIS_II: {
		id: 24306,
		name: "Dosis II",
	},
	DOSIS_III: {
		id: 24312,
		name: "Dosis III",
	},
	EUKRASIAN_DOSIS: {
		id: 24293,
		name: "Eukrasian Dosis",
	},
	EUKRASIAN_DOSIS_II: {
		id: 24308,
		name: "Eukrasian Dosis II",
	},
	EUKRASIAN_DOSIS_III: {
		id: 24314,
		name: "Eukrasian Dosis III",
	},

	/** AoE DPS Spells */
	TOXIKON: {
		id: 24304,
		name: "Toxikon",
	},
	TOXIKON_II: {
		id: 24316,
		name: "Toxikon II",
	},
	DYSKRASIA: {
		id: 24297,
		name: "Dyskrasia",
	},
	DYSKRASIA_II: {
		id: 24315,
		name: "Dyskrasia II",
	},
	EUKRASIAN_DYSKRASIA: {
		id: 37032,
		name: "Eukrasian Dyskrasia",
	},
	PHLEGMA: {
		id: 24289,
		name: "Phlegma",
	},
	PHLEGMA_II: {
		id: 24307,
		name: "Phlegma II",
	},
	PHLEGMA_III: {
		id: 24313,
		name: "Phlegma III",
	},
	PSYCHE: {
		id: 37033,
		name: "Psyche",
	},
	PNEUMA: {
		id: 24318,
		name: "Pneuma",
	},
});

export const SGE_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_HAIMA: { name: "cd_Haima" },
	cd_PANHAIMA: { name: "cd_PANHAIMA" },
	cd_PHYSIS: { name: "cd_PHYSIS" },
	cd_HOLOS: { name: "cd_HOLOS" },
	cd_PEPSIS: { name: "cd_PEPSIS" },
	cd_KARDIA: { name: "cd_KARDIA" },
	cd_EUKRASIA: { name: "cd_EUKRASIA" },
	cd_SOTERIA: { name: "cd_SOTERIA" },
	cd_ICARUS: { name: "cd_ICARUS" },
	cd_ZOE: { name: "cd_ZOE" },
	cd_KRASIS: { name: "cd_KRASIS" },
	cd_PHILOSOPHIA: { name: "cd_PHILOSOPHIA" },
	cd_RHIZOMATA: { name: "cd_RHIZOMATA" },
	cd_DRUOCHOLE: { name: "cd_DRUOCHOLE" },
	cd_IXOCHOLE: { name: "cd_IXOCHOLE" },
	cd_KERACHOLE: { name: "cd_KERACHOLE" },
	cd_TAUROCHOLE: { name: "cd_TAUROCHOLE" },
	cd_PHLEGMA: { name: "cd_PHLEGMA" },
	cd_PSYCHE: { name: "cd_PSYCHE" },
	cd_PNEUMA: { name: "cd_PNEUMA" },

	cd_DIAGNOSIS_POP: { name: "cd_DIAGNOSIS_POP" },
	cd_PROGNOSIS_POP: { name: "cd_PROGNOSIS_POP" },
	cd_HAIMA_POP: { name: "cd_HAIMA_POP" },
	cd_PANHAIMA_POP: { name: "cd_PANHAIMA_POP" },
});

export const SGE_GAUGES = ensureRecord<ResourceData>()({
	ADDERSGALL: {
		name: "Addersgall",
	},
	ADDERSTING: {
		name: "Addersting",
	},
});

export const SGE_STATUSES = ensureRecord<ResourceData>()({
	EUKRASIA: {
		id: 2606,
		name: "Eukrasia",
	},
	EUKRASIAN_DIAGNOSIS: {
		id: 2607,
		name: "Eukrasian Diagnosis",
	},
	DIFFERENTIAL_DIAGNOSIS: {
		id: 2608,
		name: "Differential Diagnosis",
	},
	HAIMA: {
		id: 2612,
		name: "Haima",
		mayNotBeCanceled: true,
	},
	HAIMATINON: {
		id: 2642,
		name: "Haimatinon",
		maximumStacks: 5,
		mayNotBeCanceled: true,
	},
	EUKRASIAN_PROGNOSIS: {
		id: 2609,
		name: "Eukrasian Prognosis",
	},
	PANHAIMA: {
		id: 2613,
		name: "Panhaima",
		mayNotBeCanceled: true,
	},
	PANHAIMATINON: {
		id: 2643,
		name: "Panhaimatinon",
		maximumStacks: 5,
		mayNotBeCanceled: true,
	},
	PHYSIS_II: {
		id: 2620,
		name: "Physis II",
	},
	AUTOPHYSIS: {
		id: 2621,
		name: "Autophysis",
	},
	KARDIA: {
		id: 2604,
		name: "Kardia",
	},
	KARDION: {
		id: 2605,
		name: "Kardion",
	},
	PHILOSOPHIA: {
		id: 3898,
		name: "Philosophia",
	},
	EUDAIMONIA: {
		id: 3899,
		name: "Eudaimonia",
	},
	SOTERIA: {
		id: 2610,
		name: "Soteria",
		maximumStacks: 4,
	},
	ZOE: {
		id: 2611,
		name: "Zoe",
	},
	KRASIS: {
		id: 2622,
		name: "Krasis",
	},
	KERACHOLE: {
		id: 2618,
		name: "Kerachole",
	},
	KERAKEIA: {
		// The regen component of Kerachole
		id: 2938,
		name: "Kerakeia",
	},
	TAUROCHOLE: {
		id: 2619,
		name: "Taurochole",
	},
	EUKRASIAN_DOSIS: {
		id: 2614,
		name: "Eukrasian Dosis",
	},
	EUKRASIAN_DOSIS_II: {
		id: 2615,
		name: "Eukrasian Dosis II",
	},
	EUKRASIAN_DOSIS_III: {
		id: 2616,
		name: "Eukrasian Dosis III",
	},
	EUKRASIAN_DYSKRASIA: {
		id: 3897,
		name: "Eukrasian Dyskrasia",
	},
	PNEUMA: {
		id: 2623,
		name: "Pneuma",
	},
	HOLOS: {
		id: 3003,
		name: "Holos",
	},
	HOLOSAKOS: {
		id: 3365,
		name: "Holosakos",
	},
});

export const SGE_TRACKERS = ensureRecord<ResourceData>()({});

export const SGE_TRAITS = ensureRecord<TraitData>()({
	OFFENSIVE_MAGIC_MASTERY: {
		name: "Offensive Magic Mastery",
		level: 72,
	},
	OFFENSIVE_MAGIC_MASTERY_II: {
		name: "Offensive Magic Mastery II",
		level: 82,
	},
	ENHANCED_KERACHOLE: {
		name: "Enhanced Kerachole",
		level: 78,
	},
	// Enhanced Healing Magic: 85
	ENHANCED_ZOE: {
		name: "Enhanced Zoe",
		level: 88,
	},
	ENHANCED_SOTERIA: {
		name: "Enhanced Soteria",
		level: 94,
	},
	EUKRASIAN_PROGNOSIS_MASTERY: {
		name: "Eukrasian Prognosis Mastery",
		level: 96,
	},
	ENHANCED_PHYSIS_II: {
		name: "Enhanced Physis II",
		level: 98,
	},
});

export type SGEActions = typeof SGE_ACTIONS;
export type SGEActionKey = keyof SGEActions;

export type SGECooldowns = typeof SGE_COOLDOWNS;
export type SGECooldownKey = keyof SGECooldowns;

export type SGEGauges = typeof SGE_GAUGES;
export type SGEGaugeKey = keyof SGEGauges;

export type SGEStatuses = typeof SGE_STATUSES;
export type SGEStatusKey = keyof SGEStatuses;

export type SGETrackers = typeof SGE_TRACKERS;
export type SGETrackerKey = keyof SGETrackers;

export const SGE_RESOURCES = {
	...SGE_GAUGES,
	...SGE_STATUSES,
	...SGE_TRACKERS,
};
export type SGEResources = typeof SGE_RESOURCES;
export type SGEResourceKey = keyof SGEResources;

export type SGETraits = typeof SGE_TRAITS;
export type SGETraitKey = keyof SGETraits;
