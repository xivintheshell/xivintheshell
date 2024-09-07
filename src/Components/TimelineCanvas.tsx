/* eslint-disable @typescript-eslint/no-unused-vars */

import React, {useEffect, useRef, useState} from 'react'
import {
	CursorElem,
	DamageMarkElem,
	ElemType,
	LucidMarkElem,
	MarkerElem, MarkerType, MAX_TIMELINE_SLOTS,
	MPTickMarkElem, SharedTimelineElem,
	SkillElem, SlotTimelineElem,
	TimelineElem, UntargetableMarkerTrack,
	ViewOnlyCursorElem,
	WarningMarkElem
} from "../Controller/Timeline";
import {StaticFn} from "./Common";
import {BuffType, ResourceType, SkillName, WarningType} from "../Game/Common";
// @ts-ignore
import {skillIconImages} from "./Skills";
import {buffIconImages} from "./Buffs";
import {controller} from "../Controller/Controller";
import {localize, localizeBuffType, localizeSkillName} from "./Localization";
import {setEditingMarkerValues} from "./TimelineMarkerPresets";
import {getCurrentThemeColors, ThemeColors} from "./ColorTheme";
import {scrollEditorToFirstSelected} from "./TimelineEditor";
import {bossIsUntargetable} from "../Controller/DamageStatistics";
import {updateTimelineView} from "./Timeline";

export type TimelineRenderingProps = {
	timelineWidth: number,
	timelineHeight: number,
	countdown: number,
	scale: number,
	tincturePotencyMultiplier: number,
	untargetableMask: boolean,
	allMarkers: MarkerElem[],
	untargetableMarkers: MarkerElem[],
	buffMarkers: MarkerElem[],
	sharedElements: SharedTimelineElem[],
	slotElements: SlotTimelineElem[][],
	activeSlotIndex: number,
	showSelection: boolean,
	selectionStartDisplayTime: number,
	selectionEndDisplayTime: number,
}

const c_trackHeight = 14;
const c_buttonHeight = 20;
const c_timelineHeight = 12 + 58;
const c_maxTimelineHeight = 400;
const c_barsOffset = 2;
const c_leftBufferWidth = 20;

let g_ctx : CanvasRenderingContext2D;

let g_visibleLeft = 0;
let g_visibleWidth = 0;
let g_isClickUpdate = false;
let g_clickEvent: any = undefined; // valid when isClickUpdate is true
let g_isKeyboardUpdate = false;
let g_keyboardEvent: any = undefined;
let g_mouseX = 0;
let g_mouseY = 0;
let g_mouseHovered = false;

let g_colors: ThemeColors;

// updated on mouse enter/leave, updated and reset on every draw
let g_activeHoverTip: string[] | undefined = undefined;
let g_activeHoverTipImages: any[] | undefined = undefined;
let g_activeOnClick: (()=>void) | undefined = undefined;

let g_renderingProps: TimelineRenderingProps = {
	timelineWidth: 0,
	timelineHeight: 0,
	countdown: 0,
	scale: 1,
	tincturePotencyMultiplier: 1,
	allMarkers: [],
	untargetableMarkers: [],
	buffMarkers: [],
	untargetableMask: true,
	sharedElements: [],
	slotElements: [],
	activeSlotIndex: 0,
	showSelection: false,
	selectionStartDisplayTime: 0,
	selectionEndDisplayTime: 0,
};

let cachedPointerMouse = false;
let readback_pointerMouse = false;

// qol: event capture mask? So can provide a layer that overwrites keyboard event only and not affect the rest
// all coordinates in canvas space
function testInteraction(
	rect: Rect,
	hoverTip?: string[],
	onClick?: ()=>void,
	pointerMouse?: boolean,
	hoverImages?: any[])
{
	if (g_mouseX >= rect.x && g_mouseX < rect.x + rect.w && g_mouseY >= rect.y && g_mouseY < rect.y + rect.h) {
		g_activeHoverTip = hoverTip;
		g_activeHoverTipImages = hoverImages;
		g_activeOnClick = onClick;
		readback_pointerMouse = pointerMouse === true;
	}
}

const onClickTimelineBackground = ()=>{
	// clicked on background:
	controller.record.unselectAll();
	controller.displayCurrentState();
};

