import { ResourceKey, RESOURCES } from "../../Game/Data";
import { MCH_STATUSES, MCHResourceKey } from "../../Game/Data/Jobs/MCH";
import { MCHState } from "../../Game/Jobs/MCH";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(MCH_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `MCH/${RESOURCES[buff].name}.png`),
);

export class MCHStatusPropsGenerator extends StatusPropsGenerator<MCHState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [
			...(["WILDFIRE", "BIOBLASTER"] as MCHResourceKey[]).map((key) =>
				this.makeCommonTimer(key, false),
			),
		];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(MCH_STATUSES) as MCHResourceKey[])
				.filter((key) => !(key === "WILDFIRE" || key === "BIOBLASTER"))
				.map((key) => {
					return this.makeCommonTimer(key);
				}),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const heat = resources.get("HEAT_GAUGE").availableAmount();
		const battery = resources.get("BATTERY_GAUGE").availableAmount();

		const punch = resources.get("QUEEN_PUNCHES");
		const finish = resources.get("QUEEN_FINISHERS");

		const queenTime = punch.availableAmount() + finish.availableAmount();
		const queenMax = punch.maxValue + finish.maxValue;

		return [
			{
				kind: "bar",
				name: localize({
					en: "Heat",
					zh: "枪管热度",
				}),
				color: colors.mch.heat,
				progress: heat / 100,
				valueString: heat.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "Battery",
					zh: "电量",
				}),
				color: colors.mch.battery,
				progress: battery / 100,
				valueString: battery.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "Queen Hits",
					zh: "人偶攻击命中",
				}),
				color: colors.mch.battery,
				progress: queenTime / queenMax,
				valueString: queenTime.toFixed(0),
			} as ResourceBarProps,
		];
	}
}
