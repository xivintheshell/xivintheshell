import { ShellJob } from "../../Controller/Common"
import { controller } from "../../Controller/Controller";
import { ProcMode, ResourceType, SkillName, WarningType } from "../Common";
import { DNCResourceType } from "../Constants/DNC";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, getResourceInfo, makeResource, Resource, ResourceInfo } from "../Resources"
import { Ability, combineEffects, ConditionalSkillReplace, CooldownGroupProperies, EffectFn, getBasePotency, makeAbility, makeResourceAbility, makeWeaponskill, NO_EFFECT, ResourceCalculationFn, StatePredicate, Weaponskill } from "../Skills";
import { TraitName, Traits } from "../Traits";

const makeDNCResource = (rsc: ResourceType, maxValue: number, params? : {timeout?: number, default?: number}) => {
    makeResource(ShellJob.DNC, rsc, maxValue, params ?? {});
}

// Gauge resources
makeDNCResource(ResourceType.EspritGauge, 100)
makeDNCResource(ResourceType.FeatherGauge, 4)
makeDNCResource(ResourceType.StandardDance, 2)
makeDNCResource(ResourceType.TechnicalDance, 4)

// Status effects
makeDNCResource(ResourceType.SilkenSymmetry, 1, {timeout: 30});
makeDNCResource(ResourceType.SilkenFlow, 1, {timeout: 30});
makeDNCResource(ResourceType.FlourishingSymmetry, 1, {timeout: 30});
makeDNCResource(ResourceType.FlourishingFlow, 1, {timeout: 30});

makeDNCResource(ResourceType.ThreefoldFanDance, 1, {timeout: 30})
makeDNCResource(ResourceType.FourfoldFanDance, 1, {timeout: 30})

makeDNCResource(ResourceType.FinishingMoveReady, 1, {timeout: 30})
makeDNCResource(ResourceType.FlourishingStarfall, 1, {timeout: 20})

makeDNCResource(ResourceType.StandardStep, 1, {timeout: 15})
makeDNCResource(ResourceType.StandardFinish, 1, {timeout: 60})
makeDNCResource(ResourceType.Esprit, 1, {timeout: 60})
makeDNCResource(ResourceType.TechnicalStep, 1, {timeout: 15})
makeDNCResource(ResourceType.TechnicalFinish, 1, {timeout: 20.5})

makeDNCResource(ResourceType.LastDanceReady, 1, {timeout: 30})
makeDNCResource(ResourceType.DanceOfTheDawnReady, 1, {timeout: 30})
makeDNCResource(ResourceType.FlourishingFinish, 1, {timeout: 30})

makeDNCResource(ResourceType.ClosedPosition, 1, {default: 1})

makeDNCResource(ResourceType.Devilment, 1, {timeout: 20})
makeDNCResource(ResourceType.ShieldSamba, 1, {timeout: 15})

makeDNCResource(ResourceType.Improvisation, 1, {timeout: 15})
makeDNCResource(ResourceType.RisingRhythm, 4, {timeout: 15})
makeDNCResource(ResourceType.ImprovisationRegen, 1, {timeout: 15})
makeDNCResource(ResourceType.ImprovisedFinish, 1, {timeout: 30})

makeDNCResource(ResourceType.DancePartner, 1, {default: 1})
makeDNCResource(ResourceType.EspritPartner, 1, {timeout: 60})
makeDNCResource(ResourceType.StandardFinishPartner, 1, {timeout: 60})
makeDNCResource(ResourceType.EspritTechnical, 1, {timeout: 20})

makeDNCResource(ResourceType.ArmsLength, 1, {timeout: 6.5})

makeDNCResource(ResourceType.CascadeCombo, 1, {timeout: 30})
makeDNCResource(ResourceType.WindmillCombo, 1, {timeout: 30})
makeDNCResource(ResourceType.PartySize, 8, {default: 8})

const COMBO_GCDS: SkillName[] = [SkillName.Cascade, SkillName.Fountain, SkillName.Windmill, SkillName.Bladeshower]
const DANCE_MOVES: SkillName[] = [SkillName.Emboite, SkillName.Entrechat, SkillName.Jete, SkillName.Pirouette]
export class DNCState extends GameState {
    constructor (config: GameConfig) {
        super(config)

        // Disable Esprit Gauge for level 70 duties
        if (!Traits.hasUnlocked(TraitName.Esprit, this.config.level)) {
            this.resources.set(new Resource(ResourceType.EspritGauge, 0, 0));
        }

        const enAvantStacks = Traits.hasUnlocked(TraitName.EnhancedEnAvantII, this.config.level) ? 3 : 2;
        this.cooldowns.set(new CoolDown(ResourceType.cd_EnAvant, 30, enAvantStacks, enAvantStacks));

        const shieldSambaCooldown = Traits.hasUnlocked(TraitName.EnhancedShieldSamba, this.config.level) ? 90 : 120;
        this.cooldowns.set(new CoolDown(ResourceType.cd_ShieldSamba, shieldSambaCooldown, 1, 1));

        this.registerRecurringEvents();
    }

