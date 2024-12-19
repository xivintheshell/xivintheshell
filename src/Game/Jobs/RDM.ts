// Skill and state declarations for RDM.

import { controller } from "../../Controller/Controller";
import {
	Aspect,
	BuffType,
	ProcMode,
	ResourceType,
	SkillName,
	TraitName,
	WarningType,
} from "../Common";
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

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeRDMResource = (
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("RDM", rsc, maxValue, params ?? {});
};

makeRDMResource(ResourceType.WhiteMana, 100);
makeRDMResource(ResourceType.BlackMana, 100);
makeRDMResource(ResourceType.ManaStacks, 3);

// TODO: get precise durations
makeRDMResource(ResourceType.Acceleration, 1, { timeout: 20 });
makeRDMResource(ResourceType.Dualcast, 1, { timeout: 15 });
makeRDMResource(ResourceType.Embolden, 1, { timeout: 20 });
makeRDMResource(ResourceType.GrandImpactReady, 1, {
	timeout: 30,
	warningOnTimeout: WarningType.GIDrop,
});
makeRDMResource(ResourceType.MagickBarrier, 1, { timeout: 10 });
makeRDMResource(ResourceType.MagickedSwordplay, 3, {
	timeout: 30,
	warningOnTimeout: WarningType.MagickedSwordplayDrop,
});
makeRDMResource(ResourceType.Manafication, 6, {
	timeout: 30,
	warningOnTimeout: WarningType.ManaficDrop,
});
makeRDMResource(ResourceType.PrefulgenceReady, 1, {
	timeout: 30,
	warningOnTimeout: WarningType.PrefulgenceDrop,
});
makeRDMResource(ResourceType.ThornedFlourish, 1, {
	timeout: 30,
	warningOnTimeout: WarningType.ViceOfThornsDrop,
});
makeRDMResource(ResourceType.VerfireReady, 1, { timeout: 30 });
makeRDMResource(ResourceType.VerstoneReady, 1, { timeout: 30 });

