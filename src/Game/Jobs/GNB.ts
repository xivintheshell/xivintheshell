// Skill and state declarations for GNB

import { controller } from "../../Controller/Controller";
import { ShellJob } from "../../Controller/Common";
import {
	BuffType,
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
    CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
    ResourceCalculationFn,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { getResourceInfo, makeResource, CoolDown, Event, EventTag, Resource, ResourceInfo } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { GNBCooldownType, GNBTraitList } from "../Constants/GNB";
import { stat } from "fs";
import { localizeResourceType } from "../../Components/Localization";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makeGNBResource = (
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource(ShellJob.GNB, rsc, maxValue, params ?? {});
};

makeGNBResource(ResourceType.PowderGauge, 3);
makeGNBResource(ResourceType.RoyalGuard, 1);

// TODO: get precise durations
makeGNBResource(ResourceType.NoMercy, 1, { timeout: 20} ); 
makeGNBResource(ResourceType.Aurora, 1, { timeout: 18 } );
makeGNBResource(ResourceType.BowShockDoT, 1, { timeout: 15 } );
makeGNBResource(ResourceType.Camouflage, 1, {timeout: 20 } );
makeGNBResource(ResourceType.HeartOfCorundum, 1, {timeout: 8} );
makeGNBResource(ResourceType.ClarityOfCorundum, 1, { timeout: 15 } );
makeGNBResource(ResourceType.CatharsisOfCorundum, 1, { timeout: 20 } );
makeGNBResource(ResourceType.Nebula, 1, { timeout: 15 } );
makeGNBResource(ResourceType.GreatNebula, 1, { timeout: 15 } );
makeGNBResource(ResourceType.HeartOfLight, 1, { timeout: 15 } );
makeGNBResource(ResourceType.HeartOfStone, 1, { timeout: 8 } );

makeGNBResource(ResourceType.ReadyToBlast, 1, { timeout: 10 } );
makeGNBResource(ResourceType.ReadyToBreak, 1, { timeout: 30 } );
makeGNBResource(ResourceType.ReadyToGouge, 1, { timeout: 10 } );
makeGNBResource(ResourceType.ReadyToRaze, 1, { timeout: 10 } );
makeGNBResource(ResourceType.ReadyToReign, 1, { timeout: 30 } );
makeGNBResource(ResourceType.ReadyToRip, 1, { timeout: 10 } );
makeGNBResource(ResourceType.ReadyToTear, 1, { timeout: 10 } );

makeGNBResource(ResourceType.SonicBreakDoT, 1, { timeout: 30 } );
makeGNBResource(ResourceType.Superbolide, 1, { timeout: 10 } );
makeGNBResource(ResourceType.BrutalShell, 1, { timeout: 30 } );

makeGNBResource(ResourceType.GNBComboTracker, 2, { timeout: 30 } );
makeGNBResource(ResourceType.GNBAOEComboTracker, 1, { timeout: 30 } );
makeGNBResource(ResourceType.GNBGnashingComboTracker, 2, { timeout: 30 } );
makeGNBResource(ResourceType.GNBReignComboTracker, 2, { timeout: 30 } );



// === JOB GAUGE AND STATE ===
const BASIC_COMBO_SKILLS: SkillName[] = [
	SkillName.KeenEdge,
    SkillName.BrutalShell,
    SkillName.SolidBarrel,
];

const AOE_COMBO_SKILLS: SkillName[] = [
    SkillName.DemonSlice,
    SkillName.DemonSlaughter,   
];

const GNASHING_COMBO_SKILLS: SkillName[] = [
	SkillName.GnashingFang,
	SkillName.SavageClaw,
	SkillName.WickedTalon,
];

const REIGN_COMBO_SKILLS: SkillName[] = [
    SkillName.ReignOfBeasts,
    SkillName.NobleBlood,
    SkillName.LionHeart,
];

export class GNBState extends GameState {
	constructor(config: GameConfig) {
		super(config);
        
        // Enhanced Aurora adds an additional charge
        const auroraStacks = this.hasTraitUnlocked(TraitName.EnhancedAurora) ? 2: 1;
        [
            new CoolDown(ResourceType.cd_Aurora, 60, auroraStacks, auroraStacks),
        ].forEach((cd) => this.cooldowns.set(cd));

        this.cooldowns.set(
            new CoolDown(ResourceType.cd_DoubleDown, this.config.adjustedSksGCD(60), 1, 1),
        );
        this.cooldowns.set(
            new CoolDown(ResourceType.cd_GnashingFang, this.config.adjustedSksGCD(30), 1, 1),
        );

        const powderGaugeMax = this.hasTraitUnlocked(TraitName.CartridgeChargeII) ? 3: 2;
        this.resources.set(
            new Resource(ResourceType.PowderGauge, powderGaugeMax, 0)
        );

        this.registerRecurringEvents([ 
            {
                groupedDots: [
                    {
                        dotName: ResourceType.SonicBreakDoT,
                        appliedBy: [SkillName.SonicBreak],
                    },
                ],
            },
            {
                groupedDots: [
                    {
                        dotName: ResourceType.BowShockDoT,
                        appliedBy: [SkillName.BowShock],
                    },
                ],
            },
        ]);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable(ResourceType.NoMercy)) {
			node.addBuff(BuffType.NoMercy);
		}
	}

    // handle all 4 GNB combo abilities and combo states
    fixGNBComboState(skillName: SkillName) {
        // HANDLE AOE DIFFERENTLY
        if (AOE_COMBO_SKILLS.includes(skillName)) {
            // reset basic, reign and gnashing trackers
            this.tryConsumeResource(ResourceType.GNBComboTracker, true);
            this.tryConsumeResource(ResourceType.GNBReignComboTracker, true);
            this.tryConsumeResource(ResourceType.GNBGnashingComboTracker, true);

            this.tryConsumeResource(ResourceType.GNBAOEComboTracker);
            if (skillName === SkillName.DemonSlice) {
                this.resources.get(ResourceType.GNBAOEComboTracker).gain(1);
                this.enqueueResourceDrop(ResourceType.GNBAOEComboTracker);
            } 
            return;
        } 

        // the other 3 combo types
        let resType = ResourceType.GNBComboTracker;
        let index = -1;
        if (BASIC_COMBO_SKILLS.includes(skillName)) {
            // reset aoe, reign and gnashing trackers
            this.tryConsumeResource(ResourceType.GNBAOEComboTracker, true);
            this.tryConsumeResource(ResourceType.GNBReignComboTracker, true);
            this.tryConsumeResource(ResourceType.GNBGnashingComboTracker, true);
            index = BASIC_COMBO_SKILLS.indexOf(skillName);
        } else if (GNASHING_COMBO_SKILLS.includes(skillName)) {
            // reset reign tracker
            this.tryConsumeResource(ResourceType.GNBReignComboTracker, true);
            resType = ResourceType.GNBGnashingComboTracker;
            index = GNASHING_COMBO_SKILLS.indexOf(skillName);
        } else if (REIGN_COMBO_SKILLS.includes(skillName)) {
            // reset gnashing tracker
            this.tryConsumeResource(ResourceType.GNBGnashingComboTracker, true);
            resType = ResourceType.GNBReignComboTracker;
            index = REIGN_COMBO_SKILLS.indexOf(skillName);
        } 
        // console.log("Skill: " + skillName + " Index: " + index);
        if (index === 0) {
            this.tryConsumeResource(resType, true);
            this.resources.get(resType).gain(1);
            this.enqueueResourceDrop(resType);
        } else if (index === 1) {
            if (this.resources.get(resType).availableAmount() === 1) {
                this.resources.get(resType).gain(1);
                this.enqueueResourceDrop(resType);
            } else {
                this.tryConsumeResource(resType, true);
            }
        } else if (index === 2) {
            this.tryConsumeResource(resType, true);
        }
    }

    // gain a cart
    gainCartridge(carts: number) {
        const maxCarts = this.hasTraitUnlocked(TraitName.CartridgeChargeII)? 3: 2;
        if (this.resources.get(ResourceType.PowderGauge).availableAmount() + carts > maxCarts) {
            controller.reportWarning(WarningType.CartridgeOvercap);
        }
        this.resources.get(ResourceType.PowderGauge).gain(carts);
    }

    refreshBuff(rscType: ResourceType, delay: number) {
		// buffs are applied on hit, so apply it after a delay
		this.addEvent(
			new Event("gain buff", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
			}),
		);
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeWeaponskill_GNB = (
	name: SkillName,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<GNBState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitName, number]>;
        recastTime?: number | ResourceCalculationFn<GNBState>;
		combo?: {
			potency: number | Array<[TraitName, number]>;
			resource: ResourceType;
            resourceValue: number;
		};
        falloff?: number;
		jobPotencyModifiers?: PotencyModifierFn<GNBState>;
		applicationDelay?: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<GNBState>;
        onExecute?: EffectFn<GNBState>;
		onConfirm?: EffectFn<GNBState>;
		highlightIf?: StatePredicate<GNBState>;
		onApplication?: EffectFn<GNBState>;
        secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<GNBState> => {
	const onConfirm: EffectFn<GNBState> = combineEffects(
		params.onConfirm ?? NO_EFFECT,
        (state) => {
            // fix gcd combo state
            if (name !== SkillName.SonicBreak) {
                state.fixGNBComboState(name);
            }

            // remove all continuation buffs if gcd is pressed before continuation
            state.tryConsumeResource(ResourceType.ReadyToBlast);
            state.tryConsumeResource(ResourceType.ReadyToRaze);
            state.tryConsumeResource(ResourceType.ReadyToRip);
            state.tryConsumeResource(ResourceType.ReadyToTear);
            state.tryConsumeResource(ResourceType.ReadyToGouge);
        },
	);
	const onApplication: EffectFn<GNBState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyMod: PotencyModifierFn<GNBState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill(ShellJob.GNB, name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		onApplication: onApplication,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
            if (params.combo && state.resources.get(params.combo.resource).availableAmount() === params.combo.resourceValue) {
                mods.push(makeComboModifier(getBasePotency(state, params.combo.potency) - getBasePotency(state, params.potency)));
            }
            if (state.hasResourceAvailable(ResourceType.NoMercy)) {
				mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

const makeAbility_GNB = (
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		autoUpgrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitName, number]>;
		replaceIf?: ConditionalSkillReplace<GNBState>[];
		highlightIf?: StatePredicate<GNBState>;
        falloff?: number;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<GNBState>;
		onConfirm?: EffectFn<GNBState>;
		onApplication?: EffectFn<GNBState>;
        secondaryCooldown?: CooldownGroupProperties;
        
	},
): Ability<GNBState> => {
	return makeAbility(ShellJob.GNB, name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable(ResourceType.NoMercy)) {
				mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

// GNB skill replacement conditions

const gnashingFangCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.GnashingFang,
    condition: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 0,
};

const savageClawCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.SavageClaw,
    condition: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 1,
};

const wickedTalonCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.WickedTalon,
    condition: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 2,
};

const reignOfBeastsCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.ReignOfBeasts,
    condition: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 0,
};

const nobleBloodCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.NobleBlood,
    condition: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 1,
};

const lionHeartCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.LionHeart,
    condition: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 2,
};

const hypervelocityCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.Hypervelocity,
    condition: (state) => state.hasResourceAvailable(ResourceType.ReadyToBlast),
};

const fatedBrandCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.FatedBrand,
    condition: (state) => state.hasResourceAvailable(ResourceType.ReadyToRaze),
};

const jugularRipCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.JugularRip,
    condition: (state) => state.hasResourceAvailable(ResourceType.ReadyToRip),
};

const abdomenTearCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.AbdomenTear,
    condition: (state) => state.hasResourceAvailable(ResourceType.ReadyToTear),
};

const eyeGougeCndition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.EyeGouge,
    condition: (state) => state.hasResourceAvailable(ResourceType.ReadyToGouge),
};

const royalGuardCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.RoyalGuard,
    condition: (state) => !state.hasResourceAvailable(ResourceType.RoyalGuard),
};

const releaseRoyalGuardCondition: ConditionalSkillReplace<GNBState> = {
    newSkill: SkillName.ReleaseRoyalGuard, 
    condition: (state) => state.hasResourceAvailable(ResourceType.RoyalGuard),
};


// GNB skill declarations

makeWeaponskill_GNB(SkillName.LightningShock, 15, {
	potency: 150,
	applicationDelay: 0.72,
});

