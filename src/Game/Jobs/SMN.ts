// Skill and state declarations for SMN.

import { controller } from "../../Controller/Controller";
import { Aspect, BuffType, ProcMode, WarningType } from "../Common";
import { makeComboModifier, Modifiers, Potency, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	CooldownGroupProperties,
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
import { getResourceInfo, makeResource, CoolDown, Event, Resource, ResourceInfo } from "../Resources";
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


enum ActiveDemiValue {
	NONE = 0,
	SOLAR = 1,
	BAHAMUT = 2,
	PHOENIX = 3,
}

const DEMI_DURATION: number = 15;

makeSMNResource("AETHERFLOW", 2);
makeSMNResource("RUBY_ARCANUM", 1);
makeSMNResource("TOPAZ_ARCANUM", 1);
makeSMNResource("EMERALD_ARCANUM", 1);
makeSMNResource("FIRE_ATTUNEMENT", 2, { timeout: 30 });
makeSMNResource("EARTH_ATTUNEMENT", 4, { timeout: 30 });
makeSMNResource("WIND_ATTUNEMENT", 4, { timeout: 30 });
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
makeSMNResource("ACTIVE_DEMI", 3, { timeout: DEMI_DURATION });
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
		// set demi cd to scale off sps
		this.cooldowns.set(new CoolDown("cd_DEMI_SUMMON", this.config.adjustedGCD(60), 1, 1));
		// register summon lockout cd (change duration later)
		this.cooldowns.set(new CoolDown("cd_SUMMON_LOCKOUT", 5, 1, 1));
		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SMNState> {
		return new SMNStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("SEARING_LIGHT")) {
			node.addBuff(BuffType.SearingLight);
		}
	}

	get activeDemi(): ActiveDemiValue {
		return this.resources.get("ACTIVE_DEMI").availableAmount();
	}

	get nextDemi(): ActiveDemiValue {
		// at level 100: 0 = next summon is solar, 1 = baha, 2 = phoenix, 3 = baha
		// at level 80/90: 0 = baha, 1 = phoenix, 2 = baha, 3 = phoenix
		// at level 70: any value is baha
		const resourceValue = this.resources.get("NEXT_DEMI_CYCLE").availableAmount();
		if (this.hasTraitUnlocked("ENHANCED_SUMMON_BAHAMUT_II")) {
			if (resourceValue === 0) {
				return ActiveDemiValue.SOLAR;
			} else if (resourceValue === 2) {
				return ActiveDemiValue.PHOENIX
			} else {
				return ActiveDemiValue.BAHAMUT;
			}
		} else if (this.hasTraitUnlocked("ENHANCED_SUMMON_BAHAMUT")) {
			return resourceValue % 2 === 0 ? ActiveDemiValue.BAHAMUT : ActiveDemiValue.PHOENIX;
		} else {
			return ActiveDemiValue.BAHAMUT;
		}
	}

	get hasActivePet(): boolean {
		// using radiant aegis or summoning another primal is locked out during a demi window
		// or during the on-summon attack of a primal
		return this.activeDemi !== ActiveDemiValue.NONE
			|| this.cooldowns.get("cd_SUMMON_LOCKOUT").stacksAvailable() === 0;
	}

	startPetAutos() {
		// TODO
	}

	queueEnkindle() {
		// TODO
	}

	queuePrimalSummon(node: ActionNode, sourceSkill: ActionKey, basePotency: number, delay: number) {
		// we manually construct a potency event here so the damage event has the name of the pet's
		// attack rather than "summon primal"
		const potency = new Potency({
			config: this.config,
			sourceTime: this.getDisplayTime(),
			sourceSkill,
			aspect: Aspect.Other,
			basePotency,
			snapshotTime: undefined,
			description: "",
			targetCount: node.targetCount,
			falloff: 0.6,
		});
		potency.modifiers = [Modifiers.SmnPet];
		// TODO adjust snapshot timing
		if (this.hasResourceAvailable("SEARING_LIGHT")) {
			potency.modifiers.push(Modifiers.SearingLight);
		}
		node.addPotency(potency);
		this.cooldowns.get("cd_SUMMON_LOCKOUT").useStackWithRecast(this, delay);
		this.addEvent(
			new Event(
				"summoned primal attack",
				delay,
				() => {
					// TODO add covers
					// TODO apply other buffs
					// TODO check when the prepares event occurs
					if (this.hasResourceAvailable("TINCTURE")) {
						node.addBuff(BuffType.Tincture);
					}
					if (this.hasResourceAvailable("SEARING_LIGHT")) {
						node.addBuff(BuffType.SearingLight);
					}
					potency.snapshotTime = this.getDisplayTime();
					controller.resolvePotency(potency);
				}
			),
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
		manaCost?: number;
		basePotency?: number | Array<[TraitKey, number]>;
		falloff?: number;
		applicationDelay: number;
		isPetAttack?: boolean,
		validateAttempt?: StatePredicate<SMNState>;
		onApplication?: EffectFn<SMNState>;
		onConfirm?: EffectFn<SMNState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Spell<SMNState> => {
	const baseCastTime = params.baseCastTime ?? 0;
	const baseRecastTime = params.baseRecastTime ?? 2.5;
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
			baseRecastTime <= 1.5 ? baseRecastTime : state.config.adjustedGCD(baseRecastTime),
		potency: params.basePotency,
		jobPotencyModifiers: (state) => {
			const mods = [];
			if (params.isPetAttack) {
				mods.push(Modifiers.SmnPet);
			}
			if (state.hasResourceAvailable("SEARING_LIGHT")) {
				mods.push(Modifiers.SearingLight);
			}
			return mods;
		},
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

const R3_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "ASTRAL_IMPULSE",
		condition: (state) => state.activeDemi === ActiveDemiValue.BAHAMUT,
	},
	{
		newSkill: "FOUNTAIN_OF_FIRE",
		condition: (state) => state.activeDemi === ActiveDemiValue.PHOENIX,
	},
	{
		newSkill: "UMBRAL_IMPULSE",
		condition: (state) => state.activeDemi === ActiveDemiValue.SOLAR,
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
	replaceIf: R3_REPLACE_LIST,
	applicationDelay: 0.8,
});

makeSpell_SMN("ASTRAL_IMPULSE", 58, {
	basePotency: [
		["NEVER", 440],
		["ARCANE_MASTERY", 500],
	],
	manaCost: 300,
	replaceIf: toSpliced(R3_REPLACE_LIST, 0),
	applicationDelay: 0.67,
	validateAttempt: R3_REPLACE_LIST[0].condition, 
	startOnHotbar: false,
});

makeSpell_SMN("FOUNTAIN_OF_FIRE", 80, {
	basePotency: [
		["NEVER", 540],
		["ARCANE_MASTERY", 580],
	],
	manaCost: 300,
	replaceIf: toSpliced(R3_REPLACE_LIST, 1),
	applicationDelay: 1.07,
	validateAttempt: R3_REPLACE_LIST[1].condition,
	startOnHotbar: false,
});

makeSpell_SMN("UMBRAL_IMPULSE", 100, {
	basePotency: 620,
	manaCost: 300,
	replaceIf: toSpliced(R3_REPLACE_LIST, 2),
	applicationDelay: 0.80,
	validateAttempt: R3_REPLACE_LIST[2].condition,
	startOnHotbar: false,
});

const OUTBURST_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "ASTRAL_FLARE",
		condition: (state) => state.activeDemi === ActiveDemiValue.BAHAMUT,
	},
	{
		newSkill: "BRAND_OF_PURGATORY",
		condition: (state) => state.activeDemi === ActiveDemiValue.PHOENIX,
	},
	{
		newSkill: "UMBRAL_FLARE",
		condition: (state) => state.activeDemi === ActiveDemiValue.SOLAR,
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
	replaceIf: OUTBURST_REPLACE_LIST,
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
	replaceIf: OUTBURST_REPLACE_LIST,
	applicationDelay: 0.8, // TODO
	falloff: 0,
});

