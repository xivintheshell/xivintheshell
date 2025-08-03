import React, { useRef, createContext, useContext, useState, useEffect } from "react";
import { FaLockOpen, FaLock } from "react-icons/fa6";
import { IconContext } from "react-icons";
import { controller } from "../Controller/Controller";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { Help, Slider, Tabs, TABS_TITLE_HEIGHT } from "./Common";
import { TimelineMarkers } from "./TimelineMarkers";
import { TimelineEditor } from "./TimelineEditor";
import {
	TimelineCanvas,
	timelineCanvasGetPointerMouse,
	timelineCanvasOnKeyDown,
	timelineCanvasOnMouseEnter,
	timelineCanvasOnMouseLeave,
	timelineCanvasOnMouseMove,
	timelineCanvasOnMouseDown,
	timelineCanvasOnMouseUp,
} from "./TimelineCanvas";
import { localize } from "./Localization";
import { getCurrentThemeColors, getThemeField, ColorThemeContext } from "./ColorTheme";

import { LoadSave } from "./LoadSave";
import { TimelineDisplaySettings } from "./TimelineDisplaySettings";

export let updateTimelineView = () => {};

export let scrollTimelineTo = (positionX: number) => {};

const DRAG_LOCK_CACHE_KEY = "dragLock";

const initialDragLockStr = getCachedValue(DRAG_LOCK_CACHE_KEY);
const initialDragLock = initialDragLockStr === "true";
export const DragLockContext = createContext<{ value: boolean; setter: (value: boolean) => void }>({
	value: initialDragLock,
	setter: (value: boolean) => {},
});

export interface DragTarget {
	dragTargetIndex: number | null;
	dragTargetTime: number | null;
	setDragTarget: (index: number | null, time: number | null) => void;
}
export const DragTargetContext = createContext<DragTarget>({
	dragTargetIndex: null,
	dragTargetTime: null,
	setDragTarget: (index, time) => {},
});

// the actual timeline canvas
function TimelineMain() {
	const myRef = useRef<HTMLDivElement | null>(null);

	const [timelineWidth, setTimelineWidth] = useState(11);
	const [timelineHeight, setTimelineHeight] = useState(300);
	const [visibleLeft, setVisibleLeft] = useState(23);
	const [visibleWidth, setVisibleWidth] = useState(66);
	const [version, setVersion] = useState(0);

	const updateVisibleRange = () => {
		if (myRef.current) {
			setVisibleLeft(myRef.current.scrollLeft);
			setVisibleWidth(myRef.current.clientWidth);
		}
	};

	// EXTERNAL HOOKS, DOING STATE MANAGEMENT CRIMES
	updateTimelineView = () => {
		setTimelineWidth(controller.timeline.getCanvasWidth());
		setTimelineHeight(controller.timeline.getCanvasHeight());
		setVersion(version + 1);
	};
	scrollTimelineTo = (positionX: number) => {
		if (myRef.current != null) {
			const clientWidth = myRef.current.clientWidth;
			myRef.current.scrollLeft = positionX - clientWidth * 0.6;
		}
		updateVisibleRange();
	};

	useEffect(() => {
		setTimelineWidth(controller.timeline.getCanvasWidth());
		setTimelineHeight(controller.timeline.getCanvasHeight());
		updateVisibleRange();
	}, []);

	const canvas = <TimelineCanvas
		timelineHeight={timelineHeight}
		visibleLeft={visibleLeft}
		visibleWidth={visibleWidth}
		version={version}
	/>;
	const isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;
	const colorContext = useContext(ColorThemeContext);
	const bg = getThemeField(colorContext, "bgMediumContrast");
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
				outline: "1px solid " + bg,
				cursor: timelineCanvasGetPointerMouse() ? "pointer" : "default",
				paddingBottom: isFirefox ? 10 : 0,
			}}
			ref={myRef}
			onScroll={(e) => {
				if (myRef.current) {
					myRef.current.scrollLeft = Math.min(
						myRef.current.scrollWidth - myRef.current.clientWidth,
						myRef.current.scrollLeft,
					);
					setVisibleLeft(myRef.current.scrollLeft);
					setVisibleWidth(myRef.current.clientWidth);
				}
			}}
			onMouseMove={(e) => {
				if (myRef.current) {
					const rect = myRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					timelineCanvasOnMouseMove(x, y);
				}
			}}
			onMouseDown={(e) => {
				if (myRef.current) {
					const rect = myRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					timelineCanvasOnMouseDown(x, y);
				}
			}}
			onMouseEnter={(e) => {
				timelineCanvasOnMouseEnter();
			}}
			onMouseLeave={(e) => {
				timelineCanvasOnMouseLeave();
			}}
			onMouseUp={(e) => {
				if (myRef.current) {
					const rect = myRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					timelineCanvasOnMouseUp(e, x, y);
				}
			}}
			onKeyDown={(e) => {
				timelineCanvasOnKeyDown(e);
			}}
		>
			<div
				style={{
					position: "relative",
					backgroundColor: "transparent",
					width: timelineWidth,
					height: timelineHeight,
					pointerEvents: "none",
				}}
			/>
		</div>
	</div>;
}

