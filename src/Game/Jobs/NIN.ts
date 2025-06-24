// Skill and state declarations for NIN.

// TODO stuff to test
// - mudra -> kassatsu -> ninjutsu eats kassatsu
// - mudra -> TCJ = eat mudras
// - TCJ -> mudra still produces valid combinations
// - TCJ and mudra manual clickoff don't break subsequent usages
// - various bunny conditions

import { NINStatusPropsGenerator } from "../../Components/Jobs/NIN";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionNode } from "../../Controller/Record";
import { Aspect } from "../Common";
import { TraitKey } from "../Data";
import { NINActionKey, NINCooldownKey, NINResourceKey } from "../Data/Jobs/NIN";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, Potency } from "../Potency";
import { getResourceInfo, makeResource, ResourceInfo, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	makeAbility,
	MakeAbilityParams,
	MakeGCDParams,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	StatePredicate,
	Weaponskill,
} from "../Skills";

const makeNINResource = (
	rsc: NINResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("NIN", rsc, maxValue, params ?? {});
};

makeNINResource("KAZEMATOI", 5);
makeNINResource("NINKI", 100);

makeNINResource("MUDRA", 1, { timeout: 6 });
makeNINResource("HIDE", 1);
makeNINResource("TRICK_ATTACK", 1, { timeout: 15.77 });
makeNINResource("KASSATSU", 1, { timeout: 15 });
makeNINResource("DOKUMORI", 1, { timeout: 21 });
makeNINResource("TENRI_JINDO_READY", 1, { timeout: 30 });
makeNINResource("TEN_CHI_JIN", 1, { timeout: 6 });
makeNINResource("MEISUI", 1, { timeout: 30 });
makeNINResource("SHADOW_WALKER", 1, { timeout: 20 });
makeNINResource("BUNSHIN", 5, { timeout: 30 });
makeNINResource("PHANTOM_KAMAITACHI_READY", 1, { timeout: 45 });
makeNINResource("RAIJU_READY", 1, { timeout: 30 });
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

	override get statusPropsGenerator(): StatusPropsGenerator<NINState> {
		return new NINStatusPropsGenerator(this);
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
const notInTCJ = (state: Readonly<GameState>) =>
	state.job !== "NIN" || !state.hasResourceAvailable("TEN_CHI_JIN");

// Special case for NIN, where any action during a mudra causes a bunny.
const bunny = (state: GameState) => {
	if (state.job === "NIN" && state.hasResourceAvailable("MUDRA")) {
		state.gainStatus("BUNNY");
	}
};

const makeNINWeaponskill = (
	name: NINActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<NINState>>,
): Weaponskill<NINState> => {
	return makeWeaponskill("NIN", name, unlockLevel, {
		...params,
		validateAttempt: (state: Readonly<NINState>) =>
			(notInTCJ(state) && params.validateAttempt?.(state)) || false,
		onConfirm: combineEffects(bunny, (state: NINState, node: ActionNode) =>
			params.onConfirm?.(state, node),
		),
	});
};

const makeNINAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: Partial<MakeAbilityParams<NINState>>,
): Ability<NINState> => {
	return makeAbility("NIN", name, unlockLevel, cdName, {
		...params,
		validateAttempt: (state: Readonly<NINState>) =>
			(notInTCJ(state) && params.validateAttempt?.(state)) || false,
		onConfirm: combineEffects(bunny, (state: NINState, node: ActionNode) =>
			params.onConfirm?.(state, node),
		),
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
		validateAttempt: (state: Readonly<NINState>) =>
			(notInTCJ(state) && params.validateAttempt?.(state)) || false,
		onConfirm: combineEffects(bunny, (state: NINState, node: ActionNode) =>
			params.onConfirm?.(state, node),
		),
	});
};

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

const getTenReplace = (skill: NINActionKey) =>
	TEN_REPLACEMENTS.filter((replace) => replace.newSkill !== skill);
const getChiReplace = (skill: NINActionKey) =>
	CHI_REPLACEMENTS.filter((replace) => replace.newSkill !== skill);
const getJinReplace = (skill: NINActionKey) =>
	JIN_REPLACEMENTS.filter((replace) => replace.newSkill !== skill);

