import { ResourceType } from "../../Game/Common";
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

[
	ResourceType.Reassembled,
	ResourceType.Overheated,
	ResourceType.Overheated + "2",
	ResourceType.Overheated + "3",
	ResourceType.Overheated + "4",
	ResourceType.Overheated + "5",
	ResourceType.Wildfire,
	ResourceType.WildfireSelf,
	ResourceType.Flamethrower,
	ResourceType.Bioblaster,
	ResourceType.Tactician,
	ResourceType.Hypercharged,
	ResourceType.ExcavatorReady,
	ResourceType.FullMetalMachinist,
].forEach((buff) => registerBuffIcon(buff, `MCH/${buff}.png`));

export class MCHStatusPropsGenerator extends StatusPropsGenerator<MCHState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;

		const wildfireCountdown = resources.timeTillReady(ResourceType.Wildfire);
		const bioblasterCountdown = resources.timeTillReady(ResourceType.Bioblaster);

		return [
			{
				rscType: ResourceType.Wildfire,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: wildfireCountdown.toFixed(3),
				className: wildfireCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Bioblaster,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: bioblasterCountdown.toFixed(3),
				className: bioblasterCountdown > 0 ? "" : "hidden",
			},
		];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;

		// Job
		const reassembledCountdown = resources.timeTillReady(ResourceType.Reassembled);
		const overheatedCountdown = resources.timeTillReady(ResourceType.Overheated);
		const overheatedStacks = resources.get(ResourceType.Overheated).availableAmount();
		const ownWildfireCountdown = resources.timeTillReady(ResourceType.WildfireSelf);
		const flamethrowerCountdown = resources.timeTillReady(ResourceType.Flamethrower);
		const tacticianCountdown = resources.timeTillReady(ResourceType.Tactician);
		const hyperchargedCountdown = resources.timeTillReady(ResourceType.Hypercharged);
		const excavatorCountdown = resources.timeTillReady(ResourceType.ExcavatorReady);
		const fmfCountdown = resources.timeTillReady(ResourceType.FullMetalMachinist);

		return [
			{
				rscType: ResourceType.Reassembled,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: reassembledCountdown.toFixed(3),
				className: reassembledCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Overheated,
				onSelf: true,
				enabled: true,
				stacks: overheatedStacks,
				timeRemaining: overheatedCountdown.toFixed(3),
				className: overheatedCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.WildfireSelf,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: ownWildfireCountdown.toFixed(3),
				className: ownWildfireCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Flamethrower,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: flamethrowerCountdown.toFixed(3),
				className: flamethrowerCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Tactician,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: tacticianCountdown.toFixed(3),
				className: tacticianCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Hypercharged,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: hyperchargedCountdown.toFixed(3),
				className: hyperchargedCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.ExcavatorReady,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: excavatorCountdown.toFixed(3),
				className: excavatorCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.FullMetalMachinist,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: fmfCountdown.toFixed(3),
				className: fmfCountdown > 0 ? "" : "hidden",
			},
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const heat = resources.get(ResourceType.HeatGauge).availableAmount();
		const battery = resources.get(ResourceType.BatteryGauge).availableAmount();

		const punch = resources.get(ResourceType.QueenPunches);
		const finish = resources.get(ResourceType.QueenFinishers);

		const queenTime = punch.availableAmount() + finish.availableAmount();
		const queenMax = punch.maxValue + finish.maxValue;

		const infos = [
			{
				kind: "bar",
				name: localize({
					en: "Heat",
				}),
				color: colors.mch.heat,
				progress: heat / 100,
				valueString: heat.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "Battery",
				}),
				color: colors.mch.battery,
				progress: battery / 100,
				valueString: battery.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "Queen Hits",
				}),
				color: colors.mch.battery,
				progress: queenTime / queenMax,
				valueString: queenTime.toFixed(0),
			} as ResourceBarProps,
		];

		return infos;
	}
}
