import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const MNK = ensureRecord<Action>()({});

export type MNKActions = typeof MNK;
export type MNKActionKey = keyof MNKActions;
