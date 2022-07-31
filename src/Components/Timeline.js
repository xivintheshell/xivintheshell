import React from 'react'
import {controller} from "../Controller/Controller";
import {ElemType} from "../Controller/Timeline";
import {Expandable, Help, Slider} from "./Common";
import {Cursor, MPTickMark, DamageMark, LucidMark, TimelineSkill} from "./TimelineElements";
import {getTimelineMarkersHeight, timelineMarkers} from "./TimelineMarkers";
import {timelineMarkerPresets} from "./TimelineMarkerPresets";

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
	let displayTime = (time) => {
		let absTime = Math.abs(time);
		let minute = Math.floor(absTime / 60);
		let second = absTime - 60 * minute;
		return (time < 0 ? "-" : "") +
			minute.toString() + ":" + (second < 10 ? "0" : "") + second.toFixed(0).toString();
	}
	let ruler = <div style={{pointerEvents: "none"}}>
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
		{props.pixelPerSecond < 6 ? <div/> : marks_5sec.map(i=>{return<div key={i} style={{
			textAlign: "center",
			position: "absolute",
			top: "11px",
			left: `${i - 24}px`,
			width: "48px",
			display: "inline-block",
		}}><div>{displayTime((i - countdownPadding) / props.pixelPerSecond)}</div></div>;})}
	</div>
	return <div ref={props.divref} style={{
		//zIndex: -3,
		position: "relative",
		width: "100%",
		height: "30px",
		background: "#ececec",
	}} onClick={(e)=>{
		if (e.target) {
			let rect = e.target.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let t = controller.timeline.timeFromPosition(x);
			if (t < controller.game.time) {
				controller.displayHistoricalState(t);
			} else {
				controller.displayCurrentState();
			}
		}
	}}>{ruler}</div>
}

export let updateTimelineContent = function(canvasWidth, data) {}

class TimelineMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			canvasWidth: 300,
			elements: []
		}
		this.timelineHeaderRef = React.createRef();
		updateTimelineContent = this.unboundUpdateTimelineContent.bind(this);
	}
	componentDidMount() {
		this.setState({
			canvasWidth: controller.timeline.getCanvasWidth(),
			elements: controller.timeline.elements,
		});
	}
	componentWillUnmount() {
		updateTimelineContent = (canvasWidth, data)=>{};
	}
	unboundUpdateTimelineContent(canvasWidth, data) {
		this.setState({
			canvasWidth: canvasWidth,
			elements: data
		});
	}
	render() {
		let elemComponents = [];
		let verticalOffset = "-" + (getTimelineMarkersHeight() + 30) + "px";
		for (let i = 0; i < this.state.elements.length; i++) {
			let e = this.state.elements[i];
			if (e.type === ElemType.s_Cursor) {
				elemComponents.push(<Cursor key={i} elem={e} elemID={"elemID-"+i} color="black" vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.s_ViewOnlyCursor) {
				if (e.enabled) elemComponents.push(<Cursor key={i} elem={e} elemID={"elemID-"+i} color={"darkorange"} vOffset={verticalOffset}/>)
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
				elemComponents.push(<TimelineSkill key={i} elem={e} elemID={"elemID-"+i} />)
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
		let contentStyle = {
			position: "relative",
			width: "100%",
			height: "54px"
		};
		let countdownGrey = <div style={countdownBgStyle}/>;
		return <div className="timeline-main" style={{width: this.state.canvasWidth}} onMouseDown={
			(evt)=>{
				if (!evt.shiftKey) {
					controller.record.unselectAll();
					controller.onTimelineSelectionChanged();
					if (evt.target !== this.timelineHeaderRef.current) {
						controller.displayCurrentState();
					}
				}
			}
		}>
			<TimelineSelection/>
			{countdownGrey}
			<TimelineHeader
				divref={this.timelineHeaderRef}
				canvasWidth={this.state.canvasWidth}
				pixelPerSecond={controller.timeline.scale * 100}
				countdown={controller.gameConfig.countdown}
			/>
			{timelineMarkers}
			<div style={contentStyle}>{elemComponents}</div>
		</div>
	}
}

export let scrollTimelineTo = (positionX)=>{}

class FixedRightColumn extends React.Component {
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
	}
	componentDidMount() {
		scrollTimelineTo = ((positionX)=>{
			if (this.myRef.current != null) {
				let clientWidth = this.myRef.current.clientWidth;
				this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
			}
		}).bind(this);
	}
	componentWillUnmount() {
		scrollTimelineTo = (positionX)=>{};
	}
	render() {
		return <div ref={this.myRef} className={"timeline-fixedRightColumn staticScrollbar"}>
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
		let cumulative = <div style={{flex: 1}}>
			<span>Time since pull: {this.state.cumulativeDuration.toFixed(2)}</span><br/>
			<span>Cumulative potency: {(this.state.cumulativePPS * this.state.cumulativeDuration).toFixed(2)}</span><br/>
			<span>PPS <Help topic={"ppsNotes"} content={
				<div className={"toolTip"}>
					<div className="paragraph">
						cumulative potency divided by time since pull (0s).
					</div>
					<div className="paragraph">
						could be inaccurate if any damage happens before pull
					</div>
				</div>
			}/>: {this.state.cumulativePPS.toFixed(2)}</span><br/>
		</div>
		let selected = <div style={{flex: 1}}>
			<span>Duration (selected): {this.state.selectedDuration.toFixed(2)}</span><br/>
			<span>Potency (selected): {this.state.selectedPotency.toFixed(2)}</span><br/>
			<span>PPS (selected): {(this.state.selectedPotency / this.state.selectedDuration).toFixed(2)}</span>
		</div>
		return <div style={{ height: 48, display: "flex", flexDirection: "row" }}>
			{cumulative}
			{this.state.selectedDuration > 0 ? selected : <div/>}
		</div>;
	}
}

class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.initialDisplayScale = 0.4;
		let str = localStorage.getItem("timelineDisplayScale");
		if (str !== null) {
			this.initialDisplayScale = parseFloat(str);
		}
	}
	render() {
		return <div style={{
			bottom: 0,
			left: 0,
			right: 0,
			paddingLeft: 6,
			paddingRight: 6,
			borderTop: "2px solid darkgrey",
			flex: 0
		}}>
			<Expandable
				title={"Damage stats"}
				defaultShow={false}
				content={<StatsDisplay/>}
			/>
			<div className={"timeline timelineTab"}>
				<FixedRightColumn/>
			</div>
			<Slider description={"display scale: "}
					defaultValue={this.initialDisplayScale.toString()}
					onChange={(newVal)=>{
						controller.timeline.setHorizontalScale(parseFloat(newVal));
						localStorage.setItem("timelineDisplayScale", newVal);
					}}/>
			{timelineMarkerPresets}
		</div>
	}
}

export const timeline = <Timeline />;