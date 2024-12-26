import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Action } from "../type";

export const COMMON = ensureRecord<Action>()({
	NEVER: {
		name: "Never",
	},
	TINCTURE: {
		name: "Tincture",
		label: { zh: "爆发药", ja: "薬" },
	},
	SPRINT: {
		name: "Sprint",
		label: { zh: "疾跑", ja: "スプリント" },
	},
});

export type CommonActions = typeof COMMON;
export type CommonActionKey = keyof CommonActions;
