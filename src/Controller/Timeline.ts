import { updateTimelineView } from "../Components/Timeline";
import { controller } from "./Controller";
import { BuffType, Debug, SkillUnavailableReason, Warning } from "../Game/Common";
import { ActionNode } from "./Record";
import { FileType, getCachedValue, removeCachedValue, setCachedValue } from "./Common";
import { updateMarkers_TimelineMarkerPresets } from "../Components/TimelineMarkers";
import { updateSkillSequencePresetsView } from "../Components/SkillSequencePresets";
import { refreshTimelineEditor, updateInvalidStatus } from "../Components/TimelineEditor";
import { Potency } from "../Game/Potency";
import { MarkerColor } from "../Components/ColorTheme";
import { TimelineDimensions } from "../Components/Common";
import { ShellJob } from "../Game/Data/Jobs";
import { ActionKey, ResourceKey } from "../Game/Data";

export const MAX_TIMELINE_SLOTS = 4;

export const enum ElemType {
	s_Cursor = "s_Cursor",
	s_HistoricalCursor = "s_HistoricalCursor",
	DamageMark = "DamageMark",
	HealingMark = "HealingMark",
	AggroMark = "AggroMark",
	LucidMark = "LucidMark",
	MPTickMark = "MPTickMark",
	MeditateTickMark = "MeditateTickMark",
	AutoTickMark = "AutoTickMark",
	Skill = "Skill",
	Marker = "Marker",
	WarningMark = "WarningMark",
	Buff = "Buff",
}

export const UntargetableMarkerTrack = -1;

export const enum MarkerType {
	Info = "Info",
	Untargetable = "Untargetable",
	Buff = "Buff",
}

type TimelineElemBase = {
	time: number;
};

type Fixme = any;

export type CursorElem = TimelineElemBase & {
	type: ElemType.s_Cursor;
	displayTime: number;
};
export type HistoricalCursorElem = TimelineElemBase & {
	type: ElemType.s_HistoricalCursor;
	displayTime: number;
	enabled: boolean;
};
export interface PotencyMarkInfo {
	potency: Potency;
	sourceDesc: string;
	sourceSkill: ActionKey;
}
export type PotencyMarkElem = TimelineElemBase & {
	type: ElemType.DamageMark | ElemType.HealingMark | ElemType.AggroMark;
	displayTime: number;
	potencyInfos: PotencyMarkInfo[];
	buffs: ResourceKey[];
};
export type LucidMarkElem = TimelineElemBase & {
	type: ElemType.LucidMark;
	displayTime: number;
	sourceDesc: string;
};
export type MPTickMarkElem = TimelineElemBase & {
	type: ElemType.MPTickMark;
	displayTime: number;
	sourceDesc: string;
};
export type MeditateTickMarkElem = TimelineElemBase & {
	type: ElemType.MeditateTickMark;
	displayTime: number;
	sourceDesc: string;
};
export type AutoTickMarkElem = TimelineElemBase & {
	type: ElemType.AutoTickMark;
	displayTime: number;
	sourceDesc: string;
};
export type WarningMarkElem = TimelineElemBase & {
	type: ElemType.WarningMark;
	warningType: Warning;
	displayTime: number;
};
export type SkillElem = TimelineElemBase & {
	type: ElemType.Skill;
	displayTime: number;
	skillName: ActionKey | string;
	isGCD: boolean;
	isSpellCast: boolean;
	relativeSnapshotTime: number;
	lockDuration: number;
	recastDuration: number;
	node: ActionNode;
	actionIndex: number;
};
export type MarkerElem = TimelineElemBase & {
	type: ElemType.Marker;
	markerType: MarkerType;
	duration: number;
	color: MarkerColor;
	track: number;
	showText: boolean;
	description: string; // if markerType is Buff, description holds BuffType as string, and is localized on render
};

export type SerializedMarker = TimelineElemBase & {
	markerType: MarkerType;
	duration: number;
	showText: boolean;
	color: MarkerColor;
	description: string;
};

export type SharedTimelineElem = CursorElem | HistoricalCursorElem;

export type SlotTimelineElem =
	| PotencyMarkElem
	| LucidMarkElem
	| MPTickMarkElem
	| MeditateTickMarkElem
	| AutoTickMarkElem
	| WarningMarkElem
	| SkillElem;

function isSharedElem(elem: TimelineElem) {
	return elem.type === ElemType.s_Cursor || elem.type === ElemType.s_HistoricalCursor;
}

export type TimelineElem = SharedTimelineElem | SlotTimelineElem;

