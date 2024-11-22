import {
	registerBuffIcon,
	BuffProps,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	StatusPropsGenerator
} from "../StatusDisplay";
import {ResourceType} from "../../Game/Common";
import {RDMState} from "../../Game/Jobs/RDM";
import {getCurrentThemeColors} from "../ColorTheme";
import {localize} from "../Localization";

[
	ResourceType.Acceleration,
	ResourceType.Dualcast,
	ResourceType.Embolden,
	ResourceType.GrandImpactReady,
	ResourceType.MagickBarrier,
	ResourceType.MagickedSwordplay,
	ResourceType.MagickedSwordplay + "2",
	ResourceType.MagickedSwordplay + "3",
	ResourceType.Manafication,
	ResourceType.Manafication + "2",
	ResourceType.Manafication + "3",
	ResourceType.Manafication + "4",
	ResourceType.Manafication + "5",
	ResourceType.Manafication + "6",
	ResourceType.PrefulgenceReady,
	ResourceType.ThornedFlourish,
	ResourceType.VerfireReady,
	ResourceType.VerstoneReady,
].forEach((buff) => registerBuffIcon(buff, `RDM/${buff}.png`));

export class RDMStatusPropsGenerator extends StatusPropsGenerator<RDMState> {
	override getEnemyBuffViewProps(): BuffProps[] {
        const addleCountdown = this.state.resources.timeTillReady(ResourceType.Addle);
		return [
			{
				rscType: ResourceType.Addle,
				onSelf: false,
				enabled: true,
				stacks:1,
				timeRemaining: addleCountdown.toFixed(3),
				className: addleCountdown > 0 ? "" : "hidden"
			}
		];
	}

	override getSelfBuffViewProps(): BuffProps[] {
		const makeRedMageTimer = (rscType: ResourceType) => {
			const cd = this.state.resources.timeTillReady(rscType);
			return {
				rscType: rscType,
				onSelf: true,
				enabled: true,
				stacks: this.state.resources.get(rscType).availableAmount(),
				timeRemaining: cd.toFixed(3),
				className: cd > 0 ? "" : "hidden"
			};
		};
		return [
			ResourceType.Dualcast,
			ResourceType.Acceleration,
			ResourceType.Swiftcast,
			ResourceType.GrandImpactReady,
			ResourceType.VerstoneReady,
			ResourceType.VerfireReady,
			ResourceType.Embolden,
			ResourceType.ThornedFlourish,
			ResourceType.MagickedSwordplay,
			ResourceType.Manafication,
			ResourceType.PrefulgenceReady,
			ResourceType.MagickBarrier,
			ResourceType.LucidDreaming,
			ResourceType.Surecast,
			ResourceType.Tincture,
			ResourceType.Sprint,
		].map(makeRedMageTimer);
	}

	override getResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const mana = resources.get(ResourceType.Mana).availableAmount();
		const timeTillNextManaTick = resources.timeTillReady(ResourceType.Mana);
		const whiteMana = resources.get(ResourceType.WhiteMana).availableAmount();
		const blackMana = resources.get(ResourceType.BlackMana).availableAmount();
		const manaStacks = resources.get(ResourceType.ManaStacks).availableAmount();
		const infos: ResourceDisplayProps[] = [
			{
				kind: "bar",
				name: "MP",
				color: colors.resources.mana,
				progress: mana / 10000,
				valueString: Math.floor(mana) + "/10000",
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "MP tick",
					zh: "跳蓝时间",
					ja: "MPティック"
				}),
				color: colors.resources.manaTick,
				progress: 1 - timeTillNextManaTick / 3,
				valueString: (3 - timeTillNextManaTick).toFixed(3) + "/3",
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({en: "white mana", zh: "白魔元"}),
				color: colors.rdm.whiteMana,
				progress: whiteMana / 100,
				valueString: whiteMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({en: "black mana", zh: "黑魔元"}),
				color: colors.rdm.blackMana,
				progress: blackMana / 100,
				valueString: blackMana.toFixed(0),
			} as ResourceBarProps,
			{
				kind: "counter",
				name: localize({en: "mana stacks", zh: "魔元集"}),
				color: colors.rdm.manaStack,
				currentStacks: manaStacks,
				maxStacks: 3,
			} as ResourceCounterProps,
		];
		return infos;
	}
}