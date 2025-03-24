// Skill and state declarations for PLD

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { makeComboModifier, makeReqiescatModifier, Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	ResourceCalculationFn,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	Spell,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
	FAKE_SKILL_ANIMATION_LOCK,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { makeResource, CoolDown, Event, Resource, EventTag } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { PLDStatusPropsGenerator } from "../../Components/Jobs/PLD";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionKey, CooldownKey, ResourceKey, TraitKey } from "../Data";
import { PLDResourceKey, PLDActionKey, PLDCooldownKey } from "../Data/Jobs/PLD";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makePLDResource = (
	rsc: PLDResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("PLD", rsc, maxValue, params ?? {});
};

// TODO: get precise durations
makePLDResource("FIGHT_OR_FLIGHT", 1, { timeout: 20 });
makePLDResource("IRON_WILL", 1);
makePLDResource("OATH_GAUGE", 100);
makePLDResource("SHELTRON", 1, { timeout: 6 }); // TODO
makePLDResource("SENTINEL", 1, { timeout: 15 });
makePLDResource("COVER", 1, { timeout: 12 });
makePLDResource("CIRCLE_OF_SCORN_DOT", 1, { timeout: 15 });
makePLDResource("HALLOWED_GROUND", 1, { timeout: 10 });
makePLDResource("BULWARK", 1, { timeout: 10 });
makePLDResource("GORING_BLADE_READY", 1, { timeout: 30 });
makePLDResource("DIVINE_VEIL", 1, { timeout: 30 });
makePLDResource("ATONEMENT_READY", 1, { timeout: 30 });
makePLDResource("DIVINE_MIGHT", 1, { timeout: 30 });
makePLDResource("INTERVENTION", 1, { timeout: 8 }); // TODO??
makePLDResource("KNIGHTS_RESOLVE", 1, { timeout: 4 });
makePLDResource("KNIGHTS_BENEDICTION", 1, { timeout: 12 });
makePLDResource("REQUIESCAT", 4, { timeout: 30 });
makePLDResource("CONFITEOR_READY", 1, { timeout: 30 });
makePLDResource("PASSAGE_OF_ARMS", 1, { timeout: 18 });
makePLDResource("ARMS_UP", 1); // ???
makePLDResource("SUPPLICATION_READY", 1, { timeout: 30 });
makePLDResource("SEPULCHRE_READY", 1, { timeout: 30 });
makePLDResource("HOLY_SHELTRON", 1, { timeout: 8 });
makePLDResource("BLADE_OF_HONOR_READY", 1, { timeout: 30 });
makePLDResource("GUARDIAN", 1, { timeout: 15 });
makePLDResource("GUARDIANS_WILL", 1, { timeout: 15 });

makePLDResource("PLD_COMBO_TRACKER", 2, { timeout: 30 });
makePLDResource("PLD_CONFITEOR_COMBO_TRACKER", 3, { timeout: 30 });
makePLDResource("PLD_AOE_COMBO_TRACKER", 1, { timeout: 30 });

// makePLDResource("CAN_AUTO_ATTACK", 1);
// makePLDResource("AUTO_ATTACK_TRACKER", 1, { timeout: 3 }); // timer is 3 for now

const PLD_AOE_COMBO_MAP: Map<PLDActionKey, number> = new Map([
	["TOTAL_ECLIPSE", 0],
	["PROMINENCE", 1],
]);

const PLD_BASIC_COMBO_MAP: Map<PLDActionKey, number> = new Map([
	["FAST_BLADE", 0],
	["RIOT_BLADE", 1],
	["ROYAL_AUTHORITY", 2],
]);

const PLD_CONFITEOR_COMBO_MAP: Map<PLDActionKey, number> = new Map([
	["CONFITEOR", 0],
	["BLADE_OF_FAITH", 1],
	["BLADE_OF_TRUTH", 2],
	["BLADE_OF_VALOR", 3],
]);

const PLD_DIVINE_MIGHT_SPELLS: PLDActionKey[] = ["HOLY_SPIRIT", "HOLY_CIRCLE"];

// REQ/DM POTENCY MODIFIERS
/*
HOLY CIRCLE:
BASE: 100
DM: 200
REQ: 300

HOLY SPIRIT (NEVER/MM1/MM2)
BASE 300/350/400
DM: 400/.../500
REQ: 600/.../700

CONFITEOR: (NEVER/MM2)
BASE: 420/500
REQ: .../1000

BOF: (NEVER/MM2)
BASE: .../260
REQ: .../760

BOT: (NEVER/MM2)
BASE: .../380
REQ: .../880

BOV: (NEVER/MM2)
BASE: .../500
REQ: .../1000
*/

