import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const RPR = ensureRecord<Action>()({
	/** Single-target GCD */
	SLICE: { name: "Slice", label: { zh: "切割" } },
	WAXING_SLICE: { name: "Waxing Slice", label: { zh: "增盈切割" } },
	INFERNAL_SLICE: { name: "Infernal Slice", label: { zh: "地狱切割" } },
	SHADOW_OF_DEATH: { name: "Shadow of Death", label: { zh: "死亡之影" } },
	SOUL_SLICE: { name: "Soul Slice", label: { zh: "灵魂切割" } },
	GIBBET: { name: "Gibbet", label: { zh: "绞决" } },
	GALLOWS: { name: "Gallows", label: { zh: "缢杀" } },
	EXECUTIONERS_GIBBET: { name: "Executioner's Gibbet", label: { zh: "绞决处刑" } },
	EXECUTIONERS_GALLOWS: { name: "Executioner's Gallows", label: { zh: "缢杀处刑" } },
	VOID_REAPING: { name: "Void Reaping", label: { zh: "虚无收割" } },
	CROSS_REAPING: { name: "Cross Reaping", label: { zh: "交错收割" } },
	PLENTIFUL_HARVEST: { name: "Plentiful Harvest", label: { zh: "阴冷收割" } },
	HARVEST_MOON: { name: "Harvest Moon", label: { zh: "收获月" } },
	COMMUNIO: { name: "Communio", label: { zh: "团契" } },
	PERFECTIO: { name: "Perfectio", label: { zh: "完人" } },
	SOULSOW: { name: "Soulsow", label: { zh: "播魂种" } },
	HARPE: { name: "Harpe", label: { zh: "勾刃" } },

	/* Single-target oGCD */
	BLOOD_STALK: { name: "Blood Stalk", label: { zh: "隐匿挥割" } },
	UNVEILED_GIBBET: { name: "Unveiled Gibbet", label: { zh: "绞决爪" } },
	UNVEILED_GALLOWS: { name: "Unveiled Gallows", label: { zh: "缢杀爪" } },
	LEMURES_SLICE: { name: "Lemure's Slice", label: { zh: "夜游魂切割" } },
	SACRIFICIUM: { name: "Sacrificium", label: { zh: "祭牲" } },
	ARCANE_CIRCLE: { name: "Arcane Circle", label: { zh: "神秘环" } },
	GLUTTONY: { name: "Gluttony", label: { zh: "暴食" } },
	ENSHROUD: { name: "Enshroud", label: { zh: "夜游魂衣" } },

	/* Multi-target GCD*/
	SPINNING_SCYTHE: { name: "Spinning Scythe", label: { zh: "旋转钐割" } },
	NIGHTMARE_SCYTHE: { name: "Nightmare Scythe", label: { zh: "噩梦钐割" } },
	WHORL_OF_DEATH: { name: "Whorl of Death", label: { zh: "死亡之涡" } },
	SOUL_SCYTHE: { name: "Soul Scythe", label: { zh: "灵魂钐割" } },
	GUILLOTINE: { name: "Guillotine", label: { zh: "断首" } },
	EXECUTIONERS_GUILLOTINE: {
		name: "Executioner's Guillotine",
		label: { zh: "断首处刑" },
	},
	GRIM_REAPING: { name: "Grim Reaping", label: { zh: "阴冷收割" } },

	/* Multi-target oGCD */
	GRIM_SWATHE: { name: "Grim Swathe", label: { zh: "束缚挥割" } },
	LEMURES_SCYTHE: { name: "Lemure's Scythe", label: { zh: "夜游魂钐割" } },

	// Utility
	ARCANE_CREST: { name: "Arcane Crest", label: { zh: "神秘纹" } },
	ARCANE_CREST_POP: { name: "Pop Arcane Crest", label: { zh: "神秘纹破裂" } },
	HELLS_INGRESS: { name: "Hell's Ingress", label: { zh: "地狱入境" } },
	HELLS_EGRESS: { name: "Hell's Egress", label: { zh: "地狱出境" } },
	REGRESS: { name: "Regress", label: { zh: "回退" } },
});

export type RPRActions = typeof RPR;
export type RPRActionKey = keyof RPRActions;
