import { rotationTestSetup, rotationTestTeardown, testDamageFromTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it(
	"computes proper falloff for aoe debuffs",
	// Tests hitting Death's Design on multiple targets, and hitting a mix of buffed/debuffed enemies
	// with AoE and single-target abilities. The "potency" column in the damage table may be
	// inaccurate because we do not have mechanisms for splitting up debuff computation in the UI,
	// but the final "total" figure should be correct.
	testDamageFromTimeline("rpr_mix_aoe_test.txt", {
		time: 36.793,
		lastDamageApplicationTime: 35.653,
		totalPotency: {
			applied: 9311.178000000004,
		},
		gcdSkills: {
			applied: 15,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 9311.178000000004,
		},
	}),
);
