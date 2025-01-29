// Skill and state declarations for DRG

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { makeComboModifier, Modifiers, makePositionalModifier, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	ResourceCalculationFn,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { makeResource, CoolDown, Event, Resource } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { DRGStatusPropsGenerator } from "../../Components/Jobs/DRG";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionKey, CooldownKey, ResourceKey, TraitKey } from "../Data";
import { DRGResourceKey } from "../Data/Jobs/DRG";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makeDRGResource = (
	rsc: DRGResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("DRG", rsc, maxValue, params ?? {});
};

// TODO: get precise durations
makeDRGResource("POWER_SURGE", 1, { timeout: 30 });
makeDRGResource("LIFE_SURGE", 1, { timeout: 5 });
makeDRGResource("ENHANCED_PIERCING_TALON", 1, { timeout: 15 });
makeDRGResource("LANCE_CHARGE", 1, { timeout: 20 });
makeDRGResource("DIVE_READY", 1, { timeout: 15 });
makeDRGResource("CHAOS_THRUST_DOT", 1, { timeout: 24 });

makeDRGResource("BATTLE_LITANY", 1, { timeout: 20 });

makeDRGResource("LIFE_OF_THE_DRAGON", 1, { timeout: 20 });
makeDRGResource("NASTROND_READY", 1, { timeout: 20 });
makeDRGResource("DRACONIAN_FIRE", 1, { timeout: 30 });
makeDRGResource("CHAOTIC_SPRING_DOT", 1, { timeout: 24 });
makeDRGResource("FIRSTMINDS_FOCUS", 2);
makeDRGResource("DRAGONS_FLIGHT", 1, { timeout: 30 });
makeDRGResource("STARCROSS_READY", 1, { timeout: 20 });

makeDRGResource("DRG_CHAOS_COMBO_TRACKER", 4, { timeout: 30 });
makeDRGResource("DRG_HEAVENS_COMBO_TRACKER", 4, { timeout: 30 });
makeDRGResource("DRG_AOE_COMBO_TRACKER", 2, { timeout: 30 });

// === JOB GAUGE AND STATE ===

const AOE_COMBO_SKILLS: ActionKey[] = [
	"DOOM_SPIKE",
	"SONIC_THRUST",
	"COERTHAN_TORMENT",
	"DRACONIAN_FURY",
];

const CHAOS_COMBO_MAP: Map<ActionKey, number> = new Map([
	["DISEMBOWEL", 1],
	["SPIRAL_BLOW", 1],
	["CHAOS_THRUST", 2],
	["CHAOTIC_SPRING", 2],
	["WHEELING_THRUST", 3],
]);

const HEAVENS_COMBO_MAP: Map<ActionKey, number> = new Map([
	["VORPAL_THRUST", 1],
	["LANCE_BARRAGE", 1],
	["FULL_THRUST", 2],
	["HEAVENS_THRUST", 2],
	["FANG_AND_CLAW", 3],
]);

