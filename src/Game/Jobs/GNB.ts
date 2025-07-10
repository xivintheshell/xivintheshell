// Skill and state declarations for GNB

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	ResourceCalculationFn,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState } from "../GameState";
import { makeResource, CoolDown, Event, Resource } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { GNBStatusPropsGenerator } from "../../Components/Jobs/GNB";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionKey, CooldownKey, ResourceKey, TraitKey } from "../Data";
import { GNBResourceKey } from "../Data/Jobs/GNB";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makeGNBResource = (
	rsc: GNBResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("GNB", rsc, maxValue, params ?? {});
};

makeGNBResource("POWDER_GAUGE", 3);
makeGNBResource("ROYAL_GUARD", 1);

// TODO: get precise durations
makeGNBResource("NO_MERCY", 1, { timeout: 20 });
makeGNBResource("AURORA", 1, { timeout: 18 });
makeGNBResource("BOW_SHOCK_DOT", 1, { timeout: 15 });
makeGNBResource("CAMOUFLAGE", 1, { timeout: 20 });
makeGNBResource("HEART_OF_CORUNDUM", 1, { timeout: 8 });
makeGNBResource("CLARITY_OF_CORUNDUM", 1, { timeout: 15 });
makeGNBResource("CATHARSIS_OF_CORUNDUM", 1, { timeout: 20 });
makeGNBResource("NEBULA", 1, { timeout: 15 });
makeGNBResource("GREAT_NEBULA", 1, { timeout: 15 });
makeGNBResource("HEART_OF_LIGHT", 1, { timeout: 15 });
makeGNBResource("HEART_OF_STONE", 1, { timeout: 8 });

makeGNBResource("READY_TO_BLAST", 1, { timeout: 10 });
makeGNBResource("READY_TO_BREAK", 1, { timeout: 30 });
makeGNBResource("READY_TO_GOUGE", 1, { timeout: 10 });
makeGNBResource("READY_TO_RAZE", 1, { timeout: 10 });
makeGNBResource("READY_TO_REIGN", 1, { timeout: 30 });
makeGNBResource("READY_TO_RIP", 1, { timeout: 10 });
makeGNBResource("READY_TO_TEAR", 1, { timeout: 10 });

makeGNBResource("SONIC_BREAK_DOT", 1, { timeout: 30 });
makeGNBResource("SUPERBOLIDE", 1, { timeout: 10 });
makeGNBResource("BRUTAL_SHELL", 1, { timeout: 30 });

makeGNBResource("GNB_COMBO_TRACKER", 2, { timeout: 30 });
makeGNBResource("GNB_AOE_COMBO_TRACKER", 1, { timeout: 30 });
makeGNBResource("GNB_GNASHING_COMBO_TRACKER", 2, { timeout: 30 });
makeGNBResource("GNB_REIGN_COMBO_TRACKER", 2, { timeout: 30 });

// === JOB GAUGE AND STATE ===
const BASIC_COMBO_SKILLS: ActionKey[] = ["KEEN_EDGE", "BRUTAL_SHELL", "SOLID_BARREL"];

const AOE_COMBO_SKILLS: ActionKey[] = ["DEMON_SLICE", "DEMON_SLAUGHTER"];

const GNASHING_COMBO_SKILLS: ActionKey[] = ["GNASHING_FANG", "SAVAGE_CLAW", "WICKED_TALON"];

const REIGN_COMBO_SKILLS: ActionKey[] = ["REIGN_OF_BEASTS", "NOBLE_BLOOD", "LION_HEART"];

