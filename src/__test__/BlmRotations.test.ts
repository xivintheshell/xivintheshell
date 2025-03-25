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
	testDamageFromTimeline,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { BLMState } from "../Game/Jobs/BLM";
import { getResourceInfo, ResourceInfo } from "../Game/Resources";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("BLM");

const checkEnochian = () => (controller.game as BLMState).hasEnochian();

it(
	"accepts the standard rotation",
	testWithConfig({}, () => {
		(
			[
				"BLIZZARD_III", // precast, no enochian
				"BLIZZARD_IV",
				"FIRE_III",
				"FIRE_IV",
				"FIRE_IV",
				"FIRE_IV",
				"FIRE_IV",
				"PARADOX",
				"FIRE_IV",
				"FIRE_IV",
				"DESPAIR",
				"FLARE_STAR",
			] as ActionKey[]
		).forEach(applySkill);
		// wait 4 seconds for cast finish + damage application
		controller.step(4);
		compareDamageTables([
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [], // unaspected
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD_IV",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FIRE_III",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FIRE_IV",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 6,
			},
			{
				skillName: "PARADOX",
				// unaspected spell under enochian
				displayedModifiers: [PotencyModifierType.ENO],
				hitCount: 1,
			},
			{
				skillName: "DESPAIR",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
			{
				skillName: "FLARE_STAR",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"has different F1 modifiers at different AF/UI states",
	testWithConfig({}, () => {
		(
			[
				"FIRE", // no eno
				"FIRE", // AF1
				"FIRE", // AF2
				"FIRE", // AF3
				"BLIZZARD_III", // AF3
				"PARADOX", // eno
				"FIRE", // UI3
			] as ActionKey[]
		).forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);
		expect(checkEnochian()).toBeFalsy();
		compareDamageTables([
			{
				skillName: "FIRE",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FIRE",
				displayedModifiers: [PotencyModifierType.AF1],
				hitCount: 1,
			},
			{
				skillName: "FIRE",
				displayedModifiers: [PotencyModifierType.AF2],
				hitCount: 1,
			},
			{
				skillName: "FIRE",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
			{
				skillName: "PARADOX",
				displayedModifiers: [PotencyModifierType.ENO],
				hitCount: 1,
			},
			{
				skillName: "FIRE",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"accepts the standard aoe rotation",
	testWithConfig({}, () => {
		(
			[
				"HIGH_BLIZZARD_II", // no eno
				"FREEZE", // UI3
				"HIGH_FIRE_II", // UI3
				// it's optimal for dps to skip these, but we're testing resource consumption here
				"HIGH_FIRE_II", // AF3
				"HIGH_FIRE_II", // AF3
				// hard clip triplecast
				"TRIPLECAST",
				"FLARE", // AF3
			] as ActionKey[]
		).forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);
		expect(checkEnochian()).toBeTruthy();
		expect((controller.game as BLMState).resources.get("MANA").availableAmount()).toEqual(2380);
		expect(
			(controller.game as BLMState).resources.get("UMBRAL_HEART").availableAmount(),
		).toEqual(0);
		(
			[
				"FLARE", // AF3
				"FLARE_STAR", // Flare
				"MANAFONT",
				"TRIPLECAST",
				"FLARE", // AF3
				"FLARE", // AF3
				"FLARE_STAR", // Flare
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		expect(checkEnochian()).toBeTruthy();
		expect((controller.game as BLMState).resources.get("MANA").availableAmount()).toEqual(0);
		compareDamageTables([
			{
				skillName: "FLARE",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 4,
			},
			{
				skillName: "FLARE_STAR",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 2,
			},
			{
				skillName: "HIGH_FIRE_II",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 2,
			},
			{
				skillName: "HIGH_FIRE_II",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FREEZE",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "HIGH_BLIZZARD_II",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "MANAFONT",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "TRIPLECAST",
				displayedModifiers: [],
				hitCount: 2,
			},
		]);
	}),
);

it(
	"replaces paradox below level 90",
	testWithConfig({ level: 80 }, () => {
		(
			[
				"BLIZZARD_III",
				"BLIZZARD_IV",
				"FIRE_III",
				"PARADOX", // should be replaced by fire 1
				"BLIZZARD_III",
				"PARADOX", // should be replaced by blizzard 1
			] as ActionKey[]
		).forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);
		compareDamageTables([
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD_IV",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FIRE_III",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FIRE",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"replaces f1/b1 with paradox when needed",
	testWithConfig({ level: 100 }, () => {
		(
			[
				"BLIZZARD_III",
				"BLIZZARD_IV",
				"FIRE_III",
				"FIRE", // should be replaced by paradox
				"BLIZZARD_III",
				"BLIZZARD", // should be replaced by paradox
			] as ActionKey[]
		).forEach(applySkill);
		// wait for cast time + damage application
		controller.step(4);
		compareDamageTables([
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "BLIZZARD_IV",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "FIRE_III",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
			},
			{
				skillName: "PARADOX",
				displayedModifiers: [PotencyModifierType.ENO],
				hitCount: 2,
			},
			{
				skillName: "BLIZZARD_III",
				displayedModifiers: [PotencyModifierType.AF3],
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
		(["BLIZZARD_III", "HIGH_THUNDER", "FIRE_III", "HIGH_THUNDER_II"] as ActionKey[]).forEach(
			applySkill,
		);
		// wait for cast time + damage application
		controller.step(4);

		const state = controller.game as BLMState;

		// Each DoT should have applied once
		expect(damageData.dotTables.get("HIGH_THUNDER")?.tableRows.length).toBe(1);
		expect(damageData.dotTables.get("HIGH_THUNDER_II")?.tableRows.length).toBe(1);

		const b3CastTime = state.config.getAfterTaxCastTime(state.config.adjustedCastTime(3.5));
		const htApplicationDelay = state.skillsList.get("HIGH_THUNDER").applicationDelay;
		const htApplicationTime = b3CastTime + htApplicationDelay;
		// check the DoT summary for HT
		const htSummary = damageData.dotTables.get("HIGH_THUNDER")?.summary;
		// There should be a gap from the start of the pull to the initial application
		expect(htSummary?.cumulativeGap).toBeCloseTo(htApplicationTime, 0);
		// HT will not have overridden anything
		expect(htSummary?.cumulativeOverride).toEqual(0);

		const ht2Summary = damageData.dotTables.get("HIGH_THUNDER_II")?.summary;
		// Overriding DoTs should not list a gap
		expect(ht2Summary?.cumulativeGap).toEqual(0);
		const gcdRecastTime = state.config.getAfterTaxGCD(state.config.adjustedGCD(2.5));
		const ht2ApplicationDelay = state.skillsList.get("HIGH_THUNDER_II").applicationDelay;
		const ht2ApplicationTime = b3CastTime + 2 * gcdRecastTime + ht2ApplicationDelay;
		const expectedOverride =
			(getResourceInfo("BLM", "HIGH_THUNDER") as ResourceInfo).maxTimeout -
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
		(
			[
				"HIGH_BLIZZARD_II", // enter enochian for testing purposes
				"FREEZE",
				"HIGH_THUNDER_II",
				"TRANSPOSE",
				"FLARE",
				"FLARE",
				"FLARE_STAR",
			] as ActionKey[]
		).forEach((skill) => applySkillMultiTarget(skill, targetCount));
		controller.step(4);
		compareDamageTables([
			{
				skillName: "HIGH_BLIZZARD_II",
				displayedModifiers: [],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "FREEZE",
				displayedModifiers: [PotencyModifierType.UI3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "HIGH_THUNDER_II",
				displayedModifiers: [],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "FLARE",
				displayedModifiers: [PotencyModifierType.AF1],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "FLARE",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "FLARE_STAR",
				displayedModifiers: [PotencyModifierType.AF3],
				hitCount: 1,
				targetCount,
			},
			{
				skillName: "TRANSPOSE",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"loads: blm_100_7.05_top_p6_delay_manafont_2.44.txt",
	testDamageFromTimeline("blm_100_7.05_top_p6_delay_manafont_2.44.txt", {
		time: 267.842,
		lastDamageApplicationTime: 267.766,
		totalPotency: {
			applied: 82194.63,
			pending: 0,
		},
		gcdSkills: {
			applied: 104,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 81214.53,
			totalPotPotency: 980.09,
		},
		dotTables: new Map([
			[
				"HIGH_THUNDER",
				{
					summary: {
						totalTicks: 88,
						maxTicks: 89,
						dotCoverageTimeFraction: 0.9788,
						cumulativeGap: 4.966,
						cumulativeOverride: 9.801,
						totalPotencyWithoutPot: 8904.93,
						totalPotPotency: 80.59,
					},
				},
			],
		]),
	}),
);

it(
	"loads: blm_100_m4s_mll_starter.txt",
	testDamageFromTimeline("blm_100_m4s_mll_starter.txt", {
		time: 392.33,
		lastDamageApplicationTime: 390.904,
		totalPotency: {
			applied: 125457.19,
			pending: 0,
		},
		gcdSkills: {
			applied: 159,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 123550.81,
			totalPotPotency: 1906.38,
		},
		dotTables: new Map([
			[
				"HIGH_THUNDER",
				{
					summary: {
						totalTicks: 127,
						maxTicks: 129,
						dotCoverageTimeFraction: 0.991,
						cumulativeGap: 1.197,
						cumulativeOverride: 6.16,
						totalPotencyWithoutPot: 12924.09,
						totalPotPotency: 162.07,
					},
				},
			],
		]),
	}),
);

it(
	"loads: blm_legacy_test_ll_toggle.txt",
	testDamageFromTimeline("blm_legacy_test_ll_toggle.txt", {
		time: 27.197,
		lastDamageApplicationTime: 27.189,
		totalPotency: {
			applied: 8277.24,
			pending: 161.25,
		},
		gcdSkills: {
			applied: 11,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 8277.24,
		},
	}),
);
