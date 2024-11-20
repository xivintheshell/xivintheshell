import { ShellJob } from "../../Controller/Common";
import { controller } from "../../Controller/Controller";
import { ResourceType, SkillName, WarningType } from "../Common";
import { MCHResourceType } from "../Constants/MCH";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, getResourceInfo, makeResource, ResourceInfo } from "../Resources";
import { Ability, combineEffects, ConditionalSkillReplace, CooldownGroupProperies, EffectFn, getBasePotency, makeAbility, makeResourceAbility, makeWeaponskill, NO_EFFECT, ResourceCalculationFn, SkillAutoReplace, StatePredicate, Weaponskill } from "../Skills";
import { TraitName, Traits } from "../Traits";

const makeMCHResource = (rsc: ResourceType, maxValue: number, params? : {timeout?: number, default?: number}) => {
    makeResource(ShellJob.MCH, rsc, maxValue, params ?? {});
}

// Gauge resources
makeMCHResource(ResourceType.HeatGauge, 100)
makeMCHResource(ResourceType.BatteryGauge, 100)
makeMCHResource(ResourceType.QueenTime, 15)

// Status Effects
makeMCHResource(ResourceType.Reassembled, 1, {timeout: 5})
makeMCHResource(ResourceType.Overheated, 5, {timeout: 10, default: 5})
makeMCHResource(ResourceType.Wildfire, 1, {timeout: 10}) 
makeMCHResource(ResourceType.WildfireSelf, 1, {timeout: 10}) 
makeMCHResource(ResourceType.Flamethrower, 1, {timeout: 10})
makeMCHResource(ResourceType.Bioblaster, 1, {timeout: 15})
makeMCHResource(ResourceType.Tactician, 1, {timeout: 15})
makeMCHResource(ResourceType.Hypercharged, 1, {timeout: 30}) 
makeMCHResource(ResourceType.ExcavatorReady, 1, {timeout: 30})
makeMCHResource(ResourceType.FullMetalMachinist, 1, {timeout: 30}) 

makeMCHResource(ResourceType.ArmsLength, 1, {timeout: 6.5})

// Combos & other tracking
makeMCHResource(ResourceType.HeatCombo, 2, {timeout: 30})


const COMBO_GCDS: SkillName[] = [SkillName.HeatedCleanShot, SkillName.HeatedSlugShot, SkillName.HeatedSplitShot]
export class MCHState extends GameState {
    constructor (config: GameConfig) {
        super(config)

        // Unlike standard and technical, Air Anchor and Chain Saw's cooldowns are affected by skill speed
        this.cooldowns.set(new CoolDown(ResourceType.cd_AirAnchor, this.config.adjustedSksGCD(40), 1, 1))
        this.cooldowns.set(new CoolDown(ResourceType.cd_Chainsaw, this.config.adjustedSksGCD(60), 1, 1))

        this.registerRecurringEvents();
    }

    processComboStatus(skill: SkillName) {
        if (!COMBO_GCDS.includes(skill)) { return; } // MCH's non-combo GCDs don't break an ongoing combo

        const comboState = this.resources.get(ResourceType.HeatCombo).availableAmount();

        let nextState = 0
        if (comboState === 0 && skill === SkillName.HeatedSplitShot) {
            nextState = 1
        } else if (comboState === 1 && skill === SkillName.HeatedSlugShot) {
            nextState = 2
        }

        this.setComboState(ResourceType.HeatCombo, nextState);
    }

    gainResource(rscType: typeof ResourceType.HeatGauge | typeof ResourceType.BatteryGauge, amount: number) {
        const resource = this.resources.get(rscType)
        if (resource.availableAmount() + amount > resource.maxValue) {
            controller.reportWarning(rscType === ResourceType.HeatGauge ? WarningType.HeatOvercap : WarningType.BatteryOvercap)
        }
        this.resources.get(rscType).gain(amount)
    }

    gainProc(proc: MCHResourceType) {
        const duration = (getResourceInfo(ShellJob.MCH, proc) as ResourceInfo).maxTimeout;
        if (this.resources.get(proc).available(1)) {
            this.resources.get(proc).overrideTimer(this, duration);
        } else {
            this.resources.get(proc).gain(1);
            this.enqueueResourceDrop(proc, duration);
        }
    }
}