function drawTip(lines: string[], canvasWidth: number, canvasHeight: number, images?: any[]) {
	if (!lines.length) return;

	const lineHeight = 14;
	const imageDimensions = 24;
	const horizontalPadding = 8;
	const verticalPadding = 4;
	g_ctx.font = "12px monospace";

	let maxLineWidth = -1;
	lines.forEach(l=>{ maxLineWidth = Math.max(maxLineWidth, g_ctx.measureText(l).width); });
	let [boxWidth, boxHeight] = [maxLineWidth + 2 * horizontalPadding, lineHeight * lines.length + 2 * verticalPadding];

	if (images && images.length > 0) {
		boxWidth = Math.max(boxWidth, horizontalPadding + images.length * (imageDimensions + horizontalPadding))
		boxHeight += imageDimensions + verticalPadding;
	}

	let x = g_mouseX;
	let y = g_mouseY;

	// compute optimal box position
	const boxToMousePadding = 4;
	const estimatedMouseHeight = 11;
	if (y >= boxHeight + boxToMousePadding) { // put on top
		y = y - boxHeight - boxToMousePadding;
	} else {
		y = y + estimatedMouseHeight + boxToMousePadding;
	}
	if (x - boxWidth / 2 >= 0 && x + boxWidth / 2 < canvasWidth) {
		x = x - boxWidth / 2;
	} else if (x - boxWidth / 2 < 0) {
		x = 0;
	} else {
		x = canvasWidth - boxWidth;
	}

	// start drawing
	g_ctx.strokeStyle = g_colors.bgHighContrast;
	g_ctx.lineWidth = 1;
	g_ctx.fillStyle = g_colors.tipBackground;
	g_ctx.fillRect(x, y, boxWidth, boxHeight);
	g_ctx.strokeRect(x, y, boxWidth, boxHeight);

	g_ctx.fillStyle = g_colors.emphasis;
	g_ctx.textBaseline = "top";
	g_ctx.textAlign = "left";
	for (let i = 0; i < lines.length; i++) {
		g_ctx.fillText(lines[i], x + horizontalPadding, y + i * lineHeight + 2 + verticalPadding);
	}
	let initialImageX = x + horizontalPadding
	let initialImageY = y + lines.length * lineHeight + 2 + verticalPadding;
	if (images) {
		for (let i = 0; i < images.length; i++) {
			if (images[i])
			{
				g_ctx.drawImage(images[i], initialImageX + i * imageDimensions, initialImageY, imageDimensions * 0.75, imageDimensions)
			}
		}
	}
}

function drawMarkers(
	countdown: number,
	scale: number,
	markerTracksTopY: number,
	markerTracksBottomY: number, // bottom Y of track 0
	timelineOrigin: number,
	trackBins: Map<number, MarkerElem[]>,
) {
	// markers
	g_ctx.lineCap = "round";
	g_ctx.lineWidth = 4;
	g_ctx.font = "11px monospace";
	g_ctx.textAlign = "left";
	trackBins.forEach((elems, track)=>{
		let top = markerTracksBottomY - (track + 1) * c_trackHeight;
		if (track === UntargetableMarkerTrack) {
			top = markerTracksTopY;
		}
		for (let i = 0; i < elems.length; i++) {
			let m = elems[i];

			let localizedDescription = m.description;
			if (m.markerType === MarkerType.Untargetable) localizedDescription = localize({en: "Untargetable", zh: "不可选中"}) as string;
			else if (m.markerType === MarkerType.Buff) localizedDescription = (localizeBuffType(m.description as BuffType));

			let left = timelineOrigin + StaticFn.positionFromTimeAndScale(m.time + countdown, scale);
			let onClick = ()=>{
				let success = controller.timeline.deleteMarker(m);
				console.assert(success);
				controller.updateStats();
				setEditingMarkerValues(m);
			};
			if (m.duration > 0) {
				let markerWidth = StaticFn.positionFromTimeAndScale(m.duration, scale);
				if (m.markerType === MarkerType.Buff) {
					g_ctx.fillStyle = m.color + g_colors.timeline.markerAlpha;
					g_ctx.fillRect(left, top, markerWidth, c_trackHeight);
					let img = buffIconImages.get(m.description as BuffType);
					if (img) g_ctx.drawImage(img, left, top, c_trackHeight * 0.75, c_trackHeight);
					g_ctx.fillStyle = g_colors.emphasis;
					g_ctx.fillText(localizedDescription, left + (c_trackHeight * 1.5), top + 10);
				}
				else if (m.showText) {
					g_ctx.fillStyle = m.color + g_colors.timeline.markerAlpha;
					g_ctx.fillRect(left, top, markerWidth, c_trackHeight);
					g_ctx.fillStyle = g_colors.emphasis;
					g_ctx.fillText(localizedDescription, left + c_trackHeight / 2, top + 10);
				} else {
					g_ctx.strokeStyle = m.color;
					g_ctx.beginPath();
					g_ctx.moveTo(left, top + c_trackHeight / 2);
					g_ctx.lineTo(left + markerWidth, top + c_trackHeight / 2);
					g_ctx.stroke();
				}
				let timeStr = m.time + " - " + parseFloat((m.time + m.duration).toFixed(3));
				testInteraction(
					{x: left, y: top, w: Math.max(markerWidth, c_trackHeight), h: c_trackHeight},
					["[" + timeStr + "] " + localizedDescription],
					onClick);
			} else {
				g_ctx.fillStyle = m.color;
				g_ctx.beginPath();
				g_ctx.ellipse(left, top + c_trackHeight / 2, 4, 4, 0, 0, 2 * Math.PI);
				g_ctx.fill();
				if (m.showText) {
					g_ctx.fillStyle = g_colors.emphasis;
					g_ctx.beginPath()
					g_ctx.fillText(localizedDescription, left + c_trackHeight / 2, top + 10);
				}
				testInteraction(
					{x: left - c_trackHeight / 2, y: top, w: c_trackHeight, h: c_trackHeight},
					["[" + m.time + "] " + localizedDescription],
					onClick);
			}
		}
	});
}

