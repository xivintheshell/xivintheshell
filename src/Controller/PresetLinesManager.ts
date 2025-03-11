import { FileType, getCachedValue, setCachedValue } from "./Common";
import {
	ActionNode, ActionType, Line, SerializedAction,
	skillNode,
	durationWaitNode,
	setResourceNode,
} from "./Record";
import { getNormalizedSkillName, getResourceKeyFromBuffName, jobHasSkill } from "../Game/Skills";
import { updateSkillSequencePresetsView } from "../Components/SkillSequencePresets";
import { ShellJob, ALL_JOBS } from "../Game/Data/Jobs";
import { ActionKey } from "../Game/Data";

type Fixme = any;

export function inferJobFromSkillNames(actions: ActionKey[]): ShellJob {
	// Helper function used for migrating from BLM/PCT in the Shell to multi-job support.
	//
	// Iterate over the whole record and return the number of actions that occur in each job.
	// If two jobs are tied (like if there's only a Swiftcast/Sprint in the timeline), just
	// take the first that appears since it doesn't really matter.
	let maxJob = ALL_JOBS[0];
	let maxCount = 0;
	ALL_JOBS.forEach((job) => {
		const count = actions.reduce((acc, skill) => (jobHasSkill(job, skill) ? acc + 1 : acc), 0);
		if (count > maxCount) {
			maxJob = job;
			maxCount = count;
		}
	});
	return maxJob;
}

export class PresetLinesManager {
	presetLines: { actions: Line; job: ShellJob }[] = [];

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
			presets: this.presetLines.map(({ actions, job }) => actions.serialized()),
		};
	}

	deserializeAndAppend(content: Fixme) {
		for (let preset of content.presets) {
			const skillNames: ActionKey[] = [];
			const line = new Line();
			line.name = preset.name;
			for (let obj of preset.actions) {
				const action = obj as SerializedAction;
				// TODO handle additional wait types
				// TODO share code with controller.loadBattleRecordFromFile
				switch (action.type) {
					case ActionType.Skill:
						const skillName = getNormalizedSkillName(action.skillName)!;
						line.addActionNode(new ActionNode(skillNode(skillName)));
						skillNames.push(skillName);
						break;
					case ActionType.SetResourceEnabled:
						line.addActionNode(
							new ActionNode(setResourceNode(getResourceKeyFromBuffName(action.buffName)!))
						);
						break;
					case ActionType.Wait:
						line.addActionNode(
							new ActionNode(durationWaitNode(action.waitDuration))
						);
						break;
					default:
						window.alert("unparseable action: " + action.toString());
						return;
				}
			}
			this.addLine(line, preset.job ?? inferJobFromSkillNames(skillNames));
		}
	}

	getLinesForJob(currentJob: ShellJob): Line[] {
		return this.presetLines.flatMap(({ actions, job }) =>
			job === currentJob ? [actions] : [],
		);
	}

	addLine(line: Line, job: ShellJob) {
		this.presetLines.push({ actions: line, job: job });
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