const makeWeaponskill_MCH = (name: SkillName, unlockLevel: number, params: {
	autoUpgrade?: SkillAutoReplace,
    assetPath?: string,
    replaceIf?: ConditionalSkillReplace<MCHState>[],
    startOnHotbar?: boolean,
    potency?: number | Array<[TraitName, number]>,
    combo?: {
        potency: number | Array<[TraitName, number]>,
        resource: ResourceType,
        resourceValue: number,
    },
    recastTime: number | ResourceCalculationFn<MCHState>,
    applicationDelay?: number,
    validateAttempt?: StatePredicate<MCHState>,
    onConfirm?: EffectFn<MCHState>,
    highlightIf?: StatePredicate<MCHState>,
    secondaryCooldown?: CooldownGroupProperies,
}): Weaponskill<MCHState> => {
    const onConfirm: EffectFn<MCHState> = combineEffects(
        params.onConfirm ?? NO_EFFECT,
        (state) => state.processComboStatus(name),
        (state) => {
            if (name !== SkillName.FullMetalField) {
                state.tryConsumeResource(ResourceType.Reassembled)
            }
        }
    );
    return makeWeaponskill(ShellJob.MCH, name, unlockLevel, {
        ...params,
        onConfirm: onConfirm,
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = [];
            if (params.combo && state.resources.get(params.combo.resource).availableAmount() === params.combo.resourceValue) {
                mods.push(makeComboModifier(getBasePotency(state, params.combo.potency) - getBasePotency(state, params.potency)));
            }
            if (state.hasResourceAvailable(ResourceType.Reassembled) || name === SkillName.FullMetalField) {
                mods.push(Modifiers.AutoCDH)
            }
            return mods;
        },
    });
}

const makeAbility_MCH = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
    potency?: number | Array<[TraitName, number]>,
    replaceIf?: ConditionalSkillReplace<MCHState>[],
    highlightIf?: StatePredicate<MCHState>,
    startOnHotbar?: boolean,
    applicationDelay?: number,
    cooldown: number,
    maxCharges?: number,
    validateAttempt?: StatePredicate<MCHState>,
    onConfirm?: EffectFn<MCHState>,
    onApplication?: EffectFn<MCHState>,
    secondaryCooldown?: CooldownGroupProperies,
}): Ability<MCHState> => {
    const onConfirm: EffectFn<MCHState> = combineEffects(
        (state) => state.tryConsumeResource(ResourceType.Improvisation),
        params.onConfirm ?? NO_EFFECT,
    );
    return makeAbility(ShellJob.MCH, name, unlockLevel, cdName, {
        ...params,
        onConfirm: onConfirm,
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = [];
            return mods;
        },
    });
}

const makeResourceAbility_MCH = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
    rscType: ResourceType,
    replaceIf?: ConditionalSkillReplace<MCHState>[],
    applicationDelay: number,
    cooldown: number,
    maxCharges?: number,
    validateAttempt?: StatePredicate<MCHState>,
    onConfirm?: EffectFn<MCHState>
    onApplication?: EffectFn<MCHState>,
    secondaryCooldown?: CooldownGroupProperies,
}): Ability<MCHState> => {
    const onConfirm: EffectFn<MCHState> = combineEffects(
        params.onConfirm ?? NO_EFFECT,
    );
    return makeResourceAbility(ShellJob.MCH, name, unlockLevel, cdName, {
        ...params,
        onConfirm
    });
}

makeWeaponskill_MCH(SkillName.HeatedSplitShot, 54, {
    potency: [
        [TraitName.Never, 180],
        [TraitName.MarksmansMastery, 200],
        [TraitName.MarksmansMasteryII, 220],
    ],
    applicationDelay: 0.8,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 5)
})

makeWeaponskill_MCH(SkillName.HeatedSlugShot, 60, {
    potency: [
        [TraitName.Never, 100],
        [TraitName.MarksmansMastery, 120],
        [TraitName.MarksmansMasteryII, 140],
    ],
    combo: {
        potency: [
            [TraitName.Never, 280],
            [TraitName.MarksmansMastery, 300],
            [TraitName.MarksmansMasteryII, 320],
        ],
        resource: ResourceType.HeatCombo,
        resourceValue: 1,
    },
    applicationDelay: 0.8,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 5)
})

