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
	PotencyModifierFn,
	Skill,
	Spell,
	StatePredicate,
} from "../Skills";
import { GameState } from "../GameState";
import { makeResource, CoolDown } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { ActionKey, TraitKey } from "../Data";
import { PCTStatusPropsGenerator } from "../../Components/Jobs/PCT";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { PCTResourceKey, PCTActionKey, PCTCooldownKey } from "../Data/Jobs/PCT";

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
makePCTResource("INSPIRATION", 1, { timeout: 30 });
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

const MOTIFS: ActionKey[] = ["POM_MOTIF", "WING_MOTIF", "CLAW_MOTIF", "MAW_MOTIF"];

const HAMMER_COMBO: ActionKey[] = ["HAMMER_BRUSH", "HAMMER_STAMP", "POLISHING_HAMMER"];

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

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("STARRY_MUSE")) {
			node.addBuff(BuffType.StarryMuse);
		}
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (
			this.hasResourceAvailable("INSPIRATION") &&
			HYPERPHANTASIA_SKILLS.includes(skill.name as PCTActionKey)
		) {
			node.addBuff(BuffType.Hyperphantasia);
		}
	}

	// apply hyperphantasia + sps adjustment without consuming any resources
	captureSpellCastTime(name: ActionKey, baseCastTime: number): number {
		if (MOTIFS.includes(name)) {
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
		if (MOTIFS.includes(name)) {
			// motifs are unaffected by sps
			return baseRecastTime;
		}
		if (name === "RAINBOW_DRIP") {
			// rainbow drip is not affected by inspiration
			// when rainbow bright is affecting rainbow drip, treat it as a 6s cast
			// then subtract 3.5s from the result
			const recast = this.config.adjustedGCD(baseRecastTime);
			return this.hasResourceAvailable("RAINBOW_BRIGHT") ? recast - 3.5 : recast;
		}
		// hammers are not affected by inspiration
		if (HAMMER_COMBO.includes(name)) {
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
		const aetherhuesStartAmount = this.resources.get("AETHERHUES").availableAmount();
		this.tryConsumeResource("AETHERHUES", true);
		if (aetherhuesStartAmount === 2) {
			// If we previously had 2 stacks, we should now have 0, so do nothing
		} else if (aetherhuesStartAmount === 1) {
			this.gainStatus("AETHERHUES", 2);
		} else {
			this.gainStatus("AETHERHUES", 1);
		}
	}

	// when inspiration + hyperphantasia stacks are available, the cast/recast of paint spells
	// are greatly reduced
	// when all 5 phantasia stacks are consumed, then inspiration is also removed
	tryConsumeHyperphantasia() {
		if (
			this.hasResourceAvailable("INSPIRATION") &&
			// Check if this was the last hyperphantasia stack to be consumed
			this.tryConsumeResource("HYPERPHANTASIA") &&
			!this.hasResourceAvailable("HYPERPHANTASIA")
		) {
			this.tryConsumeResource("INSPIRATION");
			// if all stacks are consumed, gain rainbow bright
			if (this.hasTraitUnlocked("ENHANCED_PICTOMANCY_III")) {
				this.gainStatus("RAINBOW_BRIGHT");
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
	const onConfirm: EffectFn<PCTState> = combineEffects((state, node) => {
		// Consume swift/triple before anything else happens.
		// The code here is dependent on short-circuiting logic to consume the correct resources.
		// Don't consume non-swiftcast resources yet.
		(name === "RAINBOW_DRIP" && state.hasResourceAvailable("RAINBOW_BRIGHT")) ||
			params.baseCastTime === 0 ||
			state.tryConsumeResource("SWIFTCAST");
	}, params.onConfirm);
	return makeSpell("PCT", name, unlockLevel, {
		...params,
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
		isInstantFn: (state) =>
			(name === "RAINBOW_DRIP" && state.hasResourceAvailable("RAINBOW_BRIGHT")) ||
			params.baseCastTime === 0 ||
			state.hasResourceAvailable("SWIFTCAST"),
		onConfirm,
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
		...params,
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("STARRY_MUSE") ? [Modifiers.Starry] : [],
	});

// Conditions for replacing RGB/CMY on hotbar
const redCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_IN_RED",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const greenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_IN_GREEN",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 1),
};
const blueCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_IN_BLUE",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 2),
};
const cyanCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const yellowCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_IN_YELLOW",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 1),
};
const magentaCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_IN_MAGENTA",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 2),
};

const red2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FIRE_II_IN_RED",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const green2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "AERO_II_IN_GREEN",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 1),
};
const blue2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WATER_II_IN_BLUE",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 2),
};
const cyan2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "BLIZZARD_II_IN_CYAN",
	condition: (state) => !state.hasResourceAvailable("AETHERHUES"),
};
const yellow2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "STONE_II_IN_YELLOW",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 1),
};
const magenta2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: "THUNDER_II_IN_MAGENTA",
	condition: (state) => state.hasResourceExactly("AETHERHUES", 2),
};

