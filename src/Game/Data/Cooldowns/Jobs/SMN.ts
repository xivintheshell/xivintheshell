import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const SMN = ensureRecord<Cooldown>()({});

export type SMNCooldowns = typeof SMN;
export type SMNCooldownKey = keyof SMNCooldowns;
