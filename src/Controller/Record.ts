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
// represented as a wrapper around a linked list of ActionNodes. However, they were still
// serialized as an array of { type, skillName?, buffName?, waitDuration? } objects; the new
// implementation parses these objects to the contemporary Record format.

import { FileType } from "./Common";
import { BuffType, SkillReadyStatus } from "../Game/Common";
import { GameConfig } from "../Game/GameConfig";
import { Potency, PotencyKind } from "../Game/Potency";
import { controller } from "./Controller";
import { ActionKey, ResourceKey } from "../Game/Data";

export const enum ActionType {
	Skill = "Skill",
	Wait = "Wait",
	JumpToTimestamp = "JumpToTimestamp",
	WaitForMP = "WaitForMP",
	SetResourceEnabled = "SetResourceEnabled",
}

// TODO don't serialize actionkey/resourcekey, need to serialize string instead
// this means we need another layer of indirection for the internal saved value
// vs. the keys being passed around in code

export interface SerializedSkill {
	type: ActionType.Skill;
	skillName: ActionKey;
	targetCount: number;
}

interface SerialiezdWait {
	type: ActionType.Wait; // legacy name; represents a wait for a fixed duration
	waitDuration: number;
}

interface SerializedJump {
	type: ActionType.JumpToTimestamp,
	targetTime: number, // timestamp in seconds
}

interface SerializedMPWait{
	type: ActionType.WaitForMP,
	targetAmount: number,
}

interface SerializedSetResource{
	type: ActionType.SetResourceEnabled, // legacy name; also used when a resource is disabled
	buffName: ResourceKey,
}

export type SerializedAction = SerializedSkill | SerialiezdWait | SerializedJump | SerializedMPWait | SerializedSetResource;

export function skillNode(skillName: ActionKey, targetCount?: number): SerializedAction {
	return {
		type: ActionType.Skill,
		skillName,
		targetCount: targetCount ?? 1,
	}
}

export function durationWaitNode(waitDuration: number): SerializedAction {
	return {
		type: ActionType.Wait,
		waitDuration,
	}
}

export function jumpToTimestampNode(targetTime: number): SerializedAction {
	return {
		type: ActionType.JumpToTimestamp,
		targetTime,
	}
}

export function waitForMPNode(targetAmount: number): SerializedAction {
	return {
		type: ActionType.WaitForMP,
		targetAmount,
	}
}

