import React, { useEffect, useRef, useReducer, useContext, CSSProperties } from "react";
import {
	AutoTickMarkElem,
	CursorElem,
	PotencyMarkElem,
	ElemType,
	LucidMarkElem,
	MarkerElem,
	MarkerType,
	MAX_TIMELINE_SLOTS,
	MeditateTickMarkElem,
	MPTickMarkElem,
	SharedTimelineElem,
	SkillElem,
	SlotTimelineElem,
	TimelineElem,
	UntargetableMarkerTrack,
	ViewOnlyCursorElem,
	WarningMarkElem,
} from "../Controller/Timeline";
import { StaticFn, TimelineDimensions, TimelineDrawOptions } from "./Common";
import { BuffType } from "../Game/Common";
import { getSkillIconImage } from "./Skills";
import { buffIconImages } from "./Buffs";
import { controller } from "../Controller/Controller";
import {
	localize,
	localizeResourceType,
	localizeBuffType,
	localizeSkillName,
	localizeSkillUnavailableReason,
} from "./Localization";
import { setEditingMarkerValues } from "./TimelineMarkers";
import { getThemeColors, ThemeColors, ColorThemeContext } from "./ColorTheme";
import { scrollEditorToFirstSelected, updateInvalidStatus } from "./TimelineEditor";
import { bossIsUntargetable } from "../Controller/DamageStatistics";
import {
	updateTimelineView,
	DragTargetContext,
	DragLockContext,
	CanvasCallbacks,
} from "./Timeline";
import { ShellJob } from "../Game/Data/Jobs";
import { LIMIT_BREAK_ACTIONS } from "../Game/Data/Shared/LimitBreak";

export type TimelineRenderingProps = {
	timelineWidth: number;
	timelineHeight: number;
	countdown: number;
	scale: number;
	tincturePotencyMultiplier: number;
	untargetableMask: boolean;
	allMarkers: MarkerElem[];
	untargetableMarkers: MarkerElem[];
	buffMarkers: MarkerElem[];
	sharedElements: SharedTimelineElem[];
	slots: {
		job: ShellJob;
		elements: SlotTimelineElem[];
	}[];
	activeSlotIndex: number;
	showSelection: boolean;
	selectionStartDisplayTime: number;
	selectionEndDisplayTime: number;
	drawOptions: TimelineDrawOptions;
};

const c_maxTimelineHeight = 400;

// not used everywhere it could be used, be careful
const SKILL_ICON_SIZE_PX = 28;

interface MouseInteractionInfo {
	x: number;
	y: number;
	shiftKey: boolean;
	dragLock: boolean;
	draggedSkillElem?: SkillElem;
	bgSelecting: boolean;
	setDraggedSkillElem: (elem?: SkillElem) => void;
	setBgSelecting: (b: boolean) => void;
}

const onMouseDownTimelineBackground = (info: MouseInteractionInfo) => {
	info.setDraggedSkillElem(undefined);
	controller.record.unselectAll();
	controller.displayCurrentState();
	info.setBgSelecting(true);
};

interface ViewInfo {
	renderingProps: TimelineRenderingProps;
	colors: ThemeColors;
	visibleLeft: number;
	visibleWidth: number;
}

interface MarkerDrawParams<T extends SlotTimelineElem> {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	timelineOriginX: number;
	timelineOriginY: number;
	elems: T[];
	testInteraction: InteractionHandler;
}

type InteractionHandler = (
	rect: Rect,
	params: {
		hoverTip?: string[] | ((info: MouseInteractionInfo) => string[]);
		onMouseUp?: (info: MouseInteractionInfo) => void;
		onMouseDown?: (info: MouseInteractionInfo) => void;
		pointerMouse?: boolean;
		hoverImages?: any[];
	},
) => void;

function drawTip(params: {
	ctx: CanvasRenderingContext2D;
	lines: string[];
	images?: any[];
	viewInfo: ViewInfo;
	mouseX: number;
	mouseY: number;
}) {
	const { ctx, lines, images, viewInfo } = params;
	let { mouseX: x, mouseY: y } = params;
	const { colors, visibleWidth: canvasWidth } = viewInfo;

	if (!lines.length) return;

	const lineHeight = 14;
	const imageDimensions = 24;
	const horizontalPadding = 8;
	const verticalPadding = 4;
	ctx.font = "12px monospace";

	let maxLineWidth = -1;
	lines.forEach((l) => {
		maxLineWidth = Math.max(maxLineWidth, ctx.measureText(l).width);
	});
	let [boxWidth, boxHeight] = [
		maxLineWidth + 2 * horizontalPadding,
		lineHeight * lines.length + 2 * verticalPadding,
	];

	if (images && images.length > 0) {
		boxWidth = Math.max(
			boxWidth,
			horizontalPadding + images.length * (imageDimensions + horizontalPadding),
		);
		boxHeight += imageDimensions + verticalPadding;
	}

	// compute optimal box position
	const boxToMousePadding = 4;
	const estimatedMouseHeight = 11;
	if (y >= boxHeight + boxToMousePadding) {
		// put on top
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
	ctx.strokeStyle = colors.bgHighContrast;
	ctx.lineWidth = 1;
	ctx.fillStyle = colors.tipBackground;
	ctx.fillRect(x, y, boxWidth, boxHeight);
	ctx.strokeRect(x, y, boxWidth, boxHeight);

	ctx.fillStyle = colors.emphasis;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], x + horizontalPadding, y + i * lineHeight + 2 + verticalPadding);
	}
	const initialImageX = x + horizontalPadding;
	const initialImageY = y + lines.length * lineHeight + 2 + verticalPadding;
	if (images) {
		for (let i = 0; i < images.length; i++) {
			if (images[i]) {
				ctx.drawImage(
					images[i],
					initialImageX + i * imageDimensions,
					initialImageY,
					imageDimensions * 0.75,
					imageDimensions,
				);
			}
		}
	}
}

function drawMarkers(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	markerTracksTopY: number;
	markerTracksBottomY: number; // bottom Y of track 0
	timelineOrigin: number;
	trackBins: Map<number, MarkerElem[]>;
	testInteraction: InteractionHandler;
}) {
	const {
		ctx,
		viewInfo,
		markerTracksTopY,
		markerTracksBottomY,
		timelineOrigin,
		trackBins,
		testInteraction,
	} = params;
	const colors = viewInfo.colors;
	const { countdown, scale } = viewInfo.renderingProps;
	// markers
	ctx.lineCap = "round";
	ctx.lineWidth = 4;
	ctx.font = "11px monospace";
	ctx.textAlign = "left";
	trackBins.forEach((elems, track) => {
		let top = markerTracksBottomY - (track + 1) * TimelineDimensions.trackHeight;
		if (track === UntargetableMarkerTrack) {
			top = markerTracksTopY;
		}
		for (let i = 0; i < elems.length; i++) {
			const m = elems[i];

			let localizedDescription = m.description;
			if (m.markerType === MarkerType.Untargetable)
				localizedDescription = localize({ en: "Untargetable", zh: "不可选中" }) as string;
			else if (m.markerType === MarkerType.Buff)
				localizedDescription = localizeBuffType(m.description as BuffType);

			const left =
				timelineOrigin + StaticFn.positionFromTimeAndScale(m.time + countdown, scale);
			const onMouseUp = () => {
				const success = controller.timeline.deleteMarker(m);
				console.assert(success);
				controller.updateStats();
				setEditingMarkerValues(m);
			};
			if (m.duration > 0) {
				const markerWidth = StaticFn.positionFromTimeAndScale(m.duration, scale);
				if (m.markerType === MarkerType.Buff) {
					ctx.fillStyle = m.color + colors.timeline.markerAlpha;
					ctx.fillRect(left, top, markerWidth, TimelineDimensions.trackHeight);
					const img = buffIconImages.get(m.description as BuffType);
					if (img)
						ctx.drawImage(
							img,
							left,
							top,
							TimelineDimensions.trackHeight * 0.75,
							TimelineDimensions.trackHeight,
						);
					ctx.fillStyle = colors.emphasis;
					ctx.fillText(
						localizedDescription,
						left + TimelineDimensions.trackHeight * 1.5,
						top + 10,
					);
				} else if (m.showText) {
					ctx.fillStyle = m.color + colors.timeline.markerAlpha;
					ctx.fillRect(left, top, markerWidth, TimelineDimensions.trackHeight);
					ctx.fillStyle = colors.emphasis;
					ctx.fillText(
						localizedDescription,
						left + TimelineDimensions.trackHeight / 2,
						top + 10,
					);
				} else {
					ctx.strokeStyle = m.color;
					ctx.beginPath();
					ctx.moveTo(left, top + TimelineDimensions.trackHeight / 2);
					ctx.lineTo(left + markerWidth, top + TimelineDimensions.trackHeight / 2);
					ctx.stroke();
				}
				const timeStr = m.time + " - " + parseFloat((m.time + m.duration).toFixed(3));
				testInteraction(
					{
						x: left,
						y: top,
						w: Math.max(markerWidth, TimelineDimensions.trackHeight),
						h: TimelineDimensions.trackHeight,
					},
					{
						hoverTip: [`[${timeStr}] ${localizedDescription}`],
						onMouseUp,
					},
				);
			} else {
				ctx.fillStyle = m.color;
				ctx.beginPath();
				ctx.ellipse(
					left,
					top + TimelineDimensions.trackHeight / 2,
					4,
					4,
					0,
					0,
					2 * Math.PI,
				);
				ctx.fill();
				if (m.showText) {
					ctx.fillStyle = colors.emphasis;
					ctx.beginPath();
					ctx.fillText(
						localizedDescription,
						left + TimelineDimensions.trackHeight / 2,
						top + 10,
					);
				}
				testInteraction(
					{
						x: left - TimelineDimensions.trackHeight / 2,
						y: top,
						w: TimelineDimensions.trackHeight,
						h: TimelineDimensions.trackHeight,
					},
					{
						hoverTip: [`[${m.time}] ${localizedDescription}`],
						onMouseUp,
					},
				);
			}
		}
	});
}

function drawMPTickMarks(params: MarkerDrawParams<MPTickMarkElem>) {
	const {
		ctx,
		viewInfo,
		timelineOriginX: originX,
		timelineOriginY: originY,
		elems,
		testInteraction,
	} = params;
	const colors = viewInfo.colors;
	const scale = viewInfo.renderingProps.scale;
	ctx.lineWidth = 1;
	ctx.strokeStyle = colors.timeline.mpTickMark;
	ctx.beginPath();
	elems.forEach((tick) => {
		const x = originX + StaticFn.positionFromTimeAndScale(tick.displayTime, scale);
		ctx.moveTo(x, originY);
		ctx.lineTo(x, originY + TimelineDimensions.renderSlotHeight());

		testInteraction(
			{ x: x - 2, y: originY, w: 4, h: TimelineDimensions.renderSlotHeight() },
			{
				hoverTip: [`[${tick.displayTime.toFixed(3)}] ${tick.sourceDesc}`],
			},
		);
	});
	ctx.stroke();
}

