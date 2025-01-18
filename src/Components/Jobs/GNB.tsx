import {
	registerBuffIcon,
	BuffProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator,
	ResourceBarProps,
} from "../StatusDisplay";
import { ResourceType, TraitName } from "../../Game/Common";
import { GNBState } from "../../Game/Jobs/GNB";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";

[
	ResourceType.HeartOfStone,
	ResourceType.CatharsisOfCorundum,
	ResourceType.HeartOfCorundum,
	ResourceType.ClarityOfCorundum,
	ResourceType.Superbolide,
	ResourceType.ReadyToReign,
	ResourceType.ReadyToBlast,
	ResourceType.ReadyToRaze,
	ResourceType.BrutalShell,
	ResourceType.NoMercy,
	ResourceType.ReadyToBreak,
	ResourceType.Camouflage,
	ResourceType.Nebula,
	ResourceType.GreatNebula,
	ResourceType.HeartOfLight,
	ResourceType.Aurora,
	ResourceType.RoyalGuard,
	ResourceType.ReadyToRip,
	ResourceType.ReadyToGouge,
	ResourceType.ReadyToTear,
	ResourceType.SonicBreakDoT,
	ResourceType.BowShockDoT,
].forEach((buff) => registerBuffIcon(buff, `GNB/${buff}.png`));

export class GNBStatusPropsGenerator extends StatusPropsGenerator<GNBState> {
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		const sonicDoTCountdown = this.state.resources.timeTillReady(ResourceType.SonicBreakDoT);
		const bowShockDoTCountdown = this.state.resources.timeTillReady(ResourceType.BowShockDoT);
		return [
			{
				rscType: ResourceType.SonicBreakDoT,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: sonicDoTCountdown.toFixed(3),
				className: sonicDoTCountdown > 0 ? "" : "hidden",
			},
			{
				rscType: ResourceType.BowShockDoT,
				onSelf: false,
				enabled: true,
				stacks: 1,
				timeRemaining: bowShockDoTCountdown.toFixed(3),
				className: bowShockDoTCountdown > 0 ? "" : "hidden",
			},
		];
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		const makeRoyalGuard = () => {
			return {
				rscType: ResourceType.RoyalGuard,
				onSelf: true,
				enabled: true,
				stacks: 1,
				className: this.state.hasResourceAvailable(ResourceType.RoyalGuard)
					? ""
					: "hidden",
			};
		};

		return [
			...[
				ResourceType.HeartOfStone,
				ResourceType.CatharsisOfCorundum,
				ResourceType.HeartOfCorundum,
				ResourceType.ClarityOfCorundum,
				ResourceType.Superbolide,
				ResourceType.ReadyToReign,
				ResourceType.ReadyToBlast,
				ResourceType.ReadyToRaze,
				ResourceType.BrutalShell,
				ResourceType.NoMercy,
				ResourceType.ReadyToBreak,
				ResourceType.Camouflage,
				ResourceType.Nebula,
				ResourceType.GreatNebula,
				ResourceType.HeartOfLight,
				ResourceType.Aurora,
				ResourceType.ReadyToRip,
				ResourceType.ReadyToGouge,
				ResourceType.ReadyToTear,
			].map((rsc) => this.makeCommonTimer(rsc)),
			makeRoyalGuard(),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const singleCombo = resources.get(ResourceType.GNBComboTracker);
		const aoeCombo = resources.get(ResourceType.GNBAOEComboTracker);
		const powderGaugeStacks = resources.get(ResourceType.PowderGauge).availableAmount();
		const royalGuardActive = resources.get(ResourceType.RoyalGuard).availableAmount();

		const comboTimer = singleCombo.available(1)
			? singleCombo.pendingChange?.timeTillEvent
			: aoeCombo.available(1)
				? aoeCombo.pendingChange?.timeTillEvent
				: undefined;

		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: localize({ en: "Combo Timer" }),
				color: colors.rdm.manaStack,
				progress: comboTimer ? comboTimer / 30 : 0,
				valueString: comboTimer?.toFixed(3) ?? "N/A",
			} as ResourceBarProps,

			{
				kind: "counter",
				name: localize({ en: "Royal Guard" }),
				color: colors.rdm.manaStack,
				currentStacks: royalGuardActive,
				maxStacks: 1,
			} as ResourceCounterProps,

			{
				kind: "counter",
				name: localize({ en: "Powder Gauge", zh: "晶壤" }),
				color: colors.rdm.manaStack,
				currentStacks: powderGaugeStacks,
				maxStacks: this.state.hasTraitUnlocked(TraitName.CartridgeChargeII) ? 3 : 2,
			} as ResourceCounterProps,
		];

		return infos;
	}
}
