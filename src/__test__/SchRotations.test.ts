import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	testDamageFromTimeline,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { SCHActionKey } from "../Game/Data/Jobs/SCH";
import { SCHState } from "../Game/Jobs/SCH";
import { ProcMode } from "../Game/Common";
import { PotencyModifierType } from "../Game/Potency";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("SCH");

it(
	"does not generate faerie gauge under dissipation",
	testWithConfig({}, () => {
		(["DISSIPATION", "ENERGY_DRAIN", "LUSTRATE", "INDOMITABILITY"] as SCHActionKey[]).forEach(
			applySkill,
		);
		const state = controller.game as SCHState;
		expect(state.hasResourceAvailable("FAERIE_GAUGE")).toBeFalsy();
		expect(state.hasResourceAvailable("AETHERFLOW")).toBeFalsy();
	}),
);

it(
	"applies correct faerie status effects under seraph",
	testWithConfig({}, () => {
		applySkill("WHISPERING_DAWN");
		applySkill("FEY_ILLUMINATION");
		const state = controller.game as SCHState;
		controller.step(5);
		expect(state.hasResourceAvailable("WHISPERING_DAWN")).toBeTruthy();
		expect(state.hasResourceAvailable("FEY_ILLUMINATION")).toBeTruthy();
		// wait for cooldowns
		controller.step(120);
		(
			[
				"SUMMON_SERAPH",
				"CONSOLATION",
				"FEY_ILLUMINATION",
				"WHISPERING_DAWN",
			] as SCHActionKey[]
		).forEach(applySkill);
		controller.step(3);
		expect(state.hasResourceAvailable("ANGELS_WHISPER")).toBeTruthy();
		expect(state.hasResourceAvailable("SERAPHIC_ILLUMINATION")).toBeTruthy();
		expect(state.hasResourceAvailable("SERAPHIC_VEIL")).toBeTruthy();
	}),
);

it(
	"consumes recitation correctly",
	testWithConfig({ procMode: ProcMode.Never }, () => {
		const state = controller.game as SCHState;
		state.resources.get("IN_COMBAT").gain(1);
		applySkill("AETHERFLOW");
		applySkill("RECITATION");
		applySkill("ADLOQUIUM");
		controller.step(2);
		expect(state.resources.get("AETHERFLOW").availableAmount()).toEqual(3);
		expect(state.hasResourceAvailable("RECITATION")).toBeFalsy();
		expect(state.hasResourceAvailable("GALVANIZE")).toBeTruthy();
		expect(state.hasResourceAvailable("CATALYZE")).toBeTruthy();
		applySkill("RECITATION");
		applySkill("LUSTRATE");
		// lustrate does not consume recitation
		expect(state.resources.get("AETHERFLOW").availableAmount()).toEqual(2);
		expect(state.hasResourceAvailable("RECITATION")).toBeTruthy();
		applySkill("INDOMITABILITY");
		expect(state.hasResourceAvailable("RECITATION")).toBeFalsy();
		applySkill("RECITATION");
		applySkill("EXCOGITATION");
		controller.step(1);
		expect(state.hasResourceAvailable("RECITATION")).toBeFalsy();
		expect(state.hasResourceAvailable("EXCOGITATION")).toBeTruthy();
		// seraphism adlo replacement does not consume recitation
		// wait for all CDs
		controller.step(60);
		applySkill("SERAPHISM");
		applySkill("RECITATION");
		applySkill("ADLOQUIUM");
		expect(state.hasResourceAvailable("RECITATION")).toBeTruthy();
		// shields form last call have fallen off
		expect(state.hasResourceAvailable("GALVANIZE")).toBeTruthy();
		expect(state.hasResourceAvailable("CATALYZE")).toBeFalsy();
		expect(state.resources.get("AETHERFLOW").availableAmount()).toEqual(2);
		// wait for manifestation's application delay for it to register in the damage table,
		// even though its shielding effect is applied instantaneously
		controller.step(1);
		compareDamageTables([
			{
				skillName: "RECITATION",
				displayedModifiers: [],
				hitCount: 4,
			},
			{
				skillName: "SERAPHISM",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "AETHERFLOW",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "LUSTRATE",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "INDOMITABILITY",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "EXCOGITATION",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "ADLOQUIUM",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "MANIFESTATION",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"cancels seraphism with dissipation",
	testWithConfig({}, () => {
		const state = controller.game as SCHState;
		state.resources.get("IN_COMBAT").gain(1);
		applySkill("SERAPHISM");
		expect(state.hasResourceAvailable("SERAPHISM")).toBeTruthy();
		expect(state.hasResourceAvailable("SERAPHISM_REGEN")).toBeTruthy();
		applySkill("DISSIPATION");
		expect(state.resources.get("AETHERFLOW").availableAmount()).toEqual(3);
		expect(state.hasResourceAvailable("SERAPHISM")).toBeFalsy();
		// regen effect is not canceled
		expect(state.hasResourceAvailable("SERAPHISM_REGEN")).toBeTruthy();
	}),
);

it(
	"consumes etact",
	testWithConfig({}, () => {
		const state = controller.game as SCHState;
		applySkill("EMERGENCY_TACTICS");
		expect(state.hasResourceAvailable("EMERGENCY_TACTICS")).toBeTruthy();
		applySkill("CONCITATION");
		expect(state.hasResourceAvailable("EMERGENCY_TACTICS")).toBeFalsy();
		expect(state.hasResourceAvailable("GALVANIZE")).toBeFalsy();
	}),
);

it(
	"does some heals",
	testDamageFromTimeline("sch_misc_heals.txt", {
		time: 48.95 + 2,
		lastDamageApplicationTime: 48.515 + 2,
		totalPotency: {
			applied: 6280,
			pending: 0,
		},
		gcdSkills: {
			applied: 20,
			pending: 0,
		},
	}),
);

it(
	"snapshots chain strat on dots",
	testWithConfig({}, () => {
		applySkill("CHAIN_STRATAGEM");
		controller.step(10);
		applySkill("BIOLYSIS");
		applySkill("BANEFUL_IMPACTION");
		controller.step(40);
		// DoT modifiers are not displayed in the main table.
		compareDamageTables([
			{
				skillName: "CHAIN_STRATAGEM",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "BIOLYSIS",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "BANEFUL_IMPACTION",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);

		const dotTables = damageData.dotTables;
		expect(dotTables.get("BIOLYSIS")!.get(1)!.tableRows[0].displayedModifiers).toEqual([
			PotencyModifierType.CHAIN_STRAT,
		]);
		expect(dotTables.get("BANEFUL_IMPACTION")!.get(1)!.tableRows[0].displayedModifiers).toEqual(
			[PotencyModifierType.CHAIN_STRAT],
		);
	}),
);
