import { RESOURCES } from "../../Game/Data";
import { WHM_STATUSES, WHMResourceKey } from "../../Game/Data/Jobs/WHM";
import { WHMState } from "../../Game/Jobs/WHM";
import { ThemeColors } from "../ColorTheme";
import { localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(WHM_STATUSES) as WHMResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `WHM/${RESOURCES[buff].name}.png`),
);

const WHM_DEBUFFS: WHMResourceKey[] = ["AERO_II", "DIA"];
const WHM_BUFFS: WHMResourceKey[] = (Object.keys(WHM_STATUSES) as WHMResourceKey[]).filter(
	(key) => !WHM_DEBUFFS.includes(key),
);

export class WHMStatusPropsGenerator extends StatusPropsGenerator<WHMState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...WHM_DEBUFFS.flatMap((rscType) => this.makeTargetedTimers(rscType))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [...WHM_BUFFS.map((rscType) => this.makeCommonTimer(rscType))];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;
		const lily = resources.get("LILLIES");
		const lilyCd = resources.get("LILY_TIMER").available(1)
			? resources.timeTillReady("LILY_TIMER")
			: 20;
		const lilyStacks = lily.availableAmount();
		const bloodStacks = resources.get("BLOOD_LILY").availableAmount();
		const items = [
			{
				kind: "bar",
				name: localizeResourceType("LILY_TIMER"),
				color: colors.whm.lily,
				progress: 1 - lilyCd / 20,
				valueString: lilyCd.toFixed(3),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localizeResourceType("LILLIES"),
				color: colors.whm.lily,
				currentStacks: lilyStacks,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
		if (this.state.hasTraitUnlocked("TRANSCENDENT_AFFLATUS")) {
			items.push({
				kind: "counter",
				name: localizeResourceType("BLOOD_LILY"),
				color: colors.whm.blood,
				currentStacks: bloodStacks,
				maxStacks: 3,
			} as ResourceCounterProps);
		}
		return items;
	}
}
