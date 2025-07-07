import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const SGE_ACTIONS = ensureRecord<ActionData>()({
	DIAGNOSIS: {
		id: 24284,
		name: "Diagnosis",
		label: { zh: "诊断" },
	},
	EUKRASIAN_DIAGNOSIS: {
		id: 24291,
		name: "Eukrasian Diagnosis",
		label: { zh: "均衡诊断" },
	},
	EUKRASIAN_DIAGNOSIS_POP: {
		name: "Pop Eukrasian Diagnosis",
		label: { zh: "均衡诊断破盾" },
	},
	HAIMA: {
		id: 24305,
		name: "Haima",
		label: { zh: "输血" },
	},
	HAIMA_POP: {
		name: "Pop Haima",
		label: { zh: "输血破盾" },
	},
	EGEIRO: {
		id: 24287,
		name: "Egeiro",
		label: { zh: "复苏" },
	},

	/** AoE Heals/Shield */
	PROGNOSIS: {
		id: 24286,
		name: "Prognosis",
		label: { zh: "预后" },
	},
	EUKRASIAN_PROGNOSIS: {
		id: 24292,
		name: "Eukrasian Prognosis",
		label: { zh: "均衡预后" },
	},
	EUKRASIAN_PROGNOSIS_II: {
		id: 37034,
		name: "Eukrasian Prognosis II",
		label: { zh: "均衡预后 II" },
	},
	EUKRASIAN_PROGNOSIS_POP: {
		name: "Pop Eukrasian Prognosis",
		label: { zh: "均衡预后破盾" },
	},
	EUKRASIAN_PROGNOSIS_II_POP: {
		name: "Pop Eukrasian Prognosis II",
		label: { zh: "均衡预后 II 破盾" },
	},
	PANHAIMA: {
		id: 24311,
		name: "Panhaima",
		label: { zh: "泛输血" },
	},
	PANHAIMA_POP: {
		name: "Pop Panhaima",
		label: { zh: "泛输血破盾" },
	},
	// Physis upgrades to Physis II at 60 so we don't need to support it
	PHYSIS_II: {
		id: 24302,
		name: "Physis II",
		label: { zh: "自生 II" },
	},
	HOLOS: {
		id: 24310,
		name: "Holos",
		label: { zh: "整体论" },
	},
	PEPSIS: {
		id: 24301,
		name: "Pepsis",
		label: { zh: "消化" },
	},

	/** Utility */
	KARDIA: {
		id: 24285,
		name: "Kardia",
		label: { zh: "心关" },
	},
	EUKRASIA: {
		id: 24290,
		name: "Eukrasia",
		label: { zh: "均衡" },
	},
	SOTERIA: {
		id: 24294,
		name: "Soteria",
		label: { zh: "拯救" },
	},
	ICARUS: {
		id: 24295,
		name: "Icarus",
		label: { zh: "神翼" },
	},
	ZOE: {
		id: 24300,
		name: "Zoe",
		label: { zh: "活化" },
	},
	KRASIS: {
		id: 24317,
		name: "Krasis",
		label: { zh: "混合" },
	},
	PHILOSOPHIA: {
		id: 37035,
		name: "Philosophia",
		label: { zh: "智慧之爱" },
	},

	/** Addersgall abilities */
	RHIZOMATA: {
		id: 24309,
		name: "Rhizomata",
		label: { zh: "根素" },
	},
	DRUOCHOLE: {
		id: 24296,
		name: "Druochole",
		label: { zh: "灵橡清汁" },
	},
	IXOCHOLE: {
		id: 24299,
		name: "Ixochole",
		label: { zh: "寄生清汁" },
	},
	KERACHOLE: {
		id: 24298,
		name: "Kerachole",
		label: { zh: "坚角清汁" },
	},
	TAUROCHOLE: {
		id: 24303,
		name: "Taurochole",
		label: { zh: "白牛清汁" },
	},

	/** Single-Target DPS Spells */
	DOSIS: {
		id: 24283,
		name: "Dosis",
		label: { zh: "注药" },
	},
	DOSIS_II: {
		id: 24306,
		name: "Dosis II",
		label: { zh: "注药 II" },
	},
	DOSIS_III: {
		id: 24312,
		name: "Dosis III",
		label: { zh: "注药 III" },
	},
	EUKRASIAN_DOSIS: {
		id: 24293,
		name: "Eukrasian Dosis",
		label: { zh: "均衡注药" },
	},
	EUKRASIAN_DOSIS_II: {
		id: 24308,
		name: "Eukrasian Dosis II",
		label: { zh: "均衡注药 II" },
	},
	EUKRASIAN_DOSIS_III: {
		id: 24314,
		name: "Eukrasian Dosis III",
		label: { zh: "均衡注药 III" },
	},

	/** AoE DPS Spells */
	TOXIKON: {
		id: 24304,
		name: "Toxikon",
		label: { zh: "箭毒" },
	},
	TOXIKON_II: {
		id: 24316,
		name: "Toxikon II",
		label: { zh: "箭毒 II" },
	},
	DYSKRASIA: {
		id: 24297,
		name: "Dyskrasia",
		label: { zh: "失衡" },
	},
	DYSKRASIA_II: {
		id: 24315,
		name: "Dyskrasia II",
		label: { zh: "失衡 II" },
	},
	EUKRASIAN_DYSKRASIA: {
		id: 37032,
		name: "Eukrasian Dyskrasia",
		label: { zh: "均衡失衡" },
	},
	PHLEGMA: {
		id: 24289,
		name: "Phlegma",
		label: { zh: "发炎" },
	},
	PHLEGMA_II: {
		id: 24307,
		name: "Phlegma II",
		label: { zh: "发炎 II" },
	},
	PHLEGMA_III: {
		id: 24313,
		name: "Phlegma III",
		label: { zh: "发炎 III" },
	},
	PSYCHE: {
		id: 37033,
		name: "Psyche",
		label: { zh: "心神风息" },
	},
	PNEUMA: {
		id: 24318,
		name: "Pneuma",
		label: { zh: "魂灵风息" },
	},
});

