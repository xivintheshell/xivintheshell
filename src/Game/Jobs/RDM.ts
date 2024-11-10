// Skill and state declarations for RDM.

import {controller} from "../../Controller/Controller";
import {ShellJob} from "../../Controller/Common";
import {Aspect, ProcMode, ResourceType, SkillName, WarningType} from "../Common";
import {Modifiers, PotencyModifierType} from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	makeWeaponskill,
	NO_EFFECT,
	PotencyModifierFn,
	SkillAutoReplace,
	Spell,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import {TraitName, Traits} from "../Traits";
import {GameState} from "../GameState";
import {getResourceInfo, makeResource, CoolDown, ResourceInfo} from "../Resources"
import {GameConfig} from "../GameConfig";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeRDMResource = (rsc: ResourceType, maxValue: number, params?: {timeout?: number, default?: number}) => {
	makeResource(ShellJob.RDM, rsc, maxValue, params ?? {});
};

makeRDMResource(ResourceType.WhiteMana, 100);
makeRDMResource(ResourceType.BlackMana, 100);
makeRDMResource(ResourceType.ManaStacks, 3);

// TODO: get precise durations
makeRDMResource(ResourceType.Acceleration, 1, {timeout: 30});
makeRDMResource(ResourceType.Dualcast, 1, {timeout: 15});
makeRDMResource(ResourceType.Embolden, 1, {timeout: 20});
makeRDMResource(ResourceType.GrandImpactReady, 1, {timeout: 30});
makeRDMResource(ResourceType.MagickBarrier, 1, {timeout: 10});
makeRDMResource(ResourceType.MagickedSwordplay, 3, {timeout: 30});
makeRDMResource(ResourceType.Manafication, 6, {timeout: 30});
makeRDMResource(ResourceType.PrefulgenceReady, 1, {timeout: 30});
makeRDMResource(ResourceType.ThornedFlourish, 1, {timeout: 30});
makeRDMResource(ResourceType.VerfireReady, 1, {timeout: 30});
makeRDMResource(ResourceType.VerstoneReady, 1, {timeout: 30});

makeRDMResource(ResourceType.RDMMeleeCounter, 2, {timeout: 30});
makeRDMResource(ResourceType.RDMFinisherCounter, 2, {timeout: 30});
makeRDMResource(ResourceType.RDMAoECounter, 2, {timeout: 30});

makeRDMResource(ResourceType.Addle, 1, {timeout: 15});
makeRDMResource(ResourceType.Swiftcast, 1, {timeout: 10});
makeRDMResource(ResourceType.LucidDreaming, 1, {timeout: 21});
makeRDMResource(ResourceType.Surecast, 1, {timeout: 10});

// === JOB GAUGE AND STATE ===
const ACCELERATION_SKILLS: SkillName[] = [
	SkillName.Impact,
	SkillName.Veraero,
	SkillName.Verthunder,
	SkillName.Veraero3,
	SkillName.Verthunder3,
];

const FINISHERS: SkillName[] = [
	SkillName.Verholy,
	SkillName.Verflare,
	SkillName.Scorch,
	SkillName.Resolution,
];

