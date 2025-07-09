import { WARStatusPropsGenerator } from "../../Components/Jobs/WAR";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { controller } from "../../Controller/Controller";
import { LevelSync, WarningType } from "../Common";
import { TraitKey, CooldownKey } from "../Data";
import { WARResourceKey, WARActionKey } from "../Data/Jobs/WAR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, Event, getResourceInfo, makeResource, ResourceInfo } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";

const makeWARResource = (
	rsc: WARResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("WAR", rsc, maxValue, params ?? {});
};

// Gauge resources
makeWARResource("BEAST_GAUGE", 100);

// Status Effects
makeWARResource("SURGING_TEMPEST", 1, { timeout: 60 });
makeWARResource("NASCENT_CHAOS", 1, { timeout: 30 });
makeWARResource("INNER_RELEASE", 3, { timeout: 15 });
makeWARResource("INNER_STRENGTH", 1, { timeout: 15 });
makeWARResource("BURGEONING_FURY", 3, { timeout: 30 });
makeWARResource("WRATHFUL", 1, { timeout: 30 });
makeWARResource("PRIMAL_REND_READY", 1, { timeout: 30 });
makeWARResource("PRIMAL_RUINATION_READY", 1, { timeout: 20 });

makeWARResource("THRILL_OF_BATTLE", 1, { timeout: 10 });
makeWARResource("EQUILIBRIUM", 1, { timeout: 15 });

makeWARResource("RAW_INTUITION", 1, { timeout: 6 });
makeWARResource("BLOODWHETTING", 1, { timeout: 8 });
makeWARResource("STEM_THE_FLOW", 1, { timeout: 4 });
makeWARResource("STEM_THE_TIDE", 1, { timeout: 20 });
makeWARResource("NASCENT_FLASH", 1, { timeout: 8 });

makeWARResource("VENGEANCE", 1, { timeout: 15 });
makeWARResource("DAMNATION", 1, { timeout: 15 });
makeWARResource("PRIMEVAL_IMPULSE", 1, { timeout: 15 });

makeWARResource("SHAKE_IT_OFF", 1, { timeout: 30 });
makeWARResource("SHAKE_IT_OFF_OVER_TIME", 1, { timeout: 15 });

makeWARResource("HOLMGANG", 1, { timeout: 10 });

makeWARResource("DEFIANCE", 1);

// Combos & other tracking
makeWARResource("STORM_COMBO", 2, { timeout: 30 });
makeWARResource("TEMPEST_COMBO", 1, { timeout: 30 });

const STORM_COMBO_GCDS: WARActionKey[] = ["HEAVY_SWING", "MAIM", "STORMS_EYE", "STORMS_PATH"];

const TEMPEST_COMBO_GCDS: WARActionKey[] = ["OVERPOWER", "MYTHRIL_TEMPEST"];

const COMBO_GCDS: WARActionKey[] = [...STORM_COMBO_GCDS, ...TEMPEST_COMBO_GCDS];

// Weaponskills that consume Inner Release stacks.
// Additionally, they increase Burgeoning Fury count on-hit
const INNER_RELEASE_GCDS: WARActionKey[] = ["FELL_CLEAVE", "DECIMATE"];

const BUFFS_DISPELLED_BY_SHAKE_IT_OFF: WARResourceKey[] = [
	"THRILL_OF_BATTLE",
	"DAMNATION",
	"BLOODWHETTING",
	"VENGEANCE",
	"RAW_INTUITION",
];

