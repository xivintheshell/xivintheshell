import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const MCH = ensureRecord<Action>()({
	HEATED_SPLIT_SHOT: { name: "Heated Split Shot" },
	HEATED_SLUG_SHOT: { name: "Heated Slug Shot" },
	HEATED_CLEAN_SHOT: { name: "Heated Clean Shot" },
	DRILL: { name: "Drill" },
	HOT_SHOT: { name: "Hot Shot" },
	AIR_ANCHOR: { name: "Air Anchor" },
	CHAIN_SAW: { name: "Chain Saw" },
	EXCAVATOR: { name: "Excavator" },
	GAUSS_ROUND: { name: "Gauss Round" },
	DOUBLE_CHECK: { name: "Double Check" },
	RICOCHET: { name: "Ricochet" },
	CHECKMATE: { name: "Checkmate" },
	BLAZING_SHOT: { name: "Blazing Shot" },
	WILDFIRE: { name: "Wildfire" },
	DETONATOR: { name: "Detonator" },
	HYPERCHARGE: { name: "Hypercharge" },
	ROOK_AUTOTURRET: { name: "Rook Autoturret" },
	ROOK_OVERDRIVE: { name: "Rook Overdrive" },
	AUTOMATON_QUEEN: { name: "Automaton Queen" },
	QUEEN_OVERDRIVE: { name: "Queen Overdrive" },
	BARREL_STABILIZER: { name: "Barrel Stabilizer" },
	REASSEMBLE: { name: "Reassemble" },
	FULL_METAL_FIELD: { name: "Full Metal Field" },

	SPREAD_SHOT: { name: "Spread Shot" },
	SCATTERGUN: { name: "Scattergun" },
	AUTO_CROSSBOW: { name: "Auto Crossbow" },
	BIOBLASTER: { name: "Bioblaster" },
	FLAMETHROWER: { name: "Flamethrower" },

	DISMANTLE: { name: "Dismantle" },
	TACTICIAN: { name: "Tactician" },

	VOLLEY_FIRE: { name: "Volley Fire" },
	ARM_PUNCH: { name: "Arm Punch" },
	ROOK_OVERLOAD: { name: "Rook Overload" },
	PILE_BUNKER: { name: "Pile Bunker" },
	CROWNED_COLLIDER: { name: "Crowned Collider" },
});

export type MCHActions = typeof MCH;
export type MCHActionKey = keyof MCHActions;
