import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const GNB_ACTIONS = ensureRecord<ActionData>()({
	LIGHTNING_SHOT: { id: 16143, name: "Lightning Shot", label: { zh: "闪雷弹" } },
	KEEN_EDGE: { id: 16137, name: "Keen Edge", label: { zh: "利刃斩" } },
	BRUTAL_SHELL: { id: 16139, name: "Brutal Shell", label: { zh: "残暴弹" } },
	SOLID_BARREL: { id: 16145, name: "Solid Barrel", label: { zh: "迅连斩" } },
	DEMON_SLICE: { id: 16141, name: "Demon Slice", label: { zh: "恶魔切" } },
	DEMON_SLAUGHTER: { id: 16149, name: "Demon Slaughter", label: { zh: "恶魔杀" } },

	BURST_STRIKE: { id: 16162, name: "Burst Strike", label: { zh: "爆发击" } },
	FATED_CIRCLE: { id: 16163, name: "Fated Circle", label: { zh: "命运之环" } },

	BLOODFEST: { id: 16164, name: "Bloodfest", label: { zh: "血壤" } },
	NO_MERCY: { id: 16138, name: "No Mercy", label: { zh: "无情" } },
	SONIC_BREAK: { id: 16153, name: "Sonic Break", label: { zh: "音速破" } },

	GNASHING_FANG: { id: 16146, name: "Gnashing Fang", label: { zh: "烈牙" } },
	SAVAGE_CLAW: { id: 16147, name: "Savage Claw", label: { zh: "猛兽爪" } },
	WICKED_TALON: { id: 16150, name: "Wicked Talon", label: { zh: "凶禽爪" } },

	DOUBLE_DOWN: { id: 25760, name: "Double Down", label: { zh: "倍攻" } },

	REIGN_OF_BEASTS: { id: 36937, name: "Reign of Beasts", label: { zh: "崛起之心" } },
	NOBLE_BLOOD: { id: 36938, name: "Noble Blood", label: { zh: "支配之心" } },
	LION_HEART: { id: 36939, name: "Lion Heart", label: { zh: "终结之心" } },

	CONTINUATION: { id: 16155, name: "Continuation", label: { zh: "续剑" } },
	HYPERVELOCITY: { id: 25759, name: "Hypervelocity", label: { zh: "超高速" } },
	FATED_BRAND: { id: 36936, name: "Fated Brand", label: { zh: "命运之印" } },
	JUGULAR_RIP: { id: 16156, name: "Jugular Rip", label: { zh: "撕喉" } },
	ABDOMEN_TEAR: { id: 16157, name: "Abdomen Tear", label: { zh: "裂膛" } },
	EYE_GOUGE: { id: 16158, name: "Eye Gouge", label: { zh: "穿目" } },

	DANGER_ZONE: { id: 16144, name: "Danger Zone", label: { zh: "危险领域" } },
	BLASTING_ZONE: { id: 16165, name: "Blasting Zone", label: { zh: "爆破领域" } },
	BOW_SHOCK: { id: 16159, name: "Bow Shock", label: { zh: "弓形冲波" } },
	TRAJECTORY: { id: 36934, name: "Trajectory", label: { zh: "弹道" } },

	HEART_OF_STONE: { id: 16161, name: "Heart of Stone", label: { zh: "石之心" } },
	HEART_OF_CORUNDUM: { id: 25758, name: "Heart of Corundum", label: { zh: "刚玉之心" } },
	SUPERBOLIDE: { id: 16152, name: "Superbolide", label: { zh: "超火流星" } },
	CAMOUFLAGE: { id: 16140, name: "Camouflage", label: { zh: "伪装" } },
	NEBULA: { id: 16148, name: "Nebula", label: { zh: "星云" } },
	GREAT_NEBULA: { id: 36935, name: "Great Nebula", label: { zh: "大星云" } },
	HEART_OF_LIGHT: { id: 16160, name: "Heart of Light", label: { zh: "光之心" } },
	AURORA: { id: 16151, name: "Aurora", label: { zh: "极光" } },
	ROYAL_GUARD: { id: 16142, name: "Royal Guard", label: { zh: "王室亲卫" } },
	RELEASE_ROYAL_GUARD: { id: 32068, name: "Release Royal Guard", label: { zh: "解除王室亲卫" } },
});

