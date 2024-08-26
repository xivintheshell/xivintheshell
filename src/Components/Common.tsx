import React, {ChangeEvent, CSSProperties, ReactNode, useEffect, useState} from "react";
import jQuery from 'jquery';
import {localize} from "./Localization";
import {Tooltip as ReactTooltip} from "react-tooltip";
import 'react-tooltip/dist/react-tooltip.css';
import '../Style/tooltip.css';
import {getCurrentThemeColors} from "./ColorTheme";
import {getCachedValue, setCachedValue} from "../Controller/Common";

export type ContentNode = JSX.Element | string;

function getBlobUrl(content: object) {
	let blob = new Blob([JSON.stringify(content)], {type: "text/plain;charset=utf-8"});
	return window.URL.createObjectURL(blob);
}

function getCsvUrl(rawContent: object) {
	let csvString = "";
	let content = rawContent as Array<Array<any>>;
	content.forEach(row=>{
		for (let i = 0; i < row.length; i++) {
			csvString += row[i].toString();
			if (i < row.length - 1) csvString += ",";
		}
		csvString += "\n";
	})
	let blob = new Blob([csvString], {type: "text/csv;charset=utf-8"});
	return window.URL.createObjectURL(blob);
}

export const enum FileFormat {
	Json = "JSON",
	Csv = "CSV"
}

type SaveToFileProps = {
	getContentFn: () => object,
	filename: string,
	fileFormat: FileFormat,
	displayName?: ContentNode
};
export class SaveToFile extends React.Component{
	props: SaveToFileProps;
	state: { jsonContent: object, csvContent: Array<Array<any>> }
	constructor(props: SaveToFileProps) {
		super(props);
		this.props = props;
		this.state = {
			jsonContent: {},
			csvContent: []
		};
	}
	updateContent() {
		let newContent = this.props.getContentFn();
		if (this.props.fileFormat===FileFormat.Json) this.setState({jsonContent: newContent});
		else if (this.props.fileFormat===FileFormat.Csv) this.setState({csvContent: newContent});
		else console.assert(false);
	}
	render() {
		let url = "";
		if (this.props.fileFormat === FileFormat.Json) url = getBlobUrl(this.state.jsonContent);
		else if (this.props.fileFormat === FileFormat.Csv) url = getCsvUrl(this.state.csvContent);
		else (console.assert(false));
		return <a
			style={{color: getCurrentThemeColors().fileDownload, marginRight: 6}}
			href={url}
			download={this.props.filename}
			onClick={()=>{ this.updateContent(); }}
			onContextMenu={()=>{ this.updateContent(); }}
		>
			{"[" + (this.props.displayName===undefined?"download":this.props.displayName) + "]"}
		</a>
	}
}

//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
export function loadFromFile(fileObject: Blob, callback=(content: object)=>{console.log(content)}) {
	let fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) {
		let str: string = fileLoadedEvent.target?.result?.toString() ?? "";
		try {
			let json = JSON.parse(str);
			callback(json);
		} catch (e) {
			window.alert(localize({
				en: "Parse error! Are you sure this is the correct file? This tool only reads text files in JSON format.",
				zh: "解析出错- 你确定文件没选错吗？本工具只读取JSON格式的文本文件"
			}))
		}
	};
	fileReader.readAsText(fileObject, "UTF-8");
}

export const StaticFn =  {
	positionFromTimeAndScale: function(time: number, scale: number): number {
		return time * scale * 100;
	},
	timeFromPositionAndScale: function(x: number, scale: number): number {
		return x / (scale * 100);
	},
	displayTime: function(time: number, fractionDigits: number) {
		let absTime = Math.abs(time);
		let minute = Math.floor(absTime / 60);
		let second = absTime - 60 * minute;
		return (time < 0 ? "-" : "") +
			minute.toString() + ":" + (second < 10 ? "0" : "") + second.toFixed(fractionDigits).toString();
	}
};

let genericErrorHandler = function(err: object) {
	console.log("[asyncFetch] some error occurred");
}
let fetchCache: Map<string, string> = new Map();
export function asyncFetch(
	url: string,
	callback: (content: string) => void,
	errorCallback: (err: object) => void = genericErrorHandler)
{
	let cachedContent = fetchCache.get(url);
	if (cachedContent) {
		callback(cachedContent);
		return;
	}
	jQuery.ajax({
		type: 'GET',
		url: url,
		//dataType: "text",
		success: (data)=>{
			callback(data);
			fetchCache.set(url, data);
		},
		error: errorCallback,
		async: true
	});
}

export function parseTime(timeStr: string) : number {
	let val = timeStr.trim();
	let sign = 1;
	if (timeStr[0]==='-') {
		sign = -1;
		timeStr = timeStr.substring(1);
	}
	let colonIndex = val.indexOf(':');
	if (colonIndex < 0) {
		return parseFloat(val);
	}
	let minute = parseInt(val.substring(0, colonIndex));
	let second = parseFloat(val.substring(colonIndex + 1));
	return sign * (minute * 60 + second);
}

