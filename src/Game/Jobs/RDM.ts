// Skill and state declarations for RDM.

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
import { TraitKey } from "../Data/Traits";
import { RDMActionKey } from "../Data/Actions/Jobs/RDM";
import { ActionKey } from "../Data/Actions";
import { RDMResourceKey } from "../Data/Resources/Jobs/RDM";
import { CooldownKey } from "../Data/Cooldowns";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { RDMStatusPropsGenerator } from "../../Components/Jobs/RDM";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeRDMResource = (
	rsc: RDMResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("RDM", rsc, maxValue, params ?? {});
};

makeRDMResource("WHITE_MANA", 100);
makeRDMResource("BLACK_MANA", 100);
makeRDMResource("MANA_STACKS", 3);

// TODO: get precise durations
makeRDMResource("ACCELERATION", 1, { timeout: 20 });
makeRDMResource("DUALCAST", 1, { timeout: 15 });
makeRDMResource("EMBOLDEN", 1, { timeout: 20 });
makeRDMResource("GRAND_IMPACT_READY", 1, {
	timeout: 30,
	warningOnTimeout: WarningType.GIDrop,
});
makeRDMResource("MAGICK_BARRIER", 1, { timeout: 10 });
makeRDMResource("MAGICKED_SWORDPLAY", 3, {
	timeout: 30,
	warningOnTimeout: WarningType.MagickedSwordplayDrop,
});
makeRDMResource("MANAFICATION", 6, {
	timeout: 30,
	warningOnTimeout: WarningType.ManaficDrop,
});
makeRDMResource("PREFULGENCE_READY", 1, {
	timeout: 30,
	warningOnTimeout: WarningType.PrefulgenceDrop,
});
makeRDMResource("THORNED_FLOURISH", 1, {
	timeout: 30,
	warningOnTimeout: WarningType.ViceOfThornsDrop,
});
makeRDMResource("VERFIRE_READY", 1, { timeout: 30 });
makeRDMResource("VERSTONE_READY", 1, { timeout: 30 });

makeRDMResource("RDM_MELEE_COUNTER", 2, { timeout: 30 });
makeRDMResource("RDM_FINISHER_COUNTER", 2, { timeout: 30 });
makeRDMResource("RDM_AOE_COUNTER", 2, { timeout: 30 });

// === JOB GAUGE AND STATE ===
const ACCELERATION_SKILLS: RDMActionKey[] = [
	"IMPACT",
	"VERAERO",
	"VERTHUNDER",
	"VERAERO_III",
	"VERTHUNDER_III",
];

const FINISHERS: RDMActionKey[] = ["VERHOLY", "VERFLARE", "SCORCH", "RESOLUTION"];