function drawMPTickMarks(
	countdown: number,
	scale: number,
	originX: number,
	originY: number,
	elems: MPTickMarkElem[]
) {
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = g_colors.timeline.mpTickMark;
	g_ctx.beginPath();
	elems.forEach(tick=>{
		let x = originX + StaticFn.positionFromTimeAndScale(tick.displayTime, scale);
		g_ctx.moveTo(x, originY);
		g_ctx.lineTo(x, originY + c_timelineHeight);

		testInteraction(
			{x: x-2, y: originY, w: 4, h: c_timelineHeight},
			["[" + tick.displayTime.toFixed(3) + "] " + tick.sourceDesc]
		);
	});
	g_ctx.stroke();
}

function drawWarningMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: WarningMarkElem[]
) {
	g_ctx.font = "bold 10px monospace";
	elems.forEach(mark=>{
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);
		const sideLength = 12;
		const bottomY = timelineOriginY + sideLength;
		g_ctx.beginPath();
		g_ctx.textAlign = "center";
		g_ctx.moveTo(x, bottomY-sideLength);
		g_ctx.lineTo(x-sideLength/2, bottomY);
		g_ctx.lineTo(x+sideLength/2, bottomY);
		g_ctx.fillStyle = g_colors.timeline.warningMark;
		g_ctx.fill();
		g_ctx.fillStyle = "white";
		g_ctx.fillText("!", x, bottomY-1);

		let message: string = "[" + mark.displayTime.toFixed(3) + "] ";
		if (mark.warningType === WarningType.PolyglotOvercap) {
			message += localize({en: "polyglot overcap!", zh: "通晓溢出！"});
		}
		if (mark.warningType === WarningType.CometOverwrite) {
			message += localize({en: "comet overwrite!", zh: "彗星覆写！"});
		}
		if (mark.warningType === WarningType.PaletteOvercap) {
			message += localize({en: "palette gauge overcap!", zh: "调色板溢出！"});
		}

		testInteraction(
			{x: x-sideLength/2, y: bottomY-sideLength, w: sideLength, h: sideLength}, [message]
		);
	});
}

function drawDamageMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: DamageMarkElem[]
) {
	elems.forEach(mark=>{
		let untargetable = bossIsUntargetable(mark.displayTime);
		g_ctx.fillStyle = untargetable ? g_colors.timeline.untargetableDamageMark : g_colors.timeline.damageMark;
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);
		g_ctx.beginPath();
		g_ctx.moveTo(x-3, timelineOriginY);
		g_ctx.lineTo(x+3, timelineOriginY);
		g_ctx.lineTo(x, timelineOriginY+6);
		g_ctx.fill();

		let dm = mark;
		// pot?
		let pot = false;
		dm.buffs.forEach(b=>{
			if (b===ResourceType.Tincture) pot = true;
		});
		// hover text
		let time = "[" + dm.displayTime.toFixed(3) + "] ";
		let untargetableStr = localize({en: "Untargetable", zh: "不可选中"}) as string;
		let info = "";
		let sourceStr = dm.sourceDesc.replace("{skill}", localizeSkillName(dm.sourceSkill));
		let buffImages = [];
		if (untargetable) {
			info = (0).toFixed(3) + " (" + sourceStr + ")";
		} else {
			const potency = dm.potency.getAmount({tincturePotencyMultiplier: g_renderingProps.tincturePotencyMultiplier, includePartyBuffs: true});
			info = potency.toFixed(2) + " (" + sourceStr + ")";
			if (pot) buffImages.push(buffIconImages.get(BuffType.Tincture));

			dm.potency.getPartyBuffs().forEach(desc => {
				buffImages.push(buffIconImages.get(desc));
			});
		}

		testInteraction(
			{x: x-3, y: timelineOriginY, w: 6, h: 6},
			untargetable ? [time + info, untargetableStr] : [time + info],
			undefined,
			undefined,
			buffImages
		);
	});
}
function drawLucidMarks(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: LucidMarkElem[]
) {
	g_ctx.fillStyle = g_colors.timeline.lucidTickMark;
	elems.forEach(mark=>{
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);
		g_ctx.beginPath();
		g_ctx.moveTo(x-3, timelineOriginY);
		g_ctx.lineTo(x+3, timelineOriginY);
		g_ctx.lineTo(x, timelineOriginY + 6);
		g_ctx.fill();

		// hover text
		let hoverText = "[" + mark.displayTime.toFixed(3) + "] " + mark.sourceDesc.replace("{skill}", localizeSkillName(SkillName.LucidDreaming));
		testInteraction(
			{x: x-3, y: timelineOriginY, w: 6, h: 6},
			[hoverText]
		);
	});
}