function drawMeditateTickMarks(params: MarkerDrawParams<MeditateTickMarkElem>) {
	const {
		ctx,
		viewInfo,
		timelineOriginX: originX,
		timelineOriginY: originY,
		elems,
		testInteraction,
	} = params;
	const colors = viewInfo.colors;
	const scale = viewInfo.renderingProps.scale;
	ctx.lineWidth = 1;
	ctx.strokeStyle = colors.sam.meditation;
	ctx.beginPath();
	elems.forEach((tick) => {
		const x = originX + StaticFn.positionFromTimeAndScale(tick.displayTime, scale);
		ctx.moveTo(x, originY);
		ctx.lineTo(x, originY + TimelineDimensions.renderSlotHeight());

		testInteraction(
			{ x: x - 2, y: originY, w: 4, h: TimelineDimensions.renderSlotHeight() },
			{ hoverTip: [`[${tick.displayTime.toFixed(3)}] ${tick.sourceDesc}`] },
		);
	});
	ctx.stroke();
}

function drawAutoTickMarks(params: MarkerDrawParams<AutoTickMarkElem>) {
	const {
		ctx,
		viewInfo,
		timelineOriginX: originX,
		timelineOriginY: originY,
		elems,
		testInteraction,
	} = params;
	const colors = viewInfo.colors;
	const scale = viewInfo.renderingProps.scale;
	ctx.lineWidth = 1;
	ctx.strokeStyle = colors.pld.ironWillColor;
	ctx.beginPath();
	elems.forEach((tick) => {
		const x = originX + StaticFn.positionFromTimeAndScale(tick.displayTime, scale);
		ctx.moveTo(x, originY);
		ctx.lineTo(x, originY + TimelineDimensions.renderSlotHeight());

		testInteraction(
			{ x: x - 2, y: originY, w: 4, h: TimelineDimensions.renderSlotHeight() },
			{ hoverTip: [`[${tick.displayTime.toFixed(3)}] ${tick.sourceDesc}`] },
		);
	});
	ctx.stroke();
}

function drawWarningMarks(params: MarkerDrawParams<WarningMarkElem>) {
	const { ctx, viewInfo, timelineOriginX, timelineOriginY, elems, testInteraction } = params;
	const colors = viewInfo.colors;
	const scale = viewInfo.renderingProps.scale;
	ctx.font = "bold 10px monospace";
	elems.forEach((mark) => {
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);
		const sideLength = 12;
		const bottomY = timelineOriginY + sideLength;
		ctx.beginPath();
		ctx.textAlign = "center";
		ctx.moveTo(x, bottomY - sideLength);
		ctx.lineTo(x - sideLength / 2, bottomY);
		ctx.lineTo(x + sideLength / 2, bottomY);
		ctx.fillStyle = colors.timeline.warningMark;
		ctx.fill();
		ctx.fillStyle = "white";
		ctx.fillText("!", x, bottomY - 1);

		let message: string = "[" + mark.displayTime.toFixed(3) + "] ";
		switch (mark.warningType.kind) {
			case "combobreak":
				message += localize({
					en: "broken combo!",
					zh: "连击被断！",
				}).toString();
				break;
			case "overcap":
				message +=
					localizeResourceType(mark.warningType.rsc).toString() +
					localize({
						en: " overcap!",
						zh: "溢出！",
					}).toString();
				break;
			case "overwrite":
				message +=
					localizeResourceType(mark.warningType.rsc).toString() +
					localize({
						en: " overwrite!",
						zh: "被覆盖！",
					}).toString();
				break;
			case "timeout":
				message +=
					localizeResourceType(mark.warningType.rsc).toString() +
					localize({
						en: " expired!",
						zh: "已过期！",
					});
				break;
			default:
				message += localize({
					en: mark.warningType.en,
					zh: mark.warningType.zh,
				});
				break;
		}
		testInteraction(
			{ x: x - sideLength / 2, y: bottomY - sideLength, w: sideLength, h: sideLength },
			{ hoverTip: [message] },
		);
	});
}

function drawPotencyMarks(params: MarkerDrawParams<PotencyMarkElem>) {
	const { ctx, viewInfo, timelineOriginX, timelineOriginY, elems, testInteraction } = params;
	const { colors, renderingProps } = viewInfo;
	const scale = renderingProps.scale;
	elems.forEach((mark) => {
		// Only consider untargetable for damage marks
		const untargetable =
			mark.type === ElemType.DamageMark && bossIsUntargetable(mark.displayTime);
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);

		// hover text
		let time = "[" + mark.displayTime.toFixed(3) + "] ";
		const untargetableStr = localize({ en: "Untargetable", zh: "不可选中" }) as string;

		// Determine fill color and hover text title based on mark type
		switch (mark.type) {
			case ElemType.AggroMark:
				ctx.fillStyle = colors.timeline.aggroMark;
				time += localize({ en: "aggro" });
				break;
			case ElemType.HealingMark:
				ctx.fillStyle = colors.timeline.healingMark;
				time += localize({ en: "healing potency" });
				break;
			// If it's a damage mark, adjust color based on whether the boss is untargetable
			default:
				ctx.fillStyle = untargetable
					? colors.timeline.untargetableDamageMark
					: colors.timeline.damageMark;
				time += localize({ en: "damage potency" });
		}

		// Create the appropriate shape
		ctx.beginPath();
		if (mark.type === ElemType.AggroMark || mark.type === ElemType.DamageMark) {
			// Aggro and Damage are a triangle pointing down
			ctx.moveTo(x - 3, timelineOriginY);
			ctx.lineTo(x + 3, timelineOriginY);
			ctx.lineTo(x, timelineOriginY + 6);
		} else {
			// Healing is a triangle pointing up, and shifted down so it's visible at the same timestamp as a damage/aggro mark
			ctx.moveTo(x - 3, timelineOriginY + 12);
			ctx.lineTo(x + 3, timelineOriginY + 12);
			ctx.lineTo(x, timelineOriginY + 6);
		}
		ctx.fill();

		// pot?
		const pot = mark.buffs.filter((b) => b === "TINCTURE").length > 0;

		const info: string[] = [];
		const buffImages: Array<HTMLImageElement | undefined> = [];

		mark.potencyInfos.forEach((potencyInfo) => {
			const sourceStr = potencyInfo.sourceDesc.replace(
				"{skill}",
				localizeSkillName(potencyInfo.sourceSkill),
			);

			if (untargetable) {
				info.push((0).toFixed(3) + " (" + sourceStr + ")");
			} else if (potencyInfo.sourceSkill in LIMIT_BREAK_ACTIONS) {
				const lbStr = localize({ en: "LB" }) as string;
				info.push(lbStr + " (" + sourceStr + ")");
			} else {
				const potencyAmount = potencyInfo.potency.getAmount({
					tincturePotencyMultiplier: renderingProps.tincturePotencyMultiplier,
					includePartyBuffs: true,
					includeSplash: false,
				});

				// Push additional info for hits that splash
				if (potencyInfo.potency.targetCount > 1) {
					const splashPotencyAmount =
						potencyAmount * (1 - (potencyInfo.potency.falloff ?? 1));
					const splashTargets = potencyInfo.potency.targetCount - 1;
					const splashPotencyString =
						splashPotencyAmount.toFixed(2) +
						(splashTargets > 1 ? ` x ${splashTargets}` : "");

					const additionalTargetString =
						splashTargets > 1
							? localize({
									en: `${sourceStr}, ${splashTargets} additional targets`,
									zh: `${sourceStr}, ${splashTargets} 额外目标`,
								})
							: localize({
									en: `${sourceStr}, 1 additional target`,
									zh: `${sourceStr}, 1 额外目标`,
								});
					info.push(
						potencyAmount.toFixed(2) +
							" (" +
							localize({
								en: `${sourceStr}, primary target`,
								zh: `${sourceStr}, 主要目标`,
							}) +
							")",
					);
					info.push(splashPotencyString + ` (${additionalTargetString})`);
				} else {
					info.push(potencyAmount.toFixed(2) + " (" + sourceStr + ")");
				}

				if (pot && !buffImages.includes(buffIconImages.get(BuffType.Tincture))) {
					buffImages.push(buffIconImages.get(BuffType.Tincture));
				}

				potencyInfo.potency.getPartyBuffs().forEach((desc) => {
					const buffImage = buffIconImages.get(desc);
					if (!buffImages.includes(buffImage)) {
						buffImages.push();
					}
				});
			}
		});

		const interactionArea =
			mark.type === ElemType.HealingMark
				? { x: x - 3, y: timelineOriginY + 6, w: 6, h: 6 }
				: { x: x - 3, y: timelineOriginY, w: 6, h: 6 };
		testInteraction(interactionArea, {
			hoverTip: untargetable ? [time, ...info, untargetableStr] : [time, ...info],
			hoverImages: buffImages,
		});
	});
}

function drawLucidMarks(params: MarkerDrawParams<LucidMarkElem>) {
	const { ctx, viewInfo, timelineOriginX, timelineOriginY, elems, testInteraction } = params;
	const colors = viewInfo.colors;
	const scale = viewInfo.renderingProps.scale;

	ctx.fillStyle = colors.timeline.lucidTickMark;
	elems.forEach((mark) => {
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(mark.displayTime, scale);
		ctx.beginPath();
		ctx.moveTo(x - 3, timelineOriginY);
		ctx.lineTo(x + 3, timelineOriginY);
		ctx.lineTo(x, timelineOriginY + 6);
		ctx.fill();

		// hover text
		const hoverText = `[${mark.displayTime.toFixed(3)}] ${mark.sourceDesc.replace("{skill}", localizeSkillName("LUCID_DREAMING"))}`;
		testInteraction(
			{ x: x - 3, y: timelineOriginY, w: 6, h: 6 },
			{
				hoverTip: [hoverText],
			},
		);
	});
}

type Rect = { x: number; y: number; w: number; h: number };

