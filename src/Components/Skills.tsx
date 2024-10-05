import React, {FormEvent, FormEventHandler} from 'react'
import {Clickable, ContentNode, Help, parseTime, ValueChangeEvent} from "./Common";
import {Debug, SkillName, SkillReadyStatus} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {ShellInfo} from "../Controller/Common";
import {Tooltip as ReactTooltip} from 'react-tooltip';
import {ActionType} from "../Controller/Record";
import {localize, localizeSkillName} from "./Localization";
import {updateTimelineView} from "./Timeline";
import * as ReactDOMServer from 'react-dom/server';
import {getCurrentThemeColors} from "./ColorTheme";
import {getAllSkills} from "../Game/Skills";

// Imports of Game/Jobs/* must come after Game/Skills is initialized.
import "../Game/Jobs/BLM";
import "../Game/Jobs/PCT";
import "../Game/Jobs/RoleActions";

// seems useful: https://na.finalfantasyxiv.com/lodestone/special/fankit/icon/
export const skillIcons = new Map();

// Only import necessary skills
// TODO: change this if we serve multiple jobs off the same site
getAllSkills(ShellInfo.job)!.forEach(
	(skillInfo) => skillIcons.set(skillInfo.name, require(`./Asset/Skills/${skillInfo.assetPath}`)),
);

export const skillIconImages = new Map();
skillIcons.forEach((path, skillName)=>{
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function() {
		updateTimelineView();
	}
	skillIconImages.set(skillName, imgObj);
});

function ProgressCircle(props={
	className: "",
	diameter: 50,
	progress: 0.7,
	color: "rgba(255,255,255,0.5)",
}) {
	let elemRadius = props.diameter / 2.0;
	let outRadius = props.diameter * 0.35;
	let outCircumference = 2 * Math.PI * outRadius;
	let outFillLength = outCircumference * props.progress;
	let outGapLength = outCircumference - outFillLength;
	let outDasharray = outFillLength + "," + outGapLength;
	let outlineCircle = <circle
		r={outRadius}
		cx={elemRadius}
		cy={elemRadius}
		fill="none"
		stroke={props.color}
		strokeWidth="6"
		strokeDasharray={outDasharray}
		strokeDashoffset={outCircumference / 4}/>

	return <svg className={props.className} width={props.diameter} height={props.diameter}>
		{outlineCircle}
	</svg>
}

type SkillButtonProps = {
	highlight: boolean,
	skillName: SkillName,
	ready: boolean,
	cdProgress: number
};

class SkillButton extends React.Component {
	props: SkillButtonProps;
	state: {
		skillDescription: React.ReactElement;
	};
	handleMouseEnter: () => void;

