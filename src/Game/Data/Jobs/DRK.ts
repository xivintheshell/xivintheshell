import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const DRK_ACTIONS = ensureRecord<ActionData>()({
	HARD_SLASH: { id: 3617, name: "Hard Slash", label: { zh: "重斩" } },
	SYPHON_STRIKE: { id: 3623, name: "Syphon Strike", label: { zh: "吸收斩" } },
	UNLEASH: { id: 3621, name: "Unleash", label: { zh: "释放" } },
	GRIT: { id: 3629, name: "Grit", label: { zh: "深恶痛绝" } },
	RELEASE_GRIT: { id: 32067, name: "Release Grit", label: { zh: "解除深恶痛绝" } },
	UNMEND: { id: 3624, name: "Unmend", label: { zh: "伤残" } },
	SOULEATER: { id: 3632, name: "Souleater", label: { zh: "噬魂斩" } },
	FLOOD_OF_DARKNESS: { name: "Flood of Darkness", label: { zh: "暗黑波动" } },
	BLOOD_WEAPON: { id: 3625, name: "Blood Weapon", label: { zh: "嗜血" } },
	SHADOW_WALL: { id: 3636, name: "Shadow Wall", label: { zh: "暗影墙" } },
	STALWART_SOUL: { id: 16468, name: "Stalwart Soul", label: { zh: "刚魂" } },
	EDGE_OF_DARKNESS: { name: "Edge of Darkness", label: { zh: "暗黑锋" } },
	DARK_MIND: { id: 3634, name: "Dark Mind", label: { zh: "弃明投暗" } },
	LIVING_DEAD: { id: 3638, name: "Living Dead", label: { zh: "行尸走肉" } },
	SALTED_EARTH: { id: 3639, name: "Salted Earth", label: { zh: "腐秽大地" } },
	SHADOWSTRIDE: { id: 36926, name: "Shadowstride", label: { zh: "暗影步" } },
	ABYSSAL_DRAIN: { id: 3641, name: "Abyssal Drain", label: { zh: "吸血深渊" } },
	CARVE_AND_SPIT: { id: 3643, name: "Carve and Spit", label: { zh: "精雕怒斩" } },
	BLOODSPILLER: { id: 7392, name: "Bloodspiller", label: { zh: "血溅" } },
	QUIETUS: { id: 7391, name: "Quietus", label: { zh: "寂灭" } },
	DARK_MISSIONARY: { id: 16471, name: "Dark Missionary", label: { zh: "暗黑布道" } },
	DELIRIUM: { id: 7390, name: "Delirium", label: { zh: "血乱" } },
	THE_BLACKEST_NIGHT: { id: 7393, name: "The Blackest Night", label: { zh: "至黑之夜" } },
	THE_BLACKEST_NIGHT_POP: { name: "Pop The Blackest Night", label: { zh: "至黑之夜破盾" } },
	FLOOD_OF_SHADOW: { id: 16469, name: "Flood of Shadow", label: { zh: "暗影波动" } },
	EDGE_OF_SHADOW: { id: 16470, name: "Edge of Shadow", label: { zh: "暗影锋" } },
	LIVING_SHADOW: { id: 16472, name: "Living Shadow", label: { zh: "掠影示现" } },
	OBLATION: { id: 25754, name: "Oblation", label: { zh: "献奉" } },
	SALT_AND_DARKNESS: { id: 25755, name: "Salt and Darkness", label: { zh: "腐秽黑暗" } },
	SHADOWBRINGER: { id: 25757, name: "Shadowbringer", label: { zh: "暗影使者" } },
	SHADOWED_VIGIL: { id: 36927, name: "Shadowed Vigil", label: { zh: "暗影卫" } },
	SCARLET_DELIRIUM: { id: 36928, name: "Scarlet Delirium", label: { zh: "血红乱" } },
	COMEUPPANCE: { id: 36929, name: "Comeuppance", label: { zh: "报应" } },
	TORCLEAVER: { id: 36930, name: "Torcleaver", label: { zh: "戮山" } },
	IMPALEMENT: { id: 36931, name: "Impalement", label: { zh: "刺穿" } },
	DISESTEEM: { id: 36932, name: "Disesteem", label: { zh: "掠影的蔑视" } },
	// Pet actions
	ABYSSAL_DRAIN_PET: {
		id: 17904,
		name: "Abyssal Drain (Esteem)",
		label: { zh: "吸血深渊（掠影）" },
	},
	SHADOWSTRIDE_PET: { id: 38512, name: "Shadowstride (Esteem)", label: { zh: "暗影步（掠影）" } },
	SHADOWBRINGER_PET: {
		id: 25881,
		name: "Shadowbringer (Esteem)",
		label: { zh: "暗影使者（掠影）" },
	},
	EDGE_OF_SHADOW_PET: {
		id: 17908,
		name: "Edge of Shadow (Esteem)",
		label: { zh: "暗影锋（掠影）" },
	},
	FLOOD_OF_SHADOW_PET: { name: "Flood of Shadow (Esteem)", label: { zh: "暗影波动（掠影）" } },
	BLOODSPILLER_PET: { id: 17909, name: "Bloodspiller (Esteem)", label: { zh: "血溅（掠影）" } },
	CARVE_AND_SPIT_PET: { name: "Carve and Spit (Esteem)", label: { zh: "精雕怒斩（掠影）" } },
	DISESTEEM_PET: { id: 36933, name: "Disesteem (Esteem)", label: { zh: "掠影的蔑视（掠影）" } },
});

