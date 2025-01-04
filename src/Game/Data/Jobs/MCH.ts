import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource, Trait } from "../types";

export const MCH_ACTIONS = ensureRecord<Action>()({
	HEATED_SPLIT_SHOT: { name: "Heated Split Shot", label: { zh: "热分裂弹" } },
	HEATED_SLUG_SHOT: { name: "Heated Slug Shot", label: { zh: "热独头弹" } },
	HEATED_CLEAN_SHOT: { name: "Heated Clean Shot", label: { zh: "热狙击弹" } },
	DRILL: { name: "Drill", label: { zh: "钻头" } },
	HOT_SHOT: { name: "Hot Shot", label: { zh: "热弹" } },
	AIR_ANCHOR: { name: "Air Anchor", label: { zh: "空气锚" } },
	CHAIN_SAW: { name: "Chain Saw", label: { zh: "回转飞锯" } },
	EXCAVATOR: { name: "Excavator", label: { zh: "掘地飞轮" } },
	GAUSS_ROUND: { name: "Gauss Round", label: { zh: "虹吸弹" } },
	DOUBLE_CHECK: { name: "Double Check", label: { zh: "双将" } },
	RICOCHET: { name: "Ricochet", label: { zh: "弹射" } },
	CHECKMATE: { name: "Checkmate", label: { zh: "将死" } },
	BLAZING_SHOT: { name: "Blazing Shot", label: { zh: "烈焰弹" } },
	WILDFIRE: { name: "Wildfire", label: { zh: "野火" } },
	DETONATOR: { name: "Detonator", label: { zh: "引爆装置" } },
	HYPERCHARGE: { name: "Hypercharge", label: { zh: "超荷" } },
	ROOK_AUTOTURRET: { name: "Rook Autoturret", label: { zh: "车式浮空炮塔" } },
	ROOK_OVERDRIVE: { name: "Rook Overdrive", label: { zh: "超档车式炮塔" } },
	AUTOMATON_QUEEN: { name: "Automaton Queen", label: { zh: "后式自走人偶" } },
	QUEEN_OVERDRIVE: { name: "Queen Overdrive", label: { zh: "超档后式人偶" } },
	BARREL_STABILIZER: { name: "Barrel Stabilizer", label: { zh: "枪管加热" } },
	REASSEMBLE: { name: "Reassemble", label: { zh: "整备" } },
	FULL_METAL_FIELD: { name: "Full Metal Field", label: { zh: "全金属爆发" } },

	SPREAD_SHOT: { name: "Spread Shot", label: { zh: "散射" } },
	SCATTERGUN: { name: "Scattergun", label: { zh: "霰弹枪" } },
	AUTO_CROSSBOW: { name: "Auto Crossbow", label: { zh: "自动弩" } },
	BIOBLASTER: { name: "Bioblaster", label: { zh: "毒菌冲击" } },
	FLAMETHROWER: { name: "Flamethrower", label: { zh: "火焰喷射器" } },

	DISMANTLE: { name: "Dismantle", label: { zh: "武装解除" } },
	TACTICIAN: { name: "Tactician", label: { zh: "策动" } },

	VOLLEY_FIRE: { name: "Volley Fire", label: { zh: "齐射" } },
	ARM_PUNCH: { name: "Arm Punch", label: { zh: "铁臂拳" } },
	ROOK_OVERLOAD: { name: "Rook Overload", label: { zh: "超负荷车式炮塔" } },
	PILE_BUNKER: { name: "Pile Bunker", label: { zh: "打桩枪" } },
	CROWNED_COLLIDER: { name: "Crowned Collider", label: { zh: "王室对撞机" } },
});

export const MCH_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_REASSEMBLE: { name: "cd_Reassemble" },
	cd_DRILL: { name: "cd_Drill" },
	cd_CHECKMATE: { name: "cd_Checkmate" },
	cd_DOUBLE_CHECK: { name: "cd_DoubleCheck" },
	cd_AIR_ANCHOR: { name: "cd_AirAnchor" },
	cd_CHAINSAW: { name: "cd_Chainsaw" },
	cd_BARREL_STABILIZER: { name: "cd_BarrelStabilizer" },
	cd_WILDFIRE: { name: "cd_Wildfire" },
	cd_QUEEN: { name: "cd_Queen", label: { zh: "CD：后式自走人偶" } },
	cd_OVERDRIVE: { name: "cd_Overdrive", label: { zh: "CD：超档车式炮塔/超档后式人偶" } },
	cd_DISMANTLE: { name: "cd_Dismantle" },
	cd_TACTICIAN: { name: "cd_Tactician" },
	cd_HYPERCHARGE: { name: "cd_Hypercharge" },
	cd_DETONATOR: { name: "cd_Detonator" },
	cd_FLAMETHROWER: { name: "cd_Flamethrower" },
});