export class Timeline {
	scale: number;
	startTime: number;
	elapsedTime: number; // raw time (starts from 0)
	sharedElements: SharedTimelineElem[];
	slots: {
		job: ShellJob;
		elements: SlotTimelineElem[];
	}[];
	activeSlotIndex: number;
	#allMarkers: MarkerElem[];
	#untargetableMarkers: MarkerElem[];
	#buffMarkers: MarkerElem[];

	constructor() {
		this.scale = 0.25;
		this.startTime = 0;
		this.elapsedTime = 0;
		this.sharedElements = [];
		this.slots = [];
		this.activeSlotIndex = -1;
		this.#allMarkers = [];
		this.#untargetableMarkers = [];
		this.#buffMarkers = [];
		this.#load();
	}

	setTimeSegment(startTime: number, elapsedTime: number) {
		this.startTime = startTime;
		this.elapsedTime = elapsedTime;
	}

	addElement(elem: TimelineElem) {
		if (isSharedElem(elem)) {
			this.sharedElements.push(elem as SharedTimelineElem);
		} else {
			console.assert(this.slots.length > 0);
			this.slots[this.activeSlotIndex].elements.push(elem as SlotTimelineElem);
		}
	}

	// Sets the tmp_invalid_reasons field on the last element with a skillNode.
	// Used when a cast is interrupted.
	invalidateLastElement() {
		if (this.slots.length > 0) {
			const elements = this.slots[this.activeSlotIndex].elements;
			for (let i = elements.length - 1; i >= 0; i--) {
				const elem = elements[i];
				if (elem.type === ElemType.Skill) {
					elem.node.tmp_invalid_reasons = [SkillUnavailableReason.CastCanceled];
					return;
				}
			}
		}
	}

	tryGetElement(time: number, type: ElemType): SlotTimelineElem | undefined {
		return this.slots[this.activeSlotIndex].elements.find(
			(element) => element.time === time && element.type === type,
		);
	}

	getAllMarkers() {
		return this.#allMarkers;
	}

	getUntargetableMarkers() {
		return this.#untargetableMarkers;
	}

	getBuffMarkers() {
		return this.#buffMarkers;
	}

	#markersAreEqual(m1: MarkerElem, m2: MarkerElem): boolean {
		const almostEq = function (a: number, b: number) {
			return Math.abs(a - b) < Debug.epsilon;
		};

		if (m1.markerType !== m2.markerType) return false;
		if (!almostEq(m1.time, m2.time)) return false;
		if (!almostEq(m1.duration, m2.duration)) return false;
		if (m1.color !== m2.color) return false;
		if (m1.track !== m2.track) return false;
		if (m1.showText !== m2.showText) return false;
		if (m1.description !== m2.description) return false;

