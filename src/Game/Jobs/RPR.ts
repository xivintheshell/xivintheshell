import { ShellJob } from "../../Controller/Common";
import { Aspect, ResourceType, SkillName } from "../Common";
import { RPRResourceType, RPRSkillName } from "../Constants/RPR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, makePositionalModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, getResourceInfo, makeResource, ResourceInfo } from "../Resources";
import { Ability, combineEffects, combinePredicatesAnd, ConditionalSkillReplace, CooldownGroupProperies, EffectFn, getBasePotency, getSkill, makeAbility, makeResourceAbility, makeSpell, makeWeaponskill, NO_EFFECT, ResourceCalculationFn, Spell, StatePredicate, Weaponskill } from "../Skills";
import { TraitName, Traits } from "../Traits";

function makeRPRResource(type: ResourceType, maxValue: number, params?: { timeout?: number, default?: number }) {
    makeResource(ShellJob.RPR, type, maxValue, params ?? {});
}

makeRPRResource(ResourceType.Soul, 100);
makeRPRResource(ResourceType.Shroud, 100);

makeRPRResource(ResourceType.DeathsDesign, 1, {})
makeRPRResource(ResourceType.SoulReaver, 2, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedGibbet, 1, { timeout: 60 });
makeRPRResource(ResourceType.EnhancedGallows, 1, { timeout: 60 });
makeRPRResource(ResourceType.Executioner, 2, { timeout: 30 });

makeRPRResource(ResourceType.Enshrouded, 1, { timeout: 30 });
makeRPRResource(ResourceType.LemureShroud, 5, { timeout: 30 });
/* Not giving timeout for this because it needs to be zeroe-ed out when enshroud ends anyway
 * And I don't want the timeout to hide logic errors with that */
makeRPRResource(ResourceType.VoidShroud, 5); // Impossible for it to last 30s, but 30s is an upper bound
makeRPRResource(ResourceType.Oblatio, 1, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedVoidReaping, 1, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedCrossReaping, 1, { timeout: 30 });

makeRPRResource(ResourceType.IdealHost, 1, { timeout: 30 });
makeRPRResource(ResourceType.PerfectioOcculta, 1, { timeout: 30 });
makeRPRResource(ResourceType.PerfectioParata, 1, { timeout: 30 });

makeRPRResource(ResourceType.ArcaneCircle, 1, { timeout: 20 }); // 20.00s exactly
makeRPRResource(ResourceType.CircleOfSacrifice, 1, { timeout: 5 });
makeRPRResource(ResourceType.BloodsownCircle, 1, { timeout: 6 });
makeRPRResource(ResourceType.ImmortalSacrifice, 8, { timeout: 30 });

makeRPRResource(ResourceType.ArcaneCrest, 1, { timeout: 5 });
makeRPRResource(ResourceType.CrestOfTimeBorrowed, 1, { timeout: 5 });
makeRPRResource(ResourceType.CrestOfTimeReturned, 1, { timeout: 15 });

makeRPRResource(ResourceType.Soulsow, 1);
makeRPRResource(ResourceType.Threshold, 1, { timeout: 10 });
makeRPRResource(ResourceType.EnhancedHarpe, 1, { timeout: 10 });

makeRPRResource(ResourceType.RPRCombo, 2, { timeout: 30 });
makeRPRResource(RPRResourceType.RPRAoECombo, 1, { timeout: 30 });

makeRPRResource(ResourceType.Feint, 1, {timeout: 15});
makeRPRResource(ResourceType.TrueNorth, 1, {timeout: 10});
makeRPRResource(ResourceType.ArmsLength, 1, {timeout: 6});
makeRPRResource(ResourceType.Bloodbath, 1, {timeout: 20});

export class RPRState extends GameState {
    constructor(config: GameConfig) {
        super(config);

        const soulSliceStacks = Traits.hasUnlocked(TraitName.TemperedSoul, config.level) ? 2 : 1;
        this.cooldowns.set(new CoolDown(ResourceType.cd_SoulSlice, 30, soulSliceStacks, soulSliceStacks));

        this.cooldowns.set(new CoolDown(ResourceType.cd_ArcaneCircle, 120, 1, 1));

        this.registerRecurringEvents();
    }

    refreshDeathsDesign() {
        const dd = this.resources.get(ResourceType.DeathsDesign);

        const newTime = Math.min(this.resources.timeTillReady(ResourceType.DeathsDesign) + 30, 60);
        if (dd.available(1)) {
            dd.overrideTimer(this, newTime);
            return;
        }

        dd.gain(1);
        this.resources.addResourceEvent({
            rscType: ResourceType.DeathsDesign,
            name: "drop Death's Design",
            delay: newTime,
            fnOnRsc: rsc => {
                rsc.consume(1);
            }
        })
    }

    setTimedResource(rscType: RPRResourceType, amount: number) {
        const duration = (getResourceInfo(ShellJob.RPR, rscType) as ResourceInfo).maxTimeout;
        const resource = this.resources.get(rscType);
        resource.consume(resource.availableAmount());
        resource.gain(amount);
        this.enqueueResourceDrop(rscType, duration);
    }

