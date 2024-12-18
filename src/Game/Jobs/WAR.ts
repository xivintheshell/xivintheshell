import { ShellJob } from "../../Controller/Common";
import { controller } from "../../Controller/Controller";
import { LevelSync, ResourceType, SkillName, TraitName, WarningType } from "../Common";
import {
	WARBuffTypes,
	WARCooldownType,
	WARGaugeTypes,
	WARResourceType,
	WARSkillName,
	WARTrackingType,
	WARTraitName,
} from "../Constants/WAR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, Event, getResourceInfo, makeResource, ResourceInfo } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperies,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeWeaponskill,
	NO_EFFECT,
	PotencyModifierFn,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { Traits } from "../Traits";

const makeWARResource = (
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource(ShellJob.WAR, rsc, maxValue, params ?? {});
};

// Gauge resources
makeWARResource(WARGaugeTypes.BeastGauge, 100);

// Status Effects
makeWARResource(WARBuffTypes.SurgingTempest, 1, { timeout: 60 });
makeWARResource(WARBuffTypes.NascentChaos, 1, { timeout: 30 });
makeWARResource(WARBuffTypes.InnerRelease, 3, { timeout: 15 });
makeWARResource(WARBuffTypes.InnerStrength, 1, { timeout: 15 });
makeWARResource(WARBuffTypes.BurgeoningFury, 3, { timeout: 30 });
makeWARResource(WARBuffTypes.Wrathful, 1, { timeout: 30 });
makeWARResource(WARBuffTypes.PrimalRendReady, 1, { timeout: 30 });
makeWARResource(WARBuffTypes.PrimalRuinationReady, 1, { timeout: 20 });

makeWARResource(WARBuffTypes.ThrillOfBattle, 1, { timeout: 10 });
makeWARResource(WARBuffTypes.Equilibrium, 1, { timeout: 15 });

makeWARResource(WARBuffTypes.RawIntuition, 1, { timeout: 6 });
makeWARResource(WARBuffTypes.Bloodwhetting, 1, { timeout: 8 });
makeWARResource(WARBuffTypes.StemTheFlow, 1, { timeout: 4 });
makeWARResource(WARBuffTypes.StemTheTide, 1, { timeout: 20 });
makeWARResource(WARBuffTypes.NascentFlash, 1, { timeout: 8 });

makeWARResource(WARBuffTypes.Vengeance, 1, { timeout: 15 });
makeWARResource(WARBuffTypes.Damnation, 1, { timeout: 15 });
makeWARResource(WARBuffTypes.PrimevalImpulse, 1, { timeout: 15 });

makeWARResource(WARBuffTypes.ShakeItOff, 1, { timeout: 30 });
makeWARResource(WARBuffTypes.ShakeItOffOverTime, 1, { timeout: 15 });

makeWARResource(WARBuffTypes.Holmgang, 1, { timeout: 10 });

makeWARResource(WARBuffTypes.Defiance, 1);

// Combos & other tracking
makeWARResource(WARTrackingType.StormCombo, 2, { timeout: 30 });
makeWARResource(WARTrackingType.TempestCombo, 1, { timeout: 30 });

const STORM_COMBO_GCDS: SkillName[] = [
	WARSkillName.HeavySwing,
	WARSkillName.Maim,
	WARSkillName.StormsEye,
	WARSkillName.StormsPath,
];

const TEMPEST_COMBO_GCDS: SkillName[] = [WARSkillName.Overpower, WARSkillName.MythrilTempest];

const COMBO_GCDS: SkillName[] = [...STORM_COMBO_GCDS, ...TEMPEST_COMBO_GCDS];

// Weaponskills that consume Inner Release stacks.
// Additionally, they increase Burgeoning Fury count on-hit
const INNER_RELEASE_GCDS: SkillName[] = [WARSkillName.FellCleave, WARSkillName.Decimate];

const BUFFS_DISPELLED_BY_SHAKE_IT_OFF: WARBuffTypes[] = [
	WARBuffTypes.ThrillOfBattle,
	WARBuffTypes.Damnation,
	WARBuffTypes.Bloodwhetting,
	WARBuffTypes.Vengeance,
	WARBuffTypes.RawIntuition,
];

