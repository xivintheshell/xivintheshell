import React from 'react';
import {ProgressBar} from "./Common";
import {controller} from '../Controller/Controller'
import {ResourceType} from "../Game/Common";

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

function ResourceLocksDisplay(props)
{
	let anim = <ResourceBar name={"using skill"} color={"#cbcbcb"} progress={0.7} value={"mana"} width={100}/>;
	let tax = <ResourceBar name={"casting/taxed"} color={"#cbcbcb"} progress={0.7} value={"mana"} width={100}/>;
	return <div className={"resourceLocksDisplay"}>
		{tax}
		{anim}
	</div>
}

function ResourcesDisplay(props) {
	let data = (props && props.data) ? props.data : {
		mana: 10000,
		enochianCountdown: 0,
		astralFire: 0,
		umbralIce: 0,
		umbralHearts: 0,
		paradox: 0,
		polyglotCountdown: 30,
		polyglotStacks: 0
	}
	console.log("rendering ResourcesDisplay with data ")
	console.log(data);
	let manaBar = <ResourceBar
		name={"MP"}
		color={"#8aceea"}
		progress={data.mana / 10000}
		value={Math.floor(data.mana) + "/10000"}
		width={100}/>;
	let enochian = <ResourceBar
		name={"enochian"}
		color={"#f5cf96"}
		progress={data.enochianCountdown / 15}
		value={`${data.enochianCountdown.toFixed(2)}`}
		width={100}/>;
	let afui = <ResourceCounter
		name={"AF/UI"}
		color={data.astralFire > 0 ? "#f63" : "#6bf"}
		currentStacks={data.astralFire > 0 ? data.astralFire : data.umbralIce}
		maxStacks={3}/>;
	let uh = <ResourceCounter
		name={"hearts"}
		color={"#95dae3"}
		currentStacks={data.umbralHearts}
		maxStacks={3}/>;
	let paradox = <ResourceCounter
		name={"paradox"}
		color={"#d953ee"}
		currentStacks={data.paradox}
		maxStacks={1}/>;
	let polyTimer = <ResourceBar
		name={"poly timer"}
		color={"#d5bbf1"}
		progress={1 - data.polyglotCountdown / 30}
		value={`${data.polyglotCountdown.toFixed(2)}`}
		width={100}/>;
	let poly = <ResourceCounter
		name={"poly stacks"}
		color={"#b138ee"}
		currentStacks={data.polyglotStacks}
		maxStacks={2}/>;
	return <div className={"resourceDisplay"}>
		{manaBar}
		{afui}
		{uh}
		{paradox}
		{enochian}
		{polyTimer}
		{poly}
	</div>;
}

export let updateStatusDisplay = (data)=>{};
class StatusDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			resources: null,
			resourceLocks: null,
			selfBuffs: null,
			enemyBuffs: null
		}
		updateStatusDisplay = this.unboundUpdateStatus.bind(this);
	}
	unboundUpdateStatus(newData){
		console.log("status display new data");
		console.log(newData);
		this.setState({
			resources: newData.resources,
			resourceLocks: newData.resourceLocks,
			selfBuffs: newData.selfBuffs,
			enemyBuffs: newData.enemyBuffs
		});
	}
	render() {
		return <div className={"statusDisplay"}>
			<div className={"-left"}>
				<ResourcesDisplay data={this.state.resources}/>
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