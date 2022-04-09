import React from 'react'
import {Clickable, Expandable, Input, loadFromFile, saveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {ReplayMode} from "../Controller/Common";
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
				style={{display: "inline-block"}}
				defaultValue="(untitled)"
				description="name: " width={10}
				onChange={this.onChange}/>
			{
				this.props.enabled ?
				<Clickable content="[add selection to preset]" onClickFn={()=>{
					controller.addSelectionToPreset(this.filename);
				}}/> :
				<span><s>[add selection to preset]</s></span>
			}
		</div>
	}
}

class LoadSavePresets extends React.Component {
	saveFilename = "presets.txt";
	loadUrl = "hallo";
	fileSelectorRef = null;
	constructor(props) {
		super(props);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.onLoadUrlChange = this.unboundOnLoadUrlChange.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
		this.onLoadPresetFile = this.unboundOnLoadPresetFile.bind(this);
		this.onLoadUrl = this.unboundOnLoadUrl.bind(this);
		this.fileSelectorRef = React.createRef();
	}
	unboundOnSaveFilenameChange(val) {
		this.saveFilename = val;
	}
	unboundOnLoadUrlChange(val) {
		this.loadUrl = val;
	}
	unboundOnLoadPresetFile() {
		let cur = this.fileSelectorRef.current;
		if (cur && cur.files.length > 0) {
			let fileToLoad = cur.files[0];
			loadFromFile(fileToLoad, (content)=>{
				// TODO: do something with this result
				console.log(content);
			});
		}
	}
	unboundOnLoadUrl() {
		// perform get request
	}
	unboundOnSave(e) {
		saveToFile(controller.serializedPresets(), this.saveFilename);
	}
	render() {
		return <div>
			<div>
				<Clickable content="[save presets to file]" onClickFn={this.onSave}/>
				<span> as: </span>
				<input defaultValue={this.saveFilename} className="textInput" width="10"
					   onChange={this.onSaveFilenameChange}/>
			</div>
			<div>
				<Clickable content="[load presets from file]" onClickFn={this.onLoadPresetFile}/>
				<span>: </span>
				<input type="file" ref={this.fileSelectorRef}/>
			</div>
			<div>
				<Clickable content="[load presets from URL]" onClickFn={this.onLoadUrl}/>
				<span>: </span>
				<input defaultValue={this.loadUrl} className="textInput" width="10"
					   onChange={this.onLoadUrlChange}/>
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
	return <div>
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

	constructor(props) {
		super(props);
		updatePresetsView = this.unboundUpdatePresetsView.bind(this);
	}
	componentWillUnmount() {
		updatePresetsView = ()=>{};
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
			</div>
		</div>;
		return <Expandable
			title="Presets"
			content={content}
			defaultShow={true}/>
	}
}

export let presets = <Presets/>;