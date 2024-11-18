import { ShellJob } from "../../Controller/Common";
import { ResourceType, SkillName } from "../Common";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeResource } from "../Resources";

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
}