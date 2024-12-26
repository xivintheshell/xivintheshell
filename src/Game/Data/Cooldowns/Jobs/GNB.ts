import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const GNB = ensureRecord<Cooldown>()({});

export type GNBCooldowns = typeof GNB;
export type GNBCooldownKey = keyof GNBCooldowns;