export class GNBState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Enhanced Aurora adds an additional charge
		const auroraStacks = this.hasTraitUnlocked("ENHANCED_AURORA") ? 2 : 1;
		[new CoolDown("cd_AURORA", 60, auroraStacks, auroraStacks)].forEach((cd) =>
			this.cooldowns.set(cd),
		);

		this.cooldowns.set(new CoolDown("cd_DOUBLE_DOWN", this.config.adjustedSksGCD(60), 1, 1));
		this.cooldowns.set(new CoolDown("cd_GNASHING_FANG", this.config.adjustedSksGCD(30), 1, 1));

		const powderGaugeMax = this.hasTraitUnlocked("CARTRIDGE_CHARGE_II") ? 3 : 2;
		this.resources.set(new Resource("POWDER_GAUGE", powderGaugeMax, 0));

		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "SONIC_BREAK_DOT",
						appliedBy: ["SONIC_BREAK"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "BOW_SHOCK_DOT",
						appliedBy: ["BOW_SHOCK"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<GNBState> {
		return new GNBStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("NO_MERCY")) {
			node.addBuff(BuffType.NoMercy);
		}
	}

	// handle all 4 GNB combo abilities and combo states
	fixGNBComboState(skillName: ActionKey) {
		// HANDLE AOE DIFFERENTLY
		if (AOE_COMBO_SKILLS.includes(skillName)) {
			// reset basic, reign and gnashing trackers
			this.tryConsumeResource("GNB_COMBO_TRACKER", true);
			this.tryConsumeResource("GNB_REIGN_COMBO_TRACKER", true);
			this.tryConsumeResource("GNB_GNASHING_COMBO_TRACKER", true);

			this.tryConsumeResource("GNB_AOE_COMBO_TRACKER");
			if (skillName === "DEMON_SLICE") {
				this.setComboState("GNB_AOE_COMBO_TRACKER", 1);
			}
			return;
		}

		// the other 3 combo types
		let resType: GNBResourceKey = "GNB_COMBO_TRACKER";
		let index = -1;
		if (BASIC_COMBO_SKILLS.includes(skillName)) {
			// reset aoe, reign and gnashing trackers
			this.tryConsumeResource("GNB_AOE_COMBO_TRACKER", true);
			this.tryConsumeResource("GNB_REIGN_COMBO_TRACKER", true);
			this.tryConsumeResource("GNB_GNASHING_COMBO_TRACKER", true);
			index = BASIC_COMBO_SKILLS.indexOf(skillName);
		} else if (GNASHING_COMBO_SKILLS.includes(skillName)) {
			// reset reign tracker
			this.tryConsumeResource("GNB_REIGN_COMBO_TRACKER", true);
			resType = "GNB_GNASHING_COMBO_TRACKER";
			index = GNASHING_COMBO_SKILLS.indexOf(skillName);
		} else if (REIGN_COMBO_SKILLS.includes(skillName)) {
			// reset gnashing tracker
			this.tryConsumeResource("GNB_GNASHING_COMBO_TRACKER", true);
			resType = "GNB_REIGN_COMBO_TRACKER";
			index = REIGN_COMBO_SKILLS.indexOf(skillName);
		}
		// console.log("Skill: " + skillName + " Index: " + index);
		let nextComboValue = 0;
		if (index === 0) {
			nextComboValue = 1;
		} else if (index === 1 && this.hasResourceExactly(resType, 1)) {
			nextComboValue = 2;
		}
		this.setComboState(resType, nextComboValue);
	}

	// gain a cart
	gainCartridge(carts: number) {
		const maxCarts = this.hasTraitUnlocked("CARTRIDGE_CHARGE_II") ? 3 : 2;
		if (this.resources.get("POWDER_GAUGE").availableAmount() + carts > maxCarts) {
			controller.reportWarning(WarningType.CartridgeOvercap);
		}
		this.resources.get("POWDER_GAUGE").gain(carts);
	}

	refreshBuff(rscType: ResourceKey, delay: number) {
		// buffs are applied on hit, so apply it after a delay
		this.addEvent(
			new Event("gain buff", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
			}),
		);
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeWeaponskill_GNB = (
	name: ActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<GNBState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		recastTime?: number | ResourceCalculationFn<GNBState>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: ResourceKey;
			resourceValue: number;
		};
		falloff?: number;
		jobPotencyModifiers?: PotencyModifierFn<GNBState>;
		applicationDelay?: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<GNBState>;
		onExecute?: EffectFn<GNBState>;
		onConfirm?: EffectFn<GNBState>;
		highlightIf?: StatePredicate<GNBState>;
		onApplication?: EffectFn<GNBState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<GNBState> => {
	const onConfirm: EffectFn<GNBState> = combineEffects(params.onConfirm, (state) => {
		// fix gcd combo state
		if (name !== "SONIC_BREAK") {
			state.fixGNBComboState(name);
		}

		// remove all continuation buffs if gcd is pressed before continuation
		state.tryConsumeResource("READY_TO_BLAST");
		state.tryConsumeResource("READY_TO_RAZE");
		state.tryConsumeResource("READY_TO_RIP");
		state.tryConsumeResource("READY_TO_TEAR");
		state.tryConsumeResource("READY_TO_GOUGE");
	});
	const jobPotencyMod: PotencyModifierFn<GNBState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill("GNB", name, unlockLevel, {
		...params,
		onConfirm,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (
				params.combo &&
				state.resources.get(params.combo.resource).availableAmount() ===
					params.combo.resourceValue
			) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			if (state.hasResourceAvailable("NO_MERCY")) {
				mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

const makeAbility_GNB = (
	name: ActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<GNBState>[];
		highlightIf?: StatePredicate<GNBState>;
		drawsAggro?: boolean;
		falloff?: number;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<GNBState>;
		onConfirm?: EffectFn<GNBState>;
		onApplication?: EffectFn<GNBState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<GNBState> => {
	return makeAbility("GNB", name, unlockLevel, cdName, {
		...params,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("NO_MERCY")) {
				mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

// GNB skill replacement conditions

const gnashingFangCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "GNASHING_FANG",
	condition: (state) => state.resources.get("GNB_GNASHING_COMBO_TRACKER").availableAmount() === 0,
};

const savageClawCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "SAVAGE_CLAW",
	condition: (state) => state.resources.get("GNB_GNASHING_COMBO_TRACKER").availableAmount() === 1,
};

const wickedTalonCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "WICKED_TALON",
	condition: (state) => state.resources.get("GNB_GNASHING_COMBO_TRACKER").availableAmount() === 2,
};

const reignOfBeastsCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "REIGN_OF_BEASTS",
	condition: (state) => state.resources.get("GNB_REIGN_COMBO_TRACKER").availableAmount() === 0,
};

const nobleBloodCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "NOBLE_BLOOD",
	condition: (state) => state.resources.get("GNB_REIGN_COMBO_TRACKER").availableAmount() === 1,
};

const lionHeartCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "LION_HEART",
	condition: (state) => state.resources.get("GNB_REIGN_COMBO_TRACKER").availableAmount() === 2,
};

const hypervelocityCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "HYPERVELOCITY",
	condition: (state) => state.hasResourceAvailable("READY_TO_BLAST"),
};

const fatedBrandCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "FATED_BRAND",
	condition: (state) => state.hasResourceAvailable("READY_TO_RAZE"),
};

const jugularRipCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "JUGULAR_RIP",
	condition: (state) => state.hasResourceAvailable("READY_TO_RIP"),
};

const abdomenTearCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "ABDOMEN_TEAR",
	condition: (state) => state.hasResourceAvailable("READY_TO_TEAR"),
};

const eyeGougeCndition: ConditionalSkillReplace<GNBState> = {
	newSkill: "EYE_GOUGE",
	condition: (state) => state.hasResourceAvailable("READY_TO_GOUGE"),
};

const royalGuardCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "ROYAL_GUARD",
	condition: (state) => !state.hasResourceAvailable("ROYAL_GUARD"),
};

const releaseRoyalGuardCondition: ConditionalSkillReplace<GNBState> = {
	newSkill: "RELEASE_ROYAL_GUARD",
	condition: (state) => state.hasResourceAvailable("ROYAL_GUARD"),
};

// GNB skill declarations

makeWeaponskill_GNB("LIGHTNING_SHOT", 15, {
	potency: 150,
	applicationDelay: 0.72,
});

makeWeaponskill_GNB("KEEN_EDGE", 1, {
	potency: [
		["NEVER", 150],
		["MELEE_MASTERY_TANK", 200],
		["MELEE_MASTERY_II_TANK", 300],
	],
	applicationDelay: 0.89,
});

makeWeaponskill_GNB("BRUTAL_SHELL", 4, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 160],
		["MELEE_MASTERY_II_TANK", 240],
	],
	combo: {
		potency: [
			["NEVER", 240],
			["MELEE_MASTERY_TANK", 300],
			["MELEE_MASTERY_II_TANK", 380],
		],
		resource: "GNB_COMBO_TRACKER",
		resourceValue: 1,
	},
	applicationDelay: 1.07,
	onConfirm: (state) => {
		// apply brutal shell buff if combo is 1
		if (state.hasResourceExactly("GNB_COMBO_TRACKER", 1)) {
			state.refreshBuff("BRUTAL_SHELL", 0);
		}
	},
	highlightIf: (state) => state.hasResourceExactly("GNB_COMBO_TRACKER", 1),
});

