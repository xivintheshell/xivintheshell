import { DRKState } from "../../Game/Jobs/DRK";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(DRK_STATUSES) as DRKResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `DRK/${RESOURCES[buff].name}.png`),
);
*/

export class DRKStatusPropsGenerator extends StatusPropsGenerator<DRKState> {
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
