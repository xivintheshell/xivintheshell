// Skill and state declarations for SAM.

import {controller} from "../../Controller/Controller";
import {ActionNode} from "../../Controller/Record";
import {ShellJob} from "../../Controller/Common";
import {Aspect, BuffType, ResourceType, SkillName, WarningType} from "../Common";
import {makeComboModifier, Modifiers, Potency, PotencyModifier} from "../Potency";
import {
	Ability,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeWeaponskill,
	NO_EFFECT,
	PotencyModifierFn,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import {TraitName, Traits} from "../Traits";
import {GameState} from "../GameState";
import {getResourceInfo, makeResource, CoolDown, DoTBuff, Event, Resource, ResourceInfo} from "../Resources"
import {GameConfig} from "../GameConfig";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makeSAMResource = (rsc: ResourceType, maxValue: number, params?: {timeout: number}) => {
	makeResource(ShellJob.SAM, rsc, maxValue, params ?? {});
};

makeSAMResource(ResourceType.MeikyoShisui, 3, {timeout: 20});
makeSAMResource(ResourceType.Fugetsu, 1, {timeout: 40});
makeSAMResource(ResourceType.Fuka, 1, {timeout: 40});
makeSAMResource(ResourceType.ZanshinReady, 1, {timeout: 30});
makeSAMResource(ResourceType.Tendo, 1, {timeout: 30});
makeSAMResource(ResourceType.OgiReady, 1, {timeout: 30});
makeSAMResource(ResourceType.TsubameGaeshiReady, 1, {timeout: 30});
makeSAMResource(ResourceType.Tengetsu, 1, {timeout: 4});
makeSAMResource(ResourceType.TengetsusForesight, 1, {timeout: 9});
makeSAMResource(ResourceType.EnhancedEnpi, 1, {timeout: 15});

makeSAMResource(ResourceType.Kenki, 100);
makeSAMResource(ResourceType.Setsu, 1);
makeSAMResource(ResourceType.Getsu, 1);
makeSAMResource(ResourceType.KaSen, 1);
makeSAMResource(ResourceType.Meditation, 3);

makeSAMResource(ResourceType.HiganbanaDoT, 1, {timeout: 60});

// samurai combo resources (behind the scenes)
const ALL_SAM_COMBOS = [
	ResourceType.TwoReady,
	ResourceType.TwoAoeReady,
	ResourceType.GekkoReady,
	ResourceType.KashaReady,
	ResourceType.KaeshiOgiReady,
];

ALL_SAM_COMBOS.forEach((combo) => makeSAMResource(combo, 1, {timeout: 30}));

// Track the action for tsubame-gaeshi to perform
// 0 - nothing
// 1 - Tenka Goken
// 2 - Tendo Goken
// 3 - Midare Setsugekka
// 4 - Tendo Setsugekka
makeSAMResource(ResourceType.KaeshiTracker, 4, {timeout: 30});

makeSAMResource(ResourceType.Positional, 1, {timeout: 10}); // TODO ??
makeSAMResource(ResourceType.Feint, 1, {timeout: 15});
makeSAMResource(ResourceType.TrueNorth, 1, {timeout: 10});
makeSAMResource(ResourceType.ArmsLength, 1, {timeout: 6});
makeSAMResource(ResourceType.Bloodbath, 1, {timeout: 20});

// === JOB GAUGE AND STATE ===
export class SAMState extends GameState {
	higanbanaTickOffset: number;

	constructor(config: GameConfig) {
		super(config);

		this.higanbanaTickOffset = this.nonProcRng() * 3.0;

		const polyglotStacks = 
			(Traits.hasUnlocked(TraitName.EnhancedPolyglotII, this.config.level) && 3) ||
			(Traits.hasUnlocked(TraitName.EnhancedPolyglot, this.config.level) && 2) ||
			1;
		this.resources.set(new Resource(ResourceType.Polyglot, polyglotStacks, 0));

		// skill CDs (also a form of resource)
		const manafontCooldown = (Traits.hasUnlocked(TraitName.EnhancedManafont, this.config.level) && 100) || 180;
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_Manafont, manafontCooldown, 1, 1),
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		this.registerRecurringEvents();
	}

	override registerRecurringEvents() {
		super.registerRecurringEvents();
		// higanbana DoT tick
		let recurringHiganbanaTick = () => {
			let higanbana = this.resources.get(ResourceType.HiganbanaDoT) as DoTBuff;
			if (higanbana.available(1)) {// dot buff is effective
				higanbana.tickCount++;
				if (higanbana.node) { // aka this buff is applied by a skill (and not just from an override)
					// access potencies at index [1, 10] (since 0 is initial potency)
					let p = higanbana.node.getPotencies()[higanbana.tickCount];
					controller.resolvePotency(p);
				}
			}
			// increment count
			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time);
			}
			// queue the next tick
			this.addEvent(new Event("higanbana DoT tick", 3, ()=>{
				recurringHiganbanaTick();
			}));
		};
		let timeTillFirstHiganbanaTick = this.config.timeTillFirstManaTick + this.higanbanaTickOffset;
		while (timeTillFirstHiganbanaTick > 3) timeTillFirstHiganbanaTick -= 3;
		this.addEvent(new Event("initial higanbana DoT tick", timeTillFirstHiganbanaTick, recurringHiganbanaTick));
	}

	// Return true if the active combo buff is up, or meikyo is active.
	// Does not advance the combo state.
	checkCombo(requiredCombo: ResourceType): boolean {
		return this.hasResourceAvailable(requiredCombo) || this.hasResourceAvailable(ResourceType.MeikyoShisui);
	}

	refreshBuff(rscType: ResourceType) {
		this.resources.get(rscType).gain(1);
		this.enqueueResourceDrop(rscType);
	}

	// Activate combo timers and deactivate all other combo timers.
	progressActiveCombo(nextCombos: ResourceType[]) {
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
		this.tryConsumeResource(ResourceType.MeikyoShisui);
	}

	gainKenki(kenkiAmount: number) {
		if ((this.resources.get(ResourceType.Kenki).availableAmount() + kenkiAmount) > 100) {
			controller.reportWarning(WarningType.KenkiOvercap);
		}
		this.resources.get(ResourceType.Kenki).gain(kenkiAmount);
	}

	gainMeditation() {
		if (this.resources.get(ResourceType.Meditation).availableAmount() === 3) {
			controller.reportWarning(WarningType.MeditationOvercap);
		}
		this.resources.get(ResourceType.Meditation).gain(1);
	}

	gainSen(sen: ResourceType) {
		const resource = this.resources.get(sen);
		if (resource.available(1)) {
			controller.reportWarning(WarningType.SenOvercap);
		}
		resource.gain(1);
	}

	countSen(): number {
		return [ResourceType.Getsu, ResourceType.Setsu, ResourceType.KaSen].reduce(
			(acc, sen) => this.hasResourceAvailable(sen) ? acc + 1 : acc, 0
		);
	}

	consumeAllSen() {
		if (this.resources.get(ResourceType.Setsu).available(1)) {
			this.resources.get(ResourceType.Setsu).consume(1);
		}
		if (this.resources.get(ResourceType.Getsu).available(1)) {
			this.resources.get(ResourceType.Getsu).consume(1);
		}
		if (this.resources.get(ResourceType.KaSen).available(1)) {
			this.resources.get(ResourceType.KaSen).consume(1);
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

const makeGCD_SAM = (name: SkillName, unlockLevel: number, params: {
	replaceIf?: ConditionalSkillReplace<SAMState>[],
	startOnHotbar?: boolean,
	highlightIf?: StatePredicate<SAMState>,
	autoUpgrade?: SkillAutoReplace,
	autoDowngrade?: SkillAutoReplace,
	baseCastTime?: number,
	baseRecastTime?: number,
	basePotency: number,
	combo?: {
		potency: number,
		resource: ResourceType,
	},
	applicationDelay: number,
	jobPotencyModifiers?: PotencyModifierFn<SAMState>,
	validateAttempt?: StatePredicate<SAMState>,
	onConfirm?: EffectFn<SAMState>,
	onApplication?: EffectFn<SAMState>,
}): Weaponskill<SAMState> => {
	const onConfirm: EffectFn<SAMState> = params.onConfirm ?? NO_EFFECT;
	const onApplication: EffectFn<SAMState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyModifiers = (state: Readonly<SAMState>) => {
		const mods: PotencyModifier[] = state.hasResourceAvailable(ResourceType.Fugetsu) ? [Modifiers.Fugetsu] : [];
		if (params.jobPotencyModifiers) {
			mods.push(...params.jobPotencyModifiers(state));
		}
		if (params.combo && state.hasResourceAvailable(params.combo.resource)) {
			mods.push(makeComboModifier(params.combo.potency - params.basePotency));
		}
		return mods;
	};
	return makeWeaponskill(ShellJob.SAM, name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		highlightIf: params.highlightIf,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		// TODO deal with trait setting cast times to 1.3 vs. calculating fuka
		castTime: (state) => params.baseCastTime || 0,
		recastTime: (state) => state.config.adjustedGCD(
			params.baseRecastTime ?? 2.5,
			state.hasResourceAvailable(ResourceType.Fuka) ? ResourceType.Fuka : undefined,
		),
		potency: params.basePotency,
		validateAttempt: params.validateAttempt,
		jobPotencyModifiers: jobPotencyModifiers,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => !([
			SkillName.OgiNamikiri,
			SkillName.Iaijutsu,
			SkillName.Higanbana,
			SkillName.TenkaGoken,
			SkillName.MidareSetsugekka,
		] as SkillName[]).includes(name),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};


const makeAbility_SAM = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
	replaceIf?: ConditionalSkillReplace<SAMState>[],
	startOnHotbar?: boolean,
	highlightIf?: StatePredicate<SAMState>,
	applicationDelay?: number,
	potency?: number,
	jobPotencyModifiers?: PotencyModifierFn<SAMState>,
	cooldown: number,
	maxCharges?: number,
	validateAttempt?: StatePredicate<SAMState>,
	onConfirm?: EffectFn<SAMState>,
	onApplication?: EffectFn<SAMState>,
}): Ability<SAMState> => {
	if (params.potency && !params.jobPotencyModifiers) {
		params.jobPotencyModifiers = (state) => state.hasResourceAvailable(ResourceType.Fugetsu) ? [Modifiers.Fugetsu] : [];
	}
	return makeAbility(ShellJob.SAM, name, unlockLevel, cdName, params);
};


// https://docs.google.com/spreadsheets/d/1Emevsz5_oJdmkXy23hZQUXimirZQaoo5BejSzL3hZ9I/edit?gid=865790859#gid=865790859

makeGCD_SAM(SkillName.Enpi, 15, {
	applicationDelay: 0.71,
	basePotency: 100,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.EnhancedEnpi)) {
			state.tryConsumeResource(ResourceType.EnhancedEnpi);
		}
		state.gainKenki(10);
	},
	jobPotencyModifiers: (state) => state.hasResourceAvailable(ResourceType.EnhancedEnpi) ? [Modifiers.Yatenpi] : [],
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.EnhancedEnpi),
});

