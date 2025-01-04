import {
	registerBuffIcon,
	BuffProps,
	PaintGaugeCounterProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	ResourceTextProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { ResourceType } from "../../Game/Common";
import { PCTState } from "../../Game/Jobs/PCT";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";

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
].forEach((buff) => registerBuffIcon(buff, `PCT/${buff}.png`));

export class PCTStatusPropsGenerator extends StatusPropsGenerator<PCTState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const makePictoTimer = (rscType: ResourceType, stacks: number, cd: number) => {
			const enabled =
				rscType === ResourceType.Inspiration
					? this.state.hasResourceAvailable(rscType)
					: true;
			return {
				rscType: rscType,
				onSelf: true,
				enabled: enabled,
				stacks: stacks,
				timeRemaining: cd.toFixed(3),
				className: cd > 0 ? "" : "hidden",
			};
		};
		const makePictoIndefinite = (rscType: ResourceType, stacks: number) => {
			return {
				rscType: rscType,
				onSelf: true,
				enabled: true,
				stacks: stacks,
				className: stacks ? "" : "hidden",
			};
		};
		const resources = this.state.resources;
		const aetherhuesCountdown = resources.timeTillReady(ResourceType.Aetherhues);
		const aetherhuesStacks = resources.get(ResourceType.Aetherhues).availableAmount();
		const monochromeTones = resources.get(ResourceType.MonochromeTones).availableAmount();
		const subtractivePalette = resources.get(ResourceType.SubtractivePalette).availableAmount();
		const subtractiveSpectrumCountdown = resources.timeTillReady(
			ResourceType.SubtractiveSpectrum,
		);
		const starryMuseCountdown = resources.timeTillReady(ResourceType.StarryMuse);
		const hyperphantasiaCountdown = resources.timeTillReady(ResourceType.Hyperphantasia);
		const hyperphantasiaStacks = resources.get(ResourceType.Hyperphantasia).availableAmount();
		const inspirationCountdown = resources.timeTillReady(ResourceType.Inspiration);
		const rainbowBrightCountdown = resources.timeTillReady(ResourceType.RainbowBright);
		const starstruckCountdown = resources.timeTillReady(ResourceType.Starstruck);
		const hammerTimeCountdown = resources.timeTillReady(ResourceType.HammerTime);
		const hammerTimeStacks = resources.get(ResourceType.HammerTime).availableAmount();
		const temperaCoatCountdown = resources.timeTillReady(ResourceType.TemperaCoat);
		const temperaGrassaCountdown = resources.timeTillReady(ResourceType.TemperaGrassa);
		const smudgeCountdown = resources.timeTillReady(ResourceType.Smudge);

		return [
			makePictoTimer(ResourceType.RainbowBright, 1, rainbowBrightCountdown),
			makePictoTimer(
				ResourceType.Hyperphantasia,
				hyperphantasiaStacks,
				hyperphantasiaCountdown,
			),
			makePictoTimer(ResourceType.Inspiration, 1, inspirationCountdown),
			makePictoTimer(ResourceType.SubtractiveSpectrum, 1, subtractiveSpectrumCountdown),
			makePictoTimer(ResourceType.HammerTime, hammerTimeStacks, hammerTimeCountdown),
			makePictoTimer(ResourceType.Starstruck, 1, starstruckCountdown),
			makePictoTimer(ResourceType.Aetherhues, aetherhuesStacks, aetherhuesCountdown),
			makePictoIndefinite(ResourceType.MonochromeTones, monochromeTones),
			makePictoIndefinite(ResourceType.SubtractivePalette, subtractivePalette),
			makePictoTimer(ResourceType.StarryMuse, 1, starryMuseCountdown),
			makePictoTimer(ResourceType.TemperaCoat, 1, temperaCoatCountdown),
			makePictoTimer(ResourceType.TemperaGrassa, 1, temperaGrassaCountdown),
			makePictoTimer(ResourceType.Smudge, 1, smudgeCountdown),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const portrait = resources.get(ResourceType.Portrait).availableAmount();
		const depictions = resources.get(ResourceType.Depictions).availableAmount();
		const creatureCanvas = resources.get(ResourceType.CreatureCanvas).availableAmount();
		const weaponCanvas = resources.get(ResourceType.WeaponCanvas).availableAmount();
		const landscapeCanvas = resources.get(ResourceType.LandscapeCanvas).availableAmount();
		const paletteGauge = resources.get(ResourceType.PaletteGauge).availableAmount();
		const paint = resources.get(ResourceType.Paint).availableAmount();
		const hasComet = resources.get(ResourceType.MonochromeTones).available(1);

		const infos: ResourceDisplayProps[] = [
			{
				kind: "text",
				name: localize({
					en: "portrait",
					zh: "肖像标识",
				}),
				text:
					portrait === 0
						? "/"
						: portrait === 1
							? localize({
									en: "moogle",
									zh: "莫古力",
								})
							: localize({
									en: "madeen",
									zh: "马蒂恩",
								}),
			} as ResourceTextProps,
			{
				kind: "text",
				name: localize({
					en: "depictions",
					zh: "动物标识",
				}),
				text:
					depictions === 0
						? "/"
						: depictions === 1
							? localize({
									en: "pom",
									zh: "绒球",
								})
							: depictions === 2
								? localize({
										en: "wing",
										zh: "翅膀",
									})
								: depictions === 3
									? localize({
											en: "fang",
											zh: "兽爪",
										})
									: localize({
											en: "maw",
											zh: "尖牙",
										}),
			} as ResourceTextProps,
			{
				kind: "counter",
				name: localize({
					en: "creature",
					zh: "动物",
				}),
				color: colors.pct.creatureCanvas,
				currentStacks: creatureCanvas,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "weapon",
					zh: "武器",
				}),
				color: colors.pct.weaponCanvas,
				currentStacks: weaponCanvas,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "landscape",
					zh: "风景",
				}),
				color: colors.pct.landscapeCanvas,
				currentStacks: landscapeCanvas,
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({
					en: "palette gauge",
					zh: "调色量谱",
				}),
				color: colors.pct.paletteGauge,
				progress: paletteGauge / 100,
				valueString: paletteGauge.toFixed(0),
			} as ResourceBarProps,
		];
		if (this.state.hasTraitUnlocked("ENHANCED_ARTISTRY")) {
			infos.push({
				kind: "paint",
				name: localize({
					en: "paint gauge",
					zh: "颜料量谱",
				}),
				holyColor: colors.pct.holyPaint,
				cometColor: colors.pct.cometPaint,
				currentStacks: paint,
				maxStacks: 5,
				hasComet: this.state.hasTraitUnlocked("ENHANCED_PALETTE") && hasComet,
			} as PaintGaugeCounterProps);
		}

		return infos;
	}
}