type Rect = {x: number, y: number ,w: number, h: number};
function drawSkills(
	countdown: number,
	scale: number,
	timelineOriginX: number,
	timelineOriginY: number,
	elems: SkillElem[],
	interactive: boolean,
	drawBuffCovers: boolean
) {
	let greyLockBars: Rect[] = [];
	let purpleLockBars: Rect[] = [];
	let gcdBars: Rect[] = [];
	let snapshots: number[] = [];
	let llCovers: Rect[] = [];  // or hyperphantasia
	let starryCovers: Rect[] = [];
	let potCovers: Rect[] = [];
	let buffCovers: Rect[] = [];
	let skillIcons: {elem: SkillElem, x: number, y: number}[] = []; // tmp
	let skillsTopY = timelineOriginY + 14;
	elems.forEach(e=>{
		let skill = e as SkillElem;
		let x = timelineOriginX + StaticFn.positionFromTimeAndScale(skill.displayTime, scale);
		let y = skill.isGCD ? (skillsTopY + 14) : skillsTopY;
		// purple/grey bar
		let lockbarWidth = StaticFn.positionFromTimeAndScale(skill.lockDuration, scale);
		if (skill.isSpellCast) {
			purpleLockBars.push({x: x+c_barsOffset, y: y, w: lockbarWidth-c_barsOffset, h: 14});
			snapshots.push(x + StaticFn.positionFromTimeAndScale(skill.relativeSnapshotTime, scale));
		} else {
			greyLockBars.push({x: x+c_barsOffset, y: y, w: lockbarWidth-c_barsOffset, h: 28});
		}
		// green gcd recast bar
		if (skill.isGCD) {
			let recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			gcdBars.push({x: x+c_barsOffset, y: y + 14, w: recastWidth-c_barsOffset, h: 14});
		}

		// node covers (LL, pot, party buff)
		let nodeCoverCount = 0;
		if (skill.node.hasBuff(BuffType.StarryMuse))
			nodeCoverCount += buildCover(nodeCoverCount, starryCovers);
		if (skill.node.hasBuff(BuffType.LeyLines) || skill.node.hasBuff(BuffType.Hyperphantasia))
			nodeCoverCount += buildCover(nodeCoverCount, llCovers);
		if (skill.node.hasBuff(BuffType.Tincture))
			nodeCoverCount += buildCover(nodeCoverCount, potCovers);
		if (skill.node.hasPartyBuff())
			buildCover(nodeCoverCount, buffCovers);

		function buildCover(existingCovers: number, collection: Rect[]) {
			if (drawBuffCovers) {
				collection.push({x: x, y: y + 28 + existingCovers*4, w: 28, h: 4});
			}
			return 1;
		}

		// skill icon
		let img = skillIconImages.get(skill.skillName);
		if (img) skillIcons.push({elem: e, x: x, y: y});
	});

	// purple
	g_ctx.fillStyle = g_colors.timeline.castBar;
	g_ctx.beginPath();
	purpleLockBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// snapshot bar
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = "rgba(151, 85, 239, 0.4)";
	g_ctx.beginPath();
	snapshots.forEach(x=>{
		g_ctx.moveTo(x, skillsTopY + 14);
		g_ctx.lineTo(x, skillsTopY + 28);
	});
	g_ctx.stroke();

	// green
	g_ctx.fillStyle = g_colors.timeline.gcdBar;
	g_ctx.beginPath();
	gcdBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// grey
	g_ctx.fillStyle = g_colors.timeline.lockBar;
	g_ctx.beginPath();
	greyLockBars.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// starryCovers
	g_ctx.fillStyle = g_colors.timeline.buffCover;
	g_ctx.beginPath();
	starryCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// llCovers
	g_ctx.fillStyle = g_colors.timeline.llCover;
	g_ctx.beginPath();
	llCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// potCovers
	g_ctx.fillStyle = g_colors.timeline.potCover;
	g_ctx.beginPath();
	potCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// buffCovers
	g_ctx.fillStyle = g_colors.timeline.buffCover;
	g_ctx.beginPath();
	buffCovers.forEach(r=>{
		g_ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive) testInteraction(r, undefined, onClickTimelineBackground);
	});
	g_ctx.fill();

	// icons
	g_ctx.beginPath();
	skillIcons.forEach(icon=>{
		g_ctx.drawImage(skillIconImages.get(icon.elem.skillName), icon.x, icon.y, 28, 28);
		let node = icon.elem.node;

		let lines: string[] = [];
		let buffImages: HTMLImageElement[] = [];

		// 1. description
		let description = localizeSkillName(icon.elem.skillName) + "@" + (icon.elem.displayTime).toFixed(3);
		lines.push(description);

		// 2. potency
		const potency = node.getPotency({
			tincturePotencyMultiplier: g_renderingProps.tincturePotencyMultiplier,
			includePartyBuffs: true,
			untargetable: bossIsUntargetable}).applied;
		if (node.getPotencies().length > 0) {
			lines.push(localize({en: "potency: ", zh: "威力："}) + potency.toFixed(2));
		}

		// 3. duration
		let lockDuration = 0;
		if (node.tmp_endLockTime!==undefined && node.tmp_startLockTime!==undefined) {
			lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
		}
		lines.push(localize({en: "duration: ", zh: "耗时："}) + lockDuration.toFixed(3));

		// 4. buff images
		if (node.hasBuff(BuffType.LeyLines)) buffImages.push(buffIconImages.get(BuffType.LeyLines) as HTMLImageElement);
		if (node.hasBuff(BuffType.Tincture)) buffImages.push(buffIconImages.get(BuffType.Tincture) as HTMLImageElement);
		if (node.hasBuff(BuffType.StarryMuse)) buffImages.push(buffIconImages.get(BuffType.StarryMuse) as HTMLImageElement);
		node.getPartyBuffs().forEach(buffType => {
			let img = buffIconImages.get(buffType);
			if (img) buffImages.push(img);
		});

		if (interactive) {
			testInteraction(
				{x: icon.x, y: icon.y, w: 28, h: 28},
				lines,
				() => {
					controller.timeline.onClickTimelineAction(node, g_clickEvent ? g_clickEvent.shiftKey : false);
					scrollEditorToFirstSelected();
				},
				true,
				buffImages);
		} else {
			testInteraction(
				{x: icon.x, y: icon.y, w: 28, h: 28},
				lines,
				() => {},
				false,
				buffImages);
		}
	});
}

