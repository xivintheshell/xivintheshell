import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const WHM = ensureRecord<Cooldown>()({});

export type WHMCooldowns = typeof WHM;
export type WHMCooldownKey = keyof WHMCooldowns;
