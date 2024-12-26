import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const RDM_GAUGES = ensureRecord<Resource>()({
	WHITE_MANA: { name: "White Mana", label: { zh: "白魔元" } }, // [0, 100]
	BLACK_MANA: { name: "Black Mana", label: { zh: "黑魔元" } }, // [0, 100]
	MANA_STACKS: { name: "Mana Stacks", label: { zh: "魔元集" } }, // [0, 3]
});
export type RDMGauges = typeof RDM_GAUGES;
export type RDMGaugeKey = keyof RDMGauges;

export const RDM_STATUSES = ensureRecord<Resource>()({
	ACCELERATION: { name: "Acceleration", label: { zh: "促进" } }, // [0, 1]
	DUALCAST: { name: "Dualcast", label: { zh: "连续咏唱" } }, // [0, 1]
	EMBOLDEN: { name: "Embolden", label: { zh: "鼓励" } }, // [0, 1]
	GRAND_IMPACT_READY: { name: "Grand Impact Ready", label: { zh: "显贵冲击预备" } }, // [0, 1]
	MAGICK_BARRIER: { name: "Magick Barrier", label: { zh: "抗死" } }, // [0, 1]
	MAGICKED_SWORDPLAY: { name: "Magicked Swordplay", label: { zh: "魔法剑术" }, maximumStacks: 3 }, // [0, 3]
	MANAFICATION: { name: "Manafication", label: { zh: "魔元化" }, maximumStacks: 6 }, // [0, 6]
	PREFULGENCE_READY: { name: "Prefulgence Ready", label: { zh: "光芒四射预备" } }, // [0, 1]
	THORNED_FLOURISH: { name: "Thorned Flourish", label: { zh: "荆棘环绕预备" } }, // [0, 1]
	VERFIRE_READY: { name: "Verfire Ready", label: { zh: "赤火炎预备" } }, // [0, 1]
	VERSTONE_READY: { name: "Verstone Ready", label: { zh: "赤飞石预备" } }, // [0, 1]
});
export type RDMStatuses = typeof RDM_STATUSES;
export type RDMStatusKey = keyof RDMStatuses;

export const RDM_TRACKERS = ensureRecord<Resource>()({
	// secret combo trackers
	// 0 = no melee combo, 1 = after 1st, 2 = after 2nd
	RDM_MELEE_COUNTER: { name: "RDM Melee Combo", label: { zh: "赤魔近战连" } }, // [0, 2]
	// 0 = finishers not started, 1 = after verflare/holy, 2 = after scorch
	RDM_FINISHER_COUNTER: { name: "RDM Finisher Combo" }, // [0, 2]
	// 0 = no moulinet combo, 1 = after 1st, 2 = after 2nd
	RDM_AOE_COUNTER: { name: "RDM AoE Combo", label: { zh: "赤魔AOE连" } }, // [0, 2]
});
export type RDMTrackers = typeof RDM_TRACKERS;
export type RDMTrackerKey = keyof RDMTrackers;

export const RDM = {
	...RDM_GAUGES,
	...RDM_STATUSES,
	...RDM_TRACKERS,
};
export type RDMResources = typeof RDM;
export type RDMResourceKey = keyof RDMResources;
