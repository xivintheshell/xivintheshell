import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const VPR_ACTIONS = ensureRecord<ActionData>()({
	STEEL_FANGS: {
		id: 34606,
		name: "Steel Fangs",
		label: {
			zh: "咬噬尖齿",
			ja: "壱の牙【咬創】",
		},
	},
	HUNTERS_STING: {
		id: 34608,
		name: "Hunter's Sting",
		label: {
			zh: "猛袭利齿",
			ja: "弐の牙【猛襲】",
		},
	},
	REAVING_FANGS: {
		id: 34607,
		name: "Reaving Fangs",
		label: {
			zh: "穿裂尖齿",
			ja: "壱の牙【穿裂】",
		},
	},
	WRITHING_SNAP: {
		id: 34632,
		name: "Writhing Snap",
		label: {
			zh: "飞蛇之牙",
			ja: "飛蛇の牙",
		},
	},
	SWIFTSKINS_STING: {
		id: 34609,
		name: "Swiftskin's Sting",
		label: {
			zh: "疾速利齿",
			ja: "弐の牙【疾速】",
		},
	},
	STEEL_MAW: {
		id: 34614,
		name: "Steel Maw",
		label: {
			zh: "咬噬尖牙",
			ja: "壱の大牙【咬創】",
		},
	},
	FLANKSTING_STRIKE: {
		id: 34610,
		name: "Flanksting Strike",
		label: {
			zh: "侧击獠齿",
			ja: "参の牙【側撃】",
		},
	},
	FLANKSBANE_FANG: {
		id: 34611,
		name: "Flanksbane Fang",
		label: {
			zh: "侧裂獠齿",
			ja: "参の牙【側裂】",
		},
	},
	HINDSTING_STRIKE: {
		id: 34612,
		name: "Hindsting Strike",
		label: {
			zh: "背击獠齿",
			ja: "参の牙【背撃】",
		},
	},
	HINDSBANE_FANG: {
		id: 34613,
		name: "Hindsbane Fang",
		label: {
			zh: "背裂獠齿",
			ja: "参の牙【背裂】",
		},
	},
	REAVING_MAW: {
		id: 34615,
		name: "Reaving Maw",
		label: {
			zh: "穿裂尖牙",
			ja: "壱の大牙【穿裂】",
		},
	},
	SLITHER: {
		id: 34646,
		name: "Slither",
		label: {
			zh: "蛇行",
			ja: "蛇行",
		},
	},
	HUNTERS_BITE: {
		id: 34616,
		name: "Hunter's Bite",
		label: {
			zh: "猛袭利牙",
			ja: "弐の大牙【猛襲】",
		},
	},
	SWIFTSKINS_BITE: {
		id: 34617,
		name: "Swiftskin's Bite",
		label: {
			zh: "疾速利牙",
			ja: "弐の大牙【疾速】",
		},
	},
	JAGGED_MAW: {
		id: 34618,
		name: "Jagged Maw",
		label: {
			zh: "乱击獠牙",
			ja: "参の大牙【乱撃】",
		},
	},
	BLOODIED_MAW: {
		id: 34619,
		name: "Bloodied Maw",
		label: {
			zh: "乱裂獠牙",
			ja: "参の大牙【乱裂】",
		},
	},
	SERPENTS_TAIL: {
		id: 35920,
		name: "Serpent's Tail",
		label: {
			zh: "蛇尾术",
			ja: "蛇尾術",
		},
	},
	DEATH_RATTLE: {
		id: 34634,
		name: "Death Rattle",
		label: {
			zh: "蛇尾击",
			ja: "蛇尾撃",
		},
	},
	LAST_LASH: {
		id: 34635,
		name: "Last Lash",
		label: {
			zh: "蛇尾闪",
			ja: "蛇尾閃",
		},
	},
	VICEWINDER: {
		id: 34620,
		name: "Vicewinder",
		label: {
			zh: "强碎灵蛇",
			ja: "壱の蛇【強砕】",
		},
	},
	HUNTERS_COIL: {
		id: 34621,
		name: "Hunter's Coil",
		label: {
			zh: "猛袭盘蛇",
			ja: "弐の蛇【猛襲】",
		},
	},
	SWIFTSKINS_COIL: {
		id: 34622,
		name: "Swiftskin's Coil",
		label: {
			zh: "疾速盘蛇",
			ja: "弐の蛇【疾速】",
		},
	},
	VICEPIT: {
		id: 34623,
		name: "Vicepit",
		label: {
			zh: "强碎灵蝰",
			ja: "壱の大蛇【強砕】",
		},
	},
	HUNTERS_DEN: {
		id: 34624,
		name: "Hunter's Den",
		label: {
			zh: "猛袭盘蝰",
			ja: "弐の大蛇【猛襲】",
		},
	},
	SWIFTSKINS_DEN: {
		id: 34625,
		name: "Swiftskin's Den",
		label: {
			zh: "疾速盘蝰",
			ja: "弐の大蛇【疾速】",
		},
	},
	TWINFANG: {
		id: 35921,
		name: "Twinfang",
		label: {
			zh: "双牙连术",
			ja: "双牙連術",
		},
	},
	TWINBLOOD: {
		id: 35922,
		name: "Twinblood",
		label: {
			zh: "双牙乱术",
			ja: "双牙乱術",
		},
	},
	TWINFANG_BITE: {
		id: 34636,
		name: "Twinfang Bite",
		label: {
			zh: "双牙连击",
			ja: "双牙連撃",
		},
	},
	TWINBLOOD_BITE: {
		id: 34637,
		name: "Twinblood Bite",
		label: {
			zh: "双牙乱击",
			ja: "双牙乱撃",
		},
	},
	TWINFANG_THRESH: {
		id: 34638,
		name: "Twinfang Thresh",
		label: {
			zh: "双牙连闪",
			ja: "双牙連閃",
		},
	},
	TWINBLOOD_THRESH: {
		id: 34639,
		name: "Twinblood Thresh",
		label: {
			zh: "双牙乱闪",
			ja: "双牙乱閃",
		},
	},
	UNCOILED_FURY: {
		id: 34633,
		name: "Uncoiled Fury",
		label: {
			zh: "飞蛇之尾",
			ja: "飛蛇の尾",
		},
	},
	SERPENTS_IRE: {
		id: 34647,
		name: "Serpent's Ire",
		label: {
			zh: "蛇灵气",
			ja: "蛇の霊気",
		},
	},
	REAWAKEN: {
		id: 34626,
		name: "Reawaken",
		label: {
			zh: "祖灵降临",
			ja: "祖霊降ろし",
		},
	},
	FIRST_GENERATION: {
		id: 34627,
		name: "First Generation",
		label: {
			zh: "祖灵之牙一式",
			ja: "祖霊の牙【壱】",
		},
	},
	SECOND_GENERATION: {
		id: 34628,
		name: "Second Generation",
		label: {
			zh: "祖灵之牙二式",
			ja: "祖霊の牙【弐】",
		},
	},
	THIRD_GENERATION: {
		id: 34629,
		name: "Third Generation",
		label: {
			zh: "祖灵之牙三式",
			ja: "祖霊の牙【参】",
		},
	},
	FOURTH_GENERATION: {
		id: 34630,
		name: "Fourth Generation",
		label: {
			zh: "祖灵之牙四式",
			ja: "祖霊の牙【肆】",
		},
	},
	UNCOILED_TWINFANG: {
		id: 34644,
		name: "Uncoiled Twinfang",
		label: {
			zh: "飞蛇连尾击",
			ja: "飛蛇連尾撃",
		},
	},
	UNCOILED_TWINBLOOD: {
		id: 34645,
		name: "Uncoiled Twinblood",
		label: {
			zh: "飞蛇乱尾击",
			ja: "飛蛇乱尾撃",
		},
	},
	OUROBOROS: {
		id: 34631,
		name: "Ouroboros",
		label: {
			zh: "祖灵大蛇牙",
			ja: "祖霊の大蛇牙",
		},
	},
	FIRST_LEGACY: {
		id: 34640,
		name: "First Legacy",
		label: {
			zh: "祖灵之蛇一式",
			ja: "祖霊の蛇【壱】",
		},
	},
	SECOND_LEGACY: {
		id: 34641,
		name: "Second Legacy",
		label: {
			zh: "祖灵之蛇二式",
			ja: "祖霊の蛇【弐】",
		},
	},
	THIRD_LEGACY: {
		id: 34642,
		name: "Third Legacy",
		label: {
			zh: "祖灵之蛇三式",
			ja: "祖霊の蛇【参】",
		},
	},
	FOURTH_LEGACY: {
		id: 34643,
		name: "Fourth Legacy",
		label: {
			zh: "祖灵之蛇四式",
			ja: "祖霊の蛇【肆】",
		},
	},
});