makeWeaponskill_MCH(SkillName.HeatedCleanShot, 64, {
    potency: [
        [TraitName.Never, 100],
        [TraitName.MarksmansMastery, 120],
        [TraitName.MarksmansMasteryII, 160],
    ],
    combo: {
        potency: [
            [TraitName.Never, 380],
            [TraitName.MarksmansMastery, 400],
            [TraitName.MarksmansMasteryII, 420],
        ],
        resource: ResourceType.HeatCombo,
        resourceValue: 2,
    },
    applicationDelay: 0.8,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => {
        state.gainResource(ResourceType.HeatGauge, 5)
        state.gainResource(ResourceType.BatteryGauge, 10)
    }
})

makeResourceAbility_MCH(SkillName.Reassemble, 10, ResourceType.cd_Reassemble, {
    rscType: ResourceType.Reassembled,
    applicationDelay: 0,
    cooldown: 55,
    maxCharges: 2, // TODO - Reduce in constructor by trait
})

makeWeaponskill_MCH(SkillName.Drill, 58, {
    potency: 600,
    applicationDelay: 1.15,
    recastTime: (state) => state.config.adjustedSksGCD(),
    secondaryCooldown: {
        cdName: ResourceType.cd_Drill,
        cooldown: 20,
        maxCharges: 2, // TODO - Reduce in constructor by trait
    }
})

makeWeaponskill_MCH(SkillName.HotShot, 4, {
    autoUpgrade: {
        trait: TraitName.HotShotMastery,
        otherSkill: SkillName.AirAnchor
    },
    potency: 240,
    applicationDelay: 1.15, // TODO - Assuming the same as Air Anchor since we don't have data for it in the spreadsheet
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => state.gainResource(ResourceType.BatteryGauge, 20),
    secondaryCooldown: {
        cdName: ResourceType.cd_AirAnchor,
        cooldown: 40, // cooldown edited in constructor to be affected by skill speed
        maxCharges: 1
    }
})
makeWeaponskill_MCH(SkillName.AirAnchor, 76, {
    startOnHotbar: false,
    potency: 600,
    applicationDelay: 1.15,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => state.gainResource(ResourceType.BatteryGauge, 20),
    secondaryCooldown: {
        cdName: ResourceType.cd_AirAnchor,
        cooldown: 40, // cooldown edited in constructor to be affected by skill speed
        maxCharges: 1
    }
})


makeWeaponskill_MCH(SkillName.Chainsaw, 90, {
    replaceIf: [{
        newSkill: SkillName.Excavator,
        condition: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady)
    }],
    potency: 600,
    applicationDelay: 1.03,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => {
        state.gainResource(ResourceType.BatteryGauge, 20)
        state.gainProc(ResourceType.ExcavatorReady)
    },
    secondaryCooldown: {
        cdName: ResourceType.cd_Chainsaw,
        cooldown: 60, // cooldown edited in constructor to be affected by skill speed
        maxCharges: 1
    }
})
makeWeaponskill_MCH(SkillName.Excavator, 90, {
    startOnHotbar: false,
    potency: 600,
    applicationDelay: 1.07,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => {
        state.gainResource(ResourceType.BatteryGauge, 20)
        state.tryConsumeResource(ResourceType.ExcavatorReady)
    },
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady)
})

makeAbility_MCH(SkillName.BarrelStabilizer, 66, ResourceType.cd_BarrelStabilizer, {
    replaceIf: [{
        newSkill: SkillName.FullMetalField,
        condition: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist)
    }],
    applicationDelay: 0,
    cooldown: 120,
    maxCharges: 1,
    onConfirm: (state) => {
        state.gainProc(ResourceType.Hypercharged)
        if (Traits.hasUnlocked(TraitName.EnhancedBarrelStabilizer, state.config.level)) {
            state.gainProc(ResourceType.FullMetalMachinist)
        }
    },
    validateAttempt: (state) => state.isInCombat(),
})
makeWeaponskill_MCH(SkillName.FullMetalField, 100, {
    startOnHotbar: false,
    potency: 900,
    applicationDelay: 1.02,
    recastTime: (state) => state.config.adjustedSksGCD(),
    onConfirm: (state) => state.tryConsumeResource(ResourceType.FullMetalMachinist),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist),
})

// Hypercharge

// Wildfire

// Blazing Shot

// Double Check

// Checkmate

// Automaton Queen

// Queen Overdrive

// Scattergun

// Bioblaster

// Auto Crossbow

// Flamethrower (this is going to be a clusterfuck to add lmao)

// Tactician

// Dismantle