import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { Debug, ResourceType } from "../Game/Common";
import { WARState } from "../Game/Jobs/WAR";
import { ActionKey } from "../Game/Data/Actions";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("WAR");

it(
	"simulates 7.05 standard opener correctly",
	testWithConfig({}, () => {
		(
			[
				"TOMAHAWK",
				"INFURIATE",
				"HEAVY_SWING",
				"MAIM",
				"STORMS_EYE",
				"INNER_RELEASE",
				"INNER_CHAOS",
				"UPHEAVAL",
				"ONSLAUGHT",
				"PRIMAL_REND",
				"ONSLAUGHT",
				"PRIMAL_RUINATION",
				"ONSLAUGHT",
				"FELL_CLEAVE",
				"FELL_CLEAVE",
				"FELL_CLEAVE",
				"PRIMAL_WRATH",
				"INFURIATE",
				"INNER_CHAOS",
				"HEAVY_SWING",
				"MAIM",
				"STORMS_PATH",
				"FELL_CLEAVE",
				"INFURIATE",
				"INNER_CHAOS",
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(1);
		const state = controller.game as WARState;
		expect(state.resources.get(ResourceType.BeastGauge).availableAmount()).toEqual(0);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		compareDamageTables([
			{
				skillName: "TOMAHAWK",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "HEAVY_SWING",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "HEAVY_SWING",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: "MAIM",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "MAIM",
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: "STORMS_EYE",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "STORMS_PATH",
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: "INNER_CHAOS",
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 3,
			},
			{
				skillName: "FELL_CLEAVE",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: "FELL_CLEAVE",
				displayedModifiers: [
					PotencyModifierType.SURGING_TEMPEST,
					PotencyModifierType.AUTO_CDH,
				],
				hitCount: 3,
			},
			{
				skillName: "PRIMAL_REND",
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: "PRIMAL_RUINATION",
				displayedModifiers: [
					PotencyModifierType.AUTO_CDH,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: "PRIMAL_WRATH",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: "ONSLAUGHT",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 3,
			},
			{
				skillName: "UPHEAVAL",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: "INNER_RELEASE",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "INFURIATE",
				displayedModifiers: [],
				hitCount: 3,
			},
		]);
	}),
);

it(
	"Tracks surging tempest correctly",
	testWithConfig({}, () => {
		(["OVERPOWER", "ONSLAUGHT", "MYTHRIL_TEMPEST"] as ActionKey[]).forEach(applySkill);
		const state = controller.game as WARState;
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		// Mythril Tempest gives about 30.45 seconds of Surging Tempest immediately
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeGreaterThan(30);
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(31);
		applySkill("ONSLAUGHT");

		// wait for Surging Tempest to nearly expire before refreshing
		applySkill("OVERPOWER");
		controller.step(27.7);
		applySkill("MYTHRIL_TEMPEST");

		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(1);
		// Surging Tempest should drop before being re-applied after the application delay on Mythril Tempest
		controller.step(state.resources.timeTillReady(ResourceType.SurgingTempest) + Debug.epsilon);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(false);
		applySkill("ONSLAUGHT");
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		// wait for damage application
		controller.step(1);

		compareDamageTables([
			{
				skillName: "OVERPOWER",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "OVERPOWER",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 1,
			},
			{
				skillName: "MYTHRIL_TEMPEST",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "MYTHRIL_TEMPEST",
				displayedModifiers: [
					PotencyModifierType.COMBO,
					PotencyModifierType.SURGING_TEMPEST,
				],
				hitCount: 1,
			},
			{
				skillName: "ONSLAUGHT",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "ONSLAUGHT",
				displayedModifiers: [PotencyModifierType.SURGING_TEMPEST],
				hitCount: 2,
			},
		]);
	}),
);
