import fs from "node:fs";
import { controller } from "./Controller/Controller";
import { TickMode, ShellJob } from "./Controller/Common";
import { DEFAULT_BLM_CONFIG, GameConfig } from "./Game/GameConfig";
import { PotencyModifierType } from "./Game/Potency";
import { ResourceType, SkillName } from "./Game/Common";
import { XIVMath } from "./Game/XIVMath";
import { SAMState } from "./Game/Jobs/SAM";
import {
	DamageStatisticsData,
	DamageStatisticsMode,
	mockDamageStatUpdateFn,
} from "./Components/DamageStatistics";

// TODO figure out how to share test code :3

type ShortDamageEntry = {
	skillName: SkillName;
	displayedModifiers: PotencyModifierType[];
	hitCount: number;
};

// If this configuration flag is set to `true`, then the fight record of each test run
// will be exported locally to "$TEST_NAME.txt".
const SAVE_FIGHT_RECORD = false;

// Fake object to track damage statistics
let damageData: DamageStatisticsData;

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
		dotTable: [],
		dotTableSummary: {
			cumulativeGap: 0,
			cumulativeOverride: 0,
			timeSinceLastDoTDropped: 0,
			totalTicks: 0,
			maxTicks: 0,
			dotCoverageTimeFraction: 0,
			theoreticalMaxTicks: 0,
			totalPotencyWithoutPot: 0,
			totalPotPotency: 0,
			totalPartyBuffPotency: 0,
		},
		mode: DamageStatisticsMode.Normal,
	};
};

const compareDamageTables = (expectedDamageEntries: Array<ShortDamageEntry>) => {
	const actualDamageEntries = [];
	for (const entry of damageData.mainTable) {
		actualDamageEntries.push({
			skillName: entry.skillName,
			displayedModifiers: entry.displayedModifiers,
			hitCount: entry.hitCount,
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
			return a.displayedModifiers
				.map((x) => x.toString())
				.join()
				.localeCompare(b.displayedModifiers.map((x) => x.toString()).join());
		}
		return nameCmp;
	};
	actualDamageEntries.sort(damageEntryComparator);
	expectedDamageEntries.sort(damageEntryComparator);
	expect(actualDamageEntries).toEqual(expectedDamageEntries);
};

beforeEach(() => {
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
});

afterEach(() => {
	if (SAVE_FIGHT_RECORD) {
		const testName = expect.getState().currentTestName;
		const record = controller.record.serialized();
		fs.writeFileSync(`${testName}.txt`, JSON.stringify(record));
	}
	jest.restoreAllMocks();
});

// Run a test with the provided partial GameConfig and test function
// Leave `params`` as an empty object to use the default config
const testWithConfig = (params: Partial<GameConfig>, testFn: () => void) => {
	return () => {
		const newConfig = { ...DEFAULT_BLM_CONFIG, job: ShellJob.SAM };
		Object.assign(newConfig, params);
		controller.setConfigAndRestart(newConfig);
		testFn();
	};
};

const applySkill = (skillName: SkillName) => {
	// Perform the specified skill as soon as possible
	// TEST-ONLY HACK: set lastAttemptedSkill to the skill we're about to use
	// to ensure that trailing wait times are always omitted
	controller.lastAttemptedSkill = skillName;
	controller.requestUseSkill({ skillName: skillName });
};

it("has correct GCD under fuka", () => {
	// 2.5 base
	expect(XIVMath.preTaxGcd(100, 420, 2.5, ResourceType.Fuka)).toEqual(2.17);
	// 2.47 base
	expect(XIVMath.preTaxGcd(100, 693, 2.5, ResourceType.Fuka)).toEqual(2.14);
});

it(
	"continues combos after a meikyo",
	testWithConfig({}, () => {
		[
			SkillName.MeikyoShisui,
			SkillName.Shifu,
			SkillName.Shifu,
			SkillName.Shifu,
			SkillName.Kasha, // combo'd
		].forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		const state = controller.game as SAMState;
		expect(state.resources.get(ResourceType.Kenki).availableAmount()).toEqual(25);
		compareDamageTables([
			{
				skillName: SkillName.Shifu,
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 3,
			},
			{
				skillName: SkillName.Kasha,
				displayedModifiers: [PotencyModifierType.COMBO, PotencyModifierType.POSITIONAL],
				hitCount: 1,
			},
			{
				skillName: SkillName.MeikyoShisui,
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"generates kenki and shoha in meditation",
	testWithConfig({}, () => {
		const state = controller.game as SAMState;
		state.resources.get(ResourceType.InCombat).overrideCurrentValue(1);
		applySkill(SkillName.Meditate);
		controller.step(30); // longer than the duration to make sure we don't keep ticking
		expect(state.resources.get(ResourceType.Kenki).availableAmount()).toEqual(50);
		expect(state.resources.get(ResourceType.Meditation).availableAmount()).toEqual(3);
	}),
);
