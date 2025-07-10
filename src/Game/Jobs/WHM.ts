// Skill and state declarations for WHM.

import { WHMStatusPropsGenerator } from "../../Components/Jobs/WHM";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { BuffType } from "../Common";
import { TraitKey } from "../Data";
import { WHMActionKey, WHMCooldownKey, WHMResourceKey } from "../Data/Jobs/WHM";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { makeResource, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	ResourceCalculationFn,
	fnify,
	FAKE_SKILL_ANIMATION_LOCK,
} from "../Skills";
import { localize } from "../../Components/Localization";

const makeWHMResource = (
	rsc: WHMResourceKey,
	maxValue: number,
	params?: {
		timeout?: number;
		default?: number;
		warnOnTimeout?: boolean;
		warnOnOvercap?: boolean;
	},
) => {
	makeResource("WHM", rsc, maxValue, params ?? {});
};

// Gauge resources
makeWHMResource("LILLIES", 3);
makeWHMResource("LILY_TIMER", 1);
makeWHMResource("BLOOD_LILY", 3, { warnOnOvercap: true });

// Statuses
makeWHMResource("FREECURE", 1, { timeout: 15 });
makeWHMResource("PRESENCE_OF_MIND", 1, { timeout: 15 });
makeWHMResource("SACRED_SIGHT", 3, { timeout: 30, warnOnTimeout: true });
makeWHMResource("REGEN", 1, { timeout: 18 });
makeWHMResource("AERO_II", 1, { timeout: 30 });
makeWHMResource("MEDICA_II", 1, { timeout: 15 });
makeWHMResource("ASYLUM", 1, { timeout: 24 });
makeWHMResource("THIN_AIR", 1, { timeout: 12 });
makeWHMResource("DIVINE_BENISON", 1, { timeout: 15 });
makeWHMResource("CONFESSION", 1, { timeout: 10 });
makeWHMResource("DIA", 1, { timeout: 30 });
makeWHMResource("TEMPERANCE", 1, { timeout: 20 });
makeWHMResource("DIVINE_GRACE", 1, { timeout: 30 });
makeWHMResource("AQUAVEIL", 1, { timeout: 8 });
makeWHMResource("LITURGY_OF_THE_BELL", 5, { timeout: 20 });
makeWHMResource("MEDICA_III", 1, { timeout: 15 });
makeWHMResource("DIVINE_CARESS", 1, { timeout: 10 });
makeWHMResource("DIVINE_AURA", 1, { timeout: 15 });

export class WHMState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const benisonStacks = this.hasTraitUnlocked("ENHANCED_DIVINE_BENISON") ? 2 : 1;
		const tetraStacks = this.hasTraitUnlocked("ENHANCED_TETRAGRAMMATON") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_DIVINE_BENISON", 30, benisonStacks, benisonStacks));
		this.cooldowns.set(new CoolDown("cd_TETRAGRAMMATON", 60, tetraStacks, tetraStacks));

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Dia/Aero DoT", zh: "天辉/烈风DoT" }),
				groupedEffects: [
					{
						effectName: "AERO_II",
						appliedBy: ["AERO_II"],
					},
					{
						effectName: "DIA",
						appliedBy: ["DIA"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "DIVINE_AURA",
						appliedBy: ["DIVINE_CARESS"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "ASYLUM",
						appliedBy: ["ASYLUM"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "REGEN",
						appliedBy: ["REGEN"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "MEDICA_II",
						appliedBy: ["MEDICA_II"],
					},
					{
						effectName: "MEDICA_III",
						appliedBy: ["MEDICA_III"],
					},
				],
			},
		]);
	}

	override jobSpecificRegisterRecurringEvents() {
		if (this.isInCombat()) {
			// Start the lily timer immediately if combat was initiated by override
			this.startLilyTimer();
		}
	}

	override jobSpecificAddHealingBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasTraitUnlocked("ENHANCED_ASYLUM") && this.hasResourceAvailable("ASYLUM")) {
			node.addBuff(BuffType.Asylum);
		}

		if (this.hasResourceAvailable("TEMPERANCE")) {
			node.addBuff(BuffType.Temperance);
		}

		if (skill.cdName === "cd_GCD" && skill.aoeHeal && this.hasResourceAvailable("CONFESSION")) {
			node.addBuff(BuffType.Confession);
		}
	}

	startLilyTimer() {
		// If lily timer already running, do nothing.
		if (this.hasResourceAvailable("LILY_TIMER")) {
			return;
		}
		this.resources.get("LILY_TIMER").gain(1);
		const recurringLilyGain = () => {
			// Use a separate timer resource, since timers are cleared when a resource is cleared.
			this.resources.addResourceEvent({
				rscType: "LILY_TIMER",
				name: "gain lily",
				delay: 20,
				fnOnRsc: () => {
					this.resources.get("LILLIES").gain(1);
					recurringLilyGain();
				},
			});
		};
		recurringLilyGain();
	}

	// Modifiers that affect incoming heals on the player with the effect
	addHealingActionPotencyModifiers(modifiers: PotencyModifier[]) {
		if (this.hasTraitUnlocked("ENHANCED_ASYLUM") && this.hasResourceAvailable("ASYLUM")) {
			modifiers.push(Modifiers.Asylum);
		}
		if (this.hasResourceAvailable("TEMPERANCE")) {
			modifiers.push(Modifiers.Temperance);
		}
	}

	override get statusPropsGenerator(): StatusPropsGenerator<WHMState> {
		return new WHMStatusPropsGenerator(this);
	}
}

