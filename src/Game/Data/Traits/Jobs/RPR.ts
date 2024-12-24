import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const RPR = ensureRecord<Trait>()({
	HELLSGATE: { name: "Hellsgate", level: 74 },
	TEMPERED_SOUL: { name: "Tempered Soul", level: 78 },
	SHROUD_GAUGE: { name: "Shroud Gauge", level: 80 },
	ENHANCED_ARCANE_CREST: { name: "Enhanced Arcane Crest", level: 84 },
	MELEE_MASTERY_II_RPR: { name: "Melee Mastery II", level: 84 },
	VOID_SOUL: { name: "Void Soul", level: 86 },
	ENHANCED_ARCANE_CIRCLE: { name: "Enhanced Arcane Circle", level: 88 },
	ENHANCED_ENSHROUD: { name: "Enhanced Enshroud", level: 92 },
	MELEE_MASTERY_III_RPR: { name: "Melee Mastery III", level: 94 },
	ENHANCED_GLUTTONY: { name: "Enhanced Gluttony", level: 96 },
	ENHANCED_PLENTIFUL_HARVEST: { name: "Enhanced Plentiful Harvest", level: 100 },
});