makeGCD_SAM(SkillName.Hakaze, 1, {
	autoUpgrade: { trait: TraitName.HakazeMastery, otherSkill: SkillName.Gyofu },
	applicationDelay: 0, // TODO ???
	basePotency: 200,
	// TODO check if kenki gain is on damage app or cast confirmation
	onConfirm: (state) => {
		state.tryConsumeMeikyo();
		state.progressActiveCombo([ResourceType.TwoReady]);
	},
});

makeGCD_SAM(SkillName.Gyofu, 92, {
	autoDowngrade: { trait: TraitName.HakazeMastery, otherSkill: SkillName.Hakaze },
	applicationDelay: 0.85,
	basePotency: 240,
	onConfirm: (state) => {
		state.tryConsumeMeikyo();
		state.progressActiveCombo([ResourceType.TwoReady]);
	}
});

makeGCD_SAM(SkillName.Yukikaze, 50, {
	applicationDelay: 0.85,
	basePotency: 160,
	combo: {
		potency: 340,
		resource: ResourceType.TwoReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.TwoReady)) {
			state.gainKenki(15);
			state.gainSen(ResourceType.Setsu);
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo(ResourceType.TwoReady),
});

makeGCD_SAM(SkillName.Jinpu, 4, {
	// TODO apply lvl 94 trait potencies
	applicationDelay: 0.62,
	basePotency: 140,
	combo: {
		potency: 300,
		resource: ResourceType.TwoReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.TwoReady)) {
			state.gainKenki(5);
			state.refreshBuff(ResourceType.Fugetsu);
			state.tryConsumeMeikyo();
			state.progressActiveCombo([ResourceType.GekkoReady]);
		} else {
			state.tryConsumeMeikyo();
			state.progressActiveCombo([]);
		}
	},
	highlightIf: (state) => state.checkCombo(ResourceType.TwoReady),
});

