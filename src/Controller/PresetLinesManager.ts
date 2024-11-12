import {ShellJob, ALL_JOBS, FileType, getCachedValue, setCachedValue} from "./Common";
import {ActionNode, Line} from "./Record";
import {getNormalizedSkillName, jobHasSkill} from "../Game/Skills";
import {SkillName} from "../Game/Common";
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";

type Fixme = any;

export function inferJobFromSkillNames(actions: SkillName[]): ShellJob {
	// Helper function used for migrating from BLM/PCT in the Shell to multi-job support.
	//
	// Iterate over the whole record and return the number of actions that occur in each job.
	// If two jobs are tied (like if there's only a Swiftcast/Sprint in the timeline), just
	// take the first that appears since it doesn't really matter.
	let maxJob = ALL_JOBS[0];
	let maxCount = 0;
	ALL_JOBS.forEach((job) => {
		const count = actions.reduce(
			(acc, skill) => jobHasSkill(job, skill) ? acc + 1 : acc,
			0,
		);
		if (count > maxCount) {
			maxJob = job;
			maxCount = count;
		}
	});
	return maxJob;
};

export class PresetLinesManager {
	presetLines: {actions: Line, job: ShellJob}[] = [];

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
			presets: this.presetLines.map(({actions, job}) => actions.serialized()),
		}
	}

	deserializeAndAppend(content: Fixme) {
		for (let i = 0; i < content.presets.length; i++) {
			const skillNames = [];
			const line = new Line();
			line.name = content.presets[i].name;
			for (let j = 0; j < content.presets[i].actions.length; j++) {
				const action = content.presets[i].actions[j];
				const node = new ActionNode(action.type);
				if (action.skillName) {
					node.skillName = getNormalizedSkillName(action.skillName)!;
					skillNames.push(node.skillName);
				}
				node.waitDuration = action.waitDuration;
				node.buffName = action.buffName;
				line.addActionNode(node);
			}
			this.addLine(line, content.presets[i].job ?? inferJobFromSkillNames(skillNames));
		}
	}

	getLinesForJob(currentJob: ShellJob): Line[] {
		return this.presetLines.flatMap(({actions, job}) => job === currentJob ? [actions] : []);
	}

	addLine(line: Line, job: ShellJob) {
		this.presetLines.push({actions: line, job: job});
		updateSkillSequencePresetsView();
		this.#save();
	}

	deleteLine(line: Line) {
		for (let i = 0; i < this.presetLines.length; i++) {
			if (this.presetLines[i].actions === line) {
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
