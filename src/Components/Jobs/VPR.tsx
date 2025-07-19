import { RESOURCES } from "../../Game/Data";
import { VPR_STATUSES, VPRResourceKey } from "../../Game/Data/Jobs/VPR";
import { VPRState } from "../../Game/Jobs/VPR";
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

(Object.keys(VPR_STATUSES) as VPRResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `VPR/${RESOURCES[buff].name}.png`),
);
const NIN_BUFFS: VPRResourceKey[] = Object.keys(VPR_STATUSES) as VPRResourceKey[];

export class VPRStatusPropsGenerator extends StatusPropsGenerator<VPRState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return NIN_BUFFS.map((key) => this.makeCommonTimer(key));
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const singleCombo = resources.get("VPR_COMBO");
		const aoeCombo = resources.get("VPR_AOE_COMBO");
		const coils = resources.get("RATTLING_COIL").availableAmount();
		const offerings = resources.get("SERPENT_OFFERINGS").availableAmount();
		const anguine = resources.get("ANGUINE_TRIBUTE").availableAmount();
		// TODO adjust gauge for sync

		const comboTimer = singleCombo.available(1)
			? singleCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer", zh: "连击监控" }),
				color: colors.vpr.vprComboTimer,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localizeResourceType("RATTLING_COIL"),
				color: colors.vpr.rattlingCoil,
				currentStacks: coils,
				maxStacks: 5,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localizeResourceType("SERPENT_OFFERINGS"),
				color: colors.vpr.serpentOfferings,
				progress: offerings / 100,
				valueString: offerings.toFixed(0),
			} as ResourceBarProps,
			{
				// TODO show reawaken timer
				kind: "counter",
				name: localizeResourceType("ANGUINE_TRIBUTE"),
				color: colors.vpr.anguineTribute,
				currentStacks: anguine,
				maxStacks: 5,
			} as ResourceCounterProps,
		];

		return infos;
	}
}
