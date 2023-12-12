import React, {useEffect, useRef, useState} from 'react'
import {
	CursorElem,
	DamageMarkElem,
	ElemType,
	LucidMarkElem,
	MarkerElem,
	MPTickMarkElem,
	SkillElem,
	TimelineElem, UntargetableMarkerTrack,
	ViewOnlyCursorElem,
	WarningMarkElem
} from "../Controller/Timeline";
import {StaticFn} from "./Common";
import {ResourceType, WarningType} from "../Game/Common";
// @ts-ignore
import {skillIconImages} from "./Skills";
import {controller} from "../Controller/Controller";
import {localize, localizeSkillName} from "./Localization";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";
import {getCurrentThemeColors, ThemeColors} from "./ColorTheme";
import {scrollEditorToFirstSelected} from "./TimelineEditor";
import {bossIsUntargetable} from "../Controller/DamageStatistics";
import {updateTimelineView} from "./Timeline";

export type TimelineRenderingProps = {
	timelineWidth: number,
	timelineHeight: number,
	countdown: number,
	scale: number,
	tincturePotencyMultiplier: number,
	untargetableMask: boolean,
	allMarkers: MarkerElem[],
	untargetableMarkers: MarkerElem[],
	elements: TimelineElem[],
	showSelection: boolean,
	selectionStartX: number,
	selectionEndX: number,
}

const c_trackHeight = 14;
const c_timelineHeight = 12 + 54;
const c_maxTimelineHeight = 400;
const c_barsOffset = 2;
const c_leftBufferWidth = 20;

let g_ctx : CanvasRenderingContext2D;

let g_visibleLeft = 0;
let g_visibleWidth = 0;
let g_isClickUpdate = false;
let g_clickEvent: any = undefined; // valid when isClickUpdate is true
let g_isKeyboardUpdate = false;
let g_keyboardEvent: any = undefined;
let g_mouseX = 0;
let g_mouseY = 0;
let g_mouseHovered = false;

let g_colors: ThemeColors;

// updated on mouse enter/leave, updated and reset on every draw
let g_activeHoverTip: string[] | undefined = undefined;
let g_activeOnClick: (()=>void) | undefined = undefined;

let g_renderingProps: TimelineRenderingProps = {
	timelineWidth: 0,
	timelineHeight: 0,
	countdown: 0,
	scale: 1,
	tincturePotencyMultiplier: 1,
	allMarkers: [],
	untargetableMarkers: [],
	untargetableMask: true,
	elements: [],
	showSelection: false,
	selectionStartX: 0,
	selectionEndX: 0,
};

let cachedPointerMouse = false;
let readback_pointerMouse = false;

// qol: event capture mask? So can provide a layer that overwrites keyboard event only and not affect the rest
// all coordinates in canvas space
function testInteraction(
	rect: Rect,
	hoverTip?: string[],
	onClick?: ()=>void,
	pointerMouse?: boolean)
{
	if (g_mouseX >= rect.x && g_mouseX < rect.x + rect.w && g_mouseY >= rect.y && g_mouseY < rect.y + rect.h) {
		g_activeHoverTip = hoverTip;
		g_activeOnClick = onClick;
		readback_pointerMouse = pointerMouse === true;
	}
}

const onClickTimelineBackground = ()=>{
	// clicked on background:
	controller.record.unselectAll();
	controller.displayCurrentState();
};

