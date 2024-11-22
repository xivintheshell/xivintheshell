import { ShellJob } from "../../Controller/Common";
import { controller } from "../../Controller/Controller";
import { Aspect, ResourceType, SkillName } from "../Common";
import { RPRResourceType, RPRSkillName } from "../Constants/RPR";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, makeResource } from "../Resources";
import { combineEffects, ConditionalSkillReplace, EffectFn, getBasePotency, makeWeaponskill, NO_EFFECT, StatePredicate, Weaponskill } from "../Skills";
import { TraitName } from "../Traits";

function makeRPRResource(type: ResourceType, maxValue: number, params?: {timeout?: number, default?: number}) {
    makeResource(ShellJob.RPR, type, maxValue, params ?? {});
}

makeRPRResource(ResourceType.Soul, 100);
makeRPRResource(ResourceType.Shroud, 100);

makeRPRResource(ResourceType.DeathsDesign, 1, {})
makeRPRResource(ResourceType.SoulReaver, 1, {timeout: 30});
makeRPRResource(ResourceType.EnhancedGibbet, 1, {timeout: 60});
makeRPRResource(ResourceType.EnhancedGallows, 1, {timeout: 60});
makeRPRResource(ResourceType.Executioner, 2, {timeout: 30});

makeRPRResource(ResourceType.Enshrouded, 1, {timeout: 30});
makeRPRResource(ResourceType.LemureShroud, 5, {timeout: 30});
/* Not giving timeout for this because it needs to be zeroe-ed out when enshroud ends anyway
 * And I don't want the timeout to hide logic errors with that */
makeRPRResource(ResourceType.VoidShroud, 5); // Impossible for it to last 30s, but 30s is an upper bound
makeRPRResource(ResourceType.Oblatio, 1, {timeout: 30});
makeRPRResource(ResourceType.EnhancedVoidReaping, 1, {timeout: 30});
makeRPRResource(ResourceType.EnhancedCrossReaping, 1, {timeout: 30});

makeRPRResource(ResourceType.IdealHost, 1, {timeout: 30});
makeRPRResource(ResourceType.PerfectioOcculta, 1, {timeout: 30});
makeRPRResource(ResourceType.PerfectioParata, 1, {timeout: 30});

makeRPRResource(ResourceType.ArcaneCircle, 1, {timeout: 20}); // 20.00s exactly
makeRPRResource(ResourceType.CircleOfSacrifice, 1, {timeout: 5});
makeRPRResource(ResourceType.BloodsownCircle, 1, {timeout: 6});
makeRPRResource(ResourceType.ImmortalSacrifice, 8, {timeout: 30});

makeRPRResource(ResourceType.ArcaneCrest, 1, {timeout: 5});
makeRPRResource(ResourceType.CrestOfTimeBorrowed, 1, {timeout: 5});
makeRPRResource(ResourceType.CrestOfTimeReturned, 1, {timeout: 15});

makeRPRResource(ResourceType.Soulsow, 1);
makeRPRResource(ResourceType.Threshold, 1, {timeout: 10});
makeRPRResource(ResourceType.EnhancedHarpe, 1, {timeout: 10});

makeRPRResource(ResourceType.RPRCombo, 2, {timeout: 30});
makeRPRResource(RPRResourceType.RPRAoECombo, 1, {timeout: 30});

