import { SCHState } from "../../Game/Jobs/SCH";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(SCH_STATUSES) as SCHResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SCH/${RESOURCES[buff].name}.png`),
);
*/

export class SCHStatusPropsGenerator extends StatusPropsGenerator<SCHState> {
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