type ClickableProps = {
	content?: ReactNode,
	onClickFn?: (e: any) => void,
	style?: CSSProperties
}

// todo: bind hotkeys to them?
export function Clickable(props: ClickableProps) {
	return <div
		className={"clickable"}
		onClick={props.onClickFn}
		style={props.style}
	>{props.content}</div>
}

export function ProgressBar(props: {
	progress: number,
	backgroundColor?: string,
	width: number,
	labelColor?: string,
	offsetY: number,
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
		width: props.width
	};
	const fillerStyle: CSSProperties = {
		background: `${props.backgroundColor}`,
		height: "100%",
		borderRadius: "inherit",
		width: `${props.progress * 100}%`,
	};
	return <div style={containerStyle}>
		<div style={fillerStyle}/>
	</div>
}

type InputProps = {
	defaultValue?: string,
	description: ContentNode,
	onChange?: (newVal: string) => void,
	width?: number,
	style?: CSSProperties,
}
export class Input extends React.Component {
	props: InputProps;
	onChange;
	constructor(inProps : InputProps) {
		super(inProps);
		this.props = inProps;
		this.onChange = ((e: ChangeEvent<{value: string}>)=>{
			if (this.props.onChange) this.props.onChange(e.target.value);
		});
	}
	render() {
		let width = this.props.width ?? 5;
		let color = (this.props.style?.color) ?? getCurrentThemeColors().text;
		let inputStyle: CSSProperties = {
			color: color,
			backgroundColor: "transparent",
			outline: "none",
			border: "none",
			borderBottom: "1px solid " + color
		};
		let overrideStyle = this.props.style ?? {};
		return <div style={overrideStyle}>
			<span>{this.props.description/* + "(" + this.state.value + ")"*/}</span>
			<input style={inputStyle} size={width} type="text" value={this.props.defaultValue} onChange={this.onChange}/>
		</div>
	}
}

type SliderProps = {
	onChange?: (e: string) => void,
	defaultValue?: string,
	description?: ContentNode
}
type SliderState = {
	value: string,
}
export class Slider extends React.Component {
	props: SliderProps = {
		defaultValue: "default slider value",
		description: "default description"
	};
	state: SliderState;
	onChange: (e: ChangeEvent<{value: string}>) => void;
	constructor(inProps: SliderProps) {
		super(inProps);
		this.props = inProps;
		this.state = {
			value: inProps.defaultValue ?? "",
		}
		this.onChange = ((e: ChangeEvent<{value: string}>)=>{
			this.setState({value: e.target.value});
			if (typeof this.props.onChange !== "undefined") this.props.onChange(e.target.value);
		});
	}
	componentDidMount() {
		if (typeof this.props.onChange !== "undefined") this.props.onChange(this.state.value);
	}
	render() {
		return <div style={{display: "inline-block"}}>
			<span>{this.props.description ?? ""}</span>
			<input
				size={10} type="range"
				value={this.state.value}
				min={0.05}
				max={1}
				step={0.05}
				onChange={this.onChange}
				style={{position: "relative", outline: "none"}}/>
		</div>
	}
}

export class ScrollAnchor extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	constructor(props: {}) {
		super(props);
		this.myRef = React.createRef();
	}
	scroll() {
		if (this.myRef.current) {
			this.myRef.current.scrollIntoView({behavior: "smooth"});
		}
	}
	render() {
		this.scroll();
		return <div ref={this.myRef}/>;
	}
}

type ExpandableProps = {
	title: string,
	autoIndent?: boolean,
	noMargin?: boolean,
	titleNode?: ReactNode,
	defaultShow?: boolean,
	content?: ReactNode,
	onExpand?: () => void,
	onCollapse?: () => void
}
type ExpandableState = {
	show: boolean,
}
export class Expandable extends React.Component {
	props: ExpandableProps = { title: "(expand me)" };
	state: ExpandableState = { show: false };
	autoIndent: boolean = true;
	onClick: () => void;
	constructor(inProps: ExpandableProps) {
		super(inProps);
		this.props = inProps;
		if (inProps.autoIndent === false) this.autoIndent = false;
		this.onClick = (()=>{
			let newShow = !this.state.show
			this.setState({show: newShow});
			if (this.props.onExpand && newShow) this.props.onExpand();
			if (this.props.onCollapse && !newShow) this.props.onCollapse();
			setCachedValue("exp: " + inProps.title, (newShow ? 1 : 0).toString());
		});

		let expanded = getCachedValue("exp: " + inProps.title);
		let show: boolean = inProps.defaultShow ?? false;
		if (expanded !== null) {
			show = parseInt(expanded) === 1;
		}
		this.state = {
			show: show
		};
	}
	render() {
		let indentDivStyle = this.autoIndent ? {margin: 10, paddingLeft: 6, marginBottom: 20}: {};
		return <div style={this.props.noMargin ? {} : {marginTop: 10, marginBottom: 10}}>
			<Clickable content={<span>
				<span>{this.state.show ? '- ' : '+ '}</span>
				{(this.props.titleNode ? this.props.titleNode : this.props.title)}
			</span>} onClickFn={this.onClick}/>
			<div style={{position: "relative", display: this.state.show ? "block" : "none"}}>
				<div style={indentDivStyle}>
					{this.props.content}
				</div>
			</div>
		</div>
	}
}

