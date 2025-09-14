// In the frontend, we track an undo/redo history of the last several timeline interactions.
// The undo/redo methods of an interaction are only valid at the state before/after they were applied,
// since they track stuff like record index that is sensitive to other state changes.

// import React from "react";
import { updateInvalidStatus } from "../Components/TimelineEditor";
import { controller } from "./Controller";
import { ActionNode } from "./Record";
// import { ConfigData } from "../Game/GameConfig";

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

	undo() {
		if (this.cursor > 0) {
			this.actions[--this.cursor].undo();
			console.log("UNDO", this.actions[this.cursor]);
		} else {
			console.log("nothing to undo");
		}
	}

	redo() {
		if (this.cursor < this.actions.length) {
			console.log("REDO", this.actions[this.cursor]);
			this.actions[this.cursor++].redo();
		} else {
			console.log("nothing to redo");
		}
	}
}

export abstract class TimelineInteraction {
	abstract undo(): void;
	abstract redo(): void;
	// abstract undoToast(): React.Element;
	// abstract redoToast(): React.Element;
}

// === BASIC SINGLE-TIMELINE INTERACTIONS ===
export class AddNode extends TimelineInteraction {
	node: ActionNode;
	index: number;

	constructor(node: ActionNode, index: number) {
		super();
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
		super();
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
		super();
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
		super();
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
// SetActiveTimeline
// DeleteTimeline
// NewTimeline

// === CONFIGURATION AND IMPORT INTERACTIONS ===

// export class SetConfigField extends TimelineInteraction {
//     constructor(fields: [K in keyof ConfigData]: { old: ConfigData[K]; new: ConfigData[K] }) {
//         this.fields = fields;
//     }

//     override undo() {

//     }

//     override redo() {

//     }
// }

// export class ImportTimeline extends TimelineInteraction {

// }