		return true;
	}

	// assumes valid
	addMarker(marker: MarkerElem) {
		this.#allMarkers.push(marker);
		if (marker.markerType === MarkerType.Untargetable) {
			this.#untargetableMarkers.push(marker);
		} else if (marker.markerType === MarkerType.Buff) {
			this.#buffMarkers.push(marker);
		}
		this.drawElements();
		this.#save();
	}

	deleteMarker(marker: MarkerElem) {
		let deleted = false;
		for (let i = 0; i < this.#allMarkers.length; i++) {
			if (marker === this.#allMarkers[i]) {
				this.#allMarkers.splice(i, 1);
				this.drawElements();
				this.#save();
				deleted = true;
			}
		}
		this.#recreateUntargetableList();
		this.#recreateBuffList();
		return deleted;
	}

	#recreateUntargetableList() {
		this.#untargetableMarkers = [];
		this.#allMarkers.forEach((m) => {
			if (m.markerType === MarkerType.Untargetable) this.#untargetableMarkers.push(m);
		});
		// Some abilities check whether the boss was hit to determine gauge state.
		updateInvalidStatus();
	}

	#recreateBuffList() {
		this.#buffMarkers = [];
		this.#allMarkers.forEach((m) => {
			if (m.markerType === MarkerType.Buff) {
				// fix for an earlier typo
				if (m.description === "Wanderer's Minuet") {
					m.description = BuffType.WanderersMinuet as string;
				}
				this.#buffMarkers.push(m);
			}
		});
	}

	sortAndRemoveDuplicateMarkers() {
		this.#allMarkers.sort((a, b) => {
			return a.time - b.time;
		});
		let count = 0;
		for (let i = this.#allMarkers.length - 1; i > 0; i--) {
			if (this.#markersAreEqual(this.#allMarkers[i], this.#allMarkers[i - 1])) {
				this.#allMarkers.splice(i, 1);
				count++;
			}
		}
		this.#recreateUntargetableList();
		this.#recreateBuffList();
		this.#save();
		return count;
	}

	// assumes input is valid
	#appendMarkersPreset(preset: Fixme, track: number, offset: number) {
		const newMarkers = preset.markers.map((m: SerializedMarker): MarkerElem => {
			return {
				time: m.time + offset,
				duration: m.duration,
				color: m.color,
				description: m.description,
				track: m.markerType === MarkerType.Untargetable ? UntargetableMarkerTrack : track,
				type: ElemType.Marker,
				markerType: m.markerType ?? MarkerType.Info,
				showText: m.showText ?? false,
			};
		});
		this.#allMarkers = this.#allMarkers.concat(newMarkers);
		this.#recreateUntargetableList();
		this.#recreateBuffList();
		this.#save();
	}

	loadCombinedTracksPreset(content: Fixme, offset: number) {
		if (content.fileType !== FileType.MarkerTracksCombined) {
			window.alert("wrong file type '" + content.fileType + "'");
			return;
		}
		content.tracks.forEach((trackContent: Fixme) => {
			this.loadIndividualTrackPreset(trackContent, trackContent.track, offset);
		});
	}

	loadIndividualTrackPreset(content: Fixme, track: number, offset: number) {
		if (content.fileType !== FileType.MarkerTrackIndividual) {
			window.alert("wrong file type '" + content.fileType + "'");
			return;
		}
		this.#appendMarkersPreset(content, track, offset);
	}

	deleteAllMarkers() {
		const anyUntargetable = this.#untargetableMarkers.length > 0;
		this.#allMarkers = [];
		this.#untargetableMarkers = [];
		this.#buffMarkers = [];
		this.drawElements();
		if (anyUntargetable) {
			// Some abilities check whether the boss was hit to determine gauge state.
			updateInvalidStatus();
		}
		this.#save();
	}

	addSlotAtIndex(idx: number) {
		if (idx < 0 || idx > this.slots.length || this.slots.length + 1 > MAX_TIMELINE_SLOTS) {
			console.error("attempted to add slot at invalid index", idx);
			return;
		}
		// move other save data up 1 slot, traversing them from highest to lowest
		for (let i = MAX_TIMELINE_SLOTS - 1; i >= idx; i--) {
			let str = getCachedValue(`gameRecord${i}`);
			if (str !== null) {
				setCachedValue(`gameRecord${i + 1}`, str);
			}
			str = getCachedValue(`gameTimeInfo${i}`);
			if (str !== null) {
				setCachedValue(`gameTimeInfo${i + 1}`, str);
			}
		}
		this.slots.splice(idx, 0, { job: "BLM", elements: [] });
		this.activeSlotIndex = idx;
		controller.setConfigAndRestart(controller.gameConfig);
	}

	addSlot() {
		this.addSlotAtIndex(this.slots.length);
	}

	removeSlot(idx: number) {
		console.assert(idx < this.slots.length);
		// shift save slots
		for (let i = idx; i < MAX_TIMELINE_SLOTS; i++) {
			let str = getCachedValue("gameRecord" + (i + 1).toString());
			if (str !== null) {
				setCachedValue("gameRecord" + i.toString(), str);
			}
			str = getCachedValue("gameTimeInfo" + (i + 1).toString());
			if (str !== null) {
				setCachedValue("gameTimeInfo" + i.toString(), str);
			}
		}
		this.slots.splice(idx, 1);
		for (let i = this.slots.length; i < MAX_TIMELINE_SLOTS; i++) {
			removeCachedValue("gameRecord" + i.toString());
			removeCachedValue("gameTimeInfo" + i.toString());
		}
		if (this.activeSlotIndex >= idx)
			this.activeSlotIndex = Math.max(0, this.activeSlotIndex - 1);
		this.loadSlot(this.activeSlotIndex);
		setCachedValue("activeSlotIndex", this.activeSlotIndex.toString());
	}

	saveCurrentSlot(serializedRecord: any, countdown: number, elapsedTime: number) {
		setCachedValue(
			"gameRecord" + this.activeSlotIndex.toString(),
			JSON.stringify(serializedRecord),
		);
		setCachedValue(
			"gameTimeInfo" + this.activeSlotIndex.toString(),
			JSON.stringify({
				countdown: countdown,
				elapsedTime: elapsedTime,
			}),
		);
		controller.gameConfig.savePartialConfig();
	}

	loadSlot(index: number): boolean {
		const str = getCachedValue("gameRecord" + index.toString());
		if (str !== null) {
			// found record; make sure the slot exists
			this.activeSlotIndex = index;
			while (this.slots.length <= index) {
				this.slots.push({ job: "BLM", elements: [] });
			}
			const content = JSON.parse(str);
			controller.loadBattleRecordFromFile(content);
			this.slots[index].job = controller.game.job;
			return true;
		} else {
			// nothing found here
			return false;
		}
	}

	reset() {
		this.startTime = 0;
		this.elapsedTime = 0;
		if (this.slots.length > 0) {
			this.slots[this.activeSlotIndex].elements = [];
		}
		this.sharedElements = [];
		this.addElement({
			type: ElemType.s_Cursor,
			time: 0,
			displayTime: 0, // gets updated later (it seems)
		});
		this.addElement({
			type: ElemType.s_HistoricalCursor,
			time: 0,
			displayTime: 0,
			enabled: false,
		});
	}

	// can only update singletons this way
	updateElem(elem: TimelineElem) {
		console.assert(elem && elem.type.substring(0, 2) === "s_");
		for (let i = 0; i < this.sharedElements.length; i++) {
			if (this.sharedElements[i].type === elem.type) {
				this.sharedElements[i] = elem;
				return;
			}
		}
		console.assert(false);
	}

	// scale=1 := 100px represents 1s
	setHorizontalScale(inScale: number) {
		this.scale = inScale;
		this.drawElements();
	}

	getAllSlotsTimeInfo() {
		let countdown = 0;
		let rightMostTime = 0;
		let hasRecord = false;
		for (let i = 0; i < MAX_TIMELINE_SLOTS; i++) {
			const str = getCachedValue("gameTimeInfo" + i.toString());
			if (str !== null) {
				const info = JSON.parse(str) as {
					countdown: number;
					elapsedTime: number;
				};
				countdown = Math.max(countdown, info.countdown);
				rightMostTime = Math.max(rightMostTime, info.elapsedTime);
				hasRecord = true;
			}
		}
		if (hasRecord) {
			return {
				countdown: countdown,
				rightMostTime: rightMostTime,
			};
		} else {
			return null;
		}
	}

	getCanvasWidth() {
		let rightMostTime = Math.max(0, this.elapsedTime);
		let countdown = controller.gameConfig.countdown;
		// and other slots
		const allSlotsTimeInfo = this.getAllSlotsTimeInfo();
		if (allSlotsTimeInfo !== null) {
			countdown = Math.max(countdown, allSlotsTimeInfo.countdown);
			rightMostTime = Math.max(rightMostTime, allSlotsTimeInfo.rightMostTime);
		}
		// and include markers
		this.#allMarkers.forEach((marker) => {
			const endDisplayTime = marker.time + marker.duration;
			rightMostTime = Math.max(rightMostTime, endDisplayTime + countdown);
		});
		const secondsToDraw = Math.ceil((rightMostTime + Math.max(0, countdown) + 4) / 8) * 8;
		return secondsToDraw * 100 * this.scale;
	}

	getCanvasHeight() {
		const numTracksToDraw = this.getNumMarkerTracks();
		return TimelineDimensions.timelineCanvasHeight(numTracksToDraw, this.slots.length);
	}

	positionFromTime(time: number) {
		return time * this.scale * 100;
	}

	timeFromPosition(x: number) {
		return x / (this.scale * 100);
	}

	drawElements() {
		// this call signals a redraw. Exact elements are queried
		// at the start of the actual redraw (controller.getTimelineRenderingProps)
		updateTimelineView();

		// this is for refreshing the save track(s) buttons
		this.updateTimelineMarkers();
	}

	updateTimelineMarkers() {
		updateTimelineView();
		const M = new Map<number, MarkerElem[]>();
		this.#allMarkers.forEach((marker) => {
			let trackBin = M.get(marker.track);
			if (trackBin === undefined) trackBin = [];
			trackBin.push(marker);
			M.set(marker.track, trackBin);
		});
		updateMarkers_TimelineMarkerPresets(M);
	}

	onClickTimelineAction(index: number, bShift: boolean) {
		if (index < 0 || index >= controller.record.length) {
			return;
		}

		controller.record.onClickNode(index, bShift);

		updateSkillSequencePresetsView();
		refreshTimelineEditor();

		// historical state
		const firstNode = controller.record.selectionStartIndex;
		if (firstNode !== undefined) {
			controller.displayHistoricalState(-Infinity, firstNode);
		} else {
			// just clicked on the only selected node and unselected it. Still show historical state
			controller.displayHistoricalState(-Infinity, index);
		}
	}

	resizeSelection(left: boolean) {
		// Resizes the record selection by 1 skill.
		// Example:
		//   old selection: __xx__
		//   resizeSelection(true)
		//   new selection: _xxx__
		//   resizeSelection(false)
		//   new selection: __xx__
		//   resizeSelection(false) called 2x
		//   new selection: ___xx_
		const start = controller.record.selectionStartIndex;
		const end = controller.record.selectionEndIndex;
		if (start !== undefined && end !== undefined) {
			const target = (controller.record.startIsPivot ? end : start) + (left ? -1 : 1);
			if (target >= 0 && target < controller.record.length) {
				this.onClickTimelineAction(target, true);
			}
		}
	}

	getNumMarkerTracks() {
		let maxTrack = -1;
		let hasUntargetableTrack = false;
		for (let i = 0; i < this.#allMarkers.length; i++) {
			maxTrack = Math.max(maxTrack, this.#allMarkers[i].track);
			if (this.#allMarkers[i].track === UntargetableMarkerTrack) hasUntargetableTrack = true;
		}
		if (hasUntargetableTrack) return maxTrack + 2;
		return maxTrack + 1;
	}

	duringUntargetable(displayTime: number) {
		for (let i = 0; i < this.#untargetableMarkers.length; i++) {
			const m = this.#untargetableMarkers[i];
			const mStart = m.time;
			const mEnd = m.time + m.duration;
			if (displayTime >= mStart && displayTime < mEnd) return true;
		}
		return false;
	}

	// inputs are displayed numbers
	getTargetableDurationBetween(tStart: number, tEnd: number) {
		const cut = function (
			[targetA, targetB]: [number, number],
			[srcA, srcB]: [number, number],
		) {
			const res: [number, number][] = [];
			if (targetA < srcA) {
				res.push([targetA, Math.min(targetB, srcA)]);
			}
			if (srcB < targetB) {
				res.push([Math.max(srcB, targetA), targetB]);
			}
			return res;
		};

		let remainings: [number, number][] = [[tStart, tEnd]];

		for (let i = 0; i < this.#untargetableMarkers.length; i++) {
			const m = this.#untargetableMarkers[i];
			const mStart = m.time;
			const mEnd = m.time + m.duration;

			let newRemainings: [number, number][] = [];
			remainings.forEach((rem) => {
				newRemainings = newRemainings.concat(cut(rem, [mStart, mEnd]));
			});
			remainings = newRemainings;
		}

		let remainingTime = 0;
		remainings.forEach((rem) => {
			remainingTime += rem[1] - rem[0];
		});

		return remainingTime;
	}

	#save() {
		const files = this.serializedSeparateMarkerTracks();
		setCachedValue("timelineMarkers", JSON.stringify(files));
	}

	#load() {
		const str = getCachedValue("timelineMarkers");
		if (str !== null) {
			const files = JSON.parse(str);
			files.forEach((f: Fixme) => {
				this.#appendMarkersPreset(f, f.track, 0);
			});
		}
	}

	// localStorage; saving tracks as separate files
	serializedSeparateMarkerTracks() {
		const maxTrack = this.getNumMarkerTracks() - 1;

		const markerTracks: Map<number, SerializedMarker[]> = new Map();
		for (let i = UntargetableMarkerTrack; i < maxTrack + 1; i++) {
			markerTracks.set(i, []);
		}

		this.#allMarkers.forEach((marker) => {
			const bin = markerTracks.get(marker.track);
			console.assert(bin);
			if (bin) {
				bin.push({
					time: marker.time,
					markerType: marker.markerType,
					duration: marker.duration,
					description: marker.description,
					color: marker.color,
					showText: marker.showText,
				});
				markerTracks.set(marker.track, bin);
			}
		});
		const files: Fixme[] = [];
		markerTracks.forEach((bin, i) => {
			if (bin.length > 0) {
				files.push({
					fileType: FileType.MarkerTrackIndividual,
					track: i,
					markers: bin,
				});
			}
		});
		return files;
	}

	// saving tracks as a combined file
	serializedCombinedMarkerTracks() {
		const tracks = this.serializedSeparateMarkerTracks();
		return {
			fileType: FileType.MarkerTracksCombined,
			tracks: tracks,
		};
	}
}