    processComboStatus(skill: SkillName) {
        if (!COMBO_GCDS.includes(skill)) { return; } // DNC's non-combo GCDs don't break ongoing combos

        const cascadeInProgress = skill === SkillName.Cascade;
        const windmillInProgress = skill === SkillName.Windmill;

        this.setComboState(ResourceType.CascadeCombo, cascadeInProgress ? 1 : 0);
        this.setComboState(ResourceType.WindmillCombo, windmillInProgress ? 1 : 0);
    }

    getCurrentDanceStatus() {
        const danceResourceName: ResourceType = this.hasResourceAvailable(ResourceType.StandardStep) ?
            ResourceType.StandardDance : ResourceType.TechnicalDance

        return this.resources.get(danceResourceName).availableAmount()
    }

    processDanceStatus(skill: SkillName) {
        if (!DANCE_MOVES.includes(skill)) { return; } // If you don't dance you're no friend of dance status

        const danceResourceName: ResourceType = this.hasResourceAvailable(ResourceType.StandardStep) ?
            ResourceType.StandardDance : ResourceType.TechnicalDance
        
        let expectedCurrentState = 0
        switch(skill) {
            case SkillName.Entrechat:
                expectedCurrentState = 1
                break;
            case SkillName.Jete:
                expectedCurrentState = 2
                break;
            case SkillName.Pirouette:
                expectedCurrentState = 3
                break;
        }

        const danceResource = this.resources.get(danceResourceName)
        // If you didn't do the right step, you don't get to proceed
        if (danceResource.availableAmount() === expectedCurrentState) { danceResource.gain(1); }
    }

    gainProc(proc: DNCResourceType) {
        const duration = (getResourceInfo(ShellJob.DNC, proc) as ResourceInfo).maxTimeout;
        if (this.resources.get(proc).available(1)) {
            if (proc === ResourceType.ThreefoldFanDance) {
                controller.reportWarning(WarningType.FanThreeOverwrite)
            }
            this.resources.get(proc).overrideTimer(this, duration);
        } else {
            this.resources.get(proc).gain(1);
            this.enqueueResourceDrop(proc, duration);
        }
    }

    maybeGainProc(proc: DNCResourceType, chance: number = 0.5) {
        if (this.config.procMode === ProcMode.Never) { return; }

        let rand = this.rng();
        if (this.config.procMode === ProcMode.Always || rand < chance) {
            this.gainProc(proc)
        }
    }

    gainResource(rscType: typeof ResourceType.EspritGauge | typeof ResourceType.FeatherGauge, amount: number) {
        const resource = this.resources.get(rscType)
        if (resource.availableAmount() + amount > resource.maxValue) {
            controller.reportWarning(rscType === ResourceType.EspritGauge ? WarningType.EspritOvercap : WarningType.FeatherOvercap)
        }
        this.resources.get(rscType).gain(amount)
    }

    maybeGainResource(rscType: typeof ResourceType.EspritGauge | typeof ResourceType.FeatherGauge, amount: number, chance: number = 0.5) {
        if (this.config.procMode === ProcMode.Never) { return; }

        let rand = this.rng();
        if (this.config.procMode === ProcMode.Always || rand < chance) {
            this.gainResource(rscType, amount)
        }
    }

    simulatePartyEspritGain() {
        // Technical Finish Esprit generation overrides any need for dance partner member generation checks
        if (this.hasResourceAvailable(ResourceType.EspritTechnical)) {
            for (let i = 0; i < this.resources.get(ResourceType.PartySize).availableAmount() - 1; i ++) {
                this.maybeGainResource(ResourceType.EspritGauge, 10, 0.2)
            }
            return;
        }

        if (this.hasResourceAvailable(ResourceType.EspritPartner)) {
            this.maybeGainResource(ResourceType.EspritGauge, 10, 0.2)
        }
    }
}

const isDancing = (state: Readonly<DNCState>) => state.hasResourceAvailable(ResourceType.StandardStep) || state.hasResourceAvailable(ResourceType.TechnicalStep)

const emboiteCondition: ConditionalSkillReplace<DNCState> = {
    newSkill: SkillName.Emboite,
    condition: (state) => isDancing(state)
}

const entrechatCondition: ConditionalSkillReplace<DNCState> = {
    newSkill: SkillName.Entrechat,
    condition: (state) => isDancing(state)
}

const jeteCondition: ConditionalSkillReplace<DNCState> = {
    newSkill: SkillName.Jete,
    condition: (state) => isDancing(state)
}

const pirouetteCondition: ConditionalSkillReplace<DNCState> = {
    newSkill: SkillName.Pirouette,
    condition: (state) => isDancing(state)
}