export const GNB_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_NO_MERCY: { name: "cd_NoMercy" }, // 60 sec
	cd_BLOODFEST: { name: "cd_Bloodfest" }, // 60 sec
	cd_CAMOUFLAGE: { name: "cd_Camouflage" }, // 90 sec
	cd_ROYAL_GUARD: { name: "cd_RoyalGuard" }, // 2 sec
	cd_RELEASE_ROYAL_GUARD: { name: "cd_ReleaseRoyalGuard" }, // 1 sec
	cd_DANGER_ZONE: { name: "cd_DangerZone" }, // 30 sec
	cd_BLASTING_ZONE: { name: "cd_BlastingZone" }, // 30 sec
	cd_NEBULA: { name: "cd_Nebula" }, // 120 sec
	cd_GREAT_NEBULA: { name: "cd_GreatNebula" }, // 120 sec
	cd_AURORA: { name: "cd_Aurora" }, // 60 sec
	cd_SUPERBOLIDE: { name: "cd_Superbolide" }, // 360 sec
	cd_TRAJECTORY: { name: "cd_Trajectory" }, // 30 sec
	cd_GNASHING_FANG: { name: "cd_GnashingFang" }, // 30 sec
	cd_BOW_SHOCK: { name: "cd_BowShock" }, // 60 sec
	cd_HEART_OF_LIGHT: { name: "cd_HeartOfLight" }, // 90 sec
	cd_HEART_OF_STONE: { name: "cd_HeartOfStone" }, // 25 sec
	cd_HEART_OF_CORUNDUM: { name: "cd_HeartOfCorundum" }, // 25 sec
	cd_DOUBLE_DOWN: { name: "cd_DoubleDown" }, // 60 sec
	cd_CONTINUATION: { name: "cd_Continuation" }, // 1 sec
	cd_HYPERVELOCITY: { name: "cd_Hypervelocity" },
	cd_FATED_BRAND: { name: "cd_FatedBrand" },
	cd_JUGULAR_RIP: { name: "cd_JugularRip" },
	cd_ABDOMEN_TEAR: { name: "cd_AbdomenTear" },
	cd_EYE_GOUGE: { name: "cd_EyeGouge" },
});

export const GNB_GAUGES = ensureRecord<ResourceData>()({
	POWDER_GAUGE: { name: "Powder Gauge", label: { zh: "晶壤" } }, // [0, 3]
});

export const GNB_STATUSES = ensureRecord<ResourceData>()({
	NO_MERCY: { name: "No Mercy", label: { zh: "无情" } }, // [0, 1]
	AURORA: { name: "Aurora", label: { zh: "极光" } }, // [0, 1]
	BOW_SHOCK_DOT: { name: "Bow Shock DoT", label: { zh: "弓形冲波" } }, // [0, 1]
	CAMOUFLAGE: { name: "Camouflage", label: { zh: "伪装" } }, // [0, 1]
	HEART_OF_CORUNDUM: { name: "Heart of Corundum", label: { zh: "刚玉之心" } }, // [0, 1]
	CLARITY_OF_CORUNDUM: { name: "Clarity of Corundum", label: { zh: "刚玉之清" } }, // [0, 1]
	CATHARSIS_OF_CORUNDUM: { name: "Catharsis of Corundum", label: { zh: "刚玉之净" } }, // [0, 1]
	NEBULA: { name: "Nebula", label: { zh: "星云" } }, // [0, 1]
	GREAT_NEBULA: { name: "Great Nebula", label: { zh: "大星云" } }, // [0, 1]
	HEART_OF_LIGHT: { name: "Heart of Light", label: { zh: "光之心" } }, // [0, 1]
	HEART_OF_STONE: { name: "Heart of Stone", label: { zh: "石之心" } }, // [0, 1]

	READY_TO_BLAST: { name: "Ready to Blast", label: { zh: "超高速预备" } }, // [0, 1]
	READY_TO_BREAK: { name: "Ready to Break", label: { zh: "音速破预备" } }, // [0, 1]
	READY_TO_GOUGE: { name: "Ready to Gouge", label: { zh: "穿目预备" } }, // [0, 1]
	READY_TO_RAZE: { name: "Ready to Raze", label: { zh: "命运之印预备" } }, // [0, 1]
	READY_TO_REIGN: { name: "Ready to Reign", label: { zh: "心有灵狮" } }, // [0, 1]
	READY_TO_RIP: { name: "Ready to Rip", label: { zh: "撕喉预备" } }, // [0, 1]
	READY_TO_TEAR: { name: "Ready to Tear", label: { zh: "裂膛预备" } }, // [0, 1]

	ROYAL_GUARD: { name: "Royal Guard", label: { zh: "王室亲卫" } }, // [0, 1]
	SONIC_BREAK_DOT: { name: "Sonic Break DoT", label: { zh: "音速破" } }, // [0, 1]
	SUPERBOLIDE: { name: "Superbolide", label: { zh: "超火流星" } }, // [0, 1]
	BRUTAL_SHELL: { name: "Brutal Shell", label: { zh: "残暴弹" } }, // [0, 1]

	BLOODFEST: { name: "Bloodfest", label: { zh: "血壤" } },
});

