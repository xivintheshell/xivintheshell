import React, { ChangeEvent, CSSProperties, ReactNode, useEffect, useState } from "react";
import jQuery from "jquery";
import { localize } from "./Localization";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { getCurrentThemeColors } from "./ColorTheme";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { MAX_TIMELINE_SLOTS } from "../Controller/Timeline";
import { LiaWindowMinimize } from "react-icons/lia";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export type ContentNode = JSX.Element | string;

export type ValueChangeEvent = React.ChangeEvent<{ value: string }>;

const MAX_BUFF_COVERS_COUNT = 3;
export const TimelineDimensions = {
	rulerHeight: 30,
	trackHeight: 14,

	slotPaddingTop: 4,
	damageMarkerHeight: 8, // actually only 6, leave 2px additional padding
	skillButtonHeight: 28,
	buffCoverHeight: 4,
	slotPaddingBottom: 4,

	renderSlotHeight: () => {
		return (
			TimelineDimensions.slotPaddingTop + // 4
			TimelineDimensions.damageMarkerHeight + // 8
			TimelineDimensions.skillButtonHeight * 1.5 + // 42
			TimelineDimensions.buffCoverHeight * MAX_BUFF_COVERS_COUNT + // 12
			TimelineDimensions.slotPaddingBottom
		); // 4
	},
	timelineCanvasHeight: (numMarkerTracks: number, numTimelineSlots: number) => {
		let height = TimelineDimensions.rulerHeight;
		height += TimelineDimensions.trackHeight * numMarkerTracks;
		height += TimelineDimensions.renderSlotHeight() * numTimelineSlots;
		if (numTimelineSlots < MAX_TIMELINE_SLOTS) {
			height += TimelineDimensions.addSlotButtonHeight;
		}
		return height;
	},

	leftBufferWidth: 20, // leave this much space on the left before starting to draw timeline (for timeline selection bar)
	addSlotButtonHeight: 20,
};

export type TimelineDrawOptions = {
	drawDamageMarks: boolean;
	drawMPTickMarks: boolean;
	drawBuffIndicators: boolean;
};
export const DEFAULT_TIMELINE_OPTIONS = {
	drawMarkers: true,
	drawDamageMarks: true,
	drawMPTickMarks: true,
	drawBuffIndicators: true,
};

function getBlobUrl(content: object) {
	let blob = new Blob([JSON.stringify(content)], { type: "text/plain;charset=utf-8" });
	return window.URL.createObjectURL(blob);
}

function getCsvUrl(rawContent: object) {
	let csvString = "";
	let content = rawContent as Array<Array<any>>;
	content.forEach((row) => {
		for (let i = 0; i < row.length; i++) {
			csvString += row[i].toString();
			if (i < row.length - 1) csvString += ",";
		}
		csvString += "\n";
	});
	let blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
	return window.URL.createObjectURL(blob);
}

export const enum FileFormat {
	Json = "JSON",
	Csv = "CSV",
	Png = "PNG",
}

type SaveToFileProps = {
	getContentFn: () => object;
	filename: string;
	fileFormat: FileFormat;
	displayName?: ContentNode;
};
export class SaveToFile extends React.Component {
	props: SaveToFileProps;
	state: { jsonContent: object; csvContent: Array<Array<any>>; pngContent?: HTMLCanvasElement };
	constructor(props: SaveToFileProps) {
		super(props);
		this.props = props;
		this.state = {
			jsonContent: {},
			csvContent: [],
			pngContent: undefined,
		};
	}
	updateContent() {
		let newContent = this.props.getContentFn();
		if (this.props.fileFormat === FileFormat.Json) this.setState({ jsonContent: newContent });
		else if (this.props.fileFormat === FileFormat.Csv)
			this.setState({ csvContent: newContent });
		else if (this.props.fileFormat === FileFormat.Png) {
			this.setState({ pngContent: newContent });
		} else console.assert(false);
	}
	render() {
		let url = "";
		if (this.props.fileFormat === FileFormat.Json) url = getBlobUrl(this.state.jsonContent);
		else if (this.props.fileFormat === FileFormat.Csv) url = getCsvUrl(this.state.csvContent);
		else if (this.props.fileFormat === FileFormat.Png) {
			url = this.state.pngContent?.toDataURL() ?? "";
		} else console.assert(false);
		return <a
			style={{ color: getCurrentThemeColors().fileDownload, marginRight: 6 }}
			href={url}
			download={this.props.filename}
			onClick={() => {
				this.updateContent();
			}}
			onContextMenu={() => {
				this.updateContent();
			}}
		>
			{"[" +
				(this.props.displayName === undefined ? "download" : this.props.displayName) +
				"]"}
		</a>;
	}
}

