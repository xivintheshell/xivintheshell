import React, { CSSProperties } from "react";
import { Clickable, ContentNode, Help, ProgressBar, StaticFn } from "./Common";
import { ResourceType, TankLBResourceType } from "../Game/Common";
import type { PlayerState } from "../Game/GameState";
import { controller } from "../Controller/Controller";
import { localize, localizeResourceType } from "./Localization";
import { getCurrentThemeColors } from "./ColorTheme";
import { JOBS } from "../Game/Data/Jobs";

type StatusResourceLocksViewProps = {
	gcdReady: boolean;
	gcd: number;
	timeTillGCDReady: number;
	castLocked: boolean;
	castLockTotalDuration: number;
	castLockCountdown: number;
	animLocked: boolean;
	animLockTotalDuration: number;
	animLockCountdown: number;
	canMove: boolean;
};

export type BuffProps = {
	rscType: ResourceType;
	onSelf: boolean;
	enabled: boolean;
	stacks: number;
	timeRemaining?: string;
	className: string;
};

export interface ResourceBarProps {
	kind: "bar";
	name: string | ContentNode;
	color: string;
	progress: number;
	valueString: string;
	widthPx?: number; // default 100
	hidden?: boolean; // default false
}

export interface ResourceCounterProps {
	kind: "counter";
	name: string | ContentNode;
	color: string;
	currentStacks: number;
	maxStacks: number;
	valueString: string;
}

export interface PaintGaugeCounterProps {
	kind: "paint";
	name: ContentNode;
	holyColor: string;
	cometColor: string;
	currentStacks: number;
	maxStacks: number;
	hasComet: boolean;
}

export interface DanceCounterProps {
	kind: "dance";
	name: ContentNode;
	entrechatColor: string;
	emboiteColor: string;
	jeteColor: string;
	pirouetteColor: string;
	maxStacks: number;
	currentStacks: number;
}

export interface SenCounterProps {
	kind: "sen";
	name: ContentNode;
	hasSetsu: boolean;
	hasGetsu: boolean;
	hasKa: boolean;
	setsuColor: string;
	getsuColor: string;
	kaColor: string;
}

export interface CodaCounterProps {
	kind: "coda";
	name: ContentNode;
	hasWanderers: boolean;
	hasMages: boolean;
	hasArmys: boolean;
	wanderersColor: string;
	magesColor: string;
	armysColor: string;
}

export interface CodaCounterProps {
	kind: "coda";
	name: ContentNode;
	hasWanderers: boolean;
	hasMages: boolean;
	hasArmys: boolean;
	wanderersColor: string;
	magesColor: string;
	armysColor: string;
}

export interface ResourceTextProps {
	kind: "text";
	name: ContentNode;
	text: ContentNode;
	className?: string;
}

export type ResourceDisplayProps =
	| ResourceBarProps
	| ResourceCounterProps
	| PaintGaugeCounterProps
	| DanceCounterProps
	| SenCounterProps
	| CodaCounterProps
	| ResourceTextProps;

// everything should be required here except that'll require repeating all those lines to give default values
export type StatusViewProps = {
	time: number;
	resources: ResourceDisplayProps[];
	resourceLocks?: StatusResourceLocksViewProps;
	enemyBuffs: BuffProps[];
	selfBuffs: BuffProps[];
	level: number;
};

function ResourceStack(props: { color?: string; offset?: { x: number; y: number } }) {
	let colors = getCurrentThemeColors();
	return <div
		style={{
			top: 1 + (props.offset?.y ?? 0),
			left: props.offset?.x ?? 0,
			marginRight: 8,
			position: "relative",
			width: 16,
			height: 16,
			borderRadius: 8,
			display: "inline-block",
			border: "1px solid " + colors.bgHighContrast,
			verticalAlign: "top",
		}}
	>
		{props.color && <div
			style={{
				backgroundColor: `${props.color}`,
				position: "absolute",
				top: 2,
				bottom: 2,
				left: 2,
				right: 2,
				borderRadius: "inherit",
			}}
		/>}
	</div>;
}

