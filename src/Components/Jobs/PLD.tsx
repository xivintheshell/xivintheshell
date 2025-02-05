import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { PLDState } from "../../Game/Jobs/PLD";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { PLD_STATUSES, PLDResourceKey } from "../../Game/Data/Jobs/PLD";
import { RESOURCES } from "../../Game/Data";

const PLD_DEBUFFS: PLDResourceKey[] = ["CIRCLE_OF_SCORN_DOT"];

const PLD_BUFFS: PLDResourceKey[] = (Object.keys(PLD_STATUSES) as PLDResourceKey[]).filter(
	(key) => !PLD_DEBUFFS.includes(key),
);

(Object.keys(PLD_STATUSES) as PLDResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `PLD/${RESOURCES[buff].name}.png`),
);

export class PLDStatusPropsGenerator extends StatusPropsGenerator<PLDState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...PLD_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return PLD_BUFFS.map((key) => {
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const basicCombo = resources.get("PLD_COMBO_TRACKER");
		const aoeCombo = resources.get("PLD_AOE_COMBO_TRACKER");
		// const confiteorCombo = resources.get("PLD_CONFITEOR_COMBO_TRACKER");

		const oath = resources.get("OATH_GAUGE").availableAmount();

		const ironWillActive = resources.get("IRON_WILL").availableAmount();

		const comboTimer = basicCombo.available(1)
			? basicCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer" }),
				color: colors.rdm.manaStack,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,

			{
				kind: "counter",
				name: localize({ en: "Iron Will" }),
				color: colors.rdm.manaStack,
				currentStacks: ironWillActive,
				maxStacks: 1,
			} as ResourceCounterProps,

			{
				kind: "bar",
				name: localize({ en: "Oath Gauge" }),
				color: colors.rdm.manaStack,
				progress: oath / 100,
				valueString: oath.toFixed(3),
			} as ResourceBarProps,
		];

		return infos;
	}
}