const makeWHMSpell = (
	name: WHMActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		startOnHotbar?: boolean;
		baseCastTime?: number;
		manaCost: number | ResourceCalculationFn<WHMState>;
		potency?: number | Array<[TraitKey, number]>;
		healingPotency?: number | Array<[TraitKey, number]>;
		aoeHeal?: boolean;
		falloff?: number;
		applicationDelay: number;
		replaceIf?: ConditionalSkillReplace<WHMState>[];
		highlightIf?: StatePredicate<WHMState>;
		validateAttempt?: StatePredicate<WHMState>;
		onConfirm?: EffectFn<WHMState>;
		onApplication?: EffectFn<WHMState>;
		animationLock?: number;
	},
): Spell<WHMState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<WHMState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("CONFESSION") && params.aoeHeal) {
			modifiers.push(Modifiers.Confession);
		}
		state.addHealingActionPotencyModifiers(modifiers);
		return modifiers;
	};

	return makeSpell("WHM", name, unlockLevel, {
		...params,
		castTime: (state) =>
			state.config.adjustedCastTime(
				params.baseCastTime ?? 0,
				state.hasResourceAvailable("PRESENCE_OF_MIND") ? 20 : 0,
			),
		recastTime: (state) =>
			state.config.adjustedGCD(2.5, state.hasResourceAvailable("PRESENCE_OF_MIND") ? 20 : 0),
		isInstantFn: (state) => !params.baseCastTime || state.hasResourceAvailable("SWIFTCAST"),
		manaCost: params.manaCost
			? (state) =>
					state.hasResourceAvailable("THIN_AIR") ? 0 : fnify(params.manaCost)(state)
			: undefined,
		jobHealingPotencyModifiers,
		onConfirm: combineEffects(
			(state) => state.tryConsumeResource("THIN_AIR"),
			params.baseCastTime ? (state) => state.tryConsumeResource("SWIFTCAST") : undefined,
			params.onConfirm,
		),
		onApplication: combineEffects(
			params.potency ? (state) => state.startLilyTimer() : undefined,
			params.onApplication,
		),
	});
};

const makeWHMAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: {
		startOnHotbar?: boolean;
		applicationDelay: number;
		cooldown: number;
		maxCharges?: number;
		potency?: number;
		falloff?: number;
		healingPotency?: number | ResourceCalculationFn<WHMState>;
		animationLock?: number;
		isPetHeal?: boolean;
		highlightIf?: StatePredicate<WHMState>;
		validateAttempt?: StatePredicate<WHMState>;
		onConfirm?: EffectFn<WHMState>;
		onApplication?: EffectFn<WHMState>;
	},
): Ability<WHMState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<WHMState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];
		if (params.isPetHeal) {
			modifiers.push(Modifiers.WhmPet);
		}
		state.addHealingActionPotencyModifiers(modifiers);
		return modifiers;
	};
	return makeAbility("WHM", name, unlockLevel, cdName, {
		...params,
		jobHealingPotencyModifiers,
	});
};

const makeWHMResourceAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: MakeResourceAbilityParams<WHMState>,
): Ability<WHMState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<WHMState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}
		const modifiers: PotencyModifier[] = [];
		state.addHealingActionPotencyModifiers(modifiers);
		return modifiers;
	};
	return makeResourceAbility("WHM", name, unlockLevel, cdName, {
		...params,
		jobHealingPotencyModifiers,
	});
};

makeWHMSpell("STONE_IV", 64, {
	autoUpgrade: {
		otherSkill: "GLARE",
		trait: "STONE_MASTERY_IV",
	},
	applicationDelay: 0.8,
	baseCastTime: 1.5,
	potency: 260,
	manaCost: 400,
});

