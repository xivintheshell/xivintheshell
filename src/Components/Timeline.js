import React from 'react'
import {controller} from "../Controller/Controller";
import {ElemType} from "../Controller/Timeline";
import {Expandable, FileFormat, Help, Input, SaveToFile, Slider} from "./Common";
import {
	Cursor,
	MPTickMark,
	DamageMark,
	LucidMark,
	TimelineSkill,
	displayTime,
	setHandledSkillSelectionThisFrame, bHandledSkillSelectionThisFrame
} from "./TimelineElements";
import {getTimelineMarkersHeight, TimelineMarkers} from "./TimelineMarkers";
import {TimelineMarkerPresets} from "./TimelineMarkerPresets";
import {TimelineEditor} from "./TimelineEditor";
import {SkillName} from "../Game/Common";

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
		}}><div>{displayTime((i - countdownPadding) / props.pixelPerSecond, 0)}</div></div>;})}
	</div>
	return <div ref={props.divref} style={{
		zIndex: 1,
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
				controller.displayHistoricalState(t, undefined); // replay the actions as-is
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
			tincturePotencyMultiplier: 1,
			elements: []
		}
		this.timelineHeaderRef = React.createRef();
		updateTimelineContent = (newState => {
			this.setState(newState);
		}).bind(this);
	}
	componentDidMount() {
		this.setState({
			canvasWidth: controller.timeline.getCanvasWidth(),
			//tincturePotencyMultiplier will be set when timeline display settings is mounted
			elements: controller.timeline.elements,
		});
	}
	componentWillUnmount() {
		updateTimelineContent = (canvasWidth, data)=>{};
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
				elemComponents.push(<DamageMark
					positionFromTime={controller.timeline.positionFromTime(e.time)}
					key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset} tincturePotencyMultiplier={this.state.tincturePotencyMultiplier}/>)
			}
			else if (e.type === ElemType.LucidMark) {
				elemComponents.push(<LucidMark
					positionFromTime={controller.timeline.positionFromTime(e.time)}
					key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.MPTickMark) {
				elemComponents.push(<MPTickMark
					positionFromTime={controller.timeline.positionFromTime(e.time)}
					key={i} elem={e} elemID={"elemID-"+i} vOffset={verticalOffset}/>)
			}
			else if (e.type === ElemType.Skill) {
				elemComponents.push(<TimelineSkill key={i} elem={e} elemID={"elemID-"+i} tincturePotencyMultiplier={this.state.tincturePotencyMultiplier} />)
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
		return <div className="timeline-main" style={{width: this.state.canvasWidth}} onClick={
			(evt)=>{
				if (!evt.shiftKey && !bHandledSkillSelectionThisFrame) {
					controller.record.unselectAll();
					if (evt.target !== this.timelineHeaderRef.current) {
						controller.displayCurrentState();
					}
				}
				setHandledSkillSelectionThisFrame(false);
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
			<TimelineMarkers/>
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

export let updateStatsDisplay = ()=>{}

class StatsDisplay extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			historical: false,
			cumulativePotency: 0,
			cumulativeDuration: 0,
			selectedPotency: 0,
			selectedDuration: 0,
			statsBySkill: new Map()
		};
		updateStatsDisplay = this.unboundUpdateStatsDisplay.bind(this);
	}
	componentWillUnmount() {
		updateStatsDisplay = ()=>{};
	}
	unboundUpdateStatsDisplay(props) {
		this.setState(props);
		this.forceUpdate();
	}
	render() {
		let cumulative = <div style={{flex: 1, color: this.state.historical ? "darkorange" : "black"}}>
			<span>Last damage application time: {this.state.cumulativeDuration.toFixed(2)}</span><br/>
			<span>Total applied potency: {(this.state.cumulativePotency).toFixed(2)}</span><br/>
			<span>PPS <Help topic={"ppsNotes"} content={
				<div className={"toolTip"}>
					<div className="paragraph">
						total applied potency divided by last damage application time since pull (0s).
					</div>
					<div className="paragraph">
						could be inaccurate if any damage happens before pull
					</div>
				</div>
			}/>: {this.state.cumulativeDuration <= 0 ? "N/A" : (this.state.cumulativePotency / this.state.cumulativeDuration).toFixed(2)}</span><br/>
			<div>
				<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
					return controller.getStatsCsv();
				}} filename={"stats"} displayName={"download damage log CSV"}/>
			</div>
		</div>

		let statsBySkillEntries = [];
		this.state.statsBySkill.forEach((skill, skillName)=>{
			if (skill.potencySum > 0) {
				statsBySkillEntries.push({skillName: skillName, potencySum: skill.potencySum, count: skill.count});
			}
		});
		statsBySkillEntries.sort((a, b)=>{ return b.potencySum - a.potencySum });
		let statsBySkill = <div style={{flex: 1, color: this.state.historical ? "darkorange" : "black"}}>
			{statsBySkillEntries.map(skill=><div style={{display: "inline-block", width: "50%"}} key={skill.skillName}>{
				skill.skillName + " (" + skill.count + "): " + skill.potencySum.toFixed(2)
			}</div>)}
		</div>

		let selected = <div style={{flex: 1}}>
			<span>Duration (selected): {this.state.selectedDuration.toFixed(2)}</span><br/>
			<span>Potency (selected): {this.state.selectedPotency.toFixed(2)}</span><br/>
			<span>PPS (selected): {(this.state.selectedPotency / this.state.selectedDuration).toFixed(2)}</span>
		</div>
		return <div style={{ display: "flex", flexDirection: "row" }}>
			{cumulative}
			{statsBySkill}
			{this.state.selectedDuration > 0 ? selected : <div style={{flex: 1}}/>}
		</div>;
	}
}

class TimelineDisplaySettings extends React.Component {
	constructor(props) {
		super(props);
		// display scale
		this.initialDisplayScale = 0.4;
		let str = localStorage.getItem("timelineDisplayScale");
		if (str !== null) {
			this.initialDisplayScale = parseFloat(str);
		}

		// state
		this.state = {
			tinctureBuffPercentageStr: "8"
		}

		// tincture buff percentage
		str = localStorage.getItem("tinctureBuffPercentage");
		if (str !== null) {
			this.state.tinctureBuffPercentageStr = str;
		}

		// functions
		this.setTinctureBuffPercentageStr = (val=>{
			this.setState({tinctureBuffPercentageStr: val});

			let percentage = parseFloat(val);
			if (!isNaN(percentage)) {
				controller.setTincturePotencyMultiplier(1 + percentage * 0.01);
				localStorage.setItem("tinctureBuffPercentage", val);
			}
		}).bind(this);
	}
	componentDidMount() {
		this.setTinctureBuffPercentageStr(this.state.tinctureBuffPercentageStr);
	}

	render() {
		return <div>
			<span>Display settings: </span>
			<Slider description={"horizontal scale "}
					defaultValue={this.initialDisplayScale.toString()}
					onChange={(newVal)=>{
						controller.timeline.setHorizontalScale(parseFloat(newVal));
						localStorage.setItem("timelineDisplayScale", newVal);
					}}/>
			<Input defaultValue={this.state.tinctureBuffPercentageStr} description=" tincture potency buff " onChange={this.setTinctureBuffPercentageStr} width={2} style={{display: "inline"}}/>
			<span>%</span>
		</div>
	}
}

export class Timeline extends React.Component {
	constructor(props) {
		super(props);
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
			<TimelineDisplaySettings/>
			<TimelineMarkerPresets/>
			<TimelineEditor/>
		</div>
	}
}