// === JOB GAUGE AND STATE ===

export class PLDState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.resources.get("OATH_GAUGE").gain(100);
		this.autoAttackDelay = 2.5;

		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "CIRCLE_OF_SCORN_DOT",
						appliedBy: ["CIRCLE_OF_SCORN"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<PLDState> {
		return new PLDStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
			node.addBuff(BuffType.FightOrFlight);
		}
		const skillName = skill.name;
		if (
			this.hasResourceAvailable("DIVINE_MIGHT") &&
			(skillName === "HOLY_SPIRIT" || skillName === "HOLY_CIRCLE")
		) {
			node.addBuff(BuffType.DivineMight);
		} else if (
			this.hasResourceAvailable("REQUIESCAT") &&
			(skillName === "HOLY_SPIRIT" ||
				skillName === "HOLY_CIRCLE" ||
				skillName === "CONFITEOR" ||
				skillName === "BLADE_OF_FAITH" ||
				skillName === "BLADE_OF_TRUTH" ||
				skillName === "BLADE_OF_VALOR")
		) {
			node.addBuff(BuffType.Requiescat);
		}
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource("PASSAGE_OF_ARMS");
	}

	override onAutoAttack(): void {
		console.log("auto at: " + (this.time - 5).toFixed(3));
		controller.reportMeditateTick(this.time, "auto");
		this.resources.get("OATH_GAUGE").gain(5);
	}

	captureSpellCastTime(name: ActionKey, baseCastTime: number): number {
		if (
			name !== "CLEMENCY" &&
			(this.hasResourceAvailable("DIVINE_MIGHT") || this.hasResourceAvailable("REQUIESCAT"))
		) {
			return 0;
		} else {
			return this.config.adjustedCastTime(baseCastTime);
		}
	}

	// consume requiescat if applicable
	tryConsumeRequiescat(spellName: PLDActionKey) {
		if (PLD_DIVINE_MIGHT_SPELLS.includes(spellName) || PLD_CONFITEOR_COMBO_MAP.has(spellName)) {
			this.tryConsumeResource("REQUIESCAT");
		}
	}

	// return true if holy spirit/circle is optimal
	isHolySpiritCircleGoodForReq() {
		const currentReqStacks = this.resources.get("REQUIESCAT").availableAmount();
		// low hanging fruit
		if (currentReqStacks === 0) {
			return false;
		} else if (this.hasResourceAvailable("PLD_CONFITEOR_COMBO_TRACKER")) {
			return false;
		} else {
			// check lvl 90+
			if (this.config.level >= 90) {
				return false;
				// check lvl 90 > x >= 80
			} else if (this.config.level >= 80) {
				return (
					!this.hasResourceAvailable("CONFITEOR_READY") ||
					(this.hasResourceAvailable("CONFITEOR_READY") && currentReqStacks > 1)
				);
				// check lvl 80 > x >= 70
			} else {
				return true;
			}
		}
	}

	// progresses specific combo
	progressComboTracker(
		skillName: PLDActionKey,
		comboResource: PLDResourceKey,
		comboMap: Map<PLDActionKey, number>,
	) {
		const maxCombo = this.resources.get(comboResource).maxValue;
		const comboPressed = comboMap.get(skillName) ?? -1;
		const comboTrackerValue = this.resources.get(comboResource).availableAmount();
		this.tryConsumeResource(comboResource, true);
		if (
			(comboPressed !== maxCombo && comboPressed === comboTrackerValue) ||
			comboPressed === 0
		) {
			this.resources.get(comboResource).gain(comboPressed + 1);
			this.enqueueResourceDrop(comboResource);
		}
	}

	// handle all basic + aoe combo (physical)
	fixPLDPhysicalComboState(skillName: PLDActionKey) {
		if (PLD_AOE_COMBO_MAP.has(skillName)) {
			this.tryConsumeResource("PLD_COMBO_TRACKER", true);
			this.progressComboTracker(skillName, "PLD_AOE_COMBO_TRACKER", PLD_AOE_COMBO_MAP);
		} else if (PLD_BASIC_COMBO_MAP.has(skillName)) {
			this.tryConsumeResource("PLD_AOE_COMBO_TRACKER", true);
			this.progressComboTracker(skillName, "PLD_COMBO_TRACKER", PLD_BASIC_COMBO_MAP);
		}
		// TODO: Does using a physical gcd break confiteor combo ?
	}

	// gain MANA on a delay according to skillName's applicationDelay
	getDelayedManaFromAction(manaToAdd: number, skillName: PLDActionKey) {
		this.addEvent(
			new Event(
				"get MP from riot blade",
				this.skillsList.get(skillName).applicationDelay,
				() => {
					this.resources.get("MANA").gain(manaToAdd);
				},
			),
		);
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

const makeWeaponskill_PLD = (
	name: PLDActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<PLDState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		recastTime?: number | ResourceCalculationFn<PLDState>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: ResourceKey;
			resourceValue: number;
		};
		falloff?: number;
		jobPotencyModifiers?: PotencyModifierFn<PLDState>;
		applicationDelay: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<PLDState>;
		onExecute?: EffectFn<PLDState>;
		onConfirm?: EffectFn<PLDState>;
		highlightIf?: StatePredicate<PLDState>;
		onApplication?: EffectFn<PLDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<PLDState> => {
	const onConfirm: EffectFn<PLDState> = combineEffects(params.onConfirm ?? NO_EFFECT, (state) => {
		// fix gcd combo state
		if (name !== "SHIELD_LOB" && name !== "SHIELD_BASH" && name !== "GORING_BLADE") {
			state.fixPLDPhysicalComboState(name);
		}
	});
	const onApplication: EffectFn<PLDState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyMod: PotencyModifierFn<PLDState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill("PLD", name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		onApplication: onApplication,
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

			if (state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
				mods.push(Modifiers.FightOrFlight);
			}
			return mods;
		},
	});
};

