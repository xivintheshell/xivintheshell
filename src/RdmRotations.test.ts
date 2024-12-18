// Behaviors that are manually tested:
// - Doing any non-enchanted GCD consumes all mana stacks (TODO: check if reprise does this)
// - Doing un-enchanted GCDs is physical damage
// - Mana imbalance state halves gain of other color

import fs from "node:fs";
import { controller } from "./Controller/Controller";
import { TickMode, ShellJob } from "./Controller/Common";
import { DEFAULT_BLM_CONFIG, GameConfig } from "./Game/GameConfig";
import { PotencyModifierType } from "./Game/Potency";
import { ResourceType, SkillName } from "./Game/Common";
import { RDMState } from "./Game/Jobs/RDM";
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
		const newConfig = { ...DEFAULT_BLM_CONFIG, job: ShellJob.RDM };
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
	"consumes instants in the correct order",
	testWithConfig({}, () => {
		[
			SkillName.Jolt3,
			SkillName.Acceleration,
			SkillName.Swiftcast,
			SkillName.Verthunder3,
		].forEach(applySkill);
		const state = controller.game as RDMState;
		expect(state.hasResourceAvailable(ResourceType.Acceleration)).toBeFalsy();
		expect(state.hasResourceAvailable(ResourceType.Swiftcast)).toBeTruthy();
		expect(state.hasResourceAvailable(ResourceType.Dualcast)).toBeTruthy();
		applySkill(SkillName.Veraero3);
		expect(state.hasResourceAvailable(ResourceType.Acceleration)).toBeFalsy();
		expect(state.hasResourceAvailable(ResourceType.Swiftcast)).toBeTruthy();
		expect(state.hasResourceAvailable(ResourceType.Dualcast)).toBeFalsy();
		applySkill(SkillName.Veraero3);
		expect(state.hasResourceAvailable(ResourceType.Acceleration)).toBeFalsy();
		expect(state.hasResourceAvailable(ResourceType.Swiftcast)).toBeFalsy();
		expect(state.hasResourceAvailable(ResourceType.Dualcast)).toBeFalsy();
	}),
);

it(
	"allows triple zwerchhau",
	testWithConfig({}, () => {
		// just cast each spell 7x until we get 49/49, which is enough for triple zwerchhau
		[
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.EnchantedZwerchhau,
			SkillName.EnchantedZwerchhau,
			SkillName.EnchantedZwerchhau,
			SkillName.Verholy,
			SkillName.Scorch,
			SkillName.Resolution,
		].forEach(applySkill);
	}),
);

it(
	"performs the standard opener",
	testWithConfig({ spellSpeed: 420 }, () => {
		// 3 procs are guaranteed in the standard opener
		[
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Acceleration,
			SkillName.Swiftcast,
			SkillName.Verthunder3,
			SkillName.Tincture,
			SkillName.Fleche,
			SkillName.Verthunder3,
			SkillName.Embolden,
			SkillName.Manafication,
			SkillName.EnchantedRiposte,
			SkillName.ContreSixte,
			SkillName.EnchantedZwerchhau,
			SkillName.Engagement,
			SkillName.EnchantedRedoublement,
			SkillName.CorpsACorps,
			SkillName.Engagement,
			SkillName.Verholy,
			SkillName.CorpsACorps,
			SkillName.Scorch,
			SkillName.ViceOfThorns,
			SkillName.Resolution,
			SkillName.Prefulgence,
			SkillName.GrandImpact,
			SkillName.Acceleration,
			SkillName.Verfire,
			SkillName.GrandImpact,
			SkillName.Verthunder3,
			SkillName.Veraero3,
			SkillName.Fleche,
			SkillName.Verstone,
			SkillName.Veraero3,
			SkillName.Verfire,
			SkillName.Veraero3,
			SkillName.Swiftcast,
			SkillName.Verthunder3,
			SkillName.ContreSixte,
		].forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		const state = controller.game as RDMState;
		expect(state.resources.get(ResourceType.WhiteMana).availableAmount()).toEqual(54);
		expect(state.resources.get(ResourceType.BlackMana).availableAmount()).toEqual(54);
	}),
);

it(
	"breaks combo with manafic but not reprise",
	testWithConfig({}, () => {
		const state = controller.game as RDMState;
		state.resources.get(ResourceType.WhiteMana).overrideCurrentValue(40);
		state.resources.get(ResourceType.BlackMana).overrideCurrentValue(40);
		[
			SkillName.EnchantedRiposte,
			SkillName.EnchantedReprise, // does not break the combo or lose mana stacks
			SkillName.EnchantedZwerchhau, // combo
			SkillName.Manafication,
			SkillName.EnchantedRedoublement,
		].forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		expect(state.resources.get(ResourceType.ManaStacks).availableAmount()).toEqual(3);
		compareDamageTables([
			{
				skillName: SkillName.EnchantedRiposte,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.EnchantedReprise,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.EnchantedZwerchhau,
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: SkillName.EnchantedRedoublement,
				displayedModifiers: [PotencyModifierType.MANAFIC],
				hitCount: 1,
			},
			{
				skillName: SkillName.Manafication,
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

// it("interrupts verstone if it falls off mid-cast")