export const SGE_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_HAIMA: { name: "cd_Haima" },
	cd_PANHAIMA: { name: "cd_PANHAIMA" },
	cd_PHYSIS: { name: "cd_PHYSIS", label: { zh: "CD：自生" } },
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

	cd_DIAGNOSIS_POP: { name: "cd_DIAGNOSIS_POP", label: { zh: "CD：均衡诊断破盾" } },
	cd_PROGNOSIS_POP: { name: "cd_PROGNOSIS_POP", label: { zh: "CD：均衡预后破盾" } },
	cd_HAIMA_POP: { name: "cd_HAIMA_POP" },
	cd_PANHAIMA_POP: { name: "cd_PANHAIMA_POP" },
});

export const SGE_GAUGES = ensureRecord<ResourceData>()({
	ADDERSGALL: {
		name: "Addersgall",
		label: { zh: "蛇胆" },
	},
	ADDERSTING: {
		name: "Addersting",
		label: { zh: "蛇刺" },
	},
});

export const SGE_STATUSES = ensureRecord<ResourceData>()({
	EUKRASIA: {
		id: 2606,
		name: "Eukrasia",
		label: { zh: "均衡" },
	},
	EUKRASIAN_DIAGNOSIS: {
		id: 2607,
		name: "Eukrasian Diagnosis",
		label: { zh: "均衡诊断" },
	},
	DIFFERENTIAL_DIAGNOSIS: {
		id: 2608,
		name: "Differential Diagnosis",
		label: { zh: "齐衡诊断" },
	},
	HAIMA: {
		id: 2612,
		name: "Haima",
		label: { zh: "输血" },
		mayNotBeCanceled: true,
	},
	HAIMATINON: {
		id: 2642,
		name: "Haimatinon",
		label: { zh: "血印" },
		maximumStacks: 5,
		mayNotBeCanceled: true,
	},
	EUKRASIAN_PROGNOSIS: {
		id: 2609,
		name: "Eukrasian Prognosis",
		label: { zh: "均衡预后" },
	},
	PANHAIMA: {
		id: 2613,
		name: "Panhaima",
		label: { zh: "泛输血" },
		mayNotBeCanceled: true,
	},
	PANHAIMATINON: {
		id: 2643,
		name: "Panhaimatinon",
		label: { zh: "泛血印" },
		maximumStacks: 5,
		mayNotBeCanceled: true,
	},
	PHYSIS_II: {
		id: 2620,
		name: "Physis II",
		label: { zh: "自生 II" },
	},
	AUTOPHYSIS: {
		id: 2621,
		name: "Autophysis",
		label: { zh: "催进" },
	},
	KARDIA: {
		id: 2604,
		name: "Kardia",
		label: { zh: "心关" },
	},
	KARDION: {
		id: 2605,
		name: "Kardion",
		label: { zh: "关心" },
	},
	PHILOSOPHIA: {
		id: 3898,
		name: "Philosophia",
		label: { zh: "智慧之爱" },
	},
	EUDAIMONIA: {
		id: 3899,
		name: "Eudaimonia",
		label: { zh: "幸福" },
	},
	SOTERIA: {
		id: 2610,
		name: "Soteria",
		label: { zh: "拯救" },
		maximumStacks: 4,
	},
	ZOE: {
		id: 2611,
		name: "Zoe",
		label: { zh: "活化" },
	},
	KRASIS: {
		id: 2622,
		name: "Krasis",
		label: { zh: "混合" },
	},
	KERACHOLE: {
		id: 2618,
		name: "Kerachole",
		label: { zh: "坚角清汁" },
	},
	KERAKEIA: {
		// The regen component of Kerachole
		id: 2938,
		name: "Kerakeia",
		label: { zh: "坚角清汁[回]" },
	},
	TAUROCHOLE: {
		id: 2619,
		name: "Taurochole",
		label: { zh: "白牛清汁" },
	},
	EUKRASIAN_DOSIS: {
		id: 2614,
		name: "Eukrasian Dosis",
		label: { zh: "均衡注药" },
	},
	EUKRASIAN_DOSIS_II: {
		id: 2615,
		name: "Eukrasian Dosis II",
		label: { zh: "均衡注药 II" },
	},
	EUKRASIAN_DOSIS_III: {
		id: 2616,
		name: "Eukrasian Dosis III",
		label: { zh: "均衡注药 III" },
	},
	EUKRASIAN_DYSKRASIA: {
		id: 3897,
		name: "Eukrasian Dyskrasia",
		label: { zh: "均衡失衡" },
	},
	PNEUMA: {
		id: 2623,
		name: "Pneuma",
		label: { zh: "魂灵风息" },
	},
	HOLOS: {
		id: 3003,
		name: "Holos",
		label: { zh: "整体论" },
	},
	HOLOSAKOS: {
		id: 3365,
		name: "Holosakos",
		label: { zh: "整体盾" },
	},
});

export const SGE_TRACKERS = ensureRecord<ResourceData>()({
	PEPSIS: {
		// Fake resource to hold Pepsis' healing potencies
		name: "Pepsis",
		label: { zh: "消化" },
	},
});

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