const makeSpell_PLD = (
	name: PLDActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<PLDState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<PLDState>;
		baseCastTime: number;
		baseRecastTime?: number;
		baseManaCost?: number;
		basePotency?: number | Array<[TraitKey, number]>;
		reqPotency?: number | Array<[TraitKey, number]>;
		jobPotencyModifiers?: PotencyModifierFn<PLDState>;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<PLDState>;
		onConfirm?: EffectFn<PLDState>;
		onApplication?: EffectFn<PLDState>;
		onExecute?: EffectFn<PLDState>;
		startsAuto?: boolean;
	},
): Spell<PLDState> => {
	const baseCastTime = params.baseCastTime ?? 0;
	const baseRecastTime = params.baseRecastTime ?? 2.5;
	let onConfirm: EffectFn<PLDState> = combineEffects((state, node) => {
		// first try consuming divine might
		// next try consuming requiescat
		const isDivineMightFirst =
			state.hasResourceAvailable("DIVINE_MIGHT") && PLD_DIVINE_MIGHT_SPELLS.includes(name);
		if (isDivineMightFirst) {
			state.tryConsumeResource("DIVINE_MIGHT");
		} else {
			state.tryConsumeRequiescat(name);
		}
	}, params.onConfirm ?? NO_EFFECT);
	const onApplication: EffectFn<PLDState> = params.onApplication ?? NO_EFFECT;
	let onExecute: EffectFn<PLDState> = combineEffects((state, node) => {
		// pass
	}, params.onExecute ?? NO_EFFECT);
	return makeSpell("PLD", name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		highlightIf: params.highlightIf,
		castTime: (state) => state.captureSpellCastTime(name, params.baseCastTime),
		recastTime: (state) => state.config.adjustedGCD(),
		manaCost: params.baseManaCost ?? 0,
		potency: params.basePotency,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (
				PLD_DIVINE_MIGHT_SPELLS.includes(name) &&
				state.hasResourceAvailable("DIVINE_MIGHT")
			) {
				mods.push(Modifiers.DivineMight);
			} else if (
				(PLD_DIVINE_MIGHT_SPELLS.includes(name) || PLD_CONFITEOR_COMBO_MAP.has(name)) &&
				state.hasResourceAvailable("REQUIESCAT")
			) {
				if (params.reqPotency) {
					mods.push(
						makeReqiescatModifier(
							getBasePotency(state, params.reqPotency) -
								getBasePotency(state, params.basePotency),
						),
					);
				}
			}
			if (name !== "CLEMENCY" && state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
				mods.push(Modifiers.FightOrFlight);
			}
			if (params.jobPotencyModifiers) {
				mods.push(...params.jobPotencyModifiers(state));
			}
			return mods;
		},
		falloff: params.falloff,
		validateAttempt: params.validateAttempt,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => {
			return (
				name !== "CLEMENCY" &&
				(state.hasResourceAvailable("DIVINE_MIGHT") ||
					state.hasResourceAvailable("REQUIESCAT"))
			);
		},
		onConfirm: onConfirm,
		onApplication: onApplication,
		onExecute: onExecute,
		startsAuto: params.startsAuto,
	});
};

