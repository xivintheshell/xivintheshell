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
import { MNKState } from "../Game/Jobs/MNK";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("MNK");

it(
	"gives correct nadi with celestial revolution",
	testWithConfig({}, () => {
		const state = controller.game as MNKState;
		state.resources.get("IN_COMBAT").gain(1);
		(
			[
				"PERFECT_BALANCE",
				"DRAGON_KICK",
				"BOOTSHINE", // auto-upgrade to leaping opo
				"DRAGON_KICK",
				"ELIXIR_FIELD", // auto-replaced by elixir burst at 100
				"PERFECT_BALANCE",
				"BOOTSHINE",
				"DRAGON_KICK",
				"DEMOLISH",
				"ELIXIR_FIELD", // auto-replaced by celestial revolution due to wrong chakra
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		expect(state.hasResourceAvailable("LUNAR_NADI")).toBeTruthy();
		expect(state.hasResourceAvailable("SOLAR_NADI")).toBeTruthy();
		compareDamageTables([
			{
				skillName: "DRAGON_KICK",
				displayedModifiers: [],
				hitCount: 3,
			},
			{
				skillName: "LEAPING_OPO",
				displayedModifiers: [PotencyModifierType.MNK_BALL],
				hitCount: 2,
			},
			{
				skillName: "ELIXIR_BURST",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "CELESTIAL_REVOLUTION",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "DEMOLISH",
				displayedModifiers: [PotencyModifierType.POSITIONAL],
				hitCount: 1,
			},
			{
				skillName: "PERFECT_BALANCE",
				displayedModifiers: [],
				hitCount: 2,
			},
		]);
	}),
);

it(
	"fits expected gcds in rof and bh in opener",
	testDamageFromTimeline("mnk_100_solar_lunar.txt", {
		time: 24.862 + 10,
		lastDamageApplicationTime: 24.862 + 10,
		totalPotency: {
			applied: 12102.46,
			pending: 0,
		},
		gcdSkills: {
			applied: 15,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 11260.8,
		},
	}),
);