function drawCursor(x: number, color: string, tip: string) {
	g_ctx.fillStyle = color;
	g_ctx.beginPath();
	g_ctx.moveTo(x-3, 0);
	g_ctx.lineTo(x+3, 0);
	g_ctx.lineTo(x, 6);
	g_ctx.fill();

	g_ctx.strokeStyle = color;
	g_ctx.lineWidth = 1;
	g_ctx.beginPath();
	g_ctx.moveTo(x, 0);
	g_ctx.lineTo(x, c_maxTimelineHeight);
	g_ctx.stroke();

	testInteraction({x: x-3, y: 0, w: 6, h: c_maxTimelineHeight}, [tip]);
}

export function drawRuler(originX: number, ignoreVisibleX = false) : number {
	// If we're in image export mode, ignore the visibility limit
	const xUpperBound = ignoreVisibleX
		? StaticFn.positionFromTimeAndScale(controller.game.time + g_renderingProps.countdown, g_renderingProps.scale)
		: g_visibleWidth;
	// ruler bg
	g_ctx.fillStyle = g_colors.timeline.ruler;
	g_ctx.fillRect(0, 0, xUpperBound, 30);
	let displayTime = StaticFn.timeFromPositionAndScale(g_mouseX - originX, g_renderingProps.scale) - g_renderingProps.countdown;
	// leave the left most section not clickable
	testInteraction(
		{x: c_leftBufferWidth, y: 0, w: xUpperBound - c_leftBufferWidth, h: 30},
		[displayTime.toFixed(3)],
		()=>{
			if (displayTime < controller.game.getDisplayTime() && displayTime >= -controller.game.config.countdown) {
				controller.displayHistoricalState(displayTime, undefined); // replay the actions as-is
			} else {
				controller.displayCurrentState();
			}
		});

	// ruler marks
	g_ctx.lineCap = "butt";
	g_ctx.beginPath();
	let pixelsPerSecond = g_renderingProps.scale * 100;
	let countdownPadding = g_renderingProps.countdown * pixelsPerSecond;
	g_ctx.lineWidth = 1;
	g_ctx.strokeStyle = g_colors.text;
	g_ctx.textBaseline = "alphabetic";

	g_ctx.font = "13px monospace";
	g_ctx.textAlign = "center";
	g_ctx.fillStyle = g_colors.text;
	const cullThreshold = 50;
	if (pixelsPerSecond >= 6) {
		for (let x = 0; x < g_renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond) {
			let pos = originX + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= xUpperBound + cullThreshold) {
				g_ctx.moveTo(pos, 0);
				g_ctx.lineTo(pos, 6);
			}
		}
		for (let x = -pixelsPerSecond; x >= -countdownPadding; x -= pixelsPerSecond) {
			let pos = originX + x + countdownPadding;
			if (pos >= -cullThreshold && pos <= xUpperBound + cullThreshold) {
				g_ctx.moveTo(pos, 0);
				g_ctx.lineTo(pos, 6);
			}
		}
	}
	for (let x = 0; x < g_renderingProps.timelineWidth - countdownPadding; x += pixelsPerSecond * 5) {
		let pos = originX + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= xUpperBound + cullThreshold) {
			g_ctx.moveTo(pos, 0);
			g_ctx.lineTo(pos, 10);
			g_ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	for (let x = -pixelsPerSecond * 5; x >= -countdownPadding; x -= pixelsPerSecond * 5) {
		let pos = originX + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= xUpperBound + cullThreshold) {
			g_ctx.moveTo(pos, 0);
			g_ctx.lineTo(pos, 10);
			g_ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
		}
	}
	g_ctx.stroke();

	return 30;
}

