import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const SGE = ensureRecord<Cooldown>()({});

export type SGECooldowns = typeof SGE;
export type SGECooldownKey = keyof SGECooldowns;
