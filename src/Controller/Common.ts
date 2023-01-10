// @ts-ignore
import {addLogContent} from "../Components/LogView.js"

export const enum LogCategory {
	Action = "Action",
	Event = "Event",
}

export const enum ReplayMode {
	Exact = "Exact",
	SkillSequence = "SkillSequence",
	Edited = "Edited"
}

export const enum FileType {
	Record = "Record",
	SkillSequencePresets = "SkillSequencePresets",
	MarkerTrackIndividual = "MarkerTrackIndividual",
	MarkerTracksCombined = "MarkerTracksCombined"
}

export const enum Color {
	Text = "textColor",
	Fire = "fireColor",
	Ice = "iceColor",
	Thunder = "thunderColor",
	ManaTick = "manaTickColor",
	Grey = "greyColor",
	Damage = "damageColor",
	Success = "successColor",
	Error = "errorColor",
	Warning = "warningColor",
}

export const enum TickMode {
	RealTime = 0,
	RealTimeAutoPause = 1,
	Manual = 2
}

// game --> view
export function addLog(category: LogCategory, content: string, time: number, color=Color.Text) {
	// disabled now for performance (nobody looks at it anyway lol)
	/*
	if (time !== undefined) content = time.toFixed(3) + "s: " + content;
	addLogContent(category, content, color);
	 */
}