// returns a map of action id -> skill hitboxes
function drawSkills(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	timelineOriginX: number;
	timelineOriginY: number;
	elems: SkillElem[];
	interactive: boolean;
	// testInteraction should be left unset if skills drawn in image export mode.
	// otherwise, we still need a hover handler for damage info on skills in inactive timelines
	// that are drawn with interactive=false
	testInteraction: InteractionHandler;
}): Map<number, Rect> {
	const { ctx, viewInfo, timelineOriginX, timelineOriginY, elems, interactive, testInteraction } =
		params;
	const { colors, renderingProps } = viewInfo;
	const scale = renderingProps.scale;

	const targetCounts: Array<{ count: number; x: number; y: number }> = [];
	const greyLockBars: Rect[] = [];
	const purpleLockBars: Rect[] = [];
	const gcdBars: Rect[] = [];
	const snapshots: number[] = [];

	// TODO move this into a proper configuration file
	const coverInfo: Map<BuffType, { color: string; showImage: boolean }> = new Map([
		[BuffType.Tincture, { color: colors.timeline.potCover, showImage: true }],
		[BuffType.LeyLines, { color: colors.timeline.llCover, showImage: true }],
		[BuffType.SearingLight, { color: colors.smn.searing, showImage: true }],
		[BuffType.Hyperphantasia, { color: colors.timeline.llCover, showImage: false }],
		[BuffType.StarryMuse, { color: colors.timeline.buffCover, showImage: true }],
		[BuffType.Embolden, { color: colors.rdm.emboldenBuff, showImage: true }],
		[BuffType.Manafication, { color: colors.rdm.manaficBuff, showImage: true }],
		[BuffType.Acceleration, { color: colors.rdm.accelBuff, showImage: true }],
		[BuffType.TechnicalFinish, { color: colors.dnc.esprit, showImage: true }],
		[BuffType.Devilment, { color: colors.dnc.feathers, showImage: true }],
		// TODO swap colors eventually
		[BuffType.Fuka, { color: colors.timeline.llCover, showImage: true }],
		[BuffType.Fugetsu, { color: colors.sam.fugetsu, showImage: true }],
		[BuffType.NoMercy, { color: colors.sam.fugetsu, showImage: true }],
		[
			BuffType.EnhancedPiercingTalon,
			{ color: colors.drg.enhancedPiercingTalon, showImage: true },
		],
		[BuffType.PowerSurge, { color: colors.drg.powerSurge, showImage: true }],
		[BuffType.LifeSurge, { color: colors.drg.lifeSurge, showImage: true }],
		[BuffType.LanceCharge, { color: colors.drg.lanceCharge, showImage: true }],
		[BuffType.LifeOfTheDragon, { color: colors.drg.lifeOfTheDragon, showImage: true }],
		[BuffType.BattleLitany, { color: colors.drg.battleLitany, showImage: true }],
		[BuffType.DivineMight, { color: colors.pld.divineMight, showImage: true }],
		[BuffType.Requiescat, { color: colors.pld.requiescat, showImage: true }],
		[BuffType.FightOrFlight, { color: colors.pld.fightOrFlight, showImage: true }],
		[BuffType.EnhancedEnpi, { color: colors.rdm.accelBuff, showImage: true }],
		[BuffType.ArcaneCircle, { color: colors.rpr.arcaneCircle, showImage: true }],
		[BuffType.DeathsDesign, { color: colors.rpr.deathsDesign, showImage: true }],
		[BuffType.WanderersMinuet, { color: colors.brd.wanderersCoda, showImage: true }],
		[BuffType.MagesBallad, { color: colors.brd.magesCoda, showImage: true }],
		[BuffType.ArmysPaeon, { color: colors.brd.armysCoda, showImage: true }],
		[BuffType.RagingStrikes, { color: colors.brd.ragingStrikes, showImage: true }],
		[BuffType.Barrage, { color: colors.brd.barrage, showImage: true }],
		[BuffType.BattleVoice, { color: colors.brd.battleVoice, showImage: true }],
		[BuffType.RadiantFinale1, { color: colors.brd.radiantFinale, showImage: true }],
		[BuffType.RadiantFinale2, { color: colors.brd.radiantFinale, showImage: true }],
		[BuffType.RadiantFinale3, { color: colors.brd.radiantFinale, showImage: true }],
		[BuffType.Zoe, { color: colors.sge.zoe, showImage: true }],
		[BuffType.Autophysis, { color: colors.sge.autophysis, showImage: true }],
		[BuffType.Krasis, { color: colors.sge.krasis, showImage: true }],
		[BuffType.Soteria, { color: colors.sge.soteria, showImage: true }],
		[BuffType.Philosophia, { color: colors.sge.philosophia, showImage: true }],
		[BuffType.WaxingNocturne, { color: colors.blu.moonflute, showImage: true }],
		[BuffType.Bristle, { color: colors.blu.bristle, showImage: true }],
		[BuffType.Whistle, { color: colors.blu.whistle, showImage: true }],
		[BuffType.TingleA, { color: colors.blu.tinglea, showImage: true }],
		[BuffType.TingleB, { color: colors.blu.tingleb, showImage: true }],
		[BuffType.Dokumori, { color: colors.nin.dokumori, showImage: true }],
		[BuffType.TrickAttack, { color: colors.nin.trick, showImage: true }],
		[BuffType.KunaisBane, { color: colors.nin.trick, showImage: true }],
		[BuffType.Bunshin, { color: colors.nin.bunshin, showImage: true }],
		[BuffType.RiddleOfFire, { color: colors.mnk.riddleOfFire, showImage: true }],
		[BuffType.Brotherhood, { color: colors.mnk.brotherhood, showImage: true }],
		[BuffType.Divination, { color: colors.ast.div, showImage: true }],
		[BuffType.NeutralSect, { color: colors.ast.neutral, showImage: true }],
		[BuffType.Synastry, { color: colors.ast.synastry, showImage: true }],
		[BuffType.TheArrow, { color: colors.ast.arrow, showImage: true }],
		[BuffType.Confession, { color: colors.whm.confession, showImage: true }],
		[BuffType.Asylum, { color: colors.whm.asylum, showImage: true }],
		[BuffType.Temperance, { color: colors.whm.temperance, showImage: true }],
		[BuffType.HuntersInstinct, { color: colors.vpr.huntersInstinct, showImage: true }],
		[BuffType.Swiftscaled, { color: colors.vpr.swiftscaled, showImage: true }],
		[BuffType.ChainStratagem, { color: colors.sch.chain, showImage: true }],
		[BuffType.FeyIllumination, { color: colors.sch.feyIllumination, showImage: true }],
		[BuffType.Dissipation, { color: colors.sch.dissipation, showImage: true }],
		[BuffType.Protraction, { color: colors.sch.protraction, showImage: true }],
		[BuffType.Recitation, { color: colors.sch.recitation, showImage: true }],
	]);

	const covers: Map<BuffType, Rect[]> = new Map();
	coverInfo.forEach((_, buff) => covers.set(buff, []));
	const buffCovers: Rect[] = [];
	const invalidSections: Rect[] = [];

	const skillIcons: { elem: SkillElem; x: number; y: number }[] = []; // tmp
	const skillsTopY = timelineOriginY + TimelineDimensions.skillButtonHeight / 2;
	elems.forEach((e) => {
		const skill = e as SkillElem;
		const x = timelineOriginX + StaticFn.positionFromTimeAndScale(skill.displayTime, scale);
		const y = skill.isGCD ? skillsTopY + TimelineDimensions.skillButtonHeight / 2 : skillsTopY;
		// if there were multiple targets, draw the number of targets above the ability icon
		const targetCount = skill.node.targetCount;
		if (targetCount > 1) {
			targetCounts.push({
				count: targetCount,
				x: x + TimelineDimensions.skillButtonHeight / 2,
				y: y - 5,
			});
		}
		// offset the bar under skill button icon so it's completely invisible before the button
		const barsOffset = 2;
		// purple/grey bar
		const lockbarWidth = StaticFn.positionFromTimeAndScale(skill.lockDuration, scale);
		if (skill.isSpellCast) {
			purpleLockBars.push({
				x: x + barsOffset,
				y: y,
				w: lockbarWidth - barsOffset,
				h: TimelineDimensions.skillButtonHeight / 2,
			});
			snapshots.push(
				x + StaticFn.positionFromTimeAndScale(skill.relativeSnapshotTime, scale),
			);
		} else {
			greyLockBars.push({
				x: x + barsOffset,
				y: y,
				w: lockbarWidth - barsOffset,
				h: TimelineDimensions.skillButtonHeight,
			});
		}
		// green gcd recast bar
		if (skill.isGCD) {
			const recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			gcdBars.push({
				x: x + barsOffset,
				y: y + TimelineDimensions.skillButtonHeight / 2,
				w: recastWidth - barsOffset,
				h: TimelineDimensions.skillButtonHeight / 2,
			});
		}
		if (skill.skillName in LIMIT_BREAK_ACTIONS) {
			const recastWidth = StaticFn.positionFromTimeAndScale(skill.recastDuration, scale);
			greyLockBars.push({
				x: x + barsOffset,
				y: y + TimelineDimensions.skillButtonHeight / 2,
				w: recastWidth - barsOffset,
				h: TimelineDimensions.skillButtonHeight / 2,
			});
		}
		// invalid skill shading
		if (skill.node.tmp_invalid_reasons.length > 0) {
			invalidSections.push({
				x,
				y: timelineOriginY + TimelineDimensions.slotPaddingTop,
				w: StaticFn.positionFromTimeAndScale(
					skill.isGCD
						? Math.max(skill.recastDuration, skill.lockDuration)
						: skill.lockDuration,
					scale,
				),
				h:
					TimelineDimensions.renderSlotHeight() -
					TimelineDimensions.slotPaddingBottom -
					TimelineDimensions.slotPaddingTop,
			});
		}

		// node covers (LL, pot, party buff)
		// TODO automate declarations for these modifiers
		let nodeCoverCount = 0;
		covers.forEach((coverArray, buffType) => {
			if (skill.node.hasBuff(buffType)) {
				nodeCoverCount += buildCover(nodeCoverCount, coverArray);
			}
		});
		if (skill.node.hasPartyBuff()) buildCover(nodeCoverCount, buffCovers);

		function buildCover(existingCovers: number, collection: Rect[]) {
			if (renderingProps.drawOptions.drawBuffIndicators) {
				collection.push({
					x: x,
					y: y + SKILL_ICON_SIZE_PX + existingCovers * 4,
					w: SKILL_ICON_SIZE_PX,
					h: 4,
				});
			}
			return 1;
		}

		// skill icon
		const img = getSkillIconImage(skill.skillName);
		if (img) skillIcons.push({ elem: e, x: x, y: y });
	});

	// target counts
	ctx.font = "13px monospace";
	ctx.fillStyle = colors.text;
	ctx.textAlign = "center";
	targetCounts.forEach((c) => {
		ctx.fillText("x" + c.count.toString(), c.x, c.y);
	});

	const rectWithBgInteract = (r: Rect) => {
		ctx.rect(r.x, r.y, r.w, r.h);
		if (interactive)
			testInteraction(r, {
				onMouseDown: onMouseDownTimelineBackground,
			});
	};

	// purple
	ctx.fillStyle = colors.timeline.castBar;
	ctx.beginPath();
	purpleLockBars.forEach(rectWithBgInteract);
	ctx.fill();

	// snapshot bar
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(151, 85, 239, 0.4)";
	ctx.beginPath();
	snapshots.forEach((x) => {
		ctx.moveTo(x, skillsTopY + SKILL_ICON_SIZE_PX / 2);
		ctx.lineTo(x, skillsTopY + SKILL_ICON_SIZE_PX);
	});
	ctx.stroke();

	// green
	ctx.fillStyle = colors.timeline.gcdBar;
	ctx.beginPath();
	gcdBars.forEach(rectWithBgInteract);
	ctx.fill();

	// grey
	ctx.fillStyle = colors.timeline.lockBar;
	ctx.beginPath();
	greyLockBars.forEach(rectWithBgInteract);
	ctx.fill();

	covers.forEach((coverArray, buffType) => {
		ctx.fillStyle = coverInfo.get(buffType)!.color;
		ctx.beginPath();
		coverArray.forEach(rectWithBgInteract);
		ctx.fill();
	});

	// buffCovers
	ctx.fillStyle = colors.timeline.buffCover;
	ctx.beginPath();
	buffCovers.forEach(rectWithBgInteract);
	ctx.fill();

	// icons
	ctx.beginPath();
	skillIcons.forEach((icon) => {
		ctx.drawImage(
			getSkillIconImage(icon.elem.skillName),
			icon.x,
			icon.y,
			SKILL_ICON_SIZE_PX,
			SKILL_ICON_SIZE_PX,
		);
		const node = icon.elem.node;
		const lines: string[] = [];
		const buffImages: HTMLImageElement[] = [];

		// 1. description
		const description =
			localizeSkillName(icon.elem.skillName) + "@" + icon.elem.displayTime.toFixed(3);
		lines.push(description);

		// 2. potency
		if (!((node.maybeGetActionKey() ?? "NEVER") in LIMIT_BREAK_ACTIONS)) {
			if (node.getInitialPotency()) {
				const potency = node.getPotency({
					tincturePotencyMultiplier: renderingProps.tincturePotencyMultiplier,
					includePartyBuffs: true,
					includeSplash: true,
					untargetable: bossIsUntargetable,
				}).applied;
				lines.push(localize({ en: "potency: ", zh: "威力：" }) + potency.toFixed(2));
			}
			if (node.getInitialHealingPotency()) {
				const healingPotency = node.getHealingPotency({
					tincturePotencyMultiplier: renderingProps.tincturePotencyMultiplier,
					includeSplash: true,
					includePartyBuffs: true,
					untargetable: bossIsUntargetable,
				}).applied;
				lines.push(localize({ en: "healing potency: " }) + healingPotency.toFixed(2));
			}
		}

		// 3. duration
		let lockDuration = 0;
		if (node.tmp_endLockTime !== undefined && node.tmp_startLockTime !== undefined) {
			lockDuration = node.tmp_endLockTime - node.tmp_startLockTime;
		}
		lines.push(localize({ en: "duration: ", zh: "耗时：" }) + lockDuration.toFixed(3));

		// 3.5. invalid reasons
		if (node.tmp_invalid_reasons.length > 0) {
			lines.push("");
			lines.push(localize({ en: "skill is invalid:", zh: "技能有问题：" }).toString());
			node.tmp_invalid_reasons.forEach((r) =>
				lines.push("- " + localizeSkillUnavailableReason(r)),
			);
		}

		// 4. buff images
		coverInfo.forEach((info, buff) => {
			if (info.showImage && node.hasBuff(buff))
				buffImages.push(buffIconImages.get(buff) as HTMLImageElement);
		});

		node.getPartyBuffs().forEach((buffType) => {
			const img = buffIconImages.get(buffType);
			if (img) buffImages.push(img);
		});

		if (interactive) {
			testInteraction(
				{ x: icon.x, y: icon.y, w: SKILL_ICON_SIZE_PX, h: SKILL_ICON_SIZE_PX },
				{
					hoverTip: lines,
					onMouseUp: (info: MouseInteractionInfo) => {
						// If we're not dragging a skill to rearrange, perform a selection action.
						if (info.draggedSkillElem === undefined) {
							// If we're doing a click+drag box, this skill was already selected,
							// and there's no need to re-select it.
							if (!info.bgSelecting) {
								controller.timeline.onClickTimelineAction(
									icon.elem.actionIndex,
									info.shiftKey,
								);
								scrollEditorToFirstSelected();
							}
						}
					},
					onMouseDown: (info: MouseInteractionInfo) => {
						if (!info.dragLock) {
							info.setDraggedSkillElem(icon.elem);
						}
					},
					pointerMouse: true,
					hoverImages: buffImages,
				},
			);
		} else {
			testInteraction(
				{ x: icon.x, y: icon.y, w: SKILL_ICON_SIZE_PX, h: SKILL_ICON_SIZE_PX },
				{
					hoverTip: lines,
					pointerMouse: false,
					hoverImages: buffImages,
				},
			);
		}
	});

	// light red overlay for invalid actions
	const originalAlpha = ctx.globalAlpha;
	ctx.fillStyle = colors.timeline.invalidBg;
	ctx.globalAlpha = 0.2;
	ctx.beginPath();
	invalidSections.forEach((r) => {
		ctx.rect(r.x, r.y, r.w, r.h);
	});
	ctx.fill();
	ctx.globalAlpha = originalAlpha;

	return new Map(
		interactive
			? skillIcons.map((icon) => [
					icon.elem.actionIndex,
					{
						x: icon.x,
						y: icon.y,
						w: SKILL_ICON_SIZE_PX,
						h: SKILL_ICON_SIZE_PX,
					},
				])
			: [],
	);
}