export class DRGState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Winged Glide Stacks
		const wingedGlideStacks = this.hasTraitUnlocked("ENHANCED_WINGED_GLIDE") ? 2 : 1;
		const lifeSurgeStacks = this.hasTraitUnlocked("ENHANCED_LIFE_SURGE") ? 2 : 1;
		[
			new CoolDown("cd_WINGED_GLIDE", 60, wingedGlideStacks, wingedGlideStacks),
			new CoolDown("cd_LIFE_SURGE", 40, lifeSurgeStacks, lifeSurgeStacks),
		].forEach((cd) => this.cooldowns.set(cd));

		this.registerRecurringEvents([
			{
				groupedDots: [
					{
						dotName: "CHAOS_THRUST_DOT",
						appliedBy: ["CHAOS_THRUST"],
					},
				],
			},
			{
				groupedDots: [
					{
						dotName: "CHAOTIC_SPRING_DOT",
						appliedBy: ["CHAOTIC_SPRING"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<DRGState> {
		return new DRGStatusPropsGenerator(this);
	}

	override jobSpecificRegisterRecurringEvents() {
		let dropStarcrossOutsideLife = (rsc: Resource) => {
			// console.log("out of life: " + !this.hasResourceAvailable("LIFE_OF_THE_DRAGON"));
			// console.log("has starcross: " + this.hasResourceAvailable("STARCROSS_READY"));
			if (!this.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
				if (rsc.available(1)) {
					// console.log("no life");
					this.tryConsumeResource("STARCROSS_READY");
					// controller.reportWarning(WarningType.DropStarcross)
				}
			}
			this.resources.addResourceEvent({
				rscType: "STARCROSS_READY",
				name: "drop starcross outside life of the dragon",
				fnOnRsc: dropStarcrossOutsideLife,
				delay: 1,
			});
		};
		dropStarcrossOutsideLife(this.resources.get("STARCROSS_READY"));
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("POWER_SURGE")) {
			node.addBuff(BuffType.PowerSurge);
		}
		if (this.hasResourceAvailable("LANCE_CHARGE")) {
			node.addBuff(BuffType.LanceCharge);
		}
		if (this.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
			node.addBuff(BuffType.LifeOfTheDragon);
		}
		if (this.hasResourceAvailable("BATTLE_LITANY")) {
			node.addBuff(BuffType.BattleLitany);
		}
		if (this.hasResourceAvailable("ENHANCED_PIERCING_TALON")) {
			node.addBuff(BuffType.EnhancedPiercingTalon);
		}
		if (this.hasResourceAvailable("LIFE_SURGE")) {
			node.addBuff(BuffType.LifeSurge);
		}
	}

	// handle all DRG combo abilities and combo states
	fixDRGComboState(skillName: ActionKey) {
		// consume draconian fire
		this.tryConsumeResource("DRACONIAN_FIRE", true);

		let resType: DRGResourceKey = "DRG_AOE_COMBO_TRACKER";
		// HANDLE AOE DIFFERENTLY
		if (AOE_COMBO_SKILLS.includes(skillName)) {
			// reset chaos and heavens thrust combo trackers
			this.tryConsumeResource("DRG_CHAOS_COMBO_TRACKER", true);
			this.tryConsumeResource("DRG_HEAVENS_COMBO_TRACKER", true);
			if (skillName === "DOOM_SPIKE" || skillName === "DRACONIAN_FURY") {
				this.tryConsumeResource(resType, true);
				this.resources.get(resType).gain(1);
				this.enqueueResourceDrop(resType);
			} else if (skillName === "SONIC_THRUST") {
				if (this.resources.get(resType).availableAmount() === 1) {
					this.resources.get(resType).gain(1);
					this.enqueueResourceDrop(resType);
				} else {
					this.tryConsumeResource(resType, true);
				}
			} else if (skillName === "COERTHAN_TORMENT") {
				this.tryConsumeResource(resType, true);
			}
			return;
		}

		this.tryConsumeResource("DRG_AOE_COMBO_TRACKER", true);

		// true/raiden thrust
		if (skillName === "TRUE_THRUST" || skillName === "RAIDEN_THRUST") {
			// reset combos
			this.tryConsumeResource("DRG_CHAOS_COMBO_TRACKER", true);
			this.tryConsumeResource("DRG_HEAVENS_COMBO_TRACKER", true);

			// start the two branching combos
			this.resources.get("DRG_CHAOS_COMBO_TRACKER").gain(1);
			this.enqueueResourceDrop("DRG_CHAOS_COMBO_TRACKER");
			this.resources.get("DRG_HEAVENS_COMBO_TRACKER").gain(1);
			this.enqueueResourceDrop("DRG_HEAVENS_COMBO_TRACKER");

			return;
		}

		let combo_value = -1;
		// chaos combo
		if (CHAOS_COMBO_MAP.has(skillName)) {
			this.tryConsumeResource("DRG_HEAVENS_COMBO_TRACKER", true);
			resType = "DRG_CHAOS_COMBO_TRACKER";
			combo_value = CHAOS_COMBO_MAP.get(skillName)
				? Number(CHAOS_COMBO_MAP.get(skillName))
				: -1;
		}
		// heavens combo
		else if (HEAVENS_COMBO_MAP.has(skillName)) {
			this.tryConsumeResource("DRG_CHAOS_COMBO_TRACKER", true);
			resType = "DRG_HEAVENS_COMBO_TRACKER";
			combo_value = HEAVENS_COMBO_MAP.get(skillName)
				? Number(HEAVENS_COMBO_MAP.get(skillName))
				: -1;
		}
		// drakes bane
		else if (skillName === "DRAKESBANE") {
			this.tryConsumeResource("DRG_HEAVENS_COMBO_TRACKER", true);
			this.tryConsumeResource("DRG_CHAOS_COMBO_TRACKER", true);
			return;
		}

		if (this.resources.get(resType).availableAmount() === combo_value) {
			this.resources.get(resType).gain(1);
			this.enqueueResourceDrop(resType);
		} else {
			this.tryConsumeResource(resType, true);
		}
	}

	// Return true if the active combo buff is up, or meikyo is active.
	// Does not advance the combo state.
	checkCombo(requiredCombo: DRGResourceKey): boolean {
		return this.hasResourceAvailable(requiredCombo);
	}

	// gain a scale
	gainScale(scales: number) {
		if (this.resources.get("FIRSTMINDS_FOCUS").availableAmount() + scales > 2) {
			controller.reportWarning(WarningType.ScaleOvercap);
		}
		this.resources.get("FIRSTMINDS_FOCUS").gain(scales);
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

const makeWeaponskill_DRG = (
	name: ActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<DRGState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		falloff?: number;
		recastTime?: number | ResourceCalculationFn<DRGState>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: DRGResourceKey;
			resourceValue: number;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			comboPotency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		jobPotencyModifiers?: PotencyModifierFn<DRGState>;
		applicationDelay?: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<DRGState>;
		onExecute?: EffectFn<DRGState>;
		onConfirm?: EffectFn<DRGState>;
		highlightIf?: StatePredicate<DRGState>;
		onApplication?: EffectFn<DRGState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<DRGState> => {
	const onConfirm: EffectFn<DRGState> = combineEffects(params.onConfirm ?? NO_EFFECT, (state) => {
		// fix gcd combo state
		if (name !== "PIERCING_TALON") {
			state.fixDRGComboState(name);
		}
		// remove life surge
		state.tryConsumeResource("LIFE_SURGE");
	});
	const onApplication: EffectFn<DRGState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyMod: PotencyModifierFn<DRGState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill("DRG", name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		onApplication: onApplication,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			/*
			const hitPositional =
				params.positional &&
				(state.hasResourceAvailable("TRUE_NORTH") ||
					(params.positional.location === "flank" &&
						state.hasResourceAvailable("FLANK_POSITIONAL")) ||
					(params.positional.location === "rear" &&
						state.hasResourceAvailable("REAR_POSITIONAL")));

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
            */
			const hitPositional =
				params.positional &&
				(state.hasResourceAvailable("TRUE_NORTH") ||
					(params.positional.location === "flank" &&
						state.hasResourceAvailable("FLANK_POSITIONAL")) ||
					(params.positional.location === "rear" &&
						state.hasResourceAvailable("REAR_POSITIONAL")));
			if (params.combo && state.checkCombo(params.combo.resource)) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
				// typescript isn't smart enough to elide the null check
				if (params.positional && hitPositional) {
					mods.push(
						makePositionalModifier(
							getBasePotency(state, params.positional.comboPotency) -
								getBasePotency(state, params.combo.potency),
						),
					);
				}
			} else if (params.positional && hitPositional) {
				mods.push(
					makePositionalModifier(
						getBasePotency(state, params.positional.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			if (state.hasResourceAvailable("POWER_SURGE")) {
				mods.push(Modifiers.PowerSurge);
			}
			if (state.hasResourceAvailable("LANCE_CHARGE")) {
				mods.push(Modifiers.LanceCharge);
			}
			if (state.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
				mods.push(Modifiers.LifeOfTheDragon);
			}
			if (state.hasResourceAvailable("BATTLE_LITANY")) {
				mods.push(Modifiers.BattleLitany);
			}
			if (
				name === "PIERCING_TALON" &&
				state.hasResourceAvailable("ENHANCED_PIERCING_TALON")
			) {
				mods.push(Modifiers.EnhancedPiercingTalon);
			}
			if (state.hasResourceAvailable("LIFE_SURGE")) {
				mods.push(Modifiers.AutoCrit);
			}

			return mods;
		},
	});
};

const makeAbility_DRG = (
	name: ActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		falloff?: number;
		replaceIf?: ConditionalSkillReplace<DRGState>[];
		highlightIf?: StatePredicate<DRGState>;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<DRGState>;
		onConfirm?: EffectFn<DRGState>;
		onApplication?: EffectFn<DRGState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<DRGState> => {
	return makeAbility("DRG", name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("POWER_SURGE")) {
				mods.push(Modifiers.PowerSurge);
			}
			if (state.hasResourceAvailable("LANCE_CHARGE")) {
				mods.push(Modifiers.LanceCharge);
			}
			if (state.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
				mods.push(Modifiers.LifeOfTheDragon);
			}
			if (state.hasResourceAvailable("BATTLE_LITANY")) {
				mods.push(Modifiers.BattleLitany);
			}
			return mods;
		},
	});
};

// DRG skill replacement conditions

const drakesbaneWheelingCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "DRAKESBANE",
	condition: (state) => state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 4,
};

const drakesbaneFangAndClawCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "DRAKESBANE",
	condition: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 4,
};

const raidenThrustCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "RAIDEN_THRUST",
	condition: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
};

const trueThrustCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "TRUE_THRUST",
	condition: (state) => !state.resources.get("DRACONIAN_FIRE").available(1),
};

const draconianFuryCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "DRACONIAN_FURY",
	condition: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
};

const doomSpikeCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "DOOM_SPIKE",
	condition: (state) => !state.resources.get("DRACONIAN_FIRE").available(1),
};

const starcrossCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "STARCROSS",
	condition: (state) =>
		state.hasResourceAvailable("STARCROSS_READY") &&
		state.hasResourceAvailable("LIFE_OF_THE_DRAGON"),
};

const stardiverCondition: ConditionalSkillReplace<DRGState> = {
	newSkill: "STARDIVER",
	condition: (state) => !state.hasResourceAvailable("STARCROSS_READY"),
};

// DRG skill declarations

makeWeaponskill_DRG("PIERCING_TALON", 15, {
	potency: [
		["NEVER", 150],
		["LANCE_MASTERY", 200],
	],
	applicationDelay: 0.85,
	onConfirm: (state) => {
		state.tryConsumeResource("ENHANCED_PIERCING_TALON");
	},
	highlightIf: (state) => state.hasResourceAvailable("ENHANCED_PIERCING_TALON"),
});

makeWeaponskill_DRG("TRUE_THRUST", 1, {
	replaceIf: [raidenThrustCondition],
	potency: [
		["NEVER", 200],
		["LANCE_MASTERY", 230],
	],
	applicationDelay: 0.76,
});

makeWeaponskill_DRG("RAIDEN_THRUST", 76, {
	startOnHotbar: false,
	replaceIf: [trueThrustCondition],
	potency: [
		["NEVER", 280],
		["MELEE_MASTERY_DRG", 320],
	],
	applicationDelay: 0.62,
	validateAttempt: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
	highlightIf: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("LANCE_MASTERY_III")) {
			state.gainScale(1);
		}
	},
});