export const VPR_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_SERPENTS_IRE: { name: "cd_SerpentsIre" },
	cd_VICEWINDER: { name: "cd_Vicewinder" },
	cd_SLITHER: { name: "cd_Slither" },
	cd_SERPENTS_TAIL: { name: "cd_SerpentsTail" },
	cd_TWINFANG: { name: "cd_Twinfang" },
	cd_TWINBLOOD: { name: "cd_Twinblood" },
});

export const VPR_GAUGES = ensureRecord<ResourceData>()({
	RATTLING_COIL: { name: "Rattling Coil", label: { zh: "飞蛇之魂" } },
	SERPENT_OFFERINGS: { name: "Serpent Offerings", label: { zh: "灵力" } },
	ANGUINE_TRIBUTE: { name: "Anguine Tribute", label: { zh: "祖灵力" } },
});

export const VPR_STATUSES = ensureRecord<ResourceData>()({
	HUNTERS_INSTINCT: { name: "Hunter's Instinct", label: { zh: "猛袭" } },
	SWIFTSCALED: { name: "Swiftscaled", label: { zh: "疾速" } },
	HONED_STEEL: { name: "Honed Steel", label: { zh: "咬噬锐牙" } },
	HONED_REAVERS: { name: "Honed Reavers", label: { zh: "穿裂锐牙" } },
	FLANKSTUNG_VENOM: { name: "Flankstung Venom", label: { zh: "侧击锐牙" } },
	HINDSTUNG_VENOM: { name: "Hindstung Venom", label: { zh: "背击锐牙" } },
	FLANKSBANE_VENOM: { name: "Flanksbane Venom", label: { zh: "侧裂锐牙" } },
	HINDSBANE_VENOM: { name: "Hindsbane Venom", label: { zh: "背裂锐牙" } },
	GRIMSKINS_VENOM: { name: "Grimskin's Venom", label: { zh: "乱裂锐牙" } },
	GRIMHUNTERS_VENOM: { name: "Grimhunter's Venom", label: { zh: "乱击锐牙" } },
	HUNTERS_VENOM: { name: "Hunter's Venom", label: { zh: "飞蛇之魂" } },
	SWIFTSKINS_VENOM: { name: "Swiftskin's Venom", label: { zh: "乱击双锐牙" } },
	POISED_FOR_TWINFANG: { name: "Poised for Twinfang", label: { zh: "连尾锐尾" } },
	POISED_FOR_TWINBLOOD: { name: "Poised for Twinblood", label: { zh: "乱尾锐尾" } },
	FELLHUNTERS_VENOM: { name: "Fellhunter's Venom", label: { zh: "连闪双锐牙" } },
	FELLSKINS_VENOM: { name: "Fellskin's Venom", label: { zh: "乱闪双锐牙" } },
	READY_TO_REAWAKEN: { name: "Ready to Reawaken", label: { zh: "祖灵降临预备" } },
	REAWAKENED: { name: "Reawakened", label: { zh: "祖灵降临" }, mayNotBeCanceled: true },
});

