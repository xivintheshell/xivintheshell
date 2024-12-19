import { ResourceType, TraitName } from "../../Game/Common";
import { BRDState } from "../../Game/Jobs/BRD";
import { Traits } from "../../Game/Traits";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	CodaCounterProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

const BARD_DEBUFFS = [ResourceType.CausticBite, ResourceType.Stormbite];

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

[...BARD_BUFFS, ...BARD_DEBUFFS].forEach((buff) => registerBuffIcon(buff, `BRD/${buff}.png`));

export class BRDStatusPropsGenerator extends StatusPropsGenerator<BRDState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BARD_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [...BARD_BUFFS.map((rscType) => this.makeCommonTimer(rscType))];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const pitchPerfect = resources.get(ResourceType.PitchPerfect);
		const repertoire = resources.get(ResourceType.Repertoire);

		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localize({
					en: "Pitch Perfect",
				}),
				color: colors.brd.pitchPerfect,
				currentStacks: pitchPerfect.availableAmount(),
				maxStacks: pitchPerfect.maxValue,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "Repertoire",
				}),
				color: colors.brd.repertoire,
				currentStacks: repertoire.availableAmount(),
				maxStacks: repertoire.maxValue,
			} as ResourceCounterProps,
		];

		if (Traits.hasUnlocked(TraitName.SoulVoice, this.state.config.level)) {
			const soulVoice = resources.get(ResourceType.SoulVoice);

			infos.push({
				kind: "bar",
				name: localize({
					en: "Soul Voice",
				}),
				color: colors.brd.soulVoice,
				progress: soulVoice.availableAmount() / soulVoice.maxValue,
				valueString: soulVoice.availableAmount().toFixed(0),
			} as ResourceBarProps);
		}

		if (Traits.hasUnlocked(TraitName.MinstrelsCoda, this.state.config.level)) {
			infos.push({
				kind: "coda",
				name: localize({
					en: "Coda",
				}),
				hasWanderers: this.state.hasResourceAvailable(ResourceType.WanderersCoda),
				hasMages: this.state.hasResourceAvailable(ResourceType.MagesCoda),
				hasArmys: this.state.hasResourceAvailable(ResourceType.ArmysCoda),
				wanderersColor: colors.brd.wanderersCoda,
				magesColor: colors.brd.magesCoda,
				armysColor: colors.brd.armysCoda,
			} as CodaCounterProps);
		}

		return infos;
	}
}
