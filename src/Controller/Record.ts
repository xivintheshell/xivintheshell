// The Record class (and other associated types) are responsible for managing serialization
// and deserialization of user actions.
//
// A SerializedRecord is an at-rest representation of a sequence of actions. This is the
// format saved in localStorage for timelines and presets, as well as that used in timeline exports.
//
// An ActionNode represents a single action, either a skill usage, wait, or buff toggle.
//
// A Line is a sequence of ActionNodes.
//
// A Record is a Line with an associated GameConfig, as well as information about currently-selected
// actions.
//
// Prior to an internal refactor allowing the representation of invalid actions, Records were
// represented as a wrapper around a doubly-linked list of ActionNodes. However, they were still
// serialized as an array of { type, skillName?, buffName?, waitDuration? } objects; the new
// implementation parses these objects to the contemporary Record format.

import { FileType } from "./Common";
import { BuffType, SkillReadyStatus } from "../Game/Common";
import { GameConfig } from "../Game/GameConfig";
import { Potency, PotencyKind } from "../Game/Potency";
import { controller } from "./Controller";
import { ActionKey, ACTIONS, ResourceKey } from "../Game/Data";

export const enum ActionType {
	Skill = "Skill",
	Wait = "Wait",
	JumpToTimestamp = "JumpToTimestamp",
	WaitForMP = "WaitForMP",
	SetResourceEnabled = "SetResourceEnabled",
}

export interface SerializedAction = {
	type: "Skill",
	skillName: ActionKey,
	targetCount: number,
} | {
	type: "Wait", // legacy name; represents a wait for a fixed duration
	waitDuration: number,
} | {
	type: "JumpToTimestamp",
	targetTime: number, // timestamp in seconds
} | {
	type: "WaitForMP",
	targetAmount: number,
} | {
	type: "SetResourceEnabled", // legacy name; also used when a resource is disabled
	buffName: string,
};

function skillNode(skillName: ActionKey): SerializedAction {
	return {
		type: "Skill",
		skillName,
		targetCount: 1,
	}
}

function durationWaitNode(waitDuration: number): SerializedAction {
	return {
		type: "Wait",
		waitDuration,
	}
}

function jumpToTimestampNode(targetTime: number): SerializedAction {
	return {
		type: "JumpToTimestamp",
		targetTime,
	}
}

function waitForMPNode(targetAmount: number): SerializedAction {
	return {
		type: "WaitForMP",
		targetAmount,
	}
}

function setResourceNode(buffName: string): SerializedAction {
	return {
		type: "SetResourceEnabled",
		buffName,
	}
}

export type SerializedRecord = SerializedAction[];

export class ActionNode {
	#capturedBuffs: Set<BuffType>;
	#potency: Potency | undefined;
	#dotPotencies: Map<ResourceKey, Potency[]>;
	#healingPotency: Potency | undefined;
	#hotPotencies: Map<ResourceKey, Potency[]>;
	// TODO split into different properties for dots/hots?
	#serialized: SerializedAction;
	applicationTime?: number;
	#dotOverrideAmount: Map<ResourceKey, number>;
	#dotTimeGap: Map<ResourceKey, number>;
	#hotOverrideAmount: Map<ResourceKey, number>;
	#hotTimeGap: Map<ResourceKey, number>;
	healTargetCount: number = 1;

	constructor(action: SerializedAction) {
		this.#serialized = action;
		this.#capturedBuffs = new Set<BuffType>();
		this.#dotPotencies = new Map();
		this.#hotPotencies = new Map();
		this.#dotOverrideAmount = new Map();
		this.#dotTimeGap = new Map();
		this.#hotOverrideAmount = new Map();
		this.#hotTimeGap = new Map();
	}

