// Skill and state declarations for PCT.

import {controller} from "../../Controller/Controller";
import {ShellJob} from "../../Controller/Common";
import {Aspect, ResourceType, SkillName, WarningType} from "../Common";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	NO_EFFECT,
	Spell,
	ValidateAttemptFn,
} from "../Skills";
import {TraitName, Traits} from "../Traits";
import {GameState} from "../GameState";
import {getResourceInfo, makeResource, CoolDown, ResourceInfo} from "../Resources"
import {GameConfig} from "../GameConfig";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makePCTResource = (rsc: ResourceType, maxValue: number, params?: {timeout?: number, default?: number}) => {
	makeResource(ShellJob.PCT, rsc, maxValue, params ?? {});
};

makePCTResource(ResourceType.Portrait, 2);
makePCTResource(ResourceType.Depictions, 3);
// automatically do prepull draws
makePCTResource(ResourceType.CreatureCanvas, 1, {default: 1});
makePCTResource(ResourceType.WeaponCanvas, 1, {default: 1});
makePCTResource(ResourceType.LandscapeCanvas, 1, {default: 1});
makePCTResource(ResourceType.PaletteGauge, 100);
makePCTResource(ResourceType.Paint, 5);

makePCTResource(ResourceType.Aetherhues, 2, {timeout: 30.8});
makePCTResource(ResourceType.MonochromeTones, 1);
makePCTResource(ResourceType.SubtractivePalette, 3);
makePCTResource(ResourceType.HammerTime, 3, {timeout: 30});
makePCTResource(ResourceType.Inspiration, 1);
makePCTResource(ResourceType.SubtractiveSpectrum, 1, {timeout: 30});
makePCTResource(ResourceType.Hyperphantasia, 5, {timeout: 30});
makePCTResource(ResourceType.RainbowBright, 1, {timeout: 30});
makePCTResource(ResourceType.Starstruck, 1, {timeout: 20});
makePCTResource(ResourceType.StarryMuse, 1, {timeout: 20.5});
makePCTResource(ResourceType.TemperaCoat, 1, {timeout: 10});
makePCTResource(ResourceType.TemperaGrassa, 1, {timeout: 10});
makePCTResource(ResourceType.Smudge, 1, {timeout: 5});

makePCTResource(ResourceType.Addle, 1, {timeout: 15});
makePCTResource(ResourceType.Swiftcast, 1, {timeout: 10});
makePCTResource(ResourceType.LucidDreaming, 1, {timeout: 21});
makePCTResource(ResourceType.Surecast, 1, {timeout: 10});

