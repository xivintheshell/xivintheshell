import { ResourceType,TraitName } from "../../Game/Common";
import { DNCState } from "../../Game/Jobs/DNC";
import { Traits } from "../../Game/Traits";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
    BuffProps, BuffsDisplay,
    DanceCounterProps,
    registerBuffIcon,
    ResourceBarProps,
    ResourceCounterProps,
    ResourceDisplayProps, ResourceLocksDisplay, ResourcesDisplay,
    StatusPropsGenerator,
    StatusViewProps
} from "../StatusDisplay";
import React from "react";
import {StaticFn} from "../Common";

[
    ResourceType.SilkenSymmetry,
    ResourceType.SilkenFlow,
    ResourceType.FlourishingSymmetry,
    ResourceType.FlourishingFlow,
    ResourceType.ThreefoldFanDance,
    ResourceType.FourfoldFanDance,
    ResourceType.FinishingMoveReady,
    ResourceType.FlourishingStarfall,
    ResourceType.StandardStep,
    ResourceType.TechnicalStep,
    ResourceType.StandardFinish,
    ResourceType.LastDanceReady,
    ResourceType.TechnicalFinish,
    ResourceType.DanceOfTheDawnReady,
    ResourceType.FlourishingFinish,
    ResourceType.ClosedPosition, 
    ResourceType.Devilment,
    ResourceType.ShieldSamba,
    ResourceType.Improvisation,
    ResourceType.RisingRhythm,
    ResourceType.RisingRhythm + "2",
    ResourceType.RisingRhythm + "3",
    ResourceType.RisingRhythm + "4",
    ResourceType.ImprovisationRegen,
    ResourceType.ImprovisedFinish,
    ResourceType.Esprit,
    ResourceType.DancePartner,
    ResourceType.EspritTechnical,
].forEach((buff) => registerBuffIcon(buff, `DNC/${buff}.png`))
registerBuffIcon(ResourceType.EspritPartner, "DNC/Esprit.png")
registerBuffIcon(ResourceType.StandardFinishPartner, "DNC/Standard Finish.png")

export class DNCStatusPropsGenerator extends StatusPropsGenerator<DNCState> {
    // DNC doesn't put any debuffs on the enemy... but we can use this space for showing our dance partner!
    override getJobEnemyBuffViewProps(): BuffProps[] {
        const resources = this.state.resources

        const dancePartnerApplied = resources.get(ResourceType.DancePartner).availableAmount() > 0;
        const standardFinishPartnerCountdown = resources.timeTillReady(ResourceType.StandardFinishPartner)
        const espritPartnerCountdown = resources.timeTillReady(ResourceType.EspritPartner)
        const espritTechnicalCountdown = resources.timeTillReady(ResourceType.EspritTechnical) 

        return [
            {
                rscType: ResourceType.DancePartner,
                onSelf: false,
                enabled: true,
                stacks: 1,
                className: dancePartnerApplied ? "" : "hidden",
            },
            {
                rscType: ResourceType.StandardFinish,
                onSelf: false,
                enabled: true,
                stacks: 1,
                timeRemaining: standardFinishPartnerCountdown.toFixed(3),
                className: standardFinishPartnerCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.EspritPartner,
                onSelf: false,
                enabled: true,
                stacks: 1,
                timeRemaining: espritPartnerCountdown.toFixed(3),
                className: espritPartnerCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.EspritTechnical,
                onSelf: false,
                enabled: true,
                stacks: 1,
                timeRemaining: espritTechnicalCountdown.toFixed(3),
                className: espritTechnicalCountdown > 0 ? "" : "hidden",
            },
        ]
    }