export class RDMState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		const c6Cooldown = (Traits.hasUnlocked(TraitName.RedMagicMastery, this.config.level) && 45) || 35;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
			new CoolDown(ResourceType.cd_ContreSixte, c6Cooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));
		
		this.registerRecurringEvents();
	}

	hasThreeManaStacks(): boolean {
		return this.hasResourceAvailable(ResourceType.ManaStacks, 3);
	}

	getFinisherCounter(): number {
		return this.resources.get(ResourceType.RDMFinisherCounter).availableAmount();
	}

	processDualcastAndInstants(name: SkillName) {
		// This function should only be called for spells; weaponskills (melee hits) are handled separately.
		// Instant consumption order:
		// Acceleration (if possible) -> Swift -> Dualcast
		// This depends on boolean short-circuiting logic
		const isInstant = FINISHERS.includes(name)
			|| (name === SkillName.GrandImpact && this.tryConsumeResource(ResourceType.GrandImpactReady))
			|| (ACCELERATION_SKILLS.includes(name) && this.tryConsumeResource(ResourceType.Acceleration))
			|| this.tryConsumeResource(ResourceType.Swiftcast)
			|| this.tryConsumeResource(ResourceType.Dualcast);
		// After any hardcast skill, gain dualcast
		if (!isInstant) {
			this.resources.get(ResourceType.Dualcast).gain(1);
			this.enqueueResourceDrop(ResourceType.Dualcast);
		}
	}

	gainColorMana(params: {w?: number, b?: number}) {
		// mana gain happens on cast confirm
		if (params.w) {
			this.resources.get(ResourceType.WhiteMana).gain(params.w);
		}
		if (params.b) {
			this.resources.get(ResourceType.BlackMana).gain(params.b);
		}
	}

	gainVerproc(proc: typeof ResourceType.VerfireReady | typeof ResourceType.VerstoneReady) {
		let duration = (getResourceInfo(ShellJob.RDM, proc) as ResourceInfo).maxTimeout;
		if (this.resources.get(proc).available(1)) {
			this.resources.get(proc).overrideTimer(this, duration);
		} else {
			this.resources.get(proc).gain(1);
			this.enqueueResourceDrop(proc, duration);
		}
	}

	maybeGainVerproc(proc: typeof ResourceType.VerfireReady | typeof ResourceType.VerstoneReady) {
		let rand = this.rng();
		if (this.config.procMode === ProcMode.Always || (this.config.procMode === ProcMode.RNG && rand < 0.5)) {
			this.gainVerproc(proc);
		}
	}

	// Advance the appropriate combo resources (RDMMeleeCounter, RDMFinisherCounter, RDMAoECounter)
	// on skill confirmation. Also increment/consume mana stacks.
	processComboStatus(skill: SkillName) {
		const manaStacks = this.resources.get(ResourceType.ManaStacks);
		const hasScorch = this.config.level >= 80;
		const hasReso = this.config.level >= 90;
		// 3-element array of melee, finisher, aoe
		let counters: number[];
		if (skill === SkillName.EnchantedReprise) {
			// TODO check if aoe combo does get reset
			counters = [1, 0, 0];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedZwerchhau) {
			counters = [this.hasResourceAvailable(ResourceType.RDMMeleeCounter, 1) ? 2: 0, 0, 0];
			manaStacks.gain(1); // even if un-combo'd
		} else if (skill === SkillName.EnchantedRedoublement) {
			counters = [0, 0, 0];
			manaStacks.gain(1); // even if un-combo'd
		} else if (skill === SkillName.Verholy || skill === SkillName.Verflare) {
			counters = [0, hasScorch ? 1 : 0, 0];
			manaStacks.consume(3);
		} else if (skill === SkillName.Scorch) {
			counters = [0, hasReso ? 2 : 0, 0];
		} else if (skill === SkillName.Resolution) {
			counters = [0, 0, 0];
		} else if (skill === SkillName.EnchantedMoulinet) {
			counters = [0, 0, 1];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedMoulinet2) {
			counters = [0, 0, 2];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedMoulinet3) {
			counters = [0, 0, 0];
			manaStacks.gain(1);
		} else {
			counters = [0, 0, 0]
			manaStacks.consume(3);
		}
		this.setComboState(ResourceType.RDMMeleeCounter, counters[0]);
		this.setComboState(ResourceType.RDMFinisherCounter, counters[1]);
		this.setComboState(ResourceType.RDMAoECounter, counters[2]);
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeSpell_RDM = (name: SkillName, unlockLevel: number, params: {
	autoUpgrade?: SkillAutoReplace,
	autoDowngrade?: SkillAutoReplace,
	isPhysical?: boolean,
	replaceIf?: ConditionalSkillReplace<RDMState>[],
	startOnHotbar?: boolean,
	highlightIf?: StatePredicate<RDMState>,
	baseCastTime: number,
	baseManaCost: number,
	basePotency?: number | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt?: StatePredicate<RDMState>,
	onConfirm?: EffectFn<RDMState>,
}): Spell<RDMState> => {
	const onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processDualcastAndInstants(name),
		(state) => state.processComboStatus(name),
		params.onConfirm ?? NO_EFFECT,
	);
	return makeSpell(ShellJob.RDM, name, unlockLevel, {
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		highlightIf: params.highlightIf,
		aspect: params.isPhysical ? Aspect.Physical : undefined,
		castTime: (state) => state.config.adjustedCastTime(params.baseCastTime),
		recastTime: (state) => state.config.adjustedGCD(),
		manaCost: params.baseManaCost ?? 0,
		potency: params.basePotency,
		jobPotencyModifiers: (state) => state.hasResourceAvailable(ResourceType.Embolden) ? [Modifiers.EmboldenMagic] : [],
		validateAttempt: params.validateAttempt,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => (
			FINISHERS.includes(name)
			|| name === SkillName.GrandImpact
			|| (ACCELERATION_SKILLS.includes(name) && state.hasResourceAvailable(ResourceType.Acceleration))
			|| state.hasResourceAvailable(ResourceType.Swiftcast)
			|| state.hasResourceAvailable(ResourceType.Dualcast)
		),
		onConfirm: onConfirm,
	});
};