makeWeaponskill_GNB("SOLID_BARREL", 26, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 140],
		["MELEE_MASTERY_II_TANK", 240],
	],
	combo: {
		potency: [
			["NEVER", 320],
			["MELEE_MASTERY_TANK", 360],
			["MELEE_MASTERY_II_TANK", 460],
		],
		resource: "GNB_COMBO_TRACKER",
		resourceValue: 2,
	},
	applicationDelay: 1.07,
	onConfirm: (state) => {
		// add cart if combo is 2
		if (state.hasResourceExactly("GNB_COMBO_TRACKER", 2)) {
			state.gainCartridge(1);
		}
	},
	highlightIf: (state) => state.hasResourceExactly("GNB_COMBO_TRACKER", 2),
});

makeWeaponskill_GNB("DEMON_SLICE", 10, {
	potency: 100,
	falloff: 0,
	applicationDelay: 0.62,
});

makeWeaponskill_GNB("DEMON_SLAUGHTER", 40, {
	potency: 100,
	combo: {
		potency: 160,
		resource: "GNB_AOE_COMBO_TRACKER",
		resourceValue: 1,
	},
	falloff: 0,
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.hasResourceExactly("GNB_AOE_COMBO_TRACKER", 1)) {
			state.gainCartridge(1);
		}
	},
	highlightIf: (state) => state.hasResourceExactly("GNB_AOE_COMBO_TRACKER", 1),
});

