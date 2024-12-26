import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const PLD = ensureRecord<Action>()({});

export type PLDActions = typeof PLD;
export type PLDActionKey = keyof PLDActions;
