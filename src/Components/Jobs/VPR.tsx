import { VPRState } from "../../Game/Jobs/VPR";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(VPR_STATUSES) as VPRResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `VPR/${RESOURCES[buff].name}.png`),
);
*/

export class VPRStatusPropsGenerator extends StatusPropsGenerator<VPRState> {
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
