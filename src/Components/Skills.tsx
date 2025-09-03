import React, { useContext, useState, FormEvent, FormEventHandler } from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { Clickable, ContentNode, Help, parseTime, ValueChangeEvent } from "./Common";
import { Debug, SkillReadyStatus, SkillUnavailableReason } from "../Game/Common";
import { controller } from "../Controller/Controller";
import { MAX_ABILITY_TARGETS } from "../Controller/Common";
import { localize, localizeSkillName, localizeSkillUnavailableReason } from "./Localization";
import { updateTimelineView } from "./Timeline";
import { updateInvalidStatus } from "./TimelineEditor";
import { getThemeColors, ColorThemeContext } from "./ColorTheme";
import { getSkillAssetPath } from "../Game/Skills";
import { ActionKey, ACTIONS } from "../Game/Data";

const skillIconImages = new Map();

const MISSING_PATH = "assets/Skills/General/Missing.png";

export const getSkillIconImage = (skillName: ActionKey | string) => {
	if (skillIconImages.has(skillName)) {
		return skillIconImages.get(skillName);
	}
	const assetIcon = `assets/Skills/${getSkillAssetPath(skillName)}`;
	if (assetIcon) {
		const imgObj = new Image();
		imgObj.src = assetIcon;
		imgObj.onerror = (e) => {
			imgObj.src = MISSING_PATH;
			console.error("failed to load skill image: " + assetIcon);
			// de-register the handler to prevent infinite loops
			imgObj.onerror = null;
		};
		imgObj.onload = () => updateTimelineView();
		skillIconImages.set(skillName, imgObj);
		return imgObj;
	}
	return undefined;
};

export function SkillIconImage(props: { style: React.CSSProperties; skillName: ActionKey }) {
	// getSkillIconImage produces an image for timeline rendering, and thus shouldn't make a react component.
	// In all other cases, we probably want an actual react component.
	// These are also not memoized.
	const assetIcon = `assets/Skills/${getSkillAssetPath(props.skillName)}`;
	const [didError, setDidError] = useState(false);
	return <img
		style={props.style}
		src={didError ? MISSING_PATH : assetIcon}
		onError={(e) => setDidError(true)}
		alt={props.skillName}
	/>;
}

function ProgressCircleDark(
	props = {
		diameter: 50,
		progress: 0.7,
		color: "rgba(0, 0, 0, 0.6)",
	},
) {
	const elemRadius = props.diameter / 2.0;
	const outCircumference = Math.PI * elemRadius;
	const outFillLength = outCircumference * (1 - props.progress);
	const outGapLength = outCircumference - outFillLength;
	const outDasharray = outFillLength + "," + outGapLength;
	const innerCircle = <circle
		r={elemRadius / 2}
		cx={20}
		cy={21}
		fill="none"
		stroke={props.color}
		strokeWidth={elemRadius}
		strokeDasharray={outDasharray}
		strokeDashoffset={outCircumference / 4 + outFillLength}
	/>;

	const outerStroke = elemRadius; // something large enough to make sure it covers the very corner
	const outerCircle = <circle
		r={elemRadius + outerStroke / 2}
		cx={20}
		cy={21}
		fill="none"
		stroke={props.color}
		strokeWidth={outerStroke}
	/>;

	return <svg
		width={48}
		height={48}
		style={{
			position: "absolute",
			left: "50%",
			marginLeft: -20,
			pointerEvents: "none",
		}}
	>
		{innerCircle}
		{outerCircle}
	</svg>;
}

function SecondaryProgressCircle(
	props = {
		diameter: 50,
		progress: 0.7,
		color: "rgba(0, 0, 0, 0.5)",
	},
) {
	const circleRadius = props.diameter / 2;
	const circumfrence = 2 * Math.PI * circleRadius;
	const circleFillLength = circumfrence * props.progress;
	const circleGapLength = circumfrence - circleFillLength;
	const dashArray = circleFillLength + "," + circleGapLength;
	const circle = <circle
		r={circleRadius}
		cx={20}
		cy={21}
		fill="none"
		stroke={props.color}
		strokeWidth={2}
		strokeDashoffset={circumfrence / 4}
		strokeDasharray={dashArray}
	/>;

	return <svg
		width={48}
		height={48}
		style={{
			position: "absolute",
			left: "50%",
			marginLeft: -20,
			pointerEvents: "none",
		}}
	>
		{circle}
	</svg>;
}

