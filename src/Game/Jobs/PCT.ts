// Skill and state declarations for PCT.

import { controller } from "../../Controller/Controller";
import { BuffType, ResourceType, WarningType } from "../Common";
import { Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	Spell,
	StatePredicate,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { getResourceInfo, makeResource, CoolDown, ResourceInfo } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { TraitKey } from "../Data/Traits";
import { ActionKey } from "../Data/Actions";
import { PCTActionKey } from "../Data/Actions/Jobs/PCT";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makePCTResource = (
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("PCT", rsc, maxValue, params ?? {});
};

makePCTResource(ResourceType.Portrait, 2);
makePCTResource(ResourceType.Depictions, 3);
// automatically do prepull draws
makePCTResource(ResourceType.CreatureCanvas, 1, { default: 1 });
makePCTResource(ResourceType.WeaponCanvas, 1, { default: 1 });
makePCTResource(ResourceType.LandscapeCanvas, 1, { default: 1 });
makePCTResource(ResourceType.PaletteGauge, 100);
makePCTResource(ResourceType.Paint, 5);

makePCTResource(ResourceType.Aetherhues, 2, { timeout: 30.8 });
makePCTResource(ResourceType.MonochromeTones, 1);
makePCTResource(ResourceType.SubtractivePalette, 3);
makePCTResource(ResourceType.HammerTime, 3, { timeout: 30 });
makePCTResource(ResourceType.Inspiration, 1);
makePCTResource(ResourceType.SubtractiveSpectrum, 1, { timeout: 30 });
makePCTResource(ResourceType.Hyperphantasia, 5, { timeout: 30 });
makePCTResource(ResourceType.RainbowBright, 1, { timeout: 30 });
makePCTResource(ResourceType.Starstruck, 1, { timeout: 20 });
makePCTResource(ResourceType.StarryMuse, 1, { timeout: 20.5 });
makePCTResource(ResourceType.TemperaCoat, 1, { timeout: 10 });
makePCTResource(ResourceType.TemperaGrassa, 1, { timeout: 10 });
makePCTResource(ResourceType.Smudge, 1, { timeout: 5 });

const HYPERPHANTASIA_SKILLS: PCTActionKey[] = [
	"FIRE_IN_RED",
	"FIRE_II_IN_RED",
	"AERO_IN_GREEN",
	"AERO_II_IN_GREEN",
	"WATER_IN_BLUE",
	"WATER_II_IN_BLUE",
	"HOLY_IN_WHITE",
	"BLIZZARD_IN_CYAN",
	"BLIZZARD_II_IN_CYAN",
	"STONE_IN_YELLOW",
	"STONE_II_IN_YELLOW",
	"THUNDER_IN_MAGENTA",
	"THUNDER_II_IN_MAGENTA",
	"COMET_IN_BLACK",
	"STAR_PRISM",
];

// === JOB GAUGE AND STATE ===
export class PCTState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = (this.hasTraitUnlocked("ENHANCED_SWIFTCAST") && 40) || 60;
		[new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1)].forEach((cd) =>
			this.cooldowns.set(cd),
		);
		const livingMuseStacks = this.hasTraitUnlocked("ENHANCED_PICTOMANCY_IV") ? 3 : 2;
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_LivingMuse, 40, livingMuseStacks, livingMuseStacks),
		);
		const steelMuseStacks = this.hasTraitUnlocked("ENHANCED_PICTOMANCY_II") ? 2 : 1;
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_SteelMuse, 60, steelMuseStacks, steelMuseStacks),
		);

		this.registerRecurringEvents();
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable(ResourceType.StarryMuse)) {
			node.addBuff(BuffType.StarryMuse);
		}
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (
			this.hasResourceAvailable(ResourceType.Inspiration) &&
			HYPERPHANTASIA_SKILLS.includes(skill.name as PCTActionKey)
		) {
			node.addBuff(BuffType.Hyperphantasia);
		}
	}

	// apply hyperphantasia + sps adjustment without consuming any resources
	captureSpellCastTime(name: ActionKey, baseCastTime: number): number {
		if (name.includes("MOTIF")) {
			// motifs are not affected by sps
			return baseCastTime;
		}
		if (name === "RAINBOW_DRIP") {
			// rainbow drip is not affected by inspiration
			return this.hasResourceAvailable(ResourceType.RainbowBright)
				? 0
				: this.config.adjustedCastTime(baseCastTime);
		}
		return this.config.adjustedCastTime(
			baseCastTime,
			this.hasResourceAvailable(ResourceType.Inspiration) ? 25 : undefined,
		);
	}

	captureSpellRecastTime(name: ActionKey, baseRecastTime: number): number {
		if (name.includes("Motif")) {
			// motifs are unaffected by sps
			return baseRecastTime;
		}
		if (name === "RAINBOW_DRIP") {
			// rainbow drip is not affected by inspiration
			// when rainbow bright is affecting rainbow drip, treat it as a 6s cast
			// then subtract 3.5s from the result
			let recast = this.config.adjustedGCD(baseRecastTime);
			return this.hasResourceAvailable(ResourceType.RainbowBright) ? recast - 3.5 : recast;
		}
		// hammers are not affected by inspiration
		if (name.includes("Hammer")) {
			return this.config.adjustedGCD(baseRecastTime);
		}
		return this.config.adjustedGCD(
			baseRecastTime,
			this.hasResourceAvailable(ResourceType.Inspiration) ? 25 : undefined,
		);
	}

	getHammerStacks() {
		return this.resources.get(ResourceType.HammerTime).availableAmount();
	}

	doFiller() {
		this.cycleAetherhues();
		this.tryConsumeHyperphantasia();
		this.tryConsumeResource(ResourceType.SubtractivePalette);
	}

	// falls off after 30 (or 30.8) seconds unless next spell is resolved
	// (for now ignore edge case of buff falling off mid-cast)
	cycleAetherhues() {
		const aetherhues = this.resources.get(ResourceType.Aetherhues);
		const dropTime = (getResourceInfo("PCT", ResourceType.Aetherhues) as ResourceInfo)
			.maxTimeout;
		if (aetherhues.available(2) && aetherhues.pendingChange) {
			// reset timer and reset value to 0
			aetherhues.overrideCurrentValue(0);
			aetherhues.removeTimer();
		} else if (aetherhues.available(1) && aetherhues.pendingChange) {
			// refresh timer if it was already running
			aetherhues.overrideTimer(this, dropTime);
			aetherhues.gain(1);
		} else {
			// we were at 0 aetherhues, so increment and start the timer anew
			aetherhues.gain(1);
			this.resources.addResourceEvent({
				rscType: ResourceType.Aetherhues,
				name: "reset aetherhues status",
				delay: dropTime,
				fnOnRsc: (rsc) =>
					this.resources.get(ResourceType.Aetherhues).overrideCurrentValue(0),
			});
		}
	}

	// when inspiration + hyperphantasia stacks are available, the cast/recast of paint spells
	// are greatly reduced
	// when all 5 phantasia stacks are consumed, then inspiration is also removed
	tryConsumeHyperphantasia() {
		let hyperphantasia = this.resources.get(ResourceType.Hyperphantasia);
		let inspiration = this.resources.get(ResourceType.Inspiration);
		if (
			inspiration.available(1) &&
			hyperphantasia.available(1) &&
			hyperphantasia.pendingChange
		) {
			// consume a stack
			hyperphantasia.consume(1);
			// if all stacks are consumed, stop timers and gain rainbow bright
			if (hyperphantasia.availableAmount() === 0) {
				inspiration.consume(1);
				hyperphantasia.removeTimer();
				inspiration.removeTimer();
				if (this.hasTraitUnlocked("ENHANCED_PICTOMANCY_III")) {
					this.resources.get(ResourceType.RainbowBright).gain(1);
					this.enqueueResourceDrop(ResourceType.RainbowBright);
				}
			}
		}
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeSpell_PCT = (
	name: PCTActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<PCTState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<PCTState>;
		baseCastTime: number;
		baseRecastTime?: number;
		baseManaCost?: number;
		basePotency?: number | Array<[TraitKey, number]>;
		jobPotencyModifiers?: PotencyModifierFn<PCTState>;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<PCTState>;
		onConfirm?: EffectFn<PCTState>;
		onApplication?: EffectFn<PCTState>;
	},
): Spell<PCTState> => {
	const baseRecastTime = params.baseRecastTime ?? 2.5;
	let onConfirm: EffectFn<PCTState> = combineEffects((state, node) => {
		// Consume swift/triple before anything else happens.
		// The code here is dependent on short-circuiting logic to consume the correct resources.
		// Don't consume non-swiftcast resources yet.
		(name === "RAINBOW_DRIP" && state.hasResourceAvailable(ResourceType.RainbowBright)) ||
			name === "STAR_PRISM" ||
			name === "HOLY_IN_WHITE" ||
			name === "COMET_IN_BLACK" ||
			name === "HAMMER_STAMP" ||
			name === "HAMMER_BRUSH" ||
			name === "POLISHING_HAMMER" ||
			state.tryConsumeResource(ResourceType.Swiftcast);
	}, params.onConfirm ?? NO_EFFECT);
	const onApplication: EffectFn<PCTState> = params.onApplication ?? NO_EFFECT;
	return makeSpell("PCT", name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		highlightIf: params.highlightIf,
		castTime: (state) => state.captureSpellCastTime(name, params.baseCastTime),
		recastTime: (state) => state.captureSpellRecastTime(name, baseRecastTime),
		manaCost: params.baseManaCost ?? 0,
		potency: params.basePotency,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable(ResourceType.StarryMuse)) {
				mods.push(Modifiers.Starry);
			}
			if (params.jobPotencyModifiers) {
				mods.push(...params.jobPotencyModifiers(state));
			}
			return mods;
		},
		falloff: params.falloff,
		validateAttempt: params.validateAttempt,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) =>
			(name === "RAINBOW_DRIP" && state.hasResourceAvailable(ResourceType.RainbowBright)) ||
			name === "STAR_PRISM" ||
			name === "HOLY_IN_WHITE" ||
			name === "COMET_IN_BLACK" ||
			name === "HAMMER_STAMP" ||
			name === "HAMMER_BRUSH" ||
			name === "POLISHING_HAMMER" ||
			state.hasResourceAvailable(ResourceType.Swiftcast),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};

