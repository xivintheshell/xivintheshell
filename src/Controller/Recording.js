export const ActionType = {
	Skill: "Skill",
	Wait: "Wait"
};

function verifyAction(action) {
	console.assert(typeof action !== "undefined");
	console.assert(typeof action.selected === "boolean");
	if (action.type === ActionType.Skill) {
		console.assert(typeof action.skillName === "string");
		return;
	} else if (action.type === ActionType.Wait) {
		console.assert(!isNaN(parseFloat(action.duration)));
		return;
	}
	console.assert(false);
}

export class ActionNode {
	constructor(actionType) {
		this.type = actionType;
		this.next = null;
		this.selected = false;
	}
}

// a sequence of actions
export class Recording {
	constructor(config) {
		this.config = config;
		this.head = null;
		this.tail = null;
	}
	addActionNode(actionNode) {
		console.assert(actionNode);
		verifyAction(actionNode);
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
				// wait
				duration: itr.duration,
			});
			itr = itr.next;
		}
		return {
			config: this.config,
			actions: list,
		};
	}
}

