import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const DNC = ensureRecord<Trait>()({
	ESPRIT: { name: "Esprit", level: 76 },
	ENHANCED_EN_AVANT_II: { name: "Enhanced En Avant II", level: 78 },
	ENHANCED_TECHNICAL_FINISH: { name: "Enhanced Technical Finish", level: 82 },
	ENHANCED_ESPRIT: { name: "Enhanced Esprit", level: 84 },
	ENHANCED_FLOURISH: { name: "Enhanced Flourish", level: 86 },
	ENHANCED_SHIELD_SAMBA: { name: "Enhanced Shield Samba", level: 88 },
	ENHANCED_DEVILMENT: { name: "Enhanced Devilment", level: 90 },
	ENHANCED_STANDARD_FINISH: { name: "Enhanced Standard Finish", level: 92 },
	DYNAMIC_DANCER: { name: "Dynamic Dancer", level: 94 },
	ENHANCED_FLOURISH_II: { name: "Enhanced Flourish II", level: 96 },
	ENHANCED_TECHNICAL_FINISH_II: { name: "Enhanced Technical Finish II", level: 100 },
});