export function drawMarkerTracks(originX: number, originY: number, ignoreVisibleX = false) : number {
	// If we're in image export mode, ignore the visibility limit
	const xUpperBound = ignoreVisibleX
		? StaticFn.positionFromTimeAndScale(controller.game.time + g_renderingProps.countdown, g_renderingProps.scale)
		: g_visibleWidth;
	// make trackbins
	let trackBins = new Map<number, MarkerElem[]>();
	g_renderingProps.allMarkers
		.forEach(marker => {
			let trackBin = trackBins.get(marker.track);
			if (trackBin === undefined) trackBin = [];
			trackBin.push(marker);
			trackBins.set(marker.track, trackBin);
	});

	// tracks background
	g_ctx.beginPath();
	let numTracks = 0;
	let hasUntargetableTrack = false;
	for (let k of trackBins.keys()) {
		numTracks = Math.max(numTracks, k + 1);
		if (k === UntargetableMarkerTrack) hasUntargetableTrack = true;
	}
	if (hasUntargetableTrack) numTracks += 1;
	let markerTracksBottomY = originY + numTracks * c_trackHeight;
	g_ctx.fillStyle = g_colors.timeline.tracks;
	for (let i = 0; i < numTracks; i += 2) {
		let top = markerTracksBottomY - (i + 1) * c_trackHeight;
		g_ctx.rect(0, top, xUpperBound, c_trackHeight);
	}
	g_ctx.fill();

	// timeline markers
	drawMarkers(g_renderingProps.countdown, g_renderingProps.scale, originY, markerTracksBottomY, originX, trackBins);

	return numTracks * c_trackHeight;

}

