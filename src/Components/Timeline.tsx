import React from "react";
import { controller } from "../Controller/Controller";
import { Help, Slider, Tabs, TABS_TITLE_HEIGHT } from "./Common";
import { TimelineMarkers } from "./TimelineMarkers";
import { TimelineEditor } from "./TimelineEditor";
import {
	TimelineCanvas,
	timelineCanvasGetPointerMouse,
	timelineCanvasOnClick,
	timelineCanvasOnKeyDown,
	timelineCanvasOnMouseEnter,
	timelineCanvasOnMouseLeave,
	timelineCanvasOnMouseMove,
} from "./TimelineCanvas";
import { localize } from "./Localization";
import { getCurrentThemeColors } from "./ColorTheme";

import { LoadSave } from "./LoadSave";
import { TimelineDisplaySettings } from "./TimelineDisplaySettings";

export let updateTimelineView = () => {};

export let scrollTimelineTo = (positionX: number) => {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let getVisibleRangeX = () => {};

// the actual timeline canvas
class TimelineMain extends React.Component {
	myRef: React.RefObject<HTMLDivElement>;
	updateVisibleRange: () => void;
	state: {
		timelineWidth: number;
		timelineHeight: number;
		visibleLeft: number;
		visibleWidth: number;
		version: number;
	};

	constructor(props: {}) {
		super(props);
		this.state = {
			timelineWidth: 11,
			timelineHeight: 300,
			visibleLeft: 23,
			visibleWidth: 66,
			version: 0,
		};
		this.myRef = React.createRef();

		this.updateVisibleRange = () => {
			if (this.myRef.current) {
				this.setState({
					visibleLeft: this.myRef.current.scrollLeft,
					visibleWidth: this.myRef.current.clientWidth,
				});
			}
		};
	}

	componentDidMount() {
		this.setState({
			timelineWidth: controller.timeline.getCanvasWidth(),
			timelineHeight: controller.timeline.getCanvasHeight(),
		});
		updateTimelineView = () => {
			this.setState({
				timelineWidth: controller.timeline.getCanvasWidth(),
				timelineHeight: controller.timeline.getCanvasHeight(),
				version: this.state.version + 1,
			});
		};

		scrollTimelineTo = (positionX: number) => {
			if (this.myRef.current != null) {
				let clientWidth = this.myRef.current.clientWidth;
				this.myRef.current.scrollLeft = positionX - clientWidth * 0.6;
			}
			this.updateVisibleRange();
		};

		getVisibleRangeX = () => {
			return {
				left: this.state.visibleLeft,
				width: this.state.visibleWidth,
			};
		};

		this.updateVisibleRange();
	}

	componentWillUnmount() {
		updateTimelineView = () => {};
		scrollTimelineTo = (positionX) => {};
		getVisibleRangeX = () => {};
	}

	render() {
		let canvas = <TimelineCanvas
			timelineHeight={this.state.timelineHeight}
			visibleLeft={this.state.visibleLeft}
			visibleWidth={this.state.visibleWidth}
			version={this.state.version}
		/>;
		const isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;
		return <div style={{ position: "relative" }}>
			{canvas}
			<div
				tabIndex={0}
				className={"visibleScrollbar"}
				style={{
					position: "relative",
					width: "100%",
					overflowX: "scroll",
					overflowY: "clip",
					outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
					cursor: timelineCanvasGetPointerMouse() ? "pointer" : "default",
					paddingBottom: isFirefox ? 10 : 0,
				}}
				ref={this.myRef}
				onScroll={(e) => {
					if (this.myRef.current) {
						this.myRef.current.scrollLeft = Math.min(
							this.myRef.current.scrollWidth - this.myRef.current.clientWidth,
							this.myRef.current.scrollLeft,
						);
						this.setState({
							visibleLeft: this.myRef.current.scrollLeft,
							visibleWidth: this.myRef.current.clientWidth,
						});
					}
				}}
				onMouseMove={(e) => {
					if (this.myRef.current) {
						let rect = this.myRef.current.getBoundingClientRect();
						let x = e.clientX - rect.left;
						let y = e.clientY - rect.top;
						timelineCanvasOnMouseMove(x, y);
					}
				}}
				onMouseEnter={(e) => {
					timelineCanvasOnMouseEnter();
				}}
				onMouseLeave={(e) => {
					timelineCanvasOnMouseLeave();
				}}
				onClick={(e) => {
					timelineCanvasOnClick(e);
				}}
				onKeyDown={(e) => {
					timelineCanvasOnKeyDown(e);
				}}
			>
				<div
					style={{
						position: "relative",
						backgroundColor: "transparent",
						width: this.state.timelineWidth,
						height: this.state.timelineHeight,
						pointerEvents: "none",
					}}
				/>
			</div>
		</div>;
	}
}

export const TIMELINE_SETTINGS_HEIGHT = 320;
export const TIMELINE_COLUMNS_HEIGHT = TIMELINE_SETTINGS_HEIGHT - 40;
function TimelineTabs() {
	return <div
		style={{
			position: "relative",
			margin: 6,
		}}
	>
		<Tabs
			uniqueName={"timeline"}
			maxWidth={1440 /* arbitrary */}
			content={[
				{
					titleNode: localize({ en: "Timeline markers", zh: "时间轴标记" }),
					contentNode: <TimelineMarkers />,
				},
				{
					titleNode: <div
						style={{
							position: "relative",
						}}
					>
						{localize({ en: "Timeline editor ", zh: "时间轴编辑器 " })}
						<Help
							topic={"timeline editor"}
							content={
								<div>
									<div className={"paragraph"} style={{ color: "orangered" }}>
										<b>
											{localize({
												en: "Has the bare minimum features but might still be buggy (let me know). Would recommend going over Instructions/Troubleshoot first, plus saving data to drive in case bugs mess up the entire tool",
												zh: "本编辑器仍在开发中，不过有最基本的各项功能，请务必向我们汇报任何发现的bug。",
											})}
										</b>
									</div>
									<div className={"paragraph"}>
										{localize({
											en: "I hope it's otherwise self-explanatory. Note that edits made here are not saved until they're applied to the actual timeline.",
											zh: "使用前最好先阅读使用指南并时刻保存各项数据。",
										})}
									</div>
								</div>
							}
						/>
					</div>,
					contentNode: <TimelineEditor />,
				},
				{
					titleNode: localize({ en: "Import/Export", zh: "导入/导出" }),
					contentNode: <div>
						<LoadSave />
					</div>,
				},
				{
					titleNode: localize({ en: "Display settings", zh: "显示设置" }),
					contentNode: <TimelineDisplaySettings />,
				},
			]}
			collapsible={true}
			scrollable={false}
			height={TIMELINE_SETTINGS_HEIGHT}
			defaultSelectedIndex={undefined}
		/>
		<Slider
			uniqueName={"timelineDisplayScale"}
			description={localize({ en: "horizontal scale ", zh: "水平缩放 " })}
			defaultValue={"0.4"}
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
			}}
		/>
	</div>;
}

export class Timeline extends React.Component {
	render() {
		return <div
			style={{
				bottom: 0,
				left: 0,
				right: 0,
				paddingLeft: 0, // forgot why I added the left and right paddings...
				paddingRight: 0,
				borderTop: "2px solid " + getCurrentThemeColors().bgHighContrast,
				flex: 0,
			}}
		>
			<TimelineMain />
			<TimelineTabs />
		</div>;
	}
}
