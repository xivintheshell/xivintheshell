import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("SMN");

it(
	"performs 5 demi gcds at 2.5",
	testWithConfig(
		{
			level: 100,
			spellSpeed: 420,
		},
		() => {
			applySkill("SUMMON_SOLAR_BAHAMUT");
			// use r3's auto-replace functionality to do demi skills instead
			Array(8).fill("RUIN_III").forEach(applySkill);
			// wait for applications
			controller.step(4);
			compareDamageTables([
				{
					skillName: "SUMMON_SOLAR_BAHAMUT",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "UMBRAL_IMPULSE",
					displayedModifiers: [],
					hitCount: 5,
				},
				{
					skillName: "RUIN_III",
					displayedModifiers: [],
					hitCount: 3,
				},
			]);
		},
	),
);

it(
	"performs 6 demi gcds at 2.48",
	testWithConfig(
		{
			level: 100,
			spellSpeed: 550,
		},
		() => {
			applySkill("SUMMON_SOLAR_BAHAMUT");
			// use r3's auto-replace functionality to do demi skills instead
			Array(8).fill("RUIN_III").forEach(applySkill);
			// wait for applications
			controller.step(4);
			compareDamageTables([
				{
					skillName: "SUMMON_SOLAR_BAHAMUT",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "UMBRAL_IMPULSE",
					displayedModifiers: [],
					hitCount: 6,
				},
				{
					skillName: "RUIN_III",
					displayedModifiers: [],
					hitCount: 2,
				},
			]);
		},
	),
);

it(
	"performs 7 demi gcds at 2.13",
	testWithConfig(
		{
			level: 100,
			spellSpeed: 3600,
		},
		() => {
			applySkill("SUMMON_SOLAR_BAHAMUT");
			// use r3's auto-replace functionality to do demi skills instead
			Array(8).fill("RUIN_III").forEach(applySkill);
			// wait for applications
			controller.step(4);
			compareDamageTables([
				{
					skillName: "SUMMON_SOLAR_BAHAMUT",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "UMBRAL_IMPULSE",
					displayedModifiers: [],
					hitCount: 7,
				},
				{
					skillName: "RUIN_III",
					displayedModifiers: [],
					hitCount: 1,
				},
			]);
		},
	),
);

it(
	"ticks slipstream only once if toggled",
	testWithConfig({ level: 100, spellSpeed: 550 }, () => {
		controller.game.gainStatus("GARUDAS_FAVOR");
		// make slipstream instant so it applies fast
		controller.game.gainStatus("SWIFTCAST");
		applySkill("SLIPSTREAM");
		controller.step(1.03);
		controller.requestToggleBuff("SLIPSTREAM");
		controller.step(15);
		const dotTables = damageData.dotTables;
		expect(dotTables.get("SLIPSTREAM")!["tableRows"][0]["totalNumTicks"]).toEqual(1);
	}),
);

it(
	"performs correct demi cycle at level 100",
	testWithConfig({ level: 100 }, () => {
		Array(8).fill("SUMMON_BAHAMUT").forEach(applySkill);
		controller.step(1);
		compareDamageTables([
			{
				skillName: "SUMMON_SOLAR_BAHAMUT",
				displayedModifiers: [],
				hitCount: 4,
			},
			{
				skillName: "SUMMON_BAHAMUT",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "SUMMON_PHOENIX",
				displayedModifiers: [],
				hitCount: 2,
			},
		]);
	}),
);

it(
	"performs correct demi cycle at level 90",
	testWithConfig({ level: 90 }, () => {
		Array(8).fill("SUMMON_BAHAMUT").forEach(applySkill);
		controller.step(1);
		compareDamageTables([
			{
				skillName: "SUMMON_BAHAMUT",
				displayedModifiers: [],
				hitCount: 4,
			},
			{
				skillName: "SUMMON_PHOENIX",
				displayedModifiers: [],
				hitCount: 4,
			},
		]);
	}),
);

it(
	"performs correct demi cycle at level 70",
	testWithConfig({ level: 70 }, () => {
		Array(8).fill("SUMMON_BAHAMUT").forEach(applySkill);
		controller.step(1);
		compareDamageTables([
			{
				skillName: "SUMMON_BAHAMUT",
				displayedModifiers: [],
				hitCount: 8,
			},
		]);
	}),
);