makeWeaponskill_GNB(SkillName.KeenEdge, 1, {
    potency: [
		[TraitName.Never, 150],
		[TraitName.MeleeMasteryTank, 200],
		[TraitName.MeleeMasteryIITank, 300],
	],
    applicationDelay: 0.89,
});

makeWeaponskill_GNB(SkillName.BrutalShell, 4, {
    potency: [
		[TraitName.Never, 100],
		[TraitName.MeleeMasteryTank, 160],
		[TraitName.MeleeMasteryIITank, 240],
	],
    combo: {
		potency: [
			[TraitName.Never, 240],
			[TraitName.MeleeMasteryTank, 300],
			[TraitName.MeleeMasteryIITank, 380],
		],
		resource: ResourceType.GNBComboTracker,
        resourceValue: 1,
	},
    applicationDelay: 1.07,
    onConfirm: (state) => {
		// apply brutal shell buff if combo is 1
        if (state.resources.get(ResourceType.GNBComboTracker).availableAmount() === 1) {
            state.refreshBuff(ResourceType.BrutalShell, 0);
        }
	},
	highlightIf: (state) => state.resources.get(ResourceType.GNBComboTracker).availableAmount() === 1,
});

makeWeaponskill_GNB(SkillName.SolidBarrel, 26, {
    potency: [
		[TraitName.Never, 100],
		[TraitName.MeleeMasteryTank, 140],
		[TraitName.MeleeMasteryIITank, 240],
	],
    combo: {
		potency: [
			[TraitName.Never, 320],
			[TraitName.MeleeMasteryTank, 360],
			[TraitName.MeleeMasteryIITank, 460],
		],
		resource: ResourceType.GNBComboTracker,
        resourceValue: 2,
	},
    applicationDelay: 1.07,
    onConfirm: (state) => {
		// add cart if combo is 2
        if (state.resources.get(ResourceType.GNBComboTracker).availableAmount() === 2) {
            state.gainCartridge(1);
        }
	},
	highlightIf: (state) => state.resources.get(ResourceType.GNBComboTracker).availableAmount() === 2,
});