//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
export function loadFromFile(
	fileObject: Blob,
	callback = (content: object) => {
		console.log(content);
	},
) {
	let fileReader = new FileReader();
	fileReader.onload = function (fileLoadedEvent) {
		let str: string = fileLoadedEvent.target?.result?.toString() ?? "";
		let json;
		try {
			json = JSON.parse(str);
		} catch (e) {
			window.alert(
				localize({
					en: "Parse error! Are you sure this is the correct file? This tool only reads text files in JSON format.",
					zh: "解析出错- 你确定文件没选错吗？本工具只读取JSON格式的文本文件",
				}),
			);
		}
		callback(json);
	};
	fileReader.readAsText(fileObject, "UTF-8");
}

export const StaticFn = {
	positionFromTimeAndScale: function (time: number, scale: number): number {
		return time * scale * 100;
	},
	timeFromPositionAndScale: function (x: number, scale: number): number {
		return x / (scale * 100);
	},
	displayTime: function (time: number, fractionDigits: number) {
		let absTime = Math.abs(time);
		let minute = Math.floor(absTime / 60);
		let second = absTime - 60 * minute;
		return (
			(time < 0 ? "-" : "") +
			minute.toString() +
			":" +
			(second < 10 ? "0" : "") +
			second.toFixed(fractionDigits).toString()
		);
	},
};

let genericErrorHandler = function (err: object) {
	console.log("[asyncFetch] some error occurred");
};
let fetchCache: Map<string, string> = new Map();
export function asyncFetch(
	url: string,
	callback: (content: string) => void,
	errorCallback: (err: object) => void = genericErrorHandler,
) {
	let cachedContent = fetchCache.get(url);
	if (cachedContent) {
		callback(cachedContent);
		return;
	}
	jQuery.ajax({
		type: "GET",
		url: url,
		//dataType: "text",
		success: (data) => {
			callback(data);
			fetchCache.set(url, data);
		},
		error: errorCallback,
		async: true,
	});
}

export function parseTime(timeStr: string): number {
	let val = timeStr.trim();
	let sign = 1;
	if (timeStr[0] === "-") {
		sign = -1;
		timeStr = timeStr.substring(1);
	}
	let colonIndex = val.indexOf(":");
	if (colonIndex < 0) {
		return parseFloat(val);
	}
	let minute = parseInt(val.substring(0, colonIndex));
	let second = parseFloat(val.substring(colonIndex + 1));
	return sign * (minute * 60 + second);
}

type ClickableProps = {
	content?: ReactNode;
	onClickFn?: (e: any) => void;
	style?: CSSProperties;
};

export function Clickable(props: ClickableProps) {
	return <div className={"clickable"} onClick={props.onClickFn} style={props.style}>
		{props.content}
	</div>;
}

export function ProgressBar(props: {
	progress: number;
	backgroundColor?: string;
	width: number;
	labelColor?: string;
	offsetY: number;
}) {
	let colors = getCurrentThemeColors();
	const containerStyle: CSSProperties = {
		position: "relative",
		display: "inline-block",
		verticalAlign: "top",
		border: "1px solid " + colors.bgHighContrast,
		borderRadius: 4,
		height: 8,
		top: props.offsetY,
		width: props.width,
	};
	const fillerStyle: CSSProperties = {
		background: `${props.backgroundColor}`,
		height: "100%",
		borderRadius: "inherit",
		width: `${props.progress * 100}%`,
	};
	return <div style={containerStyle}>
		<div style={fillerStyle} />
	</div>;
}

export type TabItem = {
	titleNode: ContentNode;
	contentNode: ContentNode;
};

