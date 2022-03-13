import {Color, LogCategory} from "./Common";
import { GameState } from "../Game/GameState";
import {GameConfig, ResourceType, SkillReadyStatus} from "../Game/Common";
import {updateTimelineContent} from "../Components/Timeline";


/*
Timeline:

width: multiple of 800px?

 */

export const ElemType = {
	s_Cursor: "s_Cursor",
	DamageMark: "DamageMark"
};

function verifyElem(elem) {
	console.assert(elem!==undefined);

	if (elem.type === ElemType.s_Cursor) {
		console.assert(!isNaN(parseFloat(elem.time)));
		return;
	}

	if (elem.type === ElemType.DamageMark) {
		return;
	}

	console.assert(false);
}

export class Timeline {

	constructor() {
		this.scale = 0.25;
		this.startTime = 0;
		this.showDuration = 0;
		this.elements = [];
	}

	setTimeSegment(startTime, showDuration) {
		this.startTime = startTime;
		this.showDuration = showDuration;
	}

	addElement(elem) {
		verifyElem(elem);
		this.elements.push(elem);
	}

	// can only update singletons this way
	updateElem(elem) {
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
	setHorizontalScale(inScale) {
		this.scale = inScale;
	}

	getCanvasWidth() {
		let secondsToDraw = Math.ceil((this.showDuration + 4) / 8) * 8;
		return secondsToDraw * 100 * this.scale;
	}

	getTimelineElements() {
		let elemsToDraw = [];
		this.elements.forEach(e=>{
			 // cursor
			 if (e.type === ElemType.s_Cursor) {
				 elemsToDraw.push({
					  type: e.type,
					  left: (this.startTime + this.showDuration) * 100 * this.scale,
				 });
			 }
		});
		return elemsToDraw;
	}

	drawElements(filter=(e)=>{ return true; }) {
		let elemsToDraw = this.getTimelineElements();
		updateTimelineContent(this.startTime, this.getCanvasWidth(), elemsToDraw.filter(filter));
	}
}