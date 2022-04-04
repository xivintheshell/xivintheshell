export const ActionType = {
	Skill: "Skill",
	Wait: "Wait"
};

function verifyActionNode(action) {
	console.assert(typeof action !== "undefined");
	if (action.type === ActionType.Skill) {
		console.assert(typeof action.skillName === "string");
		console.assert(typeof action.waitDuration === "number");
		console.assert(typeof action.tmp_startLockTime === "number");
		console.assert(typeof action.tmp_endLockTime === "number");
		console.assert(typeof action.tmp_capturedPotency === "number");
		return;
	} else if (action.type === ActionType.Wait) {
		console.assert(!isNaN(parseFloat(action.waitDuration)));
		return;
	}
	console.assert(false);
}

export class ActionNode {
	type;
	next = null;
	#selected = false;
	constructor(actionType) {
		this.type = actionType;
	}
	isSelected() { return this.#selected; }
	select() {
		this.#selected = true;
	}
	unselect() {
		this.#selected = false;
	}
}

export class Line {
	head = null;
	tail = null;
	name = "(anonymous line)";
	addActionNode(actionNode) {
		console.assert(actionNode);
		if (this.tail) console.assert(this.tail.next === null);
		verifyActionNode(actionNode);
		if (this.head === null) {
			this.head = actionNode;
		} else {
			this.tail.next = actionNode;
		}
		this.tail = actionNode;
	}
	getFirstAction() {
		return this.head;
	}
	getLastAction() {
		return this.tail;
	}
	serialized() {
		let list = [];
		let itr = this.head;
		while (itr !== null) {
			list.push({
				type: itr.type,
				// skill
				skillName: itr.skillName,
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
	selectionStart = null;
	selectionEnd = null;
	config = null;
	getFirstSelection() {
		return this.selectionStart;
	}
	getLastSelection() {
		return this.selectionEnd;
	}
	#getSelectionStats() {
		console.assert(this.selectionStart !== null && this.selectionEnd !== null);
		let potency = 0;
		let waitDuration = 0;
		let itr;
		for (itr = this.selectionStart; itr !== this.selectionEnd.next; itr = itr.next) {
			if (itr.type === ActionType.Skill) {
				potency += itr.tmp_capturedPotency;
				waitDuration += itr.waitDuration;
			}
		}
		console.assert(!isNaN(potency));
		console.assert(!isNaN(waitDuration));
		return [potency, waitDuration];
	}
	// assume node is actually in this recording
	selectSingle(node) {
		this.unselectAll();
		node.select();
		this.selectionStart = node;
		this.selectionEnd = node;
		return this.#getSelectionStats();
	}
	unselectAll() {
		if (this.selectionStart) {
			console.assert(this.selectionEnd);
			for (let itr = this.selectionStart; itr !== this.selectionEnd.next; itr = itr.next) {
				itr.unselect();
			}
		}
		this.selectionStart = null;
		this.selectionEnd = null;
	}
	#selectSequence(first, last) {
		this.unselectAll();
		for (let itr = first; itr !== last.next; itr = itr.next) {
			itr.select();
		}
		this.selectionStart = first;
		this.selectionEnd = last;
		return this.#getSelectionStats();
	}
	selectUntil(node) {
		// proceed only if there's currently exactly 1 node selected
		if (this.selectionStart && this.selectionStart === this.selectionEnd) {
			for (let itr = this.selectionStart; itr !== null; itr = itr.next) {
				if (itr === node) {
					return this.#selectSequence(this.selectionStart, node);
				}
			}
			// failed to find node from going down the currently selected list
			for (let itr = node; itr !== null; itr = itr.next) {
				if (itr === this.selectionStart) {
					return this.#selectSequence(node, this.selectionStart);
				}
			}
			// failed both ways (shouldn't get here)
			console.assert(false);
		} else {
			return this.selectSingle(node);
		}
	}
	serialized() {
		console.assert(this.config !== null);
		return {
			config: this.config,
			actions: super.serialized().actions
		};
	}
}

