import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { GNBState } from "../../Game/Jobs/GNB";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { GNB_STATUSES, GNBResourceKey } from "../../Game/Data/Jobs/GNB";
import { RESOURCES } from "../../Game/Data";

const GNB_DEBUFFS: GNBResourceKey[] = ["SONIC_BREAK_DOT", "BOW_SHOCK_DOT"];

const GNB_BUFFS: GNBResourceKey[] = (Object.keys(GNB_STATUSES) as GNBResourceKey[]).filter(
	(key) => !GNB_DEBUFFS.includes(key),
);

(Object.keys(GNB_STATUSES) as GNBResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `GNB/${RESOURCES[buff].name}.png`),
);

export class GNBStatusPropsGenerator extends StatusPropsGenerator<GNBState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...GNB_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return GNB_BUFFS.map((key) => {
			if (key === "ROYAL_GUARD") {
				return this.makeCommonTimerless(key);
			}
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const singleCombo = resources.get("GNB_COMBO_TRACKER");
		const aoeCombo = resources.get("GNB_AOE_COMBO_TRACKER");
		const powderGaugeStacks = resources.get("POWDER_GAUGE").availableAmount();
		const royalGuardActive = resources.get("ROYAL_GUARD").availableAmount();

		const comboTimer = singleCombo.available(1)
			? singleCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const cartMultiplier = resources.get("BLOODFEST").available(1) ? 2 : 1;
		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer", zh: "连击监控" }),
				color: colors.rdm.manaStack,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,

			{
				kind: "counter",
				name: localize({ en: "Royal Guard", zh: "王室亲卫" }),
				color: colors.rdm.manaStack,
				currentStacks: royalGuardActive,
				maxStacks: 1,
			} as ResourceCounterProps,

			{
				kind: "counter",
				name: localize({ en: "Powder Gauge", zh: "晶壤" }),
				color: colors.rdm.manaStack,
				currentStacks: powderGaugeStacks,
				maxStacks:
					(this.state.hasTraitUnlocked("CARTRIDGE_CHARGE_II") ? 3 : 2) * cartMultiplier,
			} as ResourceCounterProps,
		];

		return infos;
	}
}
