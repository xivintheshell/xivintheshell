// Skill and state declarations for NIN.

import { NINStatusPropsGenerator } from "../../Components/Jobs/NIN";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";
import { BuffType } from "../Common";
import { ActionKey, TraitKey } from "../Data";
import { NINActionKey, NINCooldownKey, NINResourceKey } from "../Data/Jobs/NIN";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { getResourceInfo, makeResource, ResourceInfo, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";

const makeNINResource = (
	rsc: NINResourceKey,
	maxValue: number,
	params?: {
		timeout?: number;
		default?: number;
		warnOnOvercap?: boolean;
		warnOnTimeout?: boolean;
	},
) => {
	makeResource("NIN", rsc, maxValue, params ?? {});
};

makeNINResource("KAZEMATOI", 5, { warnOnOvercap: true });
makeNINResource("NINKI", 100, { warnOnOvercap: true });

makeNINResource("SHADE_SHIFT", 1, { timeout: 20 });
makeNINResource("MUDRA", 1, { timeout: 6 });
makeNINResource("HIDDEN", 1);
makeNINResource("TRICK_ATTACK", 1, { timeout: 15.77 });
makeNINResource("KASSATSU", 1, { timeout: 15, warnOnTimeout: true });
makeNINResource("DOKUMORI", 1, { timeout: 21 });
makeNINResource("TENRI_JINDO_READY", 1, { timeout: 30, warnOnTimeout: true });
makeNINResource("TEN_CHI_JIN", 1, { timeout: 6 });
makeNINResource("MEISUI", 1, { timeout: 30 });
makeNINResource("SHADOW_WALKER", 1, { timeout: 20 });
makeNINResource("BUNSHIN", 5, { timeout: 30, warnOnTimeout: true });
makeNINResource("PHANTOM_KAMAITACHI_READY", 1, { timeout: 45, warnOnTimeout: true });
makeNINResource("RAIJU_READY", 3, { timeout: 30, warnOnTimeout: true });
makeNINResource("KUNAIS_BANE", 1, { timeout: 16.25 });
makeNINResource("HIGI", 1, { timeout: 30 });
makeNINResource("DOTON", 1, { timeout: 18 });

makeNINResource("NIN_COMBO_TRACKER", 2, { timeout: 30 });
makeNINResource("NIN_AOE_COMBO_TRACKER", 1, { timeout: 30 });
// these two resources should be cleared when the mudra status is dropped
makeNINResource("MUDRA_TRACKER", 1e4);
makeNINResource("BUNNY", 1);

enum Mudra {
	Ten = 1,
	Chi = 2,
	Jin = 3,
}

// this array is used only when computing buff covers
const BUFFED_BY_BUNSHIN: ActionKey[] = [
	"SPINNING_EDGE",
	"GUST_SLASH",
	"AEOLIAN_EDGE",
	"ARMOR_CRUSH",
	"THROWING_DAGGER",
	"DEATH_BLOSSOM",
	"HAKKE_MUJINSATSU",
	"FORKED_RAIJU",
	"FLEETING_RAIJU",
];

export class NINState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const shukuchiStacks = this.hasTraitUnlocked("ENHANCED_SHUKUCHI_II") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_SHUKUCHI", 60, shukuchiStacks, shukuchiStacks));

		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "DOTON",
						appliedBy: ["DOTON"],
						isGroundTargeted: true,
					},
				],
			},
		]);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<NINState>): void {
		if (this.hasResourceAvailable("DOKUMORI")) {
			node.addBuff(BuffType.Dokumori);
		}
		if (this.hasResourceAvailable("TRICK_ATTACK")) {
			node.addBuff(BuffType.TrickAttack);
		}
		if (this.hasResourceAvailable("KUNAIS_BANE")) {
			node.addBuff(BuffType.KunaisBane);
		}
		if (this.hasResourceAvailable("BUNSHIN") && BUFFED_BY_BUNSHIN.includes(skill.name)) {
			node.addBuff(BuffType.Bunshin);
		}
	}

	override inherentSpeedModifier(): number {
		return 15;
	}

	override get statusPropsGenerator(): StatusPropsGenerator<NINState> {
		return new NINStatusPropsGenerator(this);
	}

	stackRaijuReady() {
		const rsc = this.resources.get("RAIJU_READY");
		rsc.gain(1);
		this.enqueueResourceDrop("RAIJU_READY");
	}

	gainNinki(amt: number) {
		this.resources.get("NINKI").gain(amt);
	}

	processComboStatus(skill: NINActionKey) {
		// Ninjutsus and mudras are handled independently
		if (
			["THROWING_DAGGER", "FORKED_RAIJU", "FLEETING_RAIJU", "PHANTOM_KAMAITACHI"].includes(
				skill,
			)
		) {
			return;
		}
		// [melee, aoe]
		let counters = [
			this.resources.get("NIN_COMBO_TRACKER").availableAmount(),
			this.resources.get("NIN_AOE_COMBO_TRACKER").availableAmount(),
		];
		if (skill === "SPINNING_EDGE") {
			counters = [1, 0];
		} else if (skill === "GUST_SLASH") {
			counters = [2, 0];
		} else if (skill === "DEATH_BLOSSOM") {
			counters = [0, 1];
		} else {
			counters = [0, 0];
		}
		this.setComboState("NIN_COMBO_TRACKER", counters[0]);
		this.setComboState("NIN_AOE_COMBO_TRACKER", counters[1]);
	}

	// Convert the state's current MUDRA_TRACKER resource to a sequence of the last
	// 2 executed mudras.
	//
	// MUDRA_TRACKER is a 3-digit tracker representing the last 3 mudras performed:
	// 0 = [no mudra]
	// 1 = ten, 2 = chi, 3 = jin
	//
	// Returns undefined if the player bunnied. Returns an empty list if the mudra
	// state is empty.
	parseMudraTracker(): Mudra[] | undefined {
		if (this.hasResourceAvailable("BUNNY")) {
			return undefined;
		}
		const mudraTracker = this.resources.get("MUDRA_TRACKER").availableAmount();
		if (mudraTracker === 0) {
			return [];
		}
		if (mudraTracker < 10) {
			console.assert(mudraTracker < 4, `mudra tracker value ${mudraTracker} was invalid`);
			return [mudraTracker];
		}
		if (mudraTracker < 100) {
			console.assert(
				mudraTracker % 10 !== 0,
				`mudra tracker value ${mudraTracker} was invalid`,
			);
			return [Math.floor(mudraTracker / 10), mudraTracker % 10];
		}
		if (mudraTracker < 1000) {
			return [
				Math.floor(mudraTracker / 100),
				Math.floor(mudraTracker / 10) % 10,
				mudraTracker % 10,
			];
		}
		return undefined;
	}

	isMudraTrackerIn(combos: Mudra[][]): boolean {
		const tracker = this.parseMudraTracker();
		return (
			tracker !== undefined &&
			combos.some(
				(combo) =>
					tracker.length === combo.length &&
					tracker.every((mudra, i) => combo[i] === mudra),
			)
		);
	}

	clearMudraInfo() {
		this.tryConsumeResource("MUDRA");
		this.tryConsumeResource("KASSATSU");
		this.resources.get("MUDRA_TRACKER").overrideCurrentValue(0);
		this.resources.get("BUNNY").overrideCurrentValue(0);
	}

	pushMudra(mudra: Mudra, tcj: boolean) {
		const mudraResource = this.resources.get("MUDRA_TRACKER");
		const amt = mudraResource.availableAmount();
		if (amt === 0 && !tcj) {
			console.assert(this.resources.get("MUDRA_TRACKER").availableAmount() === 0);
			console.assert(this.resources.get("BUNNY").availableAmount() === 0);
			// enqueue clear for tracker and bunny resources
			this.gainStatus("MUDRA");
			// To work around a possible bug in resource management, we must cancel
			// the original mudra resource expiry event since adding a new resource event
			// overwrites the existing event without removing it from the event queue.
			// We should eventually fix this globally, but doing so would require extensive testing.
			this.resources.get("MUDRA").removeTimer();
			this.resources.addResourceEvent({
				rscType: "MUDRA",
				name: "clear mudra tracker/bunny",
				delay: (getResourceInfo("NIN", "MUDRA") as ResourceInfo).maxTimeout,
				fnOnRsc: () => this.clearMudraInfo(),
			});
		}
		if (amt > 1000) {
			// don't bother, since we're already bunnied
			return;
		}
		const newMudra = amt * 10 + mudra;
		mudraResource.overrideCurrentValue(newMudra);
		// Clear mudra state if this is the last TCJ ability in the sequence
		if (tcj && newMudra > 100) {
			this.tryConsumeResource("TEN_CHI_JIN");
			this.clearMudraInfo();
		}
	}
}

