import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { ResourceType } from "../../Game/Common";
import { SAMState } from "../../Game/Jobs/SAM";
import { getCurrentThemeColors } from "../../Components/ColorTheme";
import { localize } from "../../Components/Localization";

[
	ResourceType.MeikyoShisui,
	ResourceType.MeikyoShisui + "2",
	ResourceType.MeikyoShisui + "3",
	ResourceType.Fugetsu,
	ResourceType.Fuka,
	ResourceType.ZanshinReady,
	ResourceType.Tendo,
	ResourceType.OgiReady,
	ResourceType.TsubameGaeshiReady,
	ResourceType.Tengentsu,
	ResourceType.TengentsusForesight,
	ResourceType.ThirdEye,
	ResourceType.EnhancedEnpi,
	ResourceType.Meditate,
	ResourceType.HiganbanaDoT,
].forEach((buff) => registerBuffIcon(buff, `SAM/${buff}.png`));

export class SAMStatusPropsGenerator extends StatusPropsGenerator<SAMState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		const DoTCountdown = this.state.resources.timeTillReady(ResourceType.HiganbanaDoT);

		return [
			{
				rscType: ResourceType.HiganbanaDoT,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: DoTCountdown.toFixed(3),
				className: DoTCountdown > 0 ? "" : "hidden",
			},
		];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;
		const makeSamuraiTimer = (rscType: ResourceType) => {
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

		return [
			makeSamuraiTimer(ResourceType.Tendo),
			makeSamuraiTimer(ResourceType.EnhancedEnpi),
			makeSamuraiTimer(ResourceType.OgiReady),
			makeSamuraiTimer(ResourceType.ZanshinReady),
			makeSamuraiTimer(ResourceType.MeikyoShisui),
			makeSamuraiTimer(ResourceType.TsubameGaeshiReady),
			makeSamuraiTimer(ResourceType.Fuka),
			makeSamuraiTimer(ResourceType.Fugetsu),
			makeSamuraiTimer(ResourceType.ThirdEye),
			makeSamuraiTimer(ResourceType.Tengentsu),
			makeSamuraiTimer(ResourceType.TengentsusForesight),
			makeSamuraiTimer(ResourceType.Meditate),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const kenki = resources.get(ResourceType.Kenki).availableAmount();
		const meditation = resources.get(ResourceType.Meditation).availableAmount();
		// TODO use simplified gauge iconography so people don't have to remember names
		const infos: ResourceDisplayProps[] = [
			{
				kind: "sen",
				name: localize({
					en: "sen",
				}),
				hasSetsu: this.state.hasResourceAvailable(ResourceType.Setsu),
				hasGetsu: this.state.hasResourceAvailable(ResourceType.Getsu),
				hasKa: this.state.hasResourceAvailable(ResourceType.KaSen),
				setsuColor: colors.sam.setsu,
				getsuColor: colors.sam.getsu,
				kaColor: colors.sam.kaSen,
			},
			{
				kind: "bar",
				name: localize({ en: "kenki" }),
				color: colors.sam.kenki,
				progress: kenki / 100,
				valueString: kenki.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({ en: "meditation" }),
				color: colors.sam.meditation,
				currentStacks: meditation,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
		return infos;
	}
}