makeRDMResource(ResourceType.RDMMeleeCounter, 2, { timeout: 30 });
makeRDMResource(ResourceType.RDMFinisherCounter, 2, { timeout: 30 });
makeRDMResource(ResourceType.RDMAoECounter, 2, { timeout: 30 });

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
		const swiftcastCooldown = this.hasTraitUnlocked(TraitName.EnhancedSwiftcast) ? 40 : 60;
		const c6Cooldown = this.hasTraitUnlocked(TraitName.RedMagicMastery) ? 35 : 45;
		const mfCooldown = this.hasTraitUnlocked(TraitName.EnhancedManafication) ? 110 : 120;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
			new CoolDown(ResourceType.cd_ContreSixte, c6Cooldown, 1, 1),
			new CoolDown(ResourceType.cd_Manafication, mfCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		const accelStacks = this.hasTraitUnlocked(TraitName.EnhancedAcceleration) ? 2 : 1;
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_Acceleration, 55, accelStacks, accelStacks),
		);

		const mfStacks = this.hasTraitUnlocked(TraitName.EnhancedManaficationII)
			? 6
			: this.hasTraitUnlocked(TraitName.EnhancedManafication)
				? 5
				: 4;
		this.resources.set(new Resource(ResourceType.Manafication, mfStacks, 0));

		this.registerRecurringEvents();
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable(ResourceType.Embolden) && skill.aspect !== Aspect.Physical) {
			node.addBuff(BuffType.Embolden);
		}
		if (
			(this.hasResourceAvailable(ResourceType.Manafication) && skill.kind === "spell") ||
			skill.kind === "weaponskill"
		) {
			node.addBuff(BuffType.Manafication);
		}
		if (
			skill.name === SkillName.Impact &&
			this.hasResourceAvailable(ResourceType.Acceleration)
		) {
			node.addBuff(BuffType.Acceleration);
		}
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
		const isInstant =
			FINISHERS.includes(name) ||
			(name === SkillName.GrandImpact &&
				this.tryConsumeResource(ResourceType.GrandImpactReady)) ||
			(ACCELERATION_SKILLS.includes(name) &&
				this.tryConsumeResource(ResourceType.Acceleration)) ||
			this.tryConsumeResource(ResourceType.Dualcast) ||
			this.tryConsumeResource(ResourceType.Swiftcast);
		// After any hardcast skill, gain dualcast
		if (!isInstant) {
			this.resources.get(ResourceType.Dualcast).gain(1);
			this.enqueueResourceDrop(ResourceType.Dualcast);
		}
	}

	gainColorMana(params: { w?: number; b?: number }) {
		// mana gain happens on cast confirm
		const white = this.resources.get(ResourceType.WhiteMana);
		const black = this.resources.get(ResourceType.BlackMana);
		// If mana is imbalanced (b > w + 30), all mana gains of the opposing color are halved
		// (rounded down) until the gap becomes smaller than 30
		if (params.w) {
			const imbalanced = black.availableAmount() - white.availableAmount() > 30;
			white.gain(imbalanced ? Math.floor(params.w / 2) : params.w);
		}
		if (params.b) {
			const imbalanced = white.availableAmount() - black.availableAmount() > 30;
			black.gain(imbalanced ? Math.floor(params.b / 2) : params.b);
		}
		// Raise warning after if we became imbalanced
		if (Math.abs(black.availableAmount() - white.availableAmount()) > 30) {
			controller.reportWarning(WarningType.ImbalancedMana);
		}
	}

	colorManaExceeds(amount: number): boolean {
		// Check if black/white mana both exceed the amount, or there is a magicked swordplay stack.
		return (
			this.hasResourceAvailable(ResourceType.MagickedSwordplay) ||
			(this.hasResourceAvailable(ResourceType.WhiteMana, amount) &&
				this.hasResourceAvailable(ResourceType.BlackMana, amount))
		);
	}

	consumeColorMana(amount: number) {
		// Consume magicked swordplay or color mana
		if (this.hasResourceAvailable(ResourceType.MagickedSwordplay)) {
			this.tryConsumeResource(ResourceType.MagickedSwordplay);
		} else {
			this.resources.get(ResourceType.WhiteMana).consume(amount);
			this.resources.get(ResourceType.BlackMana).consume(amount);
		}
	}

	gainVerproc(proc: typeof ResourceType.VerfireReady | typeof ResourceType.VerstoneReady) {
		let duration = (getResourceInfo("RDM", proc) as ResourceInfo).maxTimeout;
		if (this.resources.get(proc).available(1)) {
			this.resources.get(proc).overrideTimer(this, duration);
		} else {
			this.resources.get(proc).gain(1);
			this.enqueueResourceDrop(proc, duration);
		}
	}

	maybeGainVerproc(
		proc: typeof ResourceType.VerfireReady | typeof ResourceType.VerstoneReady,
		chance: number = 0.5,
	) {
		let rand = this.rng();
		if (
			this.config.procMode === ProcMode.Always ||
			(this.config.procMode === ProcMode.RNG && rand < chance)
		) {
			this.gainVerproc(proc);
		}
	}

	// Advance the appropriate combo resources (RDMMeleeCounter, RDMFinisherCounter, RDMAoECounter)
	// on skill confirmation. Also increment/consume mana stacks.
	processComboStatus(skill: SkillName) {
		const manaStacks = this.resources.get(ResourceType.ManaStacks);
		const hasScorch = this.config.level >= 80;
		const hasReso = this.config.level >= 90;
		const meleeComboCounter = this.resources
			.get(ResourceType.RDMMeleeCounter)
			.availableAmount();
		const finisherCounter = this.resources
			.get(ResourceType.RDMFinisherCounter)
			.availableAmount();
		const aoeCounter = this.resources.get(ResourceType.RDMAoECounter).availableAmount();
		const anyComboActive = meleeComboCounter + finisherCounter + aoeCounter > 0;
		// 3-element array of melee, finisher, aoe
		let counters: number[];
		if (skill === SkillName.EnchantedRiposte || skill === SkillName.Riposte) {
			// TODO check if aoe combo does get reset
			if (anyComboActive) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [1, 0, 0];
			if (skill === SkillName.EnchantedRiposte) {
				manaStacks.gain(1);
			}
		} else if (skill === SkillName.EnchantedZwerchhau || skill === SkillName.Zwerchhau) {
			if (anyComboActive && meleeComboCounter !== 1) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [meleeComboCounter === 1 ? 2 : 0, 0, 0];
			if (skill === SkillName.EnchantedZwerchhau) {
				manaStacks.gain(1); // even if un-combo'd
			}
		} else if (skill === SkillName.EnchantedRedoublement || skill === SkillName.Redoublement) {
			if (anyComboActive && meleeComboCounter !== 2) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 0];
			if (skill === SkillName.EnchantedRedoublement) {
				manaStacks.gain(1); // even if un-combo'd
			}
		} else if (skill === SkillName.Verholy || skill === SkillName.Verflare) {
			// don't report combo breaks for finishers
			counters = [0, hasScorch ? 1 : 0, 0];
			manaStacks.consume(3);
		} else if (skill === SkillName.Scorch) {
			counters = [0, hasReso ? 2 : 0, 0];
		} else if (skill === SkillName.Resolution) {
			counters = [0, 0, 0];
		} else if (skill === SkillName.EnchantedMoulinet) {
			if (meleeComboCounter + finisherCounter > 0) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 1];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedMoulinet2) {
			// no need to check aoe combo status (was already validated before skill usage)
			counters = [0, 0, 2];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedMoulinet3) {
			counters = [0, 0, 0];
			manaStacks.gain(1);
		} else if (skill === SkillName.EnchantedReprise) {
			// enchanted reprise does not break combos or the mana counter (but reprise does)
			counters = [meleeComboCounter, finisherCounter, aoeCounter];
		} else {
			if (anyComboActive) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 0];
			manaStacks.consume(manaStacks.availableAmount());
		}
		this.setComboState(ResourceType.RDMMeleeCounter, counters[0]);
		this.setComboState(ResourceType.RDMFinisherCounter, counters[1]);
		this.setComboState(ResourceType.RDMAoECounter, counters[2]);
	}

	processManafic() {
		// all GCDs (even vercure/raise) consume manafic stacks
		// if we successfully consuemd all stacks, then become prefulgence ready
		if (
			this.tryConsumeResource(ResourceType.Manafication) &&
			!this.hasResourceAvailable(ResourceType.Manafication) &&
			this.hasTraitUnlocked(TraitName.EnhancedManaficationIII)
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

const makeSpell_RDM = (
	name: SkillName,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		isPhysical?: boolean;
		replaceIf?: ConditionalSkillReplace<RDMState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<RDMState>;
		baseCastTime: number;
		baseManaCost: number;
		basePotency?: number | Array<[TraitName, number]>;
		falloff?: number;
		jobPotencyModifiers?: PotencyModifierFn<RDMState>;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RDMState>;
		onConfirm?: EffectFn<RDMState>;
	},
): Spell<RDMState> => {
	const onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processManafic(),
		// onConfirm must be checked before acceleration is consume
		// to make sure procs are properly gained
		params.onConfirm ?? NO_EFFECT,
		(state) => state.processDualcastAndInstants(name),
		(state) => state.processComboStatus(name),
	);
	return makeSpell("RDM", name, unlockLevel, {
		...params,
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
		isInstantFn: (state) =>
			FINISHERS.includes(name) ||
			name === SkillName.GrandImpact ||
			(ACCELERATION_SKILLS.includes(name) &&
				state.hasResourceAvailable(ResourceType.Acceleration)) ||
			state.hasResourceAvailable(ResourceType.Dualcast) ||
			state.hasResourceAvailable(ResourceType.Swiftcast),
		onConfirm: onConfirm,
	});
};

