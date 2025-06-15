import { BlueMageState } from "../../Game/Jobs/BlueMage";
import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { BlueMageResourceKey, BlueMage_STATUSES } from "../../Game/Data/Jobs/BlueMage";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { getResourceInfo, ResourceInfo } from "../../Game/Resources";
const BlueMage_DEBUFFS: BlueMageResourceKey[] = [
	"Song_of_Torment_DOT",
	"Nightbloom_DOT",
	"Feather_Rain_DOT",
	"Mortal_Flame_DOT",
	"Breath_of_Magic_DOT",
];

const BlueMage_BUFFS: BlueMageResourceKey[] = (
	Object.keys(BlueMage_STATUSES) as BlueMageResourceKey[]
).filter((key) => !BlueMage_DEBUFFS.includes(key));

(Object.keys(BlueMage_STATUSES) as BlueMageResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `BlueMage/${RESOURCES[buff].name}.png`),
);

export class BlueMageStatusPropsGenerator extends StatusPropsGenerator<BlueMageState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BlueMage_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return BlueMage_BUFFS.map((key) => {
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const AP = this.state.resources.get("AP");
		const APMaxTimeout = (getResourceInfo("BlueMage", "AP") as ResourceInfo).maxTimeout;
		const APCountdown =
			AP.availableAmount() < AP.maxValue
				? this.state.resources.timeTillReady("AP")
				: APMaxTimeout;
		const Winged_Reprobation = this.state.resources.get("Winged_Reprobation");
		return [
			{
				kind: "counter",
				name: localize({
					en: "AP",
					zh: "穿甲散弹",
				}),
				color: colors.bluemage.surpanakha,
				currentStacks: AP.availableAmount(),
				maxStacks: AP.maxValue,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({
					en: "timer",
					zh: "计时器",
				}),
				color: colors.bluemage.surpanakha,
				progress: 1 - APCountdown / APMaxTimeout,
				valueString: APCountdown.toFixed(2),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({
					en: "Winged Reprobation",
					zh: "断罪飞翔",
				}),
				color: colors.bluemage.wingedreprobation,
				currentStacks: Winged_Reprobation.availableAmount(),
				maxStacks: Winged_Reprobation.maxValue,
			} as ResourceCounterProps,
		];
	}
}

/*
export class BlueMageStatusPropsGenerator extends StatusPropsGenerator<BlueMageState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		return [];
	}
}
*/
