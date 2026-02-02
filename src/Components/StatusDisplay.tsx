import React, { CSSProperties } from "react";
import { Clickable, ContentNode, Help, ProgressBar, StaticFn } from "./Common";
import { updateInvalidStatus } from "./TimelineEditor";
import type { GameState } from "../Game/GameState";
import { controller } from "../Controller/Controller";
import { MAX_ABILITY_TARGETS } from "../Controller/Common";
import { localize, localizeResourceType } from "./Localization";
import {
	getThemeColors,
	ThemeColors,
	getCurrentThemeColors,
	ColorThemeContext,
} from "./ColorTheme";
import { JOBS } from "../Game/Data/Jobs";
import { ResourceKey, RESOURCES } from "../Game/Data";
import { ROLE_RESOURCES } from "../Game/Data/Shared/Role";
import { LIMIT_BREAK_RESOURCES } from "../Game/Data/Shared/LimitBreak";

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
	rscType: ResourceKey;
	onSelf: boolean;
	enabled: boolean;
	stacks: number;
	timeRemaining?: string;
	targetNumber?: number;
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

export interface AttunementGaugeProps {
	kind: "attunement";
	aetherName: ContentNode;
	attunementName: ContentNode;
	ruby: boolean;
	topaz: boolean;
	emerald: boolean;
	attunementCount: number;
	timeRemaining: number;
	rubyColor: string;
	topazColor: string;
	emeraldColor: string;
}

export interface NadiGaugeProps {
	kind: "nadi";
	name: ContentNode;
	label: ContentNode;
	lunar: boolean;
	solar: boolean;
	lunarColor: string;
	solarColor: string;
}

export interface BeastGaugeProps {
	kind: "beast";
	name: ContentNode;
	label: ContentNode;
	chakras: ("opo" | "raptor" | "coeurl")[];
	opoColor: string;
	raptorColor: string;
	coeurlColor: string;
}

export interface ChakraGaugeProps {
	kind: "chakra";
	name: ContentNode;
	label: ContentNode;
	value: number;
	wrapCount: number;
	regularColor: string;
	overflowColor: string;
}

export interface ArcanaGaugeProps {
	kind: "arcana";
	name: ContentNode;
	currentArcanaColor: string;
	activeSlots: boolean[];
}

export interface ResourceTextProps {
	kind: "text";
	name: ContentNode;
	text: ContentNode;
	color?: string;
	className?: string;
}

