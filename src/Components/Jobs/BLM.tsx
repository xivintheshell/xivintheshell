import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { BLMState } from "../../Game/Jobs/BLM";
import { type ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { RESOURCES } from "../../Game/Data";
import { BLMResourceKey, BLM_STATUSES } from "../../Game/Data/Jobs/BLM";

const BLM_DEBUFFS: BLMResourceKey[] = [
	"THUNDER_III",
	"THUNDER_IV",
	"HIGH_THUNDER",
	"HIGH_THUNDER_II",
];

const BLM_BUFFS: BLMResourceKey[] = (Object.keys(BLM_STATUSES) as BLMResourceKey[]).filter(
	(key) => !BLM_DEBUFFS.includes(key),
);

(Object.keys(BLM_STATUSES) as BLMResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `BLM/${RESOURCES[buff].name}.png`),
);

export class BLMStatusPropsGenerator extends StatusPropsGenerator<BLMState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BLM_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return BLM_BUFFS.map((key) => {
			if (key === "LEY_LINES") {
				return this.makeToggleableTimer(key);
			}
			if (key === "THUNDERHEAD" || key === "FIRESTARTER") {
				return this.makeCommonTimerless(key);
			}
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const eno = this.state.resources.get("ENOCHIAN");
		const resources = this.state.resources;
		const astralFire = this.state.getFireStacks();
		const umbralIce = this.state.getIceStacks();
		const umbralHearts = resources.get("UMBRAL_HEART").availableAmount();
		const paradox = resources.get("PARADOX").availableAmount();
		const astralSoul = resources.get("ASTRAL_SOUL").availableAmount();
		const polyglotCountdown = eno.available(1) ? resources.timeTillReady("POLYGLOT") : 30;
		const polyglotStacks = resources.get("POLYGLOT").availableAmount();

		const maxPolyglotStacks =
			(this.state.hasTraitUnlocked("ENHANCED_POLYGLOT_II") && 3) ||
			(this.state.hasTraitUnlocked("ENHANCED_POLYGLOT") && 2) ||
			1;
		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localize({
					en: "AF/UI",
					zh: "冰火层数",
					ja: "AF/UB",
				}),
				color: astralFire > 0 ? colors.blm.astralFire : colors.blm.umbralIce,
				currentStacks: astralFire > 0 ? astralFire : umbralIce,
				maxStacks: 3,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "hearts",
					zh: "冰针",
					ja: "アンブラルハート",
				}),
				color: colors.blm.umbralHeart,
				currentStacks: umbralHearts,
				maxStacks: 3,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localize({
					en: "paradox",
					zh: "悖论",
					ja: "パラドックス",
				}),
				color: colors.blm.paradox,
				currentStacks: paradox,
				maxStacks: 1,
			} as ResourceCounterProps,
		];
		if (this.state.hasTraitUnlocked("ENHANCED_ASTRAL_FIRE")) {
			infos.push({
				kind: "counter",
				name: localize({
					en: "astral soul",
					zh: "星极魂",
					ja: "アストラルソウル",
				}),
				color: colors.blm.astralSoul,
				currentStacks: astralSoul,
				maxStacks: 6,
			} as ResourceCounterProps);
		}
		infos.push(
			{
				kind: "bar",
				name: localize({
					en: "poly timer",
					zh: "通晓计时",
					ja: "エノキ継続時間",
				}),
				color: colors.blm.polyTimer,
				progress: 1 - polyglotCountdown / 30,
				valueString: polyglotCountdown.toFixed(3),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({
					en: "poly stacks",
					zh: "通晓层数",
					ja: "ポリグロット",
				}),
				color: colors.blm.polyStacks,
				currentStacks: polyglotStacks,
				maxStacks: maxPolyglotStacks,
			} as ResourceCounterProps,
		);
		return infos;
	}
}