const makeGCD_DNC = (name: SkillName, unlockLevel: number, params: {
    assetPath?: string,
    replaceIf?: ConditionalSkillReplace<DNCState>[],
	startOnHotbar?: boolean,
	potency?: number | Array<[TraitName, number]>,
	combo?: {
		potency: number | Array<[TraitName, number]>,
		resource: ResourceType,
		resourceValue: number,
	},
	recastTime: number | ResourceCalculationFn<DNCState>,
	applicationDelay?: number,
	validateAttempt?: StatePredicate<DNCState>,
	onConfirm?: EffectFn<DNCState>,
	highlightIf?: StatePredicate<DNCState>,
	secondaryCooldown?: CooldownGroupProperies,
}): Weaponskill<DNCState> => {
    const onConfirm: EffectFn<DNCState> = combineEffects(
        (state) => { if (params.potency) { state.simulatePartyEspritGain() }},
        (state) => state.tryConsumeResource(ResourceType.Improvisation),
		params.onConfirm ?? NO_EFFECT,
		(state) => state.processComboStatus(name),
	);
	return makeWeaponskill(ShellJob.DNC, name, unlockLevel, {
        ...params,
		onConfirm: onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (params.combo && state.resources.get(params.combo.resource).availableAmount() === params.combo.resourceValue) {
				mods.push(makeComboModifier(getBasePotency(state, params.combo.potency) - getBasePotency(state, params.potency)));
			}
            if (state.hasResourceAvailable(ResourceType.StandardFinish)) {
                const modifier = state.resources.get(ResourceType.StandardBonus).availableAmount() === 2 ?
                    Modifiers.DoubleStandardFinish : Modifiers.SingleStandardFinish
                mods.push(modifier)
            }
            if (state.hasResourceAvailable(ResourceType.TechnicalFinish)) {
                const technicalBonus = state.resources.get(ResourceType.TechnicalBonus).availableAmount()
                const modifier = technicalBonus === 4 ? Modifiers.QuadrupleTechnicalFinish :
                    technicalBonus === 3 ? Modifiers.TripleTechnicalFinish :
                    technicalBonus === 2 ? Modifiers.SingleTechnicalFinish : Modifiers.SingleTechnicalFinish
                mods.push(modifier)
            }
			return mods;
		},
	});
}

const makeAbility_DNC = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
	potency?: number | Array<[TraitName, number]>,
	replaceIf?: ConditionalSkillReplace<DNCState>[],
	highlightIf?: StatePredicate<DNCState>,
	startOnHotbar?: boolean,
	applicationDelay?: number,
	cooldown: number,
	maxCharges?: number,
	validateAttempt?: StatePredicate<DNCState>,
	onConfirm?: EffectFn<DNCState>,
	onApplication?: EffectFn<DNCState>,
	secondaryCooldown?: CooldownGroupProperies,
}): Ability<DNCState> => {
	const onConfirm: EffectFn<DNCState> = combineEffects(
        (state) => state.tryConsumeResource(ResourceType.Improvisation),
		params.onConfirm ?? NO_EFFECT,
	);
    return makeAbility(ShellJob.DNC, name, unlockLevel, cdName, {
        ...params,
        onConfirm: onConfirm,
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = [];
            if (state.hasResourceAvailable(ResourceType.StandardFinish)) {
                const modifier = state.resources.get(ResourceType.StandardBonus).availableAmount() === 2 ?
                    Modifiers.DoubleStandardFinish : Modifiers.SingleStandardFinish
                mods.push(modifier)
            }
            if (state.hasResourceAvailable(ResourceType.TechnicalFinish)) {
                const technicalBonus = state.resources.get(ResourceType.TechnicalBonus).availableAmount()
                const modifier = technicalBonus === 4 ? Modifiers.QuadrupleTechnicalFinish :
                    technicalBonus === 3 ? Modifiers.TripleTechnicalFinish :
                    technicalBonus === 2 ? Modifiers.SingleTechnicalFinish : Modifiers.SingleTechnicalFinish
                mods.push(modifier)
            }
            return mods;
        },
    });
}

const makeResourceAbility_DNC = (name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
    rscType: ResourceType,
	replaceIf?: ConditionalSkillReplace<DNCState>[],
    applicationDelay: number,
    cooldown: number,
    maxCharges?: number,
    validateAttempt?: StatePredicate<DNCState>,
    onConfirm?: EffectFn<DNCState>
	onApplication?: EffectFn<DNCState>,
	secondaryCooldown?: CooldownGroupProperies,
}): Ability<DNCState> => {
    const onConfirm: EffectFn<DNCState> = combineEffects(
        params.onConfirm ?? NO_EFFECT,
        (state) => state.tryConsumeResource(ResourceType.Improvisation)
    );
    return makeResourceAbility(ShellJob.DNC, name, unlockLevel, cdName, {
        ...params,
        onConfirm
    });
}