makeGCD_SAM(SkillName.Gekko, 30, {
	applicationDelay: 0.76,
	basePotency: 160,
	combo: {
		potency: 370,
		// TODO positional combo modifier
		resource: ResourceType.GekkoReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.GekkoReady)) {
			state.gainKenki(10);
			state.gainSen(ResourceType.Getsu);
		}
		if (state.hasResourceAvailable(ResourceType.MeikyoShisui)) {
			state.refreshBuff(ResourceType.Fugetsu);
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo(ResourceType.GekkoReady),
});

makeGCD_SAM(SkillName.Shifu, 18, {
	applicationDelay: 0.80,
	basePotency: 140,
	combo: {
		potency: 300,
		resource: ResourceType.TwoReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.TwoReady)) {
			state.gainKenki(5);
			state.refreshBuff(ResourceType.Fuka);
			state.tryConsumeMeikyo();
			state.progressActiveCombo([ResourceType.KashaReady]);
		} else {
			state.tryConsumeMeikyo();
			state.progressActiveCombo([]);
		}
	},
	highlightIf: (state) => state.checkCombo(ResourceType.TwoReady),
});

makeGCD_SAM(SkillName.Kasha, 40, {
	applicationDelay: 0.62,
	basePotency: 160,
	combo: {
		potency: 370,
		// TODO positional combo modifier
		resource: ResourceType.KashaReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.KashaReady)) {
			state.gainKenki(10);
			state.gainSen(ResourceType.KaSen);
		}
		if (state.hasResourceAvailable(ResourceType.MeikyoShisui)) {
			state.refreshBuff(ResourceType.Fuka);
		}
		state.tryConsumeMeikyo();
		state.progressActiveCombo([]);
	},
	highlightIf: (state) => state.checkCombo(ResourceType.KashaReady),
});

