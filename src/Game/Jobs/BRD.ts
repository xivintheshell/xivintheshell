import { ShellJob } from "../../Controller/Common";
import { controller } from "../../Controller/Controller";
import { Aspect, BuffType, ResourceType, SkillName } from "../Common";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { PotencyModifier, Modifiers, PotencyMultiplier, Potency } from "../Potency";
import { makeResource } from "../Resources";
import { SkillAutoReplace, ConditionalSkillReplace, StatePredicate, EffectFn, CooldownGroupProperies, Weaponskill, combineEffects, NO_EFFECT, makeWeaponskill } from "../Skills";
import { TraitName } from "../Traits";

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
            skillName: SkillName.CausticBite,
            dotApplied: ResourceType.CausticBite
        }, 
        {
            skillName: SkillName.Stormbite,
            dotApplied: ResourceType.Stormbite
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

const dotAppliers: Array<{skillName: SkillName, dotName: ResourceType}> = [
    { skillName: SkillName.CausticBite, dotName: ResourceType.CausticBite },
    { skillName: SkillName.Stormbite, dotName: ResourceType.Stormbite },
];
dotAppliers.forEach((props) => {
    makeWeaponskill_BRD(props.skillName, 1, {
        potency: 100,
        applicationDelay: 0.5,
        onConfirm: (state, node) => {
            const mods: PotencyMultiplier[] = [];
            if (state.hasResourceAvailable(ResourceType.Tincture)) {
                mods.push(Modifiers.Tincture);
                node.addBuff(BuffType.Tincture);
            }

            const dotTicks = 15
            const tickPotency = 100

            for (let i = 0; i < dotTicks; i ++) {
                const dotPotency = new Potency({
                    config: controller.record.config ?? controller.gameConfig,
                    sourceTime: state.getDisplayTime(),
                    sourceSkill: props.skillName,
                    aspect: Aspect.Other,
                    basePotency: state.config.adjustedDoTPotency(tickPotency, "sks"),
                    snapshotTime: state.getDisplayTime(),
                    description: "DoT " + (i+1) + `/${dotTicks}`
                });
                dotPotency.modifiers = mods;
                node.addDoTPotency(dotPotency)
            }
        },
        onApplication: (state, node) => state.applyDoT(props.dotName, node),
    })
})