import React from 'react'
import {Clickable, Expandable, Input} from "./Common";
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
				<Clickable content="[save selection as preset]" onClickFn={()=>{
					controller.addSelectionToPreset(this.filename);
				}}/> :
				<span><s>[save selection as preset]</s></span>
			}
		</div>
	}
}

function PresetLine(props) {
	let line = props.line;
	let icons = [];
	let itr = line.getFirstAction();
	let ctr = 0;
	let iconStyle = {
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
		[load lines from file]:
		[save lines to file] as: ______

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
			{controller.presetLines.map((line)=>{
				return <PresetLine line={line} key={line._lineIndex}/>
			})}
			<SaveAsPreset enabled={hasSelection}/>
		</div>;
		return <Expandable
			title="Presets"
			content={content}
			defaultShow={true}/>
	}
}

export let presets = <Presets/>;