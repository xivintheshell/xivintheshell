import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
	testDamageFromTimeline,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { ProcMode } from "../Game/Common";
import { BRDState } from "../Game/Jobs/BRD";
import { ActionKey } from "../Game/Data";

beforeEach(rotationTestSetup);

afterEach(rotationTestTeardown);

const testWithConfig = makeTestWithConfigFn("BRD");

it(
	"accepts the standard opener",
	testWithConfig(
		{
			countdown: 0,
			procMode: ProcMode.Never,
		},
		() => {
			(
				[
					"STORMBITE",
					"WANDERERS_MINUET",
					"EMYPREAL_ARROW",
					"CAUSTIC_BITE",
					"BATTLE_VOICE",
					"BURST_SHOT",
					"RADIANT_FINALE",
					"RAGING_STRIKES",
					"BURST_SHOT",
					"HEARTBREAK_SHOT",
					"RADIANT_ENCORE",
					"BARRAGE",
					"REFULGENT_ARROW",
					"SIDEWINDER",
					"RESONANT_ARROW",
					"EMYPREAL_ARROW",
					"BURST_SHOT",
					"HEARTBREAK_SHOT",
					"BURST_SHOT",
					"IRON_JAWS",
					"HEARTBREAK_SHOT",
					"BURST_SHOT",
					"PITCH_PERFECT",
				] as ActionKey[]
			).forEach(applySkill);
			// wait for applications
			controller.step(4);

			compareDamageTables([
				{
					skillName: "STORMBITE",
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "WANDERERS_MINUET",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "EMYPREAL_ARROW",
					displayedModifiers: [PotencyModifierType.WANDERERS_MINUET],
					hitCount: 1,
				},
				{
					skillName: "CAUSTIC_BITE",
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "BATTLE_VOICE",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "BURST_SHOT",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.BATTLE_VOICE,
					],
					hitCount: 1,
				},
				{
					skillName: "RADIANT_FINALE",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "RAGING_STRIKES",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "BURST_SHOT",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: "HEARTBREAK_SHOT",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: "RADIANT_ENCORE",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: "BARRAGE",
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "REFULGENT_ARROW",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
						PotencyModifierType.BARRAGE,
					],
					hitCount: 1,
				},
				{
					skillName: "SIDEWINDER",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: "RESONANT_ARROW",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: "EMYPREAL_ARROW",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: "IRON_JAWS",
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: "BURST_SHOT",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: "PITCH_PERFECT",
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
			]);

			const dotTables = damageData.dotTables;
			expect(dotTables.get("CAUSTIC_BITE")).toBeTruthy();
			expect(dotTables.get("STORMBITE")).toBeTruthy();
		},
	),
);

it(
	"WM waits for combat after a weaponskill",
	testWithConfig(
		{
			// We start at t=-5 because Stormbite has an application delay of 1.29 seconds,
			// while auto-attacks have a delay of 0.53 seconds. XIV in the Shell will automatically
			// withhold auto-attacks until the fight has begun, or if the used skill's delay is long
			// enough, when that delay ends.
			countdown: 5,
		},
		() => {
			(["STORMBITE", "WANDERERS_MINUET"] as ActionKey[]).forEach(applySkill);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get("STORMBITE").applicationDelay +
					controller.game.config.animationLock,
			);
		},
	),
);

it(
	"WM waits for combat after an ability",
	testWithConfig(
		{
			countdown: 5,
		},
		() => {
			(["HEARTBREAK_SHOT", "STORMBITE", "WANDERERS_MINUET"] as ActionKey[]).forEach(
				applySkill,
			);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get("HEARTBREAK_SHOT").applicationDelay +
					controller.game.config.animationLock,
			);
		},
	),
);

it(
	"loads: brd_dh_buff_test.txt",
	testDamageFromTimeline("brd_dh_buff_test.txt", {
		time: 0.733 + 5,
		lastDamageApplicationTime: -0.313 + 5,
		totalPotency: {
			applied: 545.66,
			pending: 84.27,
		},
		gcdSkills: {
			applied: 2,
			pending: 0,
		},
	}),
);

it(
	"loads: brd_iron_jaws_snapshot_refresh.txt",
	testDamageFromTimeline("brd_iron_jaws_snapshot_refresh.txt", {
		time: 42.4 + 5,
		lastDamageApplicationTime: 41.37 + 5,
		totalPotency: {
			applied: 1775,
			pending: 455,
		},
		gcdSkills: {
			applied: 2,
			pending: 0,
		},
	}),
);
