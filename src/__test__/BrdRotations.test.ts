import {
	damageData,
	rotationTestSetup,
	rotationTestTeardown,
	makeTestWithConfigFn,
	applySkill,
	compareDamageTables,
} from "./utils";

import { controller } from "../Controller/Controller";
import { PotencyModifierType } from "../Game/Potency";
import { ProcMode, ResourceType, SkillName } from "../Game/Common";
import { BRDState } from "../Game/Jobs/BRD";

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
			[
				SkillName.Stormbite,
				SkillName.WanderersMinuet,
				SkillName.EmyprealArrow,
				SkillName.CausticBite,
				SkillName.BattleVoice,
				SkillName.BurstShot,
				SkillName.RadiantFinale,
				SkillName.RagingStrikes,
				SkillName.BurstShot,
				SkillName.HeartbreakShot,
				SkillName.RadiantEncore,
				SkillName.Barrage,
				SkillName.RefulgentArrow,
				SkillName.Sidewinder,
				SkillName.ResonantArrow,
				SkillName.EmyprealArrow,
				SkillName.BurstShot,
				SkillName.HeartbreakShot,
				SkillName.BurstShot,
				SkillName.IronJaws,
				SkillName.HeartbreakShot,
				SkillName.BurstShot,
				SkillName.PitchPerfect,
			].forEach(applySkill);
			// wait for applications
			controller.step(4);

			compareDamageTables([
				{
					skillName: SkillName.Stormbite,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.WanderersMinuet,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.EmyprealArrow,
					displayedModifiers: [PotencyModifierType.WANDERERS_MINUET],
					hitCount: 1,
				},
				{
					skillName: SkillName.CausticBite,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BattleVoice,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.BATTLE_VOICE,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.RadiantFinale,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.RagingStrikes,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: SkillName.HeartbreakShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 3,
				},
				{
					skillName: SkillName.RadiantEncore,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.Barrage,
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.RefulgentArrow,
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
					skillName: SkillName.Sidewinder,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.ResonantArrow,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.EmyprealArrow,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.BATTLE_VOICE,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.IronJaws,
					// DoT applying skills don't display modifiers
					displayedModifiers: [],
					hitCount: 1,
				},
				{
					skillName: SkillName.BurstShot,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
				{
					skillName: SkillName.PitchPerfect,
					displayedModifiers: [
						PotencyModifierType.WANDERERS_MINUET,
						PotencyModifierType.RAGING_STRIKES,
						PotencyModifierType.RADIANT_FINALE_ONE_CODA,
					],
					hitCount: 1,
				},
			]);

			const dotTables = damageData.dotTables;
			expect(dotTables.get(ResourceType.CausticBite)).toBeTruthy();
			expect(dotTables.get(ResourceType.Stormbite)).toBeTruthy();
		},
	),
);

it(
	"WM waits for combat after a weaponskill",
	testWithConfig(
		{
			countdown: 0,
		},
		() => {
			[SkillName.Stormbite, SkillName.WanderersMinuet].forEach(applySkill);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get(SkillName.Stormbite).applicationDelay,
			);
		},
	),
);

it(
	"WM waits for combat after an ability",
	testWithConfig(
		{
			countdown: 0,
		},
		() => {
			[SkillName.HeartbreakShot, SkillName.Stormbite, SkillName.WanderersMinuet].forEach(
				applySkill,
			);
			expect(controller.game.time).toBe(
				(controller.game as BRDState).skillsList.get(SkillName.HeartbreakShot)
					.applicationDelay,
			);
		},
	),
);
