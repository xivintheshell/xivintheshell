// Sanity checks for loading preset tracks with different cutoffs.
// I'm too lazy to rewrite the logic in TimelineMarkers to specifically expose the trackset
// combination logic, so this is the best we've got.

import fs from "node:fs";
import { controller } from "../Controller/Controller";
import { doPresetTrackLoad } from "../Components/TimelineMarkers";
import {
	MarkerTracksCombined,
	MarkerType,
	SerializedBuffTrack,
	UntargetableMarkerTrack,
} from "../Controller/Timeline";
import { MarkerColor } from "../Components/ColorTheme";

function loadTrackToJSON(relPath: string): MarkerTracksCombined {
	const absPath = "public/presets/markers/" + relPath;
	return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

function loadTestTrackToJSON(relPath: string): MarkerTracksCombined | SerializedBuffTrack {
	const absPath = "src/__test__/Asset/test_tracks/" + relPath;
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

function almostEq(a: number, b: number): boolean {
	return Math.abs(a - b) < 0.05;
}

function hasMarker(m: TestMarker): boolean {
	const markers = controller.timeline.getAllMarkers();
	let found = false;
	for (const actualMarker of markers) {
		found =
			almostEq(actualMarker.time, m.time) &&
			actualMarker.markerType === m.markerType &&
			almostEq(actualMarker.duration, m.duration) &&
			actualMarker.track === m.track &&
			actualMarker.description === m.description;
		if (found) {
			break;
		}
	}
	return found;
}

function checkMatchingMarker(m: TestMarker) {
	expect(hasMarker(m), "did not find marker matching " + JSON.stringify(m)).toBe(true);
}

function checkMissingMarker(m: TestMarker) {
	expect(!hasMarker(m), "found unexpected marker matching " + JSON.stringify(m)).toBe(true);
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

it("loads and migrates old buff track", () => {
	// This track contains an overlapping info and buff (tech step) marker.
	doPresetTrackLoad(loadTestTrackToJSON("track_with_overlapping_info.txt"), () => {});
	// NOTE: We cannot actually test that the render position of the buff marker is appropriately set
	// to the correct bin, as that state is computed only at draw time. Instead, we simply check that
	// the export blob ends up being well-formed.
	const blob = controller.timeline.serializedCombinedMarkerTracks();
	expect(blob).toMatchObject({
		fileType: "MarkerTracksCombined",
		tracks: [
			{
				fileType: "MarkerTrackIndividual",
				track: 0,
				markers: [
					{
						time: 1,
						markerType: "Info",
						duration: 13,
						description: "overlapping info passing through",
						color: MarkerColor.Blue,
						showText: false,
					},
				],
			},
		],
		buffs: {
			fileType: "BuffsCombined",
			buffs: [{ description: "Technical Finish", markers: [{ time: 0, duration: 20 }] }],
		},
	});
});

it("loads a new-format combined track file", () => {
	doPresetTrackLoad(loadTestTrackToJSON("mixed_all_tracks.txt"), () => {});
	const blob = controller.timeline.serializedCombinedMarkerTracks();
	expect(blob).toMatchObject({
		fileType: "MarkerTracksCombined",
		tracks: [
			{
				fileType: "MarkerTrackIndividual",
				track: UntargetableMarkerTrack,
				markers: [
					{
						time: 0,
						markerType: "Untargetable",
						duration: 20,
						description: "",
						color: MarkerColor.Grey,
						showText: true,
					},
				],
			},
			{
				fileType: "MarkerTrackIndividual",
				track: 0,
				markers: [
					{
						time: 0,
						markerType: "Info",
						duration: 20.5,
						description: "test",
						color: MarkerColor.Blue,
						showText: false,
					},
				],
			},
		],
		buffs: {
			fileType: "BuffsCombined",
			buffs: [
				{ description: "Starry Muse", markers: [{ time: 0, duration: 20.5 }] },
				{ description: "Technical Finish", markers: [{ time: 0, duration: 20 }] },
			],
		},
	});
});

it("loads a new-format buff-only track file", () => {
	doPresetTrackLoad(loadTestTrackToJSON("new_format_track_buffs.txt"), () => {});
	const blob = controller.timeline.serializedCombinedMarkerTracks();
	expect(blob).toMatchObject({
		fileType: "MarkerTracksCombined",
		tracks: [],
		buffs: {
			fileType: "BuffsCombined",
			buffs: [
				{ description: "Starry Muse", markers: [{ time: 0, duration: 20.5 }] },
				{ description: "Technical Finish", markers: [{ time: 0, duration: 20 }] },
			],
		},
	});
});
