import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Resource } from "../type";

export const LIMIT_BREAK = ensureRecord<Resource>()({
	SHIELD_WALL: { name: "Shield Wall" },
	STRONGHOLD: { name: "Stronghold" },
	LAST_BASTION: { name: "Last Bastion" },
	LAND_WAKER: { name: "Land Waker" },
	DARK_FORCE: { name: "Dark Force" },
	GUNMETAL_SOUL: { name: "Gunmetal Soul" },
});

export type LimitBreakResources = typeof LIMIT_BREAK;
export type LimitBreakResourceKey = keyof LimitBreakResources;
