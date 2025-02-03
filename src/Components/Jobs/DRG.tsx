import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { DRGState } from "../../Game/Jobs/DRG";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { DRG_STATUSES, DRGResourceKey } from "../../Game/Data/Jobs/DRG";
import { RESOURCES } from "../../Game/Data";

const DRG_DEBUFFS: DRGResourceKey[] = ["CHAOS_THRUST_DOT", "CHAOTIC_SPRING_DOT"];

const DRG_BUFFS: DRGResourceKey[] = (Object.keys(DRG_STATUSES) as DRGResourceKey[]).filter(
	(key) => !DRG_DEBUFFS.includes(key),
);

(Object.keys(DRG_STATUSES) as DRGResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `DRG/${RESOURCES[buff].name}.png`),
);

export class DRGStatusPropsGenerator extends StatusPropsGenerator<DRGState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...DRG_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return DRG_BUFFS.map((key) => {
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const chaosCombo = resources.get("DRG_CHAOS_COMBO_TRACKER");
		const heavensCombo = resources.get("DRG_HEAVENS_COMBO_TRACKER");
		const aoeCombo = resources.get("DRG_AOE_COMBO_TRACKER");

		const scales = resources.get("FIRSTMINDS_FOCUS").availableAmount();

		const lifeOfTheDragonRes = resources.get("LIFE_OF_THE_DRAGON");
		const lifeTimer = lifeOfTheDragonRes.available(1)
			? lifeOfTheDragonRes.pendingChange?.timeTillEvent
			: undefined;

		const comboTimer = chaosCombo.available(1)
			? chaosCombo.pendingChange?.timeTillEvent
			: heavensCombo.available(1)
				? heavensCombo.pendingChange?.timeTillEvent
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
				kind: "bar",
				name: localize({ en: "Life of the Dragon" }),
				color: colors.rdm.manaStack,
				progress: lifeTimer ? lifeTimer / 20.0 : 0, // TODO EXACT VALUE
				valueString: lifeTimer ? lifeTimer.toFixed(3) : "N/A",
			} as ResourceBarProps,

			{
				kind: "counter",
				name: localize({ en: "Firstmind's Focus" }),
				color: colors.rdm.manaStack,
				currentStacks: scales,
				maxStacks: 2,
			} as ResourceCounterProps,
		];

		return infos;
	}
}
