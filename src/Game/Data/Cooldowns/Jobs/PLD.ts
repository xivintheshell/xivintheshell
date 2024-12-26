import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const PLD = ensureRecord<Cooldown>()({});

export type PLDCooldowns = typeof PLD;
export type PLDCooldownKey = keyof PLDCooldowns;