// Dance Moves
makeGCD_DNC(SkillName.Emboite, 15, {
    startOnHotbar: false,
    recastTime: 1,
    onConfirm: (state) => state.processDanceStatus(SkillName.Emboite),
    highlightIf: (state) => isDancing(state) && state.getCurrentDanceStatus() === 0
})
makeGCD_DNC(SkillName.Entrechat, 15, {
    startOnHotbar: false,
    recastTime: 1,
    onConfirm: (state) => state.processDanceStatus(SkillName.Entrechat),
    highlightIf: (state) => isDancing(state) && state.getCurrentDanceStatus() === 1
})
makeGCD_DNC(SkillName.Jete, 15, {
    startOnHotbar: false,
    recastTime: 1,
    onConfirm: (state) => state.processDanceStatus(SkillName.Jete),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 2
})
makeGCD_DNC(SkillName.Pirouette, 15, {
    startOnHotbar: false,
    recastTime: 1,
    onConfirm: (state) => state.processDanceStatus(SkillName.Pirouette),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 3
})

// ST Combo and Procs
makeGCD_DNC(SkillName.Cascade, 1, {
    replaceIf: [emboiteCondition],
    potency: [
        [TraitName.Never, 200],
        [TraitName.DynamicDancer, 220]
    ],
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.80,
    onConfirm: (state) => {
        state.maybeGainProc(ResourceType.SilkenSymmetry)

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 5)
        }
    }
})
makeGCD_DNC(SkillName.Fountain, 2, {
    replaceIf: [entrechatCondition],
    potency: [
        [TraitName.Never, 100],
        [TraitName.DynamicDancer, 120]
    ],
    combo: {
        potency: [
            [TraitName.Never, 260],
            [TraitName.DynamicDancer, 280],
        ],
        resource: ResourceType.CascadeCombo,
        resourceValue: 1,
    },
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.98,
    onConfirm: (state) => {
        state.maybeGainProc(ResourceType.SilkenFlow)

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 5)
        }
    },
    highlightIf: (state) => state.resources.get(ResourceType.CascadeCombo).availableAmount() === 1,
})
makeGCD_DNC(SkillName.ReverseCascade, 20, {
    replaceIf: [jeteCondition],
    potency: [
        [TraitName.Never, 260],
        [TraitName.DynamicDancer, 280]
    ],
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.SilkenSymmetry) || state.hasResourceAvailable(ResourceType.FlourishingSymmetry),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.SilkenSymmetry)) {
            state.tryConsumeResource(ResourceType.SilkenSymmetry)
        } else {
            state.tryConsumeResource(ResourceType.FlourishingSymmetry)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 10)
        }
        state.maybeGainResource(ResourceType.FeatherGauge, 1)
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.SilkenSymmetry) || state.hasResourceAvailable(ResourceType.FlourishingSymmetry),
})
makeGCD_DNC(SkillName.Fountainfall, 40, {
    replaceIf: [pirouetteCondition],
    potency: [
        [TraitName.Never, 320],
        [TraitName.DynamicDancer, 340]
    ],
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 1.21,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.SilkenFlow) || state.hasResourceAvailable(ResourceType.FlourishingFlow),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.SilkenFlow)) {
            state.tryConsumeResource(ResourceType.SilkenFlow)
        } else {
            state.tryConsumeResource(ResourceType.FlourishingFlow)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 10)
        }
        state.maybeGainResource(ResourceType.FeatherGauge, 1)
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.SilkenFlow) || state.hasResourceAvailable(ResourceType.FlourishingFlow),
})
makeAbility_DNC(SkillName.FanDance, 30, ResourceType.cd_FanDance, {
    potency: [
        [TraitName.Never, 150],
        [TraitName.DynamicDancer, 180]
    ],
    cooldown: 1,
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FeatherGauge) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FeatherGauge),
    onConfirm: (state) => { 
        state.tryConsumeResource(ResourceType.FeatherGauge)
        state.maybeGainProc(ResourceType.ThreefoldFanDance)
    }
})

makeGCD_DNC(SkillName.SaberDance, 76, {
    replaceIf: [{
        newSkill: SkillName.DanceOfTheDawn,
        condition: (state) => state.hasResourceAvailable(ResourceType.DanceOfTheDawnReady) && state.hasResourceAvailable(ResourceType.EspritGauge, 50),
    }],
    potency: [
        [TraitName.Never, 500],
        [TraitName.DynamicDancer, 520]
    ],
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.44,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.EspritGauge, 50) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.EspritGauge, 50),
    onConfirm: (state) => state.resources.get(ResourceType.EspritGauge).consume(50)
})
makeGCD_DNC(SkillName.DanceOfTheDawn, 100, {
    startOnHotbar: false,
    potency: 1000,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.44,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.EspritGauge, 50) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.EspritGauge, 50),
    onConfirm: (state) => {
        state.resources.get(ResourceType.EspritGauge).consume(50)
        state.tryConsumeResource(ResourceType.DanceOfTheDawnReady)
    },
})
makeGCD_DNC(SkillName.LastDance, 92, {
    potency: 520,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 1.26,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LastDanceReady) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.LastDanceReady),
    onConfirm: (state) => state.tryConsumeResource(ResourceType.LastDanceReady),
})