export class RDMState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = this.hasTraitUnlocked("ENHANCED_SWIFTCAST") ? 40 : 60;
		const c6Cooldown = this.hasTraitUnlocked("RED_MAGIC_MASTERY") ? 35 : 45;
		const mfCooldown = this.hasTraitUnlocked("ENHANCED_MANAFICATION") ? 110 : 120;
		[
			new CoolDown("cd_SWIFTCAST", swiftcastCooldown, 1, 1),
			new CoolDown("cd_CONTRE_SIXTE", c6Cooldown, 1, 1),
			new CoolDown("cd_MANAFICATION", mfCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		const accelStacks = this.hasTraitUnlocked("ENHANCED_ACCELERATION") ? 2 : 1;
		this.cooldowns.set(new CoolDown("cd_ACCELERATION", 55, accelStacks, accelStacks));

		const mfStacks = this.hasTraitUnlocked("ENHANCED_MANAFICATION_II")
			? 6
			: this.hasTraitUnlocked("ENHANCED_MANAFICATION")
				? 5
				: 4;
		this.resources.set(new Resource("MANAFICATION", mfStacks, 0));

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<RDMState> {
		return new RDMStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("EMBOLDEN") && skill.aspect !== Aspect.Physical) {
			node.addBuff(BuffType.Embolden);
		}
		if (
			(this.hasResourceAvailable("MANAFICATION") && skill.kind === "spell") ||
			skill.kind === "weaponskill"
		) {
			node.addBuff(BuffType.Manafication);
		}
		if (skill.name === "IMPACT" && this.hasResourceAvailable("ACCELERATION")) {
			node.addBuff(BuffType.Acceleration);
		}
	}

	hasThreeManaStacks(): boolean {
		return this.hasResourceAvailable("MANA_STACKS", 3);
	}

	getFinisherCounter(): number {
		return this.resources.get("RDM_FINISHER_COUNTER").availableAmount();
	}

	processDualcastAndInstants(name: ActionKey) {
		// This function should only be called for spells; weaponskills (melee hits) are handled separately.
		// Instant consumption order:
		// Acceleration (if possible) -> Swift -> Dualcast
		// This depends on boolean short-circuiting logic
		const isInstant =
			FINISHERS.includes(name as RDMActionKey) ||
			(name === "GRAND_IMPACT" && this.tryConsumeResource("GRAND_IMPACT_READY")) ||
			(ACCELERATION_SKILLS.includes(name as RDMActionKey) &&
				this.tryConsumeResource("ACCELERATION")) ||
			this.tryConsumeResource("DUALCAST") ||
			this.tryConsumeResource("SWIFTCAST");
		// After any hardcast skill, gain dualcast
		if (!isInstant) {
			this.resources.get("DUALCAST").gain(1);
			this.enqueueResourceDrop("DUALCAST");
		}
	}

	gainColorMana(params: { w?: number; b?: number }) {
		// mana gain happens on cast confirm
		const white = this.resources.get("WHITE_MANA");
		const black = this.resources.get("BLACK_MANA");
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
			this.hasResourceAvailable("MAGICKED_SWORDPLAY") ||
			(this.hasResourceAvailable("WHITE_MANA", amount) &&
				this.hasResourceAvailable("BLACK_MANA", amount))
		);
	}

	consumeColorMana(amount: number) {
		// Consume magicked swordplay or color mana
		if (this.hasResourceAvailable("MAGICKED_SWORDPLAY")) {
			this.tryConsumeResource("MAGICKED_SWORDPLAY");
		} else {
			this.resources.get("WHITE_MANA").consume(amount);
			this.resources.get("BLACK_MANA").consume(amount);
		}
	}

	gainVerproc(proc: "VERFIRE_READY" | "VERSTONE_READY") {
		let duration = (getResourceInfo("RDM", proc) as ResourceInfo).maxTimeout;
		if (this.resources.get(proc).available(1)) {
			this.resources.get(proc).overrideTimer(this, duration);
		} else {
			this.resources.get(proc).gain(1);
			this.enqueueResourceDrop(proc, duration);
		}
	}

	maybeGainVerproc(proc: "VERFIRE_READY" | "VERSTONE_READY", chance: number = 0.5) {
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
	processComboStatus(skill: RDMActionKey) {
		const manaStacks = this.resources.get("MANA_STACKS");
		const hasScorch = this.config.level >= 80;
		const hasReso = this.config.level >= 90;
		const meleeComboCounter = this.resources.get("RDM_MELEE_COUNTER").availableAmount();
		const finisherCounter = this.resources.get("RDM_FINISHER_COUNTER").availableAmount();
		const aoeCounter = this.resources.get("RDM_AOE_COUNTER").availableAmount();
		const anyComboActive = meleeComboCounter + finisherCounter + aoeCounter > 0;
		// 3-element array of melee, finisher, aoe
		let counters: number[];
		if (skill === "ENCHANTED_RIPOSTE" || skill === "RIPOSTE") {
			// TODO check if aoe combo does get reset
			if (anyComboActive) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [1, 0, 0];
			if (skill === "ENCHANTED_RIPOSTE") {
				manaStacks.gain(1);
			}
		} else if (skill === "ENCHANTED_ZWERCHHAU" || skill === "ZWERCHHAU") {
			if (anyComboActive && meleeComboCounter !== 1) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [meleeComboCounter === 1 ? 2 : 0, 0, 0];
			if (skill === "ENCHANTED_ZWERCHHAU") {
				manaStacks.gain(1); // even if un-combo'd
			}
		} else if (skill === "ENCHANTED_REDOUBLEMENT" || skill === "REDOUBLEMENT") {
			if (anyComboActive && meleeComboCounter !== 2) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 0];
			if (skill === "ENCHANTED_REDOUBLEMENT") {
				manaStacks.gain(1); // even if un-combo'd
			}
		} else if (skill === "VERHOLY" || skill === "VERFLARE") {
			// don't report combo breaks for finishers
			counters = [0, hasScorch ? 1 : 0, 0];
			manaStacks.consume(3);
		} else if (skill === "SCORCH") {
			counters = [0, hasReso ? 2 : 0, 0];
		} else if (skill === "RESOLUTION") {
			counters = [0, 0, 0];
		} else if (skill === "ENCHANTED_MOULINET") {
			if (meleeComboCounter + finisherCounter > 0) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 1];
			manaStacks.gain(1);
		} else if (skill === "ENCHANTED_MOULINET_II") {
			// no need to check aoe combo status (was already validated before skill usage)
			counters = [0, 0, 2];
			manaStacks.gain(1);
		} else if (skill === "ENCHANTED_MOULINET_III") {
			counters = [0, 0, 0];
			manaStacks.gain(1);
		} else if (skill === "ENCHANTED_REPRISE") {
			// enchanted reprise does not break combos or the mana counter (but reprise does)
			counters = [meleeComboCounter, finisherCounter, aoeCounter];
		} else {
			if (anyComboActive) {
				controller.reportWarning(WarningType.ComboBreak);
			}
			counters = [0, 0, 0];
			manaStacks.consume(manaStacks.availableAmount());
		}
		this.setComboState("RDM_MELEE_COUNTER", counters[0]);
		this.setComboState("RDM_FINISHER_COUNTER", counters[1]);
		this.setComboState("RDM_AOE_COUNTER", counters[2]);
	}

	processManafic() {
		// all GCDs (even vercure/raise) consume manafic stacks
		// if we successfully consuemd all stacks, then become prefulgence ready
		if (
			this.tryConsumeResource("MANAFICATION") &&
			!this.hasResourceAvailable("MANAFICATION") &&
			this.hasTraitUnlocked("ENHANCED_MANAFICATION_III")
		) {
			this.resources.get("PREFULGENCE_READY").gain(1);
			this.enqueueResourceDrop("PREFULGENCE_READY");
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
	name: RDMActionKey,
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
		basePotency?: number | Array<[TraitKey, number]>;
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
			if (state.hasResourceAvailable("EMBOLDEN")) {
				mods.push(Modifiers.EmboldenMagic);
			}
			if (state.hasResourceAvailable("MANAFICATION")) {
				mods.push(Modifiers.Manafication);
			}
			if (params.jobPotencyModifiers) {
				mods.push(...params.jobPotencyModifiers(state));
			}
			return mods;
		},
		isInstantFn: (state) =>
			FINISHERS.includes(name) ||
			name === "GRAND_IMPACT" ||
			(ACCELERATION_SKILLS.includes(name) && state.hasResourceAvailable("ACCELERATION")) ||
			state.hasResourceAvailable("DUALCAST") ||
			state.hasResourceAvailable("SWIFTCAST"),
		onConfirm: onConfirm,
	});
};

