import React from 'react'
import {asyncFetch, Clickable, Expandable, Input, loadFromFile, LoadJsonFromFileOrUrl, saveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType, ReplayMode} from "../Controller/Common";
import {skillIcons} from "./Skills";
import {ActionType} from "../Controller/Record";

export let updateSkillSequencePresetsView = ()=>{};

class SaveAsPreset extends React.Component {
	constructor(props) {
		super(props);
		this.onChange = this.unboundOnChange.bind(this);
		this.state = {
			filename: "(untitled)"
		};
	}
	unboundOnChange(val) {
		this.setState({filename: val});
	}
	render() {
		return <form>
			<Input
				style={{display: "inline-block", marginTop: "10px"}}
				defaultValue={this.state.filename}
				description={"name: "} width={30}
				onChange={this.onChange}/>
			<button type={"submit"} disabled={!this.props.enabled} onClick={(e) => {
				controller.addSelectionToPreset(this.filename);
				e.preventDefault();
			}}>add selection to preset
			</button>
		</form>
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
	while (itr) {
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

class SkillSequencePresets extends React.Component {

	saveFilename = "presets.txt";
	constructor(props) {
		super(props);
		updateSkillSequencePresetsView = this.unboundUpdatePresetsView.bind(this);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
	}
	componentWillUnmount() {
		updateSkillSequencePresetsView = ()=>{};
	}
	unboundOnSaveFilenameChange(evt) {
		if (evt.target) this.saveFilename = evt.target.value;
	}
	unboundOnSave(e) {
		saveToFile(controller.serializedPresets(), this.saveFilename);
	}
	unboundUpdatePresetsView() { this.forceUpdate(); }
	render() {
		let hasSelection = controller && controller.record && controller.record.getFirstSelection();
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
			<LoadJsonFromFileOrUrl
				defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/defaultLines.txt"}
				onLoadFn={(content)=>{
					if (content.fileType === FileType.Presets) {
						controller.appendFilePresets(content);
					} else {
						window.alert("incorrect file type '" + content.fileType + "'");
					}
				}}/>
			<div style={{
				outline: "1px solid lightgrey",
				margin: "10px 0",
				padding: "10px",
			}}>
				{controller.presetLines.map((line)=>{
					return <PresetLine line={line} key={line._lineIndex}/>
				})}
				<SaveAsPreset enabled={hasSelection}/>
				<form style={{marginTop: "16px"}}>
					<span>Save presets to file as: </span>
					<input defaultValue={this.saveFilename} style={longInputStyle} onChange={this.onSaveFilenameChange}/>
					<button type={"submit"} onClick={(e)=>{
						this.onSave();
						e.preventDefault();
					}}>save</button>
				</form>
			</div>
			<button onClick={()=>{
				controller.deleteAllLines();
			}}>clear all presets</button>
		</div>;
		return <Expandable
			title="Skill sequence presets"
			content={content}
			defaultShow={true}/>
	}
}

export let skillSequencePresets = <SkillSequencePresets/>;