    override getJobSelfBuffViewProps(): BuffProps[] {
        const resources = this.state.resources
        
        // Job
        const standardStepCountdown = resources.timeTillReady(ResourceType.StandardStep);
        const standardFinishCountdown = resources.timeTillReady(ResourceType.StandardFinish)
        const technicalStepCountdown = resources.timeTillReady(ResourceType.TechnicalStep)
        const technicalFinishCountdown = resources.timeTillReady(ResourceType.TechnicalFinish)
        const devilmentCountdown = resources.timeTillReady(ResourceType.Devilment)
        const espritCountdown = resources.timeTillReady(ResourceType.Esprit)
        const closedPositionApplied = resources.get(ResourceType.ClosedPosition).availableAmount() > 0;

        const silkenSymmetryCountdown = resources.timeTillReady(ResourceType.SilkenSymmetry);
        const silkenFlowCountdown = resources.timeTillReady(ResourceType.SilkenFlow);
        const flourishingSymmetryCountdown = resources.timeTillReady(ResourceType.FlourishingSymmetry);
        const flourishingFlowCountdown = resources.timeTillReady(ResourceType.FlourishingFlow);
        
        const threefoldCountdown = resources.timeTillReady(ResourceType.ThreefoldFanDance)
        const fourfoldCountdown = resources.timeTillReady(ResourceType.FourfoldFanDance)
        const finishingCountdown = resources.timeTillReady(ResourceType.FinishingMoveReady)
        const starfallCountdown = resources.timeTillReady(ResourceType.FlourishingStarfall)
        const tillanaCountdown = resources.timeTillReady(ResourceType.FlourishingFinish)
        const lastDanceCountdown = resources.timeTillReady(ResourceType.LastDanceReady)
        const danceOfDownCountdown = resources.timeTillReady(ResourceType.DanceOfTheDawnReady)
        
        const improvisationCountdown = resources.timeTillReady(ResourceType.Improvisation)
        const improvRegenCountdown = resources.timeTillReady(ResourceType.ImprovisationRegen)
        const improvFinishCountdown = resources.timeTillReady(ResourceType.ImprovisedFinish)
        const risingRhythmStacks = resources.get(ResourceType.RisingRhythm).availableAmount();
        const shieldSambaCooldown = resources.timeTillReady(ResourceType.ShieldSamba)

        return [
            {
                rscType: ResourceType.StandardStep,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: standardStepCountdown.toFixed(3),
                className: standardStepCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.StandardFinish,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: standardFinishCountdown.toFixed(3),
                className: standardFinishCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.Esprit,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: espritCountdown.toFixed(3),
                className: espritCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.TechnicalStep,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: technicalStepCountdown.toFixed(3),
                className: technicalStepCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.TechnicalFinish,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: technicalFinishCountdown.toFixed(3),
                className: technicalFinishCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.Devilment,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: devilmentCountdown.toFixed(3),
                className: devilmentCountdown > 0 ? "" : "hidden",
            },
            {
                rscType: ResourceType.ClosedPosition,
                onSelf: true,
                enabled: true,
                stacks: 1,
                className: closedPositionApplied ? "" : "hidden",
            },
            {
                rscType: ResourceType.SilkenSymmetry,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: silkenSymmetryCountdown.toFixed(3),
                className: silkenSymmetryCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.SilkenFlow,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: silkenFlowCountdown.toFixed(3),
                className: silkenFlowCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FlourishingSymmetry,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: flourishingSymmetryCountdown.toFixed(3),
                className: flourishingSymmetryCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FlourishingFlow,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: flourishingFlowCountdown.toFixed(3),
                className: flourishingFlowCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.ThreefoldFanDance,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: threefoldCountdown.toFixed(3),
                className: threefoldCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FourfoldFanDance,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: fourfoldCountdown.toFixed(3),
                className: fourfoldCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FinishingMoveReady,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: finishingCountdown.toFixed(3),
                className: finishingCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FlourishingStarfall,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: starfallCountdown.toFixed(3),
                className: starfallCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.FlourishingFinish,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: tillanaCountdown.toFixed(3),
                className: tillanaCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.LastDanceReady,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: lastDanceCountdown.toFixed(3),
                className: lastDanceCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.DanceOfTheDawnReady,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: danceOfDownCountdown.toFixed(3),
                className: danceOfDownCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.Improvisation,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: improvisationCountdown.toFixed(3),
                className: improvisationCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.ImprovisationRegen,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: improvRegenCountdown.toFixed(3),
                className: improvRegenCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.ImprovisedFinish,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: improvFinishCountdown.toFixed(3),
                className: improvFinishCountdown > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.RisingRhythm,
                onSelf: true,
                enabled: true,
                stacks: risingRhythmStacks,
                className: risingRhythmStacks > 0 ? "" : "hidden"
            },
            {
                rscType: ResourceType.ShieldSamba,
                onSelf: true,
                enabled: true,
                stacks: 1,
                timeRemaining: shieldSambaCooldown.toFixed(3),
                className: shieldSambaCooldown > 0 ? "" : "hidden"
            },
            ...super.getSelfBuffViewProps(),
        ]
    }

