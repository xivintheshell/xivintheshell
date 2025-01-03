import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const GNB = ensureRecord<Action>()({});

export type GNBActions = typeof GNB;
export type GNBActionKey = keyof GNBActions;