// NIN cannot use any other abilities while TCJ is active.
const notInTCJ = (state: Readonly<NINState>) => !state.hasResourceAvailable("TEN_CHI_JIN");

// Special case for NIN, where any action during a mudra causes a bunny.
const bunny = (state: NINState) => {
	if (state.hasResourceAvailable("MUDRA")) {
		state.gainStatus("BUNNY");
	}
};

const validateWithTCJ = (validateAttempt: StatePredicate<NINState> | undefined) => {
	if (validateAttempt === undefined) {
		return notInTCJ;
	} else {
		return (state: Readonly<NINState>) => notInTCJ(state) && validateAttempt(state);
	}
};

const addUniversalPotencyModifiers = (state: Readonly<NINState>, mods: PotencyModifier[]) => {
	if (state.hasResourceAvailable("DOKUMORI")) {
		mods.push(Modifiers.Dokumori);
	}
	if (state.hasResourceAvailable("TRICK_ATTACK")) {
		mods.push(Modifiers.TrickAttack);
	}
	if (state.hasResourceAvailable("KUNAIS_BANE")) {
		mods.push(Modifiers.KunaisBane);
	}
};

const makeNINWeaponskill = (
	name: NINActionKey,
	unlockLevel: number,
	params: {
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: NINResourceKey;
			resourceValue: number;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			comboPotency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<NINState>;
		onConfirm?: EffectFn<NINState>;
		highlightIf?: StatePredicate<NINState>;
		onApplication?: EffectFn<NINState>;
		jobPotencyModifiers?: PotencyModifierFn<NINState>;
		animationLock?: number;
	},
): Weaponskill<NINState> => {
	return makeWeaponskill("NIN", name, unlockLevel, {
		...params,
		// NIN gets a 15% haste reduction
		recastTime: (state) => state.config.adjustedSksGCD(2.5, state.inherentSpeedModifier()),
		validateAttempt: validateWithTCJ(params.validateAttempt),
		onConfirm: combineEffects(
			bunny,
			(state: NINState, node: ActionNode) => params.onConfirm?.(state, node),
			(state) => {
				if (name !== "PHANTOM_KAMAITACHI" && state.tryConsumeResource("BUNSHIN")) {
					state.gainNinki(5);
				}
			},
			// Everything eats all stacks of raiju ready except throwing dagger/kamaitachi/raiju skills
			!["THROWING_DAGGER", "PHANTOM_KAMAITACHI", "FORKED_RAIJU", "FLEETING_RAIJU"].includes(
				name,
			)
				? (state) =>
						state.tryConsumeResource("RAIJU_READY", true) &&
						controller.reportWarning({ kind: "overwrite", rsc: "RAIJU_READY" })
				: undefined,
			(state) => state.processComboStatus(name),
		),
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			// Kamaitachi does not consume Bunshin
			if (state.hasResourceAvailable("BUNSHIN") && name !== "PHANTOM_KAMAITACHI") {
				if (name === "DEATH_BLOSSOM" || name === "HAKKE_MUJINSATSU") {
					mods.push(Modifiers.BunshinAOE);
				} else {
					mods.push(Modifiers.BunshinST);
				}
			}
			addUniversalPotencyModifiers(state, mods);
			return mods;
		},
	});
};

const makeNINAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		startOnHotbar?: boolean;
		cooldown: number;
		maxCharges?: number;
		replaceIf?: ConditionalSkillReplace<NINState>[];
		potency?: number | Array<[TraitKey, number]>;
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<NINState>;
		onConfirm?: EffectFn<NINState>;
		highlightIf?: StatePredicate<NINState>;
		onApplication?: EffectFn<NINState>;
		animationLock?: number;
		jobPotencyModifiers?: PotencyModifierFn<NINState>;
	},
): Ability<NINState> => {
	return makeAbility("NIN", name, unlockLevel, cdName, {
		...params,
		validateAttempt: validateWithTCJ(params.validateAttempt),
		onConfirm: combineEffects(bunny, (state: NINState, node: ActionNode) =>
			params.onConfirm?.(state, node),
		),
		jobPotencyModifiers: (state) => {
			const mods = params.jobPotencyModifiers?.(state) ?? [];
			addUniversalPotencyModifiers(state, mods);
			return mods;
		},
	});
};

const makeNINResourceAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: MakeResourceAbilityParams<NINState>,
): Ability<NINState> => {
	return makeResourceAbility("NIN", name, unlockLevel, cdName, {
		...params,
		validateAttempt: validateWithTCJ(params.validateAttempt),
		onConfirm: combineEffects(bunny, (state: NINState, node: ActionNode) =>
			params.onConfirm?.(state, node),
		),
	});
};

makeNINWeaponskill("THROWING_DAGGER", 15, {
	applicationDelay: 0.62,
	potency: [
		["NEVER", 120],
		["MELEE_MASTERY_II_NIN", 200],
	],
	onConfirm: (state) => state.gainNinki(5),
});

makeNINWeaponskill("SPINNING_EDGE", 1, {
	applicationDelay: 0.4,
	potency: [
		["NEVER", 180],
		["MELEE_MASTERY_II_NIN", 220],
		["MELEE_MASTERY_III_NIN", 300],
	],
	onConfirm: (state) => state.gainNinki(5),
});

makeNINWeaponskill("GUST_SLASH", 4, {
	applicationDelay: 0.4,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_NIN", 120],
		["MELEE_MASTERY_II_NIN", 160],
		["MELEE_MASTERY_III_NIN", 240],
	],
	combo: {
		potency: [
			["NEVER", 260],
			["MELEE_MASTERY_NIN", 280],
			["MELEE_MASTERY_II_NIN", 320],
			["MELEE_MASTERY_III_NIN", 400],
		],
		resource: "NIN_COMBO_TRACKER",
		resourceValue: 1,
	},
	highlightIf: (state) => state.hasResourceExactly("NIN_COMBO_TRACKER", 1),
	onConfirm: (state) => state.hasResourceExactly("NIN_COMBO_TRACKER", 1) && state.gainNinki(5),
});

const comboEndGainNinki = (state: NINState) =>
	state.gainNinki(
		state.hasTraitUnlocked("SHUKIHO_III") ? 15 : state.hasTraitUnlocked("SHUKIHO_II") ? 10 : 5,
	);

makeNINWeaponskill("AEOLIAN_EDGE", 26, {
	applicationDelay: 0.54,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_NIN", 140],
		// according to consolegameswiki,
		// melee mastery does not affect combo/positional potencies?
		// TODO verify against tooltips
		["MELEE_MASTERY_III_NIN", 220],
	],
	combo: {
		potency: [
			["NEVER", 340],
			["MELEE_MASTERY_III_NIN", 400],
		],
		resource: "NIN_COMBO_TRACKER",
		resourceValue: 2,
	},
	positional: {
		potency: [
			["NEVER", 160],
			["MELEE_MASTERY_NIN", 200],
			["MELEE_MASTERY_III_NIN", 280],
		],
		comboPotency: [
			["NEVER", 400],
			["MELEE_MASTERY_III_NIN", 460],
		],
		location: "rear",
	},
	highlightIf: (state) => state.hasResourceExactly("NIN_COMBO_TRACKER", 2),
	onConfirm: comboEndGainNinki,
	jobPotencyModifiers: (state) =>
		state.tryConsumeResource("KAZEMATOI") ? [Modifiers.Kazematoi] : [],
});

