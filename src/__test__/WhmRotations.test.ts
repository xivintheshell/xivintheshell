import { rotationTestSetup, rotationTestTeardown, testDamageFromTimeline } from "./utils";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

it(
	"does level 100 opener and lily spam",
	testDamageFromTimeline("whm_100_opener_and_lilies.txt", {
		time: 65.92 + 10,
		lastDamageApplicationTime: 65.88 + 10,
		totalPotency: {
			applied: 13358.396,
			pending: 602.735,
		},
		gcdSkills: {
			applied: 30,
			pending: 0,
		},
		mainTableSummary: {
			totalPotencyWithoutPot: 12783.205,
		},
		dotTables: new Map([
			[
				"DIA",
				new Map([
					[
						1,
						{
							summary: {
								totalTicks: 21,
								maxTicks: 21,
								dotCoverageTimeFraction: 0.9779,
								cumulativeGap: 1.457,
								cumulativeOverride: 4.733,
								totalPotencyWithoutPot: 2063.21,
								totalPotPotency: 137.59,
							},
						},
					],
				]),
			],
		]),
	}),
);