export class RPRState extends GameState {
    constructor(config: GameConfig) {
        super(config);
        [
            new CoolDown(ResourceType.cd_ArcaneCircle, 120, 1, 1),
            new CoolDown(ResourceType.cd_Gluttony, 60, 1, 1),
            new CoolDown(ResourceType.cd_SoulSlice, 30, 2, 2),
            new CoolDown(ResourceType.cd_Enshroud, 15, 1, 1),

            new CoolDown(ResourceType.cd_ArcaneCrest, 30, 1, 1),
            new CoolDown(ResourceType.cd_IngressRegress, 20, 1, 1),

            new CoolDown(ResourceType.cd_BloodStalk, 1, 1, 1),
            new CoolDown(ResourceType.cd_LemuresSlice, 1, 1, 1),
            new CoolDown(ResourceType.cd_Sacrificium, 1, 1, 1),
        ].forEach((cd) => this.cooldowns.set(cd));

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

    processCombo(skill: SkillName) {
        const currCombo = this.resources.get(ResourceType.RPRCombo).availableAmount();
        const currAoeCombo = this.resources.get(ResourceType.RPRAoECombo).availableAmount();

        let [newCombo, newAoeCombo] = (new Map<SkillName, [number, number]>(
            [
                [SkillName.Slice, [1, 0]],
                [SkillName.WaxingSlice, [currCombo === 1 ? 2 : 0, 0]],
                [SkillName.InfernalSlice, [0, 0]],
                [SkillName.SpinningScythe, [0, 1]],
                [SkillName.InfernalScythe, [0, 0]],
            ]
        )).get(skill) ?? [currCombo, currAoeCombo]; // Any other gcd leaves combo unchanged

        this.setComboState(ResourceType.RPRCombo, newCombo);
        this.setComboState(ResourceType.RPRAoECombo, newAoeCombo);
    }

    processSoulGauge(skill: SkillName) {
        const soul = this.resources.get(ResourceType.Soul);
        if ([SkillName.Slice, SkillName.WaxingSlice, SkillName.InfernalSlice,
            SkillName.SpinningScythe, SkillName.InfernalScythe].includes(skill as RPRSkillName)) {
            
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
        }
    }

    processShroudGauge(skill: SkillName) {
        const shroud = this.resources.get(ResourceType.Shroud);

        if (
            [
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
}

const makeRPRWeaponskill = (name: SkillName, unlockLevel: number, params: {
    replaceIf: ConditionalSkillReplace<RPRState>[],
    startOnHotbar?: boolean,
    potency: number | Array<[TraitName, number]>,
    combo?: {
        potency: number | Array<[TraitName, number]>,
        resource: ResourceType,
        resourceValue: number,
    },
    aspect: Aspect,
    recastTime: number,
    applicationDelay: number,
    validateAttempt?: StatePredicate<RPRState>,
    onConfirm?: EffectFn<RPRState>,
    highlightIf: StatePredicate<RPRState>,
}): Weaponskill<RPRState> => {

    const onConfirm: EffectFn<RPRState> = combineEffects(
        (state) => state.processCombo(name),
        (state) => state.processSoulGauge(name),
        (state) => state.processShroudGauge(name),
        params.onConfirm ?? NO_EFFECT,
    )
    return makeWeaponskill(ShellJob.RPR, name, unlockLevel, {
        ...params,
        onConfirm: onConfirm,
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = [];
            if (params.combo && state.resources.get(params.combo.resource).availableAmount() === params.combo.resourceValue) {
                mods.push(
                    makeComboModifier(getBasePotency(state, params.combo.potency) - getBasePotency(state, params.potency))
                );
            }
            if (state.hasResourceAvailable(ResourceType.ArcaneCircle)) {
                mods.push(Modifiers.ArcaneCircle);
            }
        
            if (state.hasResourceAvailable(ResourceType.DeathsDesign)) {
                mods.push(Modifiers.DeathsDesign);
            }

            return mods;
        },
        validateAttempt: params.validateAttempt,
        applicationDelay: params.applicationDelay,
        isInstantFn: (state) => !(
            (name === SkillName.Communio)
            || (name === SkillName.Harpe && !state.hasResourceAvailable(ResourceType.EnhancedHarpe))
        ),
    })
}

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
})

makeRPRWeaponskill(SkillName.WaxingSlice, 5, {
    replaceIf: [],
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
})

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
    highlightIf: function(state: Readonly<RPRState>): boolean {
        return state.resources.get(ResourceType.RPRCombo).availableAmount() === 2;
    }
})

makeRPRWeaponskill(SkillName.ShadowOfDeath, 10, {
    replaceIf: [],
    potency: 300,
    aspect: Aspect.Physical,
    recastTime: 2.5,
    applicationDelay: 1.15,
    highlightIf: (_state) => false,
    onConfirm: (state) => state.refreshDeathsDesign(),
})