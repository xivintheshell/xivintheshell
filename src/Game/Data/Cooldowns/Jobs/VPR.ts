import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const VPR = ensureRecord<Cooldown>()({});

export type VPRCooldowns = typeof VPR;
export type VPRCooldownKey = keyof VPRCooldowns;