makeWeaponskill_GNB(SkillName.DemonSlice, 10, {
    potency: 100,
    falloff: 0,
    applicationDelay: 0.62,
});

makeWeaponskill_GNB(SkillName.DemonSlaughter, 40, {
    potency: 100,
    combo: {
        potency: 160,
        resource: ResourceType.GNBAOEComboTracker,
        resourceValue: 1,
    },
    falloff: 0,
    applicationDelay: 0.62,
    onConfirm: (state) => {
        if (state.resources.get(ResourceType.GNBAOEComboTracker).availableAmount() === 1) {
            state.gainCartridge(1);
        }
    },
    highlightIf: (state) => state.resources.get(ResourceType.GNBAOEComboTracker).availableAmount() === 1,
});

makeWeaponskill_GNB(SkillName.BurstStrike, 30, {
    potency: [
		[TraitName.Never, 400],
		[TraitName.MeleeMasteryIITank, 460],
	],
    applicationDelay: 0.71,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.PowderGauge);
        if (state.hasTraitUnlocked(TraitName.EnhancedContinuation)) {
            state.refreshBuff(ResourceType.ReadyToBlast, 0);
        }
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
});

makeWeaponskill_GNB(SkillName.FatedCircle, 72, {
    potency: 300,
    falloff: 0,
    applicationDelay: 0.54,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.PowderGauge);
        if (state.hasTraitUnlocked(TraitName.EnhancedContinuationII)) {
            state.refreshBuff(ResourceType.ReadyToRaze, 0);
        }
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
});

