import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const PLD_ACTIONS = ensureRecord<ActionData>()({
	FAST_BLADE: {
		id: 9,
		name: "Fast Blade",
		label: { zh: "先锋剑" },
	},
	FIGHT_OR_FLIGHT: {
		id: 20,
		name: "Fight or Flight",
		label: { zh: "战逃反应" },
	},
	RIOT_BLADE: {
		id: 15,
		name: "Riot Blade",
		label: { zh: "暴乱剑" },
	},
	TOTAL_ECLIPSE: {
		id: 7381,
		name: "Total Eclipse",
		label: { zh: "全蚀斩" },
	},
	SHIELD_BASH: {
		id: 16,
		name: "Shield Bash",
		label: { zh: "盾牌猛击" },
	},
	IRON_WILL: {
		id: 28,
		name: "Iron Will",
		label: { zh: "钢铁信念" },
	},
	RELEASE_IRON_WILL: {
		id: 32065,
		name: "Release Iron Will",
		label: { zh: "解除钢铁信念" },
	},
	SHIELD_LOB: {
		id: 24,
		name: "Shield Lob",
		label: { zh: "投盾" },
	},
	SPIRITS_WITHIN: {
		id: 29,
		name: "Spirits Within",
		label: { zh: "深奥之灵" },
	},
	SHELTRON: {
		id: 3542,
		name: "Sheltron",
		label: { zh: "盾阵" },
	},
	SENTINEL: {
		id: 17,
		name: "Sentinel",
		label: { zh: "预警" },
	},
	PROMINENCE: {
		id: 16457,
		name: "Prominence",
		label: { zh: "日珥斩" },
	},
	COVER: {
		id: 27,
		name: "Cover",
		label: { zh: "保护" },
	},
	CIRCLE_OF_SCORN: {
		id: 23,
		name: "Circle of Scorn",
		label: { zh: "厄运流转" },
	},
	HALLOWED_GROUND: {
		id: 30,
		name: "Hallowed Ground",
		label: { zh: "神圣领域" },
	},
	BULWARK: {
		id: 22,
		name: "Bulwark",
		label: { zh: "壁垒" },
	},
	GORING_BLADE: {
		id: 3538,
		name: "Goring Blade",
		label: { zh: "沥血剑" },
	},
	DIVINE_VEIL: {
		id: 3540,
		name: "Divine Veil",
		label: { zh: "圣光幕帘" },
	},
	CLEMENCY: {
		id: 3541,
		name: "Clemency",
		label: { zh: "深仁厚泽" },
	},
	ROYAL_AUTHORITY: {
		id: 3539,
		name: "Royal Authority",
		label: { zh: "王权剑" },
	},
	INTERVENTION: {
		id: 7382,
		name: "Intervention",
		label: { zh: "干预" },
	},
	HOLY_SPIRIT: {
		id: 7384,
		name: "Holy Spirit",
		label: { zh: "圣灵" },
	},
	INTERVENE: {
		id: 16461,
		name: "Intervene",
		label: { zh: "调停" },
	},
	REQUIESCAT: {
		id: 7383,
		name: "Requiescat",
		label: { zh: "安魂祈祷" },
	},
	PASSAGE_OF_ARMS: {
		id: 7385,
		name: "Passage of Arms",
		label: { zh: "武装戍卫" },
	},
	HOLY_CIRCLE: {
		id: 16458,
		name: "Holy Circle",
		label: { zh: "圣环" },
	},
	ATONEMENT: {
		id: 16460,
		name: "Atonement",
		label: { zh: "赎罪剑" },
	},
	SUPPLICATION: {
		id: 36918,
		name: "Supplication",
		label: { zh: "祈告剑（赎罪连2）" },
	},
	SEPULCHRE: {
		id: 36919,
		name: "Sepulchre",
		label: { zh: "葬送剑（赎罪连3）" },
	},
	CONFITEOR: {
		id: 16459,
		name: "Confiteor",
		label: { zh: "悔罪" },
	},
	HOLY_SHELTRON: {
		id: 25746,
		name: "Holy Sheltron",
		label: { zh: "圣盾阵" },
	},
	EXPIACION: {
		id: 25747,
		name: "Expiacion",
		label: { zh: "偿赎剑" },
	},
	BLADE_OF_FAITH: {
		id: 25748,
		name: "Blade of Faith",
		label: { zh: "信念之剑（悔罪连2）" },
	},
	BLADE_OF_TRUTH: {
		id: 25749,
		name: "Blade of Truth",
		label: { zh: "真理之剑（悔罪连3）" },
	},
	BLADE_OF_VALOR: {
		id: 25750,
		name: "Blade of Valor",
		label: { zh: "英勇之剑（悔罪连4）" },
	},
	GUARDIAN: {
		id: 36920,
		name: "Guardian",
		label: { zh: "极致防御" },
	},
	IMPERATOR: {
		id: 36921,
		name: "Imperator",
		label: { zh: "绝对统治" },
	},
	BLADE_OF_HONOR: {
		id: 36922,
		name: "Blade of Honor",
		label: { zh: "荣耀之剑" },
	},
});

