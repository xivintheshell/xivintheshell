import React, { useRef, createContext, useContext, useState, useEffect } from "react";
import { FaLockOpen, FaLock } from "react-icons/fa6";
import { IconContext } from "react-icons";
import { controller } from "../Controller/Controller";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { IS_FIREFOX, Help, Slider, Tabs, TABS_TITLE_HEIGHT } from "./Common";
import { TimelineMarkers } from "./TimelineMarkers";
import { TimelineEditor } from "./TimelineEditor";
import { TimelineCanvas } from "./TimelineCanvas";
import { localize } from "./Localization";
import { getCurrentThemeColors, getThemeField, ColorThemeContext } from "./ColorTheme";

import { LoadSave } from "./LoadSave";
import { TimelineDisplaySettings } from "./TimelineDisplaySettings";

export let updateTimelineView = () => {};

export let scrollTimelineTo = (positionX: number) => {};

const DRAG_LOCK_CACHE_KEY = "dragLock";
// Distance a finger can move while still being considered a single "click" action.
const TAP_SLOP_PX = 10;

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

export interface CanvasCallbacks {
	onMouseMove: (x: number, y: number) => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onMouseUp: (e: React.MouseEvent, x: number, y: number) => void;
	onMouseDown: (x: number, y: number) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

// the actual timeline canvas
function TimelineMain() {
	const myRef = useRef<HTMLDivElement | null>(null);

	const [timelineWidth, setTimelineWidth] = useState(11);
	const [timelineHeight, setTimelineHeight] = useState(300);
	const [visibleLeft, setVisibleLeft] = useState(23);
	const [visibleWidth, setVisibleWidth] = useState(66);
	const [version, setVersion] = useState(0);
	const [pointerMouse, setPointerMouse] = useState(false);
	// We don't provide full support for touch gesters, but several users requested at least
	// basic support more than a year ago.
	// Touching/swiping with a single finger has two possible behaviors:
	// 1. If no skills are selected (or the touch is not on a selected skill): the timeline canvas
	//    and editor tables use the browser's native scroll functionality.
	// 2. If the user touches a selected skill: the selected skills will be clicked and dragged.
	// Other functionality, like click+drag selection, is not supported through touch gestures.
	// This basic level of support should be sufficient for users throwing together something quickly
	// on a phone or tablet device.
	const fromTouch = useRef(false);
	const touchPointerId = useRef<number | null>(null);
	const touchStart = useRef<{ x: number; y: number; scrollLeft: number } | null>(null);
	const [callbacks, setCallbacks] = useState<CanvasCallbacks>({
		onMouseMove: () => {},
		onMouseEnter: () => {},
		onMouseLeave: () => {},
		onMouseUp: () => {},
		onMouseDown: () => {},
		onKeyDown: () => {},
	});

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
		pointerMouse={pointerMouse}
		setCallbacks={setCallbacks}
		setPointerMouse={setPointerMouse}
	/>;
	const scrollerPoint = (clientX: number, clientY: number) => {
		const rect = myRef.current!.getBoundingClientRect();
		return { x: clientX - rect.left, y: clientY - rect.top };
	};
	const colorContext = useContext(ColorThemeContext);
	const bg = getThemeField(colorContext, "bgMediumContrast");
	const firefoxScrollSpacer = IS_FIREFOX ? (
		<div style={{ height: 8 }} tabIndex={-1} />
	) : undefined;
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
				cursor: pointerMouse ? "pointer" : "default",
			}}
			ref={myRef}
			onScroll={() => {
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
				if (fromTouch.current || !myRef.current) return;
				const { x, y } = scrollerPoint(e.clientX, e.clientY);
				callbacks.onMouseMove(x, y);
			}}
			onMouseDown={(e) => {
				if (fromTouch.current || !myRef.current) return;
				const { x, y } = scrollerPoint(e.clientX, e.clientY);
				callbacks.onMouseDown(x, y);
			}}
			onMouseEnter={() => callbacks.onMouseEnter()}
			onMouseLeave={(e) => {
				const next = e.relatedTarget;
				if (next instanceof Element && next.closest("[data-skill-drag-handle]")) return;
				callbacks.onMouseLeave();
			}}
			onMouseUp={(e) => {
				if (fromTouch.current) {
					fromTouch.current = false;
					return;
				}
				if (!myRef.current) return;
				const { x, y } = scrollerPoint(e.clientX, e.clientY);
				callbacks.onMouseUp(e, x, y);
			}}
			onPointerDown={(e) => {
				if (e.pointerType !== "touch" || !myRef.current) return;
				fromTouch.current = true;
				touchPointerId.current = e.pointerId;
				touchStart.current = {
					x: e.clientX,
					y: e.clientY,
					scrollLeft: myRef.current.scrollLeft,
				};
			}}
			onPointerUp={(e) => {
				if (e.pointerType !== "touch" || !touchStart.current || !myRef.current) return;
				const pointerId = e.pointerId;
				const start = touchStart.current;
				touchStart.current = null;
				const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
				const scrolled = Math.abs(myRef.current.scrollLeft - start.scrollLeft) > 1;
				// Compatibility mouse events are ignored while fromTouch is set.
				window.setTimeout(() => {
					if (touchPointerId.current !== pointerId) return;
					fromTouch.current = false;
					touchPointerId.current = null;
				}, 500);
				if (moved > TAP_SLOP_PX || scrolled) return;
				const { x, y } = scrollerPoint(e.clientX, e.clientY);
				// Run both the mousedown and mouseup events to simulate a click.
				callbacks.onMouseDown(x, y);
				callbacks.onMouseUp(e, x, y);
			}}
			onPointerCancel={(e) => {
				if (e.pointerType !== "touch") return;
				const pointerId = e.pointerId;
				touchStart.current = null;
				window.setTimeout(() => {
					if (touchPointerId.current !== pointerId) return;
					fromTouch.current = false;
					touchPointerId.current = null;
				}, 500);
			}}
			onKeyDown={(e) => callbacks.onKeyDown(e)}
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
			{firefoxScrollSpacer}
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
									<div className={"paragraph"}>
										{localize({
											en: 'Table view for editing the current timeline. Changes made here are not saved until the "apply changes" button is pressed.',
											zh: "用于编辑当前时间轴的表格视图。所做的修改在点击“应用并保存”按钮后才会保存。",
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
					titleNode: localize({ en: "Settings", zh: "设置" }),
					contentNode: <TimelineDisplaySettings />,
				},
			]}
			collapsible={true}
			scrollable={false}
			height={TIMELINE_SETTINGS_HEIGHT}
			defaultSelectedIndex={undefined}
		/>
		<div
			style={{
				position: "absolute",
				top: 0,
				right: 6,
				display: "flex",
				flexDirection: "row",
				gap: 20,
			}}
		>
			{renderDragLock && <div
				style={{
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
						en: <div>
							When locked, disables click/drag to rearrange timeline skills.
						</div>,
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
					height: TABS_TITLE_HEIGHT,
					lineHeight: `${TABS_TITLE_HEIGHT}px`,
					verticalAlign: "middle",
				}}
				onChange={(newVal) => {
					controller.timeline.setHorizontalScale(parseFloat(newVal));
					controller.scrollToTime();
				}}
			/>}
		</div>
	</div>;
}

export function Timeline() {
	const [dragLock, setDragLock] = useState(initialDragLock);
	const [[dragTargetIndex, dragTargetTime], setDragTarget] = useState<(number | null)[]>([
		null,
		null,
	]);
	const dragTargetRef = useRef({ index: dragTargetIndex, time: dragTargetTime });
	dragTargetRef.current = { index: dragTargetIndex, time: dragTargetTime };
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
		if (index !== dragTargetRef.current.index || time !== dragTargetRef.current.time) {
			dragTargetRef.current = { index, time };
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
