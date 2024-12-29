// Skill and state declarations for PCT.

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
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
import { PCTResourceKey } from "../Data/Resources/Jobs/PCT";
import { PCTCooldownKey } from "../Data/Cooldowns/Jobs/PCT";
import { PCTStatusPropsGenerator } from "../../Components/Jobs/PCT";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makePCTResource = (
	rsc: PCTResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("PCT", rsc, maxValue, params ?? {});
};

makePCTResource("PORTRAIT", 2);
makePCTResource("DEPICTIONS", 3);
// automatically do prepull draws
makePCTResource("CREATURE_CANVAS", 1, { default: 1 });
makePCTResource("WEAPON_CANVAS", 1, { default: 1 });
makePCTResource("LANDSCAPE_CANVAS", 1, { default: 1 });
makePCTResource("PALETTE_GAUGE", 100);
makePCTResource("PAINT", 5);

makePCTResource("AETHERHUES", 2, { timeout: 30.8 });
makePCTResource("MONOCHROME_TONES", 1);
makePCTResource("SUBTRACTIVE_PALETTE", 3);
makePCTResource("HAMMER_TIME", 3, { timeout: 30 });
makePCTResource("INSPIRATION", 1);
makePCTResource("SUBTRACTIVE_SPECTRUM", 1, { timeout: 30 });
makePCTResource("HYPERPHANTASIA", 5, { timeout: 30 });
makePCTResource("RAINBOW_BRIGHT", 1, { timeout: 30 });
makePCTResource("STARSTRUCK", 1, { timeout: 20 });
makePCTResource("STARRY_MUSE", 1, { timeout: 20.5 });
makePCTResource("TEMPERA_COAT", 1, { timeout: 10 });
makePCTResource("TEMPERA_GRASSA", 1, { timeout: 10 });
makePCTResource("SMUDGE", 1, { timeout: 5 });

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
		[new CoolDown("cd_SWIFTCAST", swiftcastCooldown, 1, 1)].forEach((cd) =>
			this.cooldowns.set(cd),
		);
		const livingMuseStacks = this.hasTraitUnlocked("ENHANCED_PICTOMANCY_IV") ? 3 : 2;
		this.cooldowns.set(new CoolDown("cd_LIVING_MUSE", 40, livingMuseStacks, livingMuseStacks));
		const steelMuseStacks = this.hasTraitUnlocked("ENHANCED_PICTOMANCY_II") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_STEEL_MUSE", 60, steelMuseStacks, steelMuseStacks));

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<PCTState> {
		return new PCTStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("STARRY_MUSE")) {
			node.addBuff(BuffType.StarryMuse);
		}
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (
			this.hasResourceAvailable("INSPIRATION") &&
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
			return this.hasResourceAvailable("RAINBOW_BRIGHT")
				? 0
				: this.config.adjustedCastTime(baseCastTime);
		}
		return this.config.adjustedCastTime(
			baseCastTime,
			this.hasResourceAvailable("INSPIRATION") ? 25 : undefined,
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
			return this.hasResourceAvailable("RAINBOW_BRIGHT") ? recast - 3.5 : recast;
		}
		// hammers are not affected by inspiration
		if (name.includes("Hammer")) {
			return this.config.adjustedGCD(baseRecastTime);
		}
		return this.config.adjustedGCD(
			baseRecastTime,
			this.hasResourceAvailable("INSPIRATION") ? 25 : undefined,
		);
	}

	getHammerStacks() {
		return this.resources.get("HAMMER_TIME").availableAmount();
	}

	doFiller() {
		this.cycleAetherhues();
		this.tryConsumeHyperphantasia();
		this.tryConsumeResource("SUBTRACTIVE_PALETTE");
	}

	// falls off after 30 (or 30.8) seconds unless next spell is resolved
	// (for now ignore edge case of buff falling off mid-cast)
	cycleAetherhues() {
		const aetherhues = this.resources.get("AETHERHUES");
		const dropTime = (getResourceInfo("PCT", "AETHERHUES") as ResourceInfo).maxTimeout;
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
				rscType: "AETHERHUES",
				name: "reset aetherhues status",
				delay: dropTime,
				fnOnRsc: (rsc) => this.resources.get("AETHERHUES").overrideCurrentValue(0),
			});
		}
	}

	// when inspiration + hyperphantasia stacks are available, the cast/recast of paint spells
	// are greatly reduced
	// when all 5 phantasia stacks are consumed, then inspiration is also removed
	tryConsumeHyperphantasia() {
		let hyperphantasia = this.resources.get("HYPERPHANTASIA");
		let inspiration = this.resources.get("INSPIRATION");
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
					this.resources.get("RAINBOW_BRIGHT").gain(1);
					this.enqueueResourceDrop("RAINBOW_BRIGHT");
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
		(name === "RAINBOW_DRIP" && state.hasResourceAvailable("RAINBOW_BRIGHT")) ||
			name === "STAR_PRISM" ||
			name === "HOLY_IN_WHITE" ||
			name === "COMET_IN_BLACK" ||
			name === "HAMMER_STAMP" ||
			name === "HAMMER_BRUSH" ||
			name === "POLISHING_HAMMER" ||
			state.tryConsumeResource("SWIFTCAST");
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
			if (state.hasResourceAvailable("STARRY_MUSE")) {
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
			(name === "RAINBOW_DRIP" && state.hasResourceAvailable("RAINBOW_BRIGHT")) ||
			name === "STAR_PRISM" ||
			name === "HOLY_IN_WHITE" ||
			name === "COMET_IN_BLACK" ||
			name === "HAMMER_STAMP" ||
			name === "HAMMER_BRUSH" ||
			name === "POLISHING_HAMMER" ||
			state.hasResourceAvailable("SWIFTCAST"),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};

const makeAbility_PCT = (
	name: PCTActionKey,
	unlockLevel: number,
	cdName: PCTCooldownKey,
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
			state.hasResourceAvailable("STARRY_MUSE") ? [Modifiers.Starry] : [],
		...params,
	});

