import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const PCT = ensureRecord<Cooldown>()({
	cd_TEMPERA_COAT: { name: "cd_TemperaCoat" }, // [0, 120]
	cd_SMUDGE: { name: "cd_Smudge" }, // [0, 20]
	cd_LIVING_MUSE: { name: "cd_LivingMuse" }, // [0, 40]
	cd_PORTRAIT: { name: "cd_Portrait" }, // [0, 30]
	cd_STEEL_MUSE: { name: "cd_SteelMuse" }, // [0, 60]
	cd_SCENIC_MUSE: { name: "cd_ScenicMuse" }, // [0, 120]
	cd_SUBTRACTIVE: { name: "cd_Subtractive", label: { zh: "CD：减色混合" } }, // [0, 1], not real
	cd_GRASSA: { name: "cd_Grassa", label: { zh: "CD：油性坦培拉涂层" } }, // [0, 1], not real
	cd_TEMPERA_POP: { name: "cd_TemperaPop" }, // [0, 1], also not real
});

export type PCTCooldowns = typeof PCT;
export type PCTCooldownKey = keyof PCTCooldowns;
