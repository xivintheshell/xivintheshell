// This file runs comparison tests for our secret test corpus, which is not shared publicly
// because they were either transcribed from fflogs without explicit consent, or received via
// discord DM without explicit permission to post publicly.
// If you have any timeline files to test, place them in src/__test__/secretTestTimelines/,
// and running this testing task will automatically generate a JSON file containing information
// on damage table summaries and action timestamps. These expectation files are written to
// src/__test__/secretTestOutputs/, and will be used as a baseline comparison on subsequent test runs.
// To regenerate expectations for a single timeline, delete the corresponding expectation file and rerun it.
//
// You can run this file on its own with `npm run test -t corpus`.

import fs from "node:fs";
import { damageData, rotationTestSetup, rotationTestTeardown } from "./utils";
import { controller } from "../Controller/Controller";

// A list of timelines in src/__test__/secretTestTimelines which already have corresponding outputs
// in src/__test__/secretTestOutputs.
const timelinesToExpect: string[] = [];
// A list of timelines that do not yet have corresponding outputs. This test will generate output
// information for them.
const timelinesToGenerate: string[] = [];

const TL_DIR = "src/__test__/secretTestTimelines/";
const OUT_DIR = "src/__test__/secretTestOutputs/";

beforeEach(rotationTestSetup);
afterEach(rotationTestTeardown);

try {
	const timelineDir = fs.opendirSync(TL_DIR);
	if (!fs.statSync(OUT_DIR).isDirectory()) {
		fs.mkdirSync(OUT_DIR);
	}
	const outDir = fs.opendirSync(OUT_DIR);
	const timelineDamageMaps = new Map<string, boolean>();
	// @ts-expect-error ts doesn't like top-level await, but vitest doesn't care
	for await (const dirent of timelineDir) {
		if (dirent.isFile()) {
			timelineDamageMaps.set(dirent.name, false);
		}
	}
	// @ts-expect-error ts doesn't like top-level await, but vitest doesn't care
	for await (const dirent of outDir) {
		// strip the .json suffix
		const name = dirent.name.substring(0, dirent.name.length - 5);
		if (dirent.isFile() && timelineDamageMaps.has(name)) {
			timelineDamageMaps.set(name, true);
		}
	}
	timelineDamageMaps.forEach((value, key) =>
		(value ? timelinesToExpect : timelinesToGenerate).push(key),
	);
} catch {
	console.log("Could not open secretTestTimelines; skipping tests.");
}

interface DotTableInfo {
	label: string;
	summary: {
		totalTicks: number;
		maxTicks: number;
		dotCoverageTimeFraction: number;
		cumulativeGap: number;
		cumulativeOverride: number;
		totalPotencyWithoutPot: number;
		totalPotPotency: number;
	};
}

interface SerializedTimelineOutput {
	summary: {
		time: number;
		lastDamageApplicationTime: number;
		totalPotency: {
			applied: number;
			pending: number;
		};
		gcdSkills: {
			applied: number;
			pending: number;
		};
		mainTableSummary: {
			totalPotencyWithoutPot: number;
			totalPotPotency: number;
		};
	};
	dotTables: DotTableInfo[];
	// result produced by action log CSV export
	actionLog: any[][];
}

const sim = (tlPath: string) => {
	const content = JSON.parse(fs.readFileSync(tlPath, "utf8"));
	controller.setTinctureBuffPercentage(8);
	controller.loadBattleRecordFromFile(content);
	const dotTables: DotTableInfo[] = [];
	damageData.dotTables.forEach((value, key) => {
		return {
			label: key,
			summary: {
				totalTicks: value.summary.totalTicks,
				maxTicks: value.summary.maxTicks,
				dotCoverageTimeFraction: value.summary.dotCoverageTimeFraction,
				cumulativeGap: value.summary.cumulativeGap,
				cumulativeOverride: value.summary.cumulativeOverride,
				totalPotencyWithoutPot: value.summary.totalPotencyWithoutPot,
				totalPotPotency: value.summary.totalPotPotency,
			},
		};
	});
	return {
		summary: {
			time: damageData.time,
			totalPotency: damageData.totalPotency,
			lastDamageApplicationTime: damageData.lastDamageApplicationTime,
			gcdSkills: damageData.gcdSkills,
			mainTableSummary: {
				totalPotencyWithoutPot: damageData.mainTableSummary.totalPotencyWithoutPot,
				totalPotPotency: damageData.mainTableSummary.totalPotPotency,
			},
		},
		dotTables,
		actionLog: controller.getActionsLogCsv(),
	} as SerializedTimelineOutput;
};

// Copied with slight modification from utils.ts
// Recursively check the fields with floating point forgiveness
function checkNumbersInObject(
	expected: object | number | string,
	actual: object | number | string,
	path: string,
) {
	expect(typeof expected === typeof actual);
	if (typeof expected === "number") {
		expect(expected).toBeCloseTo(actual, 5);
	} else if (typeof expected === "string") {
		expect(expected).toEqual(actual);
	} else {
		Object.keys(expected).forEach((key) => {
			const expectedValue = expected[key as keyof typeof expected];
			const actualValue = actual[key as keyof typeof expected];
			checkNumbersInObject(expectedValue, actualValue, `${path}.${key}`);
		});
	}
}

timelinesToExpect.length &&
	describe("timelines with existing expectations", () => {
		timelinesToExpect.forEach((name) => {
			it(`${name} matches previous potencies`, () => {
				const expectedOutput = JSON.parse(
					fs.readFileSync(OUT_DIR + name + ".json", { encoding: "utf8" }),
				);
				const actualOutput = sim(TL_DIR + name);
				checkNumbersInObject(expectedOutput, actualOutput, "<summary>");
			});
		});
	});

timelinesToGenerate.length &&
	describe("timelines that need to generate expectations", () => {
		timelinesToGenerate.forEach((name) => {
			it(`${name} is able to generate an expectation file`, () => {
				const newSummary = sim(TL_DIR + name);
				fs.writeFileSync(OUT_DIR + name + ".json", JSON.stringify(newSummary));
			});
		});
	});

it("canary test", () => {});
