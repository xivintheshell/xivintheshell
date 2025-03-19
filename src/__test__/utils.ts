import fs from "node:fs";

import { controller } from "../Controller/Controller";
import { TickMode } from "../Controller/Common";
import { DEFAULT_CONFIG, GameConfig } from "../Game/GameConfig";
import { PotencyModifierType } from "../Game/Potency";
import {
	DamageStatisticsData,
	DamageStatisticsMode,
	mockDamageStatUpdateFn,
} from "../Components/DamageStatistics";
import { ShellJob } from "../Game/Data/Jobs";
import { ActionKey } from "../Game/Data";

// If this configuration flag is set to `true`, then the fight record of each test run
// will be exported locally to "$TEST_NAME.txt".
const SAVE_FIGHT_RECORD = false;

// Fake object to track damage statistics
export let damageData: DamageStatisticsData;

const resetDamageData = () => {
	damageData = {
		time: 0,
		tinctureBuffPercentage: 0,
		countdown: 0,
		totalPotency: { applied: 0, pending: 0 },
		lastDamageApplicationTime: 0,
		gcdSkills: { applied: 0, pending: 0 },
		mainTable: [],
		mainTableSummary: {
			totalPotencyWithoutPot: 0,
			totalPotPotency: 0,
			totalPartyBuffPotency: 0,
		},
		dotTables: new Map(),
		mode: DamageStatisticsMode.Normal,
	};
};

export const rotationTestSetup = () => {
	// For simplicity, always use "manual" advance mode to avoid any time shenanigans
	// We eventually should test real-time mode as well
	controller.setTimeControlSettings({
		timeScale: 2,
		tickMode: TickMode.Manual,
	});
	if (controller.timeline.slots.length === 0) {
		controller.timeline.addSlot();
	}
	// clear stats from the last run
	resetDamageData();
	// monkeypatch the updateDamageStats function to avoid needing to initialize the frontend
	mockDamageStatUpdateFn((newData: Partial<DamageStatisticsData>) => {
		damageData = { ...damageData, ...newData };
	});
	// config reset is handled in testWithConfig helper
};

export const rotationTestTeardown = () => {
	if (SAVE_FIGHT_RECORD) {
		const testName = expect.getState().currentTestName;
		const record = controller.record.serialized();
		fs.writeFileSync(`${testName}.txt`, JSON.stringify(record));
	}
	jest.restoreAllMocks();
};

// Makes a test function for the specified job.
// Example:
// const testWithConfig = makeTestWithConfigFn(ShellJob.BLM);
// it("tests stuff", testWithConfig({}, () => { /* test code here */ }));
export const makeTestWithConfigFn = (job: ShellJob) => {
	// Run a test with the provided partial GameConfig and test function
	// Leave `params`` as an empty object to use the default config
	return (params: Partial<GameConfig>, testFn: () => void) => {
		return () => {
			const newConfig = { ...DEFAULT_CONFIG, job };
			Object.assign(newConfig, params);
			controller.setConfigAndRestart(newConfig);
			testFn();
		};
	};
};

// helper type for `testWithTimelineFile` because it only checks the numbers in `damageData`
type ComparableStats = Omit<DamageStatisticsData, "mainTable">;

// https://stackoverflow.com/questions/41980195/recursive-partialt-in-typescript
type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>;
};

// same as expect(x).toBeCloseTo(y) but with helpful error message
expect.extend({
	toBeClose([path, expected, actual]) {
		return {
			message: () => `'${path}' should be ${expected}; found: ${actual}`,
			pass: Math.abs(expected - actual) < 0.005,
		};
	},
});

// recursively checks number fields in `expected` and `actual` to see if they are approximately equal
// all fields in `expected` should also exist in `actual` and with the same type
function checkNumbersInObject(expected: object | number, actual: object | number, path: string) {
	expect(typeof expected === typeof actual);

	if (typeof expected === "number") {
		expect([path, expected, actual]).toBeClose();
	} else if (expected instanceof Map) {
		expect(actual instanceof Map).toBeTruthy();
		for (let [key, expectedValue] of expected) {
			const actualValue = (actual as any).get(key);
			checkNumbersInObject(expectedValue, actualValue, `${path}['${key}']`);
		}
	} else {
		Object.keys(expected).forEach((key) => {
			const expectedValue = expected[key as keyof typeof expected];
			const actualValue = actual[key as keyof typeof expected];
			checkNumbersInObject(expectedValue, actualValue, `${path}.${key}`);
		});
	}
}

// loads a timeline file and checks the resulting `damageData` against the expected values
// see example usages in BLMRotations.test.ts
// note: `time` and `lastDamageApplicationTime` in `expectedDamageData` should be raw times (displayed time + countdown)
export const testDamageFromTimeline = (
	relPath: string,
	expectedDamageData: RecursivePartial<ComparableStats>,
) => {
	return () => {
		const absPath = "src/__test__/Asset/" + relPath;
		const content = JSON.parse(fs.readFileSync(absPath, "utf8"));

		controller.setTinctureBuffPercentage(8);
		controller.loadBattleRecordFromFile(content);

		checkNumbersInObject(expectedDamageData, damageData, "damageData");
	};
};

// We define separate functions instead of an optional parameter to avoid accidentally
// using the item index as argument when calling .forEach(applySkill)
export const applySkill = (skillName: ActionKey) => applySkillMultiTarget(skillName, 1);

export const applySkillMultiTarget = (skillName: ActionKey, targetCount: number) => {
	// Perform the specified skill as soon as possible
	controller.requestUseSkill({ skillName, targetCount });
};

export type ShortDamageEntry = {
	skillName: ActionKey;
	displayedModifiers: PotencyModifierType[];
	hitCount: number;
	targetCount?: number;
};

export const compareDamageTables = (expectedDamageEntries: Array<ShortDamageEntry>) => {
	const actualDamageEntries = [];
	for (const entry of damageData.mainTable) {
		actualDamageEntries.push({
			skillName: entry.skillName,
			displayedModifiers: entry.displayedModifiers,
			hitCount: entry.hitCount,
			targetCount: entry.targetCount,
		});
	}
	// sz: whatever version of node i'm on apparently doesn't support Set.difference/symmetricDifference,
	// so we instead just sort the two arrays and do an equality check
	const damageEntryComparator = (a: ShortDamageEntry, b: ShortDamageEntry) => {
		const nameCmp = a.skillName.localeCompare(b.skillName);
		// The same skill can appear with different modifiers, in which case
		// we need to compare on their displayedModifiers field.
		// Since the modifiers lists are short, just concat them and treat that as a string.
		if (nameCmp === 0) {
			const modifierCmp = a.displayedModifiers
				.map((x) => x.toString())
				.join()
				.localeCompare(b.displayedModifiers.map((x) => x.toString()).join());
			if (modifierCmp === 0) {
				return (a.targetCount ?? 1) - (b.targetCount ?? 1);
			}
			return modifierCmp;
		}
		return nameCmp;
	};
	actualDamageEntries.sort(damageEntryComparator);
	expectedDamageEntries = expectedDamageEntries.map((entry) => ({
		...entry,
		targetCount: entry.targetCount ?? 1,
	}));
	expectedDamageEntries.sort(damageEntryComparator);
	expect(actualDamageEntries).toEqual(expectedDamageEntries);
};