const NINJUTSU_POTENCY_LIST: Array<
	[NINActionKey, number, number | Array<[TraitKey, number]>, number | undefined]
> = [
	[
		"FUMA_SHURIKEN",
		30,
		[
			["NEVER", 450],
			["MELEE_MASTERY_III_NIN", 500],
		],
		undefined,
	],
	["KATON", 35, 350, 0],
	[
		"RAITON",
		35,
		[
			["NEVER", 650],
			["MELEE_MASTERY_III_NIN", 740],
		],
		undefined,
	],
	["HYOTON", 45, 350, undefined],
	["HUTON", 45, 240, 0],
	[
		"SUITON",
		45,
		[
			["NEVER", 500],
			["MELEE_MASTERY_III_NIN", 580],
		],
		undefined,
	],
	["GOKA_MEKKYAKU", 76, 600, 0],
	["HYOSHO_RANRYU", 76, 1300, undefined],
];

// @ts-expect-error compiler is not smart enough to validate the destructure
const NINJUTSU_POTENCY_MAP: Map<
	NINActionKey,
	Array<[number, number | Array<[TraitKey, number]>, number | undefined]>
> = new Map(
	NINJUTSU_POTENCY_LIST.map(([name, level, potency, falloff]) => [
		name,
		[level, potency, falloff],
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
		const [_, potency, falloff] = NINJUTSU_POTENCY_MAP.get(
			name.substring(0, name.length - 4) as NINActionKey,
		)!;
		const mudra = name.substring(name.length - 3);
		const replacer =
			mudra === "TEN" ? getTenReplace : mudra === "CHI" ? getChiReplace : getJinReplace;
		makeWeaponskill("NIN", name, 70, {
			startOnHotbar: false,
			recastTime: 1,
			// @ts-expect-error compiler is not smart enough to validate the destructure
			potency,
			// @ts-expect-error compiler is not smart enough to validate the destructure
			falloff,
			replaceIf: replacer(name),
			validateAttempt: condition,
			onConfirm: (state: NINState) =>
				state.pushMudra(
					mudra === "TEN" ? Mudra.Ten : mudra === "CHI" ? Mudra.Chi : Mudra.Jin,
					true,
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
	recastTime: 1,
	replaceIf: getChiReplace("DOTON_CHI"),
	validateAttempt: DOTON_TCJ_CONDITION,
	onConfirm: (state: NINState) => state.pushMudra(2, true),
});

// Mudra actions always take exactly 0.5s regardless of sks/haste.
// They technically are abilities rather than weaponskills, but it is easier to code them as weaponskills.
(
	[
		["TEN", 30, getTenReplace],
		["CHI", 35, getChiReplace],
		["JIN", 45, getJinReplace],
	] as Array<[NINActionKey, number, (key: NINActionKey) => ConditionalSkillReplace<NINState>[]]>
).forEach(([name, level, replacer], i) => {
	makeWeaponskill("NIN", name, level, {
		recastTime: 0.5,
		replaceIf: replacer(name),
		secondaryCooldown: {
			cdName: "cd_MUDRA",
			cooldown: 20,
			maxCharges: 2,
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

NINJUTSU_POTENCY_LIST.forEach(([name, level, potency, falloff]) => {
	// Ninjutsus have a fixed 1.5s recast
	makeWeaponskill("NIN", name, level, {
		startOnHotbar: false,
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
				: NO_EFFECT,
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

makeNINResourceAbility("KASSATSU", 50, "cd_KASSATSU", {
	rscType: "KASSATSU",
	cooldown: 60,
	applicationDelay: 0,
	validateAttempt: (state) => !state.hasResourceAvailable("TEN_CHI_JIN"),
});

makeNINResourceAbility("TEN_CHI_JIN", 70, "cd_TEN_CHI_JIN", {
	rscType: "TEN_CHI_JIN",
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => !state.hasResourceAvailable("KASSATSU"),
	onConfirm: (state) => {
		state.hasTraitUnlocked("ENHANCED_TEN_CHI_JIN") && state.gainStatus("TENRI_JINDO_READY"),
			// Cancel any currently active mudras.
			state.clearMudraInfo();
	},
});

makeNINAbility("SHUKUCHI", 40, "cd_SHUKUCHI", {
	cooldown: 60,
	// set by trait in constructor
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});
