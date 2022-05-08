import React from 'react'
import {controller} from "../Controller/Controller";
import {skillIcons} from "./Skills";
import {Clickable} from "./Common";
import ReactTooltip from 'react-tooltip';

const MAX_HEIGHT = 400;
export function Cursor(props) {
	let style={
		top: props.vOffset,
		left: controller.timeline.positionFromTime(props.elem.time) - 3,
		zIndex: 2,
	};
	return <div style={style} className={"timeline-elem cursor"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={MAX_HEIGHT}>
			<line x1="3" y1="0" x2="3" y2={`${MAX_HEIGHT}`} stroke={props.color}/>
			<polygon points="0,0 6,0 3,6" fill={props.color} stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.time.toFixed(2)}</ReactTooltip>
	</div>;
}

export function MPTickMark(props) {
	let style={
		top: props.vOffset,
		left: controller.timeline.positionFromTime(props.elem.time) - 3,
		zIndex: -1
	};
	return <div style={style} className={"timeline-elem MPTickMark"} >
		<svg width={6} height={MAX_HEIGHT} data-tip data-for={`${props.elemID}`}>
			<line x1="3" y1="0" x2="3" y2={`${MAX_HEIGHT}`} stroke={"#caebf6"}/>
		</svg>
		{/*<ReactTooltip id={`${props.elemID}`}>{props.elem.source}</ReactTooltip>*/}
	</div>;
}
export function DamageMark(props) {
	let style={
		top: props.vOffset,
		left: controller.timeline.positionFromTime(props.elem.time) - 3,
	};
	let hoverText = props.elem.potency.toFixed(2) + " (" + props.elem.source + ")";
	return <div style={style} className={"timeline-elem damageMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={6}>
			<polygon points="0,0 6,0 3,6" fill="red" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{hoverText}</ReactTooltip>
	</div>;
}

export function LucidMark(props) {
	let style={
		top: props.vOffset,
		left: controller.timeline.positionFromTime(props.elem.time)-3,
	};
	return <div style={style} className={"timeline-elem lucidMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={6}>
			<polygon points="0,0 6,0 3,6" fill="#88cae0" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.source}</ReactTooltip>
	</div>;
}

export function TimelineSkill(props) {
	let node = props.elem.node;
	let lockBarWidth = controller.timeline.positionFromTime(props.elem.lockDuration);
	let lockBarStyle = {
		position: "absolute",
		top: 0,
		background: props.elem.isSpellCast ? "#e7d9ee" : "#9d9d9d",
		width: lockBarWidth,
		height: props.elem.isSpellCast ? 14 : 28,
	};
	let lockBar = <div style={lockBarStyle}/>

	let recastBarWidth = controller.timeline.positionFromTime(props.elem.recastDuration);
	let recastBarStyle = {
		position: "absolute",
		top: 14,
		background: "#dbf3d6",
		width: recastBarWidth,
		height: 14
	};
	let recastBar = <div style={recastBarStyle}/>

	let snapshotIndicatorStyle = {
		position: "absolute",
		width: 0,
		height: 14,
		top: 0,
		left: controller.timeline.positionFromTime(props.elem.relativeSnapshotTime),
		borderLeft: "1px solid " + "rgba(151,85,239,0.2)"
	}
	let snapshotIndicator = <div style={snapshotIndicatorStyle}/>

	let iconStyle = {
		position: "absolute",
		top: 0,
		width: 28,
		height: 28,
	};
	let iconPath = skillIcons.get(props.elem.skillName);
	let description = props.elem.skillName + "@" + (props.elem.time-controller.gameConfig.countdown).toFixed(2);
	let hoverText = <span>{description}</span>;
	let iconImg = <div style={iconStyle} className={"timeline-elem-skill-icon"}>
		<img
			style={{display: "block", width: "100%", height: "100%"}}
			src={iconPath}
			alt={props.elem.skillName}
			data-tip data-for={`${props.elemID}`}
			tabIndex={-1}
			onKeyDown={(e) => {
				if (e.key === "Backspace") {
					controller.rewindUntilBefore(controller.record.getFirstSelection());
					controller.updateAllDisplay();
					controller.autoSave();
				}
			}}
		/>
		<ReactTooltip id={`${props.elemID}`}>{hoverText}</ReactTooltip>
	</div>;
	let icon = <Clickable key={node.getNodeIndex()} content={iconImg} onClickFn={(e) => {
		controller.timeline.onClickSkill(node, e.shiftKey);
	}}/>

	let componentStyle={
		left: controller.timeline.positionFromTime(props.elem.time),
		top: props.elem.isGCD ? 14 : 0,
	};
	let potency = node.tmp_capturedPotency;
	let lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
	if (potency > 0) {
		hoverText = <div>
			{hoverText}<br/>
			<span>{"potency: " + potency.toFixed(2)}</span><br/>
			<span>{"lock time: " + lockDuration.toFixed(2)}</span>
		</div>;
	}
	return <div style={componentStyle} className={"timeline-elem skill"}>
		{lockBar}
		{props.elem.isGCD ? recastBar : <div/>}
		{snapshotIndicator}
		{icon}
	</div>;
}