// Conditions for replacing RGB/CMY on hotbar
const redCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_IN_RED",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const greenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_IN_GREEN",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 1,
};
const blueCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_IN_BLUE",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 2,
};
const cyanCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const yellowCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_IN_YELLOW",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 1,
};
const magentaCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_IN_MAGENTA",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 2,
};

const red2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_II_IN_RED",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const green2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_II_IN_GREEN",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 1,
};
const blue2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_II_IN_BLUE",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 2,
};
const cyan2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_II_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const yellow2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_II_IN_YELLOW",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 1,
};
const magenta2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_II_IN_MAGENTA",
	condition: (state) => state.resources.get("AETHERHUES").availableAmount() === 2,
};

// use the creature motif icon when a creature is already drawn
const creatureMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CREATURE_MOTIF",
	condition: (state) => state.hasResourceAvailable("CREATURE_CANVAS"),
};
const pomMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 0,
};
const wingMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WING_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 1,
};
const clawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 2,
};
const mawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "MAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 3,
};

const livingMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "LIVING_MUSE",
	condition: (state) => !state.hasResourceAvailable("CREATURE_CANVAS"),
};
const pomMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 0,
};
const wingedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WINGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 1,
};
const clawedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAWED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 2,
};
const fangedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FANGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") &&
		state.resources.get("DEPICTIONS").availableAmount() === 3,
};

const mogCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "MOG_OF_THE_AGES",
	// mog is shown when no portrait is available
	condition: (state) => state.resources.get("PORTRAIT").availableAmount() !== 2,
};
const madeenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "RETRIBUTION_OF_THE_MADEEN",
	condition: (state) => state.resources.get("PORTRAIT").availableAmount() === 2,
};

const weaponCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WEAPON_MOTIF",
	condition: (state) => state.hasResourceAvailable("WEAPON_CANVAS"),
};
const hammerCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "HAMMER_MOTIF",
	condition: (state) => !state.hasResourceAvailable("WEAPON_CANVAS"),
};

const steelCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STEEL_MUSE",
	condition: (state) => !state.hasResourceAvailable("WEAPON_CANVAS"),
};
const strikingCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STRIKING_MUSE",
	condition: (state) => state.hasResourceAvailable("WEAPON_CANVAS"),
};

const landscapeCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "LANDSCAPE_MOTIF",
	condition: (state) => state.hasResourceAvailable("LANDSCAPE_CANVAS"),
};
const starrySkyCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STARRY_SKY_MOTIF",
	condition: (state) => !state.hasResourceAvailable("LANDSCAPE_CANVAS"),
};

const scenicCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "SCENIC_MUSE",
	condition: (state) => !state.hasResourceAvailable("LANDSCAPE_CANVAS"),
};
const starryMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STARRY_MUSE",
	condition: (state) => state.hasResourceAvailable("LANDSCAPE_CANVAS"),
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
		redCondition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		greenCondition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		blueCondition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => {
		state.doFiller();
		const paletteGauge = state.resources.get("PALETTE_GAUGE");
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PaletteOvercap);
		}
		paletteGauge.gain(25);
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get("PAINT").gain(1);
		}
	},
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		red2Condition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		green2Condition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		blue2Condition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => {
		state.doFiller();
		const paletteGauge = state.resources.get("PALETTE_GAUGE");
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PaletteOvercap);
		}
		paletteGauge.gain(25);
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get("PAINT").gain(1);
		}
	},
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		cyanCondition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		yellowCondition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		magentaCondition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => {
		state.doFiller();
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get("PAINT").gain(1);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		cyan2Condition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		yellow2Condition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		magenta2Condition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => {
		state.doFiller();
		if (state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			state.resources.get("PAINT").gain(1);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
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
		!state.hasResourceAvailable("MONOCHROME_TONES") && state.hasResourceAvailable("PAINT"),
	onConfirm: (state) => {
		state.tryConsumeResource("PAINT");
		state.tryConsumeHyperphantasia();
	},
	// holy doesn't glow if comet is ready
	highlightIf: (state) =>
		!state.hasResourceAvailable("MONOCHROME_TONES") && state.hasResourceAvailable("PAINT"),
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
		state.hasResourceAvailable("MONOCHROME_TONES") && state.hasResourceAvailable("PAINT"),
	onConfirm: (state) => {
		state.tryConsumeResource("PAINT");
		state.tryConsumeResource("MONOCHROME_TONES");
		state.tryConsumeHyperphantasia();
	},
	// if comet is ready, it glows regardless of paint status
	highlightIf: (state) => state.hasResourceAvailable("MONOCHROME_TONES"),
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
		state.resources.get("PAINT").gain(1);
		state.tryConsumeResource("RAINBOW_BRIGHT");
	},
	highlightIf: (state) => state.hasResourceAvailable("RAINBOW_BRIGHT"),
});

makeSpell_PCT("STAR_PRISM", 100, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 1400,
	applicationDelay: 1.25,
	falloff: 0.6,
	validateAttempt: (state) => state.hasResourceAvailable("STARSTRUCK"),
	onConfirm: (state) => {
		state.tryConsumeResource("STARSTRUCK");
		state.tryConsumeHyperphantasia();
	},
	highlightIf: (state) => state.hasResourceAvailable("STARSTRUCK"),
});

