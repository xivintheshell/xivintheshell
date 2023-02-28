import React, {useEffect, useRef, useState} from 'react'
import {
	CursorElem,
	DamageMarkElem,
	ElemType, LucidMarkElem,
	MarkerElem,
	MPTickMarkElem,
	SkillElem,
	TimelineElem,
	ViewOnlyCursorElem
} from "../Controller/Timeline";
import {StaticFn} from "./Common";
import {ResourceType} from "../Game/Common";
// @ts-ignore
import {skillIconImages} from "./Skills";
import {controller} from "../Controller/Controller";
import {localizeSkillName} from "./Localization";

type BackgroundProps = [
	number,
	number,
	number,
	number,
	number,
	number,
	Map<number, MarkerElem[]>,
	TimelineElem[],
	number,
	number,
	number,
	boolean,
	number
];

const trackHeight = 14;
const trackBottomMargin = 6;
const maxTimelineHeight = 400;

let g_isClickUpdate = false;
let g_mouseX = 0;
let g_mouseY = 0;

let g_activeHoverTip: string[] | undefined = undefined;
let g_activeOnClick: (()=>void) | undefined = undefined;

let g_tincturePotencyMultiplier = 1;

let readback_pointerMouse = false;

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
		if (pointerMouse === true) readback_pointerMouse = true;
	}
}

function drawTip(ctx: CanvasRenderingContext2D, lines: string[], canvasWidth: number, canvasHeight: number) {
	if (!lines.length) return;

	const lineHeight = 14;
	const horizontalPadding = 8;
	const verticalPadding = 4;
	ctx.font = "12px monospace";

	let maxLineWidth = -1;
	lines.forEach(l=>{ maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width); });
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
	ctx.strokeStyle = "grey";
	ctx.lineWidth = 1;
	ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
	ctx.fillRect(x, y, boxWidth, boxHeight);
	ctx.strokeRect(x, y, boxWidth, boxHeight);

	ctx.fillStyle = "black";
	ctx.textBaseline = "top";
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], x + horizontalPadding, y + i * lineHeight + 2 + verticalPadding);
	}
}

// todo: optimize by sorting and batching?
function drawMarkers(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	markerTracksBottomY: number, // bottom Y of track 0
	timelineOrigin: number,
	trackBins: Map<number, MarkerElem[]>
) {
	// markers
	ctx.lineCap = "round";
	ctx.lineWidth = 4;
	ctx.font = "11px monospace";
	ctx.textAlign = "left";
	trackBins.forEach((elems, track)=>{
		let top = markerTracksBottomY - (track + 1) * trackHeight;
		for (let i = 0; i < elems.length; i++) {
			let m = elems[i];
			let left = timelineOrigin + StaticFn.positionFromTimeAndScale(m.time + countdown, scale);
			if (m.duration > 0) {
				let markerWidth = StaticFn.positionFromTimeAndScale(m.duration, scale);
				if (m.showText) {
					ctx.fillStyle = m.color + "7f";
					ctx.fillRect(left, top, markerWidth, trackHeight);
					ctx.fillStyle = "black";
					ctx.fillText(m.description, left + trackHeight / 2, top + 10);
				} else {
					ctx.strokeStyle = m.color;
					ctx.moveTo(left, top + trackHeight / 2);
					ctx.lineTo(left + markerWidth, top + trackHeight / 2);
					ctx.stroke();
				}
			} else {
				ctx.fillStyle = m.color;
				ctx.beginPath();
				ctx.ellipse(left, top + trackHeight / 2, 4, 4, 0, 0, 2 * Math.PI);
				ctx.fill();
				if (m.showText) {
					ctx.fillStyle = "black";
					ctx.beginPath()
					ctx.fillText(m.description, left + trackHeight / 2, top + 10);
				}
			}
		}
	});
}

function drawMPTickMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: MPTickMarkElem[]
) {
	ctx.lineWidth = 1;
	ctx.strokeStyle = "#caebf6";
	ctx.beginPath();
	elems.forEach(tick=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(tick.time, scale);
		ctx.moveTo(x, 30);
		ctx.lineTo(x, maxTimelineHeight);

		testInteraction(
			{x: x-2, y: 30, w: 4, h: maxTimelineHeight-30},
			[tick.displayTime.toFixed(2) + " " + tick.source]
		);
	});
	ctx.stroke();
}

function drawDamageMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: DamageMarkElem[]
) {
	ctx.fillStyle = "red";
	elems.forEach(mark=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		ctx.beginPath();
		ctx.moveTo(x-3, 0);
		ctx.lineTo(x+3, 0);
		ctx.lineTo(x, 6);
		ctx.fill();

		let dm = mark;
		// pot?
		let pot = false;
		dm.buffs.forEach(b=>{
			if (b===ResourceType.Tincture) pot = true;
		});
		// potency
		let potency = dm.potency;
		if (pot) potency *= g_tincturePotencyMultiplier;
		// hover text
		let hoverText = "[" + dm.displayTime.toFixed(2) + "] " + potency.toFixed(2) + " (" + dm.source + ")";
		if (pot) hoverText += " (pot)"
		testInteraction(
			{x: x-3, y: 0, w: 6, h: 6},
			[hoverText]
		);
	});
}
function drawLucidMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: LucidMarkElem[]
) {
	ctx.fillStyle = "#88cae0";
	elems.forEach(mark=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		ctx.beginPath();
		ctx.moveTo(x-3, 0);
		ctx.lineTo(x+3, 0);
		ctx.lineTo(x, 6);
		ctx.fill();

		// hover text
		let hoverText = "[" + mark.displayTime.toFixed(2) + "] " + mark.source;
		testInteraction(
			{x: x-3, y: 0, w: 6, h: 6},
			[hoverText]
		);
	});
}