makeSpell_SMN("ASTRAL_FLARE", 58, {
	basePotency: 180,
	manaCost: 300,
	replaceIf: toSpliced(OUTBURST_REPLACE_LIST, 0),
	applicationDelay: 0.54,
	validateAttempt: OUTBURST_REPLACE_LIST[0].condition,
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("BRAND_OF_PURGATORY", 80, {
	basePotency: 240,
	manaCost: 300,
	replaceIf: toSpliced(OUTBURST_REPLACE_LIST, 1),
	applicationDelay: 0.80,
	validateAttempt: OUTBURST_REPLACE_LIST[1].condition,
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("UMBRAL_FLARE", 100, {
	basePotency: 280,
	manaCost: 300,
	replaceIf: toSpliced(OUTBURST_REPLACE_LIST, 2),
	applicationDelay: 0.53,
	validateAttempt: OUTBURST_REPLACE_LIST[2].condition,
	falloff: 0,
	startOnHotbar: false,
});

const GEMSHINE_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "RUBY_RUIN_III",
		condition: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	},
	{
		newSkill: "TOPAZ_RUIN_III",
		condition: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	},
	{
		newSkill: "EMERALD_RUIN_III",
		condition: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	},
];

makeSpell_SMN("GEMSHINE", 6, {
	replaceIf: GEMSHINE_REPLACE_LIST,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

makeSpell_SMN("RUBY_RUIN_III", 54, {
	autoUpgrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "RUBY_RITE",
	},
	basePotency: 410,
	baseCastTime: 2.8,
	baseRecastTime: 3,
	applicationDelay: 0.62, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("FIRE_ATTUNEMENT"),
	startOnHotbar: false,
});

makeSpell_SMN("TOPAZ_RUIN_III", 54, {
	autoUpgrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "TOPAZ_RITE",
	},
	basePotency: 300,
	applicationDelay: 0.62, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("EARTH_ATTUNEMENT"),
	startOnHotbar: false,
});

makeSpell_SMN("EMERALD_RUIN_III", 54, {
	autoUpgrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "EMERALD_RITE",
	},
	baseRecastTime: 1.5,
	basePotency: 180,
	applicationDelay: 0.62, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("WIND_ATTUNEMENT"),
	startOnHotbar: false,
});

makeSpell_SMN("RUBY_RITE", 72, {
	autoDowngrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "RUBY_RITE",
	},
	basePotency: [
		["NEVER", 480],
		["RUIN_MASTERY_IV", 510],
		["ARCANE_MASTERY", 540],
	],
	baseCastTime: 2.8,
	baseRecastTime: 3,
	applicationDelay: 0.62,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("FIRE_ATTUNEMENT"),
	startOnHotbar: false,
});

