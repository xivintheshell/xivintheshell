import { NINState } from "../../Game/Jobs/NIN";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(NIN_STATUSES) as NINResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `NIN/${RESOURCES[buff].name}.png`),
);
*/

export class NINStatusPropsGenerator extends StatusPropsGenerator<NINState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		return [];
	}
}