const makeMeleeGCD = (
	name: RDMActionKey,
	unlockLevel: number,
	params: {
		replaceIf: ConditionalSkillReplace<RDMState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: RDMResourceKey;
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
	const isPhysical = !name.toString().startsWith("ENCHANTED");
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
				if (state.hasResourceAvailable("EMBOLDEN")) {
					mods.push(Modifiers.EmboldenMagic);
				}
				if (state.hasResourceAvailable("MANAFICATION")) {
					mods.push(Modifiers.Manafication);
				}
			}
			return mods;
		},
	});
};

const makeAbility_RDM = (
	name: RDMActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		isPhysical?: boolean;
		potency?: number | Array<[TraitKey, number]>;
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
			!params.isPhysical && state.hasResourceAvailable("EMBOLDEN")
				? [Modifiers.EmboldenMagic]
				: [],
		...params,
	});

const scorchCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: "SCORCH",
	condition: (state) => state.getFinisherCounter() === 1,
};

const resoCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: "RESOLUTION",
	condition: (state) => state.getFinisherCounter() === 2,
};

const giCondition: ConditionalSkillReplace<RDMState> = {
	newSkill: "GRAND_IMPACT",
	condition: (state) =>
		state.getFinisherCounter() < 1 && state.hasResourceAvailable("GRAND_IMPACT_READY"),
};