const makeAbility_PCT = (
	name: PCTActionKey,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<PCTState>[];
		requiresCombat?: boolean;
		highlightIf?: StatePredicate<PCTState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<PCTState>;
		onConfirm?: EffectFn<PCTState>;
		onApplication?: EffectFn<PCTState>;
	},
): Ability<PCTState> =>
	makeAbility("PCT", name, unlockLevel, cdName, {
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable(ResourceType.StarryMuse) ? [Modifiers.Starry] : [],
		...params,
	});

// Conditions for replacing RGB/CMY on hotbar
const redCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_IN_RED",
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const greenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_IN_GREEN",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const blueCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_IN_BLUE",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};
const cyanCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const yellowCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_IN_YELLOW",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const magentaCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_IN_MAGENTA",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};

const red2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_II_IN_RED",
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const green2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_II_IN_GREEN",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const blue2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_II_IN_BLUE",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};
const cyan2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_II_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const yellow2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_II_IN_YELLOW",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const magenta2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_II_IN_MAGENTA",
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};

// use the creature motif icon when a creature is already drawn
const creatureMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CREATURE_MOTIF",
	condition: (state) => state.hasResourceAvailable(ResourceType.CreatureCanvas),
};
const pomMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 0,
};
const wingMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WING_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 1,
};
const clawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 2,
};
const mawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "MAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 3,
};

const livingMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "LIVING_MUSE",
	condition: (state) => !state.hasResourceAvailable(ResourceType.CreatureCanvas),
};
const pomMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MUSE",
	condition: (state) =>
		state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 0,
};
const wingedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WINGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 1,
};
const clawedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAWED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 2,
};
const fangedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FANGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable(ResourceType.CreatureCanvas) &&
		state.resources.get(ResourceType.Depictions).availableAmount() === 3,
};

const mogCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "MOG_OF_THE_AGES",
	// mog is shown when no portrait is available
	condition: (state) => state.resources.get(ResourceType.Portrait).availableAmount() !== 2,
};
const madeenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "RETRIBUTION_OF_THE_MADEEN",
	condition: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 2,
};

const weaponCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WEAPON_MOTIF",
	condition: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
};
const hammerCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "HAMMER_MOTIF",
	condition: (state) => !state.hasResourceAvailable(ResourceType.WeaponCanvas),
};

const steelCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STEEL_MUSE",
	condition: (state) => !state.hasResourceAvailable(ResourceType.WeaponCanvas),
};
const strikingCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STRIKING_MUSE",
	condition: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
};

const landscapeCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "LANDSCAPE_MOTIF",
	condition: (state) => state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};
const starrySkyCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STARRY_SKY_MOTIF",
	condition: (state) => !state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};

const scenicCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "SCENIC_MUSE",
	condition: (state) => !state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};
const starryMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STARRY_MUSE",
	condition: (state) => state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};

makeSpell_PCT("FIRE_IN_RED", 1, {
	replaceIf: [greenCondition, blueCondition],
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 280],
		["PICTOMANCY_MASTERY_II", 340],
		["PICTOMANCY_MASTERY_III", 380],
		["PICTOMANCY_MASTERY_IV", 440],
	],
	applicationDelay: 0.84,
	validateAttempt: (state) =>
		redCondition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeSpell_PCT("AERO_IN_GREEN", 5, {
	replaceIf: [redCondition, blueCondition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 320],
		["PICTOMANCY_MASTERY_II", 380],
		["PICTOMANCY_MASTERY_III", 420],
		["PICTOMANCY_MASTERY_IV", 480],
	],
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		greenCondition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("WATER_IN_BLUE", 15, {
	replaceIf: [redCondition, greenCondition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 360],
		["PICTOMANCY_MASTERY_II", 420],
		["PICTOMANCY_MASTERY_III", 460],
		["PICTOMANCY_MASTERY_IV", 520],
	],
	applicationDelay: 0.98,
	validateAttempt: (state) =>
		blueCondition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		const paletteGauge = state.resources.get(ResourceType.PaletteGauge);
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PaletteOvercap);
		}
		paletteGauge.gain(25);
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
	highlightIf: (state) => !state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("FIRE_II_IN_RED", 25, {
	replaceIf: [green2Condition, blue2Condition],
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 80],
		["PICTOMANCY_MASTERY_II", 100],
		["PICTOMANCY_MASTERY_IV", 120],
	],
	falloff: 0,
	applicationDelay: 0.84,
	validateAttempt: (state) =>
		red2Condition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeSpell_PCT("AERO_II_IN_GREEN", 35, {
	replaceIf: [red2Condition, blue2Condition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 100],
		["PICTOMANCY_MASTERY_II", 120],
		["PICTOMANCY_MASTERY_IV", 140],
	],
	falloff: 0,
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		green2Condition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("WATER_II_IN_BLUE", 45, {
	replaceIf: [red2Condition, green2Condition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 120],
		["PICTOMANCY_MASTERY_II", 140],
		["PICTOMANCY_MASTERY_IV", 160],
	],
	falloff: 0,
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		blue2Condition.condition(state) &&
		!state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		const paletteGauge = state.resources.get(ResourceType.PaletteGauge);
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PaletteOvercap);
		}
		paletteGauge.gain(25);
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
	highlightIf: (state) => !state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("BLIZZARD_IN_CYAN", 60, {
	replaceIf: [yellowCondition, magentaCondition],
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 520],
		["PICTOMANCY_MASTERY_II", 630],
		["PICTOMANCY_MASTERY_III", 700],
		["PICTOMANCY_MASTERY_IV", 800],
	],
	applicationDelay: 0.75,
	validateAttempt: (state) =>
		cyanCondition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("STONE_IN_YELLOW", 60, {
	replaceIf: [cyanCondition, magentaCondition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 560],
		["PICTOMANCY_MASTERY_II", 670],
		["PICTOMANCY_MASTERY_III", 740],
		["PICTOMANCY_MASTERY_IV", 840],
	],
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		yellowCondition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("THUNDER_IN_MAGENTA", 60, {
	replaceIf: [cyanCondition, yellowCondition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 600],
		["PICTOMANCY_MASTERY_II", 710],
		["PICTOMANCY_MASTERY_III", 780],
		["PICTOMANCY_MASTERY_IV", 880],
	],
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		magentaCondition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("BLIZZARD_II_IN_CYAN", 60, {
	replaceIf: [yellow2Condition, magenta2Condition],
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 180],
		["PICTOMANCY_MASTERY_II", 220],
		["PICTOMANCY_MASTERY_IV", 240],
	],
	falloff: 0,
	applicationDelay: 0.75,
	validateAttempt: (state) =>
		cyan2Condition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("STONE_II_IN_YELLOW", 60, {
	replaceIf: [cyan2Condition, magenta2Condition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 200],
		["PICTOMANCY_MASTERY_II", 240],
		["PICTOMANCY_MASTERY_IV", 260],
	],
	falloff: 0,
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		yellow2Condition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("THUNDER_II_IN_MAGENTA", 60, {
	replaceIf: [cyan2Condition, yellow2Condition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 220],
		["PICTOMANCY_MASTERY_II", 260],
		["PICTOMANCY_MASTERY_IV", 280],
	],
	falloff: 0,
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		magenta2Condition.condition(state) &&
		state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SubtractivePalette),
});

makeSpell_PCT("HOLY_IN_WHITE", 80, {
	baseCastTime: 0,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 420],
		["PICTOMANCY_MASTERY_III", 460],
		["PICTOMANCY_MASTERY_IV", 520],
	],
	falloff: 0.6,
	applicationDelay: 1.34,
	validateAttempt: (state) =>
		!state.hasResourceAvailable(ResourceType.MonochromeTones) &&
		state.hasResourceAvailable(ResourceType.Paint),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Paint);
		state.tryConsumeHyperphantasia();
	},
	// holy doesn't glow if comet is ready
	highlightIf: (state) =>
		!state.hasResourceAvailable(ResourceType.MonochromeTones) &&
		state.hasResourceAvailable(ResourceType.Paint),
});