makeWHMSpell("GLARE", 72, {
	autoDowngrade: {
		otherSkill: "STONE_IV",
		trait: "STONE_MASTERY_IV",
	},
	autoUpgrade: {
		otherSkill: "GLARE_III",
		trait: "GLARE_MASTERY",
	},
	applicationDelay: 1.29,
	baseCastTime: 1.5,
	potency: 290,
	manaCost: 400,
});

makeWHMSpell("GLARE_III", 82, {
	autoDowngrade: {
		otherSkill: "GLARE",
		trait: "GLARE_MASTERY",
	},
	applicationDelay: 1.29,
	baseCastTime: 1.5,
	potency: [
		["NEVER", 310],
		["WHITE_MAGIC_MASTERY", 340],
	],
	manaCost: 400,
});

makeWHMSpell("AERO_II", 46, {
	autoUpgrade: {
		otherSkill: "DIA",
		trait: "AERO_MASTERY_II",
	},
	applicationDelay: 1.15,
	potency: 50,
	manaCost: 200,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "AERO_II",
			skillName: "AERO_II",
			tickPotency: 50,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => state.applyDoT("AERO_II", node),
});

makeWHMSpell("DIA", 72, {
	autoDowngrade: {
		otherSkill: "AERO_II",
		trait: "AERO_MASTERY_II",
	},
	applicationDelay: 1.29,
	potency: [
		["NEVER", 65],
		["WHITE_MAGIC_MASTERY", 80],
	],
	manaCost: 400,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "DIA",
			skillName: "DIA",
			tickPotency: state.hasTraitUnlocked("WHITE_MAGIC_MASTERY") ? 80 : 65,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => state.applyDoT("DIA", node),
});

makeWHMSpell("HOLY", 45, {
	autoUpgrade: {
		otherSkill: "HOLY_III",
		trait: "HOLY_MASTERY",
	},
	applicationDelay: 2.13,
	potency: 140,
	baseCastTime: 1.5,
	falloff: 0,
	manaCost: 400,
});

makeWHMSpell("HOLY_III", 82, {
	autoDowngrade: {
		otherSkill: "HOLY",
		trait: "HOLY_MASTERY",
	},
	applicationDelay: 2.13,
	potency: 150,
	baseCastTime: 1.5,
	falloff: 0,
	manaCost: 400,
});

makeWHMSpell("AFFLATUS_MISERY", 74, {
	applicationDelay: 0.58,
	potency: [
		["NEVER", 1240],
		["WHITE_MAGIC_MASTERY", 1360],
	],
	falloff: 0.5,
	manaCost: 0,
	highlightIf: (state) => state.hasResourceExactly("BLOOD_LILY", 3),
	validateAttempt: (state) => state.hasResourceExactly("BLOOD_LILY", 3),
	onConfirm: (state) => state.tryConsumeResource("BLOOD_LILY", true),
});

makeWHMSpell("AFFLATUS_SOLACE", 52, {
	applicationDelay: 0.53,
	healingPotency: [
		["NEVER", 700],
		["ENHANCED_HEALING_MAGIC", 800],
	],
	manaCost: 0,
	validateAttempt: (state) => state.hasResourceAvailable("LILLIES"),
	onConfirm: (state) => {
		state.tryConsumeResource("LILLIES");
		state.resources.get("BLOOD_LILY").gain(1);
	},
});

makeWHMSpell("AFFLATUS_RAPTURE", 76, {
	applicationDelay: 0.58,
	healingPotency: [
		["NEVER", 300],
		["ENHANCED_HEALING_MAGIC", 400],
	],
	manaCost: 0,
	aoeHeal: true,
	validateAttempt: (state) => state.hasResourceAvailable("LILLIES"),
	onConfirm: (state) => {
		state.tryConsumeResource("LILLIES");
		state.resources.get("BLOOD_LILY").gain(1);
	},
});

makeWHMSpell("REGEN", 35, {
	applicationDelay: 1.02,
	healingPotency: [
		["NEVER", 200],
		["ENHANCED_HEALING_MAGIC", 250],
	],
	manaCost: 400,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "REGEN",
			effectName: "REGEN",
			speedStat: "sps",
			tickPotency: state.hasTraitUnlocked("ENHANCED_HEALING_MAGIC") ? 250 : 200,
		});
	},
	onApplication: (state, node) => {
		state.applyHoT("REGEN", node);
		state.gainStatus("REGEN");
	},
});

