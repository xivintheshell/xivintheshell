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
	DamageMark = "DamageMark",
	LucidMark = "LucidMark",
	MPTickMark = "MPTickMark",
	Skill = "Skill",
	Marker = "Marker",
}

export const enum MarkerColor {
	Red = "#FF0000",
	Orange = "#FF7700",
	Yellow = "#FFFF00",
	Green = "#00FF00",
	Cyan = "#00FFFF",
	Blue = "#0077FF",
	Purple = "#7700FF",
	Magenta = "#FF00FF"
}

type TimelineElemBase = {
	time: number;
}

type CursorElem = TimelineElemBase & {
	type: ElemType.s_Cursor;
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
	lockDuration: number;
	recastDuration: number;
	node: ActionNode;
}
export type MarkerElem = TimelineElemBase & {
	type: ElemType.Marker;
	duration: number;
	color: MarkerColor;
	track: number;
	description: string;
}

type TimelineElem =
	CursorElem |
	DamageMarkElem |
	LucidMarkElem |
	MPTickMarkElem |
	SkillElem |
	MarkerElem
	;

function verifyElem(elem: TimelineElem) {
	console.assert(elem!==undefined);

	if (elem.type === ElemType.s_Cursor) {
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
	}

	setTimeSegment(startTime: number, elapsedTime: number) {
		this.startTime = startTime;
		this.elapsedTime = elapsedTime;
	}

	addElement(elem: TimelineElem) {
		verifyElem(elem);
		this.elements.push(elem);
	}

	// assumes valid
	addMarker(marker: MarkerElem) {
		this.markers.push(marker);
		this.drawElements();
	}

	// TODO: type safety
	appendMarkersPreset(preset: any, suppressAlert=false) {
		if (preset.fileType !== FileType.Markers) {
			if (!suppressAlert) window.alert("wrong file time '" + preset.fileType + "'");
			return;
		}
		this.markers = this.markers.concat(preset.markers);
		this.drawElements();
	}

	deleteAllMarkers() {
		this.markers = [];
		this.drawElements();
	}

	reset() {
		this.startTime = 0;
		this.elapsedTime = 0;
		this.elements = [];
		this.addElement({
			type: ElemType.s_Cursor,
			time: 0
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
		let secondsToDraw = Math.ceil((this.elapsedTime + 4) / 8) * 8;
		return secondsToDraw * 100 * this.scale;
	}

	positionFromTime(time: number) {
		return time * this.scale * 100;
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

	serializedMarkers() {
		return {
			fileType: FileType.Markers,
			markers: this.markers
		};
	}
}