makeSpell_RDM("JOLT_II", 62, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoUpgrade: { trait: "RED_MAGIC_MASTERY_III", otherSkill: "JOLT_III" },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8, // TODO
	basePotency: 280,
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 && !state.hasResourceAvailable("GRAND_IMPACT_READY"),
	onConfirm: (state) => state.gainColorMana({ w: 2, b: 2 }),
});

makeSpell_RDM("JOLT_III", 84, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	autoDowngrade: { trait: "RED_MAGIC_MASTERY_III", otherSkill: "JOLT_II" },
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: 360,
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 && !state.hasResourceAvailable("GRAND_IMPACT_READY"),
	onConfirm: (state) => state.gainColorMana({ w: 2, b: 2 }),
});

const procPotencies = [
	["NEVER", 300],
	["RED_MAGIC_MASTERY_II", 340],
	["RED_MAGIC_MASTERY_III", 380],
] as Array<[TraitKey, number]>;

makeSpell_RDM("VERSTONE", 30, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable("VERSTONE_READY"),
	onConfirm: (state) => {
		state.gainColorMana({ w: 5 });
		state.tryConsumeResource("VERSTONE_READY");
	},
	highlightIf: (state) => state.hasResourceAvailable("VERSTONE_READY"),
});

makeSpell_RDM("VERFIRE", 26, {
	baseCastTime: 2.0,
	baseManaCost: 200,
	applicationDelay: 0.8,
	basePotency: procPotencies,
	validateAttempt: (state) => state.hasResourceAvailable("VERFIRE_READY"),
	onConfirm: (state) => {
		state.gainColorMana({ b: 5 });
		state.tryConsumeResource("VERFIRE_READY");
	},
	highlightIf: (state) => state.hasResourceAvailable("VERFIRE_READY"),
});

const verholyConditon: ConditionalSkillReplace<RDMState> = {
	newSkill: "VERHOLY",
	condition: (state) => state.hasThreeManaStacks(),
};

const verflareConditon: ConditionalSkillReplace<RDMState> = {
	newSkill: "VERFLARE",
	condition: (state) => state.hasThreeManaStacks(),
};

makeSpell_RDM("VERAERO", 10, {
	replaceIf: [verholyConditon],
	autoUpgrade: { trait: "RED_MAGIC_MASTERY_II", otherSkill: "VERAERO_III" },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: 360,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({ w: 6 });
		if (state.hasResourceAvailable("ACCELERATION")) {
			state.gainVerproc("VERSTONE_READY");
		} else {
			state.maybeGainVerproc("VERSTONE_READY");
		}
	},
});

makeSpell_RDM("VERTHUNDER", 4, {
	replaceIf: [verflareConditon],
	autoUpgrade: { trait: "RED_MAGIC_MASTERY_II", otherSkill: "VERTHUNDER_III" },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: 360,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({ b: 6 });
		if (state.hasResourceAvailable("ACCELERATION")) {
			state.gainVerproc("VERFIRE_READY");
		} else {
			state.maybeGainVerproc("VERFIRE_READY");
		}
	},
});

const ver3Potency: Array<[TraitKey, number]> = [
	["NEVER", 380],
	["ENCHANTED_BLADE_MASTERY", 440],
];

makeSpell_RDM("VERAERO_III", 82, {
	replaceIf: [verholyConditon],
	autoDowngrade: { trait: "RED_MAGIC_MASTERY_II", otherSkill: "VERAERO" },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: ver3Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({ w: 6 });
		if (state.hasResourceAvailable("ACCELERATION")) {
			state.gainVerproc("VERSTONE_READY");
		} else {
			state.maybeGainVerproc("VERSTONE_READY");
		}
	},
});

