import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const COMMON = ensureRecord<Cooldown>()({
	NEVER: { name: "Never" },

	cd_GCD: { name: "cd_GCD" }, // [0, Constant.gcd]

	cd_TINCTURE: { name: "cd_Tincture" }, // [0, 1x]
	cd_SPRINT: { name: "cd_Sprint" }, // [0, 1x]
});

export type CommonCooldowns = typeof COMMON;
export type CommonCooldownKey = keyof CommonCooldowns;