// === JOB GAUGE AND STATE ===
export class PCTState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));
		const livingMuseStacks = Traits.hasUnlocked(TraitName.EnhancedPictomancyIV, config.level) ? 3 : 2;
		this.cooldowns.set(new CoolDown(ResourceType.cd_LivingMuse, 40, livingMuseStacks, livingMuseStacks));
		const steelMuseStacks = Traits.hasUnlocked(TraitName.EnhancedPictomancyII, config.level) ? 2 : 1;
		this.cooldowns.set(new CoolDown(ResourceType.cd_SteelMuse, 40, steelMuseStacks, steelMuseStacks));

		this.registerRecurringEvents();
	}

	// apply hyperphantasia + sps adjustment without consuming any resources
	captureSpellCastTime(name: SkillName, baseCastTime: number): number {
		if (name.includes("Motif")) {
			// motifs are not affected by sps
			return baseCastTime;
		}
		if (name === SkillName.RainbowDrip) {
			// rainbow drip is not affected by inspiration
			return this.hasResourceAvailable(ResourceType.RainbowBright) ? 0 : this.config.adjustedCastTime(baseCastTime);
		}
		return this.config.adjustedCastTime(
			baseCastTime,
			this.hasResourceAvailable(ResourceType.Inspiration) ? ResourceType.Inspiration : undefined
		);
	}

	captureSpellRecastTime(name: SkillName, baseRecastTime: number): number {
		if (name.includes("Motif")) {
			// motifs are unaffected by sps
			return baseRecastTime;
		}
		if (name === SkillName.RainbowDrip) {
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
			this.hasResourceAvailable(ResourceType.Inspiration) ? ResourceType.Inspiration : undefined
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
		const dropTime = (getResourceInfo(ShellJob.PCT, ResourceType.Aetherhues) as ResourceInfo).maxTimeout;
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
				fnOnRsc: rsc => this.resources.get(ResourceType.Aetherhues).overrideCurrentValue(0),
			});
		}
	}

	// when inspiration + hyperphantasia stacks are available, the cast/recast of paint spells
	// are greatly reduced
	// when all 5 phantasia stacks are consumed, then inspiration is also removed
	tryConsumeHyperphantasia() {
		let hyperphantasia = this.resources.get(ResourceType.Hyperphantasia);
		let inspiration = this.resources.get(ResourceType.Inspiration);
		if (inspiration.available(1) && hyperphantasia.available(1) && hyperphantasia.pendingChange) {
			// consume a stack
			hyperphantasia.consume(1);
			// if all stacks are consumed, stop timers and gain rainbow bright
			if (hyperphantasia.availableAmount() === 0) {
				inspiration.consume(1);
				hyperphantasia.removeTimer();
				inspiration.removeTimer();
				if (Traits.hasUnlocked(TraitName.EnhancedPictomancyIII, this.config.level)) {
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

const makeGCD_PCT = (name: SkillName, unlockLevel: number, params: {
	replaceIf?: ConditionalSkillReplace<PCTState>[],
	startOnHotbar?: boolean,
	aspect?: Aspect,
	baseCastTime: number,
	baseRecastTime?: number,
	baseManaCost?: number,
	basePotency?: number | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt?: ValidateAttemptFn<PCTState>,
	onConfirm?: EffectFn<PCTState>,
	onApplication?: EffectFn<PCTState>,
}): Spell<PCTState> => {
	const aspect = params.aspect ?? Aspect.Other;
	const baseRecastTime = params.baseRecastTime ?? 2.5;
	let onConfirm: EffectFn<PCTState> = combineEffects(
		(state, node) => {
			// Consume swift/triple before anything else happens.
			// The code here is dependent on short-circuiting logic to consume the correct resources.
			// Don't consume non-swiftcast resources yet.
			(name === SkillName.RainbowDrip && state.hasResourceAvailable(ResourceType.RainbowBright)) ||
			(name === SkillName.StarPrism) ||
			(name === SkillName.HolyInWhite) ||
			(name === SkillName.CometInBlack) ||
			(aspect === Aspect.Hammer) ||
			state.tryConsumeResource(ResourceType.Swiftcast)
		},
		params.onConfirm ?? NO_EFFECT,
	);
	const onApplication: EffectFn<PCTState> = params.onApplication ?? NO_EFFECT;
	return makeSpell(ShellJob.PCT, name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		aspect: aspect,
		castTime: (state) => state.captureSpellCastTime(name, params.baseCastTime),
		recastTime: (state) => state.captureSpellRecastTime(name, baseRecastTime),
		manaCost: params.baseManaCost ?? 0,
		potency: params.basePotency,
		validateAttempt: params.validateAttempt,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => (
			(name === SkillName.RainbowDrip && state.hasResourceAvailable(ResourceType.RainbowBright)) ||
			(name === SkillName.StarPrism) ||
			(name === SkillName.HolyInWhite) ||
			(name === SkillName.CometInBlack) ||
			(aspect === Aspect.Hammer) ||
			state.hasResourceAvailable(ResourceType.Swiftcast)
		),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};

const makeAbility_PCT = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
	potency?: number | Array<[TraitName, number]>,
	replaceIf?: ConditionalSkillReplace<PCTState>[],
	startOnHotbar?: boolean,
	applicationDelay?: number,
	cooldown: number,
	maxCharges?: number,
	validateAttempt?: ValidateAttemptFn<PCTState>,
	onConfirm?: EffectFn<PCTState>,
	onApplication?: EffectFn<PCTState>,
}): Ability<PCTState> => makeAbility(ShellJob.PCT, name, unlockLevel, cdName, params);

// Conditions for replacing RGB/CMY on hotbar
const redCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.FireInRed,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const greenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.AeroInGreen,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const blueCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.WaterInBlue,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};
const cyanCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.BlizzardInCyan,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const yellowCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.StoneInYellow,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const magentaCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.ThunderInMagenta,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};

const red2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Fire2InRed,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const green2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Aero2InGreen,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const blue2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Water2InBlue,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};
const cyan2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Blizzard2InCyan,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Aetherhues),
};
const yellow2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Stone2InYellow,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 1,
};
const magenta2Condition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.Thunder2InMagenta,
	condition: (state) => state.resources.get(ResourceType.Aetherhues).availableAmount() === 2,
};