export const PLD_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_FIGHT_OR_FLIGHT: { name: "cd_FightOrFlight" }, // 60 sec
	cd_IRON_WILL: { name: "cd_IronWill" }, // 2 sec
	cd_RELEASE_IRON_WILL: { name: "cd_ReleaseIronWill" }, // 1 sec
	cd_SPIRITS_WITHIN: { name: "cd_SpiritsWithin" }, // 30 sec
	cd_SHELTRON: { name: "cd_Sheltron" }, // 5 sec
	cd_SENTINEL: { name: "cd_Sentinel" }, // 120 sec
	cd_COVER: { name: "cd_Cover" }, // 120 sec
	cd_CIRCLE_OF_SCORN: { name: "cd_CircleOfScorn" }, // 30 sec
	cd_HALLOWED_GROUND: { name: "cd_HallowedGround" }, // 420 sec
	cd_BULWARK: { name: "cd_Bulwark" }, // 90 sec
	cd_DIVINE_VEIL: { name: "cd_DivineVeil" }, // 90 sec
	cd_INTERVENTION: { name: "cd_Intervention" }, // 10 sec
	cd_INTERVENE: { name: "cd_Intervene" }, // 30 sec
	cd_REQUIESCAT: { name: "cd_Requiescat" }, // 60 sec
	cd_PASSAGE_OF_ARMS: { name: "cd_PassageOfArms" }, // 120 sec
	cd_HOLY_SHELTRON: { name: "cd_HolySheltron" }, // 5 sec
	cd_EXPIACION: { name: "cd_Expiacion" }, // 30 sec
	cd_GUARDIAN: { name: "cd_Guardian" }, // 120 sec
	cd_IMPERATOR: { name: "cd_Imperator" }, // 60 sec
	cd_BLADE_OF_HONOR: { name: "cd_BladeOfHonor" }, // 1 sec
});

export const PLD_GAUGES = ensureRecord<ResourceData>()({
	OATH_GAUGE: { name: "Oath Gauge", label: { zh: "忠义值" } }, // [0, 100]
});

export const PLD_STATUSES = ensureRecord<ResourceData>()({
	FIGHT_OR_FLIGHT: { name: "Fight or Flight", label: { zh: "战逃反应" } }, // [0, 1]
	IRON_WILL: { name: "Iron Will", label: { zh: "钢铁信念" } }, // [0, 1]
	CIRCLE_OF_SCORN_DOT: { name: "Circle of Scorn DoT", label: { zh: "厄运流转DOT" } }, // [0, 1]
	SHELTRON: { name: "Sheltron", label: { zh: "盾阵" } }, // [0, 1]
	SENTINEL: { name: "Sentinel", label: { zh: "预警" } }, // [0, 1]
	COVER: { name: "Cover", label: { zh: "保护" } }, // [0, 1]
	HALLOWED_GROUND: { name: "Hallowed Ground", label: { zh: "神圣领域" } }, // [0, 1]
	BULWARK: { name: "Bulwark", label: { zh: "壁垒" } }, // [0, 1]
	GORING_BLADE_READY: { name: "Goring Blade Ready", label: { zh: "沥血剑预备" } }, // [0, 1]
	DIVINE_VEIL: { name: "Divine Veil", label: { zh: "圣光幕帘" } }, // [0, 1]
	ATONEMENT_READY: { name: "Atonement Ready", label: { zh: "赎罪剑预备" } }, // [0, 1]
	DIVINE_MIGHT: { name: "Divine Might", label: { zh: "神圣魔法效果提高" } }, // [0, 1]
	INTERVENTION: { name: "Intervention", label: { zh: "干预" } }, // [0, 1]
	KNIGHTS_RESOLVE: { name: "Knight's Resolve", label: { zh: "骑士的坚守" } }, // [0, 1]
	KNIGHTS_BENEDICTION: { name: "Knight's Benediction", label: { zh: "骑士的加护" } }, // [0, 1]
	REQUIESCAT: { name: "Requiescat", maximumStacks: 4, label: { zh: "安魂祈祷" } }, // [0, 1]
	CONFITEOR_READY: { name: "Confiteor Ready", label: { zh: "悔罪预备" } }, // [0, 1]
	PASSAGE_OF_ARMS: { name: "Passage of Arms", label: { zh: "武装戍卫" } }, // [0, 1]
	ARMS_UP: { name: "Arms Up", label: { zh: "武装" } }, // [0, 1]
	SUPPLICATION_READY: { name: "Supplication Ready", label: { zh: "祈告剑预备" } }, // [0, 1]
	SEPULCHRE_READY: { name: "Sepulchre Ready", label: { zh: "葬送剑预备" } }, // [0, 1]
	HOLY_SHELTRON: { name: "Holy Sheltron", label: { zh: "圣盾阵" } }, // [0, 1]
	BLADE_OF_HONOR_READY: { name: "Blade of Honor Ready", label: { zh: "荣耀之剑预备" } }, // [0, 1]
	GUARDIAN: { name: "Guardian", label: { zh: "极致防御" } }, // [0, 1]
	GUARDIANS_WILL: { name: "Guardian's Will", label: { zh: "极致护盾" } }, // [0, 1]
});