makeSpell_PCT("COMET_IN_BLACK", 90, {
	baseCastTime: 0,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 780],
		["PICTOMANCY_MASTERY_IV", 880],
	],
	falloff: 0.6,
	applicationDelay: 1.87,
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.MonochromeTones) &&
		state.hasResourceAvailable(ResourceType.Paint),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Paint);
		state.tryConsumeResource(ResourceType.MonochromeTones);
		state.tryConsumeHyperphantasia();
	},
	// if comet is ready, it glows regardless of paint status
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.MonochromeTones),
});

makeSpell_PCT("RAINBOW_DRIP", 92, {
	baseCastTime: 4,
	baseRecastTime: 6,
	baseManaCost: 400,
	basePotency: 1000,
	applicationDelay: 1.24,
	falloff: 0.85,
	onConfirm: (state) => {
		// gain a holy stack
		state.resources.get(ResourceType.Paint).gain(1);
		state.tryConsumeResource(ResourceType.RainbowBright);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.RainbowBright),
});

makeSpell_PCT("STAR_PRISM", 100, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 1400,
	applicationDelay: 1.25,
	falloff: 0.6,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Starstruck),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Starstruck);
		state.tryConsumeHyperphantasia();
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Starstruck),
});

makeAbility_PCT("SUBTRACTIVE_PALETTE", 60, ResourceType.cd_Subtractive, {
	cooldown: 1,
	validateAttempt: (state) =>
		// Check we are not already in subtractive
		!state.hasResourceAvailable(ResourceType.SubtractivePalette) &&
		// Check if free subtractive from starry muse or 50 gauge is available
		(state.hasResourceAvailable(ResourceType.SubtractiveSpectrum) ||
			state.hasResourceAvailable(ResourceType.PaletteGauge, 50)),
	onConfirm: (state) => {
		if (!state.tryConsumeResource(ResourceType.SubtractiveSpectrum)) {
			state.resources.get(ResourceType.PaletteGauge).consume(50);
		}
		// gain comet (caps at 1)
		if (state.hasResourceAvailable(ResourceType.MonochromeTones)) {
			controller.reportWarning(WarningType.CometOverwrite);
		}
		if (state.hasTraitUnlocked("ENHANCED_PALETTE")) {
			state.resources.get(ResourceType.MonochromeTones).gain(1);
		}
		state.resources.get(ResourceType.SubtractivePalette).gain(3);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.SubtractiveSpectrum) ||
		state.resources.get(ResourceType.PaletteGauge).available(50),
});

