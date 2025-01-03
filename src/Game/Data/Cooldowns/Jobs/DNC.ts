import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const DNC = ensureRecord<Cooldown>()({
	cd_STANDARD_STEP: { name: "cd_StandardStep" },
	cd_TECHNICAL_STEP: { name: "cd_TechnicalStep" },
	cd_CLOSED_POSITION: { name: "cd_ClosedPosition" },
	cd_FAN_DANCE: { name: "cd_FanDance" },
	cd_FAN_DANCE_II: { name: "cd_FanDanceII", label: { zh: "CD：扇舞·破" } },
	cd_FAN_DANCE_III: { name: "cd_FanDanceIII", label: { zh: "CD：扇舞·急" } },
	cd_FAN_DANCE_IV: { name: "cd_FanDanceIV", label: { zh: "CD：扇舞·终" } },
	cd_EN_AVANT: { name: "cd_EnAvant" },
	cd_DEVILMENT: { name: "cd_Devilment" },
	cd_SHIELD_SAMBA: { name: "cd_ShieldSamba" },
	cd_FLOURISH: { name: "cd_Flourish" },
	cd_IMPROVISATION: { name: "cd_Improvisation" },
	cd_IMPROVISED_FINISH: { name: "cd_ImprovisedFinish" },
	cd_CURING_WALTZ: { name: "cd_CuringWaltz" },
	cd_ENDING: { name: "cd_Ending" },
});

export type DNCCooldowns = typeof DNC;
export type DNCCooldownKey = keyof DNCCooldowns;