function ProgressCircleOutline(
	props = {
		diameter: 50,
		progress: 0.7,
		color: "rgba(0, 0, 0, 0.5)",
	},
) {
	const elemRadius = props.diameter / 2.0;
	const outCircumference = Math.PI * elemRadius * 2;
	const outFillLength = outCircumference * props.progress;
	const outGapLength = outCircumference - outFillLength;
	const outDasharray = outFillLength + "," + outGapLength;
	const theta = 2 * Math.PI * props.progress;
	const cdOutlineColor = "#ffffffef";
	const outlineCircle = <circle
		r={elemRadius}
		cx={20}
		cy={21}
		fill="none"
		stroke={cdOutlineColor}
		strokeWidth={1}
		strokeDasharray={outDasharray}
		strokeDashoffset={outCircumference / 4}
	/>;

	const verticalLine = <line
		x1={20}
		y1={21}
		x2={20}
		y2={21 - elemRadius}
		stroke={cdOutlineColor}
		strokeWidth={1}
	/>;

	const cdLine = <line
		x1={20}
		y1={21}
		x2={20 + elemRadius * Math.cos(theta - Math.PI / 2)}
		y2={21 + elemRadius * Math.sin(theta - Math.PI / 2)}
		stroke={cdOutlineColor}
		strokeWidth={1}
	/>;

	return <svg
		width={48}
		height={48}
		style={{
			position: "absolute",
			left: "50%",
			marginLeft: -20,
			pointerEvents: "none",
		}}
	>
		{outlineCircle}
		{verticalLine}
		{cdLine}
	</svg>;
}

type SkillButtonProps = {
	highlight: boolean;
	skillName: ActionKey;
	ready: boolean;
	readyAsideFromCd: boolean;
	cdProgress: number;
	secondaryCdProgress?: number;
	targetCount: number;
};