const makeMeleeGCD = (
	name: SkillName,
	unlockLevel: number,
	params: {
		replaceIf: ConditionalSkillReplace<RDMState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitName, number]>;
		combo?: {
			potency: number | Array<[TraitName, number]>;
			resource: ResourceType;
			resourceValue: number;
		};
		// note that melee hits are not scaled by sps
		recastTime: number;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RDMState>;
		onConfirm?: EffectFn<RDMState>;
		highlightIf?: StatePredicate<RDMState>;
	},
): Weaponskill<RDMState> => {
	// Un-enchanted melee hits are not magic damage
	const isPhysical = !name.toString().startsWith("Enchanted");
	const onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processManafic(),
		(state) => state.processComboStatus(name),
		params.onConfirm ?? NO_EFFECT,
	);
	return makeWeaponskill("RDM", name, unlockLevel, {
		...params,
		aspect: isPhysical ? Aspect.Physical : undefined,
		onConfirm: onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (
				params.combo &&
				state.resources.get(params.combo.resource).availableAmount() ===
					params.combo.resourceValue
			) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			if (!isPhysical) {
				if (state.hasResourceAvailable(ResourceType.Embolden)) {
					mods.push(Modifiers.EmboldenMagic);
				}
				if (state.hasResourceAvailable(ResourceType.Manafication)) {
					mods.push(Modifiers.Manafication);
				}
			}
			return mods;
		},
	});
};

