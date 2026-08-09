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

	// Black Mage
	OCCULT_FIRE_III: { name: "Occult Fire III" },
	OCCULT_BLIZZARD_III: { name: "Occult Blizzard III" },
	OCCULT_THUNDER_III: { name: "Occult Thunder III" },
	OCCULT_FLARE: { name: "Occult Flare" },

	// Summoner
	HELLFIRE: { name: "Hellfire" },
	JUDGMENT_BOLT: { name: "Judgment Bolt" },
	THUNDERSTORM: { name: "Thunderstorm" },
	MEGAFLARE: { name: "Megaflare" },

	// Freelancer
	WISDOM_ON_THE_WINDS: { name: "Wisdom on the Winds" },

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

	// Phantom actions across different phantom jobs share common cooldowns,
	// which become restricted when you swap jobs. This is relevant for ph. Freelancer.
	// See pins in FOE #crescent-science for which abilities correspond to which cooldown groups.
	cd_OC_GROUP_A: { name: "cd_OCGroupA" },
	cd_OC_GROUP_B: { name: "cd_OCGroupB" },
	cd_OC_GROUP_C: { name: "cd_OCGroupC" },
	cd_OC_GROUP_D: { name: "cd_OCGroupD" },
	cd_OC_GROUP_E: { name: "cd_OCGroupE" },
	cd_OC_GROUP_F: { name: "cd_OCGroupF" },
	cd_PREDICTION: { name: "cd_OCPrediction" },
	cd_DANCE_GCD: { name: "cd_DanceGCD" },

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
	ELEMENTAL_WEAKNESS: { name: "Elemental Weakness" },
	LIBRA: { name: "Libra" },
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
