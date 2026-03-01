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
import { BuffType, SkillReadyStatus, SkillUnavailableReason } from "../Game/Common";
import { GameConfig, SerializedConfig } from "../Game/GameConfig";
import { Potency, PotencyKind } from "../Game/Potency";
import { controller } from "./Controller";
import { ACTIONS, ActionKey, ResourceKey } from "../Game/Data";
import { getNormalizedSkillName, getResourceKeyFromBuffName } from "../Game/Skills";
import { localize, localizeResourceType, localizeSkillName } from "../Components/Localization";

export const enum ActionType {
	Skill = "Skill",
	Wait = "Wait",
	JumpToTimestamp = "JumpToTimestamp",
	WaitForMP = "WaitForMP",
	SetResourceEnabled = "SetResourceEnabled",
	Unknown = "Unknown",
	Invalid = "Invalid",
}

interface SerializedSkill {
	type: ActionType.Skill;
	skillName: string; // uses the VALUE of the skill name, not the ActionKey
	// Legacy field: targetCount used to be present instead of targetList.
	targetCount?: number;
	targetList?: number[];
	healTargetCount: number | undefined;
}

interface SerializedWait {
	type: ActionType.Wait; // legacy name; represents a wait for a fixed duration
	waitDuration: number;
}

interface SerializedJump {
	type: ActionType.JumpToTimestamp;
	targetTime: number; // timestamp in seconds
}

interface SerializedMPWait {
	type: ActionType.WaitForMP;
}

interface SerializedSetResource {
	type: ActionType.SetResourceEnabled;
	buffName: string; // uses the ResourceKey
	targetNumber?: number; // set only for debuff toggles
}

export type SerializedAction =
	| SerializedSkill
	| SerializedWait
	| SerializedJump
	| SerializedMPWait
	| SerializedSetResource
	| { type: ActionType.Invalid };

// Because SkillNode serializes with the localized string value instead of an ActionKey,
// It needs a different internal type.
// SetResourceInfo serializes with ResourceKey, but we keep a separate type just for cleanliness.
export interface SkillNodeInfo {
	type: ActionType.Skill;
	skillName: ActionKey;
	targetList: number[];
	healTargetCount: number | undefined;
}

interface UnknownSkillInfo {
	type: ActionType.Unknown;
	skillName: string;
	targetList: number[];
	healTargetCount: number | undefined;
}

interface SetResourceNodeInfo {
	type: ActionType.SetResourceEnabled;
	buffName: ResourceKey;
	targetNumber?: number;
}

export type NodeInfo =
	| SkillNodeInfo
	| SerializedWait
	| SerializedJump
	| SerializedMPWait
	| SetResourceNodeInfo
	| UnknownSkillInfo
	| { type: ActionType.Invalid };

export function skillNode(skillName: ActionKey, targetList?: number[]): ActionNode {
	return new ActionNode({
		type: ActionType.Skill,
		skillName,
		targetList: targetList ?? [1],
		healTargetCount: undefined,
	});
}

export function unknownSkillNode(skillName: string, targetList?: number[]): ActionNode {
	return new ActionNode({
		type: ActionType.Unknown,
		skillName,
		targetList: targetList ?? [1],
		healTargetCount: undefined,
	});
}

export function durationWaitNode(waitDuration: number): ActionNode {
	return new ActionNode({
		type: ActionType.Wait,
		waitDuration,
	});
}

export function jumpToTimestampNode(targetTime: number): ActionNode {
	return new ActionNode({
		type: ActionType.JumpToTimestamp,
		targetTime,
	});
}

export function waitForMPNode(): ActionNode {
	return new ActionNode({
		type: ActionType.WaitForMP,
	});
}

export function setResourceNode(buffName: ResourceKey, targetNumber?: number): ActionNode {
	return new ActionNode({
		type: ActionType.SetResourceEnabled,
		buffName,
		targetNumber,
	});
}

export type SerializedLine = SerializedAction[];

export interface SerializedRecord {
	name: string;
	fileType: FileType.Record;
	config: SerializedConfig;
	actions: SerializedLine;
}

