import { ResourceType } from "../../Game/Common";
import { RPRState } from "../../Game/Jobs/RPR";
import { TraitName, Traits } from "../../Game/Traits";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import { BuffProps, registerBuffIcon, ResourceBarProps, ResourceCounterProps, ResourceDisplayProps, ResourceTextProps, StatusPropsGenerator } from "../StatusDisplay";

[
    ResourceType.DeathsDesign,
    ResourceType.SoulReaver,
    ResourceType.EnhancedGibbet,
    ResourceType.EnhancedGallows,
    ResourceType.Executioner + "1",
    ResourceType.Executioner + "2",
    ResourceType.EnhancedVoidReaping,
    ResourceType.EnhancedCrossReaping,
    ResourceType.Oblatio,
    ResourceType.IdealHost,
    ResourceType.PerfectioOcculta,
    ResourceType.PerfectioParata,
    ResourceType.ArcaneCircle,
    ResourceType.CircleOfSacrifice,
    ResourceType.BloodsownCircle,
    ResourceType.ImmortalSacrifice + "1",
    ResourceType.ImmortalSacrifice + "2",
    ResourceType.ImmortalSacrifice + "3",
    ResourceType.ImmortalSacrifice + "4",
    ResourceType.ImmortalSacrifice + "5",
    ResourceType.ImmortalSacrifice + "6",
    ResourceType.ImmortalSacrifice + "7",
    ResourceType.ImmortalSacrifice + "8",
    ResourceType.CrestOfTimeBorrowed,
    ResourceType.CrestOfTimeReturned,
    ResourceType.Soulsow,
    ResourceType.Threshold,
    ResourceType.EnhancedHarpe,

].forEach((buff) => registerBuffIcon(buff, `RPR/${buff}.png`));

export class RPRStatusPropsGenerator extends StatusPropsGenerator<RPRState> {
    override getEnemyBuffViewProps(): BuffProps[] {
        const deathsDesignCountdown = this.state.resources.timeTillReady(ResourceType.DeathsDesign);
        return [
            {
                rscType: ResourceType.DeathsDesign,
                onSelf: false,
                enabled: true,
                stacks: 1,
                timeRemaining: deathsDesignCountdown.toFixed(3),
                className: deathsDesignCountdown > 0 ? "" : "hidden"
            }
        ]
    }


    override getSelfBuffViewProps(): BuffProps[] {
    const makeRprSelfTimer = (rscType: ResourceType) => {
        const cd = this.state.resources.timeTillReady(rscType);
        return {
            rscType: rscType,
            onSelf: true,
            enabled: true,
            stacks: this.state.resources.get(rscType).availableAmount(),
            timeRemaining: cd.toFixed(3),
            className: cd > 0 ? "" : "hidden"
        }
    }

        return [
            ResourceType.SoulReaver,
            ResourceType.EnhancedGibbet,
            ResourceType.EnhancedGallows,
            ResourceType.Executioner,
            ResourceType.Enshrouded,
            ResourceType.EnhancedCrossReaping,
            ResourceType.EnhancedVoidReaping,
            ResourceType.Oblatio,
            ResourceType.IdealHost,
            ResourceType.PerfectioOcculta,
            ResourceType.PerfectioParata,
            ResourceType.ArcaneCircle,
            ResourceType.CircleOfSacrifice,
            ResourceType.BloodsownCircle,
            ResourceType.ImmortalSacrifice,
            ResourceType.ArcaneCrest,
            ResourceType.CrestOfTimeBorrowed,
            ResourceType.CrestOfTimeReturned,
            ResourceType.Soulsow,
            ResourceType.Threshold,
            ResourceType.EnhancedHarpe,
        ].map(makeRprSelfTimer);
    }
    override getResourceViewProps(): ResourceDisplayProps[] {
        const colors = getCurrentThemeColors();
        const resources = this.state.resources;
        const soulGauge = resources.get(ResourceType.Soul).availableAmount();
        const shroudGauge = resources.get(ResourceType.Shroud).availableAmount();
        const lemureShroud = resources.get(ResourceType.LemureShroud).availableAmount();
        const voidShroud = resources.get(ResourceType.VoidShroud).availableAmount();
        const dd = resources.timeTillReady(ResourceType.DeathsDesign);

        const infos: ResourceDisplayProps[] = [
            {
                kind: "text",
                name: "combo",
                text: resources.get(ResourceType.RPRCombo).availableAmount().toString(),
            },
            {
                kind: "text",
                name: localize({
                    en: "Death's Design",
                }),
                text: dd.toFixed(3),
            } as ResourceTextProps,
            {
                kind: "bar",
                name: localize({
                    en: "Soul Gauge",
                }),
                color: soulGauge < 50 ? colors.rpr.soulGaugeLow : colors.rpr.soulGaugeHigh,
                progress: soulGauge / 100,
                valueString: Math.floor(soulGauge) + "/100",
            } as ResourceBarProps,
        ]
        if (Traits.hasUnlocked(TraitName.ShroudGauge, this.state.config.level)) {
            infos.push({
                kind: "bar",
                name: localize({
                    en: "Shroud Gauge",
                }),
                color: shroudGauge < 50 ? colors.rpr.shroudGaugeLow : colors.rpr.shroudGaugeHigh,
                progress: shroudGauge / 100,
                valueString: Math.floor(shroudGauge) + "/100",
            } as ResourceBarProps,
            {
                kind: "counter",
                name: localize({
                    en: "Lemure Shroud",
                }),
                color: colors.rpr.lemureShroud,
                currentStacks: lemureShroud,
                maxStacks: 5,
            } as ResourceCounterProps);
        }
        if (Traits.hasUnlocked(TraitName.VoidSoul, this.state.config.level)) {
            infos.push({
                kind: "counter",
                name: localize({
                    en: "Void Shroud",
                }),
                color: voidShroud < 2 ? colors.rpr.voidShroudLow : colors.rpr.voidShroudHigh,
                currentStacks: voidShroud,
                maxStacks: 5,
            } as ResourceCounterProps);
        }
        return infos;
    }
}