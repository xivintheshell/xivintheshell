import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const RPR_GAUGES = ensureRecord<Resource>()({
	SOUL: { name: "Soul", label: { zh: "灵魂" } }, // [0, 100]
	SHROUD: { name: "Shroud", label: { zh: "魂衣" } }, // [0, 100]

	LEMURE_SHROUD: { name: "Lemure Shroud", label: { zh: "夜游魂" } }, // [0, 5]
	VOID_SHROUD: { name: "Void Shroud", label: { zh: "虚无魂" } }, // [0, 5]
});
export type RPRGauges = typeof RPR_GAUGES;
export type RPRGaugeKey = keyof RPRGauges;

export const RPR_STATUSES = ensureRecord<Resource>()({
	DEATHS_DESIGN: { name: "Death's Design", label: { zh: "死亡烙印" } }, // [0, 1]

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
export type RPRStatuses = typeof RPR_STATUSES;
export type RPRStatusKey = keyof RPRStatuses;

export const RPR_TRACKERS = ensureRecord<Resource>()({
	ARCANE_CREST: { name: "Arcane Crest", label: { zh: "神秘纹" } }, // [0, 1]
	HELLS_INGRESS_USED: { name: "Hell's Ingress Used", label: { zh: "地狱入境已使用" } }, // For tracking which ability turns into the return

	// 0 = no combo, 1 = after slice, 2 = after waxing
	RPR_COMBO: { name: "RPR Combo", label: { zh: "单体连击" } }, // [0, 2]
	// 0 = no combo, 1 = after spinning slice
	RPR_AOE_COMBO: { name: "RPR AoE Combo", label: { zh: "AOE连击" } }, // [0, 1]
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