// use the creature motif icon when a creature is already drawn
const creatureMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.CreatureMotif,
	condition: (state) => state.hasResourceAvailable(ResourceType.CreatureCanvas),
};
const pomMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.PomMotif,
	condition: (state) => (
		!state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 0
	),
};
const wingMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.WingMotif,
	condition: (state) => (
		!state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 1
	),
};
const clawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.ClawMotif,
	condition: (state) => (
		!state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 2
	),
};
const mawMotifCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.MawMotif,
	condition: (state) => (
		!state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 3
	),
};

const livingMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.LivingMuse,
	condition: (state) => !state.hasResourceAvailable(ResourceType.CreatureCanvas),
};
const pomMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.PomMuse,
	condition: (state) => (
		state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 0
	),
};
const wingedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.WingedMuse,
	condition: (state) => (
		state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 1
	),
};
const clawedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.ClawedMuse,
	condition: (state) => (
		state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 2
	),
};
const fangedMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.FangedMuse,
	condition: (state) => (
		state.hasResourceAvailable(ResourceType.CreatureCanvas)
		&& state.resources.get(ResourceType.Depictions).availableAmount() === 3
	),
};

const mogCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.MogOfTheAges,
	// mog is shown when no portrait is available
	condition: (state) => state.resources.get(ResourceType.Portrait).availableAmount() !== 2,
};
const madeenCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.RetributionOfTheMadeen,
	condition: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 2,
};

const weaponCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.WeaponMotif,
	condition: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
};
const hammerCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.HammerMotif,
	condition: (state) => !state.hasResourceAvailable(ResourceType.WeaponCanvas),
};

const steelCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.SteelMuse,
	condition: (state) => !state.hasResourceAvailable(ResourceType.WeaponCanvas),
};
const strikingCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.StrikingMuse,
	condition: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas),
};

const landscapeCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.LandscapeMotif,
	condition: (state) => state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};
const starrySkyCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.StarrySkyMotif,
	condition: (state) => !state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};

const scenicCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.ScenicMuse,
	condition: (state) => !state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};
const starryMuseCondition: ConditionalSkillReplace<PCTState> = {
	newSkill: SkillName.StarryMuse,
	condition: (state) => state.hasResourceAvailable(ResourceType.LandscapeCanvas),
};

makeGCD_PCT(SkillName.FireInRed, 1, {
	replaceIf: [greenCondition, blueCondition],
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 280],
		[TraitName.PictomancyMasteryII, 340],
		[TraitName.PictomancyMasteryIII, 380],
		[TraitName.PictomancyMasteryIV, 440],
	],
	applicationDelay: 0.84,
	validateAttempt: (state) => redCondition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.AeroInGreen, 5, {
	replaceIf: [redCondition, blueCondition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 320],
		[TraitName.PictomancyMasteryII, 380],
		[TraitName.PictomancyMasteryIII, 420],
		[TraitName.PictomancyMasteryIV, 480],
	],
	applicationDelay: 0.89,
	validateAttempt: (state) => greenCondition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.WaterInBlue, 15, {
	replaceIf: [redCondition, greenCondition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 360],
		[TraitName.PictomancyMasteryII, 420],
		[TraitName.PictomancyMasteryIII, 460],
		[TraitName.PictomancyMasteryIV, 520],
	],
	applicationDelay: 0.98,
	validateAttempt: (state) => blueCondition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller()
		const paletteGauge = state.resources.get(ResourceType.PaletteGauge);
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PolyglotOvercap);
		}
		paletteGauge.gain(25);
		if (Traits.hasUnlocked(TraitName.EnhancedArtistry, state.config.level)) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
});


