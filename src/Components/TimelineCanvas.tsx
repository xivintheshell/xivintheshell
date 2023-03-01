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
// @ts-ignore
import {updateStatsDisplay} from "./Timeline"
import {ContentNode, StaticFn} from "./Common";
import {ResourceType} from "../Game/Common";
// @ts-ignore
import {skillIconImages} from "./Skills";
import {controller} from "../Controller/Controller";
import {localizeSkillName} from "./Localization";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";

export type TimelineRenderingProps = {
	timelineWidth: number,
	timelineHeight: number,
	countdown: number,
	scale: number,
	tincturePotencyMultiplier: number
	markers: MarkerElem[],
	elements: TimelineElem[],
	selectionStartX: number,
	selectionEndX: number,
}

const trackHeight = 14;
const trackBottomMargin = 6;
const maxTimelineHeight = 400;

let g_visibleLeft = 0;
let g_visibleWidth = 0;
let g_isClickUpdate = false;
let g_clickEvent: any = undefined; // valid when isClickUpdate is true
let g_isKeyboardUpdate = false;
let g_keyboardEvent: any = undefined;
let g_mouseX = 0;
let g_mouseY = 0;
let g_mouseHovered = false;

// updated on mouse enter/leave, updated and reset on every draw
let g_activeHoverTip: string[] | undefined = undefined;
let g_activeOnClick: (()=>void) | undefined = undefined;
// updated on mouse click, updated only when clicked
let g_activeOnKeyDown: (()=>void) | undefined = undefined;

let renderingProps: TimelineRenderingProps = {
	timelineWidth: 0,
	timelineHeight: 0,
	countdown: 0,
	scale: 1,
	tincturePotencyMultiplier: 1,
	markers: [],
	elements: [],
	selectionStartX: 0,
	selectionEndX: 0,
};

let readback_pointerMouse = false;

