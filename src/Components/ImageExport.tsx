import React, { useState } from "react";
import { Help, Input, SaveToFile, FileFormat, TimelineDimensions } from "./Common";
import { localize, LocalizedContent } from "./Localization";
import { controller } from "../Controller/Controller";
import { setCachedValue } from "../Controller/Common";
import { getCurrentThemeColors, ThemeColors } from "./ColorTheme";
import { drawRuler, drawMarkerTracks, drawTimelines } from "./TimelineCanvas";

/**
 * Creates a mock canvas to draw the components of the timeline we have selected.
 */
function createMockCanvas(includeTime: boolean, g_colors: ThemeColors): HTMLCanvasElement {
	// 0. Figure out length of selection so we can know the size of the canvas we need
	const activeRenderProps = controller.getTimelineRenderingProps();
	let startTime = activeRenderProps.selectionStartDisplayTime;
	let endTime = activeRenderProps.selectionEndDisplayTime;
	if (startTime === endTime) {
		// No selection was made, so export the whole timeline
		startTime = -activeRenderProps.countdown;
		const DRAW_EXTRA_DURATION = 4; // todo: ideally we'd want to have this just long enough to capture the last skill
		endTime = controller.game.time - activeRenderProps.countdown + DRAW_EXTRA_DURATION;
	}
	const exportConfig = controller.imageExportConfig;
	let nRows: number;
	// # of seconds before a line break
	let rowSeconds: number;
	if (exportConfig.wrapThresholdSeconds === 0) {
		nRows = 1;
		rowSeconds = endTime - startTime;
	} else {
		nRows = Math.ceil((endTime - startTime) / exportConfig.wrapThresholdSeconds);
		rowSeconds = exportConfig.wrapThresholdSeconds;
	}

	// 1. Save old g_ctx so we don't disrupt the rendering of the actual timeline.
	// Create 2 temporary canvases:
	// - dummyOneRowCanvas contains all drawn timeline elements (+ always timeline markers)
	//   in a single row, and is populated by TimelineCanvas methods
	// - dummySplitCanvas splits the image into multiple rows as proscribed by settings,
	//   and is populated by calling getImageData on dummyOneRowCanvas
	const dummyOneRowCanvas = document.createElement("canvas");
	const dummySplitCanvas = document.createElement("canvas");
	const ROW_PADDING = TimelineDimensions.trackHeight / 2; // can make this a config if we want
	const tlController = controller.timeline;
	// We have no control over where to start drawing, so the one-row canvas should always
	// have the whole duration
	// note [myn]: iirc there's a hard limit for html canvas dimensions, so this might fail to capture very long
	// timelines. If it ever becomes an issue we'll have to split it into sections... meh until someone complains
	const countdownWidth = tlController.positionFromTime(activeRenderProps.countdown);
	dummyOneRowCanvas.width = tlController.positionFromTime(endTime) + countdownWidth;
	let rowHeight = TimelineDimensions.renderSlotHeight();
	if (includeTime) {
		rowHeight += TimelineDimensions.rulerHeight;
		rowHeight += TimelineDimensions.trackHeight * tlController.getNumMarkerTracks();
	}
	dummyOneRowCanvas.height = rowHeight;
	const oneRowCtx = dummyOneRowCanvas.getContext("2d", {
		willReadFrequently: true,
	}) as CanvasRenderingContext2D;
	// 2. Request TimelineCanvas functions to draw elements onto our "fake" canvas (oneRowCtx).
	const timelineOrigin = 0;
	// Mimic drawEverything and add components as necessary
	oneRowCtx.fillStyle = g_colors.background;
	oneRowCtx.fillRect(0, 0, dummyOneRowCanvas.width, dummyOneRowCanvas.height);
	let currentHeight = 0;
	const viewInfo = {
		renderingProps: controller.getTimelineRenderingProps(),
		colors: g_colors,
		// these values are meaningless
		visibleLeft: 0,
		visibleWidth: 100,
	};
	if (includeTime) {
		currentHeight += drawRuler({
			ctx: oneRowCtx,
			viewInfo,
			originX: 0,
			ignoreVisibleX: true,
			testInteraction: () => {},
		});
		currentHeight += drawMarkerTracks({
			ctx: oneRowCtx,
			viewInfo,
			originX: timelineOrigin,
			originY: currentHeight,
			ignoreVisibleX: true,
			testInteraction: () => {},
		});
	}
	drawTimelines({
		ctx: oneRowCtx,
		viewInfo,
		isImageExportMode: true,
		originX: timelineOrigin,
		originY: currentHeight,
		testInteraction: () => {},
	});
	// 3. Copy elements off the "fake" canvas (oneRowCtx) onto our row-split canvas.
	// Since all pixel widths are relative to oneRowCtx, all x coordinates must be
	// offset by the width of the countdown segment.
	const xStart = tlController.positionFromTime(startTime) + countdownWidth;
	const xEnd = tlController.positionFromTime(endTime) + countdownWidth;
	dummySplitCanvas.height = (ROW_PADDING + rowHeight) * (nRows - 1) + rowHeight;
	dummySplitCanvas.width =
		nRows === 1 ? xEnd - xStart : tlController.positionFromTime(rowSeconds);
	const splitCtx = dummySplitCanvas.getContext("2d") as CanvasRenderingContext2D;
	for (let i = 0; i < nRows; i++) {
		const w = tlController.positionFromTime(rowSeconds);
		if (xStart > xEnd) {
			break;
		}
		// If drawing the full width w would go past the selection, truncate it.
		const rowWidth = Math.min(xEnd - (xStart + i * w), w);
		const data = oneRowCtx.getImageData(
			xStart + i * w,
			0,
			rowWidth + 1,
			dummyOneRowCanvas.height + 1,
		);
		splitCtx.putImageData(data, 0, i * (ROW_PADDING + rowHeight));
		// If the end was truncated, color in the rest of the line.
		if (i > 0 && rowWidth < w) {
			splitCtx.fillStyle = g_colors.background;
			splitCtx.fillRect(
				rowWidth,
				i * (ROW_PADDING + rowHeight),
				w - rowWidth,
				dummyOneRowCanvas.height + 1,
			);
		}
	}
	return dummySplitCanvas;
}