export const GNB_TRACKERS = ensureRecord<ResourceData>()({
	// 0 - combo neutral, 1 - brutal shell ready, 2 - solid barrel ready
	GNB_COMBO_TRACKER: { name: "GNB Combo", label: { zh: "常规连" } }, // [0, 2]
	// 0 - combo neutral, 1 - demon slaughter ready
	GNB_AOE_COMBO_TRACKER: { name: "GNB AOE Combo", label: { zh: "AOE连" } }, // [0, 1]
	// 0 - combo neutral, 1 - savage claw ready, 2 - wicked talon ready
	GNB_GNASHING_COMBO_TRACKER: { name: "GNB Gnashing Combo", label: { zh: "续剑连" } }, // [0, 2]
	// 0 - combo neutral, 1 - noble blood ready, 3 - lionheart ready
	GNB_REIGN_COMBO_TRACKER: { name: "GNB Reign Combo", label: { zh: "狮心连" } }, // [0, 2]
});

export const GNB_TRAITS = ensureRecord<TraitData>()({
	DANGER_ZONE_MASTERY: { name: "Danger Zone Mastery", level: 80 },
	HEART_OF_STONE_MASTERY: { name: "Heart Of Stone Mastery", level: 82 },
	ENHANCED_AURORA: { name: "Enhanced Aurora", level: 84 },
	ENHANCED_CONTINUATION: { name: "Enhanced Continuation", level: 86 },
	CARTRIDGE_CHARGE_II: { name: "Cartridge Charge II", level: 88 },
	NEBULA_MASTERY: { name: "Nebula Mastery", level: 92 },
	ENHANCED_CONTINUATION_II: { name: "Enhanced Continuation II", level: 96 },
	ENHANCED_BLOODFEST: { name: "Enhanced Bloodfest", level: 100 },
});

export type GNBActions = typeof GNB_ACTIONS;
export type GNBActionKey = keyof GNBActions;

export type GNBCooldowns = typeof GNB_COOLDOWNS;
export type GNBCooldownKey = keyof GNBCooldowns;

export type GNBGauges = typeof GNB_GAUGES;
export type GNBGaugeKey = keyof GNBGauges;

export type GNBStatuses = typeof GNB_STATUSES;
export type GNBStatusKey = keyof GNBStatuses;

export type GNBTrackers = typeof GNB_TRACKERS;
export type GNBTrackerKey = keyof GNBTrackers;

export const GNB_RESOURCES = {
	...GNB_GAUGES,
	...GNB_STATUSES,
	...GNB_TRACKERS,
};
export type GNBResources = typeof GNB_RESOURCES;
export type GNBResourceKey = keyof GNBResources;

export type GNBTraits = typeof GNB_TRAITS;
export type GNBTraitKey = keyof GNBTraits;
