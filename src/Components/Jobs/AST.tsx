import { ASTState } from "../../Game/Jobs/AST";
import { BuffProps, ResourceDisplayProps, StatusPropsGenerator } from "../StatusDisplay";

/*
(Object.keys(AST_STATUSES) as ASTResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `AST/${RESOURCES[buff].name}.png`),
);
*/

export class ASTStatusPropsGenerator extends StatusPropsGenerator<ASTState> {
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
