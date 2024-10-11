import React from 'react';
import {Clickable, ContentNode, Help, ProgressBar, StaticFn} from "./Common";
import {ResourceType} from "../Game/Common";
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";
import {TraitName, Traits} from '../Game/Traits';

type StatusResourcesViewProps = {
	mana: number,
	timeTillNextManaTick: number,
	enochianCountdown: number,
	astralFire: number,
	umbralIce: number,
	umbralHearts: number,
	paradox: number,
	astralSoul: number,
	polyglotCountdown: number,
	polyglotStacks: number,
}

type StatusResourceLocksViewProps = {
	gcdReady: boolean,
	gcd: number,
	timeTillGCDReady: number,
	castLocked: boolean,
	castLockTotalDuration: number,
	castLockCountdown: number,
	animLocked: boolean,
	animLockTotalDuration: number,
	animLockCountdown: number,
	canMove: boolean
}

type StatusEnemyBuffsViewProps = {
	DoTCountdown: number,
	addleCountdown: number
}

type StatusSelfBuffsViewProps = {
	leyLinesEnabled: boolean,
	leyLinesCountdown: number,
	triplecastCountdown: number,
	triplecastStacks: number,
	firestarterCountdown: number,
	thunderheadCountdown: number,
	manawardCountdown: number,
	swiftcastCountdown: number,
	lucidDreamingCountdown: number,
	surecastCountdown: number,
	tinctureCountdown: number,
	sprintCountdown: number
}

// everything should be required here except that'll require repeating all those lines to give default values
type StatusViewProps = {
	time: number,
	resources?: StatusResourcesViewProps,
	resourceLocks?: StatusResourceLocksViewProps,
	enemyBuffs?: StatusEnemyBuffsViewProps,
	selfBuffs?: StatusSelfBuffsViewProps,
	level: number
}

// TODO type StatusViewProps = BLMStatusViewProps | PCTStatusViewProps

// color, value
function ResourceStack(props: {color: string, value: boolean}) {
	let colors = getCurrentThemeColors();
	return <div style={{
		top: 1,
		marginRight: 8,
		position: "relative",
		width: 16,
		height: 16,
		borderRadius: 8,
		display: "inline-block",
		border: "1px solid " + colors.bgHighContrast,
		verticalAlign: "top"
	}}>
		<div hidden={!props.value} style={{
			backgroundColor: `${props.color}`,
			position: "absolute",
			top: 2,
			bottom: 2,
			left: 2,
			right: 2,
			borderRadius: "inherit"
		}}/>
	</div>;
}

// name, color, value, progress, width, className
function ResourceBar(props = {
	name: "placeholder" as ContentNode,
	color: "#6cf",
	value: "0.34/1.00",
	progress: 0.34,
	width: 100,
	hidden: false
}) {
	return <div hidden={props.hidden} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<ProgressBar backgroundColor={props.color}
						 progress={props.progress}
						 width={props.width}
						 offsetY={4}/>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.value}</div>
		</div>
	</div>;
}

// name, color, currentStacks, maxStacks
function ResourceCounter(props: {
	name: ContentNode,
	color: string,
	currentStacks: number,
	maxStacks: number,
	className?: string
}) {
	let stacks = [];
	for (let i = 0; i < props.maxStacks; i++) {
		stacks.push(<ResourceStack key={i} color={props.color} value={i < props.currentStacks}/>)
	}
	return <div className={props.className} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{stacks}</div>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.currentStacks + "/" + props.maxStacks}</div>
		</div>
	</div>;
}

const buffIcons = new Map();

export function registerBuffIcon(buff: string, path: string) {
	buffIcons.set(buff, require(path));
}

const casterRoleBuffResources = [
	ResourceType.Addle,
	ResourceType.Swiftcast,
	ResourceType.LucidDreaming,
	ResourceType.Surecast,
	ResourceType.Tincture,
];

casterRoleBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/CasterRole/${buff}.png`))
);

buffIcons.set(ResourceType.Sprint, require("./Asset/Buffs/General/Sprint.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: {
	rscType: ResourceType,
	onSelf: boolean,
	enabled: boolean,
	stacks: number,
	timeRemaining: string,
	className: string
}) {
	let assetName: string = props.rscType;
	if (props.rscType === ResourceType.Triplecast) {
		if (props.stacks === 2) assetName += "2";
		else if (props.stacks === 3) assetName += "3";
	}
	return <div title={props.rscType} className={props.className + " buff " + props.rscType}>
		<Clickable content={
			<img style={{height: 40}} src={buffIcons.get(assetName)} alt={props.rscType}/>
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

function BuffsDisplay(props: {
	data: StatusSelfBuffsViewProps
}) {
	let data = props.data;
	let buffs = [];
	buffs.push({
		rscType: ResourceType.LeyLines,
		onSelf: true,
		enabled: data.leyLinesEnabled,
		stacks:1,
		timeRemaining: data.leyLinesCountdown.toFixed(3),
		className: data.leyLinesCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Triplecast,
		onSelf: true,
		enabled: true,
		stacks: data.triplecastStacks,
		timeRemaining: data.triplecastCountdown.toFixed(3),
		className: data.triplecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Firestarter,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.firestarterCountdown.toFixed(3),
		className: data.firestarterCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Thunderhead,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.thunderheadCountdown.toFixed(3),
		className: data.thunderheadCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Manaward,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.manawardCountdown.toFixed(3),
		className: data.manawardCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Swiftcast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.swiftcastCountdown.toFixed(3),
		className: data.swiftcastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.LucidDreaming,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.lucidDreamingCountdown.toFixed(3),
		className: data.lucidDreamingCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Surecast,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.surecastCountdown.toFixed(3),
		className: data.surecastCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Tincture,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.tinctureCountdown.toFixed(3),
		className: data.tinctureCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Sprint,
		onSelf: true,
		enabled: true,
		stacks:1,
		timeRemaining: data.sprintCountdown.toFixed(3),
		className: data.sprintCountdown > 0 ? "" : "hidden"
	});

	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}

	return <div className={"buffsDisplay self"}>
		{buffElems}
	</div>
}

function EnemyBuffsDisplay(props: {
	data: StatusEnemyBuffsViewProps
}) {
	let data = props.data;
	let buffs = [];
	buffs.push({
		rscType: ResourceType.ThunderDoT,
		onSelf: false,
		enabled: true,
		stacks:1,
		timeRemaining: data.DoTCountdown.toFixed(3),
		className: data.DoTCountdown > 0 ? "" : "hidden"
	});
	buffs.push({
		rscType: ResourceType.Addle,
		onSelf: false,
		enabled: true,
		stacks:1,
		timeRemaining: data.addleCountdown.toFixed(3),
		className: data.addleCountdown > 0 ? "" : "hidden"
	});

	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}
	return <div className={"buffsDisplay enemy"}>
		{buffElems}
	</div>
}

function ResourceLocksDisplay(props: {
	data: StatusResourceLocksViewProps
}) {
	let colors = getCurrentThemeColors();
	let data = props.data;
	let gcd = <ResourceBar
		name={"GCD"}
		color={colors.resources.gcdBar}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(3)}
		width={100}
		hidden={data.gcdReady}/>;
	let tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? colors.resources.gcdBar : colors.resources.lockBar}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.castLocked}/>;
	let anim = <ResourceBar
		name={"using skill"}
		color={colors.resources.lockBar}
		progress={data.animLocked ? 1 - data.animLockCountdown / data.animLockTotalDuration : 0}
		value={data.animLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.animLocked}/>;
	return <div style={{position: "absolute"}}>
		{gcd}
		{tax}
		{anim}
	</div>
}

function ResourcesDisplay(props: {
	data: {
		level: number,
		resources: StatusResourcesViewProps
	}
}) {
	const elements = BLMResourcesDisplay(props.data);
	return <div style={{textAlign: "left"}}>
		{elements}
	</div>
}

export var updateStatusDisplay = (data: StatusViewProps)=>{};
export class StatusDisplay extends React.Component {
	state: StatusViewProps;
	constructor(props: StatusViewProps) {
		super(props);
		this.state = {
			time: 0,
			level: 100,
		}
		updateStatusDisplay = ((newData)=>{
			this.setState({
				time: newData.time,
				resources: newData.resources,
				resourceLocks: newData.resourceLocks,
				selfBuffs: newData.selfBuffs,
				enemyBuffs: newData.enemyBuffs,
				level: newData.level,
			});
		});
	}
	componentDidMount() {
		controller.updateStatusDisplay(controller.game);
	}
	render() {
		return <div className={"statusDisplay"}>
			<div style={{position: "absolute", top: -8, right: 0, zIndex: 1}}><Help topic={"mainControlRegion"} content={
				<div className="toolTip">

					{localize({
						en:
							<>
								<div className="paragraph"><span style={{color: "lightgray"}}>grey</span> border: not focused</div>
								<div className="paragraph"><b style={{color: "mediumpurple"}}>purple</b> border: receiving input</div>
								<div className="paragraph"><b style={{color: "mediumseagreen"}}>green</b> border: real-time</div>
								<div className="paragraph"><b style={{color: "darkorange"}}>orange</b> border: viewing historical state, not receiving input</div>
							</>,
						ja:
							<>
								<div className="paragraph"><span style={{color: "lightgray"}}>グレー</span> : 未選択</div>
								<div className="paragraph"><b style={{color: "mediumpurple"}}>紫</b> : 入力可</div>
								<div className="paragraph"><b style={{color: "mediumseagreen"}}>緑</b> : リアルタイム</div>
								<div className="paragraph"><b style={{color: "darkorange"}}>オレンジ</b> : 任意の時点の状態を確認中。入力不可</div>
							</>,
					})}
				</div>
			}/></div>
			<div className={"-left"}>
				<span style={{display: "block", marginBottom: 10}}>
					{localize({en: "time: ", zh: "战斗时间：", ja: "経過時間："})}
					{`${StaticFn.displayTime(this.state.time, 3)} (${this.state.time.toFixed(3)})`}
				</span>
				{this.state.resources ? <ResourcesDisplay data={{
					level: this.state.level,
					resources: this.state.resources
				}}/> : undefined}
			</div>
			<div className={"-right"}>
				{this.state.resourceLocks ? <ResourceLocksDisplay data={this.state.resourceLocks}/> : undefined}
				{this.state.enemyBuffs ? <EnemyBuffsDisplay data={this.state.enemyBuffs}/> : undefined}
				{this.state.selfBuffs ? <BuffsDisplay data={this.state.selfBuffs}/>: undefined}
			</div>
		</div>
	}
}