const makeAbility_PLD = (
	name: PLDActionKey,
	unlockLevel: number,
	cdName: PLDCooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		falloff?: number;
		replaceIf?: ConditionalSkillReplace<PLDState>[];
		highlightIf?: StatePredicate<PLDState>;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<PLDState>;
		onConfirm?: EffectFn<PLDState>;
		onApplication?: EffectFn<PLDState>;
		onExecute?: EffectFn<PLDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<PLDState> => {
	return makeAbility("PLD", name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
				mods.push(Modifiers.FightOrFlight);
			}
			return mods;
		},
	});
};

const makeResourceAbility_PLD = (
	name: PLDActionKey,
	unlockLevel: number,
	cdName: PLDCooldownKey,
	params: {
		rscType: PLDResourceKey;
		cooldown: number;
		applicationDelay: number;
		onExecute?: EffectFn<PLDState>;
	},
): Ability<PLDState> => {
	return makeResourceAbility("PLD", name, unlockLevel, cdName, {
		...params,
		rscType: params.rscType,
		cooldown: params.cooldown,
		applicationDelay: params.applicationDelay,
	});
};

const atonementCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "ATONEMENT",
	condition: (state) => state.hasResourceAvailable("ATONEMENT_READY"),
};

const supplicationCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "SUPPLICATION",
	condition: (state) => state.hasResourceAvailable("SUPPLICATION_READY"),
};

const sepulchreCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "SEPULCHRE",
	condition: (state) => state.hasResourceAvailable("SEPULCHRE_READY"),
};

const confiteorCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "CONFITEOR",
	condition: (state) =>
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").availableAmount() === 0,
};

const bladeOfFaithCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "BLADE_OF_FAITH",
	condition: (state) =>
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").availableAmount() === 1,
};

const bladeOfTruthCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "BLADE_OF_TRUTH",
	condition: (state) =>
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").availableAmount() === 2,
};

const bladeOfValorCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "BLADE_OF_VALOR",
	condition: (state) =>
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").availableAmount() === 3,
};

const bladeOfHonorCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "BLADE_OF_HONOR",
	condition: (state) => state.hasResourceAvailable("BLADE_OF_HONOR_READY"),
};

const imperatorCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "IMPERATOR",
	condition: (state) => !state.hasResourceAvailable("BLADE_OF_HONOR_READY"),
};

const ironWillCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "IRON_WILL",
	condition: (state) => !state.hasResourceAvailable("IRON_WILL"),
};

const releaseIronWillCondition: ConditionalSkillReplace<PLDState> = {
	newSkill: "RELEASE_IRON_WILL",
	condition: (state) => state.hasResourceAvailable("IRON_WILL"),
};

makeWeaponskill_PLD("SHIELD_LOB", 15, {
	potency: 100,
	applicationDelay: 0.89,
	onConfirm: (state) => {
		// state.startAutoAttackTimer();
	},
});

makeWeaponskill_PLD("FAST_BLADE", 1, {
	potency: [
		["NEVER", 150],
		["MELEE_MASTERY_TANK", 200],
		["MELEE_MASTERY_II_TANK", 220],
	],
	applicationDelay: 0.62,
});

makeWeaponskill_PLD("RIOT_BLADE", 4, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 140],
		["MELEE_MASTERY_II_TANK", 170],
	],
	combo: {
		potency: [
			["NEVER", 260],
			["MELEE_MASTERY_TANK", 300],
			["MELEE_MASTERY_II_TANK", 330],
		],
		resource: "PLD_COMBO_TRACKER",
		resourceValue: 1,
	},
	highlightIf: (state) => state.resources.get("PLD_COMBO_TRACKER").availableAmount() === 1,
	applicationDelay: 0.76,
	onConfirm: (state) => {
		if (state.resources.get("PLD_COMBO_TRACKER").availableAmount() === 1) {
			state.getDelayedManaFromAction(1000, "RIOT_BLADE");
		}
	},
});

makeWeaponskill_PLD("ROYAL_AUTHORITY", 60, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_TANK", 140],
		["MELEE_MASTERY_II_TANK", 200],
	],
	combo: {
		potency: [
			["NEVER", 360],
			["MELEE_MASTERY_TANK", 400],
			["MELEE_MASTERY_II_TANK", 460],
		],
		resource: "PLD_COMBO_TRACKER",
		resourceValue: 2,
	},
	highlightIf: (state) => state.resources.get("PLD_COMBO_TRACKER").availableAmount() === 2,
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.resources.get("PLD_COMBO_TRACKER").availableAmount() === 2) {
			state.refreshBuff("DIVINE_MIGHT", 0);
			if (state.hasTraitUnlocked("SWORD_OATH")) {
				state.refreshBuff("ATONEMENT_READY", 0);
				state.tryConsumeResource("SUPPLICATION_READY");
				state.tryConsumeResource("SEPULCHRE_READY");
			}
		}
	},
});