function ResourceBox(props: {
	imgUrl?: string;
	color?: string;
	offset?: { x: number; y: number };
}) {
	let colors = getCurrentThemeColors();
	const width = 30;
	const height = 24;

	let inner: ContentNode | undefined = undefined;
	if (props.imgUrl) {
		inner = <img
			src={props.imgUrl}
			alt={"resource img"}
			style={{
				display: "block",
				margin: "2px auto",
				// todo (qol): tint
				maxWidth: width - 4,
				maxHeight: height - 4,
			}}
		/>;
	} else if (props.color) {
		inner = <div
			style={{
				backgroundColor: props.color,
				position: "absolute",
				top: 3,
				bottom: 3,
				left: 3,
				right: 3,
			}}
		/>;
	}

	return <div
		style={{
			display: "inline-block",
			position: "relative",
			top: props.offset?.y ?? 0,
			left: props.offset?.x ?? 0,
			width: width,
			height: height,
			border: "1px solid " + colors.bgHighContrast,
			marginRight: 4,
		}}
	>
		{inner}
	</div>;
}

// name, color, value, progress, width, className
function ResourceBar(
	props = {
		name: "placeholder" as ContentNode,
		color: "#6cf",
		value: "0.34/1.00",
		progress: 0.34,
		width: 100,
		hidden: false,
	},
) {
	return <div hidden={props.hidden} style={{ marginBottom: 4, lineHeight: "1.5em" }}>
		<div style={{ display: "inline-block", height: "100%", width: 108 }}>{props.name}</div>
		<div style={{ width: 200, display: "inline-block" }}>
			<ProgressBar
				backgroundColor={props.color}
				progress={props.progress}
				width={props.width}
				offsetY={4}
			/>
			<div style={{ marginLeft: 6, height: "100%", display: "inline-block" }}>
				{props.value}
			</div>
		</div>
	</div>;
}

function ResourceCounter(props: {
	name: ContentNode; // text on the left
	label?: ContentNode; // text on the right
	containerType: "circle" | "box";
	items: {
		// if imgUrl is specified, show the image scaled to fit in a box.
		// else if color is specified, show a solid color box/circle depending on containerType
		// else show an empty box/circle depending on containerType
		imgUrl?: string;
		color?: string;
	}[];
}) {
	// true if containerType is "box", or any item has imgUrl specified
	const anyBox: boolean =
		props.containerType === "box" || props.items.some((item) => item.imgUrl !== undefined);

	const stacks: React.JSX.Element[] = props.items.map((item, i) =>
		props.containerType === "circle" && item.imgUrl === undefined ? (
			<ResourceStack
				key={i}
				color={item.color}
				offset={anyBox ? { x: 0, y: 3 } : undefined}
			/>
		) : (
			<ResourceBox
				key={i}
				color={item.color}
				imgUrl={item.imgUrl}
				offset={anyBox ? { x: -2, y: 0 } : undefined}
			/>
		),
	);

	if (anyBox) {
		return <div style={{ marginBottom: 4 }}>
			<div
				style={{
					display: "inline-block",
					position: "relative",
					verticalAlign: "top",
					top: 6,
					width: 108,
				}}
			>
				{props.name}
			</div>
			<div style={{ display: "inline-block" }}>{stacks}</div>
			{props.label ? (
				<div
					style={{
						marginLeft: 6,
						display: "inline-block",
						position: "relative",
						verticalAlign: "top",
						top: 6,
					}}
				>
					{props.label}
				</div>
			) : undefined}
		</div>;
	} else {
		return <div style={{ marginBottom: 4, lineHeight: "1.5em" }}>
			<div style={{ display: "inline-block", height: "100%", width: 108 }}>{props.name}</div>
			<div style={{ width: 200, display: "inline-block" }}>
				<div style={{ display: "inline-block" }}>{stacks}</div>
				{props.label ? (
					<div
						style={{
							marginLeft: 6,
							height: "100%",
							display: "inline-block",
						}}
					>
						{props.label}
					</div>
				) : undefined}
			</div>
		</div>;
	}
}

function ResourceText(props: { name: ContentNode; text: ContentNode; className?: string }) {
	return <div className={props.className} style={{ marginBottom: 4, lineHeight: "1.5em" }}>
		<div style={{ display: "inline-block", height: "100%", width: 108 }}>{props.name}</div>
		<div style={{ width: 200, display: "inline-block" }}>
			<div style={{ display: "inline-block", marginLeft: 6 }}>{props.text}</div>
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

	ResourceType.Reprisal,
	ResourceType.Rampart,
];