const makeAbility_RDM = (
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		isPhysical?: boolean;
		potency?: number | Array<[TraitName, number]>;
		replaceIf?: ConditionalSkillReplace<RDMState>[];
		highlightIf?: StatePredicate<RDMState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<RDMState>;
		onConfirm?: EffectFn<RDMState>;
		onApplication?: EffectFn<RDMState>;
	},
): Ability<RDMState> =>
	makeAbility("RDM", name, unlockLevel, cdName, {
		aspect: params.isPhysical ? Aspect.Physical : undefined,
		jobPotencyModifiers: (state) =>
			!params.isPhysical && state.hasResourceAvailable(ResourceType.Embolden)
				? [Modifiers.EmboldenMagic]
				: [],
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
	condition: (state) =>
		state.getFinisherCounter() < 1 && state.hasResourceAvailable(ResourceType.GrandImpactReady),
};

makeSpell_RDM(SkillName.Jolt2, 62, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoUpgrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt3 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8, // TODO
	basePotency: 280,
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 &&
		!state.hasResourceAvailable(ResourceType.GrandImpactReady),
	onConfirm: (state) => state.gainColorMana({ w: 2, b: 2 }),
});

makeSpell_RDM(SkillName.Jolt3, 84, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoDowngrade: { trait: TraitName.RedMagicMasteryIII, otherSkill: SkillName.Jolt2 },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: 360,
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 &&
		!state.hasResourceAvailable(ResourceType.GrandImpactReady),
	onConfirm: (state) => state.gainColorMana({ w: 2, b: 2 }),
});

const procPotencies = [
	[TraitName.Never, 300],
	[TraitName.RedMagicMasteryII, 340],
	[TraitName.RedMagicMasteryIII, 380],
] as Array<[TraitName, number]>;

makeSpell_RDM(SkillName.Verstone, 30, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VerstoneReady),
	onConfirm: (state) => {
		state.gainColorMana({ w: 5 });
		state.tryConsumeResource(ResourceType.VerstoneReady);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.VerstoneReady),
});

makeSpell_RDM(SkillName.Verfire, 26, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VerfireReady),
	onConfirm: (state) => {
		state.gainColorMana({ b: 5 });
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
		state.gainColorMana({ w: 6 });
		if (state.hasResourceAvailable(ResourceType.Acceleration)) {
			state.gainVerproc(ResourceType.VerstoneReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerstoneReady);
		}
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
		state.gainColorMana({ b: 6 });
		if (state.hasResourceAvailable(ResourceType.Acceleration)) {
			state.gainVerproc(ResourceType.VerfireReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerfireReady);
		}
	},
});

