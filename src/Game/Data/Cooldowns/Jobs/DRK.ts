import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const DRK = ensureRecord<Cooldown>()({});

export type DRKCooldowns = typeof DRK;
export type DRKCooldownKey = keyof DRKCooldowns;
