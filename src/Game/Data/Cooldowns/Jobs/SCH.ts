import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const SCH = ensureRecord<Cooldown>()({});

export type SCHCooldowns = typeof SCH;
export type SCHCooldownKey = keyof SCHCooldowns;
