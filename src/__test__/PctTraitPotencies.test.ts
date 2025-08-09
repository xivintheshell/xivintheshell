import { controller } from "../Controller/Controller";
import { LevelSync } from "../Game/Common";
import { getSkill } from "../Game/Skills";
import { makeDefaultConfig } from "../Game/GameConfig";

// test the potency of Fire in Red since it gets changed by trait at every level sync
const testRedPotency = (level: LevelSync, expectedPotency: number) => {
	const newConfig = makeDefaultConfig("PCT");
	newConfig["level"] = level;
	controller.setConfigAndRestart(newConfig);
	const red = getSkill("PCT", "FIRE_IN_RED");
	expect(red.potencyFn(controller.game)).toEqual(expectedPotency);
};

it("has correct potencies at level 70", () => {
	testRedPotency(LevelSync.lvl70, 310);
});

it("has correct potencies at level 80", () => {
	testRedPotency(LevelSync.lvl80, 380);
});

it("has correct potencies at level 90", () => {
	testRedPotency(LevelSync.lvl90, 420);
});

it("has correct potencies at level 100", () => {
	testRedPotency(LevelSync.lvl100, 490);
});