makeWeaponskill_DRG("DISEMBOWEL", 18, {
	autoUpgrade: { trait: "LANCE_MASTERY_IV", otherSkill: "SPIRAL_BLOW" },
	applicationDelay: 1.65,
	potency: [
		["NEVER", 100],
		["LANCE_MASTERY", 140],
	],
	combo: {
		potency: [
			["NEVER", 220],
			["LANCE_MASTERY", 250],
		],
		resource: "DRG_CHAOS_COMBO_TRACKER",
		resourceValue: 1,
	},
	onConfirm: (state) => {
		if (state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 1) {
			state.refreshBuff("POWER_SURGE", 0);
		}
	},
	onApplication: (state) => {
		// DRG is weird with power surge
		// when disembowel is applied combo tracker should have already progressed
		if (state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 2) {
			state.refreshBuff("POWER_SURGE", 0);
		}
	},
	highlightIf: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 1,
});

makeWeaponskill_DRG("SPIRAL_BLOW", 96, {
	autoDowngrade: { trait: "LANCE_MASTERY_IV", otherSkill: "DISEMBOWEL" },
	applicationDelay: 1.38,
	potency: 140,
	combo: {
		potency: [["NEVER", 300]],
		resource: "DRG_CHAOS_COMBO_TRACKER",
		resourceValue: 1,
	},
	onConfirm: (state) => {
		if (state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 1) {
			state.refreshBuff("POWER_SURGE", 0);
		}
	},
	onApplication: (state) => {
		// DRG is weird with power surge
		// when spiral blow is applied combo tracker should have already progressed
		if (state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 2) {
			state.refreshBuff("POWER_SURGE", 0);
		}
	},
	highlightIf: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 1,
});

