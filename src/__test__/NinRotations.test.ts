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
import { NINState } from "../Game/Jobs/NIN";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("NIN");

it(
	"consumes kassatsu when it is used midway through a mudra",
	testWithConfig({}, () => {
		(
			[
				"TEN",
				"KASSATSU", // bunny here
				"CHI",
				"NINJUTSU", // rabbit medium auto-replace
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		compareDamageTables([
			{
				skillName: "TEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "CHI",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "RABBIT_MEDIUM",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "KASSATSU",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"cancels mudra if tcj is used",
	testWithConfig({}, () => {
		(
			[
				"TEN",
				"TEN_CHI_JIN", // no bunny, but cancels mudra
			] as ActionKey[]
		).forEach(applySkill);
		const state = controller.game as NINState;
		expect(state.hasResourceAvailable("MUDRA")).toBeFalsy();
	}),
);

it(
	"correctly auto-replaces mudras under TCJ",
	testWithConfig({}, () => {
		(
			[
				"TEN_CHI_JIN",
				"CHI", // fuma shuriken
				"TEN", // katon
				"JIN", // suiton
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		const state = controller.game as NINState;
		expect(state.hasResourceAvailable("SHADOW_WALKER")).toBeTruthy();
		compareDamageTables([
			{
				skillName: "FUMA_SHURIKEN_CHI",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "KATON_TEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SUITON_JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "TEN_CHI_JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

// For some reason, skill replacements don't get computed properly.
it.fails(
	"parses mudras correctly even after a manual mudra or TCJ buff clickoff",
	testWithConfig({}, () => {
		applySkill("TEN");
		controller.requestToggleBuff("MUDRA");
		(
			[
				"CHI",
				"TEN",
				"NINJUTSU", // katon
				"TEN_CHI_JIN",
				"TEN", // fuma shuriken
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(0.1);
		controller.requestToggleBuff("TEN_CHI_JIN");
		(
			[
				"KASSATSU",
				"TEN",
				"JIN",
				"NINJUTSU", // hyosho
			] as ActionKey[]
		).forEach(applySkill);
		// wait for damage applications
		controller.step(4);
		compareDamageTables([
			{
				skillName: "HYOSHO_RANRYU",
				displayedModifiers: [PotencyModifierType.KASSATSU],
				hitCount: 1,
			},
			{
				skillName: "FUMA_SHURIKEN_TEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "KATON",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "TEN_CHI_JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "KASSATSU",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "CHI",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "TEN",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"bnuuy with feint",
	testWithConfig({}, () => {
		(
			[
				"CHI",
				"FEINT",
				"NINJUTSU", // bunny
				"CHI",
				"NINJUTSU",
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "FUMA_SHURIKEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "CHI",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "FEINT",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "RABBIT_MEDIUM",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"bnuuy with double mudra",
	testWithConfig({}, () => {
		(
			[
				"CHI",
				"CHI",
				"NINJUTSU", // bunny
			] as ActionKey[]
		).forEach(applySkill);
		controller.step(4);
		compareDamageTables([
			{
				skillName: "CHI",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "RABBIT_MEDIUM",
				displayedModifiers: [],
				hitCount: 1,
			},
		]);
	}),
);

// For some reason, skill replacements don't get computed properly.
it.fails(
	"properly eats raiju ready stacks",
	testWithConfig({}, () => {
		const state = controller.game as NINState;
		state.resources.get("NINKI").overrideCurrentValue(100);
		(
			[
				"BUNSHIN",
				"TEN",
				"CHI",
				"NINJUTSU", // raiton
				"TEN",
				"CHI",
				"NINJUTSU", // raiton
				"TEN_CHI_JIN",
				"TEN", // fuma shuriken
				"CHI", // raiton
				"JIN", // suiton
				"PHANTOM_KAMAITACHI", // does not consume raiju ready
			] as ActionKey[]
		).forEach(applySkill);
		expect(state.resources.get("RAIJU_READY").availableAmount()).toEqual(3);
		applySkill("FLEETING_RAIJU"); // consumes 1 raiju ready
		expect(state.resources.get("RAIJU_READY").availableAmount()).toEqual(2);
		applySkill("SPINNING_EDGE"); // consumes all raiju ready
		expect(state.resources.get("RAIJU_READY").availableAmount()).toEqual(0);
		compareDamageTables([
			{
				skillName: "BUNSHIN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "TEN",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "CHI",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "RAITON",
				displayedModifiers: [],
				hitCount: 2,
			},
			{
				skillName: "TEN_CHI_JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FUMA_SHURIKEN_TEN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "RAITON_CHI",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SUITON_JIN",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "PHANTOM_KAMAITACHI",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "FLEETING_RAIJU",
				displayedModifiers: [],
				hitCount: 1,
			},
			{
				skillName: "SPINNING_EDGE",
				displayedModifiers: [PotencyModifierType.BUNSHIN],
				hitCount: 1,
			},
		]);
	}),
);

it(
	"fits expected gcds in kunai's bane in opener",
	testDamageFromTimeline("nin_4th_gcd_opener.txt", {
		time: 25.317 + 10,
		lastDamageApplicationTime: 25.083 + 10,
		totalPotency: {
			applied: 17390.4,
			pending: 1002.67,
		},
		gcdSkills: {
			applied: 22,
			pending: 1,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 16175.88,
		},
	}),
);

it(
	"computes proper falloff for aoe debuffs",
	// Tests hitting Doku + KB on multiple targets, and hitting a mix of buffed/debuffed enemies
	// with AoE and single-target abilities. The "potency" column in the damage table may be
	// inaccurate because we do not have mechanisms for splitting up debuff computation in the UI,
	// but the final "total" figure should be correct.
	testDamageFromTimeline("nin_mix_aoe_test.txt", {
		time: 17.87,
		lastDamageApplicationTime: 17.026,
		totalPotency: {
			applied: 7420.715000000002,
		},
		gcdSkills: {
			applied: 11,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 7420.715000000002,
		},
	}),
);