type Rect = {x: number, y: number ,w: number, h: number};
function drawSkills(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	skillsTopY: number,
	elems: SkillElem[]
) {
	let greyLockBars: Rect[] = [];
	let purpleLockBars: Rect[] = [];
	let gcdBars: Rect[] = [];
	let snapshots: number[] = [];
	let llCovers: Rect[] = [];
	let skillIcons: {elem: SkillElem, x: number, y: number}[] = []; // tmp
	elems.forEach(e=>{
		let skill = e as SkillElem;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(skill.time, scale);
		let y = skill.isGCD ? (skillsTopY + 14) : skillsTopY;
		// purple/grey bar
		let lockbarWidth = StaticFn.positionFromTimeAndScale(skill.lockDuration, scale);
		if (skill.isSpellCast) {
			purpleLockBars.push({x: x, y: y, w: lockbarWidth, h: 14});
			snapshots.push(x + StaticFn.positionFromTimeAndScale(skill.relativeSnapshotTime, scale));
		} else {
			greyLockBars.push({x: x, y: y, w: lockbarWidth, h: 28});
		}
		// green gcd recast bar
		if (skill.isGCD) {
			let recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			gcdBars.push({x: x, y: y + 14, w: recastWidth, h: 14});
		}
		if (skill.node.hasBuff(ResourceType.LeyLines)) {
			llCovers.push({x: x, y: y + 28, w: 28, h: 4});
		}
		// skill icon
		let img = skillIconImages.get(skill.skillName);
		if (img) skillIcons.push({elem: e, x: x, y: y});
	});

	// purple
	ctx.fillStyle = "#e7d9ee";
	ctx.beginPath();
	purpleLockBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r);
	});
	ctx.fill();

	// snapshot bar
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(151, 85, 239, 0.2)";
	ctx.beginPath();
	snapshots.forEach(x=>{
		ctx.moveTo(x, skillsTopY + 14);
		ctx.lineTo(x, skillsTopY + 28);
	});
	ctx.stroke();

	// green
	ctx.fillStyle = "#dbf3d6";
	ctx.beginPath();
	gcdBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r);
	});
	ctx.fill();

	// grey
	ctx.fillStyle = "#9d9d9d";
	ctx.beginPath();
	greyLockBars.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r);
	});
	ctx.fill();

	// llCovers
	ctx.fillStyle = "#ffdc4f";
	ctx.beginPath();
	llCovers.forEach(r=>{
		ctx.rect(r.x, r.y, r.w, r.h);
		testInteraction(r);
	});
	ctx.fill();

	// icons
	ctx.beginPath();
	skillIcons.forEach(icon=>{
		ctx.drawImage(skillIconImages.get(icon.elem.skillName), icon.x, icon.y, 28, 28);
		let node = icon.elem.node;
		let description = localizeSkillName(icon.elem.skillName) + "@" + (icon.elem.displayTime).toFixed(2);
		if (node.hasBuff(ResourceType.LeyLines)) description += " (LL)";
		if (node.hasBuff(ResourceType.Tincture)) description += " (pot)";
		let lines = [description];
		let potency = node.getPotency();
		if (potency > 0) {
			if (node.hasBuff(ResourceType.Tincture))  {
				potency *= g_tincturePotencyMultiplier;
			}
			lines.push("potency: " + potency.toFixed(2));
			let lockDuration = 0;
			if (node.tmp_endLockTime!==undefined && node.tmp_startLockTime!==undefined) {
				lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
			}
			lines.push("duration: " + lockDuration.toFixed(2));
		}
		testInteraction(
			{x: icon.x, y: icon.y, w: 28, h: 28},
			lines,
			()=>{

			},
			true
		);
	});
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, color: string, tip: string) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x-3, 0);
	ctx.lineTo(x+3, 0);
	ctx.lineTo(x, 6);
	ctx.fill();

	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, maxTimelineHeight);
	ctx.stroke();

	testInteraction({x: x-3, y: 0, w: 6, h: maxTimelineHeight}, [tip]);
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawTimeline(ctx: CanvasRenderingContext2D, [timelineWidth, timelineHeight, visibleLeft, visibleWidth, countdown, scale, trackBins, elements, tincturePotencyMultiplier, mouseX, mouseY, mouseHovered, clickCounter]: BackgroundProps) {

	let timelineOrigin = -visibleLeft;

	// background white
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, visibleWidth, timelineHeight);
	testInteraction({x: 0, y: 0, w: visibleWidth, h: maxTimelineHeight}, undefined, ()=>{
		// clicked on background:
		controller.record.unselectAll();
		controller.displayCurrentState();
	});

	// ruler bg
	ctx.fillStyle = "#ececec";
	ctx.fillRect(0, 0, visibleWidth, 30);
	let t = StaticFn.timeFromPositionAndScale(mouseX - timelineOrigin, scale);
	testInteraction(
		{x: 0, y: 0, w: visibleWidth, h: 30},
		[(t - countdown).toFixed(2)],
		()=>{
			if (t < controller.game.time) {
				controller.displayHistoricalState(t, undefined); // replay the actions as-is
			} else {
				controller.displayCurrentState();
			}
		});

	// ruler marks
	ctx.lineCap = "butt";
	ctx.beginPath();
	let pixelsPerSecond = scale * 100;
	let countdownPadding = countdown * pixelsPerSecond;
	ctx.lineWidth = 1;
	ctx.strokeStyle = "black";
	ctx.textBaseline = "alphabetic";

	ctx.font = "13px monospace";
	ctx.textAlign = "center";
	ctx.fillStyle = "black";
	const cullThreshold = 50;
	if (pixelsPerSecond >= 6) {
		for (let x = 0; x < timelineWidth - countdownPadding; x += pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
		for (let x = -pixelsPerSecond; x >= -countdownPadding; x -= pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
	}
	for (let x = 0; x < timelineWidth - countdownPadding; x += pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	for (let x = -pixelsPerSecond * 5; x >= -countdownPadding; x -= pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	ctx.stroke();

	// tracks background
	ctx.beginPath();
	let numTracks = 0;
	for (let k of trackBins.keys()) {
		numTracks = Math.max(numTracks, k + 1);
	}
	let markerTracksOriginY = 30 + numTracks * trackHeight;
	ctx.fillStyle = "#f3f3f3";
	for (let i = 0; i < numTracks; i += 2) {
		let top = markerTracksOriginY - (i + 1) * trackHeight;
		ctx.rect(0, top, visibleWidth, trackHeight);
	}
	ctx.fill();

	// organize elems into bins
	let elemBins = new Map<ElemType, TimelineElem[]>();
	elements.forEach(e=>{
		let arr = elemBins.get(e.type) ?? [];
		arr.push(e);
		elemBins.set(e.type, arr);
	});

	// mp tick marks
	drawMPTickMarks(ctx, countdown, scale, timelineOrigin, elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[] ?? []);

	// timeline markers
	drawMarkers(ctx, countdown, scale, markerTracksOriginY, timelineOrigin, trackBins);

	// damage marks
	drawDamageMarks(ctx, countdown, scale, timelineOrigin, elemBins.get(ElemType.DamageMark) as DamageMarkElem[] ?? []);

	// lucid marks
	drawLucidMarks(ctx, countdown, scale, timelineOrigin, elemBins.get(ElemType.LucidMark) as LucidMarkElem[] ?? []);

	// skills
	let skillsTopY = 30 + numTracks * trackHeight + trackBottomMargin;
	drawSkills(ctx, countdown, scale, timelineOrigin, skillsTopY, elemBins.get(ElemType.Skill) as SkillElem[] ?? []);

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(countdown, scale);
	ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
	ctx.fillRect(timelineOrigin, 0, countdownWidth, timelineHeight);

	// view only cursor
	(elemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach(cursor=>{
		let vcursor = cursor as ViewOnlyCursorElem
		if (vcursor.enabled) {
			let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, scale);
			drawCursor(ctx, x, "darkorange", vcursor.displayTime.toFixed(2));
		}
	});

	// cursor
	(elemBins.get(ElemType.s_Cursor) ?? []).forEach(elem=>{
		let cursor = elem as CursorElem;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, scale);
		drawCursor(ctx, x, "black", cursor.displayTime.toFixed(2));
	});

	// interactive layer
	if (mouseHovered) {
		if (g_activeHoverTip) {
			drawTip(ctx, g_activeHoverTip, visibleWidth, timelineHeight);
		}
		if (g_isClickUpdate && g_activeOnClick) {
			g_activeOnClick();
		}
	}
}

// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM

export function TimelineCanvas(props: {
	timelineWidth: number,
	timelineHeight: number,
	visibleLeft: number,
	visibleWidth: number,
	countdown: number,
	scale: number,
	tincturePotencyMultiplier: number,
	elements: TimelineElem[],
	trackBins: Map<number, MarkerElem[]>
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

	// background layer
	let bgProps : BackgroundProps = [
		props.timelineWidth,
		props.timelineHeight,
		props.visibleLeft,
		props.visibleWidth,
		props.countdown,
		props.scale,
		props.trackBins,
		props.elements,
		props.tincturePotencyMultiplier,
		mouseX, mouseY, mouseHovered, clickCounter
	];
	useEffect(()=>{
		g_activeHoverTip = undefined;
		g_activeOnClick = undefined;
		g_tincturePotencyMultiplier = props.tincturePotencyMultiplier;
		readback_pointerMouse = false;
		let ctx = canvasRef.current?.getContext("2d", {alpha: false});
		if (ctx) {
			ctx.scale(dpr, dpr);
			drawTimeline(ctx, bgProps);
			ctx.scale(1 / dpr, 1 / dpr);
		}
		// reset click flag
		g_isClickUpdate = false;
	}, bgProps);

	return <canvas ref={canvasRef} width={scaledWidth} height={scaledHeight} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		top: 0,
		left: props.visibleLeft,
		cursor: readback_pointerMouse ? "pointer" : "default"
	}} onMouseMove={e=>{
		if (canvasRef.current) {
			let rect = canvasRef.current.getBoundingClientRect();
			g_mouseX = e.clientX - rect.left;
			g_mouseY = e.clientY - rect.top;
			setMouseX(g_mouseX);
			setMouseY(g_mouseY);
		}
	}} onMouseEnter={e=>{
		setMouseHovered(true);
	}} onMouseLeave={e=>{
		setMouseHovered(false);
	}} onClick={e=>{
		setClickCounter(clickCounter + 1);
		g_isClickUpdate = true;
	}}/>;
}

/*
Interactive element:
has a bounding box which is also its interactive area

when attempting to draw, check its bbox. If outside of canvas, just do nothing.
otherwise, draw it normally.
then check if mouse is on top. If so, set is as the focused element.
After all interactive elements are drawn, interact with the focused element:
 - if it was a mouseMoved event, draw its tip
 - if it was a mouseDown event, call its function

If all elements are drawn and no focused element detected, just return.

 */