makeWeaponskill_DRG("CHAOS_THRUST", 50, {
	autoUpgrade: { trait: "LANCE_MASTERY_II", otherSkill: "CHAOTIC_SPRING" },
	applicationDelay: 0.45, // idk
	potency: 100,
	combo: {
		potency: 220,
		resource: "DRG_CHAOS_COMBO_TRACKER",
		resourceValue: 2,
	},
	positional: {
		potency: 140,
		comboPotency: 260,
		location: "rear",
	},
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("LANCE_CHARGE")) {
			modifiers.push(Modifiers.LanceCharge);
		}
		if (state.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
			modifiers.push(Modifiers.LifeOfTheDragon);
		}
		if (state.hasResourceAvailable("BATTLE_LITANY")) {
			modifiers.push(Modifiers.BattleLitany);
		}

		const tickPotency = 40;

		state.addDoTPotencies({
			node,
			dotName: "CHAOS_THRUST_DOT",
			skillName: "CHAOS_THRUST",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("CHAOS_THRUST_DOT", node);
	},
	highlightIf: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 2,
});

makeWeaponskill_DRG("CHAOTIC_SPRING", 86, {
	autoDowngrade: { trait: "LANCE_MASTERY_II", otherSkill: "CHAOS_THRUST" },
	applicationDelay: 0.45,
	potency: 140,
	combo: {
		potency: 300,
		resource: "DRG_CHAOS_COMBO_TRACKER",
		resourceValue: 2,
	},
	positional: {
		potency: 180,
		comboPotency: 340,
		location: "rear",
	},
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("LANCE_CHARGE")) {
			modifiers.push(Modifiers.LanceCharge);
		}
		if (state.hasResourceAvailable("LIFE_OF_THE_DRAGON")) {
			modifiers.push(Modifiers.LifeOfTheDragon);
		}
		if (state.hasResourceAvailable("BATTLE_LITANY")) {
			modifiers.push(Modifiers.BattleLitany);
		}

		const tickPotency = 45;

		state.addDoTPotencies({
			node,
			dotName: "CHAOTIC_SPRING_DOT",
			skillName: "CHAOTIC_SPRING",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("CHAOTIC_SPRING_DOT", node);
	},
	highlightIf: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 2,
});

makeWeaponskill_DRG("WHEELING_THRUST", 58, {
	replaceIf: [drakesbaneWheelingCondition],
	applicationDelay: 0.67,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_DRG", 140],
	],
	combo: {
		potency: [
			["NEVER", 260],
			["MELEE_MASTERY_DRG", 300],
		],
		resource: "DRG_CHAOS_COMBO_TRACKER",
		resourceValue: 3,
	},
	positional: {
		potency: [
			["NEVER", 140],
			["MELEE_MASTERY_DRG", 180],
		],
		comboPotency: [
			["NEVER", 300],
			["MELEE_MASTERY_DRG", 340],
		],
		location: "rear",
	},
	highlightIf: (state) => state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 3,
});

