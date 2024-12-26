import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const DRG = ensureRecord<Action>()({});

export type DRGActions = typeof DRG;
export type DRGActionKey = keyof DRGActions;