makeWeaponskill_PLD("ATONEMENT", 76, {
	replaceIf: [supplicationCondition, sepulchreCondition],
	potency: [
		["NEVER", 360],
		["MELEE_MASTERY_TANK", 400],
		["MELEE_MASTERY_II_TANK", 460],
	],
	applicationDelay: 1.26,
	validateAttempt: (state) => state.hasResourceAvailable("ATONEMENT_READY"),
	highlightIf: (state) => state.hasResourceAvailable("ATONEMENT_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("ATONEMENT_READY");
		state.refreshBuff("SUPPLICATION_READY", 0);
		state.getDelayedManaFromAction(400, "ATONEMENT");
	},
});

makeWeaponskill_PLD("SUPPLICATION", 76, {
	startOnHotbar: false,
	replaceIf: [atonementCondition, sepulchreCondition],
	potency: [
		["NEVER", 380],
		["MELEE_MASTERY_TANK", 420],
		["MELEE_MASTERY_II_TANK", 500],
	],
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable("SUPPLICATION_READY"),
	highlightIf: (state) => state.hasResourceAvailable("SUPPLICATION_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("SUPPLICATION_READY");
		state.refreshBuff("SEPULCHRE_READY", 0);
		state.getDelayedManaFromAction(400, "SUPPLICATION");
	},
});

makeWeaponskill_PLD("SEPULCHRE", 76, {
	startOnHotbar: false,
	replaceIf: [atonementCondition, supplicationCondition],
	potency: [
		["NEVER", 400],
		["MELEE_MASTERY_TANK", 440],
		["MELEE_MASTERY_II_TANK", 540],
	],
	applicationDelay: 1.29,
	validateAttempt: (state) => state.hasResourceAvailable("SEPULCHRE_READY"),
	highlightIf: (state) => state.hasResourceAvailable("SEPULCHRE_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("SEPULCHRE_READY");
		state.getDelayedManaFromAction(400, "SEPULCHRE");
	},
});

makeWeaponskill_PLD("TOTAL_ECLIPSE", 6, {
	potency: 100,
	applicationDelay: 0.76,
	falloff: 0,
});

makeWeaponskill_PLD("PROMINENCE", 40, {
	potency: 100,
	combo: {
		potency: 170,
		resource: "PLD_AOE_COMBO_TRACKER",
		resourceValue: 1,
	},
	applicationDelay: 0.62,
	falloff: 0,
	highlightIf: (state) => state.resources.get("PLD_AOE_COMBO_TRACKER").availableAmount() === 1,
	onConfirm: (state) => {
		if (
			state.resources.get("PLD_AOE_COMBO_TRACKER").availableAmount() === 1 &&
			state.hasTraitUnlocked("ENHANCED_PROMINENCE")
		) {
			state.refreshBuff("DIVINE_MIGHT", 0);
			state.getDelayedManaFromAction(500, "PROMINENCE");
		}
	},
});

makeSpell_PLD("HOLY_SPIRIT", 64, {
	baseCastTime: 1.5,
	applicationDelay: 0.76,
	baseManaCost: 1000,
	startsAuto: true,
	basePotency: [
		["NEVER", 300],
		["MELEE_MASTERY_TANK", 350],
		["MELEE_MASTERY_II_TANK", 400],
	],
	reqPotency: [
		["NEVER", 600],
		["MELEE_MASTERY_TANK", 650],
		["MELEE_MASTERY_II_TANK", 700],
	],
	highlightIf: (state) =>
		state.hasResourceAvailable("DIVINE_MIGHT") || state.isHolySpiritCircleGoodForReq(),
});

makeSpell_PLD("HOLY_CIRCLE", 72, {
	baseCastTime: 1.5,
	applicationDelay: 0.62,
	baseManaCost: 1000,
	basePotency: 100,
	reqPotency: 300,
	falloff: 0,
	highlightIf: (state) =>
		state.hasResourceAvailable("DIVINE_MIGHT") || state.isHolySpiritCircleGoodForReq(),
});

makeWeaponskill_PLD("GORING_BLADE", 54, {
	applicationDelay: 0.53,
	potency: 700,
	validateAttempt: (state) => state.hasResourceAvailable("GORING_BLADE_READY"),
	highlightIf: (state) => state.hasResourceAvailable("GORING_BLADE_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("GORING_BLADE_READY");
	},
});

