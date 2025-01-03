import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const SCH = ensureRecord<Action>()({});

export type SCHActions = typeof SCH;
export type SCHActionKey = keyof SCHActions;