function drawTip(lines: string[], canvasWidth: number, canvasHeight: number) {
	if (!lines.length) return;

	const lineHeight = 14;
	const horizontalPadding = 8;
	const verticalPadding = 4;
	g_ctx.font = "12px monospace";

	let maxLineWidth = -1;
	lines.forEach(l=>{ maxLineWidth = Math.max(maxLineWidth, g_ctx.measureText(l).width); });
	let [boxWidth, boxHeight] = [maxLineWidth + 2 * horizontalPadding, lineHeight * lines.length + 2 * verticalPadding];

	let x = g_mouseX;
	let y = g_mouseY;

	// compute optimal box position
	const boxToMousePadding = 4;
	const estimatedMouseHeight = 11;
	if (y >= boxHeight + boxToMousePadding) { // put on top
		y = y - boxHeight - boxToMousePadding;
	} else {
		y = y + estimatedMouseHeight + boxToMousePadding;
	}
	if (x - boxWidth / 2 >= 0 && x + boxWidth / 2 < canvasWidth) {
		x = x - boxWidth / 2;
	} else if (x - boxWidth / 2 < 0) {
		x = 0;
	} else {
		x = canvasWidth - boxWidth;
	}

	// start drawing
	g_ctx.strokeStyle = g_colors.bgHighContrast;
	g_ctx.lineWidth = 1;
	g_ctx.fillStyle = g_colors.tipBackground;
	g_ctx.fillRect(x, y, boxWidth, boxHeight);
	g_ctx.strokeRect(x, y, boxWidth, boxHeight);

	g_ctx.fillStyle = g_colors.emphasis;
	g_ctx.textBaseline = "top";
	g_ctx.textAlign = "left";
	for (let i = 0; i < lines.length; i++) {
		g_ctx.fillText(lines[i], x + horizontalPadding, y + i * lineHeight + 2 + verticalPadding);
	}
}

function drawMarkers(
	countdown: number,
	scale: number,
	markerTracksTopY: number,
	markerTracksBottomY: number, // bottom Y of track 0
	timelineOrigin: number,
	trackBins: Map<number, MarkerElem[]>,
) {
	// markers
	g_ctx.lineCap = "round";
	g_ctx.lineWidth = 4;
	g_ctx.font = "11px monospace";
	g_ctx.textAlign = "left";
	trackBins.forEach((elems, track)=>{
		let top = markerTracksBottomY - (track + 1) * c_trackHeight;
		if (track === UntargetableMarkerTrack) {
			top = markerTracksTopY;
		}
		for (let i = 0; i < elems.length; i++) {
			let m = elems[i];
			if (track === UntargetableMarkerTrack) m.description = localize({en: "Untargetable", zh: "不可选中"}) as string;
			let left = timelineOrigin + StaticFn.positionFromTimeAndScale(m.time + countdown, scale);
			let onClick = ()=>{
				let success = controller.timeline.deleteMarker(m);
				console.assert(success);
				controller.updateStats();
				setEditingMarkerValues(m);
			};
			if (m.duration > 0) {
				let markerWidth = StaticFn.positionFromTimeAndScale(m.duration, scale);
				if (m.showText) {
					g_ctx.fillStyle = m.color + g_colors.timeline.markerAlpha;
					g_ctx.fillRect(left, top, markerWidth, c_trackHeight);
					g_ctx.fillStyle = g_colors.emphasis;
					g_ctx.fillText(m.description, left + c_trackHeight / 2, top + 10);
				} else {
					g_ctx.strokeStyle = m.color;
					g_ctx.beginPath();
					g_ctx.moveTo(left, top + c_trackHeight / 2);
					g_ctx.lineTo(left + markerWidth, top + c_trackHeight / 2);
					g_ctx.stroke();
				}
				let timeStr = m.time + " - " + parseFloat((m.time + m.duration).toFixed(3));
				testInteraction(
					{x: left, y: top, w: Math.max(markerWidth, c_trackHeight), h: c_trackHeight},
					["[" + timeStr + "] " + m.description],
					onClick);
			} else {
				g_ctx.fillStyle = m.color;
				g_ctx.beginPath();
				g_ctx.ellipse(left, top + c_trackHeight / 2, 4, 4, 0, 0, 2 * Math.PI);
				g_ctx.fill();
				if (m.showText) {
					g_ctx.fillStyle = g_colors.emphasis;
					g_ctx.beginPath()
					g_ctx.fillText(m.description, left + c_trackHeight / 2, top + 10);
				}
				testInteraction(
					{x: left - c_trackHeight / 2, y: top, w: c_trackHeight, h: c_trackHeight},
					["[" + m.time + "] " + m.description],
					onClick);
			}
		}
	});
}

