import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const PLD_ACTIONS = ensureRecord<ActionData>()({
	FAST_BLADE: { name: "Fast Blade" },
	FIGHT_OR_FLIGHT: { name: "Fight or Flight" },
	RIOT_BLADE: { name: "Riot Blade" },
	TOTAL_ECLIPSE: { name: "Total Eclipse" },
	SHIELD_BASH: { name: "Shield Bash" },
	IRON_WILL: { name: "Iron Will" },
	RELEASE_IRON_WILL: { name: "Release Iron Will" },
	SHIELD_LOB: { name: "Shield Lob" },
	SPIRITS_WITHIN: { name: "Spirits Within" },
	SHELTRON: { name: "Sheltron" },
	SENTINEL: { name: "Sentinel" },
	PROMINENCE: { name: "Prominence" },
	COVER: { name: "Cover" },
	CIRCLE_OF_SCORN: { name: "Circle of Scorn" },
	HALLOWED_GROUND: { name: "Hallowed Ground" },
	BULWARK: { name: "Bulwark" },
	GORING_BLADE: { name: "Goring Blade" },
	DIVINE_VEIL: { name: "Divine Veil" },
	CLEMENCY: { name: "Clemency" },
	ROYAL_AUTHORITY: { name: "Royal Authority" },
	INTERVENTION: { name: "Intervention" },
	HOLY_SPIRIT: { name: "Holy Spirit" },
	INTERVENE: { name: "Intervene" },
	REQUIESCAT: { name: "Requiescat" },
	PASSAGE_OF_ARMS: { name: "Passage of Arms" },
	HOLY_CIRCLE: { name: "Holy Circle" },
	ATONEMENT: { name: "Atonement" },
	SUPPLICATION: { name: "Supplication" },
	SEPULCHRE: { name: "Sepulchre" },
	CONFITEOR: { name: "Confiteor" },
	HOLY_SHELTRON: { name: "Holy Sheltron" },
	EXPIACION: { name: "Expiacion" },
	BLADE_OF_FAITH: { name: "Blade of Faith" },
	BLADE_OF_TRUTH: { name: "Blade of Truth" },
	BLADE_OF_VALOR: { name: "Blade of Valor" },
	GUARDIAN: { name: "Guardian" },
	IMPERATOR: { name: "Imperator" },
	BLADE_OF_HONOR: { name: "Blade of Honor" },
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
	OATH_GAUGE: { name: "Oath Gauge" }, // [0, 100]
});

export const PLD_STATUSES = ensureRecord<ResourceData>()({
	FIGHT_OR_FLIGHT: { name: "Fight or Flight" }, // [0, 1]
	IRON_WILL: { name: "Iron Will" }, // [0, 1]
	CIRCLE_OF_SCORN_DOT: { name: "Circle of Scorn DoT" }, // [0, 1]
	SHELTRON: { name: "Sheltron" }, // [0, 1]
	SENTINEL: { name: "Sentinel" }, // [0, 1]
	COVER: { name: "Cover" }, // [0, 1]
	HALLOWED_GROUND: { name: "Hallowed Ground" }, // [0, 1]
	BULWARK: { name: "Bulwark" }, // [0, 1]
	GORING_BLADE_READY: { name: "Goring Blade Ready" }, // [0, 1]
	DIVINE_VEIL: { name: "Divine Veil" }, // [0, 1]
	ATONEMENT_READY: { name: "Atonement Ready" }, // [0, 1]
	DIVINE_MIGHT: { name: "Divine Might" }, // [0, 1]
	INTERVENTION: { name: "Intervention" }, // [0, 1]
	KNIGHTS_RESOLVE: { name: "Knight's Resolve" }, // [0, 1]
	KNIGHTS_BENEDICTION: { name: "Knight's Benediction" }, // [0, 1]
	REQUIESCAT: { name: "Requiescat", maximumStacks: 4 }, // [0, 1]
	CONFITEOR_READY: { name: "Confiteor Ready" }, // [0, 1]
	PASSAGE_OF_ARMS: { name: "Passage of Arms" }, // [0, 1]
	ARMS_UP: { name: "Arms Up" }, // [0, 1]
	SUPPLICATION_READY: { name: "Supplication Ready" }, // [0, 1]
	SEPULCHRE_READY: { name: "Sepulchre Ready" }, // [0, 1]
	HOLY_SHELTRON: { name: "Holy Sheltron" }, // [0, 1]
	BLADE_OF_HONOR_READY: { name: "Blade of Honor Ready" }, // [0, 1]
	GUARDIAN: { name: "Guardian" }, // [0, 1]
	GUARDIANS_WILL: { name: "Guardian's Will" }, // [0, 1]
});

export const PLD_TRACKERS = ensureRecord<ResourceData>()({
	// 0 - no combo, 1 - riot blade ready, 2 - royal authority ready
	PLD_COMBO_TRACKER: { name: "PLD Combo Tracker" }, // [0, 2]
	// 0 - no combo, 1 - bof ready, 2 - bot ready, 3 - bov ready
	PLD_CONFITEOR_COMBO_TRACKER: { name: "PLD Confiteor Combo Tracker" }, // [0, 3]
	// 0 - no combo, 1 - prominence ready
	PLD_AOE_COMBO_TRACKER: { name: "PLD AOE Combo Tracker" }, // [0, 1]

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