makeSpell_SMN("TOPAZ_RITE", 72, {
	autoDowngrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "TOPAZ_RUIN_III",
	},
	basePotency: [
		["NEVER", 320],
		["RUIN_MASTERY_IV", 330],
		["ARCANE_MASTERY", 340],
	],
	applicationDelay: 0.62,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	onConfirm: (state) => {
		state.tryConsumeResource("EARTH_ATTUNEMENT");
		state.gainStatus("TITANS_FAVOR");
	},
	startOnHotbar: false,
});

makeSpell_SMN("EMERALD_RITE", 72, {
	autoDowngrade: {
		trait: "RUIN_MASTERY_III",
		otherSkill: "EMERALD_RUIN_III",
	},
	baseRecastTime: 1.5,
	basePotency: [
		["NEVER", 220],
		["RUIN_MASTERY_IV", 230],
		["ARCANE_MASTERY", 240],
	],
	applicationDelay: 0.62,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("WIND_ATTUNEMENT"),
	startOnHotbar: false,
});

const PRECIOUS_BRILLIANCE_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "RUBY_OUTBURST",
		condition: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	},
	{
		newSkill: "TOPAZ_OUTBURST",
		condition: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	},
	{
		newSkill: "EMERALD_OUTBURST",
		condition: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	},	
];

