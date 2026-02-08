import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const RPR_ACTIONS = ensureRecord<ActionData>()({
	/** Single-target GCD */
	SLICE: {
		id: 24373,
		name: "Slice",
		label: { zh: "切割" },
	},
	WAXING_SLICE: {
		id: 24374,
		name: "Waxing Slice",
		label: { zh: "增盈切割" },
	},
	INFERNAL_SLICE: {
		id: 24375,
		name: "Infernal Slice",
		label: { zh: "地狱切割" },
	},
	SHADOW_OF_DEATH: {
		id: 24378,
		name: "Shadow of Death",
		label: { zh: "死亡之影" },
	},
	SOUL_SLICE: {
		id: 24380,
		name: "Soul Slice",
		label: { zh: "灵魂切割" },
	},
	GIBBET: {
		id: 24382,
		name: "Gibbet",
		label: { zh: "绞决" },
	},
	GALLOWS: {
		id: 24383,
		name: "Gallows",
		label: { zh: "缢杀" },
	},
	EXECUTIONERS_GIBBET: {
		id: 36970,
		name: "Executioner's Gibbet",
		label: { zh: "绞决处刑" },
	},
	EXECUTIONERS_GALLOWS: {
		id: 36971,
		name: "Executioner's Gallows",
		label: { zh: "缢杀处刑" },
	},
	VOID_REAPING: {
		id: 24395,
		name: "Void Reaping",
		label: { zh: "虚无收割" },
	},
	CROSS_REAPING: {
		id: 24396,
		name: "Cross Reaping",
		label: { zh: "交错收割" },
	},
	PLENTIFUL_HARVEST: {
		id: 24385,
		name: "Plentiful Harvest",
		label: { zh: "阴冷收割" },
	},
	HARVEST_MOON: {
		id: 24388,
		name: "Harvest Moon",
		label: { zh: "收获月" },
	},
	COMMUNIO: {
		id: 24398,
		name: "Communio",
		label: { zh: "团契" },
	},
	PERFECTIO: {
		id: 36973,
		name: "Perfectio",
		label: { zh: "完人" },
	},
	SOULSOW: {
		id: 24387,
		name: "Soulsow",
		label: { zh: "播魂种" },
	},
	HARPE: {
		id: 24386,
		name: "Harpe",
		label: { zh: "勾刃" },
	},

	/* Single-target oGCD */
	BLOOD_STALK: {
		id: 24389,
		name: "Blood Stalk",
		label: { zh: "隐匿挥割" },
	},
	UNVEILED_GIBBET: {
		id: 24390,
		name: "Unveiled Gibbet",
		label: { zh: "绞决爪" },
	},
	UNVEILED_GALLOWS: {
		id: 24391,
		name: "Unveiled Gallows",
		label: { zh: "缢杀爪" },
	},
	LEMURES_SLICE: {
		id: 24399,
		name: "Lemure's Slice",
		label: { zh: "夜游魂切割" },
	},
	SACRIFICIUM: {
		id: 36969,
		name: "Sacrificium",
		label: { zh: "祭牲" },
	},
	ARCANE_CIRCLE: {
		id: 24405,
		name: "Arcane Circle",
		label: { zh: "神秘环" },
	},
	GLUTTONY: {
		id: 24393,
		name: "Gluttony",
		label: { zh: "暴食" },
	},
	ENSHROUD: {
		id: 24394,
		name: "Enshroud",
		label: { zh: "夜游魂衣" },
	},

	/* Multi-target GCD*/
	SPINNING_SCYTHE: {
		id: 24376,
		name: "Spinning Scythe",
		label: { zh: "旋转钐割" },
	},
	NIGHTMARE_SCYTHE: {
		id: 24377,
		name: "Nightmare Scythe",
		label: { zh: "噩梦钐割" },
	},
	WHORL_OF_DEATH: {
		id: 24379,
		name: "Whorl of Death",
		label: { zh: "死亡之涡" },
	},
	SOUL_SCYTHE: {
		id: 24381,
		name: "Soul Scythe",
		label: { zh: "灵魂钐割" },
	},
	GUILLOTINE: {
		id: 24384,
		name: "Guillotine",
		label: { zh: "断首" },
	},
	EXECUTIONERS_GUILLOTINE: {
		id: 36972,
		name: "Executioner's Guillotine",
		label: { zh: "断首处刑" },
	},
	GRIM_REAPING: {
		id: 24397,
		name: "Grim Reaping",
		label: { zh: "阴冷收割" },
	},

	/* Multi-target oGCD */
	GRIM_SWATHE: {
		id: 24392,
		name: "Grim Swathe",
		label: { zh: "束缚挥割" },
	},
	LEMURES_SCYTHE: {
		id: 24400,
		name: "Lemure's Scythe",
		label: { zh: "夜游魂钐割" },
	},

	// Utility
	ARCANE_CREST: {
		id: 24404,
		name: "Arcane Crest",
		label: { zh: "神秘纹" },
	},
	ARCANE_CREST_POP: { name: "Pop Arcane Crest", label: { zh: "神秘纹破裂" } },
	HELLS_INGRESS: {
		id: 24401,
		name: "Hell's Ingress",
		label: { zh: "地狱入境" },
	},
	HELLS_EGRESS: {
		id: 24402,
		name: "Hell's Egress",
		label: { zh: "地狱出境" },
	},
	REGRESS: {
		id: 24403,
		name: "Regress",
		label: { zh: "回退" },
	},

	// Fake skill to mimic a target dying with DD active
	GAIN_SOUL_GAUGE: { name: "+10 Soul Gauge", label: { zh: "灵魂量谱+10" } },
});