export type ResourceDisplayProps =
	| ResourceBarProps
	| ResourceCounterProps
	| PaintGaugeCounterProps
	| DanceCounterProps
	| SenCounterProps
	| CodaCounterProps
	| AttunementGaugeProps
	| NadiGaugeProps
	| BeastGaugeProps
	| ChakraGaugeProps
	| ArcanaGaugeProps
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
	const colors = getCurrentThemeColors();
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
	heightPx?: number;
	widthPx?: number;
}) {
	const colors = getCurrentThemeColors();
	const width = props.heightPx ?? 30;
	const height = props.widthPx ?? 24;

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
		// If containerType is "box", then these fields are used for the box element.
		boxHeightPx?: number;
		boxWidthPx?: number;
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
				heightPx={item.boxHeightPx}
				widthPx={item.boxWidthPx}
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

function ResourceText(props: {
	name: ContentNode;
	text: ContentNode;
	color?: string;
	className?: string;
}) {
	return <div className={props.className} style={{ marginBottom: 4, lineHeight: "1.5em" }}>
		<div style={{ display: "inline-block", height: "100%", width: 108 }}>{props.name}</div>
		<div style={{ width: 200, display: "inline-block" }}>
			<div style={{ display: "inline-block", marginLeft: 6, color: props.color }}>
				{props.text}
			</div>
		</div>
	</div>;
}

const buffIcons = new Map();

export function registerBuffIcon(buff: ResourceKey, relativePath: string) {
	buffIcons.set(buff, `Buffs/${relativePath}`);
	const maxStacks = RESOURCES[buff].maximumStacks ?? 1;
	for (let i = 2; i <= maxStacks; i++) {
		buffIcons.set(
			buff + i,
			`Buffs/${relativePath.replace(RESOURCES[buff].name, RESOURCES[buff].name + i)}`,
		);
	}
}

// role buffs are registered here; job buffs should be registered in the job's respective file
Object.keys(ROLE_RESOURCES).forEach((buff) => {
	const iconName = RESOURCES[buff as ResourceKey].name;
	buffIcons.set(buff, `Buffs/Role/${iconName}.png`);
});

// Tank LBs share the same buff icon
Object.keys(LIMIT_BREAK_RESOURCES).forEach((rscType) =>
	buffIcons.set(rscType, "Buffs/Role/Tank Limit Break.png"),
);

buffIcons.set("SPRINT", "Buffs/General/Sprint.png");
buffIcons.set("TINCTURE", "Buffs/General/Tincture.png");

// rscType, stacks, timeRemaining, onSelf, enabled
function Buff(props: BuffProps) {
	let assetName: string = props.rscType;
	if (props.stacks > 1) assetName += props.stacks;
	let imgStyle: React.CSSProperties;
	if (
		props.rscType === "AUTOS_ENGAGED" ||
		props.rscType === "REAR_POSITIONAL" ||
		props.rscType === "FLANK_POSITIONAL"
	) {
		imgStyle = {
			height: 40,
			//filter: "drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.25)",
		};
	} else {
		imgStyle = { height: 40 };
	}
	const mayNotBeCanceled = RESOURCES[props.rscType].mayNotBeCanceled;
	const style: CSSProperties = {
		display: "inline-block",
		verticalAlign: "top",
		filter: props.enabled ? "none" : "grayScale(100%)",
	};
	const img = <img
		style={imgStyle}
		src={"assets/" + buffIcons.get(assetName)}
		alt={props.rscType}
	/>;
	return <div
		title={localizeResourceType(props.rscType)}
		className={props.className + " buff " + props.rscType}
	>
		{mayNotBeCanceled ? (
			<div style={style}>{img}</div>
		) : (
			<Clickable
				content={img}
				style={style}
				onClickFn={() => {
					// Self-buffs and enemy DoTs may be toggled
					if (props.onSelf || props.targetNumber !== undefined) {
						console.log("UI TOGGLE", props.targetNumber);
						controller.requestToggleBuff(props.rscType, true, props.targetNumber);
						controller.updateStatusDisplay(controller.game);
						controller.updateSkillButtons(controller.game);
						controller.autoSave();
						updateInvalidStatus();
					}
				}}
			/>
		)}
		{/* When the buff has no timer, we still want it to align with other buffs, so just pad some empty space */}
		<span
			className={"buff-label"}
			style={{ visibility: props.timeRemaining === undefined ? "hidden" : undefined }}
		>
			{/* TODO:TARGET spruce up */}
			{(props.timeRemaining ?? "0.000") +
				(props.targetNumber !== undefined ? ` (\u2192 ${props.targetNumber})` : "")}
		</span>
	</div>;
}

export function BuffsDisplay(props: { data: BuffProps[]; style?: CSSProperties }) {
	const buffs = props.data;
	const buffElems: React.ReactNode[] = [];
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
	const colors = getCurrentThemeColors();
	const data = props.data;
	const gcd = <ResourceBar
		name={"GCD"}
		color={colors.resources.gcdBar}
		progress={data.gcdReady ? 0 : 1 - data.timeTillGCDReady / data.gcd}
		value={data.timeTillGCDReady.toFixed(3)}
		width={100}
		hidden={data.gcdReady}
	/>;
	const tax = <ResourceBar
		name={"casting/taxed"}
		color={data.canMove ? colors.resources.gcdBar : colors.resources.lockBar}
		progress={data.castLocked ? 1 - data.castLockCountdown / data.castLockTotalDuration : 0}
		value={data.castLockCountdown.toFixed(3)}
		width={100}
		hidden={!data.castLocked}
	/>;
	const anim = <ResourceBar
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
				const items: { color?: string; imgUrl?: string }[] = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({
						color: i < props.currentStacks ? props.color : undefined,
					});
				}
				return <ResourceCounter
					containerType={"circle"}
					name={props.name}
					label={props.valueString ?? `${props.currentStacks}/${props.maxStacks}`}
					items={items}
					key={"resourceDisplay" + i}
				/>;
			}
			case "paint": {
				const items: { color?: string; imgUrl?: string }[] = [];
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
				const label = `${props.currentStacks}/${props.maxStacks}`;
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
				const stackColors = [
					props.emboiteColor,
					props.entrechatColor,
					props.jeteColor,
					props.pirouetteColor,
				];
				const items: { color?: string; imgUrl?: string }[] = [];
				for (let i = 0; i < props.maxStacks; i++) {
					items.push({ color: i < currentStacks ? stackColors[i] : undefined });
				}
				const label = `${currentStacks}/${props.maxStacks}`;
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
						zh: "从左到右：雪闪（雪风），月闪（月光/满月），花闪（花车/樱花）",
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
			case "attunement": {
				// Ideally we would have the gems + # of attunements displayed right next
				// to each other like in game, but this isn't possible to conveniently compose
				// using ResourceCounter and ResourceBar. Instead, we just make two separate gauges.
				const gemList = [
					{ gem: props.ruby, color: props.rubyColor },
					{ gem: props.topaz, color: props.topazColor },
					{ gem: props.emerald, color: props.emeraldColor },
				];
				return <div key={"resourceDisplay" + i}>
					<ResourceCounter
						name={props.aetherName}
						containerType={"circle"}
						items={gemList.map((item) => {
							return { color: item.gem ? item.color : undefined };
						})}
					/>
					<ResourceText
						name={props.attunementName}
						text={
							props.attunementCount.toString() +
							(props.attunementCount > 0
								? ` | ${props.timeRemaining.toFixed(3)}`
								: "")
						}
					/>
				</div>;
			}
			case "nadi": {
				return <div key={"resourceDisplay" + i}>
					<ResourceCounter
						name={props.name}
						label={props.label}
						containerType={"circle"}
						items={[
							{
								color: props.lunar ? props.lunarColor : undefined,
							},
							{
								color: props.solar ? props.solarColor : undefined,
							},
						]}
					/>
				</div>;
			}
			case "beast": {
				const items: { color: string | undefined }[] = new Array(3).map((i) => {
					return { color: undefined };
				});
				props.chakras.map((value, i) => {
					items[i] = {
						color:
							value === "opo"
								? props.opoColor
								: value === "raptor"
									? props.raptorColor
									: value === "coeurl"
										? props.coeurlColor
										: undefined,
					};
				});
				return <div key={"resourceDisplay" + i}>
					<ResourceCounter
						name={props.name}
						label={props.label}
						containerType={"circle"}
						items={items}
					/>
				</div>;
			}
			case "chakra": {
				const hasOverflow = props.value > props.wrapCount;
				const modValue = hasOverflow ? props.value % props.wrapCount : props.value;
				const items: { color: string | undefined }[] = new Array(props.wrapCount);
				for (let i = 0; i < props.wrapCount; i++) {
					items[i] = {
						color: hasOverflow
							? i + 1 > modValue
								? props.regularColor
								: props.overflowColor
							: i + 1 > modValue
								? undefined
								: props.regularColor,
					};
				}
				return <div key={"resourceDisplay" + i}>
					<ResourceCounter
						name={props.name}
						label={props.label}
						containerType={"circle"}
						items={items}
					/>
				</div>;
			}
			case "arcana": {
				const items: { color: string | undefined }[] = props.activeSlots.map((slot, i) => {
					// Display minor arcana smaller than the rest
					const h = i === props.activeSlots.length - 1 ? 18 : 20;
					const w = i === props.activeSlots.length - 1 ? 16 : 20;
					return {
						color: slot ? props.currentArcanaColor : undefined,
						boxHeightPx: h,
						boxWidthPx: w,
					};
				});
				return <div key={"resourceDisplay" + i}>
					<ResourceCounter name={props.name} containerType={"box"} items={items} />
				</div>;
			}
			default:
				return <ResourceText
					name={props.name}
					text={props.text}
					color={props.color}
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

export let updateStatusDisplay = (
	data: (color: ThemeColors) => StatusViewProps,
	layoutFn: StatusLayoutFn,
) => {};
export class StatusDisplay extends React.Component {
	state: StatusViewProps & {
		layoutFn: (props: StatusViewProps) => React.ReactNode;
	};

	static contextType = ColorThemeContext;
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
		updateStatusDisplay = (newDataFn, newLayoutFn) => {
			// @ts-expect-error we need to read untyped this.context in place of a useContext hook
			const newData = newDataFn(getThemeColors(this.context));
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
										up-to-date, receiving input
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumseagreen" }}>green</b> border:
										real-time
									</div>
									<div className="paragraph">
										<b style={{ color: "darkorange" }}>orange</b> border:
										viewing historical state, receiving input
									</div>
								</>,
								zh: <>
									<div className="paragraph">
										<span style={{ color: "lightgray" }}>灰色</span>边框：未选中
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumpurple" }}>紫色</b>
										边框：正在接收输入
									</div>
									<div className="paragraph">
										<b style={{ color: "mediumseagreen" }}>绿色</b>
										边框：正在进行实时动作
									</div>
									<div className="paragraph">
										<b style={{ color: "darkorange" }}>橙色</b>
										边框：正在查看历史状态，可接收输入
									</div>
								</>,
								ja: <>
									{/* TODO JA OUTDATED */}
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

export class StatusPropsGenerator<T extends GameState> {
	state: T;

	constructor(state: T) {
		this.state = state;
	}

	makeCommonTimer(rscType: ResourceKey, onSelf: boolean = true): BuffProps {
		const rscCountdown = this.state.resources.timeTillReady(rscType);
		const resource = this.state.resources.get(rscType);

		return {
			rscType,
			onSelf,
			enabled: resource.enabled,
			stacks: resource.availableAmount(),
			timeRemaining: rscCountdown.toFixed(3),
			className: resource.availableAmountIncludingDisabled() > 0 ? "" : "hidden",
		};
	}

	makeTargetedTimers(rscType: ResourceKey): BuffProps[] {
		return Array(MAX_ABILITY_TARGETS)
			.fill(0)
			.map((_, i) => {
				const targetNumber = i + 1;
				const rscCountdown = this.state.debuffs.timeTillExpiry(rscType, targetNumber);
				const resource = this.state.debuffs.get(rscType, targetNumber);
				return {
					rscType,
					onSelf: false,
					targetNumber,
					enabled: resource.enabled,
					stacks: resource.availableAmount(),
					timeRemaining: rscCountdown.toFixed(3),
					className: resource.availableAmountIncludingDisabled() > 0 ? "" : "hidden",
				};
			});
	}

	makeToggleableTimer(rscType: ResourceKey, onSelf: boolean = true): BuffProps {
		const rscCountdown = this.state.resources.timeTillReady(rscType);
		const resource = this.state.resources.get(rscType);

		return {
			rscType,
			onSelf,
			enabled: resource.enabled,
			stacks: resource.availableAmount(),
			timeRemaining: rscCountdown.toFixed(3),
			className: resource.availableAmountIncludingDisabled() > 0 ? "" : "hidden",
		};
	}

	makeCommonTimerless(rscType: ResourceKey, onSelf: boolean = true): BuffProps {
		return {
			rscType,
			onSelf,
			enabled: true,
			stacks: this.state.resources.get(rscType).availableAmount(),
			className: this.state.hasResourceAvailable(rscType) ? "" : "hidden",
		};
	}

	makeToggleableTimerless(rscType: ResourceKey, onSelf: boolean = true): BuffProps {
		const resource = this.state.resources.get(rscType);

		return {
			rscType,
			onSelf,
			enabled: resource.enabled,
			stacks: resource.availableAmount(),
			className: resource.availableAmountIncludingDisabled() > 0 ? "" : "hidden",
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
			roleEnemyBuffViewProps.push(this.makeCommonTimer("REPRISAL", false));
		}

		if (JOBS[job].role === "MELEE") {
			roleEnemyBuffViewProps.push(this.makeCommonTimer("FEINT", false));
		}

		if (JOBS[job].role === "CASTER") {
			roleEnemyBuffViewProps.push(this.makeCommonTimer("ADDLE", false));
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
			roleBuffViewProps.push(
				...(["RAMPART", "SHIELD_WALL", "STRONGHOLD"] as ResourceKey[]).map((key) =>
					this.makeCommonTimer(key),
				),
			);
			const tankLB3 = JOBS[job].limitBreakBuff ?? "UNKNOWN";
			if (tankLB3) {
				roleBuffViewProps.push(this.makeCommonTimer(tankLB3));
			}
		}

		// Melee-only role buffs
		if (JOBS[job].role === "MELEE") {
			roleBuffViewProps.push(
				...(["TRUE_NORTH", "BLOODBATH"] as ResourceKey[]).map((rscType) =>
					this.makeCommonTimer(rscType),
				),
			);
		}

		// Anti-knockback buffs should be the last role buffs displayed
		if (["TANK", "MELEE", "RANGED"].includes(JOBS[job].role)) {
			roleBuffViewProps.push(this.makeCommonTimer("ARMS_LENGTH"));
		}

		// Healers and casters have the same self-targeting role buffs, so we can do them all in one batch
		if (["HEALER", "CASTER"].includes(JOBS[job].role)) {
			roleBuffViewProps.push(
				...(["SWIFTCAST", "LUCID_DREAMING", "SURECAST"] as ResourceKey[]).map((rscType) =>
					this.makeCommonTimer(rscType),
				),
			);
		}

		// All jobs should include Tincture and Sprint
		roleBuffViewProps.push(this.makeCommonTimer("TINCTURE"), this.makeCommonTimer("SPRINT"));

		// Melee jobs should end with the "I am able to hit this positional" selectors
		if (JOBS[job].role === "MELEE") {
			roleBuffViewProps.push(
				...(["REAR_POSITIONAL", "FLANK_POSITIONAL"] as ResourceKey[]).map((key) => {
					return {
						rscType: key,
						onSelf: true,
						enabled: resources.get(key).enabled,
						stacks: 1,
						className: "",
					};
				}),
			);
		}

		if (JOBS[job].role === "TANK" || JOBS[job].role === "MELEE") {
			roleBuffViewProps.push(
				...(["AUTOS_ENGAGED"] as ResourceKey[]).map((key) => {
					return {
						rscType: key,
						onSelf: true,
						enabled: resources.get(key).available(1),
						stacks: 1,
						className: "",
					};
				}),
			);
		}

		return [...this.jobSpecificSelfTargetedBuffViewProps(), ...roleBuffViewProps];
	}

	// Jobs should override this to display their resources
	public jobSpecificResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		return [];
	}

	// Display the job-specific resources, including MP and the MP tick timer by defauly for jobs that use MP
	public getAllResourceViewProps(colors: ThemeColors): ResourceDisplayProps[] {
		if (!JOBS[this.state.job].usesMp) {
			return this.jobSpecificResourceViewProps(colors);
		}

		const resources = this.state.resources;
		const timeTillNextManaTick = resources.timeTillReady("MANA");
		const mana = resources.get("MANA").availableAmount();

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
			...this.jobSpecificResourceViewProps(colors),
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