const ver3Potency: Array<[TraitName, number]> = [
	[TraitName.Never, 380],
	[TraitName.EnchantedBladeMastery, 440],
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
		state.gainColorMana({ w: 6 });
		if (state.hasResourceAvailable(ResourceType.Acceleration)) {
			state.gainVerproc(ResourceType.VerstoneReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerstoneReady);
		}
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
		state.gainColorMana({ b: 6 });
		if (state.hasResourceAvailable(ResourceType.Acceleration)) {
			state.gainVerproc(ResourceType.VerfireReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerfireReady);
		}
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
	baseManaCost: 400,
	applicationDelay: 0.8,
	basePotency: ver2Potency,
	falloff: 0,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({ w: 7 }),
});

makeSpell_RDM(SkillName.Verthunder2, 18, {
	replaceIf: [verflareConditon],
	baseCastTime: 2.0,
	baseManaCost: 400,
	falloff: 0,
	applicationDelay: 0.8,
	basePotency: ver2Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({ b: 7 }),
});

makeSpell_RDM(SkillName.Impact, 66, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	baseCastTime: 5.0,
	baseManaCost: 400,
	falloff: 0,
	applicationDelay: 0.76,
	basePotency: [
		[TraitName.Never, 200],
		[TraitName.RedMagicMasteryIII, 210],
	],
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable(ResourceType.Acceleration) ? [Modifiers.AccelerationImpact] : [],
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 &&
		!state.hasResourceAvailable(ResourceType.GrandImpactReady),
	onConfirm: (state) => state.gainColorMana({ w: 3, b: 3 }),
});

makeSpell_RDM(SkillName.GrandImpact, 96, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 600,
	falloff: 0.6,
	applicationDelay: 1.55,
	validateAttempt: giCondition.condition,
	highlightIf: giCondition.condition,
	onConfirm: (state) => state.gainColorMana({ w: 3, b: 3 }),
});

// Combo state for melee hits is automatically handled in makeMeleeGCD via state.processComboStatus
makeMeleeGCD(SkillName.Riposte, 1, {
	replaceIf: [
		{ newSkill: SkillName.EnchantedRiposte, condition: (state) => state.colorManaExceeds(20) },
	],
	applicationDelay: 0.62, // TODO
	potency: 130,
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(20),
});

makeMeleeGCD(SkillName.Zwerchhau, 35, {
	replaceIf: [
		{
			newSkill: SkillName.EnchantedZwerchhau,
			condition: (state) => state.colorManaExceeds(15),
		},
	],
	applicationDelay: 0.62, // TODO
	potency: 100,
	combo: {
		potency: 150,
		resource: ResourceType.RDMMeleeCounter,
		resourceValue: 1,
	},
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(15),
	highlightIf: (state) =>
		state.resources.get(ResourceType.RDMMeleeCounter).availableAmount() === 1,
});

makeMeleeGCD(SkillName.Redoublement, 50, {
	replaceIf: [
		{
			newSkill: SkillName.EnchantedRedoublement,
			condition: (state) => state.colorManaExceeds(15),
		},
	],
	applicationDelay: 0.62, // TODO
	potency: 100,
	combo: {
		potency: 230,
		resource: ResourceType.RDMMeleeCounter,
		resourceValue: 2,
	},
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(15),
	highlightIf: (state) =>
		state.resources.get(ResourceType.RDMMeleeCounter).availableAmount() === 2,
});

makeMeleeGCD(SkillName.EnchantedRiposte, 50, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: SkillName.Riposte, condition: (state) => !state.colorManaExceeds(20) }],
	applicationDelay: 0.62,
	potency: [
		[TraitName.Never, 220],
		[TraitName.RedMagicMasteryIII, 280],
		[TraitName.EnchantedBladeMastery, 300],
	],
	recastTime: 1.5,
	validateAttempt: (state) => state.colorManaExceeds(20),
	onConfirm: (state) => state.consumeColorMana(20),
});

