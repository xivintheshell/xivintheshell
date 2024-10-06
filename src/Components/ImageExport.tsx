import React from 'react';
import {Help, Input, SaveToFile, FileFormat} from "./Common";
import {localize, LocalizedContent} from "./Localization"
import {ImageExportConfig} from "../Controller/ImageExportConfig";
import {controller} from "../Controller/Controller";
import {setCachedValue} from "../Controller/Common";
import {getCurrentThemeColors} from "./ColorTheme";
import {swapCtx, drawRuler, drawMarkerTracks, drawTimelines} from "./TimelineCanvas";


export class ImageExport extends React.Component<{}, ImageExportConfig> {
	setConfigField: (field: string, value: any) => void;
	checkbox: (field: string, label: LocalizedContent) => React.JSX.Element;
	setWrapThresholdSeconds: (v: string) => void;

	constructor(props: {}) {
		super(props);
		this.state = controller.imageExportConfig;
		this.setConfigField = ((field: string, value: any) => {
			const newConfig = Object.assign({}, this.state);
			(newConfig as any)[field] = value;
			controller.setImageExportConfig(newConfig);
			this.setState(newConfig);
			setCachedValue("img: " + field, JSON.stringify(value));
		});

		const checkboxStyle = {
			position: "relative",
			top: 3,
			marginRight: "0.25em"
		};

		this.checkbox = ((field: string, label: LocalizedContent) => (
			<div style={{marginBottom: 5}}>
				<input
					type="checkbox"
					onClick={(e) => this.setConfigField(field, e.currentTarget.checked)}
					value={(this.state as any)[field] ? "on" : "off"}
					style={checkboxStyle as any}
					defaultChecked={(this.state as any)[field]}
				/>
				<span>{localize(label)}</span>
			</div>
		));

		this.setWrapThresholdSeconds = ((v: string) => {
			if (Number.isNaN(parseFloat(v))) return;
			this.setConfigField("wrapThresholdSeconds", parseFloat(v));
		});
	}