// role buffs are registered here; job buffs should be registered in the job's respective file
roleBuffResources.forEach((buff) => buffIcons.set(buff, require(`./Asset/Buffs/Role/${buff}.png`)));

// Tank LBs share the same buff icon
Object.values(TankLBResourceType).forEach((rscType) =>
	buffIcons.set(rscType, require("./Asset/Buffs/Role/Tank Limit Break.png")),
);

buffIcons.set(ResourceType.Sprint, require("./Asset/Buffs/General/Sprint.png"));
buffIcons.set(ResourceType.RearPositional, require("./Asset/Buffs/General/Rear Positional.png"));
buffIcons.set(ResourceType.FlankPositional, require("./Asset/Buffs/General/Flank Positional.png"));

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: BuffProps) {
	let assetName: string = props.rscType;
	if (props.stacks > 1) assetName += props.stacks;
	let imgStyle: React.CSSProperties;
	if (
		props.rscType === ResourceType.RearPositional ||
		props.rscType === ResourceType.FlankPositional
	) {
		imgStyle = {
			height: 40,
			//filter: "drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.25)",
		};
	} else {
		imgStyle = { height: 40 };
	}
	return <div
		title={localizeResourceType(props.rscType)}
		className={props.className + " buff " + props.rscType}
	>
		<Clickable
			content={<img style={imgStyle} src={buffIcons.get(assetName)} alt={props.rscType} />}
			style={{
				display: "inline-block",
				verticalAlign: "top",
				filter: props.enabled ? "none" : "grayScale(100%)",
			}}
			onClickFn={() => {
				if (props.onSelf) {
					controller.requestToggleBuff(props.rscType);
					controller.updateStatusDisplay(controller.game);
					controller.updateSkillButtons(controller.game);
					controller.autoSave();
				}
			}}
		/>
		{/* When the buff has no timer, we still want it to align with other buffs, so just pad some empty space */}
		<span
			className={"buff-label"}
			style={{ visibility: props.timeRemaining === undefined ? "hidden" : undefined }}
		>
			{props.timeRemaining ?? "0.000"}
		</span>
	</div>;
}

export function BuffsDisplay(props: { data: BuffProps[]; style?: CSSProperties }) {
	const buffs = props.data;
	let buffElems: React.ReactNode[] = [];
	for (let i = 0; i < buffs.length; i++) {
		buffElems.push(<Buff key={i} {...buffs[i]} />);
	}
	let style: CSSProperties = {
		height: 54,
		textAlign: "right",
		lineHeight: "1em",
	};
	if (props.style) {
		style = { ...style, ...props.style };
	}
	return <div style={style}>{buffElems}</div>;
}

export function ResourceLocksDisplay(props: { data: StatusResourceLocksViewProps }) {
	let colors = getCurrentThemeColors();
	let data = props.data;
	let gcd = <ResourceBar
		name={"GCD"}
		color={colors.resources.gcdBar}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(3)}
		width={100}
		hidden={data.gcdReady}
	/>;
	let tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? colors.resources.gcdBar : colors.resources.lockBar}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.castLocked}
	/>;
	let anim = <ResourceBar
		name={"using skill"}
		color={colors.resources.lockBar}
		progress={data.animLocked ? 1 - data.animLockCountdown / data.animLockTotalDuration : 0}
		value={data.animLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.animLocked}
	/>;
	return <div style={{ position: "absolute" }}>
		{gcd}
		{tax}
		{anim}
	</div>;
}

