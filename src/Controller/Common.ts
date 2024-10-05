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
	FpsTax = 1
}

export const enum ShellJob {
	BLM = "BLM",
	PCT = "PCT",
}

// can't get this automatically from a const enum
export const ALL_JOBS = [ShellJob.BLM, ShellJob.PCT];

export const enum Expansion {
	EW = "EW",
	DT = "DT"
}

export const ShellInfo = {
	version: ShellVersion.FpsTax,
	job: ShellJob.PCT,
	// job: ShellJob.BLM,
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