import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const DRK = ensureRecord<Action>()({});

export type DRKActions = typeof DRK;
export type DRKActionKey = keyof DRKActions;
