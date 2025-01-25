// Skill and state declarations for SMN.

import { controller } from "../../Controller/Controller";
import { Aspect, BuffType, ProcMode, WarningType } from "../Common";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	Spell,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { getResourceInfo, makeResource, CoolDown, Resource, ResourceInfo } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { ActionKey, CooldownKey, TraitKey } from "../Data";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { SMNStatusPropsGenerator } from "../../Components/Jobs/SMN";
import { SMNResourceKey, SMNActionKey } from "../Data/Jobs/SMN";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeSMNResource = (
	rsc: SMNResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("SMN", rsc, maxValue, params ?? {});
};


enum ActiveDemiValues {
	NONE = 0,
	SOLAR = 1,
	BAHAMUT = 2,
	PHOENIX = 3,
}

makeSMNResource("AETHERFLOW", 2);
makeSMNResource("RUBY_ARCANUM", 1);
makeSMNResource("TOPAZ_ARCANUM", 1);
makeSMNResource("EMERALD_ARCANUM", 1);
makeSMNResource("RUBY_ATTUNEMENT", 2, { timeout: 30 });
makeSMNResource("TOPAZ_ATTUNEMENT", 4, { timeout: 30 });
makeSMNResource("EMERALD_ATTUNEMENT", 4, { timeout: 30 });
makeSMNResource("CRIMSON_STRIKE_READY", 1);
makeSMNResource("EVERLASTING_FLIGHT", 1, { timeout: 21 });
makeSMNResource("FURTHER_RUIN", 1, { timeout: 60 });
makeSMNResource("GARUDAS_FAVOR", 1);
makeSMNResource("IFRITS_FAVOR", 1);
makeSMNResource("TITANS_FAVOR", 1);
makeSMNResource("RADIANT_AEGIS", 2, { timeout: 30 }); // upgraded by trait
makeSMNResource("REFULGENT_LUX", 1, { timeout: 30 });
makeSMNResource("REKINDLE", 1, { timeout: 30 });
makeSMNResource("UNDYING_FLAME", 1, { timeout: 15 });
makeSMNResource("RUBYS_GLIMMER", 1, { timeout: 30 });
makeSMNResource("SEARING_LIGHT", 1, { timeout: 20 });
makeSMNResource("SLIPSTREAM", 1, { timeout: 15 });
// 0 = no demi, 1 = solar, 2 = baha, 3 = phoenix
makeSMNResource("ACTIVE_DEMI", 2, { timeout: 15 });
// needed to distinguish between the 1min and 3min bahamuts
// at level 100: 0 = next summon is solar, 1 = baha, 2 = phoenix, 3 = baha
// at level 80/90: 0 = baha, 1 = phoenix, 2 = baha, 3 = phoenix
// at level 70: any value is baha
makeSMNResource("NEXT_DEMI_CYCLE", 3);

// === JOB GAUGE AND STATE ===
export class SMNState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = this.hasTraitUnlocked("ENHANCED_SWIFTCAST") ? 40 : 60;
		this.cooldowns.set(new CoolDown("cd_SWIFTCAST", swiftcastCooldown, 1, 1));
		const aegisStacks = this.hasTraitUnlocked("ENHANCED_RADIANT_AEGIS") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_RADIANT_AEGIS", 60, aegisStacks, aegisStacks));
		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SMNState> {
		return new SMNStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("SEARING_LIGHT")) {
			node.addBuff(BuffType.Embolden);
		}
	}

	get activeDemi(): number {
		return this.resources.get("ACTIVE_DEMI").availableAmount();
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeSpell_SMN = (
	name: SMNActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		replaceIf?: ConditionalSkillReplace<SMNState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<SMNState>;
		baseCastTime?: number;
		baseRecastTime?: number;
		manaCost: number;
		basePotency?: number | Array<[TraitKey, number]>;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<SMNState>;
		onConfirm?: EffectFn<SMNState>;
	},
): Spell<SMNState> => {
	const baseCastTime = params.baseCastTime ?? 0;
	const baseRecastTime = params.baseRecastTime ?? 2.5;
	// R3 and ifrit fillers consume swiftcast
	const onConfirm: EffectFn<SMNState> | undefined =
		baseCastTime > 0
			? combineEffects(
					(state) => state.tryConsumeResource("SWIFTCAST"),
					params.onConfirm ?? NO_EFFECT,
				)
			: params.onConfirm;
	return makeSpell("SMN", name, unlockLevel, {
		...params,
		castTime: (state) => state.config.adjustedCastTime(baseCastTime),
		// em rite does not get scaled by sps
		recastTime: (state) =>
			baseRecastTime <= 1.0 ? 1.0 : state.config.adjustedGCD(baseRecastTime),
		potency: params.basePotency,
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("SEARING_LIGHT") ? [Modifiers.SearingLight] : [],
		isInstantFn: (state) => state.hasResourceAvailable("SWIFTCAST") || baseCastTime === 0,
		onConfirm,
	});
};

