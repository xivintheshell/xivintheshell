import { ResourceKey, RESOURCES } from "../../Game/Data";
import { RPR_STATUSES } from "../../Game/Data/Jobs/RPR";
import { RPRState } from "../../Game/Jobs/RPR";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(RPR_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `RPR/${RESOURCES[buff].name}.png`),
);

export class RPRStatusPropsGenerator extends StatusPropsGenerator<RPRState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [this.makeCommonTimer("DEATHS_DESIGN", false)];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(RPR_STATUSES) as ResourceKey[])
				.filter((key) => key !== "DEATHS_DESIGN")
				.map((key) => {
					if (key === "SOULSOW") {
						return this.makeCommonTimerless(key);
					}
					return this.makeCommonTimer(key);
				}),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const soulGauge = resources.get("SOUL").availableAmount();
		const shroudGauge = resources.get("SHROUD").availableAmount();
		const lemureShroud = resources.get("LEMURE_SHROUD").availableAmount();
		const voidShroud = resources.get("VOID_SHROUD").availableAmount();
		const stCombo = resources.get("RPR_COMBO");
		const aoeCombo = resources.get("RPR_AOE_COMBO");
		const comboTimer = stCombo.available(1)
			? stCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "text",
				name: localize({
					en: "Combo Timer",
				}),
				text: comboTimer?.toFixed(3) ?? "N/A",
			},
			{
				kind: "bar",
				name: localize({
					en: "Soul Gauge",
				}),
				color: soulGauge < 50 ? colors.rpr.soulGaugeLow : colors.rpr.soulGaugeHigh,
				progress: soulGauge / 100,
				valueString: Math.floor(soulGauge) + "/100",
			} as ResourceBarProps,
		];
		if (this.state.hasTraitUnlocked("SHROUD_GAUGE")) {
			infos.push(
				{
					kind: "bar",
					name: localize({
						en: "Shroud Gauge",
					}),
					color:
						shroudGauge < 50 ? colors.rpr.shroudGaugeLow : colors.rpr.shroudGaugeHigh,
					progress: shroudGauge / 100,
					valueString: Math.floor(shroudGauge) + "/100",
				} as ResourceBarProps,
				{
					kind: "counter",
					name: localize({
						en: "Lemure Shroud",
					}),
					color: colors.rpr.lemureShroud,
					currentStacks: lemureShroud,
					maxStacks: 5,
				} as ResourceCounterProps,
			);
		}
		if (this.state.hasTraitUnlocked("VOID_SOUL")) {
			infos.push({
				kind: "counter",
				name: localize({
					en: "Void Shroud",
				}),
				color: voidShroud < 2 ? colors.rpr.voidShroudLow : colors.rpr.voidShroudHigh,
				currentStacks: voidShroud,
				maxStacks: 5,
			} as ResourceCounterProps);
		}
		return infos;
	}
}