makeGCD_SAM(SkillName.Fuga, 26, {
	autoUpgrade: { trait: TraitName.HakazeMastery, otherSkill: SkillName.Fuko },
	applicationDelay: 0, // TODO
	basePotency: 90,
	onConfirm: (state) => {
		state.gainKenki(5);
		state.progressActiveCombo([ResourceType.TwoAoeReady]);
	},
});

makeGCD_SAM(SkillName.Fuko, 86, {
	autoDowngrade: { trait: TraitName.HakazeMastery, otherSkill: SkillName.Fuga },
	applicationDelay: 0.76,
	basePotency: 100,
	onConfirm: (state) => {
		state.gainKenki(10);
		state.progressActiveCombo([ResourceType.TwoAoeReady]);
	},
});

makeGCD_SAM(SkillName.Mangetsu, 35, {
	applicationDelay: 0.62,
	basePotency: 100,
	combo: {
		potency: 120,
		resource: ResourceType.TwoAoeReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.TwoAoeReady)) {
			state.gainKenki(10);
			state.refreshBuff(ResourceType.Fugetsu);
			state.gainSen(ResourceType.Getsu);
		}
	},
	highlightIf: (state) => state.checkCombo(ResourceType.TwoAoeReady),
});

makeGCD_SAM(SkillName.Oka, 35, {
	applicationDelay: 0.62,
	basePotency: 100,
	combo: {
		potency: 120,
		resource: ResourceType.TwoAoeReady,
	},
	onConfirm: (state) => {
		if (state.checkCombo(ResourceType.TwoAoeReady)) {
			state.gainKenki(10);
			state.refreshBuff(ResourceType.Fuka);
			state.gainSen(ResourceType.KaSen);
		}
	},
	highlightIf: (state) => state.checkCombo(ResourceType.TwoAoeReady),
});

makeAbility_SAM(SkillName.MeikyoShisui, 50, ResourceType.cd_MeikyoShisui, {
	cooldown: 55,
	maxCharges: 2,
	onConfirm: (state) => {
		state.resources.get(ResourceType.MeikyoShisui).gain(3);
		// TODO check combo behavior when the meikyo stacks drop
		state.enqueueResourceDrop(ResourceType.MeikyoShisui);

		state.resources.get(ResourceType.Tendo).gain(1);
		state.enqueueResourceDrop(ResourceType.Tendo);
	},
});

