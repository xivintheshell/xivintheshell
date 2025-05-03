import { RESOURCES } from "../../Game/Data";
import { BRDResourceKey, BRD_STATUSES } from "../../Game/Data/Jobs/BRD";
import { BRDState } from "../../Game/Jobs/BRD";
import { ThemeColors } from "../ColorTheme";
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

const BARD_DEBUFFS: BRDResourceKey[] = ["CAUSTIC_BITE", "STORMBITE"];

const BARD_BUFFS: BRDResourceKey[] = (Object.keys(BRD_STATUSES) as BRDResourceKey[]).filter(
	(key) => !BARD_DEBUFFS.includes(key),
);

(Object.keys(BRD_STATUSES) as BRDResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `BRD/${RESOURCES[buff].name}.png`),
);

export class BRDStatusPropsGenerator extends StatusPropsGenerator<BRDState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BARD_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [...BARD_BUFFS.map((rscType) => this.makeCommonTimer(rscType))];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const pitchPerfect = resources.get("PITCH_PERFECT");
		const repertoire = resources.get("REPERTOIRE");

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
					en: "Paeon Repertoire",
				}),
				color: colors.brd.repertoire,
				currentStacks: repertoire.availableAmount(),
				maxStacks: repertoire.maxValue,
			} as ResourceCounterProps,
		];

		if (this.state.hasTraitUnlocked("SOUL_VOICE")) {
			const soulVoice = resources.get("SOUL_VOICE");

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

		if (this.state.hasTraitUnlocked("MINSTRELS_CODA")) {
			infos.push({
				kind: "coda",
				name: localize({
					en: "Coda",
				}),
				hasWanderers: this.state.hasResourceAvailable("WANDERERS_CODA"),
				hasMages: this.state.hasResourceAvailable("MAGES_CODA"),
				hasArmys: this.state.hasResourceAvailable("ARMYS_CODA"),
				wanderersColor: colors.brd.wanderersCoda,
				magesColor: colors.brd.magesCoda,
				armysColor: colors.brd.armysCoda,
			} as CodaCounterProps);
		}

		return infos;
	}
}
