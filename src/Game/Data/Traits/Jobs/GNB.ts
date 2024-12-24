import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const GNB = ensureRecord<Trait>()({
	DANGER_ZONE_MASTERY: { name: "Danger Zone Mastery", level: 80 },
	HEART_OF_STONE_MASTERY: { name: "Heart Of Stone Mastery", level: 82 },
	ENHANCED_AURORA: { name: "Enhanced Aurora", level: 84 },
	ENHANCED_CONTINUATION: { name: "Enhanced Continuation", level: 86 },
	CARTRIDGE_CHARGE_II: { name: "Cartridge Charge II", level: 88 },
	NEBULA_MASTERY: { name: "Nebula Mastery", level: 92 },
	ENHANCED_CONTINUATION_II: { name: "Enhanced Continuation II", level: 96 },
	ENHANCED_BLOODFEST: { name: "Enhanced Bloodfest", level: 100 },
});