export class WARState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Enhanced Onslaught adds an additional charge
		if (this.hasTraitUnlocked("ENHANCED_ONSLAUGHT")) {
			this.cooldowns.set(new CoolDown("cd_ONSLAUGHT", 30, 3, 3));
		}

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<WARState> {
		return new WARStatusPropsGenerator(this);
	}

	processComboStatus(skill: WARActionKey) {
		if (!COMBO_GCDS.includes(skill)) {
			return;
		} // WAR's non-combo GCDs don't break an ongoing combo

		const isTempestCombo = TEMPEST_COMBO_GCDS.includes(skill);
		const combo = isTempestCombo ? "TEMPEST_COMBO" : "STORM_COMBO";

		// break the opposite-combo's state
		const brokenCombo = isTempestCombo ? "STORM_COMBO" : "TEMPEST_COMBO";
		this.setComboState(brokenCombo, 0);

		// increment or break the current combo's state
		const comboState = this.resources.get(combo).availableAmount();
		let nextState = 0;
		if (isTempestCombo) {
			if (skill === "OVERPOWER") {
				nextState = 1;
			}
		} else {
			if (skill === "HEAVY_SWING") {
				nextState = 1;
			} else if (comboState === 1 && skill === "MAIM") {
				nextState = 2;
			}
		}
		this.setComboState(combo, nextState);
	}

	hasComboStatus(comboName: "STORM_COMBO" | "TEMPEST_COMBO", state: number): boolean {
		return this.resources.get(comboName).availableAmount() === state;
	}

	gainBeastGauge(amount: number) {
		const resource = this.resources.get("BEAST_GAUGE");
		if (resource.availableAmount() + amount > resource.maxValue) {
			controller.reportWarning(WarningType.BeastGaugeOvercap);
		}
		resource.gain(amount);
	}

	gainProc(proc: WARResourceKey, amount?: number) {
		const duration = (getResourceInfo("WAR", proc) as ResourceInfo).maxTimeout;
		if (this.hasResourceAvailable(proc)) {
			if (proc === "BURGEONING_FURY") {
				this.resources.get(proc).gain(1);
			}
			this.resources.get(proc).overrideTimer(this, duration);
		} else {
			this.resources.get(proc).gain(amount ?? 1);
			if (duration) {
				this.enqueueResourceDrop(proc, duration);
			}
		}
	}

	gainSurgingTempest(duration: number) {
		const resource = this.resources.get("SURGING_TEMPEST");
		const maxDuration = (getResourceInfo("WAR", "SURGING_TEMPEST") as ResourceInfo).maxTimeout;
		const newDuration = (resource.pendingChange?.timeTillEvent ?? 0.0) + duration;
		resource.overrideTimer(this, newDuration >= maxDuration ? maxDuration : newDuration);
	}

	gainSurgingTempestGCD(duration: number, delay: number, bonusDuration: number) {
		if (this.hasResourceAvailable("SURGING_TEMPEST")) {
			this.addEvent(
				new Event("surging tempest refresh", delay, () => {
					// buff may drop while event is queued
					if (this.hasResourceAvailable("SURGING_TEMPEST")) {
						this.gainSurgingTempest(duration);
					} else {
						this.resources.get("SURGING_TEMPEST").gain(1);
						this.enqueueResourceDrop("SURGING_TEMPEST", duration);
					}
				}),
			);
			// Surging Tempest is applied immediately with bonus duration if not already active
		} else {
			this.resources.get("SURGING_TEMPEST").gain(1);
			this.enqueueResourceDrop("SURGING_TEMPEST", duration + bonusDuration);
		}
	}
}