export class WARState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Enhanced Onslaught adds an additional charge
		if (Traits.hasUnlocked(WARTraitName.EnhancedOnslaught, config.level)) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_Onslaught, 30, 3, 3));
		}

		this.registerRecurringEvents();
	}

	processComboStatus(skill: SkillName) {
		if (!COMBO_GCDS.includes(skill)) {
			return;
		} // WAR's non-combo GCDs don't break an ongoing combo

		const isTempestCombo = TEMPEST_COMBO_GCDS.includes(skill);
		const combo = isTempestCombo ? WARTrackingType.TempestCombo : WARTrackingType.StormCombo;

		// break the opposite-combo's state
		const brokenCombo = isTempestCombo
			? WARTrackingType.StormCombo
			: WARTrackingType.TempestCombo;
		this.setComboState(brokenCombo, 0);

		// increment or break the current combo's state
		let comboState = this.resources.get(combo).availableAmount();
		let nextState = 0;
		if (isTempestCombo) {
			if (skill === SkillName.Overpower) {
				nextState = 1;
			}
		} else {
			if (skill === SkillName.HeavySwing) {
				nextState = 1;
			} else if (comboState === 1 && skill === SkillName.Maim) {
				nextState = 2;
			}
		}
		this.setComboState(combo, nextState);
	}

	hasComboStatus(
		comboName: WARTrackingType.StormCombo | WARTrackingType.TempestCombo,
		state: number,
	): boolean {
		return this.resources.get(comboName).availableAmount() === state;
	}

	gainBeastGauge(amount: number) {
		const resource = this.resources.get(ResourceType.BeastGauge);
		if (resource.availableAmount() + amount > resource.maxValue) {
			controller.reportWarning(WarningType.BeastGaugeOvercap);
		}
		resource.gain(amount);
	}

	gainProc(proc: WARResourceType, amount?: number) {
		const duration = (getResourceInfo(ShellJob.WAR, proc) as ResourceInfo).maxTimeout;
		if (this.hasResourceAvailable(proc)) {
			if (proc === WARResourceType.BurgeoningFury) {
				this.resources.get(proc).gain(1);
			}
			this.resources.get(proc).overrideTimer(this, duration);
		} else {
			this.resources.get(proc).gain(amount ?? 1);
			if (duration) {
				this.enqueueResourceDrop(proc, duration);
			}
		}
	}

	gainSurgingTempest(duration: number) {
		const resource = this.resources.get(ResourceType.SurgingTempest);
		const maxDuration = (
			getResourceInfo(ShellJob.WAR, ResourceType.SurgingTempest) as ResourceInfo
		).maxTimeout;
		const newDuration = (resource.pendingChange?.timeTillEvent ?? 0.0) + duration;
		resource.overrideTimer(this, newDuration >= maxDuration ? maxDuration : newDuration);
	}

	gainSurgingTempestGCD(duration: number, delay: number, bonusDuration: number) {
		if (this.hasResourceAvailable(ResourceType.SurgingTempest)) {
			this.addEvent(
				new Event("surging tempest refresh", delay, () => {
					// buff may drop while event is queued
					if (this.hasResourceAvailable(ResourceType.SurgingTempest)) {
						this.gainSurgingTempest(duration);
					} else {
						this.resources.get(ResourceType.SurgingTempest).gain(1);
						this.enqueueResourceDrop(ResourceType.SurgingTempest, duration);
					}
				}),
			);
			// Surging Tempest is applied immediately with bonus duration if not already active
		} else {
			this.resources.get(ResourceType.SurgingTempest).gain(1);
			this.enqueueResourceDrop(ResourceType.SurgingTempest, duration + bonusDuration);
		}
	}
}

