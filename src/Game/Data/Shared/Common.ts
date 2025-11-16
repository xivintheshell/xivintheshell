import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const COMMON_ACTIONS = ensureRecord<ActionData>()({
	NEVER: {
		name: "Unknown",
		label: { zh: "未知" },
	},
	TINCTURE: {
		name: "Tincture",
		label: { zh: "爆发药", ja: "薬" },
	},
	SPRINT: {
		id: 3,
		name: "Sprint",
		label: { zh: "疾跑", ja: "スプリント" },
	},
});

export const COMMON_COOLDOWNS = ensureRecord<CooldownData>()({
	NEVER: { name: "Never" },

	cd_GCD: { name: "cd_GCD", label: { zh: "GCD" } }, // [0, Constant.gcd]

	cd_TINCTURE: { name: "cd_Tincture" }, // [0, 1x]
	cd_SPRINT: { name: "cd_Sprint" }, // [0, 1x]
});

export const COMMON_GAUGES = ensureRecord<ResourceData>()({
	// Mana's not really a gauge, but we display it alongside gauge and similar resources
	MANA: { name: "Mana", label: { zh: "MP" } },
});

export const COMMON_STATUSES = ensureRecord<ResourceData>()({
	TINCTURE: { name: "Tincture", label: { zh: "爆发药" } }, // [0, 1]
	SPRINT: { name: "Sprint", label: { zh: "疾跑" } }, // [0, 1]
});

export const COMMON_TRACKERS = ensureRecord<ResourceData>()({
	MOVEMENT: { name: "Movement" }, // [0, 1]
	NOT_ANIMATION_LOCKED: { name: "NotAnimationLocked" }, // [0, 1]
	NOT_CASTER_TAXED: { name: "NotCasterTaxed" }, // [0, 1]
	IN_COMBAT: { name: "InCombat", label: { zh: "战斗中" } }, // [0, 1], used for abilities that can only execute in combat
	AUTOS_ENGAGED: { name: "Autos Engaged" }, // [0, 1], corresponding to the right clicking on enemies, looks like: O>>>
	STORED_AUTO: { name: "Stored Auto" }, // [0, 1], 0 - default, 1 - if auto timer is paused at 0.0

	PARTY_SIZE: { name: "PartySize", label: { zh: "小队人数" } },

	NEVER: { name: "Never" },
});

export const COMMON_TRAITS = ensureRecord<TraitData>()({
	NEVER: { name: "Never", level: 1 },
});

export type CommonActions = typeof COMMON_ACTIONS;
export type CommonActionKey = keyof CommonActions;

export type CommonCooldowns = typeof COMMON_COOLDOWNS;
export type CommonCooldownKey = keyof CommonCooldowns;

export type CommonGauges = typeof COMMON_GAUGES;
export type CommonGaugeKey = keyof CommonGauges;

export type CommonStatuses = typeof COMMON_STATUSES;
export type CommonStatusKey = keyof CommonStatuses;

export type CommonTrackers = typeof COMMON_TRACKERS;
export type CommonTrackerKey = keyof CommonTrackers;

export const COMMON_RESOURCES = {
	...COMMON_GAUGES,
	...COMMON_STATUSES,
	...COMMON_TRACKERS,
};
export type CommonResources = typeof COMMON_RESOURCES;
export type CommonResourceKey = keyof CommonResources;

export type CommonTraits = typeof COMMON_TRAITS;
export type CommonTraitKey = keyof CommonTraits;
