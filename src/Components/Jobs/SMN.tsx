import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	ResourceTextProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { SMNState } from "../../Game/Jobs/SMN";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { SMN_STATUSES } from "../../Game/Data/Jobs/SMN";

(Object.keys(SMN_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SMN/${RESOURCES[buff].name}.png`),
);

export class SMNStatusPropsGenerator extends StatusPropsGenerator<SMNState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(SMN_STATUSES) as ResourceKey[]).map((key) => {
				if (key === "AETHERFLOW") {
					return this.makeCommonTimerless(key);
				}
				return this.makeCommonTimer(key);
			}),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const attunementTimer = Math.max(
			resources.timeTillReady("FIRE_ATTUNEMENT"),
			resources.timeTillReady("EARTH_ATTUNEMENT"),
			resources.timeTillReady("WIND_ATTUNEMENT"),
		);
		const demiTimer = resources.timeTillReady("ACTIVE_DEMI");

		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localize({ en: "aetherflow" }),
				color: colors.rdm.manaStack,
				currentStacks: resources.get("AETHERFLOW").availableAmount(),
				maxStacks: 2,
			} as ResourceCounterProps,
			// TODO combine trace gauge elements into a common thing
			{
				kind: "text",
				name: localize({ en: "attunement" }),
				color: colors.rdm.manaStack,
				text: Math.max(
					resources.get("FIRE_ATTUNEMENT").availableAmount(),
					resources.get("EARTH_ATTUNEMENT").availableAmount(),
					resources.get("WIND_ATTUNEMENT").availableAmount(),
				).toString(),
			} as ResourceTextProps,
			{
				kind: "bar",
				name: localize({ en: "attunement timer" }),
				color: colors.rdm.whiteMana,
				progress: 1 - attunementTimer / 30,
				valueString: attunementTimer.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "text",
				name: localize({ en: "demi timer" }),
				color: colors.rdm.blackMana,
				text: demiTimer.toFixed(2),
			} as ResourceTextProps,
			// debugging
			{
				kind: "text",
				name: localize({ en: "next demi" }),
				color: colors.rdm.manaStack,
				text: resources.get("NEXT_DEMI_CYCLE").availableAmount().toFixed(0),
			} as ResourceTextProps,
			{
				kind: "text",
				name: localize({ en: "active demi" }),
				color: colors.rdm.manaStack,
				text: resources.get("ACTIVE_DEMI").availableAmount().toFixed(0),
			} as ResourceTextProps,
		];

		return infos;
	}
}
