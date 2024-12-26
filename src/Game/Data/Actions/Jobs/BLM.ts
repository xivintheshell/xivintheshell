import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const BLM = ensureRecord<Action>()({
	BLIZZARD: { name: "Blizzard" },
	FIRE: { name: "Fire" },
	BLIZZARD_II: { name: "Blizzard 2" },
	FIRE_II: { name: "Fire 2" },
	TRANSPOSE: { name: "Transpose" },
	THUNDER_III: { name: "Thunder 3" },
	THUNDER_IV: { name: "Thunder 4" },
	MANAWARD: { name: "Manaward" },
	MANAFONT: { name: "Manafont" },
	LEY_LINES: { name: "Ley Lines" },
	FIRE_III: { name: "Fire 3" },
	BLIZZARD_III: { name: "Blizzard 3" },
	FREEZE: { name: "Freeze" },
	FLARE: { name: "Flare" },
	BLIZZARD_IV: { name: "Blizzard 4" },
	FIRE_IV: { name: "Fire 4" },
	BETWEEN_THE_LINES: { name: "Between the Lines" },
	AETHERIAL_MANIPULATION: { name: "Aetherial Manipulation" },
	TRIPLECAST: { name: "Triplecast" },
	FOUL: { name: "Foul" },
	DESPAIR: { name: "Despair" },
	UMBRAL_SOUL: { name: "Umbral Soul" },
	XENOGLOSSY: { name: "Xenoglossy" },
	HIGH_FIRE_II: { name: "High Fire 2" },
	HIGH_BLIZZARD_II: { name: "High Blizzard 2" },
	AMPLIFIER: { name: "Amplifier" },
	PARADOX: { name: "Paradox" },
	HIGH_THUNDER: { name: "High Thunder" },
	HIGH_THUNDER_II: { name: "High Thunder 2" },
	FLARE_STAR: { name: "Flare Star" },
	RETRACE: { name: "Retrace" },
});

export type BLMActions = typeof BLM;
export type BLMActionKey = keyof BLMActions;