makeWeaponskill_DRG("VORPAL_THRUST", 4, {
	autoUpgrade: { trait: "LANCE_MASTERY_IV", otherSkill: "LANCE_BARRAGE" },
	applicationDelay: 1.02,
	potency: [
		["NEVER", 100],
		["LANCE_MASTERY", 130],
	],
	combo: {
		potency: [
			["NEVER", 250],
			["LANCE_MASTERY", 280],
		],
		resource: "DRG_HEAVENS_COMBO_TRACKER",
		resourceValue: 1,
	},
	highlightIf: (state) =>
		state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 1,
});

makeWeaponskill_DRG("LANCE_BARRAGE", 96, {
	autoDowngrade: { trait: "LANCE_MASTERY_IV", otherSkill: "VORPAL_THRUST" },
	applicationDelay: 0.94,
	potency: 130,
	combo: {
		potency: 340,
		resource: "DRG_HEAVENS_COMBO_TRACKER",
		resourceValue: 1,
	},
	highlightIf: (state) =>
		state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 1,
});

makeWeaponskill_DRG("FULL_THRUST", 26, {
	autoUpgrade: { trait: "LANCE_MASTERY_II", otherSkill: "HEAVENS_THRUST" },
	applicationDelay: 0.71,
	potency: 100,
	combo: {
		potency: 380,
		resource: "DRG_HEAVENS_COMBO_TRACKER",
		resourceValue: 2,
	},
	highlightIf: (state) =>
		state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 2,
});

makeWeaponskill_DRG("HEAVENS_THRUST", 86, {
	autoDowngrade: { trait: "LANCE_MASTERY_II", otherSkill: "FULL_THRUST" },
	applicationDelay: 0.71,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_DRG", 140],
	],
	combo: {
		potency: [
			["NEVER", 400],
			["MELEE_MASTERY_DRG", 440],
		],
		resource: "DRG_HEAVENS_COMBO_TRACKER",
		resourceValue: 2,
	},
	highlightIf: (state) =>
		state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 2,
});

makeWeaponskill_DRG("FANG_AND_CLAW", 56, {
	replaceIf: [drakesbaneFangAndClawCondition],
	applicationDelay: 0.62,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_DRG", 140],
	],
	combo: {
		potency: [
			["NEVER", 260],
			["MELEE_MASTERY_DRG", 300],
		],
		resource: "DRG_HEAVENS_COMBO_TRACKER",
		resourceValue: 3,
	},
	positional: {
		potency: [
			["NEVER", 140],
			["MELEE_MASTERY_DRG", 180],
		],
		comboPotency: [
			["NEVER", 300],
			["MELEE_MASTERY_DRG", 340],
		],
		location: "flank",
	},
	highlightIf: (state) =>
		state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 3,
});

makeWeaponskill_DRG("DRAKESBANE", 64, {
	startOnHotbar: false,
	applicationDelay: 1.0,
	potency: [
		["NEVER", 380],
		["LANCE_MASTERY_II", 400],
		["MELEE_MASTERY_DRG", 440],
	],
	validateAttempt: (state) => {
		return (
			state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 4 ||
			state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 4
		);
	},
	onConfirm: (state) => {
		if (
			state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 4 ||
			state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 4
		) {
			state.refreshBuff("DRACONIAN_FIRE", 0);
		}
	},
	highlightIf: (state) => {
		return (
			state.resources.get("DRG_CHAOS_COMBO_TRACKER").availableAmount() === 4 ||
			state.resources.get("DRG_HEAVENS_COMBO_TRACKER").availableAmount() === 4
		);
	},
});

makeWeaponskill_DRG("DOOM_SPIKE", 40, {
	replaceIf: [draconianFuryCondition],
	potency: 110,
	falloff: 0,
	applicationDelay: 1.29,
});