makeGCD_PCT(SkillName.Fire2InRed, 25, {
	replaceIf: [green2Condition, blue2Condition],
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 80],
		[TraitName.PictomancyMasteryII, 100],
		[TraitName.PictomancyMasteryIV, 120],
	],
	applicationDelay: 0.84,
	validateAttempt: (state) => red2Condition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.Aero2InGreen, 35, {
	replaceIf: [red2Condition, blue2Condition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 100],
		[TraitName.PictomancyMasteryII, 120],
		[TraitName.PictomancyMasteryIV, 140],
	],
	applicationDelay: 0.89,
	validateAttempt: (state) => green2Condition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.Water2InBlue, 45, {
	replaceIf: [red2Condition, green2Condition],
	startOnHotbar: false,
	baseCastTime: 1.5,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 120],
		[TraitName.PictomancyMasteryII, 140],
		[TraitName.PictomancyMasteryIV, 160],
	],
	applicationDelay: 0.89,
	validateAttempt: (state) => blue2Condition.condition(state) && !state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller()
		const paletteGauge = state.resources.get(ResourceType.PaletteGauge);
		if (paletteGauge.available(100)) {
			controller.reportWarning(WarningType.PolyglotOvercap);
		}
		paletteGauge.gain(25);
		if (Traits.hasUnlocked(TraitName.EnhancedArtistry, state.config.level)) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
});

makeGCD_PCT(SkillName.BlizzardInCyan, 60, {
	replaceIf: [yellowCondition, magentaCondition],
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 520],
		[TraitName.PictomancyMasteryII, 630],
		[TraitName.PictomancyMasteryIII, 700],
		[TraitName.PictomancyMasteryIV, 800],
	],
	applicationDelay: 0.75,
	validateAttempt: (state) => cyanCondition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.StoneInYellow, 60, {
	replaceIf: [cyanCondition, magentaCondition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 560],
		[TraitName.PictomancyMasteryII, 670],
		[TraitName.PictomancyMasteryIII, 740],
		[TraitName.PictomancyMasteryIV, 840],
	],
	applicationDelay: 0.80,
	validateAttempt: (state) => yellowCondition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.ThunderInMagenta, 60, {
	replaceIf: [cyanCondition, yellowCondition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 600],
		[TraitName.PictomancyMasteryII, 710],
		[TraitName.PictomancyMasteryIII, 780],
		[TraitName.PictomancyMasteryIV, 880],
	],
	applicationDelay: 0.80,
	validateAttempt: (state) => magentaCondition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		if (Traits.hasUnlocked(TraitName.EnhancedArtistry, state.config.level)) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
});

makeGCD_PCT(SkillName.Blizzard2InCyan, 60, {
	replaceIf: [yellow2Condition, magenta2Condition],
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 180],
		[TraitName.PictomancyMasteryII, 220],
		[TraitName.PictomancyMasteryIV, 240],
	],
	applicationDelay: 0.75,
	validateAttempt: (state) => cyan2Condition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.Stone2InYellow, 60, {
	replaceIf: [cyan2Condition, magenta2Condition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 200],
		[TraitName.PictomancyMasteryII, 240],
		[TraitName.PictomancyMasteryIV, 260],
	],
	applicationDelay: 0.80,
	validateAttempt: (state) => yellow2Condition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => state.doFiller(),
});

makeGCD_PCT(SkillName.Thunder2InMagenta, 60, {
	replaceIf: [cyan2Condition, yellow2Condition],
	startOnHotbar: false,
	baseCastTime: 2.3,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 220],
		[TraitName.PictomancyMasteryII, 260],
		[TraitName.PictomancyMasteryIV, 280],
	],
	applicationDelay: 0.80,
	validateAttempt: (state) => magenta2Condition.condition(state) && state.hasResourceAvailable(ResourceType.SubtractivePalette),
	onConfirm: (state) => {
		state.doFiller();
		if (Traits.hasUnlocked(TraitName.EnhancedArtistry, state.config.level)) {
			state.resources.get(ResourceType.Paint).gain(1);
		}
	},
});

