// Tests for potencies and basic job gauge validation for BLM.

import {controller} from "./Controller/Controller";
import {TickMode} from "./Controller/Common";
import {DEFAULT_CONFIG, GameConfig} from "./Game/GameConfig";
import {PotencyModifier, PotencyModifierType} from "../Game/Potency";
import {DamageStatisticsData} from "./Components/DamageStatistics";

const DamageStatistics = require("./Components/DamageStatistics");

let damageData: DamageStatisticsData = {
    time: 0,
    tinctureBuffPercentage: 0,
    countdown: 0,
    totalPotency: {applied: 0, pending: 0},
    lastDamageApplicationTime: 0,
    gcdSkills: {applied: 0, pending: 0},
    mainTable: [],
    mainTableSummary: {
        totalPotencyWithoutPot: 0, 
        totalPotPotency: 0,
        totalPartyBuffPotency: 0,
    },
    thunderTable: [],
    thunderTableSummary: {
        cumulativeGap: 0,
        cumulativeOverride: 0,
        timeSinceLastDoTDropped: 0,
        totalTicks: 0,
        maxTicks: 0,
        dotCoverageTimeFraction: 0,
        theoreticalMaxTicks: 0,
        totalPotencyWithoutPot: 0,
        totalPotPotency: 0,
        totalPartyBuffPotency: 0,
    },
    historical: false,
};

beforeEach(() => {
    // for simplicity, always use "manual" advance mode to avoid any time shenanigans
    // we eventually should test real-time mode as well
    controller.setTimeControlSettings({
        timeScale: 2,
        tickMode: TickMode.Manual,
    });
    // monkeypatch the updateDamageStats function to avoid needing to initialize the frontend
    DamageStatistics.exports.updateDamageStats = (newData) => {
        damageData = newData;
    };
});

// Run a test with the provided partial GameConfig and test function
// Leave `params`` as an empty object to use the default config
const testWithConfig = (params: Partial<GameConfig>, testFn: () => undefined) => {
    const newConfig = {...DEFAULT_CONFIG};
    Object.defineProperties(newConfig, params);
    controller.setConfigAndRestart(newConfig);
    testFn();
};

const applySkill = (skillName: SkillName) => {
    // Perform the specified skill as soon as possible
    // TEST-ONLY HACK: set lastAttemptedSkill to the skill we're about to use
    // to ensure that trailing wait times are always omitted
    controller.lastAttemptedSkill = skillName;
    controller.requestUseSkill({skillName: skillName});
};

it("accepts the standard rotation", testWithConfig({}, () => {
    [
        SkillName.Blizzard3, // precast, no enochian
        SkillName.Blizzard4,
        SkillName.Fire3,
        SkillName.Fire4,
        SkillName.Fire4,
        SkillName.Fire4,
        SkillName.Fire4,
        SkillName.Paradox,
        SkillName.Fire4,
        SkillName.Fire4,
        SkillName.Despair,
        SkillName.FlareStar,
    ].forEach(applySkill);
    // wait 4 seconds for cast finish + damage application
    controller.step(4);
    const expectedDamageEntries = new Set([
        {
            skillName: SkillName.Blizzard3,
            displayedModifiers: [], // unaspected
            hitCount: 1,
        },
        {
            skillName: SkillName.Blizzard4,
            displayedModifiers: [PotencyModifierType.UI3],
            hitCount: 1,
        },
        {
            skillName: SkillName.Fire3,
            displayedModifiers: [PotencyModifierType.UI3],
            hitCount: 1,
        },
        {
            skillName: SkillName.Fire4,
            displayedModifiers: [PotencyModifierType.AF3],
            hitCount: 6,
        },
        {
            skillName: SkillName.Paradox,
            displayedModifiers: [],
            hitCount: 1,
        },
        {
            skillName: SkillName.Despair,
            displayedModifiers: [PotencyModifierType.AF3],
            hitCount: 1,
        },
        {
            skillName: SkillName.FlareStar,
            displayedModifiers: [PotencyModifierType.AF3],
            hitCount: 1,
        },
    ]);
    const actualDamageEntries = new Set();
    for (const entry of damageData.mainTable) {
        actualDamageEntries.add({
            skillName: entry.skillName,
            displayedModifiers: entry.displayedModifiers,
            hitCount: entry.hitCount,
        });
    }
    expect(actualDamageEntries.size).toEqual(expectedDamageEntries.size);
    expect(actualDamageEntries.difference(expectedDamageEntries).size).toEqual(0);
}));


// things to test:
// enochian-dropping lines
// lines near sps breakpoints
// lines that don't have enough mp
// potency modifiers (AF3, UI3, etc.)
// umbral soul stops timer
// polyglot generation
// level synced potency values + replaced skills like HT/T3