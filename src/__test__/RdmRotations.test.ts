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
import { RDMState } from "../Game/Jobs/RDM";
import { ActionKey } from "../Game/Data/Actions";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("RDM");

it(
	"consumes instants in the correct order",
	testWithConfig({}, () => {
		(["JOLT_III", "ACCELERATION", "SWIFTCAST", "VERTHUNDER_III"] as ActionKey[]).forEach(
			applySkill,
		);
		const state = controller.game as RDMState;
		expect(state.hasResourceAvailable("ACCELERATION")).toBeFalsy();
		expect(state.hasResourceAvailable("SWIFTCAST")).toBeTruthy();
		expect(state.hasResourceAvailable("DUALCAST")).toBeTruthy();
		applySkill("VERAERO_III");
		expect(state.hasResourceAvailable("ACCELERATION")).toBeFalsy();
		expect(state.hasResourceAvailable("SWIFTCAST")).toBeTruthy();
		expect(state.hasResourceAvailable("DUALCAST")).toBeFalsy();
		applySkill("VERAERO_III");
		expect(state.hasResourceAvailable("ACCELERATION")).toBeFalsy();
		expect(state.hasResourceAvailable("SWIFTCAST")).toBeFalsy();
		expect(state.hasResourceAvailable("DUALCAST")).toBeFalsy();
	}),
);

it(
	"allows triple zwerchhau",
	testWithConfig({}, () => {
		// just cast each spell 7x until we get 49/49, which is enough for triple zwerchhau
		(
			[
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"VERTHUNDER_III",
				"VERAERO_III",
				"ENCHANTED_ZWERCHHAU",
				"ENCHANTED_ZWERCHHAU",
				"ENCHANTED_ZWERCHHAU",
				"VERHOLY",
				"SCORCH",
				"RESOLUTION",
			] as ActionKey[]
		).forEach(applySkill);
	}),
);

it(
	"performs the standard opener",
	testWithConfig({ spellSpeed: 420 }, () => {
		// 3 procs are guaranteed in the standard opener
		(
			[
				"VERTHUNDER_III",
				"VERAERO_III",
				"ACCELERATION",
				"SWIFTCAST",
				"VERTHUNDER_III",
				"TINCTURE",
				"FLECHE",
				"VERTHUNDER_III",
				"EMBOLDEN",
				"MANAFICATION",
				"ENCHANTED_RIPOSTE",
				"CONTRE_SIXTE",
				"ENCHANTED_ZWERCHHAU",
				"ENGAGEMENT",
				"ENCHANTED_REDOUBLEMENT",
				"CORPS_A_CORPS",
				"ENGAGEMENT",
				"VERHOLY",
				"CORPS_A_CORPS",
				"SCORCH",
				"VICE_OF_THORNS",
				"RESOLUTION",
				"PREFULGENCE",
				"GRAND_IMPACT",
				"ACCELERATION",
				"VERFIRE",
				"GRAND_IMPACT",
				"VERTHUNDER_III",
				"VERAERO_III",
				"FLECHE",
				"VERSTONE",
				"VERAERO_III",
				"VERFIRE",
				"VERAERO_III",
				"SWIFTCAST",
				"VERTHUNDER_III",
				"CONTRE_SIXTE",
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		const state = controller.game as RDMState;
		expect(state.resources.get("WHITE_MANA").availableAmount()).toEqual(54);
		expect(state.resources.get("BLACK_MANA").availableAmount()).toEqual(54);
	}),
);

it(
	"breaks combo with manafic but not reprise",
	testWithConfig({}, () => {
		const state = controller.game as RDMState;
		state.resources.get("WHITE_MANA").overrideCurrentValue(40);
		state.resources.get("BLACK_MANA").overrideCurrentValue(40);
		(
			[
				"ENCHANTED_RIPOSTE",
				"ENCHANTED_REPRISE", // does not break the combo or lose mana stacks
				"ENCHANTED_ZWERCHHAU", // combo
				"MANAFICATION",
				"ENCHANTED_REDOUBLEMENT",
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		expect(state.resources.get("MANA_STACKS").availableAmount()).toEqual(3);
		compareDamageTables([
			{
				skillName: "ENCHANTED_RIPOSTE",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "ENCHANTED_REPRISE",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "ENCHANTED_ZWERCHHAU",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "ENCHANTED_REDOUBLEMENT",
				displayedModifiers: [PotencyModifierType.MANAFIC],
				hitCount: 1,
			},
			{
				skillName: "MANAFICATION",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

// it("interrupts verstone if it falls off mid-cast")
