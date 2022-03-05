import React from 'react';
import {ProgressBar} from "./Common";
import {controller} from '../Controller/Controller'
import {ResourceType, SkillName} from "../Game/Common";

// color, value
function ResourceStack(props) {
	const elemProps = {
		style: {
			backgroundColor: `${props.color}`
		}
	}
	return <div className={"resourceStack"}>
		 <div hidden={!props.value} className={"resourceStackInner"} {...elemProps}/>
	</div>;
}

// name, color, value, progress
function ResourceBar(props) {
	return <div className={"resource"}>
		 <div className={"resource-name"}>{props.name}</div>
		 <ProgressBar backgroundColor={props.color}
					  progress={props.progress}
					  width={150}
					  offsetY={3}/>
		 <div className={"resource-value"}>{props.value}</div>
	</div>;
}

// name, color, currentStacks, maxStacks
function ResourceCounter(props) {
	let stacks = [];
	for (let i = 0; i < props.maxStacks; i++) {
		stacks.push(<ResourceStack key={i} color={props.color} value={i < props.currentStacks}/>)
	}
	return <div className={"resource"}>
		<div className={"resource-name"}>{props.name}</div>
		{stacks}
		<div className={"resource-value"}>{props.currentStacks + " / " + props.maxStacks}</div>
	</div>;
}
const buffIcons = new Map();
buffIcons.set(ResourceType.Triplecast, require("./Asset/buff_triplecast.png"));
buffIcons.set(ResourceType.Sharpcast, require("./Asset/buff_sharpcast.png"));
buffIcons.set(ResourceType.Firestarter, require("./Asset/buff_firestarter.png"));
buffIcons.set(ResourceType.Thundercloud, require("./Asset/buff_thundercloud.png"));
buffIcons.set(ResourceType.ThunderDoT, require("./Asset/buff_thunder3.png"));
buffIcons.set(ResourceType.LeyLines, require("./Asset/buff_leyLines.png"));
buffIcons.set(ResourceType.Manaward, require("./Asset/buff_manaward.png"));

// rscType, stacks, timeRemaining
function Buff(props) {
	return <div className={"buff " + props.rscType}>
		<img src={buffIcons.get(props.rscType)} alt={props.rscType}/>
		<span className={"buff-label"}>{props.timeRemaining.toFixed(2)}</span>
	</div>
}

class BuffsDisplay extends React.Component
{
	render() {
		let buffs = [];
		buffs.push({rscType: ResourceType.ThunderDoT, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.LeyLines, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Sharpcast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Triplecast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Firestarter, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Thundercloud, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Manaward, stacks:1, timeRemaining:14.234});

		for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
		return <div className={"buffsDisplay"}>
			{buffs.map(obj=>{return <Buff {...obj}/>;})}
		</div>
	}
}

class ResourcesDisplay extends React.Component
{
	render() {
		let manaBar = <ResourceBar name={"MP"} color={"#6cf"} progress={0.7} value={"mana"}/>;
		let afui = <ResourceCounter name={"AF / UI"} color={"#de2222"} currentStacks={2} maxStacks={3}/>;
		let uh = <ResourceCounter name={"Hearts"} color={"#66c6de"} currentStacks={2} maxStacks={3}/>;
		let paradox = <ResourceCounter name={"Paradox"} color={"#d953ee"} currentStacks={1} maxStacks={1}/>;
		let enochian = <ResourceBar name={"Enochian"} color={"#f5cf96"} progress={0.9} value={"24 / 30"}/>;
		let poly = <ResourceCounter name={"Polyglot"} color={"#b138ee"} currentStacks={1} maxStacks={2}/>;
		return <div className={"resourceDisplay"}>
			{manaBar}
			{afui}
			{uh}
			{paradox}
			{enochian}
			{poly}
		</div>;
	}
}

class StatusDisplay extends React.Component
{
	render() {
		let [currentMana, maxMana] = controller.getResourceStatus(ResourceType.Mana);
		return <div className={"statusDisplay"}>
			<ResourcesDisplay/>
			<BuffsDisplay/>
		</div>
	}
}

export const statusDisplay = <StatusDisplay/>;