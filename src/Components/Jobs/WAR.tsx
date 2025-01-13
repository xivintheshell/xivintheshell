import {
	registerBuffIcon,
	BuffProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { ResourceType } from "../../Game/Common";
import { WARState } from "../../Game/Jobs/WAR";
import { getCurrentThemeColors } from "../../Components/ColorTheme";
import { localize } from "../../Components/Localization";
import { WARBuffTypes, WARResourceType } from "../../Game/Constants/WAR";

[
	...Object.values(WARBuffTypes),
	WARBuffTypes.BurgeoningFury + "2",
	// appears and is removed on the same tick Wrathful is applied
	WARBuffTypes.BurgeoningFury + "3",
	WARBuffTypes.InnerRelease + "2",
	WARBuffTypes.InnerRelease + "3",
].forEach((buff) => registerBuffIcon(buff, `WAR/${buff}.png`));

export class WARStatusPropsGenerator extends StatusPropsGenerator<WARState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;
		const makeWarriorTimer = (rscType: ResourceType) => {
			const cd = resources.timeTillReady(rscType);
			return {
				rscType: rscType,
				onSelf: true,
				enabled: true,
				stacks: resources.get(rscType).availableAmount(),
				timeRemaining: cd.toFixed(3),
				className: cd > 0 ? "" : "hidden",
			};
		};

		const makeDefiance = () => {
			return {
				rscType: ResourceType.Defiance,
				onSelf: true,
				enabled: true,
				stacks: 1,
				className: resources.get(ResourceType.Defiance).available(1) ? "" : "hidden",
			};
		};

		return [
			...Object.values(WARBuffTypes)
				.filter((value) => !(value === ResourceType.Defiance))
				.map((value) => makeWarriorTimer(value)),
			makeWarriorTimer(ResourceType.Rampart),
			makeWarriorTimer(ResourceType.ArmsLength),
			makeWarriorTimer(ResourceType.Sprint),
			makeWarriorTimer(ResourceType.Tincture),
			makeDefiance(),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const beastGauge = resources.get(WARResourceType.BeastGauge).availableAmount();
		const stormCombo = resources.get(WARResourceType.StormCombo);
		const tempestCombo = resources.get(WARResourceType.TempestCombo);
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
					zh: "连击监控"
				}),
				text: comboTimer?.toFixed(3) ?? "N/A",
			},
			{
				kind: "bar",
				name: localize({
					en: "Beast Gauge",
					zh: "兽魂量谱"
				}),
				color: colors.war.beastGauge,
				progress: beastGauge / 100,
				valueString: beastGauge.toFixed(0),
			},
		];
		return infos;
	}
}