const makeWeaponskill_WAR = (
	name: WARActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<WARState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: "STORM_COMBO" | "TEMPEST_COMBO";
			resourceValue: number;
		};
		jobPotencyModifiers?: PotencyModifierFn<WARState>;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<WARState>;
		onConfirm?: EffectFn<WARState>;
		highlightIf?: StatePredicate<WARState>;
		onApplication?: EffectFn<WARState>;
	},
): Weaponskill<WARState> => {
	const onConfirm: EffectFn<WARState> = combineEffects(
		params.onConfirm,
		(state) => state.processComboStatus(name),
		// All Weaponskills affected by Inner Release will consume Inner Release stacks
		// and grant Burgeoning Fury stacks.
		(state) => {
			if (INNER_RELEASE_GCDS.includes(name)) {
				if (state.tryConsumeResource("INNER_RELEASE")) {
					if (state.hasTraitUnlocked("ENHANCED_INNER_RELEASE")) {
						state.gainProc("BURGEONING_FURY");
						if (state.hasResourceAvailable("BURGEONING_FURY", 3)) {
							state.gainProc("WRATHFUL");
							state.tryConsumeResource("BURGEONING_FURY", true);
						}
					}
				}
			}
		},
	);
	const jobPotencyMod: PotencyModifierFn<WARState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill("WAR", name, unlockLevel, {
		...params,
		onConfirm,
		onApplication: params.onApplication,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (
				params.combo &&
				state.hasComboStatus(params.combo.resource, params.combo.resourceValue)
			) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			if (state.hasResourceAvailable("SURGING_TEMPEST")) {
				mods.push(Modifiers.SurgingTempest);
			}
			if (state.hasResourceAvailable("INNER_RELEASE") && INNER_RELEASE_GCDS.includes(name)) {
				mods.push(Modifiers.AutoCDH);
			}
			return mods;
		},
	});
};

const makeAbility_WAR = (
	name: WARActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<WARState>[];
		highlightIf?: StatePredicate<WARState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<WARState>;
		onConfirm?: EffectFn<WARState>;
		onApplication?: EffectFn<WARState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<WARState> => {
	return makeAbility("WAR", name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("SURGING_TEMPEST")) {
				mods.push(Modifiers.SurgingTempest);
			}
			return mods;
		},
	});
};

makeWeaponskill_WAR("TOMAHAWK", 15, {
	potency: 150,
	applicationDelay: 0.71,
});

makeWeaponskill_WAR("HEAVY_SWING", 1, {
	potency: [
		["NEVER", 150],
		["MELEE_MASTERY_TANK", 200],
		["MELEE_MASTERY_II_TANK", 240],
	],
	applicationDelay: 0.53,
});

makeWeaponskill_WAR("MAIM", 4, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 150],
		["MELEE_MASTERY_II_TANK", 190],
	],
	combo: {
		potency: [
			["NEVER", 250],
			["MELEE_MASTERY_TANK", 300],
			["MELEE_MASTERY_II_TANK", 340],
		],
		resource: "STORM_COMBO",
		resourceValue: 1,
	},
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.hasComboStatus("STORM_COMBO", 1)) {
			state.gainBeastGauge(10);
		}
	},
	highlightIf: (state) => state.hasComboStatus("STORM_COMBO", 1),
});

makeWeaponskill_WAR("STORMS_PATH", 26, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 160],
		["MELEE_MASTERY_II_TANK", 220],
	],
	combo: {
		potency: [
			["NEVER", 380],
			["MELEE_MASTERY_TANK", 440],
			["MELEE_MASTERY_II_TANK", 500],
		],
		resource: "STORM_COMBO",
		resourceValue: 2,
	},
	applicationDelay: 1.52,
	onConfirm: (state) => {
		if (state.hasComboStatus("STORM_COMBO", 2)) {
			state.gainBeastGauge(20);
		}
	},
	highlightIf: (state) => state.hasComboStatus("STORM_COMBO", 2),
});

makeWeaponskill_WAR("STORMS_EYE", 50, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 160],
		["MELEE_MASTERY_II_TANK", 220],
	],
	combo: {
		potency: [
			["NEVER", 380],
			["MELEE_MASTERY_TANK", 440],
			["MELEE_MASTERY_II_TANK", 500],
		],
		resource: "STORM_COMBO",
		resourceValue: 2,
	},
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.hasComboStatus("STORM_COMBO", 2)) {
			state.gainBeastGauge(10);
			state.gainSurgingTempestGCD(30, 0.62, 1.7);
		}
	},
	highlightIf: (state) => state.hasComboStatus("STORM_COMBO", 2),
});

makeWeaponskill_WAR("OVERPOWER", 10, {
	potency: 110,
	falloff: 0,
	applicationDelay: 0.62,
});

