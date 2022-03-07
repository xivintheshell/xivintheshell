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

// name, color, value, progress, width, className
function ResourceBar(props = {
	name: "placeholder",
	color: "#6cf",
	value: "0.34/1.00",
	progress: 0.34,
	width: 100,
	className: ""
}) {
	return <div className={"resource " + props.className}>
		 <div className={"resource-name"}>{props.name}</div>
		 <ProgressBar backgroundColor={props.color}
					  progress={props.progress}
					  width={props.width}
					  offsetY={4}/>
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
buffIcons.set(ResourceType.ThunderDoTTick, require("./Asset/buff_thunder3.png"));
buffIcons.set(ResourceType.LeyLines, require("./Asset/buff_leyLines.png"));
buffIcons.set(ResourceType.Manaward, require("./Asset/buff_manaward.png"));
buffIcons.set(ResourceType.Addle, require("./Asset/buff_addle.png"));
buffIcons.set(ResourceType.Swiftcast, require("./Asset/buff_swiftcast.png"));
buffIcons.set(ResourceType.LucidDreaming, require("./Asset/buff_lucidDreaming.png"));
buffIcons.set(ResourceType.Surecast, require("./Asset/buff_surecast.png"));
buffIcons.set(ResourceType.Tincture, require("./Asset/buff_tincture.png"));

// rscType, stacks, timeRemaining
function Buff(props) {
	return <div title={props.rscType} className={props.className + " buff " + props.rscType}>
		<img src={buffIcons.get(props.rscType)} alt={props.rscType}/>
		<span className={"buff-label"}>{props.timeRemaining}</span>
	</div>
}

function BuffsDisplay(props) {
	let data = (props && props.data) ? props.data : {
		leyLinesCountdown: 0,
		sharpcastCountdown: 0,
		triplecastCountdown: 0,
		firestarterCountdown: 0,
		thundercloudCountdown: 0,
		manawardCountdown: 0,
		swiftcastCountdown: 0,
		lucidDreamingCountdown: 0,
		surecastCountdown: 0,
		tinctureCountdown: 0
	};
	let buffs = [];
	buffs.push({
		rscType: ResourceType.LeyLines,
		stacks:1,
		timeRemaining: data.leyLinesCountdown.toFixed(2),
		className: data.leyLinesCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sharpcast,
		stacks:1,
		timeRemaining: data.sharpcastCountdown.toFixed(2),
		className: data.sharpcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Triplecast,
		stacks:1,
		timeRemaining: data.triplecastCountdown.toFixed(2),
		className: data.triplecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Firestarter,
		stacks:1,
		timeRemaining: data.firestarterCountdown.toFixed(2),
		className: data.firestarterCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Thundercloud,
		stacks:1,
		timeRemaining: data.thundercloudCountdown.toFixed(2),
		className: data.thundercloudCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Manaward,
		stacks:1,
		timeRemaining: data.manawardCountdown.toFixed(2),
		className: data.manawardCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Swiftcast,
		stacks:1,
		timeRemaining: data.swiftcastCountdown.toFixed(2),
		className: data.swiftcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.LucidDreaming,
		stacks:1,
		timeRemaining: data.lucidDreamingCountdown.toFixed(2),
		className: data.lucidDreamingCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Surecast,
		stacks:1,
		timeRemaining: data.surecastCountdown.toFixed(2),
		className: data.surecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Tincture,
		stacks:1,
		timeRemaining: data.tinctureCountdown.toFixed(2),
		className: data.tinctureCountdown > 0 ? "" : "hidden"
	});

	for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
	return <div className={"buffsDisplay self"}>
		 {buffs.map(obj=>{return <Buff {...obj}/>;})}
	</div>
}

function EnemyBuffsDisplay(props)
{
	let data = (props && props.data) ? props.data : {
		DoTCountdown: 0,
		addleCountdown: 0
	};
	let buffs = [];
	buffs.push({
		rscType: ResourceType.ThunderDoTTick,
		stacks:1,
		timeRemaining: data.DoTCountdown.toFixed(2),
		className: data.DoTCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Addle,
		stacks:1,
		timeRemaining: data.addleCountdown.toFixed(2),
		className: data.addleCountdown > 0 ? "" : "hidden"
	});

	for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
	return <div className={"buffsDisplay enemy"}>
		 {buffs.map(obj=>{return <Buff {...obj}/>;})}
	</div>
}

function ResourceLocksDisplay(props)
{
	let data = (props && props.data) ? props.data : {
		gcdReady: true,
		gcd: 2.5,
		timeTillGCDReady: 0,
		castLocked: false,
		castLockTotalDuration: 0,
		castLockCountdown: 0,
		animLocked: false,
		animLockTotalDuration: 0,
		animLockCountdown: 0,
		canMove: true
	};
	let gcd = <ResourceBar
		name={"GCD"}
		color={"#cf9eec"}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(2)}
		width={100}
		className={data.gcdReady ? "hidden" : ""}/>;
	let tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? "#8edc72" : "#cbcbcb"}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(2)}
		width={100}
		className={data.castLocked ? "" : "hidden"}/>;
	let anim = <ResourceBar
		name={"using skill"}
		color={"#cbcbcb"}
		progress={data.animLocked ? 1 - data.animLockCountdown / data.animLockTotalDuration : 0}
		value={data.animLockCountdown.toFixed(2)}
		width={100}
		className={data.animLocked ? "" : "hidden"}/>;
	return <div className={"resourceLocksDisplay"}>
		{gcd}
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
				<ResourceLocksDisplay data={this.state.resourceLocks}/>
				<EnemyBuffsDisplay data={this.state.enemyBuffs}/>
				<BuffsDisplay data={this.state.selfBuffs}/>
			</div>
		</div>
	}
}

export const statusDisplay = <StatusDisplay/>;