export function drawTimelines(originX: number, originY: number, imageExportSettings?: {
	drawMPTicks: boolean,
	drawDamageMarks: boolean,
	drawBuffCovers: boolean,
}): number {
	// Flags used by the image export feature -- if this function is just called during normal
	// timeline rendering, these should all be drawn.
	const isImageExportMode = imageExportSettings !== undefined;
	const shouldDrawMPTicks = imageExportSettings?.drawMPTicks ?? true;
	const shouldDrawDamageMarks = imageExportSettings?.drawDamageMarks ?? true;
	const shouldDrawBuffCovers = imageExportSettings?.drawBuffCovers ?? true;

	let sharedElemBins = new Map<ElemType, TimelineElem[]>();
	g_renderingProps.sharedElements.forEach(e=>{
		let arr = sharedElemBins.get(e.type) ?? [];
		arr.push(e);
		sharedElemBins.set(e.type, arr);
	});

	// fracCoord.x of displayTime=0
	let displayOriginX = originX + StaticFn.positionFromTimeAndScale(g_renderingProps.countdown, g_renderingProps.scale);

	for (let slot = 0; slot < g_renderingProps.slotElements.length; slot++) {

		let isActiveSlot = slot === g_renderingProps.activeSlotIndex;
		let elemBins = new Map<ElemType, TimelineElem[]>();
		if (isImageExportMode && !isActiveSlot) {
			// Only draw the active timeline in export mode
			continue;
		}
		g_renderingProps.slotElements[slot].forEach(e=>{
			let arr = elemBins.get(e.type) ?? [];
			arr.push(e);
			elemBins.set(e.type, arr);
		});
		let currentY = originY + slot * c_timelineHeight;
		if (isImageExportMode) {
			// Only draw the active timeline in export mode
			currentY = originY;
		}

		// mp tick marks
		if (shouldDrawMPTicks) {
			drawMPTickMarks(g_renderingProps.countdown, g_renderingProps.scale, displayOriginX, currentY, elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[] ?? []);
		}

		// damage marks
		if (shouldDrawDamageMarks) {
			drawDamageMarks(g_renderingProps.countdown, g_renderingProps.scale, displayOriginX, currentY, elemBins.get(ElemType.DamageMark) as DamageMarkElem[] ?? []);
		}

		// lucid marks
		if (shouldDrawMPTicks) {
			drawLucidMarks(g_renderingProps.countdown, g_renderingProps.scale, displayOriginX, currentY, elemBins.get(ElemType.LucidMark) as LucidMarkElem[] ?? []);
		}

		// warning marks (polyglot overcap)
		drawWarningMarks(g_renderingProps.countdown, g_renderingProps.scale, displayOriginX, currentY, elemBins.get(ElemType.WarningMark) as WarningMarkElem[] ?? []);

		// skills
		drawSkills(g_renderingProps.countdown, g_renderingProps.scale, displayOriginX, currentY, elemBins.get(ElemType.Skill) as SkillElem[] ?? [], isActiveSlot, shouldDrawBuffCovers);

		// selection rect
		if (g_renderingProps.showSelection && isActiveSlot && !isImageExportMode) { 
			g_ctx.fillStyle = "rgba(147, 112, 219, 0.15)";
			let selectionLeftPx = displayOriginX + StaticFn.positionFromTimeAndScale(g_renderingProps.selectionStartDisplayTime, g_renderingProps.scale);
			let selectionWidthPx = StaticFn.positionFromTimeAndScale(g_renderingProps.selectionEndDisplayTime - g_renderingProps.selectionStartDisplayTime, g_renderingProps.scale);
			g_ctx.fillRect(selectionLeftPx, currentY, selectionWidthPx, c_timelineHeight);
			g_ctx.strokeStyle = "rgba(147, 112, 219, 0.5)";
			g_ctx.lineWidth = 1;
			g_ctx.beginPath();
			g_ctx.moveTo(selectionLeftPx, currentY);
			g_ctx.lineTo(selectionLeftPx, currentY + c_timelineHeight);
			g_ctx.moveTo(selectionLeftPx + selectionWidthPx, currentY);
			g_ctx.lineTo(selectionLeftPx + selectionWidthPx, currentY + c_timelineHeight);
			g_ctx.stroke();
		}

	}
	// countdown grey rect
	let countdownWidth = StaticFn.positionFromTimeAndScale(g_renderingProps.countdown, g_renderingProps.scale);
	let countdownHeight = c_timelineHeight * g_renderingProps.slotElements.length;
	if (g_renderingProps.slotElements.length < MAX_TIMELINE_SLOTS) countdownHeight += c_buttonHeight;
	g_ctx.fillStyle = g_colors.timeline.countdown;
	// make it cover the left padding as well:
	g_ctx.fillRect(originX - c_leftBufferWidth, originY, countdownWidth + c_leftBufferWidth, countdownHeight);

	if (isImageExportMode) {
		// In image export mode, don't render slot selection bars
		return c_timelineHeight;
	}

	// view only cursor
	(sharedElemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach(cursor=>{
		let vcursor = cursor as ViewOnlyCursorElem
		if (vcursor.enabled) {
			let x = displayOriginX + StaticFn.positionFromTimeAndScale(cursor.displayTime, g_renderingProps.scale);
			drawCursor(x, g_colors.historical, localize({en: "cursor: ", zh: "光标："}) + vcursor.displayTime.toFixed(3));
		}
	});

	// cursor
	(sharedElemBins.get(ElemType.s_Cursor) ?? []).forEach(elem=>{
		let cursor = elem as CursorElem;
		let x = displayOriginX + StaticFn.positionFromTimeAndScale(cursor.displayTime, g_renderingProps.scale);
		drawCursor(x, g_colors.emphasis, localize({en: "cursor: ", zh: "光标："}) + cursor.displayTime.toFixed(3));
	});

	// slot selection bars
	for (let slot = 0; slot < g_renderingProps.slotElements.length; slot++) {
		let currentY = originY + slot * c_timelineHeight;
		let handle : Rect = {
			x: 0,
			y: currentY + 1,
			w: 14,
			h: c_timelineHeight - 2
		};
		g_ctx.fillStyle = slot === g_renderingProps.activeSlotIndex ? g_colors.accent : g_colors.bgMediumContrast;
		g_ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		testInteraction(handle, slot===g_renderingProps.activeSlotIndex ? undefined : [localize({en: "set active", zh: "设为当前"}) as string], () => {
			controller.setActiveSlot(slot);
		}, true);

		// delete btn
		if (g_renderingProps.slotElements.length > 1) {
			g_ctx.fillStyle = g_colors.emphasis;
			g_ctx.font = "bold 14px monospace";
			g_ctx.textAlign = "center";
			g_ctx.fillText("×", handle.x + handle.w/2, handle.y + handle.h - 4);
			let deleteBtn : Rect = {
				x: handle.x,
				y: handle.y + handle.h - handle.w,
				w: handle.w,
				h: handle.w
			};
			testInteraction(deleteBtn, [localize({en: "delete", zh: "删除"}) as string], () => {
				controller.timeline.removeSlot(slot);
				controller.displayCurrentState();
			}, true);
		}
	}
	let timelineSectionHeight = c_timelineHeight * g_renderingProps.slotElements.length;

	// add button
	if (g_renderingProps.slotElements.length < MAX_TIMELINE_SLOTS) {
		let currentY = originY + g_renderingProps.slotElements.length * c_timelineHeight;
		let handle : Rect = {
			x: 4,
			y: currentY + 2,
			w: 192,
			h: c_buttonHeight - 4
		};
		g_ctx.fillStyle = g_colors.bgLowContrast;
		g_ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		g_ctx.strokeStyle = g_colors.bgHighContrast;
		g_ctx.lineWidth = 1;
		g_ctx.strokeRect(handle.x, handle.y, handle.w, handle.h);
		g_ctx.font = "13px monospace";
		g_ctx.fillStyle = g_colors.text;
		g_ctx.textAlign = "center";
		g_ctx.fillText(localize({en: "Add timeline slot", zh: "添加时间轴"}) as string, handle.x + handle.w/2, handle.y + handle.h - 4);

		testInteraction(handle, undefined, () => {
			controller.timeline.addSlot();
			controller.displayCurrentState();
		}, true);

		timelineSectionHeight += c_buttonHeight;
	}

	return timelineSectionHeight;
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawEverything() {

	let timelineOrigin = -g_visibleLeft + c_leftBufferWidth; // fragCoord.x (...) of rawTime=0.
	let currentHeight = 0;

	// background white
	g_ctx.fillStyle = g_colors.background;
	// add 1 here because this scaled dimension from dpr may not perfectly cover the entire canvas
	g_ctx.fillRect(0, 0, g_visibleWidth + 1, g_renderingProps.timelineHeight + 1);
	testInteraction({x: 0, y: 0, w: g_visibleWidth, h: c_maxTimelineHeight}, undefined, onClickTimelineBackground);

	currentHeight += drawRuler(timelineOrigin);

	currentHeight += drawMarkerTracks(timelineOrigin, currentHeight);

	currentHeight += drawTimelines(timelineOrigin, currentHeight);

	// interactive layer
	if (g_mouseHovered) {
		if (g_activeHoverTip) {
			drawTip(g_activeHoverTip, g_visibleWidth, g_renderingProps.timelineHeight, g_activeHoverTipImages);
		}
		if (g_isClickUpdate && g_activeOnClick) {
			g_activeOnClick();
		}
	}
}

// (layers for optimization, in case one day rendering becomes the performance bottleneck again: )
// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM

export let timelineCanvasOnMouseMove: (x: number, y: number) => void = (x:number, y: number) => {};
export let timelineCanvasOnMouseEnter: () => void = () => {};
export let timelineCanvasOnMouseLeave: () => void = () => {};
export let timelineCanvasOnClick: (e: any) => void = (e: any) => {};
export let timelineCanvasOnKeyDown: (e: any) => void = (e: any) => {};

export let timelineCanvasGetPointerMouse: () => boolean = () => { return readback_pointerMouse; }

export function TimelineCanvas(props: {
	timelineHeight: number,
	visibleLeft: number,
	visibleWidth: number,
	version: number
}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const dpr = window.devicePixelRatio;
	let scaledWidth = props.visibleWidth * dpr;
	let scaledHeight = props.timelineHeight * dpr;

	const [mouseX, setMouseX] = useState(0);
	const [mouseY, setMouseY] = useState(0);
	const [mouseHovered, setMouseHovered] = useState(false);
	const [clickCounter, setClickCounter] = useState(0);
	const [keyCounter, setKeyCounter] = useState(0);

	// initialization
	useEffect(()=>{
		timelineCanvasOnMouseMove = (x: number, y: number) => {
			g_mouseX = x;
			g_mouseY = y;
			setMouseX(g_mouseX);
			setMouseY(g_mouseY);
		};
		timelineCanvasOnMouseEnter = () => {
			setMouseHovered(true);
			g_mouseHovered = true;
		};
		timelineCanvasOnMouseLeave = () => {
			setMouseHovered(false);
			g_mouseHovered = false;
		};
		// ignore KB & M input when in the middle of using a skill (for simplicity)
		timelineCanvasOnClick = (e: any) => {
			if (!controller.shouldLoop) {
				setClickCounter(c => c + 1);
				g_isClickUpdate = true;
				g_clickEvent = e;
			}
		};
		timelineCanvasOnKeyDown = (e: any) => {
			if (!controller.shouldLoop) {
				setKeyCounter(k => k + 1);
				g_isKeyboardUpdate = true;
				g_keyboardEvent = e;
				if (g_keyboardEvent.key === "Backspace" || g_keyboardEvent.key === "Delete") {
					let firstSelected = controller.record.getFirstSelection();
					if (firstSelected) {
						controller.rewindUntilBefore(firstSelected, false);
						controller.displayCurrentState();
						controller.updateAllDisplay();
						controller.autoSave();
					}
				}
			}
		};
	}, []);

	useEffect(()=>{
		g_activeHoverTip = undefined;
		g_activeOnClick = undefined;
		g_visibleLeft = props.visibleLeft;
		g_visibleWidth = props.visibleWidth;
		g_colors = getCurrentThemeColors();

		cachedPointerMouse = readback_pointerMouse;

		// gather global values
		g_renderingProps = controller.getTimelineRenderingProps();

		// draw
		let currentContext = canvasRef.current?.getContext("2d", {alpha: false});
		if (currentContext) {
			g_ctx = currentContext;
			g_ctx.scale(dpr, dpr);
			drawEverything();
			g_ctx.scale(1 / dpr, 1 / dpr);
		}

		// potential update due to pointer change
		if (cachedPointerMouse !== readback_pointerMouse) {
			updateTimelineView();
		}

		// reset event flags
		g_isClickUpdate = false;
		g_isKeyboardUpdate = false;
	}, [
		// update when dependency props change
		props.visibleLeft, props.visibleWidth, mouseX, mouseY, mouseHovered, clickCounter, keyCounter, props.version, dpr
	]);

	return <canvas ref={canvasRef} width={Math.ceil(scaledWidth)} height={Math.ceil(scaledHeight)} tabIndex={0} style={{
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		pointerEvents: "none",
		cursor: readback_pointerMouse ? "pointer" : "default",
	}}/>;
}

/**
 * Save the current g_ctx, execute a callback, then restore the saved g_ctx.
 */
export function swapCtx(new_ctx: CanvasRenderingContext2D, callback: () => void) {
	let temp_ctx = g_ctx;
	g_ctx = new_ctx;
	callback();
	g_ctx = temp_ctx;
}
