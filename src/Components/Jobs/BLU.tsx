import { BLUState } from "../../Game/Jobs/BLU";
import {
	registerBuffIcon,
	BuffProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";
import { RESOURCES } from "../../Game/Data";
import { BLUResourceKey, BLU_STATUSES } from "../../Game/Data/Jobs/BLU";
import { ThemeColors } from "../ColorTheme";
const BLU_DEBUFFS: BLUResourceKey[] = [
	"SONG_OF_TORMENT",
	"NIGHTBLOOM",
	"FEATHER_RAIN",
	"MORTAL_FLAME",
	"BREATH_OF_MAGIC",
	"WANING_NOCTURNE",
	"DIAMONDBACK",
	"BRUSH_WITH_DEATH",
];

const BLU_BUFFS: BLUResourceKey[] = (Object.keys(BLU_STATUSES) as BLUResourceKey[]).filter(
	(key) => !BLU_DEBUFFS.includes(key),
);

(Object.keys(BLU_STATUSES) as BLUResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `BLU/${RESOURCES[buff].name}.png`),
);

export class BLUStatusPropsGenerator extends StatusPropsGenerator<BLUState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...BLU_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType, false))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return BLU_BUFFS.map((key) => {
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		return [];
	}
}