const makeMeleeComboHit = (name: SkillName, unlockLevel: number, params: {
	replaceIf: ConditionalSkillReplace<RDMState>[],
	startOnHotbar: boolean,
	basePotency: number | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt?: StatePredicate<RDMState>,
	onConfirm?: EffectFn<RDMState>,
}): Weaponskill<RDMState> => {
	// Un-enchanted melee hits are not magic damage
	const isPhysical = !name.toString().startsWith("Enchanted");
	const onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processComboStatus(name),
		params.onConfirm ?? NO_EFFECT,
	);
	return makeWeaponskill(ShellJob.RDM, name, unlockLevel, {
		...params,
		aspect: isPhysical ? Aspect.Physical : undefined,
		onConfirm: onConfirm,
		jobPotencyModifiers: (state) => (
			isPhysical && state.hasResourceAvailable(ResourceType.Embolden)
		) ? [Modifiers.EmboldenMagic] : [],
	});
}

const makeAbility_RDM = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
	isPhysical?: boolean,
	potency?: number | Array<[TraitName, number]>,
	replaceIf?: ConditionalSkillReplace<RDMState>[],
	highlightIf?: StatePredicate<RDMState>,
	startOnHotbar?: boolean,
	applicationDelay?: number,
	cooldown: number,
	maxCharges?: number,
	validateAttempt?: StatePredicate<RDMState>,
	onConfirm?: EffectFn<RDMState>,
	onApplication?: EffectFn<RDMState>,
}): Ability<RDMState> => makeAbility(ShellJob.PCT, name, unlockLevel, cdName, {
	jobPotencyModifiers: (state) => (
		(!params.isPhysical && state.hasResourceAvailable(ResourceType.Embolden)) ? [Modifiers.EmboldenMagic] : []
	),
	...params,
});

const scorchCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: SkillName.Scorch,
	condition: (state) => state.getFinisherCounter() === 1,
};

const resoCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: SkillName.Resolution,
	condition: (state) => state.getFinisherCounter() === 2,
};

makeSpell_RDM(SkillName.Jolt2, 62, {
	replaceIf: [scorchCondition, resoCondition],
	autoUpgrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt3 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80, // TODO
	basePotency: 280,
	onConfirm: (state) => state.gainColorMana({w: 2, b: 2}),
});

makeSpell_RDM(SkillName.Jolt3, 84, {
	replaceIf: [scorchCondition, resoCondition],
	autoDowngrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt2 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: 360,
	onConfirm: (state) => state.gainColorMana({w: 2, b: 2}),
});

const procPotencies = [
	[TraitName.Never, 300],
	[TraitName.RedMagicMasteryII, 340],
	[TraitName.RedMagicMasteryIII, 380],
] as Array<[TraitName, number]>;

makeSpell_RDM(SkillName.Verstone, 30, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VerstoneReady),
	onConfirm: (state) => {
		state.gainColorMana({w: 5});
		state.tryConsumeResource(ResourceType.VerstoneReady);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.VerstoneReady),
});

makeSpell_RDM(SkillName.Verfire, 26, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VerfireReady),
	onConfirm: (state) => {
		state.gainColorMana({w: 5});
		state.tryConsumeResource(ResourceType.VerfireReady);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.VerfireReady),
});

const verholyConditon: ConditionalSkillReplace<RDMState> = {
	newSkill: SkillName.Verholy,
	condition: (state) => state.hasThreeManaStacks(),
};

const verflareConditon: ConditionalSkillReplace<RDMState> = {
	newSkill: SkillName.Verflare,
	condition: (state) => state.hasThreeManaStacks(),
};

makeSpell_RDM(SkillName.Veraero, 10, {
	replaceIf: [verholyConditon],
	autoUpgrade: { trait: TraitName.RedMagicMasteryII, otherSkill: SkillName.Veraero3 },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: 360,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({w: 6});
		state.maybeGainVerproc(ResourceType.VerstoneReady);
	},
});

makeSpell_RDM(SkillName.Verthunder, 4, {
	replaceIf: [verflareConditon],
	autoUpgrade: { trait: TraitName.RedMagicMasteryII, otherSkill: SkillName.Verthunder3 },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: 360,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({b: 6});
		state.maybeGainVerproc(ResourceType.VerfireReady);
	},
});

const ver3Potency: Array<[TraitName, number]> = [
	[TraitName.Never, 380],
	[TraitName.EnchantedBladeMastery, 440]
];