makeGCD_PCT(SkillName.HolyInWhite, 80, {
	baseCastTime: 0,
	baseManaCost: 300,
	basePotency: [
		[TraitName.Never, 420],
		[TraitName.PictomancyMasteryIII, 460],
		[TraitName.PictomancyMasteryIV, 520],
	],
	applicationDelay: 1.34,
	validateAttempt: (state) => (
		!state.hasResourceAvailable(ResourceType.MonochromeTones)
		&& state.hasResourceAvailable(ResourceType.Paint)
	),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Paint);
		state.tryConsumeHyperphantasia();
	},
});

makeGCD_PCT(SkillName.CometInBlack, 90, {
	baseCastTime: 0,
	baseRecastTime: 3.3,
	baseManaCost: 400,
	basePotency: [
		[TraitName.Never, 780],
		[TraitName.PictomancyMasteryIV, 880],
	],
	applicationDelay: 1.87,
	validateAttempt: (state) => (
		state.hasResourceAvailable(ResourceType.MonochromeTones)
		&& state.hasResourceAvailable(ResourceType.Paint)
	),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Paint);
		state.tryConsumeResource(ResourceType.MonochromeTones);
		state.tryConsumeHyperphantasia();
	},
});

makeGCD_PCT(SkillName.RainbowDrip, 92, {
	baseCastTime: 4,
	baseRecastTime: 6,
	baseManaCost: 400,
	basePotency: 1000,
	applicationDelay: 1.24,
	onConfirm: (state) => {
		// gain a holy stack
		state.resources.get(ResourceType.Paint).gain(1);
		state.tryConsumeResource(ResourceType.RainbowBright);
	},
});

makeGCD_PCT(SkillName.StarPrism, 100, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 1400,
	applicationDelay: 1.25,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Starstruck),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.Starstruck);
		state.tryConsumeHyperphantasia();
	},
});

makeAbility_PCT(SkillName.SubtractivePalette, 60, ResourceType.cd_Subtractive, {
	cooldown: 1,
	validateAttempt: (state) => (
		// Check we are not already in subtractive
		!state.hasResourceAvailable(ResourceType.SubtractivePalette) &&
		// Check if free subtractive from starry muse or 50 gauge is available
		(
			state.hasResourceAvailable(ResourceType.SubtractiveSpectrum) ||
			state.hasResourceAvailable(ResourceType.PaletteGauge, 50)
		)
	),
	onConfirm: (state) => {
		if (!state.tryConsumeResource(ResourceType.SubtractiveSpectrum)) {
			state.resources.get(ResourceType.PaletteGauge).consume(50);
		}
		// gain comet (caps at 1)
		if (state.hasResourceAvailable(ResourceType.MonochromeTones)) {
			controller.reportWarning(WarningType.CometOverwrite);
		}
		if (Traits.hasUnlocked(TraitName.EnhancedPalette, state.config.level)) {
			state.resources.get(ResourceType.MonochromeTones).gain(1);
		}
		state.resources.get(ResourceType.SubtractivePalette).gain(3);
	},
});

const creatureConditions = [creatureMotifCondition, pomMotifCondition, wingMotifCondition, clawMotifCondition, mawMotifCondition];
// [name, level, validation]
const creatureInfos: Array<[SkillName, number, ValidateAttemptFn<PCTState>]> = [
	// creature motif can never itself be cast
	[SkillName.CreatureMotif, 30, (state) => false],
	[SkillName.PomMotif, 30, pomMotifCondition.condition],
	[SkillName.WingMotif, 30, wingMotifCondition.condition],
	[SkillName.ClawMotif, 96, clawMotifCondition.condition],
	[SkillName.MawMotif, 96, mawMotifCondition.condition],
];
creatureInfos.forEach(([name, level, validateAttempt], i) => makeGCD_PCT(name, level, {
	replaceIf: creatureConditions.slice(0, i).concat(creatureConditions.slice(i + 1)),
	startOnHotbar: i === 0,
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: validateAttempt,
	onConfirm: (state) => state.resources.get(ResourceType.CreatureCanvas).gain(1),
}));

