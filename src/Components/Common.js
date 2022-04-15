import React from "react";
import jQuery from 'jquery';

// https://github.com/eligrey/FileSaver.js#readme
export function saveToFile(content, filename) {
	let FileSaver = require('file-saver');
	let blob = new Blob([JSON.stringify(content)], {type: "text/plain;charset=utf-8"});
	FileSaver.saveAs(blob, filename);
}

//https://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
export function loadFromFile(fileObject, callback=(content)=>{console.log(content)}) {
	let fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) {
		let str = fileLoadedEvent.target.result.toString();
		let json = JSON.parse(str);
		callback(json);
	};
	fileReader.readAsText(fileObject, "UTF-8");
}

let fetchCache = new Map();
export function asyncFetch(url, callback, errorCallback) {
	if (fetchCache.has(url))
	{
		callback(fetchCache.get(url));
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

export class Clickable extends React.Component {
	constructor(props) { // in: content, onClickFn
		super(props);
		this.onClick = props.onClickFn.bind(this);
		this.style = typeof props.style === "undefined" ? {} : props.style;
	}

	// TODO: bind hotkeys to buttons?
	render() {
		return <div
			className={"clickable"}
			onClick={this.onClick}
			style={this.style}
		>{this.props.content}</div>
	}
}

export class ProgressBar extends React.Component {
	constructor(props={
		progress: 0.9,
		backgroundColor: "#6cf",
		width: 200,
		label: "defaultLabel",
		labelColor: "#111",
		offsetY: 0
	}) {
		super(props);
	}
	render() {
		const containerProps = {
			style: {
				top: `${this.props.offsetY}px`,
				width: `${this.props.width}px`,
			},
		};
		const fillerProps = {
			style: {
				background: `${this.props.backgroundColor}`,
				height: "100%",
				borderRadius: "inherit",
				width: `${this.props.progress * 100}%`,
			}
		};
		const labelProps = {
			style: {
				color: this.props.labelColor
			}
		}
		return <div className={"progressBar"} {...containerProps}>
			<div {...fillerProps}>
				<span {...labelProps}>{this.props.label}</span>
			</div>
		</div>
	}
}

// description, defaultValue, onChange: value->()
export class Input extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: props.defaultValue,
			description: props.description,
			onChange: ()=>{ console.log("hi hi") },
		}
		this.onChange = this.unboundOnChange.bind(this);
	}
	unboundOnChange(e) {
		this.setState({value: e.target.value});
		if (typeof this.props.onChange !== "undefined") this.props.onChange(e.target.value);
	}
	componentDidMount() {
		if (typeof this.props.onChange !== "undefined") this.props.onChange(this.state.value);
	}
	render() {
		let width = typeof this.props.width === "undefined" ? 5 : this.props.width;
		let style = typeof this.props.style === "undefined" ? {} : this.props.style;
		return <div style={style}>
			<span>{this.state.description/* + "(" + this.state.value + ")"*/}</span>
			<input className={"textInput"} size={width} type="text" value={this.props.defaultValue} onChange={this.onChange}/>
		</div>
	}
}

// description, defaultValue, onChange: value->()
export class Slider extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: props.defaultValue,
			description: props.description,
			onChange: ()=>{ console.log("hi hi") },
		}
		this.onChange = this.unboundOnChange.bind(this);
	}
	unboundOnChange(e) {
		this.setState({value: e.target.value});
		if (typeof this.props.onChange !== "undefined") this.props.onChange(e.target.value);
	}
	componentDidMount() {
		if (typeof this.props.onChange !== "undefined") this.props.onChange(this.state.value);
	}
	render() {
		return <div className={"sliderInputContainer"}>
			<span>{this.state.description}</span>
			<input className={"sliderInput"} size="10" type="range" value={this.state.value} min={0.1} max={1} step={0.05} onChange={this.onChange}/>
		</div>
	}
}

export class ScrollAnchor extends React.Component
{
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
	}
	scroll() {
		if (this.myRef.current !== null) {
			this.myRef.current.scrollIntoView({behavior: "smooth"});
		}
	}
	render() {
		this.scroll();
		return <div ref={this.myRef}/>;
	}
}

// defaultShow, title, content
export class Expandable extends React.Component {
	constructor(props) {
		super(props);
		this.onClick = this.unboundOnClick.bind(this);
		this.state = {
			show: props.defaultShow ? props.defaultShow : false
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