makeNINWeaponskill("ARMOR_CRUSH", 54, {
	applicationDelay: 0.62,
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_NIN", 140],
		["MELEE_MASTERY_III_NIN", 240],
	],
	combo: {
		potency: [
			["NEVER", 320],
			["MELEE_MASTERY_NIN", 360],
			["MELEE_MASTERY_III_NIN", 440],
		],
		resource: "NIN_COMBO_TRACKER",
		resourceValue: 2,
	},
	positional: {
		potency: [
			["NEVER", 160],
			["MELEE_MASTERY_NIN", 200],
			["MELEE_MASTERY_III_NIN", 300],
		],
		comboPotency: [
			["NEVER", 380],
			["MELEE_MASTERY_NIN", 420],
			["MELEE_MASTERY_III_NIN", 500],
		],
		location: "flank",
	},
	highlightIf: (state) => state.hasResourceExactly("NIN_COMBO_TRACKER", 2),
	onConfirm: combineEffects((state) => {
		if (state.hasResourceExactly("NIN_COMBO_TRACKER", 2)) {
			state.resources.get("KAZEMATOI").gain(2);
		}
	}, comboEndGainNinki),
});

makeNINWeaponskill("DEATH_BLOSSOM", 38, {
	applicationDelay: 0.71,
	potency: 100,
	falloff: 0,
	onConfirm: (state) => state.gainNinki(5),
});

makeNINWeaponskill("HAKKE_MUJINSATSU", 52, {
	applicationDelay: 0.62,
	potency: 100,
	combo: {
		potency: 120,
		resource: "NIN_AOE_COMBO_TRACKER",
		resourceValue: 1,
	},
	falloff: 0,
	highlightIf: (state) => state.hasResourceExactly("NIN_AOE_COMBO_TRACKER", 1),
	onConfirm: (state) =>
		state.hasResourceExactly("NIN_AOE_COMBO_TRACKER", 1) && state.gainNinki(5),
	jobPotencyModifiers: (state) =>
		state.hasResourceExactly("NIN_AOE_COMBO_TRACKER", 1) && state.hasResourceAvailable("DOTON")
			? [Modifiers.HollowNozuchi]
			: [],
});

const FS_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") && state.isMudraTrackerIn([[]]);
const KATON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") && state.isMudraTrackerIn([[Mudra.Chi], [Mudra.Jin]]);
const RAITON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") && state.isMudraTrackerIn([[Mudra.Ten], [Mudra.Jin]]);
const HYOTON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") && state.isMudraTrackerIn([[Mudra.Ten], [Mudra.Chi]]);
const HUTON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") &&
	state.isMudraTrackerIn([
		[Mudra.Jin, Mudra.Chi],
		[Mudra.Chi, Mudra.Jin],
	]);
const DOTON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Jin],
		[Mudra.Jin, Mudra.Ten],
	]);
const SUITON_TCJ_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("TEN_CHI_JIN") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Chi],
		[Mudra.Chi, Mudra.Ten],
	]);
const TEN_REPLACEMENTS: ConditionalSkillReplace<NINState>[] = [
	{
		newSkill: "TEN",
		condition: (state) => !state.hasResourceAvailable("TEN_CHI_JIN"),
	},
	{
		newSkill: "FUMA_SHURIKEN_TEN",
		condition: FS_TCJ_CONDITION,
	},
	{
		newSkill: "KATON_TEN",
		condition: KATON_TCJ_CONDITION,
	},
	{
		newSkill: "HUTON_TEN",
		condition: HUTON_TCJ_CONDITION,
	},
];
const CHI_REPLACEMENTS: ConditionalSkillReplace<NINState>[] = [
	{
		newSkill: "CHI",
		condition: (state) => !state.hasResourceAvailable("TEN_CHI_JIN"),
	},
	{
		newSkill: "FUMA_SHURIKEN_CHI",
		condition: FS_TCJ_CONDITION,
	},
	{
		newSkill: "RAITON_CHI",
		condition: RAITON_TCJ_CONDITION,
	},
	{
		newSkill: "DOTON_CHI",
		condition: DOTON_TCJ_CONDITION,
	},
];
const JIN_REPLACEMENTS: ConditionalSkillReplace<NINState>[] = [
	{
		newSkill: "JIN",
		condition: (state) => !state.hasResourceAvailable("TEN_CHI_JIN"),
	},
	{
		newSkill: "FUMA_SHURIKEN_JIN",
		condition: FS_TCJ_CONDITION,
	},
	{
		newSkill: "HYOTON_JIN",
		condition: HYOTON_TCJ_CONDITION,
	},
	{
		newSkill: "SUITON_JIN",
		condition: SUITON_TCJ_CONDITION,
	},
];

// name, level, app delay, potency, falloff
const NINJUTSU_POTENCY_LIST: Array<
	[NINActionKey, number, number, number | Array<[TraitKey, number]>, number | undefined]
> = [
	[
		"FUMA_SHURIKEN",
		30,
		0.89,
		[
			["NEVER", 450],
			["MELEE_MASTERY_III_NIN", 500],
		],
		undefined,
	],
	["KATON", 35, 0.94, 350, 0],
	[
		"RAITON",
		35,
		0.71,
		[
			["NEVER", 650],
			["MELEE_MASTERY_III_NIN", 740],
		],
		undefined,
	],
	["HYOTON", 45, 1.16, 350, undefined],
	["HUTON", 45, 0.98, 240, 0],
	[
		"SUITON",
		45,
		0.98,
		[
			["NEVER", 500],
			["MELEE_MASTERY_III_NIN", 580],
		],
		undefined,
	],
	["GOKA_MEKKYAKU", 76, 0.76, 600, 0],
	["HYOSHO_RANRYU", 76, 0.62, 1300, undefined],
];

// @ts-expect-error compiler is not smart enough to validate the destructure
const NINJUTSU_POTENCY_MAP: Map<
	NINActionKey,
	Array<[number, number, number | Array<[TraitKey, number]>, number | undefined]>
