// Tests for potencies and basic job gauge validation for BLM.
// These tests each reset the global controller object and add actions to the timeline.
// If/when we ever get around to de-globaling the controller, the tests can be paramaterized
//
// TODO other things to test:
// - lines near sps breakpoints
// - lines that require a lucid/mp tick
// - exact potency numbers under modifiers + buffs
// - cast time modifiers (instant cast abilities, LL)
// - umbral soul stops timer
// - polyglot generation
// - replacement skills + invalid skills on record loads when level synced (T3 <-> HT, F2 <-> HF2, etc.)
// - timeline load/unload
// - using spells that require AF/UI outside of AF/UI
// - using triplecast when there are already triplecast stacks

import fs from "node:fs";
import {controller} from "./Controller/Controller";
import {TickMode} from "./Controller/Common";
import {DEFAULT_CONFIG, GameConfig} from "./Game/GameConfig";
import {PotencyModifierType} from "./Game/Potency";
import {ResourceType, SkillName} from "./Game/Common";
import {BLMState} from "./Game/Jobs/BLM";
import {DamageStatisticsData, mockDamageStatUpdateFn} from "./Components/DamageStatistics";


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
		totalPotency: {applied: 0, pending: 0},
		lastDamageApplicationTime: 0,
		gcdSkills: {applied: 0, pending: 0},
		mainTable: [],
		mainTableSummary: {
			totalPotencyWithoutPot: 0, 
			totalPotPotency: 0,
			totalPartyBuffPotency: 0,
		},
		thunderTable: [],
		thunderTableSummary: {
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
		historical: false,
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
		controller.timeline.addSlot()
	}
	// clear stats from the last run
	resetDamageData();
	// monkeypatch the updateDamageStats function to avoid needing to initialize the frontend
	mockDamageStatUpdateFn((newData: DamageStatisticsData) => {
		damageData = newData;
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
		const newConfig = {...DEFAULT_CONFIG};
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
	controller.requestUseSkill({skillName: skillName});
};

type ShortDamageEntry = {
	skillName: SkillName,
	displayedModifiers: PotencyModifierType[],
	hitCount: number,
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
			return a.displayedModifiers.map((x) => x.toString()).join().localeCompare(
				b.displayedModifiers.map((x) => x.toString()).join()
			);
		}
		return nameCmp;
	};
	actualDamageEntries.sort(damageEntryComparator);
	expectedDamageEntries.sort(damageEntryComparator);
	expect(actualDamageEntries).toEqual(expectedDamageEntries);
};

const checkEnochian = () => (controller.game as BLMState).hasEnochian();;

it("accepts the standard rotation", testWithConfig({}, () => {
	[
		SkillName.Blizzard3, // precast, no enochian
		SkillName.Blizzard4,
		SkillName.Fire3,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Paradox,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Despair,
		SkillName.FlareStar,
	].forEach(applySkill);
	// wait 4 seconds for cast finish + damage application
	controller.step(4);
	compareDamageTables([
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [], // unaspected
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard4,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire3,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire4,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 6,
		},
		{
			skillName: SkillName.Paradox,
			// unaspected spell under enochian
			displayedModifiers: [PotencyModifierType.ENO],
			hitCount: 1,
		},
		{
			skillName: SkillName.Despair,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
		{
			skillName: SkillName.FlareStar,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
	]);
}));

it("drops enochian with fast F3 + 4xF4 + despair", testWithConfig({spellSpeed: 420}, () => {
	let alertMsg = "";
	let warnMsg = "";
	const alert = jest.spyOn(window, "alert").mockImplementation((msg) => { alertMsg = msg; });
	const warn = jest.spyOn(console, "warn").mockImplementation((msg) => { warnMsg = msg; });
	// at min sps (420), 4xF4 after a fast F3 will drop enochian during the 
	// castbar of despair
	[
		// needed to make F3 fast
		SkillName.Blizzard3,
		SkillName.Fire3,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Fire4,
		SkillName.Despair,
	].forEach(applySkill);
	// wait 4 seconds for cast finish + damage application
	controller.step(4);
	expect(alert).toHaveBeenCalled();
	expect(warn).toHaveBeenCalled();
	expect(alertMsg).toEqual("cast failed! Resources for Despair are no longer available");
	expect(warnMsg).toEqual("failed: Despair");
	expect(checkEnochian()).toBeFalsy();
	compareDamageTables([ 
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire3,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire4,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 4,
		},
	]);
}));