makeAbility_GNB(SkillName.Bloodfest, 76, ResourceType.cd_Bloodfest, { 
    applicationDelay: 0,
    cooldown: 120,
    maxCharges: 1,
    onConfirm: (state) => {
        const maxCarts = state.hasTraitUnlocked(TraitName.CartridgeChargeII)? 3:2;
        state.gainCartridge(maxCarts);
        if (state.hasTraitUnlocked(TraitName.EnhancedBloodfest)) {
            state.refreshBuff(ResourceType.ReadyToReign, 0);
        }
    },
});

makeAbility_GNB(SkillName.NoMercy, 2, ResourceType.cd_NoMercy, {
    applicationDelay: 0,
    cooldown: 60,
    maxCharges: 1,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.NoMercy, 0.62);
        state.refreshBuff(ResourceType.ReadyToBreak, 0);
    },
});

makeWeaponskill_GNB(SkillName.SonicBreak, 54, {
    potency: 300,
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToBreak),
    onConfirm: (state, node) => {
        state.tryConsumeResource(ResourceType.ReadyToBreak);

        const modifiers: PotencyModifier[] = [];
        if (state.hasResourceAvailable(ResourceType.NoMercy)) {
            modifiers.push(Modifiers.NoMercy)
        }

        const tickPotency = 60;

        state.addDoTPotencies({
            node,
            dotName: ResourceType.SonicBreakDoT,
            skillName: SkillName.SonicBreak,
            tickPotency,
            speedStat: "sks",
            modifiers,
        });
    },
    onApplication: (state, node) => state.applyDoT(ResourceType.SonicBreakDoT, node),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToBreak),
});

makeWeaponskill_GNB(SkillName.GnashingFang, 60, {
    replaceIf: [
		savageClawCondition,
        wickedTalonCondition,
	],
    potency: [
		[TraitName.Never, 380],
		[TraitName.MeleeMasteryIITank, 500],
	],
    applicationDelay: 0.62,
    recastTime: (state) => state.config.adjustedSksGCD(),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.ReadyToRip, 0);
        state.tryConsumeResource(ResourceType.PowderGauge);
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    secondaryCooldown: {
        cdName: ResourceType.cd_GnashingFang,
        cooldown: 30,
        maxCharges: 1,
    }
});

makeWeaponskill_GNB(SkillName.SavageClaw, 60, { 
    startOnHotbar: false,
    replaceIf: [
        gnashingFangCondition,
        wickedTalonCondition,
    ],
    potency: [ 
        [TraitName.Never, 460],
		[TraitName.MeleeMasteryIITank, 560],
    ],
    applicationDelay: 0.62,
    validateAttempt: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 1,
    onConfirm: (state) => { 
        state.refreshBuff(ResourceType.ReadyToTear, 0);
    },
    highlightIf: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 1,
});

makeWeaponskill_GNB(SkillName.WickedTalon, 60, { 
    startOnHotbar: false,
    replaceIf: [
        gnashingFangCondition,
        savageClawCondition,
    ],
    potency: [ 
        [TraitName.Never, 540],
		[TraitName.MeleeMasteryIITank, 620],
    ],
    applicationDelay: 1.16,
    validateAttempt: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 2,
    onConfirm: (state) => { 
        state.refreshBuff(ResourceType.ReadyToGouge, 0);
    },
    highlightIf: (state) => state.resources.get(ResourceType.GNBGnashingComboTracker).availableAmount() === 2,
});

makeWeaponskill_GNB(SkillName.DoubleDown, 90, {
    potency: 1200,
    falloff: 0.15,
    applicationDelay: 0.72,
    recastTime: (state) => state.config.adjustedSksGCD(),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.PowderGauge);
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.PowderGauge),
    secondaryCooldown: {
        cdName: ResourceType.cd_DoubleDown,
        cooldown: 60,
        maxCharges: 1,
    }
});

