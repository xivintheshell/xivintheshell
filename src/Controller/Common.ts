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

export const enum ShellVersion {
	Initial = 0,
	FpsTax = 1, // extra FPS field added to GameConfig
}

export const enum ShellJob {
	BLM = "BLM",
	PCT = "PCT",
	RDM = "RDM",
	RPR = "RPR",
	DNC = "DNC",
	SAM = "SAM",
	MCH = "MCH",
	PLD = "PLD",
	WAR = "WAR",
	DRK = "DRK",
	GNB = "GNB",
	WHM = "WHM",
	SCH = "SCH",
	AST = "AST",
	SGE = "SGE",
	MNK = "MNK",
	DRG = "DRG",
	NIN = "NIN",
	VPR = "VPR",
	BRD = "BRD",
	SMN = "SMN",
}

// Uncomment the job from its respective role array
// when you're ready to start implementing it
export const TANK_JOBS: ShellJob[] = [
	//ShellJob.PLD, 
	ShellJob.WAR, 
	//ShellJob.DRK, 
	//ShellJob.GNB
];
export const HEALER_JOBS: ShellJob[] = [
	//ShellJob.WHM, 
	ShellJob.SCH, 
	//ShellJob.AST, 
	//ShellJob.SGE
];
export const MELEE_JOBS: ShellJob[] = [
	//ShellJob.MNK, 
	//ShellJob.DRG, 
	//ShellJob.NIN, 
	ShellJob.SAM, 
	ShellJob.RPR, 
	//ShellJob.VPR
];
export const PHYSICAL_RANGED_JOBS: ShellJob[] = [
	//ShellJob.BRD, 
	ShellJob.MCH, 
	ShellJob.DNC
];
export const CASTER_JOBS: ShellJob[] = [
	ShellJob.BLM, 
	//ShellJob.SMN, 
	ShellJob.RDM, 
	ShellJob.PCT
];

// can't get this automatically from a const enum
// jobs are in the order they appear in the job guide
export const ALL_JOBS = [
	...TANK_JOBS,
	...HEALER_JOBS,
	...MELEE_JOBS,
	...PHYSICAL_RANGED_JOBS,
	...CASTER_JOBS,
];

export const SKS_JOBS = [
	...TANK_JOBS, ...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS
]

export const SPS_JOBS = [
	...HEALER_JOBS, ...CASTER_JOBS
]

// Used to default the display of MP and the MP tick timer in the status display
export const MP_JOBS = [
	...HEALER_JOBS, ...CASTER_JOBS, ShellJob.PLD, ShellJob.DRK
]

// Remove jobs from this list after sufficient time in the deployed site has passed
// that you're confident no major bugs remain in that job's implementation
export const TESTING_JOBS = [
	ShellJob.PLD,
	ShellJob.WAR,
	ShellJob.DRK,
	ShellJob.GNB,
	ShellJob.WHM,
	ShellJob.SCH,
	ShellJob.AST,
	ShellJob.SGE,
	ShellJob.MNK,
	ShellJob.DRG,
	ShellJob.NIN,
	ShellJob.SAM,
	ShellJob.RPR,
	ShellJob.VPR,
	ShellJob.BRD,
	ShellJob.SMN,
];

export const enum Expansion {
	EW = "EW",
	DT = "DT"
}

export const ShellInfo = {
	version: ShellVersion.FpsTax,
	// thisExpansion is not exported so it stays local outside
};

let bContainsEwCacheContent: boolean = false;
export function containsEwCacheContent(): boolean {
	return bContainsEwCacheContent;
}

const thisExpansion: Expansion = Expansion.DT; // change here in ew archive

export function getCachedValue(key: string): string | null {

	// 2x reads from localStorage but should be fine...?
	let current = localStorage.getItem(thisExpansion + "." + key);
	let noPrefix = localStorage.getItem(key);

	if (noPrefix !== null) { // found something old

		if (thisExpansion === Expansion.DT) {
			// prompt user to go to the archive version to convert these
			bContainsEwCacheContent = true;
			return current;

		} else if (thisExpansion === Expansion.EW) {
			// we are in archive (EW): convert to EW and return
			setCachedValue(key, noPrefix);
			localStorage.removeItem(key);
			console.log("migrated localStorage item: " + key);
			return noPrefix;

		} else {
			// shouldn't get here
			console.assert(false);
			return null;
		}

	} else {
		return current;
	}
}

export function setCachedValue(key: string, value: string) {
	localStorage.setItem(thisExpansion + "." + key, value);
}

export function removeCachedValue(key: string) {
	localStorage.removeItem(thisExpansion + "." + key);
}

export function clearCachedValues() {
	// only clear values from current expansion
	Object.keys(localStorage).forEach(key => {
		if (key.startsWith(thisExpansion + ".")) {
			localStorage.removeItem(key);
		}
	});
}