makeAbility_SAM(SkillName.Ikishoten, 68, ResourceType.cd_Ikishoten, {
	cooldown: 120,
	onConfirm: (state) => {
		state.gainKenki(50);
		state.resources.get(ResourceType.OgiReady).gain(1);
		state.resources.get(ResourceType.ZanshinReady).gain(1);
		state.enqueueResourceDrop(ResourceType.OgiReady);
		state.enqueueResourceDrop(ResourceType.ZanshinReady);
	},
});

makeAbility_SAM(SkillName.Shinten, 52, ResourceType.cd_Shinten, {
	cooldown: 1,
	potency: 250,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(25),
	onConfirm: (state) => state.resources.get(ResourceType.Kenki).consume(25),
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(25),
});

makeAbility_SAM(SkillName.Kyuten, 62, ResourceType.cd_Kyuten, {
	cooldown: 1,
	potency: 120,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(25),
	onConfirm: (state) => state.resources.get(ResourceType.Kenki).consume(25),
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(25),
});

makeAbility_SAM(SkillName.Gyoten, 54, ResourceType.cd_Gyoten, {
	cooldown: 5,
	potency: 100,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(10),
	onConfirm: (state) => state.resources.get(ResourceType.Kenki).consume(10),
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(10),
});

makeAbility_SAM(SkillName.Yaten, 56, ResourceType.cd_Yaten, {
	cooldown: 10,
	potency: 100,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(10),
	onConfirm: (state) => {
		state.resources.get(ResourceType.Kenki).consume(10);
		state.resources.get(ResourceType.EnhancedEnpi).gain(1);
		state.enqueueResourceDrop(ResourceType.EnhancedEnpi);
	},
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(10),
});

makeAbility_SAM(SkillName.Senei, 72, ResourceType.cd_SeneiGuren, {
	cooldown: 60,
	potency: 800,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(25),
	onConfirm: (state) => state.resources.get(ResourceType.Kenki).consume(25),
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(25),
});

makeAbility_SAM(SkillName.Guren, 70, ResourceType.cd_SeneiGuren, {
	cooldown: 60,
	potency: 500,
	validateAttempt: (state) => state.resources.get(ResourceType.Kenki).available(25),
	onConfirm: (state) => state.resources.get(ResourceType.Kenki).consume(25),
	highlightIf: (state) => state.resources.get(ResourceType.Kenki).available(25),
});

makeAbility_SAM(SkillName.Hagakure, 68, ResourceType.cd_Hagakure, {
	cooldown: 5,
	validateAttempt: (state) => state.countSen() === 3,
	onConfirm: (state) => {
		state.gainKenki(state.countSen() * 10);
		state.consumeAllSen();
	},
	highlightIf: (state) => state.countSen() === 3,
});

// no skill replacement if there are 0 sen (usage is just invalid)
const banaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.Higanbana,
	condition: (state) => state.countSen() === 1,
};

const tenkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.TenkaGoken,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Tendo) && state.countSen() === 2,
};

const tendoGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.TendoGoken,
	condition: (state) => state.hasResourceAvailable(ResourceType.Tendo) && state.countSen() === 2.
};

const midareCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.MidareSetsugekka,
	condition: (state) => !state.hasResourceAvailable(ResourceType.Tendo) && state.countSen() === 3,
};

const tendoMidareCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.TendoSetsugekka,
	condition: (state) => state.hasResourceAvailable(ResourceType.Tendo) && state.countSen() === 3,
};