makeMeleeGCD(SkillName.EnchantedZwerchhau, 50, {
	startOnHotbar: false,
	replaceIf: [
		{ newSkill: SkillName.Zwerchhau, condition: (state) => !state.colorManaExceeds(15) },
	],
	applicationDelay: 0.62,
	potency: [
		[TraitName.Never, 100],
		[TraitName.RedMagicMasteryIII, 150],
		[TraitName.EnchantedBladeMastery, 170],
	],
	combo: {
		potency: [
			[TraitName.Never, 290],
			[TraitName.RedMagicMasteryIII, 340],
			[TraitName.EnchantedBladeMastery, 360],
		],
		resource: ResourceType.RDMMeleeCounter,
		resourceValue: 1,
	},
	recastTime: 1.5,
	validateAttempt: (state) => state.colorManaExceeds(15),
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: (state) =>
		state.resources.get(ResourceType.RDMMeleeCounter).availableAmount() === 1,
});

makeMeleeGCD(SkillName.EnchantedRedoublement, 50, {
	startOnHotbar: false,
	replaceIf: [
		{ newSkill: SkillName.Redoublement, condition: (state) => !state.colorManaExceeds(15) },
	],
	applicationDelay: 0.62,
	potency: [
		[TraitName.Never, 100],
		[TraitName.RedMagicMasteryIII, 130],
		[TraitName.EnchantedBladeMastery, 170],
	],
	combo: {
		potency: [
			[TraitName.Never, 470],
			[TraitName.RedMagicMasteryIII, 500],
			[TraitName.EnchantedBladeMastery, 530],
		],
		resource: ResourceType.RDMMeleeCounter,
		resourceValue: 2,
	},
	recastTime: 2.2,
	validateAttempt: (state) => state.colorManaExceeds(15),
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: (state) =>
		state.resources.get(ResourceType.RDMMeleeCounter).availableAmount() === 2,
});

const canReprise = (state: Readonly<RDMState>) =>
	state.resources.get(ResourceType.WhiteMana).available(5) &&
	state.resources.get(ResourceType.BlackMana).available(5);

makeMeleeGCD(SkillName.Reprise, 76, {
	replaceIf: [{ newSkill: SkillName.EnchantedReprise, condition: (state) => canReprise(state) }],
	applicationDelay: 0.62, // TODO
	potency: 100,
	recastTime: 2.5,
	validateAttempt: (state) => !canReprise(state),
});

makeMeleeGCD(SkillName.EnchantedReprise, 76, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: SkillName.Reprise, condition: (state) => !canReprise(state) }],
	applicationDelay: 0.62, // TODO
	potency: [
		[TraitName.Never, 290],
		[TraitName.RedMagicMasteryIII, 340],
		[TraitName.EnchantedBladeMastery, 420],
	],
	recastTime: 2.5,
	validateAttempt: (state) => canReprise(state),
	onConfirm: (state) => {
		// don't use the consumeColorMana helper function because this doesn't consume a magicked swordplay stack
		state.resources.get(ResourceType.WhiteMana).consume(5);
		state.resources.get(ResourceType.BlackMana).consume(5);
	},
});

const moulinetConditions: ConditionalSkillReplace<RDMState>[] = [
	{
		newSkill: SkillName.Moulinet,
		condition: (state) =>
			// When AoE counter is 0, check if mana < 20
			// otherwise, check if mana < 15
			(state.resources.get(ResourceType.RDMAoECounter).availableAmount() === 0 &&
				!state.colorManaExceeds(20)) ||
			!state.colorManaExceeds(15),
	},
	{
		newSkill: SkillName.EnchantedMoulinet,
		condition: (state) =>
			state.colorManaExceeds(20) &&
			state.resources.get(ResourceType.RDMAoECounter).availableAmount() === 0,
	},
	{
		newSkill: SkillName.EnchantedMoulinet2,
		condition: (state) =>
			state.colorManaExceeds(15) &&
			state.resources.get(ResourceType.RDMAoECounter).availableAmount() === 1,
	},
	{
		newSkill: SkillName.EnchantedMoulinet3,
		condition: (state) =>
			state.colorManaExceeds(15) &&
			state.resources.get(ResourceType.RDMAoECounter).availableAmount() === 2,
	},
];