export const RPR_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_ARCANE_CIRCLE: { name: "cd_ArcaneCircle" },
	cd_GLUTTONY: { name: "cd_Gluttony" },
	cd_SOUL_SLICE: { name: "cd_SoulSlice" },
	cd_ENSHROUD: { name: "cd_Enshroud" },

	cd_INGRESS_EGRESS: { name: "cd_IngressEgress", label: { zh: "CD：地狱入境/地狱出境" } },
	cd_ARCANE_CREST: { name: "cd_ArcaneCrest" },
	cd_ARCANE_CREST_POP: { name: "cd_ArcaneCrestPop" }, // Not real

	cd_BLOOD_STALK: { name: "cd_BloodStalk" },
	cd_LEMURES_SLICE: { name: "cd_LemuresSlice" },
	cd_SACRIFICIUM: { name: "cd_Sacrificium" },

	cd_GAIN_SOUL_GAUGE: { name: "cd_GainSoulGauge" }, // Not real
});

export const RPR_GAUGES = ensureRecord<ResourceData>()({
	SOUL: { name: "Soul", label: { zh: "灵魂" } }, // [0, 100]
	SHROUD: { name: "Shroud", label: { zh: "魂衣" } }, // [0, 100]

	LEMURE_SHROUD: { name: "Lemure Shroud", label: { zh: "夜游魂" } }, // [0, 5]
	VOID_SHROUD: { name: "Void Shroud", label: { zh: "虚无魂" } }, // [0, 5]
});