const creatureConditions = [
	creatureMotifCondition,
	pomMotifCondition,
	wingMotifCondition,
	clawMotifCondition,
	mawMotifCondition,
];
// [name, level, validation]
const creatureInfos: Array<[PCTActionKey, number, StatePredicate<PCTState>]> = [
	// creature motif can never itself be cast
	["CREATURE_MOTIF", 30, (state) => false],
	["POM_MOTIF", 30, pomMotifCondition.condition],
	["WING_MOTIF", 30, wingMotifCondition.condition],
	["CLAW_MOTIF", 96, clawMotifCondition.condition],
	["MAW_MOTIF", 96, mawMotifCondition.condition],
];
creatureInfos.forEach(([name, level, validateAttempt], i) =>
	makeSpell_PCT(name, level, {
		replaceIf: creatureConditions.slice(0, i).concat(creatureConditions.slice(i + 1)),
		startOnHotbar: i === 0,
		baseCastTime: 3,
		baseRecastTime: 4,
		baseManaCost: 0,
		applicationDelay: 0,
		validateAttempt: validateAttempt,
		onConfirm: (state) => state.resources.get(ResourceType.CreatureCanvas).gain(1),
	}),
);

const livingConditions = [
	livingMuseCondition,
	pomMuseCondition,
	wingedMuseCondition,
	clawedMuseCondition,
	fangedMuseCondition,
];
// [name, level, potency, delay, validation]
const livingMuseInfos: Array<
	[PCTActionKey, number, number | Array<[TraitKey, number]>, number, StatePredicate<PCTState>]
> = [
	// living muse can never itself be cast
	["LIVING_MUSE", 30, 0, 0, (state) => false],
	[
		"POM_MUSE",
		30,
		[
			["NEVER", 1000],
			["PICTOMANCY_MASTERY_III", 1100],
		],
		0.62,
		pomMuseCondition.condition,
	],
	[
		"WINGED_MUSE",
		30,
		[
			["NEVER", 1000],
			["PICTOMANCY_MASTERY_III", 1100],
		],
		0.98,
		wingedMuseCondition.condition,
	],
	["CLAWED_MUSE", 96, 1100, 0.98, clawedMuseCondition.condition],
	["FANGED_MUSE", 96, 1100, 1.16, fangedMuseCondition.condition],
];
livingMuseInfos.forEach(([name, level, potencies, applicationDelay, validateAttempt], i) =>
	makeAbility_PCT(name, level, ResourceType.cd_LivingMuse, {
		replaceIf: livingConditions.slice(0, i).concat(livingConditions.slice(i + 1)),
		startOnHotbar: i === 0,
		potency: potencies,
		falloff: 0.6,
		applicationDelay: applicationDelay,
		cooldown: 40,
		validateAttempt: validateAttempt,
		onConfirm: (state) => {
			let depictions = state.resources.get(ResourceType.Depictions);
			let portraits = state.resources.get(ResourceType.Portrait);
			state.tryConsumeResource(ResourceType.CreatureCanvas);
			depictions.gain(1);
			// wing: make moogle portrait available (overwrites madeen)
			if (name === "WINGED_MUSE") {
				portraits.overrideCurrentValue(1);
				// below lvl 94, there's no madeen, so wrap depictions back to 0
				if (!state.hasTraitUnlocked("ENHANCED_PICTOMANCY_IV")) {
					depictions.overrideCurrentValue(0);
				}
			}
			// maw: make madeen portrait available (overwrites moogle)
			// reset depictions to empty
			if (name === "FANGED_MUSE") {
				portraits.overrideCurrentValue(2);
				depictions.overrideCurrentValue(0);
			}
		},
		maxCharges: 3, // lower this value in the state constructor when level synced
		highlightIf: (state) => state.hasResourceAvailable(ResourceType.CreatureCanvas),
	}),
);

makeAbility_PCT("MOG_OF_THE_AGES", 30, ResourceType.cd_Portrait, {
	replaceIf: [madeenCondition],
	potency: [
		["NEVER", 1100],
		["PICTOMANCY_MASTERY_III", 1300],
	],
	falloff: 0.6,
	applicationDelay: 1.15,
	validateAttempt: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 1,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Portrait),
	cooldown: 30,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Portrait),
});

