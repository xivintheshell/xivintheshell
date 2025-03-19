import { MNKState } from "../../Game/Jobs/MNK";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(MNK_STATUSES) as MNKResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `MNK/${RESOURCES[buff].name}.png`),
);
*/

export class MNKStatusPropsGenerator extends StatusPropsGenerator<MNKState> {
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
