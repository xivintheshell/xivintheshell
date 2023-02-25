import {FileType} from "./Common";
import {ResourceType, SkillName, SkillReadyStatus} from "../Game/Common";
import {GameConfig} from "../Game/GameConfig"

export const enum ActionType {
	Skill = "Skill",
	Wait = "Wait",
	SetResourceEnabled = "SetResourceEnabled",
}

function verifyActionNode(action: ActionNode) {
	console.assert(typeof action !== "undefined");
	if (action.type === ActionType.Skill) {
		console.assert(typeof action.skillName === "string");
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
	#nodeIndex: number;
	#capturedBuffs: Set<ResourceType>;
	#capturedPotency: number;

	type: ActionType;
	waitDuration: number = 0;
	skillName?: SkillName;
	buffName? : ResourceType;

	next?: ActionNode = undefined;

	#selected = false;

	tmp_startLockTime?: number;
	tmp_endLockTime?: number;

	constructor(actionType: ActionType) {
		this.type = actionType;
		this.#nodeIndex = ActionNode._gNodeIndex;
		this.#capturedBuffs = new Set<ResourceType>();
		this.#capturedPotency = 0;
		ActionNode._gNodeIndex++;
	}

	getClone() {
		let copy = new ActionNode(this.type);
		copy.skillName = this.skillName;
		copy.waitDuration = this.waitDuration;
		copy.buffName = this.buffName;
		return copy;
	}

	getNodeIndex() { return this.#nodeIndex; }

	isSelected() { return this.#selected; }

	addBuff(rsc: ResourceType) {
		this.#capturedBuffs.add(rsc);
	}

	hasBuff(rsc: ResourceType) {
		return this.#capturedBuffs.has(rsc);
	}

	getPotency() { return this.#capturedPotency}

	addPotency(amount : number) {
		this.#capturedPotency += amount;
	}

	select() {
		this.#selected = true;
	}
	unselect() {
		this.#selected = false;
	}
}

// Record but without config/stats and selection info, just a sequence of skills
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
	iterateAll(fn: (node: ActionNode) => void): void {
		let itr: ActionNode | undefined = this.head;
		while (itr) {
			fn(itr);
			itr = itr.next;
		}
	}
	getPotencySum() {
		let potency = 0;
		this.iterateAll(node=>{
			potency += node.getPotency();
		});
		return potency;
	}
	getFirstAction() {
		return this.head;
	}
	getLastAction(condition? : (node: ActionNode) => boolean) {
		if (condition===undefined) {
			return this.tail;
		} else {
			let lastMatch : ActionNode | undefined = undefined;
			this.iterateAll(node=>{
				if (condition(node)) {
					lastMatch = node;
				}
			});
			return lastMatch;
		}
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

export type RecordValidStatus = {
	isValid: boolean,
	firstInvalidAction: ActionNode | undefined,
	invalidReason: SkillReadyStatus | undefined
};

// information abt a timeline
export class Record extends Line {
	selectionStart?: ActionNode;
	selectionEnd?: ActionNode;
	config?: GameConfig;
	getFirstSelection() {
		if (this.selectionStart) console.assert(this.selectionEnd !== undefined);
		return this.selectionStart;
	}
	getLastSelection() {
		if (this.selectionEnd) console.assert(this.selectionStart !== undefined);
		return this.selectionEnd;
	}
	addActionNode(actionNode: ActionNode) {
		verifyActionNode(actionNode);
		super.addActionNode(actionNode);
	}
	addActionNodeWithoutVerify(actionNode: ActionNode) {
		super.addActionNode(actionNode);
	}

	iterateSelected(fn: (node: ActionNode) => void): void {
		let itr: ActionNode | undefined = this.selectionStart;
		while (itr && itr !== (this.selectionEnd?.next ?? undefined)) {
			fn(itr);
			itr = itr.next;
		}
	}

	getSelectedPotencySum() {
		let potency = 0;
		this.iterateSelected(node=>{
			potency += node.getPotency();
		});
		return potency;
	}

	#getSelectionStats() {
		let potency = 0;
		let duration = 0;

		this.iterateSelected(itr=>{
			if (itr.type === ActionType.Skill) {
				// potency
				potency += itr.getPotency();
				// duration
				if (itr !== this.selectionEnd) {
					duration += itr.waitDuration;
				} else {
					duration += (itr.tmp_endLockTime ?? 0) - (itr.tmp_startLockTime ?? 0);
				}
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
		this.selectionStart = first;
		this.selectionEnd = last;
		this.iterateSelected(itr=>{
			itr.select();
		})
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
	onClickNode(node: ActionNode, bShift: boolean) {
		let potency, duration;
		if (bShift) {
			[potency, duration] = this.selectUntil(node);
		} else {
			[potency, duration] = this.selectSingle(node);
		}
		let selectionStart = this.getFirstSelection()?.tmp_startLockTime ?? 0;
		let selectionEnd = this.getLastSelection()?.tmp_endLockTime ?? 0;
		return {
			selectedPotency: potency,
			selectionStartTime: selectionStart,
			selectionEndTime: selectionEnd
		};
	}
	moveSelected(offset: number) { // positive: move forward; negative: move backward
		if (offset === 0) return;
		let firstSelected = this.getFirstSelection();
		let lastSelected = this.getLastSelection();
		if (!firstSelected || !lastSelected) return;

		let oldNodeBeforeSelection: ActionNode | undefined = undefined;
		let itr = this.getFirstAction();
		while (itr) {
			if (itr.next === firstSelected) oldNodeBeforeSelection = itr;
			itr = itr.next;
		}

		// stitch together before and after chains
		if (oldNodeBeforeSelection) {
			oldNodeBeforeSelection.next = lastSelected.next;
		}
		// also update head & tail to without selection
		if (this.head?.isSelected()) {
			this.head = lastSelected.next;
		}
		if (this.tail?.isSelected()) {
			this.tail = oldNodeBeforeSelection;
		}

		// temporarily label the unselected nodes with an index
		let nodesArray : ActionNode[] = [];
		let nodeBeforeSelectionIdx = -1;

		let idx = 0;
		itr = this.getFirstAction();
		while (itr) {
			 nodesArray.push(itr);
			 if (itr === oldNodeBeforeSelection) {
				  nodeBeforeSelectionIdx = idx;
			 }
			itr = itr.next;
			idx++;
		}

		// insert back the selection chain
		let newIndexBeforeSelection = nodeBeforeSelectionIdx + offset;
		if (newIndexBeforeSelection >= nodesArray.length) newIndexBeforeSelection = nodesArray.length - 1;

		let newNodeBeforeSelection = newIndexBeforeSelection < 0 ? undefined : nodesArray[newIndexBeforeSelection];
		if (newNodeBeforeSelection) {
			let newNodeAfterSelection = newNodeBeforeSelection.next;
			newNodeBeforeSelection.next = firstSelected;
			lastSelected.next = newNodeAfterSelection;
			if (!newNodeAfterSelection) this.tail = lastSelected;
		} else {
			lastSelected.next = this.head;
			this.head = firstSelected;
		}
	}
	deleteSelected() {
		let firstSelected = this.getFirstSelection();
		let lastSelected = this.getLastSelection();
		if (!firstSelected) return;
		this.unselectAll();

		let firstBeforeSelected : ActionNode | undefined = undefined;
		let itr = this.getFirstAction();
		while (itr) {
			if (itr.next === firstSelected) {
				firstBeforeSelected = itr;
				break;
			}
			itr = itr.next;
		}

		if (firstSelected === this.head) {
			this.head = lastSelected?.next;
		}
		if (lastSelected === this.tail) {
			this.tail = firstBeforeSelected;
		}
		if (firstBeforeSelected) {
			firstBeforeSelected.next = lastSelected?.next;
		}
	}
	serialized() {
		console.assert(this.config);
		let base = super.serialized();
		return {
			name: base.name,
			fileType: FileType.Record,
			config: this.config?.serialized(),
			actions: base.actions,
		};
	}

	// result is potentially invalid
	getCloneWithSharedConfig() {
		let copy = new Record();
		copy.config = this.config;
		let itr = this.head;
		while (itr) {
			let node = itr.getClone();
			if (itr.isSelected()) node.select();
			if (itr === this.selectionStart) {
				copy.selectionStart = node;
			}
			if (itr === this.selectionEnd) {
				copy.selectionEnd = node;
			}
			copy.addActionNodeWithoutVerify(node);
			itr = itr.next;
		}
		return copy;
	}

}

