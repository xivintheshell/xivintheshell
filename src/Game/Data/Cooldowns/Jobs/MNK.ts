import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const MNK = ensureRecord<Cooldown>()({});

export type MNKCooldowns = typeof MNK;
export type MNKCooldownKey = keyof MNKCooldowns;
