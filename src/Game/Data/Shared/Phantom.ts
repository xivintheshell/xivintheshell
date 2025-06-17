// Actions for Phantom Jobs.
import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const PHANTOM_ACTIONS = ensureRecord<ActionData>()({
	// Phantom Monk
	PHANTOM_KICK: {
		name: "Phantom Kick",
	},
	OCCULT_COUNTER: {
		name: "Occult Counter",
	},
	COUNTERSTANCE: {
		name: "Counterstance",
	},
	OCCULT_CHAKRA: {
		name: "Occult Chakra",
	},

	// Buffs
	APPLY_QUICK: {
		name: "Apply Occult Quick",
	},
	APPLY_ETHER: {
		name: "Apply Occult Ether",
	},
});

export const PHANTOM_COOLDOWNS = ensureRecord<CooldownData>()({
	NEVER: { name: "Never" },

	cd_PHANTOM_KICK: { name: "cd_PhantomKick" },
	cd_OCCULT_COUNTER: { name: "cd_OccultCounter" },
	cd_OCCULT_CHAKRA: { name: "cd_OccultChakra" },

	cd_APPLY_BUFF: { name: "cd_ApplyBuff" },
});

export const PHANTOM_STATUSES = ensureRecord<ResourceData>()({
	PHANTOM_KICK: { name: "Phantom Kick", maximumStacks: 3 },
	OCCULT_QUICK: { name: "Occult Quick" },
	COUNTERSTANCE: { name: "Counterstance" },
});

export type PhantomActions = typeof PHANTOM_ACTIONS;
export type PhantomActionKey = keyof PhantomActions;

export type PhantomCooldowns = typeof PHANTOM_COOLDOWNS;
export type PhantomCooldownKey = keyof PhantomCooldowns;

export type PhantomStatuses = typeof PHANTOM_STATUSES;
export type PhantomStatusKey = keyof PhantomStatuses;

export const PHANTOM_RESOURCES = {
	...PHANTOM_STATUSES,
};
export type PhantomResources = typeof PHANTOM_RESOURCES;
export type PhantomResourceKey = keyof PhantomResources;
