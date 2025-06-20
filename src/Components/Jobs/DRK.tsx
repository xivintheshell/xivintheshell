import { RESOURCES } from "../../Game/Data";
import { DRK_STATUSES, DRKResourceKey } from "../../Game/Data/Jobs/DRK";
import { DRKState } from "../../Game/Jobs/DRK";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(DRK_STATUSES) as DRKResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `DRK/${RESOURCES[buff].name}.png`),
);

const DRK_BUFFS: DRKResourceKey[] = Object.keys(DRK_STATUSES) as DRKResourceKey[];

export class DRKStatusPropsGenerator extends StatusPropsGenerator<DRKState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return DRK_BUFFS.map((key) => {
			if (key === "GRIT") {
				return this.makeCommonTimerless(key);
			}
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const singleCombo = resources.get("DRK_COMBO_TRACKER");
		const aoeCombo = resources.get("DRK_AOE_COMBO_TRACKER");
		const bloodGauge = resources.get("BLOOD_GAUGE").availableAmount();
		const stanceActive = resources.get("GRIT").availableAmount();
		const darksideTimer = resources.get("DARKSIDE").pendingChange?.timeTillEvent ?? 0;
		const darkArts = resources.get("DARK_ARTS").availableAmount();

		const comboTimer = singleCombo.available(1)
			? singleCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer", zh: "连击监控" }),
				color: colors.drk.drkComboTimer,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({ en: "Grit" }),
				color: colors.drk.grit,
				currentStacks: stanceActive,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({ en: "Darkside" }),
				color: colors.drk.darkside,
				progress: darksideTimer ? darksideTimer / 60 : 0,
				valueString: darksideTimer.toFixed(3),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({ en: "Dark Arts" }),
				color: colors.drk.darkarts,
				currentStacks: darkArts,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({ en: "Blood Gauge" }),
				color: colors.drk.blood,
				progress: bloodGauge / 100,
				valueString: bloodGauge.toFixed(0),
			} as ResourceBarProps,
		];

		return infos;
	}
}
