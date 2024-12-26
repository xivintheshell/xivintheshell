import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const WAR = ensureRecord<Action>()({
	HEAVY_SWING: { name: "Heavy Swing" },
	MAIM: { name: "Maim" },
	STORMS_PATH: { name: "Storms Path" },
	STORMS_EYE: { name: "Storms Eye" },
	FELL_CLEAVE: { name: "Fell Cleave" },
	UPHEAVAL: { name: "Upheaval" },
	ONSLAUGHT: { name: "Onslaught" },

	TOMAHAWK: { name: "Tomahawk" },

	OVERPOWER: { name: "Overpower" },
	MYTHRIL_TEMPEST: { name: "Mythril Tempest" },
	DECIMATE: { name: "Decimate" },
	OROGENY: { name: "Orogeny" },

	INNER_RELEASE: { name: "Inner Release" },
	PRIMAL_WRATH: { name: "Primal Wrath" },
	PRIMAL_REND: { name: "Primal Rend" },
	PRIMAL_RUINATION: { name: "Primal Ruination" },

	INFURIATE: { name: "Infuriate" },
	INNER_CHAOS: { name: "Inner Chaos" },
	CHAOTIC_CYCLONE: { name: "Chaotic Cyclone" },

	THRILL_OF_BATTLE: { name: "Thrill of Battle" },
	EQUILIBRIUM: { name: "Equilibrium" },
	SHAKE_IT_OFF: { name: "Shake It Off" },
	RAW_INTUITION: { name: "Raw Intuition" }, // Lv56-81
	NASCENT_FLASH: { name: "Nascent Flash" },
	BLOODWHETTING: { name: "Bloodwhetting" }, // Lv82-
	VENGEANCE: { name: "Vengeance" }, // Lv38-91
	DAMNATION: { name: "Damnation" }, // Lv92-
	HOLMGANG: { name: "Holmgang" },

	DEFIANCE: { name: "Defiance" },
	RELEASE_DEFIANCE: { name: "Release Defiance" },
});

export type WARActions = typeof WAR;
export type WARActionKey = keyof WARActions;