export const TABS_TITLE_HEIGHT = 26;
export function Tabs(props: {
	uniqueName: string;
	content: TabItem[];
	collapsible: boolean;
	scrollable: boolean;
	height: number;
	maxWidth?: number;
	defaultSelectedIndex: number | undefined;
	style?: CSSProperties;
}) {
	const titleHeight = TABS_TITLE_HEIGHT - 2; // the top and bottom border each takes up 1px
	const [selectedIndex, setSelectedIndex] = React.useState<number | undefined>(undefined);

	// initialization
	useEffect(() => {
		let selected: number | undefined = props.defaultSelectedIndex;
		// if a cached value exists, it will always override the default
		let cachedSelected = getCachedValue("tabs: " + props.uniqueName);
		if (cachedSelected !== null) {
			if (cachedSelected === "none") {
				selected = undefined;
			} else {
				selected = parseInt(cachedSelected);
			}
		}
		setSelectedIndex(selected);
	}, [props.defaultSelectedIndex, props.uniqueName]);

	const colors = getCurrentThemeColors();

	const tabStyle: (tabIndex: number) => CSSProperties = function (tabIndex) {
		const borderColor: string =
			tabIndex === selectedIndex ? colors.bgHighContrast : colors.bgMediumContrast;
		const visibleBorder = "1px solid " + borderColor;
		const invisibleBorder = "1px solid " + colors.background;

		let borderBottom: string = visibleBorder;
		if (tabIndex === selectedIndex || selectedIndex === undefined) {
			borderBottom = invisibleBorder;
		}
		let borderTop = tabIndex === selectedIndex ? visibleBorder : invisibleBorder;
		let borderLeft = invisibleBorder;
		let borderRight = invisibleBorder;
		if (tabIndex === selectedIndex) {
			borderLeft = visibleBorder;
			borderRight = visibleBorder;
		} else if (
			tabIndex > 0 && // not the first tab
			(selectedIndex === undefined || selectedIndex + 1 !== tabIndex) // collapsed || not immediately to the right of selected
		) {
			borderLeft = visibleBorder;
		}
		return {
			margin: 0,
			display: "inline-block",
			boxSizing: "border-box",
			padding: "0 12px",
			borderBottom: borderBottom,
			borderTop: borderTop,
			borderLeft: borderLeft,
			borderRight: borderRight,
			lineHeight: `${titleHeight}px`,
			color: tabIndex === selectedIndex ? colors.emphasis : colors.text,
			cursor: props.collapsible || tabIndex !== selectedIndex ? "pointer" : "default",
		};
	};

	const titles: ContentNode[] = [];
	let content: ContentNode[] = [];
	for (let i = 0; i < props.content.length; i++) {
		const tab = props.content[i];
		const isSelectedTab = i === selectedIndex;

		titles.push(
			<span
				key={i}
				style={tabStyle(i)}
				onClick={() => {
					let newIndex: number | undefined = selectedIndex;
					if (!isSelectedTab) {
						newIndex = i;
					} else if (props.collapsible) {
						newIndex = undefined;
					}
					setSelectedIndex(newIndex);
					setCachedValue(
						"tabs: " + props.uniqueName,
						newIndex === undefined ? "none" : `${newIndex}`,
					);
				}}
			>
				{tab.titleNode}
			</span>,
		);

		const contentStyle: CSSProperties = {
			display: isSelectedTab ? "block" : "none",
		};
		if (props.maxWidth !== undefined) {
			contentStyle.maxWidth = props.maxWidth;
		}
		content.push(
			<div key={i} style={contentStyle}>
				{tab.contentNode}
			</div>,
		);
	}

	if (props.collapsible && selectedIndex !== undefined) {
		titles.push(
			<span
				key={titles.length}
				onClick={() => {
					setSelectedIndex(undefined);
					setCachedValue("tabs: " + props.uniqueName, "none");
				}}
			>
				<LiaWindowMinimize
					style={{
						marginLeft: 16,
						fontSize: 14,
						cursor: "pointer",
						position: "relative",
						top: 3,
					}}
				/>
			</span>,
		);
	}

	const isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;
	return <div
		style={{
			...{
				position: "relative",
			},
			...props.style,
		}}
	>
		<div>{titles}</div>
		<div
			className={props.scrollable ? "visibleScrollbar" : undefined}
			style={{
				display: selectedIndex === undefined ? "none" : "block",
				height: props.height - TABS_TITLE_HEIGHT,
				boxSizing: "border-box",
				padding: `10px ${isFirefox ? 15 : 5}px`,
				overflowY: props.scrollable ? "scroll" : "hidden",
			}}
		>
			{content}
		</div>
	</div>;
}