function drawMPTickMarks(
	countdown: number,
	scale: number,
	originX: number,
	originY: number,
	elems: MPTickMarkElem[]
) {
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = g_colors.timeline.mpTickMark;
	g_ctx.beginPath();
	elems.forEach(tick=>{
		let x = originX + StaticFn.positionFromTimeAndScale(tick.time, scale);
		g_ctx.moveTo(x, originY);
		g_ctx.lineTo(x, originY + c_timelineHeight);

		testInteraction(
			{x: x-2, y: originY, w: 4, h: c_timelineHeight},
			["[" + tick.displayTime.toFixed(2) + "] " + tick.source]
		);
	});
	g_ctx.stroke();
}

function drawWarningMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: WarningMarkElem[]
) {
	g_ctx.font = "bold 10px monospace";
	elems.forEach(mark=>{
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.time, scale);
		const sideLength = 12;
		const bottomY = timelineOriginY + sideLength;
		g_ctx.beginPath();
		g_ctx.textAlign = "center";
		g_ctx.moveTo(x, bottomY-sideLength);
		g_ctx.lineTo(x-sideLength/2, bottomY);
		g_ctx.lineTo(x+sideLength/2, bottomY);
		g_ctx.fillStyle = g_colors.timeline.warningMark;
		g_ctx.fill();
		g_ctx.fillStyle = "white";
		g_ctx.fillText("!", x, bottomY-1);

		let message: string = "[" + mark.displayTime.toFixed(2) + "] ";
		if (mark.warningType === WarningType.PolyglotOvercap) {
			message += localize({en: "polyglot overcap!", zh: "通晓溢出！"});
		}

		testInteraction(
			{x: x-sideLength/2, y: bottomY-sideLength, w: sideLength, h: sideLength}, [message]
		);
	});
}

function drawDamageMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: DamageMarkElem[]
) {
	elems.forEach(mark=>{
		let untargetable = bossIsUntargetable(mark.time);
		g_ctx.fillStyle = untargetable ? g_colors.timeline.untargetableDamageMark : g_colors.timeline.damageMark;
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.time, scale);
		g_ctx.beginPath();
		g_ctx.moveTo(x-3, timelineOriginY);
		g_ctx.lineTo(x+3, timelineOriginY);
		g_ctx.lineTo(x, timelineOriginY+6);
		g_ctx.fill();

		let dm = mark;
		// pot?
		let pot = false;
		dm.buffs.forEach(b=>{
			if (b===ResourceType.Tincture) pot = true;
		});
		// hover text
		let time = "[" + dm.displayTime.toFixed(2) + "] ";
		let untargetableStr = localize({en: "Untargetable", zh: "不可选中"}) as string;
		let info = "";
		if (untargetable) {
			info = (0).toFixed(2) + " (" + dm.source + ")";
		} else {
			info = dm.potency.getAmount({tincturePotencyMultiplier: g_renderingProps.tincturePotencyMultiplier}).toFixed(2) + " (" + dm.source + ")";
			if (pot) info += " (" + localize({en: "pot", zh: "爆发药"}) + ")";
		}

		testInteraction(
			{x: x-3, y: timelineOriginY, w: 6, h: 6},
			untargetable ? [time + info, untargetableStr] : [time + info]
		);
	});
}
function drawLucidMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: LucidMarkElem[]
) {
	g_ctx.fillStyle = g_colors.timeline.lucidTickMark;
	elems.forEach(mark=>{
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.time, scale);
		g_ctx.beginPath();
		g_ctx.moveTo(x-3, timelineOriginY);
		g_ctx.lineTo(x+3, timelineOriginY);
		g_ctx.lineTo(x, timelineOriginY + 6);
		g_ctx.fill();

		// hover text
		let hoverText = "[" + mark.displayTime.toFixed(2) + "] " + mark.source;
		testInteraction(
			{x: x-3, y: timelineOriginY, w: 6, h: 6},
			[hoverText]
		);
	});
}