export const MCH_GAUGES = ensureRecord<Resource>()({
	HEAT_GAUGE: { name: "Heat", label: { zh: "枪管热度" } },
	BATTERY_GAUGE: { name: "Battery", label: { zh: "电能" } },
});

export const MCH_STATUSES = ensureRecord<Resource>()({
	REASSEMBLED: { name: "Reassembled", label: { zh: "整备预备" } },
	OVERHEATED: { name: "Overheated", label: { zh: "过热状态" }, maximumStacks: 5 },
	WILDFIRE: { name: "Wildfire", label: { zh: "野火（敌）" } },
	WILDFIRE_SELF: { name: "Wildfire Self", label: { zh: "野火（我）" } },
	FLAMETHROWER: { name: "Flamethrower", label: { zh: "火焰喷射器持续中" } },
	BIOBLASTER: { name: "Bioblaster", label: { zh: "毒菌冲击" } },
	TACTICIAN: { name: "Tactician", label: { zh: "策动" } },
	HYPERCHARGED: { name: "Hypercharged", label: { zh: "超荷预备" } },
	EXCAVATOR_READY: { name: "Excavator Ready", label: { zh: "掘地飞轮预备" } },
	FULL_METAL_MACHINIST: { name: "Full Metal Machinist", label: { zh: "全金属爆发预备" } },
});

export const MCH_TRACKERS = ensureRecord<Resource>()({
	HEAT_COMBO: { name: "Heat Combo", label: { zh: "热连击" } },
	QUEEN: { name: "Queen", label: { zh: "人偶预备" } },
	QUEEN_PUNCHES: { name: "QueenPunches", label: { zh: "人偶铁壁拳" } },
	QUEEN_FINISHERS: { name: "QueenFinishers", label: { zh: "人偶离场" } },
	BATTERY_BONUS: { name: "BatteryBonus", label: { zh: "额外电量" } },
	WILDFIRE_HITS: { name: "WildfireHits", label: { zh: "野火命中" } },
});

export const MCH_TRAITS = ensureRecord<Trait>()({
	CHARGED_ACTION_MASTERY: { name: "Charged Action Mastery", level: 74 },
	HOT_SHOT_MASTERY: { name: "Hot Shot Mastery", level: 76 },
	ENHANCED_WILD_FIRE: { name: "Enhanced Wildfire", level: 88 },
	PROMOTION: { name: "Promotion", level: 80 },
	SPREAD_SHOT_MASTERY: { name: "Spread Shot Mastery", level: 82 },
	ENHANCED_REASSEMBLE: { name: "Enhanced Reassemble", level: 84 },
	MARKSMANS_MASTERY: { name: "Marksman's Mastery", level: 84 },
	QUEENS_GAMBIT: { name: "Queen's Gambit", level: 86 },
	ENHANCED_TACTICIAN: { name: "Enhanced Tactician", level: 88 },
	DOUBLE_BARREL_MASTERY: { name: "Double-Barrel Mastery", level: 92 },
	ENHANCED_MULTI_WEAPON: { name: "Enhanced Multiweapon", level: 94 },
	MARKSMANS_MASTERY_II: { name: "Marksman's Mastery II", level: 94 },
	ENHANCED_MULTI_WEAPON_II: { name: "Enhanced Multiweapon II", level: 96 },
	ENHANCED_BARREL_STABILIZER: { name: "Enhanced Barrel Stabilizer", level: 100 },
});

export type MCHActions = typeof MCH_ACTIONS;
export type MCHActionKey = keyof MCHActions;

export type MCHCooldowns = typeof MCH_COOLDOWNS;
export type MCHCooldownKey = keyof MCHCooldowns;

export type MCHGauges = typeof MCH_GAUGES;
export type MCHGaugeKey = keyof MCHGauges;

export type MCHStatuses = typeof MCH_STATUSES;
export type MCHStatusKey = keyof MCHStatuses;

export type MCHTrackers = typeof MCH_TRACKERS;
export type MCHTrackerKey = keyof MCHTrackers;

export const MCH_RESOURCES = {
	...MCH_GAUGES,
	...MCH_STATUSES,
	...MCH_TRACKERS,
};
export type MCHResources = typeof MCH_RESOURCES;
export type MCHResourceKey = keyof MCHResources;

export type MCHTraits = typeof MCH_TRAITS;
export type MCHTraitKey = keyof MCHTraits;
