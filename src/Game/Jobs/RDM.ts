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
	NO_EFFECT,
	PotencyModifierFn,
	Spell,
	StatePredicate,
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

// makePCTResource(ResourceType.Portrait, 2);
// makePCTResource(ResourceType.Depictions, 3);
// makePCTResource(ResourceType.CreatureCanvas, 1, {default: 1});
// makePCTResource(ResourceType.WeaponCanvas, 1, {default: 1});
// makePCTResource(ResourceType.LandscapeCanvas, 1, {default: 1});
// makePCTResource(ResourceType.PaletteGauge, 100);
// makePCTResource(ResourceType.Paint, 5);

// makePCTResource(ResourceType.Aetherhues, 2, {timeout: 30.8});
// makePCTResource(ResourceType.MonochromeTones, 1);
// makePCTResource(ResourceType.SubtractivePalette, 3);
// makePCTResource(ResourceType.HammerTime, 3, {timeout: 30});
// makePCTResource(ResourceType.Inspiration, 1);
// makePCTResource(ResourceType.SubtractiveSpectrum, 1, {timeout: 30});
// makePCTResource(ResourceType.Hyperphantasia, 5, {timeout: 30});
// makePCTResource(ResourceType.RainbowBright, 1, {timeout: 30});
// makePCTResource(ResourceType.Starstruck, 1, {timeout: 20});
// makePCTResource(ResourceType.StarryMuse, 1, {timeout: 20.5});
// makePCTResource(ResourceType.TemperaCoat, 1, {timeout: 10});
// makePCTResource(ResourceType.TemperaGrassa, 1, {timeout: 10});
// makePCTResource(ResourceType.Smudge, 1, {timeout: 5});

// makePCTResource(ResourceType.Addle, 1, {timeout: 15});
// makePCTResource(ResourceType.Swiftcast, 1, {timeout: 10});
// makePCTResource(ResourceType.LucidDreaming, 1, {timeout: 21});
// makePCTResource(ResourceType.Surecast, 1, {timeout: 10});

// === JOB GAUGE AND STATE ===
export class RDMState extends GameState {
	constructor(config: GameConfig) {
		super(config);
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));
		
		this.registerRecurringEvents();
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
		(state, node) => {
			// Consume swift/triple before anything else happens.
			// The code here is dependent on short-circuiting logic to consume the correct resources.
			// Don't consume non-swiftcast resources yet.
			state.tryConsumeResource(ResourceType.Swiftcast)
		},
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
			// TODO
			state.hasResourceAvailable(ResourceType.Swiftcast)
		),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};

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