function SkillButton(props: SkillButtonProps) {
	const [skillDescription, setSkillDescription] = useState(<div />);
	const colorContext = useContext(ColorThemeContext);
	const handleMouseEnter = () => {
		const info = controller.getSkillInfo({
			game: controller.getDisplayedGame(),
			skillName: props.skillName,
		});
		const colors = getThemeColors(colorContext);
		const s: ContentNode[] = [];
		if (info.status.ready()) {
			let en = "ready (" + info.stacksAvailable;
			let zh = "可释放 (" + info.stacksAvailable;
			if (info.timeTillNextStackReady > 0) {
				en += ") (next stack ready in " + info.timeTillNextStackReady.toFixed(3);
				zh += ") (下一层" + info.timeTillNextStackReady.toFixed(3) + "秒后转好";
			}
			en += ")";
			zh += ")";
			s.push(localize({ en: en, zh: zh }));
		} else {
			if (
				info.status.unavailableReasons.includes(SkillUnavailableReason.RequirementsNotMet)
			) {
				s.push(localizeSkillUnavailableReason(SkillUnavailableReason.RequirementsNotMet));
			}
			if (info.status.unavailableReasons.includes(SkillUnavailableReason.NotEnoughMP)) {
				s.push(
					localizeSkillUnavailableReason(SkillUnavailableReason.NotEnoughMP) +
						localize({
							en: " (needs " + info.capturedManaCost + ")",
							zh: " （需" + info.capturedManaCost + "）",
						}),
				);
			}
			if (info.status.unavailableReasons.includes(SkillUnavailableReason.Blocked)) {
				const nextStackReadyIn = Math.max(
					info.timeTillNextStackReady,
					info.timeTillSecondaryReady ?? 0,
				);
				const s1 = localize({
					en: "possibly ready in " + info.timeTillAvailable.toFixed(3),
					zh: "预计" + info.timeTillAvailable.toFixed(3) + "秒后可释放",
				});
				const s2 = localize({
					en: " (next stack ready in " + nextStackReadyIn.toFixed(3) + ")",
					zh: "（" + nextStackReadyIn.toFixed(3) + "秒后转好下一层CD）",
				});
				s.push(
					<>
						{s1}
						{info.stacksAvailable < info.maxStacks ? s2 : undefined}
					</>,
				);
			}
			if (info.status.unavailableReasons.includes(SkillUnavailableReason.NotInCombat)) {
				s.push(localizeSkillUnavailableReason(SkillUnavailableReason.NotInCombat));
			}
		}
		// if ready, also show captured cast time & time till damage application
		const actualCastTime = info.instantCast ? 0 : info.castTime;
		let infoString = "";
		if (info.status.ready()) {
			infoString += localize({ en: "cast: ", zh: "读条：" }) + actualCastTime.toFixed(3);
			if (info.llCovered && actualCastTime > Debug.epsilon) infoString += " (LL)";
			infoString +=
				localize({ en: ", cast+delay: ", zh: " 读条+生效延迟：" }) +
				info.timeTillDamageApplication.toFixed(3);
		}
		const content = <div
			style={{
				color: controller.displayingUpToDateGameState ? colors.text : colors.historical,
			}}
		>
			<div className="paragraph">
				<b>{localizeSkillName(props.skillName)}</b>
			</div>
			<div className="paragraph">
				{s.map((line, i) => <span key={i}>
					{line}
					<br />
				</span>)}
			</div>
			<div className="paragraph">{infoString}</div>
		</div>;
		setSkillDescription(content);
	};
	const iconStyle: React.CSSProperties = {
		width: 48,
		height: 48,
		verticalAlign: "top",
		position: "relative",
		display: "inline-block",
	};
	const iconImgStyle: React.CSSProperties = {
		width: 40,
		height: 40,
		position: "absolute",
		top: 2,
		left: "50%",
		marginLeft: -20,
	};
	let readyOverlay = "transparent";
	if (!props.readyAsideFromCd) {
		readyOverlay = "rgba(0, 0, 0, 0.6)";
	}

	// The numbers used to indicate remaining stacks are an in-game font, and not an icon
	// available in xivapi. We instead just pick a large sans serif font, and render the number
	// in white w/ red border if there's at least 1 stack, and red w/ black border at 0 stacks.
	const info = controller.getSkillInfo({
		game: controller.getDisplayedGame(),
		skillName: props.skillName,
	});
	const readyStacks = info.stacksAvailable;
	const maxStacks = info.maxStacks;
	let stacksOverlay;
	const skillBoxPx = 48;
	const fontSizePx = skillBoxPx / 3 + 4;

	let textShadow: string;
	let fontColor: string;
	if (readyStacks > 0) {
		// expensive but whatever if it ever becomes a performance problem I'll just turn the icons into a canvas
		// the red/orange border
		textShadow =
			"0 0 2px rgba(255, 50, 0, 1), 0 0 3px rgba(255, 100, 0, 1), 0 0 5px rgba(255, 100, 0, 1)";
		// darken background
		const darkenLayers = readyStacks === maxStacks ? 5 : 3;
		for (let i = 0; i < darkenLayers; i++) {
			textShadow += `, 0 0 10px black`;
		}
		fontColor = "white";
	} else {
		textShadow = "0 0 4px black, 0 0 8px black";
		fontColor = "rgb(223,60,60)";
	}

	if (maxStacks > 1) {
		stacksOverlay = <div
			tabIndex={-1}
			style={{
				fontFamily: "Goldman Regular",
				color: fontColor,
				// should take up a little over 1/3 of the icon
				fontSize: `${fontSizePx}px`,
				textShadow: textShadow,
				// center in this square
				width: fontSizePx,
				textAlign: "center",
				// offset to account for stretch transformation + font size
				bottom: 2,
				right: 1,
				zIndex: 3,
				position: "absolute",
			}}
		>
			{readyStacks}
		</div>;
	} else {
		stacksOverlay = <></>;
	}
	const progressShadeCircle = <ProgressCircleDark
		diameter={38}
		progress={props.cdProgress}
		color={props.ready ? "rgba(0, 0, 0, 0)" : "rgba(0, 0, 0, 0.6)"}
	/>;
	const progressOutline = <ProgressCircleOutline
		diameter={38}
		progress={props.cdProgress}
		color={props.ready ? "rgba(0, 0, 0, 0)" : "rgba(255, 255, 255, 1.0)"}
	/>;
	const secondaryOutline = props.secondaryCdProgress && <SecondaryProgressCircle
		diameter={32}
		progress={props.secondaryCdProgress}
		color={"rgba(250,186,47,255)"}
	/>;
	const proc = <img
		hidden={!props.highlight}
		src="/misc/proc.png"
		alt="skill proc"
		style={{
			position: "absolute",
			width: 44,
			height: 44,
			top: 0,
			left: 2,
			zIndex: 2,
		}}
	/>;
	const icon = <div onMouseEnter={handleMouseEnter}>
		<div style={iconStyle}>
			{" "}
			{/* "overlay" layers */}
			<SkillIconImage style={iconImgStyle} skillName={props.skillName} />
			<div
				style={{
					position: "absolute",
					width: 40,
					height: 41,
					top: 1,
					left: "50%",
					marginLeft: -20,
					borderRadius: 3,
					overflow: "hidden",
					zIndex: 1,
					background: readyOverlay,
				}}
			>
				{props.cdProgress > 1 - Debug.epsilon ||
					!props.readyAsideFromCd ||
					progressShadeCircle}
				{props.cdProgress > 1 - Debug.epsilon || progressOutline}
				{!props.secondaryCdProgress ||
					props.secondaryCdProgress > 1 - Debug.epsilon ||
					secondaryOutline}
			</div>
			<div
				style={{
					// skill icon overlay
					position: "absolute",
					width: skillBoxPx,
					height: skillBoxPx,
					background: "url('/misc/skillIcon_overlay.png') no-repeat",
				}}
			/>
		</div>
		{proc}
		{stacksOverlay}
	</div>;
	const tooltipTrigger = <span title={ACTIONS[props.skillName].name} className="skillButton">
		<Clickable
			onClickFn={
				controller.displayingUpToDateGameState
					? () => {
							controller.requestUseSkill({
								skillName: props.skillName,
								targetCount: props.targetCount,
							});
							controller.updateAllDisplay();
						}
					: undefined
			}
			content={icon}
			style={controller.displayingUpToDateGameState ? {} : { cursor: "not-allowed" }}
		/>
	</span>;
	return <Tooltip.Root delay={0} hoverable={false}>
		<Tooltip.Trigger render={tooltipTrigger} />
		<Tooltip.Portal container={document.getElementById("skillsWindowAnchor")}>
			<Tooltip.Positioner sideOffset={3} side="top" className="tooltip-positioner">
				<Tooltip.Popup className="info-tooltip tooltip">{skillDescription}</Tooltip.Popup>
			</Tooltip.Positioner>
		</Tooltip.Portal>
	</Tooltip.Root>;
}

