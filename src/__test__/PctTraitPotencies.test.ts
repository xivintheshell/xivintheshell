import { controller } from "../Controller/Controller";
import { LevelSync } from "../Game/Common";
import { getSkill } from "../Game/Skills";
import { DEFAULT_PCT_CONFIG } from "../Game/GameConfig";

// test the potency of Fire in Red since it gets changed by trait at every level sync
const testRedPotency = (level: LevelSync, expectedPotency: number) => {
	const newConfig = { ...DEFAULT_PCT_CONFIG };
	newConfig["level"] = level;
	controller.setConfigAndRestart(newConfig);
	const red = getSkill("PCT", "FIRE_IN_RED");
	expect(red.potencyFn(controller.game)).toEqual(expectedPotency);
};

it("has correct potencies at level 70", () => {
	testRedPotency(LevelSync.lvl70, 330);
});

it("has correct potencies at level 80", () => {
	testRedPotency(LevelSync.lvl80, 400);
});

it("has correct potencies at level 90", () => {
	testRedPotency(LevelSync.lvl90, 450);
});

it("has correct potencies at level 100", () => {
	testRedPotency(LevelSync.lvl100, 520);
});