const livingConditions = [livingMuseCondition, pomMuseCondition, wingedMuseCondition, clawedMuseCondition, fangedMuseCondition];
// [name, level, potency, delay, validation]
const livingMuseInfos: Array<[SkillName, number, number | Array<[TraitName, number]>, number, ValidateAttemptFn<PCTState>]> = [
	// living muse can never itself be cast
	[SkillName.LivingMuse, 30, 0, 0, (state) => false],
	[SkillName.PomMuse, 30, 
		[[TraitName.Never, 1000], [TraitName.PictomancyMasteryIII, 1100]],
		0.62, pomMuseCondition.condition],
	[SkillName.WingedMuse, 30,
		[[TraitName.Never, 1000], [TraitName.PictomancyMasteryIII, 1100]],
		0.98, wingedMuseCondition.condition],
	[SkillName.ClawedMuse, 96, 1100, 0.98, clawedMuseCondition.condition],
	[SkillName.FangedMuse, 96, 1100, 1.16, fangedMuseCondition.condition],
];
livingMuseInfos.forEach(([name, level, potencies, applicationDelay, validateAttempt], i) => makeAbility_PCT(name, level, ResourceType.cd_LivingMuse, {
	replaceIf: livingConditions.slice(0, i).concat(livingConditions.slice(i + 1)),
	startOnHotbar: i === 0,
	potency: potencies,
	applicationDelay: applicationDelay,
	cooldown: 40,
	validateAttempt: validateAttempt,
	onConfirm: (state) => {
		let depictions = state.resources.get(ResourceType.Depictions);
		let portraits = state.resources.get(ResourceType.Portrait);
		state.tryConsumeResource(ResourceType.CreatureCanvas);
		depictions.gain(1);
		// wing: make moogle portrait available (overwrites madeen)
		if (name === SkillName.WingedMuse) {
			portraits.overrideCurrentValue(1);
			// below lvl 94, there's no madeen, so wrap depictions back to 0
			if (!Traits.hasUnlocked(TraitName.EnhancedPictomancyIV, state.config.level)) {
				depictions.overrideCurrentValue(0);
			}
		}
		// maw: make madeen portrait available (overwrites moogle)
		// reset depictions to empty
		if (name === SkillName.FangedMuse) {
			portraits.overrideCurrentValue(2);
			depictions.overrideCurrentValue(0);
		}
	},
	maxCharges: 3, // lower this value in the state constructor when level synced
}));

makeAbility_PCT(SkillName.MogOfTheAges, 30, ResourceType.cd_Portrait, {
	replaceIf: [madeenCondition],
	potency: [
		[TraitName.Never, 1100],
		[TraitName.PictomancyMasteryIII, 1300],
	],
	applicationDelay: 1.15,
	validateAttempt: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 1,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Portrait),
	cooldown: 30,
});

makeAbility_PCT(SkillName.RetributionOfTheMadeen, 30, ResourceType.cd_Portrait, {
	replaceIf: [mogCondition],
	startOnHotbar: false,
	potency: 1400,
	applicationDelay: 1.30,
	validateAttempt: (state) => state.resources.get(ResourceType.Portrait).availableAmount() === 2,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Portrait),
	cooldown: 30,
});

makeGCD_PCT(SkillName.WeaponMotif, 50, {
	replaceIf: [hammerCondition],
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false, // hammer motif can never itself be cast
});

makeGCD_PCT(SkillName.HammerMotif, 50, {
	replaceIf: [weaponCondition],
	startOnHotbar: false,
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => (
		hammerCondition.condition(state)
		&& !state.hasResourceAvailable(ResourceType.HammerTime)
	),
	onConfirm: (state) => state.resources.get(ResourceType.WeaponCanvas).gain(1),
});

makeAbility_PCT(SkillName.SteelMuse, 50, ResourceType.cd_SteelMuse, {
	replaceIf: [strikingCondition],
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => false, // steel muse can never itself be cast
});