export function setResourceNode(buffName: ResourceKey): SerializedAction {
	return {
		type: ActionType.SetResourceEnabled,
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
	serialized: SerializedAction;
	applicationTime?: number;
	#dotOverrideAmount: Map<ResourceKey, number>;
	#dotTimeGap: Map<ResourceKey, number>;
	#hotOverrideAmount: Map<ResourceKey, number>;
	#hotTimeGap: Map<ResourceKey, number>;
	healTargetCount: number = 1;

	// animation lock info set in the controller; should probably be moved
	// elsewhere eventually
	tmp_startLockTime?: number;
	tmp_endLockTime?: number;

	constructor(action: SerializedAction) {
		this.serialized = action;
		this.#capturedBuffs = new Set<BuffType>();
		this.#dotPotencies = new Map();
		this.#hotPotencies = new Map();
		this.#dotOverrideAmount = new Map();
		this.#dotTimeGap = new Map();
		this.#hotOverrideAmount = new Map();
		this.#hotTimeGap = new Map();
	}

	get type(): ActionType {
		return this.serialized.type;
	}

	get targetCount(): number {
		return this.serialized.type === ActionType.Skill ? this.serialized.targetCount : 0;
	}

	maybeGetSkillName(): ActionKey | undefined {
		return this.serialized.type === ActionType.Skill ? this.serialized.skillName : undefined;
	}

	getClone(): ActionNode {
		return new ActionNode(this.serialized);
	}

	// move nodeIndex/selected logic out of this class

	addBuff(rsc: BuffType) {
		this.#capturedBuffs.add(rsc);
	}

	hasBuff(rsc: BuffType): boolean {
		return this.#capturedBuffs.has(rsc);
	}

	hasPartyBuff(): boolean {
		const snapshotTime = this.#potency?.snapshotTime;
		return snapshotTime !== undefined && controller.game.getPartyBuffs(snapshotTime).size > 0;
	}

	getPartyBuffs(): BuffType[] {
		const snapshotTime = this.#potency?.snapshotTime;
		return snapshotTime ? [...controller.game.getPartyBuffs(snapshotTime).keys()] : [];
	}

	setTargetCount(count: number) {
		if (this.serialized.type === "Skill") {
			this.serialized.targetCount = count;
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

	getAllDotPotencies(): Map<ResourceKey, Potency[]> {
		return this.getAllOverTimePotencies("damage");
	}
	getAllHotPotencies(): Map<ResourceKey, Potency[]> {
		return this.getAllOverTimePotencies("healing");
	}
	getAllOverTimePotencies(kind: PotencyKind): Map<ResourceKey, Potency[]> {
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
		if (this.serialized.type === ActionType.Skill) {
			console.assert(
				!this.#potency,
				`ActionNode for ${this.serialized.skillName} already had an initial potency`,
			);
		}
		this.#potency = p;
	}
	addHealingPotency(p: Potency) {
		if (this.serialized.type === ActionType.Skill) {
			console.assert(
				!this.#healingPotency,
				`ActionNode for ${this.serialized.skillName} already had an initial healing potency`,
			);
		}
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

	getOverTimeGap(effectName: ResourceKey, kind: PotencyKind): number {
		return this.getOverTimeMappedAmount(effectName, kind === "damage" ? this.#dotTimeGap : this.#hotTimeGap);
	}

	setOverTimeOverrideAmount(effectName: ResourceKey, amount: number, kind: PotencyKind) {
		this.setOverTimeMappedAmount(effectName, amount, kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount);
	}

	getOverTimeOverrideAmount(effectName: ResourceKey, kind: PotencyKind): number {
		return this.getOverTimeMappedAmount(effectName, kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount);
	}

	private setOverTimeMappedAmount(
		effectName: ResourceKey,
		amount: number,
		map: Map<ResourceKey, number>,
	) {
		map.set(effectName, amount);
	}
	private getOverTimeMappedAmount(effectName: ResourceKey, map: Map<ResourceKey, number>): number {
		return map.get(effectName) ?? 0;
	}
}


// A Line is a collection of ActionNodes.
export class Line {
	actions: ActionNode[];
	name: string = "(anonymous line)";

	constructor() {
		this.actions = [];
	}

	get length(): number {
		return this.actions.length;
	}

	get head(): ActionNode | undefined {
		return this.length > 0 ? this.actions[0] : undefined;
	}

	get tail(): ActionNode | undefined {
		return this.length > 0 ? this.actions[this.actions.length - 1] : undefined;
	}

	get tailIndex(): number {
		return this.length - 1;
	}

	addActionNode(actionNode: ActionNode) {
		console.assert(actionNode);
		this.actions.push(actionNode);
	}

	iterateAll(fn: (node: ActionNode) => void) {
		for (const node of this.actions) {
			fn(node);
		}
	}

	getFirstAction() {
		return this.head;
	}

	getLastAction(condition?: (node: ActionNode) => boolean) {
		if (condition === undefined) {
			return this.tail;
		} else {
			// Array.findLast seems not to be in our version of ecmascript
			// and changing ts configuration/polyfill is annoying
			for (let i = this.actions.length - 1; i >= 0; i--) {
				if (condition(this.actions[i])) {
					return this.actions[i];
				}
			}
			return undefined;
		}
	}

	serialized(): { name: string; actions: object[] } {
		return {
			name: this.name,
			actions: this.actions.map((node) => node.serialized),
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
	selectionStartIndex?: number;
	selectionEndIndex?: number; // inclusive
	// Users can shift-click to re-adjust the currently selected bounds. When startIsPivot is true,
	// selectionStart is kept as one of the new bounds; if startIsPivot is false, selectionEnd is
	// kept instead.
	startIsPivot: boolean = true;
	config?: GameConfig;

	get selectionStart(): ActionNode | undefined {
		return this.selectionStartIndex !== undefined ? this.actions[this.selectionStartIndex] : undefined;
	}

	get selectionEnd(): ActionNode | undefined {
		return this.selectionEndIndex !== undefined ? this.actions[this.selectionEndIndex] : undefined;
	}

	getFirstSelection(): ActionNode | undefined {
		if (this.selectionStart) console.assert(this.selectionEnd !== undefined);
		return this.selectionStart;
	}

	getLastSelection(): ActionNode | undefined {
		if (this.selectionEnd) console.assert(this.selectionStart !== undefined);
		return this.selectionEnd;
	}

	isInSelection(index: number): boolean {
		return index >= (this.selectionStartIndex ?? 0) && index <= (this.selectionEndIndex ?? this.length - 1);
	}

	iterateSelected(fn: (node: ActionNode) => void) {
		if (this.selectionStartIndex === undefined) {
			return;
		}
		const endIndex = this.selectionEndIndex ?? this.actions.length - 1;
		for (let i = this.selectionStartIndex; i <= endIndex; i++) {
			fn(this.actions[i]);
		}
	}

	getSelectionLength(): number {
		if (this.selectionStartIndex === undefined) {
			return 0;
		}
		const endIndex = this.selectionEndIndex ?? this.actions.length - 1;
		return endIndex - this.selectionStartIndex + 1;
	}

	selectSingle(index: number) {
		this.unselectAll();
		this.selectionStartIndex = index;
		this.selectionEndIndex = index;
		this.startIsPivot = true;
	}
	unselectAll() {
		this.selectionStartIndex = undefined;
		this.selectionEndIndex = undefined;
		this.startIsPivot = true;
	}
	#selectSequence(firstIndex: number, lastIndex: number) {
		this.unselectAll();
		this.selectionStartIndex = firstIndex;
		this.selectionEndIndex = lastIndex;
	}
	selectUntil(newIndex: number) {
		if (this.selectionStartIndex && this.selectionStartIndex === this.selectionEndIndex) {
			// If there is only one node selected: extend the selection window between the current
			// skill and the newly-selected one
			if (this.selectionStartIndex <= newIndex) {
				this.#selectSequence(this.selectionStartIndex, newIndex);
				this.startIsPivot = true;
			} else {
				this.#selectSequence(newIndex, this.selectionStartIndex);
				this.startIsPivot = false;
			}
		} else if (this.selectionStartIndex && this.selectionStartIndex !== this.selectionEndIndex) {
			// If a multi-selection is already made, adjust its boundaries around the "pivot" node.
			// This is the same behavior as if we had only selected the single "pivot" node, and
			// then attempted a multi-select with the new node as a target.
			const pivot = this.startIsPivot ? this.selectionStartIndex : this.selectionEndIndex;
			this.selectionStartIndex = pivot;
			this.selectionEndIndex = pivot;
			this.selectUntil(newIndex);
		}
		// do nothing if no node is selected
	}
	onClickNode(index: number, bShift: boolean) {
		if (bShift) {
			this.selectUntil(index);
		} else {
			// if this is already the only selected node, unselect it
			if (this.selectionStartIndex === index && this.selectionEndIndex === index) {
				this.unselectAll();
			} else {
				this.selectSingle(index);
			}
		}
	}
	moveSelected(offset: number): ActionNode | undefined {
		// positive: move right; negative: move left
		if (offset === 0) return undefined;
		if (this.selectionStartIndex === undefined || this.selectionEndIndex === undefined) return undefined;
		const originalStartIndex = this.selectionStartIndex;
		// splice the selected portion, then re-insert it at originalStartIndex + offset
		// line: a b c d e f
		// example: original selection [1, 3] with offset +1 becomes
		// - a e f after splice
		// - a e b c d f
		// the new selection should now be [2, 4]
		// if offset would cause an overflow in either direction, clamp it to 0 or length - 1
		const selectionLength = this.getSelectionLength();
		const selected = this.actions.splice(originalStartIndex, selectionLength);
		let insertIndex = originalStartIndex + offset;
		insertIndex = Math.max(insertIndex, 0);
		insertIndex = Math.min(insertIndex, this.length - 1);
		this.actions.splice(insertIndex, 0, ...selected);
		this.selectionStartIndex = insertIndex;
		this.selectionEndIndex = insertIndex + selectionLength;
		// return insertIndex;
		return this.selectionStart;
	}
	deleteSelected(): ActionNode | undefined {
		// TODO does this need to return deleted nodes?
		if (this.selectionStartIndex === undefined || this.selectionEndIndex === undefined) return undefined;
		const originalStartIndex = this.selectionStartIndex;
		const firstDeletedNode = this.selectionStart;
		this.actions.splice(originalStartIndex, this.getSelectionLength());
		this.unselectAll();
		return firstDeletedNode;
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

	// delete all actions after index, maintaining the existing selection
	spliceUpTo(index: number) {
		const originalStartIndex = this.selectionStartIndex;
		const originalEndIndex = this.selectionEndIndex;
		this.unselectAll();
		if (index < this.length) {
			this.actions.splice(index, this.length - index);
		}
		if (originalStartIndex !== undefined) {
			this.selectSingle(originalStartIndex);
			this.selectUntil(originalEndIndex!);
		}
	}

	// result is potentially invalid
	getCloneWithSharedConfig() {
		let copy = new Record();
		copy.config = this.config;
		copy.actions = this.actions.map((node) => node.getClone());
		copy.selectionStartIndex = this.selectionStartIndex;
		copy.selectionEndIndex = this.selectionEndIndex;
		return copy;
	}
}
