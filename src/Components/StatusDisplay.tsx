import React, {CSSProperties} from 'react';
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

export interface DanceCounterProps {
	kind: "dance",
	name: ContentNode,
	entrechatColor: string,
	emboiteColor: string,
	jeteColor: string,
	pirouetteColor: string,
	maxStacks: number,
	currentStacks: number,
}

export interface SenCounterProps {
	kind: "sen",
	name: ContentNode,
	hasSetsu: boolean,
	hasGetsu: boolean,
	hasKa: boolean,
	setsuColor: string,
	getsuColor: string,
	kaColor: string,
}

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
	DanceCounterProps |
	SenCounterProps |
	ResourceTextProps;

// everything should be required here except that'll require repeating all those lines to give default values
export type StatusViewProps = {
	time: number,
	resources: ResourceDisplayProps[],
	resourceLocks?: StatusResourceLocksViewProps,
	enemyBuffs: BuffProps[],
	selfBuffs: BuffProps[],
	level: number
}

// color, value
function ResourceStack(props: {
	color?: string,
	offset?: {x: number, y: number}
}) {
	let colors = getCurrentThemeColors();
	return <div style={{
		top: 1 + (props.offset?.y ?? 0),
		left: props.offset?.x ?? 0,
		marginRight: 8,
		position: "relative",
		width: 16,
		height: 16,
		borderRadius: 8,
		display: "inline-block",
		border: "1px solid " + colors.bgHighContrast,
		verticalAlign: "top"
	}}>{
		props.color !== undefined ? <div style={{
			backgroundColor: `${props.color}`,
			position: "absolute",
			top: 2,
			bottom: 2,
			left: 2,
			right: 2,
			borderRadius: "inherit"
		}}/> : undefined
	}</div>;
}

function ResourceBox(props: {
	imgUrl?: string
	color?: string,
	offset?: {x: number, y: number}
}) {
	let colors = getCurrentThemeColors();
	const width = 30;
	const height = 24;

	let inner: ContentNode | undefined = undefined;
	if (props.imgUrl) {
		inner = <img src={props.imgUrl} alt={"resource img"} style={{
			display: "block",
			margin: "2px auto",
			// todo (qol): tint
			maxWidth: width - 4,
			maxHeight: height - 4
		}}/>
	} else if (props.color) {
		inner = <div style={{
			backgroundColor: props.color,
			position: "absolute",
			top: 3,
			bottom: 3,
			left: 3,
			right: 3
		}}/>
	}

	return <div style={{
		display: "inline-block",
		position: "relative",
		top: props.offset?.y ?? 0,
		left: props.offset?.x ?? 0,
		width: width,
		height: height,
		border: "1px solid " + colors.bgHighContrast,
		marginRight: 4
	}}>{inner}</div>
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

function ResourceCounter(props: {
	name: ContentNode,
	label?: ContentNode,
	containerType: "counter" | "box",
	items: {
		imgUrl?: string,
		color?: string,
	}[]
}) {
	let stacks = [];
	let anyBox: boolean = props.items.reduce((b, item) => {
		return b || item.imgUrl !== undefined;
	}, props.containerType === "box");

	for (let i = 0; i < props.items.length; i++) {
		const item = props.items[i];
		if (props.containerType === "counter" && item.imgUrl === undefined) {
			stacks.push(<ResourceStack key={i}color={item.color} offset={anyBox ? {x:0, y:3} : undefined}/>);
		} else {
			stacks.push(<ResourceBox key={i} color={item.color} imgUrl={item.imgUrl} offset={anyBox ? {x:-2, y:0} : undefined}/>);
		}
	}
	if (anyBox) {
		return <div style={{ marginBottom: 4 }}>
			<div style={{
				display: "inline-block",
				position: "relative",
				verticalAlign: "top",
				top: 6,
				width: 108,
			}}>{props.name}</div>
			<div style={{display: "inline-block"}}>{stacks}</div>
			{props.label ? <div style={{
				marginLeft: 6,
				display: "inline-block",
				position: "relative",
				verticalAlign: "top",
				top: 6,
			}}>{props.label}</div> : undefined}
		</div>
	} else {
		return <div style={{marginBottom: 4, lineHeight: "1.5em"}}>
			<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name}</div>
			<div style={{width: 200, display: "inline-block"}}>
				<div style={{display: "inline-block"}}>{stacks}</div>
				{props.label ? <div style={{
					marginLeft: 6,
					height: "100%",
					display: "inline-block"
				}}>{props.label}</div> : undefined}
			</div>
		</div>;
	}
}