function drawCursor(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	color: string;
	x: number;
	y1: number;
	y2: number;
	y3: number;
	tip?: string;
	width?: number;
	testInteraction?: InteractionHandler;
}) {
	const { ctx, color, x, y1, y2, y3, tip, width, testInteraction } = params;

	// triangle
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x - 3, 0);
	ctx.lineTo(x + 3, 0);
	ctx.lineTo(x, 6);
	ctx.fill();

	ctx.lineWidth = 1;

	// ruler
	ctx.strokeStyle = color;
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, y1);
	ctx.stroke();

	// before active slot
	ctx.strokeStyle = color + "9f";
	ctx.setLineDash([2, 3]);
	ctx.beginPath();
	ctx.moveTo(x, y1);
	ctx.lineTo(x, y2);
	ctx.stroke();

	const oldWidth = ctx.lineWidth;
	if (width !== undefined) {
		ctx.lineWidth = width;
	}
	// active slot
	ctx.strokeStyle = color;
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(x, y2);
	ctx.lineTo(x, y3);
	ctx.stroke();

	ctx.lineWidth = oldWidth;

	// after active slot
	ctx.strokeStyle = color + "9f";
	ctx.setLineDash([2, 3]);
	ctx.beginPath();
	ctx.moveTo(x, y3);
	ctx.lineTo(x, c_maxTimelineHeight);
	ctx.stroke();

	if (tip !== undefined) {
		testInteraction?.({ x: x - 3, y: 0, w: 6, h: c_maxTimelineHeight }, { hoverTip: [tip] });
	}
	ctx.setLineDash([]);
}

export function drawRuler(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	originX: number;
	ignoreVisibleX?: boolean;
	testInteraction: InteractionHandler;
}): number {
	const { ctx, viewInfo, originX, testInteraction } = params;
	const ignoreVisibleX = params.ignoreVisibleX ?? false;
	const { colors, renderingProps, visibleWidth } = viewInfo;
	// If we're in image export mode, ignore the visibility limit
	const xUpperBound = ignoreVisibleX
		? StaticFn.positionFromTimeAndScale(
				controller.game.time + renderingProps.countdown,
				renderingProps.scale,
			)
		: visibleWidth;
	// ruler bg
	ctx.fillStyle = colors.timeline.ruler;
	ctx.fillRect(0, 0, xUpperBound, TimelineDimensions.rulerHeight);
	// leave the left most section not clickable
	testInteraction(
		{
			x: TimelineDimensions.leftBufferWidth,
			y: 0,
			w: xUpperBound - TimelineDimensions.leftBufferWidth,
			h: TimelineDimensions.rulerHeight,
		},
		{
			hoverTip: (info) => {
				const displayTime =
					StaticFn.timeFromPositionAndScale(info.x - originX, renderingProps.scale) -
					renderingProps.countdown;
				return [displayTime.toFixed(3)];
			},
			onMouseUp: (info) => {
				const displayTime =
					StaticFn.timeFromPositionAndScale(info.x - originX, renderingProps.scale) -
					renderingProps.countdown;
				if (
					displayTime < controller.game.getDisplayTime() &&
					displayTime >= -controller.game.config.countdown
				) {
					controller.displayHistoricalState(displayTime, undefined); // replay the actions as-is
				} else {
					controller.displayCurrentState();
				}
			},
		},
	);

	// ruler marks
	ctx.lineCap = "butt";
	ctx.beginPath();
	const pixelsPerSecond = renderingProps.scale * 100;
	const countdownPadding = renderingProps.countdown * pixelsPerSecond;
	ctx.lineWidth = 1;
	ctx.strokeStyle = colors.text;
	ctx.textBaseline = "alphabetic";

	ctx.font = "13px monospace";
	ctx.textAlign = "center";
	ctx.fillStyle = colors.text;
	const cullThreshold = 50;
	const drawRulerMark = function (sec: number, height: number, drawLabel: boolean) {
		const x = sec * pixelsPerSecond;
		const pos = originX + x + countdownPadding;
		if (pos >= -cullThreshold && pos <= xUpperBound + cullThreshold) {
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, height);
			if (drawLabel) {
				ctx.fillText(StaticFn.displayTime(x / pixelsPerSecond, 0), pos, 23);
			}
		}
	};
	if (pixelsPerSecond >= 6) {
		for (
			let sec = 0;
			sec * pixelsPerSecond < renderingProps.timelineWidth - countdownPadding;
			sec += 1
		) {
			if (sec % 5 !== 0) drawRulerMark(sec, 6, false);
		}
		for (let sec = -1; sec * pixelsPerSecond >= -countdownPadding; sec -= 1) {
			if (sec % 5 !== 0) drawRulerMark(sec, 6, false);
		}
	}
	for (
		let sec = 0;
		sec * pixelsPerSecond < renderingProps.timelineWidth - countdownPadding;
		sec += 5
	) {
		drawRulerMark(sec, 10, true);
	}
	for (let sec = -5; sec * pixelsPerSecond >= -countdownPadding; sec -= 5) {
		drawRulerMark(sec, 10, true);
	}
	ctx.stroke();

	return TimelineDimensions.rulerHeight;
}

