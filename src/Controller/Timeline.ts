// @ts-ignore
import {updateTimelineView} from "../Components/Timeline";
// @ts-ignore
import {controller} from "./Controller";
import {Debug, ResourceType, SkillName, WarningType} from "../Game/Common";
import {ActionNode, ActionType} from "./Record";
import {FileType} from "./Common";
import {updateMarkers_TimelineMarkerPresets} from "../Components/TimelineMarkerPresets";
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";
import {refreshTimelineEditor} from "../Components/TimelineEditor";
import {Potency} from "../Game/Potency";

export const enum ElemType {
	s_Cursor = "s_Cursor",
	s_ViewOnlyCursor = "s_ViewOnlyCursor",
	DamageMark = "DamageMark",
	LucidMark = "LucidMark",
	MPTickMark = "MPTickMark",
	Skill = "Skill",
	Marker = "Marker",
	WarningMark = "WarningMark"
}

export const UntargetableMarkerTrack = -1;

export const enum MarkerType {
	Info = "Info",
	Untargetable = "Untargetable"
}

export const enum MarkerColor {
	Red = "#f64141",
	Orange = "#e89b5f",
	Yellow = "#ffd535",
	Green = "#50c53d",
	Cyan = "#53e5e5",
	Blue = "#217ff5",
	Purple = "#9755ef",
	Pink = "#ee79ee",
	Grey = "#6f6f6f"
}

type TimelineElemBase = {
	time: number;
}

type Fixme = any;

export type CursorElem = TimelineElemBase & {
	type: ElemType.s_Cursor;
	displayTime: number;
}
export type ViewOnlyCursorElem = TimelineElemBase & {
	type: ElemType.s_ViewOnlyCursor;
	displayTime: number;
	enabled: boolean;
}
export type DamageMarkElem = TimelineElemBase & {
	type: ElemType.DamageMark;
	displayTime: number;
	potency: Potency;
	buffs: ResourceType[];
	source: string;
}
export type LucidMarkElem = TimelineElemBase & {
	type: ElemType.LucidMark;
	displayTime: number;
	source: string;
}
export type MPTickMarkElem = TimelineElemBase & {
	type: ElemType.MPTickMark;
	displayTime: number;
	source: string;
}
export type WarningMarkElem = TimelineElemBase & {
	type: ElemType.WarningMark;
	warningType: WarningType;
	displayTime: number;
}
export type SkillElem = TimelineElemBase & {
	type: ElemType.Skill;
	displayTime: number;
	skillName: SkillName;
	isGCD: boolean;
	isSpellCast: boolean;
	relativeSnapshotTime: number;
	lockDuration: number;
	recastDuration: number;
	node: ActionNode;
}
export type MarkerElem = TimelineElemBase & {
	type: ElemType.Marker;
	markerType: MarkerType;
	duration: number;
	color: MarkerColor;
	track: number;
	showText: boolean;
	description: string;
}

export type SerializedMarker = TimelineElemBase & {
	markerType: MarkerType;
	duration: number;
	showText: boolean;
	color: MarkerColor;
	description: string;
}

export type TimelineElem =
	CursorElem |
	ViewOnlyCursorElem |
	DamageMarkElem |
	LucidMarkElem |
	MPTickMarkElem |
	WarningMarkElem |
	SkillElem |
	MarkerElem
	;

export class Timeline {

	scale: number;
	startTime: number;
	elapsedTime: number;
	elements: TimelineElem[];
	#allMarkers: MarkerElem[];
	#untargetableMarkers: MarkerElem[];

	constructor() {
		this.scale = 0.25;
		this.startTime = 0;
		this.elapsedTime = 0;
		this.elements = [];
		this.#allMarkers = [];
		this.#untargetableMarkers = [];
		this.#load();
	}

	setTimeSegment(startTime: number, elapsedTime: number) {
		this.startTime = startTime;
		this.elapsedTime = elapsedTime;
	}

	addElement(elem: TimelineElem) {
		this.elements.push(elem);
	}