makeAbility_PCT(SkillName.StrikingMuse, 50, ResourceType.cd_SteelMuse, {
	replaceIf: [steelCondition],
	startOnHotbar: false,
	cooldown: 60,
	maxCharges: 2, // lower this value in the state constructor when level synced
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.WeaponCanvas) && state.isInCombat(),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.WeaponCanvas);
		state.resources.get(ResourceType.HammerTime).gain(3);
		state.enqueueResourceDrop(ResourceType.HammerTime);
	},
});

const hammerConditions: ConditionalSkillReplace<PCTState>[] = [
	{
		newSkill: SkillName.HammerStamp,
		condition: (state) => (
			Traits.hasUnlocked(TraitName.EnhancedPictomancyII, state.config.level)
				// TODO properly mimic combo behavior
				? state.getHammerStacks() === 3
				: state.getHammerStacks() > 0
		),
	},
	{
		newSkill: SkillName.HammerBrush,
		condition: (state) => (
			Traits.hasUnlocked(TraitName.EnhancedPictomancyII, state.config.level)
			// TODO properly mimic combo behavior
			&& state.getHammerStacks() === 2
		),
	},
	{
		newSkill: SkillName.PolishingHammer,
		condition: (state) => (
			Traits.hasUnlocked(TraitName.EnhancedPictomancyII, state.config.level)
			// TODO properly mimic combo behavior
			&& state.getHammerStacks() === 1
		),
	}
];
// [name, level, potency, delay]
const hammerInfos: Array<[SkillName, number, number | Array<[TraitName, number]>, number]> = [
	[SkillName.HammerStamp, 50, [
			[TraitName.Never, 380],
			[TraitName.PictomancyMasteryII, 480],
			[TraitName.PictomancyMasteryIII, 520],
			[TraitName.PictomancyMasteryIV, 560],
		], 1.38],
	[SkillName.HammerBrush, 86, [
			[TraitName.Never, 580],
			[TraitName.PictomancyMasteryIV, 620],
		], 1.25],
	[SkillName.PolishingHammer, 86, [
			[TraitName.Never, 640],
			[TraitName.PictomancyMasteryIV, 680],
		], 2.10],
];
hammerInfos.forEach(([name, level, potencies, applicationDelay], i) => makeGCD_PCT(name, level, {
	replaceIf: hammerConditions.slice(0, i).concat(hammerConditions.slice(i + 1)),
	aspect: Aspect.Hammer,
	baseCastTime: 0,
	startOnHotbar: i === 0,
	basePotency: potencies,
	applicationDelay: applicationDelay,
	validateAttempt: hammerConditions[i].condition,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.HammerTime),
}));

makeGCD_PCT(SkillName.LandscapeMotif, 70, {
	replaceIf: [starrySkyCondition],
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false, // landscape motif can never itself be cast
});

makeGCD_PCT(SkillName.StarrySkyMotif, 70, {
	replaceIf: [landscapeCondition],
	startOnHotbar: false,
	baseCastTime: 3,
	baseRecastTime: 4,
	baseManaCost: 0,
	applicationDelay: 0,
	validateAttempt: (state) => (
		starrySkyCondition.condition(state)
		&& !state.hasResourceAvailable(ResourceType.StarryMuse)
	),
	onConfirm: (state) => state.resources.get(ResourceType.LandscapeCanvas).gain(1),
});

makeAbility_PCT(SkillName.ScenicMuse, 70, ResourceType.cd_ScenicMuse, {
	replaceIf: [starryMuseCondition],
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => false, // scenic muse can never itself be cast
});

