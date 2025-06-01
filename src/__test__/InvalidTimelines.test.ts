// Tests to ensure the integrity of controller state across various timeline operations.
// Ideally, these tests would spin up a browser with a fresh localStorage + memory every time,
// but vitests browser mode (https://vitest.dev/guide/browser/) is still experimental
// and I don't want to deal with that.
// The best we can do is to check state from the relevant controller methods used by the editor
// and canvas modules. Unfortunately, the timeline editor internal interface is really messy, so we don't
// have a clean way to test discarding or applying editor changes.

import fs from "node:fs";
import { controller } from "../Controller/Controller";
import { setCachedValue } from "../Controller/Common";

const readFileToString = (relPath: string) => {
	const absPath = "src/__test__/Asset/invalid_files/" + relPath;
	return fs.readFileSync(absPath, "utf8");
};

beforeEach(() => {
	const data = new Map<string, string>();
	const mockLocalStorage = {
		getItem: vi.fn((key: string) => data.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => data.set(key, value)),
		removeItem: vi.fn((key: string) => {
			data.delete(key);
			return undefined;
		}),
	};
	vi.stubGlobal("localStorage", mockLocalStorage);
	// Place the test records in localStorage timeline slots.
	// 1. manafic_before_combat_and_verfire_cancel
	//   Manafication is used outside of combat, and Verfire is used at a time where the
	//   Verfire ready buff would fall off before it completes.
	// 2. no_af_despair
	//   Despair is used as the first GCD of the timeline, without AF.
	// 3. not_enough_mp
	//   Fire III is spammed until no MP remains.
	// 4. zanshin_before_iki
	//   Zanshin is used before Ikishoten, which grants Zanshin Ready.
	setCachedValue("gameRecord0", readFileToString("manafic_before_combat_and_verfire_cancel.txt"));
	setCachedValue("gameTime0", '{"countdown":5,"elapsedTime":35.783333333333324}');
	setCachedValue("gameRecord1", readFileToString("no_af_despair.txt"));
	setCachedValue("gameTime1", '{"countdown":5,"elapsedTime":9.85}');
	setCachedValue("gameRecord2", readFileToString("not_enough_mp.txt"));
	setCachedValue("gameTime2", '{"countdown":5,"elapsedTime":17.749999999999996}');
	setCachedValue("gameRecord3", readFileToString("zanshin_before_iki.txt"));
	setCachedValue("gameTime3", '{"countdown":5,"elapsedTime":7.833333333333334}');
	controller.tryAutoLoad();
});

afterEach(() => {
	vi.restoreAllMocks();
});

type SlotExpectation = {
	length: number;
	// note: index is 0-based, and adjusted by 1 on the frontend
	invalidActions: { index: number; skillName: string }[];
};

// To avoid encoding full expectations on all actions, we instead only check
// the number of actions and the indices/names of invalid actions for each slot.
const checkAllSlots = (expected: readonly SlotExpectation[]) => {
	expect(controller.timeline.slots.length, "number of expected slots is incorrect").toBe(
		expected.length,
	);
	expected.forEach((exp, i) => {
		controller.setActiveSlot(i);
		const slotValidStatus = controller.checkRecordValidity(controller.record, 0, true);
		expect.soft(controller.record.length).toBe(exp.length);
		const parsedInvalid = slotValidStatus.invalidActions.map((info) => {
			const nodeInfo = info.node.info;
			return {
				index: info.index,
				skillName: nodeInfo.type === "Skill" ? nodeInfo.skillName : "other",
			};
		});
		expect.soft(parsedInvalid).toStrictEqual(exp.invalidActions);
	});
};

const DEFAULT_EXPECTED_SLOTS = Object.freeze([
	{
		length: 9,
		invalidActions: [
			{
				index: 3,
				skillName: "MANAFICATION",
			},
			{
				index: 8,
				skillName: "VERFIRE",
			},
		],
	},
	{
		length: 5,
		invalidActions: [
			{
				index: 0,
				skillName: "DESPAIR",
			},
			{
				index: 3,
				skillName: "DESPAIR",
			},
		],
	},
	{
		length: 5,
		invalidActions: [
			{
				index: 3,
				skillName: "FIRE_III",
			},
			{
				index: 4,
				skillName: "FIRE_III",
			},
		],
	},
	{
		length: 6,
		invalidActions: [
			{
				index: 4,
				skillName: "ZANSHIN",
			},
		],
	},
]);

it("has correct actions on initial load", () => {
	checkAllSlots(DEFAULT_EXPECTED_SLOTS);
});

it("has correct actions after switching slots and loading a record from a file", () => {
	controller.setActiveSlot(3);
	controller.loadBattleRecordFromFile(
		JSON.parse(readFileToString("manafic_before_combat_and_verfire_cancel.txt")),
	);
	checkAllSlots([...DEFAULT_EXPECTED_SLOTS.slice(0, 3), DEFAULT_EXPECTED_SLOTS[0]]);
});

it("has correct actions after switching slots and triggering a reset", () => {
	// Behavior of hitting "apply and reset" in PlaybackControl
	controller.setActiveSlot(2);
	controller.setConfigAndRestart(controller.game.config);
	checkAllSlots([
		...DEFAULT_EXPECTED_SLOTS.slice(0, 2),
		{ length: 0, invalidActions: [] },
		DEFAULT_EXPECTED_SLOTS[3],
	]);
});

it("has correct actions after deleting, then adding a new slot", () => {
	controller.timeline.removeSlot(2);
	controller.displayCurrentState();
	checkAllSlots([...DEFAULT_EXPECTED_SLOTS.slice(0, 2), DEFAULT_EXPECTED_SLOTS[3]]);
	controller.timeline.addSlot();
	checkAllSlots([
		...DEFAULT_EXPECTED_SLOTS.slice(0, 2),
		DEFAULT_EXPECTED_SLOTS[3],
		{ length: 0, invalidActions: [] },
	]);
});