export function drawMarkerTracks(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	originX: number;
	originY: number;
	ignoreVisibleX?: boolean;
	testInteraction: InteractionHandler;
}): number {
	const { ctx, viewInfo, originX, originY, testInteraction } = params;
	const ignoreVisibleX = params.ignoreVisibleX ?? false;
	const { colors, renderingProps, visibleWidth } = viewInfo;
	// If we're in image export mode, ignore the visibility limit
	const xUpperBound = ignoreVisibleX
		? StaticFn.positionFromTimeAndScale(
				controller.game.time + renderingProps.countdown,
				renderingProps.scale,
			)
		: visibleWidth;
	// make trackbins
	const trackBins = new Map<number, MarkerElem[]>();
	renderingProps.allMarkers.forEach((marker) => {
		let trackBin = trackBins.get(marker.track);
		if (trackBin === undefined) trackBin = [];
		trackBin.push(marker);
		trackBins.set(marker.track, trackBin);
	});

	// tracks background
	ctx.beginPath();
	let numTracks = 0;
	let hasUntargetableTrack = false;
	for (const k of trackBins.keys()) {
		numTracks = Math.max(numTracks, k + 1);
		if (k === UntargetableMarkerTrack) hasUntargetableTrack = true;
	}
	if (hasUntargetableTrack) numTracks += 1;
	const markerTracksBottomY = originY + numTracks * TimelineDimensions.trackHeight;
	ctx.fillStyle = colors.timeline.tracks;
	for (let i = 0; i < numTracks; i += 2) {
		const top = markerTracksBottomY - (i + 1) * TimelineDimensions.trackHeight;
		ctx.rect(0, top, xUpperBound, TimelineDimensions.trackHeight);
	}
	ctx.fill();

	// timeline markers
	drawMarkers({
		ctx,
		viewInfo,
		markerTracksTopY: originY,
		markerTracksBottomY,
		timelineOrigin: originX,
		trackBins,
		testInteraction,
	});

	return numTracks * TimelineDimensions.trackHeight;
}

function drawSelectionRect(ctx: CanvasRenderingContext2D, rect: Rect) {
	ctx.fillStyle = "rgba(147, 112, 219, 0.15)";
	ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
	ctx.strokeStyle = "rgba(147, 112, 219, 0.5)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(rect.x, rect.y);
	ctx.lineTo(rect.x, rect.y + rect.h);
	ctx.moveTo(rect.x + rect.w, rect.y);
	ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
	ctx.stroke();
}

export function drawTimelines(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	originX: number;
	originY: number;
	isImageExportMode: boolean;
	testInteraction: InteractionHandler;
}): Map<number, Rect> {
	const { ctx, viewInfo, originX, originY, isImageExportMode, testInteraction } = params;
	const { colors, renderingProps } = viewInfo;
	// fragCoord.x of displayTime=0
	const displayOriginX =
		originX + StaticFn.positionFromTimeAndScale(renderingProps.countdown, renderingProps.scale);

	let skillHitboxes = new Map();

	for (let slot = 0; slot < renderingProps.slots.length; slot++) {
		const isActiveSlot = slot === renderingProps.activeSlotIndex;
		const elemBins = new Map<ElemType, TimelineElem[]>();
		if (isImageExportMode && !isActiveSlot) {
			// Only draw the active timeline in export mode
			continue;
		}
		renderingProps.slots[slot].elements.forEach((e) => {
			const arr = elemBins.get(e.type) ?? [];
			arr.push(e);
			elemBins.set(e.type, arr);
		});
		let currentY = originY + slot * TimelineDimensions.renderSlotHeight();
		if (isImageExportMode) {
			// Only draw the active timeline in export mode
			currentY = originY;
		}

		const markDrawBase = {
			ctx,
			viewInfo,
			timelineOriginX: displayOriginX,
			timelineOriginY: currentY,
			testInteraction,
		};

		// mp tick marks
		if (renderingProps.drawOptions.drawMPTickMarks) {
			drawMPTickMarks({
				...markDrawBase,
				elems: (elemBins.get(ElemType.MPTickMark) as MPTickMarkElem[]) ?? [],
			});
		}

		// healing marks
		if (renderingProps.drawOptions.drawHealingMarks) {
			drawPotencyMarks({
				...markDrawBase,
				elems: (elemBins.get(ElemType.HealingMark) as PotencyMarkElem[]) ?? [],
			});
		}

		// damage marks
		if (renderingProps.drawOptions.drawDamageMarks) {
			drawPotencyMarks({
				...markDrawBase,
				elems: (elemBins.get(ElemType.DamageMark) as PotencyMarkElem[]) ?? [],
			});
			drawPotencyMarks({
				...markDrawBase,
				elems: (elemBins.get(ElemType.AggroMark) as PotencyMarkElem[]) ?? [],
			});
		}

		// lucid marks
		if (renderingProps.drawOptions.drawMPTickMarks) {
			drawLucidMarks({
				...markDrawBase,
				elems: (elemBins.get(ElemType.LucidMark) as LucidMarkElem[]) ?? [],
			});
		}

		// always draw meditate tick marks
		drawMeditateTickMarks({
			...markDrawBase,
			elems: (elemBins.get(ElemType.MeditateTickMark) as MeditateTickMarkElem[]) ?? [],
		});

		// draw auto tick marks here
		drawAutoTickMarks({
			...markDrawBase,
			elems: (elemBins.get(ElemType.AutoTickMark) as AutoTickMarkElem[]) ?? [],
		});

		// warning marks (polyglot overcap)
		drawWarningMarks({
			...markDrawBase,
			elems: (elemBins.get(ElemType.WarningMark) as WarningMarkElem[]) ?? [],
		});

		// skills
		const tempHitboxes = drawSkills({
			...markDrawBase,
			elems: (elemBins.get(ElemType.Skill) as SkillElem[]) ?? [],
			interactive: isActiveSlot,
		});
		if (isActiveSlot) {
			skillHitboxes = tempHitboxes;
		}

		// background areas for currently-selected skills
		if (renderingProps.showSelection && isActiveSlot && !isImageExportMode) {
			const selectionLeftPx =
				displayOriginX +
				StaticFn.positionFromTimeAndScale(
					renderingProps.selectionStartDisplayTime,
					renderingProps.scale,
				);
			const selectionWidthPx = StaticFn.positionFromTimeAndScale(
				renderingProps.selectionEndDisplayTime - renderingProps.selectionStartDisplayTime,
				renderingProps.scale,
			);
			drawSelectionRect(ctx, {
				x: selectionLeftPx,
				y: currentY,
				w: selectionWidthPx,
				h: TimelineDimensions.renderSlotHeight(),
			});
		}
	}
	// countdown grey rect
	const countdownWidth = StaticFn.positionFromTimeAndScale(
		renderingProps.countdown,
		renderingProps.scale,
	);
	let countdownHeight = TimelineDimensions.renderSlotHeight() * renderingProps.slots.length;
	if (renderingProps.slots.length < MAX_TIMELINE_SLOTS)
		countdownHeight += TimelineDimensions.addSlotButtonHeight;
	ctx.fillStyle = colors.timeline.countdown;
	// make it cover the left padding as well:
	ctx.fillRect(
		originX - TimelineDimensions.leftBufferWidth,
		originY,
		countdownWidth + TimelineDimensions.leftBufferWidth,
		countdownHeight,
	);

	if (isImageExportMode) {
		// In image export mode, don't render slot selection bars
		// and don't return any hitbox information
		return new Map();
	}

	// slot selection bars
	for (let slot = 0; slot < renderingProps.slots.length; slot++) {
		const currentY = originY + slot * TimelineDimensions.renderSlotHeight();
		const handle: Rect = {
			x: 0,
			y: currentY + 1,
			w: 14,
			h: TimelineDimensions.renderSlotHeight() - 2,
		};
		ctx.fillStyle =
			slot === renderingProps.activeSlotIndex ? colors.accent : colors.bgMediumContrast;
		ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		testInteraction(handle, {
			hoverTip:
				slot === renderingProps.activeSlotIndex
					? undefined
					: [localize({ en: "set active", zh: "设为当前" }) as string],
			onMouseUp: () => controller.setActiveSlot(slot),
			pointerMouse: true,
		});

		// delete btn
		if (renderingProps.slots.length > 1 && slot === renderingProps.activeSlotIndex) {
			ctx.fillStyle = colors.emphasis;
			ctx.font = "bold 14px monospace";
			ctx.textAlign = "center";
			ctx.fillText("×", handle.x + handle.w / 2, handle.y + handle.h - 4);
			const deleteBtn: Rect = {
				x: handle.x,
				y: handle.y + handle.h - handle.w,
				w: handle.w,
				h: handle.w,
			};
			testInteraction(deleteBtn, {
				hoverTip: [localize({ en: "delete", zh: "删除" }) as string],
				onMouseUp: () => {
					controller.timeline.removeSlot(slot);
					controller.displayCurrentState();
				},
				pointerMouse: true,
			});
		}
	}
	return skillHitboxes;
}