makeWeaponskill_WAR("MYTHRIL_TEMPEST", 40, {
	potency: 100,
	combo: {
		potency: 140,
		resource: "TEMPEST_COMBO",
		resourceValue: 1,
	},
	falloff: 0,
	applicationDelay: 0.49,
	onConfirm: (state) => {
		if (state.hasComboStatus("TEMPEST_COMBO", 1)) {
			state.gainBeastGauge(20);
			state.gainSurgingTempestGCD(30, 0.49, 0.45);
		}
	},
	highlightIf: (state) => state.hasComboStatus("TEMPEST_COMBO", 1),
});

function reduceInfuriateCooldown(state: WARState) {
	const cooldown = state.cooldowns.get("cd_INFURIATE") as CoolDown;
	cooldown.restore(5);
}

makeWeaponskill_WAR("FELL_CLEAVE", 54, {
	potency: [
		["NEVER", 520],
		["MELEE_MASTERY_II_TANK", 580],
	],
	applicationDelay: 0.62,
	validateAttempt: (state) => {
		return (
			state.resources.get("BEAST_GAUGE").available(50) ||
			state.resources.get("INNER_RELEASE").available(1)
		);
	},
	onConfirm: (state) => {
		if (!state.hasResourceAvailable("INNER_RELEASE")) {
			state.resources.get("BEAST_GAUGE").consume(50);
		}
		reduceInfuriateCooldown(state);
	},
	replaceIf: [
		{
			newSkill: "INNER_CHAOS",
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable("NASCENT_CHAOS");
			},
		},
	],
	highlightIf: (state) => {
		return (
			state.hasResourceAvailable("BEAST_GAUGE", 50) ||
			state.hasResourceAvailable("INNER_RELEASE")
		);
	},
});

makeWeaponskill_WAR("DECIMATE", 60, {
	potency: 180,
	falloff: 0,
	applicationDelay: 1.83,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable("BEAST_GAUGE", 50) ||
			state.hasResourceAvailable("INNER_RELEASE")
		);
	},
	onConfirm: (state) => {
		if (!state.tryConsumeResource("INNER_RELEASE")) {
			state.resources.get("BEAST_GAUGE").consume(50);
		}
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => {
		return (
			state.hasResourceAvailable("BEAST_GAUGE", 50) ||
			state.hasResourceAvailable("INNER_RELEASE")
		);
	},
	replaceIf: [
		{
			newSkill: "CHAOTIC_CYCLONE",
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable("NASCENT_CHAOS");
			},
		},
	],
});

makeAbility_WAR("INNER_RELEASE", 70, "cd_INNER_RELEASE", {
	applicationDelay: 0,
	requiresCombat: true,
	cooldown: 60,
	maxCharges: 1,
	onConfirm: (state) => {
		state.gainProc("INNER_RELEASE", 3);
		state.gainProc("INNER_STRENGTH");
		if (state.hasResourceAvailable("SURGING_TEMPEST")) {
			state.gainSurgingTempest(10);
		}
		if (state.config.level >= LevelSync.lvl90) {
			state.gainProc("PRIMAL_REND_READY");
		}
	},
	replaceIf: [
		{
			newSkill: "PRIMAL_WRATH",
			condition: (state) => state.hasResourceAvailable("WRATHFUL"),
		},
	],
});

