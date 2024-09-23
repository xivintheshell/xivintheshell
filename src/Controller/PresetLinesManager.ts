import {FileType, getCachedValue, setCachedValue} from "./Common";
import {ActionNode, Line} from "./Record";
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";

type Fixme = any;

export class PresetLinesManager {
	presetLines: Line[] = [];

	constructor() {
		this.#load();
	}

	#save() {
		setCachedValue("presetLines", JSON.stringify(this.serialized()));
	}

	#load() {
		let data = getCachedValue("presetLines");
		if (data !== null) {
			let content = JSON.parse(data);
			this.deserializeAndAppend(content);
			return true;
		}
		return false;
	}

	serialized() {
		return {
			fileType: FileType.SkillSequencePresets,
			presets: this.presetLines.map(line=>{
				return line.serialized();
			}),
		}
	}

	deserializeAndAppend(content: Fixme) {
		for (let i = 0; i < content.presets.length; i++) {
			let line = new Line();
			line.name = content.presets[i].name;
			for (let j = 0; j < content.presets[i].actions.length; j++) {
				let action = content.presets[i].actions[j];
				let node = new ActionNode(action.type);
				node.skillName = action.skillName;
				node.waitDuration = action.waitDuration;
				node.buffName = action.buffName;
				line.addActionNode(node);
			}
			this.addLine(line);
		}
	}

	addLine(line: Line) {
		this.presetLines.push(line);
		updateSkillSequencePresetsView();
		this.#save();
	}

	deleteLine(line: Line) {
		for (let i = 0; i < this.presetLines.length; i++) {
			if (this.presetLines[i] === line) {
				this.presetLines.splice(i, 1);
				updateSkillSequencePresetsView();
				this.#save();
				return;
			}
		}
		console.assert(false);
	}

	deleteAllLines() {
		this.presetLines = [];
		updateSkillSequencePresetsView();
		this.#save();
	}

}
