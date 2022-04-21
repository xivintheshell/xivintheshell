import React, {ChangeEvent, CSSProperties, ReactNode} from "react";
import jQuery from 'jquery';

// https://github.com/eligrey/FileSaver.js#readme
export function saveToFile(content: object, filename: string) {
	let FileSaver = require('file-saver');
	let blob = new Blob([JSON.stringify(content)], {type: "text/plain;charset=utf-8"});
	FileSaver.saveAs(blob, filename);
}

//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
export function loadFromFile(fileObject: Blob, callback=(content: object)=>{console.log(content)}) {
	let fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) {
		let str: string = fileLoadedEvent.target?.result?.toString() ?? "";
		let json = JSON.parse(str);
		callback(json);
	};
	fileReader.readAsText(fileObject, "UTF-8");
}

let fetchCache: Map<string, string> = new Map();
export function asyncFetch(
	url: string,
	callback: (content: string) => void,
	errorCallback: (err: object) => void)
{
	let cachedContent = fetchCache.get(url);
	if (cachedContent) {
		callback(cachedContent);
		return;
	}
	jQuery.ajax({
		type: 'GET',
		url: url,
		success: (data)=>{
			callback(data);
			fetchCache.set(url, data);
		},
		error: errorCallback,
		async: true
	});
}

interface ClickableProps {
	content?: ReactNode,
	onClickFn?: () => void,
	style?: CSSProperties
}
export class Clickable extends React.Component {
	props: ClickableProps = {};
	constructor(inProps: {
		onClickFn: () => void,
		content: ReactNode,
		style?: CSSProperties
	}) {
		super(inProps);
		this.props = inProps;
	}

	// TODO: bind hotkeys to buttons?
	render() {
		return <div
			className={"clickable"}
			onClick={this.props.onClickFn}
			style={this.props.style}
		>{this.props.content}</div>
	}
}

export function ProgressBar(props: {
	progress?: number,
	backgroundColor?: string,
	width?: number,
	label?: string,
	labelColor?: string,
	offsetY?: number,
}) {
	const containerStyle: CSSProperties = {
		top: `${props.offsetY ?? 0}px`,
		width: `${props.width ?? 100}px`,
	};
	const fillerStyle: CSSProperties = {
		background: `${props.backgroundColor}`,
		height: "100%",
		borderRadius: "inherit",
		width: `${(props.progress ?? 0.5) * 100}%`,
	};
	const labelStyle: CSSProperties = {
		color: props.labelColor,
	}
	return <div className={"progressBar"} style={containerStyle}>
		<div style={fillerStyle}>
			<span style={labelStyle}>{props.label}</span>
		</div>
	</div>
}

interface InputProps {
	defaultValue?: string,
	description?: string,
	onChange?: (newVal: string) => void,
	width?: number,
	style?: CSSProperties,
}
interface InputState {
	value: string,
	description: string,
}
export class Input extends React.Component {
	props: InputProps;
	state: InputState;
	onChange;
	constructor(inProps : InputProps) {
		super(inProps);
		this.props = inProps;
		this.state = {
			value: inProps.defaultValue ?? "",
			description: inProps.description ?? "",
		}
		this.onChange = this.unboundOnChange.bind(this);
	}
	unboundOnChange(e: ChangeEvent<{value: string}>) {
		this.setState({value: e.target.value});
		if (this.props.onChange) this.props.onChange(e.target.value);
	}
	componentDidMount() {
		if (this.props.onChange) this.props.onChange(this.state.value);
	}
	render() {
		let width = this.props.width ?? 5;
		let style = this.props.style;
		return <div style={style}>
			<span>{this.state.description/* + "(" + this.state.value + ")"*/}</span>
			<input className={"textInput"} size={width} type="text"
				   value={this.props.defaultValue} onChange={this.onChange}/>
		</div>
	}
}