makeGCD_DNC(SkillName.StandardStep, 15, {
    replaceIf: [{
        newSkill: SkillName.StandardFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.StandardStep) && state.getCurrentDanceStatus() === 0,
    },{
        newSkill: SkillName.SingleStandardFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.StandardStep) && state.getCurrentDanceStatus() === 1,
    },{
        newSkill: SkillName.DoubleStandardFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.StandardStep) && state.getCurrentDanceStatus() === 2,
    },{
        newSkill: SkillName.FinishingMove,
        condition: (state) => state.hasResourceAvailable(ResourceType.FinishingMoveReady)
    }],
    validateAttempt: (state) => !isDancing(state),
    onConfirm: (state) => state.gainProc(ResourceType.StandardStep),
    recastTime: 1.5,
    secondaryCooldown: {
        cdName: ResourceType.cd_StandardStep,
        cooldown: 30,
        maxCharges: 1,
    },
})
makeGCD_DNC(SkillName.FinishingMove, 96, {
    startOnHotbar: false,
    potency: 850,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 2.05,
    onConfirm: (state) => {
        state.gainProc(ResourceType.StandardFinish)
        state.resources.get(ResourceType.StandardBonus).available(2)

        if (state.hasResourceAvailable(ResourceType.DancePartner))
        {
            state.gainProc(ResourceType.StandardFinishPartner)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainProc(ResourceType.Esprit)
            if (state.hasResourceAvailable(ResourceType.DancePartner)) {
                state.gainProc(ResourceType.EspritPartner)
            }
        }

        state.gainProc(ResourceType.LastDanceReady)
        state.tryConsumeResource(ResourceType.FinishingMoveReady)
    },
    secondaryCooldown: {
        cdName: ResourceType.cd_StandardStep,
        cooldown: 30,
        maxCharges: 1,
    },
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FinishingMoveReady) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FinishingMoveReady),
})
makeGCD_DNC(SkillName.StandardFinish, 15, {
    startOnHotbar: false,
    potency: 360,
    applicationDelay: 0.54,
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.StandardStep)
        state.tryConsumeResource(ResourceType.StandardDance, true)
    },
    recastTime: 1.5,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.StandardStep),
})
makeGCD_DNC(SkillName.SingleStandardFinish, 15, {
    assetPath: "DNC/Standard Finish.png",
    startOnHotbar: false,
    potency: 540,
    applicationDelay: 0.54,
    onConfirm: (state) => {
        state.gainProc(ResourceType.StandardFinish)
        state.resources.get(ResourceType.StandardBonus).available(1)
        const duration = (getResourceInfo(ShellJob.DNC, ResourceType.StandardFinish) as ResourceInfo).maxTimeout;
        state.enqueueResourceDrop(ResourceType.StandardBonus, duration, 1)

        if (state.hasResourceAvailable(ResourceType.DancePartner))
        {
            state.gainProc(ResourceType.StandardFinishPartner)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainProc(ResourceType.Esprit)
            if (state.hasResourceAvailable(ResourceType.DancePartner)) {
                state.gainProc(ResourceType.EspritPartner)
            }
        }

        if (Traits.hasUnlocked(TraitName.EnhancedStandardFinish, state.config.level)) {
            state.gainProc(ResourceType.LastDanceReady)
        }

        state.tryConsumeResource(ResourceType.StandardStep)
        state.tryConsumeResource(ResourceType.StandardDance, true)
    },
    recastTime: 1.5,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.StandardStep),
})
makeGCD_DNC(SkillName.DoubleStandardFinish, 15, {
    assetPath: "DNC/Standard Finish.png",
    startOnHotbar: false,
    potency: [
        [TraitName.Never, 800], 
        [TraitName.DynamicDancer, 850]
    ],
    applicationDelay: 0.54,
    onConfirm: (state) => {
        state.gainProc(ResourceType.StandardFinish)
        state.resources.get(ResourceType.StandardBonus).available(2)
        const duration = (getResourceInfo(ShellJob.DNC, ResourceType.StandardFinish) as ResourceInfo).maxTimeout;
        state.enqueueResourceDrop(ResourceType.StandardBonus, duration, 2)

        if (state.hasResourceAvailable(ResourceType.DancePartner))
        {
            state.gainProc(ResourceType.StandardFinishPartner)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainProc(ResourceType.Esprit)
            if (state.hasResourceAvailable(ResourceType.DancePartner)) {
                state.gainProc(ResourceType.EspritPartner)
            }
        }

        if (Traits.hasUnlocked(TraitName.EnhancedStandardFinish, state.config.level)) {
            state.gainProc(ResourceType.LastDanceReady)
        }

        state.tryConsumeResource(ResourceType.StandardStep)
        state.tryConsumeResource(ResourceType.StandardDance, true)
    },
    recastTime: 1.5,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.StandardStep),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.StandardStep) && state.getCurrentDanceStatus() === 2
})

