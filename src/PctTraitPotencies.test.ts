import {ShellInfo, ShellJob} from "./Controller/Common";
import {controller} from "./Controller/Controller";
import {LevelSync, SkillName} from "./Game/Common";
import {getSkill} from "./Game/Skills"

// test the potency of Fire in Red since it gets changed by trait at every level sync
const testRedPotency = (level: LevelSync, expectedPotency: number) => {
    // jest doesn't have great built-in skipping capabilities, so just don't run the test
    // if the current job isn't PCT
    // TODO: revisit when we can set the job dynamically
    if (ShellInfo.job !== ShellJob.PCT) {
        console.log("skipped");
        return;
    }
    let newConfig = {
        ...controller.gameConfig
    };
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