export function ImageExport() {
	const [state, setState] = useState(controller.imageExportConfig);
	const setConfigField = (field: string, value: any) => {
		const newConfig = Object.assign({}, state);
		(newConfig as any)[field] = value;
		controller.setImageExportConfig(newConfig);
		setState(newConfig);
		setCachedValue("img: " + field, JSON.stringify(value));
	};

	const checkboxStyle = {
		position: "relative",
		top: 3,
		marginRight: "0.25em",
	};

	const checkbox = (field: string, label: LocalizedContent) => <div style={{ marginBottom: 5 }}>
		<input
			type="checkbox"
			onClick={(e) => setConfigField(field, e.currentTarget.checked)}
			value={(state as any)[field] ? "on" : "off"}
			style={checkboxStyle as any}
			defaultChecked={(state as any)[field]}
		/>
		<span>{localize(label)}</span>
	</div>;

	const setWrapThresholdSeconds = (v: string) => {
		if (Number.isNaN(parseFloat(v))) return;
		setConfigField("wrapThresholdSeconds", parseFloat(v));
	};

	const settingsSection = <>
		<div>
			<Input
				defaultValue={state.wrapThresholdSeconds.toString()}
				description={
					<span>
						{localize({
							en: "seconds before wrapping ",
							zh: "每行秒数 ",
						})}
						<Help
							topic={"png-wrap"}
							content={localize({
								en: "number of elapsed seconds, including the countdown, in each row in the image (set to 0 to never wrap)",
								zh: "从开始倒计时算起，每显示多少秒换一次行。如果填0则从不换行。",
							})}
						/>
						:{" "}
					</span>
				}
				onChange={setWrapThresholdSeconds}
				style={{ margin: "10px 0" }}
			/>
		</div>
		{checkbox("includeTime", {
			en: "include time and markers",
			zh: "显示时间刻度和时间轴标记",
		})}
	</>;
	const themeColors = getCurrentThemeColors();
	return <div>
		<p>
			{localize({
				en: <span>
					export the selected part of the timeline as a png according to the current
					display settings, or the whole timeline if nothing is selected
				</span>,
				zh: "根据当前显示设置将时间轴内选择部分导出为png，如果无选择将整个时间轴导出",
			})}
		</p>
		{settingsSection}
		<p>
			<SaveToFile
				filename={"fight"}
				fileFormat={FileFormat.Png}
				getContentFn={() => createMockCanvas(state.includeTime, themeColors)}
				displayName={localize({
					en: "export selection as png",
					zh: "将选择部分导出为png",
				})}
			/>
		</p>
	</div>;
}
