import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { SAMState } from "../../Game/Jobs/SAM";
import { ThemeColors } from "../../Components/ColorTheme";
import { localize } from "../../Components/Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { SAM_STATUSES } from "../../Game/Data/Jobs/SAM";

(Object.keys(SAM_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SAM/${RESOURCES[buff].name}.png`),
);

export class SAMStatusPropsGenerator extends StatusPropsGenerator<SAMState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return this.makeTargetedTimers("HIGANBANA_DOT");
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return (Object.keys(SAM_STATUSES) as ResourceKey[])
			.filter((key) => key !== "HIGANBANA_DOT")
			.map((key) => this.makeCommonTimer(key));
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;
		const kenki = resources.get("KENKI").availableAmount();
		const meditation = resources.get("MEDITATION").availableAmount();
		// TODO use simplified gauge iconography so people don't have to remember names
		return [
			{
				kind: "sen",
				name: localize({ en: "sen", zh: "闪" }),
				hasSetsu: this.state.hasResourceAvailable("SETSU"),
				hasGetsu: this.state.hasResourceAvailable("GETSU"),
				hasKa: this.state.hasResourceAvailable("KA_SEN"),
				setsuColor: colors.sam.setsu,
				getsuColor: colors.sam.getsu,
				kaColor: colors.sam.kaSen,
			},
			{
				kind: "bar",
				name: localize({ en: "kenki", zh: "剑气" }),
				color: colors.sam.kenki,
				progress: kenki / 100,
				valueString: kenki.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({ en: "meditation", zh: "剑压" }),
				color: colors.sam.meditation,
				currentStacks: meditation,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
	}
}