const makeWeaponskill_WAR = (
	name: SkillName,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<WARState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitName, number]>;
		combo?: {
			potency: number | Array<[TraitName, number]>;
			resource: WARTrackingType;
			resourceValue: number;
		};
		jobPotencyModifiers?: PotencyModifierFn<WARState>;
		applicationDelay?: number;
		validateAttempt?: StatePredicate<WARState>;
		onConfirm?: EffectFn<WARState>;
		highlightIf?: StatePredicate<WARState>;
		onApplication?: EffectFn<WARState>;
	},
): Weaponskill<WARState> => {
	const onConfirm: EffectFn<WARState> = combineEffects(
		params.onConfirm ?? NO_EFFECT,
		(state) => state.processComboStatus(name),
		// All Weaponskills affected by Inner Release will consume Inner Release stacks
		// and grant Burgeoning Fury stacks.
		(state) => {
			if (INNER_RELEASE_GCDS.includes(name)) {
				if (state.tryConsumeResource(ResourceType.InnerRelease)) {
					if (Traits.hasUnlocked(TraitName.EnhancedInnerRelease, state.config.level)) {
						state.gainProc(ResourceType.BurgeoningFury);
						if (state.hasResourceAvailable(ResourceType.BurgeoningFury, 3)) {
							state.gainProc(ResourceType.Wrathful);
							state.tryConsumeResource(ResourceType.BurgeoningFury, true);
						}
					}
				}
			}
		},
	);
	const onApplication: EffectFn<WARState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyMod: PotencyModifierFn<WARState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill(ShellJob.WAR, name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		onApplication: onApplication,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (
				params.combo &&
				state.hasComboStatus(params.combo.resource, params.combo.resourceValue)
			) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}
			if (state.hasResourceAvailable(ResourceType.SurgingTempest)) {
				mods.push(Modifiers.SurgingTempest);
			}
			if (
				state.hasResourceAvailable(ResourceType.InnerRelease) &&
				INNER_RELEASE_GCDS.includes(name)
			) {
				mods.push(Modifiers.AutoCDH);
			}
			return mods;
		},
	});
};

const makeAbility_WAR = (
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		autoUpgrade?: SkillAutoReplace;
		potency?: number | Array<[TraitName, number]>;
		replaceIf?: ConditionalSkillReplace<WARState>[];
		highlightIf?: StatePredicate<WARState>;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<WARState>;
		onConfirm?: EffectFn<WARState>;
		onApplication?: EffectFn<WARState>;
		secondaryCooldown?: CooldownGroupProperies;
	},
): Ability<WARState> => {
	return makeAbility(ShellJob.WAR, name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable(ResourceType.SurgingTempest)) {
				mods.push(Modifiers.SurgingTempest);
			}
			return mods;
		},
	});
};

makeWeaponskill_WAR(WARSkillName.Tomahawk, 15, {
	potency: 150,
	applicationDelay: 0.71,
});

makeWeaponskill_WAR(SkillName.HeavySwing, 1, {
	potency: [
		[TraitName.Never, 150],
		[TraitName.MeleeMasteryTank, 200],
		[TraitName.MeleeMasteryIITank, 220],
	],
	applicationDelay: 0.53,
});

makeWeaponskill_WAR(SkillName.Maim, 4, {
	potency: [
		[TraitName.Never, 100],
		[TraitName.MeleeMasteryTank, 150],
		[TraitName.MeleeMasteryIITank, 190],
	],
	combo: {
		potency: [
			[TraitName.Never, 250],
			[TraitName.MeleeMasteryTank, 300],
			[TraitName.MeleeMasteryIITank, 340],
		],
		resource: WARTrackingType.StormCombo,
		resourceValue: 1,
	},
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.hasComboStatus(WARTrackingType.StormCombo, 1)) {
			state.gainBeastGauge(10);
		}
	},
	highlightIf: (state) => state.hasComboStatus(WARTrackingType.StormCombo, 1),
});

makeWeaponskill_WAR(SkillName.StormsPath, 26, {
	potency: [
		[TraitName.Never, 100],
		[TraitName.MeleeMasteryTank, 160],
		[TraitName.MeleeMasteryIITank, 200],
	],
	combo: {
		potency: [
			[TraitName.Never, 380],
			[TraitName.MeleeMasteryTank, 440],
			[TraitName.MeleeMasteryIITank, 480],
		],
		resource: WARTrackingType.StormCombo,
		resourceValue: 2,
	},
	applicationDelay: 1.52,
	onConfirm: (state) => {
		if (state.hasComboStatus(WARTrackingType.StormCombo, 2)) {
			state.gainBeastGauge(20);
		}
	},
	highlightIf: (state) => state.hasComboStatus(WARTrackingType.StormCombo, 2),
});