makeWeaponskill_WAR("PRIMAL_REND", 90, {
	potency: 700,
	applicationDelay: 1.16,
	falloff: 0.5,
	animationLock: 1.2,
	validateAttempt: (state) => state.hasResourceAvailable("PRIMAL_REND_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("PRIMAL_REND_READY");
		if (state.hasTraitUnlocked("ENHANCED_PRIMAL_REND")) {
			state.gainProc("PRIMAL_RUINATION_READY");
		}
	},
	highlightIf: (state) => state.hasResourceAvailable("PRIMAL_REND_READY"),
	replaceIf: [
		{
			newSkill: "PRIMAL_RUINATION",
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable("PRIMAL_RUINATION_READY");
			},
		},
	],
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR("PRIMAL_WRATH", 96, "cd_PRIMAL_WRATH", {
	startOnHotbar: false,
	potency: 700,
	falloff: 0.5,
	applicationDelay: 1.15,
	cooldown: 1.0,
	validateAttempt: (state) => state.hasResourceAvailable("WRATHFUL"),
	onConfirm: (state) => state.tryConsumeResource("WRATHFUL"),
	highlightIf: (state) => true,
});

makeWeaponskill_WAR("PRIMAL_RUINATION", 100, {
	startOnHotbar: false,
	potency: 780,
	falloff: 0.5,
	applicationDelay: 1.06,
	validateAttempt: (state) => {
		return state.hasResourceAvailable("PRIMAL_RUINATION_READY");
	},
	onConfirm: (state) => {
		state.tryConsumeResource("PRIMAL_RUINATION_READY");
	},
	highlightIf: (state) => true,
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR("INFURIATE", 50, "cd_INFURIATE", {
	applicationDelay: 0,
	requiresCombat: true,
	cooldown: 60,
	maxCharges: 2,
	onApplication: (state) => {
		state.gainBeastGauge(50);
		if (state.hasTraitUnlocked("NASCENT_CHAOS")) {
			state.gainProc("NASCENT_CHAOS");
		}
	},
});

makeWeaponskill_WAR("INNER_CHAOS", 80, {
	startOnHotbar: false,
	potency: 660,
	applicationDelay: 0.94,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable("BEAST_GAUGE", 50) &&
			state.hasResourceAvailable("NASCENT_CHAOS")
		);
	},
	onConfirm: (state) => {
		state.tryConsumeResource("NASCENT_CHAOS");
		state.resources.get("BEAST_GAUGE").consume(50);
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => state.hasResourceAvailable("BEAST_GAUGE", 50),
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeWeaponskill_WAR("CHAOTIC_CYCLONE", 72, {
	startOnHotbar: false,
	potency: 200,
	falloff: 0,
	applicationDelay: 1.43,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable("BEAST_GAUGE", 50) &&
			state.hasResourceAvailable("NASCENT_CHAOS")
		);
	},
	onConfirm: (state) => {
		state.tryConsumeResource("NASCENT_CHAOS");
		state.resources.get("BEAST_GAUGE").consume(50);
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => state.hasResourceAvailable("BEAST_GAUGE", 50),
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR("ONSLAUGHT", 62, "cd_ONSLAUGHT", {
	potency: 150,
	applicationDelay: 0.63,
	cooldown: 30,
	maxCharges: 2, // set in constructor to be 3 with trait
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeAbility_WAR("UPHEAVAL", 64, "cd_UPHEAVAL", {
	potency: 420,
	applicationDelay: 0.62,
	cooldown: 30,
});

makeAbility_WAR("OROGENY", 86, "cd_UPHEAVAL", {
	potency: 150,
	falloff: 0,
	applicationDelay: 0.62,
	cooldown: 30,
});

// TODO: when boss attacks are tracked, apply Vengance/Damnation's phys. reflection
makeResourceAbility("WAR", "VENGEANCE", 38, "cd_VENGEANCE", {
	rscType: "VENGEANCE",
	autoUpgrade: { trait: "VENGEANCE_MASTERY", otherSkill: "DAMNATION" },
	cooldown: 120,
	applicationDelay: 0.62,
});

makeResourceAbility("WAR", "DAMNATION", 92, "cd_VENGEANCE", {
	rscType: "DAMNATION",
	autoDowngrade: { trait: "VENGEANCE_MASTERY", otherSkill: "VENGEANCE" },
	cooldown: 120,
	applicationDelay: 0.62,
});

makeResourceAbility("WAR", "RAW_INTUITION", 56, "cd_RAW_INTUITION", {
	rscType: "RAW_INTUITION",
	autoUpgrade: { trait: "RAW_INTUITION_MASTERY", otherSkill: "BLOODWHETTING" },
	cooldown: 25,
	applicationDelay: 0.45,
});

makeResourceAbility("WAR", "BLOODWHETTING", 82, "cd_RAW_INTUITION", {
	rscType: "BLOODWHETTING",
	autoDowngrade: { trait: "RAW_INTUITION_MASTERY", otherSkill: "RAW_INTUITION" },
	onApplication: (state: WARState) => {
		state.gainProc("STEM_THE_FLOW");
		state.gainProc("STEM_THE_TIDE");
	},
	cooldown: 25,
	applicationDelay: 0.45,
});

makeAbility("WAR", "NASCENT_FLASH", 76, "cd_RAW_INTUITION", {
	onApplication: (state: WARState) => {
		let duration = 6;
		if (state.hasTraitUnlocked("ENHANCED_NASCENT_FLASH")) {
			duration = 8;
		}
		state.resources.get("NASCENT_FLASH").gain(1);
		state.enqueueResourceDrop("NASCENT_FLASH", duration);
	},
	cooldown: 25,
	// based on Bloodwhetting
	applicationDelay: 0.45,
});

makeResourceAbility("WAR", "HOLMGANG", 45, "cd_HOLMGANG", {
	rscType: "HOLMGANG",
	cooldown: 240,
	applicationDelay: 0.45,
});

makeResourceAbility("WAR", "THRILL_OF_BATTLE", 30, "cd_THRILL_OF_BATTLE", {
	rscType: "THRILL_OF_BATTLE",
	cooldown: 90,
	applicationDelay: 0.62,
});

makeAbility("WAR", "EQUILIBRIUM", 58, "cd_EQUILIBRIUM", {
	cooldown: 60,
	applicationDelay: 0.62,
	onApplication: (state: WARState) => {
		if (state.hasTraitUnlocked("ENHANCED_EQUILIBRIUM")) {
			state.gainProc("EQUILIBRIUM");
		}
	},
});

makeResourceAbility("WAR", "SHAKE_IT_OFF", 68, "cd_SHAKE_IT_OFF", {
	rscType: "SHAKE_IT_OFF",
	cooldown: 90,
	onApplication: (state: WARState, node) => {
		let dispellCount = 0;
		BUFFS_DISPELLED_BY_SHAKE_IT_OFF.forEach((buff) => {
			if (state.tryConsumeResource(buff)) {
				dispellCount += 1;
			}
		});
		// Barrier potencies aren't tracked, each buff dispelled
		// increases the shield strength by a flat 2% of WAR's max HP
		console.debug(`Shake It Off dispelled ${dispellCount} buffs`);
		state.gainProc("SHAKE_IT_OFF_OVER_TIME");
	},
	applicationDelay: 0,
});

makeAbility("WAR", "DEFIANCE", 10, "cd_DEFIANCE", {
	cooldown: 2,
	maxCharges: 1,
	applicationDelay: 0,
	validateAttempt: (state) => !state.hasResourceAvailable("DEFIANCE"),
	onConfirm: (state: WARState) => state.resources.get("DEFIANCE").gain(1),
	replaceIf: [
		{
			newSkill: "RELEASE_DEFIANCE",
			condition: (state) => state.hasResourceAvailable("DEFIANCE"),
		},
	],
	secondaryCooldown: {
		cdName: "cd_RELEASE_DEFIANCE",
		cooldown: 1,
		maxCharges: 1,
	},
});

makeAbility("WAR", "RELEASE_DEFIANCE", 10, "cd_RELEASE_DEFIANCE", {
	startOnHotbar: false,
	cooldown: 1,
	maxCharges: 1,
	secondaryCooldown: {
		cdName: "cd_DEFIANCE",
		cooldown: 2,
		maxCharges: 1,
	},
	applicationDelay: 0,
	validateAttempt: (state) => state.hasResourceAvailable("DEFIANCE"),
	onConfirm: (state) => state.tryConsumeResource("DEFIANCE"),
});