// todo: instead of switching just make each job define its own resource visualization in JOB.tsx
export function ResourcesDisplay(props: {
	data: {
		level: number;
		resources: ResourceDisplayProps[];
	};
	style?: CSSProperties;
}) {
	const elements = props.data.resources.map((props, i) => {
		switch (props.kind) {
			case "bar":
				return <ResourceBar
					name={props.name}
					color={props.color}
					progress={props.progress}
					value={props.valueString}
					width={props.widthPx ?? 100}
					hidden={props.hidden ?? false}
					key={"resourceDisplay" + i}
				/>;
			case "counter": {
				let items: { color?: string; imgUrl?: string }[] = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({
						color: i < props.currentStacks ? props.color : undefined,
					});
				}
				return <ResourceCounter
					containerType={"circle"}
					name={props.name}
					label={`${props.currentStacks}/${props.maxStacks}`}
					items={items}
					key={"resourceDisplay" + i}
				/>;
			}
			case "paint": {
				let items: { color?: string; imgUrl?: string }[] = [];
				for (let i = 0; i < props.maxStacks; i++) {
					const fillColor =
						props.hasComet && i === props.currentStacks - 1
							? props.cometColor
							: props.holyColor;
					// uncomment the next line to see an example of mixed circle & box counter
					//if (props.hasComet && i === props.currentStacks-1) items.push({ imgUrl: require("./Asset/heart.png") }); else
					items.push({
						color: i < props.currentStacks ? fillColor : undefined,
						imgUrl: undefined,
					});
				}
				let label = `${props.currentStacks}/${props.maxStacks}`;
				return <ResourceCounter
					containerType="circle"
					name={props.name}
					label={label}
					items={items}
					key={"resourceDisplay" + i}
				/>;
			}
			case "dance": {
				const currentStacks = props.currentStacks;
				let stackColors = [
					props.emboiteColor,
					props.entrechatColor,
					props.jeteColor,
					props.pirouetteColor,
				];
				let items: { color?: string; imgUrl?: string }[] = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({ color: i < currentStacks ? stackColors[i] : undefined });
				}
				let label = `${currentStacks}/${props.maxStacks}`;
				return <ResourceCounter
					containerType="circle"
					name={props.name}
					label={label}
					items={items}
					key={"resourceDisplay" + i}
				/>;
			}
			case "sen": {
				const senList = [
					{ present: props.hasSetsu, color: props.setsuColor, name: "setsu" },
					{ present: props.hasGetsu, color: props.getsuColor, name: "getsu" },
					{ present: props.hasKa, color: props.kaColor, name: "ka" },
				];
				const help = <Help
					topic={"senExplanation"}
					content={localize({
						en: "from left to right: setsu (yukikaze), getsu (gekko/mangetsu), ka (kasha/oka)",
					})}
				/>;
				return <ResourceCounter
					name={
						<>
							{props.name} {help}
						</>
					}
					label={senList
						.filter((item) => item.present)
						.map((item) => item.name)
						.join("+")}
					containerType={"circle"}
					items={senList.map((item) => {
						return {
							color: item.present ? item.color : undefined,
						};
					})}
					key={"resourceDisplay" + i}
				/>;
			}
			case "coda": {
				const codaList = [
					{ present: props.hasWanderers, color: props.wanderersColor },
					{ present: props.hasMages, color: props.magesColor },
					{ present: props.hasArmys, color: props.armysColor },
				];
				const help = <Help
					topic={"codaExplanation"}
					content={localize({
						en: "from left to right: wanderer's coda, mage's coda, army's coda",
					})}
				/>;
				return <ResourceCounter
					name={
						<>
							{props.name} {help}
						</>
					}
					containerType={"circle"}
					items={codaList.map((item) => {
						return {
							color: item.present ? item.color : undefined,
						};
					})}
					key={"resourceDisplay" + i}
				/>;
			}
			default:
				return <ResourceText
					name={props.name}
					text={props.text}
					key={"resourceDisplay" + i}
				/>;
		}
	});
	let style: CSSProperties = {
		textAlign: "left",
		// Set a minHeight to ensure buffs do not clash with the hotbar
		minHeight: "13.5em",
	};
	if (props.style) {
		style = { ...style, ...props.style };
	}
	return <div style={style}>{elements}</div>;
}

type StatusLayoutFn = (props: StatusViewProps) => React.ReactNode;

