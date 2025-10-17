import React, { ChangeEvent, CSSProperties, ReactNode, useEffect, useState, useRef } from "react";
import { localize } from "./Localization";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { getCurrentThemeColors } from "./ColorTheme";
import { Debug } from "../Game/Common";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { MAX_TIMELINE_SLOTS } from "../Controller/Timeline";
import { LiaWindowMinimize } from "react-icons/lia";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

export type ContentNode = React.JSX.Element | string;

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
	drawHealingMarks: boolean;
	drawMPTickMarks: boolean;
	drawBuffIndicators: boolean;
};
export const DEFAULT_TIMELINE_OPTIONS = {
	drawMarkers: true,
	drawDamageMarks: true,
	drawHealingMarks: true,
	drawMPTickMarks: true,
	drawBuffIndicators: true,
};

export type CsvData = {
	meta?: Array<any>;
	body: Array<Array<any>>;
};

function getBlobUrl(content: object) {
	const blob = new Blob([JSON.stringify(content)], { type: "text/plain;charset=utf-8" });
	return window.URL.createObjectURL(blob);
}

function getCsvUrl(rawContent: CsvData) {
	let csvString = "";
	// if there's a "meta" field on the object, then prepend it to the CSV rows, and use "body" as the actual array
	rawContent.meta?.forEach((row) => {
		csvString += "#" + row.toString() + "\n";
	});
	rawContent.body.forEach((row) => {
		for (let i = 0; i < row.length; i++) {
			csvString += row[i].toString();
			if (i < row.length - 1) csvString += ",";
		}
		csvString += "\n";
	});
	const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
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

export function SaveToFile(props: SaveToFileProps) {
	const [state, setState] = useState<{
		jsonContent: object;
		csvContent: CsvData;
		pngContent?: HTMLCanvasElement;
	}>({ jsonContent: {}, csvContent: { body: [] }, pngContent: undefined });

	const updateContent = () => {
		const newContent = props.getContentFn();
		if (props.fileFormat === FileFormat.Json) {
			// @ts-expect-error no parsing is enforced on getContentFn
			setState({ jsonContent: newContent });
		} else if (props.fileFormat === FileFormat.Csv) {
			// @ts-expect-error no parsing is enforced on getContentFn
			setState({ csvContent: newContent });
		} else if (props.fileFormat === FileFormat.Png) {
			// @ts-expect-error no parsing is enforced on getContentFn
			setState({ pngContent: newContent });
		} else console.assert(false);
	};

	let url = "";
	if (props.fileFormat === FileFormat.Json) url = getBlobUrl(state.jsonContent);
	else if (props.fileFormat === FileFormat.Csv) url = getCsvUrl(state.csvContent);
	else if (props.fileFormat === FileFormat.Png) {
		url = state.pngContent?.toDataURL() ?? "";
	} else console.assert(false);
	return <a
		style={{ color: getCurrentThemeColors().fileDownload, marginRight: 6 }}
		href={url}
		download={props.filename}
		onClick={() => updateContent()}
		onContextMenu={() => updateContent()}
	>
		{`[${props.displayName === undefined ? "download" : props.displayName}]`}
	</a>;
}

//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
export function loadFromFile(
	fileObject: Blob,
	callback = (content: object) => {
		console.log(content);
	},
) {
	const fileReader = new FileReader();
	fileReader.onload = function (fileLoadedEvent) {
		const str: string = fileLoadedEvent.target?.result?.toString() ?? "";
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
			console.error(e);
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
		const absTime = Math.abs(time);
		const minute = Math.floor(absTime / 60);
		const second = absTime - 60 * minute;
		return (
			(time < 0 ? "-" : "") +
			minute.toString() +
			":" +
			(second + Debug.epsilon < 10 ? "0" : "") +
			second.toFixed(fractionDigits).toString()
		);
	},
};

const genericErrorHandler = function (err: object) {
	console.log("[asyncFetch] some error occurred");
};
const fetchCache: Map<string, string> = new Map();
export function asyncFetch(
	url: string,
	callback: (content: string) => void,
	errorCallback: (err: object) => void = genericErrorHandler,
) {
	const cachedContent = fetchCache.get(url);
	if (cachedContent) {
		callback(cachedContent);
		return;
	}
	const req = new XMLHttpRequest();
	req.addEventListener("error", errorCallback);
	req.addEventListener("load", (data) => {
		callback(req.responseText);
		fetchCache.set(url, req.responseText);
	});
	req.open("GET", url);
	req.send();
}

export function parseTime(timeStr: string): number {
	const val = timeStr.trim();
	let sign = 1;
	if (timeStr[0] === "-") {
		sign = -1;
		timeStr = timeStr.substring(1);
	}
	const colonIndex = val.indexOf(":");
	if (colonIndex < 0) {
		return parseFloat(val);
	}
	const minute = parseInt(val.substring(0, colonIndex));
	const second = parseFloat(val.substring(colonIndex + 1));
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
	const colors = getCurrentThemeColors();
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
		const cachedSelected = getCachedValue("tabs: " + props.uniqueName);
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
		const borderTop = tabIndex === selectedIndex ? visibleBorder : invisibleBorder;
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
	const content: ContentNode[] = [];
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
		showScrollbar?: boolean;
	}[];
}) {
	const colors = getCurrentThemeColors();
	const children: React.ReactNode[] = [];
	for (let i = 0; i < props.children.length; i++) {
		const column = props.children[i];
		const nextColumn = i < props.children.length - 1 ? props.children[i + 1] : undefined;
		children.push(
			<Panel
				key={`column-${i}`}
				className={column.showScrollbar ? "visibleScrollbar" : "invisibleScrollbar"}
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
	autoFocus?: boolean;
};

export function Input(props: InputProps) {
	const onChange = (e: ChangeEvent<{ value: string }>) => {
		if (props.onChange) props.onChange(e.target.value);
	};
	const themeColors = getCurrentThemeColors();
	const width = props.width ?? 5;
	const inputStyle: CSSProperties = {
		color: props.style?.color ?? props.componentColor ?? themeColors.text,
		backgroundColor: "transparent",
		outline: "none",
		border: "none",
		borderBottom: "1px solid " + (props.componentColor ?? themeColors.text),
	};
	const overrideStyle = props.style ?? {};
	return <div style={{ ...overrideStyle, ...{ color: props.componentColor } }}>
		<span>{props.description /* + "(" + this.state.value + ")"*/}</span>
		<input
			style={inputStyle}
			size={width}
			type="text"
			value={props.defaultValue}
			onChange={onChange}
			// When the input field is focused, native commands like arrow key + undo/redo should
			// work as expected, and not be intercepted by the top-level app's key listeners.
			onKeyDown={(e) => e.stopPropagation()}
			autoFocus={props.autoFocus}
		/>
	</div>;
}

type SliderProps = {
	uniqueName: string;
	onChange?: (e: string) => void;
	defaultValue?: string;
	description?: ContentNode;
	style?: CSSProperties;
};
export function Slider(props: SliderProps) {
	const description = props.description ?? "default description";
	const [value, setValue] = useState(props.defaultValue ?? "");
	const onChange = (e: ChangeEvent<{ value: string }>) => {
		setValue(e.target.value);
		if (props.onChange) {
			props.onChange(e.target.value);
		}
		setCachedValue("slider: " + props.uniqueName, e.target.value);
	};
	useEffect(() => {
		let initialValue = value;
		const str = getCachedValue("slider: " + props.uniqueName);
		if (str !== null) {
			initialValue = str;
			setValue(str);
		}
		if (props.onChange) {
			props.onChange(initialValue);
		}
	}, []);
	return <div style={{ ...{ display: "inline-block" }, ...props.style }}>
		<span>{description ?? ""}</span>
		<input
			size={10}
			type="range"
			value={value}
			min={0.05}
			max={1}
			step={0.025}
			onChange={onChange}
			style={{ position: "relative", outline: "none" }}
		/>
	</div>;
}

export function RadioSet(props: {
	uniqueName: string;
	onChange: (newValue: string) => void;
	options: Array<[string, ContentNode]>;
}) {
	const defaultValue = getCachedValue(`radio: ${props.uniqueName}`) ?? props.options[0][0];
	const [selected, setSelected] = useState(defaultValue);
	const radioStyle: CSSProperties = {
		position: "relative",
		top: 3,
		marginRight: "0.25em",
	};
	const radioOptions = props.options.map(([key, content]) => <div key={key} style={radioStyle}>
		<input
			type="radio"
			id={key}
			name={props.uniqueName}
			value={key}
			checked={selected === key}
			onChange={(e) => {
				setSelected(key);
				setCachedValue(`radio: ${props.uniqueName}`, key);
				// onchange is only emitted when a radio box is checked
				props.onChange(key);
			}}
		/>
		<label htmlFor={key} style={{ verticalAlign: "top" }}>
			{" "}
			{content}
		</label>
	</div>);
	return <div>{radioOptions}</div>;
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
		const str = getCachedValue("checked: " + props.uniqueName);
		if (str !== null) {
			defaultChecked = parseInt(str) > 0;
		}
		setChecked(defaultChecked);
		props.onChange(defaultChecked);
	}, []);
	return <div style={{ marginBottom: 5 }}>
		<input
			className="shellCheckbox"
			type="checkbox"
			onChange={(e) => {
				const newVal = e.currentTarget.checked;
				setChecked(newVal);
				setCachedValue("checked: " + props.uniqueName, newVal ? "1" : "0");
				props.onChange(newVal);
			}}
			checked={checked}
		/>
		<span>{props.label}</span>
	</div>;
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
export function Expandable(props: ExpandableProps) {
	const [show, setShow] = useState(props.defaultShow ?? false);
	const autoIndent = props.autoIndent ?? true;
	const onClick = () => {
		const newShow = !show;
		setShow(newShow);
		if (props.onExpand && newShow) props.onExpand();
		if (props.onCollapse && !newShow) props.onCollapse();
		setCachedValue("exp: " + props.title, (newShow ? 1 : 0).toString());
	};

	useEffect(() => {
		const expanded = getCachedValue("exp: " + props.title);
		if (expanded !== null) {
			setShow(parseInt(expanded) === 1);
		}
	}, []);

	const indentDivStyle = autoIndent ? { margin: 10, paddingLeft: 6, marginBottom: 20 } : {};
	return <div style={props.noMargin ? {} : { marginTop: 10, marginBottom: 10 }}>
		<Clickable
			content={
				<span>
					<span>{show ? "- " : "+ "}</span>
					{props.titleNode ?? props.title}
				</span>
			}
			onClickFn={onClick}
		/>
		<div style={{ position: "relative", display: show ? "block" : "none" }}>
			<div style={indentDivStyle}>{props.content}</div>
		</div>
	</div>;
}

type LoadJsonFromFileOrUrlProps = {
	allowLoadFromUrl: boolean;
	defaultLoadUrl?: string;
	label?: ContentNode;
	onLoadFn: (content: object) => void;
};

export function LoadJsonFromFileOrUrl(props: LoadJsonFromFileOrUrlProps) {
	const fileSelectorRef: React.RefObject<HTMLInputElement | null> = useRef(null);
	let loadUrl = props.defaultLoadUrl ?? "";

	const onLoadUrlChange = (evt: ChangeEvent<{ value: string }>) => {
		if (evt.target) loadUrl = evt.target.value;
	};

	const onLoadPresetFile = () => {
		const cur = fileSelectorRef.current;
		if (cur && cur.files && cur.files.length > 0) {
			const fileToLoad = cur.files[0];
			loadFromFile(fileToLoad, (content) => props.onLoadFn(content));
			cur.value = "";
		}
	};

	const onLoadUrl = () => {
		const errorHandler = function (e: any) {
			console.log("some error occurred");
		};
		asyncFetch(
			loadUrl,
			(data) => {
				try {
					const content = JSON.parse(data);
					props.onLoadFn(content);
				} catch (e: any) {
					errorHandler(e);
				}
			},
			(e) => {
				errorHandler(e);
			},
		);
	};
	const colors = getCurrentThemeColors();
	const longInputStyle = {
		color: colors.text,
		background: "transparent",
		outline: "none",
		border: "none",
		borderBottom: "1px solid " + colors.text,
		width: "30em",
	};
	return <div>
		<div>
			<span>{props.label ?? localize({ en: "Load from file: ", zh: "从文件导入：" })}</span>
			<input
				style={{
					width: "110px",
					color: "transparent",
				}}
				type="file"
				ref={fileSelectorRef}
				onChange={onLoadPresetFile}
			/>
		</div>
		{props.allowLoadFromUrl ? (
			<form>
				<span>{localize({ en: "Load from URL: ", zh: "从URL导入：" })}</span>
				<input defaultValue={loadUrl} style={longInputStyle} onChange={onLoadUrlChange} />
				<span> </span>
				<button
					type={"submit"}
					onClick={(e) => {
						onLoadUrl();
						e.preventDefault();
					}}
				>
					{localize({ en: "load", zh: "加载" })}
				</button>
			</form>
		) : undefined}
	</div>;
}

export function ButtonIndicator(props: { text: ContentNode }) {
	const colors = getCurrentThemeColors();
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

const HELP_MOUSEOVER_HYSTERESIS_MS = 100;

export function Help(props: {
	topic: string; // need to be unique globally
	content: ContentNode;
	container?: React.RefObject<HTMLElement | null>;
}) {
	const colors = getCurrentThemeColors();
	const style: CSSProperties = {
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
	// To prevent "Flickering" behavior when the mouse is right on the help icon's boundary,
	// we track the last mouseenter time. This should be updated even if the tooltip is not redrawn.
	// Technically we should make the threshold to register an entry smaller than the threshold for
	// exit to resolve this, but that seems annoying to do.
	const lastMouseEnter = useRef(0);
	// Manually set open/closed state instead of using Tooltip.Trigger to ensure it goes away
	// after mousing off the (?) icon.
	const [open, setOpen] = useState(false);
	return <Tooltip.Root delay={0} open={open}>
		<span
			id={`help-${props.topic}`}
			className="help-icon global-help-tooltip"
			style={style}
			data-tooltip-offset={4}
			onMouseEnter={() => {
				const now = Date.now();
				if (now - lastMouseEnter.current > HELP_MOUSEOVER_HYSTERESIS_MS) {
					setOpen(true);
				}
				lastMouseEnter.current = now;
			}}
			onMouseLeave={() => setOpen(false)}
		>
			<span style={{ position: "relative", top: -1, color: "white" }}>&#63;</span>
		</span>
		<Tooltip.Portal
			container={props.container ?? document.getElementById("globalHelpTooltipAnchor")}
		>
			<Tooltip.Positioner
				className="tooltip-positioner"
				anchor={document.getElementById(`help-${props.topic}`)}
			>
				<Tooltip.Popup className="help-tooltip tooltip">{props.content}</Tooltip.Popup>
			</Tooltip.Positioner>
		</Tooltip.Portal>
	</Tooltip.Root>;
}
