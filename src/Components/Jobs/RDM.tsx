import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { RDMState } from "../../Game/Jobs/RDM";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { ResourceKey, RESOURCES } from "../../Game/Data";
import { RDM_STATUSES } from "../../Game/Data/Jobs/RDM";

(Object.keys(RDM_STATUSES) as ResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `RDM/${RESOURCES[buff].name}.png`),
);

export class RDMStatusPropsGenerator extends StatusPropsGenerator<RDMState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(RDM_STATUSES) as ResourceKey[]).map((key) => this.makeCommonTimer(key)),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const whiteMana = resources.get("WHITE_MANA").availableAmount();
		const blackMana = resources.get("BLACK_MANA").availableAmount();
		const manaStacks = resources.get("MANA_STACKS").availableAmount();

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "white mana", zh: "白魔元" }),
				color: colors.rdm.whiteMana,
				progress: whiteMana / 100,
				valueString: whiteMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({ en: "black mana", zh: "黑魔元" }),
				color: colors.rdm.blackMana,
				progress: blackMana / 100,
				valueString: blackMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({ en: "mana stacks", zh: "魔元集" }),
				color: colors.rdm.manaStack,
				currentStacks: manaStacks,
				maxStacks: 3,
			} as ResourceCounterProps,
		];

		return infos;
	}
}
