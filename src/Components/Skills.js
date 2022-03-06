import React from 'react'
import {Clickable} from "./Common";
import {SkillName} from "../Game/Common";
import {controller} from "../Controller/Controller";

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

class SkillButton extends React.Component
{
	constructor(props) {
		super(props);
		this.skillName = props.skillName;
		this.state = {timesClicked: 0};
	}
	render()
	{
		let iconPath = skillIcons.get(this.skillName);
		let icon = <div className={"skillIcon"}><img src={iconPath} alt={this.skillName}/></div>;
		return <span className={"skillButton"}>
			<Clickable onClickFn={()=>{
				controller.requestUseSkill({skillName: this.skillName});
			}} content={icon}/>
		</span>
	}
}

class SkillsWindow extends React.Component
{
	render()
	{
		return <div className={"skillsWindow"}>
			<SkillButton skillName={SkillName.Blizzard} />
			<SkillButton skillName={SkillName.Fire} />
			<SkillButton skillName={SkillName.Transpose} />
			<SkillButton skillName={SkillName.Thunder3} />
			<SkillButton skillName={SkillName.Manaward} />
			<SkillButton skillName={SkillName.Manafont} />
			<SkillButton skillName={SkillName.Fire3} />
			<SkillButton skillName={SkillName.Blizzard3} />
			<SkillButton skillName={SkillName.Freeze} />
			<SkillButton skillName={SkillName.Flare} />
			<SkillButton skillName={SkillName.LeyLines} />
			<SkillButton skillName={SkillName.Sharpcast} />
			<SkillButton skillName={SkillName.Blizzard4} />
			<SkillButton skillName={SkillName.Fire4} />
			<SkillButton skillName={SkillName.BetweenTheLines} />
			<SkillButton skillName={SkillName.AetherialManipulation} />
			<SkillButton skillName={SkillName.Triplecast} />
			<SkillButton skillName={SkillName.Foul} />
			<SkillButton skillName={SkillName.Despair} />
			<SkillButton skillName={SkillName.UmbralSoul} />
			<SkillButton skillName={SkillName.Xenoglossy} />
			<SkillButton skillName={SkillName.HighFire2} />
			<SkillButton skillName={SkillName.HighBlizzard2} />
			<SkillButton skillName={SkillName.Amplifier} />
			<SkillButton skillName={SkillName.Paradox} />
			<SkillButton skillName={SkillName.Addle} />
			<SkillButton skillName={SkillName.Swiftcast} />
			<SkillButton skillName={SkillName.LucidDreaming} />
			<SkillButton skillName={SkillName.Surecast} />
			<SkillButton skillName={SkillName.Tincture} />
		</div>
	}
}

export const skillsWindow = <SkillsWindow />;