interface SliderProps {
	onChange?: (e: string) => void,
	defaultValue?: string,
	description?: string
}
interface SliderState {
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
		this.onChange = this.unboundOnChange.bind(this);
	}
	unboundOnChange(e: ChangeEvent<{value: string}>) {
		this.setState({value: e.target.value});
		if (typeof this.props.onChange !== "undefined") this.props.onChange(e.target.value);
	}
	componentDidMount() {
		if (typeof this.props.onChange !== "undefined") this.props.onChange(this.state.value);
	}
	render() {
		return <div className={"sliderInputContainer"}>
			<span>{this.props.description ?? ""}</span>
			<input
				className={"sliderInput"}
				size={10} type="range"
				value={this.state.value}
				min={0.1}
				max={1}
				step={0.05}
				onChange={this.onChange}/>
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

// defaultShow, title, content
interface ExpandableProps {
	defaultShow?: boolean,
	content?: ReactNode,
	title?: ReactNode
}
interface ExpandableState {
	show: boolean,
}
export class Expandable extends React.Component {
	props: ExpandableProps = {};
	state: ExpandableState = { show: false };
	onClick: () => void = ()=>{};
	constructor(inProps: ExpandableProps) {
		super(inProps);
		this.props = inProps;
		this.onClick = this.unboundOnClick.bind(this);
		this.state = {
			show: inProps.defaultShow ?? false
		};
	}
	unboundOnClick() {
		this.setState({ show: !this.state.show });
	}
	render() {
		return <div>
			<Clickable
				content={(this.state.show ? '- ' : '+ ') + this.props.title}
				onClickFn={this.onClick}/>
			<div style={{position: "relative", display: this.state.show ? "block" : "none"}}>
				{this.props.content}
			</div>
		</div>
	}
}

type LoadJsonFromFileOrUrlProps = {
	defaultLoadUrl: string;
	onLoadFn: (content: object) => void;
}
export class LoadJsonFromFileOrUrl extends React.Component {
	//"https://miyehn.me/ffxiv-blm-rotation/presets/default.txt";
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

		this.onLoadUrlChange = this.unboundOnLoadUrlChange.bind(this);
		this.onLoadPresetFile = this.unboundOnLoadPresetFile.bind(this);
		this.onLoadUrl = this.unboundOnLoadUrl.bind(this);
	}
	componentDidMount() {
		if (this.loadUrl.length > 0) this.onLoadUrl();
	}
	unboundOnLoadUrlChange(evt: ChangeEvent<{value: string}>) {
		if (evt.target) this.loadUrl = evt.target.value;
	}
	unboundOnLoadPresetFile() {
		let cur = this.fileSelectorRef.current;
		console.log(typeof cur);
		if (cur && cur.files && cur.files.length > 0) {
			let fileToLoad = cur.files[0];
			loadFromFile(fileToLoad, (content)=>{
				this.props.onLoadFn(content);
			});
		}
	}
	unboundOnLoadUrl() {
		let errorHandler = function(e: any) {
			console.log("some error occurred");
		};
		asyncFetch(this.loadUrl, data=>{
			try {
				let content = JSON.parse(data);
				this.props.onLoadFn(content);
				/*
				if (content.fileType === FileType.Presets) {
					controller.appendFilePresets(content);
				} else {
					console.log("incorrect file type");
				}
				 */
			} catch(e: any) {
				errorHandler(e);
			}
		}, (e)=>{
			errorHandler(e);
		});
	}
	render() {
		let longInputStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid black",
			width: "30em",
		};
		return <div>
			<div>
				<span>Load from file: </span>
				<input type="file" ref={this.fileSelectorRef} onChange={this.onLoadPresetFile}/>
			</div>
			<form>
				<span>Load from URL: </span>
				<input defaultValue={this.loadUrl} style={longInputStyle}
					   onChange={this.onLoadUrlChange}/>
				<button type={"submit"} onClick={e => {
					this.onLoadUrl();
					e.preventDefault();
				}}>load</button>
			</form>
		</div>
	}
}

