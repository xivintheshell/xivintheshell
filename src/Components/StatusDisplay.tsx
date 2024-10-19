import React from 'react';
import {Clickable, ContentNode, Help, ProgressBar, StaticFn} from "./Common";
import {ResourceType} from "../Game/Common";
import type {PlayerState} from "../Game/GameState";
import {controller} from "../Controller/Controller";
import {localize, localizeResourceType} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";

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

export type BuffProps = {
	rscType: ResourceType,
	onSelf: boolean,
	enabled: boolean,
	stacks: number,
	timeRemaining?: string,
	className: string
};

export interface ResourceBarProps {
	kind: "bar";
	name: string | ContentNode;
	color: string;
	progress: number;
	valueString: string;
	widthPx?: number; // default 100
	hidden?: boolean; // default false
};

export interface ResourceCounterProps {
	kind: "counter";
	name: string | ContentNode;
	color: string;
	currentStacks: number;
	maxStacks: number;
	valueString: string;
};

export interface PaintGaugeCounterProps {
	kind: "paint",
	name: ContentNode,
	holyColor: string,
	cometColor: string,
	currentStacks: number,
	maxStacks: number,
	hasComet: boolean,
};

export interface ResourceTextProps {
	kind: "text",
	name: ContentNode,
	text: ContentNode,
	className?: string,
};

export type ResourceDisplayProps =
	ResourceBarProps |
	ResourceCounterProps |
	PaintGaugeCounterProps |
	ResourceTextProps;

// everything should be required here except that'll require repeating all those lines to give default values
type StatusViewProps = {
	time: number,
	resources?: ResourceDisplayProps[],
	resourceLocks?: StatusResourceLocksViewProps,
	enemyBuffs?: BuffProps[],
	selfBuffs?: BuffProps[],
	level: number
}

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

// copy of ResourceCounter specialized for the paint gauge
// name, holyColor, cometColor, currentStacks, maxStacks, hasComet
function PaintGaugeCounter(props: {
	name: ContentNode,
	holyColor: string,
	cometColor: string,
	currentStacks: number,
	maxStacks: number,
	hasComet: boolean,
}) {
	let stacks = [];
	for (let i = 0; i < 5; i++) {
		// dip the last one in black paint
		let isComet = props.hasComet && i === props.currentStacks - 1;
		stacks.push(<ResourceStack key={i} color={isComet ? props.cometColor : props.holyColor} value={i < props.currentStacks}/>)
	}
	return <div style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{stacks}</div>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{props.currentStacks + "/" + props.maxStacks}</div>
		</div>
	</div>;
}

function ResourceText(props: {
	name: ContentNode,
	text: ContentNode,
	className?: string,
}) {
	return <div className={props.className} style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{props.text}</div>
		</div>
	</div>;
}

const buffIcons = new Map();

export function registerBuffIcon(buff: string, relativePath: string) {
	buffIcons.set(buff, require(`./Asset/Buffs/${relativePath}`));
}

const casterRoleBuffResources = [
	ResourceType.Addle,
	ResourceType.Swiftcast,
	ResourceType.LucidDreaming,
	ResourceType.Surecast,
	ResourceType.Tincture,
];

// role buffs are registered here; job buffs should be registered in the job's respective file
casterRoleBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/CasterRole/${buff}.png`))
);

buffIcons.set(ResourceType.Sprint, require("./Asset/Buffs/General/Sprint.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: BuffProps) {
	let assetName: string = props.rscType;
	if (props.rscType === ResourceType.Triplecast) {
		if (props.stacks === 2) assetName += "2";
		else if (props.stacks === 3) assetName += "3";
	}
	return <div title={localizeResourceType(props.rscType)} className={props.className + " buff " + props.rscType}>
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
		{/* When the buff has no timer, we still want it to align with other buffs, so just pad some empty space */}
		<span className={"buff-label"} style={{visibility: props.timeRemaining === undefined ? "hidden" : undefined}}>
			{props.timeRemaining ?? "0.000"}
		</span>
	</div>
}

function BuffsDisplay(props: {
	data: BuffProps[]
}) {
	const buffs = props.data;
	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}

	return <div className={"buffsDisplay self"}>
		{buffElems}
	</div>
}

function EnemyBuffsDisplay(props: {
	data: BuffProps[]
}) {
	const buffs = props.data;
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
		resources: ResourceDisplayProps[],
	}
}) {
	const elements = props.data.resources.map((props, i) =>
		(props.kind === "bar")
			? <ResourceBar
				name={props.name}
				color={props.color}
				progress={props.progress}
				value={props.valueString}
				width={props.widthPx ?? 100}
				hidden={props.hidden ?? false}
				key={"resourceDisplay" + i}
			/>
		: (props.kind === "counter"
			? <ResourceCounter
				name={props.name}
				color={props.color}
				currentStacks={props.currentStacks}
				maxStacks={props.maxStacks}
				key={"resourceDisplay" + i}
			/>
		: (props.kind === "paint"
			? <PaintGaugeCounter
				name={props.name}
				holyColor={props.holyColor}
				cometColor={props.cometColor}
				currentStacks={props.currentStacks}
				maxStacks={props.maxStacks}
				hasComet={props.hasComet}
				key={"resourceDisplay" + i}
			/>
			: <ResourceText
				name={props.name}
				text={props.text}
				key={"resourceDisplay" + i}
			/>
		))
	);
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
		updateStatusDisplay = ((newData) => {
			this.setState({...newData});
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

export abstract class StatusPropsGenerator<T extends PlayerState> {
	state: T;

	constructor(state: T) {
		this.state = state;
	}

	abstract getEnemyBuffViewProps(): BuffProps[];
	abstract getSelfBuffViewProps(): BuffProps[];
	abstract getResourceViewProps(): ResourceDisplayProps[];
}