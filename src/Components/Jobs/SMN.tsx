import {
	registerBuffIcon,
	BuffProps,
	AttunementGaugeProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { SMNState, ActiveDemiValue } from "../../Game/Jobs/SMN";
import { ThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { SMN_STATUSES } from "../../Game/Data/Jobs/SMN";

(Object.keys(SMN_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SMN/${RESOURCES[buff].name}.png`),
);

export class SMNStatusPropsGenerator extends StatusPropsGenerator<SMNState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const timerlessBuffs: ResourceKey[] = [
			"AETHERFLOW",
			"IFRITS_FAVOR",
			"TITANS_FAVOR",
			"GARUDAS_FAVOR",
			"CRIMSON_STRIKE_READY",
		];
		return [
			...(Object.keys(SMN_STATUSES) as ResourceKey[]).map((key) => {
				if (timerlessBuffs.includes(key)) {
					return this.makeCommonTimerless(key);
				}
				return this.makeCommonTimer(key);
			}),
		];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const attunementTimer = Math.max(
			resources.timeTillReady("FIRE_ATTUNEMENT"),
			resources.timeTillReady("EARTH_ATTUNEMENT"),
			resources.timeTillReady("WIND_ATTUNEMENT"),
		);
		const activeDemi = resources.get("ACTIVE_DEMI").availableAmount();
		const demiTimer = resources.timeTillReady("ACTIVE_DEMI");

		const arcana = [];
		if (resources.get("RUBY_ARCANUM").available(1)) {
			arcana.push("ruby");
		}
		if (resources.get("TOPAZ_ARCANUM").available(1)) {
			arcana.push("topaz");
		}
		if (resources.get("EMERALD_ARCANUM").available(1)) {
			arcana.push("emerald");
		}

		const demiColor =
			activeDemi === ActiveDemiValue.BAHAMUT
				? colors.smn.bahamut
				: activeDemi === ActiveDemiValue.PHOENIX
					? colors.smn.phoenix
					: colors.smn.solar;

		const summonColor = resources.get("FIRE_ATTUNEMENT").available(1)
			? colors.smn.ruby
			: resources.get("EARTH_ATTUNEMENT").available(1)
				? colors.smn.topaz
				: colors.smn.emerald;

		const summonCd = this.state.cooldowns.get("cd_SUMMON_LOCKOUT");
		const attackProgress = summonCd.timeTillNextStackAvailable();

		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localize({ en: "aetherflow", zh: "以太超流" }),
				color: colors.smn.aetherflow,
				currentStacks: resources.get("AETHERFLOW").availableAmount(),
				maxStacks: 2,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({ en: "demi summon", zh: "亚灵神剩余时间" }),
				color: demiColor,
				progress: demiTimer === 0 ? 0 : 1 - demiTimer / 15,
				valueString: demiTimer.toFixed(3),
			} as ResourceBarProps,
			{
				kind: "attunement",
				aetherName: localize({ en: "aether", zh: "宝石以太" }),
				attunementName: localize({ en: "attunement", zh: "宝石以太层数" }),
				ruby: resources.get("RUBY_ARCANUM").available(1),
				topaz: resources.get("TOPAZ_ARCANUM").available(1),
				emerald: resources.get("EMERALD_ARCANUM").available(1),
				attunementCount: Math.max(
					resources.get("FIRE_ATTUNEMENT").availableAmount(),
					resources.get("EARTH_ATTUNEMENT").availableAmount(),
					resources.get("WIND_ATTUNEMENT").availableAmount(),
				),
				timeRemaining: attunementTimer,
				rubyColor: colors.smn.ruby,
				topazColor: colors.smn.topaz,
				emeraldColor: colors.smn.emerald,
			} as AttunementGaugeProps,
			{
				kind: "bar",
				name: localize({ en: "summon lock", zh: "召唤剩余时间" }),
				color: summonColor,
				progress:
					attackProgress > 0
						? 1 - summonCd.timeTillNextStackAvailable() / summonCd.currentStackCd()
						: 0,
				valueString: attackProgress.toFixed(3),
			} as ResourceBarProps,
		];

		return infos;
	}
}