	constructor(props: SkillButtonProps) {
		super(props);
		this.props = props;
		this.state = {
			skillDescription: <div/>
		};
		this.handleMouseEnter = (()=>{
			let info = controller.getSkillInfo({
				game: controller.getDisplayedGame(),
				skillName: this.props.skillName
			});
			let colors = getCurrentThemeColors();
			let s: ContentNode = "";
			if (info.status === SkillReadyStatus.Ready) {
				let en = "ready (" + info.stacksAvailable;
				let zh = "可释放 (" + info.stacksAvailable;
				if (info.timeTillNextStackReady > 0) {
					en += ") (next stack ready in " + info.timeTillNextStackReady.toFixed(3);
					zh += ") (下一层" + info.timeTillNextStackReady.toFixed(3) + "秒后转好";
				}
				en += ")";
				zh += ")";
				s = localize({en: en, zh: zh});
			}
			else if (info.status === SkillReadyStatus.RequirementsNotMet) {
				s += localize({en: " skill requirement(s) not satisfied", zh: " 未满足释放条件"});
			} else if (info.status === SkillReadyStatus.NotEnoughMP) {
				s += localize({
					en: " not enough MP (needs " + info.capturedManaCost + ")",
					zh: " MP不足（需" + info.capturedManaCost + "）"
				});
			} else if (info.status === SkillReadyStatus.Blocked) {
				s += localize({
					en: "possibly ready in " + info.timeTillAvailable.toFixed(3) + " (next stack ready in " + info.timeTillNextStackReady.toFixed(3) + ")",
					zh: "预计" + info.timeTillAvailable.toFixed(3) + "秒后可释放（" + info.timeTillNextStackReady.toFixed(3) + "秒后转好下一层CD）"
				});
			} else if (info.status === SkillReadyStatus.NotInCombat) {
				s += localize({
					en: "not in combat (wait for first damage application)",
				});
			}
			// if ready, also show captured cast time & time till damage application
			let actualCastTime = info.instantCast ? 0 : info.castTime;
			let infoString = "";
			if (info.status === SkillReadyStatus.Ready) {
				infoString += localize({en: "cast: ", zh: "读条："}) + actualCastTime.toFixed(3);
				if (info.llCovered && actualCastTime > Debug.epsilon) infoString += " (LL)";
				infoString += localize({en: ", cast+delay: ", zh: " 读条+生效延迟："}) + info.timeTillDamageApplication.toFixed(3);
			}
			let content = <div style={{color: controller.displayingUpToDateGameState ? colors.text : colors.historical}}>
				<div className="paragraph"><b>{localizeSkillName(this.props.skillName)}</b></div>
				<div className="paragraph">{s}</div>
				<div className="paragraph">{infoString}</div>
			</div>;
			this.setState({skillDescription: content});
		});
	}
	render() {
		let iconPath = skillIcons.get(this.props.skillName);
		let iconStyle: React.CSSProperties = {
			width: 48,
			height: 48,
			verticalAlign: "top",
			position: "relative",
			display: "inline-block"
		};
		let iconImgStyle: React.CSSProperties = {
			width: 40,
			height: 40,
			position: "absolute",
			top: 2,
			left: "50%",
			marginLeft: -20,
		};
		let readyOverlay = "transparent";
		if (!this.props.ready) {
			readyOverlay = "rgba(0, 0, 0, 0.6)";
		} else if (this.props.cdProgress <= 1 - Debug.epsilon) {
			readyOverlay = "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 85%, rgba(0,0,0,0.6) 100%)"
		}
		// The numbers used to indicate remaining stacks are an in-game font, and not an icon
		// available in xivapi. We instead just pick a large sans serif font, and render the number
		// in white w/ red border if there's at least 1 stack, and red w/ black border at 0 stacks.
		const info = controller.getSkillInfo({
			game: controller.getDisplayedGame(),
			skillName: this.props.skillName
		});
		const readyStacks = info.stacksAvailable;
		const maxStacks = info.maxStacks;
		let stacksOverlay;
		const skillBoxPx = 48;
		const fontSizePx = skillBoxPx/3 + 4;

		let textShadow: string;
		let fontColor: string;
		if (readyStacks > 0) {
			// expensive but whatever if it ever becomes a performance problem I'll just turn the icons into a canvas
			// the red/orange border
			textShadow = "0 0 2px rgba(255, 50, 0, 1), 0 0 3px rgba(255, 100, 0, 1), 0 0 5px rgba(255, 100, 0, 1)";
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
			stacksOverlay =	<div tabIndex={-1} style={{
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
				zIndex: 2,
				position: "absolute",
			}}>
				{readyStacks}
			</div>;
		} else {
			stacksOverlay = <></>;
		}
		let icon = <div onMouseEnter={this.handleMouseEnter}>
			<div className={"skillIcon"} style={iconStyle}>
				<img style={iconImgStyle} src={iconPath} alt={this.props.skillName}/>
				<div style={{ // skill icon border
					position: "absolute",
					width: skillBoxPx,
					height: skillBoxPx,
					background: "url('https://miyehn.me/ffxiv-blm-rotation/misc/skillIcon_overlay.png') no-repeat"
				}}></div>
				<div style={{ // grey out
					position: "absolute",
					width: 40,
					height: 41,
					top: 1,
					left: "50%",
					marginLeft: -20,
					borderRadius: 3,
					zIndex: 1,
					background: readyOverlay
				}}></div>
			</div>
			<img
				hidden={!this.props.highlight} src="https://miyehn.me/ffxiv-blm-rotation/misc/proc.png" alt="skill proc" style={{
				position: "absolute",
				width: 44,
				height: 44,
				top: 0,
				left: 2,
				zIndex: 1
			}}/>
			{stacksOverlay}
		</div>;
		let progressCircle = <ProgressCircle
			className="cdProgress"
			diameter={40}
			progress={this.props.cdProgress}
			color={this.props.ready ? "rgba(255, 255, 255, 0.7)" : "rgba(255,255,255,0.7)"}/>;
		return <span
			title={this.props.skillName}
			className={"skillButton"}
			data-tooltip-offset={3}
			data-tooltip-html={
				ReactDOMServer.renderToStaticMarkup(this.state.skillDescription)
			} data-tooltip-id={"skillButton-" + this.props.skillName}>
			<Clickable onClickFn={controller.displayingUpToDateGameState ? () => {
				controller.requestUseSkill({skillName: this.props.skillName});
				controller.updateAllDisplay();
			} : undefined} content={icon}
					   style={controller.displayingUpToDateGameState ? {} : {cursor: "not-allowed"}}/>
			{this.props.cdProgress > 1 - Debug.epsilon ? undefined : progressCircle}
		</span>
	}
}