makeWeaponskill_WAR(SkillName.StormsEye, 50, {
	potency: [
		[TraitName.Never, 100],
		[TraitName.MeleeMasteryTank, 160],
		[TraitName.MeleeMasteryIITank, 200],
	],
	combo: {
		potency: [
			[TraitName.Never, 380],
			[TraitName.MeleeMasteryTank, 440],
			[TraitName.MeleeMasteryIITank, 480],
		],
		resource: WARTrackingType.StormCombo,
		resourceValue: 2,
	},
	applicationDelay: 0.62,
	onConfirm: (state) => {
		if (state.hasComboStatus(WARTrackingType.StormCombo, 2)) {
			state.gainBeastGauge(10);
			state.gainSurgingTempestGCD(30, 0.62, 1.7);
		}
	},
	highlightIf: (state) => state.hasComboStatus(WARTrackingType.StormCombo, 2),
});

makeWeaponskill_WAR(SkillName.Overpower, 10, {
	potency: 110,
	applicationDelay: 0.62,
});

makeWeaponskill_WAR(SkillName.MythrilTempest, 40, {
	potency: 100,
	combo: {
		potency: 140,
		resource: WARTrackingType.TempestCombo,
		resourceValue: 1,
	},
	applicationDelay: 0.49,
	onConfirm: (state) => {
		if (state.hasComboStatus(WARTrackingType.TempestCombo, 1)) {
			state.gainBeastGauge(20);
			state.gainSurgingTempestGCD(30, 0.49, 0.45);
		}
	},
	highlightIf: (state) => state.hasComboStatus(WARTrackingType.TempestCombo, 1),
});

function reduceInfuriateCooldown(state: WARState) {
	const cooldown = state.cooldowns.get(ResourceType.cd_Infuriate) as CoolDown;
	cooldown.restore(state, 5);
}

makeWeaponskill_WAR(SkillName.FellCleave, 54, {
	potency: [
		[TraitName.Never, 520],
		[TraitName.MeleeMasteryIITank, 580],
	],
	applicationDelay: 0.62,
	validateAttempt: (state) => {
		return (
			state.resources.get(ResourceType.BeastGauge).available(50) ||
			state.resources.get(ResourceType.InnerRelease).available(1)
		);
	},
	onConfirm: (state) => {
		if (!state.hasResourceAvailable(ResourceType.InnerRelease)) {
			state.resources.get(ResourceType.BeastGauge).consume(50);
		}
		reduceInfuriateCooldown(state);
	},
	replaceIf: [
		{
			newSkill: SkillName.InnerChaos,
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable(ResourceType.NascentChaos);
			},
		},
	],
	highlightIf: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.BeastGauge, 50) ||
			state.hasResourceAvailable(ResourceType.InnerRelease)
		);
	},
});

makeWeaponskill_WAR(SkillName.Decimate, 60, {
	potency: 180,
	applicationDelay: 1.83,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.BeastGauge, 50) ||
			state.hasResourceAvailable(ResourceType.InnerRelease)
		);
	},
	onConfirm: (state) => {
		if (!state.tryConsumeResource(ResourceType.InnerRelease)) {
			state.resources.get(ResourceType.BeastGauge).consume(50);
		}
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.BeastGauge, 50) ||
			state.hasResourceAvailable(ResourceType.InnerRelease)
		);
	},
	replaceIf: [
		{
			newSkill: SkillName.ChaoticCyclone,
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable(ResourceType.NascentChaos);
			},
		},
	],
});

makeAbility_WAR(SkillName.InnerRelease, 70, ResourceType.cd_InnerRelease, {
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 1,
	onConfirm: (state) => {
		state.gainProc(ResourceType.InnerRelease, 3);
		state.gainProc(ResourceType.InnerStrength);
		if (state.hasResourceAvailable(ResourceType.SurgingTempest)) {
			state.gainSurgingTempest(10);
		}
		if (state.config.level >= LevelSync.lvl90) {
			state.gainProc(ResourceType.PrimalRendReady);
		}
	},
	validateAttempt: (state) => state.isInCombat(),
	replaceIf: [
		{
			newSkill: SkillName.PrimalWrath,
			condition: (state) => state.hasResourceAvailable(ResourceType.Wrathful),
		},
	],
});

