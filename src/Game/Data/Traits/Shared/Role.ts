import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const ROLE = ensureRecord<Trait>()({
	ENHANCED_SWIFTCAST: { name: "Enhanced Swiftcast", level: 94 },
	ENHANCED_ADDLE: { name: "Enhanced Addle", level: 98 },

	ENHANCED_SECOND_WIND: { name: "Enhanced Second Wind", level: 94 },
	ENHANCED_FEINT: { name: "Enhanced Feint", level: 98 },

	MELEE_MASTERY_TANK: { name: "Melee Mastery", level: 84 },
	ENHANCED_RAMPART: { name: "Enhanced Rampart", level: 94 },
	MELEE_MASTERY_II_TANK: { name: "Melee Mastery II", level: 94 },
	ENHANCED_REPRISAL: { name: "Enhanced Reprisal", level: 98 },
});