makeAbility_PCT("RETRIBUTION_OF_THE_MADEEN", 30, ResourceType.cd_Portrait, {
	replaceIf: [mogCondition],
	startOnHotbar: false,
	potency: 1400,
	falloff: 0.6,
	applicationDelay: 1.3,
	validateAttempt: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 2,
	onConfirm: (state) => state.resources.get(ResourceType.Portrait).overrideCurrentValue(0),
	cooldown: 30,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Portrait),
});

makeSpell_PCT("WEAPON_MOTIF", 50, {
	replaceIf: [hammerCondition],
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false, // hammer motif can never itself be cast
});

makeSpell_PCT("HAMMER_MOTIF", 50, {
	replaceIf: [weaponCondition],
	startOnHotbar: false,
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) =>
		hammerCondition.condition(state) && !state.hasResourceAvailable(ResourceType.HammerTime),
	onConfirm: (state) => state.resources.get(ResourceType.WeaponCanvas).gain(1),
});

makeAbility_PCT("STEEL_MUSE", 50, ResourceType.cd_SteelMuse, {
	replaceIf: [strikingCondition],
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => false, // steel muse can never itself be cast
});

makeAbility_PCT("STRIKING_MUSE", 50, ResourceType.cd_SteelMuse, {
	replaceIf: [steelCondition],
	startOnHotbar: false,
	requiresCombat: true,
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.WeaponCanvas);
		state.resources.get(ResourceType.HammerTime).gain(3);
		state.enqueueResourceDrop(ResourceType.HammerTime);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
});

const hammerConditions: ConditionalSkillReplace<PCTState>[] = [
	{
		newSkill: "HAMMER_STAMP",
		condition: (state) =>
			!state.hasTraitUnlocked("ENHANCED_PICTOMANCY_II") || state.getHammerStacks() === 3,
	},
	{
		newSkill: "HAMMER_BRUSH",
		condition: (state) =>
			state.hasTraitUnlocked("ENHANCED_PICTOMANCY_II") && state.getHammerStacks() === 2,
	},
	{
		newSkill: "POLISHING_HAMMER",
		condition: (state) =>
			state.hasTraitUnlocked("ENHANCED_PICTOMANCY_II") && state.getHammerStacks() === 1,
	},
];
// [name, level, potency, delay]
const hammerInfos: Array<[PCTActionKey, number, number | Array<[TraitKey, number]>, number]> = [
	[
		"HAMMER_STAMP",
		50,
		[
			["NEVER", 380],
			["PICTOMANCY_MASTERY_II", 480],
			["PICTOMANCY_MASTERY_III", 520],
			["PICTOMANCY_MASTERY_IV", 560],
		],
		1.38,
	],
	[
		"HAMMER_BRUSH",
		86,
		[
			["NEVER", 580],
			["PICTOMANCY_MASTERY_IV", 620],
		],
		1.25,
	],
	[
		"POLISHING_HAMMER",
		86,
		[
			["NEVER", 640],
			["PICTOMANCY_MASTERY_IV", 680],
		],
		2.1,
	],
];
hammerInfos.forEach(([name, level, potencies, applicationDelay], i) =>
	makeSpell_PCT(name, level, {
		replaceIf: hammerConditions.slice(0, i).concat(hammerConditions.slice(i + 1)),
		baseCastTime: 0,
		startOnHotbar: i === 0,
		basePotency: potencies,
		falloff: 0.6,
		applicationDelay: applicationDelay,
		validateAttempt: (state) =>
			hammerConditions[i].condition(state) &&
			state.hasResourceAvailable(ResourceType.HammerTime),
		onConfirm: (state) => state.tryConsumeResource(ResourceType.HammerTime),
		highlightIf: (state) => state.hasResourceAvailable(ResourceType.HammerTime),
		jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
	}),
);

makeSpell_PCT("LANDSCAPE_MOTIF", 70, {
	replaceIf: [starrySkyCondition],
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false, // landscape motif can never itself be cast
});

makeSpell_PCT("STARRY_SKY_MOTIF", 70, {
	replaceIf: [landscapeCondition],
	startOnHotbar: false,
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) =>
		starrySkyCondition.condition(state) && !state.hasResourceAvailable(ResourceType.StarryMuse),
	onConfirm: (state) => state.resources.get(ResourceType.LandscapeCanvas).gain(1),
});

