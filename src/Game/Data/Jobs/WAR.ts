import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const WAR_ACTIONS = ensureRecord<ActionData>()({
	HEAVY_SWING: {
		id: 31,
		name: "Heavy Swing",
		label: { zh: "重劈" },
	},
	MAIM: {
		id: 37,
		name: "Maim",
		label: { zh: "凶残裂" },
	},
	STORMS_PATH: {
		id: 42,
		name: "Storm's Path",
		label: { zh: "暴风斩" },
	},
	STORMS_EYE: {
		id: 45,
		name: "Storm's Eye",
		label: { zh: "暴风碎" },
	},
	FELL_CLEAVE: {
		id: 3549,
		name: "Fell Cleave",
		label: { zh: "裂石飞环" },
	},
	UPHEAVAL: {
		id: 7387,
		name: "Upheaval",
		label: { zh: "动乱" },
	},
	ONSLAUGHT: {
		id: 7386,
		name: "Onslaught",
		label: { zh: "猛攻" },
	},

	TOMAHAWK: {
		id: 46,
		name: "Tomahawk",
		label: { zh: "飞斧" },
	},

	OVERPOWER: {
		id: 41,
		name: "Overpower",
		label: { zh: "超压斧" },
	},
	MYTHRIL_TEMPEST: {
		id: 16462,
		name: "Mythril Tempest",
		label: { zh: "秘银暴风" },
	},
	DECIMATE: {
		id: 3550,
		name: "Decimate",
		label: { zh: "地毁人亡" },
	},
	OROGENY: {
		id: 25752,
		name: "Orogeny",
		label: { zh: "群山隆起" },
	},

	INNER_RELEASE: {
		id: 7389,
		name: "Inner Release",
		label: { zh: "原初的解放" },
	},
	PRIMAL_WRATH: {
		id: 36924,
		name: "Primal Wrath",
		label: { zh: "原初的怒震" },
	},
	PRIMAL_REND: {
		id: 25753,
		name: "Primal Rend",
		label: { zh: "蛮荒崩裂" },
	},
	PRIMAL_RUINATION: {
		id: 36925,
		name: "Primal Ruination",
		label: { zh: "尽毁" },
	},

	INFURIATE: {
		id: 52,
		name: "Infuriate",
		label: { zh: "战嚎" },
	},
	INNER_CHAOS: {
		id: 16465,
		name: "Inner Chaos",
		label: { zh: "狂魂" },
	},
	CHAOTIC_CYCLONE: {
		id: 16463,
		name: "Chaotic Cyclone",
		label: { zh: "混沌旋风" },
	},

	THRILL_OF_BATTLE: {
		id: 40,
		name: "Thrill of Battle",
		label: { zh: "战栗" },
	},
	EQUILIBRIUM: {
		id: 3552,
		name: "Equilibrium",
		label: { zh: "泰然自若" },
	},
	SHAKE_IT_OFF: {
		id: 7388,
		name: "Shake It Off",
		label: { zh: "摆脱" },
	},
	RAW_INTUITION: {
		id: 3551,
		name: "Raw Intuition",
		label: { zh: "原初的直觉" },
	}, // Lv56-81
	NASCENT_FLASH: {
		id: 16464,
		name: "Nascent Flash",
		label: { zh: "原初的勇猛" },
	},
	BLOODWHETTING: {
		id: 25751,
		name: "Bloodwhetting",
		label: { zh: "原初的血气" },
	}, // Lv82-
	VENGEANCE: {
		id: 44,
		name: "Vengeance",
		label: { zh: "复仇" },
	}, // Lv38-91
	DAMNATION: {
		id: 36923,
		name: "Damnation",
		label: { zh: "戮罪" },
	}, // Lv92-
	HOLMGANG: {
		id: 43,
		name: "Holmgang",
		label: { zh: "死斗" },
	},
	RETALIATION: {
		// "Retaliation" occurrs when Vengeance/Damnation are triggered.
		// In logs it appears to just match the name of the ability that used it, but
		// it does not have an independent action ID.
		// We keep this around for compatibilit with Ama's combat sim.
		name: "Retaliation",
		label: { zh: "报复" },
	},

	DEFIANCE: {
		id: 48,
		name: "Defiance",
		label: { zh: "守护" },
	},
	RELEASE_DEFIANCE: {
		id: 32066,
		name: "Release Defiance",
		label: { zh: "取消守护" },
	},
});

export const WAR_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_INNER_RELEASE: { name: "cd_InnerRelease" },
	cd_PRIMAL_WRATH: { name: "cd_PrimalWrath" },
	cd_UPHEAVAL: { name: "cd_Upheaval" },
	cd_ONSLAUGHT: { name: "cd_Onslaught" },
	cd_INFURIATE: { name: "cd_Infuriate" },

	cd_VENGEANCE: { name: "cd_Vengeance" },
	cd_THRILL_OF_BATTLE: { name: "cd_ThrillOfBattle" },
	cd_RAW_INTUITION: { name: "cd_RawIntuition" },
	cd_EQUILIBRIUM: { name: "cd_Equilibrium" },
	cd_SHAKE_IT_OFF: { name: "cd_ShakeItOff" },
	cd_HOLMGANG: { name: "cd_Holmgang" },

	cd_RETALIATION: { name: "cd_Retaliation" },

	cd_DEFIANCE: { name: "cd_Defiance" },
	cd_RELEASE_DEFIANCE: { name: "cd_ReleaseDefiance" },
});

