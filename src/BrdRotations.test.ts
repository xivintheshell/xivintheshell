import fs from "node:fs";
import { controller } from "./Controller/Controller";
import { ShellJob, TickMode } from "./Controller/Common";
import { DEFAULT_BLM_CONFIG, GameConfig } from "./Game/GameConfig";
import { PotencyModifierType } from "./Game/Potency";
import { ProcMode, ResourceType, SkillName } from "./Game/Common";
import {
	DamageStatisticsData,
	DamageStatisticsMode,
	mockDamageStatUpdateFn,
} from "./Components/DamageStatistics";
import { BRDState } from "./Game/Jobs/BRD";

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
		const newConfig = { ...DEFAULT_BLM_CONFIG, job: ShellJob.BRD };
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

type ShortDamageEntry = {
	skillName: SkillName;
	displayedModifiers: PotencyModifierType[];
	hitCount: number;
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

it(
	"accepts the standard opener",
	testWithConfig(
		{
			countdown: 0,
			procMode: ProcMode.Never,
		},
		() => {
			[
				SkillName.Stormbite,
				SkillName.WanderersMinuet,
				SkillName.EmyprealArrow,
				SkillName.CausticBite,
				SkillName.BattleVoice,
				SkillName.BurstShot,
				SkillName.RadiantFinale,
				SkillName.RagingStrikes,
				SkillName.BurstShot,
				SkillName.HeartbreakShot,
				SkillName.RadiantEncore,
				SkillName.Barrage,
				SkillName.RefulgentArrow,
				SkillName.Sidewinder,
				SkillName.ResonantArrow,
				SkillName.EmyprealArrow,
				SkillName.BurstShot,
				SkillName.HeartbreakShot,
				SkillName.BurstShot,
				SkillName.IronJaws,
				SkillName.HeartbreakShot,
				SkillName.BurstShot,
				SkillName.PitchPerfect,
			].forEach(applySkill);
			// wait for applications
			controller.step(4);

			compareDamageTables([
				{
					skillName: SkillName.Stormbite,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.WanderersMinuet,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.EmyprealArrow,
					displayedModifiers: [PotencyModifierType.WANDERERS_MINUET],
					hitCount: 1,
				},
				{
					skillName: SkillName.CausticBite,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BattleVoice,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.BATTLE_VOICE,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.RadiantFinale,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.RagingStrikes,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: SkillName.HeartbreakShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: SkillName.RadiantEncore,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.Barrage,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.RefulgentArrow,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
						PotencyModifierType.BARRAGE,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.Sidewinder,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.ResonantArrow,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.EmyprealArrow,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.IronJaws,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.PitchPerfect,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
			]);

			const dotTables = damageData.dotTables;
			expect(dotTables.get(ResourceType.CausticBite)).toBeTruthy();
			expect(dotTables.get(ResourceType.Stormbite)).toBeTruthy();
		},
	),
);

it(
	"WM waits for combat after a weaponskill",
	testWithConfig(
		{
			countdown: 0,
		},
		() => {
			[SkillName.Stormbite, SkillName.WanderersMinuet].forEach(applySkill);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get(SkillName.Stormbite).applicationDelay,
			);
		},
	),
);

it(
	"WM waits for combat after an ability",
	testWithConfig(
		{
			countdown: 0,
		},
		() => {
			[SkillName.HeartbreakShot, SkillName.Stormbite, SkillName.WanderersMinuet].forEach(
				applySkill,
			);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get(SkillName.HeartbreakShot)
					.applicationDelay,
			);
		},
	),
);
