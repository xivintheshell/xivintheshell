import { ShellInfo, ShellJob } from "./Controller/Common";
import { controller } from "./Controller/Controller";
import { LevelSync, SkillName } from "./Game/Common";
import { getSkill } from "./Game/Skills";
import { DEFAULT_PCT_CONFIG } from "./Game/GameConfig";

// test the potency of Fire in Red since it gets changed by trait at every level sync
const testRedPotency = (level: LevelSync, expectedPotency: number) => {
	const newConfig = { ...DEFAULT_PCT_CONFIG };
	newConfig["level"] = level;
	controller.setConfigAndRestart(newConfig);
	const red = getSkill(ShellJob.PCT, SkillName.FireInRed);
	expect(red.potencyFn(controller.game)).toEqual(expectedPotency);
};

it("has correct potencies at level 70", () => {
	testRedPotency(LevelSync.lvl70, 280);
});

it("has correct potencies at level 80", () => {
	testRedPotency(LevelSync.lvl80, 340);
});

it("has correct potencies at level 90", () => {
	testRedPotency(LevelSync.lvl90, 380);
});

it("has correct potencies at level 100", () => {
	testRedPotency(LevelSync.lvl100, 440);
});