makeWeaponskill_WAR(SkillName.PrimalRend, 90, {
	potency: 700,
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PrimalRendReady),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.PrimalRendReady);
		if (Traits.hasUnlocked(WARTraitName.EnhancedPrimalRend, state.config.level)) {
			state.gainProc(WARResourceType.PrimalRuinationReady);
		}
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.PrimalRendReady),
	replaceIf: [
		{
			newSkill: SkillName.PrimalRuination,
			condition: (state: Readonly<WARState>): boolean => {
				return state.hasResourceAvailable(ResourceType.PrimalRuinationReady);
			},
		},
	],
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR(SkillName.PrimalWrath, 96, WARCooldownType.cd_PrimalWrath, {
	startOnHotbar: false,
	potency: 700,
	applicationDelay: 1.15,
	cooldown: 1.0,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Wrathful),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Wrathful),
	highlightIf: (state) => true,
});

makeWeaponskill_WAR(SkillName.PrimalRuination, 100, {
	startOnHotbar: false,
	potency: 780,
	applicationDelay: 1.06,
	validateAttempt: (state) => {
		return state.hasResourceAvailable(ResourceType.PrimalRuinationReady);
	},
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.PrimalRuinationReady);
	},
	highlightIf: (state) => true,
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR(SkillName.Infuriate, 50, ResourceType.cd_Infuriate, {
	applicationDelay: 0,
	cooldown: 60,
	maxCharges: 2,
	onApplication: (state) => {
		state.gainBeastGauge(50);
		if (Traits.hasUnlocked(WARTraitName.NascentChaos, state.config.level)) {
			state.gainProc(ResourceType.NascentChaos);
		}
	},
	validateAttempt: (state) => state.isInCombat(),
});

makeWeaponskill_WAR(SkillName.InnerChaos, 80, {
	startOnHotbar: false,
	potency: 660,
	applicationDelay: 0.94,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.BeastGauge, 50) &&
			state.hasResourceAvailable(ResourceType.NascentChaos)
		);
	},
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.NascentChaos);
		state.resources.get(ResourceType.BeastGauge).consume(50);
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.BeastGauge, 50),
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeWeaponskill_WAR(SkillName.ChaoticCyclone, 72, {
	startOnHotbar: false,
	potency: 300,
	applicationDelay: 1.43,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.BeastGauge, 50) &&
			state.hasResourceAvailable(ResourceType.NascentChaos)
		);
	},
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.NascentChaos);
		state.resources.get(ResourceType.BeastGauge).consume(50);
		reduceInfuriateCooldown(state);
	},
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.BeastGauge, 50),
	jobPotencyModifiers: (state) => [Modifiers.AutoCDH],
});

makeAbility_WAR(WARSkillName.Onslaught, 62, WARCooldownType.cd_Onslaught, {
	potency: 150,
	applicationDelay: 0.63,
	cooldown: 30,
	maxCharges: 2, // set in constructor to be 3 with trait
});

makeAbility_WAR(WARSkillName.Upheaval, 64, WARCooldownType.cd_Upheaval, {
	potency: 400,
	applicationDelay: 0.62,
	cooldown: 30,
});

makeAbility_WAR(WARSkillName.Orogeny, 86, WARCooldownType.cd_Upheaval, {
	potency: 150,
	applicationDelay: 0.62,
	cooldown: 30,
});

// TODO: when boss attacks are tracked, apply Vengance/Damnation's phys. reflection
makeResourceAbility(ShellJob.WAR, SkillName.Vengeance, 38, ResourceType.cd_Vengeance, {
	rscType: WARResourceType.Vengeance,
	autoUpgrade: { trait: TraitName.VengeanceMastery, otherSkill: SkillName.Damnation },
	cooldown: 120,
	applicationDelay: 0.62,
});

makeResourceAbility(ShellJob.WAR, SkillName.Damnation, 92, ResourceType.cd_Vengeance, {
	rscType: WARResourceType.Damnation,
	autoDowngrade: { trait: TraitName.VengeanceMastery, otherSkill: SkillName.Vengeance },
	cooldown: 120,
	applicationDelay: 0.62,
});

