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

import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	applySkillMultiTarget,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { ShellJob } from "../Controller/Common";
import { PotencyModifierType } from "../Game/Potency";
import { ResourceType, SkillName } from "../Game/Common";
import { BLMState } from "../Game/Jobs/BLM";
import { getResourceInfo, ResourceInfo } from "../Game/Resources";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn(ShellJob.BLM);

const checkEnochian = () => (controller.game as BLMState).hasEnochian();

it(
	"accepts the standard rotation",
	testWithConfig({}, () => {
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
	}),
);

// Because despair is instant at level 100, we test this at level 90
it(
	"drops enochian with fast F3 + 4xF4 + despair",
	testWithConfig({ level: 90, spellSpeed: 420 }, () => {
		let alertMsg = "";
		let warnMsg = "";
		const alert = jest.spyOn(window, "alert").mockImplementation((msg) => {
			alertMsg = msg;
		});
		const warn = jest.spyOn(console, "warn").mockImplementation((msg) => {
			warnMsg = msg;
		});
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
	}),
);

it(
	"removes paradox on enochian drop",
	testWithConfig({ spellSpeed: 420 }, () => {
		[SkillName.Fire3, SkillName.Swiftcast, SkillName.Blizzard3].forEach(applySkill);
		expect(checkEnochian()).toBeTruthy();
		expect(controller.game.resources.get(ResourceType.Paradox).available(1)).toBeTruthy();
		controller.step(15.01); // wait just a tiny bit after the enochian drop
		expect(checkEnochian()).toBeFalsy();
		expect(controller.game.resources.get(ResourceType.Paradox).available(0)).toBeTruthy();
	}),
);

it(
	"has different F1 modifiers at different AF/UI states",
	testWithConfig({}, () => {
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
	}),
);

it(
	"accepts the standard aoe rotation",
	testWithConfig({}, () => {
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
		expect(
			(controller.game as BLMState).resources.get(ResourceType.Mana).availableAmount(),
		).toEqual(2380);
		expect(
			(controller.game as BLMState).resources.get(ResourceType.UmbralHeart).availableAmount(),
		).toEqual(0);
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
		expect(
			(controller.game as BLMState).resources.get(ResourceType.Mana).availableAmount(),
		).toEqual(0);
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
	}),
);

it(
	"replaces paradox below level 90",
	testWithConfig({ level: 80 }, () => {
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
	}),
);

it(
	"replaces f1/b1 with paradox when needed",
	testWithConfig({ level: 100 }, () => {
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
	}),
);

// 2.38 GCD: doing slow F3 + 5xF4 drains all mana; enochian drops midway through the ensuing B3
// which will then fail due to not having enough mana (unaspected B3 needs 800 MP)
it(
	"checks MP cost at end of cast bar",
	testWithConfig({ level: 70, spellSpeed: 700 }, () => {
		let alertMsg = "";

		/* eslint-disable @typescript-eslint/no-unused-vars */
		let warnMsg = "";
		const alert = jest.spyOn(window, "alert").mockImplementation((msg) => {
			alertMsg = msg;
		});
		const warn = jest.spyOn(console, "warn").mockImplementation((msg) => {
			warnMsg = msg;
		});
		/* eslint-enable @typescript-eslint/no-unused-vars */

		[
			SkillName.Fire3,
			SkillName.Fire4,
			SkillName.Fire4,
			SkillName.Fire4,
			SkillName.Fire4,
			SkillName.Fire4,
			SkillName.Blizzard3,
			SkillName.Thunder3,
		].forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);
		expect(alertMsg).toEqual("cast failed! Resources for Blizzard 3 are no longer available");
		compareDamageTables([
			{
				skillName: SkillName.Fire3,
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: SkillName.Fire4,
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 5,
			},
			// B3 cast is canceled, thunder is unaspected
			{
				skillName: SkillName.Thunder3,
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"overwrites DoT with no gap",
	testWithConfig({}, () => {
		// Fast forward to zero to make sure gap calcs are positive
		controller.step(controller.gameConfig.countdown);
		[
			SkillName.Blizzard3,
			SkillName.HighThunder,
			SkillName.Fire3,
			SkillName.HighThunder2,
		].forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);

		const state = controller.game as BLMState;

		// Each DoT should have applied once
		expect(damageData.dotTables.get(ResourceType.HighThunder)?.tableRows.length).toBe(1);
		expect(damageData.dotTables.get(ResourceType.HighThunderII)?.tableRows.length).toBe(1);

		const b3CastTime = state.config.getAfterTaxCastTime(state.config.adjustedCastTime(3.5));
		const htApplicationDelay = state.skillsList.get(SkillName.HighThunder).applicationDelay;
		const htApplicationTime = b3CastTime + htApplicationDelay;
		// check the DoT summary for HT
		const htSummary = damageData.dotTables.get(ResourceType.HighThunder)?.summary;
		// There should be a gap from the start of the pull to the initial application
		expect(htSummary?.cumulativeGap).toBeCloseTo(htApplicationTime, 0);
		// HT will not have overridden anything
		expect(htSummary?.cumulativeOverride).toEqual(0);

		const ht2Summary = damageData.dotTables.get(ResourceType.HighThunderII)?.summary;
		// Overriding DoTs should not list a gap
		expect(ht2Summary?.cumulativeGap).toEqual(0);
		const gcdRecastTime = state.config.getAfterTaxGCD(state.config.adjustedGCD(2.5));
		const ht2ApplicationDelay = state.skillsList.get(SkillName.HighThunder2).applicationDelay;
		const ht2ApplicationTime = b3CastTime + 2 * gcdRecastTime + ht2ApplicationDelay;
		const expectedOverride =
			(getResourceInfo(ShellJob.BLM, ResourceType.HighThunder) as ResourceInfo).maxTimeout -
			(ht2ApplicationTime - htApplicationTime);
		// The override amount should be applied to the overriding DoT, not the overridden one
		// controller time can be inexact due to floating point nonsense, so just expect it to be close
		expect(ht2Summary?.cumulativeOverride).toBeCloseTo(expectedOverride, 0);
	}),
);

it(
	"accepts the basic nonstandard AoE rotation",
	testWithConfig({}, () => {
		const targetCount = 3;
		[
			SkillName.HighBlizzard2, // enter enochian for testing purposes
			SkillName.Freeze,
			SkillName.HighThunder2,
			SkillName.Transpose,
			SkillName.Flare,
			SkillName.Flare,
			SkillName.FlareStar,
		].forEach((skill) => applySkillMultiTarget(skill, targetCount));
		controller.step(4);
		compareDamageTables([
			{
				skillName: SkillName.HighBlizzard2,
				displayedModifiers: [],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.Freeze,
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.HighThunder2,
				displayedModifiers: [],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.Flare,
				displayedModifiers: [PotencyModifierType.AF1],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.Flare,
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.FlareStar,
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: SkillName.Transpose,
				displayedModifiers: [],
				hitCount: 1,
			}
		]);
	})
);