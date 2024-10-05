import React from 'react'
import {controller} from "../Controller/Controller";
import {Help, Input, Slider, Tabs, TABS_TITLE_HEIGHT} from "./Common";
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
import {getCachedValue, setCachedValue} from "../Controller/Common";

import {ImageExport} from "./ImageExport";
import {LoadSave} from "./LoadSave";

export let updateTimelineView = () => {
};

export let scrollTimelineTo = (positionX: number) => {
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let getVisibleRangeX = () => {
}

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

		this.updateVisibleRange = (() => {
			if (this.myRef.current) {
				this.setState({
					visibleLeft: this.myRef.current.scrollLeft,
					visibleWidth: this.myRef.current.clientWidth
				});
			}
		});
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
		});

		scrollTimelineTo = ((positionX: number) => {
			if (this.myRef.current != null) {
				let clientWidth = this.myRef.current.clientWidth;
				this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
			}
			this.updateVisibleRange();
		});

		getVisibleRangeX = (() => {
			return {
				left: this.state.visibleLeft,
				width: this.state.visibleWidth
			}
		});

		this.updateVisibleRange();
	}

	componentWillUnmount() {
		updateTimelineView = () => {
		};
		scrollTimelineTo = (positionX) => {
		};
		getVisibleRangeX = () => {
		};
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
				cursor: timelineCanvasGetPointerMouse() ? "pointer" : "default",
			}} ref={this.myRef} onScroll={e => {
				if (this.myRef.current) {
					this.myRef.current.scrollLeft = Math.min(this.myRef.current.scrollWidth - this.myRef.current.clientWidth, this.myRef.current.scrollLeft);
					this.setState({
						visibleLeft: this.myRef.current.scrollLeft,
						visibleWidth: this.myRef.current.clientWidth
					});
				}
			}} onMouseMove={e => {
				if (this.myRef.current) {
					let rect = this.myRef.current.getBoundingClientRect();
					let x = e.clientX - rect.left;
					let y = e.clientY - rect.top;
					timelineCanvasOnMouseMove(x, y);
				}
			}} onMouseEnter={e => {
				timelineCanvasOnMouseEnter();
			}} onMouseLeave={e => {
				timelineCanvasOnMouseLeave();
			}} onClick={e => {
				timelineCanvasOnClick(e);
			}} onKeyDown={e => {
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

export const TIMELINE_SETTINGS_HEIGHT = 320;
class TimelineSettings extends React.Component {
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
		let str = getCachedValue("timelineDisplayScale");
		if (str !== null) {
			this.initialDisplayScale = parseFloat(str);
		}

		// state
		this.state = {
			tinctureBuffPercentageStr: "8",
			untargetableMask: true
		}

		// tincture buff percentage
		str = getCachedValue("tinctureBuffPercentage");
		if (str !== null) {
			this.state.tinctureBuffPercentageStr = str;
		}

		// untargetable mask
		str = getCachedValue("untargetableMask");
		if (str !== null) {
			this.state.untargetableMask = parseInt(str) > 0;
		}

		// functions
		this.setTinctureBuffPercentageStr = ((val: string) => {
			this.setState({tinctureBuffPercentageStr: val});

			let percentage = parseFloat(val);
			if (!isNaN(percentage)) {
				controller.setTinctureBuffPercentage(percentage);
				setCachedValue("tinctureBuffPercentage", val);
			}
		});
		this.setUntargetableMask = ((val: boolean) => {
			this.setState({untargetableMask: val});

			controller.setUntargetableMask(val);
			setCachedValue("untargetableMask", val ? "1" : "0");
		});
	}

	componentDidMount() {
		this.setTinctureBuffPercentageStr(this.state.tinctureBuffPercentageStr);
		this.setUntargetableMask(this.state.untargetableMask);
	}

	render() {
		let displaySettings = <div>
			<Input defaultValue={this.state.tinctureBuffPercentageStr}
			       description={localize({en: " tincture potency buff ", zh: "爆发药威力加成 "})}
			       onChange={this.setTinctureBuffPercentageStr} width={2} style={{display: "inline"}}/>
			<span>%</span>
			<div>
				<input type="checkbox" style={{position: "relative", top: 3, marginRight: 5}}
				       checked={this.state.untargetableMask}
				       onChange={evt => {
					       this.setUntargetableMask(evt.target.checked)
				       }}/>
				<span>{localize({en: "exclude damage when untargetable", zh: "Boss上天期间威力按0计算"})} <Help
					topic={"untargetableMask"} content={
					<div>
						<div className={"paragraph"}>{localize({
							en: "Having this checked will exclude damages from untargetable phases.",
							zh: "若勾选，统计将不包括Boss上天期间造成的伤害。"
						})}</div>
						<div className={"paragraph"}>{localize({
							en: "You can mark up such phases using timeline markers of type \"Untargetable\".",
							zh: "可在下方用 “不可选中” 类型的时间轴标记来指定时间区间。"
						})}</div>
						<div className={"paragraph"}>{localize({
							en: "This is just a statistics helper though. For example it doesn't prevent you from using skills when the boss is untargetable.",
							zh: "此功能只是一个统计用的工具，在标注了 “不可选中” 的时间里其实也能正常使用技能。"
						})}</div>
					</div>
				}/></span>
			</div>
		</div>;

		return <div style={{
			position: "relative",
			margin: 6
		}}>
			<Tabs uniqueName={"timeline"} content={[
				{
					titleNode: localize({en: "Timeline markers", zh: "时间轴标记"}),
					contentNode: <TimelineMarkerPresets/>
				},
				{
					titleNode: <div style={{
						position: "relative"
					}}>
						{localize({en: "Timeline editor ", zh: "时间轴编辑器 "})}
						<Help topic={"timeline editor"} content={<div>
							<div className={"paragraph"} style={{color: "orangered"}}><b>Has the bare minimum features but might still be buggy (let me know). Would recommend going over Instructions/Troubleshoot first, plus saving data to drive in case bugs mess up the entire tool</b></div>
							<div className={"paragraph"}>I hope it's otherwise self-explanatory. Note that edits made here are not saved until they're applied to the actual timeline.</div>
						</div>}/>
					</div>,
					contentNode: <TimelineEditor/>
				},
				{
					titleNode: localize({en: "Import/Export", zh: "导入/导出"}),
					contentNode: <div>
						<LoadSave/>
						<ImageExport/>
					</div>
				},
				{
					titleNode: localize({en: "Display settings", zh: "显示设置"}),
					contentNode: displaySettings
				},
			]} collapsible={true} height={TIMELINE_SETTINGS_HEIGHT} defaultSelectedIndex={undefined}/>
			<Slider
				description={localize({en: "horizontal scale ", zh: "水平缩放 "})}
				defaultValue={this.initialDisplayScale.toString()}
				style={{
					position: "absolute",
					top: 0,
					right: 6,
					height: TABS_TITLE_HEIGHT,
					lineHeight: `${TABS_TITLE_HEIGHT}px`,
					verticalAlign: "middle",
				}}
				onChange={(newVal) => {
					controller.timeline.setHorizontalScale(parseFloat(newVal));
					controller.scrollToTime();
					setCachedValue("timelineDisplayScale", newVal);
				}}/>
		</div>
	}
}

export class Timeline extends React.Component {
	render() {
		return <div style={{
			bottom: 0,
			left: 0,
			right: 0,
			paddingLeft: 0, // forgot why I added the left and right paddings...
			paddingRight: 0,
			borderTop: "2px solid " + getCurrentThemeColors().bgHighContrast,
			flex: 0
		}}>
			<TimelineMain/>
			<TimelineSettings/>
		</div>
	}
}