import React from 'react'
import {controller} from "../Controller/Controller";
import {ElemType} from "../Controller/Timeline";
import {skillIcons} from "./Skills";
import {Clickable, Slider} from "./Common";
import ReactTooltip from 'react-tooltip';

const MAX_HEIGHT = 400;

function Cursor(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left - 3,
		zIndex: 2,
	};
	return <div style={style} className={"timeline-elem cursor"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={MAX_HEIGHT}>
			<line x1="3" y1="0" x2="3" y2={`${MAX_HEIGHT}`} stroke={"black"}/>
			<polygon points="0,0 6,0 3,6" fill="black" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

function MPTickMark(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left - 3,
	};
	return <div style={style} className={"timeline-elem MPTickMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={MAX_HEIGHT}>
			<line x1="3" y1="0" x2="3" y2={`${MAX_HEIGHT}`} stroke={"#88cae0"}/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

export let updateSelectionDisplay = (startX, endX)=>{}
class TimelineSelection extends React.Component {
	constructor(props) {
		super(props);
		updateSelectionDisplay = this.unboundUpdateSelectionDisplay.bind(this);
		this.state={
			startX: 0,
			endX: 0
		};
	}
	componentWillUnmount() {
		updateSelectionDisplay = (startX, endX)=>{}
	}
	unboundUpdateSelectionDisplay(startX, endX) {
		this.setState({
			startX: startX,
			endX: endX
		});
	}
	render() {
		let style = {
			position: "absolute",
			display: this.state.endX <= this.state.startX ? "none" : "block",
			backgroundColor: "rgba(151,111,246,0.1)",
			borderLeft: "1px solid mediumpurple",
			borderRight: "1px solid mediumpurple",
			left: this.state.startX,
			width: Math.max(0, this.state.endX - this.state.startX - 2),
			height: "100%",
			zIndex: 2,
			pointerEvents: "none"
		};
		return <div style={style}/>;
	}
}

function DamageMark(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left-3,
	};
	return <div style={style} className={"timeline-elem damageMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={6}>
			<polygon points="0,0 6,0 3,6" fill="red" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

function LucidMark(props) {
	let style={
		top: props.vOffset,
		left: props.elem.left-3,
	};
	return <div style={style} className={"timeline-elem lucidMark"} data-tip data-for={`${props.elemID}`}>
		<svg width={6} height={6}>
			<polygon points="0,0 6,0 3,6" fill="#88cae0" stroke="none"/>
		</svg>
		<ReactTooltip id={`${props.elemID}`}>{props.elem.hoverText}</ReactTooltip>
	</div>;
}

function TimelineSkill(props) {
	let lockBarWidth = controller.timeline.positionFromTime(props.elem.data.lockDuration);
	let lockBarStyle = {
		position: "absolute",
		top: 0,
		background: props.elem.data.isSpellCast ? "#e7d9ee" : "#9d9d9d",
		width: lockBarWidth,
		height: props.elem.data.isSpellCast ? 14 : 28,
	};
	let lockBar = <div style={lockBarStyle}/>

	let recastBarWidth = controller.timeline.positionFromTime(props.elem.data.recastDuration);
	let recastBarStyle = {
		position: "absolute",
		top: 14,
		background: "#dbf3d6",
		width: recastBarWidth,
		height: 14
	};
	let recastBar = <div style={recastBarStyle}/>

	let iconStyle = {
		position: "absolute",
		top: 0,
		width: 28,
		height: 28,
	};
	let iconPath = skillIcons.get(props.elem.data.skillName);
	let iconImg = <img
		style={iconStyle}
		className={"timeline-elem-skill-icon"}
		src={iconPath}
		alt={props.elem.data.skillName}
		data-tip data-for={`${props.elemID}`}
		tabIndex={-1}
		onKeyDown={props.elem.data.onKeyDownFn}
	/>;
	let icon = <Clickable content={iconImg} onClickFn={props.elem.data.onClickFn}/>

	let componentStyle={
		left: props.elem.left,
		top: props.elem.data.isGCD ? 14 : 0,
	};
	let node = props.elem.data.node;
	let potency = node.tmp_capturedPotency;
	let lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
	let hoverText = <span>{props.elem.data.skillName + "@" + (props.elem.data.time-props.elem.countdown).toFixed(2)}</span>;
	if (potency > 0) {
		hoverText = <div>
			{hoverText}<br/>
			<span>{"potency: " + potency.toFixed(2)}</span><br/>
			<span>{"lock time: " + lockDuration.toFixed(2)}</span>
		</div>;
	}
	return <div style={componentStyle} className={"timeline-elem skill"}>
		{lockBar}{props.elem.data.isGCD ? recastBar : <div/>}{icon}
		<ReactTooltip id={`${props.elemID}`}>{hoverText}</ReactTooltip>
	</div>;
}

function TimelineHeader(props) {
	let countdownPadding = props.countdown * props.pixelPerSecond;
	let marks_1sec = [];
	let marks_5sec = [];
	//let marks_1min = [];
	for (let i = 0; i < props.canvasWidth - countdownPadding; i += props.pixelPerSecond) {
		marks_1sec.push(i + countdownPadding);
	}
	for (let i = -props.pixelPerSecond; i >= -countdownPadding; i -= props.pixelPerSecond) {
		marks_1sec.push(i + countdownPadding);
	}
	for (let i = 0; i < props.canvasWidth - countdownPadding; i += props.pixelPerSecond * 5) {
		marks_5sec.push(i + countdownPadding);
	}
	for (let i = -props.pixelPerSecond * 5; i >= -countdownPadding; i -= props.pixelPerSecond * 5) {
		marks_5sec.push(i + countdownPadding);
	}
	/*
	for (let i = 0; i < props.canvasWidth; i += props.pixelPerSecond * 60) {
		marks_1min.push(i);
	}*/
	let ruler = <div>
		<svg width={props.canvasWidth} height="100%">
			{marks_1sec.map(i=>{
				return <line key={"1sec-"+i} stroke="black" strokeWidth="1" x1={i} y1="0" x2={i} y2="6"/>
			})}
			{marks_5sec.map(i=>{
				return <line key={"5sec-"+i} stroke="black" strokeWidth="1" x1={i} y1="0" x2={i} y2="10"/>
			})}
			{/*marks_1min.map(i=>{
				return <line key={"1min-"+i} stroke="grey" strokeWidth="1" x1={i} y1="0" x2={i} y2="50"/>
			})*/}
		</svg>
		{marks_5sec.map(i=>{return <div key={i} style={{
			textAlign: "center",
			position: "absolute",
			top: "11px",
			left: `${i - 24}px`,
			width: "48px",
			display: "inline-block",
			//border: "1px solid red",
		}}><div style={{}}>{((i - countdownPadding) / props.pixelPerSecond).toFixed(0).toString()}</div></div>;})}
	</div>
	return <div className="timeline-header" style={{
		zIndex: -3,
		position: "relative",
	}}>{ruler}</div>
}

function TimelineContent(props) {
	return <div className="timeline-content" width={800}>
		{props.elements}
	</div>
}

export let updateTimelineContent = function(startTime, canvasWidth, data) {}
class TimelineMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			startTime: 0,
			canvasWidth: 300,
			elements: []
		}
		updateTimelineContent = this.unboundUpdateTimelineContent.bind(this);
	}
	componentDidMount() {
		this.setState({
			startTime: 0,
			canvasWidth: controller.timeline.getCanvasWidth(),
			elements: controller.timeline.getTimelineElements()
		});
	}
	componentWillUnmount() {
		updateTimelineContent = (startTime, canvasWidth, data)=>{};
	}
	unboundUpdateTimelineContent(startTime, canvasWidth, data) {
		this.setState({
			startTime: startTime,
			canvasWidth: canvasWidth,
			elements: data
		});
	}
	render() {
		let elemComponents = [];
		let verticalOffset = "-2em";
		for (let i = 0; i < this.state.elements.length; i++) {
			let e = this.state.elements[i];
			if (e.type === ElemType.s_Cursor) {
				elemComponents.push(<Cursor key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.DamageMark) {
				elemComponents.push(<DamageMark key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.LucidMark) {
				elemComponents.push(<LucidMark key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.MPTickMark) {
				elemComponents.push(<MPTickMark key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.Skill) {
				elemComponents.push(<TimelineSkill key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
		}
		let countdownBgStyle = {
			background: "rgba(0,0,0,0.1)",
			position: "absolute",
			left: "0",
			height: "100%",
			width: controller.timeline.positionFromTime(controller.gameConfig.countdown),
			zIndex: 2,
			pointerEvents: "none"
		};
		let countdownGrey = <div style={countdownBgStyle}/>;
		return <div className="timeline-main" style={{width: this.state.canvasWidth+"px"}} onMouseDown={
			(evt)=>{
				/*
				if (evt.target) {
					console.log(evt.target.classList);
				}*/
				if (!evt.shiftKey) {
					controller.record.unselectAll();
					updateSelectionDisplay(0, 0);
					updateStatsDisplay({
						selectedPotency: 0,
						selectedDuration: 0
					});
				}
			}
		}>
			<TimelineSelection/>
			{countdownGrey}
			<TimelineHeader
				canvasWidth={this.state.canvasWidth}
				pixelPerSecond={controller.timeline.scale * 100}
				countdown={controller.gameConfig.countdown}
			/>
			<TimelineContent elements={elemComponents}/>
		</div>
	}
}

function FixedLeftColumn(props) {
	return <div className={"timeline-fixedLeftColumn"}>
		timeline left col
	</div>;
}

export let scrollTimelineTo = (positionX)=>{}
class FixedRightColumn extends React.Component {
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
	}
	componentDidMount() {
		scrollTimelineTo = this.unboundScroll.bind(this);
	}
	componentWillUnmount() {
		scrollTimelineTo = (positionX)=>{};
	}
	unboundScroll(positionX) {
		if (this.myRef.current != null) {
			let clientWidth = this.myRef.current.clientWidth;
			this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
		}
	}
	render() {
		return <div ref={this.myRef} className={"timeline-fixedRightColumn"}>
			<TimelineMain/>
		</div>
	}
}

export let updateStatsDisplay = (props={
	cumulativePPS: 0,
	cumulativeDuration: 0,
	selectedPotency: 0,
	selectedDuration: 0
})=>{}
class StatsDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			cumulativePPS: 0,
			cumulativeDuration: 0,
			selectedPotency: 0,
			selectedDuration: 0
		}
		updateStatsDisplay = this.unboundUpdateStatsDisplay.bind(this);
	}
	componentWillUnmount() {
		updateStatsDisplay = (props={
			cumulativePPS: 0,
			cumulativeDuration: 0,
			selectedPotency: 0,
			selectedDuration: 0
		})=>{};
	}
	// selectedPotency, selectedDuration
	unboundUpdateStatsDisplay(props) {
		this.setState(props);
	}
	render() {
		let cumulative = <div data-tip data-for="ppsNotes">
			<span>Last damage time since pull: {this.state.cumulativeDuration.toFixed(2)}</span><br/>
			<span>PPS: {this.state.cumulativePPS.toFixed(2)}</span><br/>
			<ReactTooltip id={"ppsNotes"}>
				<div className={"toolTip"}>
					potency / time since pull (0s).<br/>
					could be inaccurate if any damage happens before pull
				</div>
			</ReactTooltip>
		</div>
		let selected = <div style={{marginTop: "10px"}}>
			<span>---- Selected ----</span><br/>
			<span>Potency: {this.state.selectedPotency.toFixed(2)}</span><br/>
			<span>Duration: {this.state.selectedDuration.toFixed(2)}</span><br/>
			<span>PPS: {(this.state.selectedPotency / this.state.selectedDuration).toFixed(2)}</span>
		</div>
		return <div style={{ height: "120px" }}>
			{cumulative}
			{this.state.selectedDuration > 0 ? selected : <div/>}
		</div>;
	}
}

class Timeline extends React.Component
{
	// TODO: explain asterisk maybe?
	render() {
		return <div>
			<Slider description={"display scale: "} defaultValue={0.4} onChange={(newVal)=>{
				controller.timeline.setHorizontalScale(parseFloat(newVal));
				controller.updateSelectionDisplay();
			}}/>
			<div className={"timeline timelineTab"}>
				<FixedRightColumn/>
			</div>
			<StatsDisplay/>
		</div>
	}
}

export const timeline = <Timeline />;