export const WAR_GAUGES = ensureRecord<ResourceData>()({
	BEAST_GAUGE: { name: "Beast Gauge", label: { zh: "兽魂量谱" } },
});

export const WAR_STATUSES = ensureRecord<ResourceData>()({
	SURGING_TEMPEST: { name: "Surging Tempest", label: { zh: "战场风暴buff" } },
	INNER_RELEASE: { name: "Inner Release", label: { zh: "原初的解放buff" }, maximumStacks: 3 }, // Free Fell Cleaves
	INNER_STRENGTH: { name: "Inner Strength", label: { zh: "原初的觉悟buff" } }, // KB/Stun immune
	BURGEONING_FURY: { name: "Burgeoning Fury", label: { zh: "原初的搏动buff" }, maximumStacks: 3 }, // Fell Cleave usage counter
	WRATHFUL: { name: "Wrathful", label: { zh: "原初的怒震预备" } }, // Primal Wrath Ready
	PRIMAL_REND_READY: { name: "Primal Rend Ready", label: { zh: "蛮荒崩裂预备" } },
	PRIMAL_RUINATION_READY: { name: "Primal Ruination Ready", label: { zh: "尽毁预备" } },

	NASCENT_CHAOS: { name: "Nascent Chaos", label: { zh: "原初的混沌buff" } },

	// TODO: Nascent Glint when multiple players in a timeline is fully supported.
	NASCENT_FLASH: { name: "Nascent Flash", label: { zh: "原初的勇猛buff（给队友）" } }, // health-on-hit (self)
	THRILL_OF_BATTLE: { name: "Thrill of Battle", label: { zh: "战栗" } },
	EQUILIBRIUM: { name: "Equilibrium", label: { zh: "泰然自若的hot" } }, // HoT
	SHAKE_IT_OFF: { name: "Shake It Off", label: { zh: "摆脱的盾" } }, // Barrier
	SHAKE_IT_OFF_OVER_TIME: { name: "Shake It Off Over Time", label: { zh: "摆脱的hot" } }, // HoT
	RAW_INTUITION: { name: "Raw Intuition", label: { zh: "原初的直觉buff" } },
	STEM_THE_TIDE: { name: "Stem the Tide", label: { zh: "原初的血烟（挡伤害buff）" } }, // Barrier
	STEM_THE_FLOW: { name: "Stem the Flow", label: { zh: "原初的勇猛buff（给队友）" } }, // 4s extra DR
	BLOODWHETTING: { name: "Bloodwhetting", label: { zh: "原初的血气（吸血buff）" } },

	VENGEANCE: { name: "Vengeance", label: { zh: "复仇减伤30" } }, // Phys Ref. / 30% DR
	DAMNATION: { name: "Damnation", label: { zh: "戮罪减伤40" } }, // Phys Ref. / 40% DR
	PRIMEVAL_IMPULSE: { name: "Primeval Impulse", label: { zh: "讨罪hot" } }, // HoT

	HOLMGANG: { name: "Holmgang", label: { zh: "死斗buff" } }, // Invuln

	DEFIANCE: { name: "Defiance", label: { zh: "盾姿buff" }, mayNotBeCanceled: true }, // Tank Stance
});

export const WAR_TRACKERS = ensureRecord<ResourceData>()({
	STORM_COMBO: { name: "Storm Combo", label: { zh: "单体连击" } },
	TEMPEST_COMBO: { name: "Tempest Combo", label: { zh: "aoe连击" } },
});

export const WAR_TRAITS = ensureRecord<TraitData>()({
	NASCENT_CHAOS: { name: "Nascent Chaos", level: 72 },
	MASTERING_THE_BEAST: { name: "Mastering the Beast", level: 74 },
	ENHANCED_SHAKE_IT_OFF: { name: "Enhanced Shake It Off", level: 76 },
	ENHANCED_THRILL_OF_BATTLE: { name: "Enhanced Thrill of Battle", level: 78 },
	RAW_INTUITION_MASTERY: { name: "Raw Intuition Mastery", level: 82 },
	ENHANCED_NASCENT_FLASH: { name: "Enhanced Nascent Flash", level: 82 },
	ENHANCED_EQUILIBRIUM: { name: "Enhanced Equilibrium", level: 84 },
	ENHANCED_ONSLAUGHT: { name: "Enhanced Onslaught", level: 88 },
	VENGEANCE_MASTERY: { name: "Vengeance Mastery", level: 92 },
	ENHANCED_INNER_RELEASE: { name: "Enhanced Inner Release", level: 96 },
	ENHANCED_PRIMAL_REND: { name: "Enhanced Primal Rend", level: 100 },
});

export type WARActions = typeof WAR_ACTIONS;
export type WARActionKey = keyof WARActions;

export type WARCooldowns = typeof WAR_COOLDOWNS;
export type WARCooldownKey = keyof WARCooldowns;

export type WARGauges = typeof WAR_GAUGES;
export type WARGaugeKey = keyof WARGauges;

export type WARStatuses = typeof WAR_STATUSES;
export type WARStatusKey = keyof WARStatuses;

export type WARTrackers = typeof WAR_TRACKERS;
export type WARTrackerKeys = keyof WARTrackers;

export const WAR_RESOURCES = {
	...WAR_GAUGES,
	...WAR_STATUSES,
	...WAR_TRACKERS,
};
export type WARResources = typeof WAR_RESOURCES;
export type WARResourceKey = keyof WARResources;

export type WARTraits = typeof WAR_TRAITS;
export type WARTraitKey = keyof WARTraits;
