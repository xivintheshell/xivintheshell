import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { XIVMath } from "../Game/XIVMath";
import { SAMState } from "../Game/Jobs/SAM";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("SAM");

it("has correct GCD under fuka", () => {
	testWithConfig({}, () => {
		const state = controller.game as SAMState;
		const speedModifier = state.getFukaModifier();

		// 2.5 base
		expect(XIVMath.preTaxGcd(100, 420, 2.5, speedModifier)).toEqual(2.17);
		// 2.47 base
		expect(XIVMath.preTaxGcd(100, 693, 2.5, speedModifier)).toEqual(2.14);
	});
});

it(
	"continues combos after a meikyo",
	testWithConfig({}, () => {
		(
			[
				"MEIKYO_SHISUI",
				"SHIFU",
				"SHIFU",
				"SHIFU",
				"KASHA", // combo'd
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		const state = controller.game as SAMState;
		expect(state.resources.get("KENKI").availableAmount()).toEqual(25);
		compareDamageTables([
			{
				skillName: "SHIFU",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 3,
			},
			{
				skillName: "KASHA",
				displayedModifiers: [PotencyModifierType.COMBO, PotencyModifierType.POSITIONAL],
				hitCount: 1,
			},
			{
				skillName: "MEIKYO_SHISUI",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"generates kenki and shoha in meditation",
	testWithConfig({}, () => {
		const state = controller.game as SAMState;
		state.resources.get("IN_COMBAT").overrideCurrentValue(1);
		applySkill("MEDITATE");
		controller.step(30); // longer than the duration to make sure we don't keep ticking
		expect(state.resources.get("KENKI").availableAmount()).toEqual(50);
		expect(state.resources.get("MEDITATION").availableAmount()).toEqual(3);
	}),
);