// todo [myn]
// copy of ResourceCounter specialized for tracking SAM's Sen gauge
function SenCounter(props: {
	name: ContentNode,
	hasSetsu: boolean,
	hasGetsu: boolean,
	hasKa: boolean,
	setsuColor: string,
	getsuColor: string,
	kaColor: string,
}) {
	const stacks = [];
	const hasSen = [props.hasSetsu, props.hasGetsu, props.hasKa];
	const senColors = [props.setsuColor, props.getsuColor, props.kaColor];
	const names = ["setsu", "getsu", "ka"];
	const presentSen = [];
	const help = <Help topic={"senExplanation"}
		content={localize({
			en: "from left to right: setsu (yukikaze), getsu (gekko/mangetsu), ka (kasha/oka)",
		})}
	/>;
	for (let i = 0; i < 3; i++) {
		stacks.push(<ResourceStack key={i} color={hasSen[i] ? senColors[i] : undefined}/>);
		if (hasSen[i]) {
			presentSen.push(names[i]);
		}
	}
	return <div style={{marginBottom: 4, lineHeight: "1.5em"}}>
		<div style={{display: "inline-block", height: "100%", width: 108}}>{props.name} {help}</div>
		<div style={{width: 200, display: "inline-block"}}>
			<div style={{display: "inline-block", marginLeft: 6}}>{stacks}</div>
			<div style={{marginLeft: 6, height: "100%", display: "inline-block"}}>{presentSen.join("+")}</div>
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
	// remove colons since it's hard to create a file name that contains them
	buffIcons.set(buff.replace(":", ""), require(`./Asset/Buffs/${relativePath}`));
}

const roleBuffResources = [
	ResourceType.Addle,
	ResourceType.Swiftcast,
	ResourceType.LucidDreaming,

	ResourceType.Feint,
	ResourceType.TrueNorth,
	ResourceType.ArmsLength,
	ResourceType.Bloodbath,

	ResourceType.Surecast,
	ResourceType.Tincture,
	ResourceType.ArmsLength,
];

// role buffs are registered here; job buffs should be registered in the job's respective file
roleBuffResources.forEach(
	(buff) => buffIcons.set(buff, require(`./Asset/Buffs/Role/${buff}.png`))
);

buffIcons.set(ResourceType.Sprint, require("./Asset/Buffs/General/Sprint.png"));
buffIcons.set(ResourceType.RearPositional, require("./Asset/Buffs/General/Rear Positional.png"));
buffIcons.set(ResourceType.FlankPositional, require("./Asset/Buffs/General/Flank Positional.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: BuffProps) {
	let assetName: string = props.rscType;
	if (props.stacks > 1) assetName += props.stacks;
	// Special case for positional buffs: add a rounded border thta's similar in size to the other buffs
	let imgStyle: React.CSSProperties;
	if (props.rscType === ResourceType.RearPositional || props.rscType === ResourceType.FlankPositional) {
		imgStyle = {
			height: 40,
			borderStyle: "solid",
			borderColor: getCurrentThemeColors().bgHighContrast,
			borderWidth: "0.2em",
			borderRadius: "0.7em",
		};
	} else {
		imgStyle = { height: 40 };
	}
	return <div title={localizeResourceType(props.rscType)} className={props.className + " buff " + props.rscType}>
		<Clickable content={
			<img style={imgStyle} src={buffIcons.get(assetName)} alt={props.rscType}/>
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

export function BuffsDisplay(props: {
	data: BuffProps[],
	style?: CSSProperties
}) {
	const buffs = props.data;
	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]}/>);
	}
	let style: CSSProperties = {
		height: 54,
		textAlign: "right",
		lineHeight: "1em"
	};
	if (props.style) {
		style = {...style, ...props.style};
	}
	return <div style={style}>
		{buffElems}
	</div>
}