function drawCursors(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	originX: number;
	timelineStartY: number;
	testInteraction: InteractionHandler;
}) {
	const { ctx, viewInfo, originX, timelineStartY, testInteraction } = params;
	const { colors, renderingProps } = viewInfo;
	// fragCoord.x of displayTime=0
	const displayOriginX =
		originX + StaticFn.positionFromTimeAndScale(renderingProps.countdown, renderingProps.scale);
	const slotHeight = TimelineDimensions.renderSlotHeight();
	const activeSlotStartY = timelineStartY + renderingProps.activeSlotIndex * slotHeight;

	const sharedElemBins = new Map<ElemType, TimelineElem[]>();
	renderingProps.sharedElements.forEach((e) => {
		const arr = sharedElemBins.get(e.type) ?? [];
		arr.push(e);
		sharedElemBins.set(e.type, arr);
	});

	const cursorPositions = {
		y1: timelineStartY,
		y2: activeSlotStartY,
		y3: activeSlotStartY + slotHeight,
	};

	// view only cursor
	(sharedElemBins.get(ElemType.s_ViewOnlyCursor) ?? []).forEach((cursor) => {
		const vcursor = cursor as ViewOnlyCursorElem;
		if (vcursor.enabled) {
			const x =
				displayOriginX +
				StaticFn.positionFromTimeAndScale(cursor.displayTime, renderingProps.scale);
			drawCursor({
				ctx,
				viewInfo,
				color: colors.historical,
				x,
				...cursorPositions,
				tip: localize({ en: "cursor: ", zh: "光标：" }) + vcursor.displayTime.toFixed(3),
				testInteraction,
			});
		}
	});

	// cursor
	(sharedElemBins.get(ElemType.s_Cursor) ?? []).forEach((elem) => {
		const cursor = elem as CursorElem;
		const x =
			displayOriginX +
			StaticFn.positionFromTimeAndScale(cursor.displayTime, renderingProps.scale);
		drawCursor({
			ctx,
			viewInfo,
			color: colors.emphasis,
			x,
			...cursorPositions,
			tip: localize({ en: "cursor: ", zh: "光标：" }) + cursor.displayTime.toFixed(3),
			testInteraction,
		});
	});
}

// Draw selection boxes and the cursor used to represent the target of a drop operation.
function drawClickDragInteractions(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	timelineStartY: number;
	mouseX: number;
	mouseY: number;
	selectStartX: number;
	selectStartY: number;
	interactionInfo: MouseInteractionInfo;
	dragTargetTime: number | null;
}) {
	const {
		ctx,
		viewInfo,
		timelineStartY,
		mouseX,
		mouseY,
		selectStartX,
		selectStartY,
		interactionInfo,
		dragTargetTime,
	} = params;
	const { bgSelecting, draggedSkillElem } = interactionInfo;
	const { colors, visibleLeft, renderingProps } = viewInfo;
	if (bgSelecting) {
		const selectionRect = {
			x: Math.min(selectStartX, mouseX),
			y: Math.min(selectStartY, mouseY),
			w: Math.abs(selectStartX - mouseX),
			h: Math.abs(selectStartY - mouseY),
		};
		drawSelectionRect(ctx, selectionRect);
	}
	const timelineOriginX = -visibleLeft + TimelineDimensions.leftBufferWidth;
	const displayOriginX =
		timelineOriginX +
		StaticFn.positionFromTimeAndScale(renderingProps.countdown, renderingProps.scale);
	if (draggedSkillElem) {
		// Draw a slightly transparent image of the skill being dragged.
		const tmpAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.4;
		ctx.drawImage(
			getSkillIconImage(draggedSkillElem.skillName),
			mouseX,
			mouseY,
			SKILL_ICON_SIZE_PX,
			SKILL_ICON_SIZE_PX,
		);
		ctx.globalAlpha = tmpAlpha;
	}
	const targetTime = dragTargetTime;
	if (targetTime !== null) {
		// Draw a cursor at the destination time of a drag/drop.
		const slotHeight = TimelineDimensions.renderSlotHeight();
		const activeSlotStartY = timelineStartY + renderingProps.activeSlotIndex * slotHeight;
		const x =
			displayOriginX + StaticFn.positionFromTimeAndScale(targetTime, renderingProps.scale);
		drawCursor({
			ctx,
			viewInfo,
			color: colors.dropTarget,
			x,
			y1: timelineStartY,
			y2: activeSlotStartY,
			y3: activeSlotStartY + slotHeight,
			width: 4,
		});
	}
}

function drawAddSlotButton(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	originY: number;
	testInteraction: InteractionHandler;
}): number {
	const {
		ctx,
		viewInfo: { colors, renderingProps },
		originY,
		testInteraction,
	} = params;
	if (renderingProps.slots.length < MAX_TIMELINE_SLOTS) {
		// "Add timeline slot" button
		const BUTTON_W_PX = 192;
		const BUTTON_LEFT_MARGIN_PX = 4;
		const handle: Rect = {
			x: BUTTON_LEFT_MARGIN_PX,
			y: originY + 2,
			w: BUTTON_W_PX,
			h: TimelineDimensions.addSlotButtonHeight - 4,
		};
		ctx.fillStyle = colors.bgLowContrast;
		ctx.fillRect(handle.x, handle.y, handle.w, handle.h);
		ctx.strokeStyle = colors.bgHighContrast;
		ctx.lineWidth = 1;
		ctx.strokeRect(handle.x, handle.y, handle.w, handle.h);
		ctx.font = "13px monospace";
		ctx.fillStyle = colors.text;
		ctx.textAlign = "center";
		ctx.fillText(
			localize({ en: "Add timeline slot", zh: "添加时间轴" }) as string,
			handle.x + handle.w / 2,
			handle.y + handle.h - 4,
		);

		testInteraction(handle, {
			onMouseUp: () => {
				controller.timeline.addSlot();
				controller.displayCurrentState();
			},
			pointerMouse: true,
		});

		// "Clone timeline slot" button
		const cloneHandle: Rect = {
			x: 2 * BUTTON_LEFT_MARGIN_PX + BUTTON_W_PX,
			y: originY + 2,
			w: BUTTON_W_PX,
			h: TimelineDimensions.addSlotButtonHeight - 4,
		};
		ctx.fillStyle = colors.bgLowContrast;
		ctx.fillRect(cloneHandle.x, cloneHandle.y, cloneHandle.w, cloneHandle.h);
		ctx.strokeStyle = colors.bgHighContrast;
		ctx.lineWidth = 1;
		ctx.strokeRect(cloneHandle.x, cloneHandle.y, cloneHandle.w, cloneHandle.h);
		ctx.font = "13px monospace";
		ctx.fillStyle = colors.text;
		ctx.textAlign = "center";
		ctx.fillText(
			localize({ en: "Clone timeline slot", zh: "复制时间轴" }) as string,
			cloneHandle.x + cloneHandle.w / 2,
			cloneHandle.y + cloneHandle.h - 4,
		);

		testInteraction(cloneHandle, {
			onMouseUp: () => {
				controller.cloneActiveSlot();
				controller.displayCurrentState();
			},
			pointerMouse: true,
		});

		return TimelineDimensions.addSlotButtonHeight;
	}
	return 0;
}

// Drawing is split into three layers to make state management easier to reason about.
// These layers all actually be on the same canvas in some scenarios, as for image export.
// The z-index of the canvas HTML elements ensures proper order across the different levels.
// Layer 1: background elements, skills, tick marks, and things updated by simulation
// Layer 2: relatively static elements like buttons and marker tracks
// Layer 3: tooltips and cursors only displayed during interactions

function getMarkerTracksHeight(): number {
	let numTracks = 0;
	let hasUntargetableTrack = false;
	for (const marker of controller.timeline.getAllMarkers()) {
		const k = marker.track;
		numTracks = Math.max(numTracks, k + 1);
		if (k === UntargetableMarkerTrack) hasUntargetableTrack = true;
	}
	if (hasUntargetableTrack) numTracks += 1;
	return numTracks * TimelineDimensions.trackHeight;
}

function getTimelineStartY(): number {
	return TimelineDimensions.rulerHeight + getMarkerTracksHeight();
}

// background layer:
// white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
function drawLive(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	testInteraction: InteractionHandler;
}): Map<number, Rect> {
	const { ctx, viewInfo, testInteraction } = params;
	const { renderingProps, colors, visibleLeft, visibleWidth } = viewInfo;
	const timelineOrigin = -visibleLeft + TimelineDimensions.leftBufferWidth; // fragCoord.x (...) of rawTime=0.
	let currentHeight = 0;

	// background white
	ctx.fillStyle = colors.background;
	// add 1 here because this scaled dimension from dpr may not perfectly cover the entire canvas
	ctx.fillRect(0, 0, visibleWidth + 1, renderingProps.timelineHeight + 1);
	testInteraction(
		{ x: 0, y: 0, w: visibleWidth, h: c_maxTimelineHeight },
		{ onMouseDown: onMouseDownTimelineBackground },
	);
	currentHeight += drawRuler({
		ctx,
		originX: timelineOrigin,
		viewInfo,
		testInteraction,
	});
	currentHeight += getMarkerTracksHeight();
	return drawTimelines({
		ctx,
		viewInfo,
		originX: timelineOrigin,
		originY: currentHeight,
		isImageExportMode: false,
		testInteraction,
	});
}

function drawLowUpdate(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	testInteraction: InteractionHandler;
}) {
	const { ctx, viewInfo, testInteraction } = params;
	const timelineOrigin = -viewInfo.visibleLeft + TimelineDimensions.leftBufferWidth;
	drawMarkerTracks({
		ctx,
		viewInfo,
		originX: timelineOrigin,
		originY: TimelineDimensions.rulerHeight,
		testInteraction,
	});
	drawAddSlotButton({
		ctx,
		viewInfo,
		originY:
			getTimelineStartY() +
			TimelineDimensions.renderSlotHeight() * viewInfo.renderingProps.slots.length,
		testInteraction,
	});
}

function drawInteractive(params: {
	ctx: CanvasRenderingContext2D;
	viewInfo: ViewInfo;
	dragTargetTime: number | null;
	activeHoverTip?: string[];
	activeHoverImages?: any[];
	mouseX: number;
	mouseY: number;
	selectStartX: number;
	selectStartY: number;
	mouseInteractionInfo?: MouseInteractionInfo;
	testInteraction: InteractionHandler;
}) {
	const {
		ctx,
		viewInfo,
		dragTargetTime,
		activeHoverTip,
		activeHoverImages,
		mouseX,
		mouseY,
		selectStartX,
		selectStartY,
		mouseInteractionInfo,
		testInteraction,
	} = params;
	const timelineOrigin = -viewInfo.visibleLeft + TimelineDimensions.leftBufferWidth;
	const timelineStartY = getTimelineStartY();
	drawCursors({
		ctx,
		viewInfo,
		originX: timelineOrigin,
		timelineStartY: timelineStartY,
		testInteraction,
	});

	// Click/drag interactions should be drawn beneath slot buttons and tooltips.
	if (mouseInteractionInfo) {
		drawClickDragInteractions({
			ctx,
			viewInfo,
			timelineStartY,
			mouseX,
			mouseY,
			selectStartX,
			selectStartY,
			interactionInfo: mouseInteractionInfo,
			dragTargetTime,
		});
	}

	if (activeHoverTip !== undefined) {
		drawTip({
			ctx,
			viewInfo,
			lines: activeHoverTip,
			images: activeHoverImages,
			mouseX,
			mouseY,
		});
	}
}