export const VPR_TRACKERS = ensureRecord<ResourceData>()({
	// 0 = no combo
	// 1 = after Steel Fangs or Reaving Fangs
	// 2 = after Hunter's Sting
	// 3 = after Swiftskin's Sting
	VPR_COMBO: { name: "VPR Combo" }, // [ 0, 3 ]
	// Granted by the 3rd step of VPR combo
	DEATH_RATTLE_READY: { name: "Death Rattle Ready" }, // [ 0, 1 ]

	// 0 = no combo
	// 1 = after Steel Maw or Reaving Maw
	// 2 = after Hunter's Bite or Swiftskin's Bite
	VPR_AOE_COMBO: { name: "VPR AoE Combo" }, // [ 0, 2 ]
	// Granted by the 3rd step of VPR AoE combo
	LAST_LASH_READY: { name: "Last Lash Ready" }, // [ 0, 1 ]

	// Both of these are granted by Vicewinder and both refresh each other
	HUNTERS_COIL_READY: { name: "Hunter's Coil Ready" }, // [ 0, 1 ]
	SWIFTSKINS_COIL_READY: { name: "Swiftskin's Coil Ready" }, // [ 0, 1 ]
	// 2 stacks are granted each by Hunter's Coil and Swiftskin's Coil
	COIL_OGCD_READY: { name: "Coil oGCD Ready" }, // [ 0, 2 ]

	// Both of these are granted by Vicepit and both refresh each other
	HUNTERS_DEN_READY: { name: "Hunter's Den Ready" }, // [ 0, 1 ]
	SWIFTSKINS_DEN_READY: { name: "Swiftskin's Den Ready" }, // [ 0, 1 ]
	// 2 stacks are granted each by Hunter's Den and Swiftskin's Den
	DEN_OGCD_READY: { name: "Den oGCD Ready" }, // [ 0, 2 ]

	// 2 stacks are granted by Uncoiled Fury
	UNCOILED_OGCD_READY: { name: "Uncoiled oGCD Ready" }, // [ 0, 2 ]

	// 0 = no combo
	// 1 = after Reawaken
	// 2 = after First Generation
	// 3 = after Second Generation
	// 4 = after Third Generation
	REAWAKEN_COMBO: { name: "Reawaken Combo" }, // [ 0, 4 ]
	// 0 = no legacy
	// 1 = First Legacy
	// 2 = Second Legacy
	// 3 = Third Legacy
	// 4 = Fourth Legacy
	LEGACY_READY: { name: "Legacy Ready" }, // [ 0, 4 ]
});