enum WaitSince {
	Now = "Now",
	LastSkill = "LastSkill",
}

export type SkillButtonViewInfo = {
	skillName: ActionKey;
	status: SkillReadyStatus;
	stacksAvailable: number;
	maxStacks: number;
	castTime: number;
	instantCast: boolean;
	cdRecastTime: number;
	secondaryCdRecastTime?: number;
	timeTillNextStackReady: number;
	timeTillSecondaryReady?: number;
	timeTillAvailable: number;
	timeTillDamageApplication: number;
	capturedManaCost: number;
	highlight: boolean;
	llCovered: boolean;
	usedAt: number;
};

export let updateSkillButtons = (statusList: SkillButtonViewInfo[]) => {};
export class SkillsWindow extends React.Component {
	state: {
		statusList: SkillButtonViewInfo[];
		waitTime: string;
		waitSince: WaitSince;
		waitUntil: string;
		targetCount: number;
	};

	onWaitTimeChange: (e: ValueChangeEvent) => void;
	onWaitTimeSubmit: FormEventHandler<HTMLFormElement>;
	onWaitUntilChange: (e: ValueChangeEvent) => void;
	onWaitUntilSubmit: FormEventHandler<HTMLFormElement>;
	onWaitSinceChange: (e: ValueChangeEvent) => void;
	onTargetCountChange: (e: ValueChangeEvent) => void;
	onRemoveTrailingIdleTime: () => void;
	onWaitTillNextMpOrLucidTick: () => void;

	static contextType = ColorThemeContext;