export function ResourceLocksDisplay(props: {
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

// todo: instead of switching just make each job define its own resource visualization in JOB.tsx
export function ResourcesDisplay(props: {
	data: {
		level: number,
		resources: ResourceDisplayProps[],
	},
	style?: CSSProperties
}) {
	const elements = props.data.resources.map((props, i) => {
		switch(props.kind) {
			case "bar":
				return <ResourceBar
					name={props.name}
					color={props.color}
					progress={props.progress}
					value={props.valueString}
					width={props.widthPx ?? 100}
					hidden={props.hidden ?? false}
					key={"resourceDisplay" + i}
				/>
			case "counter": {
				let items = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({
						color: i < props.currentStacks ? props.color : undefined
					});
				}
				return <ResourceCounter
					containerType={"counter"}
					name={props.name}
					label={`${props.currentStacks}/${props.maxStacks}`}
					items={items}
					key={"resourceDisplay" + i}
				/>
			}
			case "paint": {
				let items = [];
				for (let i = 0; i < props.maxStacks; i++) {
					const fillColor = (props.hasComet && i === props.currentStacks - 1) ? props.cometColor : props.holyColor;
					items.push({ color: i < props.currentStacks ? fillColor : undefined, imgUrl: undefined });
				}
				let label = `${props.currentStacks}/${props.maxStacks}`;
				return <ResourceCounter
					containerType="counter"
					name={props.name}
					label={label}
					items={items}
					key={"resourceDisplay" + i}
				/>
			}
			case "dance": {
				const currentStacks = props.currentStacks;
				let stackColors = [props.emboiteColor, props.entrechatColor, props.jeteColor, props.pirouetteColor];
				let items = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({ color: i  < currentStacks ? stackColors[i] : undefined });
				}
				let label = `${currentStacks}/${props.maxStacks}`;
				return <ResourceCounter
					containerType="counter"
					name={props.name}
					label={label}
					items={items}
					key={"resourceDisplay" + i}
				/>
			}
			case "sen":
				return <SenCounter
					name={props.name}
					hasSetsu={props.hasSetsu}
					hasGetsu={props.hasGetsu}
					hasKa={props.hasKa}
					setsuColor={props.setsuColor}
					getsuColor={props.getsuColor}
					kaColor={props.kaColor}
					key={"resourceDisplay" + i}
				/>
			default:
				return <ResourceText
					name={props.name}
					text={props.text}
					key={"resourceDisplay" + i}
				/>
		}
	});
	let style: CSSProperties = {
		textAlign: "left",
		// Set a minHeight to ensure buffs do not clash with the hotbar
		minHeight: "13.5em"
	};
	if (props.style) {
		style = {...style, ...props.style};
	}
	return <div style={style}>
		{elements}
	</div>
}

type StatusLayoutFn = (props: StatusViewProps) => React.ReactNode;

export var updateStatusDisplay = (data: StatusViewProps, layoutFn: StatusLayoutFn)=> {};
export class StatusDisplay extends React.Component {
	state: StatusViewProps & {
		layoutFn: (props: StatusViewProps) => React.ReactNode
	};
	constructor(props: StatusViewProps) {
		super(props);
		this.state = {
			time: 0,
			resources: [],
			enemyBuffs: [],
			selfBuffs: [],
			level: 100,
			layoutFn: (props: StatusViewProps) => { return <div/> }
		}
		updateStatusDisplay = (newData, newLayoutFn) => {
			this.setState({...{layoutFn: newLayoutFn}, ...newData});
		};
	}
	componentDidMount() {
		controller.updateStatusDisplay(controller.game);
	}
	render() {
		return <div style={{
			position: "relative",
			textAlign: "left",
			margin: "8px 0"
		}}>
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
			{this.state.layoutFn(this.state as StatusViewProps)}
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

	// override me if the standard resource layout doesn't look right (DNC as an example because it gives many buffs)
	statusLayoutFn(props: StatusViewProps): React.ReactNode {
		return <>
			<div style={{
				display: "inline-block",
				verticalAlign: "top",
				width: "50%",
				height: "100%"
			}}>
			<span style={{display: "block", marginBottom: 10}}>
				{localize({en: "time: ", zh: "战斗时间：", ja: "経過時間："})}
				{`${StaticFn.displayTime(props.time, 3)} (${props.time.toFixed(3)})`}
			</span>
				{props.resources ? <ResourcesDisplay data={{
					level: props.level,
					resources: props.resources
				}}/> : undefined}
			</div>
			<div style={{
				position: "relative",
				display: "inline-block",
				float: "right",
				width: "50%"
			}}>
				{props.resourceLocks ? <ResourceLocksDisplay data={props.resourceLocks}/> : undefined}
				<BuffsDisplay data={props.enemyBuffs} style={{ marginBottom: "3em" }}/>
				<BuffsDisplay data={props.selfBuffs}/>
			</div>
		</>
	}
}