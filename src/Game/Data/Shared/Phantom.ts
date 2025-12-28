// Actions for Phantom Jobs.
import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData } from "../types";

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

	// Phantom Samurai
	SHIRAHADORI: {
		name: "Shirahadori",
	},
	IAINUKI: {
		name: "Iainuki",
	},
	ZENINAGE: {
		name: "Zeninage",
	},

	// Time Mage
	OCCULT_COMET: {
		name: "Occult Comet",
	},
	OCCULT_MAGE_MASHER: {
		name: "Occult Mage Masher",
	},
	OCCULT_DISPEL: {
		name: "Occult Dispel",
	},
	OCCULT_QUICK: {
		name: "Occult Quick",
	},

	// Oracle
	PREDICT: {
		name: "Predict",
	},
	PHANTOM_JUDGMENT: {
		name: "Phantom Judgment",
	},
	CLEANSING: {
		name: "Cleansing",
	},
	BLESSING: {
		name: "Blessing",
	},
	STARFALL: {
		name: "Starfall",
	},
	PHANTOM_REJUVENATION: {
		name: "Phantom Rejuvenation",
	},
	INVULNERABILITY: {
		name: "Invulnerability",
	},

	// Dancer
	DANCE: { name: "Dance" },
	PHANTOM_SWORD_DANCE: { name: "Phantom Sword Dance" },
	TEMPTING_TANGO: { name: "Tempting Tango" },
	JITTERBUG: { name: "Jitterbug" },
	MYSTERY_WALTZ: { name: "Mystery Waltz" },
	QUICKSTEP: { name: "Quickstep" },
	STEADFAST_STANCE: { name: "Steadfast Stance" },
	MESMERIZE: { name: "Mesmerize" },

	// Receiving external buffs
	APPLY_QUICK: {
		name: "Apply Occult Quick",
	},
	APPLY_ETHER: {
		name: "Apply Occult Ether",
	},
	APPLY_QUICKER_STEP: {
		name: "Apply Quicker Step",
	},
});

export const PHANTOM_COOLDOWNS = ensureRecord<CooldownData>()({
	NEVER: { name: "Never" },

	cd_PHANTOM_KICK: { name: "cd_PhantomKick" },
	cd_OCCULT_COUNTER: { name: "cd_OccultCounter" },
	cd_OCCULT_CHAKRA: { name: "cd_OccultChakra" },

	cd_SHIRAHADORI: {
		name: "cd_Shirahadori",
	},
	cd_IAINUKI: {
		name: "cd_Iainuki",
	},
	cd_ZENINAGE: {
		name: "cd_Zeninage",
	},

	cd_OCCULT_COMET: {
		name: "cd_OccultComet",
	},
	cd_OCCULT_MAGE_MASHER: {
		name: "cd_OccultMageMasher",
	},
	cd_OCCULT_DISPEL: {
		name: "cd_OccultDispel",
	},
	cd_OCCULT_QUICK: {
		name: "cd_OccultQuick",
	},

	cd_PREDICT: {
		name: "cd_Predict",
	},
	cd_PREDICTION: {
		name: "cd_Prediction",
	},
	cd_PHANTOM_REJUVENATION: {
		name: "cd_PhantomRejuvenation",
	},
	cd_INVULNERABILITY: {
		name: "Invulnerability",
	},
	cd_DANCE: { name: "cd_Dance" },
	cd_DANCE_GCD: { name: "cd_DanceGCD" },
	cd_STEADFAST_STANCE: { name: "cd_SteadfastStance" },
	cd_MESMERIZE: { name: "cd_Mesmerize" },

	cd_APPLY_BUFF: { name: "cd_ApplyBuff" },
});

export const PHANTOM_STATUSES = ensureRecord<ResourceData>()({
	PHANTOM_KICK: { name: "Phantom Kick", maximumStacks: 3 },
	OCCULT_QUICK: { name: "Occult Quick" },
	COUNTERSTANCE: { name: "Counterstance" },
	SHIRAHADORI: {
		name: "Shirahadori",
	},
	OCCULT_MAGE_MASHER: {
		name: "Occult Mage Masher",
	},
	FALSE_PREDICTION: {
		name: "False Prediction",
	},
	PREDICTION_OF_JUDGMENT: {
		name: "Prediction of Judgment",
	},
	PREDICTION_OF_CLEANSING: {
		name: "Prediction of Cleansing",
	},
	PREDICTION_OF_BLESSING: {
		name: "Prediction of Blessing",
	},
	PREDICTION_OF_STARFALL: {
		name: "Prediction of Starfall",
	},
	PHANTOM_REJUVENATION: {
		name: "Phantom Rejuvenation",
	},
	INVULNERABILITY: {
		name: "Invulnerability",
	},
	POISED_TO_SWORD_DANCE: { name: "Poised to Sword Dance" },
	TEMPTED_TO_TANGO: { name: "Tempted to Tango" },
	JITTERBUGGED: { name: "Jitterbugged" },
	WILLING_TO_WALTZ: { name: "Willing to Waltz" },
	QUICKSTEP: { name: "Quickstep" },
	QUICKER_STEP: { name: "Quicker Step" },
	STEADFAST_STANCE: { name: "Steadfast Stance" },
	ENAMORED: { name: "Enamored" },
	MESMERIZED: { name: "Mesmerized" },
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
