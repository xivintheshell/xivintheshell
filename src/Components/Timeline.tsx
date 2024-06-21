import React from 'react'
import {controller} from "../Controller/Controller";
import {Help, Input, Slider} from "./Common";
import {TimelineMarkerPresets} from "./TimelineMarkerPresets";
import {TimelineEditor} from "./TimelineEditor";
import {
	TimelineCanvas, timelineCanvasGetPointerMouse, timelineCanvasOnClick, timelineCanvasOnKeyDown,
	timelineCanvasOnMouseEnter,
	timelineCanvasOnMouseLeave,
	timelineCanvasOnMouseMove
} from "./TimelineCanvas";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";

export let updateTimelineView = () => {};

export let scrollTimelineTo = (positionX: number)=>{}

let getVisibleRangeX = () => {}

// the actual timeline canvas
class TimelineMain extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	updateVisibleRange: () => void;
	state: {
		timelineWidth: number,
		timelineHeight: number,
		visibleLeft: number,
		visibleWidth: number,
		version: number
	};
	constructor(props: {}) {
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

		scrollTimelineTo = ((positionX: number)=>{
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
			visibleWidth={this.state.visibleWidth}
			version={this.state.version}
		/>;

		return <div style={{position: "relative"}}>
			{canvas}
			<div tabIndex={0} className={"staticScrollbar"} style={{
				position: "relative",
				width: "100%",
				overflowX: "scroll",
				overflowY: "clip",
				outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
				marginBottom: 10,
				cursor: timelineCanvasGetPointerMouse() ? "pointer" : "default",
			}} ref={this.myRef} onScroll={e => {
				if (this.myRef.current) {
					this.myRef.current.scrollLeft = Math.min(this.myRef.current.scrollWidth - this.myRef.current.clientWidth, this.myRef.current.scrollLeft);
					this.setState({
						visibleLeft: this.myRef.current.scrollLeft,
						visibleWidth: this.myRef.current.clientWidth
					});
				}
			}} onMouseMove={e=>{
				if (this.myRef.current) {
					let rect = this.myRef.current.getBoundingClientRect();
					let x = e.clientX - rect.left;
					let y = e.clientY - rect.top;
					timelineCanvasOnMouseMove(x, y);
				}
			}} onMouseEnter={e=>{
				timelineCanvasOnMouseEnter();
			}} onMouseLeave={e=>{
				timelineCanvasOnMouseLeave();
			}} onClick={e=>{
				timelineCanvasOnClick(e);
			}} onKeyDown={e=>{
				timelineCanvasOnKeyDown(e);
			}}>
				<div style={{
					position: "relative",
					backgroundColor: "transparent",
					width: this.state.timelineWidth,
					height: this.state.timelineHeight,
					pointerEvents: "none"
				}}/>
			</div>
		</div>
	}
}

class TimelineDisplaySettings extends React.Component {
	initialDisplayScale: number;
	state: {
		tinctureBuffPercentageStr: string,
		untargetableMask: boolean
	};
	setTinctureBuffPercentageStr: (val: string) => void;
	setUntargetableMask: (val: boolean) => void;
	constructor(props: {}) {
		super(props);
		// display scale
		this.initialDisplayScale = 0.4;
		let str = localStorage.getItem("timelineDisplayScale");
		if (str !== null) {
			this.initialDisplayScale = parseFloat(str);
		}

		// state
		this.state = {
			tinctureBuffPercentageStr: "8",
			untargetableMask: true
		}

		// tincture buff percentage
		str = localStorage.getItem("tinctureBuffPercentage");
		if (str !== null) {
			this.state.tinctureBuffPercentageStr = str;
		}

		// untargetable mask
		str = localStorage.getItem("untargetableMask");
		if (str !== null) {
			this.state.untargetableMask = parseInt(str) > 0;
		}

		// functions
		this.setTinctureBuffPercentageStr = ((val: string)=>{
			this.setState({tinctureBuffPercentageStr: val});

			let percentage = parseFloat(val);
			if (!isNaN(percentage)) {
				controller.setTinctureBuffPercentage(percentage);
				localStorage.setItem("tinctureBuffPercentage", val);
			}
		}).bind(this);
		this.setUntargetableMask = ((val: boolean)=>{
			this.setState({untargetableMask: val});

			controller.setUntargetableMask(val);
			localStorage.setItem("untargetableMask", val ? "1" : "0");
		}).bind(this);
	}
	componentDidMount() {
		this.setTinctureBuffPercentageStr(this.state.tinctureBuffPercentageStr);
		this.setUntargetableMask(this.state.untargetableMask);
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
			<span> | </span>
			<Input defaultValue={this.state.tinctureBuffPercentageStr} description={localize({en: " tincture potency buff ", zh: "爆发药威力加成 "})} onChange={this.setTinctureBuffPercentageStr} width={2} style={{display: "inline"}}/>
			<span>% | </span>
			<span>
				<input type="checkbox" style={{position: "relative", top: 3, marginRight: 5}}
				       checked={this.state.untargetableMask}
				       onChange={evt => {this.setUntargetableMask(evt.target.checked)}}/>
				<span>{localize({en: "exclude damage when untargetable", zh: "Boss上天期间威力按0计算"})} <Help topic={"untargetableMask"} content={
					<div>
						<div className={"paragraph"}>{localize({en: "Having this checked will exclude damages from untargetable phases.", zh: "勾选时，统计将不包括Boss上天期间造成的伤害。"})}</div>
						<div className={"paragraph"}>{localize({en: "You can mark up such phases using timeline markers of type \"Untargetable\".", zh: "可在下方用 “不可选中” 类型的时间轴标记来指定时间区间。"})}</div>
						<div className={"paragraph"}>{localize({
							en: "This is just a statistics helper though. For example it doesn't prevent you from using skills when the boss is untargetable.",
							zh: "此功能只是一个统计用的工具，在标注了 “不可选中” 的时间里其实也能正常使用技能，也可能因为跳DoT而被刷新雷云。如果刷了不想要的雷云，可以在结束上天之后手动点掉。"})}</div>
					</div>
				}/></span>
			</span>
		</div>
	}
}

export class Timeline extends React.Component {
	constructor(props: {}) {
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