export function Columns(props: {
	contentHeight: number;
	children: {
		content: ContentNode;
		title?: ContentNode;
		fullBorder?: boolean;
		defaultSize?: number;
		minSize?: number;
	}[];
}) {
	let colors = getCurrentThemeColors();
	let children: React.ReactNode[] = [];
	for (let i = 0; i < props.children.length; i++) {
		const column = props.children[i];
		const nextColumn = i < props.children.length - 1 ? props.children[i + 1] : undefined;
		children.push(
			<Panel
				key={`column-${i}`}
				className={"invisibleScrollbar"}
				defaultSize={column.defaultSize}
				minSize={column.minSize ?? 20}
				style={{
					border:
						column.fullBorder === true
							? `1px solid ${colors.bgMediumContrast}`
							: undefined,
					boxSizing: "border-box",
					height: props.contentHeight,
					overflowY: "scroll",
				}}
			>
				{column.title ? (
					<div style={{ marginBottom: 10 }}>
						<b>{column.title}</b>
					</div>
				) : undefined}
				{column.content}
			</Panel>,
		);

		if (i < props.children.length - 1) {
			const adjacentToBorder: boolean =
				column.fullBorder === true ||
				(nextColumn !== undefined && nextColumn.fullBorder === true);
			const style: CSSProperties = adjacentToBorder
				? {
						margin: "0 5px",
					}
				: {
						borderLeft: "1px solid " + colors.bgMediumContrast,
						margin: "0 15px 0 10px",
					};
			children.push(<PanelResizeHandle key={`divider-${i}`} style={style} />);
		}
	}
	return <PanelGroup direction="horizontal">{children}</PanelGroup>;
}

type InputProps = {
	defaultValue?: string;
	description: ContentNode;
	onChange?: (newVal: string) => void;
	width?: number;
	style?: CSSProperties;
	componentColor?: string; // overrides entire component's color
};
export class Input extends React.Component {
	props: InputProps;
	onChange;
	constructor(inProps: InputProps) {
		super(inProps);
		this.props = inProps;
		this.onChange = (e: ChangeEvent<{ value: string }>) => {
			if (this.props.onChange) this.props.onChange(e.target.value);
		};
	}
	render() {
		let width = this.props.width ?? 5;
		let inputStyle: CSSProperties = {
			color:
				this.props.style?.color ??
				this.props.componentColor ??
				getCurrentThemeColors().text,
			backgroundColor: "transparent",
			outline: "none",
			border: "none",
			borderBottom:
				"1px solid " + (this.props.componentColor ?? getCurrentThemeColors().text),
		};
		let overrideStyle = this.props.style ?? {};
		return <div style={{ ...overrideStyle, ...{ color: this.props.componentColor } }}>
			<span>{this.props.description /* + "(" + this.state.value + ")"*/}</span>
			<input
				style={inputStyle}
				size={width}
				type="text"
				value={this.props.defaultValue}
				onChange={this.onChange}
			/>
		</div>;
	}
}

type SliderProps = {
	uniqueName: string;
	onChange?: (e: string) => void;
	defaultValue?: string;
	description?: ContentNode;
	style?: CSSProperties;
};
type SliderState = {
	value: string;
};
export class Slider extends React.Component {
	props: SliderProps = {
		uniqueName: "anonSlider",
		defaultValue: "default slider value",
		description: "default description",
	};
	state: SliderState;
	onChange: (e: ChangeEvent<{ value: string }>) => void;
	constructor(inProps: SliderProps) {
		super(inProps);
		this.props = inProps;
		this.state = {
			value: inProps.defaultValue ?? "",
		};
		this.onChange = (e: ChangeEvent<{ value: string }>) => {
			this.setState({ value: e.target.value });
			if (this.props.onChange) {
				this.props.onChange(e.target.value);
			}
			setCachedValue("slider: " + this.props.uniqueName, e.target.value);
		};
	}
	componentDidMount() {
		let initialValue = this.state.value;
		let str = getCachedValue("slider: " + this.props.uniqueName);
		if (str !== null) {
			initialValue = str;
			this.setState({ value: initialValue });
		}
		if (this.props.onChange) {
			this.props.onChange(initialValue);
		}
	}
	render() {
		return <div style={{ ...{ display: "inline-block" }, ...this.props.style }}>
			<span>{this.props.description ?? ""}</span>
			<input
				size={10}
				type="range"
				value={this.state.value}
				min={0.05}
				max={1}
				step={0.025}
				onChange={this.onChange}
				style={{ position: "relative", outline: "none" }}
			/>
		</div>;
	}
}