makeResourceAbility(ShellJob.WAR, SkillName.RawIntuition, 56, ResourceType.cd_RawIntuition, {
	rscType: WARResourceType.RawIntuition,
	autoUpgrade: { trait: TraitName.RawIntuitionMastery, otherSkill: SkillName.BloodWhetting },
	cooldown: 25,
	applicationDelay: 0.45,
});

makeResourceAbility(ShellJob.WAR, SkillName.BloodWhetting, 82, ResourceType.cd_RawIntuition, {
	rscType: WARResourceType.Bloodwhetting,
	autoDowngrade: { trait: TraitName.RawIntuitionMastery, otherSkill: SkillName.RawIntuition },
	onApplication: (state: WARState) => {
		state.gainProc(WARBuffTypes.StemTheFlow);
		state.gainProc(WARBuffTypes.StemTheTide);
	},
	cooldown: 25,
	applicationDelay: 0.45,
});

makeAbility(ShellJob.WAR, SkillName.NascentFlash, 76, ResourceType.cd_RawIntuition, {
	onApplication: (state: WARState) => {
		let duration = 6;
		if (Traits.hasUnlocked(WARTraitName.EnhancedNascentFlash, state.config.level)) {
			duration = 8;
		}
		state.resources.get(ResourceType.NascentFlash).gain(1);
		state.enqueueResourceDrop(ResourceType.NascentFlash, duration);
	},
	cooldown: 25,
	// based on Bloodwhetting
	applicationDelay: 0.45,
});

makeResourceAbility(ShellJob.WAR, SkillName.Holmgang, 45, ResourceType.cd_Holmgang, {
	rscType: ResourceType.Holmgang,
	cooldown: 240,
	applicationDelay: 0.45,
});

makeResourceAbility(ShellJob.WAR, SkillName.ThrillOfBattle, 30, ResourceType.cd_ThrillOfBattle, {
	rscType: ResourceType.ThrillOfBattle,
	cooldown: 90,
	applicationDelay: 0.62,
});

makeAbility(ShellJob.WAR, SkillName.Equilibrium, 58, ResourceType.cd_Equilibrium, {
	cooldown: 60,
	applicationDelay: 0.62,
	onApplication: (state: WARState) => {
		if (Traits.hasUnlocked(TraitName.EnhancedEquilibrium, state.config.level)) {
			state.gainProc(WARResourceType.Equilibrium);
		}
	},
});

makeResourceAbility(ShellJob.WAR, SkillName.ShakeItOff, 68, ResourceType.cd_ShakeItOff, {
	rscType: ResourceType.ShakeItOff,
	cooldown: 90,
	onApplication: (state: WARState, node) => {
		let dispellCount = 0;
		BUFFS_DISPELLED_BY_SHAKE_IT_OFF.forEach((buff) => {
			if (state.tryConsumeResource(buff)) {
				dispellCount += 1;
			}
		});
		// Barrier potencies aren't tracked, each buff dispelled
		// increases the shield strength by a flat 2% of WAR's max HP
		console.debug(`Shake It Off dispelled ${dispellCount} buffs`);
		state.gainProc(WARResourceType.ShakeItOffOverTime);
	},
	applicationDelay: 0,
});

makeAbility(ShellJob.WAR, SkillName.Defiance, 10, ResourceType.cd_Defiance, {
	cooldown: 2,
	maxCharges: 1,
	applicationDelay: 0,
	validateAttempt: (state) => !state.hasResourceAvailable(ResourceType.Defiance),
	onConfirm: (state: WARState) => state.resources.get(ResourceType.Defiance).gain(1),
	replaceIf: [
		{
			newSkill: SkillName.ReleaseDefiance,
			condition: (state) => state.hasResourceAvailable(ResourceType.Defiance),
		},
	],
	secondaryCooldown: {
		cdName: ResourceType.cd_ReleaseDefiance,
		cooldown: 1,
		maxCharges: 1,
	},
});

makeAbility(ShellJob.WAR, SkillName.ReleaseDefiance, 10, ResourceType.cd_ReleaseDefiance, {
	startOnHotbar: false,
	cooldown: 1,
	maxCharges: 1,
	secondaryCooldown: {
		cdName: ResourceType.cd_Defiance,
		cooldown: 2,
		maxCharges: 1,
	},
	applicationDelay: 0,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Defiance),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.Defiance),
});
