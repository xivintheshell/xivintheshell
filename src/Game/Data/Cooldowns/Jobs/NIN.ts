import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const NIN = ensureRecord<Cooldown>()({});

export type NINCooldowns = typeof NIN;
export type NINCooldownKey = keyof NINCooldowns;
