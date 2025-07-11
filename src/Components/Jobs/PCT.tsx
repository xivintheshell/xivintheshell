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
import { PCTState } from "../../Game/Jobs/PCT";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { PCT_STATUSES, PCTResourceKey } from "../../Game/Data/Jobs/PCT";

(Object.keys(PCT_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `PCT/${RESOURCES[buff].name}.png`),
);

export class PCTStatusPropsGenerator extends StatusPropsGenerator<PCTState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(PCT_STATUSES) as PCTResourceKey[]).map((key) => {
				if (key === "MONOCHROME_TONES" || key === "SUBTRACTIVE_PALETTE") {
					return this.makeCommonTimerless(key);
				}
				if (key === "INSPIRATION") {
					return this.makeToggleableTimerless(key);
				}
				return this.makeCommonTimer(key);
			}),
		];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const portrait = resources.get("PORTRAIT").availableAmount();
		const depictions = resources.get("DEPICTIONS").availableAmount();
		const creatureCanvas = resources.get("CREATURE_CANVAS").availableAmount();
		const weaponCanvas = resources.get("WEAPON_CANVAS").availableAmount();
		const landscapeCanvas = resources.get("LANDSCAPE_CANVAS").availableAmount();
		const paletteGauge = resources.get("PALETTE_GAUGE").availableAmount();
		const paint = resources.get("PAINT").availableAmount();
		const hasComet = resources.get("MONOCHROME_TONES").available(1);

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