export function Checkbox(props: {
	uniqueName: string;
	label: ContentNode;
	onChange: (newValue: boolean) => void;
	defaultChecked?: boolean;
}) {
	const [checked, setChecked] = useState<boolean>(false);
	useEffect(() => {
		let defaultChecked = props.defaultChecked ?? true;
		let str = getCachedValue("checked: " + props.uniqueName);
		if (str !== null) {
			defaultChecked = parseInt(str) > 0;
		}
		setChecked(defaultChecked);
		props.onChange(defaultChecked);
		// myn: props really shouldn't update so should be fine to not have them in deps array..
		// eslint-disable-next-line
	}, []);
	const checkboxStyle: CSSProperties = {
		position: "relative",
		top: 3,
		marginRight: "0.25em",
	};
	return <div style={{ marginBottom: 5 }}>
		<input
			type="checkbox"
			onChange={(e) => {
				let newVal = e.currentTarget.checked;
				setChecked(newVal);
				setCachedValue("checked: " + props.uniqueName, newVal ? "1" : "0");
				props.onChange(newVal);
			}}
			checked={checked}
			style={checkboxStyle}
		/>
		<span>{props.label}</span>
	</div>;
}

export class ScrollAnchor extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	constructor(props: {}) {
		super(props);
		this.myRef = React.createRef();
	}
	scroll() {
		if (this.myRef.current) {
			this.myRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}
	render() {
		this.scroll();
		return <div ref={this.myRef} />;
	}
}

type ExpandableProps = {
	title: string;
	autoIndent?: boolean;
	noMargin?: boolean;
	titleNode?: ReactNode;
	defaultShow?: boolean;
	content?: ReactNode;
	onExpand?: () => void;
	onCollapse?: () => void;
};
type ExpandableState = {
	show: boolean;
};
export class Expandable extends React.Component {
	props: ExpandableProps = { title: "(expand me)" };
	state: ExpandableState = { show: false };
	autoIndent: boolean = true;
	onClick: () => void;
	constructor(inProps: ExpandableProps) {
		super(inProps);
		this.props = inProps;
		if (inProps.autoIndent === false) this.autoIndent = false;
		this.onClick = () => {
			let newShow = !this.state.show;
			this.setState({ show: newShow });
			if (this.props.onExpand && newShow) this.props.onExpand();
			if (this.props.onCollapse && !newShow) this.props.onCollapse();
			setCachedValue("exp: " + inProps.title, (newShow ? 1 : 0).toString());
		};

		let expanded = getCachedValue("exp: " + inProps.title);
		let show: boolean = inProps.defaultShow ?? false;
		if (expanded !== null) {
			show = parseInt(expanded) === 1;
		}
		this.state = {
			show: show,
		};
	}
	render() {
		let indentDivStyle = this.autoIndent
			? { margin: 10, paddingLeft: 6, marginBottom: 20 }
			: {};
		return <div style={this.props.noMargin ? {} : { marginTop: 10, marginBottom: 10 }}>
			<Clickable
				content={
					<span>
						<span>{this.state.show ? "- " : "+ "}</span>
						{this.props.titleNode ? this.props.titleNode : this.props.title}
					</span>
				}
				onClickFn={this.onClick}
			/>
			<div style={{ position: "relative", display: this.state.show ? "block" : "none" }}>
				<div style={indentDivStyle}>{this.props.content}</div>
			</div>
		</div>;
	}
}

type LoadJsonFromFileOrUrlProps = {
	allowLoadFromUrl: boolean;
	defaultLoadUrl?: string;
	loadUrlOnMount: boolean;
	label?: ContentNode;
	onLoadFn: (content: object) => void;
};
export class LoadJsonFromFileOrUrl extends React.Component {
	loadUrl: string;
	fileSelectorRef: React.RefObject<HTMLInputElement>;
	props: LoadJsonFromFileOrUrlProps;

