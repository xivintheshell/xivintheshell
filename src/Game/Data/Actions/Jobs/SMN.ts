import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const SMN = ensureRecord<Action>()({});

export type SMNActions = typeof SMN;
export type SMNActionKey = keyof SMNActions;