const rgbStReplaces = [redCondition, greenCondition, blueCondition];
const cmyStReplaces = [cyanCondition, yellowCondition, magentaCondition];
const rgbAoeReplaces = [red2Condition, green2Condition, blue2Condition];
const cmyAoeReplaces = [cyan2Condition, yellow2Condition, magenta2Condition];

// use the creature motif icon when a creature is already drawn
const creatureMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CREATURE_MOTIF",
	condition: (state) => state.hasResourceAvailable("CREATURE_CANVAS"),
};
const pomMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") && !state.hasResourceAvailable("DEPICTIONS"),
};
const wingMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WING_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 1),
};
const clawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 2),
};
const mawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "MAW_MOTIF",
	condition: (state) =>
		!state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 3),
};

const livingMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "LIVING_MUSE",
	condition: (state) => !state.hasResourceAvailable("CREATURE_CANVAS"),
};
const pomMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "POM_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") && !state.hasResourceAvailable("DEPICTIONS"),
};
const wingedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "WINGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 1),
};
const clawedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "CLAWED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 2),
};
const fangedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: "FANGED_MUSE",
	condition: (state) =>
		state.hasResourceAvailable("CREATURE_CANVAS") && state.hasResourceExactly("DEPICTIONS", 3),
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
	replaceIf: rgbStReplaces,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 330],
		["PICTOMANCY_MASTERY_II", 400],
		["PICTOMANCY_MASTERY_III", 450],
		["PICTOMANCY_MASTERY_IV", 520],
	],
	applicationDelay: 0.84,
	validateAttempt: (state) =>
		redCondition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
});

makeSpell_PCT("AERO_IN_GREEN", 5, {
	replaceIf: rgbStReplaces,
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 370],
		["PICTOMANCY_MASTERY_II", 440],
		["PICTOMANCY_MASTERY_III", 490],
		["PICTOMANCY_MASTERY_IV", 560],
	],
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		greenCondition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("WATER_IN_BLUE", 15, {
	replaceIf: rgbStReplaces,
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 410],
		["PICTOMANCY_MASTERY_II", 480],
		["PICTOMANCY_MASTERY_III", 530],
		["PICTOMANCY_MASTERY_IV", 600],
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
	replaceIf: rgbAoeReplaces,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 120],
		["PICTOMANCY_MASTERY_II", 150],
		["PICTOMANCY_MASTERY_IV", 180],
	],
	falloff: 0,
	applicationDelay: 0.84,
	validateAttempt: (state) =>
		red2Condition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
});

makeSpell_PCT("AERO_II_IN_GREEN", 35, {
	replaceIf: rgbAoeReplaces,
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 140],
		["PICTOMANCY_MASTERY_II", 170],
		["PICTOMANCY_MASTERY_IV", 200],
	],
	falloff: 0,
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		green2Condition.condition(state) && !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => !state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("WATER_II_IN_BLUE", 45, {
	replaceIf: rgbAoeReplaces,
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		["NEVER", 170],
		["PICTOMANCY_MASTERY_II", 190],
		["PICTOMANCY_MASTERY_IV", 220],
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
	replaceIf: cmyStReplaces,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 590],
		["PICTOMANCY_MASTERY_II", 710],
		["PICTOMANCY_MASTERY_III", 790],
		["PICTOMANCY_MASTERY_IV", 900],
	],
	applicationDelay: 0.75,
	validateAttempt: (state) =>
		cyanCondition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("STONE_IN_YELLOW", 60, {
	replaceIf: cmyStReplaces,
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 630],
		["PICTOMANCY_MASTERY_II", 750],
		["PICTOMANCY_MASTERY_III", 830],
		["PICTOMANCY_MASTERY_IV", 940],
	],
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		yellowCondition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("THUNDER_IN_MAGENTA", 60, {
	replaceIf: cmyStReplaces,
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 670],
		["PICTOMANCY_MASTERY_II", 790],
		["PICTOMANCY_MASTERY_III", 870],
		["PICTOMANCY_MASTERY_IV", 980],
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
	replaceIf: cmyAoeReplaces,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 270],
		["PICTOMANCY_MASTERY_II", 330],
		["PICTOMANCY_MASTERY_IV", 360],
	],
	falloff: 0,
	applicationDelay: 0.75,
	validateAttempt: (state) =>
		cyan2Condition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("STONE_II_IN_YELLOW", 60, {
	replaceIf: cmyAoeReplaces,
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 290],
		["PICTOMANCY_MASTERY_II", 350],
		["PICTOMANCY_MASTERY_IV", 380],
	],
	falloff: 0,
	applicationDelay: 0.8,
	validateAttempt: (state) =>
		yellow2Condition.condition(state) && state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
	onConfirm: (state) => state.doFiller(),
	highlightIf: (state) => state.hasResourceAvailable("SUBTRACTIVE_PALETTE"),
});

