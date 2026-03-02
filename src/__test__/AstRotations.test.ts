import { rotationTestSetup, rotationTestTeardown, testDamageFromTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it(
	"does level 100 opener and some heals",
	testDamageFromTimeline("ast_100_opener_and_heal.txt", {
		time: 35.755 + 10,
		lastDamageApplicationTime: 35.715 + 10,
		totalPotency: {
			applied: 6367.39,
			pending: 568.24,
		},
		gcdSkills: {
			applied: 15,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 5935.73,
		},
		dotTables: new Map([
			[
				"COMBUST_III",
				new Map([
					[
						1,
						{
							summary: {
								totalTicks: 11,
								maxTicks: 11,
								dotCoverageTimeFraction: 0.9724,
								cumulativeGap: 0.987,
								cumulativeOverride: 5.333,
								totalPotencyWithoutPot: 792.77,
								totalPotPotency: 63.42,
							},
						},
					],
				]),
			],
		]),
	}),
);
