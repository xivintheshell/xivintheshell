import {
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
	testDamageFromTimeline,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { VPRState } from "../Game/Jobs/VPR";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("VPR");

it(
	"keeps reawaken through ranged filler and coil",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("SERPENT_OFFERINGS").gain(50);
		state.resources.get("RATTLING_COIL").gain(1);
		(
			[
				"REAWAKEN",
				"FIRST_GENERATION",
				"WRITHING_SNAP",
				"UNCOILED_FURY",
				"SECOND_GENERATION",
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		expect(state.hasResourceAvailable("REAWAKENED")).toBeTruthy();
		expect(state.hasResourceAvailable("ANGUINE_TRIBUTE")).toBeTruthy();
		compareDamageTables([
			{
				skillName: "REAWAKEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FIRST_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "SECOND_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "WRITHING_SNAP",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_FURY",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);


it(
	"ends reawaken buffs if ouroboros is used early",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("SERPENT_OFFERINGS").gain(50);
		(
			[
				"REAWAKEN",
				"FIRST_GENERATION",
				"SERPENTS_TAIL",
				"SECOND_GENERATION",
				"SERPENTS_TAIL",
				"OUROBOROS",
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		expect(state.hasResourceAvailable("REAWAKENED")).toBeFalsy();
		expect(state.hasResourceAvailable("ANGUINE_TRIBUTE")).toBeFalsy();
		compareDamageTables([
			{
				skillName: "REAWAKEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FIRST_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "SECOND_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "FIRST_LEGACY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SECOND_LEGACY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "OUROBOROS",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"allows using reawaken buttons in wrong order at level 90",
	testWithConfig({ level: 90 }, () => {
		const state = controller.game as VPRState;
		state.resources.get("SERPENT_OFFERINGS").gain(50);
		(
			[
				"REAWAKEN",
				"THIRD_GENERATION", // no combo
				"FOURTH_GENERATION", // combo
				"FIRST_GENERATION", // no combo
				"SECOND_GENERATION", // combo
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		expect(state.hasResourceAvailable("REAWAKENED")).toBeFalsy();
		expect(state.hasResourceAvailable("ANGUINE_TRIBUTE")).toBeFalsy();
		compareDamageTables([
			{
				skillName: "REAWAKEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FIRST_GENERATION",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SECOND_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
			{
				skillName: "THIRD_GENERATION",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FOURTH_GENERATION",
				displayedModifiers: [PotencyModifierType.COMBO],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"allows double usage of same ogcd when unbuffed",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("RATTLING_COIL").gain(1);
		// no modifiers on any ogcds
		(["UNCOILED_FURY", "TWINBLOOD", "TWINBLOOD"] as ActionKey[]).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "UNCOILED_FURY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_TWINBLOOD",
				displayedModifiers: [],
				hitCount: 2,
			},
		]);
	}),
);

it(
	"allows double usage of same ogcd with only one first buffed",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("RATTLING_COIL").gain(1);
		(["UNCOILED_FURY", "TWINFANG", "TWINFANG"] as ActionKey[]).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "UNCOILED_FURY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_TWINFANG",
				displayedModifiers: [PotencyModifierType.POISED],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_TWINFANG",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"correctly buffs ogcds when used in correct order",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("RATTLING_COIL").gain(1);
		(["UNCOILED_FURY", "TWINFANG", "TWINBLOOD"] as ActionKey[]).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "UNCOILED_FURY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_TWINFANG",
				displayedModifiers: [PotencyModifierType.POISED],
				hitCount: 1,
			},
			{
				skillName: "UNCOILED_TWINBLOOD",
				displayedModifiers: [PotencyModifierType.POISED],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"auto-replaces single-target filler correctly",
	testWithConfig({}, () => {
		const state = controller.game as VPRState;
		state.resources.get("RATTLING_COIL").gain(1);
		(
			[
				"STEEL_FANGS",
				"REAVING_FANGS",
				"STEEL_FANGS",
				"REAVING_FANGS",
				"STEEL_FANGS",
				"REAVING_FANGS",
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "STEEL_FANGS",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SWIFTSKINS_STING",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "HINDSTING_STRIKE",
				displayedModifiers: [PotencyModifierType.POSITIONAL],
				hitCount: 1,
			},
			{
				skillName: "REAVING_FANGS",
				displayedModifiers: [PotencyModifierType.HONED],
				hitCount: 1,
			},
			{
				skillName: "HUNTERS_STING",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FLANKSBANE_FANG",
				displayedModifiers: [
					PotencyModifierType.POSITIONAL,
					PotencyModifierType.VENOM,
					PotencyModifierType.HUNTERS_INSTINCT,
				],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"fits expected gcds in pot in opener",
	testDamageFromTimeline("vpr_100_opener.txt", {
		time: 42.317 + 5,
		lastDamageApplicationTime: 41.93 + 5,
		totalPotency: {
			applied: 17190.28,
			pending: 187.0,
		},
		gcdSkills: {
			applied: 18,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 16129.0,
			totalPotPotency: 1061.28,
		},
	}),
);