	getClone(): ActionNode {
		return new ActionNode(this.#serialized);
	}

	// move nodeIndex/selected logic out of this class

	addBuff(rsc: BuffType) {
		this.#capturedBuffs.add(rsc);
	}

	hasPartyBuff(): boolean {
		const snapshotTime = this.#potency?.snapshotTime;
		return snapshotTime && controller.game.getPartyBuffs(snapshotTime).size > 0;
	}

	getPartyBuffs(): BuffType[] {
		const snapshotTime = this.#potency?.snapshotTime;
		return snapshotTime ? [...controller.game.getPartyBuffs(snapshotTime).keys()] : [];
	}

	setTargetCount(count: number) {
		if (this.#serialized.type === "Skill") {
			this.#serialized.targetCount = count;
		}
	}

	resolveAll(displayTime: number) {
		if (this.#potency) {
			this.#potency.resolve(displayTime);
		}
		this.#dotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				p.resolve(displayTime);
			});
		});
	}

	// true if the node's effects have been applied
	resolved() {
		return this.applicationTime !== undefined;
	}

	hitBoss(untargetable: (displayTime: number) => boolean): boolean {
		return this.#potency?.hasHitBoss(untargetable) ?? true;
	}

	getPotency(props: {
		tincturePotencyMultiplier: number;
		untargetable: (t: number) => boolean;
		includePartyBuffs: boolean;
		includeSplash: boolean;
		excludeDoT?: boolean;
	}): { applied: number, snapshottedButPending: number } {
		let res = {
			applied: 0,
			snapshottedButPending: 0,
		};
		if (this.#potency) {
			this.recordPotency(props, this.#potency, res);
		}

		if (props.excludeDoT) {
			return res;
		}
		this.#dotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				this.recordPotency(props, p, res);
			});
		});
		return res;
	}

	getHealingPotency(props: {
		tincturePotencyMultiplier: number;
		untargetable: (t: number) => boolean;
		includePartyBuffs: boolean;
		includeSplash: boolean;
		excludeHoT?: boolean;
	}): { applied: number, snapshottedButPending: number } {
		let res = {
			applied: 0,
			snapshottedButPending: 0,
		};
		if (this.#healingPotency) {
			this.recordPotency(props, this.#healingPotency, res);
		}

		if (props.excludeHoT) {
			return res;
		}
		this.#hotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				this.recordPotency(props, p, res);
			});
		});
		return res;
	}

	private recordPotency(
		props: {
			tincturePotencyMultiplier: number;
			untargetable: (t: number) => boolean;
			includePartyBuffs: boolean;
			includeSplash: boolean;
			excludeDoT?: boolean;
		},
		potency: Potency,
		record: { applied: number; snapshottedButPending: number },
	) {
		if (potency.hasHitBoss(props.untargetable)) {
			record.applied += potency.getAmount(props);
		} else if (!potency.hasResolved() && potency.hasSnapshotted()) {
			record.snapshottedButPending += potency.getAmount(props);
		}
	}

	removeUnresolvedOvertimePotencies(kind: PotencyKind) {
		const potencyMap = kind === "damage" ? this.#dotPotencies : this.#hotPotencies;
		potencyMap.forEach((pArr) => {
			const unresolvedIndex = pArr.findIndex((p) => !p.hasResolved());
			if (unresolvedIndex < 0) {
				return;
			}
			pArr.splice(unresolvedIndex);
		});
	}

	anyPotencies(): boolean {
		return this.#potency !== undefined || this.#dotPotencies.size > 0;
	}
	anyHealingPotencies(): boolean {
		return this.#healingPotency !== undefined || this.#hotPotencies.size > 0;
	}
	getInitialPotency(): Potency | undefined {
		return this.#potency;
	}
	getInitialHealingPotency(): Potency | undefined {
		return this.#healingPotency;
	}

	getAllDotPotencies(): Potency[] {
		return this.getAllOverTimePotencies("damage");
	}
	getAllHotPotencies(): Potency[] {
		return this.getAllOverTimePotencies("healing");
	}
	getAllOverTimePotencies(kind: PotencyKind): Potency[] {
		if (kind === "damage") {
			return this.#dotPotencies;
		} else {
			return this.#hotPotencies;
		}
	}

	getDotPotencies(r: ResourceKey): Potency[] {
		return this.getOverTimePotencies(r, "damage");
	}
	getHotPotencies(r: ResourceKey): Potency[] {
		return this.getOverTimePotencies(r, "healing");
	}
	getOverTimePotencies(r: ResourceKey, kind: PotencyKind): Potency[] {
		if (kind === "damage") {
			return this.#dotPotencies.get(r) ?? [];
		} else {
			return this.#hotPotencies.get(r) ?? [];
		}
	}

	addPotency(p: Potency) {
		console.assert(
			!this.#potency,
			`ActionNode for ${this.skillName} already had an initial potency`,
		);
		this.#potency = p;
	}
	addHealingPotency(p: Potency) {
		console.assert(
			!this.#healingPotency,
			`ActionNode for ${this.skillName} already had an initial healing potency`,
		);
		this.#healingPotency = p;
	}

	addDoTPotency(p: Potency, r: ResourceKey) {
		this.addOverTimePotency(p, r, "damage");
	}

	addHoTPotency(p: Potency, r: ResourceKey) {
		this.addOverTimePotency(p, r, "healing");
	}
	addOverTimePotency(p: Potency, r: ResourceKey, kind: PotencyKind) {
		const potencyMap: Map<ResourceKey, Potency[]> =
			kind === "damage" ? this.#dotPotencies : this.#hotPotencies;
		const pArr = potencyMap.get(r) ?? [];
		if (pArr.length === 0) {
			potencyMap.set(r, pArr);
		}
		pArr.push(p);
	}

	setOverTimeGap(effectName: ResourceKey, amount: number, kind: PotencyKind) {
		this.setOverTimeMappedAmount(effectName, amount, kind === "damage" ? this.#dotTimeGap : this.#hotTimeGap);
	}

	getOverTimeGap(effectName: ResourceKey, kind: PotencyKind) {
		this.getOverTimeMappedAmount(effectName, amount, kind === "damage" ? this.#dotTimeGap : this.#hotTimeGap);
	}

	setOverTimeOverrideAmount(effectName: ResourceKey, amount: number, kind: PotencyKind) {
		this.setOverTimeMappedAmount(effectName, amount, kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount);
	}

	getOverTimeOverrideAmount(effectName: ResourceKey, kind: PotencyKind) {
		this.getOverTimeMappedAmount(effectName, amount, kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount);
	}

	private setOverTimeMappedAmount(
		effectName: ResourceKey,
		amount: number,
		map: Map<ResourceKey, number>,
	) {
		map.set(effectName, amount);
	}
	private getOverTimeMappedAmount(effectName: ResourceKey, map: Map<ResourceKey, number>) {
		return map.get(effectName) ?? 0;
	}
}

// everything below is legacy code

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
	#potency: Potency | undefined;
	#dotPotencies: Map<ResourceKey, Potency[]>;
	#healingPotency: Potency | undefined;
	#hotPotencies: Map<ResourceKey, Potency[]>;

	type: ActionType;
	waitDuration: number = 0;
	skillName?: ActionKey;
	buffName?: string;
	applicationTime?: number;
	#dotOverrideAmount: Map<ResourceKey, number>;
	#dotTimeGap: Map<ResourceKey, number>;
	targetCount: number = 1;
	#hotOverrideAmount: Map<ResourceKey, number>;
	#hotTimeGap: Map<ResourceKey, number>;
	healTargetCount: number = 1;

	next?: ActionNode = undefined;

	#selected = false;

	tmp_startLockTime?: number;
	tmp_endLockTime?: number;

	constructor(actionType: ActionType) {
		this.type = actionType;
		this.#nodeIndex = ActionNode._gNodeIndex;
		this.#capturedBuffs = new Set<BuffType>();
		this.#dotPotencies = new Map();
		this.#hotPotencies = new Map();
		this.#dotOverrideAmount = new Map();
		this.#dotTimeGap = new Map();
		this.#hotOverrideAmount = new Map();
		this.#hotTimeGap = new Map();
		ActionNode._gNodeIndex++;
	}

	getClone() {
		let copy = new ActionNode(this.type);
		copy.skillName = this.skillName;
		copy.waitDuration = this.waitDuration;
		copy.buffName = this.buffName;
		copy.targetCount = this.targetCount;
		return copy;
	}

	getNodeIndex() {
		return this.#nodeIndex;
	}

	isSelected() {
		return this.#selected;
	}

	addBuff(rsc: BuffType) {
		this.#capturedBuffs.add(rsc);
	}

	hasBuff(rsc: BuffType) {
		return this.#capturedBuffs.has(rsc);
	}

	hasPartyBuff() {
		const snapshotTime = this.#potency?.snapshotTime;

		return snapshotTime && controller.game.getPartyBuffs(snapshotTime).size > 0;
	}

	getPartyBuffs() {
		const snapshotTime = this.#potency?.snapshotTime;

		return snapshotTime ? [...controller.game.getPartyBuffs(snapshotTime).keys()] : [];
	}

	setTargetCount(count: number) {
		this.targetCount = count;
	}

	resolveAll(displayTime: number) {
		if (this.#potency) {
			this.#potency.resolve(displayTime);
		}
		this.#dotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				p.resolve(displayTime);
			});
		});
	}

	// true if the node's effects have been applied
	resolved() {
		return this.applicationTime !== undefined;
	}

	hitBoss(untargetable: (displayTime: number) => boolean) {
		return this.#potency?.hasHitBoss(untargetable) ?? true;
	}

	getPotency(props: {
		tincturePotencyMultiplier: number;
		untargetable: (t: number) => boolean;
		includePartyBuffs: boolean;
		includeSplash: boolean;
		excludeDoT?: boolean;
	}) {
		let res = {
			applied: 0,
			snapshottedButPending: 0,
		};
		if (this.#potency) {
			this.recordPotency(props, this.#potency, res);
		}

		if (props.excludeDoT) {
			return res;
		}
		this.#dotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				this.recordPotency(props, p, res);
			});
		});
		return res;
	}

	getHealingPotency(props: {
		tincturePotencyMultiplier: number;
		untargetable: (t: number) => boolean;
		includePartyBuffs: boolean;
		includeSplash: boolean;
		excludeHoT?: boolean;
	}) {
		let res = {
			applied: 0,
			snapshottedButPending: 0,
		};
		if (this.#healingPotency) {
			this.recordPotency(props, this.#healingPotency, res);
		}

		if (props.excludeHoT) {
			return res;
		}
		this.#hotPotencies.forEach((pArr) => {
			pArr.forEach((p) => {
				this.recordPotency(props, p, res);
			});
		});
		return res;
	}

	private recordPotency(
		props: {
			tincturePotencyMultiplier: number;
			untargetable: (t: number) => boolean;
			includePartyBuffs: boolean;
			includeSplash: boolean;
			excludeDoT?: boolean;
		},
		potency: Potency,
		record: { applied: number; snapshottedButPending: number },
	) {
		if (potency.hasHitBoss(props.untargetable)) {
			record.applied += potency.getAmount(props);
		} else if (!potency.hasResolved() && potency.hasSnapshotted()) {
			record.snapshottedButPending += potency.getAmount(props);
		}
	}

	removeUnresolvedOvertimePotencies(kind: PotencyKind) {
		const potencyMap = kind === "damage" ? this.#dotPotencies : this.#hotPotencies;
		potencyMap.forEach((pArr) => {
			const unresolvedIndex = pArr.findIndex((p) => !p.hasResolved());
			if (unresolvedIndex < 0) {
				return;
			}
			pArr.splice(unresolvedIndex);
		});
	}

	anyPotencies(): boolean {
		return this.#potency !== undefined || this.#dotPotencies.size > 0;
	}
	anyHealingPotencies(): boolean {
		return this.#healingPotency !== undefined || this.#hotPotencies.size > 0;
	}
	getInitialPotency() {
		return this.#potency;
	}
	getInitialHealingPotency() {
		return this.#healingPotency;
	}

	getAllDotPotencies() {
		return this.getAllOverTimePotencies("damage");
	}
	getAllHotPotencies() {
		return this.getAllOverTimePotencies("healing");
	}
	getAllOverTimePotencies(kind: PotencyKind) {
		if (kind === "damage") {
			return this.#dotPotencies;
		} else {
			return this.#hotPotencies;
		}
	}

	getDotPotencies(r: ResourceKey) {
		return this.getOverTimePotencies(r, "damage");
	}
	getHotPotencies(r: ResourceKey) {
		return this.getOverTimePotencies(r, "healing");
	}
	getOverTimePotencies(r: ResourceKey, kind: PotencyKind) {
		if (kind === "damage") {
			return this.#dotPotencies.get(r) ?? [];
		} else {
			return this.#hotPotencies.get(r) ?? [];
		}
	}

	addPotency(p: Potency) {
		console.assert(
			!this.#potency,
			`ActionNode for ${this.skillName} already had an initial potency`,
		);
		this.#potency = p;
	}
	addHealingPotency(p: Potency) {
		console.assert(
			!this.#healingPotency,
			`ActionNode for ${this.skillName} already had an initial healing potency`,
		);
		this.#healingPotency = p;
	}

	addDoTPotency(p: Potency, r: ResourceKey) {
		this.addOverTimePotency(p, r, "damage");
	}

	addHoTPotency(p: Potency, r: ResourceKey) {
		this.addOverTimePotency(p, r, "healing");
	}
	addOverTimePotency(p: Potency, r: ResourceKey, kind: PotencyKind) {
		const potencyMap: Map<ResourceKey, Potency[]> =
			kind === "damage" ? this.#dotPotencies : this.#hotPotencies;
		const pArr = potencyMap.get(r) ?? [];
		if (pArr.length === 0) {
			potencyMap.set(r, pArr);
		}
		pArr.push(p);
	}

	select() {
		this.#selected = true;
	}
	unselect() {
		this.#selected = false;
	}

	setOverTimeGap(effectName: ResourceKey, amount: number, kind: PotencyKind) {
		if (kind === "damage") {
			this.setOverTimeMappedAmount(effectName, amount, this.#dotTimeGap);
		} else {
			this.setOverTimeMappedAmount(effectName, amount, this.#hotTimeGap);
		}
	}

	getOverTimeGap(effectName: ResourceKey, kind: PotencyKind) {
		if (kind === "damage") {
			return this.getOverTimeMappedAmount(effectName, this.#dotTimeGap);
		}
		return this.getOverTimeMappedAmount(effectName, this.#hotTimeGap);
	}

	setOverTimeOverrideAmount(effectName: ResourceKey, amount: number, kind: PotencyKind) {
		if (kind === "damage") {
			this.setOverTimeMappedAmount(effectName, amount, this.#dotOverrideAmount);
		} else {
			this.setOverTimeMappedAmount(effectName, amount, this.#hotOverrideAmount);
		}
	}

	getOverTimeOverrideAmount(effectName: ResourceKey, kind: PotencyKind) {
		if (kind === "damage") {
			return this.getOverTimeMappedAmount(effectName, this.#dotOverrideAmount);
		}
		return this.getOverTimeMappedAmount(effectName, this.#hotOverrideAmount);
	}

	private setOverTimeMappedAmount(
		effectName: ResourceKey,
		amount: number,
		map: Map<ResourceKey, number>,
	) {
		map.set(effectName, amount);
	}
	private getOverTimeMappedAmount(effectName: ResourceKey, map: Map<ResourceKey, number>) {
		return map.get(effectName) ?? 0;
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
	getLastAction(condition?: (node: ActionNode) => boolean) {
		if (condition === undefined) {
			return this.tail;
		} else {
			let lastMatch: ActionNode | undefined = undefined;
			this.iterateAll((node) => {
				if (condition(node)) {
					lastMatch = node;
				}
			});
			return lastMatch;
		}
	}
	serialized(): { name: string; actions: object[] } {
		let list = [];
		let itr = this.head;
		while (itr) {
			list.push({
				type: itr.type,
				// skill
				skillName: itr.skillName ? ACTIONS[itr.skillName as ActionKey].name : undefined,
				// setResourceEnabled
				buffName: itr.buffName,
				// any
				waitDuration: itr.waitDuration,
				targetCount: itr.targetCount,
			});
			itr = itr.next;
		}
		return {
			name: this.name,
			actions: list,
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
	isValid: boolean;
	firstInvalidAction: ActionNode | undefined;
	invalidReason: SkillReadyStatus | undefined;
	invalidTime: number | undefined;
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

	getSelectionLength(): number {
		let acc = 0;
		this.iterateSelected((_) => acc++);
		return acc;
	}

	selectSingle(node: ActionNode) {
		this.unselectAll();
		node.select();
		this.selectionStart = node;
		this.selectionEnd = node;
		this.startIsPivot = true;
	}
	unselectAll() {
		this.iterateAll((itr) => {
			itr.unselect();
		});
		this.selectionStart = undefined;
		this.selectionEnd = undefined;
		this.startIsPivot = true;
	}
	#selectSequence(first: ActionNode, last: ActionNode) {
		this.unselectAll();
		this.selectionStart = first;
		this.selectionEnd = last;
		this.iterateSelected((itr) => {
			itr.select();
		});
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
			// if this is already the only selected node, unselect it
			if (this.selectionStart === node && this.selectionEnd === node) {
				this.unselectAll();
			} else {
				this.selectSingle(node);
			}
		}
	}
	moveSelected(offset: number) {
		// positive: move right; negative: move left
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
		let nodesArray: ActionNode[] = [];
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
		if (newIndexBeforeSelection >= nodesArray.length)
			newIndexBeforeSelection = nodesArray.length - 1;

		let newNodeBeforeSelection =
			newIndexBeforeSelection < 0 ? undefined : nodesArray[newIndexBeforeSelection];
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
			if (nodeBeforeSelectionIdx >= 0)
				firstEditedNode = nodesArray[nodeBeforeSelectionIdx].next;
			else firstEditedNode = this.head;
		}
		return firstEditedNode;
	}
	deleteSelected() {
		let firstSelected = this.getFirstSelection();
		let lastSelected = this.getLastSelection();
		if (!firstSelected) return undefined;
		this.unselectAll();

		let firstBeforeSelected: ActionNode | undefined = undefined;
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
			return firstBeforeSelected === this.tail ? this.tail : firstBeforeSelected.next;
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
