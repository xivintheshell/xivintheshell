import React, {useEffect, useRef} from 'react'
import {MarkerElem, TimelineElem} from "../Controller/Timeline";
import {StaticFn} from "./Common";

type BackgroundProps = [
	number,
	number,
	number,
	number,
	number,
	number,
	Map<number, MarkerElem[]>
];

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawTimelineBackground(ctx: CanvasRenderingContext2D, [timelineWidth, timelineHeight, visibleLeft, visibleWidth, countdown, scale, trackBins]: BackgroundProps) {
	ctx.beginPath();

	let timelineOrigin = -visibleLeft;

	// background white
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, visibleWidth, timelineHeight);

	// ruler bg
	ctx.fillStyle = "#ececec";
	ctx.fillRect(0, 0, visibleWidth, 30);

	// ruler marks
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
	const trackHeight = 14;
	let numTracks = 0;
	for (let k of trackBins.keys()) {
		numTracks = Math.max(numTracks, k + 1);
	}
	let markerTracksOriginY = 30 + numTracks * trackHeight;
	ctx.fillStyle = "#f3f3f3";
	for (let i = 0; i < numTracks; i += 2) {
		let top = markerTracksOriginY - (i + 1) * trackHeight;
		ctx.fillRect(0, top, visibleWidth, trackHeight);
	}
	const trackBottomMargin = 6;

	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(countdown, scale);
	ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
	ctx.fillRect(timelineOrigin, 0, countdownWidth, timelineHeight);
}

function drawTimelineElements(ctx: CanvasRenderingContext2D, width: number, height: number, elements: TimelineElem[]) {
	//console.log("rerender elems");
	/*
	ctx.fillStyle = "red";
	elements.forEach(elem=>{
		ctx.rect(controller.timeline.positionFromTime(elem.time), 10, 5, 10);
	});
	ctx.fill();
	 */
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
		props.trackBins
	];
	useEffect(()=>{
		let ctx = canvasRef.current?.getContext("2d", {alpha: false});
		if (ctx) {
			ctx.scale(dpr, dpr);
			drawTimelineBackground(ctx, bgProps);
			ctx.scale(1 / dpr, 1 / dpr);
		}
	}, bgProps);

	/*
	useEffect(()=>{
		let ctx = canvasRef.current?.getContext("2d");
		if (ctx) {
			drawTimelineElements(ctx, props.width, props.height, props.elements);
		}
	}, [props.width, props.height, props.version]);
	//console.log("draw static");
	 */

	return <canvas ref={canvasRef} width={scaledWidth} height={scaledHeight} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		zIndex: -1,
	}}/>;
}