// Skill and state declarations for RDM.

import {controller} from "../../Controller/Controller";
import {ShellJob} from "../../Controller/Common";
import {Aspect, ProcMode, ResourceType, SkillName, WarningType} from "../Common";
import {Modifiers, PotencyModifier, PotencyModifierType} from "../Potency";
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
import {getResourceInfo, makeResource, CoolDown, Resource, ResourceInfo} from "../Resources"
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
		const swiftcastCooldown = Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) ? 40 : 60;
		const c6Cooldown = Traits.hasUnlocked(TraitName.RedMagicMastery, this.config.level) ? 45 : 35;
		const mfCooldown = Traits.hasUnlocked(TraitName.EnhancedManafication, this.config.level) ? 120 : 110;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
			new CoolDown(ResourceType.cd_ContreSixte, c6Cooldown, 1, 1),
			new CoolDown(ResourceType.cd_Manafication, mfCooldown, 1, 1)
		].forEach((cd) => this.cooldowns.set(cd));
		
		const accelStacks = Traits.hasUnlocked(TraitName.EnhancedAcceleration, config.level) ? 2 : 1;
		this.cooldowns.set(new CoolDown(ResourceType.cd_Acceleration, 55, accelStacks, accelStacks));

		const mfStacks = Traits.hasUnlocked(TraitName.EnhancedManaficationII, config.level)
			? 6
			: (Traits.hasUnlocked(TraitName.EnhancedManafication, config.level) ? 5 : 4);
		this.resources.set(new Resource(ResourceType.Manafication, mfStacks, 0));

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
			manaStacks.consume(manaStacks.availableAmount());
		}
		this.setComboState(ResourceType.RDMMeleeCounter, counters[0]);
		this.setComboState(ResourceType.RDMFinisherCounter, counters[1]);
		this.setComboState(ResourceType.RDMAoECounter, counters[2]);
	}

	processManafic() {
		// all GCDs (even vercure/raise) consume manafic stacks
		// if we successfully consuemd all stacks, then become prefulgence ready
		if (this.tryConsumeResource(ResourceType.Manafication)
			&& !this.hasResourceAvailable(ResourceType.Manafication)
			&& Traits.hasUnlocked(TraitName.EnhancedManaficationIII, this.config.level)
		) {
			this.resources.get(ResourceType.PrefulgenceReady).gain(1);
			this.enqueueResourceDrop(ResourceType.PrefulgenceReady);
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
	jobPotencyModifiers?: PotencyModifierFn<RDMState>,
	applicationDelay: number,
	validateAttempt?: StatePredicate<RDMState>,
	onConfirm?: EffectFn<RDMState>,
}): Spell<RDMState> => {
	const onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processManafic(),
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
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable(ResourceType.Embolden)) {
				mods.push(Modifiers.EmboldenMagic);
			}
			if (state.hasResourceAvailable(ResourceType.Manafication)) {
				mods.push(Modifiers.Manafication);
			}
			if (params.jobPotencyModifiers) {
				mods.push(...params.jobPotencyModifiers(state));
			}
			return mods;
		},
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
}): Ability<RDMState> => makeAbility(ShellJob.RDM, name, unlockLevel, cdName, {
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

const giCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: SkillName.GrandImpact,
	condition: (state) => state.getFinisherCounter() < 1 && state.hasResourceAvailable(ResourceType.GrandImpactReady),
};

makeSpell_RDM(SkillName.Jolt2, 62, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoUpgrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt3 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80, // TODO
	basePotency: 280,
	validateAttempt: (state) => state.getFinisherCounter() < 1 && !state.hasResourceAvailable(ResourceType.GrandImpactReady),
	onConfirm: (state) => state.gainColorMana({w: 2, b: 2}),
});

makeSpell_RDM(SkillName.Jolt3, 84, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoDowngrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt2 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.80,
	basePotency: 360,
	validateAttempt: (state) => state.getFinisherCounter() < 1 && !state.hasResourceAvailable(ResourceType.GrandImpactReady),
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

makeSpell_RDM(SkillName.Impact, 66, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: [
		[TraitName.Never, 200],
		[TraitName.RedMagicMasteryIII, 210],
	],
	jobPotencyModifiers: (state) => state.hasResourceAvailable(ResourceType.Acceleration)
		? [Modifiers.AccelerationImpact] : [],
	validateAttempt: (state) => state.getFinisherCounter() < 1 && !state.hasResourceAvailable(ResourceType.GrandImpactReady),
	onConfirm: (state) => state.gainColorMana({w: 3, b: 3}),
});


