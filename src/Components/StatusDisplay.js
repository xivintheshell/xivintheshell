import React from 'react';
import {Clickable, Help, ProgressBar} from "./Common";
import {ResourceType} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";

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
		<div className={"resource-stacksOrBarAndValue"}>
			<ProgressBar backgroundColor={props.color}
						 progress={props.progress}
						 width={props.width}
						 offsetY={4}/>
			<div className={"resource-value"}>{props.value}</div>
		</div>
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
		<div className={"resource-stacksOrBarAndValue"}>
			<div className={"resource-stacks"}>{stacks}</div>
			<div className={"resource-value"}>{props.currentStacks + "/" + props.maxStacks}</div>
		</div>
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
buffIcons.set(ResourceType.Sprint, require("./Asset/buff_sprint.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props) {
	return <div title={props.rscType} className={props.className + " buff " + props.rscType}>
		<Clickable content={
			<img style={{height: 40}} src={buffIcons.get(props.rscType)} alt={props.rscType}/>
		} style={{
			display: "inline-block",
			verticalAlign: "top",
			filter: props.enabled ? "none" : "grayScale(100%)"
		}} onClickFn={()=>{
			if (props.onSelf) {
				controller.requestToggleBuff(props.rscType);
				controller.updateStatusDisplay(controller.game);
				controller.updateSkillButtons(controller.game);
				controller.autoSave();
			}
		}}/>
		<span className={"buff-label"}>{props.timeRemaining}</span>
	</div>
}

function BuffsDisplay(props) {
	let data = (props && props.data) ? props.data : {
		leyLinesEnabled: true,
		leyLinesCountdown: 0,
		sharpcastCountdown: 0,
		triplecastCountdown: 0,
		firestarterCountdown: 0,
		thundercloudCountdown: 0,
		manawardCountdown: 0,
		swiftcastCountdown: 0,
		lucidDreamingCountdown: 0,
		surecastCountdown: 0,
		tinctureCountdown: 0,
		sprintCountdown: 0
	};
	let buffs = [];
	buffs.push({
		rscType: ResourceType.LeyLines,
		onSelf: true,
		enabled: data.leyLinesEnabled,
		stacks:1,
		timeRemaining: data.leyLinesCountdown.toFixed(2),
		className: data.leyLinesCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sharpcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sharpcastCountdown.toFixed(2),
		className: data.sharpcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Triplecast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.triplecastCountdown.toFixed(2),
		className: data.triplecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Firestarter,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.firestarterCountdown.toFixed(2),
		className: data.firestarterCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Thundercloud,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.thundercloudCountdown.toFixed(2),
		className: data.thundercloudCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Manaward,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.manawardCountdown.toFixed(2),
		className: data.manawardCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Swiftcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.swiftcastCountdown.toFixed(2),
		className: data.swiftcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.LucidDreaming,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.lucidDreamingCountdown.toFixed(2),
		className: data.lucidDreamingCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Surecast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.surecastCountdown.toFixed(2),
		className: data.surecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Tincture,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.tinctureCountdown.toFixed(2),
		className: data.tinctureCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sprint,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sprintCountdown.toFixed(2),
		className: data.sprintCountdown > 0 ? "" : "hidden"
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
		enabled: true,
		stacks:1,
		timeRemaining: data.DoTCountdown.toFixed(2),
		className: data.DoTCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Addle,
		enabled: true,
		stacks:1,
		timeRemaining: data.addleCountdown.toFixed(2),
		className: data.addleCountdown > 0 ? "" : "hidden"
	});

	for (let i = 0; i < buffs.length; i++) buffs[i].key=i;
	return <div className={"buffsDisplay enemy"}>
		 {buffs.map(obj=>{return <Buff {...obj}/>;})}
	</div>
}

function ResourceLocksDisplay(props) {
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
		color={"#8edc72"}
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
		timeTillNextManaTick: 0.8,
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
	let manaTick = <ResourceBar
		name={localize({
		en: "MP tick",
		zh: "跳蓝时间"
		})}
		color={"#c2eaff"}
		progress={1 - data.timeTillNextManaTick / 3}
		value={(3 - data.timeTillNextManaTick).toFixed(2) + "/3"}
		width={100}/>;
	let enochian = <ResourceBar
		name={localize({
			en: "enochian",
			zh: "天语"
		})}
		color={"#f5cf96"}
		progress={data.enochianCountdown / 15}
		value={`${data.enochianCountdown.toFixed(2)}`}
		width={100}/>;
	let afui = <ResourceCounter
		name={localize({
			en: "AF/UI",
			zh: "冰火层数"
		})}
		color={data.astralFire > 0 ? "#f63" : "#6bf"}
		currentStacks={data.astralFire > 0 ? data.astralFire : data.umbralIce}
		maxStacks={3}/>;
	let uh = <ResourceCounter
		name={
		localize({
			en: "hearts",
			zh: "冰针",
		})}
		color={"#95dae3"}
		currentStacks={data.umbralHearts}
		maxStacks={3}/>;
	let paradox = <ResourceCounter
		name={
		localize({
			en: "paradox",
			zh: "悖论"
	})}
		color={"#d953ee"}
		currentStacks={data.paradox}
		maxStacks={1}/>;
	let polyTimer = <ResourceBar
		name={
		localize({
			en: "poly timer",
			zh: "通晓计时",
		})}
		color={"#d5bbf1"}
		progress={1 - data.polyglotCountdown / 30}
		value={`${data.polyglotCountdown.toFixed(2)}`}
		width={100}/>;
	let poly = <ResourceCounter
		name={
		localize({
			en: "poly stacks",
			zh: "通晓层数"
		})}
		color={"#b138ee"}
		currentStacks={data.polyglotStacks}
		maxStacks={2}/>;
	return <div className={"resourceDisplay"}>
		{manaBar}
		{manaTick}
		{afui}
		{uh}
		{paradox}
		{enochian}
		{polyTimer}
		{poly}
	</div>;
}

export var updateStatusDisplay = (data)=>{};
export class StatusDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			time: 0,
			resources: null,
			resourceLocks: null,
			selfBuffs: null,
			enemyBuffs: null
		}
		updateStatusDisplay = ((newData)=>{
			this.setState({
				time: newData.time,
				resources: newData.resources,
				resourceLocks: newData.resourceLocks,
				selfBuffs: newData.selfBuffs,
				enemyBuffs: newData.enemyBuffs
			});
		}).bind(this);
	}
	componentDidMount() {
		controller.updateStatusDisplay(controller.game);
	}
	render() {
		return <div className={"statusDisplay"}>
			<div style={{position: "absolute", top: -8, right: 0, zIndex: 1}}><Help topic={"mainControlRegion"} content={
				<div className="toolTip">
					<div className="paragraph"><span style={{color: "lightgray"}}>grey</span> border: not focused</div>
					<div className="paragraph"><b style={{color: "mediumpurple"}}>purple</b> border: receiving input</div>
					<div className="paragraph"><b style={{color: "mediumseagreen"}}>green</b> border: real-time</div>
					<div className="paragraph"><b style={{color: "darkorange"}}>orange</b> border: viewing historical state, not receiving input</div>
				</div>
			}/></div>
			<div className={"-left"}>
				<span style={{display: "block", marginBottom: 10}}>{localize({en: "time: ", zh: "战斗时间："})}{this.state.time.toFixed(2)}</span>
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