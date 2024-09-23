import React from 'react'
import {Clickable, Expandable, FileFormat, Input, LoadJsonFromFileOrUrl, SaveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {FileType, ReplayMode} from "../Controller/Common";
import {skillIcons} from "./Skills";
import {ActionType, Line} from "../Controller/Record";
import {getCurrentThemeColors} from "./ColorTheme";

type Fixme = any;

export let updateSkillSequencePresetsView = ()=>{};

class SaveAsPreset extends React.Component {
	props: Readonly<{enabled: boolean}>;
	state: { filename: string };
	onChange: (val: string) => void;
	constructor(props: Readonly<{enabled: boolean}>) {
		super(props);
		this.props = props;
		this.onChange = ((val: string)=>{
			this.setState({filename: val});
		});

		this.state = {
			filename: "(untitled)"
		};
	}
	render() {
		return <form>
			<Input
				style={{display: "inline-block", marginTop: "10px"}}
				defaultValue={this.state.filename}
				description={"name: "} width={30}
				onChange={this.onChange}/>
			<span> </span>
			<button type={"submit"} disabled={!this.props.enabled} onClick={(e) => {
				controller.addSelectionToPreset(this.state.filename);
				e.preventDefault();
			}}>add selection to preset
			</button>
		</form>
	}
}

function PresetLine(props: { line: Line }) {
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

	let addLineStyle = controller.displayingUpToDateGameState ? {} : {
		//filter: "grayscale(100%)",
		//pointerEvents: "none",
		cursor: "not-allowed"
	};
	return <div style={{marginBottom: "8px"}}>
		<Clickable content={clickableContent} style={addLineStyle} onClickFn={controller.displayingUpToDateGameState ? (() => {
			controller.tryAddLine(line, ReplayMode.SkillSequence);
			controller.updateAllDisplay();
			controller.scrollToTime();
		}) : undefined}/>
		<span> </span>
		<Clickable content="[x]" onClickFn={() => {
			controller.deleteLine(line);
		}}/>
	</div>
}

export class SkillSequencePresets extends React.Component {
	constructor(props: Readonly<{}>) {
		super(props);
		updateSkillSequencePresetsView = this.unboundUpdatePresetsView.bind(this);
	}
	componentWillUnmount() {
		updateSkillSequencePresetsView = ()=>{};
	}
	unboundUpdatePresetsView() { this.forceUpdate(); }
	render() {
		let hasSelection = controller && controller.record && controller.record.getFirstSelection() !== undefined;
		let content = <div>
			<button style={{marginBottom: 10}} onClick={()=>{
				controller.deleteAllLines();
			}}>clear all presets</button>
			<LoadJsonFromFileOrUrl
				allowLoadFromUrl={false} // disabled for now, until when/if people have some common openers
				loadUrlOnMount={false}
				defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/lines/default.txt"}
				onLoadFn={(content: Fixme)=>{
					if (content.fileType === FileType.SkillSequencePresets) {
						controller.appendFilePresets(content);
					} else {
						window.alert("incorrect file type '" + content.fileType + "'");
					}
				}}/>
			<div style={{
				outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
				margin: "10px 0",
				padding: "10px",
			}}>
				{controller.getPresetLines().map((line)=>{
					return <PresetLine line={line} key={line._lineIndex}/>
				})}
				<SaveAsPreset enabled={hasSelection}/>
				<div style={{marginTop: 16}}>
					<SaveToFile fileFormat={FileFormat.Json} getContentFn={()=>{
						return controller.serializedPresets();
					}} filename={"presets"} displayName={"download presets to file"}/>
				</div>
			</div>
		</div>;
		return <Expandable
			title="Skill sequence presets"
			content={content}
			defaultShow={false}/>
	}
}