makeSpell_SMN("PRECIOUS_BRILLIANCE", 26, {
	replaceIf: PRECIOUS_BRILLIANCE_REPLACE_LIST,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

makeSpell_SMN("RUBY_OUTBURST", 26, {
	autoUpgrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "RUBY_DISASTER",
	},
	basePotency: 160,
	baseCastTime: 2.8,
	baseRecastTime: 3,
	applicationDelay: 0.53, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("FIRE_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("TOPAZ_OUTBURST", 26, {
	autoUpgrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "TOPAZ_DISASTER",
	},
	basePotency: 110,
	applicationDelay: 0.53, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("EARTH_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("EMERALD_OUTBURST", 26, {
	autoUpgrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "EMERALD_DISASTER",
	},
	baseRecastTime: 1.5,
	basePotency: 70,
	applicationDelay: 0.53,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("WIND_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("RUBY_DISASTER", 74, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "RUBY_OUTBURST",
	},
	autoUpgrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "RUBY_CATASTROPHE",
	},
	basePotency: 190,
	baseCastTime: 2.8,
	baseRecastTime: 3,
	applicationDelay: 0.53, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("FIRE_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("TOPAZ_DISASTER", 74, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "TOPAZ_OUTBURST",
	},
	autoUpgrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "TOPAZ_CATASTROPHE",
	},
	basePotency: 130,
	applicationDelay: 0.53, // TODO
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("EARTH_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("EMERALD_DISASTER", 74, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY",
		otherSkill: "EMERALD_OUTBURST",
	},
	autoUpgrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "EMERALD_CATASTROPHE",
	},
	baseRecastTime: 1.5,
	basePotency: 90,
	applicationDelay: 0.53,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("WIND_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});


makeSpell_SMN("RUBY_CATASTROPHE", 82, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "RUBY_DISASTER",
	},
	basePotency: 210,
	baseCastTime: 2.8,
	baseRecastTime: 3,
	applicationDelay: 0.53,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("FIRE_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("FIRE_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("TOPAZ_CATASTROPHE", 82, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "TOPAZ_DISASTER",
	},
	basePotency: 140,
	applicationDelay: 0.53,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("EARTH_ATTUNEMENT"),
	onConfirm: (state) => {
		state.tryConsumeResource("EARTH_ATTUNEMENT");
		state.gainStatus("TITANS_FAVOR");
	},
	falloff: 0,
	startOnHotbar: false,
});

makeSpell_SMN("EMERALD_CATASTROPHE", 82, {
	autoDowngrade: {
		trait: "OUTBURST_MASTERY_II",
		otherSkill: "EMERALD_DISASTER",
	},
	baseRecastTime: 1.5,
	basePotency: 100,
	applicationDelay: 0.53,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("WIND_ATTUNEMENT"),
	onConfirm: (state) => state.tryConsumeResource("WIND_ATTUNEMENT"),
	falloff: 0,
	startOnHotbar: false,
});

// demi replacements take effect AFTER the demi expires
// at level 100: 0 = next summon is solar, 1 = baha, 2 = phoenix, 3 = baha
// at level 80/90: 0 = baha, 1 = phoenix, 2 = baha, 3 = phoenix
// at level 70: any value is baha
const DEMI_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "SUMMON_BAHAMUT",
		condition: (state) => state.nextDemi === ActiveDemiValue.BAHAMUT,
	},
	{
		newSkill: "SUMMON_PHOENIX",
		condition: (state) => state.nextDemi === ActiveDemiValue.PHOENIX,
	},
	{
		newSkill: "SUMMON_SOLAR_BAHAMUT",
		condition: (state) => state.nextDemi === ActiveDemiValue.SOLAR,
	}
];

const DEMI_COOLDOWN_GROUP: CooldownGroupProperties = {
	cdName: "cd_DEMI_SUMMON",
	cooldown: 60, // cooldown edited in constructor to scale with sps
	maxCharges: 1,
};