makeWHMSpell("CURE", 2, {
	applicationDelay: 1.03,
	healingPotency: [
		["NEVER", 450],
		["ENHANCED_HEALING_MAGIC", 500],
	],
	baseCastTime: 1.5,
	manaCost: 400,
	onConfirm: (state) => state.maybeGainProc("FREECURE", 0.15),
});

makeWHMSpell("CURE_II", 30, {
	applicationDelay: 0.98,
	healingPotency: [
		["NEVER", 700],
		["ENHANCED_HEALING_MAGIC", 800],
	],
	baseCastTime: 2,
	manaCost: (state) => (state.hasResourceAvailable("FREECURE") ? 0 : 1000),
	highlightIf: (state) => state.hasResourceAvailable("FREECURE"),
	onConfirm: (state) => state.tryConsumeResource("FREECURE"),
});

makeWHMSpell("CURE_III", 40, {
	applicationDelay: 0.98,
	healingPotency: [
		["NEVER", 550],
		["ENHANCED_HEALING_MAGIC", 600],
	],
	baseCastTime: 2,
	manaCost: 1500,
	aoeHeal: true,
});

makeWHMSpell("MEDICA", 10, {
	applicationDelay: 1.02,
	healingPotency: [
		["NEVER", 300],
		["ENHANCED_HEALING_MAGIC", 400],
	],
	baseCastTime: 2,
	manaCost: 900,
	aoeHeal: true,
});

makeWHMSpell("MEDICA_II", 50, {
	autoUpgrade: {
		otherSkill: "MEDICA_III",
		trait: "MEDICA_MASTERY",
	},
	applicationDelay: 0.84,
	healingPotency: [
		["NEVER", 200],
		["ENHANCED_HEALING_MAGIC", 250],
	],
	baseCastTime: 2,
	manaCost: 1000,
	aoeHeal: true,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "MEDICA_II",
			effectName: "MEDICA_II",
			speedStat: "sps",
			tickPotency: state.hasTraitUnlocked("ENHANCED_HEALING_MAGIC") ? 150 : 100,
		});
	},
	onApplication: (state, node) => {
		state.applyHoT("MEDICA_II", node);
		state.gainStatus("MEDICA_II");
	},
});

makeWHMSpell("MEDICA_III", 96, {
	autoDowngrade: {
		otherSkill: "MEDICA_II",
		trait: "MEDICA_MASTERY",
	},
	applicationDelay: 0.84,
	healingPotency: 250,
	baseCastTime: 2,
	manaCost: 1000,
	aoeHeal: true,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "MEDICA_III",
			effectName: "MEDICA_III",
			speedStat: "sps",
			tickPotency: 175,
		});
	},
	onApplication: (state, node) => {
		state.applyHoT("MEDICA_III", node);
		state.gainStatus("MEDICA_III");
	},
});

makeWHMSpell("RAISE", 12, {
	baseCastTime: 8,
	manaCost: 2400,
	applicationDelay: 1.16,
});

makeWHMAbility("ASSIZE", 56, "cd_ASSIZE", {
	applicationDelay: 0.67,
	cooldown: 40,
	potency: 400,
	falloff: 0,
	healingPotency: 400,
	onApplication: (state) => state.resources.get("MANA").gain(500),
});

makeWHMResourceAbility("PRESENCE_OF_MIND", 30, "cd_PRESENCE_OF_MIND", {
	rscType: "PRESENCE_OF_MIND",
	applicationDelay: 0.53,
	cooldown: 120,
	replaceIf: [
		{
			newSkill: "GLARE_IV",
			condition: (state) => state.hasResourceAvailable("SACRED_SIGHT"),
		},
	],
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_PRESENCE_OF_MIND")) {
			state.gainStatus("SACRED_SIGHT", 3);
		}
	},
});

makeWHMSpell("GLARE_IV", 92, {
	startOnHotbar: false,
	applicationDelay: 0.85,
	potency: 640,
	falloff: 0.4,
	manaCost: 0,
	highlightIf: (state) => state.hasResourceAvailable("SACRED_SIGHT"),
	validateAttempt: (state) => state.hasResourceAvailable("SACRED_SIGHT"),
	onConfirm: (state) => state.tryConsumeResource("SACRED_SIGHT"),
});

makeWHMResourceAbility("THIN_AIR", 58, "cd_THIN_AIR", {
	rscType: "THIN_AIR",
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 2,
});