> = new Map(
	NINJUTSU_POTENCY_LIST.map(([name, level, applicationDelay, potency, falloff]) => [
		name,
		[level, applicationDelay, potency, falloff],
	]),
);

const tcjReplaces: Array<[NINActionKey, StatePredicate<NINState>]> = [
	["FUMA_SHURIKEN_TEN", FS_TCJ_CONDITION],
	["FUMA_SHURIKEN_CHI", FS_TCJ_CONDITION],
	["FUMA_SHURIKEN_JIN", FS_TCJ_CONDITION],
	["KATON_TEN", KATON_TCJ_CONDITION],
	["RAITON_CHI", RAITON_TCJ_CONDITION],
	["HYOTON_JIN", HYOTON_TCJ_CONDITION],
	["HUTON_TEN", HUTON_TCJ_CONDITION],
	["SUITON_JIN", SUITON_TCJ_CONDITION],
];
tcjReplaces.forEach(
	// Use the generic constructor to avoid the generic bunny logic/restrictions.
	([name, condition]) => {
		// strip the mudra sign from the end of the key when looking up potencies
		const [, applicationDelay, potency, falloff] = NINJUTSU_POTENCY_MAP.get(
			name.substring(0, name.length - 4) as NINActionKey,
		)!;
		const mudra = name.substring(name.length - 3);
		const replacer =
			mudra === "TEN"
				? TEN_REPLACEMENTS
				: mudra === "CHI"
					? CHI_REPLACEMENTS
					: JIN_REPLACEMENTS;
		makeWeaponskill("NIN", name, 70, {
			startOnHotbar: false,
			// @ts-expect-error compiler is not smart enough to validate the destructure
			applicationDelay,
			recastTime: name === "HUTON_TEN" || name === "SUITON_JIN" ? 1.5 : 1,
			// @ts-expect-error compiler is not smart enough to validate the destructure
			potency,
			// @ts-expect-error compiler is not smart enough to validate the destructure
			falloff,
			replaceIf: replacer,
			validateAttempt: condition,
			jobPotencyModifiers: (state) => {
				const mods: PotencyModifier[] = [];
				addUniversalPotencyModifiers(state, mods);
				return mods;
			},
			onConfirm: combineEffects(
				(state: NINState) =>
					state.pushMudra(
						mudra === "TEN" ? Mudra.Ten : mudra === "CHI" ? Mudra.Chi : Mudra.Jin,
						true,
					),
				name === "RAITON_CHI"
					? (state) => state.stackRaijuReady()
					: name === "SUITON_JIN" || name === "HUTON_TEN"
						? (state) => state.gainStatus("SHADOW_WALKER")
						: undefined,
			),
		});
	},
);

const dotonConfirm = combineEffects(
	(state, node) => {
		state.gainStatus("DOTON");
		state.addDoTPotencies({
			node,
			effectName: "DOTON",
			skillName: "DOTON",
			tickPotency: 80,
			speedStat: "sks",
		});
	},
	(state: NINState) => state.clearMudraInfo(),
);
// Special handling for Doton
makeWeaponskill("NIN", "DOTON_CHI", 70, {
	startOnHotbar: false,
	recastTime: 1.5,
	replaceIf: CHI_REPLACEMENTS,
	validateAttempt: DOTON_TCJ_CONDITION,
	jobPotencyModifiers: (state) => {
		const mods: PotencyModifier[] = [];
		addUniversalPotencyModifiers(state, mods);
		return mods;
	},
	onConfirm: (state: NINState) => state.pushMudra(2, true),
});

// Mudra actions always take exactly 0.5s regardless of sks/haste.
// They technically are abilities rather than weaponskills, but it is easier to code them as weaponskills.
(
	[
		["TEN", 30, TEN_REPLACEMENTS],
		["CHI", 35, CHI_REPLACEMENTS],
		["JIN", 45, JIN_REPLACEMENTS],
	] as Array<[NINActionKey, number, ConditionalSkillReplace<NINState>[]]>
).forEach(([name, level, replacer], i) => {
	makeWeaponskill("NIN", name, level, {
		recastTime: 0.5,
		// Nobody ever weaves under mudras because it bunnies, so just treat their animation lock the same as recast.
		animationLock: 0.5,
		replaceIf: replacer,
		secondaryCooldown: {
			cdName: "cd_MUDRA",
			cooldown: 20,
			maxCharges: 2,
		},
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			addUniversalPotencyModifiers(state, mods);
			return mods;
		},
		validateAttempt: (state: Readonly<NINState>) => !state.hasResourceAvailable("TEN_CHI_JIN"),
		onConfirm: (state: NINState) => state.pushMudra(i + 1, false),
	});
});

// Validate/replace conditions for each ninjutsu.
const GOKA_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasTraitUnlocked("ENHANCED_KASSATSU") &&
	state.hasResourceAvailable("KASSATSU") &&
	state.isMudraTrackerIn([
		[Mudra.Chi, Mudra.Ten],
		[Mudra.Jin, Mudra.Ten],
	]);
const HYOSHO_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasTraitUnlocked("ENHANCED_KASSATSU") &&
	state.hasResourceAvailable("KASSATSU") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Jin],
		[Mudra.Chi, Mudra.Jin],
	]);
const FUMA_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([[Mudra.Ten], [Mudra.Chi], [Mudra.Jin]]);
const KATON_CONDITION: StatePredicate<NINState> = (state) =>
	(!state.hasTraitUnlocked("ENHANCED_KASSATSU") || !state.hasResourceAvailable("KASSATSU")) &&
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Chi, Mudra.Ten],
		[Mudra.Jin, Mudra.Ten],
	]);