makeWeaponskill_GNB("BURST_STRIKE", 30, {
	potency: [
		["NEVER", 400],
		["MELEE_MASTERY_II_TANK", 460],
	],
	applicationDelay: 0.71,
	validateAttempt: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("POWDER_GAUGE");
		if (state.hasTraitUnlocked("ENHANCED_CONTINUATION")) {
			state.refreshBuff("READY_TO_BLAST", 0);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
});

makeWeaponskill_GNB("FATED_CIRCLE", 72, {
	potency: 300,
	falloff: 0,
	applicationDelay: 0.54,
	validateAttempt: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("POWDER_GAUGE");
		if (state.hasTraitUnlocked("ENHANCED_CONTINUATION_II")) {
			state.refreshBuff("READY_TO_RAZE", 0);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
});

makeAbility_GNB("BLOODFEST", 76, "cd_BLOODFEST", {
	applicationDelay: 0,
	cooldown: 120,
	maxCharges: 1,
	onConfirm: (state) => {
		const maxCarts = state.hasTraitUnlocked("CARTRIDGE_CHARGE_II") ? 3 : 2;
		state.gainCartridge(maxCarts);
		if (state.hasTraitUnlocked("ENHANCED_BLOODFEST")) {
			state.refreshBuff("READY_TO_REIGN", 0);
		}
	},
});

makeAbility_GNB("NO_MERCY", 2, "cd_NO_MERCY", {
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 1,
	onConfirm: (state) => {
		state.refreshBuff("NO_MERCY", 0.62);
		state.refreshBuff("READY_TO_BREAK", 0);
	},
});

makeWeaponskill_GNB("SONIC_BREAK", 54, {
	potency: 300,
	applicationDelay: 0.62,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_BREAK"),
	onConfirm: (state, node) => {
		state.tryConsumeResource("READY_TO_BREAK");

		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("NO_MERCY")) {
			modifiers.push(Modifiers.NoMercy);
		}

		const tickPotency = 60;

		state.addDoTPotencies({
			node,
			effectName: "SONIC_BREAK_DOT",
			skillName: "SONIC_BREAK",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});
	},
	onApplication: (state, node) => state.applyDoT("SONIC_BREAK_DOT", node),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_BREAK"),
});

makeWeaponskill_GNB("GNASHING_FANG", 60, {
	replaceIf: [savageClawCondition, wickedTalonCondition],
	potency: [
		["NEVER", 380],
		["MELEE_MASTERY_II_TANK", 500],
	],
	applicationDelay: 0.62,
	recastTime: (state) => state.config.adjustedSksGCD(),
	validateAttempt: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
	onConfirm: (state) => {
		state.refreshBuff("READY_TO_RIP", 0);
		state.tryConsumeResource("POWDER_GAUGE");
	},
	// Gnashing Fang does not highlight if we're in the middle of a Reign of Beasts combo
	highlightIf: (state) =>
		state.hasResourceAvailable("POWDER_GAUGE") &&
		!state.hasResourceAvailable("GNB_REIGN_COMBO_TRACKER"),
	secondaryCooldown: {
		cdName: "cd_GNASHING_FANG",
		cooldown: 30,
		maxCharges: 1,
	},
});

makeWeaponskill_GNB("SAVAGE_CLAW", 60, {
	startOnHotbar: false,
	replaceIf: [gnashingFangCondition, wickedTalonCondition],
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_II_TANK", 560],
	],
	applicationDelay: 0.62,
	validateAttempt: (state) => state.hasResourceExactly("GNB_GNASHING_COMBO_TRACKER", 1),
	onConfirm: (state) => {
		state.refreshBuff("READY_TO_TEAR", 0);
	},
	highlightIf: (state) => state.hasResourceExactly("GNB_GNASHING_COMBO_TRACKER", 1),
});

makeWeaponskill_GNB("WICKED_TALON", 60, {
	startOnHotbar: false,
	replaceIf: [gnashingFangCondition, savageClawCondition],
	potency: [
		["NEVER", 540],
		["MELEE_MASTERY_II_TANK", 620],
	],
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceExactly("GNB_GNASHING_COMBO_TRACKER", 2),
	onConfirm: (state) => {
		state.refreshBuff("READY_TO_GOUGE", 0);
	},
	highlightIf: (state) => state.hasResourceExactly("GNB_GNASHING_COMBO_TRACKER", 2),
});

makeWeaponskill_GNB("DOUBLE_DOWN", 90, {
	potency: 1200,
	falloff: 0.15,
	applicationDelay: 0.72,
	recastTime: (state) => state.config.adjustedSksGCD(),
	validateAttempt: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("POWDER_GAUGE");
	},
	highlightIf: (state) => state.hasResourceAvailable("POWDER_GAUGE"),
	secondaryCooldown: {
		cdName: "cd_DOUBLE_DOWN",
		cooldown: 60,
		maxCharges: 1,
	},
});

makeWeaponskill_GNB("REIGN_OF_BEASTS", 100, {
	replaceIf: [nobleBloodCondition, lionHeartCondition],
	potency: 1000,
	falloff: 0.6,
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_REIGN"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_REIGN");
	},
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_REIGN"),
});