enum WaitSince {
	Now = "Now",
	LastSkill = "LastSkill"
}

export type SkillButtonViewInfo = {
	skillName: SkillName,
	status: SkillReadyStatus,
	stacksAvailable: number,
	maxStacks: number,
	castTime: number,
	instantCast: boolean,
	cdRecastTime: number,
	timeTillNextStackReady: number,
	timeTillAvailable: number,
	timeTillDamageApplication: number,
	capturedManaCost: number,
	highlight: boolean,
	llCovered: boolean
};

export let updateSkillButtons = (statusList: SkillButtonViewInfo[])=>{}
export class SkillsWindow extends React.Component {
	state: {
		statusList: SkillButtonViewInfo[],
		waitTime: string,
		waitSince: WaitSince,
		waitUntil: string,
	};

	onWaitTimeChange: (e: ValueChangeEvent) => void;
	onWaitTimeSubmit: FormEventHandler<HTMLFormElement>;
	onWaitUntilChange: (e: ValueChangeEvent) => void;
	onWaitUntilSubmit: FormEventHandler<HTMLFormElement>;
	onWaitSinceChange: (e: ValueChangeEvent) => void;
	onRemoveTrailingIdleTime: () => void;
	onWaitTillNextMpOrLucidTick: () => void;

	constructor(props: {}) {
		super(props);
		updateSkillButtons = ((statusList) => {
			this.setState({
				statusList: statusList,
			});
		});

		this.onWaitTimeChange = (e: ValueChangeEvent) => {
			if (!e || !e.target) return;
			this.setState({waitTime: e.target.value});
		};

		this.onWaitTimeSubmit = (e: FormEvent<HTMLFormElement>) => {
			let waitTime = parseFloat(this.state.waitTime);
			if (!isNaN(waitTime)) {
				if (this.state.waitSince === WaitSince.Now) {
					controller.step(waitTime);
				} else if (this.state.waitSince === WaitSince.LastSkill) {
					let timeSinceLastSkill = 0;
					let lastAction = controller.record.getLastAction(node=>{
						return node.type === ActionType.Wait || node.type === ActionType.Skill;
					});
					if (lastAction) {
						timeSinceLastSkill = lastAction.waitDuration;
					}
					let stepTime = waitTime - timeSinceLastSkill;
					if (stepTime <= 0) {
						window.alert("Invalid input: trying to jump to " + waitTime +
							"s since the last action, but " + timeSinceLastSkill +
							"s has already elapsed.");
					} else {
						controller.step(stepTime);
					}
				} else {
					console.assert(false);
				}
				controller.autoSave();
			}
			e.preventDefault();
		};

		this.onWaitUntilChange = (e: ValueChangeEvent) => {
			if (!e || !e.target) return;
			this.setState({waitUntil: e.target.value});
		};

		this.onWaitUntilSubmit = (e: FormEvent<HTMLFormElement>) => {
			let targetTime = parseTime(this.state.waitUntil);
			if (!isNaN(targetTime)) {
				let currentTime = controller.game.getDisplayTime();
				if (targetTime > currentTime) {
					let elapse = targetTime - currentTime;
					controller.step(elapse);
					controller.autoSave();
				} else {
					window.alert("Can only jump to a time in the future!");
				}
			}
			e.preventDefault();
		};

		this.onWaitSinceChange = (e: ValueChangeEvent) => {
			this.setState({waitSince: e.target.value});
		};

		this.onRemoveTrailingIdleTime = (() => {
			controller.removeTrailingIdleTime();
		});

		this.onWaitTillNextMpOrLucidTick = (() => {
			controller.waitTillNextMpOrLucidTick();
		});

		this.state = {
			statusList: [],
			waitTime: "1",
			waitSince: WaitSince.Now,
			waitUntil: "0:00",
		}
	}

