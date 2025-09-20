// Tests for editing the timeline in various ways, including inserting skills, deleting skills,
// undoing actions, etc.
// These actions are performed by calling relevant controller methods to simulate an action triggered
// on the frontend. The expected skills in the simulation timeline are then checked at each step.
//
// Note that these tests do NOT cover frontend state synchronization between the editor table,
// canvas, status pane, and actual simulation state. This is a significant source of bugs, but
// cannot be tested readily without writing proper tests.

import React from "react";
import fs from "node:fs";
// import userEvent from "@testing-library/user-event";
import { ActionKey } from "../Game/Data";
import { controller } from "../Controller/Controller";
import { setCachedValue } from "../Controller/Common";
import {
	SerializedLine,
	jumpToTimestampNode,
	skillNode,
	setResourceNode,
	durationWaitNode,
	waitForMPNode,
} from "../Controller/Record";
import {
	MoveNodes,
	AddTimelineSlot,
	CloneTimelineSlot,
	SetActiveTimelineSlot,
	DeleteTimelineSlot,
} from "../Controller/UndoStack";

const readFileToString = (relPath: string) => {
	const absPath = "src/__test__/Asset/interactions/" + relPath;
	return fs.readFileSync(absPath, "utf8");
};

// Slot 0: [blm] jump to 0, f3, b3, f3, b3, f3, b3
const recordString0 = readFileToString("slot_0_blm.txt");
const SLOT_0_INIT_ACTIONS = [
	jumpToTimestampNode(0),
	skillNode("FIRE_III"),
	skillNode("BLIZZARD_III"),
	skillNode("FIRE_III"),
	skillNode("BLIZZARD_III"),
	skillNode("FIRE_III"),
	skillNode("BLIZZARD_III"),
].map((it) => it.serialized());
// Slot 1: [mch] wf and then a million ogcd spam
const recordString1 = readFileToString("slot_1_mch.txt");
const SLOT_1_INIT_ACTIONS = (
	[
		"WILDFIRE",
		"DOUBLE_CHECK",
		"CHECKMATE",
		"TACTICIAN",
		"DISMANTLE",
		"HEAD_GRAZE",
		"ARMS_LENGTH",
		"SECOND_WIND",
		"TINCTURE",
		"SPRINT",
	] as ActionKey[]
).map((key) => skillNode(key).serialized());

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
	// Place 2 test records in localStorage timeline slots, and clear the remaining slots.
	setCachedValue("gameRecord0", recordString0);
	setCachedValue("gameTime0", '{"countdown":10,"elapsedTime":25.199999999999996}');
	setCachedValue("gameRecord1", recordString1);
	setCachedValue("gameTime1", '{"countdown":0,"elapsedTime":7}');
	while (controller.timeline.slots.length > 2) {
		controller.timeline.removeSlot(2);
	}
	// Must come after removeSlot calls
	setCachedValue("activeSlotIndex", "0");
	controller.tryAutoLoad();
	return () => vi.restoreAllMocks();
});

// Helper function to create a test that performs actions, checks that the resulting line in the
// active slot matches the expectation after calling an undo/redo.
// Tests which check config changes should verify config manually.
function undoRedoTest(
	actions: {
		action: () => void;
		line: SerializedLine;
		testPost?: () => void;
		undoCount?: number;
	}[],
	params:
		| {
				pre?: () => void;
				post?: () => void;
		  }
		| undefined = undefined,
) {
	return () => {
		params?.pre?.();
		const initialState = controller.record.serialized().actions;
		actions.forEach(({ action, line, testPost, undoCount }, i) => {
			// Perform the action, then check the expected active record state afterwards.
			action();
			expect(
				controller.record.serialized().actions,
				`line after index ${i} did not match`,
			).toStrictEqual(line);
			const activeSlotIndex = controller.timeline.activeSlotIndex;
			// Undo the action(s), and check that state matches that of the previous step.
			for (let j = 0; j < (undoCount ?? 1); j++) {
				controller.undoStack.undo();
			}
			expect(
				controller.record.serialized().actions,
				`undo after index ${i} did not match`,
			).toStrictEqual(i === 0 ? initialState : actions[i - 1].line);
			// Redo the action(s) and check that the action was correctly re-applied.
			for (let j = 0; j < (undoCount ?? 1); j++) {
				controller.undoStack.redo();
			}
			expect(
				controller.record.serialized().actions,
				`redo after index ${i} did not match`,
			).toStrictEqual(line);
			expect(
				controller.timeline.activeSlotIndex,
				`expected slot after redo of index ${i} did not match`,
			).toStrictEqual(activeSlotIndex);
			testPost?.();
		});
		params?.post?.();
	};
}