export const TIMELINE_SETTINGS_HEIGHT = 320;
export const TIMELINE_COLUMNS_HEIGHT = TIMELINE_SETTINGS_HEIGHT - 40;
function TimelineTabs() {
	const { value: dragLock, setter: setDragLock } = useContext(DragLockContext);
	const colors = useContext(ColorThemeContext);
	// On displays < 1024px in width, do not render the drag lock due to its absolute positioning.
	// While we do not go out of our way to support mobile devices, rendering the drag lock on smaller
	// screens makes the marker and editor tabs completely inaccessible on mobile.
	// On smaller desktop or laptop displays, the drag lock prompt may also clip the button that
	// minimizes the tabset. I [sz] experience this when the browser is on my second monitor with
	// a dev console open to more than half the screen.
	// TODO: use actual layout styling instead so we don't have to deal with this
	const renderDragLock = window.innerWidth > 1024;
	// Similarly, the horizontal scale slider uses absolute positioning and clips into the tabs at about 800px.
	const renderScaleSlider = window.innerWidth > 800;
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
		{renderDragLock && <div
			style={{
				position: "absolute",
				top: 0,
				right: 280,
				height: TABS_TITLE_HEIGHT,
				lineHeight: `${TABS_TITLE_HEIGHT}px`,
				verticalAlign: "middle",
				cursor: "pointer",
				userSelect: "none",
			}}
			onClick={(e) => {
				e.preventDefault();
				setDragLock(!dragLock);
			}}
		>
			{localize({ en: "drag lock", zh: "拖动锁" })}{" "}
			<Help
				topic="dragLock"
				content={localize({
					en: <div>When locked, disables click/drag to rearrange timeline skills.</div>,
					zh: <div>锁定时，禁止用单击并拖动来改变技能轴。</div>,
				})}
			/>{" "}
			<IconContext.Provider
				value={{
					color: dragLock ? (getThemeField(colors, "accent") as string) : undefined,
					style: {
						width: 12,
						height: 12,
						verticalAlign: "baseline",
					},
				}}
			>
				{dragLock ? <FaLock /> : <FaLockOpen />}
			</IconContext.Provider>
		</div>}
		{renderScaleSlider && <Slider
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
		/>}
	</div>;
}

export function Timeline() {
	const [dragLock, setDragLock] = useState(initialDragLock);
	const [[dragTargetIndex, dragTargetTime], setDragTarget] = useState<(number | null)[]>([
		null,
		null,
	]);
	const childDragTargetSetter = (index: number | null, time: number | null) => {
		if (dragLock) {
			index = null;
			time = null;
		} else {
			// Don't render the drag target indicators if the proposed move would have a distance of 0.
			const start = controller.record.selectionStartIndex ?? 0;
			let distance = (index ?? 0) - (start ?? 0);
			// If we need to move the item upwards, then we already have the correct offset.
			// If it needs to move down, we need to subtract the length of the current selection.
			if (distance > 0) {
				distance -= controller.record.getSelectionLength();
			}
			if (distance === 0 || (index !== null && controller.record.isInSelection(index))) {
				index = null;
				time = null;
			}
		}
		// Prevent re-renders if the values are not new.
		if (index !== dragTargetIndex || time !== dragTargetTime) {
			setDragTarget([index, time]);
		}
	};
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
		<DragLockContext.Provider
			value={{
				value: dragLock,
				setter: (value) => {
					setCachedValue(DRAG_LOCK_CACHE_KEY, value.toString());
					setDragLock(value);
				},
			}}
		>
			<DragTargetContext.Provider
				value={{
					dragTargetIndex: dragTargetIndex,
					dragTargetTime: dragTargetTime,
					setDragTarget: childDragTargetSetter,
				}}
			>
				<TimelineMain />
				<TimelineTabs />
			</DragTargetContext.Provider>
		</DragLockContext.Provider>
	</div>;
}
