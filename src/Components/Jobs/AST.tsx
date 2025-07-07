import { RESOURCES } from "../../Game/Data";
import { AST_STATUSES, ASTResourceKey } from "../../Game/Data/Jobs/AST";
import { ASTState } from "../../Game/Jobs/AST";
import { ThemeColors } from "../ColorTheme";
import { localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ArcanaGaugeProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(AST_STATUSES) as ASTResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `AST/${RESOURCES[buff].name}.png`),
);

const AST_DEBUFFS: ASTResourceKey[] = ["COMBUST_II", "COMBUST_III"];
const AST_BUFFS: ASTResourceKey[] = (Object.keys(AST_STATUSES) as ASTResourceKey[]).filter(
	(key) => !AST_DEBUFFS.includes(key),
);

export class ASTStatusPropsGenerator extends StatusPropsGenerator<ASTState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...AST_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [...AST_BUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		return [
			{
				kind: "arcana",
				name: localizeResourceType("ARCANA"),
				currentArcanaColor: this.state.drawnAstral()
					? colors.ast.astralCard
					: colors.ast.umbralCard,
				activeSlots: ["ARCANA_1", "ARCANA_2", "ARCANA_3", "MINOR_ARCANA"].map((rsc) =>
					this.state.hasResourceAvailable(rsc as ASTResourceKey),
				),
			} as ArcanaGaugeProps,
		];
	}
}
