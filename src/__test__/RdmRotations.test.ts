// Behaviors that are manually tested:
// - Doing any non-enchanted GCD consumes all mana stacks (TODO: check if reprise does this)
// - Doing un-enchanted GCDs is physical damage
// - Mana imbalance state halves gain of other color
import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { ResourceType, SkillName } from "../Game/Common";
import { RDMState } from "../Game/Jobs/RDM";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("RDM");

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
