import React from 'react'
import {Clickable} from "./Common";
import {SkillName} from "../Game/Common";
import {controller} from "../Controller/Controller";

export let displayedSkills = [
	SkillName.Blizzard,
	SkillName.Fire,
	SkillName.Transpose,
	SkillName.Thunder3,
	SkillName.Manaward,
	SkillName.Manafont,
	SkillName.Fire3,
	SkillName.Blizzard3,
	SkillName.Freeze,
	SkillName.Flare,
	SkillName.LeyLines,
	SkillName.Sharpcast,
	SkillName.Blizzard4,
	SkillName.Fire4,
	SkillName.BetweenTheLines,
	SkillName.AetherialManipulation,
	SkillName.Triplecast,
	SkillName.Foul,
	SkillName.Despair,
	SkillName.UmbralSoul,
	SkillName.Xenoglossy,
	SkillName.HighFire2,
	SkillName.HighBlizzard2,
	SkillName.Amplifier,
	SkillName.Paradox,
	SkillName.Addle,
	SkillName.Swiftcast,
	SkillName.LucidDreaming,
	SkillName.Surecast,
	SkillName.Tincture
];

const skillIcons = new Map();
skillIcons.set(SkillName.Blizzard, require("./Asset/blizzard.png"));
skillIcons.set(SkillName.Fire, require("./Asset/fire.png"));
skillIcons.set(SkillName.Transpose, require("./Asset/transpose.png"));
skillIcons.set(SkillName.Thunder3, require("./Asset/thunder3.png"));
skillIcons.set(SkillName.Manaward, require("./Asset/manaward.png"));
skillIcons.set(SkillName.Manafont, require("./Asset/manafont.png"));
skillIcons.set(SkillName.Fire3, require("./Asset/fire3.png"));
skillIcons.set(SkillName.Blizzard3, require("./Asset/blizzard3.png"));
skillIcons.set(SkillName.Freeze, require("./Asset/freeze.png"));
skillIcons.set(SkillName.AetherialManipulation, require("./Asset/aetherialManipulation.png"));
skillIcons.set(SkillName.Flare, require("./Asset/flare.png"));
skillIcons.set(SkillName.LeyLines, require("./Asset/leyLines.png"));
skillIcons.set(SkillName.Sharpcast, require("./Asset/sharpcast.png"));
skillIcons.set(SkillName.Blizzard4, require("./Asset/blizzard4.png"));
skillIcons.set(SkillName.Fire4, require("./Asset/fire4.png"));
skillIcons.set(SkillName.BetweenTheLines, require("./Asset/betweenTheLines.png"));
skillIcons.set(SkillName.Triplecast, require("./Asset/triplecast.png"));
skillIcons.set(SkillName.Foul, require("./Asset/foul.png"));
skillIcons.set(SkillName.Despair, require("./Asset/despair.png"));
skillIcons.set(SkillName.UmbralSoul, require("./Asset/umbralSoul.png"));
skillIcons.set(SkillName.Xenoglossy, require("./Asset/xenoglossy.png"));
skillIcons.set(SkillName.HighFire2, require("./Asset/highFire2.png"));
skillIcons.set(SkillName.HighBlizzard2, require("./Asset/highBlizzard2.png"));
skillIcons.set(SkillName.Amplifier, require("./Asset/amplifier.png"));
skillIcons.set(SkillName.Paradox, require("./Asset/paradox.png"));
skillIcons.set(SkillName.Addle, require("./Asset/addle.png"));
skillIcons.set(SkillName.Swiftcast, require("./Asset/swiftcast.png"));
skillIcons.set(SkillName.LucidDreaming, require("./Asset/lucidDreaming.png"));
skillIcons.set(SkillName.Surecast, require("./Asset/surecast.png"));
skillIcons.set(SkillName.Tincture, require("./Asset/tincture.png"));

let setSkillInfoText = (text)=>{};
class SkillInfoText extends React.Component {
	constructor(props) {
		super(props);
		setSkillInfoText = this.setContent.bind(this);
		this.state = {
			content: "n/a"
		}
	}
	setContent(newContent) {
		this.setState({content: newContent});
	}
	render() { return <div className={"skillInfoText"}>
		{this.state.content}
	</div> }
}

class SkillButton extends React.Component {
	constructor(props) {
		super(props);
		this.boundHandleMouseEnter = this.handleMouseEnter.bind(this);
	}
	handleMouseEnter(evt) {
		let info = controller.getSkillInfo({skillName: this.props.skillName});

		let s = this.props.skillName + ": ";
		if (info.ready) s += "ready";
		else if (info.timeTillAvailable <= 0) {
			s += " skill requirement(s) not satisfied";
		} else {
			s += "possibly ready in " + info.timeTillAvailable.toFixed(2) + " (CD ready in " + info.cdReadyCountdown.toFixed(2) + ")";
		}
		setSkillInfoText(s);
	}
	render() {
		let iconPath = skillIcons.get(this.props.skillName);
		let icon = <div onMouseEnter={this.boundHandleMouseEnter} className={"skillIcon" + (this.props.ready ? "" : " notReady")}><img src={iconPath} alt={this.props.skillName}/></div>;
		return <span title={this.skillName} className={"skillButton"}>
			<Clickable onClickFn={()=>{
				controller.requestUseSkill({skillName: this.props.skillName});
			}} content={icon}/>
		</span>
	}
}

export let updateSkillButtons = (statusList)=>{ console.log("umm") }
class SkillsWindow extends React.Component {
	constructor(props) {
		super(props);
		updateSkillButtons = this.unboundUpdateFn.bind(this);
		//controller.updateSkillButtons();
		this.state = {
			statusList: displayedSkills.map(sn=>{
				return controller.getSkillInfo({skillName: sn});
			}),
		}
	}
	unboundUpdateFn(statusList) {
		this.setState({statusList: statusList});
	}
	render() {

		let skillButtons = [];
		for (let i = 0; i < displayedSkills.length; i++) {
			let btn = <SkillButton
				key={i}
				skillName={displayedSkills[i]}
				ready={this.state.statusList[i].ready}
				/>
			skillButtons.push(btn);
		}

		return <div className={"skillsWindow"}>
			<SkillInfoText/>
			<div className={"skillIcons"}>
				{skillButtons}
			</div>
		</div>
	}
}

export const skillsWindow = <SkillsWindow />;