// (layers for optimization, in case one day rendering becomes the performance bottleneck again: )
// background layer: white bg, tracks bg, ruler bg, ruler marks, numbers on ruler: update only when canvas size change, countdown grey
// skills, damage marks, mp and lucid ticks: update when new elems added
// cursor, selection: can update in real time; on top of everything else
// transparent interactive layer: only render when not in real time, html DOM
// current layering is mostly for state cleanliness, and can be further separated to reduce the number of draws

// Check if two rectangles overlap.
// https://stackoverflow.com/a/16012490
function rectsOverlap(a: Rect, b: Rect): boolean {
	const aLeftOfB = a.x + a.w < b.x;
	const aRightOfB = a.x > b.x + b.w;
	const aAboveB = a.y + a.h < b.y;
	const aBelowB = a.y > b.y + b.h;
	return !(aLeftOfB || aRightOfB || aAboveB || aBelowB);
}

// Check whether a mouse event at {x, y} overlaps any specified rectangles.
// Iterates hitboxes in reverse order to ensure that the top-most hitbox (registered last)
// is always triggered.
// Returns undefined if no rectangles overlap the mouse location.
function findMouseItem<T>(x: number, y: number, zones: Map<Rect, T>): T | undefined {
	for (const [zone, value] of Array.from(zones.entries()).reverse()) {
		if (x > zone.x && x < zone.x + zone.w && y > zone.y && y < zone.y + zone.h) {
			return value;
		}
	}
	return undefined;
}

interface InteractionLayer {
	mouseDown: Map<Rect, (interactionInfo: MouseInteractionInfo) => void>;
	mouseUp: Map<Rect, (interactionInfo: MouseInteractionInfo) => void>;
	mouseHover: Map<
		Rect,
		{ tip?: string[] | ((interactionInfo: MouseInteractionInfo) => string[]); images?: any[] }
	>;
	pointer: Map<Rect, boolean>;
}

function newInteractionLayer(): InteractionLayer {
	return {
		mouseDown: new Map(),
		mouseUp: new Map(),
		mouseHover: new Map(),
		pointer: new Map(),
	};
}

function clearLayer(layer: InteractionLayer) {
	(["mouseDown", "mouseHover", "mouseUp", "pointer"] as (keyof InteractionLayer)[]).forEach(
		(zone) => layer[zone].clear(),
	);
}

