import { rotationTestSetup, rotationTestTeardown, testDamageFromTimeline } from "./utils";

beforeEach(rotationTestSetup);
afterEach(rotationTestTeardown);

// Technically BLU can't be lvl 100, but I was lazy when I wrote the test
// Tests the CD of surpanakha
it(
	"loads: blu_surpanakha_spam.txt",
	testDamageFromTimeline("blu_surpanakha_spam.txt", {
		time: 121.7 + 2,
		lastDamageApplicationTime: 120.62 + 2,
		totalPotency: {
			applied: 2200,
			pending: 0,
		},
		gcdSkills: {
			applied: 0,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 2200,
		},
	}),
);

// Makes sure that the unscaled dot potencies from apokalypsis + phantom flurry are calculated correctly
it(
	"loads: blu_channel_potencies.txt",
	testDamageFromTimeline("blu_channel_potencies.txt", {
		time: 23.08 + 2,
		lastDamageApplicationTime: 19.7331 + 2,
		totalPotency: {
			applied: 2300,
			pending: 0,
		},
		gcdSkills: {
			applied: 0,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 2300,
		},
	}),
);