	onLoadUrlChange: (evt: ChangeEvent<{ value: string }>) => void;
	onLoadPresetFile: () => void;
	onLoadUrl: () => void;
	constructor(inProps: LoadJsonFromFileOrUrlProps) {
		super(inProps);
		this.props = inProps;
		this.fileSelectorRef = React.createRef();
		this.loadUrl = inProps.defaultLoadUrl ?? "";

		this.onLoadUrlChange = (evt: ChangeEvent<{ value: string }>) => {
			if (evt.target) this.loadUrl = evt.target.value;
		};

		this.onLoadPresetFile = () => {
			let cur = this.fileSelectorRef.current;
			if (cur && cur.files && cur.files.length > 0) {
				let fileToLoad = cur.files[0];
				loadFromFile(fileToLoad, (content) => {
					this.props.onLoadFn(content);
				});
				cur.value = "";
			}
		};

		this.onLoadUrl = () => {
			let errorHandler = function (e: any) {
				console.log("some error occurred");
			};
			asyncFetch(
				this.loadUrl,
				(data) => {
					try {
						let content = JSON.parse(data);
						this.props.onLoadFn(content);
					} catch (e: any) {
						errorHandler(e);
					}
				},
				(e) => {
					errorHandler(e);
				},
			);
		};
	}
	componentDidMount() {
		if (this.props.loadUrlOnMount) this.onLoadUrl();
	}
	render() {
		let colors = getCurrentThemeColors();
		let longInputStyle = {
			color: colors.text,
			background: "transparent",
			outline: "none",
			border: "none",
			borderBottom: "1px solid " + colors.text,
			width: "30em",
		};
		return <div>
			<div>
				<span>
					{this.props.label ?? localize({ en: "Load from file: ", zh: "从文件导入：" })}
				</span>
				<input
					style={{
						width: "110px",
						color: "transparent",
					}}
					type="file"
					ref={this.fileSelectorRef}
					onChange={this.onLoadPresetFile}
				/>
			</div>
			{this.props.allowLoadFromUrl ? (
				<form>
					<span>{localize({ en: "Load from URL: ", zh: "从URL导入：" })}</span>
					<input
						defaultValue={this.loadUrl}
						style={longInputStyle}
						onChange={this.onLoadUrlChange}
					/>
					<span> </span>
					<button
						type={"submit"}
						onClick={(e) => {
							this.onLoadUrl();
							e.preventDefault();
						}}
					>
						{localize({ en: "load", zh: "加载" })}
					</button>
				</form>
			) : undefined}
		</div>;
	}
}

export function ButtonIndicator(props: { text: ContentNode }) {
	let colors = getCurrentThemeColors();
	return <span
		style={{
			fontSize: 11,
			border: "1px solid " + colors.bgHighContrast,
			borderRadius: 2,
			padding: "1px 4px",
			background: colors.bgLowContrast,
		}}
	>
		{props.text}
	</span>;
}

let setGlobalHelpTooltipContent = (newContent: ContentNode) => {};

export function GlobalHelpTooltip(props: { content: ContentNode }) {
	const [tipContent, setTipContent] = useState(props.content);
	// hook up update function
	useEffect(() => {
		setGlobalHelpTooltipContent = (newContent: ContentNode) => {
			setTipContent(newContent);
		};
	}, []);

	let colors = getCurrentThemeColors();

	return <div>
		<style>{`
			.help-tooltip {
				color: ${colors.text};
				background-color: ${colors.tipBackground};
				opacity: 0.98;
				max-width: 300px;
				outline: 1px solid ${colors.bgHighContrast};
				transition: none;
				font-size: 100%;
				z-index: 10;
			}
			.help-tooltip-arrow { display: none; }
		`}</style>
		<ReactTooltip
			anchorSelect=".global-help-tooltip"
			className="help-tooltip"
			classNameArrow="help-tooltip-arrow"
		>
			{tipContent}
		</ReactTooltip>
	</div>;
}

export function Help(props: {
	topic: string; // need to be unique globally
	content: ContentNode;
}) {
	let colors = getCurrentThemeColors();
	let style: CSSProperties = {
		display: "inline-block",
		position: "relative",
		width: 12,
		height: 12,
		lineHeight: 1,
		cursor: "help",
		background: colors.bgHighContrast,
		borderRadius: 6,
		textAlign: "center",
		verticalAlign: "middle",
	};
	return <span
		className="help-icon global-help-tooltip"
		style={style}
		data-tooltip-offset={4}
		onMouseEnter={() => {
			setGlobalHelpTooltipContent(props.content);
		}}
	>
		<span style={{ position: "relative", top: -1, color: "white" }}>&#63;</span>
	</span>;
}
