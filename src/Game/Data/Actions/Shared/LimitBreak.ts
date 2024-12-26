import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const LIMIT_BREAK = ensureRecord<Action>()({
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

export type LimitBreakActions = typeof LIMIT_BREAK;
export type LimitBreakActionKey = keyof LimitBreakActions;