function mockKeyDown(key: string) {
	// We can't use @testing-library/user-event directly because we handle focus weirdly and these
	// aren't proper browser tests, so we manually create fake keyboard events.
	// @ts-expect-error missing a bunch of react-specific properties
	const evt: React.KeyboardEvent = new KeyboardEvent("keydown", { key });
	// Assume all events are processed by both the timeline key handler and the global key handler.
	controller.handleTimelineKeyboardEvent(evt);
	controller.handleKeyboardEvent(evt);
}

describe("individual skill interactions", () => {
	it(
		"appends a skill when simulation is up to date",
		undoRedoTest([
			{
				action: () =>
					controller.requestUseSkill(
						{
							skillName: "BLIZZARD_IV",
							targetCount: 1,
						},
						true,
					),
				line: [...SLOT_0_INIT_ACTIONS, skillNode("BLIZZARD_IV").serialized()],
			},
		]),
	);

	it(
		"inserts a skill when viewing historical state",
		undoRedoTest([
			{
				action: () =>
					controller.timeline.onClickTimelineAction(
						// Select index 2 (the first B3 cast)
						2,
						false,
					),
				line: SLOT_0_INIT_ACTIONS,
			},
			{
				action: () =>
					controller.requestUseSkill(
						{
							skillName: "FIRE_IV",
							targetCount: 1,
						},
						true,
					),
				line: [
					...SLOT_0_INIT_ACTIONS.slice(0, 2),
					skillNode("FIRE_IV").serialized(),
					...SLOT_0_INIT_ACTIONS.slice(2),
				],
			},
		]),
	);

	it(
		"deletes selected skills",
		undoRedoTest([
			{
				action: () => {
					// Select index 2 (the first B3 cast) through index 4 (second b3 cast)
					controller.timeline.onClickTimelineAction(2, false);
					controller.timeline.onClickTimelineAction(4, true);
				},
				line: SLOT_0_INIT_ACTIONS,
			},
			{
				action: () => mockKeyDown("Delete"),
				line: [...SLOT_0_INIT_ACTIONS.slice(0, 2), ...SLOT_0_INIT_ACTIONS.slice(5)],
			},
		]),
	);

	it(
		"deletes last skill in line",
		undoRedoTest([
			{
				action: () => mockKeyDown("u"),
				line: SLOT_0_INIT_ACTIONS.slice(0, SLOT_0_INIT_ACTIONS.length - 1),
			},
		]),
	);

	it(
		"moves single selected skill",
		undoRedoTest([
			{
				action: () => {
					// Move the first F3 before the jump event
					controller.timeline.onClickTimelineAction(1, false);
					// Because of weird state synchronization stuff, there's no method that implicitly
					// pushes to the undo stack on move.
					controller.undoStack.push(new MoveNodes(1, 1, -1));
					controller.record.moveSelected(-1);
				},
				line: [
					SLOT_0_INIT_ACTIONS[1],
					SLOT_0_INIT_ACTIONS[0],
					...SLOT_0_INIT_ACTIONS.slice(2),
				],
			},
		]),
	);

	it(
		"moves multiple selected skills",
		undoRedoTest([
			{
				action: () => {
					// Move the 2 nodes (f3, b3) forward by 2
					controller.timeline.onClickTimelineAction(1, false);
					controller.timeline.onClickTimelineAction(2, true);
					controller.undoStack.push(new MoveNodes(1, 2, 2));
					controller.record.moveSelected(2);
				},
				line: [
					SLOT_0_INIT_ACTIONS[0],
					SLOT_0_INIT_ACTIONS[3],
					SLOT_0_INIT_ACTIONS[4],
					SLOT_0_INIT_ACTIONS[1],
					SLOT_0_INIT_ACTIONS[2],
					...SLOT_0_INIT_ACTIONS.slice(5),
				],
			},
		]),
	);

	it(
		"adds buff toggle node",
		undoRedoTest([
			{
				action: () => controller.requestToggleBuff("THUNDERHEAD", true),
				line: [...SLOT_0_INIT_ACTIONS, setResourceNode("THUNDERHEAD").serialized()],
			},
		]),
	);

	it(
		"adds duration wait node",
		undoRedoTest([
			{
				action: () => {
					controller.step(5, true);
				},
				line: [...SLOT_0_INIT_ACTIONS, durationWaitNode(5).serialized()],
			},
			{
				action: () => {
					controller.timeline.onClickTimelineAction(1, false);
					controller.step(2.5, true);
				},
				line: [
					SLOT_0_INIT_ACTIONS[0],
					durationWaitNode(2.5).serialized(),
					...SLOT_0_INIT_ACTIONS.slice(1),
					durationWaitNode(5).serialized(),
				],
			},
		]),
	);

	it(
		"adds target jump node and MP tick nodes, then removes idle time",
		undoRedoTest([
			{
				action: () => controller.stepUntil(30, true),
				line: [...SLOT_0_INIT_ACTIONS, jumpToTimestampNode(30).serialized()],
			},
			{
				action: () => controller.waitTillNextMpOrLucidTick(),
				line: [
					...SLOT_0_INIT_ACTIONS,
					jumpToTimestampNode(30).serialized(),
					waitForMPNode().serialized(),
				],
			},
			{
				action: () => controller.removeTrailingIdleTime(),
				line: SLOT_0_INIT_ACTIONS,
			},
		]),
	);

	it(
		"removes trailing idle time with no skills",
		undoRedoTest(
			[
				{
					action: () => controller.stepUntil(11, true),
					line: [jumpToTimestampNode(11).serialized()],
				},
				{
					action: () => controller.removeTrailingIdleTime(),
					line: [],
				},
			],
			{ pre: () => controller.setConfigAndRestart(controller.gameConfig.serialized()) },
		),
	);
});

