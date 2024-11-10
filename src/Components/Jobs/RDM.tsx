import {
	registerBuffIcon,
	BuffProps,
	PaintGaugeCounterProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	ResourceTextProps,
	StatusPropsGenerator
} from "../StatusDisplay";
import {ResourceType} from "../../Game/Common";
import {TraitName, Traits} from "../../Game/Traits";
import {RDMState} from "../../Game/Jobs/RDM";
import {getCurrentThemeColors} from "../../Components/ColorTheme";
import {localize} from "../../Components/Localization";

[
	ResourceType.Aetherhues,
	ResourceType.Aetherhues + "2",
	ResourceType.MonochromeTones,
	ResourceType.HammerTime,
	ResourceType.HammerTime + "2",
	ResourceType.HammerTime + "3",
	ResourceType.Inspiration,
	ResourceType.SubtractivePalette,
	ResourceType.SubtractivePalette + "2",
	ResourceType.SubtractivePalette + "3",
	ResourceType.SubtractiveSpectrum,
	ResourceType.Hyperphantasia,
	ResourceType.Hyperphantasia + "2",
	ResourceType.Hyperphantasia + "3",
	ResourceType.Hyperphantasia + "4",
	ResourceType.Hyperphantasia + "5",
	ResourceType.RainbowBright,
	ResourceType.Starstruck,
	ResourceType.StarryMuse,
	ResourceType.TemperaCoat,
	ResourceType.TemperaGrassa,
	ResourceType.Smudge,
].forEach((buff) => registerBuffIcon(buff, `RDM/${buff}.png`));

export class RDMStatusPropsGenerator extends StatusPropsGenerator<RDMState> {
	override getEnemyBuffViewProps(): BuffProps[] {
        const addleCountdown = this.state.resources.timeTillReady(ResourceType.Addle);
		return [
			{
				rscType: ResourceType.Addle,
				onSelf: false,
				enabled: true,
				stacks:1,
				timeRemaining: addleCountdown.toFixed(3),
				className: addleCountdown > 0 ? "" : "hidden"
			}
		];
	}

	override getSelfBuffViewProps(): BuffProps[] {
		const makeRedMageTimer = (rscType: ResourceType) => {
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
			ResourceType.Dualcast,
		].map(makeRedMageTimer);
	}

	override getResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const whiteMana = resources.get(ResourceType.WhiteMana).availableAmount();
		const blackMana = resources.get(ResourceType.BlackMana).availableAmount();
		const manaStacks = resources.get(ResourceType.ManaStacks).availableAmount();
		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({en: "white mana"}),
				color: colors.rdm.whiteMana,
				progress: whiteMana / 100,
				valueString: whiteMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({en: "black mana"}),
				color: colors.rdm.blackMana,
				progress: blackMana / 100,
				valueString: blackMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({en: "mana stacks"}),
				color: colors.rdm.manaStacks,
				currentStacks: manaStacks,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
		return infos;
	}
}