import { RESOURCES } from "../../Game/Data";
import { SGE_STATUSES, SGEResourceKey } from "../../Game/Data/Jobs/SGE";
import { SGEState } from "../../Game/Jobs/SGE";
import { getResourceInfo, ResourceInfo } from "../../Game/Resources";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
} from "../StatusDisplay";

(Object.keys(SGE_STATUSES) as SGEResourceKey[]).forEach((buff) =>
	registerBuffIcon(buff, `SGE/${RESOURCES[buff].name}.png`),
);

const DEBUFFS: SGEResourceKey[] = [
	"EUKRASIAN_DOSIS",
	"EUKRASIAN_DOSIS_II",
	"EUKRASIAN_DOSIS_III",
	"EUKRASIAN_DYSKRASIA",
];

// Things the Sage would plausibly be mainly casting on other players
const OTHER_TARGET_BUFFS: SGEResourceKey[] = [
	"EUKRASIAN_DIAGNOSIS",
	"KRASIS",
	"TAUROCHOLE",
	"HAIMA",
	"HAIMATINON",
	"KARDION",
];

// Things the Sage would likely be applying to themselves
const SELF_TARGET_BUFFS: SGEResourceKey[] = ["EUKRASIA", "SOTERIA", "ZOE", "PHILOSOPHIA", "KARDIA"];

// Party buffs applied by the sage
const AOE_BUFFS: SGEResourceKey[] = [
	"EUKRASIAN_PROGNOSIS",
	"PANHAIMA",
	"PANHAIMATINON",
	"KERACHOLE",
	"KERAKEIA",
	"EUDAIMONIA",
	"HOLOS",
	"HOLOSAKOS",
];
export class SGEStatusPropsGenerator extends StatusPropsGenerator<SGEState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [...DEBUFFS, ...OTHER_TARGET_BUFFS].map((key) => {
			if (key === "KARDION") {
				return this.makeCommonTimerless(key, false);
			}
			return this.makeCommonTimer(key, false);
		});
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [...AOE_BUFFS, ...SELF_TARGET_BUFFS].map((key) => {
			if (key === "KARDIA" || key === "EUKRASIA") {
				return this.makeCommonTimerless(key);
			}
			return this.makeCommonTimer(key);
		});
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const addersgall = this.state.resources.get("ADDERSGALL");
		const addersgallMaxTimeout = (getResourceInfo("SGE", "ADDERSGALL") as ResourceInfo)
			.maxTimeout;
		const addersgallCountdown =
			addersgall.availableAmount() < addersgall.maxValue
				? this.state.resources.timeTillReady("ADDERSGALL")
				: addersgallMaxTimeout;
		const addersting = this.state.resources.get("ADDERSTING");
		return [
			{
				kind: "counter",
				name: localize({
					en: RESOURCES.ADDERSGALL.name,
				}),
				color: colors.sge.addersgall,
				currentStacks: addersgall.availableAmount(),
				maxStacks: addersgall.maxValue,
			} as ResourceCounterProps,
			{
				kind: "bar",
				name: localize({
					en: RESOURCES.ADDERSGALL.name + " timer",
				}),
				color: colors.sge.addersgall,
				progress: 1 - addersgallCountdown / addersgallMaxTimeout,
				valueString: addersgallCountdown.toFixed(3),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({
					en: RESOURCES.ADDERSTING.name,
				}),
				color: colors.sge.addersting,
				currentStacks: addersting.availableAmount(),
				maxStacks: addersting.maxValue,
			} as ResourceCounterProps,
		];
	}
}