const RAITON_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Chi],
		[Mudra.Jin, Mudra.Chi],
	]);
const HYOTON_CONDITION: StatePredicate<NINState> = (state) =>
	(!state.hasTraitUnlocked("ENHANCED_KASSATSU") || !state.hasResourceAvailable("KASSATSU")) &&
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Jin],
		[Mudra.Chi, Mudra.Jin],
	]);
const HUTON_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Jin, Mudra.Chi, Mudra.Ten],
		[Mudra.Chi, Mudra.Jin, Mudra.Ten],
	]);
const DOTON_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Jin, Mudra.Chi],
		[Mudra.Jin, Mudra.Ten, Mudra.Chi],
	]);
const SUITON_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	state.isMudraTrackerIn([
		[Mudra.Ten, Mudra.Chi, Mudra.Jin],
		[Mudra.Chi, Mudra.Ten, Mudra.Jin],
	]);

// probably a more efficient way to do this but whatever
const BUNNY_CONDITION: StatePredicate<NINState> = (state) =>
	state.hasResourceAvailable("MUDRA") &&
	(state.hasResourceAvailable("BUNNY") ||
		!state.isMudraTrackerIn([
			[Mudra.Ten],
			[Mudra.Chi],
			[Mudra.Jin],
			[Mudra.Chi, Mudra.Ten],
			[Mudra.Jin, Mudra.Ten],
			[Mudra.Ten, Mudra.Chi],
			[Mudra.Jin, Mudra.Chi],
			[Mudra.Ten, Mudra.Jin],
			[Mudra.Chi, Mudra.Jin],
			[Mudra.Jin, Mudra.Chi, Mudra.Ten],
			[Mudra.Chi, Mudra.Jin, Mudra.Ten],
			[Mudra.Ten, Mudra.Jin, Mudra.Chi],
			[Mudra.Jin, Mudra.Ten, Mudra.Chi],
			[Mudra.Ten, Mudra.Chi, Mudra.Jin],
			[Mudra.Chi, Mudra.Ten, Mudra.Jin],
		]));

const NINJUTSU_REPLACE_LIST: ConditionalSkillReplace<NINState>[] = [
	{
		newSkill: "GOKA_MEKKYAKU",
		condition: GOKA_CONDITION,
	},
	{
		newSkill: "HYOSHO_RANRYU",
		condition: HYOSHO_CONDITION,
	},
	{
		newSkill: "FUMA_SHURIKEN",
		condition: FUMA_CONDITION,
	},
	{
		newSkill: "KATON",
		condition: KATON_CONDITION,
	},
	{
		newSkill: "RAITON",
		condition: RAITON_CONDITION,
	},
	{
		newSkill: "HYOTON",
		condition: HYOTON_CONDITION,
	},
	{
		newSkill: "HUTON",
		condition: HUTON_CONDITION,
	},
	{
		newSkill: "DOTON",
		condition: DOTON_CONDITION,
	},
	{
		newSkill: "SUITON",
		condition: SUITON_CONDITION,
	},
	// If mudra is active but no valid ninjutsu was found, bnuuy
	{
		newSkill: "RABBIT_MEDIUM",
		// The bunny resource should be checked separately in case an ability was used between mudras.
		condition: (state) =>
			state.hasResourceAvailable("MUDRA") &&
			(state.hasResourceAvailable("BUNNY") || BUNNY_CONDITION(state)),
	},
	// If no mudra is active, then replace the skill with empty ninjutsu
	{
		newSkill: "NINJUTSU",
		condition: (state) => !state.hasResourceAvailable("MUDRA"),
	},
];

const getReplaceList = (skill: NINActionKey) =>
	NINJUTSU_REPLACE_LIST.filter((replace) => replace.newSkill !== skill);

makeWeaponskill("NIN", "NINJUTSU", 30, {
	recastTime: 1.5,
	validateAttempt: (state) => false,
	replaceIf: getReplaceList("NINJUTSU"),
});

makeWeaponskill("NIN", "RABBIT_MEDIUM", 30, {
	startOnHotbar: false,
	recastTime: 1.5,
	replaceIf: getReplaceList("RABBIT_MEDIUM"),
	validateAttempt: NINJUTSU_REPLACE_LIST.find((item) => item.newSkill === "RABBIT_MEDIUM")!
		.condition,
	onConfirm: (state) => state.clearMudraInfo(),
});

NINJUTSU_POTENCY_LIST.forEach(([name, level, applicationDelay, potency, falloff]) => {
	// Ninjutsus have a fixed 1.5s recast
	makeWeaponskill("NIN", name, level, {
		startOnHotbar: false,
		applicationDelay,
		recastTime: (state) => (state.hasResourceAvailable("TEN_CHI_JIN") ? 1 : 1.5),
		potency,
		falloff,
		replaceIf: getReplaceList(name),
		validateAttempt: NINJUTSU_REPLACE_LIST.find((item) => item.newSkill === name)!.condition,
		onConfirm: combineEffects(
			// reduce shukuchi CD by 60s on katon/raiton/hyoton
			// kassatsu-exclusive versions do not restore shukuchi cd
			["KATON", "RAITON", "HYOTON"].includes(name)
				? (state: NINState) => {
						const shukuchiElapsed = state.cooldowns
							.get("cd_SHUKUCHI")
							.timeTillNextStackAvailable();
						if (shukuchiElapsed === 0) {
							return;
						}
						// gain a whole stack of shukuchi
						state.cooldowns.get("cd_SHUKUCHI").restore(60);
					}
				: undefined,
			name === "RAITON"
				? (state) => state.stackRaijuReady()
				: name === "SUITON" || name === "HUTON"
					? (state) => state.gainStatus("SHADOW_WALKER")
					: undefined,
			(state) => state.clearMudraInfo(),
		),
		jobPotencyModifiers: (state) => {
			const mods = [];
			if (state.hasResourceAvailable("KASSATSU")) {
				mods.push(Modifiers.Kassatsu);
			}
			if (state.hasResourceAvailable("DOTON") && ["KATON", "GOKA_MEKKYAKU"].includes(name)) {
				mods.push(Modifiers.HollowNozuchi);
			}
			addUniversalPotencyModifiers(state, mods);
			return mods;
		},
	});
});

