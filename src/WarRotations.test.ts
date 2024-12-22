import fs from "node:fs";
import { controller } from "./Controller/Controller";
import { TickMode, ShellJob } from "./Controller/Common";
import { DEFAULT_BLM_CONFIG, GameConfig } from "./Game/GameConfig";
import { PotencyModifierType } from "./Game/Potency";
import { Debug, ResourceType, SkillName } from "./Game/Common";
import { WARState } from "./Game/Jobs/WAR";
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
		dotTables: new Map(),
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
		const newConfig = { ...DEFAULT_BLM_CONFIG, job: ShellJob.WAR };
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

it(
	"simulates 7.05 standard opener correctly",
	testWithConfig({}, () => {
		[
			SkillName.Tomahawk,
			SkillName.Infuriate,
			SkillName.HeavySwing,
			SkillName.Maim,
			SkillName.StormsEye,
			SkillName.InnerRelease,
			SkillName.InnerChaos,
			SkillName.Upheaval,
			SkillName.Onslaught,
			SkillName.PrimalRend,
			SkillName.Onslaught,
			SkillName.PrimalRuination,
			SkillName.Onslaught,
			SkillName.FellCleave,
			SkillName.FellCleave,
			SkillName.FellCleave,
			SkillName.PrimalWrath,
			SkillName.Infuriate,
			SkillName.InnerChaos,
			SkillName.HeavySwing,
			SkillName.Maim,
			SkillName.StormsPath,
			SkillName.FellCleave,
			SkillName.Infuriate,
			SkillName.InnerChaos,
		].forEach(applySkill);
		// wait for damage applications
		controller.step(1);
		const state = controller.game as WARState;
		expect(state.resources.get(ResourceType.BeastGauge).availableAmount()).toEqual(0);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		compareDamageTables([
			{
				skillName: SkillName.Tomahawk,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.HeavySwing,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.HeavySwing,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: SkillName.Maim,
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: SkillName.Maim,
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: SkillName.StormsEye,
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: SkillName.StormsPath,
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: SkillName.InnerChaos,
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 3,
			},
			{
				skillName: SkillName.FellCleave,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: SkillName.FellCleave,
				displayedModifiers: [
					PotencyModifierType.SURGING_TEMPEST,
					PotencyModifierType.AUTO_CDH,
				],
				hitCount: 3,
			},
			{
				skillName: SkillName.PrimalRend,
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: SkillName.PrimalRuination,
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: SkillName.PrimalWrath,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: SkillName.Onslaught,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 3,
			},
			{
				skillName: SkillName.Upheaval,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: SkillName.InnerRelease,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.Infuriate,
				displayedModifiers: [],
				hitCount: 3,
			},
		]);
	}),
);

it(
	"Tracks surging tempest correctly",
	testWithConfig({}, () => {
		[SkillName.Overpower, SkillName.Onslaught, SkillName.MythrilTempest].forEach(applySkill);
		const state = controller.game as WARState;
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest));
		// Mythril Tempest gives about 30.45 seconds of Surging Tempest immediately
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeGreaterThan(30);
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(31);
		applySkill(SkillName.Onslaught);

		// wait for Surging Tempest to nearly expire before refreshing
		applySkill(SkillName.Overpower);
		controller.step(27.7);
		applySkill(SkillName.MythrilTempest);

		expect(state.hasResourceAvailable(ResourceType.SurgingTempest));
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(1);
		// Surging Tempest should drop before being re-applied after the application delay on Mythril Tempest
		controller.step(state.resources.timeTillReady(ResourceType.SurgingTempest) + Debug.epsilon);
		expect(!state.hasResourceAvailable(ResourceType.SurgingTempest));
		applySkill(SkillName.Onslaught);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest));
		// wait for damage application
		controller.step(1);

		compareDamageTables([
			{
				skillName: SkillName.Overpower,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.Overpower,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: SkillName.MythrilTempest,
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: SkillName.MythrilTempest,
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: SkillName.Onslaught,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.Onslaught,
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 2,
			},
		]);
	}),
);
