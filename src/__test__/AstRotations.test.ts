import { rotationTestSetup, rotationTestTeardown, testDamageFromTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it(
	"does level 100 opener and some heals",
	testDamageFromTimeline("ast_100_opener_and_heal.txt", {
		time: 35.755 + 10,
		lastDamageApplicationTime: 35.715 + 10,
		totalPotency: {
			applied: 5369.07,
			pending: 536.08,
		},
		gcdSkills: {
			applied: 15,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 5011.37,
		},
		dotTables: new Map([
			[
				"COMBUST_III",
				{
					summary: {
						totalTicks: 11,
						maxTicks: 11,
						dotCoverageTimeFraction: 0.9724,
						cumulativeGap: 0.987,
						cumulativeOverride: 5.333,
						totalPotencyWithoutPot: 780.01,
						totalPotPotency: 62.4,
					},
				},
			],
		]),
	}),
);