makeSpell_PLD("CONFITEOR", 80, {
	replaceIf: [bladeOfFaithCondition, bladeOfTruthCondition, bladeOfValorCondition],
	baseCastTime: 0,
	applicationDelay: 0.62,
	baseManaCost: 1000,
	basePotency: [
		["NEVER", 420],
		["MELEE_MASTERY_II_TANK", 500],
	], // TODO NEVER POT
	reqPotency: [
		["NEVER", 920],
		["MELEE_MASTERY_II_TANK", 1000],
	], // TODO NEVER POT
	falloff: 0.5,
	validateAttempt: (state) => state.hasResourceAvailable("CONFITEOR_READY"),
	highlightIf: (state) => state.hasResourceAvailable("CONFITEOR_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("CONFITEOR_READY");
		state.tryConsumeResource("PLD_CONFITEOR_COMBO_TRACKER", true);
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").gain(1);
		state.enqueueResourceDrop("PLD_CONFITEOR_COMBO_TRACKER");
	},
});

makeSpell_PLD("BLADE_OF_FAITH", 90, {
	replaceIf: [confiteorCondition, bladeOfTruthCondition, bladeOfValorCondition],
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 1000,
	applicationDelay: 0.62,
	basePotency: [
		["NEVER", 220],
		["MELEE_MASTERY_II_TANK", 260],
	], // TODO NEVER POT
	reqPotency: [
		["NEVER", 720],
		["MELEE_MASTERY_II_TANK", 760],
	], // TODO NEVER POT
	falloff: 0.5,
	validateAttempt: (state) => bladeOfFaithCondition.condition(state),
	highlightIf: (state) => bladeOfFaithCondition.condition(state),
	onConfirm: (state) => {
		state.tryConsumeResource("PLD_CONFITEOR_COMBO_TRACKER", true);
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").gain(2);
		state.enqueueResourceDrop("PLD_CONFITEOR_COMBO_TRACKER");
	},
});

makeSpell_PLD("BLADE_OF_TRUTH", 90, {
	replaceIf: [confiteorCondition, bladeOfFaithCondition, bladeOfValorCondition],
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 1000,
	applicationDelay: 0.89,
	basePotency: [
		["NEVER", 320],
		["MELEE_MASTERY_II_TANK", 380],
	], // TODO NEVER POT
	reqPotency: [
		["NEVER", 820],
		["MELEE_MASTERY_II_TANK", 880],
	], // TODO NEVER POT
	falloff: 0.5,
	validateAttempt: (state) => bladeOfTruthCondition.condition(state),
	highlightIf: (state) => bladeOfTruthCondition.condition(state),
	onConfirm: (state) => {
		state.tryConsumeResource("PLD_CONFITEOR_COMBO_TRACKER", true);
		state.resources.get("PLD_CONFITEOR_COMBO_TRACKER").gain(3);
		state.enqueueResourceDrop("PLD_CONFITEOR_COMBO_TRACKER");
	},
});

makeSpell_PLD("BLADE_OF_VALOR", 90, {
	replaceIf: [confiteorCondition, bladeOfFaithCondition, bladeOfTruthCondition],
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 1000,
	applicationDelay: 0.89,
	basePotency: [
		["NEVER", 420],
		["MELEE_MASTERY_II_TANK", 500],
	], // TODO NEVER POT
	reqPotency: [
		["NEVER", 920],
		["MELEE_MASTERY_II_TANK", 1000],
	], // TODO NEVER POT
	falloff: 0.5,
	validateAttempt: (state) => bladeOfValorCondition.condition(state),
	highlightIf: (state) => bladeOfValorCondition.condition(state),
	onConfirm: (state) => {
		state.tryConsumeResource("PLD_CONFITEOR_COMBO_TRACKER", true);
		state.refreshBuff("BLADE_OF_HONOR_READY", 0);
	},
});

makeAbility_PLD("FIGHT_OR_FLIGHT", 2, "cd_FIGHT_OR_FLIGHT", {
	applicationDelay: 0.62,
	cooldown: 60,
	onConfirm: (state) => {
		state.refreshBuff("GORING_BLADE_READY", 0);
		state.refreshBuff("FIGHT_OR_FLIGHT", 0.62);
	},
});

