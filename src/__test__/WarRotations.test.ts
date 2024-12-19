import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { Debug, ResourceType, SkillName } from "../Game/Common";
import { WARState } from "../Game/Jobs/WAR";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("WAR");

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
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		// Mythril Tempest gives about 30.45 seconds of Surging Tempest immediately
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeGreaterThan(30);
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(31);
		applySkill(SkillName.Onslaught);

		// wait for Surging Tempest to nearly expire before refreshing
		applySkill(SkillName.Overpower);
		controller.step(27.7);
		applySkill(SkillName.MythrilTempest);

		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
		expect(state.resources.timeTillReady(ResourceType.SurgingTempest)).toBeLessThan(1);
		// Surging Tempest should drop before being re-applied after the application delay on Mythril Tempest
		controller.step(state.resources.timeTillReady(ResourceType.SurgingTempest) + Debug.epsilon);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(false);
		applySkill(SkillName.Onslaught);
		expect(state.hasResourceAvailable(ResourceType.SurgingTempest)).toBe(true);
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