makeWeaponskill_DRG("DRACONIAN_FURY", 82, {
	replaceIf: [doomSpikeCondition],
	startOnHotbar: false,
	potency: 130,
	falloff: 0,
	applicationDelay: 0.76,
	validateAttempt: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
	highlightIf: (state) => state.resources.get("DRACONIAN_FIRE").available(1),
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("LANCE_MASTERY_III")) {
			state.gainScale(1);
		}
	},
});

makeWeaponskill_DRG("SONIC_THRUST", 62, {
	potency: 100,
	combo: {
		potency: 120,
		resource: "DRG_AOE_COMBO_TRACKER",
		resourceValue: 1,
	},
	falloff: 0,
	highlightIf: (state) => state.resources.get("DRG_AOE_COMBO_TRACKER").availableAmount() === 1,
	onConfirm: (state) => {
		if (state.resources.get("DRG_AOE_COMBO_TRACKER").availableAmount() === 1) {
			state.refreshBuff("POWER_SURGE", 0);
		}
	},
});

makeWeaponskill_DRG("COERTHAN_TORMENT", 72, {
	potency: 100,
	combo: {
		potency: 150,
		resource: "DRG_AOE_COMBO_TRACKER",
		resourceValue: 2,
	},
	falloff: 0,
	highlightIf: (state) => state.resources.get("DRG_AOE_COMBO_TRACKER").availableAmount() === 2,
	onConfirm: (state) => {
		if (
			state.hasTraitUnlocked("ENHANCED_COERTHAN_TORMENT") &&
			state.resources.get("DRG_AOE_COMBO_TRACKER").availableAmount() === 2
		) {
			state.refreshBuff("DRACONIAN_FIRE", 0);
		}
	},
});

makeResourceAbility("DRG", "LIFE_SURGE", 6, "cd_LIFE_SURGE", {
	rscType: "LIFE_SURGE",
	applicationDelay: 0,
	cooldown: 40,
	maxCharges: 2,
});

makeAbility_DRG("WYRMWIND_THRUST", 90, "cd_WYRMWIND_THRUST", {
	applicationDelay: 1.2,
	validateAttempt: (state) => state.resources.get("FIRSTMINDS_FOCUS").availableAmount() === 2,
	highlightIf: (state) => state.resources.get("FIRSTMINDS_FOCUS").availableAmount() === 2,
	potency: [
		["NEVER", 420],
		["MELEE_MASTERY_DRG", 440],
	],
	falloff: 0.5,
	cooldown: 10,
	onConfirm: (state) => {
		state.tryConsumeResource("FIRSTMINDS_FOCUS", true);
	},
});

makeResourceAbility("DRG", "LANCE_CHARGE", 30, "cd_LANCE_CHARGE", {
	rscType: "LANCE_CHARGE",
	applicationDelay: 0.62,
	cooldown: 60,
});