// Special treatment for Doton's puddle creation
makeWeaponskill("NIN", "DOTON", 45, {
	startOnHotbar: false,
	recastTime: (state) => (state.hasResourceAvailable("TEN_CHI_JIN") ? 1 : 1.5),
	potency: 0,
	falloff: 0,
	replaceIf: getReplaceList("DOTON"),
	validateAttempt: NINJUTSU_REPLACE_LIST.find((item) => item.newSkill === "DOTON")!.condition,
	onConfirm: dotonConfirm,
	// Kassatsu does not affect doton
});

const HAS_RAIJU = (state: Readonly<NINState>) => state.hasResourceAvailable("RAIJU_READY");
const RAIJU_POTENCY: Array<[TraitKey, number]> = [
	["NEVER", 560],
	["MELEE_MASTERY_III_NIN", 700],
];

makeNINWeaponskill("FORKED_RAIJU", 90, {
	applicationDelay: 0.62,
	potency: RAIJU_POTENCY,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	highlightIf: HAS_RAIJU,
	validateAttempt: HAS_RAIJU,
	onConfirm: (state) => {
		state.gainNinki(5);
		state.tryConsumeResource("RAIJU_READY");
	},
});

makeNINWeaponskill("FLEETING_RAIJU", 90, {
	applicationDelay: 0.76,
	potency: RAIJU_POTENCY,
	highlightIf: HAS_RAIJU,
	validateAttempt: HAS_RAIJU,
	onConfirm: (state) => {
		state.gainNinki(5);
		state.tryConsumeResource("RAIJU_READY");
	},
});

makeNINAbility("DOKUMORI", 66, "cd_DOKUMORI", {
	applicationDelay: 1.07,
	potency: 400,
	falloff: 0,
	cooldown: 120,
	onConfirm: (state) => {
		state.gainStatus("DOKUMORI");
		state.gainNinki(40);
		if (state.hasTraitUnlocked("ENHANCED_DOKUMORI")) {
			state.gainStatus("HIGI");
		}
	},
});

const TRICK_CONDITION = (state: Readonly<NINState>) =>
	state.hasResourceAvailable("HIDDEN") || state.hasResourceAvailable("SHADOW_WALKER");

makeNINAbility("TRICK_ATTACK", 18, "cd_TRICK_ATTACK", {
	autoUpgrade: {
		trait: "TRICK_ATTACK_MASTERY",
		otherSkill: "KUNAIS_BANE",
	},
	applicationDelay: 0.8,
	potency: 300,
	positional: {
		potency: 400,
		location: "rear",
	},
	cooldown: 60,
	highlightIf: TRICK_CONDITION,
	validateAttempt: TRICK_CONDITION,
	onConfirm: (state) => {
		state.gainStatus("TRICK_ATTACK");
		state.tryConsumeResource("SHADOW_WALKER");
	},
});

makeNINAbility("KUNAIS_BANE", 92, "cd_TRICK_ATTACK", {
	autoDowngrade: {
		trait: "TRICK_ATTACK_MASTERY",
		otherSkill: "TRICK_ATTACK",
	},
	startOnHotbar: false,
	applicationDelay: 1.29,
	cooldown: 60,
	potency: 700,
	falloff: 0,
	highlightIf: TRICK_CONDITION,
	validateAttempt: TRICK_CONDITION,
	onConfirm: (state) => {
		state.gainStatus("KUNAIS_BANE");
		state.tryConsumeResource("SHADOW_WALKER");
	},
});

makeNINAbility("DREAM_WITHIN_A_DREAM", 56, "cd_DREAM_WITHIN_A_DREAM", {
	applicationDelay: 0.98,
	cooldown: 60,
	// 180 x3 hits
	potency: 180 * 3,
});

makeNINResourceAbility("KASSATSU", 50, "cd_KASSATSU", {
	rscType: "KASSATSU",
	cooldown: 60,
	applicationDelay: 0,
	validateAttempt: (state) => !state.hasResourceAvailable("TEN_CHI_JIN"),
});

const AT_LEAST_50_NINKI = (state: Readonly<NINState>) => state.resources.get("NINKI").available(50);

const CONSUME_50_NINKI = (state: NINState) => state.resources.get("NINKI").consume(50);

makeNINAbility("BHAVACAKRA", 68, "cd_BHAVACAKRA", {
	applicationDelay: 0.62,
	cooldown: 1,
	potency: [
		["NEVER", 350],
		["MELEE_MASTERY_III_NIN", 400],
	],
	highlightIf: AT_LEAST_50_NINKI,
	validateAttempt: AT_LEAST_50_NINKI,
	replaceIf: [
		{
			newSkill: "ZESHO_MEPPO",
			condition: (state) => state.hasResourceAvailable("HIGI"),
		},
	],
	onConfirm: combineEffects(CONSUME_50_NINKI, (state) => state.tryConsumeResource("MEISUI")),
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("MEISUI") ? [Modifiers.Meisui] : [],
});