[
	{
		name: "SUMMON_BAHAMUT",
		level: 70,
		activeValue: ActiveDemiValue.BAHAMUT,
	},
	{
		name: "SUMMON_PHOENIX",
		level: 80,
		activeValue: ActiveDemiValue.PHOENIX,
	},
	{
		name: "SUMMON_SOLAR_BAHAMUT",
		level: 100,
		activeValue: ActiveDemiValue.SOLAR,
	}
].forEach((info, i) =>
	makeSpell_SMN(info.name as SMNActionKey, info.level, {
		applicationDelay: 0,
		replaceIf: toSpliced(DEMI_REPLACE_LIST, i),
		secondaryCooldown: DEMI_COOLDOWN_GROUP,
		validateAttempt: (state) => !state.hasActivePet && state.nextDemi === info.activeValue,
		onConfirm: (state) => {
			// start appropriate demi timer
			state.gainStatus("ACTIVE_DEMI", info.activeValue);
			state.startPetAutos();
			// gain ability to summon primals
			["RUBY_ARCANUM", "TOPAZ_ARCANUM", "EMERALD_ARCANUM"].forEach((rsc) => state.gainStatus(rsc as SMNResourceKey, 1));
			// cancel all active attunements
			["FIRE_ATTUNEMENT", "EARTH_ATTUNEMENT", "WIND_ATTUNEMENT"].forEach((rsc) => state.tryConsumeResource(rsc as SMNResourceKey, true));
			// after 15 seconds, wrapping increment the value of the next demi
			state.addEvent(
				new Event("update next demi", DEMI_DURATION, () => {
					state.resources.get("NEXT_DEMI_CYCLE").gainWrapping(1);
				})
			);
		},
		startOnHotbar: i === 0,
	})
);

// don't declare potencies for pet summons explicitly
// delays from Hauffen:
// https://discord.com/channels/277897135515762698/277968477233479680/1331466393430003793
// > The latter is the easiest since it's a fixed duration, 4.05s for Ifrit/Titan
// > and 3.38s for Garuda, from the prepare event
// may need to check if egis have shorter delays
// TODO: it seems like there's separate delays from
// summon pressed -> prepares event -> damage hits -> summon leaves

const IFRIT_TITAN_DELAY: number = 4.05;
const GARUDA_DELAY: number = 3.38;

// while the "[primal]'s Favor" buffs are granted by the synced version (because followups are 
// learned at level 86), we don't need to implement them because the only level sync they're used
// at is 90+
const ifritConfirm: (potency: number) => EffectFn<SMNState> = (potency) => (state, node) => {
	state.tryConsumeResource("RUBY_ARCANUM");
	state.gainStatus("FIRE_ATTUNEMENT", 2);
	state.queuePrimalSummon(node, "INFERNO", potency, IFRIT_TITAN_DELAY);
	// consume favor + attunements of other primals
	state.tryConsumeResource("EARTH_ATTUNEMENT", true);
	state.tryConsumeResource("WIND_ATTUNEMENT", true);
	state.tryConsumeResource("TITANS_FAVOR");
	state.tryConsumeResource("GARUDAS_FAVOR");
};

const titanConfirm: (potency: number) => EffectFn<SMNState> = (potency) => (state, node) => {
	state.tryConsumeResource("TOPAZ_ARCANUM");
	state.gainStatus("EARTH_ATTUNEMENT", 4);
	state.queuePrimalSummon(node, "EARTHEN_FURY", potency, IFRIT_TITAN_DELAY);
	// consume favor + attunements of other primals
	state.tryConsumeResource("FIRE_ATTUNEMENT", true);
	state.tryConsumeResource("WIND_ATTUNEMENT", true);
	state.tryConsumeResource("IFRITS_FAVOR");
	state.tryConsumeResource("GARUDAS_FAVOR");
};

const garudaConfirm: (potency: number) => EffectFn<SMNState> = (potency) => (state, node) => {
	state.tryConsumeResource("EMERALD_ARCANUM");
	state.gainStatus("WIND_ATTUNEMENT", 4);
	state.queuePrimalSummon(node, "AERIAL_BLAST", potency, GARUDA_DELAY);
	// consume favor + attunements of other primals
	state.tryConsumeResource("FIRE_ATTUNEMENT", true);
	state.tryConsumeResource("EARTH_ATTUNEMENT", true);
	state.tryConsumeResource("IFRITS_FAVOR");
	state.tryConsumeResource("TITANS_FAVOR");
};

