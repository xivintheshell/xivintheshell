import { ResourceType } from "../../Game/Common";
import { BRDState } from "../../Game/Jobs/BRD";
import { getCurrentThemeColors } from "../ColorTheme";
import {
    BuffProps,
    registerBuffIcon,
    ResourceDisplayProps,
    StatusPropsGenerator,
} from "../StatusDisplay";

const BARD_DEBUFFS = [
    ResourceType.CausticBite,
    ResourceType.Stormbite,
];

const BARD_BUFFS = [
    ResourceType.HawksEye,
    ResourceType.RagingStrikes,
    ResourceType.Barrage,
    ResourceType.ArmysMuse,
    ResourceType.ArmysEthos,
    ResourceType.BlastArrowReady,
    ResourceType.ResonantArrowReady,
    ResourceType.RadiantEncoreReady,
    ResourceType.MagesBallad,
    ResourceType.ArmysPaeon,
    ResourceType.WanderersMinuet,
    ResourceType.BattleVoice,
    ResourceType.WardensPaean,
    ResourceType.Troubadour,
    ResourceType.NaturesMinne,
    ResourceType.RadiantFinale,
];

[
    ...BARD_BUFFS,
    ...BARD_DEBUFFS,
].forEach((buff) => registerBuffIcon(buff, `BRD/${buff}.png`))

export class BRDStatusPropsGenerator extends StatusPropsGenerator<BRDState> {

    override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
        return [
            ...BARD_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false)),
        ]
    }

    override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
        return [
            ...BARD_BUFFS.map((rscType) => this.makeCommonTimer(rscType)),
        ]
    }

    override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
        const colors = getCurrentThemeColors();
        const resources = this.state.resources

        const infos: ResourceDisplayProps[] = []
        
        return infos
    }
}