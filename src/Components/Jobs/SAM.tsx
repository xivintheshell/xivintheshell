import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator
} from "../StatusDisplay";
import {ResourceType} from "../../Game/Common";
import {SAMState} from "../../Game/Jobs/SAM";
import {getCurrentThemeColors} from "../../Components/ColorTheme";
import {localize} from "../../Components/Localization";

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
	ResourceType.Tengetsu,
	ResourceType.TengetsusForesight,
	ResourceType.ThirdEye,
	ResourceType.EnhancedEnpi,
	ResourceType.Meditate,
	ResourceType.Meditate + "2",
	ResourceType.Meditate + "3",
	ResourceType.Meditate + "4",
	ResourceType.Meditate + "5",
	ResourceType.HiganbanaDoT,
].forEach((buff) => registerBuffIcon(buff, `SAM/${buff}.png`));

export class SAMStatusPropsGenerator extends StatusPropsGenerator<SAMState> {
	override getEnemyBuffViewProps(): BuffProps[] {
		const DoTCountdown = this.state.resources.timeTillReady(ResourceType.HiganbanaDoT);
		const feintCountdown = this.state.resources.timeTillReady(ResourceType.Feint);
		return [
			{
				rscType: ResourceType.HiganbanaDoT,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: DoTCountdown.toFixed(3),
				className: DoTCountdown > 0 ? "" : "hidden"
			},
			{
				rscType: ResourceType.Feint,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: feintCountdown.toFixed(3),
				className: feintCountdown > 0 ? "" : "hidden"
			}
		];
	}

	override getSelfBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;
		const makeSamuraiTimer = (rscType: ResourceType, stacks?: number) => {
			const cd = resources.timeTillReady(rscType);
			return {
				rscType: rscType,
				onSelf: true,
				enabled: true,
				stacks: stacks ?? resources.get(rscType).availableAmount(),
				timeRemaining: cd.toFixed(3),
				className: cd > 0 ? "" : "hidden"
			};
		};

		return [
			makeSamuraiTimer(ResourceType.TrueNorth),
			makeSamuraiTimer(ResourceType.ArmsLength, 1),
			makeSamuraiTimer(ResourceType.Bloodbath, 1),
			makeSamuraiTimer(ResourceType.Tendo, 1),
			makeSamuraiTimer(ResourceType.EnhancedEnpi, 1),
			makeSamuraiTimer(ResourceType.OgiReady, 1),
			makeSamuraiTimer(ResourceType.ZanshinReady, 1),
			makeSamuraiTimer(ResourceType.MeikyoShisui),
			makeSamuraiTimer(ResourceType.TsubameGaeshiReady, 1),
			makeSamuraiTimer(ResourceType.Fuka),
			makeSamuraiTimer(ResourceType.Fugetsu),
			makeSamuraiTimer(ResourceType.ThirdEye),
			makeSamuraiTimer(ResourceType.Tengetsu),
			makeSamuraiTimer(ResourceType.Sprint),
		];
	}

	override getResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const setsu = resources.get(ResourceType.Setsu).availableAmount();
		const getsu = resources.get(ResourceType.Getsu).availableAmount();
		const ka = resources.get(ResourceType.KaSen).availableAmount();
		const kenki = resources.get(ResourceType.Kenki).availableAmount();
		const meditation = resources.get(ResourceType.Meditation).availableAmount();
		// TODO use simplified gauge iconography so people don't have to remember names
		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localize({
					en: "setsu",
				}),
				color: colors.sam.setsu,
				currentStacks: setsu,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "getsu",
				}),
				color: colors.sam.getsu,
				currentStacks: getsu,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "ka",
				}),
				color: colors.sam.kaSen,
				currentStacks: ka,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({en: "kenki"}),
				color: colors.sam.kenki,
				progress: kenki / 100,
				valueString: kenki.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({en: "meditation"}),
				color: colors.sam.meditation,
				currentStacks: meditation,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
		return infos;
	}
}