makeSpell_RDM("VERTHUNDER_III", 82, {
	replaceIf: [verflareConditon],
	autoDowngrade: { trait: "RED_MAGIC_MASTERY_II", otherSkill: "VERTHUNDER" },
	baseCastTime: 5.0,
	baseManaCost: 400,
	applicationDelay: 0.76,
	basePotency: ver3Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => {
		state.gainColorMana({ b: 6 });
		if (state.hasResourceAvailable("ACCELERATION")) {
			state.gainVerproc("VERFIRE_READY");
		} else {
			state.maybeGainVerproc("VERFIRE_READY");
		}
	},
});

const ver2Potency: Array<[TraitKey, number]> = [
	["NEVER", 100],
	["RED_MAGIC_MASTERY", 120],
	["RED_MAGIC_MASTERY_III", 140],
];

makeSpell_RDM("VERAERO_II", 22, {
	replaceIf: [verholyConditon],
	baseCastTime: 2.0,
	baseManaCost: 400,
	applicationDelay: 0.8,
	basePotency: ver2Potency,
	falloff: 0,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({ w: 7 }),
});

makeSpell_RDM("VERTHUNDER_II", 18, {
	replaceIf: [verflareConditon],
	baseCastTime: 2.0,
	baseManaCost: 400,
	falloff: 0,
	applicationDelay: 0.8,
	basePotency: ver2Potency,
	validateAttempt: (state) => !state.hasThreeManaStacks(),
	onConfirm: (state) => state.gainColorMana({ b: 7 }),
});

makeSpell_RDM("IMPACT", 66, {
	replaceIf: [scorchCondition, resoCondition, giCondition],
	baseCastTime: 5.0,
	baseManaCost: 400,
	falloff: 0,
	applicationDelay: 0.76,
	basePotency: [
		["NEVER", 200],
		["RED_MAGIC_MASTERY_III", 210],
	],
	jobPotencyModifiers: (state) =>
		state.hasResourceAvailable("ACCELERATION") ? [Modifiers.AccelerationImpact] : [],
	validateAttempt: (state) =>
		state.getFinisherCounter() < 1 && !state.hasResourceAvailable("GRAND_IMPACT_READY"),
	onConfirm: (state) => state.gainColorMana({ w: 3, b: 3 }),
});

makeSpell_RDM("GRAND_IMPACT", 96, {
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
makeMeleeGCD("RIPOSTE", 1, {
	replaceIf: [
		{ newSkill: "ENCHANTED_RIPOSTE", condition: (state) => state.colorManaExceeds(20) },
	],
	applicationDelay: 0.62, // TODO
	potency: 130,
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(20),
});

makeMeleeGCD("ZWERCHHAU", 35, {
	replaceIf: [
		{
			newSkill: "ENCHANTED_ZWERCHHAU",
			condition: (state) => state.colorManaExceeds(15),
		},
	],
	applicationDelay: 0.62, // TODO
	potency: 100,
	combo: {
		potency: 150,
		resource: "RDM_MELEE_COUNTER",
		resourceValue: 1,
	},
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(15),
	highlightIf: (state) => state.resources.get("RDM_MELEE_COUNTER").availableAmount() === 1,
});

makeMeleeGCD("REDOUBLEMENT", 50, {
	replaceIf: [
		{
			newSkill: "ENCHANTED_REDOUBLEMENT",
			condition: (state) => state.colorManaExceeds(15),
		},
	],
	applicationDelay: 0.62, // TODO
	potency: 100,
	combo: {
		potency: 230,
		resource: "RDM_MELEE_COUNTER",
		resourceValue: 2,
	},
	recastTime: 2.5,
	validateAttempt: (state) => !state.colorManaExceeds(15),
	highlightIf: (state) => state.resources.get("RDM_MELEE_COUNTER").availableAmount() === 2,
});

makeMeleeGCD("ENCHANTED_RIPOSTE", 50, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: "RIPOSTE", condition: (state) => !state.colorManaExceeds(20) }],
	applicationDelay: 0.62,
	potency: [
		["NEVER", 220],
		["RED_MAGIC_MASTERY_III", 280],
		["ENCHANTED_BLADE_MASTERY", 300],
	],
	recastTime: 1.5,
	validateAttempt: (state) => state.colorManaExceeds(20),
	onConfirm: (state) => state.consumeColorMana(20),
});

