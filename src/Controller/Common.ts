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

export const enum TickMode {
	RealTime = 0, // deleted feature
	RealTimeAutoPause = 1,
	Manual = 2
}
