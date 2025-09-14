// In the frontend, we track an undo/redo history of the last several timeline interactions.
// The undo/redo methods of an interaction are only valid at the state before/after they were applied,
// since they track stuff like record index that is sensitive to other state changes.

import { updateInvalidStatus } from "../Components/TimelineEditor";
import { LocalizedContent } from "../Components/Localization";
import { controller } from "./Controller";
import { ActionNode, SerializedRecord } from "./Record";
import { SerializedConfig } from "../Game/GameConfig";

const UNDO_STACK_LIMIT = 30;

export class UndoStack {
	actions: TimelineInteraction[];
	// The last action that was performed is at actions[cursor - 1]. If cursor is 0, there are
	// no actions left to undo.
	cursor: number;

	constructor() {
		this.cursor = 0;
		this.actions = [];
	}

	clear() {
		this.cursor = 0;
		this.actions = [];
	}

	push(action: TimelineInteraction) {
		// Add a new interaction, cutting off all actions at the cursor and afterwards.
		this.actions.splice(this.cursor, this.actions.length - this.cursor, action);
		if (this.actions.length > UNDO_STACK_LIMIT) {
			this.actions.shift();
		}
		// The cursor should always point to the end of the undo stack after adding an action.
		this.cursor = this.actions.length;
	}

	doThenPush(action: TimelineInteraction) {
		action.redo();
		this.push(action);
	}

	undo() {
		if (this.cursor > 0) {
			this.actions[--this.cursor].undo();
			// console.log("UNDO", this.actions[this.cursor]);
		} else {
			// console.log("nothing to undo");
		}
	}

	redo() {
		if (this.cursor < this.actions.length) {
			// console.log("REDO", this.actions[this.cursor]);
			this.actions[this.cursor++].redo();
		} else {
			// console.log("nothing to redo");
		}
	}

	peekUndoMessage(): LocalizedContent | undefined {
		return this.cursor > 0 ? this.actions[this.cursor - 1].message : undefined;
	}

	peekRedoMessage(): LocalizedContent | undefined {
		return this.cursor < this.actions.length ? this.actions[this.cursor].message : undefined;
	}
}

export abstract class TimelineInteraction {
	// A blurb to display on undo/redo buttons or toasts. Should be very short.
	message: LocalizedContent;

	constructor(message: LocalizedContent) {
		// TODO: make messages more detailed
		// right now they're all very short to ensure they don't overflow the button's space
		this.message = message;
	}

	abstract undo(): void;
	abstract redo(): void;
}

// === BASIC SINGLE-TIMELINE INTERACTIONS ===
export class AddNode extends TimelineInteraction {
	node: ActionNode;
	index: number;

	constructor(node: ActionNode, index: number) {
		// TODO: distinguish between node types
		super({ en: "add action", zh: "添加技能" });
		this.node = node;
		this.index = index;
	}

	override undo() {
		controller.record.selectSingle(this.index);
		controller.deleteSelectedSkills();
	}

	override redo() {
		controller.insertRecordNode(this.node, this.index);
	}
}

export class MoveNodes extends TimelineInteraction {
	startIndex: number;
	selectCount: number;
	offset: number;

	constructor(startIndex: number, selectCount: number, offset: number) {
		super({ en: "move action" + (selectCount > 1 ? "s" : ""), zh: "移动技能" });
		this.startIndex = startIndex;
		this.selectCount = selectCount;
		this.offset = offset;
	}

	override undo() {
		controller.record.selectSingle(this.startIndex + this.offset);
		controller.record.selectUntil(this.startIndex + this.selectCount + this.offset - 1);
		controller.record.moveSelected(-this.offset);
		controller.autoSave();
		updateInvalidStatus();
	}

	override redo() {
		controller.record.selectSingle(this.startIndex);
		controller.record.selectUntil(this.startIndex + this.selectCount - 1);
		controller.record.moveSelected(this.offset);
		controller.autoSave();
		updateInvalidStatus();
	}
}

export class DeleteNodes extends TimelineInteraction {
	startIndex: number;
	nodes: ActionNode[];
	source: "delete" | "cut";

	constructor(startIndex: number, nodes: ActionNode[], source: "delete" | "cut") {
		super({
			en: source + " action" + (nodes.length > 1 ? "s" : ""),
			zh: (source === "delete" ? "删除" : "剪切") + "技能",
		});
		this.startIndex = startIndex;
		this.nodes = nodes;
		this.source = source;
	}

	override undo() {
		controller.insertRecordNodes(this.nodes, this.startIndex);
	}

	override redo() {
		controller.record.selectSingle(this.startIndex);
		controller.record.selectUntil(this.startIndex + this.nodes.length - 1);
		controller.deleteSelectedSkills();
	}
}

export class AddNodeBulk extends TimelineInteraction {
	nodes: ActionNode[];
	index: number;
	source: "preset" | "paste";

	constructor(nodes: ActionNode[], index: number, source: "preset" | "paste") {
		super({
			en: source === "preset" ? "add preset sequence" : "paste actions",
			zh: source === "preset" ? "增加技能序列预设" : "粘贴技能",
		});
		this.nodes = nodes;
		this.index = index;
		this.source = source;
	}