makeAbility_DNC(SkillName.Flourish, 72, ResourceType.cd_Flourish, {
    cooldown: 60,
    validateAttempt: (state) => !isDancing(state) && state.isInCombat(),
    onConfirm: (state) => {
        state.gainProc(ResourceType.FlourishingSymmetry)
        state.gainProc(ResourceType.FlourishingFlow)
        state.gainProc(ResourceType.ThreefoldFanDance)
        if (Traits.hasUnlocked(TraitName.EnhancedFlourish, state.config.level)) {
            state.gainProc(ResourceType.FourfoldFanDance)
        }
        if (Traits.hasUnlocked(TraitName.EnhancedFlourishII, state.config.level)) {
            state.gainProc(ResourceType.FinishingMoveReady)
        }
    }
})
makeAbility_DNC(SkillName.FanDance3, 66, ResourceType.cd_FanDanceIII, {
    potency: [
        [TraitName.Never, 200],
        [TraitName.DynamicDancer, 220]
    ],
    cooldown: 1,
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ThreefoldFanDance) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ThreefoldFanDance),
    onConfirm: (state) => state.tryConsumeResource(ResourceType.ThreefoldFanDance)
})
makeAbility_DNC(SkillName.FanDance4, 86, ResourceType.cd_FanDanceIV, {
    potency: [
        [TraitName.Never, 300],
        [TraitName.DynamicDancer, 420]
    ],
    cooldown: 1,
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FourfoldFanDance) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FourfoldFanDance),
    onConfirm: (state) => state.tryConsumeResource(ResourceType.FourfoldFanDance)
})


makeGCD_DNC(SkillName.TechnicalStep, 70, {
    replaceIf: [{
        newSkill: SkillName.TechnicalFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 0,
    }, {
        newSkill: SkillName.SingleTechnicalFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 1,
    }, {
        newSkill: SkillName.DoubleTechnicalFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 2,
    }, {
        newSkill: SkillName.TripleTechnicalFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 3,
    }, {
        newSkill: SkillName.QuadrupleTechnicalFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 4,
    }, {
        newSkill: SkillName.Tillana,
        condition: (state) => state.hasResourceAvailable(ResourceType.FlourishingFinish)
    }],
    validateAttempt: (state) => !isDancing(state),
    onConfirm: (state) => state.gainProc(ResourceType.TechnicalStep),
    recastTime: 1.5,
    secondaryCooldown: {
        cdName: ResourceType.cd_TechnicalStep,
        cooldown: 120,
        maxCharges: 1,
    },
})
makeGCD_DNC(SkillName.Tillana, 82, {
    startOnHotbar: false,
    potency: 600,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.84,
    onConfirm: (state) => {
        state.gainResource(ResourceType.EspritGauge, 50)
        state.tryConsumeResource(ResourceType.FlourishingFinish)
    },
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FlourishingFinish) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FlourishingFinish),
})
makeGCD_DNC(SkillName.TechnicalFinish, 70, {
    startOnHotbar: false,
    potency: 350,
    applicationDelay: 0.54,
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.TechnicalStep)
        state.tryConsumeResource(ResourceType.TechnicalDance, true)
    },
    recastTime: 1.5,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep),
});