type Rect = {x: number, y: number ,w: number, h: number};
function drawSkills(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: SkillElem[]
) {
	let greyLockBars: Rect[] = [];
	let purpleLockBars: Rect[] = [];
	let gcdBars: Rect[] = [];
	let snapshots: number[] = [];
	let llCovers: Rect[] = [];
	let potCovers: Rect[] = [];
	let skillIcons: {elem: SkillElem, x: number, y: number}[] = []; // tmp
	let skillsTopY = timelineOriginY + 14;
	elems.forEach(e=>{
		let skill = e as SkillElem;
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(skill.time, scale);
		let y = skill.isGCD ? (skillsTopY + 14) : skillsTopY;
		// purple/grey bar
		let lockbarWidth = StaticFn.positionFromTimeAndScale(skill.lockDuration, scale);
		if (skill.isSpellCast) {
			purpleLockBars.push({x: x+c_barsOffset, y: y, w: lockbarWidth-c_barsOffset, h: 14});
			snapshots.push(x + StaticFn.positionFromTimeAndScale(skill.relativeSnapshotTime, scale));
		} else {
			greyLockBars.push({x: x+c_barsOffset, y: y, w: lockbarWidth-c_barsOffset, h: 28});
		}
		// green gcd recast bar
		if (skill.isGCD) {
			let recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			gcdBars.push({x: x+c_barsOffset, y: y + 14, w: recastWidth-c_barsOffset, h: 14});
		}
		// ll cover
		if (skill.node.hasBuff(ResourceType.LeyLines)) {
			llCovers.push({x: x, y: y + 28, w: 28, h: 4});
			if (skill.node.hasBuff(ResourceType.Tincture)) {
				potCovers.push({x: x, y: y + 32, w: 28, h: 4});
			}
		} else if (skill.node.hasBuff(ResourceType.Tincture)) {
			potCovers.push({x: x, y: y + 28, w: 28, h: 4});
		}
		// pot cover
		// skill icon
		let img = skillIconImages.get(skill.skillName);
		if (img) skillIcons.push({elem: e, x: x, y: y});
	});

	// purple
	g_ctx.fillStyle = g_colors.timeline.castBar;
	g_ctx.beginPath();
	purpleLockBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// snapshot bar
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = "rgba(151, 85, 239, 0.4)";
	g_ctx.beginPath();
	snapshots.forEach(x=>{
		g_ctx.moveTo(x, skillsTopY + 14);
		g_ctx.lineTo(x, skillsTopY + 28);
	});
	g_ctx.stroke();

	// green
	g_ctx.fillStyle = g_colors.timeline.gcdBar;
	g_ctx.beginPath();
	gcdBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// grey
	g_ctx.fillStyle = g_colors.timeline.lockBar;
	g_ctx.beginPath();
	greyLockBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// llCovers
	g_ctx.fillStyle = g_colors.timeline.llCover;
	g_ctx.beginPath();
	llCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// potCovers
	g_ctx.fillStyle = g_colors.timeline.potCover;
	g_ctx.beginPath();
	potCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// icons
	g_ctx.beginPath();
	skillIcons.forEach(icon=>{
		g_ctx.drawImage(skillIconImages.get(icon.elem.skillName), icon.x, icon.y, 28, 28);
		let node = icon.elem.node;
		// 1. description
		let description = localizeSkillName(icon.elem.skillName) + "@" + (icon.elem.displayTime).toFixed(2);
		if (node.hasBuff(ResourceType.LeyLines)) description += localize({en: " (LL)", zh: " (黑魔纹)"});
		if (node.hasBuff(ResourceType.Tincture)) description += localize({en: " (pot)", zh: "(爆发药)"});
		let lines = [description];
		let potency = node.getPotency({
			tincturePotencyMultiplier: g_renderingProps.tincturePotencyMultiplier,
			untargetable: bossIsUntargetable
		}).applied;
		// 2. potency
		if (node.getPotencies().length > 0) {
			lines.push(localize({en: "potency: ", zh: "威力："}) + potency.toFixed(2));
		}
		// 3. duration
		let lockDuration = 0;
		if (node.tmp_endLockTime!==undefined && node.tmp_startLockTime!==undefined) {
			lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
		}
		lines.push(localize({en: "duration: ", zh: "耗时："}) + lockDuration.toFixed(2));
		testInteraction(
			{x: icon.x, y: icon.y, w: 28, h: 28},
			lines,
			()=>{
				controller.timeline.onClickTimelineAction(node, g_clickEvent ? g_clickEvent.shiftKey : false);
				scrollEditorToFirstSelected();
			},
			true);
	});
}