	/**
	 * Creates a mock canvas to draw the components of the timeline we have selected.
	 */
	createMockCanvas(): HTMLCanvasElement {
		// 0. Figure out length of selection so we can know the size of the canvas we need
		const activeRenderProps = controller.getTimelineRenderingProps();
		let startTime = activeRenderProps.selectionStartDisplayTime;
		let endTime = activeRenderProps.selectionEndDisplayTime;
		if (startTime === endTime) {
			// No selection was made, so export the whole timeline
			startTime = -activeRenderProps.countdown;
			endTime = controller.game.time;
		}
		const exportConfig = controller.imageExportConfig;
		let nRows: number;
		// # of seconds before a line break
		let rowSeconds: number;
		if (exportConfig.wrapThresholdSeconds === 0) {
			nRows = 1
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
		const ICON_SIZE = 28;
		const ROW_PADDING = ICON_SIZE / 2;
		const tlController = controller.timeline;
		dummyOneRowCanvas.height = activeRenderProps.timelineHeight;
		// We have no control over where to start drawing, so the one-row canvas should always
		// have the whole duration
		const countdownWidth = tlController.positionFromTime(activeRenderProps.countdown);
		dummyOneRowCanvas.width = tlController.positionFromTime(endTime) + countdownWidth;
		// Add ICON_SIZE/2 px of space between rows so ogcds don't collide
		// activeRenderProps.timelineHeight inclues every timeline in the planner, so just
		// manually calculate from hard-coded constants in Timeline.getCanvasHeight()
		let rowHeight = 70 + 20;
		if (this.state.includeTime) {
			rowHeight += 30 + 14 * tlController.getNumMarkerTracks();
		}
		const oneRowCtx = dummyOneRowCanvas.getContext("2d", {willReadFrequently: true}) as CanvasRenderingContext2D;
		// 2. Temporarily swap the active graphics context, and request TimelineCanvas functions to
		// draw elements onto our "fake" canvas (oneRowCtx).
		swapCtx(
			oneRowCtx,
			() => {
				const new_ctx = oneRowCtx;
				const timelineOrigin = 0;
				// Mimic drawEverything and add components as necessary
				const g_colors = getCurrentThemeColors();
				new_ctx.fillStyle = g_colors.background;
				new_ctx.fillRect(0, 0, dummyOneRowCanvas.width, dummyOneRowCanvas.height);
				let currentHeight = 0;
				if (this.state.includeTime) {
					currentHeight += drawRuler(timelineOrigin, true);
					currentHeight += drawMarkerTracks(timelineOrigin, currentHeight, true);
				}
				drawTimelines(timelineOrigin, currentHeight, {
					drawMPTicks: this.state.includeMPAndLucidTicks,
					drawDamageMarks: this.state.includeDamageApplication,
					drawBuffCovers: this.state.includeBuffIndicators,
				})
			}
		);
		// 3. Copy elements off the "fake" canvas (oneRowCtx) onto our row-split canvas.
		// Since all pixel widths are relative to oneRowCtx, all x coordinates must be
		// offset by the width of the countdown segment.
		const xStart = tlController.positionFromTime(startTime) + countdownWidth;
		const xEnd = tlController.positionFromTime(endTime) + countdownWidth;
		dummySplitCanvas.height = (ROW_PADDING + rowHeight) * (nRows - 1) + rowHeight;
		dummySplitCanvas.width = nRows === 1
			? xEnd - xStart
			: tlController.positionFromTime(rowSeconds);
		const splitCtx = dummySplitCanvas.getContext("2d") as CanvasRenderingContext2D;
		for (let i = 0; i < nRows; i++) {
			const w = tlController.positionFromTime(rowSeconds);
			if (xStart > xEnd) {
				break;
			}
			// If drawing the full width w would go past the selection, truncate it.
			const rowWidth = Math.min(xEnd - (xStart + i * w), w);
			const data = oneRowCtx.getImageData(xStart + i * w, 0, rowWidth + 1, dummyOneRowCanvas.height + 1);
			splitCtx.putImageData(data, 0, i * (ROW_PADDING + rowHeight));
			// If the end was truncated, color in the rest of the line.
			if (i > 0 && rowWidth < w) {
				const g_colors = getCurrentThemeColors();
				splitCtx.fillStyle = g_colors.background;
				splitCtx.fillRect(rowWidth, i * (ROW_PADDING + rowHeight), w - rowWidth, dummyOneRowCanvas.height + 1);
			}
		}
		return dummySplitCanvas;
	}

	render() {
		let settingsSection = <>
			<div>
				<Input
					defaultValue={this.state.wrapThresholdSeconds.toString()}
					description={
						<span>{
							localize({
								en: "seconds before wrapping ",
								zh: "每行秒数 "
							})}
							<Help topic={"png-wrap"} content={localize({
								en: "number of elapsed seconds, including the countdown, in each row in the image (set to 0 to never wrap)",
								zh: "从开始倒计时算起，每显示多少秒换一次行。如果填0则从不换行。"
							})}/>
						: </span>
					}
					onChange={this.setWrapThresholdSeconds}
					style={{margin: "10px 0"}}
				/>
			</div>
			{this.checkbox("includeMPAndLucidTicks", {en: "include MP and Lucid ticks", zh: "显示跳蓝和跳醒梦"})}
			{this.checkbox("includeDamageApplication", {en: "include damage applications", zh: "显示伤害结算标记"})}
			{this.checkbox("includeTime", {en: "include time and markers", zh: "显示时间刻度和时间轴标记"})}
			{this.checkbox("includeBuffIndicators", {en: "include buff indicators", zh: "显示buff快照标记"})}
		</>
		return <div>
			{settingsSection}
			<p><SaveToFile
				filename={"fight"}
				fileFormat={FileFormat.Png}
				getContentFn={this.createMockCanvas.bind(this)}
				displayName={localize({
					en: "export selection as png",
					zh: "将选择部分导出为png"
				})}
			/></p>
		</div>
	}
}