export const VPR_TRAITS = ensureRecord<TraitData>()({
	MELEE_MASTERY_VPR: { name: "Melee Mastery VPR", level: 74 },
	VIPERS_BITE: { name: "Viper's Bite", level: 75 },
	VIPERS_THRESH: { name: "Viper's Thresh", level: 80 },
	VIPERS_RATTLE: { name: "Viper's Rattle", level: 82 },
	ENHANCED_SLITHER: { name: "Enhanced Slither", level: 84 },
	MELEE_MASTERY_II_VPR: { name: "Melee Mastery II VPR", level: 84 },
	ENHANCED_VIPERS_RATTLE: { name: "Enhanced Viper's Rattle", level: 88 },
	SERPENTS_LINEAGE: { name: "Serpent's Lineage", level: 90 },
	UNCOILED_FANGS: { name: "Uncoiled Fangs", level: 92 },
	ENHANCED_SERPENTS_LINEAGE: { name: "Enhanced Serpent's Lineage", level: 96 },
	SERPENTS_LEGACY: { name: "Serpent's Legacy", level: 100 },
});

export type VPRActions = typeof VPR_ACTIONS;
export type VPRActionKey = keyof VPRActions;

export type VPRCooldowns = typeof VPR_COOLDOWNS;
export type VPRCooldownKey = keyof VPRCooldowns;

export type VPRGauges = typeof VPR_GAUGES;
export type VPRGaugeKey = keyof VPRGauges;

export type VPRStatuses = typeof VPR_STATUSES;
export type VPRStatusKey = keyof VPRStatuses;

export type VPRTrackers = typeof VPR_TRACKERS;
export type VPRTrackerKey = keyof VPRTrackers;

export const VPR_RESOURCES = {
	...VPR_GAUGES,
	...VPR_STATUSES,
	...VPR_TRACKERS,
};
export type VPRResources = typeof VPR_RESOURCES;
export type VPRResourceKey = keyof VPRResources;

export type VPRTraits = typeof VPR_TRAITS;
export type VPRTraitKey = keyof VPRTraits;
