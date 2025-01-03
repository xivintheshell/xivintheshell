import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const NIN = ensureRecord<Action>()({});

export type NINActions = typeof NIN;
export type NINActionKey = keyof NINActions;