export const DRK_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_GRIT: { name: "cd_Grit" },
	cd_RELEASE_GRIT: { name: "cd_ReleaseGrit" },
	// shared with edge of darkness + upgrades
	cd_FLOOD_OF_DARKNESS: { name: "cd_FloodOfDarkness" },
	// shared with shadowed vigil upgrade
	cd_SHADOW_WALL: { name: "cd_ShadowWall" },
	cd_DARK_MIND: { name: "cd_DarkMind" },
	cd_LIVING_DEAD: { name: "cd_LivingDead" },
	cd_SALTED_EARTH: { name: "cd_SaltedEarth" },
	cd_SHADOWSTRIDE: { name: "cd_Shadowstride" },
	// shard with carve and spit
	cd_ABYSSAL_DRAIN: { name: "cd_AbyssalDrain" },
	cd_DARK_MISSIONARY: { name: "cd_DarkMissionary" },
	cd_DELIRIUM: { name: "cd_Delirium" },
	cd_THE_BLACKEST_NIGHT: { name: "cd_TheBlackestNight" },
	cd_THE_BLACKEST_NIGHT_POP: { name: "cd_TheBlackestNightPop" },
	cd_LIVING_SHADOW: { name: "cd_LivingShadow" },
	cd_OBLATION: { name: "cd_Oblation" },
	cd_SALT_AND_DARKNESS: { name: "cd_SaltAndDarkness" },
	cd_SHADOWBRINGER: { name: "cd_Shadowbringer" },
	// fake
	cd_POP_TBN: { name: "cd_PopTBN" },
});

export const DRK_GAUGES = ensureRecord<ResourceData>()({
	DARKSIDE: { name: "Darkside", label: { zh: "暗黑" } },
	BLOOD_GAUGE: { name: "Blood Gauge", label: { zh: "暗血" } },
});

export const DRK_STATUSES = ensureRecord<ResourceData>()({
	SALTED_EARTH: { name: "Salted Earth", mayBeToggled: true, label: { zh: "腐秽大地" } },
	GRIT: { name: "Grit", label: { zh: "深恶痛绝" } },
	SHADOW_WALL: { name: "Shadow Wall", label: { zh: "暗影墙" } },
	DARK_MIND: { name: "Dark Mind", label: { zh: "弃明投暗" } },
	LIVING_DEAD: { name: "Living Dead", label: { zh: "行尸走肉" } },
	WALKING_DEAD: { name: "Walking Dead", label: { zh: "死而不僵" } },
	UNDEAD_REBIRTH: { name: "Undead Rebirth", label: { zh: "出死入生" } },
	DARK_MISSIONARY: { name: "Dark Missionary", label: { zh: "暗黑布道" } },
	DELIRIUM: { name: "Delirium", maximumStacks: 3, label: { zh: "血乱" } },
	BLOOD_WEAPON: { name: "Blood Weapon", maximumStacks: 3, label: { zh: "嗜血" } },
	BLACKEST_NIGHT: { name: "Blackest Night", label: { zh: "至黑之夜" } },
	SCORN: { name: "Scorn", label: { zh: "掠影的蔑视预备" } },
	OBLATION: { name: "Oblation", label: { zh: "献奉" } },
	SHADOWED_VIGIL: { name: "Shadowed Vigil", label: { zh: "暗影卫" } },
	VIGILANT: { name: "Vigilant", label: { zh: "影卫" } },
});

export const DRK_TRACKERS = ensureRecord<ResourceData>()({
	DRK_COMBO_TRACKER: { name: "DRK Combo", label: { zh: "重斩连连击状态" } }, // [0, 2]
	DRK_AOE_COMBO_TRACKER: { name: "DRK AOE Combo", label: { zh: "AOE连连击状态" } }, // [0, 1]
	DRK_DELIRIUM_COMBO_TRACKER: { name: "DRK Delirium Combo", label: { zh: "血红乱连连击状态" } }, // [0, 2]
	DARK_ARTS: { name: "Dark Arts", label: { zh: "暗技" } }, // [0, 1]
	ESTEEM_TRACKER: { name: "Esteem Attacks", label: { zh: "掠影攻击" }, isPetTracker: true }, // [0, 5]
});

export const DRK_TRAITS = ensureRecord<TraitData>()({
	DAKRSIDE_MASTERY: { name: "Darkside Mastery", level: 74 },
	ENHANCED_UNMEND: { name: "Enhanced Unmend", level: 84 },
	ENHANCED_LIVING_SHADOW: { name: "Enhanced Living Shadow", level: 88 },
	ENHANCED_LIVING_SHADOW_II: { name: "Enhanced Living Shadow II", level: 90 },
	SHADOW_WALL_MASTERY: { name: "Shadow Wall Mastery", level: 92 },
	ENHANCED_DELIRIUM: { name: "Enhanced Delirium", level: 96 },
	ENHANCED_LIVING_SHADOW_III: { name: "Enhanced Living Shadow III", level: 100 },
});

export type DRKActions = typeof DRK_ACTIONS;
export type DRKActionKey = keyof DRKActions;

export type DRKCooldowns = typeof DRK_COOLDOWNS;
export type DRKCooldownKey = keyof DRKCooldowns;

export type DRKGauges = typeof DRK_GAUGES;
export type DRKGaugeKey = keyof DRKGauges;

export type DRKStatuses = typeof DRK_STATUSES;
export type DRKStatusKey = keyof DRKStatuses;

export type DRKTrackers = typeof DRK_TRACKERS;
export type DRKTrackerKey = keyof DRKTrackers;

export const DRK_RESOURCES = {
	...DRK_GAUGES,
	...DRK_STATUSES,
	...DRK_TRACKERS,
};
export type DRKResources = typeof DRK_RESOURCES;
export type DRKResourceKey = keyof DRKResources;

export type DRKTraits = typeof DRK_TRAITS;
export type DRKTraitKey = keyof DRKTraits;