makeSpell_SMN("SUMMON_IFRIT", 30, {
	autoUpgrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_IFRIT_II",
	},
	applicationDelay: IFRIT_TITAN_DELAY,
	highlightIf: (state) => state.hasResourceAvailable("RUBY_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("RUBY_ARCANUM"),
	onConfirm: ifritConfirm(600),
});

makeSpell_SMN("SUMMON_TITAN", 35, {
	autoUpgrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_TITAN_II",
	},
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("TOPAZ_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("TOPAZ_ARCANUM"),
	onConfirm: titanConfirm(600),
});

makeSpell_SMN("SUMMON_GARUDA", 45, {
	autoUpgrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_GARUDA_II",
	},
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("EMERALD_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("EMERALD_ARCANUM"),
	onConfirm: garudaConfirm(600),
});

makeSpell_SMN("SUMMON_IFRIT_II", 90, {
	autoDowngrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_IFRIT",
	},
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("RUBY_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("RUBY_ARCANUM"),
	onConfirm: (state, node) => {
		state.gainStatus("IFRITS_FAVOR");
		ifritConfirm(state.hasTraitUnlocked("ARCANE_MASTERY") ? 800 : 600)(state, node);
	},
});

makeSpell_SMN("SUMMON_TITAN_II", 90, {
	autoDowngrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_TITAN",
	},
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("TOPAZ_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("TOPAZ_ARCANUM"),
	// titan's favor is gained upon executing rite/catastrophe
	onConfirm: (state, node) => titanConfirm(state.hasTraitUnlocked("ARCANE_MASTERY") ? 800 : 600)(state, node),
});

makeSpell_SMN("SUMMON_GARUDA_II", 90, {
	autoDowngrade: {
		trait: "ENKINDLE_II",
		otherSkill: "SUMMON_GARUDA",
	},
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("EMERALD_ARCANUM"),
	validateAttempt: (state) => !state.hasActivePet && state.hasResourceAvailable("EMERALD_ARCANUM"),
	onConfirm: (state, node) => {
		state.gainStatus("GARUDAS_FAVOR");
		garudaConfirm(state.hasTraitUnlocked("ARCANE_MASTERY") ? 800 : 600)(state, node);
	},
});

const ASTRAL_FLOW_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "DEATHFLARE",
		condition: (state) => state.activeDemi === ActiveDemiValue.BAHAMUT,
	},
	{
		newSkill: "REKINDLE",
		condition: (state) => state.activeDemi === ActiveDemiValue.PHOENIX,
	},
	{
		newSkill: "SUNFLARE",
		condition: (state) => state.activeDemi === ActiveDemiValue.SOLAR,
	},
	{
		newSkill: "CRIMSON_CYCLONE",
		condition: (state) => state.hasResourceAvailable("IFRITS_FAVOR"),
	},
	{
		newSkill: "CRIMSON_STRIKE",
		condition: (state) => state.hasResourceAvailable("CRIMSON_STRIKE_READY"),
	},
	{
		newSkill: "MOUNTAIN_BUSTER",
		condition: (state) => state.hasResourceAvailable("TITANS_FAVOR"),
	},
	{
		newSkill: "SLIPSTREAM",
		condition: (state) => state.hasResourceAvailable("GARUDAS_FAVOR"),
	}
];

makeAbility_SMN("ASTRAL_FLOW", 60, "cd_ASTRAL_FLOW", {
	applicationDelay: 0,
	cooldown: 20,
	replaceIf: ASTRAL_FLOW_REPLACE_LIST,
	validateAttempt: (state) => false,
});

makeAbility_SMN("DEATHFLARE", 60, "cd_ASTRAL_FLOW", {
	potency: 500,
	applicationDelay: 0.8,
	cooldown: 20,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 0),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[0].condition,
	falloff: 0.6,
	startOnHotbar: false,
});