    processCombo(skill: SkillName) {
        const currCombo = this.resources.get(ResourceType.RPRCombo).availableAmount();
        const currAoeCombo = this.resources.get(ResourceType.RPRAoECombo).availableAmount();

        let [newCombo, newAoeCombo] = (new Map<SkillName, [number, number]>(
            [
                [SkillName.Slice, [1, 0]],
                [SkillName.WaxingSlice, [currCombo === 1 ? 2 : 0, 0]],
                [SkillName.InfernalSlice, [0, 0]],
                [SkillName.SpinningScythe, [0, 1]],
                [SkillName.NightmareScythe, [0, 0]],
            ]
        )).get(skill) ?? [currCombo, currAoeCombo]; // Any other gcd leaves combo unchanged

        this.setComboState(ResourceType.RPRCombo, newCombo);
        this.setComboState(ResourceType.RPRAoECombo, newAoeCombo);
    }

    processSoulGauge(skill: SkillName) {
        const soul = this.resources.get(ResourceType.Soul);
        if ([SkillName.Slice, SkillName.WaxingSlice, SkillName.InfernalSlice,
            SkillName.SpinningScythe, SkillName.NightmareScythe,
            SkillName.Harpe, SkillName.HarvestMoon].includes(skill as RPRSkillName)) {

            soul.gain(10);
            return;
        }

        if ([SkillName.SoulSlice, SkillName.SoulScythe].includes(skill as RPRSkillName)) {
            soul.gain(50);
            return;
        }

        if ([SkillName.BloodStalk, SkillName.UnveiledGallows, SkillName.UnveiledGibbet, SkillName.GrimSwathe,
        SkillName.Gluttony].includes(skill as RPRSkillName)) {

            soul.consume(50);
            return;
        }
    }

    processShroudGauge(skill: SkillName) {
        const shroud = this.resources.get(ResourceType.Shroud);

        if ([
                SkillName.Gallows,
                SkillName.Gibbet,
                SkillName.ExecutionersGallows,
                SkillName.ExecutionersGibbet,
                SkillName.Guillotine,
                SkillName.ExecutionersGuillotine,
            ].includes(skill as RPRSkillName)
        ) {
            shroud.gain(10);
            return;
        }

        if (skill === SkillName.Enshroud
            && !this.resources.get(ResourceType.IdealHost).available(1)
        ) {
            shroud.consume(50);
        }
    }

    processReaversExecutioner(skill: RPRSkillName) {
        const reavers = this.resources.get(ResourceType.SoulReaver);
        const executioners = this.resources.get(ResourceType.Executioner);

        // Gibbet, Gallows, Guillotine
        if ([SkillName.Gibbet, SkillName.Gallows, SkillName.Guillotine].includes(skill)) {
            reavers.consume(1);
            return;
        }

        if ([SkillName.ExecutionersGallows, SkillName.ExecutionersGibbet, SkillName.ExecutionersGuillotine].includes(skill)) {
            executioners.consume(1);
            return;
        }

        // Any other action resets Soul reavers, even if it then gives more
        reavers.consume(reavers.availableAmount());
        executioners.consume(executioners.availableAmount());

        // Unveiled actions
        if ([SkillName.BloodStalk, SkillName.UnveiledGallows, SkillName.UnveiledGibbet, SkillName.GrimSwathe].includes(skill)) {
            this.setTimedResource(ResourceType.SoulReaver, 1);
            return;
        }

        // Pre-96 gluttony
        if (skill === SkillName.Gluttony) {
            if (Traits.hasUnlocked(TraitName.EnhancedGluttony, this.config.level)) {
                this.setTimedResource(ResourceType.Executioner, 2);
                return;
            }

            this.setTimedResource(ResourceType.SoulReaver, 2);
            return;
        }
    }

    processGibbetGallows(skill: SkillName) {
        const soulReavers = this.resources.get(ResourceType.SoulReaver);
        const executioners = this.resources.get(ResourceType.Executioner);

        if (!
            ([
                SkillName.Gibbet,
                SkillName.Gallows,
                SkillName.ExecutionersGibbet,
                SkillName.ExecutionersGallows
            ] as SkillName[]).includes(skill)) {

            soulReavers.consume(soulReavers.availableAmount());
            executioners.consume(executioners.availableAmount());
        }
        const matchingBuffs = new Map<SkillName, ResourceType>(
            [
                [SkillName.Gibbet, ResourceType.EnhancedGibbet],
                [SkillName.ExecutionersGibbet, ResourceType.EnhancedGibbet],
                [SkillName.Gallows, ResourceType.EnhancedGallows],
                [SkillName.ExecutionersGallows, ResourceType.EnhancedGallows],
            ]
        );
        const otherBuffs = new Map<SkillName, ResourceType>(
            [
                [SkillName.Gibbet, ResourceType.EnhancedGallows],
                [SkillName.ExecutionersGibbet, ResourceType.EnhancedGallows],
                [SkillName.Gallows, ResourceType.EnhancedGibbet],
                [SkillName.ExecutionersGallows, ResourceType.EnhancedGibbet],
            ]
        );

        //Already verified that map lookup will be successful.
        const matchingBuff = this.resources.get(matchingBuffs.get(skill) as ResourceType);
        const otherBuff = this.resources.get(otherBuffs.get(skill) as ResourceType);

        matchingBuff.consume(matchingBuff.availableAmount());
        otherBuff.consume(otherBuff.availableAmount());
        otherBuff.gain(1);
    }