makeResourceAbility("DRG", "BATTLE_LITANY", 52, "cd_BATTLE_LITANY", {
	rscType: "BATTLE_LITANY",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeAbility_DRG("GEIRSKOGUL", 60, "cd_GEIRSKOGUL", {
	applicationDelay: 0.67,
	potency: [
		["NEVER", 200],
		["LANCE_MASTERY_III", 280],
	],
	falloff: 0.5,
	cooldown: 60,
	onConfirm: (state) => {
		state.refreshBuff("LIFE_OF_THE_DRAGON", 0);
		state.refreshBuff("NASTROND_READY", 0);
	},
});

makeAbility_DRG("NASTROND", 70, "cd_NASTROND", {
	applicationDelay: 0.76,
	potency: [
		["NEVER", 600],
		["LANCE_MASTERY_III", 720],
	],
	falloff: 0.5,
	cooldown: 2,
	validateAttempt: (state) =>
		state.resources.get("LIFE_OF_THE_DRAGON").available(1) &&
		state.resources.get("NASTROND_READY").available(1),
	highlightIf: (state) =>
		state.resources.get("LIFE_OF_THE_DRAGON").available(1) &&
		state.resources.get("NASTROND_READY").available(1),
	onConfirm: (state) => {
		state.tryConsumeResource("NASTROND_READY");
	},
});

makeAbility_DRG("JUMP", 30, "cd_JUMP", {
	autoUpgrade: {
		trait: "JUMP_MASTERY",
		otherSkill: "HIGH_JUMP",
	},
	applicationDelay: 0.49,
	animationLock: 0.8,
	potency: 320,
	cooldown: 30,
	onConfirm: (state) => {
		state.refreshBuff("DIVE_READY", 0.0);
	},
});

makeAbility_DRG("HIGH_JUMP", 74, "cd_HIGH_JUMP", {
	autoDowngrade: {
		trait: "JUMP_MASTERY",
		otherSkill: "JUMP",
	},
	applicationDelay: 0.49,
	animationLock: 0.8,
	potency: 400,
	cooldown: 30,
	onConfirm: (state) => {
		state.refreshBuff("DIVE_READY", 0.0);
	},
});

makeAbility_DRG("MIRAGE_DIVE", 68, "cd_MIRAGE_DIVE", {
	applicationDelay: 0.8,
	validateAttempt: (state) => state.hasResourceAvailable("DIVE_READY"),
	highlightIf: (state) => state.hasResourceAvailable("DIVE_READY"),
	potency: 380,
	cooldown: 1,
	onConfirm: (state) => {
		state.tryConsumeResource("DIVE_READY");
	},
});

makeAbility_DRG("DRAGONFIRE_DIVE", 50, "cd_DRAGONFIRE_DIVE", {
	applicationDelay: 0.8,
	animationLock: 0.8,
	potency: 500,
	falloff: 0.5,
	cooldown: 120,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_DRAGONFIRE_DIVE")) {
			state.refreshBuff("DRAGONS_FLIGHT", 0);
		}
	},
});

makeAbility_DRG("RISE_OF_THE_DRAGON", 92, "cd_RISE_OF_THE_DRAGON", {
	applicationDelay: 1.16,
	potency: 550,
	falloff: 0.5,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("DRAGONS_FLIGHT"),
	highlightIf: (state) => state.hasResourceAvailable("DRAGONS_FLIGHT"),
	onConfirm: (state) => {
		state.tryConsumeResource("DRAGONS_FLIGHT");
	},
});

makeAbility_DRG("STARDIVER", 80, "cd_STARDIVER", {
	replaceIf: [starcrossCondition],
	applicationDelay: 1.29,
	animationLock: 1.5,
	potency: [
		["NEVER", 720],
		["MELEE_MASTERY_DRG", 820],
	],
	falloff: 0.5,
	cooldown: 30,
	validateAttempt: (state) => state.hasResourceAvailable("LIFE_OF_THE_DRAGON"),
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_STARDIVER")) {
			state.refreshBuff("STARCROSS_READY", 0);
		}
	},
});

makeAbility_DRG("STARCROSS", 100, "cd_STARCROSS", {
	startOnHotbar: false,
	replaceIf: [stardiverCondition],
	applicationDelay: 0.98,
	potency: 1000,
	falloff: 0.5,
	cooldown: 1,
	validateAttempt: (state) =>
		state.hasResourceAvailable("STARCROSS_READY") &&
		state.hasResourceAvailable("LIFE_OF_THE_DRAGON"),
	highlightIf: (state) =>
		state.hasResourceAvailable("STARCROSS_READY") &&
		state.hasResourceAvailable("LIFE_OF_THE_DRAGON"),
	onConfirm: (state) => {
		state.tryConsumeResource("STARCROSS_READY");
	},
});

makeAbility_DRG("ELUSIVE_JUMP", 35, "cd_ELUSIVE_JUMP", {
	potency: 0,
	animationLock: 1.0,
	cooldown: 30,
	onConfirm: (state) => {
		state.refreshBuff("ENHANCED_PIERCING_TALON", 0);
	},
});

makeAbility_DRG("WINGED_GLIDE", 45, "cd_WINGED_GLIDE", {
	potency: 0,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	cooldown: 60,
	maxCharges: 2,
});
