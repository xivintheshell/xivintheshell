import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource, Trait } from "../types";

export const RDM_ACTIONS = ensureRecord<Action>()({
	RIPOSTE: { name: "Riposte", label: { zh: "回刺", ja: "" } },
	VERTHUNDER: { name: "Verthunder", label: { zh: "赤闪雷", ja: "" } },
	CORPS_A_CORPS: { name: "Corps-a-corps", label: { zh: "短兵相接", ja: "" } },
	VERAERO: { name: "Veraero", label: { zh: "赤疾风", ja: "" } },
	VERFIRE: { name: "Verfire", label: { zh: "赤火炎", ja: "" } },
	VERSTONE: { name: "Verstone", label: { zh: "赤飞石", ja: "" } },
	ZWERCHHAU: { name: "Zwerchhau", label: { zh: "交击斩", ja: "" } },
	DISPLACEMENT: { name: "Displacement", label: { zh: "移转", ja: "" } },
	FLECHE: { name: "Fleche", label: { zh: "飞刺", ja: "" } },
	REDOUBLEMENT: { name: "Redoublement", label: { zh: "连攻", ja: "" } },
	ACCELERATION: { name: "Acceleration", label: { zh: "促进", ja: "" } },
	MOULINET: { name: "Moulinet", label: { zh: "划圆斩", ja: "" } },
	VERCURE: { name: "Vercure", label: { zh: "赤治疗", ja: "" } },
	CONTRE_SIXTE: { name: "Contre Sixte", label: { zh: "六分反击", ja: "" } },
	EMBOLDEN: { name: "Embolden", label: { zh: "鼓励", ja: "" } },
	MANAFICATION: { name: "Manafication", label: { zh: "魔元化", ja: "" } },
	JOLT_II: { name: "Jolt II", label: { zh: "震荡", ja: "" } },
	VERRAISE: { name: "Verraise", label: { zh: "赤复活", ja: "" } },
	IMPACT: { name: "Impact", label: { zh: "冲击", ja: "" } },
	VERFLARE: { name: "Verflare", label: { zh: "赤核爆", ja: "" } },
	VERHOLY: { name: "Verholy", label: { zh: "赤神圣", ja: "" } },
	ENCHANTED_RIPOSTE: { name: "Enchanted Riposte", label: { zh: "魔回刺", ja: "" } },
	ENCHANTED_ZWERCHHAU: { name: "Enchanted Zwerchhau", label: { zh: "魔交击斩", ja: "" } },
	ENCHANTED_REDOUBLEMENT: { name: "Enchanted Redoublement", label: { zh: "魔连攻", ja: "" } },
	ENCHANTED_MOULINET: { name: "Enchanted Moulinet", label: { zh: "魔划圆斩", ja: "" } },
	VERTHUNDER_II: { name: "Verthunder II", label: { zh: "赤震雷", ja: "" } },
	VERAERO_II: { name: "Veraero II", label: { zh: "赤烈风", ja: "" } },
	ENGAGEMENT: { name: "Engagement", label: { zh: "交剑", ja: "" } },
	ENCHANTED_REPRISE: { name: "Enchanted Reprise", label: { zh: "魔续斩", ja: "" } },
	REPRISE: { name: "Reprise", label: { zh: "续斩", ja: "" } },
	SCORCH: { name: "Scorch", label: { zh: "焦热", ja: "" } },
	VERTHUNDER_III: { name: "Verthunder III", label: { zh: "赤暴雷", ja: "" } },
	VERAERO_III: { name: "Veraero III", label: { zh: "赤疾风", ja: "" } },
	MAGICK_BARRIER: { name: "Magick Barrier", label: { zh: "抗死", ja: "" } },
	RESOLUTION: { name: "Resolution", label: { zh: "决断", ja: "" } },
	ENCHANTED_MOULINET_II: {
		name: "Enchanted Moulinet Deux",
		label: { zh: "魔划圆斩·二段", ja: "" },
	},
	ENCHANTED_MOULINET_III: {
		name: "Enchanted Moulinet Trois",
		label: { zh: "魔划圆斩·三段", ja: "" },
	},
	JOLT_III: { name: "Jolt III", label: { zh: "激荡", ja: "" } },
	VICE_OF_THORNS: { name: "Vice of Thorns", label: { zh: "荆棘回环", ja: "" } },
	GRAND_IMPACT: { name: "Grand Impact", label: { zh: "显贵冲击", ja: "" } },
	PREFULGENCE: { name: "Prefulgence", label: { zh: "光芒四射", ja: "" } },
});

