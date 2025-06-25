import { RESOURCES } from "../../Game/Data";
import { NIN_STATUSES, NINResourceKey } from "../../Game/Data/Jobs/NIN";
import { NINState } from "../../Game/Jobs/NIN";
import { ThemeColors } from "../ColorTheme";
import { localize, localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(NIN_STATUSES) as NINResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `NIN/${RESOURCES[buff].name}.png`),
);
const NIN_DEBUFFS: NINResourceKey[] = ["DOKUMORI", "TRICK_ATTACK", "KUNAIS_BANE"];
const NIN_BUFFS: NINResourceKey[] = (Object.keys(NIN_STATUSES) as NINResourceKey[]).filter(
	(key) => !NIN_DEBUFFS.includes(key),
);

export class NINStatusPropsGenerator extends StatusPropsGenerator<NINState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...NIN_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return NIN_BUFFS.map((key) => {
			if (key === "HIDDEN") {
				return this.makeCommonTimerless(key);
			}
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const singleCombo = resources.get("NIN_COMBO_TRACKER");
		const aoeCombo = resources.get("NIN_AOE_COMBO_TRACKER");
		const kazematoi = resources.get("KAZEMATOI").availableAmount();
		const ninki = resources.get("NINKI").availableAmount();

		const comboTimer = singleCombo.available(1)
			? singleCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer", zh: "连击监控" }),
				color: colors.nin.ninComboTimer,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localizeResourceType("KAZEMATOI"),
				color: colors.nin.kazematoi,
				currentStacks: kazematoi,
				maxStacks: 5,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localizeResourceType("NINKI"),
				color: colors.nin.ninki,
				progress: ninki / 100,
				valueString: ninki.toFixed(0),
			} as ResourceBarProps,
		];

		return infos;
	}
}