export class ActionNode {
	#capturedBuffs: Set<BuffType>;
	#potency: Potency | undefined;
	#dotPotencies: Map<ResourceKey, Potency[]>;
	#healingPotency: Potency | undefined;
	#hotPotencies: Map<ResourceKey, Potency[]>;
	// TODO split into different properties for dots/hots?
	applicationTime?: number;
	// maps of DoT/HoT name -> target number -> # of seconds
	// effects that don't support target selection use 1 as the default placeholder,
	// but we keep these consistent for code reuse
	#dotOverrideAmount: Map<ResourceKey, Map<number, number>>;
	#dotTimeGap: Map<ResourceKey, Map<number, number>>;
	#hotOverrideAmount: Map<ResourceKey, Map<number, number>>;
	#hotTimeGap: Map<ResourceKey, Map<number, number>>;
	info: NodeInfo;
	// Older versions of xivintheshell attached waitDuration fields to every action
	// this field is only populated during deserialization.
	// Note that a value of 0 does have a meaning; if an action is created in manual mode
	// and spacebar was not pressed to fast-forward, then a wait action performed immediately
	// after will be relative to the end of the action rather than the end of the animation lock.
	legacyWaitDuration?: number;

	// timeline animation lock info set in the controller; should probably be moved
	// elsewhere eventually
	tmp_startLockTime?: number;
	tmp_endLockTime?: number;
	tmp_invalid_reasons: SkillUnavailableReason[];

	constructor(info: NodeInfo, legacyWaitDuration?: number) {
		this.info = info;
		this.#capturedBuffs = new Set<BuffType>();
		this.#dotPotencies = new Map();
		this.#hotPotencies = new Map();
		this.#dotOverrideAmount = new Map();
		this.#dotTimeGap = new Map();
		this.#hotOverrideAmount = new Map();
		this.#hotTimeGap = new Map();
		this.legacyWaitDuration = legacyWaitDuration;
		this.tmp_invalid_reasons = [];
	}

	serialized(): SerializedAction {
		if (this.info.type === ActionType.Skill) {
			return {
				type: ActionType.Skill,
				skillName: ACTIONS[this.info.skillName].name,
				targetList: this.info.targetList,
				healTargetCount: this.info.healTargetCount,
			};
		} else if (this.info.type === ActionType.SetResourceEnabled) {
			return {
				type: ActionType.SetResourceEnabled,
				buffName: this.info.buffName.toString(),
				targetNumber: this.info.targetNumber,
			};
		} else if (this.info.type === ActionType.Unknown) {
			return {
				type: ActionType.Skill,
				skillName: this.info.skillName,
				targetList: this.info.targetList,
				healTargetCount: this.info.healTargetCount,
			};
		} else {
			return this.info;
		}
	}

	toLocalizedString(): string {
		if (this.info.type === ActionType.Skill) {
			return localizeSkillName(this.info.skillName);
		} else if (this.info.type === ActionType.SetResourceEnabled) {
			return (
				localize({
					en: "toggle ",
					zh: "开关",
				}).toString() + localizeResourceType(this.info.buffName)
			);
		} else if (this.info.type === ActionType.Wait) {
			const waitString = this.info.waitDuration.toFixed(3);
			return localize({ en: `wait ${waitString}`, zh: `快进至${waitString}` }).toString();
		} else if (this.info.type === ActionType.WaitForMP) {
			return localize({ en: "wait MP", zh: "快进至跳蓝" }).toString();
		} else if (this.info.type === ActionType.JumpToTimestamp) {
			const targetString = this.info.targetTime.toFixed(3);
			return localize({ en: `jump ${targetString}`, zh: `跳到${targetString}` }).toString();
		}
		return "(unknown)";
	}

	maybeGetActionKey(): ActionKey | undefined {
		return this.info.type === ActionType.Skill ? this.info.skillName : undefined;
	}

	get targetList(): number[] {
		return this.info.type === ActionType.Skill ? this.info.targetList.slice() : [];
	}

	set targetList(l: number[]) {
		if (this.info.type === ActionType.Skill) {
			// We deliberately avoid a copy here because the owner of `l` modifying it after setting
			// this node field is a reasonable JS pattern.
			this.info.targetList = l;
		}
	}

	get healTargetCount(): number {
		return this.info.type === ActionType.Skill ? (this.info.healTargetCount ?? 0) : 0;
	}

	getNameForMessage(): string {
		return this.info.type === ActionType.Skill
			? ACTIONS[this.info.skillName].name
			: this.info.type.toString();
	}

	getClone(): ActionNode {
		return new ActionNode(this.info, this.legacyWaitDuration);
	}