makeMeleeGCD("ENCHANTED_ZWERCHHAU", 50, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: "ZWERCHHAU", condition: (state) => !state.colorManaExceeds(15) }],
	applicationDelay: 0.62,
	potency: [
		["NEVER", 100],
		["RED_MAGIC_MASTERY_III", 150],
		["ENCHANTED_BLADE_MASTERY", 170],
	],
	combo: {
		potency: [
			["NEVER", 290],
			["RED_MAGIC_MASTERY_III", 340],
			["ENCHANTED_BLADE_MASTERY", 360],
		],
		resource: "RDM_MELEE_COUNTER",
		resourceValue: 1,
	},
	recastTime: 1.5,
	validateAttempt: (state) => state.colorManaExceeds(15),
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: (state) => state.resources.get("RDM_MELEE_COUNTER").availableAmount() === 1,
});

makeMeleeGCD("ENCHANTED_REDOUBLEMENT", 50, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: "REDOUBLEMENT", condition: (state) => !state.colorManaExceeds(15) }],
	applicationDelay: 0.62,
	potency: [
		["NEVER", 100],
		["RED_MAGIC_MASTERY_III", 130],
		["ENCHANTED_BLADE_MASTERY", 170],
	],
	combo: {
		potency: [
			["NEVER", 470],
			["RED_MAGIC_MASTERY_III", 500],
			["ENCHANTED_BLADE_MASTERY", 530],
		],
		resource: "RDM_MELEE_COUNTER",
		resourceValue: 2,
	},
	recastTime: 2.2,
	validateAttempt: (state) => state.colorManaExceeds(15),
	onConfirm: (state) => state.consumeColorMana(15),
	highlightIf: (state) => state.resources.get("RDM_MELEE_COUNTER").availableAmount() === 2,
});

const canReprise = (state: Readonly<RDMState>) =>
	state.resources.get("WHITE_MANA").available(5) &&
	state.resources.get("BLACK_MANA").available(5);

makeMeleeGCD("REPRISE", 76, {
	replaceIf: [{ newSkill: "ENCHANTED_REPRISE", condition: (state) => canReprise(state) }],
	applicationDelay: 0.62, // TODO
	potency: 100,
	recastTime: 2.5,
	validateAttempt: (state) => !canReprise(state),
});

makeMeleeGCD("ENCHANTED_REPRISE", 76, {
	startOnHotbar: false,
	replaceIf: [{ newSkill: "REPRISE", condition: (state) => !canReprise(state) }],
	applicationDelay: 0.62, // TODO
	potency: [
		["NEVER", 290],
		["RED_MAGIC_MASTERY_III", 340],
		["ENCHANTED_BLADE_MASTERY", 420],
	],
	recastTime: 2.5,
	validateAttempt: (state) => canReprise(state),
	onConfirm: (state) => {
		// don't use the consumeColorMana helper function because this doesn't consume a magicked swordplay stack
		state.resources.get("WHITE_MANA").consume(5);
		state.resources.get("BLACK_MANA").consume(5);
	},
});

const moulinetConditions: ConditionalSkillReplace<RDMState>[] = [
	{
		newSkill: "MOULINET",
		condition: (state) =>
			// When AoE counter is 0, check if mana < 20
			// otherwise, check if mana < 15
			(state.resources.get("RDM_AOE_COUNTER").availableAmount() === 0 &&
				!state.colorManaExceeds(20)) ||
			!state.colorManaExceeds(15),
	},
	{
		newSkill: "ENCHANTED_MOULINET",
		condition: (state) =>
			state.colorManaExceeds(20) &&
			state.resources.get("RDM_AOE_COUNTER").availableAmount() === 0,
	},
	{
		newSkill: "ENCHANTED_MOULINET_II",
		condition: (state) =>
			state.colorManaExceeds(15) &&
			state.resources.get("RDM_AOE_COUNTER").availableAmount() === 1,
	},
	{
		newSkill: "ENCHANTED_MOULINET_III",
		condition: (state) =>
			state.colorManaExceeds(15) &&
			state.resources.get("RDM_AOE_COUNTER").availableAmount() === 2,
	},
];

