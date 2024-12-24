import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const RDM = ensureRecord<Trait>()({
	ENHANCED_DISPLACEMENT: { name: "Enhanced Displacement", level: 72 },
	RED_MAGIC_MASTERY: { name: "Red Magic Mastery", level: 74 },
	ENHANCED_MANAFICATION: { name: "Enhanced Manafication", level: 78 },
	RED_MAGIC_MASTERY_II: { name: "Red Magic Mastery II", level: 82 },
	RED_MAGIC_MASTERY_III: { name: "Red Magic Mastery III", level: 84 },
	ENHANCED_ACCELERATION: { name: "Enhanced Acceleration", level: 88 },
	ENHANCED_MANAFICATION_II: { name: "Enhanced Manafication II", level: 90 },
	ENHANCED_EMBOLDEN: { name: "Enhanced Embolden", level: 92 },
	ENCHANTED_BLADE_MASTERY: { name: "Enchanted Blade Mastery", level: 94 },
	ENHANCED_ACCELERATION_II: { name: "Enhanced Acceleration II", level: 96 },
	ENHANCED_MANAFICATION_III: { name: "Enhanced Manafication III", level: 100 },
});
