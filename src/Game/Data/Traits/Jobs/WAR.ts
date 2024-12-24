import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Trait } from "../type";

export const WAR = ensureRecord<Trait>()({
	NASCENT_CHAOS: { name: "Nascent Chaos", level: 72 },
	MASTERING_THE_BEAST: { name: "Mastering the Beast", level: 74 },
	ENHANCED_SHAKE_IT_OFF: { name: "Enhanced Shake It Off", level: 76 },
	ENHANCED_THRILL_OF_BATTLE: { name: "Enhanced Thrill of Battle", level: 78 },
	RAW_INTUITION_MASTERY: { name: "Raw Intuition Mastery", level: 82 },
	ENHANCED_NASCENT_FLASH: { name: "Enhanced Nascent Flash", level: 82 },
	ENHANCED_EQUILIBRIUM: { name: "Enhanced Equilibrium", level: 84 },
	ENHANCED_ONSLAUGHT: { name: "Enhanced Onslaught", level: 88 },
	VENGEANCE_MASTERY: { name: "Vengeance Mastery", level: 92 },
	ENHANCED_INNER_RELEASE: { name: "Enhanced Inner Release", level: 96 },
	ENHANCED_PRIMAL_REND: { name: "Enhanced Primal Rend", level: 100 },
});
