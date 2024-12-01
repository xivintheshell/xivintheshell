import { ShellJob } from "../../Controller/Common";
import { ResourceType, SkillName, TraitName } from "../Common";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { PotencyModifier } from "../Potency";
import { makeResource } from "../Resources";
import { SkillAutoReplace, ConditionalSkillReplace, StatePredicate, EffectFn, CooldownGroupProperies, Weaponskill, combineEffects, NO_EFFECT, makeWeaponskill } from "../Skills";

const makeBRDResource = (rsc: ResourceType, maxValue: number, params? : {timeout?: number, default?: number}) => {
    makeResource(ShellJob.BRD, rsc, maxValue, params ?? {});
}

makeBRDResource(ResourceType.CausticBite, 1, {timeout: 45})
makeBRDResource(ResourceType.Stormbite, 1, {timeout: 45})

export class BRDState extends GameState {
    constructor (config: GameConfig) {
        super(config)

        this.registerRecurringEvents();
    }

    registerRecurringEvents() {
        super.registerRecurringEvents([{
            dotName: ResourceType.CausticBite,
            appliedBy: [SkillName.CausticBite, SkillName.IronJaws]
        }, 
        {
            dotName: ResourceType.Stormbite,
            appliedBy: [SkillName.Stormbite, SkillName.IronJaws],
        }])

        // Something here for Repertoire ticks
    }
}

const makeWeaponskill_BRD = (name: SkillName, unlockLevel: number, params: {
    autoUpgrade?: SkillAutoReplace,
    replaceIf?: ConditionalSkillReplace<BRDState>[],
    startOnHotbar?: boolean,
    potency?: number | Array<[TraitName, number]>,
    applicationDelay?: number,
    validateAttempt?: StatePredicate<BRDState>,
    onConfirm?: EffectFn<BRDState>,
    highlightIf?: StatePredicate<BRDState>,
    onApplication?: EffectFn<BRDState>,
    secondaryCooldown?: CooldownGroupProperies,
}): Weaponskill<BRDState> => {
    const onConfirm: EffectFn<BRDState> = combineEffects(
        params.onConfirm ?? NO_EFFECT,
    );
    const onApplication: EffectFn<BRDState> = params.onApplication ?? NO_EFFECT;
    return makeWeaponskill(ShellJob.BRD, name, unlockLevel, {
        ...params,
        onConfirm: onConfirm,
        onApplication: onApplication,
        recastTime: (state) => {
            return state.config.adjustedSksGCD(2.5) // TODO - Army's Paeon speed modification
        },
        jobPotencyModifiers: (state) => {
            const mods: PotencyModifier[] = [];

            return mods;
        },
    });
}

const dotAppliers: Array<{skillName: SkillName, dotName: ResourceType, initialPotency: number, tickPotency: number}> = [
    { skillName: SkillName.CausticBite, dotName: ResourceType.CausticBite, initialPotency: 150, tickPotency: 20 },
    { skillName: SkillName.Stormbite, dotName: ResourceType.Stormbite, initialPotency: 100, tickPotency: 25 },
];
dotAppliers.forEach((props) => {
    makeWeaponskill_BRD(props.skillName, 1, {
        potency: props.initialPotency,
        applicationDelay: 0.5,
        onConfirm: (state, node) => state.addDoTPotencies({
            node,
            dotName: props.dotName,
            skillName: props.skillName,
            tickPotency: props.tickPotency,
            speedStat: "sks",
        }),
        onApplication: (state, node) => state.applyDoT(props.dotName, node),
    })
})

makeWeaponskill_BRD(SkillName.IronJaws, 56, {
    potency: 100,
    applicationDelay: 0.67,
    onApplication: (state, node) => {
        dotAppliers.forEach((dotParams) => {
            state.refreshDot({
                node,
                dotName: dotParams.dotName,
                tickPotency: dotParams.tickPotency,
                skillName: SkillName.IronJaws,
                speedStat: "sks",
            })
        })
    }
})