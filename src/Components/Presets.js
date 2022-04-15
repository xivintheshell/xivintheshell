import React from 'react'
import {asyncFetch, Clickable, Expandable, Input, loadFromFile, saveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType, ReplayMode} from "../Controller/Common";
import {skillIcons} from "./Skills";
import {ActionType} from "../Controller/Record";

export let updatePresetsView = ()=>{};

class SaveAsPreset extends React.Component {
	constructor(props) {
		super(props);
		this.onChange = this.unboundOnChange.bind(this);
	}
	unboundOnChange(val) {
		this.filename = val;
	}
	render() {
		return <div>
			<Input
				style={{display: "inline-block", marginTop: "10px"}}
				defaultValue="(untitled)"
				description="name: " width={30}
				onChange={this.onChange}/>
			{
				<button disabled={!this.props.enabled} onClick={()=>{
					controller.addSelectionToPreset(this.filename);
				}}>add selection to preset</button>
			}
		</div>
	}
}

class LoadSavePresets extends React.Component {
	loadUrl = "https://miyehn.me/ffxiv-blm-rotation/presets/default.txt";
	fileSelectorRef = null;
	constructor(props) {
		super(props);
		this.onLoadFileChange = this.unboundOnLoadFileChange.bind(this);
		this.onLoadUrlChange = this.unboundOnLoadUrlChange.bind(this);
		this.onLoadPresetFile = this.unboundOnLoadPresetFile.bind(this);
		this.onLoadUrl = this.unboundOnLoadUrl.bind(this);
		this.fileSelectorRef = React.createRef();
	}
	componentDidMount() {
		this.onLoadUrl();
	}
	unboundOnLoadUrlChange(evt) {
		if (evt.target) this.loadUrl = evt.target.value;
	}
	unboundOnLoadFileChange() {
		this.onLoadPresetFile();
	}
	unboundOnLoadPresetFile() {
		let cur = this.fileSelectorRef.current;
		if (cur && cur.files.length > 0) {
			let fileToLoad = cur.files[0];
			loadFromFile(fileToLoad, (content)=>{
				if (content.fileType === FileType.Presets) {
					controller.appendFilePresets(content);
				} else {
					window.alert("wrong file type '" + content.fileType + "'");
				}
			});
		}
	}
	unboundOnLoadUrl() {
		let errorHandler = function(e) {
			console.log("some error occurred");
		};
		asyncFetch(this.loadUrl, data=>{
			try {
				let content = JSON.parse(data);
				if (content.fileType === FileType.Presets) {
					controller.appendFilePresets(content);
				} else {
					console.log("incorrect file type");
				}
			} catch(e) {
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
				<span>Load presets from file: </span>
				<input type="file" ref={this.fileSelectorRef} onChange={this.onLoadFileChange}/>
			</div>
			<div>
				<span>Load presets from URL: </span>
				<input defaultValue={this.loadUrl} style={longInputStyle}
					   onChange={this.onLoadUrlChange}/>
				<button onClick={this.onLoadUrl}>load</button>
				{this.loading ? <span> (loading..)</span> : <div/>}
			</div>
		</div>
	}
}

function PresetLine(props) {
	let line = props.line;
	let icons = [];
	let itr = line.getFirstAction();
	let ctr = 0;
	let iconStyle = {
		margin: "0 1px",
		width: "18px",
		verticalAlign: "middle"
	}
	while (itr !== null) {
		console.assert(itr.type === ActionType.Skill);
		let iconPath = skillIcons.get(itr.skillName);
		icons.push(<img style={iconStyle} key={ctr} src={iconPath} alt={itr.skillName}/>)
		itr = itr.next; ctr++;
	}
	let clickableContent = <span>{line.name} ({icons})</span>;
	return <div style={{marginBottom: "8px"}}>
		<Clickable content={clickableContent} onClickFn={() => {
			controller.tryAddLine(line, ReplayMode.Tight);
		}}/>
		<span> </span>
		<Clickable content="[x]" onClickFn={() => {
			controller.deleteLine(line);
		}}/>
	</div>
}

class Presets extends React.Component {

	saveFilename = "presets.txt";
	constructor(props) {
		super(props);
		updatePresetsView = this.unboundUpdatePresetsView.bind(this);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
	}
	componentWillUnmount() {
		updatePresetsView = ()=>{};
	}
	unboundOnSaveFilenameChange(evt) {
		if (evt.target) this.saveFilename = evt.target.value;
	}
	unboundOnSave(e) {
		saveToFile(controller.serializedPresets(), this.saveFilename);
	}
	unboundUpdatePresetsView() { this.forceUpdate(); }
	render() {
		/*
		[load presets from URL]: ______
		[load presets from file]: [choose file]
		[save presets to file] as: ______

		<list all preset lines>
			each line: <name>: <Clickable>{icon}{icon}...{icon}</Clickable> [delete (x)]
			when clicked on a line, controller.tryAddLine(line) : boolean

		(if timeline selection is not empty: ) name: ______ [save current selection as line]
		 */
		let hasSelection = controller && controller.record && controller.record.getFirstSelection() !== null;
		let contentStyle = {
			margin: "10px",
			paddingLeft: "10px",
		};
		let longInputStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid black",
			width: "20em",
		};
		let content = <div style={contentStyle}>
			<LoadSavePresets/>
			<div style={{
				outline: "1px solid lightgrey",
				marginTop: "10px",
				padding: "10px",
			}}>
				{controller.presetLines.map((line)=>{
					return <PresetLine line={line} key={line._lineIndex}/>
				})}
				<SaveAsPreset enabled={hasSelection}/>
				<hr style={{marginTop: "16px"}}/>
				<button onClick={()=>{
					controller.deleteAllLines();
				}}>clear all presets</button>
				<div>
					<span>Save presets to file as: </span>
					<input defaultValue={this.saveFilename} style={longInputStyle} onChange={this.onSaveFilenameChange}/>
					<button onClick={this.onSave}>save</button>
				</div>
			</div>
		</div>;
		return <Expandable
			title="Presets"
			content={content}
			defaultShow={true}/>
	}
}

export let presets = <Presets/>;