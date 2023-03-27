// @ts-ignore
import {updateStatsDisplay, updateTimelineView} from "../Components/Timeline";
// @ts-ignore
import {controller} from "./Controller";
import {Debug, ResourceType, SkillName, WarningType} from "../Game/Common";
import {ActionNode, ActionType} from "./Record";
import {FileType} from "./Common";
import {updateMarkers_TimelineMarkerPresets} from "../Components/TimelineMarkerPresets";
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";
import {refreshTimelineEditor} from "../Components/TimelineEditor";

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

export const enum MarkerColor {
	Red = "#f64141",
	Orange = "#e89b5f",
	Yellow = "#ffd535",
	Green = "#50c53d",
	Cyan = "#53e5e5",
	Blue = "#217ff5",
	Purple = "#9755ef",
	Pink = "#ee79ee"
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
	potency: number;
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
	duration: number;
	color: MarkerColor;
	track: number;
	showText: boolean;
	description: string;
}

export type SerializedMarker = TimelineElemBase & {
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
	markers: MarkerElem[];

	constructor() {
		this.scale = 0.25;
		this.startTime = 0;
		this.elapsedTime = 0;
		this.elements = [];
		this.markers = [];
		this.#load();
	}

	setTimeSegment(startTime: number, elapsedTime: number) {
		this.startTime = startTime;
		this.elapsedTime = elapsedTime;
	}

	addElement(elem: TimelineElem) {
		this.elements.push(elem);
	}

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
		this.markers.push(marker);
		this.drawElements();
		this.#save();
	}

	deleteMarker(marker: MarkerElem) {
		for (let i = 0; i < this.markers.length; i++) {
			if (marker === this.markers[i]) {
				this.markers.splice(i, 1);
				this.drawElements();
				this.#save();
				return true;
			}
		}
		return false;
	}

	sortAndRemoveDuplicateMarkers() {
		this.markers.sort((a, b)=>{
			return a.time - b.time;
		});
		let count = 0;
		for (let i = this.markers.length - 1; i > 0; i--) {
			if (this.#markersAreEqual(this.markers[i], this.markers[i-1])) {
				this.markers.splice(i, 1);
				count++;
			}
		}
		this.#save();
		return count;
	}

	// assumes input is valid
	#appendMarkersPreset(preset: Fixme, track: number) {
		this.markers = this.markers.concat(preset.markers.map((m: SerializedMarker): MarkerElem=>{
			return {
				time: m.time,
				duration: m.duration,
				color: m.color,
				description: m.description,
				track: track,
				type: ElemType.Marker,
				showText: m.showText===undefined ? false : m.showText,
			};
		}));
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
		this.markers = [];
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
		this.markers.forEach(marker=>{
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
		this.markers.forEach(marker=>{
			let trackBin = M.get(marker.track);
			if (trackBin === undefined) trackBin = [];
			trackBin.push(marker);
			M.set(marker.track, trackBin);
		});
		updateMarkers_TimelineMarkerPresets(M);
	}

	onClickTimelineAction(node: ActionNode, bShift: boolean) {

		let selectResult = controller.record.onClickNode(node, bShift, controller.game.getTincturePotencyMultiplier());

		let gcdSkills = 0;
		controller.record.iterateSelected(node=>{
			if (node.type === ActionType.Skill && node.resolved() && node.skillName) {
				let skillInfo = controller.game.skillsList.get(node.skillName);
				if (skillInfo.info.cdName === ResourceType.cd_GCD) gcdSkills++;
			}
		});

		// potency stats
		updateStatsDisplay({
			selectedPotency: selectResult.selectedPotency,
			selectedDuration: selectResult.selectionEndTime - selectResult.selectionStartTime,
			selectedGcdCount: gcdSkills,
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
		for (let i = 0; i < this.markers.length; i++) {
			maxTrack = Math.max(maxTrack, this.markers[i].track);
		}
		return maxTrack + 1;
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

		let markerTracks: SerializedMarker[][] = [];
		for (let i = 0; i < maxTrack + 1; i++) {
			markerTracks.push([]);
		}

		this.markers.forEach(marker=>{
			markerTracks[marker.track].push({
				time: marker.time,
				duration: marker.duration,
				description: marker.description,
				color: marker.color,
				showText: marker.showText
			});
		});
		let files: Fixme[] = [];
		for (let i = 0; i < markerTracks.length; i++) {
			files.push({
				fileType: FileType.MarkerTrackIndividual,
				track: i,
				markers: markerTracks[i]
			});
		}
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