	render() {
		let skillButtons = [];
		for (let i = 0; i < this.state.statusList.length; i++) {
			let skillName = this.state.statusList[i].skillName;
			let info = this.state.statusList[i];

			let btn = <SkillButton
				key={i}
				highlight={info ? info.highlight : false}
				skillName={skillName}
				ready={info ? info.status===SkillReadyStatus.Ready : false}
				cdProgress={info ? 1 - info.timeTillNextStackReady / info.cdRecastTime : 1}
				/>
			skillButtons.push(btn);
		}

		let waitUntilHelp = <Help topic="waitUntilInputFormat" content={<div>
			<div className="paragraph">{localize({en: "Examples:", zh: "时间格式举例："})}</div>
			<div className="paragraph">
				12 <br/>
				1.5 <br/>
				10:04.2 <br/>
				-0:03
			</div>
		</div>}/>;

		let textInputStyle = {
			display: "inline-block",
			flex: "auto",
			//marginRight: 10,
			//border: "1px solid red",
		};

		let colors = getCurrentThemeColors();
		let textInputFieldStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid " + colors.text,
			borderRadius: 0,
			background: "transparent",
			color: colors.text
		};
		return <div className={"skillsWindow"}>
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
					.info-tooltip-arrow { display: none; }
				`}</style>
				{skillButtons}
				<ReactTooltip anchorSelect={".skillButton"} className={"info-tooltip"} classNameArrow={"info-tooltip-arrow"} />
				<div style={{ margin: "10px 0" }}>
				<div style={{ display: "flex", flexDirection: "row", marginBottom: 6 }}>
					{localize({
					en:
						<form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
						Wait until <input type={"text"} style={{
							...{ width: 40 }, ...textInputFieldStyle
						}} value={this.state.waitTime} onChange={this.onWaitTimeChange} /> second(s) since <select
							style={{ display: "inline-block", outline: "none" }}
							value={this.state.waitSince}
							onChange={this.onWaitSinceChange}>
							<option value={WaitSince.Now}>now</option>
							<option value={WaitSince.LastSkill}>last action</option>
						</select> <input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>,
					zh:
						<form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
						快进至 <select
							style={{ display: "inline-block", outline: "none" }}
							value={this.state.waitSince}
							onChange={this.onWaitSinceChange}>
							<option value={WaitSince.Now}>当前</option>
							<option value={WaitSince.LastSkill}>上次操作</option>
						</select> 后的 <input type={"text"} style={{
							...{ width: 30 }, ...textInputFieldStyle
						}} value={this.state.waitTime} onChange={this.onWaitTimeChange} /> 秒 <input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>,
					ja:
						<form onSubmit={this.onWaitTimeSubmit} style={textInputStyle}>
						<select
							style={{ display: "inline-block", outline: "none", marginRight: "4px" }}
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
							...{ width: 30 }, ...textInputFieldStyle
							}}
							value={this.state.waitTime}
							onChange={this.onWaitTimeChange}
						/>
						秒進む
						<input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>,
					})}
					{localize({
					en:
						<form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
						Wait until {waitUntilHelp} <input type={"text"} style={{
							...{ width: 60 }, ...textInputFieldStyle
						}} value={this.state.waitUntil} onChange={this.onWaitUntilChange} /> 
						<input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>,
					zh:
						<form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
						快进至指定时间 {waitUntilHelp} <input type={"text"} style={{
							...{ width: 60 }, ...textInputFieldStyle
						}} value={this.state.waitUntil} onChange={this.onWaitUntilChange} /> 
						<input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>,
					ja:
						<form onSubmit={this.onWaitUntilSubmit} style={textInputStyle}>
						指定した時間まで進む {waitUntilHelp} <input type={"text"} style={{
							...{ width: 60 }, ...textInputFieldStyle
						}} value={this.state.waitUntil} onChange={this.onWaitUntilChange} /> 
						<input type="submit" disabled={!controller.displayingUpToDateGameState} value="GO" />
						</form>
					})}

				</div>
		  		<button onClick={this.onWaitTillNextMpOrLucidTick}>{localize({ en: "Wait until Manafont / MP tick / lucid tick", zh: "快进至魔泉生效/跳蓝/跳醒梦" })}</button><span> </span>
		  		<button onClick={this.onRemoveTrailingIdleTime}>{localize({ en: "Remove trailing idle time", zh: "去除时间轴末尾的发呆时间" })}</button>
				</div>
	  		</div>
		</div>
	}
}