    processCircleOfSacrifice(skill: SkillName) {
        if (!this.hasResourceAvailable(ResourceType.CircleOfSacrifice)) {
            return;
        }
        const skillInfo = getSkill(ShellJob.RPR, skill);
        if (skillInfo.potencyFn(this) > 0) {
            this.resources.get(ResourceType.ImmortalSacrifice).gain(1);
            this.resources.get(ResourceType.CircleOfSacrifice).consume(1);
        }
    }

    enterEnshroud() {
        if (this.hasResourceAvailable(ResourceType.IdealHost)) this.resources.get(ResourceType.IdealHost).consume(1);
        this.setTimedResource(ResourceType.Oblatio, 1);
        this.setTimedResource(ResourceType.LemureShroud, 5);
    }

    exitEnshroud() {
        if (this.hasResourceAvailable(ResourceType.Enshrouded)) this.resources.get(ResourceType.Enshrouded).consume(1);
        if (this.hasResourceAvailable(ResourceType.Oblatio)) this.resources.get(ResourceType.Oblatio).consume(1);
        if (this.hasResourceAvailable(ResourceType.VoidShroud)) this.resources.get(ResourceType.VoidShroud).consume(this.resources.get(ResourceType.VoidShroud).availableAmount());
        if (this.hasResourceAvailable(ResourceType.LemureShroud)) this.resources.get(ResourceType.LemureShroud).consume(this.resources.get(ResourceType.LemureShroud).availableAmount());
    }
}

const enshroudSkills = new Set<SkillName> (
    [
        SkillName.ShadowOfDeath,
        SkillName.WhorlOfDeath,

        SkillName.HarvestMoon,
        SkillName.Harpe,

        SkillName.VoidReaping,
        SkillName.CrossReaping,
        SkillName.GrimReaping,
        SkillName.LemuresSlice,
        SkillName.LemuresScythe,
        SkillName.Sacrificium,
        SkillName.Communio,

        SkillName.ArcaneCircle,
        SkillName.HellsIngress,
        SkillName.HellsIngress,
        SkillName.ArcaneCrest,

        SkillName.Feint,
        SkillName.LegSweep,
        SkillName.Bloodbath,
        SkillName.TrueNorth,
        SkillName.ArmsLength,
        SkillName.SecondWind,
        SkillName.Sprint,
    ]
);

const gibgalHighlightPredicate: (enhancedRsc: ResourceType, skill: RPRSkillName) => StatePredicate<RPRState>
= (enhancedRsc, skill) => (state: Readonly<RPRState>) => {
    const resource = [SkillName.Gibbet, SkillName.Gallows, SkillName.Guillotine].includes(skill) 
        ? state.resources.get(ResourceType.SoulReaver) : state.resources.get(ResourceType.Executioner);
    


    return state.resources.get(enhancedRsc).available(1)
                    || (resource.available(1)
                        && !state.hasResourceAvailable(ResourceType.EnhancedGibbet)
                        && !state.hasResourceAvailable(ResourceType.EnhancedGallows))
}

const reaverPredicate: StatePredicate<RPRState> = (state) => state.hasResourceAvailable(ResourceType.SoulReaver);
const executionerPredicate: StatePredicate<RPRState> = (state) => state.hasResourceAvailable(ResourceType.Executioner);

const soulSpendPredicate: (cost: number) => StatePredicate<RPRState> = (cost) => (state) => state.resources.get(ResourceType.Soul).availableAmount() >= cost;
const isEnshroudSkill = (skill: SkillName) => enshroudSkills.has(skill);

const baseOnConfirm = (name: RPRSkillName): EffectFn<RPRState> => {
    return combineEffects(
        (state) => state.processCombo(name),
        (state) => state.processSoulGauge(name),
        (state) => state.processShroudGauge(name),
        (state) => state.processReaversExecutioner(name),
        (state) => state.processCircleOfSacrifice(name),
    )
} 

const basePotencyModifiers = (state: Readonly<RPRState>): PotencyModifier[] => {
    const mods: PotencyModifier[] = [];

    if (state.hasResourceAvailable(ResourceType.ArcaneCircle)) {
        mods.push(Modifiers.ArcaneCircle);
    }

    if (state.hasResourceAvailable(ResourceType.DeathsDesign)) {
        mods.push(Modifiers.DeathsDesign);
    }

    return mods
}