// todo: event capture mask? So can provide a layer that overwrites keyboard event only and not affect the rest
// all coordinates in canvas space
function testInteraction(
	rect: Rect,
	hoverTip?: string[],
	onClick?: ()=>void,
	pointerMouse?: boolean,
	onKeyDown?: ()=>void)
{
	if (g_mouseX >= rect.x && g_mouseX < rect.x + rect.w && g_mouseY >= rect.y && g_mouseY < rect.y + rect.h) {
		g_activeHoverTip = hoverTip;
		g_activeOnClick = onClick;
		if (pointerMouse === true) readback_pointerMouse = true;
		if (g_isClickUpdate) g_activeOnKeyDown = onKeyDown;
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
			let onClick = ()=>{
				let success = controller.timeline.deleteMarker(m);
				console.assert(success);
				setEditingMarkerValues(m);
			};
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
				testInteraction(
					{x: left, y: top, w: Math.max(markerWidth, trackHeight), h: trackHeight},
					["[" + m.time + "] " + m.description],
					onClick);
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
				testInteraction(
					{x: left - trackHeight / 2, y: top, w: trackHeight, h: trackHeight},
					["[" + m.time + "] " + m.description],
					onClick);
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
		if (pot) potency *= renderingProps.tincturePotencyMultiplier;
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
				potency *= renderingProps.tincturePotencyMultiplier;
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
				controller.timeline.onClickTimelineAction(node, g_clickEvent ? g_clickEvent.shiftKey : false);
			},
			true,
			()=>{
				if (g_keyboardEvent.key === "Backspace" || g_keyboardEvent.key === "Delete") {
					controller.rewindUntilBefore(controller.record.getFirstSelection(), false);
					controller.displayCurrentState();
					controller.updateAllDisplay();
					controller.autoSave();
				}
			}
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
function drawTimeline(ctx: CanvasRenderingContext2D) {

	let timelineOrigin = -g_visibleLeft;

	// background white
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, g_visibleWidth, renderingProps.timelineHeight);
	testInteraction({x: 0, y: 0, w: g_visibleWidth, h: maxTimelineHeight}, undefined, ()=>{
		// clicked on background:
		controller.record.unselectAll();
		controller.displayCurrentState();
		updateStatsDisplay({selectedDuration: 0});
	});

	// ruler bg
	ctx.fillStyle = "#ececec";
	ctx.fillRect(0, 0, g_visibleWidth, 30);
	let t = StaticFn.timeFromPositionAndScale(g_mouseX - timelineOrigin, renderingProps.scale);
	testInteraction(
		{x: 0, y: 0, w: g_visibleWidth, h: 30},
		[(t - renderingProps.countdown).toFixed(2)],
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
	let pixelsPerSecond = renderingProps.scale * 100;
	let countdownPadding = renderingProps.countdown * pixelsPerSecond;
	ctx.lineWidth = 1;
	ctx.strokeStyle = "black";
	ctx.textBaseline = "alphabetic";

	ctx.font = "13px monospace";
	ctx.textAlign = "center";
	ctx.fillStyle = "black";
	const cullThreshold = 50;
	if (pixelsPerSecond >= 6) {
		for (let x = 0; x < renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
		for (let x = -pixelsPerSecond; x >= -countdownPadding; x -= pixelsPerSecond) {
			let pos = timelineOrigin + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
				ctx.moveTo(pos, 0);
				ctx.lineTo(pos, 6);
			}
		}
	}
	for (let x = 0; x < renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	for (let x = -pixelsPerSecond * 5; x >= -countdownPadding; x -= pixelsPerSecond * 5) {
		let pos = timelineOrigin + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= g_visibleWidth + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, 10);
			ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	ctx.stroke();

	// make trackbins
	let trackBins = new Map<number, MarkerElem[]>();
	renderingProps.markers.forEach(marker=>{
		let trackBin = trackBins.get(marker.track);
		if (trackBin === undefined) trackBin = [];
		trackBin.push(marker);
		trackBins.set(marker.track, trackBin);
	});

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
		ctx.rect(0, top, g_visibleWidth, trackHeight);
	}
	ctx.fill();

	// organize elems into bins
	let elemBins = new Map<ElemType, TimelineElem[]>();
	renderingProps.elements.forEach(e=>{
		let arr = elemBins.get(e.type) ?? [];
		arr.push(e);
		elemBins.set(e.type, arr);
	});

	// mp tick marks
	drawMPTickMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[] ?? []);

	// timeline markers
	drawMarkers(ctx, renderingProps.countdown, renderingProps.scale, markerTracksOriginY, timelineOrigin, trackBins);

	// damage marks
	drawDamageMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.DamageMark) as DamageMarkElem[] ?? []);

	// lucid marks
	drawLucidMarks(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, elemBins.get(ElemType.LucidMark) as LucidMarkElem[] ?? []);

	// skills
	let skillsTopY = 30 + numTracks * trackHeight + trackBottomMargin;
	drawSkills(ctx, renderingProps.countdown, renderingProps.scale, timelineOrigin, skillsTopY, elemBins.get(ElemType.Skill) as SkillElem[] ?? []);

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(renderingProps.countdown, renderingProps.scale);
	ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
	ctx.fillRect(timelineOrigin, 0, countdownWidth, renderingProps.timelineHeight);

	// selection rect
	ctx.fillStyle = "rgba(147, 112, 219, 0.1)";
	let selectionLeftPx = timelineOrigin + renderingProps.selectionStartX;
	let selectionWidthPx = renderingProps.selectionEndX - renderingProps.selectionStartX;
	ctx.fillRect(selectionLeftPx, 0, selectionWidthPx, maxTimelineHeight);
	ctx.strokeStyle = "rgba(147, 112, 219, 0.5)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(selectionLeftPx, 0);
	ctx.lineTo(selectionLeftPx, maxTimelineHeight);
	ctx.moveTo(selectionLeftPx + selectionWidthPx, 0);
	ctx.lineTo(selectionLeftPx + selectionWidthPx, maxTimelineHeight);
	ctx.stroke();

	// view only cursor
	(elemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach(cursor=>{
		let vcursor = cursor as ViewOnlyCursorElem
		if (vcursor.enabled) {
			let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, renderingProps.scale);
			drawCursor(ctx, x, "darkorange", vcursor.displayTime.toFixed(2));
		}
	});

	// cursor
	(elemBins.get(ElemType.s_Cursor) ?? []).forEach(elem=>{
		let cursor = elem as CursorElem;
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(cursor.time, renderingProps.scale);
		drawCursor(ctx, x, "black", cursor.displayTime.toFixed(2));
	});

	// interactive layer
	if (g_mouseHovered) {
		if (g_activeHoverTip) {
			drawTip(ctx, g_activeHoverTip, g_visibleWidth, renderingProps.timelineHeight);
		}
		if (g_isClickUpdate && g_activeOnClick) {
			g_activeOnClick();
		}
		if (g_isKeyboardUpdate && g_activeOnKeyDown) {
			g_activeOnKeyDown();
		}

	}
}

// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM

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

	// background layer
	let bgProps = [
		props.visibleLeft, props.visibleWidth, mouseX, mouseY, mouseHovered, clickCounter, keyCounter, props.version
	];
	useEffect(()=>{
		g_activeHoverTip = undefined;
		g_activeOnClick = undefined;
		g_visibleLeft = props.visibleLeft;
		g_visibleWidth = props.visibleWidth;

		readback_pointerMouse = false;

		// gather global values
		renderingProps = controller.getTimelineRenderingProps();

		// draw
		let ctx = canvasRef.current?.getContext("2d", {alpha: false});
		if (ctx) {
			ctx.scale(dpr, dpr);
			drawTimeline(ctx);
			ctx.scale(1 / dpr, 1 / dpr);
		}

		// reset event flags
		g_isClickUpdate = false;
		g_isKeyboardUpdate = false;
	}, bgProps);

	return <canvas ref={canvasRef} width={scaledWidth} height={scaledHeight} tabIndex={0} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		top: 0,
		left: props.visibleLeft,
		outline: "none",
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
		g_mouseHovered = true;
	}} onMouseLeave={e=>{
		setMouseHovered(false);
		g_mouseHovered = false;
	}} onClick={e=>{
		setClickCounter(clickCounter + 1);
		g_isClickUpdate = true;
		g_clickEvent = e;
	}} onKeyDown={e=>{
		setKeyCounter(keyCounter + 1);
		g_isKeyboardUpdate = true;
		g_keyboardEvent = e;
	}}/>;
}