	get snapshotTime(): number | undefined {
		return this.#potency?.snapshotTime;
	}

	addBuff(rsc: BuffType) {
		this.#capturedBuffs.add(rsc);
	}

	hasBuff(rsc: BuffType): boolean {
		return this.#capturedBuffs.has(rsc);
	}

	hasPartyBuff(): boolean {
		const snapshotTime = this.snapshotTime;
		return snapshotTime !== undefined && controller.game.getPartyBuffs(snapshotTime).size > 0;
	}

	getPartyBuffs(): BuffType[] {
		const snapshotTime = this.snapshotTime;
		return snapshotTime ? [...controller.game.getPartyBuffs(snapshotTime).keys()] : [];
	}

	forceOneTarget() {
		if (this.info.type === ActionType.Skill) {
			this.info.targetList = [this.info.targetList.length > 0 ? this.info.targetList[0] : 1];
		}
	}

	setHealTargetCount(count: number) {
		if (this.info.type === ActionType.Skill) {
			this.info.healTargetCount = count;
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
		targetNumber?: number;
	}): { applied: number; snapshottedButPending: number } {
		const res = {
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
	}): { applied: number; snapshottedButPending: number } {
		const res = {
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
			targetNumber?: number;
		},
		potency: Potency,
		record: { applied: number; snapshottedButPending: number },
	) {
		if (props.targetNumber !== undefined && !potency.hasTarget(props.targetNumber)) {
			return;
		}
		if (potency.hasHitBoss(props.untargetable)) {
			record.applied += potency.getAmount(props);
		} else if (!potency.hasResolved() && potency.hasSnapshotted()) {
			record.snapshottedButPending += potency.getAmount(props);
		}
	}

