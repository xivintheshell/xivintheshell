import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const SGE = ensureRecord<Action>()({});

export type SGEActions = typeof SGE;
export type SGEActionKey = keyof SGEActions;