makeWHMAbility("AETHERIAL_SHIFT", 40, "cd_AETHERIAL_SHIFT", {
	applicationDelay: 0,
	cooldown: 60,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeWHMResourceAbility("DIVINE_BENISON", 66, "cd_DIVINE_BENISON", {
	rscType: "DIVINE_BENISON",
	applicationDelay: 0.8,
	cooldown: 30,
	maxCharges: 2, // set by trait in constructor
});

makeWHMResourceAbility("AQUAVEIL", 86, "cd_AQUAVEIL", {
	rscType: "AQUAVEIL",
	applicationDelay: 0.62,
	cooldown: 60,
});

makeWHMAbility("TETRAGRAMMATON", 60, "cd_TETRAGRAMMATON", {
	applicationDelay: 0.53,
	cooldown: 60,
	maxCharges: 2, // set by trait in constructor
	healingPotency: 700,
});

makeWHMAbility("BENEDICTION", 50, "cd_BENEDICTION", {
	applicationDelay: 0.62,
	cooldown: 180,
});

makeWHMAbility("ASYLUM", 52, "cd_ASYLUM", {
	applicationDelay: 0.85,
	cooldown: 90,
	// TODO deal with ground placement buff refresh timing
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "ASYLUM",
			effectName: "ASYLUM",
			speedStat: "sps",
			tickPotency: 100,
		});
	},
	onApplication: (state) => state.gainStatus("ASYLUM"),
});

makeWHMResourceAbility("PLENARY_INDULGENCE", 70, "cd_PLENARY_INDULGENCE", {
	rscType: "CONFESSION",
	applicationDelay: 0.8,
	cooldown: 60,
});

makeWHMResourceAbility("TEMPERANCE", 80, "cd_TEMPERANCE", {
	rscType: "TEMPERANCE",
	applicationDelay: 0.62,
	cooldown: 120,
	replaceIf: [
		{
			newSkill: "DIVINE_CARESS",
			condition: (state) => state.hasResourceAvailable("DIVINE_GRACE"),
		},
	],
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_TEMPERANCE")) {
			state.gainStatus("DIVINE_GRACE");
		}
	},
});

// According to the pet scaling sheet, bell actually has higher listed potencies.
// https://docs.google.com/spreadsheets/d/1Yt7Px7VHuKG1eJR9CRKs3RpvcR5IZKAAA3xjekvv0LY/edit?gid=0#gid=0

makeWHMResourceAbility("LITURGY_OF_THE_BELL", 90, "cd_LITURGY_OF_THE_BELL", {
	rscType: "LITURGY_OF_THE_BELL",
	applicationDelay: 0,
	cooldown: 180,
	replaceIf: [
		{
			newSkill: "LITURGY_POP",
			condition: (state) => state.hasResourceAvailable("LITURGY_OF_THE_BELL"),
		},
	],
	// TODO apply healing potency when bell is early popped
});

// Simulate getting hit
makeWHMAbility("LITURGY_TRIGGER", 90, "cd_LITURGY_TRIGGER", {
	applicationDelay: 0,
	cooldown: 1,
	isPetHeal: true,
	healingPotency: 425,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	validateAttempt: (state) => state.hasResourceAvailable("LITURGY_OF_THE_BELL"),
	highlightIf: (state) => state.hasResourceAvailable("LITURGY_OF_THE_BELL"),
	onConfirm: (state) => state.tryConsumeResource("LITURGY_OF_THE_BELL"),
});

// Manually detonate the pet
makeWHMAbility("LITURGY_POP", 90, "cd_LITURGY_POP", {
	startOnHotbar: false,
	applicationDelay: 0,
	cooldown: 1,
	isPetHeal: true,
	// TODO make this a potency modifier
	healingPotency: (state) => 212 * state.resources.get("LITURGY_OF_THE_BELL").availableAmount(),
	validateAttempt: (state) => state.hasResourceAvailable("LITURGY_OF_THE_BELL"),
	highlightIf: (state) => state.hasResourceAvailable("LITURGY_OF_THE_BELL"),
	onConfirm: (state) => state.tryConsumeResource("LITURGY_OF_THE_BELL", true),
});

makeWHMResourceAbility("DIVINE_CARESS", 100, "cd_DIVINE_CARESS", {
	startOnHotbar: false,
	rscType: "DIVINE_CARESS",
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("DIVINE_GRACE"),
	highlightIf: (state) => state.hasResourceAvailable("DIVINE_GRACE"),
	onConfirm: (state) => state.tryConsumeResource("DIVINE_GRACE"),
	onApplication: (state) => {
		state.resources.addResourceEvent({
			rscType: "DIVINE_CARESS",
			name: "trigger divine aura on divine caress expiry",
			delay: 10,
			// TODO early trigger if popped
			fnOnRsc: () => state.gainStatus("DIVINE_AURA"),
		});
	},
});