[
    {skill: SkillName.SingleTechnicalFinish, potency: 540, bonusLevel: 1},
    {skill: SkillName.DoubleTechnicalFinish, potency: 720, bonusLevel: 2},
    {skill: SkillName.TripleTechnicalFinish, potency: 900, bonusLevel: 3},
].forEach((params) => {
    makeGCD_DNC(params.skill, 70, {
        assetPath: "DNC/Technical Finish.png",
        startOnHotbar: false,
        potency: params.potency,
        applicationDelay: 0.54,
        onConfirm: (state) => {
            state.gainProc(ResourceType.TechnicalFinish)
            state.gainProc(ResourceType.EspritTechnical)
            state.resources.get(ResourceType.TechnicalBonus).available(params.bonusLevel)
            const duration = (getResourceInfo(ShellJob.DNC, ResourceType.TechnicalFinish) as ResourceInfo).maxTimeout;
            state.enqueueResourceDrop(ResourceType.TechnicalBonus, duration, params.bonusLevel)

            if (Traits.hasUnlocked(TraitName.EnhancedTechnicalFinish, state.config.level))
            {
                state.gainProc(ResourceType.FlourishingFinish)
            }
            if (Traits.hasUnlocked(TraitName.EnhancedTechnicalFinishII, state.config.level)) {
                state.gainProc(ResourceType.DanceOfTheDawnReady)
            }
            state.tryConsumeResource(ResourceType.TechnicalStep)
            state.tryConsumeResource(ResourceType.TechnicalDance, true)
        },
        recastTime: 1.5,
        validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep),
    })
})
makeGCD_DNC(SkillName.QuadrupleTechnicalFinish, 70, {
    assetPath: "DNC/Technical Finish.png",
    startOnHotbar: false,
    potency: [
        [TraitName.Never, 1200], 
        [TraitName.DynamicDancer, 1300]
    ],
    applicationDelay: 0.54,
    onConfirm: (state) => {
        state.gainProc(ResourceType.TechnicalFinish)
        state.gainProc(ResourceType.EspritTechnical)
        state.resources.get(ResourceType.TechnicalBonus).available(4)
        const duration = (getResourceInfo(ShellJob.DNC, ResourceType.TechnicalFinish) as ResourceInfo).maxTimeout;
        state.enqueueResourceDrop(ResourceType.TechnicalBonus, duration, 4)

        if (Traits.hasUnlocked(TraitName.EnhancedTechnicalFinish, state.config.level))
        {
            state.gainProc(ResourceType.FlourishingFinish)
        }
        if (Traits.hasUnlocked(TraitName.EnhancedTechnicalFinishII, state.config.level)) {
            state.gainProc(ResourceType.DanceOfTheDawnReady)
        }
        state.tryConsumeResource(ResourceType.TechnicalStep)
        state.tryConsumeResource(ResourceType.TechnicalDance, true)
    },
    recastTime: 1.5,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.TechnicalStep) && state.getCurrentDanceStatus() === 4
})

makeResourceAbility_DNC(SkillName.Devilment, 62, ResourceType.cd_Devilment, {
    replaceIf: [{
        newSkill: SkillName.StarfallDance,
        condition: (state) => state.hasResourceAvailable(ResourceType.FlourishingStarfall)
    }],
    rscType: ResourceType.Devilment,
    applicationDelay: 0,
    cooldown: 120,
    validateAttempt: (state) => !isDancing(state),
    onApplication: (state) => {
        if (Traits.hasUnlocked(TraitName.EnhancedDevilment, state.config.level)) {
            (state as DNCState).gainProc(ResourceType.FlourishingStarfall)
        }
    },
    onConfirm: (state) => state.tryConsumeResource(ResourceType.Improvisation)
})
makeGCD_DNC(SkillName.StarfallDance, 90, {
    startOnHotbar: false,
    potency: 600,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.89,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FlourishingStarfall) && !isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FlourishingStarfall),
    onConfirm: (state) => state.tryConsumeResource(ResourceType.FlourishingStarfall)
})

// AoE Combo and Procs
makeGCD_DNC(SkillName.Windmill, 15, {
    replaceIf: [emboiteCondition],
    potency: 100,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.62,
    onConfirm: (state) => {
        state.maybeGainProc(ResourceType.SilkenSymmetry)

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 5)
        }
    },
})
makeGCD_DNC(SkillName.Bladeshower, 25, {
    replaceIf: [entrechatCondition],
    potency: 100,
    recastTime: (state) => state.config.adjustedSksGCD(),
    combo: {
        potency: 140,
        resource: ResourceType.WindmillCombo,
        resourceValue: 1,
    },
    applicationDelay: 0.62,
    onConfirm: (state) => {
        state.maybeGainProc(ResourceType.SilkenFlow)

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 5)
        }
    },
    highlightIf: (state) => state.resources.get(ResourceType.WindmillCombo).availableAmount() === 1,
})
makeGCD_DNC(SkillName.RisingWindmill, 35, {
    replaceIf: [jeteCondition],
    potency: 140,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.SilkenSymmetry) || state.hasResourceAvailable(ResourceType.FlourishingSymmetry),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.SilkenSymmetry)) {
            state.tryConsumeResource(ResourceType.SilkenSymmetry)
        } else {
            state.tryConsumeResource(ResourceType.FlourishingSymmetry)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 10)
        }
        state.maybeGainResource(ResourceType.FeatherGauge, 1)
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.SilkenSymmetry) || state.hasResourceAvailable(ResourceType.FlourishingSymmetry),
})
makeGCD_DNC(SkillName.Bloodshower, 45, {
    replaceIf: [pirouetteCondition],
    potency: 180,
    recastTime: (state) => state.config.adjustedSksGCD(),
    applicationDelay: 0.62,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.SilkenFlow) || state.hasResourceAvailable(ResourceType.FlourishingFlow),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.SilkenFlow)) {
            state.tryConsumeResource(ResourceType.SilkenFlow)
        } else {
            state.tryConsumeResource(ResourceType.FlourishingFlow)
        }

        if (Traits.hasUnlocked(TraitName.Esprit, state.config.level)) {
            state.gainResource(ResourceType.EspritGauge, 10)
        }
        state.maybeGainResource(ResourceType.FeatherGauge, 1)
    },
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.SilkenFlow) || state.hasResourceAvailable(ResourceType.FlourishingFlow),
})