export var updateStatusDisplay = (data: StatusViewProps, layoutFn: StatusLayoutFn) => {};
export class StatusDisplay extends React.Component {
	state: StatusViewProps & {
		layoutFn: (props: StatusViewProps) => React.ReactNode;
	};
	constructor(props: StatusViewProps) {
		super(props);
		this.state = {
			time: 0,
			resources: [],
			enemyBuffs: [],
			selfBuffs: [],
			level: 100,
			layoutFn: (props: StatusViewProps) => {
				return <div />;
			},
		};
		updateStatusDisplay = (newData, newLayoutFn) => {
			this.setState({ ...{ layoutFn: newLayoutFn }, ...newData });
		};
	}
	componentDidMount() {
		controller.updateStatusDisplay(controller.game);
	}
	render() {
		return <div
			style={{
				position: "relative",
				textAlign: "left",
				margin: "8px 0",
			}}
		>
			<div style={{ position: "absolute", top: -8, right: 0, zIndex: 1 }}>
				<Help
					topic={"mainControlRegion"}
					content={
						<div className="toolTip">
							{localize({
								en: <>
									<div className="paragraph">
										<span style={{ color: "lightgray" }}>grey</span> border: not
										focused
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumpurple" }}>purple</b> border:
										receiving input
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumseagreen" }}>green</b> border:
										real-time
									</div>
									<div className="paragraph">
										<b style={{ color: "darkorange" }}>orange</b> border:
										viewing historical state, not receiving input
									</div>
								</>,
								ja: <>
									<div className="paragraph">
										<span style={{ color: "lightgray" }}>グレー</span> : 未選択
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumpurple" }}>紫</b> : 入力可
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumseagreen" }}>緑</b> : リアルタイム
									</div>
									<div className="paragraph">
										<b style={{ color: "darkorange" }}>オレンジ</b> :
										任意の時点の状態を確認中。入力不可
									</div>
								</>,
							})}
						</div>
					}
				/>
			</div>
			{this.state.layoutFn(this.state as StatusViewProps)}
		</div>;
	}
}

export class StatusPropsGenerator<T extends PlayerState> {
	state: T;

	constructor(state: T) {
		this.state = state;
	}

	makeCommonTimer(rscType: ResourceType, onSelf: boolean = true) {
		const rscCountdown = this.state.resources.timeTillReady(rscType);
		return {
			rscType,
			onSelf,
			enabled: true,
			stacks: this.state.resources.get(rscType).availableAmount(),
			timeRemaining: rscCountdown.toFixed(3),
			className: this.state.hasResourceAvailable(rscType) ? "" : "hidden",
		};
	}

	// Jobs should override this to display their enemy-targeted buffs
	public jobSpecificOtherTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	// Composes the job-specific buffs with the applicable role buffs
	public getAllOtherTargetedBuffViewProps(): BuffProps[] {
		const job = this.state.job;

		const roleEnemyBuffViewProps: BuffProps[] = [];

		if (JOBS[job].role === "TANK") {
			roleEnemyBuffViewProps.push(this.makeCommonTimer(ResourceType.Reprisal, false));
		}

		if (JOBS[job].role === "MELEE") {
			roleEnemyBuffViewProps.push(this.makeCommonTimer(ResourceType.Feint, false));
		}

		if (JOBS[job].role === "CASTER") {
			roleEnemyBuffViewProps.push(this.makeCommonTimer(ResourceType.Addle, false));
		}

		return [...this.jobSpecificOtherTargetedBuffViewProps(), ...roleEnemyBuffViewProps];
	}

	// Jobs should override this to display their self-targeted buffs
	public jobSpecificSelfTargetedBuffViewProps(): BuffProps[] {
		return [];
	}