makeWeaponskill_GNB("NOBLE_BLOOD", 100, {
	startOnHotbar: false,
	replaceIf: [reignOfBeastsCondition, lionHeartCondition],
	potency: 1100,
	falloff: 0.6,
	applicationDelay: 1.65,
	validateAttempt: (state) => state.hasResourceExactly("GNB_REIGN_COMBO_TRACKER", 1),
	highlightIf: (state) => state.hasResourceExactly("GNB_REIGN_COMBO_TRACKER", 1),
});

makeWeaponskill_GNB("LION_HEART", 100, {
	startOnHotbar: false,
	replaceIf: [reignOfBeastsCondition, nobleBloodCondition],
	potency: 1200,
	falloff: 0.6,
	applicationDelay: 1.79,
	validateAttempt: (state) => state.hasResourceExactly("GNB_REIGN_COMBO_TRACKER", 2),
	highlightIf: (state) => state.hasResourceExactly("GNB_REIGN_COMBO_TRACKER", 2),
});

makeAbility_GNB("CONTINUATION", 70, "cd_CONTINUATION", {
	replaceIf: [
		hypervelocityCondition,
		fatedBrandCondition,
		jugularRipCondition,
		abdomenTearCondition,
		eyeGougeCndition,
	],
	applicationDelay: 0,
	potency: 0,
	cooldown: 1,
	validateAttempt: (state) => false,
});

makeAbility_GNB("HYPERVELOCITY", 86, "cd_HYPERVELOCITY", {
	startOnHotbar: false,
	applicationDelay: 0.76,
	potency: 200,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_BLAST"),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_BLAST"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_BLAST");
	},
});

makeAbility_GNB("FATED_BRAND", 96, "cd_FATED_BRAND", {
	startOnHotbar: false,
	applicationDelay: 1.16,
	potency: 120,
	falloff: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_RAZE"),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_RAZE"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_RAZE");
	},
});

makeAbility_GNB("JUGULAR_RIP", 70, "cd_JUGULAR_RIP", {
	startOnHotbar: false,
	applicationDelay: 0.8,
	potency: 240,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_RIP"),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_RIP"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_RIP");
	},
});

makeAbility_GNB("ABDOMEN_TEAR", 70, "cd_ABDOMEN_TEAR", {
	startOnHotbar: false,
	applicationDelay: 0.76,
	potency: 280,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_TEAR"),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_TEAR"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_TEAR");
	},
});

makeAbility_GNB("EYE_GOUGE", 70, "cd_EYE_GOUGE", {
	startOnHotbar: false,
	applicationDelay: 0.98,
	potency: 320,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("READY_TO_GOUGE"),
	highlightIf: (state) => state.hasResourceAvailable("READY_TO_GOUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("READY_TO_GOUGE");
	},
});

makeAbility_GNB("DANGER_ZONE", 18, "cd_DANGER_ZONE", {
	autoUpgrade: {
		trait: "DANGER_ZONE_MASTERY",
		otherSkill: "BLASTING_ZONE",
	},
	applicationDelay: 0.62,
	potency: 250,
	cooldown: 30,
});

makeAbility_GNB("BLASTING_ZONE", 80, "cd_BLASTING_ZONE", {
	startOnHotbar: false,
	applicationDelay: 0.62,
	potency: 800,
	cooldown: 30,
});

makeAbility_GNB("BOW_SHOCK", 62, "cd_BOW_SHOCK", {
	applicationDelay: 0.62,
	potency: 150,
	falloff: 0,
	cooldown: 60,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("NO_MERCY")) {
			modifiers.push(Modifiers.NoMercy);
		}

		const tickPotency = 60;

		state.addDoTPotencies({
			node,
			effectName: "BOW_SHOCK_DOT",
			skillName: "BOW_SHOCK",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});
	},
	onApplication: (state, node) => state.applyDoT("BOW_SHOCK_DOT", node),
});

