export const ActionType = {
	Skill: "Skill",
	Wait: "Wait"
};

// a sequence of actions
export class Recording {
	constructor() {
		this.actions = [];
	}
	static #verifyAction(action) {
		console.assert(typeof action !== "undefined");
		console.assert(typeof action.selected === "boolean");
		if (action.type === ActionType.Skill) {
			console.assert(typeof action.skillName === "string");
			if (isNaN(parseFloat(action.relativeTime))) {
				console.assert(action.immediateNext === true);
			}
			return;
		} else if (action.type === ActionType.Wait) {
			console.assert(!isNaN(parseFloat(action.duration)));
			return;
		}
		console.assert(false);
	}
	addAction(action) {
		Recording.#verifyAction(action);
		this.actions.push(action);
	}
	getActions() {
		return this.actions;
	}
}

