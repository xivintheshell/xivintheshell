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

// name, color, value, progress, width
function ResourceBar(props = {
	name: "placeholder",
	color: "#6cf",
	value: "0.34/1.00",
	progress: 0.34,
	width: 100
}) {
	return <div className={"resource"}>
		 <div className={"resource-name"}>{props.name}</div>
		 <ProgressBar backgroundColor={props.color}
					  progress={props.progress}
					  width={props.width}
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
		<div className={"resource-value"}>{props.currentStacks + "/" + props.maxStacks}</div>
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
buffIcons.set(ResourceType.Addle, require("./Asset/buff_addle.png"));
buffIcons.set(ResourceType.Swiftcast, require("./Asset/buff_swiftcast.png"));
buffIcons.set(ResourceType.LucidDreaming, require("./Asset/buff_lucidDreaming.png"));
buffIcons.set(ResourceType.Surecast, require("./Asset/buff_surecast.png"));
buffIcons.set(ResourceType.Tincture, require("./Asset/buff_tincture.png"));

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
		buffs.push({rscType: ResourceType.LeyLines, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Sharpcast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Triplecast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Firestarter, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Thundercloud, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Manaward, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Swiftcast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.LucidDreaming, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Surecast, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Tincture, stacks:1, timeRemaining:14.234});

		for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
		return <div className={"buffsDisplay self"}>
			{buffs.map(obj=>{return <Buff {...obj}/>;})}
		</div>
	}
}

class EnemyBuffsDisplay extends React.Component
{
	render() {
		let buffs = [];
		buffs.push({rscType: ResourceType.ThunderDoT, stacks:1, timeRemaining:14.234});
		buffs.push({rscType: ResourceType.Addle, stacks:1, timeRemaining:14.234});

		for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
		return <div className={"buffsDisplay enemy"}>
			{buffs.map(obj=>{return <Buff {...obj}/>;})}
		</div>
	}
}

class ResourceLocksDisplay extends React.Component
{
	render() {
		let anim = <ResourceBar name={"using skill"} color={"#cbcbcb"} progress={0.7} value={"mana"} width={100}/>;
		let tax = <ResourceBar name={"casting/taxed"} color={"#cbcbcb"} progress={0.7} value={"mana"} width={100}/>;
		return <div className={"resourceLocksDisplay"}>
			{anim}
			{tax}
			{anim}
		</div>
	}
}

class ResourcesDisplay extends React.Component
{
	render() {
		let manaBar = <ResourceBar name={"MP"} color={"#6cf"} progress={0.7} value={"mana"} width={100}/>;
		let afui = <ResourceCounter name={"AF/UI"} color={"#de2222"} currentStacks={2} maxStacks={3}/>;
		let uh = <ResourceCounter name={"Hearts"} color={"#66c6de"} currentStacks={2} maxStacks={3}/>;
		let paradox = <ResourceCounter name={"Paradox"} color={"#d953ee"} currentStacks={1} maxStacks={1}/>;
		let enochian = <ResourceBar name={"Enochian"} color={"#f5cf96"} progress={0.9} value={"3.24/15"} width={100}/>;
		let polyTimer = <ResourceBar name={"poly timer"} color={"#d5bbf1"} progress={0.7} value={"24/30"} width={100}/>;
		let poly = <ResourceCounter name={"poly stacks"} color={"#b138ee"} currentStacks={1} maxStacks={2}/>;
		return <div className={"resourceDisplay"}>
			{manaBar}
			{enochian}
			{afui}
			{uh}
			{paradox}
			{polyTimer}
			{poly}
		</div>;
	}
}

class StatusDisplay extends React.Component
{
	render() {
		//let [currentMana, maxMana] = controller.getResourceStatus(ResourceType.Mana);
		return <div className={"statusDisplay"}>
			<div className={"-left"}>
				<ResourcesDisplay/>
			</div>
			<div className={"-right"}>
				<ResourceLocksDisplay/>
				<EnemyBuffsDisplay/>
				<BuffsDisplay/>
			</div>
		</div>
	}
}

export const statusDisplay = <StatusDisplay/>;