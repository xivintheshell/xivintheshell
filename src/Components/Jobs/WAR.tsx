import {
	registerBuffIcon,
	BuffProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { WARState } from "../../Game/Jobs/WAR";
import { ThemeColors } from "../../Components/ColorTheme";
import { localize } from "../../Components/Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { WAR_STATUSES } from "../../Game/Data/Jobs/WAR";

(Object.keys(WAR_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `WAR/${RESOURCES[buff].name}.png`),
);

export class WARStatusPropsGenerator extends StatusPropsGenerator<WARState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return (Object.keys(WAR_STATUSES) as ResourceKey[]).map((key) => this.makeCommonTimer(key));
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;
		const beastGauge = resources.get("BEAST_GAUGE").availableAmount();
		const stormCombo = resources.get("STORM_COMBO");
		const tempestCombo = resources.get("TEMPEST_COMBO");
		const comboTimer = stormCombo.available(1)
			? stormCombo.pendingChange?.timeTillEvent
			: tempestCombo.available(1)
				? tempestCombo.pendingChange?.timeTillEvent
				: undefined;
		const infos: ResourceDisplayProps[] = [
			{
				kind: "text",
				name: localize({
					en: "Combo Timer",
					zh: "连击监控",
				}),
				text: comboTimer?.toFixed(3) ?? "N/A",
			},
			{
				kind: "bar",
				name: localize({
					en: "Beast Gauge",
					zh: "兽魂量谱",
				}),
				color: colors.war.beastGauge,
				progress: beastGauge / 100,
				valueString: beastGauge.toFixed(0),
			},
		];
		return infos;
	}
}
