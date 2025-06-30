import { MNK_RESOURCES, MNK_STATUSES, MNKResourceKey } from "../../Game/Data/Jobs/MNK";
import { MNKState } from "../../Game/Jobs/MNK";
import { ThemeColors } from "../ColorTheme";
import { ContentNode } from "../Common";
import { localize, localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	BeastGaugeProps,
	NadiGaugeProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
    ResourceCounterProps,
} from "../StatusDisplay";

(Object.keys(MNK_STATUSES) as MNKResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `MNK/${MNK_RESOURCES[buff].name}.png`),
);

function numberToBeastChakra(value: number): "opo" | "raptor" | "coeurl" | null {
	switch (value) {
		case 1:
			return "opo";
		case 2:
			return "raptor";
		case 3:
			return "coeurl";
	}
	return null;
}

function localizeBeast(kind: "opo" | "raptor" | "coeurl" | null): ContentNode | null {
	switch (kind) {
		case "opo":
			return localize({ en: kind, zh: "魔猿" });
		case "raptor":
			return localize({ en: kind, zh: "盗龙" });
		case "coeurl":
			return localize({ en: kind, zh: "猛豹" });
	}
	return null;
}

function numberToNadi(value: number): "lunar" | "solar" | null {
	switch (value) {
		case 1:
			return "lunar";
		case 2:
			return "solar";
	}
	return null;
}

function localizeNadi(kind: "lunar" | "solar" | null): ContentNode | null {
	switch (kind) {
		case "lunar":
			return localize({ en: kind, zh: "太阴" });
		case "solar":
			return localize({ en: kind, zh: "太阳" });
	}
	return null;
}

export class MNKStatusPropsGenerator extends StatusPropsGenerator<MNKState> {
	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return Object.keys(MNK_STATUSES).map((key) => this.makeCommonTimer(key as MNKResourceKey));
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const resources = this.state.resources;

		const beastChakras = ["BEAST_CHAKRA_1", "BEAST_CHAKRA_2", "BEAST_CHAKRA_3"]
			.map((key) => resources.get(key as MNKResourceKey).availableAmount())
			.map(numberToBeastChakra);
		const leftNadi = numberToNadi(resources.get("NADI_1").availableAmount());
		const rightNadi = numberToNadi(resources.get("NADI_2").availableAmount());

		const beastText = beastChakras
			.map(localizeBeast)
			.filter((x) => x !== null)
			.join("+");
		const nadiText = [leftNadi, rightNadi]
			.map(localizeNadi)
			.filter((x) => x !== null)
			.join("+");

		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localizeResourceType("CHAKRA"),
				color: colors.mnk.chakra,
				currentStacks: resources.get("CHAKRA").availableAmount(),
				maxStacks: 5,
			} as ResourceCounterProps,
			{
				kind: "beast",
				name: localizeResourceType("BEAST_CHAKRA"),
				label: beastText,
				chakras: beastChakras,
				opoColor: colors.mnk.opo,
				raptorColor: colors.mnk.raptor,
				coeurlColor: colors.mnk.coeurl,
			} as BeastGaugeProps,
			{
				kind: "nadi",
				name: localizeResourceType("NADI"),
				label: nadiText,
				lunarColor: colors.mnk.lunar,
				solarColor: colors.mnk.solar,
				left: leftNadi,
				right: rightNadi,
			} as NadiGaugeProps,
		];
		return infos;
	}
}