export const RDM_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_CORPS_A_CORPS: { name: "cd_CorpsACorps" },
	cd_DISPLACEMENT: { name: "cd_Displacement" },
	cd_FLECHE: { name: "cd_Fleche" },
	cd_ACCELERATION: { name: "cd_Acceleration" },
	cd_CONTRE_SIXTE: { name: "cd_ContreSixte" },
	cd_EMBOLDEN: { name: "cd_Embolden" },
	cd_MANAFICATION: { name: "cd_Manafication" },
	cd_MAGICK_BARRIER: { name: "cd_MagickBarrier" },
	cd_VICE_OF_THORNS: { name: "cd_ViceOfThorns" },
	cd_PREFULGENCE: { name: "cd_Prefulgence" },
});

export const RDM_GAUGES = ensureRecord<Resource>()({
	WHITE_MANA: { name: "White Mana", label: { zh: "白魔元" } }, // [0, 100]
	BLACK_MANA: { name: "Black Mana", label: { zh: "黑魔元" } }, // [0, 100]
	MANA_STACKS: { name: "Mana Stacks", label: { zh: "魔元集" } }, // [0, 3]
});

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

export const RDM_TRACKERS = ensureRecord<Resource>()({
	// secret combo trackers
	// 0 = no melee combo, 1 = after 1st, 2 = after 2nd
	RDM_MELEE_COUNTER: { name: "RDM Melee Combo", label: { zh: "赤魔近战连" } }, // [0, 2]
	// 0 = finishers not started, 1 = after verflare/holy, 2 = after scorch
	RDM_FINISHER_COUNTER: { name: "RDM Finisher Combo", label: { zh: "赤核爆/赤神圣连击" } }, // [0, 2]
	// 0 = no moulinet combo, 1 = after 1st, 2 = after 2nd
	RDM_AOE_COUNTER: { name: "RDM AoE Combo", label: { zh: "赤魔AOE连" } }, // [0, 2]
});

export const RDM_TRAITS = ensureRecord<Trait>()({
	ENHANCED_DISPLACEMENT: { name: "Enhanced Displacement", level: 72 },
	RED_MAGIC_MASTERY: { name: "Red Magic Mastery", level: 74 },
	ENHANCED_MANAFICATION: { name: "Enhanced Manafication", level: 78 },
	RED_MAGIC_MASTERY_II: { name: "Red Magic Mastery II", level: 82 },
	RED_MAGIC_MASTERY_III: { name: "Red Magic Mastery III", level: 84 },
	ENHANCED_ACCELERATION: { name: "Enhanced Acceleration", level: 88 },
	ENHANCED_MANAFICATION_II: { name: "Enhanced Manafication II", level: 90 },
	ENHANCED_EMBOLDEN: { name: "Enhanced Embolden", level: 92 },
	ENCHANTED_BLADE_MASTERY: { name: "Enchanted Blade Mastery", level: 94 },
	ENHANCED_ACCELERATION_II: { name: "Enhanced Acceleration II", level: 96 },
	ENHANCED_MANAFICATION_III: { name: "Enhanced Manafication III", level: 100 },
});

export type RDMActions = typeof RDM_ACTIONS;
export type RDMActionKey = keyof RDMActions;

export type RDMCooldowns = typeof RDM_COOLDOWNS;
export type RDMCooldownKey = keyof RDMCooldowns;

export type RDMGauges = typeof RDM_GAUGES;
export type RDMGaugeKey = keyof RDMGauges;

export type RDMStatuses = typeof RDM_STATUSES;
export type RDMStatusKey = keyof RDMStatuses;

export type RDMTrackers = typeof RDM_TRACKERS;
export type RDMTrackerKey = keyof RDMTrackers;

export const RDM_RESOURCES = {
	...RDM_GAUGES,
	...RDM_STATUSES,
	...RDM_TRACKERS,
};
export type RDMResources = typeof RDM_RESOURCES;
export type RDMResourceKey = keyof RDMResources;

export type RDMTraits = typeof RDM_TRAITS;
export type RDMTraitKey = keyof RDMTraits;
