import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const DRG = ensureRecord<Cooldown>()({});

export type DRGCooldowns = typeof DRG;
export type DRGCooldownKey = keyof DRGCooldowns;
