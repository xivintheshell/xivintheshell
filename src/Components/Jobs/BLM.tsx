import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { ResourceType, TraitName } from "../../Game/Common";
import { Traits } from "../../Game/Traits";
import { BLMState } from "../../Game/Jobs/BLM";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";

[
	ResourceType.Triplecast,
	ResourceType.Triplecast + "2",
	ResourceType.Triplecast + "3",
	ResourceType.Firestarter,
	ResourceType.Thunderhead,
	ResourceType.ThunderDoT,
	ResourceType.LeyLines,
	ResourceType.Manaward,
].forEach((buff) => registerBuffIcon(buff, `BLM/${buff}.png`));

export class BLMStatusPropsGenerator extends StatusPropsGenerator<BLMState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [
			...[
				ResourceType.ThunderDoT, // Upcoming change to have all the thunder DoTs on the BRD PR, so leaving this here for now
			].map((rscType) => this.makeCommonTimer(rscType, false)),
		];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const resources = this.state.resources;
		const leyLinesEnabled = resources.get(ResourceType.LeyLines).enabled;
		const leyLinesCountdown = resources.timeTillReady(ResourceType.LeyLines);
		const triplecastCountdown = resources.timeTillReady(ResourceType.Triplecast);
		const triplecastStacks = resources.get(ResourceType.Triplecast).availableAmount();
		const firestarterCountdown = resources.timeTillReady(ResourceType.Firestarter);
		const thunderheadCountdown = resources.timeTillReady(ResourceType.Thunderhead);
		const manawardCountdown = resources.timeTillReady(ResourceType.Manaward);

		return [
			{
				rscType: ResourceType.LeyLines,
				onSelf: true,
				enabled: leyLinesEnabled,
				stacks: 1,
				timeRemaining: leyLinesCountdown.toFixed(3),
				className: leyLinesCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Triplecast,
				onSelf: true,
				enabled: true,
				stacks: triplecastStacks,
				timeRemaining: triplecastCountdown.toFixed(3),
				className: triplecastCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Firestarter,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: firestarterCountdown.toFixed(3),
				className: firestarterCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Thunderhead,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: thunderheadCountdown.toFixed(3),
				className: thunderheadCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.Manaward,
				onSelf: true,
				enabled: true,
				stacks: 1,
				timeRemaining: manawardCountdown.toFixed(3),
				className: manawardCountdown > 0 ? "" : "hidden",
			},
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		let eno = this.state.resources.get(ResourceType.Enochian);
		let enoCountdown: number;
		if (eno.available(1) && !eno.pendingChange) {
			enoCountdown = 15;
		} else {
			enoCountdown = this.state.resources.timeTillReady(ResourceType.Enochian);
		}
		const resources = this.state.resources;
		const enochianCountdown = enoCountdown;
		const astralFire = this.state.getFireStacks();
		const umbralIce = this.state.getIceStacks();
		const umbralHearts = resources.get(ResourceType.UmbralHeart).availableAmount();
		const paradox = resources.get(ResourceType.Paradox).availableAmount();
		const astralSoul = resources.get(ResourceType.AstralSoul).availableAmount();
		const polyglotCountdown = eno.available(1)
			? resources.timeTillReady(ResourceType.Polyglot)
			: 30;
		const polyglotStacks = resources.get(ResourceType.Polyglot).availableAmount();

		const maxPolyglotStacks =
			(Traits.hasUnlocked(TraitName.EnhancedPolyglotII, this.state.config.level) && 3) ||
			(Traits.hasUnlocked(TraitName.EnhancedPolyglot, this.state.config.level) && 2) ||
			1;
		const infos = [
			{
				kind: "bar",
				name: localize({
					en: "enochian",
					zh: "天语",
					ja: "エノキアン",
				}),
				color: colors.blm.enochian,
				progress: enochianCountdown / 15,
				valueString: enochianCountdown.toFixed(3),
			} as ResourceBarProps,
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
		if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, this.state.config.level)) {
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