makeAbility_PLD("REQUIESCAT", 68, "cd_REQUIESCAT", {
	autoUpgrade: {
		trait: "REQUIESCAT_MASTERY",
		otherSkill: "IMPERATOR",
	},
	applicationDelay: 0.62,
	cooldown: 60,
	potency: 320,
	onConfirm: (state) => {
		state.resources.get("REQUIESCAT").gain(4);
		state.enqueueResourceDrop("REQUIESCAT", 30);
		if (state.hasTraitUnlocked("ENHANCED_REQUIESCAT")) {
			state.refreshBuff("CONFITEOR_READY", 0);
		}
	},
});

makeAbility_PLD("IMPERATOR", 96, "cd_IMPERATOR", {
	autoDowngrade: {
		trait: "REQUIESCAT_MASTERY",
		otherSkill: "REQUIESCAT",
	},
	replaceIf: [bladeOfHonorCondition],
	applicationDelay: 1.29,
	cooldown: 60,
	potency: 580,
	falloff: 0.5,
	onConfirm: (state) => {
		state.resources.get("REQUIESCAT").gain(4);
		state.enqueueResourceDrop("REQUIESCAT", 30, 4);
		if (state.hasTraitUnlocked("ENHANCED_REQUIESCAT")) {
			state.refreshBuff("CONFITEOR_READY", 0);
		}
	},
});

makeAbility_PLD("BLADE_OF_HONOR", 100, "cd_BLADE_OF_HONOR", {
	startOnHotbar: false,
	cooldown: 1,
	replaceIf: [imperatorCondition],
	validateAttempt: bladeOfHonorCondition.condition,
	highlightIf: bladeOfHonorCondition.condition,
	applicationDelay: 1.16,
	potency: 1000,
	falloff: 0.5,
	onConfirm: (state) => {
		state.tryConsumeResource("BLADE_OF_HONOR_READY");
	},
});

makeAbility_PLD("SPIRITS_WITHIN", 30, "cd_SPIRITS_WITHIN", {
	autoUpgrade: {
		trait: "SPIRITS_WITHIN_MASTERY",
		otherSkill: "EXPIACION",
	},
	applicationDelay: 0.89,
	cooldown: 30,
	potency: 270,
	onConfirm: (state) => {
		state.getDelayedManaFromAction(500, "SPIRITS_WITHIN");
	},
});

makeAbility_PLD("EXPIACION", 86, "cd_EXPIACION", {
	autoDowngrade: {
		trait: "SPIRITS_WITHIN_MASTERY",
		otherSkill: "SPIRITS_WITHIN",
	},
	applicationDelay: 0.36,
	cooldown: 30,
	potency: 450,
	falloff: 0.6,
	onConfirm: (state) => {
		state.getDelayedManaFromAction(500, "EXPIACION");
	},
});

makeAbility_PLD("CIRCLE_OF_SCORN", 50, "cd_CIRCLE_OF_SCORN", {
	applicationDelay: 1.02,
	cooldown: 30,
	potency: 140,
	falloff: 0,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
			modifiers.push(Modifiers.FightOrFlight);
		}
		const tickPotency = 30;

		state.addDoTPotencies({
			node,
			effectName: "CIRCLE_OF_SCORN_DOT",
			skillName: "CIRCLE_OF_SCORN",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});

		state.addEvent(
			new Event("apply CoS dot", 1.02, () => {
				state.applyDoT("CIRCLE_OF_SCORN_DOT", node);
			}),
		);
	},
});