it("removes paradox on enochian drop", testWithConfig({ spellSpeed : 420 }, () => {
	[SkillName.Fire3, SkillName.Swiftcast, SkillName.Blizzard3].forEach(applySkill)
	expect(checkEnochian()).toBeTruthy();
	expect(controller.game.resources.get(ResourceType.Paradox).available(1)).toBeTruthy();
	controller.step(15.01); // wait just a tiny bit after the enochian drop
	expect(checkEnochian()).toBeFalsy();
	expect(controller.game.resources.get(ResourceType.Paradox).available(0)).toBeTruthy();
}));

it("has different F1 modifiers at different AF/UI states", testWithConfig({}, () => {
	[
		SkillName.Fire, // no eno
		SkillName.Fire, // AF1
		SkillName.Fire, // AF2
		SkillName.Fire, // AF3
		SkillName.Blizzard3, // AF3
		SkillName.Paradox, // eno
		SkillName.Fire, // UI3
	].forEach(applySkill);
	// wait for cast time + damage application
	controller.step(4);
	expect(checkEnochian()).toBeFalsy();
	compareDamageTables([
		{
			skillName: SkillName.Fire,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire,
			displayedModifiers: [PotencyModifierType.AF1],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire,
			displayedModifiers: [PotencyModifierType.AF2],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Paradox,
			displayedModifiers: [PotencyModifierType.ENO],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
	]);
}));

it("accepts the standard aoe rotation", testWithConfig({}, () => {
	[
		SkillName.HighBlizzard2, // no eno
		SkillName.Freeze, // UI3
		SkillName.HighFire2, // UI3
		// it's optimal for dps to skip these, but we're testing resource consumption here
		SkillName.HighFire2, // AF3
		SkillName.HighFire2, // AF3
		// hard clip triplecast
		SkillName.Triplecast,
		SkillName.Flare, // AF3
	].forEach(applySkill);
	// wait for cast time + damage application
	controller.step(4);
	expect(checkEnochian()).toBeTruthy();
	expect((controller.game as BLMState).resources.get(ResourceType.Mana).availableAmount()).toEqual(2380);
	expect((controller.game as BLMState).resources.get(ResourceType.UmbralHeart).availableAmount()).toEqual(0);
	[
		SkillName.Flare, // AF3
		SkillName.FlareStar, // Flare
		SkillName.Manafont,
		SkillName.Triplecast,
		SkillName.Flare, // AF3
		SkillName.Flare, // AF3
		SkillName.FlareStar, // Flare
	].forEach(applySkill);
	controller.step(4);
	expect(checkEnochian()).toBeTruthy();
	expect((controller.game as BLMState).resources.get(ResourceType.Mana).availableAmount()).toEqual(0);
	compareDamageTables([
		{
			skillName: SkillName.Flare,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 4,
		},
		{
			skillName: SkillName.FlareStar,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 2,
		},
		{
			skillName: SkillName.HighFire2,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 2,
		},
		{
			skillName: SkillName.HighFire2,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Freeze,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.HighBlizzard2,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Manafont,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Triplecast,
			displayedModifiers: [],
			hitCount: 2,
		},
	]);
}));

it("replaces paradox below level 90", testWithConfig({level: 80}, () => {
	[
		SkillName.Blizzard3,
		SkillName.Blizzard4,
		SkillName.Fire3,
		SkillName.Paradox, // should be replaced by fire 1
		SkillName.Blizzard3,
		SkillName.Paradox, // should be replaced by blizzard 1
	].forEach(applySkill);
	// wait for cast time + damage application
	controller.step(4);
	compareDamageTables([
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard4,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire3,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
	]);
}));

it("replaces f1/b1 with paradox when needed", testWithConfig({level: 100}, () => {
	[
		SkillName.Blizzard3,
		SkillName.Blizzard4,
		SkillName.Fire3,
		SkillName.Fire, // should be replaced by paradox
		SkillName.Blizzard3,
		SkillName.Blizzard, // should be replaced by paradox
	].forEach(applySkill);
	// wait for cast time + damage application
	controller.step(4);
	compareDamageTables([
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [],
			hitCount: 1,
		},
		{
			skillName: SkillName.Blizzard4,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Fire3,
			displayedModifiers: [PotencyModifierType.UI3],
			hitCount: 1,
		},
		{
			skillName: SkillName.Paradox,
			displayedModifiers: [PotencyModifierType.ENO],
			hitCount: 2,
		},
		{
			skillName: SkillName.Blizzard3,
			displayedModifiers: [PotencyModifierType.AF3],
			hitCount: 1,
		},
	]);
}));