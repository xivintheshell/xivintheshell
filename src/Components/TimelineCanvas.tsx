import React, {useEffect, useRef} from 'react'
import {ElemType, MarkerElem, SkillElem, TimelineElem} from "../Controller/Timeline";
import {StaticFn} from "./Common";

type BackgroundProps = [
	number,
	number,
	number,
	number,
	number,
	number,
	Map<number, MarkerElem[]>,
	TimelineElem[]
];

const trackHeight = 14;
const maxTimelineHeight = 400;

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
	elems: TimelineElem[]
) {
	ctx.lineWidth = 1;
	ctx.strokeStyle = "#caebf6";
	ctx.beginPath();
	elems.forEach(tick=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(tick.time, scale);
		ctx.moveTo(x, 30);
		ctx.lineTo(x, maxTimelineHeight);
	});
	ctx.stroke();
}

function drawDamageMarks(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	elems: TimelineElem[]
) {
	ctx.fillStyle = "red";
	elems.forEach(mark=>{
		let x = timelineOrigin + StaticFn.positionFromTimeAndScale(mark.time, scale);
		ctx.beginPath();
		ctx.moveTo(x-3, 0);
		ctx.lineTo(x+3, 0);
		ctx.lineTo(x, 6);
		ctx.fill();
	});
}

type Rect = {x: number, y: number ,w: number, h: number};
function drawSkills(
	ctx: CanvasRenderingContext2D,
	countdown: number,
	scale: number,
	timelineOrigin: number,
	skillsTopY: number,
	elems: TimelineElem[]
) {
	let greyLockBars: Rect[] = [];
	let purpleLockBars: Rect[] = [];
	let gcdBars: Rect[] = [];
	let snapshots: number[] = [];
	let llCovers: Rect[] = [];
	elems.forEach(e=>{
		let skill = e as SkillElem;

	});
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawTimeline(ctx: CanvasRenderingContext2D, [timelineWidth, timelineHeight, visibleLeft, visibleWidth, countdown, scale, trackBins, elements]: BackgroundProps) {

	let timelineOrigin = -visibleLeft;

	// background white
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, visibleWidth, timelineHeight);

	// ruler bg
	ctx.fillStyle = "#ececec";
	ctx.fillRect(0, 0, visibleWidth, 30);

	// ruler marks
	ctx.lineCap = "butt";
	ctx.beginPath();
	let pixelsPerSecond = scale * 100;
	let countdownPadding = countdown * pixelsPerSecond;
	ctx.lineWidth = 1;
	ctx.strokeStyle = "black";

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

	drawMarkers(ctx, countdown, scale, markerTracksOriginY, timelineOrigin, trackBins);

	const trackBottomMargin = 6;

	// organize elems into bins
	let elemBins = new Map<ElemType, TimelineElem[]>();
	elements.forEach(e=>{
		let arr = elemBins.get(e.type) ?? [];
		arr.push(e);
		elemBins.set(e.type, arr);
	});

	// mp tick marks
	drawMPTickMarks(ctx, countdown, scale, timelineOrigin, elemBins.get(ElemType.MPTickMark) ?? []);

	// damage marks
	drawDamageMarks(ctx, countdown, scale, timelineOrigin, elemBins.get(ElemType.DamageMark) ?? []);

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(countdown, scale);
	ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
	ctx.fillRect(timelineOrigin, 0, countdownWidth, timelineHeight);
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
	elements: TimelineElem[],
	trackBins: Map<number, MarkerElem[]>
	version: number
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	let scaledWidth = props.visibleWidth;
	let scaledHeight = props.timelineHeight;
	const dpr = window.devicePixelRatio;
	const rect = canvasRef.current?.getBoundingClientRect();
	if (rect) {
		scaledWidth *= dpr;
		scaledHeight *= dpr;
	}

	// background layer
	let bgProps : BackgroundProps = [
		props.timelineWidth,
		props.timelineHeight,
		props.visibleLeft,
		props.visibleWidth,
		props.countdown,
		props.scale,
		props.trackBins,
		props.elements
	];
	useEffect(()=>{
		let ctx = canvasRef.current?.getContext("2d", {alpha: false});
		if (ctx) {
			ctx.scale(dpr, dpr);
			drawTimeline(ctx, bgProps);
			ctx.scale(1 / dpr, 1 / dpr);
		}
	}, bgProps);

	return <canvas ref={canvasRef} width={scaledWidth} height={scaledHeight} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		zIndex: -1,
	}}/>;
}