	override undo() {
		controller.record.selectSingle(this.index);
		controller.record.selectUntil(this.index + this.nodes.length - 1);
		controller.deleteSelectedSkills();
	}

	override redo() {
		controller.insertRecordNodes(this.nodes, this.index);
	}
}

// === META STUFF ===
export class SetActiveTimelineSlot extends TimelineInteraction {
	oldIndex: number;
	newIndex: number;

	constructor(oldIndex: number, newIndex: number) {
		super({
			en: "change active slot",
			zh: "交换当前时间轴",
		});
		this.oldIndex = oldIndex;
		this.newIndex = newIndex;
	}

	override undo() {
		controller.setActiveSlot(this.oldIndex);
		controller.displayCurrentState();
	}

	override redo() {
		controller.setActiveSlot(this.newIndex);
		controller.displayCurrentState();
	}
}

export class DeleteTimelineSlot extends TimelineInteraction {
	deleteIndex: number;
	deletedRecord: SerializedRecord;

	constructor(deleteIndex: number, deletedRecord: SerializedRecord) {
		super({
			en: "delete slot",
			zh: "删除时间轴",
		});
		this.deleteIndex = deleteIndex;
		this.deletedRecord = deletedRecord;
	}

	override undo() {
		controller.timeline.addSlotAtIndex(this.deleteIndex);
		controller.loadBattleRecordFromFile(this.deletedRecord);
		controller.autoSave();
		controller.displayCurrentState();
	}

	override redo() {
		controller.timeline.removeSlot(this.deleteIndex);
		controller.displayCurrentState();
	}
}

export class AddTimelineSlot extends TimelineInteraction {
	oldIndex: number;

	constructor(currentIndex: number) {
		super({
			en: "add timeline slot",
			zh: "添加时间轴",
		});
		// track the original active slot to ensure we copy the correct config
		this.oldIndex = currentIndex;
	}

	override undo() {
		controller.timeline.removeSlot(controller.timeline.slots.length - 1);
		controller.setActiveSlot(this.oldIndex);
		controller.displayCurrentState();
	}

	override redo() {
		controller.setActiveSlot(this.oldIndex);
		controller.timeline.addSlot();
		controller.displayCurrentState();
	}
}

export class CloneTimelineSlot extends TimelineInteraction {
	sourceIndex: number;

	constructor(sourceIndex: number) {
		super({
			en: "clone timeline slot",
			zh: "复制时间轴",
		});
		this.sourceIndex = sourceIndex;
	}

	override undo() {
		controller.timeline.removeSlot(controller.timeline.slots.length - 1);
		controller.setActiveSlot(this.sourceIndex);
		controller.displayCurrentState();
	}

	override redo() {
		controller.setActiveSlot(this.sourceIndex);
		controller.cloneActiveSlot();
		controller.displayCurrentState();
	}
}

// === CONFIGURATION AND IMPORT INTERACTIONS ===

export class ConfigApply extends TimelineInteraction {
	// TODO: just encode diffs to save some memory?
	oldConfig: SerializedConfig;
	newConfig: SerializedConfig;
	// Store the old record if the operation caused a reset.
	oldRecord: SerializedRecord | undefined;

	constructor(
		oldConfig: SerializedConfig,
		newConfig: SerializedConfig,
		oldRecord: SerializedRecord | undefined,
	) {
		super({ en: "change config", zh: "调整属性设置" });
		this.oldConfig = oldConfig;
		this.newConfig = newConfig;
		if (
			oldRecord === undefined &&
			(oldConfig.job !== newConfig.job || oldConfig.level !== newConfig.level)
		) {
			console.error("config apply w/o reset but job or level changed");
		}
		this.oldRecord = oldRecord;
	}

	override undo() {
		if (this.oldRecord !== undefined) {
			controller.loadBattleRecordFromFile(this.oldRecord);
			controller.autoSave();
		} else {
			controller.setConfigAndRestart(this.oldConfig, false);
		}
		controller.updateAllDisplay();
		controller.scrollToTime();
	}

	override redo() {
		controller.setConfigAndRestart(this.newConfig, this.oldRecord !== undefined);
		controller.updateAllDisplay();
		controller.scrollToTime();
	}
}

export class ImportTimeline extends TimelineInteraction {
	// TODO: only set new record after an undo to save memory?
	oldRecord: SerializedRecord;
	importedRecord: SerializedRecord;

	constructor(oldRecord: SerializedRecord, importedRecord: SerializedRecord) {
		super({
			en: "import from file",
			zh: "从文件导入战斗",
		});
		this.oldRecord = oldRecord;
		this.importedRecord = importedRecord;
	}

	override undo() {
		// loadBattleRecordFromFile calls render methods, so no need to explicily
		// invoke updateAllDisplay here
		controller.loadBattleRecordFromFile(this.oldRecord);
		controller.autoSave();
		controller.displayCurrentState();
	}

	override redo() {
		controller.loadBattleRecordFromFile(this.importedRecord);
		controller.autoSave();
		controller.displayCurrentState();
	}
}

// TODO
// === MARKER ACTIONS ===
// LoadMarkerPreset
// AddMarker
// RemoveMarkers