makeSpell_PCT("THUNDER_II_IN_MAGENTA", 60, {
	replaceIf: cmyAoeReplaces,
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		["NEVER", 310],
		["PICTOMANCY_MASTERY_II", 370],
		["PICTOMANCY_MASTERY_IV", 400],
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
		["NEVER", 480],
		["PICTOMANCY_MASTERY_III", 530],
		["PICTOMANCY_MASTERY_IV", 600],
	],
	falloff: 0.65,
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
		["NEVER", 870],
		["PICTOMANCY_MASTERY_IV", 980],
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
	basePotency: 1100,
	applicationDelay: 1.25,
	falloff: 0.7,
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
			state.gainStatus("MONOCHROME_TONES");
		}
		state.gainStatus("SUBTRACTIVE_PALETTE", 3);
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
		replaceIf: creatureConditions,
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
			["NEVER", 700],
			["PICTOMANCY_MASTERY_III", 800],
		],
		0.62,
		pomMuseCondition.condition,
	],
	[
		"WINGED_MUSE",
		30,
		[
			["NEVER", 700],
			["PICTOMANCY_MASTERY_III", 800],
		],
		0.98,
		wingedMuseCondition.condition,
	],
	["CLAWED_MUSE", 96, 800, 0.98, clawedMuseCondition.condition],
	["FANGED_MUSE", 96, 800, 1.16, fangedMuseCondition.condition],
];
livingMuseInfos.forEach(([name, level, potencies, applicationDelay, validateAttempt], i) =>
	makeAbility_PCT(name, level, "cd_LIVING_MUSE", {
		replaceIf: livingConditions,
		startOnHotbar: i === 0,
		potency: potencies,
		falloff: 0.7,
		applicationDelay: applicationDelay,
		cooldown: 40,
		validateAttempt: validateAttempt,
		onConfirm: (state) => {
			const depictions = state.resources.get("DEPICTIONS");
			const portraits = state.resources.get("PORTRAIT");
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
		["NEVER", 800],
		["PICTOMANCY_MASTERY_III", 1000],
	],
	falloff: 0.7,
	applicationDelay: 1.15,
	validateAttempt: (state) => state.hasResourceExactly("PORTRAIT", 1),
	onConfirm: (state) => state.tryConsumeResource("PORTRAIT"),
	cooldown: 30,
	highlightIf: (state) => state.hasResourceAvailable("PORTRAIT"),
});

makeAbility_PCT("RETRIBUTION_OF_THE_MADEEN", 30, "cd_PORTRAIT", {
	replaceIf: [mogCondition],
	startOnHotbar: false,
	potency: 1100,
	falloff: 0.7,
	applicationDelay: 1.3,
	validateAttempt: (state) => state.hasResourceExactly("PORTRAIT", 2),
	onConfirm: (state) => state.tryConsumeResource("PORTRAIT", true),
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
		state.gainStatus("HAMMER_TIME", 3);
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
			["NEVER", 350],
			["PICTOMANCY_MASTERY_II", 420],
			["PICTOMANCY_MASTERY_III", 460],
			["PICTOMANCY_MASTERY_IV", 480],
		],
		1.38,
	],
	[
		"HAMMER_BRUSH",
		86,
		[
			["NEVER", 500],
			["PICTOMANCY_MASTERY_IV", 520],
		],
		1.25,
	],
	[
		"POLISHING_HAMMER",
		86,
		[
			["NEVER", 540],
			["PICTOMANCY_MASTERY_IV", 560],
		],
		2.1,
	],
];
hammerInfos.forEach(([name, level, potencies, applicationDelay], i) =>
	makeSpell_PCT(name, level, {
		replaceIf: hammerConditions,
		baseCastTime: 0,
		startOnHotbar: i === 0,
		basePotency: potencies,
		falloff: 0.7,
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
		// Technically, hyperphantasia is gained on a delay, but whatever
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY")) {
			state.gainStatus("HYPERPHANTASIA", 5);
			state.gainStatus("INSPIRATION");
		}
		if (state.hasTraitUnlocked("ENHANCED_PICTOMANCY_V")) {
			state.gainStatus("STARSTRUCK");
		}
		state.gainStatus("STARRY_MUSE");
		state.gainStatus("SUBTRACTIVE_SPECTRUM");
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
		state.gainStatus("TEMPERA_GRASSA");
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
		const coatElapsed = state.cooldowns.get("cd_TEMPERA_COAT").timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Coat when no timer for Tempera Coat CD was active",
		);
		state.cooldowns
			.get("cd_TEMPERA_COAT")
			.overrideTimeTillNextStack(Math.max(0, coatElapsed - 60));
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
		const coatElapsed = state.cooldowns.get("cd_TEMPERA_COAT").timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Grassa when no timer for Tempera Coat CD was active",
		);
		state.cooldowns
			.get("cd_TEMPERA_COAT")
			.overrideTimeTillNextStack(Math.max(0, coatElapsed - 30));
	},
	highlightIf: (state) => state.hasResourceAvailable("TEMPERA_GRASSA"),
});

makeResourceAbility("PCT", "SMUDGE", 20, "cd_SMUDGE", {
	rscType: "SMUDGE",
	applicationDelay: 0, // instant (buff application)
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});
