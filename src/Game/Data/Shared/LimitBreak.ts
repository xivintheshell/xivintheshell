import { ensureRecord } from "../../../utilities";
import { Action, Cooldown, Resource } from "../types";

export const TANK_LB3_ACTIONS = ensureRecord<Action>()({
	LAST_BASTION: { name: "Last Bastion" },
	LAND_WAKER: { name: "Land Waker" },
	DARK_FORCE: { name: "Dark Force" },
	GUNMETAL_SOUL: { name: "Gunmetal Soul" },
});

export const HEALER_LB3_ACTIONS = ensureRecord<Action>()({
	PULSE_OF_LIFE: { name: "Pulse of Life" },
	ANGEL_FEATHERS: { name: "Angel Feathers" },
	ASTRAL_STASIS: { name: "Astral Stasis" },
	TECHNE_MAKRE: { name: "Techne Makre" },
});

export const MELEE_LB3_ACTIONS = ensureRecord<Action>()({
	FINAL_HEAVEN: { name: "Final Heaven" },
	DRAGONSONG_DIVE: { name: "Dragonsong Dive" },
	CHIMATSURI: { name: "Chimatsuri" },
	DOOM_OF_THE_LIVING: { name: "Doom of the Living" },
	THE_END: { name: "The End" },
	WORLD_SWALLOWER: { name: "World-swallower" },
});

export const RANGED_LB3_ACTIONS = ensureRecord<Action>()({
	SAGITTARIUS_ARROW: { name: "Sagittarius Arrow" },
	SATELLITE_BEAM: { name: "Satellite Beam" },
	CRIMSON_LOTUS: { name: "Crimson Lotus" },
});

export const CASTER_LB3_ACTIONS = ensureRecord<Action>()({
	METEOR: { name: "Meteor" },
	TERAFLARE: { name: "Teraflare" },
	VERMILLION_SCOURGE: { name: "Vermillion Scourge" },
	CHROMATIC_FANTASY: { name: "Chromatic Fantasy" },
});

// Tank LB3 Status effects
export const TANK_LB3_RESOURCES = ensureRecord<Resource>()({
	LAST_BASTION: { name: "Last Bastion" },
	LAND_WAKER: { name: "Land Waker" },
	DARK_FORCE: { name: "Dark Force" },
	GUNMETAL_SOUL: { name: "Gunmetal Soul" },
});

// ========================================
// Common data and typing boilerplate below
// ========================================

export const LIMIT_BREAK_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_LIMIT_BREAK_1: { name: "cd_LIMIT_BREAK_1" },
	cd_LIMIT_BREAK_2: { name: "cd_LIMIT_BREAK_2" },
	cd_LIMIT_BREAK_3: { name: "cd_LIMIT_BREAK_3" },
});

export const SHARED_LIMIT_BREAK_ACTIONS = ensureRecord<Action>()({
	UNKNOWN: { name: "Unknown" },

	SHIELD_WALL: { name: "Shield Wall" },
	STRONGHOLD: { name: "Stronghold" },

	HEALING_WIND: { name: "Healing Wind" },
	BREATH_OF_THE_EARTH: { name: "Breath of the Earth" },

	BRAVER: { name: "Braver" },
	BLADEDANCE: { name: "Bladedance" },

	BIGSHOT: { name: "Big Shot" },
	DESPERADO: { name: "Desperado" },

	SKYSHARD: { name: "Skyshard" },
	STARSTORM: { name: "Starstorm" },
});

export const SHARED_LIMIT_BREAK_RESOURCES = ensureRecord<Resource>()({
	UNKNOWN: { name: "Unknown" },

	// LB 1 and 2
	SHIELD_WALL: { name: "Shield Wall" },
	STRONGHOLD: { name: "Stronghold" },
});

// Limit breaks don't have any related traits... yet.

export type TankLimitBreak3Actions = typeof TANK_LB3_ACTIONS;
export type TankLimitBreak3ActionKey = keyof TankLimitBreak3Actions;

export type HealerLimitBreak3Actions = typeof HEALER_LB3_ACTIONS;
export type HealerLimitBreak3ActionKey = keyof HealerLimitBreak3Actions;

export type MeleeLimitBreak3Actions = typeof MELEE_LB3_ACTIONS;
export type MeleeLimitBreak3ActionKey = keyof MeleeLimitBreak3Actions;

export type RangedLimitBreak3Actions = typeof RANGED_LB3_ACTIONS;
export type RangedLimitBreak3ActionKey = keyof RangedLimitBreak3Actions;

export type CasterLimitBreak3Actions = typeof CASTER_LB3_ACTIONS;
export type CasterLimitBreak3ActionKey = keyof CasterLimitBreak3Actions;

export const LIMIT_BREAK_3_ACTIONS = {
	...TANK_LB3_ACTIONS,
	...HEALER_LB3_ACTIONS,
	...MELEE_LB3_ACTIONS,
	...RANGED_LB3_ACTIONS,
	...CASTER_LB3_ACTIONS,
};

export type LimitBreak3Actions = typeof LIMIT_BREAK_3_ACTIONS;
export type LimitBreak3ActionKey = keyof LimitBreak3Actions;

export const LIMIT_BREAK_ACTIONS = {
	...SHARED_LIMIT_BREAK_ACTIONS,
	...LIMIT_BREAK_3_ACTIONS,
};

export type LimitBreakActions = typeof LIMIT_BREAK_ACTIONS;
export type LimitBreakActionKey = keyof LimitBreakActions;

export type LimitBreakCooldowns = typeof LIMIT_BREAK_COOLDOWNS;
export type LimitBreakCooldownKey = keyof LimitBreakCooldowns;

export type SharedLimitBreakResources = typeof SHARED_LIMIT_BREAK_RESOURCES;
export type SharedLimitBreakResourceKey = keyof SharedLimitBreakResources;

export type TankLimitBreak3Resources = typeof TANK_LB3_RESOURCES;
export type TankLimitBreak3ResourceKey = keyof TankLimitBreak3Resources;

export const LIMIT_BREAK_RESOURCES = {
	...SHARED_LIMIT_BREAK_RESOURCES,
	...TANK_LB3_RESOURCES,
};

export type LimitBreakResources = typeof LIMIT_BREAK_RESOURCES;
export type LimitBreakResourceKey = keyof LimitBreakResources;
