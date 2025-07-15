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
