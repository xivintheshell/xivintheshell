import { RESOURCES } from "../../Game/Data";
import { SGE_STATUSES, SGEResourceKey } from "../../Game/Data/Jobs/SGE";
import { SGEState } from "../../Game/Jobs/SGE";
import {
	BuffProps,
	registerBuffIcon,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(SGE_STATUSES) as SGEResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SGE/${RESOURCES[buff].name}.png`),
);

export class SGEStatusPropsGenerator extends StatusPropsGenerator<SGEState> {
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
