// Currently used exclusively for compatibility with Ama's combat sim. This value is not bumped
// for patches where there are no combat updates.
export const CURRENT_GAME_COMBAT_PATCH = "7.25";

// Old reddit posts indicate that most abilities (excluding floor dots
// like Doton and Slipstream) cap at 16 targets. This may not strictly
// be accurate, but hopefully nobody needs to hit more than 16 targets
// with a single ability.
// https://www.reddit.com/r/ffxiv/comments/3i2ecd/aoe_skills_and_spells_all_enemies_actually_means/
export const MAX_ABILITY_TARGETS = 16;

export const enum ReplayMode {
	Exact = "Exact",
	SkillSequence = "SkillSequence",
	Edited = "Edited",
}

export const enum FileType {
	Record = "Record",
	SkillSequencePresets = "SkillSequencePresets",
	MarkerTrackIndividual = "MarkerTrackIndividual",
	MarkerTracksCombined = "MarkerTracksCombined",
}

export const enum TickMode {
	RealTime = 0, // deleted feature
	RealTimeAutoPause = 1,
	Manual = 2,
}

export const enum ShellVersion {
	Initial = 0,
	FpsTax = 1, // extra FPS field added to GameConfig
	AllaganGcdFormula = 2, // files >= this version uses Allagan's gcd formula which behaves correctly with haste buff
}

export const enum Expansion {
	EW = "EW",
	DT = "DT",
}

export const ShellInfo = {
	version: ShellVersion.AllaganGcdFormula,
	// thisExpansion is not exported so it stays local outside
};

let bContainsEwCacheContent: boolean = false;
export function containsEwCacheContent(): boolean {
	return bContainsEwCacheContent;
}

const thisExpansion: Expansion = Expansion.DT; // change here in ew archive

// Checks if we're on beta.xivintheshell.com. Set this manually if you want to test this locally.
export const isBetaSite = window.location.hostname.startsWith("beta");

// Assume that if there are no localStorage entries, this is the user's first visit to the site.
// A timeline record is always created on page load, so this assumption should be valid.
export const isFirstVisit = localStorage.length === 0;

export function getCachedValue(key: string): string | null {
	// 2x reads from localStorage but should be fine...?
	const current = localStorage.getItem(thisExpansion + "." + key);
	const noPrefix = localStorage.getItem(key);

	if (noPrefix !== null) {
		// found something old

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
	Object.keys(localStorage).forEach((key) => {
		if (key.startsWith(thisExpansion + ".")) {
			localStorage.removeItem(key);
		}
	});
}