makeMeleeGCD(SkillName.Moulinet, 52, {
	replaceIf: [moulinetConditions[1], moulinetConditions[2], moulinetConditions[3]],
	falloff: 0,
	applicationDelay: 0.8, // TODO
	potency: 60,
	recastTime: 2.5,
	validateAttempt: moulinetConditions[0].condition,
});

makeMeleeGCD(SkillName.EnchantedMoulinet, 52, {
	startOnHotbar: false,
	replaceIf: [moulinetConditions[0], moulinetConditions[2], moulinetConditions[3]],
	falloff: 0,
	applicationDelay: 0.8,
	potency: 130,
	recastTime: 1.5,
	validateAttempt: moulinetConditions[1].condition,
	onConfirm: (state) => state.consumeColorMana(20),
});

makeMeleeGCD(SkillName.EnchantedMoulinet2, 52, {
	startOnHotbar: false,
	replaceIf: [moulinetConditions[0], moulinetConditions[1], moulinetConditions[3]],
	falloff: 0,
	applicationDelay: 0.8,
	potency: 140,
	recastTime: 1.5,
	validateAttempt: moulinetConditions[2].condition,
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: moulinetConditions[2].condition,
});

makeMeleeGCD(SkillName.EnchantedMoulinet3, 52, {
	startOnHotbar: false,
	replaceIf: [moulinetConditions[0], moulinetConditions[1], moulinetConditions[2]],
	falloff: 0,
	applicationDelay: 0.8,
	potency: 150,
	recastTime: 1.5,
	validateAttempt: moulinetConditions[3].condition,
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: moulinetConditions[3].condition,
});

const verfinishPotency: Array<[TraitName, number]> = [
	[TraitName.Never, 600],
	[TraitName.EnchantedBladeMastery, 650],
];

// Combo status and mana stack consumption for finisherse are handled in makeSpell_RDM
makeSpell_RDM(SkillName.Verholy, 70, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.43,
	basePotency: verfinishPotency,
	validateAttempt: (state) => state.hasThreeManaStacks(),
	highlightIf: (state) => state.hasThreeManaStacks(),
	onConfirm: (state) => {
		if (
			state.resources.get(ResourceType.WhiteMana).availableAmount() <
			state.resources.get(ResourceType.BlackMana).availableAmount()
		) {
			state.gainVerproc(ResourceType.VerstoneReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerstoneReady, 0.2);
		}
		state.gainColorMana({ w: 11 });
	},
});

makeSpell_RDM(SkillName.Verflare, 68, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.43,
	basePotency: verfinishPotency,
	validateAttempt: (state) => state.hasThreeManaStacks(),
	highlightIf: (state) => state.hasThreeManaStacks(),
	onConfirm: (state) => {
		if (
			state.resources.get(ResourceType.BlackMana).availableAmount() <
			state.resources.get(ResourceType.WhiteMana).availableAmount()
		) {
			state.gainVerproc(ResourceType.VerfireReady);
		} else {
			state.maybeGainVerproc(ResourceType.VerfireReady, 0.2);
		}
		state.gainColorMana({ b: 11 });
	},
});

makeSpell_RDM(SkillName.Scorch, 80, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.83,
	basePotency: [
		[TraitName.Never, 680],
		[TraitName.EnchantedBladeMastery, 750],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 1,
	onConfirm: (state) => state.gainColorMana({ w: 4, b: 4 }),
	highlightIf: (state) => state.getFinisherCounter() === 1,
});

makeSpell_RDM(SkillName.Resolution, 90, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.56,
	basePotency: [
		[TraitName.Never, 750],
		[TraitName.EnchantedBladeMastery, 850],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 2,
	onConfirm: (state) => state.gainColorMana({ w: 4, b: 4 }),
	highlightIf: (state) => state.getFinisherCounter() === 2,
});

makeSpell_RDM(SkillName.Vercure, 54, {
	baseCastTime: 2.0,
	baseManaCost: 500,
	applicationDelay: 0.8,
	basePotency: 0,
});