makeWeaponskill_GNB(SkillName.ReignOfBeasts, 100, { 
    replaceIf: [
		nobleBloodCondition,
        lionHeartCondition,
	],
    potency: 800,
    falloff: 0.6,
    applicationDelay: 1.16,
    validateAttempt: (state) =>state.hasResourceAvailable(ResourceType.ReadyToReign),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToReign);
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToReign),
});

makeWeaponskill_GNB(SkillName.NobleBlood, 100, { 
    startOnHotbar: false,
    replaceIf: [
        reignOfBeastsCondition,
        lionHeartCondition,
    ],
    potency: 1000,
    falloff: 0.6,
    applicationDelay: 1.65,
    validateAttempt: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 1,
    highlightIf: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 1,
});

makeWeaponskill_GNB(SkillName.LionHeart, 100, { 
    startOnHotbar: false,
    replaceIf: [
        reignOfBeastsCondition,
        nobleBloodCondition,
    ],
    potency: 1200,
    falloff: 0.6,
    applicationDelay: 1.79,
    validateAttempt: (state) =>state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 2,
    highlightIf: (state) => state.resources.get(ResourceType.GNBReignComboTracker).availableAmount() === 2,
});

makeAbility_GNB(SkillName.Continuation, 70, ResourceType.cd_Continuation, { 
    replaceIf: [
		hypervelocityCondition,
        fatedBrandCondition,
        jugularRipCondition,
        abdomenTearCondition,
        eyeGougeCndition, 
	],
    applicationDelay: 0,
    potency: 0,
    cooldown: 1,
    validateAttempt: (state) => false,
});

makeAbility_GNB(SkillName.Hypervelocity, 86, ResourceType.cd_Hypervelocity, { 
    startOnHotbar: false,
    applicationDelay: 0.76,
    potency: 200,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToBlast),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToBlast),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToBlast);
    },
});

makeAbility_GNB(SkillName.FatedBrand, 96, ResourceType.cd_FatedBrand, { 
    startOnHotbar: false,
    applicationDelay: 1.16,
    potency: 120,
    falloff: 0,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToRaze),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToRaze),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToRaze);
    }
});

makeAbility_GNB(SkillName.JugularRip, 70, ResourceType.cd_JugularRip, { 
    startOnHotbar: false,
    applicationDelay: 0.80,
    potency: 240,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToRip),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToRip),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToRip);
    }
});

makeAbility_GNB(SkillName.AbdomenTear, 70, ResourceType.cd_AbdomenTear, { 
    startOnHotbar: false,
    applicationDelay: 0.76,
    potency: 280,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToTear),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToTear),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToTear);
    }
});

makeAbility_GNB(SkillName.EyeGouge, 70, ResourceType.cd_EyeGouge, { 
    startOnHotbar: false,
    applicationDelay: 0.98,
    potency: 320,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ReadyToGouge),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ReadyToGouge),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ReadyToGouge);
    }
});



makeAbility_GNB(SkillName.DangerZone, 18, ResourceType.cd_DangerZone, { 
    autoUpgrade: {
		trait: TraitName.DangerZoneMastery,
		otherSkill: SkillName.BlastingZone,
	},
    applicationDelay: 0.62,
    potency: 250,
    cooldown: 30,
});

makeAbility_GNB(SkillName.BlastingZone, 80, ResourceType.cd_BlastingZone, { 
    startOnHotbar: false,
    applicationDelay: 0.62,
    potency: 800,
    cooldown: 30,
});

makeAbility_GNB(SkillName.BowShock, 62, ResourceType.cd_BowShock, { 
    applicationDelay: 0.62,
    potency: 150,
    falloff: 0,
    cooldown: 60,
    onConfirm: (state, node) => {

        const modifiers: PotencyModifier[] = [];
        if (state.hasResourceAvailable(ResourceType.NoMercy)) {
            modifiers.push(Modifiers.NoMercy)
        }

        const tickPotency = 60;

        state.addDoTPotencies({
            node,
            dotName: ResourceType.BowShockDoT,
            skillName: SkillName.BowShock,
            tickPotency,
            speedStat: "sks",
            modifiers,
        });
    },
    onApplication: (state, node) => state.applyDoT(ResourceType.BowShockDoT, node),
});

