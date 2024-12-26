import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const RPR = ensureRecord<Action>()({
	/** Single-target GCD */
	SLICE: { name: "Slice" },
	WAXING_SLICE: { name: "Waxing Slice" },
	INFERNAL_SLICE: { name: "Infernal Slice" },
	SHADOW_OF_DEATH: { name: "Shadow of Death" },
	SOUL_SLICE: { name: "Soul Slice" },
	GIBBET: { name: "Gibbet" },
	GALLOWS: { name: "Gallows" },
	EXECUTIONERS_GIBBET: { name: "Executioner's Gibbet" },
	EXECUTIONERS_GALLOWS: { name: "Executioner's Gallows" },
	VOID_REAPING: { name: "Void Reaping" },
	CROSS_REAPING: { name: "Cross Reaping" },
	PLENTIFUL_HARVEST: { name: "Plentiful Harvest" },
	HARVEST_MOON: { name: "Harvest Moon" },
	COMMUNIO: { name: "Communio" },
	PERFECTIO: { name: "Perfectio" },
	SOULSOW: { name: "Soulsow" },
	HARPE: { name: "Harpe" },

	/* Single-target oGCD */
	BLOOD_STALK: { name: "Blood Stalk" },
	UNVEILED_GIBBET: { name: "Unveiled Gibbet" },
	UNVEILED_GALLOWS: { name: "Unveiled Gallows" },
	LEMURES_SLICE: { name: "Lemure's Slice" },
	SACRIFICIUM: { name: "Sacrificium" },
	ARCANE_CIRCLE: { name: "Arcane Circle" },
	GLUTTONY: { name: "Gluttony" },
	ENSHROUD: { name: "Enshroud" },

	/* Multi-target GCD*/
	SPINNING_SCYTHE: { name: "Spinning Scythe" },
	NIGHTMARE_SCYTHE: { name: "Nightmare Scythe" },
	WHORL_OF_DEATH: { name: "Whorl of Death" },
	SOUL_SCYTHE: { name: "Soul Scythe" },
	GUILLOTINE: { name: "Guillotine" },
	EXECUTIONERS_GUILLOTINE: { name: "Executioner's Guillotine" },
	GRIM_REAPING: { name: "Grim Reaping" },

	/* Multi-target oGCD */
	GRIM_SWATHE: { name: "Grim Swathe" },
	LEMURES_SCYTHE: { name: "Lemure's Scythe" },

	// Utility
	ARCANE_CREST: { name: "Arcane Crest" },
	ARCANE_CREST_POP: { name: "Pop Arcane Crest" },
	HELLS_INGRESS: { name: "Hell's Ingress" },
	HELLS_EGRESS: { name: "Hell's Egress" },
	REGRESS: { name: "Regress" },
});

export type RPRActions = typeof RPR;
export type RPRActionKey = keyof RPRActions;
