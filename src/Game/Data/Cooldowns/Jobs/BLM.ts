import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const BLM = ensureRecord<Cooldown>()({
	cd_TRANSPOSE: { name: "cd_Transpose" }, // [0, 1x]
	cd_LEY_LINES: { name: "cd_LeyLines" }, // [0, 1x]
	cd_MANAWARD: { name: "cd_Manaward" }, // [0, 1x]
	cd_BETWEEN_THE_LINES: { name: "cd_BetweenTheLines" }, // [0, 1x]
	cd_AETHERIAL_MANIPULATION: { name: "cd_AetherialManipulation" }, // [0, 1x]
	cd_TRIPLECAST: { name: "cd_Triplecast" }, // [0, 2x]
	cd_MANAFONT: { name: "cd_Manafont" }, // [0, 1x]
	cd_AMPLIFIER: { name: "cd_Amplifier" }, // [0, 1x]
	cd_RETRACE: { name: "cd_Retrace" }, // [0, 1x]
});

export type BLMCooldowns = typeof BLM;
export type BLMCooldownKey = keyof BLMCooldowns;