	constructor(props: {}) {
		super(props);
		updateSkillButtons = (statusList) => {
			this.setState({
				statusList: statusList,
			});
		};

		this.onWaitTimeChange = (e: ValueChangeEvent) => {
			if (!e || !e.target) return;
			this.setState({ waitTime: e.target.value });
		};

		this.onWaitTimeSubmit = (e: FormEvent<HTMLFormElement>) => {
			const waitTime = parseFloat(this.state.waitTime);
			if (!isNaN(waitTime)) {
				if (this.state.waitSince === WaitSince.Now) {
					controller.step(waitTime);
				} else if (this.state.waitSince === WaitSince.LastSkill) {
					const timeSinceLastSkill = controller.game.time - controller.lastSkillTime;
					const stepTime = waitTime - timeSinceLastSkill;
					if (stepTime <= 0) {
						window.alert(
							"Invalid input: trying to jump to " +
								waitTime +
								"s since the last action, but " +
								timeSinceLastSkill +
								"s has already elapsed.",
						);
					} else {
						controller.step(stepTime);
					}
				} else {
					console.assert(false);
				}
				controller.autoSave();
				updateInvalidStatus();
			}
			e.preventDefault();
		};

		this.onWaitUntilChange = (e: ValueChangeEvent) => {
			if (!e || !e.target) return;
			this.setState({ waitUntil: e.target.value });
		};

		this.onWaitUntilSubmit = (e: FormEvent<HTMLFormElement>) => {
			const targetTime = parseTime(this.state.waitUntil);
			if (!isNaN(targetTime)) {
				if (targetTime > controller.game.getDisplayTime()) {
					controller.stepUntil(targetTime);
					controller.autoSave();
					updateInvalidStatus();
				} else {
					window.alert("Can only jump to a time in the future!");
				}
			}
			e.preventDefault();
		};

		this.onWaitSinceChange = (e: ValueChangeEvent) => {
			this.setState({ waitSince: e.target.value });
		};

		this.onTargetCountChange = (e: ValueChangeEvent) => {
			this.setState({ targetCount: parseInt(e.target.value) });
		};

		this.onRemoveTrailingIdleTime = () => {
			controller.removeTrailingIdleTime();
		};

		this.onWaitTillNextMpOrLucidTick = () => {
			controller.waitTillNextMpOrLucidTick();
		};

		this.state = {
			statusList: [],
			waitTime: "1",
			waitSince: WaitSince.Now,
			waitUntil: "0:00",
			targetCount: 1,
		};
	}

	render() {
		const skillButtons = [];
		for (let i = 0; i < this.state.statusList.length; i++) {
			const skillName = this.state.statusList[i].skillName;
			const info = this.state.statusList[i];

			const readyAsideFromCd = info
				? !info.status.unavailableReasons.some(
						(reason) => reason !== SkillUnavailableReason.Blocked,
					)
				: false;
			const btn = <SkillButton
				key={i}
				highlight={info ? info.highlight : false}
				skillName={skillName}
				ready={info ? info.status.ready() : false}
				readyAsideFromCd={readyAsideFromCd}
				cdProgress={info ? 1 - info.timeTillNextStackReady / info.cdRecastTime : 1}
				secondaryCdProgress={
					info
						? info.secondaryCdRecastTime && info.timeTillSecondaryReady
							? 1 - info.timeTillSecondaryReady / info.secondaryCdRecastTime
							: 1
						: 1
				}
				targetCount={this.state.targetCount}
			/>;
			skillButtons.push(btn);
		}

		const waitUntilHelp = <Help
			topic="waitUntilInputFormat"
			content={
				<div>
					<div className="paragraph">
						{localize({ en: "Examples:", zh: "时间格式举例：" })}
					</div>
					<div className="paragraph">
						12 <br />
						1.5 <br />
						10:04.2 <br />
						-0:03
					</div>
				</div>
			}
		/>;

		const textInputStyle = {
			display: "inline-block",
			flex: "auto",
			//marginRight: 10,
			//border: "1px solid red",
		};

		// @ts-expect-error we need to read untyped this.context in place of a context hook
		const colors = getThemeColors(this.context);
		const textInputFieldStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid " + colors.text,
			borderRadius: 0,
			background: "transparent",
			color: colors.text,
		};