	removeUnresolvedOvertimePotencies(kind: PotencyKind, targetNumber?: number) {
		const potencyMap = kind === "damage" ? this.#dotPotencies : this.#hotPotencies;
		potencyMap.forEach((pArr) => {
			for (let i = 0; i < pArr.length; i++) {
				const p = pArr[i];
				// If the potency has not yet resolved, this means it was a future DoT tick
				// that potentially should be overwritten.
				// However, if the previous potency corresponds to an AoE DoT, we must ensure
				// all targets no longer have the debuff active before we can remove the potency.
				if (!p.hasResolved()) {
					if (targetNumber !== undefined) {
						p.tryRemoveTarget(targetNumber);
					}
					// If targetNumber was unspecified, then forcibly remove all remaining ticks.
					if (targetNumber === undefined || p.targetList.length === 0) {
						pArr.splice(i);
						break;
					}
				}
			}
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
		console.assert(
			!this.#potency,
			`ActionNode for ${this.getNameForMessage()} already had an initial potency`,
		);
		this.#potency = p;
	}
	addHealingPotency(p: Potency) {
		console.assert(
			!this.#healingPotency,
			`ActionNode for ${this.getNameForMessage()} already had an initial healing potency`,
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

	setOverTimeGap(
		effectName: ResourceKey,
		amount: number,
		kind: PotencyKind,
		targetNumber?: number,
	) {
		this.setOverTimeMappedAmount(
			effectName,
			amount,
			kind,
			kind === "damage" ? this.#dotTimeGap : this.#hotTimeGap,
			targetNumber,
		);
	}

	getOverTimeGap(effectName: ResourceKey, kind: PotencyKind, targetNumber?: number): number {
		return this.getOverTimeMappedAmount(
			effectName,
			kind,
			kind === "damage" ? this.#dotTimeGap : this.#hotTimeGap,
			targetNumber,
		);
	}

	setOverTimeOverrideAmount(
		effectName: ResourceKey,
		amount: number,
		kind: PotencyKind,
		targetNumber?: number,
	) {
		this.setOverTimeMappedAmount(
			effectName,
			amount,
			kind,
			kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount,
			targetNumber,
		);
	}

	getOverTimeOverrideAmount(
		effectName: ResourceKey,
		kind: PotencyKind,
		targetNumber?: number,
	): number {
		return this.getOverTimeMappedAmount(
			effectName,
			kind,
			kind === "damage" ? this.#dotOverrideAmount : this.#hotOverrideAmount,
			targetNumber,
		);
	}

	private setOverTimeMappedAmount(
		effectName: ResourceKey,
		amount: number,
		kind: PotencyKind,
		map: Map<ResourceKey, Map<number, number>>,
		targetNumber?: number,
	) {
		if (!map.has(effectName)) {
			map.set(effectName, new Map());
		}
		if (targetNumber !== undefined) {
			map.get(effectName)!.set(targetNumber, amount);
		} else {
			const targets = this.getOverTimePotencies(effectName, kind)[0].targetList;
			targets?.forEach((target) => map.get(effectName)!.set(target, amount));
		}
	}
	private getOverTimeMappedAmount(
		effectName: ResourceKey,
		kind: PotencyKind,
		map: Map<ResourceKey, Map<number, number>>,
		targetNumber?: number,
	): number {
		if (!map.has(effectName)) {
			map.set(effectName, new Map());
		}
		if (targetNumber !== undefined) {
			return map.get(effectName)!.get(targetNumber) ?? 0;
		} else {
			// Just return whatever the first potency is. I'm too lazy to add proper bounds checks.
			const target = this.getOverTimePotencies(effectName, kind)[0].targetList[0] ?? 1;
			return map.get(effectName)!.get(target) ?? 0;
		}
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

	prependActionNode(actionNode: ActionNode) {
		console.assert(actionNode !== undefined);
		this.actions.unshift(actionNode);
	}

	insertActionNodes(actionNodes: ActionNode[], index: number) {
		if (actionNodes.length > 0) {
			this.actions.splice(index, 0, ...actionNodes);
		}
	}

	addActionNode(actionNode: ActionNode) {
		console.assert(actionNode !== undefined);
		this.actions.push(actionNode);
	}

	iterateAll(fn: (node: ActionNode) => void) {
		this.actions.forEach((node) => fn(node));
	}

	serialized(): { name: string; actions: object[] } {
		return {
			name: this.name,
			actions: this.actions.map((node) => node.serialized()),
		};
	}

	// format: []
	exportCsv(): any[][] {
		// todo
		const result: any[][] = [];
		return result;
	}

	static deserialize(serialized: SerializedLine): Line {
		const actions = serialized.map((serializedAction) => {
			// TODO ensure objects are well-formed and insert invalid nodes if not
			if (serializedAction.type === ActionType.Skill) {
				const skillName = getNormalizedSkillName(serializedAction.skillName);
				const legacyWaitDuration =
					"waitDuration" in serializedAction
						? serializedAction["waitDuration"]
						: undefined;
				const targetList =
					serializedAction.targetCount !== undefined
						? Array(serializedAction.targetCount)
								.fill(0)
								.map((_, i) => i + 1)
						: (serializedAction.targetList ?? [1]);
				return new ActionNode(
					skillName !== undefined
						? {
								type: ActionType.Skill,
								skillName,
								targetList,
								healTargetCount: serializedAction.healTargetCount,
							}
						: {
								type: ActionType.Unknown,
								skillName: serializedAction.skillName,
								targetList,
								healTargetCount: serializedAction.healTargetCount,
							},
					// @ts-expect-error used for parsing legacy format
					legacyWaitDuration,
				);
			} else if (serializedAction.type === ActionType.SetResourceEnabled) {
				const legacyWaitDuration =
					"waitDuration" in serializedAction
						? serializedAction["waitDuration"]
						: undefined;
				return new ActionNode(
					{
						type: ActionType.SetResourceEnabled,
						buffName: getResourceKeyFromBuffName(serializedAction.buffName)!,
						// Newer versions require a targetNumber for toggling DoT effects
						targetNumber: serializedAction.targetNumber ?? 1,
					},
					// @ts-expect-error used for parsing legacy format
					legacyWaitDuration,
				);
			} else if (
				serializedAction.type === ActionType.Wait ||
				serializedAction.type === ActionType.JumpToTimestamp ||
				serializedAction.type === ActionType.WaitForMP
			) {
				return new ActionNode(serializedAction);
			} else {
				window.alert("unparseable action: " + JSON.stringify(serializedAction));
				return new ActionNode({ type: ActionType.Invalid });
			}
		});
		const line = new Line();
		line.actions = actions;
		return line;
	}
}

export type InvalidActionInfo = {
	node: ActionNode;
	index: number;
	reason: SkillReadyStatus;
};

export type RecordValidStatus = {
	isValid: boolean;
	invalidActions: InvalidActionInfo[];
	skillUseTimes: number[];
	straightenedIfValid: Record | undefined;
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
		return this.selectionStartIndex !== undefined
			? this.actions[this.selectionStartIndex]
			: undefined;
	}

	get selectionEnd(): ActionNode | undefined {
		return this.selectionEndIndex !== undefined
			? this.actions[this.selectionEndIndex]
			: undefined;
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
		return (
			this.selectionStartIndex !== undefined &&
			this.selectionEndIndex !== undefined &&
			index >= this.selectionStartIndex &&
			index <= this.selectionEndIndex
		);
	}

	iterateSelected(fn: (node: ActionNode) => void) {
		if (this.selectionStartIndex === undefined || this.selectionEndIndex === undefined) {
			return;
		}
		for (let i = this.selectionStartIndex; i <= this.selectionEndIndex; i++) {
			fn(this.actions[i]);
		}
	}

	getSelected(): Line {
		const line = new Line();
		if (this.selectionStartIndex !== undefined && this.selectionEndIndex !== undefined) {
			line.actions = this.actions.slice(this.selectionStartIndex, this.selectionEndIndex + 1);
		}
		return line;
	}

	getSelectionLength(): number {
		if (this.selectionStartIndex === undefined || this.selectionEndIndex === undefined) {
			return 0;
		}
		const endIndex = this.selectionEndIndex;
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
		if (
			this.selectionStartIndex !== undefined &&
			this.selectionStartIndex === this.selectionEndIndex
		) {
			// If there is only one node selected: extend the selection window between the current
			// skill and the newly-selected one
			if (this.selectionStartIndex <= newIndex) {
				this.#selectSequence(this.selectionStartIndex, newIndex);
				this.startIsPivot = true;
			} else {
				this.#selectSequence(newIndex, this.selectionStartIndex);
				this.startIsPivot = false;
			}
		} else if (
			this.selectionStartIndex !== undefined &&
			this.selectionStartIndex !== this.selectionEndIndex
		) {
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
		if (bShift && this.selectionStartIndex !== undefined) {
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
	// Re-arrange the selected skills, moving the current selection by `offset`.
	// Return the index of the first newly-edited skill. The controller uses this to determine
	// which skills have been edited and need to be re-validated.
	moveSelected(offset: number): number | undefined {
		// positive: move right; negative: move left
		if (
			offset === 0 ||
			this.selectionStartIndex === undefined ||
			this.selectionEndIndex === undefined
		) {
			return undefined;
		}
		const originalStartIndex = this.selectionStartIndex;
		// splice the selected portion, then re-insert it at originalStartIndex + offset
		// line: a b c d e f
		// example: original selection [1, 3] with offset +1 becomes
		// - a e f after splice
		// - a e b c d f
		// the new selection should now be [2, 4]
		// if offset would cause an overflow in either direction, clamp it to 0 or length
		const selectionLength = this.getSelectionLength();
		const selected = this.actions.splice(originalStartIndex, selectionLength);
		let insertIndex = originalStartIndex + offset;
		insertIndex = Math.max(insertIndex, 0);
		insertIndex = Math.min(insertIndex, this.length);
		this.actions.splice(insertIndex, 0, ...selected);
		this.selectionStartIndex = insertIndex;
		this.selectionEndIndex = insertIndex + selectionLength - 1; // subtract 1 because the range is inclusive
		return insertIndex;
	}
	deleteSelected(): number | undefined {
		if (this.selectionStartIndex === undefined || this.selectionEndIndex === undefined) {
			return undefined;
		}
		const originalStartIndex = this.selectionStartIndex;
		this.actions.splice(originalStartIndex, this.getSelectionLength());
		this.unselectAll();
		return originalStartIndex;
	}

	// Replace the node at `index` with the provided argument.
	replaceNode(newNode: ActionNode, index: number) {
		if (index >= 0 && index < this.actions.length) {
			this.actions[index] = newNode;
		} else {
			console.error("invalid index for replaceNode", index);
		}
	}

	serialized(): SerializedRecord {
		console.assert(this.config);
		const base = super.serialized();
		return {
			name: base.name,
			fileType: FileType.Record,
			// @ts-expect-error serialization typing is a mess
			config: this.config?.serialized(),
			// @ts-expect-error serialization typing is a mess
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
		const copy = new Record();
		copy.config = this.config;
		copy.actions = this.actions.map((node) => node.getClone());
		copy.selectionStartIndex = this.selectionStartIndex;
		copy.selectionEndIndex = this.selectionEndIndex;
		return copy;
	}
}
