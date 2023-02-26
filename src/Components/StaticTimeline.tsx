import React, {useEffect, useRef} from 'react'
import {TimelineElem} from "../Controller/Timeline";
import {controller} from "../Controller/Controller";

function drawTimelineBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
	console.log("clear");
	ctx.clearRect(0, 0, width, height);
}

function drawTimelineElements(ctx: CanvasRenderingContext2D, width: number, height: number, elements: TimelineElem[]) {
	console.log("rerender elems");
	ctx.fillStyle = "red";
	elements.forEach(elem=>{
		ctx.beginPath();
		ctx.rect(controller.timeline.positionFromTime(elem.time), 10, 5, 10);
		ctx.fill();
	});
}

export function StaticTimeline(props: {
	width: number,
	height: number,
	elements: TimelineElem[],
	version: number
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	useEffect(()=>{
		let ctx = canvasRef.current?.getContext("2d");
		if (ctx) {
			drawTimelineBackground(ctx, props.width, props.height);
		}
	}, [props.width, props.height]);
	useEffect(()=>{
		let ctx = canvasRef.current?.getContext("2d");
		if (ctx) {
			drawTimelineElements(ctx, props.width, props.height, props.elements);
		}
	}, [props.width, props.height, props.version]);
	//console.log("draw static");
	return <canvas ref={canvasRef} width={props.width} height={props.height} style={{
		backgroundColor: "white"
	}}/>;
}