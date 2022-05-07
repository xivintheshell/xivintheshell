import {FileType} from "./Common";
import {GameConfig, ResourceType, SkillName} from "../Game/Common";

export const enum ActionType {
	Skill = "Skill",
	Wait = "Wait",
	SetResourceEnabled = "SetResourceEnabled",
}

function verifyActionNode(action: ActionNode) {
	console.assert(typeof action !== "undefined");
	if (action.type === ActionType.Skill) {
		console.assert(typeof action.skillName === "string");
		console.assert(typeof action.waitDuration === "number");
		console.assert(typeof action.tmp_capturedPotency === "number");
		return;
	} else if (action.type === ActionType.Wait) {
		console.assert(!isNaN(action.waitDuration));
		return;
	} else if (action.type === ActionType.SetResourceEnabled) {
		console.assert(typeof action.buffName === "string");
		return;
	}
	console.assert(false);
}

export class ActionNode {
	static _gNodeIndex: number = 0;
	_nodeIndex: number;

	type: ActionType;
	waitDuration: number = 0;
	skillName?: SkillName;
	buffName? : ResourceType;
	next?: ActionNode = undefined;

	tmp_startLockTime?: number;
	tmp_endLockTime?: number;
	tmp_capturedPotency?: number;

	constructor(actionType: ActionType) {
		this.type = actionType;
		this._nodeIndex = ActionNode._gNodeIndex;
		ActionNode._gNodeIndex++;
	}

	getClone() {
		let copy = new ActionNode(this.type);
		copy.skillName = this.skillName;
		copy.waitDuration = this.waitDuration;
		copy.buffName = this.buffName;
		return copy;
	}

	#selected = false;
	isSelected() { return this.#selected; }
	select() {
		this.#selected = true;
	}
	unselect() {
		this.#selected = false;
	}
}

export class Line {
	static _gLineIndex: number = 0;
	_lineIndex: number;

	head?: ActionNode;
	tail?: ActionNode;
	name: string = "(anonymous line)";

	constructor() {
		this._lineIndex = Line._gLineIndex;
		Line._gLineIndex++;
	}
	addActionNode(actionNode: ActionNode) {
		console.assert(actionNode);
		if (!this.head) {
			this.head = actionNode;
		} else if (this.tail) {
			this.tail.next = actionNode;
		} else {
			console.assert(false);
		}
		this.tail = actionNode;
	}
	getFirstAction() {
		return this.head;
	}
	getLastAction() {
		return this.tail;
	}
	serialized(): {name: string, actions: object[]} {
		let list = [];
		let itr = this.head;
		while (itr) {
			list.push({
				type: itr.type,
				// skill
				skillName: itr.skillName,
				// setResourceEnabled
				buffName: itr.buffName,
				// any
				waitDuration: itr.waitDuration,
			});
			itr = itr.next;
		}
		return {
			name: this.name,
			actions: list
		};
	}
}

// a sequence of actions
export class Record extends Line {
	selectionStart?: ActionNode;
	selectionEnd?: ActionNode;
	config?: GameConfig;
	getFirstSelection() {
		return this.selectionStart;
	}
	getLastSelection() {
		return this.selectionEnd;
	}
	addActionNode(actionNode: ActionNode) {
		verifyActionNode(actionNode);
		super.addActionNode(actionNode);
	}

	iterateAll(fn: (node: ActionNode) => void): void {
		let itr: ActionNode | undefined = this.head;
		while (itr) {
			fn(itr);
			itr = itr.next;
		}
	}

	iterateSelected(fn: (node: ActionNode) => void): void {
		let itr: ActionNode | undefined = this.selectionStart;
		while (itr && itr !== (this.selectionEnd?.next ?? undefined)) {
			fn(itr);
			itr = itr.next;
		}
	}

	#getSelectionStats() {
		let potency = 0;
		let duration = 0;

		this.iterateSelected(itr=>{
			// potency
			potency += itr.tmp_capturedPotency ?? 0;
			// duration
			if (itr !== this.selectionEnd) {
				duration += itr.waitDuration;
			} else {
				duration += (itr.tmp_endLockTime ?? 0) - (itr.tmp_startLockTime ?? 0);
			}
		});

		console.assert(!isNaN(potency));
		console.assert(!isNaN(duration));
		return [potency, duration];
	}
	// assume node is actually in this recording
	selectSingle(node: ActionNode) {
		this.unselectAll();
		node.select();
		this.selectionStart = node;
		this.selectionEnd = node;
		return this.#getSelectionStats();
	}
	unselectAll() {
		this.iterateAll(itr=>{
			itr.unselect();
		})
		this.selectionStart = undefined;
		this.selectionEnd = undefined;
	}
	#selectSequence(first: ActionNode, last: ActionNode) {
		this.unselectAll();
		this.iterateSelected(itr=>{
			itr.select();
		})
		this.selectionStart = first;
		this.selectionEnd = last;
		return this.#getSelectionStats();
	}
	selectUntil(node: ActionNode) {
		// proceed only if there's currently exactly 1 node selected
		if (this.selectionStart && this.selectionStart === this.selectionEnd) {
			let itr: ActionNode | undefined;
			for (itr = this.selectionStart; itr; itr = itr.next) {
				if (itr === node) {
					return this.#selectSequence(this.selectionStart, node);
				}
			}
			// failed to find node from going down the currently selected list
			for (itr = node; itr; itr = itr.next) {
				if (itr === this.selectionStart) {
					return this.#selectSequence(node, this.selectionStart);
				}
			}
			// failed both ways (shouldn't get here)
			console.assert(false);
			return [0, 0];
		} else {
			return this.selectSingle(node);
		}
	}
	serialized() {
		console.assert(this.config);
		let base = super.serialized();
		return {
			name: base.name,
			fileType: FileType.Record,
			config: this.config,
			actions: base.actions,
		};
	}
}

