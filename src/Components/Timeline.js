import React from 'react'
import {controller} from "../Controller/Controller";
import {Expandable, FileFormat, Help, Input, SaveToFile, Slider, StaticFn} from "./Common";
import {TimelineMarkerPresets} from "./TimelineMarkerPresets";
import {TimelineEditor} from "./TimelineEditor";
import {TimelineCanvas} from "./TimelineCanvas";

export let updateSelectionDisplay = (startX, endX)=>{}

export let redrawTimelineCanvas = function() {}

export let updateTimelineContent = function() {}

export let updateMarkers_TimelineMarkers = (trackBins) => {};

// the actual timeline canvas
class TimelineMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			timelineWidth: 300,
			timelineHeight: 180,
			scale: 1,
			tincturePotencyMultiplier: 1,
			elements: [],
			trackBins: new Map(),
			timelineMouseX: 0,
			timelineMouseY: 0,
			selectionStartX: 0,
			selectionEndX: 0
		}
		this.timelineHeaderRef = React.createRef();
		this.canvasVersion = 0; // such a hack....
		updateTimelineContent = (newState => {
			this.setState(newState);
		}).bind(this);
	}
	componentDidMount() {
		this.setState({
			timelineWidth: controller.timeline.getCanvasWidth(),
			timelineHeight: controller.timeline.getCanvasHeight(),
			//tincturePotencyMultiplier will be set when timeline display settings is mounted
			elements: controller.timeline.elements,
		});
		updateMarkers_TimelineMarkers = (trackBins=>{
			this.setState({trackBins: trackBins});
		}).bind(this);
		redrawTimelineCanvas = (()=>{
			this.forceUpdate();
		}).bind(this);
		updateSelectionDisplay = ((startX, endX)=>{
			this.setState({
				selectionStartX: startX,
				selectionEndX: endX
			})
		}).bind(this);
	}

	componentWillUnmount() {
		updateTimelineContent = () => {
		};
		updateMarkers_TimelineMarkers = () => {
		};
		redrawTimelineCanvas = () => {
		};
		updateSelectionDisplay = () => {
		};
	}

	render() {
		this.canvasVersion++;
		let canvas = <TimelineCanvas
			timelineWidth={this.state.timelineWidth}
			timelineHeight={this.state.timelineHeight}
			visibleLeft={this.props.visibleLeft}
			visibleWidth={this.props.visibleWidth}
			countdown={controller.gameConfig.countdown}
			scale={this.state.scale}
			tincturePotencyMultiplier={this.state.tincturePotencyMultiplier}
			elements={this.state.elements}
			trackBins={this.state.trackBins}
			selectionStartX={this.state.selectionStartX}
			selectionEndX={this.state.selectionEndX}
			version={this.canvasVersion}
		/>;

		return <div style={{position: "relative", }}>
			{
				<div className="timeline-main" style={{backgroundColor: "transparent", width: this.state.timelineWidth, height: this.state.timelineHeight}}/>
				//interactiveLayer
			}
			{canvas}
		</div>
	}
}

export let scrollTimelineTo = (positionX)=>{}

class FixedRightColumn extends React.Component {
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
		this.state = {
			visibleLeft: 0,
			visibleWidth: 0
		}
	}
	componentDidMount() {
		scrollTimelineTo = ((positionX)=>{
			if (this.myRef.current != null) {
				let clientWidth = this.myRef.current.clientWidth;
				this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
			}
			this.updateVisibleRange();
		}).bind(this);
		this.updateVisibleRange();
	}
	componentWillUnmount() {
		scrollTimelineTo = (positionX)=>{};
	}
	updateVisibleRange() {
		if (this.myRef.current) {
			this.setState({
				visibleLeft: this.myRef.current.scrollLeft,
				visibleWidth: this.myRef.current.clientWidth
			});
		}
	}

	render() {
		return <div ref={this.myRef} className={"timeline-fixedRightColumn staticScrollbar"} onScroll={e=>{
			this.updateVisibleRange();
		}}>
			<TimelineMain visibleLeft={this.state.visibleLeft} visibleWidth={this.state.visibleWidth}/>
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
			gcdCount: 0,
			selectedPotency: 0,
			selectedDuration: 0,
			selectedGcdCount: 0,
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
			<span>Applied GCD skills: {this.state.gcdCount}</span><br/>
			<div>
				<SaveToFile fileFormat={FileFormat.Csv} getContentFn={()=>{
					return controller.getStatsCsv();
				}} filename={"stats"} displayName={"download damage log CSV"}/>
			</div>
		</div>

		let statsBySkillEntries = [];
		this.state.statsBySkill.forEach((skill, skillName)=>{
			statsBySkillEntries.push({skillName: skillName, potencySum: skill.potencySum, count: skill.count});
		});
		statsBySkillEntries.sort((a, b)=>{ return b.potencySum - a.potencySum });
		let statsBySkill = <div style={{flex: 1, color: this.state.historical ? "darkorange" : "black"}}>
			{statsBySkillEntries.map(skill => {
				let statsStr = skill.skillName + " (" + skill.count + ")";
				if (skill.potencySum > 0) statsStr += ": " + skill.potencySum.toFixed(2);
				return <div style={{display: "inline-block", width: "50%"}} key={skill.skillName}>{statsStr}</div>
			})}
		</div>

		let selected = <div style={{flex: 1}}>
			<span>Duration (selected): {this.state.selectedDuration.toFixed(2)}</span><br/>
			<span>Applied potency (selected): {this.state.selectedPotency.toFixed(2)}</span><br/>
			<span>PPS (selected): {(this.state.selectedPotency / this.state.selectedDuration).toFixed(2)}</span><br/>
			<span>Applied GCD skills (selected): {this.state.selectedGcdCount}</span>
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