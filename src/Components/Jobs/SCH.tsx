import { RESOURCES } from "../../Game/Data";
import { SCH_STATUSES, SCHResourceKey } from "../../Game/Data/Jobs/SCH";
import { SCHState } from "../../Game/Jobs/SCH";
import { ThemeColors } from "../ColorTheme";
import { localizeResourceType } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceTextProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(SCH_STATUSES) as SCHResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SCH/${RESOURCES[buff].name}.png`),
);

const SCH_DEBUFFS: SCHResourceKey[] = [
	"BIO_II",
	"BIOLYSIS",
	"CHAIN_STRATAGEM",
	"BANEFUL_IMPACTION",
];
const SCH_BUFFS: SCHResourceKey[] = (Object.keys(SCH_STATUSES) as SCHResourceKey[]).filter(
	(key) => !SCH_DEBUFFS.includes(key),
);

export class SCHStatusPropsGenerator extends StatusPropsGenerator<SCHState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...SCH_DEBUFFS.map((rscType) => this.makeCommonTimer(rscType))];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...SCH_BUFFS.map((rscType) => {
				if (rscType === "FEY_UNION") {
					return this.makeCommonTimerless(rscType);
				}
				if (rscType === "SACRED_SOIL_ZONE") {
					return this.makeToggleableTimer(rscType);
				}
				return this.makeCommonTimer(rscType);
			}),
		];
	}

	override jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		const seraph = this.state.resources.get("SERAPH_SUMMON_TIMER");
		const seraphTimer = seraph.available(1) ? seraph.pendingChange?.timeTillEvent : undefined;
		const faerie = this.state.resources.get("FAERIE_GAUGE").availableAmount();
		const aether = this.state.resources.get("AETHERFLOW").availableAmount();
		return [
			{
				kind: "text",
				name: localizeResourceType("SERAPH_SUMMON_TIMER"),
				text: seraphTimer?.toFixed(3) ?? "N/A",
			} as ResourceTextProps,
			{
				kind: "bar",
				name: localizeResourceType("FAERIE_GAUGE"),
				color: colors.blm.umbralIce, // TODO
				progress: faerie / 100,
				valueString: faerie.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localizeResourceType("AETHERFLOW"),
				color: colors.blm.umbralIce, // TODO
				currentStacks: aether,
				maxStacks: 3,
				valueString: aether.toFixed(0),
			} as ResourceCounterProps,
		];
	}
}