const makeRPRSpell = (name: RPRSkillName, unlockLevel: number, params: {
    replaceIf: ConditionalSkillReplace<RPRState>[],
    startOnHotbar?: boolean,
    potency: number | Array<[TraitName, number]>,
    secondaryCooldown?: CooldownGroupProperies,
    aspect: Aspect,
    castTime: number | ResourceCalculationFn<RPRState>,
    recastTime: number,
    applicationDelay: number,
    validateAttempt?: StatePredicate<RPRState>,
    onConfirm?: EffectFn<RPRState>,
    highlightIf: StatePredicate<RPRState>,
    onApplication?: EffectFn<RPRState>,
}): Spell<RPRState> => {
    const onConfirm: EffectFn<RPRState> = combineEffects(
        baseOnConfirm(name),
        params.onConfirm ?? NO_EFFECT,
    )

    const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
        (state) => (!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name)),
        params.validateAttempt ?? (() => true)
    )

    return makeSpell(ShellJob.RPR, name, unlockLevel, {
        ...params,
        onConfirm: onConfirm,
        validateAttempt: validateAttempt,
        isInstantFn: (state) => !(
                (name === SkillName.Communio)
                || (name === SkillName.Harpe && !state.hasResourceAvailable(ResourceType.EnhancedHarpe))
                || (name === SkillName.Soulsow && state.isInCombat())
            ),
        jobPotencyModifiers: basePotencyModifiers,

    });
}

const makeRPRWeaponskill = (name: RPRSkillName, unlockLevel: number, params: {
    replaceIf?: ConditionalSkillReplace<RPRState>[],
    startOnHotbar?: boolean,
    potency: number | Array<[TraitName, number]>,
    combo?: {
        potency: number | Array<[TraitName, number]>,
        resource: ResourceType,
        resourceValue: number,
    },
    positional?: {
        potency: number | Array<[TraitName, number]>,
        location: "flank" | "rear",
    }
    secondaryCooldown?: CooldownGroupProperies,
    aspect: Aspect,
    recastTime: number,
    applicationDelay: number,
    validateAttempt?: StatePredicate<RPRState>,
    onConfirm?: EffectFn<RPRState>,
    highlightIf: StatePredicate<RPRState>,
}): Weaponskill<RPRState> => {

    const onConfirm: EffectFn<RPRState> = combineEffects(
        baseOnConfirm(name),
        params.onConfirm ?? NO_EFFECT,
    )

    const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
        (state) => (!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name)),
        params.validateAttempt ?? (() => true)
    )
    return makeWeaponskill(ShellJob.RPR, name, unlockLevel, {
        ...params,
        onConfirm: onConfirm,
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = basePotencyModifiers(state);
            if (params.combo && state.resources.get(params.combo.resource).availableAmount() === params.combo.resourceValue) {
                mods.push(
                    makeComboModifier(getBasePotency(state, params.combo.potency) - getBasePotency(state, params.potency))
                );
            }

            if (params.positional
                && (state.hasResourceAvailable(ResourceType.TrueNorth)
                    || (params.positional.location === "flank" && state.hasResourceAvailable(ResourceType.FlankPositional))
                    || (params.positional.location === "rear" && state.hasResourceAvailable(ResourceType.RearPositional)))
            ) {
                mods.push(makePositionalModifier(getBasePotency(state, params.positional.potency) - getBasePotency(state, params.potency)));
            }

            if ([SkillName.Gibbet, SkillName.ExecutionersGibbet].includes(name)
            && state.hasResourceAvailable(ResourceType.EnhancedGibbet)) {
                mods.push(Modifiers.EnhancedGibbet)
            }

            if ([SkillName.Gallows, SkillName.ExecutionersGallows].includes(name)
            && state.hasResourceAvailable(ResourceType.EnhancedGallows)) {
                mods.push(Modifiers.EnhancedGallows)
            }

            if (name === SkillName.VoidReaping
            && state.hasResourceAvailable(ResourceType.EnhancedVoidReaping)) {
            }

            if (name === SkillName.CrossReaping
            && state.hasResourceAvailable(ResourceType.EnhancedCrossReaping)) {
                mods.push(Modifiers.EnhancedCrossReaping);
            }

            if (name === SkillName.PlentifulHarvest
            && state.hasResourceAvailable(ResourceType.ImmortalSacrifice)) {
                for (let i = 0; i < state.resources.get(ResourceType.ImmortalSacrifice).availableAmount(); i++) {
                    mods.push(Modifiers.ImmortalSacrifice);
                }
            }

            return mods;
        },
        validateAttempt: validateAttempt,
    })
}

const makeRPRAbility = (name: RPRSkillName, unlockLevel: number, cdName: ResourceType, params: {
    isPhysical?: boolean,
    potency?: number | Array<[TraitName, number]>,
    replaceIf?: ConditionalSkillReplace<RPRState>[],
    highlightIf?: StatePredicate<RPRState>,
    startOnHotbar?: boolean,
    applicationDelay?: number,
    cooldown: number,
    maxCharges?: number,
    validateAttempt?: StatePredicate<RPRState>,
    onConfirm?: EffectFn<RPRState>,
    onApplication?: EffectFn<RPRState>,
}): Ability<RPRState> => { 

    const onConfirm = combineEffects(
        baseOnConfirm(name),
        params.onConfirm ?? NO_EFFECT,
    );

    const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
        (state) => (!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name)),
        params.validateAttempt ?? (() => true)
    );

    return makeAbility(ShellJob.RPR, name, unlockLevel, cdName, {
        ...params,
        onConfirm: onConfirm,
        validateAttempt: validateAttempt,
        jobPotencyModifiers: (state) => {
            const mods = basePotencyModifiers(state);
            return mods
        },
    });
}