describe("timeline slot manipulation", () => {
	it(
		"creates a new empty timeline with the same config",
		undoRedoTest([
			{
				action: () => controller.undoStack.doThenPush(new AddTimelineSlot(0)),
				line: [],
				testPost: () =>
					expect(controller.gameConfig.serialized()).toStrictEqual(
						JSON.parse(recordString0)["config"],
					),
			},
		]),
	);

	// Deleting an inactive slot is allowed, but currently hidden to the UI, so we only test deleting the active slot.
	it(
		"switches, clones, and deletes the current slot",
		undoRedoTest([
			{
				action: () => controller.undoStack.doThenPush(new SetActiveTimelineSlot(0, 1)),
				line: SLOT_1_INIT_ACTIONS,
				testPost: () => expect(controller.timeline.activeSlotIndex).toStrictEqual(1),
			},
			{
				action: () => controller.undoStack.doThenPush(new CloneTimelineSlot(1)),
				line: SLOT_1_INIT_ACTIONS,
				testPost: () => {
					expect(controller.timeline.activeSlotIndex).toStrictEqual(2);
					expect(controller.timeline.slots.length).toStrictEqual(3);
				},
			},
			// Add an extra action to slot 2, then switch to + delete slot 0.
			// The new slot 0 should contain slot 1's original actions, while the new slot 1
			// contains the new skill, and slot 2 is empty.
			{
				action: () => {
					controller.requestUseSkill(
						{
							skillName: "DRILL",
							targetCount: 1,
						},
						true,
					);
					controller.undoStack.doThenPush(new SetActiveTimelineSlot(2, 0));
					controller.undoStack.doThenPush(
						new DeleteTimelineSlot(0, controller.record.serialized()),
					);
				},
				undoCount: 3,
				line: SLOT_1_INIT_ACTIONS,
				testPost: () => {
					expect(controller.timeline.activeSlotIndex).toStrictEqual(0);
					expect(controller.timeline.slots.length).toStrictEqual(2);
				},
			},
			{
				action: () => controller.undoStack.doThenPush(new SetActiveTimelineSlot(0, 1)),
				line: [...SLOT_1_INIT_ACTIONS, skillNode("DRILL", 1).serialized()],
			},
		]),
	);
});

// describe("bulk skill and config interactions", () => {
// 	it("can import from file", undoRedoTest([{action: () => {}, line: []}]));

// 	it("can import skill sequence preset", undoRedoTest([{action: () => {}, line: []}]));

// 	it("can apply config change", undoRedoTest([{action: () => {}, line: []}]));

// 	it("can apply and reset config change", undoRedoTest([{action: () => {}, line: []}]));
// });

// describe("copy and patse", () => {
// 	it("copies timeline and pastes to self", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies jump at start of record in discord mode", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies plaintext to clipboard en", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies plaintext to clipboard zh", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies tsv to clipboard", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies discord emotes to clipboard", undoRedoTest([{action: () => {}, line: []}]));

// 	it("pastes comma-separated skill names from clipboard", undoRedoTest([{action: () => {}, line: []}]));

// 	it("copies and pastes skills with target counts", undoRedoTest([{action: () => {}, line: []}]));

// 	it("pastes tab-separated columns with only skill column", undoRedoTest([{action: () => {}, line: []}]));

// 	it("pastes tab-separated columns with target count and skills", undoRedoTest([{action: () => {}, line: []}]));

// 	it("pastes discord emotes", undoRedoTest([{action: () => {}, line: []}]));
// });