makeAbility_SMN("REKINDLE", 80, "cd_ASTRAL_FLOW", {
	applicationDelay: 1.03,
	cooldown: 20,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 1),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[1].condition,
	onConfirm: (state) => state.gainStatus("REKINDLE"),
	startOnHotbar: false,
});

makeAbility_SMN("SUNFLARE", 100, "cd_ASTRAL_FLOW", {
	potency: 800,
	applicationDelay: 0.8,
	cooldown: 20,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 2),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[2].condition,
	falloff: 0.6,
	startOnHotbar: false,
});

makeSpell_SMN("CRIMSON_CYCLONE", 86, {
	basePotency: [
		["NEVER", 430],
		["ARCANE_MASTERY", 490],
	],
	applicationDelay: 0.80,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 3),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[3].condition,
	onConfirm: (state) => state.tryConsumeResource("IFRITS_FAVOR"),
	falloff: 0.65,
	startOnHotbar: false,
});

makeSpell_SMN("CRIMSON_STRIKE", 86, {
	basePotency: [
		["NEVER", 430],
		["ARCANE_MASTERY", 490],
	],
	applicationDelay: 0.76,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 4),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[4].condition,
	onConfirm: (state) => state.tryConsumeResource("CRIMSON_STRIKE_READY"),
	falloff: 0.65,
	startOnHotbar: false,
});

makeAbility_SMN("MOUNTAIN_BUSTER", 86, "cd_MOUNTAIN_BUSTER", {
	potency: [
		["NEVER", 150],
		["ARCANE_MASTERY", 170],
	],
	cooldown: 1,
	applicationDelay: 0.76,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 5),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[5].condition,
	onConfirm: (state) => state.tryConsumeResource("TITANS_FAVOR"),
	falloff: 0.7,
	startOnHotbar: false,
});

makeSpell_SMN("SLIPSTREAM", 86, {
	baseCastTime: 3,
	baseRecastTime: 3.5,
	basePotency: [
		["NEVER", 430],
		["ARCANE_MASTERY", 490],
	],
	applicationDelay: 1.02,
	replaceIf: toSpliced(ASTRAL_FLOW_REPLACE_LIST, 6),
	highlightIf: (state) => true,
	validateAttempt: ASTRAL_FLOW_REPLACE_LIST[6].condition,
	onConfirm: (state) => {
		state.tryConsumeResource("GARUDAS_FAVOR");
		// TODO start aoe dot effect
		state.gainStatus("SLIPSTREAM");
	},
	falloff: 0.65,
	startOnHotbar: false,
});

// Except during the relevant demi window, enkindle always uses the enkindle bahamut icon
const ENKINDLE_REPLACE_LIST: ConditionalSkillReplace<SMNState>[] = [
	{
		newSkill: "ENKINDLE_BAHAMUT",
		condition: (state) => [ActiveDemiValue.NONE, ActiveDemiValue.BAHAMUT].includes(state.activeDemi),
	},
	{
		newSkill: "ENKINDLE_PHOENIX",
		condition: (state) => state.activeDemi === ActiveDemiValue.PHOENIX,
	},
	{
		newSkill: "ENKINDLE_SOLAR_BAHAMUT",
		condition: (state) => state.activeDemi === ActiveDemiValue.SOLAR,
	}
];

[
	{
		name: "ENKINDLE_BAHAMUT",
		level: 70,
		activeValue: ActiveDemiValue.BAHAMUT,
	},
	{
		name: "ENKINDLE_PHOENIX",
		level: 80,
		activeValue: ActiveDemiValue.PHOENIX,
	},
	{
		name: "ENKINDLE_SOLAR_BAHAMUT",
		level: 100,
		activeValue: ActiveDemiValue.SOLAR,
	}
].forEach((info, i) =>
	makeAbility_SMN(info.name as SMNActionKey, info.level, "cd_ENKINDLE", {
		applicationDelay: 0,
		cooldown: 20,
		replaceIf: toSpliced(ENKINDLE_REPLACE_LIST, i),
		onConfirm: (state) => state.queueEnkindle(),
		startOnHotbar: i === 0,
	})
);

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
	validateAttempt: (state) => !(state as SMNState).hasActivePet,
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