type LoadJsonFromFileOrUrlProps = {
	allowLoadFromUrl: boolean;
	defaultLoadUrl: string;
	loadUrlOnMount: boolean;
	onLoadFn: (content: object) => void;
}
export class LoadJsonFromFileOrUrl extends React.Component {
	loadUrl: string;
	fileSelectorRef: React.RefObject<HTMLInputElement>;
	props: LoadJsonFromFileOrUrlProps;

	onLoadUrlChange: (evt: ChangeEvent<{value: string}>) => void;
	onLoadPresetFile: () => void;
	onLoadUrl: () => void;
	constructor(inProps: LoadJsonFromFileOrUrlProps) {
		super(inProps);
		this.props = inProps;
		this.fileSelectorRef = React.createRef();
		this.loadUrl = inProps.defaultLoadUrl;

		this.onLoadUrlChange = ((evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) this.loadUrl = evt.target.value;
		});

		this.onLoadPresetFile = (()=>{
			let cur = this.fileSelectorRef.current;
			if (cur && cur.files && cur.files.length > 0) {
				let fileToLoad = cur.files[0];
				loadFromFile(fileToLoad, (content)=>{
					this.props.onLoadFn(content);
				});
				cur.value = "";
			}
		});

		this.onLoadUrl = (()=>{
			let errorHandler = function(e: any) {
				console.log("some error occurred");
			};
			asyncFetch(this.loadUrl, data=>{
				try {
					let content = JSON.parse(data);
					this.props.onLoadFn(content);
				} catch(e: any) {
					errorHandler(e);
				}
			}, (e)=>{
				errorHandler(e);
			});
		});
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
				<span>{localize({en: "Load from file: ", zh: "从文件导入："})}</span>
				<input
					style={{
						width: "110px",
						color: "transparent"
					}}
					type="file"
					ref={this.fileSelectorRef}
					onChange={this.onLoadPresetFile}/>
			</div>
			{
				this.props.allowLoadFromUrl ?
					<form>
						<span>{localize({en: "Load from URL: ", zh: "从URL导入："})}</span>
						<input defaultValue={this.loadUrl} style={longInputStyle}
							   onChange={this.onLoadUrlChange}/>
						<span> </span>
						<button type={"submit"} onClick={e => {
							this.onLoadUrl();
							e.preventDefault();
						}}>{localize({en: "load", zh: "加载"})}</button>
					</form> : undefined
			}
		</div>
	}
}

export function ButtonIndicator(props: {text: ContentNode}) {
	let colors = getCurrentThemeColors();
	return <span style={{
		fontSize: 11,
		border: "1px solid " + colors.bgHighContrast,
		borderRadius: 2,
		padding: "1px 4px",
		background: colors.bgLowContrast,
	}}>{props.text}</span>
}

let setGlobalHelpTooltipContent = (newContent: ContentNode)=>{};
let setGlobalInfoTooltipContent = (newContent: ContentNode)=>{};

export function GlobalHelpTooltip(props: {
	content: ContentNode
}) {
	const [tipContent, setTipContent] = useState(props.content);
	// hook up update function
	useEffect(()=>{
		setGlobalHelpTooltipContent = (newContent: ContentNode)=>{
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
		<ReactTooltip anchorSelect=".global-help-tooltip" className="help-tooltip" classNameArrow="help-tooltip-arrow">{tipContent}</ReactTooltip>
	</div>
}

export function GlobalInfoTooltip(props: {
	content: ContentNode
}) {
	const [tipContent, setTipContent] = useState(props.content);
	// hook up update function
	useEffect(()=>{
		setGlobalInfoTooltipContent = (newContent: ContentNode)=>{
			setTipContent(newContent);
		};
	}, []);

	return <ReactTooltip anchorSelect=".global-info-tooltip" className="info-tooltip" classNameArrow="info-tooltip-arrow">
		{tipContent}
	</ReactTooltip>
}

export function Help(props: {topic: string, content: ContentNode}) {
	let colors = getCurrentThemeColors();
	let style: CSSProperties = {
		display: "inline-block",
		position: "relative",
		width: 12,
		height: 12,
		cursor: "help",
		background: colors.bgHighContrast,
		borderRadius: 6,
		textAlign: "center",
		verticalAlign: "middle",
	};
	return <span className="help-icon global-help-tooltip" style={style} data-tooltip-offset={4} onMouseEnter={()=>{
		setGlobalHelpTooltipContent(props.content);
	}}>
		<span style={{position: "relative", top: -1, color: "white"}}>&#63;</span>
	</span>
}

export function Info(props: {hoverableNode: ContentNode, getInfoFn: ()=>ContentNode}) {
	return <div className="global-info-tooltip" data-tooltip-offset={4} onMouseEnter={()=>{
		setGlobalInfoTooltipContent(props.getInfoFn());
	}}>{props.hoverableNode}</div>
}