makeRPRWeaponskill(SkillName.ShadowOfDeath, 10, {
    replaceIf: [],
    potency: 300,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 1.15,
    highlightIf: (_state) => false,
    onConfirm: (state) => state.refreshDeathsDesign(),
});

makeRPRWeaponskill(SkillName.Slice, 1, {
    replaceIf: [],
    potency: [
        [TraitName.Never, 260],
        [TraitName.MeleeMasteryII, 320],
        [TraitName.MeleeMasteryIII, 460]
    ],
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.49,
    highlightIf: (_state: Readonly<RPRState>) => false,
});

makeRPRWeaponskill(SkillName.WaxingSlice, 5, {
    potency: [
        [TraitName.Never, 100],
        [TraitName.MeleeMasteryII, 160],
        [TraitName.MeleeMasteryIII, 260]
    ],
    combo: {
        potency: [
            [TraitName.Never, 340],
            [TraitName.MeleeMasteryII, 400],
            [TraitName.MeleeMasteryIII, 500],
        ],
        resource: ResourceType.RPRCombo,
        resourceValue: 1,
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.58,
    highlightIf: function (state: Readonly<RPRState>): boolean {
        return state.resources.get(ResourceType.RPRCombo).availableAmount() === 1;
    }
});

makeRPRWeaponskill(SkillName.InfernalSlice, 30, {
    replaceIf: [],
    potency: [
        [TraitName.Never, 100],
        [TraitName.MeleeMasteryII, 180],
        [TraitName.MeleeMasteryIII, 280],
    ],
    combo: {
        potency: [
            [TraitName.Never, 420],
            [TraitName.MeleeMasteryII, 500],
            [TraitName.MeleeMasteryIII, 600],
        ],
        resource: ResourceType.RPRCombo,
        resourceValue: 2,
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.54,
    highlightIf: function (state: Readonly<RPRState>): boolean {
        return state.resources.get(ResourceType.RPRCombo).availableAmount() === 2;
    }
});


makeRPRWeaponskill(SkillName.SoulSlice, 60, {
    replaceIf: [],
    potency: [
        [TraitName.Never, 460],
        [TraitName.MeleeMasteryIII, 520]
    ],
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.99,
    highlightIf: (_state) => false,
    secondaryCooldown: {
        cdName: ResourceType.cd_SoulSlice,
        cooldown: 30,
        maxCharges: 2,
    }
});

makeRPRWeaponskill(SkillName.Gibbet, 70, {
    replaceIf: [
        {
            newSkill: SkillName.ExecutionersGibbet,
            condition: (state) => state.hasResourceAvailable(ResourceType.Executioner), 
        },
        {
            newSkill: SkillName.VoidReaping,
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
        }
    ],
    potency: [
        [TraitName.Never, 460],
        [TraitName.MeleeMasteryIII, 500],
    ],
    positional: {
        potency: [
            [TraitName.Never, 520],
            [TraitName.MeleeMasteryIII, 560],
        ],
        location: "flank"
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.5,
    highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGibbet, SkillName.Gibbet),
    validateAttempt: reaverPredicate,
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedGibbet)) state.resources.get(ResourceType.EnhancedGibbet).consume(1);
        state.setTimedResource(ResourceType.EnhancedGallows, 1);
    }
});

makeRPRWeaponskill(SkillName.Gallows, 70, {
    replaceIf: [
        {
            newSkill: SkillName.ExecutionersGallows,
            condition: (state) => state.resources.get(ResourceType.Executioner).available(1),
        },
        {
            newSkill: SkillName.CrossReaping,
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
        }
    ],
    potency: [
        [TraitName.Never, 460],
        [TraitName.MeleeMasteryIII, 500],
    ],
    positional: {
        potency: [
            [TraitName.Never, 520],
            [TraitName.MeleeMasteryIII, 560],
        ],
        location: "rear"
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.53,
    highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGallows, SkillName.Gallows),
    validateAttempt: reaverPredicate,
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedGallows)) state.resources.get(ResourceType.EnhancedGallows).consume(1);
        state.setTimedResource(ResourceType.EnhancedGibbet, 1);
    }
});

makeRPRWeaponskill(SkillName.Guillotine, 70, {
    replaceIf: [
        {
            newSkill: SkillName.ExecutionersGuillotine,
            condition: (state) => state.resources.get(ResourceType.Executioner).available(1),
        },
        {
            newSkill: SkillName.GrimReaping,
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
        }
    ],
    potency: 200,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.49,
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.SoulReaver),
    validateAttempt: reaverPredicate,
});