	getAllMarkers() { return this.#allMarkers; }

	getUntargetableMarkers() { return this.#untargetableMarkers; }

	#markersAreEqual(m1: MarkerElem, m2: MarkerElem) : boolean {
		let almostEq = function(a: number, b: number) {
			return Math.abs(a - b) < Debug.epsilon;
		}

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
		return deleted;
	}

	#recreateUntargetableList() {
		this.#untargetableMarkers = [];
		this.#allMarkers.forEach(m => {
			if (m.markerType === MarkerType.Untargetable) this.#untargetableMarkers.push(m);
		})
	}

	sortAndRemoveDuplicateMarkers() {
		this.#allMarkers.sort((a, b)=>{
			return a.time - b.time;
		});
		let count = 0;
		for (let i = this.#allMarkers.length - 1; i > 0; i--) {
			if (this.#markersAreEqual(this.#allMarkers[i], this.#allMarkers[i-1])) {
				this.#allMarkers.splice(i, 1);
				count++;
			}
		}
		this.#recreateUntargetableList();
		this.#save();
		return count;
	}

	// assumes input is valid
	#appendMarkersPreset(preset: Fixme, track: number) {
		let newMarkers = preset.markers.map((m: SerializedMarker): MarkerElem=>{
			return {
				time: m.time,
				duration: m.duration,
				color: m.color,
				description: m.description,
				track: m.markerType === MarkerType.Untargetable ? UntargetableMarkerTrack : track,
				type: ElemType.Marker,
				markerType: m.markerType ?? MarkerType.Info,
				showText: m.showText ?? false
			};
		});
		this.#allMarkers = this.#allMarkers.concat(newMarkers);
		this.#recreateUntargetableList();
		this.#save();
	}

	loadCombinedTracksPreset(content: Fixme) {
		if (content.fileType !== FileType.MarkerTracksCombined) {
			window.alert("wrong file type '" + content.fileType + "'");
			return;
		}
		content.tracks.forEach((trackContent: Fixme) => {
			this.loadIndividualTrackPreset(trackContent, trackContent.track);
		});
	}

	loadIndividualTrackPreset(content: Fixme, track: number) {
		if (content.fileType !== FileType.MarkerTrackIndividual) {
			window.alert("wrong file type '" + content.fileType + "'");
			return;
		}
		this.#appendMarkersPreset(content, track);
	}

	deleteAllMarkers() {
		this.#allMarkers = [];
		this.#untargetableMarkers = [];
		this.drawElements();
		this.#save();
	}

	reset() {
		this.startTime = 0;
		this.elapsedTime = 0;
		this.elements = [];
		this.addElement({
			type: ElemType.s_Cursor,
			time: 0,
			displayTime: 0 // gets updated later (it seems)
		});
		this.addElement({
			type: ElemType.s_ViewOnlyCursor,
			time: 0,
			displayTime: 0,
			enabled: false
		});
	}

	// can only update singletons this way
	updateElem(elem: TimelineElem) {
		console.assert(elem && elem.type.substring(0, 2)==="s_");
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].type === elem.type) {
				this.elements[i] = elem;
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

	getCanvasWidth() {
		// this.elapsedTime := this.game.time
		let rightMostTime = Math.max(0, this.elapsedTime);
		let countdown = controller.gameConfig.countdown;
		this.#allMarkers.forEach(marker=>{
			let endDisplayTime = marker.time + marker.duration;
			rightMostTime = Math.max(rightMostTime, endDisplayTime + countdown);
		});
		let secondsToDraw = Math.ceil((rightMostTime + Math.max(0, countdown) + 4) / 8) * 8;
		return secondsToDraw * 100 * this.scale;
	}

	getCanvasHeight() {
		return 30 + 14*this.getNumMarkerTracks() + 6 + 54;
	}

	positionFromTime(time: number) {
		return time * this.scale * 100;
	}

	timeFromPosition(x: number) {
		return x / (this.scale * 100);
	}

	drawElements() {

		updateTimelineView();

		this.updateTimelineMarkers();
	}

	updateTimelineMarkers() {
		updateTimelineView();
		let M = new Map<number, MarkerElem[]>();
		this.#allMarkers.forEach(marker=>{
			let trackBin = M.get(marker.track);
			if (trackBin === undefined) trackBin = [];
			trackBin.push(marker);
			M.set(marker.track, trackBin);
		});
		updateMarkers_TimelineMarkerPresets(M);
	}

	onClickTimelineAction(node: ActionNode, bShift: boolean) {

		controller.record.onClickNode(node, bShift);

		let gcdSkills = 0;
		controller.record.iterateSelected(node=>{
			if (node.type === ActionType.Skill && node.resolved() && node.skillName) {
				let skillInfo = controller.game.skillsList.get(node.skillName);
				if (skillInfo.info.cdName === ResourceType.cd_GCD) gcdSkills++;
			}
		});

		updateSkillSequencePresetsView();
		refreshTimelineEditor();

		// historical state
		let firstNode = controller.record.getFirstSelection();
		if (firstNode) {
			controller.displayHistoricalState(-1, firstNode);
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
			let m = this.#untargetableMarkers[i];
			let mStart = m.time;
			let mEnd = m.time + m.duration;
			if (displayTime >= mStart && displayTime < mEnd) return true;
		}
		return false;
	}

	// inputs are displayed numbers
	getTargetableDurationBetween(tStart: number, tEnd: number) {

		let cut = function([targetA, targetB]: [number, number], [srcA, srcB]: [number, number]) {
			let res: [number, number][] = [];
			if (targetA < srcA) {
				res.push([targetA, Math.min(targetB, srcA)]);
			}
			if (srcB < targetB) {
				res.push([Math.max(srcB, targetA), targetB]);
			}
			return res;
		}

		let remainings: [number, number][] = [[tStart, tEnd]];

		for (let i = 0; i < this.#untargetableMarkers.length; i++) {
			let m = this.#untargetableMarkers[i];
			let mStart = m.time;
			let mEnd = m.time + m.duration;

			let newRemainings: [number, number][] = [];
			remainings.forEach(rem => {
				newRemainings = newRemainings.concat(cut(rem, [mStart, mEnd]));
			})
			remainings = newRemainings;
		}

		let remainingTime = 0;
		remainings.forEach(rem => {
			remainingTime += rem[1] - rem[0];
		});

		return remainingTime;
	}

	#save() {
		let files = this.serializedSeparateMarkerTracks();
		localStorage.setItem("timelineMarkers", JSON.stringify(files));
	}

	#load() {
		let str = localStorage.getItem("timelineMarkers");
		if (str !== null) {
			let files = JSON.parse(str);
			files.forEach((f: Fixme)=>{
				this.#appendMarkersPreset(f, f.track);
			});
		}
	}

	// localStorage; saving tracks as separate files
	serializedSeparateMarkerTracks() {
		let maxTrack = this.getNumMarkerTracks() - 1;

		let markerTracks: Map<number, SerializedMarker[]> = new Map();
		for (let i = UntargetableMarkerTrack; i < maxTrack + 1; i++) {
			markerTracks.set(i, []);
		}

		this.#allMarkers.forEach(marker=>{
			let bin = markerTracks.get(marker.track);
			console.assert(bin);
			if (bin) {
				bin.push({
					time: marker.time,
					markerType: marker.markerType,
					duration: marker.duration,
					description: marker.description,
					color: marker.color,
					showText: marker.showText
				});
				markerTracks.set(marker.track, bin);
			}
		});
		let files: Fixme[] = [];
		markerTracks.forEach((bin, i)=>{
			if (bin.length > 0) {
				files.push({
					fileType: FileType.MarkerTrackIndividual,
					track: i,
					markers: bin
				});
			}
		});
		return files;
	}

	// saving tracks as a combined file
	serializedCombinedMarkerTracks() {
		let tracks = this.serializedSeparateMarkerTracks();
		return {
			fileType: FileType.MarkerTracksCombined,
			tracks: tracks
		};
	}
}