makeGCD_SAM(SkillName.Iaijutsu, 30, {
	replaceIf: [banaCondition, tenkaCondition, tendoGokenCondition, midareCondition, tendoMidareCondition],
	// TODO check cast time traits
	baseCastTime: 1.3,
	basePotency: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

makeGCD_SAM(SkillName.Higanbana, 30, {
	startOnHotbar: false,
	replaceIf: [tenkaCondition, tendoGokenCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 200,
	applicationDelay: 0.62,
	validateAttempt: banaCondition.condition,
	onConfirm: (state, node) => {
		// Copied from BLM addThunder Potencies
		const mods: PotencyModifier[] = [];
		if (state.hasResourceAvailable(ResourceType.Tincture)) {
			mods.push(Modifiers.Tincture);
		}
		if (state.hasResourceAvailable(ResourceType.Fugetsu)) {
			mods.push(Modifiers.Fugetsu);
		}
		const snapshotTime = state.getDisplayTime();
		// initial potency
		let pInitial = new Potency({
			config: controller.record.config ?? controller.gameConfig,
			sourceTime: state.getDisplayTime(),
			sourceSkill: SkillName.Higanbana,
			aspect: Aspect.Other,
			basePotency: 200,
			snapshotTime: snapshotTime,
			description: ""
		});
		pInitial.modifiers = mods;
		node.addPotency(pInitial);
		// tick potencies
		const ticks = 20;
		const tickPotency = 50;
		for (let i = 0; i < ticks; i++) {
			let pDot = new Potency({
				config: controller.record.config ?? controller.gameConfig,
				sourceTime: state.getDisplayTime(),
				sourceSkill: SkillName.Higanbana,
				aspect: Aspect.Other,
				basePotency: state.config.adjustedDoTPotency(tickPotency),
				snapshotTime: snapshotTime,
				description: "DoT " + (i+1) + `/${ticks}`
			});
			pDot.modifiers = mods;
			node.addPotency(pDot);
		}
		// tincture
		if (state.hasResourceAvailable(ResourceType.Tincture)) {
			node.addBuff(BuffType.Tincture);
		}
		state.consumeAllSen();
		state.gainMeditation();
		// bana does not reset your tsubame status
	},
	onApplication: (state, node) => {
		// resolve the on-hit potency element (always the first of the node)
		controller.resolvePotency(node.getPotencies()[0]);
		const bana = state.resources.get(ResourceType.HiganbanaDoT) as DoTBuff;
		const duration = 60;
		if (bana.available(1)) {
			console.assert(bana.node);
			(bana.node as ActionNode).removeUnresolvedPotencies();
			bana.overrideTimer(state, duration);
		} else {
			bana.gain(1);
			controller.reportDotStart(state.getDisplayTime());
			state.resources.addResourceEvent({
				rscType: ResourceType.HiganbanaDoT,
				name: "drop higanbana DoT",
				delay: duration,
				fnOnRsc: rsc=>{
					rsc.consume(1);
					controller.reportDotDrop(state.getDisplayTime());
				}
			});
		}
		bana.node = node;
		bana.tickCount = 0;
	},
});

const iaiConfirm = (kaeshiValue: number) => (
	(state: SAMState) => {
		state.consumeAllSen();
		state.resources.get(ResourceType.KaeshiTracker).overrideCurrentValue(kaeshiValue);
		state.enqueueResourceDrop(ResourceType.KaeshiTracker);
		state.gainMeditation();
		state.resources.get(ResourceType.TsubameGaeshiReady).gain(1);
		state.enqueueResourceDrop(ResourceType.TsubameGaeshiReady);
		state.tryConsumeResource(ResourceType.Tendo);
	}
);

makeGCD_SAM(SkillName.TenkaGoken, 30, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tendoGokenCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 300,
	applicationDelay: 0.62,
	validateAttempt: tenkaCondition.condition,
	onConfirm: iaiConfirm(1),
});

makeGCD_SAM(SkillName.TendoGoken, 100, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, midareCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 410,
	applicationDelay: 0.36,
	validateAttempt: tendoGokenCondition.condition,
	onConfirm: iaiConfirm(2),
});

makeGCD_SAM(SkillName.MidareSetsugekka, 30, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, tendoGokenCondition, tendoMidareCondition],
	baseCastTime: 1.3,
	basePotency: 640,
	applicationDelay: 0.62,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: midareCondition.condition,
	onConfirm: iaiConfirm(3),
});

makeGCD_SAM(SkillName.TendoSetsugekka, 100, {
	startOnHotbar: false,
	replaceIf: [banaCondition, tenkaCondition, tendoGokenCondition, midareCondition],
	baseCastTime: 1.3,
	basePotency: 1020,
	applicationDelay: 1.03,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: tendoMidareCondition.condition,
	onConfirm: iaiConfirm(4),
});

const kaeshiGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.KaeshiGoken,
	condition: (state) => state.resources.get(ResourceType.KaeshiTracker).availableAmount() === 1,
};

const tendoKaeshiGokenCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.TendoKaeshiGoken,
	condition: (state) => state.resources.get(ResourceType.KaeshiTracker).availableAmount() === 2,
};

const kaeshiSetsugekkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.KaeshiSetsugekka,
	condition: (state) => state.resources.get(ResourceType.KaeshiTracker).availableAmount() === 3,
};

const tendoKaeshiSetsugekkaCondition: ConditionalSkillReplace<SAMState> = {
	newSkill: SkillName.TendoKaeshiSetsugekka,
	condition: (state) => state.resources.get(ResourceType.KaeshiTracker).availableAmount() === 4,
};