export const RPR_STATUSES = ensureRecord<ResourceData>()({
	DEATHS_DESIGN: { name: "Death's Design", label: { zh: "死亡烙印" }, specialDebuff: true }, // [0, 1]

	SOUL_REAVER: { name: "Soul Reaver", label: { zh: "妖异之镰" }, maximumStacks: 2 }, // [0, 2], Gibbet/Gallows
	ENHANCED_GIBBET: { name: "Enhanced Gibbet", label: { zh: "绞决效果提高" } }, // [0, 1]
	ENHANCED_GALLOWS: { name: "Enhanced Gallows", label: { zh: "缢杀效果提高" } }, // [0, 1]
	EXECUTIONER: { name: "Executioner", label: { zh: "处刑人" }, maximumStacks: 2 }, // [0, 2], Executioner's Gibbet/Gallows

	ENSHROUDED: { name: "Enshrouded", label: { zh: "夜游魂衣" } }, // [0, 1]
	ENHANCED_VOID_REAPING: { name: "Enhanced Void Reaping", label: { zh: "虚无收割效果提高" } }, // [0, 1]
	ENHANCED_CROSS_REAPING: { name: "Enhanced Cross Reaping", label: { zh: "交错收割效果提高" } }, // [0, 1]
	OBLATIO: { name: "Oblatio", label: { zh: "祭牲预备" } }, // [0, 1]

	IDEAL_HOST: { name: "Ideal Host", label: { zh: "夜游魂衣预备" } }, // [0, 1]
	PERFECTIO_OCCULTA: { name: "Perfectio Occulta", label: { zh: "补完" } }, // [0, 1]
	PERFECTIO_PARATA: { name: "Perfectio Parata", label: { zh: "完人预备" } }, // [0, 1]

	ARCANE_CIRCLE: { name: "Arcane Circle", label: { zh: "神秘环" } }, // [0, 1]
	CIRCLE_OF_SACRIFICE: { name: "Circle of Sacrifice", label: { zh: "祭祀环" } }, // [0, 1], PH Stack sender
	BLOODSOWN_CIRCLE: { name: "Bloodsown Circle", label: { zh: "死亡祭祀" } }, // [0, 1], PH Lockout & PH Stack Receiver
	IMMORTAL_SACRIFICE: { name: "Immortal Sacrifice", label: { zh: "死亡祭品" }, maximumStacks: 8 }, // [0, 8], PH Stacks

	CREST_OF_TIME_BORROWED: { name: "Crest of Time Borrowed", label: { zh: "守护纹" } }, // [0, 1]
	CREST_OF_TIME_RETURNED: { name: "Crest of Time Returned", label: { zh: "活性纹" } }, // [0, 1]

	SOULSOW: { name: "Soulsow", label: { zh: "播魂种" } },
	THRESHOLD: { name: "Threshold", label: { zh: "回退预备" } },
	ENHANCED_HARPE: { name: "Enhanced Harpe", label: { zh: "勾刃效果提高" } },
});

export const RPR_TRACKERS = ensureRecord<ResourceData>()({
	ARCANE_CREST: { name: "Arcane Crest", label: { zh: "神秘纹" } }, // [0, 1]
	HELLS_INGRESS_USED: { name: "Hell's Ingress Used", label: { zh: "地狱入境已使用" } }, // For tracking which ability turns into the return

	// 0 = no combo, 1 = after slice, 2 = after waxing
	RPR_COMBO: { name: "RPR Combo", label: { zh: "单体连击" } }, // [0, 2]
	// 0 = no combo, 1 = after spinning slice
	RPR_AOE_COMBO: { name: "RPR AoE Combo", label: { zh: "AOE连击" } }, // [0, 1]
});

export const RPR_TRAITS = ensureRecord<TraitData>()({
	HELLSGATE: { name: "Hellsgate", level: 74 },
	TEMPERED_SOUL: { name: "Tempered Soul", level: 78 },
	SHROUD_GAUGE: { name: "Shroud Gauge", level: 80 },
	ENHANCED_ARCANE_CREST: { name: "Enhanced Arcane Crest", level: 84 },
	MELEE_MASTERY_II_RPR: { name: "Melee Mastery II", level: 84 },
	VOID_SOUL: { name: "Void Soul", level: 86 },
	ENHANCED_ARCANE_CIRCLE: { name: "Enhanced Arcane Circle", level: 88 },
	ENHANCED_ENSHROUD: { name: "Enhanced Enshroud", level: 92 },
	MELEE_MASTERY_III_RPR: { name: "Melee Mastery III", level: 94 },
	ENHANCED_GLUTTONY: { name: "Enhanced Gluttony", level: 96 },
	ENHANCED_PLENTIFUL_HARVEST: { name: "Enhanced Plentiful Harvest", level: 100 },
});

export type RPRActions = typeof RPR_ACTIONS;
export type RPRActionKey = keyof RPRActions;

export type RPRCooldowns = typeof RPR_COOLDOWNS;
export type RPRCooldownKey = keyof RPRCooldowns;

export type RPRGauges = typeof RPR_GAUGES;
export type RPRGaugeKey = keyof RPRGauges;

export type RPRStatuses = typeof RPR_STATUSES;
export type RPRStatusKey = keyof RPRStatuses;

export type RPRTrackers = typeof RPR_TRACKERS;
export type RPRTrackerKey = keyof RPRTrackers;

export const RPR_RESOURCES = {
	...RPR_GAUGES,
	...RPR_STATUSES,
	...RPR_TRACKERS,
};
export type RPRResources = typeof RPR_RESOURCES;
export type RPRResourceKey = keyof RPRResources;

export type RPRTraits = typeof RPR_TRAITS;
export type RPRTraitKey = keyof RPRTraits;
