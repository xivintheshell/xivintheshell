import { BLUState } from "../../Game/Jobs/BLU";
import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { BLUResourceKey, BLU_STATUSES } from "../../Game/Data/Jobs/BLU";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { getResourceInfo, ResourceInfo } from "../../Game/Resources";
const BLU_DEBUFFS: BLUResourceKey[] = [
	"SONG_OF_TORMENT",
	"NIGHTBLOOM",
	"FEATHER_RAIN",
	"MORTAL_FLAME",
	"BREATH_OF_MAGIC",
];

const BLU_BUFFS: BLUResourceKey[] = (Object.keys(BLU_STATUSES) as BLUResourceKey[]).filter(
	(key) => !BLU_DEBUFFS.includes(key),
);

(Object.keys(BLU_STATUSES) as BLUResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `BLU/${RESOURCES[buff].name}.png`),
);

export class BLUStatusPropsGenerator extends StatusPropsGenerator<BLUState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BLU_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return BLU_BUFFS.map((key) => {
			return this.makeCommonTimer(key);
		});
	}
	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const AP = this.state.resources.get("AP");
		const APMaxTimeout = (getResourceInfo("BLU", "AP") as ResourceInfo).maxTimeout;
		const APCountdown =
			AP.availableAmount() < AP.maxValue
				? this.state.resources.timeTillReady("AP")
				: APMaxTimeout;
		return [
			{
				kind: "counter",
				name: localize({
					en: "AP",
					zh: "穿甲散弹",
				}),
				color: colors.blu.surpanakha,
				currentStacks: AP.availableAmount(),
				maxStacks: AP.maxValue,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({
					en: "timer",
					zh: "计时器",
				}),
				color: colors.blu.surpanakha,
				progress: 1 - APCountdown / APMaxTimeout,
				valueString: APCountdown.toFixed(2),
			} as ResourceBarProps,
		];
	}
}
