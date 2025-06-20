// Behaviors that are manually tested:
// - Unmend reduces shadowstride cd
// - Delirium combo gets broken appropriately
// - Living shadow does expected amount of potency
import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
	damageData,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { DRKState } from "../Game/Jobs/DRK";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("DRK");

it(
	"reduces the cd of shadowstride when unmend is used",
	testWithConfig({}, () => {
		applySkill("SHADOWSTRIDE");
		applySkill("UNMEND");
		const state = controller.game as DRKState;
		expect(state.cooldowns.get("cd_SHADOWSTRIDE").timeTillNextStackAvailable()).toBeLessThan(
			25,
		);
	}),
);

it(
	"breaks delirium combo correctly",
	testWithConfig({}, () => {
		const state = controller.game as DRKState;
		(
			[
				"DELIRIUM",
				"SCARLET_DELIRIUM",
				"HARD_SLASH", // breaks combo
				"BLOODSPILLER", // replaced by scarlet delirium button automatically
				"SYPHON_STRIKE", // combo
				"BLOODSPILLER", // replaced by scarlet delirium button automatically
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		compareDamageTables([
			{
				skillName: "SCARLET_DELIRIUM",
				displayedModifiers: [],
				hitCount: 3,
			},
			{
				skillName: "HARD_SLASH",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SYPHON_STRIKE",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "DELIRIUM",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"has roughly correct damage for living shadow at 100",
	testWithConfig({ level: 100 }, () => {
		const state = controller.game as DRKState;
		(["LIVING_SHADOW"] as ActionKey[]).forEach(applySkill);
		// wait for damage applications
		controller.step(20);
		// living shadow is unaffected by darkside
		// per the balance, living shadow does
		// 2450 pet potency at level 100,
		// 2250 pet potency at level 90,
		// and 1700 pet potency at level 80
		// pet potency does roughly 5% more than DRK potency with darkside active, so we need
		// to further scale by another 10% to account for our default potency numbers excluding darkside
		expect(damageData.mainTableSummary.totalPotencyWithoutPot).toBeCloseTo(2450 * 1.05 * 1.1);
	}),
);

it(
	"has roughly correct damage for living shadow at 90",
	testWithConfig({ level: 90 }, () => {
		const state = controller.game as DRKState;
		(["LIVING_SHADOW"] as ActionKey[]).forEach(applySkill);
		// wait for damage applications
		controller.step(20);
		expect(damageData.mainTableSummary.totalPotencyWithoutPot).toBeCloseTo(2250 * 1.05 * 1.1);
	}),
);

it(
	"has roughly correct damage for living shadow at 80",
	testWithConfig({ level: 80 }, () => {
		const state = controller.game as DRKState;
		(["LIVING_SHADOW"] as ActionKey[]).forEach(applySkill);
		// wait for damage applications
		controller.step(20);
		// living shadow is unaffected by darkside
		// per the balance, living shadow does
		// 2450 pet potency at level 100,
		// 2250 pet potency at level 90,
		// and 1700 pet potency at level 80
		// pet potency does roughly 5% more than DRK potency with darkside active, so we need
		// to further scale by another 10% to account for our default potency numbers excluding darkside
		expect(damageData.mainTableSummary.totalPotencyWithoutPot).toBeCloseTo(1700 * 1.05 * 1.1);
	}),
);