export const PLD_TRACKERS = ensureRecord<ResourceData>()({
	// 0 - no combo, 1 - riot blade ready, 2 - royal authority ready
	PLD_COMBO_TRACKER: { name: "PLD Combo Tracker", label: { zh: "王权连连击状态" } }, // [0, 2]
	// 0 - no combo, 1 - bof ready, 2 - bot ready, 3 - bov ready
	PLD_CONFITEOR_COMBO_TRACKER: {
		name: "PLD Confiteor Combo Tracker",
		label: { zh: "悔罪连连击状态" },
	}, // [0, 3]
	// 0 - no combo, 1 - prominence ready
	PLD_AOE_COMBO_TRACKER: { name: "PLD AOE Combo Tracker", label: { zh: "AOE连连击状态" } }, // [0, 1]

	// CAN_AUTO_ATTACK: { name: "Can Auto Attack" }, // [0, 1]
	// AUTO_ATTACK_TRACKER: { name: "Auto Attack Tracker" }, //
});

export const PLD_TRAITS = ensureRecord<TraitData>()({
	ENHANCED_PROMINENCE: { name: "Enhanced Prominence", level: 72 },
	ENHANCED_SHELTRON: { name: "Enhanced Sheltron", level: 74 },
	SWORD_OATH: { name: "Sword Oath", level: 76 },
	ENHANCED_REQUIESCAT: { name: "Enhanced Requiescat", level: 80 },
	SHELTRON_MASTERY: { name: "Sheltron Mastery", level: 82 },
	ENHANCED_INTERVENTION: { name: "Enhanced Intervention", level: 82 },
	DIVINE_MAGIC_MASTERY_II: { name: "Divine Magic Mastery II", level: 84 },
	SPIRITS_WITHIN_MASTERY: { name: "Spirits Within Mastery", level: 86 },
	ENHANCED_DIVINE_VEIL: { name: "Enhanced Divine Veil", level: 88 },
	SENTINEL_MASTERY: { name: "Sentinel Mastery", level: 92 },
	REQUIESCAT_MASTERY: { name: "Requiescat Mastery", level: 96 },
	ENHANCED_BLADE_OF_VALOR: { name: "Enhanced Blade of Valor", level: 100 },
});

export type PLDActions = typeof PLD_ACTIONS;
export type PLDActionKey = keyof PLDActions;

export type PLDCooldowns = typeof PLD_COOLDOWNS;
export type PLDCooldownKey = keyof PLDCooldowns;

export type PLDGauges = typeof PLD_GAUGES;
export type PLDGaugeKey = keyof PLDGauges;

export type PLDStatuses = typeof PLD_STATUSES;
export type PLDStatusKey = keyof PLDStatuses;

export type PLDTrackers = typeof PLD_TRACKERS;
export type PLDTrackerKey = keyof PLDTrackers;

export const PLD_RESOURCES = {
	...PLD_GAUGES,
	...PLD_STATUSES,
	...PLD_TRACKERS,
};
export type PLDResources = typeof PLD_RESOURCES;
export type PLDResourceKey = keyof PLDResources;

export type PLDTraits = typeof PLD_TRAITS;
export type PLDTraitKey = keyof PLDTraits;
