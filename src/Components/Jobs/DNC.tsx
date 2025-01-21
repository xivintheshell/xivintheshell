import { DNCState } from "../../Game/Jobs/DNC";
import { getCurrentThemeColors } from "../ColorTheme";
import { localize } from "../Localization";
import {
	BuffProps,
	BuffsDisplay,
	DanceCounterProps,
	registerBuffIcon,
	ResourceBarProps,
	ResourceCounterProps,
	ResourceDisplayProps,
	ResourceLocksDisplay,
	ResourcesDisplay,
	StatusPropsGenerator,
	StatusViewProps,
} from "../StatusDisplay";
import React from "react";
import { StaticFn } from "../Common";
import { RESOURCES } from "../../Game/Data";
import { DNC_STATUSES, DNCResourceKey } from "../../Game/Data/Jobs/DNC";

(Object.keys(DNC_STATUSES) as DNCResourceKey[])
	.filter((key) => !(key === "ESPRIT_PARTNER" || key === "STANDARD_FINISH_PARTNER"))
	.forEach((buff) => registerBuffIcon(buff, `DNC/${RESOURCES[buff].name}.png`));
// Special case shared icons
registerBuffIcon("ESPRIT_PARTNER", "DNC/Esprit.png");
registerBuffIcon("STANDARD_FINISH_PARTNER", "DNC/Standard Finish.png");

const PARTNER_BUFFS: DNCResourceKey[] = [
	"ESPRIT_TECHNICAL",
	"ESPRIT_PARTNER",
	"STANDARD_FINISH_PARTNER",
	"DANCE_PARTNER",
];

export class DNCStatusPropsGenerator extends StatusPropsGenerator<DNCState> {
	// DNC doesn't put any debuffs on the enemy... but we can use this space for showing our dance partner!
	override jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return PARTNER_BUFFS.map((key) => {
			if (key === "DANCE_PARTNER") {
				return this.makeCommonTimerless(key, false);
			}
			return this.makeCommonTimer(key, false);
		});
	}

	override jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [
			...(Object.keys(DNC_STATUSES) as DNCResourceKey[])
				.filter((key) => !PARTNER_BUFFS.includes(key))
				.map((key) => {
					if (key === "CLOSED_POSITION" || key === "RISING_RHYTHM") {
						return this.makeCommonTimerless(key);
					}
					return this.makeCommonTimer(key);
				}),
		];
	}

	override jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		const colors = getCurrentThemeColors();
		const resources = this.state.resources;

		const feathers = resources.get("FEATHER_GAUGE").availableAmount();
		const standardSteps = resources.get("STANDARD_DANCE").availableAmount();
		const technicalSteps = resources.get("TECHNICAL_DANCE").availableAmount();

		const infos: ResourceDisplayProps[] = [];

		if (this.state.hasTraitUnlocked("ESPRIT")) {
			const esprit = resources.get("ESPRIT_GAUGE").availableAmount();
			infos.push({
				kind: "bar",
				name: localize({
					en: "Esprit",
				}),
				color: colors.dnc.esprit,
				progress: esprit / 100,
				valueString: esprit.toFixed(0),
			} as ResourceBarProps);
		}

		infos.push(
			{
				kind: "counter",
				name: localize({
					en: "Feathers",
				}),
				color: colors.dnc.feathers,
				currentStacks: feathers,
				maxStacks: 4,
			} as ResourceCounterProps,
			{
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
			} as DanceCounterProps,
		);

		return infos;
	}

	override statusLayoutFn(props: StatusViewProps): React.ReactNode {
		return <div>
			<div
				style={{
					display: "inline-block",
					verticalAlign: "top",
					width: "50%",
					height: "100%",
				}}
			>
				<span style={{ display: "block", marginBottom: 10 }}>
					{localize({ en: "time: ", zh: "战斗时间：", ja: "経過時間：" })}
					{`${StaticFn.displayTime(props.time, 3)} (${props.time.toFixed(3)})`}
				</span>
				{props.resources ? (
					<ResourcesDisplay
						data={{
							level: props.level,
							resources: props.resources,
						}}
						style={{
							height: "17em",
						}}
					/>
				) : undefined}
			</div>
			<div
				style={{
					position: "relative",
					display: "inline-block",
					float: "right",
					width: "50%",
				}}
			>
				{props.resourceLocks ? (
					<ResourceLocksDisplay data={props.resourceLocks} />
				) : undefined}
				<BuffsDisplay
					data={props.enemyBuffs}
					style={{
						marginTop: 50,
						marginBottom: "2em",
					}}
				/>
				<BuffsDisplay
					data={props.selfBuffs}
					style={{
						position: "absolute",
						right: 0,
						width: "200%",
					}}
				/>
			</div>
		</div>;
	}
}
