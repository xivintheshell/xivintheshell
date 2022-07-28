// @ts-ignore
import {updateStatsDisplay, updateTimelineContent} from "../Components/Timeline";
// @ts-ignore
import {controller} from "./Controller";
import {SkillName} from "../Game/Common";
import {ActionNode} from "./Record";
import {FileType} from "./Common";
import {updateMarkers} from "../Components/TimelineMarkers";

export const enum ElemType {
	s_Cursor = "s_Cursor",
	s_ViewOnlyCursor = "s_ViewOnlyCursor",
	DamageMark = "DamageMark",
	LucidMark = "LucidMark",
	MPTickMark = "MPTickMark",
	Skill = "Skill",
	Marker = "Marker",
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

type CursorElem = TimelineElemBase & {
	type: ElemType.s_Cursor;
}
type ViewOnlyCursorElem = TimelineElemBase & {
	type: ElemType.s_ViewOnlyCursor;
	enabled: boolean;
}
type DamageMarkElem = TimelineElemBase & {
	type: ElemType.DamageMark;
	potency: number;
	source: string;
}
type LucidMarkElem = TimelineElemBase & {
	type: ElemType.LucidMark;
	source: string;
}
type MPTickMarkElem = TimelineElemBase & {
	type: ElemType.MPTickMark;
	source: string;
}
type SkillElem = TimelineElemBase & {
	type: ElemType.Skill;
	skillName: SkillName;
	isGCD: boolean;
	isSpellCast: boolean;
	relativeSnapshotTime: number;
	lockDuration: number;
	recastDuration: number;
	capturedPotency: number;
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

type TimelineElem =
	CursorElem |
	ViewOnlyCursorElem |
	DamageMarkElem |
	LucidMarkElem |
	MPTickMarkElem |
	SkillElem |
	MarkerElem
	;

function verifyElem(elem: TimelineElem) {
	console.assert(elem!==undefined);

	if (elem.type === ElemType.s_Cursor ||
		elem.type === ElemType.s_ViewOnlyCursor) {
		console.assert(!isNaN(elem.time));
		return;
	}

	if (elem.type === ElemType.DamageMark) {
		console.assert(!isNaN(elem.time));
		console.assert(!isNaN(elem.potency));
		return;
	}

	if (elem.type === ElemType.LucidMark) {
		console.assert(!isNaN(elem.time));
		return;
	}

	if (elem.type === ElemType.MPTickMark) {
		console.assert(!isNaN(elem.time));
		console.assert(elem.source !== undefined);
		return;
	}

	if (elem.type === ElemType.Skill) {
		console.assert(!isNaN(elem.time));
		console.assert(!isNaN(elem.lockDuration));
		console.assert(!isNaN(elem.recastDuration));
		return;
	}

	console.assert(false);
}

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
		//verifyElem(elem);
		this.elements.push(elem);
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

	appendMarkersPreset(preset: Fixme, track: number) {
		if (preset.fileType !== FileType.MarkerTrackPreset) {
			window.alert("wrong file type '" + preset.fileType + "'");
			return;
		}
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
			time: 0
		});
		this.addElement({
			type: ElemType.s_ViewOnlyCursor,
			time: 0,
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
		controller.onTimelineSelectionChanged();
		this.drawElements();
	}

	getCanvasWidth() {
		// this.elapsedTime := this.game.time
		let rightMostTime = Math.max(0, this.elapsedTime);
		this.markers.forEach(marker=>{
			let endTime = marker.time + marker.duration;
			rightMostTime = Math.max(rightMostTime, endTime);
		});
		let countdown = controller.gameConfig.countdown;
		let secondsToDraw = Math.ceil((rightMostTime + countdown + 4) / 8) * 8;
		return secondsToDraw * 100 * this.scale;
	}

	positionFromTime(time: number) {
		return time * this.scale * 100;
	}

	timeFromPosition(x: number) {
		return x / (this.scale * 100);
	}

	drawElements(filter=()=>{ return true; }) {
		updateTimelineContent(
			this.getCanvasWidth(),
			this.elements.filter(filter));
		updateMarkers(this.markers);
	}

	onClickSkill(node: ActionNode, bShift: boolean) {
		let potency, duration;
		if (bShift) {
			[potency, duration] = controller.record.selectUntil(node);
		} else {
			[potency, duration] = controller.record.selectSingle(node);
		}
		controller.onTimelineSelectionChanged();
		updateStatsDisplay({
			selectedPotency: potency,
			selectedDuration: duration,
		});
	}

	onDeleteSkill(node: ActionNode) {
		// TODO
	}

	getNumMarkerTracks() {
		let maxTrack = -1;
		for (let i = 0; i < this.markers.length; i++) {
			maxTrack = Math.max(maxTrack, this.markers[i].track);
		}
		return maxTrack + 1;
	}

	#save() {
		let files = this.serializedMarkers();
		localStorage.setItem("timelineMarkers", JSON.stringify(files));
	}

	#load() {
		let str = localStorage.getItem("timelineMarkers");
		if (str !== null) {
			let files = JSON.parse(str);
			files.forEach((f: Fixme)=>{
				this.appendMarkersPreset(f, f.track);
			});
		}
	}

	serializedMarkers() {
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
				fileType: FileType.MarkerTrackPreset,
				track: i,
				markers: markerTracks[i]
			});
		}
		return files;
	}
}