    override getJobResourceViewProps(): ResourceDisplayProps[] {
        const colors = getCurrentThemeColors();
        const resources = this.state.resources

        const esprit = resources.get(ResourceType.EspritGauge).availableAmount();
        const feathers = resources.get(ResourceType.FeatherGauge).availableAmount();
        const standardSteps = resources.get(ResourceType.StandardDance).availableAmount();
        const technicalSteps = resources.get(ResourceType.TechnicalDance).availableAmount();

        const infos: ResourceDisplayProps[] = []
        
        if (Traits.hasUnlocked(TraitName.Esprit, this.state.config.level)) {
            infos.push({
                kind: "bar",
                name: localize({
                    en: "Esprit",
                }),
                color: colors.dnc.esprit,
                progress: esprit / 100,
                valueString: esprit.toFixed(0),
            } as ResourceBarProps,)
        }
            
        infos.push({
            kind: "counter",
            name: localize({
                en: "Feathers",
            }),
            color: colors.dnc.feathers,
            currentStacks: feathers,
            maxStacks: 4,
        } as ResourceCounterProps,{
            kind: "dance",
            name: localize({
                en: "Standard",
            }),
            maxStacks: 2,
            currentStacks: standardSteps,
            emboiteColor: colors.dnc.emboite,
            entrechatColor: colors.dnc.entrechat,
            jeteColor: colors.dnc.jete,
            pirouetteColor: colors.dnc.pirouette,
        } as DanceCounterProps,
        {
            kind: "dance",
            name: localize({
                en: "Technical",
            }),
            maxStacks: 4,
            currentStacks: technicalSteps,
            emboiteColor: colors.dnc.emboite,
            entrechatColor: colors.dnc.entrechat,
            jeteColor: colors.dnc.jete,
            pirouetteColor: colors.dnc.pirouette,
        } as DanceCounterProps)
        
        return infos
    }

    override statusLayoutFn(props: StatusViewProps): React.ReactNode {
        return <div>
            <div style={{
                display: "inline-block",
                verticalAlign: "top",
                width: "50%",
                height: "100%"
            }}>
			<span style={{display: "block", marginBottom: 10}}>
				{localize({en: "time: ", zh: "战斗时间：", ja: "経過時間："})}
                {`${StaticFn.displayTime(props.time, 3)} (${props.time.toFixed(3)})`}
			</span>
                {props.resources ? <ResourcesDisplay data={{
                    level: props.level,
                    resources: props.resources
                }} style={{
                    height: "17em"
                }}/> : undefined}
            </div>
            <div style={{
                position: "relative",
                display: "inline-block",
                float: "right",
                width: "50%"
            }}>
                {props.resourceLocks ? <ResourceLocksDisplay data={props.resourceLocks}/> : undefined}
                <BuffsDisplay data={props.enemyBuffs} style={{
                    marginTop: 50,
                    marginBottom: "2em"
                }}/>
                <BuffsDisplay data={props.selfBuffs} style={{
                    position: "absolute",
                    right: 0,
                    width: "200%"
                }}/>
            </div>
        </div>
    }
}