const makeAbility_SMN = (
	name: SMNActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<SMNState>[];
		highlightIf?: StatePredicate<SMNState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<SMNState>;
		onConfirm?: EffectFn<SMNState>;
		onApplication?: EffectFn<SMNState>;
	},
): Ability<SMNState> =>
	makeAbility("SMN", name, unlockLevel, cdName, {
		jobPotencyModifiers: (state) =>
			state.hasResourceAvailable("SEARING_LIGHT") ? [Modifiers.SearingLight] : [],
		...params,
	});

// manual stand-in for toSpliced, available in ES2023
function toSpliced<T>(arr: T[], i: number): T[] {
	const newArr = arr.slice();
	newArr.splice(i, 1);
	return newArr;
}

const r3ReplaceList: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "ASTRAL_IMPULSE",
		condition: (state) => state.activeDemi === ActiveDemiValues.BAHAMUT,
	},
	{
		newSkill: "FOUNTAIN_OF_FIRE",
		condition: (state) => state.activeDemi === ActiveDemiValues.PHOENIX,
	},
	{
		newSkill: "UMBRAL_IMPULSE",
		condition: (state) => state.activeDemi === ActiveDemiValues.SOLAR,
	}
];

makeSpell_SMN("RUIN_III", 54, {
	basePotency: [
		["NEVER", 300],
		["RUIN_MASTERY_IV", 310],
		["ARCANE_MASTERY", 360],
	],
	baseCastTime: 1.5,
	manaCost: 300,
	replaceIf: r3ReplaceList,
	applicationDelay: 0.8,
});

makeSpell_SMN("ASTRAL_IMPULSE", 58, {
	basePotency: [
		["NEVER", 440],
		["ARCANE_MASTERY", 500],
	],
	manaCost: 300,
	replaceIf: toSpliced(r3ReplaceList, 0),
	applicationDelay: 0.67,
	validateAttempt: r3ReplaceList[0].condition, 
	startOnHotbar: false,
});

makeSpell_SMN("FOUNTAIN_OF_FIRE", 80, {
	basePotency: [
		["NEVER", 540],
		["ARCANE_MASTERY", 580],
	],
	manaCost: 300,
	replaceIf: toSpliced(r3ReplaceList, 1),
	applicationDelay: 1.07,
	validateAttempt: r3ReplaceList[1].condition,
	startOnHotbar: false,
});

makeSpell_SMN("UMBRAL_IMPULSE", 100, {
	basePotency: 620,
	manaCost: 300,
	replaceIf: toSpliced(r3ReplaceList, 2),
	applicationDelay: 0.80,
	validateAttempt: r3ReplaceList[2].condition,
	startOnHotbar: false,
});

const outburstReplaceList: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "ASTRAL_FLARE",
		condition: (state) => state.activeDemi === ActiveDemiValues.BAHAMUT,
	},
	{
		newSkill: "BRAND_OF_PURGATORY",
		condition: (state) => state.activeDemi === ActiveDemiValues.PHOENIX,
	},
	{
		newSkill: "UMBRAL_FLARE",
		condition: (state) => state.activeDemi === ActiveDemiValues.SOLAR,
	}
];

makeSpell_SMN("OUTBURST", 26, {
	autoUpgrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "TRI_DISASTER",
	},
	basePotency: 100,
	baseCastTime: 1.5,
	manaCost: 300,
	replaceIf: outburstReplaceList,
	applicationDelay: 0.8, // TODO
	falloff: 0,
});

makeSpell_SMN("TRI_DISASTER", 74, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "OUTBURST",
	},
	basePotency: 120,
	baseCastTime: 1.5,
	manaCost: 300,
	replaceIf: outburstReplaceList,
	applicationDelay: 0.8, // TODO
	falloff: 0,
});