makeAbility_PCT("SUBTRACTIVE_PALETTE", 60, "cd_SUBTRACTIVE", {
	cooldown: 1,
	validateAttempt: (state) =>
		// Check we are not already in subtractive
		!state.hasResourceAvailable("SUBTRACTIVE_PALETTE") &&
		// Check if free subtractive from starry muse or 50 gauge is available
		(state.hasResourceAvailable("SUBTRACTIVE_SPECTRUM") ||
			state.hasResourceAvailable("PALETTE_GAUGE", 50)),
	onConfirm: (state) => {
		if (!state.tryConsumeResource("SUBTRACTIVE_SPECTRUM")) {
			state.resources.get("PALETTE_GAUGE").consume(50);
		}
		// gain comet (caps at 1)
		if (state.hasResourceAvailable("MONOCHROME_TONES")) {
			controller.reportWarning(WarningType.CometOverwrite);
		}
		if (state.hasTraitUnlocked("ENHANCED_PALETTE")) {
			state.resources.get("MONOCHROME_TONES").gain(1);
		}
		state.resources.get("SUBTRACTIVE_PALETTE").gain(3);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable("SUBTRACTIVE_SPECTRUM") ||
		state.resources.get("PALETTE_GAUGE").available(50),
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
		onConfirm: (state) => state.resources.get("CREATURE_CANVAS").gain(1),
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
	makeAbility_PCT(name, level, "cd_LIVING_MUSE", {
		replaceIf: livingConditions.slice(0, i).concat(livingConditions.slice(i + 1)),
		startOnHotbar: i === 0,
		potency: potencies,
		falloff: 0.6,
		applicationDelay: applicationDelay,
		cooldown: 40,
		validateAttempt: validateAttempt,
		onConfirm: (state) => {
			let depictions = state.resources.get("DEPICTIONS");
			let portraits = state.resources.get("PORTRAIT");
			state.tryConsumeResource("CREATURE_CANVAS");
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
		highlightIf: (state) => state.hasResourceAvailable("CREATURE_CANVAS"),
	}),
);

makeAbility_PCT("MOG_OF_THE_AGES", 30, "cd_PORTRAIT", {
	replaceIf: [madeenCondition],
	potency: [
		["NEVER", 1100],
		["PICTOMANCY_MASTERY_III", 1300],
	],
	falloff: 0.6,
	applicationDelay: 1.15,
	validateAttempt: (state) => state.resources.get("PORTRAIT").availableAmount() === 1,
	onConfirm: (state) => state.tryConsumeResource("PORTRAIT"),
	cooldown: 30,
	highlightIf: (state) => state.hasResourceAvailable("PORTRAIT"),
});

makeAbility_PCT("RETRIBUTION_OF_THE_MADEEN", 30, "cd_PORTRAIT", {
	replaceIf: [mogCondition],
	startOnHotbar: false,
	potency: 1400,
	falloff: 0.6,
	applicationDelay: 1.3,
	validateAttempt: (state) => state.resources.get("PORTRAIT").availableAmount() === 2,
	onConfirm: (state) => state.resources.get("PORTRAIT").overrideCurrentValue(0),
	cooldown: 30,
	highlightIf: (state) => state.hasResourceAvailable("PORTRAIT"),
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
		hammerCondition.condition(state) && !state.hasResourceAvailable("HAMMER_TIME"),
	onConfirm: (state) => state.resources.get("WEAPON_CANVAS").gain(1),
});

makeAbility_PCT("STEEL_MUSE", 50, "cd_STEEL_MUSE", {
	replaceIf: [strikingCondition],
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => false, // steel muse can never itself be cast
});

makeAbility_PCT("STRIKING_MUSE", 50, "cd_STEEL_MUSE", {
	replaceIf: [steelCondition],
	startOnHotbar: false,
	requiresCombat: true,
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => state.hasResourceAvailable("WEAPON_CANVAS"),
	onConfirm: (state) => {
		state.tryConsumeResource("WEAPON_CANVAS");
		state.resources.get("HAMMER_TIME").gain(3);
		state.enqueueResourceDrop("HAMMER_TIME");
	},
	highlightIf: (state) => state.hasResourceAvailable("WEAPON_CANVAS"),
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
			hammerConditions[i].condition(state) && state.hasResourceAvailable("HAMMER_TIME"),
		onConfirm: (state) => state.tryConsumeResource("HAMMER_TIME"),
		highlightIf: (state) => state.hasResourceAvailable("HAMMER_TIME"),
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
		starrySkyCondition.condition(state) && !state.hasResourceAvailable("STARRY_MUSE"),
	onConfirm: (state) => state.resources.get("LANDSCAPE_CANVAS").gain(1),
});

makeAbility_PCT("SCENIC_MUSE", 70, "cd_SCENIC_MUSE", {
	replaceIf: [starryMuseCondition],
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => false, // scenic muse can never itself be cast
});

makeAbility_PCT("STARRY_MUSE", 70, "cd_SCENIC_MUSE", {
	replaceIf: [scenicCondition],
	startOnHotbar: false,
	requiresCombat: true,
	applicationDelay: 0, // raid buff is instant, but inspiration is delayed by 0.62s
	cooldown: 120,
	validateAttempt: (state) => starryMuseCondition.condition(state),
	onConfirm: (state) => {
		state.tryConsumeResource("LANDSCAPE_CANVAS");
		// It is not possible to have an existing starry active
		// unless someone added starry muse via the party buff menu.
		// Since this fork is hacky we just ignore this case for now.
		state.resources.get("STARRY_MUSE").gain(1);
		// Technically, hyperphantasia is gained on a delay, but whatever
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY")) {
			state.resources.get("HYPERPHANTASIA").gain(5);
			state.resources.get("INSPIRATION").gain(1);

			const hpDuration = (getResourceInfo("PCT", "HYPERPHANTASIA") as ResourceInfo)
				.maxTimeout;
			state.enqueueResourceDrop("HYPERPHANTASIA", hpDuration);
			state.enqueueResourceDrop("INSPIRATION", hpDuration);
		}
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY_V")) {
			state.resources.get("STARSTRUCK").gain(1);
			state.enqueueResourceDrop("STARSTRUCK");
		}
		state.resources.get("SUBTRACTIVE_SPECTRUM").gain(1);
		state.enqueueResourceDrop("STARRY_MUSE");
		state.enqueueResourceDrop("SUBTRACTIVE_SPECTRUM");
	},
	highlightIf: (state) => state.hasResourceAvailable("LANDSCAPE_CANVAS"),
});

makeResourceAbility("PCT", "TEMPERA_COAT", 10, "cd_TEMPERA_COAT", {
	rscType: "TEMPERA_COAT",
	replaceIf: [
		{
			newSkill: "TEMPERA_COAT_POP",
			condition: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
		},
	],
	applicationDelay: 0, // instant
	cooldown: 120,
});

makeAbility_PCT("TEMPERA_GRASSA", 88, "cd_GRASSA", {
	replaceIf: [
		{
			newSkill: "TEMPERA_GRASSA_POP",
			condition: (state) => state.hasResourceAvailable("TEMPERA_GRASSA"),
		},
	],
	applicationDelay: 0, // instant
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
	onConfirm: (state) => {
		// goodbye, tempera coat
		state.tryConsumeResource("TEMPERA_COAT");
		// hello, tempera grassa
		state.resources.get("TEMPERA_GRASSA").gain(1);
		state.enqueueResourceDrop("TEMPERA_GRASSA");
	},
	highlightIf: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
});

// fake skill to represent breaking the coat shield
makeAbility_PCT("TEMPERA_COAT_POP", 10, "cd_TEMPERA_POP", {
	replaceIf: [
		{
			newSkill: "TEMPERA_GRASSA_POP",
			condition: (state) => state.hasResourceAvailable("TEMPERA_GRASSA"),
		},
	],
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
	onConfirm: (state) => {
		state.tryConsumeResource("TEMPERA_COAT");
		// Reduce the cooldown of tempera coat by 60s
		let coatElapsed = state.cooldowns.get("cd_TEMPERA_COAT").timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Coat when no timer for Tempera Coat CD was active",
		);
		state.cooldowns.get("cd_TEMPERA_COAT").overrideCurrentValue(180 - coatElapsed);
	},
	highlightIf: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
});

// fake skill to represent breaking the grassa shield
makeAbility_PCT("TEMPERA_GRASSA_POP", 10, "cd_TEMPERA_POP", {
	replaceIf: [
		{
			newSkill: "TEMPERA_COAT_POP",
			condition: (state) => state.hasResourceAvailable("TEMPERA_COAT"),
		},
	],
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("TEMPERA_GRASSA"),
	onConfirm: (state) => {
		state.tryConsumeResource("TEMPERA_GRASSA");
		// Reduce the cooldown of tempera coat by 30s
		let coatElapsed = state.cooldowns.get("cd_TEMPERA_COAT").timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Grassa when no timer for Tempera Coat CD was active",
		);
		state.cooldowns.get("cd_TEMPERA_COAT").overrideCurrentValue(150 - coatElapsed);
	},
	highlightIf: (state) => state.hasResourceAvailable("TEMPERA_GRASSA"),
});

makeResourceAbility("PCT", "SMUDGE", 20, "cd_SMUDGE", {
	rscType: "SMUDGE",
	applicationDelay: 0, // instant (buff application)
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});