makeRPRWeaponskill(SkillName.ExecutionersGibbet, 96, {
    replaceIf: [],
    startOnHotbar: false,
    potency: [
        [TraitName.MeleeMasteryIII, 700],
    ],
    positional: {
        potency: [
            [TraitName.MeleeMasteryIII, 760],
        ],
        location: "flank"
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.62,
    highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGibbet, SkillName.ExecutionersGibbet),
    validateAttempt: executionerPredicate,
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedGibbet)) state.resources.get(ResourceType.EnhancedGibbet).consume(1);
        state.setTimedResource(ResourceType.EnhancedGallows, 1);
    } 
});

makeRPRWeaponskill(SkillName.ExecutionersGallows, 96, {
    startOnHotbar: false,
    potency: [
        [TraitName.MeleeMasteryIII, 700],
    ],
    positional: {
        potency: [
            [TraitName.MeleeMasteryIII, 760],
        ],
        location: "flank"
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.62,
    highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGallows, SkillName.ExecutionersGallows),
    validateAttempt: executionerPredicate,
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedGallows)) state.resources.get(ResourceType.EnhancedGallows).consume(1);
        state.setTimedResource(ResourceType.EnhancedGibbet, 1);
    } 
});

makeRPRWeaponskill(SkillName.PlentifulHarvest, 88, {
    replaceIf: [],
    potency: 720,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 1.16,
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.ImmortalSacrifice, 1),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ImmortalSacrifice, 1)
                                && !state.hasResourceAvailable(ResourceType.BloodsownCircle),
    onConfirm: (state) => {
        state.resources.get(ResourceType.ImmortalSacrifice).consume(state.resources.get(ResourceType.ImmortalSacrifice).availableAmount());
        state.setTimedResource(ResourceType.IdealHost, 1);
        state.setTimedResource(ResourceType.PerfectioOcculta, 1);
    }
});

makeRPRSpell(SkillName.Communio, 90, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
            newSkill: SkillName.Perfectio,
        }
    ],
    potency: 1100,
    aspect: Aspect.Other,
    castTime: 1.3,
    recastTime: 2.5,
    applicationDelay: 1.16,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.Enshrouded)
                            && state.resources.get(ResourceType.LemureShroud).availableAmount() === 1,
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.PerfectioOcculta)) {
            state.resources.get(ResourceType.PerfectioOcculta).consume(1);
            state.setTimedResource(ResourceType.PerfectioParata, 1);
        }
        state.exitEnshroud();
        if (state.hasResourceAvailable(ResourceType.EnhancedCrossReaping)) {
            state.resources.get(ResourceType.EnhancedCrossReaping).consume(1);
        }
        if (state.hasResourceAvailable(ResourceType.EnhancedVoidReaping)) {
            state.resources.get(ResourceType.EnhancedVoidReaping).consume(1);
        }
    }
});

makeRPRSpell(SkillName.Harpe, 15, {
    potency: 300,
    replaceIf: [],
    aspect: Aspect.Other,
    castTime: 1.3,
    recastTime: 2.5,
    applicationDelay: 0.9,
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.EnhancedHarpe),
});

makeRPRSpell(SkillName.Soulsow, 82, {
    potency: 0,
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
            newSkill: SkillName.HarvestMoon,
        },
    ],
    startOnHotbar: true,
    aspect: Aspect.Other,
    castTime: 5,
    recastTime: 2.5,
    applicationDelay: 0,
    highlightIf: (_state) => false,
    onConfirm: (state) => state.resources.get(ResourceType.Soulsow).gain(1),
});

makeRPRSpell(SkillName.HarvestMoon, 82, {
    potency: [
        [TraitName.Never, 600],
        [TraitName.MeleeMasteryIII, 800],
    ],
    replaceIf: [],
    startOnHotbar: false,
    aspect: Aspect.Other,
    castTime: 0,
    recastTime: 2.5,
    applicationDelay: 0.9,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
    onConfirm: (state) => state.resources.get(ResourceType.Soulsow).consume(1),
});

makeRPRAbility(SkillName.Gluttony, 76, ResourceType.cd_Gluttony, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
            newSkill: SkillName.Sacrificium,
        }
    ],
    isPhysical: false,
    potency: 520,
    startOnHotbar: true,
    applicationDelay: 1.06,
    cooldown: 60,
    validateAttempt: soulSpendPredicate(50),
    highlightIf: soulSpendPredicate(50),
});

makeRPRAbility(SkillName.BloodStalk, 50, ResourceType.cd_BloodStalk, {
    replaceIf: [
        {
            newSkill: RPRSkillName.LemuresSlice,
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
        },
        {
            newSkill: RPRSkillName.UnveiledGibbet,
            condition: (state) => state.hasResourceAvailable(ResourceType.EnhancedGibbet)
        },
        {
            newSkill: RPRSkillName.UnveiledGallows,
            condition: (state) => state.hasResourceAvailable(ResourceType.EnhancedGallows)
        }
    ],
    isPhysical: true,
    potency: 340,
    startOnHotbar: true,
    applicationDelay: 0.89,
    cooldown: 1,
    validateAttempt: soulSpendPredicate(50),
    highlightIf: soulSpendPredicate(50),
});