makeMeleeGCD("MOULINET", 52, {
	replaceIf: [moulinetConditions[1], moulinetConditions[2], moulinetConditions[3]],
	falloff: 0,
	applicationDelay: 0.8, // TODO
	potency: 60,
	recastTime: 2.5,
	validateAttempt: moulinetConditions[0].condition,
});

makeMeleeGCD("ENCHANTED_MOULINET", 52, {
	startOnHotbar: false,
	replaceIf: [moulinetConditions[0], moulinetConditions[2], moulinetConditions[3]],
	falloff: 0,
	applicationDelay: 0.8,
	potency: 130,
	recastTime: 1.5,
	validateAttempt: moulinetConditions[1].condition,
	onConfirm: (state) => state.consumeColorMana(20),
});

makeMeleeGCD("ENCHANTED_MOULINET_II", 52, {
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

makeMeleeGCD("ENCHANTED_MOULINET_III", 52, {
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

const verfinishPotency: Array<[TraitKey, number]> = [
	["NEVER", 600],
	["ENCHANTED_BLADE_MASTERY", 650],
];

// Combo status and mana stack consumption for finisherse are handled in makeSpell_RDM
makeSpell_RDM("VERHOLY", 70, {
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
			state.resources.get("WHITE_MANA").availableAmount() <
			state.resources.get("BLACK_MANA").availableAmount()
		) {
			state.gainVerproc("VERSTONE_READY");
		} else {
			state.maybeGainVerproc("VERSTONE_READY", 0.2);
		}
		state.gainColorMana({ w: 11 });
	},
});

makeSpell_RDM("VERFLARE", 68, {
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
			state.resources.get("BLACK_MANA").availableAmount() <
			state.resources.get("WHITE_MANA").availableAmount()
		) {
			state.gainVerproc("VERFIRE_READY");
		} else {
			state.maybeGainVerproc("VERFIRE_READY", 0.2);
		}
		state.gainColorMana({ b: 11 });
	},
});

makeSpell_RDM("SCORCH", 80, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.83,
	basePotency: [
		["NEVER", 680],
		["ENCHANTED_BLADE_MASTERY", 750],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 1,
	onConfirm: (state) => state.gainColorMana({ w: 4, b: 4 }),
	highlightIf: (state) => state.getFinisherCounter() === 1,
});

makeSpell_RDM("RESOLUTION", 90, {
	startOnHotbar: false,
	baseCastTime: 0,
	baseManaCost: 400,
	falloff: 0.6,
	applicationDelay: 1.56,
	basePotency: [
		["NEVER", 750],
		["ENCHANTED_BLADE_MASTERY", 850],
	],
	validateAttempt: (state) => state.getFinisherCounter() === 2,
	onConfirm: (state) => state.gainColorMana({ w: 4, b: 4 }),
	highlightIf: (state) => state.getFinisherCounter() === 2,
});

makeSpell_RDM("VERCURE", 54, {
	baseCastTime: 2.0,
	baseManaCost: 500,
	applicationDelay: 0.8,
	basePotency: 0,
});

makeSpell_RDM("VERRAISE", 64, {
	baseCastTime: 10,
	baseManaCost: 2400,
	applicationDelay: 0.81,
	basePotency: 0,
});

makeResourceAbility("RDM", "EMBOLDEN", 58, "cd_EMBOLDEN", {
	replaceIf: [
		{
			newSkill: "VICE_OF_THORNS",
			condition: (state) => state.hasResourceAvailable("THORNED_FLOURISH"),
		},
	],
	rscType: "EMBOLDEN",
	applicationDelay: 0.62,
	cooldown: 120,
	onApplication: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_EMBOLDEN")) {
			state.resources.get("THORNED_FLOURISH").gain(1);
			state.enqueueResourceDrop("THORNED_FLOURISH");
		}
	},
});