makeSpell_RDM(SkillName.Verraise, 64, {
	baseCastTime: 10,
	baseManaCost: 2400,
	applicationDelay: 0.81,
	basePotency: 0,
});

makeResourceAbility("RDM", SkillName.Embolden, 58, ResourceType.cd_Embolden, {
	replaceIf: [
		{
			newSkill: SkillName.ViceOfThorns,
			condition: (state) => state.hasResourceAvailable(ResourceType.ThornedFlourish),
		},
	],
	rscType: ResourceType.Embolden,
	applicationDelay: 0.62,
	cooldown: 120,
	onApplication: (state) => {
		if (state.hasTraitUnlocked(TraitName.EnhancedEmbolden)) {
			state.resources.get(ResourceType.ThornedFlourish).gain(1);
			state.enqueueResourceDrop(ResourceType.ThornedFlourish);
		}
	},
});

makeResourceAbility("RDM", SkillName.Manafication, 60, ResourceType.cd_Manafication, {
	replaceIf: [
		{
			newSkill: SkillName.Prefulgence,
			condition: (state) => state.hasResourceAvailable(ResourceType.PrefulgenceReady),
		},
	],
	rscType: ResourceType.Manafication,
	requiresCombat: true,
	applicationDelay: 0,
	cooldown: 110,
	onApplication: (state) => {
		state.resources.get(ResourceType.MagickedSwordplay).gain(3);
		state.enqueueResourceDrop(ResourceType.MagickedSwordplay);
		// Manification resets combos
		if (
			state.hasResourceAvailable(ResourceType.RDMMeleeCounter) ||
			state.hasResourceAvailable(ResourceType.RDMFinisherCounter) ||
			state.hasResourceAvailable(ResourceType.RDMAoECounter)
		) {
			controller.reportWarning(WarningType.ComboBreak);
		}
		state.setComboState(ResourceType.RDMMeleeCounter, 0);
		state.setComboState(ResourceType.RDMFinisherCounter, 0);
		state.setComboState(ResourceType.RDMAoECounter, 0);
	},
});

makeAbility_RDM(SkillName.CorpsACorps, 6, ResourceType.cd_CorpsACorps, {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: 130,
	cooldown: 35,
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
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
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
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
	falloff: 0,
	applicationDelay: 1.16,
	potency: [
		[TraitName.Never, 380],
		[TraitName.EnchantedBladeMastery, 420],
	],
	cooldown: 35, // manually adjusted for traits in constructor
});

makeResourceAbility("RDM", SkillName.Acceleration, 50, ResourceType.cd_Acceleration, {
	rscType: ResourceType.Acceleration,
	applicationDelay: 0,
	cooldown: 55,
	maxCharges: 2,
	// acceleration buff grant is automatic from this declaration already
	onApplication: (state) => {
		if (state.hasTraitUnlocked(TraitName.EnhancedAccelerationII)) {
			if (state.hasResourceAvailable(ResourceType.GrandImpactReady)) {
				controller.reportWarning(WarningType.GIOverwrite);
			}
			state.resources.get(ResourceType.GrandImpactReady).gain(1);
			state.enqueueResourceDrop(ResourceType.GrandImpactReady);
		}
	},
});

makeResourceAbility("RDM", SkillName.MagickBarrier, 86, ResourceType.cd_MagickBarrier, {
	rscType: ResourceType.MagickBarrier,
	applicationDelay: 0,
	cooldown: 120,
});

makeAbility_RDM(SkillName.ViceOfThorns, 92, ResourceType.cd_ViceOfThorns, {
	startOnHotbar: false,
	falloff: 0.6,
	applicationDelay: 0.8,
	potency: 700,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ThornedFlourish),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.ThornedFlourish),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ThornedFlourish),
});

makeAbility_RDM(SkillName.Prefulgence, 100, ResourceType.cd_Prefulgence, {
	startOnHotbar: false,
	falloff: 0.6,
	applicationDelay: 1.42,
	potency: 900,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PrefulgenceReady),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.PrefulgenceReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.PrefulgenceReady),
});