makeRPRAbility(SkillName.GrimSwathe, 55, ResourceType.cd_BloodStalk, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
            newSkill: SkillName.LemuresScythe,
        }
    ],
    isPhysical: true,
    potency: 140,
    startOnHotbar: true,
    applicationDelay: 0.58,
    cooldown: 1,
    validateAttempt: soulSpendPredicate(50),
    highlightIf: soulSpendPredicate(50),
});

makeRPRAbility(SkillName.UnveiledGibbet, 70, ResourceType.cd_BloodStalk, {
    isPhysical: true,
    potency: 440,
    startOnHotbar: false,
    applicationDelay: 0.54,
    cooldown: 1,
    validateAttempt: soulSpendPredicate(50),
    highlightIf: soulSpendPredicate(50),
});

makeRPRAbility(SkillName.UnveiledGallows, 70, ResourceType.cd_BloodStalk, {
    isPhysical: true,
    potency: 440,
    startOnHotbar: false,
    applicationDelay: 0.54,
    cooldown: 1,
    validateAttempt: soulSpendPredicate(50),
    highlightIf: soulSpendPredicate(50),
});

makeRPRAbility(SkillName.LemuresSlice, 86, ResourceType.cd_BloodStalk, {
    isPhysical: true,
    potency: [
        [TraitName.Never, 240],
        [TraitName.MeleeMasteryIII, 280]
    ],
    startOnHotbar: false,
    applicationDelay: 0.7,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
    onConfirm: (state) => {
        state.resources.get(ResourceType.VoidShroud).consume(2);
    }
});

makeRPRAbility(SkillName.Sacrificium, 92, ResourceType.cd_BloodStalk, {
    isPhysical: false,
    potency: 530,
    startOnHotbar: false,
    applicationDelay: 0.76,
    cooldown: 1,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Oblatio),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.Oblatio),
    onConfirm: (state) => state.resources.get(ResourceType.Oblatio).consume(1),
});

makeResourceAbility(ShellJob.RPR, SkillName.ArcaneCircle, 72, ResourceType.cd_ArcaneCircle, {
    rscType: ResourceType.ArcaneCircle,
    applicationDelay: 0.6,
    startOnHotbar: true,
    maxCharges: 1,
    potency: 0,
    onApplication: (state: RPRState) => {
        state.setTimedResource(ResourceType.CircleOfSacrifice, 1);
        state.setTimedResource(ResourceType.BloodsownCircle, 1);
    },
    cooldown: 120,
});

makeRPRWeaponskill(SkillName.VoidReaping, 80, {
    replaceIf: [],
    startOnHotbar: false,
    potency: [
        [TraitName.Never, 460],
        [TraitName.MeleeMasteryIII, 500],
    ],
    aspect: Aspect.Physical,
    recastTime: 1.5,
    applicationDelay: 0.53,
    highlightIf: (state) => !state.hasResourceAvailable(ResourceType.EnhancedCrossReaping),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedVoidReaping)) state.resources.get(ResourceType.EnhancedVoidReaping).consume(1);
        state.setTimedResource(ResourceType.EnhancedCrossReaping, 1);
        state.resources.get(ResourceType.LemureShroud).consume(1);
        state.resources.get(ResourceType.VoidShroud).gain(1);

        if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
            state.exitEnshroud();
        }
    },
});

makeRPRWeaponskill(SkillName.CrossReaping, 80, {
    replaceIf: [],
    startOnHotbar: false,
    potency: [
        [TraitName.Never, 460],
        [TraitName.MeleeMasteryIII, 500],
    ],
    aspect: Aspect.Physical,
    recastTime: 1.5,
    applicationDelay: 0.53,
    highlightIf: (state) => !state.hasResourceAvailable(ResourceType.EnhancedVoidReaping),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
    onConfirm: (state) => {
        if (state.hasResourceAvailable(ResourceType.EnhancedCrossReaping)) state.resources.get(ResourceType.EnhancedCrossReaping).consume(1);
        state.setTimedResource(ResourceType.EnhancedVoidReaping, 1);
        state.resources.get(ResourceType.LemureShroud).consume(1);
        state.resources.get(ResourceType.VoidShroud).gain(1);

        if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
            state.exitEnshroud();
        }
    }
});

makeResourceAbility(ShellJob.RPR, SkillName.Enshroud, 80, ResourceType.cd_Enshroud, {
    rscType: ResourceType.Enshrouded,
    highlightIf: (state) => {
        return state.hasResourceAvailable(ResourceType.Shroud, 50)
            || state.hasResourceAvailable(ResourceType.IdealHost);
    },
    applicationDelay: 0,
    startOnHotbar: true,
    cooldown: 15,
    validateAttempt: (state) => {
        return state.hasResourceAvailable(ResourceType.Shroud, 50)
            || state.hasResourceAvailable(ResourceType.IdealHost);
    },
    onConfirm: combineEffects(baseOnConfirm(SkillName.Enshroud), (state: RPRState) => {
        state.enterEnshroud();
    }) as EffectFn<GameState>,
});

