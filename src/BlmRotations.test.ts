// Tests for potencies and basic job gauge validation for BLM.

import {controller} from "./Controller/Controller";
import {TickMode} from "./Controller/Common";
import {DEFAULT_CONFIG, GameConfig} from "./Game/GameConfig";
import {PotencyModifier, PotencyModifierType} from "./Game/Potency";
import {SkillName} from "./Game/Common";
import {DamageStatisticsData, mockDamageStatUpdateFn} from "./Components/DamageStatistics";

// fake object to track damage statistics
let damageData: DamageStatisticsData;

const resetDamageData = () => {
    damageData = {
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
};

beforeEach(() => {
    // for simplicity, always use "manual" advance mode to avoid any time shenanigans
    // we eventually should test real-time mode as well
    controller.setTimeControlSettings({
        timeScale: 2,
        tickMode: TickMode.Manual,
    });
    if (controller.timeline.slots.length === 0) {
        controller.timeline.addSlot()
    }
    // clear stats from the last run
    resetDamageData();
    // monkeypatch the updateDamageStats function to avoid needing to initialize the frontend
    mockDamageStatUpdateFn((newData: DamageStatisticsData) => {
        damageData = newData;
    });
});

// Run a test with the provided partial GameConfig and test function
// Leave `params`` as an empty object to use the default config
const testWithConfig = (params: Partial<GameConfig>, testFn: () => void) => {
    return () => {
        const newConfig = {...DEFAULT_CONFIG};
        Object.defineProperties(newConfig, params as any);
        controller.setConfigAndRestart(newConfig);
        testFn();
    };
};

const applySkill = (skillName: SkillName) => {
    // Perform the specified skill as soon as possible
    // TEST-ONLY HACK: set lastAttemptedSkill to the skill we're about to use
    // to ensure that trailing wait times are always omitted
    controller.lastAttemptedSkill = skillName;
    controller.requestUseSkill({skillName: skillName});
};

type ShortDamageEntry = {
    skillName: SkillName,
    displayedModifiers: PotencyModifierType[],
    hitCount: number,
};

const compareDamageTables = (expectedDamageEntries: Array<ShortDamageEntry>) => {
    const actualDamageEntries = [];
    for (const entry of damageData.mainTable) {
        actualDamageEntries.push({
            skillName: entry.skillName,
            displayedModifiers: entry.displayedModifiers,
            hitCount: entry.hitCount,
        });
    }
    // sz: whatever version of node i'm on apparently doesn't support Set.difference/symmetricDifference,
    // so we instead just sort the two arrays and do an equality check
    const damageEntryComparator = (a: ShortDamageEntry, b: ShortDamageEntry) => {
        const nameCmp = a.skillName.localeCompare(b.skillName);
        // TODO the same skill can appear with different modifiers, in which case
        // we need to compare on their displayedModifiers field
        // sz: this isn't needed yet so i'll just not write it since it sounds annoying,
        // i apologize in advance if it becomes a problem
        return nameCmp;
    };
    actualDamageEntries.sort(damageEntryComparator);
    expectedDamageEntries.sort(damageEntryComparator);
    expect(actualDamageEntries).toEqual(expectedDamageEntries);
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
    compareDamageTables([
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
            // unaspected spell under enochian
            displayedModifiers: [PotencyModifierType.ENO],
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
}));


// things to test:
// enochian-dropping lines
// lines near sps breakpoints
// lines that don't have enough mp
// potency modifiers (AF3, UI3, etc.)
// umbral soul stops timer
// polyglot generation
// level synced potency values + replaced skills like HT/T3