	// Composes the job-specific buffs with the applicable role buffs
	public getAllSelfTargetedBuffViewProps(): BuffProps[] {
		const job = this.state.job;
		const resources = this.state.resources;

		const roleBuffViewProps: BuffProps[] = [];

		// Tank-only role buffs
		if (JOBS[job].role === "TANK") {
			roleBuffViewProps.push(this.makeCommonTimer(ResourceType.Rampart));
			roleBuffViewProps.push(this.makeCommonTimer(ResourceType.ShieldWall));
			roleBuffViewProps.push(this.makeCommonTimer(ResourceType.Stronghold));
			const tankLB3 = JOBS[job].limitBreakBuff;
			if (tankLB3) {
				roleBuffViewProps.push(this.makeCommonTimer(tankLB3));
			}
		}

		// Melee-only role buffs
		if (JOBS[job].role === "MELEE") {
			[ResourceType.TrueNorth, ResourceType.Bloodbath].forEach((rscType) => {
				roleBuffViewProps.push(this.makeCommonTimer(rscType));
			});
		}

		// Anti-knockback buffs should be the last role buffs displayed
		if (["TANK", "MELEE", "RANGED"].includes(JOBS[job].role)) {
			roleBuffViewProps.push(this.makeCommonTimer(ResourceType.ArmsLength));
		}

		// Healers and casters have the same self-targeting role buffs, so we can do them all in one batch
		if (["HEALER", "CASTER"].includes(JOBS[job].role)) {
			[ResourceType.Swiftcast, ResourceType.LucidDreaming, ResourceType.Surecast].forEach(
				(rscType) => {
					roleBuffViewProps.push(this.makeCommonTimer(rscType));
				},
			);
		}

		// All jobs should include Tincture and Sprint
		roleBuffViewProps.push(
			this.makeCommonTimer(ResourceType.Tincture),
			this.makeCommonTimer(ResourceType.Sprint),
		);

		// Melee jobs should end with the "I am able to hit this positional" selectors
		if (JOBS[job].role === "MELEE") {
			roleBuffViewProps.push(
				{
					rscType: ResourceType.RearPositional,
					onSelf: true,
					enabled: resources.get(ResourceType.RearPositional).enabled,
					stacks: 1,
					className: "",
				},
				{
					rscType: ResourceType.FlankPositional,
					onSelf: true,
					enabled: resources.get(ResourceType.FlankPositional).enabled,
					stacks: 1,
					className: "",
				},
			);
		}

		return [...this.jobSpecificSelfTargetedBuffViewProps(), ...roleBuffViewProps];
	}

	// Jobs should override this to display their resources
	public jobSpecificResourceViewProps(): ResourceDisplayProps[] {
		return [];
	}

	// Display the job-specific resources, including MP and the MP tick timer by defauly for jobs that use MP
	public getAllResourceViewProps(): ResourceDisplayProps[] {
		if (!JOBS[this.state.job].usesMp) {
			return this.jobSpecificResourceViewProps();
		}

		const colors = getCurrentThemeColors();
		const resources = this.state.resources;
		const timeTillNextManaTick = resources.timeTillReady(ResourceType.Mana);
		const mana = resources.get(ResourceType.Mana).availableAmount();

		return [
			{
				kind: "bar",
				name: "MP",
				color: colors.resources.mana,
				progress: mana / 10000,
				valueString: Math.floor(mana) + "/10000",
			} as ResourceBarProps,
			{
				kind: "bar",
				name: localize({
					en: "MP tick",
					zh: "跳蓝时间",
					ja: "MPティック",
				}),
				color: colors.resources.manaTick,
				progress: 1 - timeTillNextManaTick / 3,
				valueString: (3 - timeTillNextManaTick).toFixed(3) + "/3",
			} as ResourceBarProps,
			...this.jobSpecificResourceViewProps(),
		];
	}

	// override me if the standard resource layout doesn't look right (DNC as an example because it gives many buffs)
	statusLayoutFn(props: StatusViewProps): React.ReactNode {
		return <>
			<div
				style={{
					display: "inline-block",
					verticalAlign: "top",
					width: "50%",
					height: "100%",
				}}
			>
				<span style={{ display: "block", marginBottom: 10 }}>
					{localize({ en: "time: ", zh: "战斗时间：", ja: "経過時間：" })}
					{`${StaticFn.displayTime(props.time, 3)} (${props.time.toFixed(3)})`}
				</span>
				{props.resources ? (
					<ResourcesDisplay
						data={{
							level: props.level,
							resources: props.resources,
						}}
					/>
				) : undefined}
			</div>
			<div
				style={{
					position: "relative",
					display: "inline-block",
					float: "right",
					width: "50%",
				}}
			>
				{props.resourceLocks ? (
					<ResourceLocksDisplay data={props.resourceLocks} />
				) : undefined}
				<BuffsDisplay data={props.enemyBuffs} style={{ marginBottom: "3em" }} />
				<BuffsDisplay data={props.selfBuffs} />
			</div>
		</>;
	}
}