makeAbility_PCT(SkillName.StarryMuse, 70, ResourceType.cd_ScenicMuse, {
	replaceIf: [scenicCondition],
	startOnHotbar: false,
	applicationDelay: 0, // raid buff is instant, but inspiration is delayed by 0.62s
	cooldown: 120,
	validateAttempt: (state) => starryMuseCondition.condition(state) && state.isInCombat(),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.LandscapeCanvas);
		// It is not possible to have an existing starry active
		// unless someone added starry muse via the party buff menu.
		// Since this fork is hacky we just ignore this case for now.
		state.resources.get(ResourceType.StarryMuse).gain(1);
		// Technically, hyperphantasia is gained on a delay, but whatever
		if (Traits.hasUnlocked(TraitName.EnhancedPictomancy, state.config.level)) {
			state.resources.get(ResourceType.Hyperphantasia).gain(5);
			state.resources.get(ResourceType.Inspiration).gain(1);

			const hpDuration = (getResourceInfo(ShellJob.PCT, ResourceType.Hyperphantasia) as ResourceInfo).maxTimeout;
			state.enqueueResourceDrop(ResourceType.Hyperphantasia, hpDuration);
			state.enqueueResourceDrop(ResourceType.Inspiration, hpDuration);
		}
		if (Traits.hasUnlocked(TraitName.EnhancedPictomancyV, state.config.level)) {
			state.resources.get(ResourceType.Starstruck).gain(1);
			state.enqueueResourceDrop(ResourceType.Starstruck);
		}
		state.resources.get(ResourceType.SubtractiveSpectrum).gain(1);
		state.enqueueResourceDrop(ResourceType.StarryMuse);
		state.enqueueResourceDrop(ResourceType.SubtractiveSpectrum);
	},
});

makeResourceAbility(ShellJob.PCT, SkillName.TemperaCoat, 10, ResourceType.cd_TemperaCoat, {
	rscType: ResourceType.TemperaCoat,
	replaceIf: [{
		newSkill: SkillName.TemperaCoatPop,
		condition: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	}],
	applicationDelay: 0, // instant
	cooldown: 120,
});

makeAbility_PCT(SkillName.TemperaGrassa, 88, ResourceType.cd_Grassa, {
	replaceIf: [{
		newSkill: SkillName.TemperaGrassaPop,
		condition: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
	}],
	applicationDelay: 0, // instant
	cooldown: 120,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	onConfirm: (state) => {
		// goodbye, tempera coat
		state.tryConsumeResource(ResourceType.TemperaCoat);
		// hello, tempera grassa
		state.resources.get(ResourceType.TemperaGrassa).gain(1);
		state.enqueueResourceDrop(ResourceType.TemperaGrassa);
	},
});

// fake skill to represent breaking the coat shield
makeAbility_PCT(SkillName.TemperaCoatPop, 10, ResourceType.cd_TemperaPop, {
	replaceIf: [{
		newSkill: SkillName.TemperaGrassaPop,
		condition: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
	}],
	startOnHotbar: false,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.TemperaCoat);
		// Reduce the cooldown of tempera coat by 60s
		let coatElapsed = state.cooldowns.get(ResourceType.cd_TemperaCoat).timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Coat when no timer for Tempera Coat CD was active"
		);
		state.cooldowns.get(ResourceType.cd_TemperaCoat).overrideCurrentValue(180 - coatElapsed);
	},
});

// fake skill to represent breaking the grassa shield
makeAbility_PCT(SkillName.TemperaGrassaPop, 10, ResourceType.cd_TemperaPop, {
	replaceIf: [{
		newSkill: SkillName.TemperaCoatPop,
		condition: (state) => state.hasResourceAvailable(ResourceType.TemperaCoat),
	}],
	startOnHotbar: false,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TemperaGrassa),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.TemperaGrassa);
		// Reduce the cooldown of tempera coat by 30s
		let coatElapsed = state.cooldowns.get(ResourceType.cd_TemperaCoat).timeTillNextStackAvailable();
		console.assert(
			coatElapsed > 0,
			"attempted to pop Tempera Grassa when no timer for Tempera Coat CD was active"
		);
		state.cooldowns.get(ResourceType.cd_TemperaCoat).overrideCurrentValue(150 - coatElapsed);
	},
});

makeResourceAbility(ShellJob.PCT, SkillName.Smudge, 20, ResourceType.cd_Smudge, {
	rscType: ResourceType.Smudge,
	applicationDelay: 0, // instant (buff application)
	cooldown: 20,
});

// TODO this function is kept here to avoid circular imports, but should probably be moved
export function newGameState(config: GameConfig) {
	return new PCTState(config);
}