makeAbility_PLD("INTERVENE", 66, "cd_INTERVENE", {
	applicationDelay: 0.62,
	cooldown: 30,
	potency: 150,
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeSpell_PLD("CLEMENCY", 58, {
	baseCastTime: 1.5,
	applicationDelay: 0.62,
	baseManaCost: 2000,
	basePotency: 0,
});

makeAbility_PLD("SHELTRON", 35, "cd_SHELTRON", {
	autoUpgrade: {
		trait: "SHELTRON_MASTERY",
		otherSkill: "HOLY_SHELTRON",
	},
	validateAttempt: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	highlightIf: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	applicationDelay: 0,
	cooldown: 5,
	onConfirm: (state) => {
		state.resources.get("OATH_GAUGE").consume(50);
	},
});

makeAbility_PLD("HOLY_SHELTRON", 82, "cd_HOLY_SHELTRON", {
	autoDowngrade: {
		trait: "SHELTRON_MASTERY",
		otherSkill: "SHELTRON",
	},
	applicationDelay: 0,
	cooldown: 5,
	validateAttempt: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	highlightIf: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	onConfirm: (state) => {
		state.refreshBuff("HOLY_SHELTRON", 0);
		state.refreshBuff("KNIGHTS_RESOLVE", 0);
		state.refreshBuff("KNIGHTS_BENEDICTION", 0);
		state.resources.get("OATH_GAUGE").consume(50);
	},
});

makeAbility_PLD("INTERVENTION", 62, "cd_INTERVENTION", {
	applicationDelay: 0.8,
	cooldown: 10,
	validateAttempt: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	highlightIf: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	onConfirm: (state) => {
		state.resources.get("OATH_GAUGE").consume(50);
	},
});

makeResourceAbility_PLD("HALLOWED_GROUND", 50, "cd_HALLOWED_GROUND", {
	rscType: "HALLOWED_GROUND",
	applicationDelay: 0,
	cooldown: 420,
});

makeResourceAbility_PLD("BULWARK", 52, "cd_BULWARK", {
	rscType: "BULWARK",
	applicationDelay: 0,
	cooldown: 90,
});

makeAbility_PLD("SENTINEL", 38, "cd_SENTINEL", {
	autoUpgrade: {
		trait: "SENTINEL_MASTERY",
		otherSkill: "GUARDIAN",
	},
	applicationDelay: 0.53,
	cooldown: 120,
	onConfirm: (state) => {
		state.refreshBuff("SENTINEL", 0.53);
	},
});

makeAbility_PLD("GUARDIAN", 92, "cd_GUARDIAN", {
	autoDowngrade: {
		trait: "SENTINEL_MASTERY",
		otherSkill: "SENTINEL",
	},
	applicationDelay: 0.53,
	cooldown: 120,
	onConfirm: (state) => {
		state.refreshBuff("GUARDIAN", 0.53);
		state.refreshBuff("GUARDIANS_WILL", 0.53);
	},
});

makeAbility_PLD("DIVINE_VEIL", 56, "cd_DIVINE_VEIL", {
	applicationDelay: 0,
	cooldown: 90,
	onConfirm: (state) => {
		state.refreshBuff("DIVINE_VEIL", 0);
	},
});

makeAbility_PLD("PASSAGE_OF_ARMS", 70, "cd_PASSAGE_OF_ARMS", {
	applicationDelay: 0.62,
	// animationLock: ,
	cooldown: 120,
	onConfirm: (state) => {
		state.refreshBuff("PASSAGE_OF_ARMS", 0.62);
	},
});

makeAbility_PLD("COVER", 45, "cd_COVER", {
	applicationDelay: 0.62,
	cooldown: 120,
	validateAttempt: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	highlightIf: (state) => state.resources.get("OATH_GAUGE").availableAmount() >= 50,
	onConfirm: (state) => {
		state.resources.get("OATH_GAUGE").consume(50);
	},
});

makeAbility_PLD("IRON_WILL", 10, "cd_IRON_WILL", {
	applicationDelay: 0,
	cooldown: 2,
	validateAttempt: (state) => !state.hasResourceAvailable("IRON_WILL"),
	onConfirm: (state) => {
		state.resources.get("IRON_WILL").gain(1);
	},
	replaceIf: [releaseIronWillCondition],
	secondaryCooldown: {
		cdName: "cd_RELEASE_IRON_WILL",
		cooldown: 1,
		maxCharges: 1,
	},
});

makeAbility_PLD("RELEASE_IRON_WILL", 10, "cd_RELEASE_IRON_WILL", {
	startOnHotbar: false,
	replaceIf: [ironWillCondition],
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("IRON_WILL"),
	onConfirm: (state) => {
		state.tryConsumeResource("IRON_WILL");
	},
	secondaryCooldown: {
		cdName: "cd_IRON_WILL",
		cooldown: 2,
		maxCharges: 1,
	},
});

makeWeaponskill_PLD("SHIELD_BASH", 10, {
	potency: 100,
	applicationDelay: 0.45,
});

makeAbility_PLD("AUTO_ATTACK", 1, "cd_AUTO_ATTACK", {
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 0,
	onConfirm: (state) => {
		const currentTimer = state.findAutoAttackTimerInQueue();
		if (state.resources.get("AUTOS_ENGAGED").availableAmount() === 0) {
			// toggle autos ON
			state.startAutoAttackTimer(currentTimer === -1 ? 3 : currentTimer);
		} else {
			// toggle autos OFF
			state.resources.get("AUTOS_ENGAGED").consume(1);
			if (currentTimer !== -1) {
				// create a new event that turns on stored auto at the end
				state.removeAutoAttackTimer();
				const event = new Event("aa tick", currentTimer, () => {
					if (state.resources.get("STORED_AUTO").available(0)) {
						state.resources.get("STORED_AUTO").gain(1);
					}
				});
				state.addEvent(event);
			}
		}
	},
});