makeAbility_GNB(SkillName.Trajectory, 56, ResourceType.cd_Trajectory, { 
    animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
    cooldown: 30,
    maxCharges: 2
});


makeAbility_GNB(SkillName.HeartOfStone, 68, ResourceType.cd_HeartOfStone, { 
    autoUpgrade: {
		trait: TraitName.HeartOfStoneMastery,
		otherSkill: SkillName.HeartOfCorundum,
	},
    applicationDelay: 0.62,
    cooldown: 25,
    onApplication: (state) => { 
        state.refreshBuff(ResourceType.HeartOfStone, 0);
    },
});

makeAbility_GNB(SkillName.HeartOfCorundum, 82, ResourceType.cd_HeartOfCorundum, { 
    startOnHotbar: false,
    applicationDelay: 0.62,
    cooldown: 25,
    onApplication: (state) => {
        state.refreshBuff(ResourceType.CatharsisOfCorundum, 0);
        state.refreshBuff(ResourceType.HeartOfCorundum, 0);
        state.refreshBuff(ResourceType.ClarityOfCorundum, 0);
    },
});

makeAbility_GNB(SkillName.Superbolide, 50, ResourceType.cd_Superbolide, { 
    applicationDelay: 0,
    cooldown: 360,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.Superbolide, 0);
    },
});

makeAbility_GNB(SkillName.Camouflage, 6, ResourceType.cd_Camouflage, { 
    applicationDelay: 0.62,
    cooldown: 90,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.Camouflage, 0);
    },
});

makeAbility_GNB(SkillName.Nebula, 38, ResourceType.cd_Nebula, { 
    autoUpgrade: {
		trait: TraitName.NebulaMastery,
		otherSkill: SkillName.GreatNebula,
	},
    applicationDelay: 0.56,
    cooldown: 120,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.Nebula, 0);
    }
});

makeAbility_GNB(SkillName.GreatNebula, 38, ResourceType.cd_GreatNebula, { 
    startOnHotbar: false,
    applicationDelay: 0.56,
    cooldown: 120,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.GreatNebula, 0);
    },
});

makeAbility_GNB(SkillName.HeartOfLight, 64, ResourceType.cd_HeartOfLight, {
    applicationDelay: 0.62,
    cooldown: 60,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.HeartOfLight, 0);
    },
});

makeAbility_GNB(SkillName.Aurora, 45, ResourceType.cd_Aurora, { 
    applicationDelay: 0.62,
    cooldown: 60,
    onConfirm: (state) => {
        state.refreshBuff(ResourceType.Aurora, 0);
    },
    maxCharges: 2,

});

makeAbility_GNB(SkillName.RoyalGuard, 10, ResourceType.cd_RoyalGuard, {
    applicationDelay: 0,
    cooldown: 2,
    validateAttempt: (state) => !state.hasResourceAvailable(ResourceType.RoyalGuard),
    onConfirm: (state) => {
        state.resources.get(ResourceType.RoyalGuard).gain(1);
    },
    replaceIf: [
        releaseRoyalGuardCondition,
    ],
    secondaryCooldown: {
		cdName: ResourceType.cd_ReleaseRoyalGuard,
		cooldown: 1,
		maxCharges: 1,
	},
});

makeAbility_GNB(SkillName.ReleaseRoyalGuard, 10, ResourceType.cd_ReleaseRoyalGuard, { 
    startOnHotbar: false,
    replaceIf: [
        royalGuardCondition,
    ],
    applicationDelay: 0,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.RoyalGuard),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.RoyalGuard);
    },
    secondaryCooldown: {
		cdName: ResourceType.cd_RoyalGuard,
		cooldown: 2,
		maxCharges: 1,
	},
});
