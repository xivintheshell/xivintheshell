import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const MCH = ensureRecord<Trait>()({
	CHARGED_ACTION_MASTERY: { name: "Charged Action Mastery", level: 74 },
	HOT_SHOT_MASTERY: { name: "Hot Shot Mastery", level: 76 },
	ENHANCED_WILD_FIRE: { name: "Enhanced Wildfire", level: 88 },
	PROMOTION: { name: "Promotion", level: 80 },
	SPREAD_SHOT_MASTERY: { name: "Spread Shot Mastery", level: 82 },
	ENHANCED_REASSEMBLE: { name: "Enhanced Reassemble", level: 84 },
	MARKSMANS_MASTERY: { name: "Marksman's Mastery", level: 84 },
	QUEENS_GAMBIT: { name: "Queen's Gambit", level: 86 },
	ENHANCED_TACTICIAN: { name: "Enhanced Tactician", level: 88 },
	DOUBLE_BARREL_MASTERY: { name: "Double-Barrel Mastery", level: 92 },
	ENHANCED_MULTI_WEAPON: { name: "Enhanced Multiweapon", level: 94 },
	MARKSMANS_MASTERY_II: { name: "Marksman's Mastery II", level: 94 },
	ENHANCED_MULTI_WEAPON_II: { name: "Enhanced Multiweapon II", level: 96 },
	ENHANCED_BARREL_STABILIZER: { name: "Enhanced Barrel Stabilizer", level: 100 },
});
