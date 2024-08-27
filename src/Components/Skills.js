import React from 'react'
import {Clickable, Help, parseTime} from "./Common";
import {Debug, LevelSync, SkillName, SkillReadyStatus} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {Tooltip as ReactTooltip} from 'react-tooltip';
import {ActionType} from "../Controller/Record";
import {localize, localizeSkillName} from "./Localization";
import {updateTimelineView} from "./Timeline";
import * as ReactDOMServer from 'react-dom/server';
import {getCurrentThemeColors} from "./ColorTheme";
import { TraitName } from '../Game/Traits';

// seems useful: https://na.finalfantasyxiv.com/lodestone/special/fankit/icon/
export const skillIcons = new Map();

const blmSkills = [
	SkillName.Blizzard,
	SkillName.Fire,
	SkillName.Blizzard2,
	SkillName.Fire2,
	SkillName.Transpose,
	SkillName.Thunder3,
	SkillName.HighThunder,
	SkillName.Manaward,
	SkillName.Manafont,
	SkillName.Fire3,
	SkillName.Blizzard3,
	SkillName.Freeze,
	SkillName.AetherialManipulation,
	SkillName.Flare,
	SkillName.LeyLines,
	SkillName.Blizzard4,
	SkillName.Fire4,
	SkillName.BetweenTheLines,
	SkillName.Triplecast,
	SkillName.Foul,
	SkillName.Despair,
	SkillName.UmbralSoul,
	SkillName.Xenoglossy,
	SkillName.HighFire2,
	SkillName.HighBlizzard2,
	SkillName.Amplifier,
	SkillName.Paradox,
	SkillName.FlareStar,
	SkillName.Retrace,
];

const casterRoleSkills = [
	SkillName.Addle,
	SkillName.Swiftcast,
	SkillName.LucidDreaming,
	SkillName.Surecast,
	SkillName.Tincture,
];

blmSkills.forEach(
	(skill) => skillIcons.set(skill, require(`./Asset/Skills/BLM/${skill}.png`))
);

casterRoleSkills.forEach(
	(skill) => skillIcons.set(skill, require(`./Asset/Skills/CasterRole/${skill}.png`))
);

skillIcons.set(SkillName.Sprint, require("./Asset/Skills/General/Sprint.png"));

export const skillIconImages = new Map();
skillIcons.forEach((path, skillName)=>{
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function() {
		updateTimelineView();
	}
	skillIconImages.set(skillName, imgObj);
});

// eslint-disable-next-line no-unused-vars
let setSkillInfoText = (text)=>{}; // text: skill info tooltip content
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

class SkillButton extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			skillDescription: <div/>
		};
		this.handleMouseEnter = (()=>{
			let info = controller.getSkillInfo({
				game: controller.getDisplayedGame(),
				skillName: this.props.skillName
			});
			let colors = getCurrentThemeColors();
			let s = "";
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
		let iconStyle = {
			width: 48,
			height: 48,
			verticalAlign: "top",
			position: "relative",
			display: "inline-block"
		};
		let iconImgStyle = {
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
		let icon = <div onMouseEnter={this.handleMouseEnter}>
			<div className={"skillIcon"} style={iconStyle}>
				<img style={iconImgStyle} src={iconPath} alt={this.props.skillName}/>
				<div style={{ // skill icon border
					position: "absolute",
					width: 48,
					height: 48,
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
		</div>;
		let progressCircle = <ProgressCircle
			className="cdProgress"
			diameter={40}
			progress={this.props.cdProgress}
			color={this.props.ready ? "rgba(255, 255, 255, 0.7)" : "rgba(255,255,255,0.7)"}/>;
		return <span
			title={this.skillName}
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

const WaitSince = {
	Now: "Now",
	LastSkill: "LastSkill"
};

export var updateSkillButtons = (statusList, paradoxReady, retraceReady)=>{}
export class SkillsWindow extends React.Component {
	constructor(props) {
		super(props);
		updateSkillButtons = ((statusList, paradoxReady, retraceReady)=>{
			this.setState({
				statusList: statusList,
				paradoxInfo: controller.getSkillInfo({game: controller.game, skillName: SkillName.Paradox}),
				paradoxReady: paradoxReady,
				retraceInfo: controller.getSkillInfo({game: controller.game, skillName: SkillName.Retrace}),
				retraceReady: retraceReady,
			});
		});

		setSkillInfoText = ((text)=>{
			this.setState({tooltipContent: text});
		});

		this.onWaitTimeChange = ((e)=>{
			if (!e || !e.target) return;
			this.setState({waitTime: e.target.value});
		});

		this.onWaitTimeSubmit = ((e)=>{
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
		});

		this.onWaitUntilChange = (e=>{
			if (!e || !e.target) return;
			this.setState({waitUntil: e.target.value});
		});

		this.onWaitUntilSubmit = (e=>{
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
		});

		this.onWaitSinceChange = (e=>{
			this.setState({waitSince: e.target.value});
		});

		this.onRemoveTrailingIdleTime = (()=>{
			controller.removeTrailingIdleTime();
		});

		this.onWaitTillNextMpOrLucidTick = (()=>{
			controller.waitTillNextMpOrLucidTick();
		});

		this.state = {
			statusList: undefined,
			paradoxInfo: undefined,
			tooltipContent: "",
			waitTime: "1",
			waitSince: WaitSince.Now,
			waitUntil: "0:00"
		}
	}
	componentDidMount() {
		this.setState({
			statusList: controller.game.displayedSkills.map(sn=>{
				return controller.getSkillInfo({game: controller.getDisplayedGame(), skillName: sn});
			}),
			paradoxInfo: controller.getSkillInfo({game: controller.getDisplayedGame(), skillName: SkillName.Paradox}),
			retraceInfo: controller.getSkillInfo({game: controller.getDisplayedGame(), skillName: SkillName.Retrace}),
		});
	}

	render() {
		let skillButtons = [];
		let displayedSkills = controller.game.displayedSkills;
		for (let i = 0; i < displayedSkills.length; i++) {
			let skillName = displayedSkills[i];
			let info = this.state.statusList ? this.state.statusList[i] : undefined;

			if (controller.game.hasUnlockedTrait(TraitName.AspectMasteryV)) {
				let isF1B1 = displayedSkills[i] === SkillName.Fire || displayedSkills[i] === SkillName.Blizzard;
				skillName = (isF1B1 && this.state.paradoxReady) ? SkillName.Paradox : displayedSkills[i];
				if (this.state.paradoxInfo) 
					info = (isF1B1 && this.state.paradoxReady) ? this.state.paradoxInfo : info;
			}

			if (controller.game.hasUnlockedTrait(TraitName.EnhancedLeyLines)) {
				let isLL = (displayedSkills[i] === SkillName.LeyLines);
				skillName = (isLL && this.state.retraceReady) ? SkillName.Retrace : skillName;
				if (this.state.retraceInfo)
					info = (isLL && this.state.retraceReady) ? this.state.retraceInfo : info;
			}

			if (controller.game.hasUnlockedTrait(TraitName.AspectMasteryIV)) {
				if (displayedSkills[i] === SkillName.Fire2)
					skillName = SkillName.HighFire2;
				else if (displayedSkills[i] === SkillName.Blizzard2)
					skillName = SkillName.HighBlizzard2;
			}

			if (controller.game.hasUnlockedTrait(TraitName.ThunderMasteryIII)) {
				if (displayedSkills[i] === SkillName.Thunder3)
					skillName = SkillName.HighThunder;
			}

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