makeRPRWeaponskill(SkillName.Perfectio, 100, {
    replaceIf: [],
    potency: 1300,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 1.29,
    startOnHotbar: false,
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
    onConfirm: (state) => {
        state.resources.get(ResourceType.PerfectioParata).consume(1);
    }
});

makeRPRAbility(SkillName.Regress, 74, ResourceType.cd_BloodStalk, {
    cooldown: 1,
    startOnHotbar: false,
    highlightIf: (_state) => true,
    onConfirm: (state) => state.resources.get(ResourceType.Threshold).consume(1),
});

makeRPRAbility(SkillName.HellsIngress, 20, ResourceType.cd_IngressEgress, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.Threshold) && state.hasResourceAvailable(ResourceType.HellsIngressUsed),
            newSkill: SkillName.Regress,
        }
    ],
    cooldown: 20,
    onConfirm:(state) => {
        state.resources.get(ResourceType.HellsIngressUsed).gain(1);
        if (Traits.hasUnlocked(TraitName.Hellsgate, state.config.level)) state.setTimedResource(ResourceType.Threshold, 1);
    }
});

makeRPRAbility(SkillName.HellsEgress, 20, ResourceType.cd_IngressEgress, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.Threshold) && !state.hasResourceAvailable(ResourceType.HellsIngressUsed),
            newSkill: SkillName.Regress,
        }
    ],
    cooldown: 20,
    onConfirm:(state) => {
        if (state.hasResourceAvailable(ResourceType.HellsIngressUsed)) state.resources.get(ResourceType.HellsIngressUsed).consume(1);
        if (Traits.hasUnlocked(TraitName.Hellsgate, state.config.level)) state.setTimedResource(ResourceType.Threshold, 1);
    }
});

makeRPRAbility(SkillName.ArcaneCrest, 40, ResourceType.cd_ArcaneCrest, {
    replaceIf: [
        {
            condition: (state) => state.hasResourceAvailable(ResourceType.CrestOfTimeBorrowed),
            newSkill: SkillName.ArcaneCrestPop,
        }
    ],
    cooldown: 30,
    onConfirm: (state) => state.setTimedResource(ResourceType.CrestOfTimeBorrowed, 1),
});

makeRPRAbility(SkillName.ArcaneCrestPop, 40, ResourceType.cd_ArcaneCrestPop, {
    cooldown: 1,
    startOnHotbar: false,
    onConfirm: (state) => {
        state.resources.get(ResourceType.CrestOfTimeBorrowed).consume(1);
        state.setTimedResource(ResourceType.CrestOfTimeReturned, 1);
    }
});

makeRPRWeaponskill(SkillName.WhorlOfDeath, 35, {
    replaceIf: [],
    potency: 100,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 1.15,
    highlightIf: (_state) => false,
    onConfirm: (state) => state.refreshDeathsDesign(),
});

makeRPRWeaponskill(SkillName.SpinningScythe, 25, {
    potency: 160,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.62,
    highlightIf: (_state: Readonly<RPRState>) => false,
});

makeRPRWeaponskill(SkillName.NightmareScythe, 45, {
    potency: 140,
    combo: {
        potency: 200,
        resource: ResourceType.RPRAoECombo,
        resourceValue: 1,
    },
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.8,
    highlightIf: function (state: Readonly<RPRState>): boolean {
        return state.resources.get(ResourceType.RPRAoECombo).availableAmount() === 1;
    }
});

makeRPRWeaponskill(SkillName.SoulScythe, 65, {
    potency: 180,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.66,
    highlightIf: (_state) => false,
    secondaryCooldown: {
        cdName: ResourceType.cd_SoulSlice,
        cooldown: 30,
        maxCharges: 2,
    }
});

makeRPRWeaponskill(SkillName.ExecutionersGuillotine, 96, {
    startOnHotbar: false,
    potency: 300,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 0.53,
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.Executioner),
    validateAttempt: executionerPredicate,
});

makeRPRWeaponskill(SkillName.GrimReaping, 80, {
    startOnHotbar: false,
    potency: 200,
    recastTime: 1.5,
    applicationDelay: 0.8,
    highlightIf: (_state) => true,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
    onConfirm: (state) => {
        state.resources.get(ResourceType.LemureShroud).consume(1);
        state.resources.get(ResourceType.VoidShroud).gain(1);

        if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
            state.exitEnshroud();
        }
    },
    aspect: Aspect.Physical
});

makeRPRAbility(SkillName.LemuresScythe, 86, ResourceType.cd_BloodStalk, {
    isPhysical: true,
    potency: 100,
    applicationDelay: 0.66,
    cooldown: 1,
    startOnHotbar: false,
    validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
    highlightIf: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
    onConfirm: (state) => {
        state.resources.get(ResourceType.VoidShroud).consume(2);
    }
});