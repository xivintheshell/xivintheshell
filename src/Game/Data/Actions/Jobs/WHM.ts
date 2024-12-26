import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const WHM = ensureRecord<Action>()({});

export type WHMActions = typeof WHM;
export type WHMActionKey = keyof WHMActions;
