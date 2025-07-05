import { MNK_RESOURCES, MNK_STATUSES, MNKResourceKey } from "../../Game/Data/Jobs/MNK";
import { MNKState } from "../../Game/Jobs/MNK";
import { ThemeColors } from "../ColorTheme";
import { ContentNode } from "../Common";
import { localize, localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	BeastGaugeProps,
	ChakraGaugeProps,
	NadiGaugeProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceCounterProps,
	ResourceTextProps,
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
			return localize({ en: "o", zh: "魔猿" });
		case "raptor":
			return localize({ en: "r", zh: "盗龙" });
		case "coeurl":
			return localize({ en: "c", zh: "猛豹" });
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
		const lunar = resources.get("LUNAR_NADI").available(1);
		const solar = resources.get("SOLAR_NADI").available(1);

		const beastText = beastChakras
			.map(localizeBeast)
			.filter((x) => x !== null)
			.join("+");
		const nadiText = [
			localizeNadi(lunar ? "lunar" : null),
			localizeNadi(solar ? "solar" : null),
		]
			.filter((x) => x !== null)
			.join("+");

		const infos: ResourceDisplayProps[] = [
			{
				kind: "counter",
				name: localizeResourceType("OPO_OPOS_FURY"),
				color: colors.mnk.opo,
				currentStacks: resources.get("OPO_OPOS_FURY").availableAmount(),
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localizeResourceType("RAPTORS_FURY"),
				color: colors.mnk.raptor,
				currentStacks: resources.get("RAPTORS_FURY").availableAmount(),
				maxStacks: 1,
			} as ResourceCounterProps,
			{
				kind: "counter",
				name: localizeResourceType("COEURLS_FURY"),
				color: colors.mnk.coeurl,
				currentStacks: resources.get("COEURLS_FURY").availableAmount(),
				maxStacks: 2,
			} as ResourceCounterProps,
			{
				kind: "chakra",
				name: localizeResourceType("CHAKRA"),
				regularColor: colors.mnk.chakra,
				overflowColor: colors.mnk.extraChakra,
				value: resources.get("CHAKRA").availableAmount(),
				wrapCount: 5,
			} as ChakraGaugeProps,
			{
				kind: "text",
				name: localizeResourceType("BEAST_CHAKRA_TIMER"),
				text: beastChakras.every((x) => x !== null)
					? resources.get("BEAST_CHAKRA_1").pendingChange?.timeTillEvent.toFixed(3)
					: "n/a",
			} as ResourceTextProps,
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
				lunar,
				solar,
				lunarColor: colors.mnk.lunar,
				solarColor: colors.mnk.solar,
			} as NadiGaugeProps,
		];
		return infos;
	}
}