makeSpell_RDM(SkillName.GrandImpact, 96, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 600,
	applicationDelay: 1.55,
	validateAttempt: giCondition.condition,
	highlightIf: giCondition.condition,
});

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
	applicationDelay: 1.56,
	basePotency: [
		[TraitName.Never, 750],
		[TraitName.EnchantedBladeMastery, 800],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 2,
	onConfirm: (state) => state.gainColorMana({w: 4, b: 4}),
	highlightIf: (state) => state.getFinisherCounter() === 2,
});

makeSpell_RDM(SkillName.Vercure, 54, {
	baseCastTime: 2.0,
	baseManaCost: 500,
	applicationDelay: 0.80,
	basePotency: 0,
});

makeSpell_RDM(SkillName.Verraise, 64, {
	baseCastTime: 10,
	baseManaCost: 2400,
	applicationDelay: 0.81,
	basePotency: 0,
});

makeResourceAbility(ShellJob.RDM, SkillName.Embolden, 58, ResourceType.cd_Embolden, {
	rscType: ResourceType.Embolden,
	applicationDelay: 0.62,
	cooldown: 120,
	onApplication: (state) => {
		if (Traits.hasUnlocked(TraitName.EnhancedEmbolden, state.config.level)) {
			state.resources.get(ResourceType.ThornedFlourish).gain(1);
			state.enqueueResourceDrop(ResourceType.ThornedFlourish);
		}
	}
});

makeResourceAbility(ShellJob.RDM, SkillName.Manafication, 60, ResourceType.cd_Manafication, {
	rscType: ResourceType.Manafication,
	applicationDelay: 0,
	cooldown: 110,
});

makeAbility_RDM(SkillName.CorpsACorps, 6, ResourceType.cd_CorpsACorps, {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: 130,
	cooldown: 35,
	maxCharges: 2,
});

const flipPotency: Array<[TraitName, number]> = [
	[TraitName.Never, 130],
	[TraitName.EnhancedDisplacement, 180],
];

makeAbility_RDM(SkillName.Engagement, 40, ResourceType.cd_Displacement, {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: flipPotency,
	cooldown: 35,
	maxCharges: 2,
});

makeAbility_RDM(SkillName.Displacement, 40, ResourceType.cd_Displacement, {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: flipPotency,
	cooldown: 35,
	maxCharges: 2,
});

makeAbility_RDM(SkillName.Fleche, 45, ResourceType.cd_Fleche, {
	isPhysical: true,
	applicationDelay: 1.16,
	potency: [
		[TraitName.Never, 460],
		[TraitName.EnchantedBladeMastery, 480],
	],
	cooldown: 25,
});

makeAbility_RDM(SkillName.ContreSixte, 56, ResourceType.cd_ContreSixte, {
	isPhysical: true,
	applicationDelay: 1.16,
	potency: [
		[TraitName.Never, 380],
		[TraitName.EnchantedBladeMastery, 420],
	],
	cooldown: 35, // manually adjusted for traits in constructor
});

makeResourceAbility(ShellJob.RDM, SkillName.Acceleration, 50, ResourceType.cd_Acceleration, {
	rscType: ResourceType.Acceleration,
	applicationDelay: 0,
	cooldown: 55,
	maxCharges: 2,
	// acceleration buff grant is automatic from this declaration already
	onApplication: (state) => {
		state.resources.get(ResourceType.GrandImpactReady).gain(1)
		state.enqueueResourceDrop(ResourceType.GrandImpactReady);
	},
});

makeResourceAbility(ShellJob.RDM, SkillName.MagickBarrier, 86, ResourceType.cd_MagickBarrier, {
	rscType: ResourceType.MagickBarrier,
	applicationDelay: 0,
	cooldown: 120,
});

makeAbility_RDM(SkillName.ViceOfThorns, 92, ResourceType.cd_ViceOfThorns, {
	applicationDelay: 0.80,
	potency: 700,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ThornedFlourish),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.ThornedFlourish),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ThornedFlourish),
});

makeAbility_RDM(SkillName.Prefulgence, 100, ResourceType.cd_Prefulgence, {
	applicationDelay: 1.42,
	potency: 900,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PrefulgenceReady),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.PrefulgenceReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.PrefulgenceReady),
});
