import { ensureRecord } from "../../../Utilities/ensureRecord";
import { Action, Cooldown, Resource } from "../types";

export const LIMIT_BREAK_ACTIONS = ensureRecord<Action>()({
	SHIELD_WALL: { name: "Shield Wall" },
	STRONGHOLD: { name: "Stronghold" },
	LAST_BASTION: { name: "Last Bastion" },
	LAND_WAKER: { name: "Land Waker" },
	DARK_FORCE: { name: "Dark Force" },
	GUNMETAL_SOUL: { name: "Gunmetal Soul" },

	HEALING_WIND: { name: "Healing Wind" },
	BREATH_OF_THE_EARTH: { name: "Breath of the Earth" },
	PULSE_OF_LIFE: { name: "Pulse of Life" },
	ANGEL_FEATHERS: { name: "Angel Feathers" },
	ASTRAL_STASIS: { name: "Astral Stasis" },
	TECHNE_MAKRE: { name: "Techne Makre" },

	BRAVER: { name: "Braver" },
	BLADEDANCE: { name: "Bladedance" },
	FINAL_HEAVEN: { name: "Final Heaven" },
	DRAGONSONG_DIVE: { name: "Dragonsong Dive" },
	CHIMATSURI: { name: "Chimatsuri" },
	DOOM_OF_THE_LIVING: { name: "Doom of the Living" },
	THE_END: { name: "The End" },
	WORLD_SWALLOWER: { name: "World-swallower" },

	BIGSHOT: { name: "Big Shot" },
	DESPERADO: { name: "Desperado" },
	SAGITTARIUS_ARROW: { name: "Sagittarius Arrow" },
	SATELLITE_BEAM: { name: "Satellite Beam" },
	CRIMSON_LOTUS: { name: "Crimson Lotus" },

	SKYSHARD: { name: "Skyshard" },
	STARSTORM: { name: "Starstorm" },
	METEOR: { name: "Meteor" },
	TERAFLARE: { name: "Teraflare" },
	VERMILLION_SCOURGE: { name: "Vermillion Scourge" },
	CHROMATIC_FANTASY: { name: "Chromatic Fantasy" },
});

export const LIMIT_BREAK_COOLDOWNS = ensureRecord<Cooldown>()({
	cd_TANK_LB1: { name: "cd_TankLB1" },
	cd_TANK_LB2: { name: "cd_TankLB2" },
	cd_TANK_LB3: { name: "cd_TankLB3" },

	cd_HEALER_LB1: { name: "cd_HealerLB1" },
	cd_HEALER_LB2: { name: "cd_HealerLB2" },
	cd_HEALER_LB3: { name: "cd_HealerLB3" },

	cd_MELEE_LB1: { name: "cd_MeleeLB1" },
	cd_MELEE_LB2: { name: "cd_MeleeLB2" },
	cd_MELEE_LB3: { name: "cd_MeleeLB3" },

	cd_RANGED_LB1: { name: "cd_RangedLB1" },
	cd_RANGED_LB2: { name: "cd_RangedLB2" },
	cd_RANGED_LB3: { name: "cd_RangedLB3" },

	cd_CASTER_LB1: { name: "cd_CasterLB1" },
	cd_CASTER_LB2: { name: "cd_CasterLB2" },
	cd_CASTER_LB3: { name: "cd_CasterLB3" },
});

// Only Tank LBs apply a status effect
export const LIMIT_BREAK_RESOURCES = ensureRecord<Resource>()({
	// LB 1 and 2
	SHIELD_WALL: { name: "Shield Wall" },
	STRONGHOLD: { name: "Stronghold" },

	// LB 3s
	LAST_BASTION: { name: "Last Bastion" },
	LAND_WAKER: { name: "Land Waker" },
	DARK_FORCE: { name: "Dark Force" },
	GUNMETAL_SOUL: { name: "Gunmetal Soul" },
});

// Limit breaks don't have any related traits... yet.

export type LimitBreakActions = typeof LIMIT_BREAK_ACTIONS;
export type LimitBreakActionKey = keyof LimitBreakActions;

export type LimitBreakCooldowns = typeof LIMIT_BREAK_COOLDOWNS;
export type LimitBreakCooldownKey = keyof LimitBreakCooldowns;

export type LimitBreakResources = typeof LIMIT_BREAK_RESOURCES;
export type LimitBreakResourceKey = keyof LimitBreakResources;