export function TimelineCanvas(props: {
	timelineHeight: number;
	visibleLeft: number;
	visibleWidth: number;
	version: number;
	pointerMouse: boolean;
	setCallbacks: (c: CanvasCallbacks) => void;
	setPointerMouse: (b: boolean) => void;
}) {
	// Most objects here use useRef rather than useState because we synchronize against a canvas object
	// rather than react-rendered DOM items.
	const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const interactiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const lowUpdateCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const dpr = window.devicePixelRatio;

	const scaledWidth = props.visibleWidth * dpr;
	const scaledHeight = props.timelineHeight * dpr;

	const [, forceUpdate] = useReducer((x) => x + 1, 0);
	const activeColorTheme = useContext(ColorThemeContext);
	const globalDragContext = useContext(DragTargetContext);
	const lockContext = useContext(DragLockContext);
	const selectionBounds = useRef<(number | null)[]>([null, null]);
	const mouseX = useRef(0);
	const mouseY = useRef(0);
	const selectStartX = useRef<number>(0);
	const selectStartY = useRef<number>(0);
	const activeHoverDraw = useRef<{
		tip?: string[] | ((info: MouseInteractionInfo) => string[]);
		images?: any[];
	}>({});

	// Track hitboxes for interactable objects on the canvas.
	// These are reset when a simulation update occurs. In the future, we can prune these more
	// intelligently by detecting skill additions and deletions, but the naive approach is easier
	// to reason about and implement.
	// skillHitboxes is somewhat redundant with mouseHoverZones, but doesn't take that much memory.
	const skillHitboxes = useRef(new Map<number, Rect>());
	const interactionLayers = useRef({
		live: newInteractionLayer(),
		interactive: newInteractionLayer(),
		lowUpdate: newInteractionLayer(),
	});
	function getAllZones<K extends keyof InteractionLayer>(k: K): InteractionLayer[K] {
		// inefficient, but gets the job done
		const curr = interactionLayers.current;
		// @ts-expect-error keyof hack for conciseness
		return new Map([...curr.live[k], ...curr.interactive[k], ...curr.lowUpdate[k]]);
	}

	const draggedSkillElem = useRef<SkillElem | undefined>(undefined);
	const setDraggedSkillElem = (e: SkillElem | undefined) => {
		draggedSkillElem.current = e;
	};

	const bgSelecting = useRef(false);
	const setBgSelecting = (b: boolean) => {
		bgSelecting.current = b;
	};
	const makeTestInteraction: (k: "live" | "interactive" | "lowUpdate") => InteractionHandler =
		(k) =>
		(
			rect: Rect,
			params: {
				hoverTip?: string[] | ((info: MouseInteractionInfo) => string[]);
				onMouseUp?: (info: MouseInteractionInfo) => void;
				onMouseDown?: (info: MouseInteractionInfo) => void;
				pointerMouse?: boolean;
				hoverImages?: any[];
			},
		) => {
			const { hoverTip, onMouseUp, onMouseDown, pointerMouse, hoverImages } = params;
			const layer = interactionLayers.current[k];
			if (hoverTip || hoverImages) {
				layer.mouseHover.set(rect, {
					tip: hoverTip,
					images: hoverImages,
				});
			}
			if (onMouseUp) {
				layer.mouseUp.set(rect, onMouseUp);
			}
			if (onMouseDown) {
				layer.mouseDown.set(rect, onMouseDown);
			}
			if (pointerMouse !== undefined) {
				layer.pointer.set(rect, pointerMouse);
			}
		};
	const clearCtx = (ctx: CanvasRenderingContext2D) => {
		const left = -props.visibleLeft - TimelineDimensions.leftBufferWidth;
		const w = props.visibleWidth - left;
		ctx.clearRect(left, 0, w, c_maxTimelineHeight);
	};
	const getDrawState = () => {
		const tip = activeHoverDraw.current.tip;
		const interaction: MouseInteractionInfo = {
			x: mouseX.current,
			y: mouseY.current,
			shiftKey: false,
			dragLock: lockContext.value,
			draggedSkillElem: draggedSkillElem.current,
			bgSelecting: bgSelecting.current,
			setDraggedSkillElem,
			setBgSelecting,
		};
		return {
			viewInfo: {
				renderingProps: controller.getTimelineRenderingProps(),
				colors: getThemeColors(activeColorTheme),
				visibleLeft: props.visibleLeft,
				visibleWidth: props.visibleWidth,
			},
			dragTargetTime: globalDragContext.dragTargetTime,
			mouseX: mouseX.current,
			mouseY: mouseY.current,
			selectStartX: selectStartX.current,
			selectStartY: selectStartY.current,
			activeHoverTip:
				tip !== undefined ? (Array.isArray(tip) ? tip : tip(interaction)) : undefined,
			activeHoverImages: activeHoverDraw.current.images,
			mouseInteractionInfo: interaction,
		};
	};
	const redrawInteractive = () => {
		const ctx = interactiveCanvasRef.current?.getContext("2d", { alpha: true });
		if (ctx) {
			clearCtx(ctx);
			clearLayer(interactionLayers.current.interactive);
			drawInteractive({
				ctx,
				...getDrawState(),
				testInteraction: makeTestInteraction("interactive"),
			});
		}
	};

	// If performance ver becomes an issue, convert these to use useCallback().
	// NOTE: props.setCallbacks must be set whenever window dimensions change, or else the
	// helper functions used here will read stale values of props.
	const callbacks: CanvasCallbacks = {
		onMouseMove: (x: number, y: number) => {
			mouseX.current = x;
			mouseY.current = y;
			// If we're over an element with a hover tooltip, draw it.
			activeHoverDraw.current = findMouseItem(x, y, getAllZones("mouseHover")) ?? {};
			if (bgSelecting.current) {
				// Re-compute which skills are currently selected.
				// We do this by iterating the leftmost and rightmost skill icon "hitboxes" to find our
				// bounds. Since the y-ranges of oGCD and GCD skills are always fixed, we could potentially
				// split hitboxes for those skills into separate lists as an optimization.
				// However, since the total number of skills will always be relatively small, I view this
				// as a premature optimization.
				const selectionRect = {
					x: Math.min(selectStartX.current, x),
					y: Math.min(selectStartY.current, y),
					w: Math.abs(selectStartX.current - x),
					h: Math.abs(selectStartY.current - y),
				};
				let leftIndex = null;
				let rightIndex = null;
				// Check "left" bound:
				for (const [actionIndex, rect] of skillHitboxes.current.entries()) {
					if (rectsOverlap(rect, selectionRect)) {
						leftIndex = actionIndex;
						rightIndex = actionIndex;
						break;
					}
				}
				if (rightIndex !== null) {
					// Check "right" bound:
					for (const [actionIndex, rect] of Array.from(
						skillHitboxes.current.entries(),
					).reverse()) {
						if (rightIndex >= actionIndex) {
							break;
						}
						if (rectsOverlap(rect, selectionRect)) {
							rightIndex = actionIndex;
							break;
						}
					}
				}
				if (
					leftIndex !== selectionBounds.current[0] ||
					rightIndex !== selectionBounds.current[1]
				) {
					selectionBounds.current = [leftIndex, rightIndex];
					if (leftIndex !== null && rightIndex !== null) {
						controller.record.selectSingle(leftIndex);
						controller.record.selectUntil(rightIndex);
					} else {
						controller.record.unselectAll();
					}
					controller.displayCurrentState();
				}
			}
			if (draggedSkillElem.current) {
				// If we began a skill element drag that is not in the current selection,
				// then select the skill being dragged.
				if (!controller.record.isInSelection(draggedSkillElem.current.actionIndex)) {
					controller.timeline.onClickTimelineAction(
						draggedSkillElem.current.actionIndex,
						false,
					);
				}
				// If we're currently dragging a skill, update the position of the cursor to draw.
				const timelineOriginX = -props.visibleLeft + TimelineDimensions.leftBufferWidth;
				// Linear search for the skill hitbox with the smallest x distance, and set it as the new drag target
				let minDist = Infinity;
				let minIdx = -1;
				let lastXDist = undefined;
				const hitboxes = skillHitboxes.current;
				const entries = Array.from(hitboxes.entries());
				for (let i = 0; i < entries.length; i++) {
					const [index, hitbox] = entries[i];
					let xDist = Math.abs(mouseX.current - hitbox.x);
					// Do not use the right border for the final action in the timeline because
					// in some cases, the sim end cursor will not be past this position.
					if (i !== entries.length - 1) {
						xDist = Math.min(xDist, Math.abs(mouseX.current - hitbox.x - hitbox.w));
					}
					if (lastXDist !== undefined && xDist > lastXDist) {
						break;
					}
					if (xDist < minDist) {
						minDist = xDist;
						minIdx = index;
					}
					lastXDist = xDist;
				}
				// If the closest index turned out to be the last element, then also check against
				// the end of the simulation.
				let endDist = Infinity;
				const renderingProps = controller.getTimelineRenderingProps();
				const cursors = renderingProps.sharedElements.filter(
					(elem) => elem.type == ElemType.s_Cursor,
				);
				let endPos = undefined;
				const endTime = cursors[cursors.length - 1].displayTime + renderingProps.countdown;
				if (cursors.length > 0) {
					endPos =
						timelineOriginX +
						StaticFn.positionFromTimeAndScale(endTime, renderingProps.scale);
					endDist = Math.abs(mouseX.current - endPos);
				}
				let targetTime: number | null = null;
				// This may look weird if the last element is a jump--may need to change later.
				const allIndices = Array.from(hitboxes.keys());
				if (
					endPos !== undefined &&
					endDist < minDist &&
					hitboxes.size > 0 &&
					minIdx === allIndices[allIndices.length - 1]
				) {
					minIdx = allIndices[allIndices.length - 1] + 1;
					targetTime = endTime - renderingProps.countdown;
				}
				if (minIdx !== -1 && globalDragContext.dragTargetIndex !== minIdx) {
					if (targetTime === null) {
						// If the action being dragged is an oGCD, place it at the end of the PRIOR node's
						// animation lock.
						// This is not fully robust and doesn't account for GCDs moved around wait events,
						// but it's good enough.
						if (minIdx > 0 && !draggedSkillElem.current.isGCD) {
							const priorNode = controller.record.actions[minIdx - 1];
							targetTime = priorNode.tmp_endLockTime ?? null;
						} else {
							targetTime =
								controller.record.actions[minIdx].tmp_startLockTime ?? null;
						}
						// node locks use absolute time (must subtract countdown)
						if (targetTime !== null) {
							targetTime -= controller.gameConfig.countdown;
						}
					}
					globalDragContext.setDragTarget(minIdx, targetTime);
				}
			}
			// Update whether the cursor should be a pointer.
			props.setPointerMouse(findMouseItem(x, y, getAllZones("pointer")) ?? false);
			redrawInteractive();
		},
		onMouseEnter: () => {},
		onMouseLeave: () => {
			bgSelecting.current = false;
		},
		// ignore KB & M input when in the middle of using a skill (for simplicity)
		onMouseUp: (e: any, x: number, y: number) => {
			mouseX.current = x;
			mouseY.current = y;
			// Always end a background selection operation when the mouse is released, regardless of
			// what element the cursor is hovering.
			bgSelecting.current = false;
			// Cancel any existing drag operation.
			if (draggedSkillElem.current) {
				const targetIndex = globalDragContext.dragTargetIndex;
				globalDragContext.setDragTarget(null, null);
				setDraggedSkillElem(undefined);
				let manualRedrawInteractive = true;
				if (targetIndex !== null) {
					// Confirm the skill movement, and reset global drag state.
					const start = controller.record.selectionStartIndex ?? 0;
					let distance = targetIndex - (start ?? 0);
					// If we need to move the item upwards, then we already have the correct offset.
					// If it needs to move down, we need to subtract the length of the current selection.
					if (distance > 0) {
						distance -= controller.record.getSelectionLength();
					}
					if (distance !== 0) {
						// Even though we're automatically saving the edit, go through the whole song
						// and dance of pretending an edit was made so state is properly synchronized.
						controller.record.moveSelected(distance);
						controller.checkRecordValidity(controller.record, 0, true);
						controller.autoSave();
						updateInvalidStatus();
						updateTimelineView();
						controller.displayCurrentState();
						manualRedrawInteractive = false;
					}
				}
				if (manualRedrawInteractive) {
					// If we modified the timeline, a redraw request to the whole canvas was already made.
					// Otherwise, we need to redraw to remove the dragged skill icon.
					redrawInteractive();
				}
			}
			if (!controller.shouldLoop) {
				// Only handle mouseup events if we're not currently in an animation.
				// This must run AFTER the prior drag check to ensure dropping an icon on top
				// of a skill hitbox works properly.
				findMouseItem(
					x,
					y,
					getAllZones("mouseUp"),
				)?.({
					x,
					y,
					shiftKey: e.shiftKey,
					dragLock: lockContext.value,
					bgSelecting: bgSelecting.current,
					setDraggedSkillElem,
					setBgSelecting,
				});
			}
		},
		onMouseDown: (x: number, y: number) => {
			mouseX.current = x;
			mouseY.current = y;
			if (!controller.shouldLoop) {
				// Only handle mousedown events if we're not currently in an animation.
				const mouseDownZones = getAllZones("mouseDown");
				selectStartX.current = x;
				selectStartY.current = y;
				findMouseItem(
					x,
					y,
					mouseDownZones,
				)?.({
					x,
					y,
					shiftKey: false,
					dragLock: lockContext.value,
					bgSelecting: bgSelecting.current,
					setDraggedSkillElem,
					setBgSelecting,
				});
			}
		},
		onKeyDown: (e: any) => {
			if (!controller.shouldLoop) {
				if (e.key === "Backspace" || e.key === "Delete") {
					forceUpdate();
					const firstSelected = controller.record.selectionStartIndex;
					if (firstSelected !== undefined) {
						controller.deleteSelectedSkill();
					}
				}
			}
		},
	};

	// Update callbacks when global contexts change? Not quite sure why this is necessary, but
	// they seem to read stale values otherwise.
	useEffect(
		() => props.setCallbacks(callbacks),
		[globalDragContext.dragTargetTime, lockContext.value],
	);

	const redrawEverything = () => {
		const [liveCtx, interactiveCtx, lowUpdateCtx] = [
			liveCanvasRef,
			interactiveCanvasRef,
			lowUpdateCanvasRef,
		].map((ref, i) => ref.current?.getContext("2d", { alpha: i !== 0 }));
		if (liveCtx && interactiveCtx && lowUpdateCtx) {
			// Event trigger zones are re-computed when testInteraction is called
			clearLayer(interactionLayers.current.live);
			clearLayer(interactionLayers.current.interactive);
			clearLayer(interactionLayers.current.lowUpdate);
			// Don't need to clearRect the live ctx because we do an explicit background fillRect
			[interactiveCtx, lowUpdateCtx].forEach((ctx) => clearCtx(ctx));
			const viewInfo = {
				renderingProps: controller.getTimelineRenderingProps(),
				colors: getThemeColors(activeColorTheme),
				visibleLeft: props.visibleLeft,
				visibleWidth: props.visibleWidth,
			};
			liveCtx.scale(dpr, dpr);
			skillHitboxes.current = drawLive({
				ctx: liveCtx,
				viewInfo,
				testInteraction: makeTestInteraction("live"),
			});
			liveCtx.scale(1 / dpr, 1 / dpr);
			interactiveCtx.scale(dpr, dpr);
			drawInteractive({
				ctx: interactiveCtx,
				...getDrawState(),
				testInteraction: makeTestInteraction("interactive"),
			});
			interactiveCtx.scale(1 / dpr, 1 / dpr);
			lowUpdateCtx.scale(dpr, dpr);
			drawLowUpdate({
				ctx: lowUpdateCtx,
				viewInfo,
				testInteraction: makeTestInteraction("lowUpdate"),
			});
			lowUpdateCtx.scale(1 / dpr, 1 / dpr);
		}
	};

	// Redraw cursors when the timeline editor sets a drag target time.
	useEffect(redrawInteractive, [globalDragContext.dragTargetTime]);

	// It should be impossible to update the lock context while dragging... but clear state just in case.
	useEffect(() => {
		if (!lockContext.value) {
			redrawInteractive();
			globalDragContext.setDragTarget(null, null);
			setDraggedSkillElem(undefined);
		}
	}, [lockContext.value]);

	// Redraw everything when a mouse position changes, or an animation frame is requested by props.version.
	useEffect(redrawEverything, [mouseX, mouseY, props.version, dpr]);

	// When the selection window changes, we need to update the callbacks as well to ensure
	// they don't read stale values of the window dimensions.
	useEffect(() => {
		redrawEverything();
		props.setCallbacks(callbacks);
	}, [props.visibleLeft, props.visibleWidth]);

	// For ease of reasoning about state, the canvas is split into 3 layers:
	// 1. A "live" layer for elements that must be redrawn when a timeline or simulation changes:
	// ruler, skill icons, animation lock/cast/recast bars, damage ticks, mp and other background ticks,
	// historical and sim end cursors
	// 2. A "low update" layer for elements that are infrequently redrawn:
	// Context for elements that are infrequently updated:
	// timeline markers, slot handles, add/clone buttons
	// 3. An "interactive" layer for elements like tooltips that display when the user interacts
	// selection box, skill selection highlight, drag/drop target cursor, drag/drop skill icon
	//
	// Only the interactive layer is currently re-drawn independently.
	//
	// https://stackoverflow.com/questions/3008635/html5-canvas-element-multiple-layers
	const canvasStyle: CSSProperties = {
		width: props.visibleWidth,
		height: props.timelineHeight,
		position: "absolute",
		pointerEvents: "none",
		cursor: props.pointerMouse ? "pointer" : "default",
		left: 0,
		top: 0,
	};
	const canvasWidth = Math.ceil(scaledWidth);
	const canvasHeight = Math.ceil(scaledHeight);
	return <div style={{ position: "relative" }}>
		<canvas
			ref={liveCanvasRef}
			width={canvasWidth}
			height={canvasHeight}
			tabIndex={0}
			style={{ ...canvasStyle, zIndex: 0 }}
		/>
		<canvas
			ref={lowUpdateCanvasRef}
			width={canvasWidth}
			height={canvasHeight}
			tabIndex={-1}
			style={{ ...canvasStyle, zIndex: 1, backgroundColor: "transparent" }}
		/>
		<canvas
			ref={interactiveCanvasRef}
			width={canvasWidth}
			height={canvasHeight}
			tabIndex={-1}
			style={{ ...canvasStyle, zIndex: 2, backgroundColor: "transparent" }}
		/>
	</div>;
}