function drawCursor(x: number, color: string, tip: string) {
	g_ctx.fillStyle = color;
	g_ctx.beginPath();
	g_ctx.moveTo(x-3, 0);
	g_ctx.lineTo(x+3, 0);
	g_ctx.lineTo(x, 6);
	g_ctx.fill();

	g_ctx.strokeStyle = color;
	g_ctx.lineWidth = 1;
	g_ctx.beginPath();
	g_ctx.moveTo(x, 0);
	g_ctx.lineTo(x, c_maxTimelineHeight);
	g_ctx.stroke();

	testInteraction({x: x-3, y: 0, w: 6, h: c_maxTimelineHeight}, [tip]);
}

function drawRuler(originX: number) : number {
	// ruler bg
	g_ctx.fillStyle = g_colors.timeline.ruler;
	g_ctx.fillRect(0, 0, g_visibleWidth, 30);
	let t = StaticFn.timeFromPositionAndScale(g_mouseX - originX, g_renderingProps.scale);
	testInteraction(
		{x: 0, y: 0, w: g_visibleWidth, h: 30},
		[(t - g_renderingProps.countdown).toFixed(2)],
		()=>{
			if (t < controller.game.time) {
				controller.displayHistoricalState(t, undefined); // replay the actions as-is
			} else {
				controller.displayCurrentState();
			}
		});

	// ruler marks
	g_ctx.lineCap = "butt";
	g_ctx.beginPath();
	let pixelsPerSecond = g_renderingProps.scale * 100;
	let countdownPadding = g_renderingProps.countdown * pixelsPerSecond;
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = g_colors.text;
	g_ctx.textBaseline = "alphabetic";

	g_ctx.font = "13px monospace";
	g_ctx.textAlign = "center";
	g_ctx.fillStyle = g_colors.text;
	const cullThreshold = 50;
	if (pixelsPerSecond >= 6) {
		for (let x = 0; x < g_renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond) {
			let pos = originX + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				g_ctx.moveTo(pos, 0);
				g_ctx.lineTo(pos, 6);
			}
		}
		for (let x = -pixelsPerSecond; x >= -countdownPadding; x -= pixelsPerSecond) {
			let pos = originX + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				g_ctx.moveTo(pos, 0);
				g_ctx.lineTo(pos, 6);
			}
		}
	}
	for (let x = 0; x < g_renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond * 5) {
		let pos = originX + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			g_ctx.moveTo(pos, 0);
			g_ctx.lineTo(pos, 10);
			g_ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	for (let x = -pixelsPerSecond * 5; x >= -countdownPadding; x -= pixelsPerSecond * 5) {
		let pos = originX + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			g_ctx.moveTo(pos, 0);
			g_ctx.lineTo(pos, 10);
			g_ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	g_ctx.stroke();

	return 30;
}

function drawMarkerTracks(originX: number, originY: number) : number {

	/*
	// don't even have to let controller know of collapse/expand state
	// because it's purely a display thing.
	let bDrawMarkers = false;
	let str = localStorage.getItem("timelineDisplay_drawMarkers");
	if (str !== null) {
		bDrawMarkers = parseInt(str) > 0;
	}
	let collapseBarOnClick = ()=>{
		localStorage.setItem("timelineDisplay_drawMarkers", (bDrawMarkers ? 0 : 1).toString());
		updateTimelineView();
	};
	 */

	//if (bDrawMarkers) {
		// make trackbins
		let trackBins = new Map<number, MarkerElem[]>();
		g_renderingProps.allMarkers.forEach(marker=>{
			let trackBin = trackBins.get(marker.track);
			if (trackBin === undefined) trackBin = [];
			trackBin.push(marker);
			trackBins.set(marker.track, trackBin);
		});

		// tracks background
		g_ctx.beginPath();
		let numTracks = 0;
		let hasUntargetableTrack = false;
		for (let k of trackBins.keys()) {
			numTracks = Math.max(numTracks, k + 1);
			if (k === UntargetableMarkerTrack) hasUntargetableTrack = true;
		}
		if (hasUntargetableTrack) numTracks += 1;
		let markerTracksBottomY = originY + numTracks * c_trackHeight;
		g_ctx.fillStyle = g_colors.timeline.tracks;
		for (let i = 0; i < numTracks; i += 2) {
			let top = markerTracksBottomY - (i + 1) * c_trackHeight;
			g_ctx.rect(0, top, g_visibleWidth, c_trackHeight);
		}
		g_ctx.fill();

		// timeline markers
		drawMarkers(g_renderingProps.countdown, g_renderingProps.scale, originY, markerTracksBottomY, originX, trackBins);

		let markersHeight = numTracks * c_trackHeight;

		/*
		// collapse bar on the left
		let handle: Rect = {
			x: 0,
			y: originY,
			w: c_trackHeight,
			h: markersHeight
		};
		g_ctx.fillStyle = g_colors.bgMediumContrast;
		g_ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		g_ctx.fillStyle = g_colors.emphasis;
		g_ctx.beginPath();
		g_ctx.moveTo(c_trackHeight/2 - 3, originY + c_trackHeight/2 - 3);
		g_ctx.lineTo(c_trackHeight/2 + 3, originY + c_trackHeight/2 - 3);
		g_ctx.lineTo(c_trackHeight/2, originY + c_trackHeight/2 + 3);
		g_ctx.fill();
		testInteraction(handle, ["click to collapse"], collapseBarOnClick, true);
		 */

		return markersHeight;
	//}
	/*
	else {
		let handle: Rect = {
			x: 0,
			y: originY,
			w: g_visibleWidth,
			h: c_trackHeight
		};
		g_ctx.fillStyle = g_colors.bgMediumContrast;
		g_ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		g_ctx.fillStyle = g_colors.emphasis;
		g_ctx.beginPath();
		g_ctx.moveTo(c_trackHeight/2 + 3, originY + c_trackHeight/2);
		g_ctx.lineTo(c_trackHeight/2 - 3, originY + c_trackHeight/2 - 3);
		g_ctx.lineTo(c_trackHeight/2 - 3, originY + c_trackHeight/2 + 3);
		g_ctx.fill();
		g_ctx.textAlign = "left";
		g_ctx.fillText("Timeline markers", c_trackHeight + 5, originY + 10);
		testInteraction(handle, ["click to expand"], collapseBarOnClick, true);

		return c_trackHeight;
	}
	 */

}

function drawTimeline(originX:  number, originY: number) : number {

	// organize elems into bins
	let elemBins = new Map<ElemType, TimelineElem[]>();
	g_renderingProps.elements.forEach(e=>{
		let arr = elemBins.get(e.type) ?? [];
		arr.push(e);
		elemBins.set(e.type, arr);
	});

	// mp tick marks
	drawMPTickMarks(g_renderingProps.countdown, g_renderingProps.scale, originX, originY, elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[] ?? []);

	// damage marks
	drawDamageMarks(g_renderingProps.countdown, g_renderingProps.scale, originX, originY, elemBins.get(ElemType.DamageMark) as DamageMarkElem[] ?? []);

	// lucid marks
	drawLucidMarks(g_renderingProps.countdown, g_renderingProps.scale, originX, originY, elemBins.get(ElemType.LucidMark) as LucidMarkElem[] ?? []);

	// warning marks (polyglot overcap)
	drawWarningMarks(g_renderingProps.countdown, g_renderingProps.scale, originX, originY, elemBins.get(ElemType.WarningMark) as WarningMarkElem[] ?? []);

	// skills
	drawSkills(g_renderingProps.countdown, g_renderingProps.scale, originX, originY, elemBins.get(ElemType.Skill) as SkillElem[] ?? []);

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(g_renderingProps.countdown, g_renderingProps.scale);
	g_ctx.fillStyle = g_colors.timeline.countdown;
	// make it cover the left padding as well:
	g_ctx.fillRect(originX - c_leftBufferWidth, 0, countdownWidth + c_leftBufferWidth, g_renderingProps.timelineHeight);

	// selection rect
	if (g_renderingProps.showSelection) {
		g_ctx.fillStyle = "rgba(147, 112, 219, 0.15)";
		let selectionLeftPx = originX + g_renderingProps.selectionStartX;
		let selectionWidthPx = g_renderingProps.selectionEndX - g_renderingProps.selectionStartX;
		g_ctx.fillRect(selectionLeftPx, originY, selectionWidthPx, c_timelineHeight);
		g_ctx.strokeStyle = "rgba(147, 112, 219, 0.5)";
		g_ctx.lineWidth = 1;
		g_ctx.beginPath();
		g_ctx.moveTo(selectionLeftPx, originY);
		g_ctx.lineTo(selectionLeftPx, originY + c_timelineHeight);
		g_ctx.moveTo(selectionLeftPx + selectionWidthPx, originY);
		g_ctx.lineTo(selectionLeftPx + selectionWidthPx, originY + c_timelineHeight);
		g_ctx.stroke();
	}

	// view only cursor
	(elemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach(cursor=>{
		let vcursor = cursor as ViewOnlyCursorElem
		if (vcursor.enabled) {
			let x = originX + StaticFn.positionFromTimeAndScale(cursor.time, g_renderingProps.scale);
			drawCursor(x, g_colors.historical, localize({en: "cursor: ", zh: "光标："}) + vcursor.displayTime.toFixed(2));
		}
	});

	// cursor
	(elemBins.get(ElemType.s_Cursor) ?? []).forEach(elem=>{
		let cursor = elem as CursorElem;
		let x = originX + StaticFn.positionFromTimeAndScale(cursor.time, g_renderingProps.scale);
		drawCursor(x, g_colors.emphasis, localize({en: "cursor: ", zh: "光标："}) + cursor.displayTime.toFixed(2));
	});

	return c_timelineHeight;
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawEverything() {

	let timelineOrigin = -g_visibleLeft + c_leftBufferWidth; // fragCoord.x (...) of time=0.
	let currentHeight = 0;

	// background white
	g_ctx.fillStyle = g_colors.background;
	// add 1 here because this scaled dimension from dpr may not perfectly cover the entire canvas
	g_ctx.fillRect(0, 0, g_visibleWidth + 1, g_renderingProps.timelineHeight + 1);
	testInteraction({x: 0, y: 0, w: g_visibleWidth, h: c_maxTimelineHeight}, undefined, onClickTimelineBackground);

	currentHeight += drawRuler(timelineOrigin);

	currentHeight += drawMarkerTracks(timelineOrigin, currentHeight);

	currentHeight += drawTimeline(timelineOrigin, currentHeight);

	// interactive layer
	if (g_mouseHovered) {
		if (g_activeHoverTip) {
			drawTip(g_activeHoverTip, g_visibleWidth, g_renderingProps.timelineHeight);
		}
		if (g_isClickUpdate && g_activeOnClick) {
			g_activeOnClick();
		}
	}
}

// (layers for optimization, in case one day rendering becomes the performance bottleneck again: )
// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM

export let timelineCanvasOnMouseMove: (x: number, y: number) => void = (x:number, y: number) => {};
export let timelineCanvasOnMouseEnter: () => void = () => {};
export let timelineCanvasOnMouseLeave: () => void = () => {};
export let timelineCanvasOnClick: (e: any) => void = (e: any) => {};
export let timelineCanvasOnKeyDown: (e: any) => void = (e: any) => {};

export let timelineCanvasGetPointerMouse: () => boolean = () => { return readback_pointerMouse; }

export function TimelineCanvas(props: {
	timelineHeight: number,
	visibleLeft: number,
	visibleWidth: number,
	version: number
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const dpr = window.devicePixelRatio;
	let scaledWidth = props.visibleWidth * dpr;
	let scaledHeight = props.timelineHeight * dpr;

	const [mouseX, setMouseX] = useState(0);
	const [mouseY, setMouseY] = useState(0);
	const [mouseHovered, setMouseHovered] = useState(false);
	const [clickCounter, setClickCounter] = useState(0);
	const [keyCounter, setKeyCounter] = useState(0);

	// initialization
	useEffect(()=>{
		timelineCanvasOnMouseMove = (x: number, y: number) => {
			g_mouseX = x;
			g_mouseY = y;
			setMouseX(g_mouseX);
			setMouseY(g_mouseY);
		};
		timelineCanvasOnMouseEnter = () => {
			setMouseHovered(true);
			g_mouseHovered = true;
		};
		timelineCanvasOnMouseLeave = () => {
			setMouseHovered(false);
			g_mouseHovered = false;
		};
		timelineCanvasOnClick = (e: any) => {
			setClickCounter(c => c + 1);
			g_isClickUpdate = true;
			g_clickEvent = e;
		};
		timelineCanvasOnKeyDown = (e: any) => {
			setKeyCounter(k => k + 1);
			g_isKeyboardUpdate = true;
			g_keyboardEvent = e;
			if (g_keyboardEvent.key === "Backspace" || g_keyboardEvent.key === "Delete") {
				let firstSelected = controller.record.getFirstSelection();
				if (firstSelected) {
					controller.rewindUntilBefore(firstSelected, false);
					controller.displayCurrentState();
					controller.updateAllDisplay();
					controller.autoSave();
				}
			}
		};
	}, []);

	// update when dependency props change
	let bgProps = [
		props.visibleLeft, props.visibleWidth, mouseX, mouseY, mouseHovered, clickCounter, keyCounter, props.version, dpr
	];
	useEffect(()=>{
		g_activeHoverTip = undefined;
		g_activeOnClick = undefined;
		g_visibleLeft = props.visibleLeft;
		g_visibleWidth = props.visibleWidth;
		g_colors = getCurrentThemeColors();

		cachedPointerMouse = readback_pointerMouse;

		// gather global values
		g_renderingProps = controller.getTimelineRenderingProps();

		// draw
		let currentContext = canvasRef.current?.getContext("2d", {alpha: false});
		if (currentContext) {
			g_ctx = currentContext;
			g_ctx.scale(dpr, dpr);
			drawEverything();
			g_ctx.scale(1 / dpr, 1 / dpr);
		}

		// potential update due to pointer change
		if (cachedPointerMouse !== readback_pointerMouse) {
			updateTimelineView();
		}

		// reset event flags
		g_isClickUpdate = false;
		g_isKeyboardUpdate = false;
	}, bgProps);

	return <canvas ref={canvasRef} width={Math.ceil(scaledWidth)} height={Math.ceil(scaledHeight)} tabIndex={0} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		pointerEvents: "none",
		cursor: readback_pointerMouse ? "pointer" : "default",
	}}/>;
}
