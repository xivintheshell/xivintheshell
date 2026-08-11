// Actions for Phantom Jobs.
import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData } from "../types";

export const PHANTOM_ACTIONS = ensureRecord<ActionData>()({
	// Phantom Monk
	PHANTOM_KICK: {
		name: "Phantom Kick",
		id: 41595,
	},
	OCCULT_COUNTER: {
		name: "Occult Counter",
		id: 41596,
	},
	COUNTERSTANCE: {
		name: "Counterstance",
		id: 41597,
	},
	OCCULT_CHAKRA: {
		name: "Occult Chakra",
		id: 41598,
	},

	// Phantom Samurai
	SHIRAHADORI: {
		name: "Shirahadori",
		id: 41604,
	},
	IAINUKI: {
		name: "Iainuki",
		id: 41605,
	},
	ZENINAGE: {
		name: "Zeninage",
		id: 41606,
	},

	// Time Mage
	OCCULT_COMET: {
		name: "Occult Comet",
		id: 41623,
	},
	OCCULT_MAGE_MASHER: {
		name: "Occult Mage Masher",
		id: 41624,
	},
	OCCULT_DISPEL: {
		name: "Occult Dispel",
		id: 41622,
	},
	OCCULT_QUICK: {
		name: "Occult Quick",
		id: 41625,
	},

	// Oracle
	PREDICT: {
		name: "Predict",
		id: 41636,
	},
	PHANTOM_JUDGMENT: {
		name: "Phantom Judgment",
		id: 41637,
	},
	CLEANSING: {
		name: "Cleansing",
		id: 41638,
	},
	BLESSING: {
		name: "Blessing",
		id: 41639,
	},
	STARFALL: {
		name: "Starfall",
		id: 41640,
	},
	PHANTOM_REJUVENATION: {
		name: "Phantom Rejuvenation",
		id: 41643,
	},
	INVULNERABILITY: {
		name: "Invulnerability",
		id: 41644,
	},

	// Dancer
	DANCE: { name: "Dance", id: 46598 },
	PHANTOM_SWORD_DANCE: { name: "Phantom Sword Dance", id: 46599 },
	TEMPTING_TANGO: { name: "Tempting Tango", id: 46600 },
	JITTERBUG: { name: "Jitterbug", id: 46601 },
	MYSTERY_WALTZ: { name: "Mystery Waltz", id: 46602 },
	QUICKSTEP: { name: "Quickstep", id: 46603 },
	STEADFAST_STANCE: { name: "Steadfast Stance", id: 46604 },
	MESMERIZE: { name: "Mesmerize", id: 46605 },

	// Black Mage
	OCCULT_FIRE_III: { name: "Occult Fire III", id: 49072 },
	OCCULT_BLIZZARD_III: { name: "Occult Blizzard III", id: 49073 },
	OCCULT_THUNDER_III: { name: "Occult Thunder III", id: 49074 },
	OCCULT_FLARE: { name: "Occult Flare", id: 49076 },

	// Summoner
	HELLFIRE: { name: "Hellfire", id: 49080 },
	JUDGMENT_BOLT: { name: "Judgment Bolt", id: 49081 },
	THUNDERSTORM: { name: "Thunderstorm", id: 49083 },
	MEGAFLARE: { name: "Megaflare", id: 49084 },

	// Freelancer
	WISDOM_ON_THE_WINDS: { name: "Wisdom on the Winds", id: 49102 },

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
	ELEMENTAL_WEAKNESS: { name: "Elemental Weakness", mayBeToggled: true },
	LIBRA: { name: "Libra", mayBeToggled: true },
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
