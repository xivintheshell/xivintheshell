// Skill and state declarations for RDM.

import {controller} from "../../Controller/Controller";
import {ShellJob} from "../../Controller/Common";
import {Aspect, ResourceType, SkillName, WarningType} from "../Common";
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

export class RDMState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));
		
		this.registerRecurringEvents();
	}

	processDualcastAndInstants(name: SkillName) {
		// Instant consumption order:
		// Acceleration (if possible) -> Swift -> Dualcast
		// This depends on boolean short-circuiting logic
		const isInstant = (ACCELERATION_SKILLS.includes(name) && this.tryConsumeResource(ResourceType.Acceleration))
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
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeSpell_RDM = (name: SkillName, unlockLevel: number, params: {
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
	onApplication?: EffectFn<RDMState>,
}): Spell<RDMState> => {
	let onConfirm: EffectFn<RDMState> = combineEffects(
		(state) => state.processDualcastAndInstants(name),
		params.onConfirm ?? NO_EFFECT,
	);
	const onApplication: EffectFn<RDMState> = params.onApplication ?? NO_EFFECT;
	return makeSpell(ShellJob.RDM, name, unlockLevel, {
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
			name === SkillName.GrandImpact
			|| (ACCELERATION_SKILLS.includes(name) && state.hasResourceAvailable(ResourceType.Acceleration))
			|| state.hasResourceAvailable(ResourceType.Swiftcast)
			|| state.hasResourceAvailable(ResourceType.Dualcast)
		),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};

const makeMeleeComboHit = (name: SkillName, unlockLevel: number, params: {
	replaceIf: ConditionalSkillReplace<RDMState>[],
	startOnHotbar: boolean,
	basePotency: number | Array<[TraitName, number]>,
	applicationDelay: number,
	validateAttempt?: StatePredicate<RDMState>,
	onConfirm?: EffectFn<RDMState>,
	onApplication?: EffectFn<RDMState>,
}): Weaponskill<RDMState> => {
	// TODO
	return makeWeaponskill(ShellJob.RDM, name, unlockLevel, params);
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


makeSpell_RDM(SkillName.Jolt, 2, {
	baseCastTime: 2.5,
	baseManaCost: 200,
	applicationDelay: 0.80, // TODO
	basePotency: 170,
	onConfirm: (state) => state.gainColorMana({w: 2, b: 2}),
});
// makeSpell_RDM(SkillName.Jolt2, 62, {});
// makeSpell_RDM(SkillName.Jolt3, 84, {});

// makeSpell_RDM(SkillName.Verstone, 30, {});
// makeSpell_RDM(SkillName.Verfire, 26, {});
// makeSpell_RDM(SkillName.Veraero, 10, {});
// makeSpell_RDM(SkillName.Verthunder, 4, {});
// makeSpell_RDM(SkillName.Veraero3, 82, {});
// makeSpell_RDM(SkillName.Verthunder3, 82, {});
// makeSpell_RDM(SkillName.Veraero2, 22, {});
// makeSpell_RDM(SkillName.Verthunder2, 18, {});
// makeSpell_RDM(SkillName.Scatter, 15, {});
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
// makeSpell_RDM(SkillName.Verholy, 70, {});
// makeSpell_RDM(SkillName.Verflare, 68, {});
// makeSpell_RDM(SkillName.Scorch, 80, {});
// makeSpell_RDM(SkillName.Resolution, 90, {});
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