makeAbility_PCT("SCENIC_MUSE", 70, ResourceType.cd_ScenicMuse, {
	replaceIf: [starryMuseCondition],
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => false, // scenic muse can never itself be cast
});

makeAbility_PCT("STARRY_MUSE", 70, ResourceType.cd_ScenicMuse, {
	replaceIf: [scenicCondition],
	startOnHotbar: false,
	requiresCombat: true,
	applicationDelay: 0, // raid buff is instant, but inspiration is delayed by 0.62s
	cooldown: 120,
	validateAttempt: (state) => starryMuseCondition.condition(state),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.LandscapeCanvas);
		// It is not possible to have an existing starry active
		// unless someone added starry muse via the party buff menu.
		// Since this fork is hacky we just ignore this case for now.
		state.resources.get(ResourceType.StarryMuse).gain(1);
		// Technically, hyperphantasia is gained on a delay, but whatever
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY")) {
			state.resources.get(ResourceType.Hyperphantasia).gain(5);
			state.resources.get(ResourceType.Inspiration).gain(1);

			const hpDuration = (getResourceInfo("PCT", ResourceType.Hyperphantasia) as ResourceInfo)
				.maxTimeout;
			state.enqueueResourceDrop(ResourceType.Hyperphantasia, hpDuration);
			state.enqueueResourceDrop(ResourceType.Inspiration, hpDuration);
		}
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY_V")) {
			state.resources.get(ResourceType.Starstruck).gain(1);
			state.enqueueResourceDrop(ResourceType.Starstruck);
		}
		state.resources.get(ResourceType.SubtractiveSpectrum).gain(1);
		state.enqueueResourceDrop(ResourceType.StarryMuse);
		state.enqueueResourceDrop(ResourceType.SubtractiveSpectrum);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.LandscapeCanvas),
});

makeResourceAbility("PCT", "TEMPERA_COAT", 10, ResourceType.cd_TemperaCoat, {
	rscType: ResourceType.TemperaCoat,
	replaceIf: [
		{
			newSkill: "TEMPERA_COAT_POP",
			condition: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
		},
	],
	applicationDelay: 0, // instant
	cooldown: 120,
});

makeAbility_PCT("TEMPERA_GRASSA", 88, ResourceType.cd_Grassa, {
	replaceIf: [
		{
			newSkill: "TEMPERA_GRASSA_POP",
			condition: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
		},
	],
	applicationDelay: 0, // instant
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	onConfirm: (state) => {
		// goodbye, tempera coat
		state.tryConsumeResource(ResourceType.TemperaCoat);
		// hello, tempera grassa
		state.resources.get(ResourceType.TemperaGrassa).gain(1);
		state.enqueueResourceDrop(ResourceType.TemperaGrassa);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
});

// fake skill to represent breaking the coat shield
makeAbility_PCT("TEMPERA_COAT_POP", 10, ResourceType.cd_TemperaPop, {
	replaceIf: [
		{
			newSkill: "TEMPERA_GRASSA_POP",
			condition: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
		},
	],
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.TemperaCoat);
		// Reduce the cooldown of tempera coat by 60s
		let coatElapsed = state.cooldowns
			.get(ResourceType.cd_TemperaCoat)
			.timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Coat when no timer for Tempera Coat CD was active",
		);
		state.cooldowns.get(ResourceType.cd_TemperaCoat).overrideCurrentValue(180 - coatElapsed);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
});

// fake skill to represent breaking the grassa shield
makeAbility_PCT("TEMPERA_GRASSA_POP", 10, ResourceType.cd_TemperaPop, {
	replaceIf: [
		{
			newSkill: "TEMPERA_COAT_POP",
			condition: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
		},
	],
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.TemperaGrassa);
		// Reduce the cooldown of tempera coat by 30s
		let coatElapsed = state.cooldowns
			.get(ResourceType.cd_TemperaCoat)
			.timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Grassa when no timer for Tempera Coat CD was active",
		);
		state.cooldowns.get(ResourceType.cd_TemperaCoat).overrideCurrentValue(150 - coatElapsed);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
});

makeResourceAbility("PCT", "SMUDGE", 20, ResourceType.cd_Smudge, {
	rscType: ResourceType.Smudge,
	applicationDelay: 0, // instant (buff application)
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});
