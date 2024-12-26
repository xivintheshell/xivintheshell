import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const RPR = ensureRecord<Cooldown>()({
	cd_ARCANE_CIRCLE: { name: "cd_ArcaneCircle" },
	cd_GLUTTONY: { name: "cd_Gluttony" },
	cd_SOUL_SLICE: { name: "cd_SoulSlice" },
	cd_ENSHROUD: { name: "cd_Enshroud" },

	cd_INGRESS_EGRESS: { name: "cd_IngressEgress" },
	cd_ARCANE_CREST: { name: "cd_ArcaneCrest" },
	cd_ARCANE_CREST_POP: { name: "cd_ArcaneCrestPop" }, // Not real

	cd_BLOOD_STALK: { name: "cd_BloodStalk" },
	cd_LEMURES_SLICE: { name: "cd_LemuresSlice" },
	cd_SACRIFICIUM: { name: "cd_Sacrificium" },
});

export type RPRCooldowns = typeof RPR;
export type RPRCooldownKey = keyof RPRCooldowns;