makeResourceAbility("RDM", "MANAFICATION", 60, "cd_MANAFICATION", {
	replaceIf: [
		{
			newSkill: "PREFULGENCE",
			condition: (state) => state.hasResourceAvailable("PREFULGENCE_READY"),
		},
	],
	rscType: "MANAFICATION",
	requiresCombat: true,
	applicationDelay: 0,
	cooldown: 110,
	onApplication: (state) => {
		state.resources.get("MAGICKED_SWORDPLAY").gain(3);
		state.enqueueResourceDrop("MAGICKED_SWORDPLAY");
		// Manification resets combos
		if (
			state.hasResourceAvailable("RDM_MELEE_COUNTER") ||
			state.hasResourceAvailable("RDM_FINISHER_COUNTER") ||
			state.hasResourceAvailable("RDM_AOE_COUNTER")
		) {
			controller.reportWarning(WarningType.ComboBreak);
		}
		state.setComboState("RDM_MELEE_COUNTER", 0);
		state.setComboState("RDM_FINISHER_COUNTER", 0);
		state.setComboState("RDM_AOE_COUNTER", 0);
	},
});

makeAbility_RDM("CORPS_A_CORPS", 6, "cd_CORPS_A_CORPS", {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: 130,
	cooldown: 35,
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

const flipPotency: Array<[TraitKey, number]> = [
	["NEVER", 130],
	["ENHANCED_DISPLACEMENT", 180],
];

makeAbility_RDM("ENGAGEMENT", 40, "cd_DISPLACEMENT", {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: flipPotency,
	cooldown: 35,
	maxCharges: 2,
});

makeAbility_RDM("DISPLACEMENT", 40, "cd_DISPLACEMENT", {
	isPhysical: true,
	applicationDelay: 0.62,
	potency: flipPotency,
	cooldown: 35,
	maxCharges: 2,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeAbility_RDM("FLECHE", 45, "cd_FLECHE", {
	isPhysical: true,
	applicationDelay: 1.16,
	potency: [
		["NEVER", 460],
		["ENCHANTED_BLADE_MASTERY", 480],
	],
	cooldown: 25,
});

makeAbility_RDM("CONTRE_SIXTE", 56, "cd_CONTRE_SIXTE", {
	isPhysical: true,
	falloff: 0,
	applicationDelay: 1.16,
	potency: [
		["NEVER", 380],
		["ENCHANTED_BLADE_MASTERY", 420],
	],
	cooldown: 35, // manually adjusted for traits in constructor
});

makeResourceAbility("RDM", "ACCELERATION", 50, "cd_ACCELERATION", {
	rscType: "ACCELERATION",
	applicationDelay: 0,
	cooldown: 55,
	maxCharges: 2,
	// acceleration buff grant is automatic from this declaration already
	onApplication: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_ACCELERATION_II")) {
			if (state.hasResourceAvailable("GRAND_IMPACT_READY")) {
				controller.reportWarning(WarningType.GIOverwrite);
			}
			state.resources.get("GRAND_IMPACT_READY").gain(1);
			state.enqueueResourceDrop("GRAND_IMPACT_READY");
		}
	},
});

makeResourceAbility("RDM", "MAGICK_BARRIER", 86, "cd_MAGICK_BARRIER", {
	rscType: "MAGICK_BARRIER",
	applicationDelay: 0,
	cooldown: 120,
});

makeAbility_RDM("VICE_OF_THORNS", 92, "cd_VICE_OF_THORNS", {
	startOnHotbar: false,
	falloff: 0.6,
	applicationDelay: 0.8,
	potency: 700,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("THORNED_FLOURISH"),
	onConfirm: (state) => state.tryConsumeResource("THORNED_FLOURISH"),
	highlightIf: (state) => state.hasResourceAvailable("THORNED_FLOURISH"),
});

makeAbility_RDM("PREFULGENCE", 100, "cd_PREFULGENCE", {
	startOnHotbar: false,
	falloff: 0.6,
	applicationDelay: 1.42,
	potency: 900,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("PREFULGENCE_READY"),
	onConfirm: (state) => state.tryConsumeResource("PREFULGENCE_READY"),
	highlightIf: (state) => state.hasResourceAvailable("PREFULGENCE_READY"),
});
