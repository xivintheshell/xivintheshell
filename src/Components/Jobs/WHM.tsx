import { WHMState } from "../../Game/Jobs/WHM";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(WHM_STATUSES) as WHMResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `WHM/${RESOURCES[buff].name}.png`),
);
*/

export class WHMStatusPropsGenerator extends StatusPropsGenerator<WHMState> {
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
