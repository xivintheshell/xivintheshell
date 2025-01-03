import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const VPR = ensureRecord<Action>()({});

export type VPRActions = typeof VPR;
export type VPRActionKey = keyof VPRActions;
