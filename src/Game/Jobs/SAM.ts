// Skill and state declarations for SAM.

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { makeComboModifier, makePositionalModifier, Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	ConditionalSkillReplace,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	ResourceCalculationFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { makeResource, CoolDown, Event, EventTag } from "../Resources";
import { GameConfig } from "../GameConfig";
import { localizeResourceType } from "../../Components/Localization";
import { ActionNode } from "../../Controller/Record";
import { ActionKey, TraitKey } from "../Data";
import { SAMStatusPropsGenerator } from "../../Components/Jobs/SAM";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { SAMResourceKey, SAMCooldownKey } from "../Data/Jobs/SAM";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makeSAMResource = (rsc: SAMResourceKey, maxValue: number, params?: { timeout: number }) => {
	makeResource("SAM", rsc, maxValue, params ?? {});
};

makeSAMResource("MEIKYO_SHISUI", 3, { timeout: 20 });
makeSAMResource("FUGETSU", 1, { timeout: 40 });
makeSAMResource("FUKA", 1, { timeout: 40 });
makeSAMResource("ZANSHIN_READY", 1, { timeout: 30 });
makeSAMResource("TENDO", 1, { timeout: 30 });
makeSAMResource("OGI_READY", 1, { timeout: 30 });
makeSAMResource("TSUBAME_GAESHI_READY", 1, { timeout: 30 });
makeSAMResource("THIRD_EYE", 1, { timeout: 4 });
makeSAMResource("TENGENTSU", 1, { timeout: 4 });
makeSAMResource("TENGENTSUS_FORESIGHT", 1, { timeout: 9 });
makeSAMResource("ENHANCED_ENPI", 1, { timeout: 15 });
makeSAMResource("MEDITATE", 1, { timeout: 15.2 }); // based on a random DSR P7 log I saw

makeSAMResource("KENKI", 100);
makeSAMResource("SETSU", 1);
makeSAMResource("GETSU", 1);
makeSAMResource("KA_SEN", 1);
makeSAMResource("MEDITATION", 3);

makeSAMResource("HIGANBANA_DOT", 1, { timeout: 60 });

// samurai combo resources (behind the scenes)
const ALL_SAM_COMBOS: SAMResourceKey[] = [
	"SAM_TWO_READY",
	"SAM_TWO_AOE_READY",
	"GEKKO_READY",
	"KASHA_READY",
	"KAESHI_OGI_READY",
];

ALL_SAM_COMBOS.forEach((combo) => makeSAMResource(combo, 1, { timeout: 30 }));

// Track the action for tsubame-gaeshi to perform
// 0 - nothing
// 1 - Tenka Goken
// 2 - Tendo Goken
// 3 - Midare Setsugekka
// 4 - Tendo Setsugekka
makeSAMResource("KAESHI_TRACKER", 4, { timeout: 30 });

// === JOB GAUGE AND STATE ===
export class SAMState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const gurenCd = this.hasTraitUnlocked("ENHANCED_HISSATSU") ? 60 : 120;
		const meikyoStacks = this.hasTraitUnlocked("ENHANCED_MEIKYO_SHISUI") ? 2 : 1;
		[
			new CoolDown("cd_MEIKYO_SHISUI", 55, meikyoStacks, meikyoStacks),
			new CoolDown("cd_SENEI_GUREN", gurenCd, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		super.registerRecurringEvents([
			{
				reportName: localizeResourceType("HIGANBANA_DOT"),
				groupedEffects: [
					{
						effectName: "HIGANBANA_DOT",
						appliedBy: ["HIGANBANA"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SAMState> {
		return new SAMStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("ENHANCED_ENPI") && skill.name === "ENPI") {
			node.addBuff(BuffType.EnhancedEnpi);
		}
		if (this.hasResourceAvailable("FUGETSU")) {
			node.addBuff(BuffType.Fugetsu);
		}
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("FUKA") && skill.cdName === "cd_GCD") {
			node.addBuff(BuffType.Fuka);
		}
	}

	override cancelChanneledSkills(): void {
		// assume there's only one event
		const evt = this.findNextQueuedEventByTag(EventTag.MeditateTick);
		if (evt) {
			evt.canceled = true;
		}
		this.tryConsumeResource("MEDITATE");
	}

	getFugetsuModifier(): PotencyModifier {
		return this.hasTraitUnlocked("ENHANCED_FUGETSU_AND_FUKA")
			? Modifiers.FugetsuEnhanced
			: Modifiers.FugetsuBase;
	}

	getFukaModifier(): number {
		if (!this.hasResourceAvailable("FUKA")) {
			return 0;
		}

		return this.hasTraitUnlocked("ENHANCED_FUGETSU_AND_FUKA") ? 13 : 10;
	}

	// Return true if the active combo buff is up, or meikyo is active.
	// Does not advance the combo state.
	checkCombo(requiredCombo: SAMResourceKey): boolean {
		return (
			this.hasResourceAvailable(requiredCombo) || this.hasResourceAvailable("MEIKYO_SHISUI")
		);
	}

	refreshBuff(rscType: SAMResourceKey, delay: number) {
		// buffs are applied on hit, so apply it after a delay
		this.addEvent(
			new Event("gain fugetsu", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
			}),
		);
	}

	// Activate combo timers and deactivate all other combo timers.
	progressActiveCombo(nextCombos: SAMResourceKey[]) {
		ALL_SAM_COMBOS.forEach((combo) => {
			if (!nextCombos.includes(combo)) {
				this.setComboState(combo, 0);
			}
		});
		nextCombos.forEach((combo) => this.setComboState(combo, 1));
	}

	// Always call this before progressActiveCombo to ensure next combo buffs are properly set.
	// If you ever push a button that isn't a combo ender, then the combo will continue from
	// that button you hit (e.g. third stack of Meikyo being used on Shifu will make Gekko ready).
	tryConsumeMeikyo() {
		this.tryConsumeResource("MEIKYO_SHISUI");
	}

	gainKenki(kenkiAmount: number) {
		if (this.resources.get("KENKI").availableAmount() + kenkiAmount > 100) {
			controller.reportWarning(WarningType.KenkiOvercap);
		}
		this.resources.get("KENKI").gain(kenkiAmount);
	}

	gainMeditation() {
		if (this.resources.get("MEDITATION").availableAmount() === 3) {
			controller.reportWarning(WarningType.MeditationOvercap);
		}
		this.resources.get("MEDITATION").gain(1);
	}

	gainSen(sen: SAMResourceKey) {
		const resource = this.resources.get(sen);
		if (resource.available(1)) {
			controller.reportWarning(WarningType.SenOvercap);
		}
		resource.gain(1);
	}

	countSen(): number {
		return ["GETSU", "SETSU", "KA_SEN"].reduce(
			(acc, sen) => (this.hasResourceAvailable(sen as SAMResourceKey) ? acc + 1 : acc),
			0,
		);
	}

	consumeAllSen() {
		if (this.resources.get("SETSU").available(1)) {
			this.resources.get("SETSU").consume(1);
		}
		if (this.resources.get("GETSU").available(1)) {
			this.resources.get("GETSU").consume(1);
		}
		if (this.resources.get("KA_SEN").available(1)) {
			this.resources.get("KA_SEN").consume(1);
		}
	}

	startMeditateTimer() {
		// If meditate applied at time t, enqueue events 5 times at
		// t+3, t+6, t+9, t+12, and t+15.
		// The event is canceled when another skill is used, or the buff is clicked off.
		const meditateEvent = (tickNumber: number) => {
			const event = new Event("meditate tick", 3, () => {
				if (tickNumber < 5) {
					if (this.isInCombat()) {
						controller.reportMeditateTick(this.time, "+kenki/meditation");
						// Don't raise any warnings for gauge overcap here.
						this.resources.get("KENKI").gain(10);
						this.resources.get("MEDITATION").gain(1);
					}
					this.addEvent(meditateEvent(tickNumber + 1));
				}
			});
			event.addTag(EventTag.MeditateTick);
			return event;
		};
		this.addEvent(meditateEvent(0));
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeGCD_SAM = (
	name: ActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<SAMState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<SAMState>;
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		baseCastTime?: number;
		baseRecastTime?: number;
		basePotency: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: SAMResourceKey;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			comboPotency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		falloff?: number;
		applicationDelay: number;
		jobPotencyModifiers?: PotencyModifierFn<SAMState>;
		validateAttempt?: StatePredicate<SAMState>;
		onConfirm?: EffectFn<SAMState>;
		onApplication?: EffectFn<SAMState>;
	},
): Weaponskill<SAMState> => {
	const onApplication: EffectFn<SAMState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyModifiers = (state: Readonly<SAMState>) => {
		const mods: PotencyModifier[] = state.hasResourceAvailable("FUGETSU")
			? [state.getFugetsuModifier()]
			: [];
		if (params.jobPotencyModifiers) {
			mods.push(...params.jobPotencyModifiers(state));
		}
		const hitPositional = params.positional && state.hitPositional(params.positional.location);
		if (params.combo && state.checkCombo(params.combo.resource)) {
			mods.push(
				makeComboModifier(
					getBasePotency(state, params.combo.potency) -
						getBasePotency(state, params.basePotency),
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
						getBasePotency(state, params.basePotency),
				),
			);
		}
		return mods;
	};
	let castTime: number | ResourceCalculationFn<SAMState> = params.baseCastTime || 0;
	if (castTime) {
		// All SAM castbars are 1.8s (scaled to sks and affected by fuka) when synced
		castTime = (state) =>
			state.hasTraitUnlocked("ENHANCED_IAIJUTSU")
				? params.baseCastTime || 0
				: state.config.adjustedSksCastTime(1.8, state.getFukaModifier());
	}
	return makeWeaponskill("SAM", name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		highlightIf: params.highlightIf,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		castTime: castTime,
		recastTime: (state) =>
			state.config.adjustedSksGCD(params.baseRecastTime ?? 2.5, state.getFukaModifier()),
		potency: params.basePotency,
		validateAttempt: params.validateAttempt,
		jobPotencyModifiers: jobPotencyModifiers,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => !(params.baseCastTime && params.baseCastTime > 0),
		onConfirm: params.onConfirm,
		onApplication: onApplication,
	});
};

const makeAbility_SAM = (
	name: ActionKey,
	unlockLevel: number,
	cdName: SAMCooldownKey,
	params: {
		replaceIf?: ConditionalSkillReplace<SAMState>[];
		startOnHotbar?: boolean;
		requiresCombat?: boolean;
		highlightIf?: StatePredicate<SAMState>;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		potency?: number | Array<[TraitKey, number]>;
		jobPotencyModifiers?: PotencyModifierFn<SAMState>;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<SAMState>;
		onConfirm?: EffectFn<SAMState>;
		onApplication?: EffectFn<SAMState>;
	},
): Ability<SAMState> => {
	if (params.potency && !params.jobPotencyModifiers) {
		params.jobPotencyModifiers = (state) =>
			state.hasResourceAvailable("FUGETSU") ? [state.getFugetsuModifier()] : [];
	}
	return makeAbility("SAM", name, unlockLevel, cdName, params);
};

// https://docs.google.com/spreadsheets/d/1Emevsz5_oJdmkXy23hZQUXimirZQaoo5BejSzL3hZ9I/edit?gid=865790859#gid=865790859

makeGCD_SAM("ENPI", 15, {
	applicationDelay: 0.71,
	basePotency: 100,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("ENHANCED_ENPI")) {
			state.tryConsumeResource("ENHANCED_ENPI");
		}
		state.gainKenki(10);
	},
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("ENHANCED_ENPI")
			? [
					state.hasTraitUnlocked("WAY_OF_THE_SAMURAI_III")
						? Modifiers.YatenpiEnhanced
						: Modifiers.YatenpiBase,
				]
			: [],
	highlightIf: (state) => state.hasResourceAvailable("ENHANCED_ENPI"),
});

makeGCD_SAM("HAKAZE", 1, {
	autoUpgrade: { trait: "HAKAZE_MASTERY", otherSkill: "GYOFU" },
	applicationDelay: 0.85, // TODO
	basePotency: 200,
	// TODO check if kenki gain is on damage app or cast confirmation
	onConfirm: (state) => {
		state.tryConsumeMeikyo();
		state.gainKenki(5);
		state.progressActiveCombo(["SAM_TWO_READY"]);
	},
});

makeGCD_SAM("GYOFU", 92, {
	autoDowngrade: { trait: "HAKAZE_MASTERY", otherSkill: "HAKAZE" },
	applicationDelay: 0.85,
	basePotency: 240,
	onConfirm: (state) => {
		state.tryConsumeMeikyo();
		state.gainKenki(5);
		state.progressActiveCombo(["SAM_TWO_READY"]);
	},
});

makeGCD_SAM("YUKIKAZE", 50, {
	applicationDelay: 0.85,
	basePotency: [
		["NEVER", 100],
		["WAY_OF_THE_SAMURAI_II", 110],
		["WAY_OF_THE_SAMURAI_III", 160],
	],
	combo: {
		potency: [
			["NEVER", 280],
			["WAY_OF_THE_SAMURAI_II", 290],
			["WAY_OF_THE_SAMURAI_III", 340],
		],
		resource: "SAM_TWO_READY",
	},
	onConfirm: (state) => {
		if (state.checkCombo("SAM_TWO_READY")) {
			state.gainKenki(15);
			state.gainSen("SETSU");
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo("SAM_TWO_READY"),
});

makeGCD_SAM("JINPU", 4, {
	applicationDelay: 0.62,
	basePotency: [
		["NEVER", 120],
		["WAY_OF_THE_SAMURAI_III", 140],
	],
	combo: {
		potency: [
			["NEVER", 280],
			["WAY_OF_THE_SAMURAI_III", 300],
		],
		resource: "SAM_TWO_READY",
	},
	onConfirm: (state) => {
		if (state.checkCombo("SAM_TWO_READY")) {
			state.gainKenki(5);
			state.refreshBuff("FUGETSU", 0.62);
			state.tryConsumeMeikyo();
			state.progressActiveCombo(["GEKKO_READY"]);
		} else {
			state.tryConsumeMeikyo();
			state.progressActiveCombo([]);
		}
	},
	highlightIf: (state) => state.checkCombo("SAM_TWO_READY"),
});

makeGCD_SAM("GEKKO", 30, {
	applicationDelay: 0.76,
	basePotency: [
		["NEVER", 100],
		["WAY_OF_THE_SAMURAI_II", 110],
		["WAY_OF_THE_SAMURAI_III", 160],
	],
	combo: {
		potency: [
			["NEVER", 310],
			["WAY_OF_THE_SAMURAI_II", 320],
			["WAY_OF_THE_SAMURAI_III", 370],
		],
		resource: "GEKKO_READY",
	},
	positional: {
		potency: [
			["NEVER", 150],
			["WAY_OF_THE_SAMURAI_II", 160],
			["WAY_OF_THE_SAMURAI_III", 210],
		],
		comboPotency: [
			["NEVER", 360],
			["WAY_OF_THE_SAMURAI_II", 370],
			["WAY_OF_THE_SAMURAI_III", 420],
		],
		location: "rear",
	},
	onConfirm: (state) => {
		if (state.checkCombo("GEKKO_READY")) {
			state.gainKenki(10);
			state.gainSen("GETSU");
		}
		if (state.hasResourceAvailable("MEIKYO_SHISUI")) {
			state.refreshBuff("FUGETSU", 0.76);
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo("GEKKO_READY"),
});

makeGCD_SAM("SHIFU", 18, {
	applicationDelay: 0.8,
	basePotency: [
		["NEVER", 120],
		["WAY_OF_THE_SAMURAI_III", 140],
	],
	combo: {
		potency: [
			["NEVER", 280],
			["WAY_OF_THE_SAMURAI_III", 300],
		],
		resource: "SAM_TWO_READY",
	},
	onConfirm: (state) => {
		if (state.checkCombo("SAM_TWO_READY")) {
			state.gainKenki(5);
			state.refreshBuff("FUKA", 0.8);
			state.tryConsumeMeikyo();
			state.progressActiveCombo(["KASHA_READY"]);
		} else {
			state.tryConsumeMeikyo();
			state.progressActiveCombo([]);
		}
	},
	highlightIf: (state) => state.checkCombo("SAM_TWO_READY"),
});

makeGCD_SAM("KASHA", 40, {
	applicationDelay: 0.62,
	basePotency: [
		["NEVER", 100],
		["WAY_OF_THE_SAMURAI_II", 110],
		["WAY_OF_THE_SAMURAI_III", 160],
	],
	combo: {
		potency: [
			["NEVER", 310],
			["WAY_OF_THE_SAMURAI_II", 320],
			["WAY_OF_THE_SAMURAI_III", 370],
		],
		resource: "KASHA_READY",
	},
	positional: {
		potency: [
			["NEVER", 150],
			["WAY_OF_THE_SAMURAI_II", 160],
			["WAY_OF_THE_SAMURAI_III", 210],
		],
		comboPotency: [
			["NEVER", 360],
			["WAY_OF_THE_SAMURAI_II", 370],
			["WAY_OF_THE_SAMURAI_III", 420],
		],
		location: "flank",
	},
	onConfirm: (state) => {
		if (state.checkCombo("KASHA_READY")) {
			state.gainKenki(10);
			state.gainSen("KA_SEN");
		}
		if (state.hasResourceAvailable("MEIKYO_SHISUI")) {
			state.refreshBuff("FUKA", 0.62);
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo("KASHA_READY"),
});

makeGCD_SAM("FUGA", 26, {
	autoUpgrade: { trait: "FUGA_MASTERY", otherSkill: "FUKO" },
	falloff: 0,
	applicationDelay: 0.76, // TODO
	basePotency: 90,
	onConfirm: (state) => {
		state.gainKenki(5);
		state.progressActiveCombo(["SAM_TWO_AOE_READY"]);
	},
});

makeGCD_SAM("FUKO", 86, {
	autoDowngrade: { trait: "FUGA_MASTERY", otherSkill: "FUGA" },
	falloff: 0,
	applicationDelay: 0.76,
	basePotency: 100,
	onConfirm: (state) => {
		state.gainKenki(10);
		state.progressActiveCombo(["SAM_TWO_AOE_READY"]);
	},
});

makeGCD_SAM("MANGETSU", 35, {
	falloff: 0,
	applicationDelay: 0.62,
	basePotency: 100,
	combo: {
		potency: 120,
		resource: "SAM_TWO_AOE_READY",
	},
	onConfirm: (state) => {
		if (state.checkCombo("SAM_TWO_AOE_READY")) {
			state.gainKenki(10);
			state.refreshBuff("FUGETSU", 0.62);
			state.gainSen("GETSU");
		}
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo("SAM_TWO_AOE_READY"),
});

makeGCD_SAM("OKA", 35, {
	falloff: 0,
	applicationDelay: 0.62,
	basePotency: 100,
	combo: {
		potency: 120,
		resource: "SAM_TWO_AOE_READY",
	},
	onConfirm: (state) => {
		if (state.checkCombo("SAM_TWO_AOE_READY")) {
			state.gainKenki(10);
			state.refreshBuff("FUKA", 0.62);
			state.gainSen("KA_SEN");
		}
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo("SAM_TWO_AOE_READY"),
});

// no skill replacement if there are 0 sen (usage is just invalid)
const banaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "HIGANBANA",
	condition: (state) => state.countSen() === 1,
};

const tenkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "TENKA_GOKEN",
	condition: (state) => !state.hasResourceAvailable("TENDO") && state.countSen() === 2,
};

const tendoGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "TENDO_GOKEN",
	condition: (state) => state.hasResourceAvailable("TENDO") && state.countSen() === 2,
};

const midareCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "MIDARE_SETSUGEKKA",
	condition: (state) => !state.hasResourceAvailable("TENDO") && state.countSen() === 3,
};

const tendoMidareCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "TENDO_SETSUGEKKA",
	condition: (state) => state.hasResourceAvailable("TENDO") && state.countSen() === 3,
};

makeGCD_SAM("IAIJUTSU", 30, {
	replaceIf: [
		banaCondition,
		tenkaCondition,
		tendoGokenCondition,
		midareCondition,
		tendoMidareCondition,
	],
	baseCastTime: 1.3, // if below level 80, set to scale in makeGCD_SAM
	basePotency: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

makeGCD_SAM("HIGANBANA", 30, {
	startOnHotbar: false,
	replaceIf: [tenkaCondition, tendoGokenCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 200,
	applicationDelay: 0.62,
	validateAttempt: banaCondition.condition,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("FUGETSU")) {
			modifiers.push(state.getFugetsuModifier());
		}

		const tickPotency = state.hasTraitUnlocked("WAY_OF_THE_SAMURAI_III") ? 50 : 45;

		state.addDoTPotencies({
			node,
			effectName: "HIGANBANA_DOT",
			skillName: "HIGANBANA",
			tickPotency,
			speedStat: "sks",
			modifiers,
		});
		state.consumeAllSen();
		state.gainMeditation();
		// bana does not reset your tsubame status
	},
	onApplication: (state, node) => state.applyDoT("HIGANBANA_DOT", node),
});

const iaiConfirm = (kaeshiValue: number) => (state: SAMState) => {
	state.consumeAllSen();
	state.resources.get("KAESHI_TRACKER").overrideCurrentValue(kaeshiValue);
	state.enqueueResourceDrop("KAESHI_TRACKER");
	state.gainMeditation();
	state.resources.get("TSUBAME_GAESHI_READY").gain(1);
	state.enqueueResourceDrop("TSUBAME_GAESHI_READY");
	state.tryConsumeResource("TENDO");
};

makeGCD_SAM("TENKA_GOKEN", 30, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tendoGokenCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 300,
	falloff: 0,
	applicationDelay: 0.62,
	validateAttempt: tenkaCondition.condition,
	onConfirm: iaiConfirm(1),
});

makeGCD_SAM("TENDO_GOKEN", 100, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 410,
	falloff: 0,
	applicationDelay: 0.36,
	validateAttempt: tendoGokenCondition.condition,
	onConfirm: iaiConfirm(2),
});

makeGCD_SAM("MIDARE_SETSUGEKKA", 30, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, tendoGokenCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: [
		["NEVER", 620],
		["WAY_OF_THE_SAMURAI_III", 640],
	],
	applicationDelay: 0.62,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: midareCondition.condition,
	onConfirm: iaiConfirm(3),
});

makeGCD_SAM("TENDO_SETSUGEKKA", 100, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, tendoGokenCondition, midareCondition],
	baseCastTime: 1.3,
	basePotency: 1100,
	applicationDelay: 1.03,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: tendoMidareCondition.condition,
	onConfirm: iaiConfirm(4),
});

const kaeshiGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "KAESHI_GOKEN",
	condition: (state) => state.resources.get("KAESHI_TRACKER").availableAmount() === 1,
};

const tendoKaeshiGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "TENDO_KAESHI_GOKEN",
	condition: (state) => state.resources.get("KAESHI_TRACKER").availableAmount() === 2,
};

const kaeshiSetsugekkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "KAESHI_SETSUGEKKA",
	condition: (state) => state.resources.get("KAESHI_TRACKER").availableAmount() === 3,
};

const tendoKaeshiSetsugekkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: "TENDO_KAESHI_SETSUGEKKA",
	condition: (state) => state.resources.get("KAESHI_TRACKER").availableAmount() === 4,
};

makeGCD_SAM("TSUBAME_GAESHI", 74, {
	replaceIf: [
		kaeshiGokenCondition,
		tendoKaeshiGokenCondition,
		kaeshiSetsugekkaCondition,
		tendoKaeshiSetsugekkaCondition,
	],
	basePotency: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

const tsubameConfirm = (state: SAMState) => {
	state.tryConsumeResource("KAESHI_TRACKER", true);
	state.tryConsumeResource("TSUBAME_GAESHI_READY");
	state.tryConsumeResource("KAESHI_OGI_READY");
};

makeGCD_SAM("KAESHI_GOKEN", 74, {
	startOnHotbar: false,
	replaceIf: [
		tendoKaeshiGokenCondition,
		kaeshiSetsugekkaCondition,
		tendoKaeshiSetsugekkaCondition,
	],
	basePotency: 300,
	falloff: 0,
	applicationDelay: 0.62,
	validateAttempt: kaeshiGokenCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: kaeshiGokenCondition.condition,
});

makeGCD_SAM("TENDO_KAESHI_GOKEN", 100, {
	startOnHotbar: false,
	replaceIf: [
		tendoKaeshiGokenCondition,
		kaeshiSetsugekkaCondition,
		tendoKaeshiSetsugekkaCondition,
	],
	basePotency: 410,
	falloff: 0,
	applicationDelay: 0.36,
	validateAttempt: tendoKaeshiGokenCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: tendoKaeshiGokenCondition.condition,
});

makeGCD_SAM("KAESHI_SETSUGEKKA", 74, {
	startOnHotbar: false,
	replaceIf: [kaeshiGokenCondition, tendoKaeshiGokenCondition, tendoKaeshiSetsugekkaCondition],
	basePotency: [
		["NEVER", 620],
		["WAY_OF_THE_SAMURAI_III", 640],
	],
	applicationDelay: 0.62,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: kaeshiSetsugekkaCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: kaeshiSetsugekkaCondition.condition,
});

makeGCD_SAM("TENDO_KAESHI_SETSUGEKKA", 74, {
	startOnHotbar: false,
	replaceIf: [kaeshiGokenCondition, tendoKaeshiGokenCondition, kaeshiSetsugekkaCondition],
	basePotency: 1100,
	applicationDelay: 1.03,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: tendoKaeshiSetsugekkaCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: tendoKaeshiSetsugekkaCondition.condition,
});

makeGCD_SAM("OGI_NAMIKIRI", 90, {
	replaceIf: [
		{
			newSkill: "KAESHI_NAMIKIRI",
			condition: (state) => state.hasResourceAvailable("KAESHI_OGI_READY"),
		},
	],
	falloff: 0.5,
	applicationDelay: 0.49,
	basePotency: [
		["NEVER", 860],
		["WAY_OF_THE_SAMURAI_III", 1000],
	],
	baseCastTime: 1.3,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: (state) => state.hasResourceAvailable("OGI_READY"),
	onConfirm: (state) => {
		state.tryConsumeResource("OGI_READY");
		state.gainMeditation();
		state.resources.get("KAESHI_OGI_READY").gain(1);
		state.enqueueResourceDrop("KAESHI_OGI_READY");
	},
	highlightIf: (state) => state.hasResourceAvailable("OGI_READY"),
});

makeGCD_SAM("KAESHI_NAMIKIRI", 90, {
	startOnHotbar: false,
	falloff: 0.5,
	applicationDelay: 0.49,
	basePotency: [
		["NEVER", 860],
		["WAY_OF_THE_SAMURAI_III", 1000],
	],
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: (state) => state.hasResourceAvailable("KAESHI_OGI_READY"),
	onConfirm: (state) => state.tryConsumeResource("KAESHI_OGI_READY"),
	highlightIf: (state) => state.hasResourceAvailable("KAESHI_OGI_READY"),
});

makeAbility_SAM("MEIKYO_SHISUI", 50, "cd_MEIKYO_SHISUI", {
	cooldown: 55,
	maxCharges: 2,
	onConfirm: (state) => {
		state.resources.get("MEIKYO_SHISUI").gain(3);
		state.enqueueResourceDrop("MEIKYO_SHISUI");

		if (state.hasTraitUnlocked("ENHANCED_MEIKYO_SHISUI_II")) {
			state.resources.get("TENDO").gain(1);
			state.enqueueResourceDrop("TENDO");
		}
	},
});

makeAbility_SAM("IKISHOTEN", 68, "cd_IKISHOTEN", {
	replaceIf: [
		{
			newSkill: "ZANSHIN",
			condition: (state) => state.hasResourceAvailable("ZANSHIN_READY"),
		},
	],
	cooldown: 120,
	requiresCombat: true,
	onConfirm: (state) => {
		state.gainKenki(50);
		if (state.hasTraitUnlocked("ENHANCED_IKISHOTEN")) {
			state.resources.get("OGI_READY").gain(1);
			state.enqueueResourceDrop("OGI_READY");
		}
		if (state.hasTraitUnlocked("ENHANCED_IKISHOTEN_II")) {
			state.resources.get("ZANSHIN_READY").gain(1);
			state.enqueueResourceDrop("ZANSHIN_READY");
		}
	},
});

makeAbility_SAM("HISSATSU_SHINTEN", 52, "cd_SHINTEN", {
	cooldown: 1,
	potency: 250,
	validateAttempt: (state) => state.resources.get("KENKI").available(25),
	onConfirm: (state) => state.resources.get("KENKI").consume(25),
	highlightIf: (state) => state.resources.get("KENKI").available(25),
});

makeAbility_SAM("HISSATSU_KYUTEN", 62, "cd_KYUTEN", {
	cooldown: 1,
	potency: 100,
	falloff: 0,
	validateAttempt: (state) => state.resources.get("KENKI").available(25),
	onConfirm: (state) => state.resources.get("KENKI").consume(25),
	highlightIf: (state) => state.resources.get("KENKI").available(25),
});

makeAbility_SAM("HISSATSU_GYOTEN", 54, "cd_GYOTEN", {
	cooldown: 5,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	potency: 100,
	validateAttempt: (state) => state.resources.get("KENKI").available(10),
	onConfirm: (state) => state.resources.get("KENKI").consume(10),
	highlightIf: (state) => state.resources.get("KENKI").available(10),
});

makeAbility_SAM("HISSATSU_YATEN", 56, "cd_YATEN", {
	cooldown: 10,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	potency: 100,
	validateAttempt: (state) => state.resources.get("KENKI").available(10),
	onConfirm: (state) => {
		state.resources.get("KENKI").consume(10);
		state.resources.get("ENHANCED_ENPI").gain(1);
		state.enqueueResourceDrop("ENHANCED_ENPI");
	},
	highlightIf: (state) => state.resources.get("KENKI").available(10),
});

makeAbility_SAM("HISSATSU_SENEI", 72, "cd_SENEI_GUREN", {
	cooldown: 60,
	potency: 800,
	validateAttempt: (state) => state.resources.get("KENKI").available(25),
	onConfirm: (state) => state.resources.get("KENKI").consume(25),
	highlightIf: (state) => state.resources.get("KENKI").available(25),
});

// cooldown set by trait in constructor
makeAbility_SAM("HISSATSU_GUREN", 70, "cd_SENEI_GUREN", {
	cooldown: 60,
	potency: 400,
	falloff: 0.25,
	validateAttempt: (state) => state.resources.get("KENKI").available(25),
	onConfirm: (state) => state.resources.get("KENKI").consume(25),
	highlightIf: (state) => state.resources.get("KENKI").available(25),
});

makeAbility_SAM("HAGAKURE", 68, "cd_HAGAKURE", {
	cooldown: 5,
	validateAttempt: (state) => state.countSen() > 0,
	onConfirm: (state) => {
		state.gainKenki(state.countSen() * 10);
		state.consumeAllSen();
	},
	highlightIf: (state) => state.countSen() === 3,
});

makeAbility_SAM("SHOHA", 80, "cd_SHOHA", {
	cooldown: 15,
	potency: [
		["NEVER", 560],
		["WAY_OF_THE_SAMURAI_III", 640],
	],
	falloff: 0.5,
	applicationDelay: 0.58,
	validateAttempt: (state) => state.resources.get("MEDITATION").available(3),
	onConfirm: (state) => state.tryConsumeResource("MEDITATION", true),
	highlightIf: (state) => state.resources.get("MEDITATION").available(3),
});

makeResourceAbility("SAM", "THIRD_EYE", 6, "cd_THIRD_EYE", {
	rscType: "THIRD_EYE",
	autoUpgrade: { trait: "THIRD_EYE_MASTERY", otherSkill: "TENGENTSU" },
	replaceIf: [
		{
			newSkill: "THIRD_EYE_POP",
			condition: (state) => state.hasResourceAvailable("THIRD_EYE"),
		},
	],
	cooldown: 15,
	applicationDelay: 0,
});

makeResourceAbility("SAM", "TENGENTSU", 82, "cd_THIRD_EYE", {
	rscType: "TENGENTSU",
	autoDowngrade: { trait: "THIRD_EYE_MASTERY", otherSkill: "THIRD_EYE" },
	replaceIf: [
		{
			newSkill: "TENGENTSU_POP",
			condition: (state) => state.hasResourceAvailable("TENGENTSU"),
		},
	],
	cooldown: 15,
	applicationDelay: 0,
});

// fake skill to represent breaking third eye
makeAbility_SAM("THIRD_EYE_POP", 6, "cd_THIRD_EYE_POP", {
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("THIRD_EYE"),
	onConfirm: (state) => {
		state.tryConsumeResource("THIRD_EYE");
		state.gainKenki(10);
	},
	highlightIf: (state) => state.hasResourceAvailable("THIRD_EYE"),
});

makeAbility_SAM("TENGENTSU_POP", 82, "cd_THIRD_EYE_POP", {
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("TENGENTSU"),
	onConfirm: (state) => {
		state.tryConsumeResource("TENGENTSU");
		state.resources.get("TENGENTSUS_FORESIGHT").gain(1);
		state.enqueueResourceDrop("TENGENTSUS_FORESIGHT");
		state.gainKenki(10);
	},
	highlightIf: (state) => state.hasResourceAvailable("TENGENTSU"),
});

makeAbility_SAM("ZANSHIN", 96, "cd_ZANSHIN", {
	startOnHotbar: false,
	cooldown: 1,
	falloff: 0.5,
	applicationDelay: 1.03,
	potency: 940,
	validateAttempt: (state) =>
		state.hasResourceAvailable("ZANSHIN_READY") && state.resources.get("KENKI").available(50),
	onConfirm: (state) => {
		state.resources.get("KENKI").consume(50);
		state.tryConsumeResource("ZANSHIN_READY");
	},
	highlightIf: (state) => state.hasResourceAvailable("ZANSHIN_READY"),
});

makeResourceAbility("SAM", "MEDITATE", 60, "cd_MEDITATE", {
	rscType: "MEDITATE",
	cooldown: 60,
	applicationDelay: 0.62,
	// Meditate cannot be used during a GCD roll
	validateAttempt: (state) => state.cooldowns.get("cd_GCD").stacksAvailable() > 0,
	// roll the GCD
	onConfirm: (state) => {
		const recastTime = state.config.adjustedSksGCD(2.5, state.getFukaModifier());
		state.cooldowns.get("cd_GCD").useStackWithRecast(state.config.getAfterTaxGCD(recastTime));
	},
	// start the meditate timer
	onApplication: (state: SAMState) => state.startMeditateTimer(),
});
