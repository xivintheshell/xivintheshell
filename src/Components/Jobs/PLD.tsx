import { PLDState } from "../../Game/Jobs/PLD";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(PLD_STATUSES) as PLDResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `PLD/${RESOURCES[buff].name}.png`),
);
*/

export class PLDStatusPropsGenerator extends StatusPropsGenerator<PLDState> {
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