		const targetCountHelp = <Help
			topic="targetCount"
			content={localize({
				en: <>
					<span>
						The number of targets hit by the next ability. Damage fall-off is
						automatically computed. If the number of targets set is more than the number
						of enemies the ability can hit, then the additional targets are ignored.
					</span>
					<br />
					<br />
					<span>
						Buff calculations for enemy debuffs like Dokumori and Chain Stratagem may be
						inaccurate when multiple targets are selected.
					</span>
				</>,
				zh: <div>
					<span>
						{"下一个技能击中的目标数。会自动计算对主目标之外敌人的伤害衰减。" +
							"如果在此设置的敌人数量超过技能的生效敌人数上限（例：给对单技能设置2或更多目标数），多余的目标会被忽略。"}
					</span>
					<br />
					<br />
					<span>
						注：介毒之术、连环计等作用于目标的团辅可能会使多目标技能威力计算出现误差。
					</span>
				</div>,
			})}
		/>;
		return <div className={"skillsWindow"} id={"skillsWindowAnchor"}>
			<div className={"skillIcons"}>
				<style>{`
					.info-tooltip {
						color: ${colors.text};
						background-color: ${colors.tipBackground};
						opacity: 0.98;
						max-width: 300px;
						outline: 1px solid ${colors.bgHighContrast};
						transition: none;
						font-size: 100%;
						z-index: 10;
					}
				`}</style>
				{skillButtons}
				<div style={{ margin: "10px 0" }}>
					{localize({
						en: "# of targets hit",
						zh: "击中目标数",
						// we don't want to change MAX_ABILITY_TARGETS to match each ability's properties
						// to allow easy input of scenarios where a user swaps between single and multi-target
						// abilities
					})}{" "}
					{targetCountHelp}:{" "}
					<input
						type={"number"}
						min={1}
						max={MAX_ABILITY_TARGETS}
						style={{
							width: 30,
							...textInputFieldStyle,
						}}
						value={this.state.targetCount}
						onChange={this.onTargetCountChange}
					/>
					<div style={{ display: "flex", flexDirection: "row", marginBottom: 6 }}>
						{localize({
							en: <form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
								Wait until{" "}
								<input
									type={"text"}
									style={{
										...{ width: 40 },
										...textInputFieldStyle,
									}}
									value={this.state.waitTime}
									onChange={this.onWaitTimeChange}
								/>{" "}
								second(s) since{" "}
								<select
									style={{ display: "inline-block", outline: "none" }}
									value={this.state.waitSince}
									onChange={this.onWaitSinceChange}
								>
									<option value={WaitSince.Now}>now</option>
									<option value={WaitSince.LastSkill}>last action</option>
								</select>{" "}
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
							zh: <form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
								快进至{" "}
								<select
									style={{ display: "inline-block", outline: "none" }}
									value={this.state.waitSince}
									onChange={this.onWaitSinceChange}
								>
									<option value={WaitSince.Now}>当前</option>
									<option value={WaitSince.LastSkill}>上次操作</option>
								</select>{" "}
								后的{" "}
								<input
									type={"text"}
									style={{
										...{ width: 30 },
										...textInputFieldStyle,
									}}
									value={this.state.waitTime}
									onChange={this.onWaitTimeChange}
								/>{" "}
								秒{" "}
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
							ja: <form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
								<select
									style={{
										display: "inline-block",
										outline: "none",
										marginRight: "4px",
									}}
									value={this.state.waitSince}
									onChange={this.onWaitSinceChange}
								>
									<option value={WaitSince.Now}>現在のカーソルの位置</option>
									<option value={WaitSince.LastSkill}>最後のアクション</option>
								</select>
								から
								<input
									type={"text"}
									style={{
										...{ width: 30 },
										...textInputFieldStyle,
									}}
									value={this.state.waitTime}
									onChange={this.onWaitTimeChange}
								/>
								秒進む
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
						})}
						{localize({
							en: <form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
								Wait until {waitUntilHelp}{" "}
								<input
									type={"text"}
									style={{
										...{ width: 60 },
										...textInputFieldStyle,
									}}
									value={this.state.waitUntil}
									onChange={this.onWaitUntilChange}
								/>
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
							zh: <form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
								快进至指定时间 {waitUntilHelp}{" "}
								<input
									type={"text"}
									style={{
										...{ width: 60 },
										...textInputFieldStyle,
									}}
									value={this.state.waitUntil}
									onChange={this.onWaitUntilChange}
								/>
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
							ja: <form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
								指定した時間まで進む {waitUntilHelp}{" "}
								<input
									type={"text"}
									style={{
										...{ width: 60 },
										...textInputFieldStyle,
									}}
									value={this.state.waitUntil}
									onChange={this.onWaitUntilChange}
								/>
								<input
									type="submit"
									disabled={!controller.displayingUpToDateGameState}
									value="GO"
								/>
							</form>,
						})}
					</div>
					<button onClick={this.onWaitTillNextMpOrLucidTick}>
						{localize({
							en: "Wait until MP tick / lucid tick",
							zh: "快进至跳蓝/跳醒梦",
						})}
					</button>
					<span> </span>
					<button onClick={this.onRemoveTrailingIdleTime}>
						{localize({
							en: "Remove trailing idle time",
							zh: "去除时间轴末尾的发呆时间",
						})}
					</button>
				</div>
			</div>
		</div>;
	}
}