makeAbility_DNC(SkillName.FanDance2, 30, ResourceType.cd_FanDanceII, {
    potency: 100,
    cooldown: 1,
    applicationDelay: 0.54,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FeatherGauge) &&!isDancing(state),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.FeatherGauge),
    onConfirm: (state) => { 
        state.tryConsumeResource(ResourceType.FeatherGauge)
        state.maybeGainProc(ResourceType.ThreefoldFanDance)
    }
})

makeAbility_DNC(SkillName.CuringWaltz, 52, ResourceType.cd_CuringWaltz, {
    cooldown: 60,
    applicationDelay: 0.58,
})

makeAbility_DNC(SkillName.Improvisation, 80, ResourceType.cd_Improvisation, {
    replaceIf: [{
        newSkill: SkillName.ImprovisedFinish,
        condition: (state) => state.hasResourceAvailable(ResourceType.Improvisation)
    }],
    cooldown: 120,
    applicationDelay: 0.89,
    validateAttempt: (state) => !isDancing(state),
    onConfirm: (state) => {
        state.gainProc(ResourceType.Improvisation)
        state.gainProc(ResourceType.ImprovisationRegen)
        let risingRhythmRecurrence = () => {
            if (!state.hasResourceAvailable(ResourceType.Improvisation)) { return }

            state.resources.get(ResourceType.RisingRhythm).gain(1)
            state.gainProc(ResourceType.ImprovisationRegen)
            state.resources.addResourceEvent({
                rscType: ResourceType.RisingRhythm,
                name: "rising rhythm tic",
                delay: 3,
                fnOnRsc: rsc => risingRhythmRecurrence()
            })
        }
        state.resources.addResourceEvent({
            rscType: ResourceType.RisingRhythm,
            name: "rising rhythm tic",
            delay: 3,
            fnOnRsc: rsc => risingRhythmRecurrence()
        })
        state.resources.addResourceEvent({
            rscType: ResourceType.Improvisation,
            name: "improvisation timeout",
            delay: (getResourceInfo(ShellJob.DNC, ResourceType.Improvisation) as ResourceInfo).maxTimeout,
            fnOnRsc: rsc => {
                rsc.consume(1)
                state.tryConsumeResource(ResourceType.RisingRhythm, true)
            },
        })
    }
})
makeAbility_DNC(SkillName.ImprovisedFinish, 80, ResourceType.cd_ImprovisedFinish, {
    startOnHotbar: false,
    cooldown: 120,
    applicationDelay: 0.71,
    validateAttempt: (state) => !isDancing(state),
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.Improvisation)
        state.tryConsumeResource(ResourceType.RisingRhythm, true)
        state.gainProc(ResourceType.ImprovisedFinish)
    }
})


makeAbility_DNC(SkillName.EnAvant, 50, ResourceType.cd_EnAvant, {
    cooldown: 30,
    maxCharges: 3, // Adjust charges when synced in the state constructor
})

makeResourceAbility_DNC(SkillName.ShieldSamba, 56, ResourceType.cd_ShieldSamba, {
    rscType: ResourceType.ShieldSamba,
    maxCharges: 1,
    cooldown: 90,
    applicationDelay: 0,
})

makeAbility_DNC(SkillName.ClosedPosition, 60, ResourceType.cd_ClosedPosition, {
    replaceIf: [{
        newSkill: SkillName.Ending,
        condition: (state) => state.hasResourceAvailable(ResourceType.ClosedPosition)
    }],
    cooldown: 30,
    maxCharges: 1,
    applicationDelay: 0,
    onConfirm: (state) => {
        state.resources.get(ResourceType.ClosedPosition).gain(1)
        state.resources.get(ResourceType.DancePartner).gain(1)
    },
    validateAttempt: (state) => !state.hasResourceAvailable(ResourceType.ClosedPosition),
    secondaryCooldown: {
        cdName: ResourceType.cd_Ending,
        cooldown: 1,
        maxCharges: 1
    }
})
makeAbility_DNC(SkillName.Ending, 60, ResourceType.cd_Ending, {
    startOnHotbar: false,
    cooldown: 1,
    maxCharges: 1,
    applicationDelay: 0,
    onConfirm: (state) => {
        state.tryConsumeResource(ResourceType.ClosedPosition, true)
        state.tryConsumeResource(ResourceType.DancePartner, true)
        state.tryConsumeResource(ResourceType.StandardFinishPartner, true)
        state.tryConsumeResource(ResourceType.EspritPartner, true)
    },
    secondaryCooldown: {
        cdName: ResourceType.cd_ClosedPosition,
        cooldown: 30,
        maxCharges: 1
    }
})