makeNINAbility("ZESHO_MEPPO", 96, "cd_BHAVACAKRA", {
	startOnHotbar: false,
	applicationDelay: 1.03,
	cooldown: 1,
	potency: 700,
	highlightIf: (state) => state.hasResourceAvailable("HIGI") && AT_LEAST_50_NINKI(state),
	validateAttempt: (state) => state.hasResourceAvailable("HIGI") && AT_LEAST_50_NINKI(state),
	replaceIf: [
		{
			newSkill: "BHAVACAKRA",
			condition: (state) => !state.hasResourceAvailable("HIGI"),
		},
	],
	onConfirm: combineEffects(CONSUME_50_NINKI, (state) => {
		state.tryConsumeResource("MEISUI");
		state.tryConsumeResource("HIGI");
	}),
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("MEISUI") ? [Modifiers.Meisui] : [],
});

makeNINAbility("HELLFROG_MEDIUM", 62, "cd_BHAVACAKRA", {
	applicationDelay: 0.8,
	cooldown: 1,
	potency: 250,
	falloff: 0,
	highlightIf: AT_LEAST_50_NINKI,
	validateAttempt: AT_LEAST_50_NINKI,
	replaceIf: [
		{
			newSkill: "DEATHFROG_MEDIUM",
			condition: (state) => state.hasResourceAvailable("HIGI"),
		},
	],
	onConfirm: CONSUME_50_NINKI,
});

makeNINAbility("DEATHFROG_MEDIUM", 96, "cd_BHAVACAKRA", {
	startOnHotbar: false,
	applicationDelay: 0.8,
	cooldown: 1,
	potency: 400,
	falloff: 0,
	highlightIf: (state) => state.hasResourceAvailable("HIGI") && AT_LEAST_50_NINKI(state),
	validateAttempt: (state) => state.hasResourceAvailable("HIGI") && AT_LEAST_50_NINKI(state),
	onConfirm: combineEffects(CONSUME_50_NINKI, (state) => state.tryConsumeResource("HIGI")),
});

makeNINResourceAbility("MEISUI", 72, "cd_MEISUI", {
	rscType: "MEISUI",
	cooldown: 120,
	applicationDelay: 0,
	highlightIf: (state) => state.hasResourceAvailable("SHADOW_WALKER"),
	validateAttempt: (state) => state.hasResourceAvailable("SHADOW_WALKER"),
	onConfirm: (state) => {
		state.tryConsumeResource("SHADOW_WALKER");
		state.gainNinki(50);
	},
});

makeNINResourceAbility("BUNSHIN", 80, "cd_BUNSHIN", {
	rscType: "BUNSHIN",
	cooldown: 90,
	applicationDelay: 0,
	replaceIf: [
		{
			newSkill: "PHANTOM_KAMAITACHI",
			condition: (state) => state.hasResourceAvailable("PHANTOM_KAMAITACHI_READY"),
		},
	],
	highlightIf: AT_LEAST_50_NINKI,
	validateAttempt: AT_LEAST_50_NINKI,
	onConfirm: combineEffects(CONSUME_50_NINKI, (state) =>
		state.gainStatus("PHANTOM_KAMAITACHI_READY"),
	),
});

makeNINWeaponskill("PHANTOM_KAMAITACHI", 80, {
	startOnHotbar: false,
	potency: 700,
	falloff: 0,
	applicationDelay: 1.57,
	highlightIf: (state) => state.hasResourceAvailable("PHANTOM_KAMAITACHI_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("PHANTOM_KAMAITACHI_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("PHANTOM_KAMAITACHI_READY");
		state.gainNinki(10);
	},
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("DOTON")
			? [Modifiers.HollowNozuchi, Modifiers.NinPet]
			: [Modifiers.NinPet],
});

makeNINResourceAbility("TEN_CHI_JIN", 70, "cd_TEN_CHI_JIN", {
	rscType: "TEN_CHI_JIN",
	applicationDelay: 0,
	cooldown: 120,
	replaceIf: [
		{
			newSkill: "TENRI_JINDO",
			condition: (state) => state.hasResourceAvailable("TENRI_JINDO_READY"),
		},
	],
	validateAttempt: (state) => !state.hasResourceAvailable("KASSATSU"),
	onConfirm: (state) => {
		state.hasTraitUnlocked("ENHANCED_TEN_CHI_JIN") && state.gainStatus("TENRI_JINDO_READY");
		// Cancel any currently active mudras.
		state.clearMudraInfo();
	},
});

makeNINAbility("TENRI_JINDO", 100, "cd_TENRI_JINDO", {
	startOnHotbar: false,
	applicationDelay: 1.69,
	cooldown: 1,
	potency: 1100,
	falloff: 0,
	highlightIf: (state) => true,
	validateAttempt: (state) => state.hasResourceAvailable("TENRI_JINDO_READY"),
	onConfirm: (state) => state.tryConsumeResource("TENRI_JINDO_READY"),
});

makeNINAbility("SHUKUCHI", 40, "cd_SHUKUCHI", {
	applicationDelay: 0,
	cooldown: 60,
	// set by trait in constructor
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeNINResourceAbility("SHADE_SHIFT", 2, "cd_SHADE_SHIFT", {
	rscType: "SHADE_SHIFT",
	applicationDelay: 0.4,
	cooldown: 120,
});

// TODO potentially deal with Hide?
