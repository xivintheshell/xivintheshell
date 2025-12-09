// Sanity checks for loading preset tracks with different cutoffs.
// I'm too lazy to rewrite the logic in TimelineMarkers to specifically expose the trackset
// combination logic, so this is the best we've got.

import fs from "node:fs";
import { controller } from "../Controller/Controller";
import { doPresetTrackLoad } from "../Components/TimelineMarkers";
import { MarkerTracksCombined, MarkerType } from "../Controller/Timeline";

function loadTrackToJSON(relPath: string): MarkerTracksCombined {
	const absPath = "public/presets/markers/" + relPath;
	return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

beforeEach(() => {
	controller.timeline.deleteAllMarkers();
});

interface TestMarker {
	time: number;
	markerType: MarkerType;
	duration: number;
	track: number;
	description: string;
}

function hasMarker(m: TestMarker): boolean {
	const markers = controller.timeline.getAllMarkers();
	let found = false;
	for (const actualMarker of markers) {
		found =
			actualMarker.time === m.time &&
			actualMarker.markerType === m.markerType &&
			actualMarker.duration === m.duration &&
			actualMarker.track === m.track &&
			actualMarker.description === m.description;
		if (found) {
			break;
		}
	}
	return found;
}

function checkMatchingMarker(m: TestMarker) {
	expect(hasMarker(m), "did not find marker matching " + JSON.stringify(m));
}

function checkMissingMarker(m: TestMarker) {
	expect(!hasMarker(m), "found unexpected marker matching " + JSON.stringify(m));
}

const FRU_P1_ENRAGE: TestMarker = {
	time: 151.076,
	markerType: MarkerType.Info,
	duration: 9.7,
	track: 0,
	description: "Burnished Glory",
};

it("loads fru p1 without cutoff", () => {
	doPresetTrackLoad(loadTrackToJSON("fru_p1.txt"), () => {});
	checkMatchingMarker(FRU_P1_ENRAGE);
});

it("loads fru p1 with enrage cutoff", () => {
	doPresetTrackLoad(loadTrackToJSON("fru_p1.txt"), () => {}, { cutoff: 150 });
	checkMissingMarker(FRU_P1_ENRAGE);
});
