import React from 'react'
import {controller} from "../Controller/Controller";
import {Input, Slider} from "./Common";
import {TimelineMarkerPresets} from "./TimelineMarkerPresets";
import {TimelineEditor} from "./TimelineEditor";
import {TimelineCanvas} from "./TimelineCanvas";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";

export let updateTimelineView = () => {};

export let scrollTimelineTo = (positionX)=>{}

let getVisibleRangeX = () => {}

// the actual timeline canvas
class TimelineMain extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			timelineWidth: 11,
			timelineHeight: 300,
			visibleLeft: 23,
			visibleWidth: 66,
			version: 0
		}
		this.myRef = React.createRef();

		this.updateVisibleRange = (()=>{
			if (this.myRef.current) {
				this.setState({
					visibleLeft: this.myRef.current.scrollLeft,
					visibleWidth: this.myRef.current.clientWidth
				});
			}
		}).bind(this);
	}
	componentDidMount() {
		/*
		// not desirable, because scrolling is not smooth...
		if (this.myRef.current!==null) {
			this.myRef.current.addEventListener("wheel", evt=>{
				this.myRef.current.scrollLeft += evt.deltaY;
				evt.preventDefault();
			});
		}*/
		this.setState({
			timelineWidth: controller.timeline.getCanvasWidth(),
			timelineHeight: controller.timeline.getCanvasHeight(),
		});
		updateTimelineView = (() => {
			this.setState({
				timelineWidth: controller.timeline.getCanvasWidth(),
				timelineHeight: controller.timeline.getCanvasHeight(),
				version: this.state.version + 1
			});
		}).bind(this);

		scrollTimelineTo = ((positionX)=>{
			if (this.myRef.current != null) {
				let clientWidth = this.myRef.current.clientWidth;
				this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
			}
			this.updateVisibleRange();
		}).bind(this);

		getVisibleRangeX = (()=>{return {
			left: this.state.visibleLeft,
			width: this.state.visibleWidth
		}}).bind(this);

		this.updateVisibleRange();
	}

	componentWillUnmount() {
		updateTimelineView = () => {
		};
		scrollTimelineTo = (positionX)=>{};
		getVisibleRangeX = ()=>{};
	}

	render() {
		let canvas = <TimelineCanvas
			timelineHeight={this.state.timelineHeight}
			visibleLeft={this.state.visibleLeft}
			visibleWidth={this.state.visibleWidth - 1}
			version={this.state.version}
		/>;

		return <div className={"staticScrollbar"} style={{
			position: "relative",
			width: "100%",
			overflowX: "scroll",
			overflowY: "clip",
			outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
			marginBottom: 10
		}} ref={this.myRef} onScroll={e=>{
			if (this.myRef.current) {
				this.myRef.current.scrollLeft = Math.min(this.myRef.current.scrollWidth - this.myRef.current.clientWidth, this.myRef.current.scrollLeft);
				this.setState({
					visibleLeft: this.myRef.current.scrollLeft,
					visibleWidth: this.myRef.current.clientWidth
				});
			}
		}}>
			<div style={{
				position: "relative",
				backgroundColor: "transparent",
				width: this.state.timelineWidth,
				height: this.state.timelineHeight,
				pointerEvents: "none"
			}}/>
			{canvas}
		</div>
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
				controller.setTinctureBuffPercentage(percentage);
				localStorage.setItem("tinctureBuffPercentage", val);
			}
		}).bind(this);
	}
	componentDidMount() {
		this.setTinctureBuffPercentageStr(this.state.tinctureBuffPercentageStr);
	}

	render() {
		return <div>
			<span>{localize({en: "Display settings: ", zh: "显示设置："})}</span>
			<Slider description={localize({en: "horizontal scale ", zh: "水平缩放 "})}
					defaultValue={this.initialDisplayScale.toString()}
					onChange={(newVal)=>{
						controller.timeline.setHorizontalScale(parseFloat(newVal));
						//let range = getVisibleRangeX()
						//let mid = controller.timeline.timeFromPosition(range.left + range.width / 2);
						//console.log(range);
						//console.log(mid);
						controller.scrollToTime();
						localStorage.setItem("timelineDisplayScale", newVal);
					}}/>
			<span>{localize({en: "; ", zh: "；"})}</span>
			<Input defaultValue={this.state.tinctureBuffPercentageStr} description={localize({en: " tincture potency buff ", zh: "爆发药威力加成 "})} onChange={this.setTinctureBuffPercentageStr} width={2} style={{display: "inline"}}/>
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
			borderTop: "2px solid " + getCurrentThemeColors().bgHighContrast,
			flex: 0
		}}>
			<TimelineMain/>
			<TimelineDisplaySettings/>
			<TimelineMarkerPresets/>
			<TimelineEditor/>
		</div>
	}
}