makeAbility_GNB("TRAJECTORY", 56, "cd_TRAJECTORY", {
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	cooldown: 30,
	maxCharges: 2,
	// Trajectory's application delay was changed from 0.22 to 0.66 at some point in DT
	applicationDelay: 0.66,
	drawsAggro: true,
});

makeAbility_GNB("HEART_OF_STONE", 68, "cd_HEART_OF_STONE", {
	autoUpgrade: {
		trait: "HEART_OF_STONE_MASTERY",
		otherSkill: "HEART_OF_CORUNDUM",
	},
	applicationDelay: 0.62,
	cooldown: 25,
	onApplication: (state) => {
		state.refreshBuff("HEART_OF_STONE", 0);
	},
});

makeAbility_GNB("HEART_OF_CORUNDUM", 82, "cd_HEART_OF_CORUNDUM", {
	startOnHotbar: false,
	applicationDelay: 0.62,
	cooldown: 25,
	onApplication: (state) => {
		state.refreshBuff("CATHARSIS_OF_CORUNDUM", 0);
		state.refreshBuff("HEART_OF_CORUNDUM", 0);
		state.refreshBuff("CLARITY_OF_CORUNDUM", 0);
	},
});

makeAbility_GNB("SUPERBOLIDE", 50, "cd_SUPERBOLIDE", {
	applicationDelay: 0,
	cooldown: 360,
	onConfirm: (state) => {
		state.refreshBuff("SUPERBOLIDE", 0);
	},
});

makeAbility_GNB("CAMOUFLAGE", 6, "cd_CAMOUFLAGE", {
	applicationDelay: 0.62,
	cooldown: 90,
	onConfirm: (state) => {
		state.refreshBuff("CAMOUFLAGE", 0);
	},
});

makeAbility_GNB("NEBULA", 38, "cd_NEBULA", {
	autoUpgrade: {
		trait: "NEBULA_MASTERY",
		otherSkill: "GREAT_NEBULA",
	},
	applicationDelay: 0.56,
	cooldown: 120,
	onConfirm: (state) => {
		state.refreshBuff("NEBULA", 0);
	},
});

makeAbility_GNB("GREAT_NEBULA", 38, "cd_GREAT_NEBULA", {
	startOnHotbar: false,
	applicationDelay: 0.56,
	cooldown: 120,
	onConfirm: (state) => {
		state.refreshBuff("GREAT_NEBULA", 0);
	},
});

makeAbility_GNB("HEART_OF_LIGHT", 64, "cd_HEART_OF_LIGHT", {
	applicationDelay: 0.62,
	cooldown: 60,
	onConfirm: (state) => {
		state.refreshBuff("HEART_OF_LIGHT", 0);
	},
});

makeAbility_GNB("AURORA", 45, "cd_AURORA", {
	applicationDelay: 0.62,
	cooldown: 60,
	onConfirm: (state) => {
		state.refreshBuff("AURORA", 0);
	},
	maxCharges: 2,
});

makeAbility_GNB("ROYAL_GUARD", 10, "cd_ROYAL_GUARD", {
	applicationDelay: 0,
	cooldown: 2,
	validateAttempt: (state) => !state.hasResourceAvailable("ROYAL_GUARD"),
	onConfirm: (state) => {
		state.resources.get("ROYAL_GUARD").gain(1);
	},
	replaceIf: [releaseRoyalGuardCondition],
	secondaryCooldown: {
		cdName: "cd_RELEASE_ROYAL_GUARD",
		cooldown: 1,
		maxCharges: 1,
	},
});

makeAbility_GNB("RELEASE_ROYAL_GUARD", 10, "cd_RELEASE_ROYAL_GUARD", {
	startOnHotbar: false,
	replaceIf: [royalGuardCondition],
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("ROYAL_GUARD"),
	onConfirm: (state) => {
		state.tryConsumeResource("ROYAL_GUARD");
	},
	secondaryCooldown: {
		cdName: "cd_ROYAL_GUARD",
		cooldown: 2,
		maxCharges: 1,
	},
});
