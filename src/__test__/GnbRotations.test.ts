import {
	rotationTestSetup,
	rotationTestTeardown,
	applySkill,
	compareDamageTables,
	makeTestWithConfigFn,
} from "./utils";
import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);
const testWithConfig = makeTestWithConfigFn("GNB");

describe("doesn't cancel combo when certain actions are used", () =>
	["DOUBLE_DOWN", "SONIC_BREAK", "FATED_CIRCLE", "BURST_STRIKE", "LIGHTNING_SHOT"].forEach(
		(skill) =>
			it(
				`keeps combo across ${skill}`,
				testWithConfig({}, () => {
					controller.game.resources.get("POWDER_GAUGE").overrideCurrentValue(3);
					(
						[
							"NO_MERCY", // grants sonic break ready
							"KEEN_EDGE",
							skill,
							"BRUTAL_SHELL",
						] as ActionKey[]
					).forEach(applySkill);
					controller.step(4);
					compareDamageTables([
						{
							skillName: "NO_MERCY",
							displayedModifiers: [],
							hitCount: 1,
						},
						{
							skillName: "KEEN_EDGE",
							displayedModifiers: [PotencyModifierType.NO_MERCY],
							hitCount: 1,
						},
						{
							skillName: skill as ActionKey,
							// dots don't show modifiers in the main table
							displayedModifiers:
								skill === "SONIC_BREAK" ? [] : [PotencyModifierType.NO_MERCY],
							hitCount: 1,
						},
						{
							skillName: "BRUTAL_SHELL",
							displayedModifiers: [
								PotencyModifierType.COMBO,
								PotencyModifierType.NO_MERCY,
							],
							hitCount: 1,
						},
					]);
				}),
			),
	));