makeGCD_SAM(SkillName.TsubameGaeshi, 74, {
	replaceIf: [kaeshiGokenCondition, tendoKaeshiGokenCondition, kaeshiSetsugekkaCondition, tendoKaeshiSetsugekkaCondition],
	basePotency: 0,
	applicationDelay: 0,
	validateAttempt: (state) => false,
});

const tsubameConfirm = (state: SAMState) => {
	state.tryConsumeResource(ResourceType.KaeshiTracker, true);
	state.tryConsumeResource(ResourceType.TsubameGaeshiReady);
	state.tryConsumeResource(ResourceType.KaeshiOgiReady);
};

makeGCD_SAM(SkillName.KaeshiGoken, 74, {
	startOnHotbar: false,
	replaceIf: [tendoKaeshiGokenCondition, kaeshiSetsugekkaCondition, tendoKaeshiSetsugekkaCondition],
	basePotency: 300,
	applicationDelay: 0.62,
	validateAttempt: kaeshiGokenCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: kaeshiGokenCondition.condition,
});

makeGCD_SAM(SkillName.TendoKaeshiGoken, 100, {
	startOnHotbar: false,
	replaceIf: [tendoKaeshiGokenCondition, kaeshiSetsugekkaCondition, tendoKaeshiSetsugekkaCondition],
	basePotency: 410,
	applicationDelay: 0.36,
	validateAttempt: tendoKaeshiGokenCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: tendoKaeshiGokenCondition.condition,
});

makeGCD_SAM(SkillName.KaeshiSetsugekka, 74, {
	startOnHotbar: false,
	replaceIf: [kaeshiGokenCondition, tendoKaeshiGokenCondition, tendoKaeshiSetsugekkaCondition],
	basePotency: 640,
	applicationDelay: 0.62,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: kaeshiSetsugekkaCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: kaeshiSetsugekkaCondition.condition,
});

makeGCD_SAM(SkillName.TendoKaeshiSetsugekka, 74, {
	startOnHotbar: false,
	replaceIf: [kaeshiGokenCondition, tendoKaeshiGokenCondition, kaeshiSetsugekkaCondition],
	basePotency: 1020,
	applicationDelay: 1.03,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: tendoKaeshiSetsugekkaCondition.condition,
	onConfirm: tsubameConfirm,
	highlightIf: tendoKaeshiSetsugekkaCondition.condition,
});

makeAbility_SAM(SkillName.Shoha, 80, ResourceType.cd_Shoha, {
	cooldown: 15,
	potency: 640,
	applicationDelay: 0.58,
	validateAttempt: (state) => state.resources.get(ResourceType.Meditation).available(3),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Meditation, true),
	highlightIf: (state) => state.resources.get(ResourceType.Meditation).available(3),
});

// TODO tengetsu's foresight + pop

makeGCD_SAM(SkillName.OgiNamikiri, 90, {
	replaceIf: [{
		newSkill: SkillName.KaeshiNamikiri,
		condition: (state) => state.hasResourceAvailable(ResourceType.KaeshiOgiReady),
	}],
	applicationDelay: 0.49,
	basePotency: 900,
	baseCastTime: 1.3,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.OgiReady),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.OgiReady);
		state.gainMeditation();
		state.resources.get(ResourceType.KaeshiOgiReady).gain(1);
		state.enqueueResourceDrop(ResourceType.KaeshiOgiReady);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.OgiReady),
});

makeGCD_SAM(SkillName.KaeshiNamikiri, 90, {
	startOnHotbar: false,
	applicationDelay: 0.49,
	basePotency: 900,
	jobPotencyModifiers: (state) => [Modifiers.AutoCrit],
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.KaeshiOgiReady),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.KaeshiOgiReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.KaeshiOgiReady),
});

makeAbility_SAM(SkillName.Zanshin, 96, ResourceType.cd_Zanshin, {
	cooldown: 1,
	applicationDelay: 1.03,
	potency: 900,
	validateAttempt: (state) => (
		state.hasResourceAvailable(ResourceType.ZanshinReady) &&
		state.resources.get(ResourceType.Kenki).available(50)
	),
	onConfirm: (state) => {
		state.resources.get(ResourceType.Kenki).consume(50);
		state.tryConsumeResource(ResourceType.ZanshinReady);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ZanshinReady),
});

// TODO meditate
