import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const COMMON = ensureRecord<Action>()({
	NEVER: {
		name: "Never",
	},
	TINCTURE: {
		name: "Tincture",
	},
	SPRINT: {
		name: "Sprint",
	},
});

export type CommonActions = typeof COMMON;
export type CommonActionKey = keyof CommonActions;