makeSpell_RDM(SkillName.Veraero3, 82, {
	replaceIf: [verholyConditon],
	autoDowngrade: { trait: TraitName.RedMagicMasteryII, otherSkill: SkillName.Veraero },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: ver3Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({w: 6});
		state.maybeGainVerproc(ResourceType.VerstoneReady);
	},
});

makeSpell_RDM(SkillName.Verthunder3, 82, {
	replaceIf: [verflareConditon],
	autoDowngrade: { trait: TraitName.RedMagicMasteryII, otherSkill: SkillName.Verthunder },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: ver3Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({b: 6});
		state.maybeGainVerproc(ResourceType.VerfireReady);
	},
});

const ver2Potency: Array<[TraitName, number]> = [
	[TraitName.Never, 100],
	[TraitName.RedMagicMastery, 120],
	[TraitName.RedMagicMasteryIII, 140],
];

makeSpell_RDM(SkillName.Veraero2, 22, {
	replaceIf: [verholyConditon],
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: ver2Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({w: 7}),
});

makeSpell_RDM(SkillName.Verthunder2, 18, {
	replaceIf: [verflareConditon],
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: ver2Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({w: 7}),
});

// makeSpell_RDM(SkillName.Impact, 66, {});
// makeSpell_RDM(SkillName.GrandImpact, 96, {});
// makeMeleeComboHit(SkillName.Riposte, 1, {});
// makeMeleeComboHit(SkillName.Zwerchhau, 35, {});
// makeMeleeComboHit(SkillName.Redoublement, 50, {});
// makeMeleeComboHit(SkillName.EnchantedRiposte, 50, {});
// makeMeleeComboHit(SkillName.EnchantedZwerchhau, 50, {});
// makeMeleeComboHit(SkillName.EnchantedRedoublement, 50, {});
// makeMeleeComboHit(SkillName.Reprise, 76, {});
// makeMeleeComboHit(SkillName.EnchantedReprise, 76, {});
// makeMeleeComboHit(SkillName.Moulinet, 52, {});
// makeMeleeComboHit(SkillName.EnchantedMoulinet, 52, {});
// makeMeleeComboHit(SkillName.EnchantedMoulinet2, 52, {});
// makeMeleeComboHit(SkillName.EnchantedMoulinet3, 52, {});

const verfinishPotency: Array<[TraitName, number]> = [
	[TraitName.Never, 600],
	[TraitName.EnchantedBladeMastery, 620],
];

// Combo status and mana stack consumption for finisherse are handled in makeSpell_RDM
makeSpell_RDM(SkillName.Verholy, 70, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	applicationDelay: 1.43,
	basePotency: verfinishPotency,
	validateAttempt: (state) => state.hasThreeManaStacks(),
	highlightIf: (state) => state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({w: 11}),
});

makeSpell_RDM(SkillName.Verflare, 68, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	applicationDelay: 1.43,
	basePotency: verfinishPotency,
	validateAttempt: (state) => state.hasThreeManaStacks(),
	highlightIf: (state) => state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({b: 11}),
});

makeSpell_RDM(SkillName.Scorch, 80, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	applicationDelay: 1.83,
	basePotency: [
		[TraitName.Never, 680],
		[TraitName.EnchantedBladeMastery, 700],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 1,
	onConfirm: (state) => state.gainColorMana({w: 4, b: 4}),
	highlightIf: (state) => state.getFinisherCounter() === 1,
});

makeSpell_RDM(SkillName.Resolution, 90, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	applicationDelay: 1.83,
	basePotency: [
		[TraitName.Never, 750],
		[TraitName.EnchantedBladeMastery, 800],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 2,
	onConfirm: (state) => state.gainColorMana({w: 4, b: 4}),
	highlightIf: (state) => state.getFinisherCounter() === 2,
});

// makeSpell_RDM(SkillName.Vercure, 54, {});
// makeSpell_RDM(SkillName.Verraise, 64, {});
// makeAbility_RDM(SkillName.Embolden, 58, {});
// makeAbility_RDM(SkillName.Manafication, 60, {});
// makeAbility_RDM(SkillName.CorpsACorps, 6, {});
// makeAbility_RDM(SkillName.Engagement, 40, {});
// makeAbility_RDM(SkillName.Displacement, 40, {});
// makeAbility_RDM(SkillName.Fleche, 45, {});
// makeAbility_RDM(SkillName.ContreSixte, 56, {});
// makeAbility_RDM(SkillName.Acceleration, 50, {});
// makeAbility_RDM(SkillName.MagickBarrier, 86, {});
// makeAbility_RDM(SkillName.ViceOfThorns, 92, {});
// makeAbility_RDM(SkillName.Prefulgence, 100, {});