makeSpell_SMN("ASTRAL_FLARE", 58, {
	basePotency: 180,
	manaCost: 300,
	replaceIf: toSpliced(outburstReplaceList, 0),
	applicationDelay: 0.54,
	validateAttempt: outburstReplaceList[0].condition,
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("BRAND_OF_PURGATORY", 80, {
	basePotency: 240,
	manaCost: 300,
	replaceIf: toSpliced(outburstReplaceList, 1),
	applicationDelay: 0.80,
	validateAttempt: outburstReplaceList[1].condition,
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("UMBRAL_FLARE", 100, {
	basePotency: 280,
	manaCost: 300,
	replaceIf: toSpliced(outburstReplaceList, 2),
	applicationDelay: 0.53,
	validateAttempt: outburstReplaceList[2].condition,
	falloff: 0,
	startOnHotbar: false,
});

// GEMSHINE
// PRECIOUS_BRILLIANCE
// RUBY_OUTBURST
// TOPAZ_OUTBURST
// EMERALD_OUTBURST
// SUMMON_BAHAMUT
// SUMMON_PHOENIX
// SUMMON_SOLAR_BAHAMUT
// SUMMON_IFRIT
// SUMMON_TITAN
// SUMMON_GARUDA
// SUMMON_IFRIT_II
// SUMMON_TITAN_II
// SUMMON_GARUDA_II
// RUBY_RUIN_III
// TOPAZ_RUIN_III
// EMERALD_RUIN_III
// RUBY_RITE
// TOPAZ_RITE
// EMERALD_RITE
// RUBY_CATASTROPHE
// TOPAZ_CATASTROPHE
// EMERALD_CATASTROPHE

// RUBY_DISASTER
// TOPAZ_DISASTER
// EMERALD_DISASTER

// ASTRAL FLOW
// DEATHFLARE
// REKINDLE
// SUNFLARE

// ENKINDLE_BAHAMUT
// ENKINDLE_PHOENIX
// ENKINDLE_SOLAR_BAHAMUT

makeSpell_SMN("RUIN_IV", 62, {
	manaCost: 400,
	applicationDelay: 0.80,
	falloff: 0.6,
	highlightIf: (state) => state.hasResourceAvailable("FURTHER_RUIN"),
	validateAttempt: (state) => state.hasResourceAvailable("FURTHER_RUIN"),
	onConfirm: (state) => state.tryConsumeResource("FURTHER_RUIN"),
});

[
	{
		name: "ENERGY_DRAIN" as SMNActionKey,
		level: 10,
		potency: 200,
		applicationDelay: 1.07
	},
	{
		name: "ENERGY_SIPHON" as SMNActionKey,
		level: 52,
		potency: 100,
		applicationDelay: 1.02,
		falloff: 0,
	}
].forEach(
	(info) => 
	makeAbility_SMN(info.name, info.level, "cd_ENERGY_DRAIN", {
		...info,
		cooldown: 60,
		onConfirm: (state) => {
			state.gainStatus("AETHERFLOW", 2);
			state.gainStatus("FURTHER_RUIN");
		},
	})
);

[
	{
		name: "FESTER" as SMNActionKey,
		level: 10,
		potency: 340,
		applicationDelay: 0.71, // TODO copied from necrotize
		autoUpgrade: {
			trait: "ENHANCED_FESTER",
			otherSkill: "NECROTIZE",
		},
	},
	{
		name: "PAINFLARE" as SMNActionKey,
		level: 40,
		potency: 150,
		applicationDelay: 0.44,
		falloff: 0,
	},
	{
		name: "NECROTIZE" as SMNActionKey,
		level: 92,
		potency: 440,
		applicationDelay: 0.71,
		autoDowngrade: {
			trait: "ENHANCED_FESTER",
			otherSkill: "FESTER",
		},
	},
].forEach((info) => 
	makeAbility_SMN(info.name, info.level, "cd_AETHERFLOW", {
		...info,
		cooldown: 1,
		validateAttempt: (state) => state.hasResourceAvailable("AETHERFLOW"),
		onConfirm: (state) => state.tryConsumeResource("AETHERFLOW"),
	})
);

makeResourceAbility("SMN", "SEARING_LIGHT", 66, "cd_SEARING_LIGHT", {
	rscType: "SEARING_LIGHT",
	applicationDelay: 0,
	cooldown: 120,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_SEARING_LIGHT")) {
			state.gainStatus("RUBYS_GLIMMER");
		}
	},
	replaceIf: [
		{
			newSkill: "SEARING_FLASH",
			condition: (state) => state.hasResourceAvailable("RUBYS_GLIMMER"),
		}
	],
});

makeAbility_SMN("SEARING_FLASH", 96, "cd_SEARING_FLASH", {
	potency: 600,
	applicationDelay: 0.80,
	cooldown: 1,
	falloff: 0,
	startOnHotbar: false,
	highlightIf: (state) => state.hasResourceAvailable("RUBYS_GLIMMER"),
	validateAttempt: (state) => state.hasResourceAvailable("RUBYS_GLIMMER"),
	onConfirm: (state) => state.tryConsumeResource("RUBYS_GLIMMER"),
});

// cast by pet
makeResourceAbility("SMN", "RADIANT_AEGIS", 2, "cd_RADIANT_AEGIS", {
	rscType: "RADIANT_AEGIS",
	applicationDelay: 0.45,
	cooldown: 60,
	maxCharges: 2,
});

makeAbility_SMN("LUX_SOLARIS", 100, "cd_LUX_SOLARIS", {
	applicationDelay: 0.62,
	cooldown: 60,
	highlightIf: (state) => state.hasResourceAvailable("REFULGENT_LUX"),
	validateAttempt: (state) => state.hasResourceAvailable("REFULGENT_LUX"),
	onConfirm: (state) => state.tryConsumeResource("REFULGENT_LUX"),
});

// SUMMON_CARBUNCLE
// PHYSICK
// RESURRECTION
