import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const SAM = ensureRecord<Cooldown>()({
	cd_YATEN: { name: "cd_Yaten" }, // [0, 10],
	cd_GYOTEN: { name: "cd_Gyoten" }, // [0, 10],
	cd_SENEI_GUREN: { name: "cd_Senei" }, // [0,60],
	cd_SHINTEN: { name: "cd_Shinten" }, // [0,1]
	cd_KYUTEN: { name: "cd_Kyuten" }, // [0,1]
	cd_MEDITATE: { name: "cd_Meditate" }, // [0, 1]
	cd_IKISHOTEN: { name: "cd_Ikishoten" }, // [0, 120]
	cd_ZANSHIN: { name: "cd_Zanshin" }, // [0, 1]
	cd_HAGAKURE: { name: "cd_Hagakure" }, // [0, 1]
	cd_SHOHA: { name: "cd_Shoha" },
	cd_MEIKYO_SHISUI: { name: "cd_MeikyoShisui" },
	cd_THIRD_EYE: { name: "cd_ThirdEye" },
	cd_THIRD_EYE_POP: { name: "cd_ThirdEyePop" }, // [0, 1,], not real
});

export type SAMCooldowns = typeof SAM;
export type SAMCooldownKey = keyof SAMCooldowns;
