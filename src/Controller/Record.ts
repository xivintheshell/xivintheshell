import {FileType} from "./Common";
import {BuffType, SkillName, SkillReadyStatus} from "../Game/Common";
import {GameConfig} from "../Game/GameConfig"
import {Potency} from "../Game/Potency";
import {controller} from "./Controller";

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
	#capturedBuffs: Set<BuffType>;
	#potencies: Potency[];

	type: ActionType;
	waitDuration: number = 0;
	skillName?: SkillName;
	buffName? : string;

	next?: ActionNode = undefined;

	#selected = false;

	tmp_startLockTime?: number;
	tmp_endLockTime?: number;

	constructor(actionType: ActionType) {
		this.type = actionType;
		this.#nodeIndex = ActionNode._gNodeIndex;
		this.#capturedBuffs = new Set<BuffType>();
		this.#potencies = [];
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

	addBuff(rsc: BuffType) {
		this.#capturedBuffs.add(rsc);
	}

	hasBuff(rsc: BuffType) {
		return this.#capturedBuffs.has(rsc);
	}

	hasPartyBuff() {
		let snapshotTime;
		if (this.#potencies.length === 0) return false
		if (this.#potencies.length > 0) 
			snapshotTime = this.#potencies[0].snapshotTime;

		return snapshotTime && controller.game.getPartyBuffs(snapshotTime).size > 0;
	}

	getPartyBuffs() {
		let snapshotTime;
		if (this.#potencies.length === 0) return [];
		if (this.#potencies.length > 0) 
			snapshotTime = this.#potencies[0].snapshotTime;

		return (snapshotTime) ? [...controller.game.getPartyBuffs(snapshotTime).keys()] : [];
	}

	resolveAll(displayTime: number) {
		this.#potencies.forEach(p=>{
			p.resolve(displayTime);
		});
	}

	// true if empty or any damage is resolved.
	resolved() {
		if (this.#potencies.length === 0) return true;
		if (this.#potencies.length === 1) return this.#potencies[0].hasResolved();

		return this.#potencies[0].hasResolved();
	}

	hitBoss(untargetable: (displayTime: number) => boolean) {
		if (this.#potencies.length === 0) return true;
		if (this.#potencies.length === 1) return this.#potencies[0].hasHitBoss(untargetable);

		return this.#potencies[0].hasHitBoss(untargetable);
	}

	getPotency(props: {
		tincturePotencyMultiplier: number,
		untargetable: (t: number) => boolean,
		includePartyBuffs: boolean,
		excludeDoT?: boolean
	}) {
		let res = {
			applied: 0,
			snapshottedButPending: 0
		};
		for (let i = 0; i < this.#potencies.length; i++) {
			if (i === 0 || !props.excludeDoT) {
				let p = this.#potencies[i];
				if (p.hasHitBoss(props.untargetable)) {
					res.applied += p.getAmount(props);
				} else if (!p.hasResolved() && p.hasSnapshotted()) {
					res.snapshottedButPending += p.getAmount(props);
				}
			}
		}
		return res;
	}

	removeUnresolvedPotencies() {
		for (let i = this.#potencies.length - 1; i >= 0; i--) {
			if (!this.#potencies[i].hasResolved()) {
				this.#potencies.splice(i, 1);
			}
		}
	}

	getPotencies() {
		return this.#potencies;
	}

	addPotency(p: Potency) {
		this.#potencies.push(p);
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
	// format: []
	exportCsv(): any[][] {
		// todo
		let result: any[][] = [];
		return result;
	}
}

export type RecordValidStatus = {
	isValid: boolean,
	firstInvalidAction: ActionNode | undefined,
	invalidReason: SkillReadyStatus | undefined,
	invalidTime: number | undefined,
};

// information abt a timeline
export class Record extends Line {
	selectionStart?: ActionNode;
	selectionEnd?: ActionNode;
	// Users can shift-click to re-adjust the currently selected bounds. When startIsPivot is true,
	// selectionStart is kept as one of the new bounds; if startIsPivot is false, selectionEnd is
	// kept instead.
	startIsPivot: boolean = true;
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

	selectSingle(node: ActionNode) {
		this.unselectAll();
		node.select();
		this.selectionStart = node;
		this.selectionEnd = node;
		this.startIsPivot = true;
	}
	unselectAll() {
		this.iterateAll(itr=>{
			itr.unselect();
		})
		this.selectionStart = undefined;
		this.selectionEnd = undefined;
		this.startIsPivot = true;
	}
	#selectSequence(first: ActionNode, last: ActionNode) {
		this.unselectAll();
		this.selectionStart = first;
		this.selectionEnd = last;
		this.iterateSelected(itr=>{
			itr.select();
		})
	}
	selectUntil(node: ActionNode) {
		if (this.selectionStart && this.selectionStart === this.selectionEnd) {
			// If there is only one node selected: extend the selection window between the current
			// skill and the newly-selected one
			// First, check if selectionStart comes before node
			let itr: ActionNode | undefined;
			for (itr = this.selectionStart; itr; itr = itr.next) {
				if (itr === node) {
					this.#selectSequence(this.selectionStart, node);
					this.startIsPivot = true;
					return;
				}
			}
			// We didn't find the node forwards, so check that node is ahead of selectionStart
			for (itr = node; itr; itr = itr.next) {
				if (itr === this.selectionStart) {
					this.#selectSequence(node, this.selectionStart);
					this.startIsPivot = false;
					return;
				}
			}
			// failed both ways (shouldn't get here)
			console.assert(false);
		} else if (this.selectionStart && this.selectionStart !== this.selectionEnd) {
			// If a multi-selection is already made, adjust its boundaries around the "pivot" node.
			// This is the same behavior as if we had only selected the single "pivot" node, and
			// then attempted a multi-select with the new node as a target.
			const pivot = this.startIsPivot ? this.selectionStart : this.selectionEnd;
			this.selectionStart = pivot;
			this.selectionEnd = pivot;
			this.selectUntil(node);
		}
		// do nothin if no node is selected
	}
	onClickNode(node: ActionNode, bShift: boolean) {
		if (bShift) {
			this.selectUntil(node);
		} else {
			this.selectSingle(node);
		}
	}
	moveSelected(offset: number) { // positive: move right; negative: move left
		if (offset === 0) return undefined;
		let firstSelected = this.getFirstSelection();
		let lastSelected = this.getLastSelection();
		if (!firstSelected || !lastSelected) return undefined;

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
		let firstEditedNode;
		if (offset < 0) firstEditedNode = this.getFirstSelection();
		else {
			if (nodeBeforeSelectionIdx >= 0) firstEditedNode = nodesArray[nodeBeforeSelectionIdx].next;
			else firstEditedNode = this.head;
		}
		return firstEditedNode;
	}
	deleteSelected() {
		let firstSelected = this.getFirstSelection();
		let lastSelected = this.getLastSelection();
		if (!firstSelected) return undefined;
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
		if (firstBeforeSelected) {
			return firstBeforeSelected===this.tail ? this.tail : firstBeforeSelected.next;
		}
		return this.head;
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

