import React from "react";
import {
	CURRENT_GAME_COMBAT_PATCH,
	getCachedValue,
	removeCachedValue,
	ReplayMode,
	setCachedValue,
	ShellInfo,
	ShellVersion,
	TickMode,
} from "./Common";
import { ClipboardMode, copy, paste } from "./Clipboard";
import { UndoStack, AddNode, DeleteNodes } from "./UndoStack";
import { GameState } from "../Game/GameState";
import {
	getAutoReplacedSkillName,
	getConditionalReplacement,
	getNormalizedSkillName,
} from "../Game/Skills";
import { Buff } from "../Game/Buffs";
import {
	BuffType,
	Debug,
	LevelSync,
	makeSkillReadyStatus,
	ProcMode,
	SkillReadyStatus,
	SkillUnavailableReason,
	Warning,
} from "../Game/Common";
import { DEFAULT_CONFIG, GameConfig } from "../Game/GameConfig";
import { updateStatusDisplay } from "../Components/StatusDisplay";
import { updateSkillButtons, SkillButtonViewInfo } from "../Components/Skills";
import { updateConfigDisplay } from "../Components/PlaybackControl";
import { type ThemeColors } from "../Components/ColorTheme";
import { setHistorical, setJob, setRealTime } from "../Components/Main";
import {
	PotencyMarkElem,
	PotencyMarkInfo,
	ElemType,
	MAX_TIMELINE_SLOTS,
	Timeline,
} from "./Timeline";
import { scrollTimelineTo, updateTimelineView } from "../Components/Timeline";
import {
	ActionNode,
	ActionType,
	Line,
	Record,
	RecordValidStatus,
	skillNode,
	durationWaitNode,
	jumpToTimestampNode,
	waitForMPNode,
	setResourceNode,
	unknownSkillNode,
} from "./Record";
import { ImageExportConfig } from "./ImageExportConfig";
import { inferJobFromSkillNames, PresetLinesManager } from "./PresetLinesManager";
import { updateSkillSequencePresetsView } from "../Components/SkillSequencePresets";
import {
	refreshTimelineEditor,
	scrollEditorToFirstSelected,
	scrollEditorToLastSelected,
	updateActiveTimelineEditor,
	updateInvalidStatus,
} from "../Components/TimelineEditor";
import {
	CsvData,
	DEFAULT_TIMELINE_OPTIONS,
	StaticFn,
	TimelineDrawOptions,
} from "../Components/Common";
import { TimelineRenderingProps } from "../Components/TimelineCanvas";
import { Potency, PotencyKind, PotencyModifierType } from "../Game/Potency";
import {
	DamageStatisticsData,
	updateDamageStats,
	updateSelectedStats,
} from "../Components/DamageStatistics";
import {
	bossIsUntargetable,
	calculateDamageStats,
	calculateSelectedStats,
	getTargetableDurationBetween,
} from "./DamageStatistics";
import { XIVMath } from "../Game/XIVMath";
import { TANK_JOBS, MELEE_JOBS, RANGED_JOBS, ShellJob } from "../Game/Data/Jobs";
import { ActionKey, ACTIONS, ResourceKey, RESOURCES } from "../Game/Data";
import { getGameState } from "../Game/Jobs";
import { localizeSkillName } from "../Components/Localization";

// Ensure role actions are imported after job-specific ones to protect hotbar ordering
import "../Game/Jobs/RoleActions";

type Fixme = any;

const STANDARD_TICK_KEY = "stdtick";

export interface PotencyLogCsv {
	time: number;
	source: string;
	potency: number;
	buffs: ResourceKey[];
}

export interface OvertimeEffectCoverage {
	tStartDisplay: number;
	tEndDisplay?: number;
}

type WaitKind = "duration" | "target" | "mp";

type ReplayResult = {
	success: boolean;
	firstAddedIndex: number | undefined;
	invalidActions: {
		node: ActionNode;
		index: number;
		reason: SkillReadyStatus;
	}[];
	skillUseTimes: number[];
};

class Controller {
	timeScale;
	shouldLoop: boolean;
	tickMode;
	timeline;
	#presetLinesManager;
	gameConfig;
	record;
	imageExportConfig: ImageExportConfig;
	timelineDrawOptions: TimelineDrawOptions = DEFAULT_TIMELINE_OPTIONS;
	queuedPastes: number;
	clipboardMode: ClipboardMode;
	game;
	#tinctureBuffPercentage = 0;
	#untargetableMask = true;
	#lastDamageApplicationTime;

	// todo: should probably move these items to somewhere else: in Record maybe?
	#damageLogCsv: PotencyLogCsv[] = [];
	#healingLogCsv: PotencyLogCsv[] = [];
	#actionsLogCsv: {
		time: number;
		action: string;
		isGCD: number;
		castTime: number;
		targetCount?: number;
		isDamaging: boolean; // used to track if the skill is damaging for combat sim export
	}[] = [];
	#dotTickTimes: Map<ResourceKey | string, number[]> = new Map();
	#hotTickTimes: Map<ResourceKey | string, number[]> = new Map();
	#dotCoverageTimes: Map<ResourceKey, Array<OvertimeEffectCoverage>> = new Map();
	#hotCoverageTimes: Map<ResourceKey, Array<OvertimeEffectCoverage>> = new Map();

	savedHistoricalGame: GameState;
	savedHistoricalRecord: Record;

	#bInterrupted: boolean = false;
	// TODO: use an enum for state and model timeline editor state here instead of using a bunch of booleans
	#bInSandbox: boolean = false;
	#bTakingUserInput: boolean = false;

	#skipViewUpdates: boolean = false;
	// todo: can probably somehow get rid of this because it should largely overlaps with #bInSandbox
	displayingUpToDateGameState = true;
	#lastTickDuration: number = 0; // used during record loads to resolve legacy wait durations
	lastSkillTime: number = 0; // used for WaitSince.LastSkill; updated in #useSkill

	undoStack: UndoStack;

	constructor() {
		this.timeScale = 1;
		this.shouldLoop = false;
		this.queuedPastes = 0;
		this.tickMode = TickMode.RealTimeAutoPause;

		this.timeline = new Timeline();
		this.timeline.reset();

		this.#presetLinesManager = new PresetLinesManager();

		this.gameConfig = new GameConfig(DEFAULT_CONFIG);
		this.game = getGameState(this.gameConfig);

		this.record = new Record();
		this.record.config = this.gameConfig;
		this.imageExportConfig = {
			wrapThresholdSeconds: JSON.parse(getCachedValue("img: wrapThresholdSeconds") ?? "0"),
			includeTime: JSON.parse(getCachedValue("img: includeTime") ?? "true"),
		};
		this.clipboardMode = (getCachedValue("radio: clipboardMode") ?? "plain") as ClipboardMode;

		this.#lastDamageApplicationTime = -this.gameConfig.countdown; // left of timeline origin

		// meaningless at the beginning
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.undoStack = new UndoStack();

		this.#requestRestart();
	}

	get inputLocked() {
		return this.shouldLoop || this.queuedPastes > 0;
	}

	updateStats() {
		this.#updateTotalDamageStats();
		this.#updateSelectedDamageStats();
	}

	updateAllDisplay(game: GameState = this.game) {
		updateConfigDisplay(game.config.serialized());
		this.updateStatusDisplay(game);
		this.updateSkillButtons(game);
		this.updateTimelineDisplay();
		this.updateStats();
		setJob(this.getActiveJob()); // as a side effect also refreshes Main..
	}

	#applyResourceOverrides(gameConfig: GameConfig) {
		const overrides = gameConfig.initialResourceOverrides;
		for (let i = 0; i < overrides.length; i++) {
			overrides[i].applyTo(this.game);
		}
	}

	#sandboxEnvironment(fn: () => void) {
		const oldSandbox = this.#bInSandbox;
		this.displayingUpToDateGameState = false;
		this.#bInSandbox = true;
		const tmpGame = this.game;
		const tmpRecord = this.record;
		const tmpLastDamageApplicationTime = this.#lastDamageApplicationTime;
		//============^ stashed states ^============

		fn();

		//============v pop stashed states v============
		this.#bInSandbox = oldSandbox;
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.game = tmpGame;
		this.record = tmpRecord;
		this.#lastDamageApplicationTime = tmpLastDamageApplicationTime;
	}

	checkRecordValidity(
		inRecord: Record,
		firstEditedNodeIndex?: number,
		endsUpToDate: boolean = false,
	): RecordValidStatus {
		console.assert(inRecord.config !== undefined);

		const result: RecordValidStatus = {
			isValid: true,
			invalidActions: [],
			skillUseTimes: [],
			straightenedIfValid: undefined,
		};

		// no edit happened
		if (firstEditedNodeIndex === undefined) {
			console.log("no edit happened");
			return result;
		}

		// do NOT wrap this in #useSandbox, since we want changes to reflect on the canvas
		this.#requestRestart(false);
		const cfg = inRecord.config ?? this.gameConfig;
		this.game = getGameState(cfg);
		this.record = new Record();
		this.record.config = cfg;
		this.#lastDamageApplicationTime = -cfg.countdown;

		// apply resource overrides
		this.#applyResourceOverrides(this.record.config);

		// replay skills sequence
		const status = this.#replay({
			line: inRecord,
			replayMode: ReplayMode.Edited,
			firstEditedNodeIndex,
			selectionStart: inRecord.getFirstSelection(),
			selectionEnd: inRecord.getLastSelection(),
		});
		this.record.selectionStartIndex = inRecord.selectionStartIndex;
		this.record.selectionStartIndex = inRecord.selectionStartIndex;

		result.isValid = status.invalidActions.length === 0;
		result.invalidActions = status.invalidActions;
		result.skillUseTimes = status.skillUseTimes;
		if (status.success) {
			result.straightenedIfValid = this.record;
		}
		this.displayingUpToDateGameState = endsUpToDate;

		return result;
	}

	// max replay time; cutoff action
	displayHistoricalState(displayTime: number, cutoffIndex: number | undefined) {
		const rawTime = displayTime + this.gameConfig.countdown;

		const hasSelected = this.record.getFirstSelection() !== undefined;
		this.#sandboxEnvironment(() => {
			const tmpRecord = this.record;
			this.game = getGameState(this.gameConfig);
			this.record = new Record();
			this.record.config = this.gameConfig;
			this.#lastDamageApplicationTime = -this.gameConfig.countdown;

			// apply resource overrides
			this.#applyResourceOverrides(this.record.config);

			// replay skills sequence
			this.#replay({
				line: tmpRecord,
				replayMode: ReplayMode.Exact,
				maxReplayTime: rawTime,
				cutoffIndex,
			});

			// view only cursor
			this.timeline.updateElem({
				type: ElemType.s_HistoricalCursor,
				time: this.game.time, // is actually historical state
				displayTime: this.game.getDisplayTime(),
				enabled: true,
			});

			// update display
			this.updateStatusDisplay(this.game);
			this.updateSkillButtons(this.game);
			updateSkillSequencePresetsView();
			this.#updateTotalDamageStats();

			// timeline
			this.timeline.drawElements();
		});

		setHistorical(true);

		if (hasSelected) {
			this.#updateTotalDamageStats(true);
		}
		this.#updateSelectedDamageStats();
	}

	displayCurrentState() {
		this.displayingUpToDateGameState = true;
		this.timeline.updateElem({
			type: ElemType.s_HistoricalCursor,
			enabled: false,
			time: 0,
			displayTime: 0,
		});
		setHistorical(false);
		this.updateAllDisplay(this.game);
	}

	restart() {
		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);
	}

	#requestRestart(clearSelection: boolean = true) {
		this.game = getGameState(this.gameConfig);
		this.#playPause({ shouldLoop: false });
		this.timeline.reset();
		if (clearSelection) {
			this.record.unselectAll();
		}
		this.#lastDamageApplicationTime = -this.gameConfig.countdown;
		this.#damageLogCsv = [];
		this.#actionsLogCsv = [];
		this.#dotTickTimes = new Map();
		this.#dotCoverageTimes = new Map();
		this.#hotTickTimes = new Map();
		this.#hotCoverageTimes = new Map();
		this.#bInterrupted = false;
		this.displayingUpToDateGameState = true;
	}

	getPresetLines() {
		return this.#presetLinesManager.getLinesForJob(this.getActiveJob());
	}

	serializedPresets() {
		return this.#presetLinesManager.serialized();
	}

	addSelectionToPreset(name = "(untitled)") {
		console.assert(this.record.getFirstSelection());
		const line = this.record.getSelected();
		line.name = name;
		this.#presetLinesManager.addLine(line, this.getActiveJob());
	}

	appendFilePresets(content: Fixme) {
		this.#presetLinesManager.deserializeAndAppend(content);
	}

	loadBattleRecordFromFile(content: Fixme) {
		if (content.config === undefined) {
			window.alert("Error loading record: saved record had no config object");
			console.error(content);
		}
		if (content.config.procMode === undefined) {
			// for backward compatibility
			if (content.config.rngProcs !== undefined) {
				content.config.procMode = content.config.rngProcs ? ProcMode.RNG : ProcMode.Never;
			} else {
				content.config.procMode = ProcMode.RNG;
			}
		}
		if (content.config.fps === undefined) {
			content.config.fps = DEFAULT_CONFIG.fps;
		}
		if (content.config.gcdSkillCorrection === undefined) {
			content.config.gcdSkillCorrection = DEFAULT_CONFIG.gcdSkillCorrection;
		}
		if (content.config.level) {
			content.config.level = parseInt(content.config.level);
		}
		if (content.config.skillSpeed === undefined) {
			content.config.skillSpeed = XIVMath.getSubstatBase(content.config.level as LevelSync);
		}
		if (content.config.shellVersion === undefined) {
			content.config.shellVersion = ShellVersion.Initial;
		}
		if (content.config.job === undefined) {
			// infer the job based on actions present
			content.config.job = inferJobFromSkillNames(
				content.actions.flatMap((skill: any) =>
					(skill as any).skillName
						? [getNormalizedSkillName((skill as any).skillName)]
						: [],
				),
			);
		}
		// make sure in case anyone ever used these for non-melee jobs they are dropped here
		if (!MELEE_JOBS.includes(content.config.job)) {
			content.config.initialResourceOverrides =
				content.config.initialResourceOverrides.filter(
					(ov: any) =>
						![RESOURCES.FLANK_POSITIONAL.name, RESOURCES.REAR_POSITIONAL.name].includes(
							ov.type,
						),
				);
		}

		updateActiveTimelineEditor(() => {
			const gameConfig = new GameConfig(content.config);

			this.gameConfig = gameConfig;

			this.record = new Record();
			this.record.config = gameConfig;

			this.#requestRestart();

			// apply resource overrides
			this.#applyResourceOverrides(this.gameConfig);

			// now add the actions
			const line = Line.deserialize(content.actions);
			const replayResult = this.#replay({ line: line, replayMode: ReplayMode.Exact });
			if (!replayResult.success) {
				let msg = "Error loading record- \n";
				if (replayResult.invalidActions.length > 0) {
					const node = replayResult.invalidActions[0].node;
					if (node.info.type === ActionType.Skill) {
						const actionName = node.info.skillName
							? localizeSkillName(node.info.skillName)
							: "(unknown)";
						// TODO update these, since the replay doesn't stop anymore
						msg += `Stopped here because the next action ${actionName} can't be added: `;
					} else {
						msg += `Stopped here because the next action ${node.info.type} can't be added: `;
					}
				}
				msg += replayResult.invalidActions[0].reason;
				window.alert(msg);
			}
		});
	}

	// assumes newRecord can be replayed exactly
	applyEditedRecord() {
		// HACK: this used to take a `newRecord` argument, but now that we always manipulate
		// the global record object, we need to stash the old record to force #replay to always
		// rerun in full.
		const tmp = this.record;
		this.record = new Record();
		this.record.config = tmp.config;
		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);
		// replay actions
		const replayResult = this.#replay({
			line: tmp,
			replayMode: ReplayMode.Exact,
			removeTrailingIdleTime: true,
		});
		console.assert(replayResult.success);

		// TODO figure out if there's any edge cases where this is invalid
		// maybe deletions?
		if (tmp.selectionStartIndex !== undefined) {
			this.record.selectSingle(tmp.selectionStartIndex);
			this.record.selectUntil(tmp.selectionEndIndex!);
		}
		this.autoSave();
	}

	deleteSelectedSkills() {
		const originalStart = this.record.selectionStartIndex;
		if (originalStart !== undefined) {
			this.record.deleteSelected();
			const status = updateInvalidStatus();
			if (originalStart < this.record.length) {
				this.record.selectSingle(originalStart);
				this.displayHistoricalState(status.skillUseTimes[originalStart], originalStart);
			} else {
				this.displayCurrentState();
			}
			// TODO: push editor dirty state up to the controller and don't autosave if
			// we're mid-edit
			this.autoSave();
		}
	}

	#updateTotalDamageStats(tablesOnly: boolean = false) {
		if (!this.#skipViewUpdates) {
			let damageStats: Partial<DamageStatisticsData> = calculateDamageStats({
				tinctureBuffPercentage: this.#tinctureBuffPercentage,
				lastDamageApplicationTime: this.#lastDamageApplicationTime,
			});
			if (tablesOnly) {
				damageStats = {
					mainTable: damageStats.mainTable,
					mainTableSummary: damageStats.mainTableSummary,
					dotTables: damageStats.dotTables,
					mode: damageStats.mode,
				};
			}
			// display
			updateDamageStats(damageStats);
		}
	}

	#updateSelectedDamageStats() {
		if (!this.#skipViewUpdates) {
			const stats = calculateSelectedStats({
				tinctureBuffPercentage: this.#tinctureBuffPercentage,
				lastDamageApplicationTime: this.#lastDamageApplicationTime,
			});
			// display
			updateSelectedStats(stats);
		}
	}

	getTincturePotencyMultiplier() {
		return 1 + this.#tinctureBuffPercentage * 0.01;
	}
	setTinctureBuffPercentage(percentage: number) {
		// updates cumulative sum
		this.#tinctureBuffPercentage = percentage;
		// refresh stats
		this.displayCurrentState();
		updateTimelineView();
	}
	setUntargetableMask(useMask: boolean) {
		this.#untargetableMask = useMask;
		this.displayCurrentState();
		updateTimelineView();
	}
	getUntargetableMask() {
		return this.#untargetableMask;
	}

	/**
	 * Gets the maximum number of DoT ticks for the given DoT. DoT ticks may be one of:
	 * - The standard tick most DoTs tick on
	 * - The dot-specific initial tick for ground-targeted DoTs like Salted Earth and Doton
	 * - Flamethrower's weird faster ticks
	 * @param untilRawTime The end of the time range to look for ticks within
	 * @param dotName The name of the dot to get ticks for
	 * @param excludeStandardTicks Boolean flag to exclude the standard tick from the results, mainly for Flamethrower
	 * @returns The number of applicable dot ticks within the time range, excluding any that hit during an untargetable time
	 */
	getMaxTicks(untilRawTime: number, dotName: ResourceKey, excludeStandardTicks: boolean) {
		let cnt = 0;
		const dotKeys: Array<ResourceKey | string> = [dotName];
		if (!excludeStandardTicks) dotKeys.push(STANDARD_TICK_KEY);
		dotKeys.forEach((key) => {
			this.#dotTickTimes.get(key)?.forEach((rt) => {
				if (!bossIsUntargetable(rt - this.gameConfig.countdown) && rt <= untilRawTime) {
					cnt++;
				}
			});
		});
		return cnt;
	}

	getDotCoverageTimeFraction(untilDisplayTime: number, dot: ResourceKey): number {
		return this.getOverTimeCoverageTimeFraction(untilDisplayTime, dot, this.#dotCoverageTimes);
	}
	getHotCoverageTimeFraction(untilDisplayTime: number, dot: ResourceKey): number {
		return this.getOverTimeCoverageTimeFraction(untilDisplayTime, dot, this.#hotCoverageTimes);
	}
	private getOverTimeCoverageTimeFraction(
		untilDisplayTime: number,
		effect: ResourceKey,
		coverageTimes: Map<ResourceKey, Array<OvertimeEffectCoverage>>,
	): number {
		if (untilDisplayTime <= Debug.epsilon) return 0;
		const effectCoverages = coverageTimes.get(effect);
		if (!effectCoverages) {
			return 0;
		}

		let coveredTime = 0;
		effectCoverages.forEach((section) => {
			if (section.tStartDisplay <= untilDisplayTime) {
				const startTime = Math.max(0, section.tStartDisplay);
				let endTime =
					section.tEndDisplay !== undefined && section.tEndDisplay <= untilDisplayTime
						? section.tEndDisplay
						: untilDisplayTime;
				endTime = Math.max(0, endTime);
				coveredTime += getTargetableDurationBetween(startTime, endTime);
			}
		});
		const totalTime = getTargetableDurationBetween(0, untilDisplayTime);
		return coveredTime / totalTime;
	}

	setTimelineOptions(options: Partial<TimelineDrawOptions>) {
		this.timelineDrawOptions = { ...this.timelineDrawOptions, ...options };
		this.updateTimelineDisplay();
	}

	getTimelineRenderingProps(): TimelineRenderingProps {
		const showSelection: boolean =
			this.record.getFirstSelection() != null && this.record.getLastSelection() != null;
		let countdown = this.gameConfig.countdown;
		// and other slots
		const allSlotsTimeInfo = this.timeline.getAllSlotsTimeInfo();
		if (allSlotsTimeInfo !== null) {
			countdown = Math.max(countdown, allSlotsTimeInfo.countdown);
		}
		return {
			timelineWidth: this.timeline.getCanvasWidth(),
			timelineHeight: this.timeline.getCanvasHeight(),
			scale: this.timeline.scale,
			countdown: countdown,
			tincturePotencyMultiplier: this.getTincturePotencyMultiplier(),
			untargetableMask: this.#untargetableMask,
			sharedElements: this.timeline.sharedElements,
			slots: this.timeline.slots,
			activeSlotIndex: this.timeline.activeSlotIndex,
			allMarkers: this.timeline.getAllMarkers(),
			untargetableMarkers: this.timeline.getUntargetableMarkers(),
			buffMarkers: this.timeline.getBuffMarkers(),
			showSelection: showSelection,
			selectionStartDisplayTime:
				(this.record.getFirstSelection()?.tmp_startLockTime ?? 0) -
				this.gameConfig.countdown,
			selectionEndDisplayTime:
				(this.record.getLastSelection()?.tmp_endLockTime ?? 0) - this.gameConfig.countdown,
			drawOptions: this.timelineDrawOptions,
		};
	}

	reportWarning(type: Warning) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.WarningMark,
				warningType: type,
				time: this.game.time,
				displayTime: this.game.getDisplayTime(),
			});
		}
	}

	reportComboBreak() {
		this.reportWarning({ kind: "combobreak" });
	}

	resolvePotency(p: Potency) {
		this.resolveAnyPotency(p, ElemType.DamageMark, this.#damageLogCsv);

		this.#updateTotalDamageStats();
	}

	resolveHealingPotency(p: Potency) {
		this.resolveAnyPotency(p, ElemType.HealingMark, this.#healingLogCsv);
	}
	resolveOverTimePotency(p: Potency, kind: PotencyKind) {
		if (kind === "damage") {
			this.resolveAnyPotency(p, ElemType.DamageMark, this.#damageLogCsv);
		} else {
			this.resolveAnyPotency(p, ElemType.HealingMark, this.#healingLogCsv);
		}
	}

	private resolveAnyPotency(
		p: Potency,
		elemType: ElemType.DamageMark | ElemType.HealingMark | ElemType.AggroMark,
		csvLog: PotencyLogCsv[],
	) {
		p.resolve(this.game.getDisplayTime());
		this.#lastDamageApplicationTime = this.game.time;

		// If the potency didn't actually do anything, assume it's an aggro-only action like Provoke
		if (p.base === 0) {
			elemType = ElemType.AggroMark;
		}

		let pot = false;
		p.modifiers.forEach((m) => {
			if (m.source === PotencyModifierType.POT) pot = true;
		});

		if (!this.#bInSandbox) {
			let sourceDesc = "{skill}@" + p.sourceTime.toFixed(3);
			if (p.description.length > 0) sourceDesc += " " + p.description;
			const potencyInfo: PotencyMarkInfo = {
				potency: p,
				sourceDesc,
				sourceSkill: p.sourceSkill,
			};
			const existingElement = this.timeline.tryGetElement(
				this.game.time,
				elemType,
			) as PotencyMarkElem;
			if (existingElement) {
				existingElement.potencyInfos.push(potencyInfo);
				if (pot && !existingElement.buffs.includes("TINCTURE")) {
					existingElement.buffs.push("TINCTURE");
				}
			} else {
				this.timeline.addElement({
					type: elemType,
					potencyInfos: [potencyInfo],
					buffs: pot ? ["TINCTURE"] : [],
					time: this.game.time,
					displayTime: this.game.getDisplayTime(),
				});
			}

			// time, damageSource, potency, cumulativePotency
			csvLog.push({
				time: this.game.getDisplayTime(),
				source: p.sourceSkill + "@" + p.sourceTime,
				// tincture is applied when actually exporting for download.
				potency: p.getAmount({
					tincturePotencyMultiplier: 1,
					includePartyBuffs: true,
					includeSplash: true,
				}),
				buffs: pot ? ["TINCTURE"] : [],
			});
		}
	}

	reportLucidTick(time: number, sourceDesc: string) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.LucidMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	reportManaTick(time: number, sourceDesc: string) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.MPTickMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	reportMeditateTick(time: number, sourceDesc: string) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.MeditateTickMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	reportAutoTick(time: number, sourceDesc: string) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.AutoTickMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	/**
	 * Records the raw time at which a dot tick event took place
	 * @param rawTime The time of the DoT
	 * @param dotName The name of the DoT that ticked. If not provided, assumes the standard DoT tick
	 */
	reportDotTick(rawTime: number, dotName?: ResourceKey) {
		this.reportOverTimeTick(rawTime, this.#dotTickTimes, dotName);
	}
	reportHotTick(rawTime: number, hotName?: ResourceKey) {
		this.reportOverTimeTick(rawTime, this.#hotTickTimes, hotName);
	}
	private reportOverTimeTick(
		rawTime: number,
		tickTimes: Map<ResourceKey | string, number[]>,
		effectName?: ResourceKey,
	) {
		if (!this.#bInSandbox) {
			const tickGroupKey = effectName ?? STANDARD_TICK_KEY;
			let tickGroup = tickTimes.get(tickGroupKey);
			if (!tickGroup) {
				tickGroup = [];
				tickTimes.set(tickGroupKey, tickGroup);
			}
			tickGroup.push(rawTime);
			this.updateStats();
		}
	}

	reportDotStart(displayTime: number, dot: ResourceKey) {
		this.reportOverTimeStart(displayTime, dot, "damage");
	}
	reportHotStart(displayTime: number, hot: ResourceKey) {
		this.reportOverTimeStart(displayTime, hot, "healing");
	}
	reportOverTimeStart(displayTime: number, effect: ResourceKey, kind: PotencyKind) {
		if (!this.#bInSandbox) {
			const coverageTimes =
				kind === "damage" ? this.#dotCoverageTimes : this.#hotCoverageTimes;
			let effectCoverages = coverageTimes.get(effect);
			if (!effectCoverages) {
				effectCoverages = [];
				coverageTimes.set(effect, effectCoverages);
			}
			const len = effectCoverages.length;
			console.assert(len === 0 || effectCoverages[len - 1].tEndDisplay !== undefined);
			effectCoverages.push({
				tStartDisplay: displayTime,
				tEndDisplay: undefined,
			});
		}
	}

	reportDotDrop(displayTime: number, dot: ResourceKey) {
		this.reportOverTimeDrop(displayTime, dot, "damage");
	}
	reportHotDrop(displayTime: number, hot: ResourceKey) {
		this.reportOverTimeDrop(displayTime, hot, "healing");
	}
	reportOverTimeDrop(displayTime: number, effect: ResourceKey, kind: PotencyKind) {
		if (!this.#bInSandbox) {
			const coverageTimes =
				kind === "damage" ? this.#dotCoverageTimes : this.#hotCoverageTimes;
			const effectCoverages = coverageTimes.get(effect);
			console.assert(
				effectCoverages,
				`Reported dropping ${effect} when no coverage was detected`,
			);
			if (!effectCoverages) {
				return;
			}
			const len = effectCoverages.length;
			console.assert(len > 0 && effectCoverages[len - 1].tEndDisplay === undefined);
			effectCoverages[len - 1].tEndDisplay = displayTime;
		}
	}

	updateStatusDisplay(game: GameState) {
		// locks
		const cast = game.resources.get("NOT_CASTER_TAXED");
		const anim = game.resources.get("NOT_ANIMATION_LOCKED");
		const gcd = game.cooldowns.get("cd_GCD");
		const resourceLocksData = {
			gcdReady: gcd.stacksAvailable() > 0,
			gcd: gcd.currentStackCd(),
			timeTillGCDReady: game.cooldowns.timeTillAnyStackAvailable("cd_GCD"),
			castLocked: game.resources.timeTillReady("NOT_CASTER_TAXED") > 0,
			castLockTotalDuration: cast.pendingChange ? cast.pendingChange.delay : 0,
			castLockCountdown: game.resources.timeTillReady("NOT_CASTER_TAXED"),
			animLocked: game.resources.timeTillReady("NOT_ANIMATION_LOCKED") > 0,
			animLockTotalDuration: anim.pendingChange ? anim.pendingChange.delay : 0,
			animLockCountdown: game.resources.timeTillReady("NOT_ANIMATION_LOCKED"),
			canMove: game.resources.get("MOVEMENT").available(1),
		};
		const propsGenerator = game.statusPropsGenerator;
		updateStatusDisplay((theme: ThemeColors) => {
			return {
				time: game.getDisplayTime(),
				resources: propsGenerator.getAllResourceViewProps(theme),
				resourceLocks: resourceLocksData,
				enemyBuffs: propsGenerator.getAllOtherTargetedBuffViewProps(),
				selfBuffs: propsGenerator.getAllSelfTargetedBuffViewProps(),
				level: game.config.level,
			};
		}, propsGenerator.statusLayoutFn);
	}

	updateTimelineDisplay() {
		this.timeline.setTimeSegment(0, this.game.time);

		updateSkillSequencePresetsView();
		refreshTimelineEditor();

		if (!this.#bInSandbox) {
			this.timeline.updateElem({
				type: ElemType.s_Cursor,
				time: this.game.time,
				displayTime: this.game.getDisplayTime(),
			});
		}
		this.timeline.drawElements();
	}

	updateSkillButtons(game: GameState) {
		updateSkillButtons(
			this.game.displayedSkills
				.getCurrentSkillNames(this.game)
				.map((skillName: ActionKey) => game.getSkillAvailabilityStatus(skillName)),
		);
	}

	#requestTick(props: {
		deltaTime: number;
		waitKind?: WaitKind;
		prematureStopCondition?: () => boolean;
	}): ActionNode | undefined {
		const now = this.game.time;
		const fixedTargetTimestamp = props.deltaTime + this.game.getDisplayTime();
		if (props.deltaTime > 0) {
			this.#lastTickDuration = props.deltaTime;
			const timeTicked = this.game.tick(
				props.deltaTime,
				props.prematureStopCondition
					? props.prematureStopCondition
					: () => {
							return false;
						},
			);

			// If `waitKind` is defined, then create a new explicit wait node.
			let newNode: ActionNode | undefined = undefined;
			if (props.waitKind === "duration") {
				newNode = durationWaitNode(timeTicked);
			} else if (props.waitKind === "target") {
				newNode = jumpToTimestampNode(fixedTargetTimestamp);
			} else if (props.waitKind === "mp") {
				newNode = waitForMPNode();
			}
			if (newNode !== undefined) {
				newNode.tmp_startLockTime = now;
				newNode.tmp_endLockTime = props.deltaTime + now;
				this.record.addActionNode(newNode);
			}
			return newNode;
		}
		return undefined;
	}

	setTimeControlSettings(props: { timeScale: number; tickMode: TickMode }) {
		this.timeScale = props.timeScale;
		this.tickMode = props.tickMode;
		this.shouldLoop = false;
	}

	setConfigAndRestart(
		props: {
			job: ShellJob;
			level: LevelSync;
			main: number;
			wd: number;
			spellSpeed: number;
			skillSpeed: number;
			criticalHit: number;
			directHit: number;
			determination: number;
			piety: number;
			tenacity: number;
			animationLock: number;
			fps: number;
			gcdSkillCorrection: number;
			timeTillFirstManaTick: number;
			countdown: number;
			randomSeed: string;
			procMode: ProcMode;
			initialResourceOverrides: any[];
		},
		resetRecord: boolean = true,
	) {
		const jobChanged = this.gameConfig.job !== props.job;
		const oldCountdown = this.gameConfig.countdown;
		const countdownIncreased = oldCountdown < props.countdown;
		if (jobChanged && !resetRecord) {
			console.error(
				"attempted to apply config without reset even though job changed; forcing reset",
			);
			resetRecord = true;
		}
		updateActiveTimelineEditor(() => {
			this.gameConfig = new GameConfig({
				...props,
				shellVersion: ShellInfo.version,
			});

			if (resetRecord) {
				this.record = new Record();
			} else if (countdownIncreased) {
				// If the countdown increased and we're modifying the record in-place, prepend an
				// implicit "jump to timestamp" event so the first action's timing remains unchanged.
				// If the countdown decreased, we don't care.
				this.record.prependActionNode(jumpToTimestampNode(-oldCountdown));
			}
			this.record.config = this.gameConfig;

			this.#requestRestart();
			this.#applyResourceOverrides(this.gameConfig);
			// Propagate changes to the intro section (definitely not idiomatic react... maybe we
			// should just make the text static for all jobs)
			if (jobChanged) {
				setJob(props.job);
			}
		});

		this.autoSave();
	}

	getDisplayedGame(): GameState {
		return this.displayingUpToDateGameState ? this.game : this.savedHistoricalGame;
	}

	getActiveJob(): ShellJob {
		return this.game.job;
	}

	getSkillInfo(props: { game: GameState; skillName: ActionKey }) {
		return props.game.getSkillAvailabilityStatus(props.skillName);
	}

	#playPause(props: { shouldLoop: boolean }) {
		const newShouldLoop = props.shouldLoop;
		if (this.shouldLoop === newShouldLoop) return;

		this.shouldLoop = newShouldLoop;

		if (this.shouldLoop) {
			this.#runLoop(() => {
				return this.shouldLoop;
			});
		}
	}

	#fastForward(maxReplayTime: number) {
		let deltaTime: number = this.game.timeTillAnySkillAvailable();
		if (maxReplayTime >= 0) {
			deltaTime = Math.min(maxReplayTime - this.game.time, deltaTime);
		}
		this.#requestTick({ deltaTime });
	}

	#useSkill(
		skillName: ActionKey,
		targetCount: number,
		overrideTickMode: TickMode = this.tickMode,
		maxReplayTime: number = -1,
		addInvalidNodes: boolean = true,
		canUndo: boolean = false,
	): SkillButtonViewInfo {
		let status = this.game.getSkillAvailabilityStatus(skillName);
		const preStartLockTime = this.game.time;

		const beforeWaitTime = status.timeTillAvailable;

		// Wait out the current animation lock or remaining cooldown on the skill,
		// then attempt to use it ASAP
		const waitNode = this.#requestTick({ deltaTime: beforeWaitTime });
		if (canUndo && waitNode) {
			this.undoStack.push(new AddNode(waitNode, this.record.tailIndex));
		}
		skillName = getConditionalReplacement(skillName, this.game);
		status = this.game.getSkillAvailabilityStatus(skillName);

		const node = skillNode(skillName, targetCount);
		let actionIndex: number;

		if (status.status.ready()) {
			// Set the lock time now so its timestamp appears in the timeline editor correctly.
			node.tmp_startLockTime = this.game.time;
			this.record.addActionNode(node);
			actionIndex = this.record.tailIndex;
			if (canUndo && node) {
				this.undoStack.push(new AddNode(node, this.record.tailIndex));
			}
			// If the skill can be used, do so.
			this.game.useSkill(skillName, node, actionIndex);
			node.tmp_invalid_reasons = [];
			if (overrideTickMode === TickMode.RealTimeAutoPause) {
				this.shouldLoop = true;
				this.#runLoop(() => this.game.timeTillAnySkillAvailable() > 0, true);
			}
		} else {
			if (!addInvalidNodes) {
				// Do not add the skill node if receiving user input for an invalid skill.
				if (beforeWaitTime > 0) {
					// After waiting for animation lock and cooldowns, the skill may not be usable
					// (e.g. if Amplifier is pressed, then the 120s cd will move the timeline to a point where
					// enochian was dropped and the button can no longer be used).
					// Insert an artificial wait event to indicate this.
					const artificialWaitNode = durationWaitNode(beforeWaitTime);
					artificialWaitNode.tmp_startLockTime = preStartLockTime;
					artificialWaitNode.tmp_endLockTime = this.game.time;
					this.record.addActionNode(artificialWaitNode);
				}
				return status;
			}
			this.record.addActionNode(node);
			actionIndex = this.record.tailIndex;
			// If the skill is invalid and we are NOT accepting user input, roll its animation
			// locks and cast bars, and mark it as invalid.
			this.game.useInvalidSkill(skillName, node);
			node.tmp_invalid_reasons = status.status.unavailableReasons;
		}
		const lockDuration = this.game.timeTillAnySkillAvailable();

		node.tmp_startLockTime = this.game.time;
		node.tmp_endLockTime = this.game.time + lockDuration;

		if (!this.#bInSandbox) {
			// this block is run when NOT viewing historical state (aka run when receiving input)
			this.lastSkillTime = this.game.time;
			const newStatus = this.game.getSkillAvailabilityStatus(skillName, true); // refresh to get re-captured recast time
			const skill = this.game.skillsList.get(skillName);
			let isGCD = skill.cdName === "cd_GCD";
			const isSpellCast = status.castTime > 0 && !status.instantCast;
			const snapshotTime = isSpellCast
				? status.castTime - GameConfig.getSlidecastWindow(status.castTime)
				: 0;
			let recastDuration = newStatus.cdRecastTime;
			// special case for meditate, which is an ability that roles the GCD
			if (skillName === "MEDITATE") {
				isGCD = true;
				// get the recast duration of a random GCD
				recastDuration = this.game.getSkillAvailabilityStatus("YUKIKAZE").cdRecastTime;
			}
			this.timeline.addElement({
				type: ElemType.Skill,
				displayTime: this.game.getDisplayTime(),
				skillName: skillName,
				isGCD: isGCD,
				isSpellCast: isSpellCast,
				time: this.game.time,
				relativeSnapshotTime: snapshotTime,
				lockDuration: lockDuration,
				recastDuration: recastDuration,
				node,
				actionIndex,
			});
			this.#actionsLogCsv.push({
				time: this.game.getDisplayTime(),
				action: ACTIONS[skillName].name,
				isGCD: isGCD ? 1 : 0,
				castTime: status.instantCast ? 0 : status.castTime,
				targetCount: node.targetCount,
				isDamaging: node.anyPotencies(),
			});
		}

		if (overrideTickMode !== TickMode.RealTimeAutoPause) {
			// In manual mode, directly fast-forward to the end of animation lock instead of animating.
			// If we're in a historical replay, the end may be in the middle of the animation lock.
			this.#fastForward(maxReplayTime);
		}

		// If this was called within a line load, do not refresh the timeline view
		if (!this.#skipViewUpdates) {
			refreshTimelineEditor();
		}
		return status;
	}

	// returns true on success
	// may modify Line in-place to adjust wait durations, or insert/remove wait nodes
	#replay(props: {
		line: Line;
		replayMode: ReplayMode;
		removeTrailingIdleTime?: boolean;
		maxReplayTime?: number;
		cutoffIndex?: number;
		firstEditedNodeIndex?: number; // for ReplayMode.Edited: everything before this should instead use ReplayMode.Exact
		selectionStart?: ActionNode;
		selectionEnd?: ActionNode;
	}): ReplayResult {
		// Prevent UI updates from occuring until the final action
		const oldSkipViewUpdates = this.#skipViewUpdates;
		this.#skipViewUpdates = true;
		// default input, if not provided
		if (props.removeTrailingIdleTime === undefined) props.removeTrailingIdleTime = false;
		const maxReplayTime = props.maxReplayTime ?? -1;

		// when checking record validity as well as final application (ReplayMode.Edited), replay exactly until the first edited node
		// and also copy over selection status
		//let firstSelected: ActionNode | undefined = undefined;
		let currentReplayMode = props.replayMode;
		if (props.replayMode === ReplayMode.Edited) {
			currentReplayMode = ReplayMode.Exact;
		}

		const line = props.line;
		const invalidActions: { node: ActionNode; index: number; reason: SkillReadyStatus }[] = [];
		const skillUseTimes: number[] = [];

		if (line.length === 0) {
			// Empty line, no need to call re-render here
			this.#skipViewUpdates = oldSkipViewUpdates;
			return {
				success: true,
				firstAddedIndex: undefined,
				invalidActions,
				skillUseTimes,
			};
		}

		let oldLength = this.record.length;
		let firstAddedIndex: number | undefined = undefined;
		// assume cutoffIndex < actions.length
		const cutoff = props.cutoffIndex ?? line.actions.length;
		const originalActions = line.actions.slice();
		for (let i = 0; i < cutoff; i++) {
			const itr = originalActions[i];
			// switch to edited replay past the first edited node
			if (
				props.replayMode === ReplayMode.Edited &&
				currentReplayMode === ReplayMode.Exact &&
				i === props.firstEditedNodeIndex
			) {
				currentReplayMode = ReplayMode.Edited;
			}

			let waitDuration = 0;
			if (itr.info.type === ActionType.Wait) {
				waitDuration = itr.info.waitDuration;
			} else if (itr.info.type === ActionType.JumpToTimestamp) {
				// negative waitDuration is invalid, and handled further down in code
				waitDuration = itr.info.targetTime - this.game.getDisplayTime();
			} else if (itr.info.type === ActionType.WaitForMP) {
				waitDuration = this.game.timeTillNextMpGainEvent();
			} else if (itr.info.type === ActionType.Skill) {
				waitDuration = this.game.getSkillAvailabilityStatus(
					itr.info.skillName,
				).timeTillAvailable;
			}
			// Account for older versions of xivintheshell, which saved waitDuration fields on
			// non-wait actions.
			// If the previous action had a legacyWaitDuration field that did not match the elapsed tick time,
			// then we need to insert or adjust wait events.
			// When legacyWaitDuration == lastTickDuration, we don't need to do any adjustments.
			// Otherwise, we need to create a new waitDuration node or modify the duration of the current one.
			//
			// Example 1 (legacyWaitDuration < lastTickDuration)
			// =================================================
			// - The last action node is Swiftcast added in manual mode at t=0, and legacyWaitDuration is 0.
			// - lastTickDuration is 0.7 because current sim behavior automatically advances animation lock.
			// If the current node is not a duration wait node, then it does not matter, since old
			// behavior would error out trying to use another action during animation lock.
			// Suppose the current node is a duration wait of 1.0s. In older versions, this would
			// be counted from the execution of the Swiftcast at t=0 since it had a waitDuration of 0;
			// the next action would happen at t=1.
			// Therefore, we need to adjust the wait node's duration to be 1-0.7=0.3; in general this is
			//     itr.info.waitDuration = itr.info.waitDuration + (legacyWaitDuration - lastTickDuration)
			//
			// Example 2 (legacyWaitDuration > lastTickDuration)
			// =================================================
			// - The last action node is F3 at t=0 with a cast time of 3.4s, and legacyWaitDuration is 3.5.
			// - lastTickDuration is 3.4 because that's the length of the computed animation lock.
			// Something like this can occur as a result of an internal cast time formula change
			// or job mechanic change. For example, Despair becoming instant in 7.1 caused this to occur
			// for many existing BLM timelines.
			// If the current node is not a duration wait node, then a new wait node with duration
			//     newWaitDuration = legacyWaitDuration - lastWaitDuration
			// must be added to compensate.
			// If the current node is a duration wait node, then this difference is added:
			//     itr.info.waitDuration = itr.info.waitDuration + (legacyWaitDuration - lastTickDuration)
			// Note that this is the same formula as in example 1.
			if (i > 0) {
				const lastAction = originalActions[i - 1];
				const lastLegacyWaitDuration = lastAction.legacyWaitDuration;
				// This block assumes that legacyWaitDuration is only set on skill/setresource nodes
				if (
					lastLegacyWaitDuration !== undefined &&
					Math.abs(lastLegacyWaitDuration - this.#lastTickDuration) > Debug.epsilon
				) {
					const delta = lastLegacyWaitDuration - this.#lastTickDuration;
					if (delta > 0 && itr.info.type !== ActionType.Wait) {
						// If the current action is a skill, we do a quick look-ahead to see if the delta
						// matches the amount of time that would tick naturally before its usage, and
						// determine whether to create a new node based on this information.
						let waitKind: WaitKind | undefined = undefined;
						if (itr.info.type === ActionType.Skill) {
							const preWaitTime = this.game.getSkillAvailabilityStatus(
								itr.info.skillName,
							).timeTillAvailable;
							if (Math.abs(preWaitTime - delta) > Debug.epsilon) {
								waitKind = "duration";
							}
						}
						if (waitKind) {
							this.#requestTick({ deltaTime: delta, waitKind });
							// Don't count this node for the purposes of firstAddedNode
							oldLength++;
						}
					} else if (itr.info.type === ActionType.Wait) {
						// Piggyback on the current wait node.
						// Note that delta may be negative in this case
						waitDuration += delta;
					}
				}
			}

			// maxReplayTime is used for replay for displaying historical game states (only replay some given duration)
			if (
				maxReplayTime >= 0 &&
				maxReplayTime - this.game.time < waitDuration &&
				currentReplayMode === ReplayMode.Exact
			) {
				// hit specified max replay time; everything's valid so far
				// Instead of performing the next action, wait until maxReplayTime and return early
				this.#requestTick({
					deltaTime: maxReplayTime - this.game.time,
					waitKind: "duration",
				});
				// Re-enable UI updates
				this.#skipViewUpdates = false;
				this.updateAllDisplay();
				return {
					success: true,
					firstAddedIndex,
					invalidActions,
					skillUseTimes,
				};
			}

			skillUseTimes.push(this.game.getDisplayTime());

			if (
				[ActionType.Wait, ActionType.JumpToTimestamp, ActionType.WaitForMP].includes(
					itr.info.type,
				)
			) {
				if (waitDuration >= 0) {
					this.#requestTick({
						deltaTime: waitDuration,
						waitKind:
							itr.info.type === ActionType.Wait
								? "duration"
								: itr.info.type === ActionType.JumpToTimestamp
									? "target"
									: "mp",
					});
				} else {
					const reason = makeSkillReadyStatus();
					// waitDuration < 0 is only possible for explicit "jump" nodes; make sure
					// the node is still added to the record (normally implicitly done by requestTick).
					if (itr.info.type === ActionType.JumpToTimestamp) {
						const jumpNode = jumpToTimestampNode(itr.info.targetTime);
						jumpNode.tmp_startLockTime = this.game.time;
						jumpNode.tmp_endLockTime = jumpNode.tmp_startLockTime;
						this.record.addActionNode(jumpNode);
					} else {
						console.error("non-jump wait somehow failed: " + itr.info.type);
					}
					reason.addUnavailableReason(SkillUnavailableReason.PastTargetTime);
					invalidActions.push({
						node: itr,
						index: i,
						reason,
					});
				}
			}

			// skill nodes
			else if (itr.info.type === ActionType.Skill) {
				let skillName = itr.info.skillName;
				if (props.replayMode === ReplayMode.SkillSequence) {
					// auto-replace as much as possible
					skillName = getAutoReplacedSkillName(
						this.game.job,
						skillName,
						this.gameConfig.level,
					);
				}
				const status = this.#useSkill(
					skillName,
					itr.info.targetCount,
					TickMode.Manual,
					maxReplayTime,
				);
				// #useSkill may advance time before use, so update the pushed time
				skillUseTimes[skillUseTimes.length - 1] = status.usedAt;

				if (!status.status.ready()) {
					invalidActions.push({
						node: itr,
						index: i,
						reason: status.status.clone(),
					});
				}

				if (this.#bInterrupted) {
					// likely because enochian dropped before a cast snapshots, or a prerequisite
					// buff fell off before the cast occurred
					this.#bInterrupted = false;
					// When accepting user input, the skill node gets replaced with a wait for the
					// duration of the ability's cast time, so we should not add it to the invalid
					// actions list.
					if (!this.shouldLoop) {
						status.status.addUnavailableReason(SkillUnavailableReason.CastCanceled);
						invalidActions.push({
							node: itr,
							index: i,
							reason: status.status,
						});
					}
				}
			}
			// buff enable/disable also only supported by exact / edited replay
			else if (
				itr.info.type === ActionType.SetResourceEnabled &&
				(currentReplayMode === ReplayMode.Exact || currentReplayMode === ReplayMode.Edited)
			) {
				const success = this.requestToggleBuff(itr.info.buffName as ResourceKey);
				const exact = currentReplayMode === ReplayMode.Exact;
				if (success) {
					this.#requestTick({
						// waitDuration gets auto filled when this node is moved around and causes unwanted gaps on the timeline..
						// current workaround: auto decide whether to respect this info in the record. Could be a bit too hacky..
						deltaTime: exact
							? waitDuration
							: Math.min(waitDuration, this.game.timeTillAnySkillAvailable()),
					});
				} else {
					const reason = makeSkillReadyStatus();
					reason.addUnavailableReason(SkillUnavailableReason.BuffNoLongerAvailable);
					invalidActions.push({
						node: itr,
						index: i,
						reason,
					});
				}
			} else if (itr.info.type === ActionType.Unknown) {
				const { skillName, targetCount } = itr.info;
				const node = unknownSkillNode(skillName, targetCount);
				this.record.addActionNode(node);
				const reason = makeSkillReadyStatus();
				reason.addUnavailableReason(SkillUnavailableReason.UnknownSkill);
				invalidActions.push({
					node: itr,
					index: i,
					reason,
				});
				node.tmp_invalid_reasons = reason.unavailableReasons;
				const animLock = this.gameConfig.animationLock;
				if (!this.#bInSandbox) {
					// this block is run when NOT viewing historical state (aka run when receiving input)
					this.lastSkillTime = this.game.time;
					this.timeline.addElement({
						type: ElemType.Skill,
						displayTime: this.game.getDisplayTime(),
						skillName: skillName as ActionKey,
						isGCD: false,
						isSpellCast: false,
						time: this.game.time,
						relativeSnapshotTime: this.game.time,
						lockDuration: animLock,
						recastDuration: 0,
						node,
						actionIndex: i,
					});
					this.#actionsLogCsv.push({
						time: this.game.getDisplayTime(),
						action: skillName,
						isGCD: 0,
						castTime: 0,
						targetCount: node.targetCount,
						isDamaging: false,
					});
				}
				this.#requestTick({ deltaTime: animLock });
			} else {
				console.error("did not process ActionNode " + JSON.stringify(itr.info));
			}

			// now added whatever node it needs to add.

			// for edited replay mode, copy selection:
			if (props.replayMode === ReplayMode.Edited) {
				const lastAdded = this.record.tailIndex;
				if (itr === props.selectionStart && lastAdded >= 0) {
					this.record.selectSingle(lastAdded);
				} else if (itr === props.selectionEnd && lastAdded >= 0) {
					this.record.selectUntil(lastAdded);
				}
			}

			// this iteration just added something, but firstAddedIndex is still unset:
			if (this.record.length !== oldLength && firstAddedIndex === undefined) {
				firstAddedIndex = this.record.tailIndex;
			}
		}

		// When performing a replay up to a cutoff, advance the game time to the start of the action
		// at props.cutoffIndex. This ensures the displayed cursor will be at the correct time.
		if (props.cutoffIndex !== undefined) {
			const info = originalActions[props.cutoffIndex].info;
			if (info.type === ActionType.Skill) {
				const status = this.game.getSkillAvailabilityStatus(info.skillName);
				this.#requestTick({ deltaTime: status.timeTillAvailable });
			}
		}

		// Perform legacy wait adjustment for the final action in the list if the last action was a skill/setresource.
		// Always generate a new node, since there will never be a following skill for which to skip
		// animation lock.
		const lastAction = originalActions[originalActions.length - 1];
		const lastLegacyWaitDuration = lastAction.legacyWaitDuration;
		if (
			lastLegacyWaitDuration !== undefined &&
			(lastAction.info.type === ActionType.Skill ||
				lastAction.info.type === ActionType.SetResourceEnabled) &&
			Math.abs(lastLegacyWaitDuration - this.#lastTickDuration) > Debug.epsilon
		) {
			const delta = lastLegacyWaitDuration - this.#lastTickDuration;
			this.#requestTick({ deltaTime: delta, waitKind: "duration" });
		}

		// Re-enable UI updates
		this.#skipViewUpdates = oldSkipViewUpdates;
		this.updateAllDisplay();
		return {
			success: true,
			firstAddedIndex,
			invalidActions,
			skillUseTimes,
		};
	}

	autoSave() {
		const serializedRecord = this.record.serialized();
		this.timeline.saveCurrentSlot(serializedRecord, this.gameConfig.countdown, this.game.time);
	}

	tryAutoLoad() {
		const str = getCachedValue("gameRecord");
		if (str !== null) {
			console.log("migrating existing record to slot 0");
			setCachedValue("gameRecord0", str);
			removeCachedValue("gameRecord");
		}
		for (let i = 0; i < MAX_TIMELINE_SLOTS; i++) {
			this.timeline.loadSlot(i);
		}

		const hasAtLeastOneSlot = this.timeline.slots.length > 0;
		if (!hasAtLeastOneSlot) {
			this.timeline.addSlot();
		}
		const initialActiveSlot = parseInt(getCachedValue("activeSlotIndex") ?? "0");
		this.setActiveSlot(initialActiveSlot >= MAX_TIMELINE_SLOTS ? 0 : initialActiveSlot);
		this.undoStack.clear();
	}

	setActiveSlot(slot: number) {
		// cancel real time
		this.#playPause({ shouldLoop: false });
		// Before loading the new timeline, restore the record that was saved by the timeline editor
		// so its edits aren't accidentally saved.
		updateActiveTimelineEditor(() => {
			this.autoSave();

			this.record.unselectAll();
			const loaded = this.timeline.loadSlot(slot);
			if (!loaded) {
				console.error(`failed to load timeline in cached active slot ${slot}`);
			}
		});
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.displayCurrentState();
		setCachedValue("activeSlotIndex", slot.toString());
	}

	cloneActiveSlot() {
		if (
			this.timeline.activeSlotIndex < 0 ||
			this.timeline.activeSlotIndex >= this.timeline.slots.length
		) {
			console.error(
				"tried to clone slot with invalid activeSlotIndex " + this.timeline.activeSlotIndex,
			);
			return;
		}
		this.#playPause({ shouldLoop: false });
		updateActiveTimelineEditor(() => {
			const recordToClone = this.record.serialized();
			this.timeline.addSlot();
			this.loadBattleRecordFromFile(recordToClone);
			this.autoSave();
			this.timeline.loadSlot(this.timeline.slots.length - 1);
		});
		this.displayCurrentState();
	}

	getDamageLogCsv(): any[][] {
		const csvRows = this.#damageLogCsv.map((row) => {
			let pot = false;
			row.buffs.forEach((b) => {
				if (b === "TINCTURE") pot = true;
			});
			let potency = row.potency;
			if (pot) potency *= this.getTincturePotencyMultiplier();
			return [row.time, row.source, potency];
		});
		return [["time", "damageSource", "potency"]].concat(csvRows as any[][]);
	}

	getActionsLogCsv(): any[][] {
		const csvRows = this.#actionsLogCsv.map((row) => {
			return [row.time, row.action, row.isGCD, row.castTime];
		});
		return [["time", "action", "isGCD", "castTime"]].concat(csvRows as any[][]);
	}

	// return rows of a CSV to feed to Amarantine's combat sim
	// https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim
	getAmaSimCsv(): CsvData {
		const normalizeName = (s: string) => {
			if (s === ACTIONS.TINCTURE.name) {
				return "Grade 3 Gemdraught";
			} else if (s.endsWith("(Ten)") || s.endsWith("(Chi)") || s.endsWith("(Jin)")) {
				// Strip parentheticals from TCJ actions
				return s.substring(0, s.length - 6);
			} else {
				return s.replace(" 2", " II").replace(" 3", " III").replace(" 4", " IV");
			}
		};
		const job = this.getActiveJob();
		const isMelee = TANK_JOBS.includes(job) || MELEE_JOBS.includes(job);
		const buffRows = this.timeline.getBuffMarkers().map((marker) => {
			const buff = new Buff(marker.description as BuffType);
			let buffName: string = buff.info.name as string;
			if (buff.info.name === BuffType.Card_TheSpear) {
				buffName = "The Spear";
			} else if (buff.info.name === BuffType.Card_TheBalance) {
				buffName = "The Balance";
			} else if (
				[
					BuffType.RadiantFinale1,
					BuffType.RadiantFinale2,
					BuffType.RadiantFinale3,
				].includes(buff.info.name)
			) {
				buffName = "Radiant Finale";
			}
			const isDebuff =
				buff.info.name === BuffType.Dokumori || buff.info.name === BuffType.ChainStratagem;
			const getBuffModifiers = () => {
				if (isDebuff) {
					return "Debuff Only";
				} else if (buff.info.name === BuffType.RadiantFinale1) {
					// need to put these in quotes so it stays as one column when parsed
					return '"1 Coda, Buff Only"';
				} else if (buff.info.name === BuffType.RadiantFinale2) {
					return '"2 Coda, Buff Only"';
				} else if (buff.info.name === BuffType.RadiantFinale3) {
					return '"3 Coda, Buff Only"';
				} else if (
					[
						BuffType.ArmysPaeon,
						BuffType.MagesBallad,
						BuffType.WanderersMinuet,
						BuffType.StandardFinish,
						BuffType.TechnicalFinish,
					].includes(buff.info.name)
				) {
					return "Buff Only";
				} else if (buff.info.name === BuffType.Card_TheSpear) {
					return !isMelee ? "Big" : "Small";
				} else if (buff.info.name === BuffType.Card_TheBalance) {
					return isMelee ? "Big" : "Small";
				}
				return "";
			};
			return [
				marker.time,
				buffName,
				buff.info.job,
				getBuffModifiers(),
				isDebuff ? "Boss0" : "",
			];
		});
		// sim currently doesn't track mp ticks or mp costs, or any other manner of validation
		// as such, many skills are unsupported: we set the use_strict_skill_naming metadata
		// flag to allow the sim to raise warnings when we export a skill it doesn't recognize
		// we exclude buff toggle events from the export since those aren't real skills
		//
		// for BRD specifically, we need to track the number of coda present on each radiant finale
		// usage. reading sim state retroactively is hard, so we just do this hack instead
		// (also need to check override gauges)
		let magesCoda = this.gameConfig.getOverrideStacks("MAGES_CODA") ?? 0;
		let wanderersCoda = this.gameConfig.getOverrideStacks("WANDERERS_CODA") ?? 0;
		let armysCoda = this.gameConfig.getOverrideStacks("ARMYS_CODA") ?? 0;
		let radiantCoda = this.gameConfig.getOverrideStacks("RADIANT_CODA") ?? 0;
		const actionRows = this.#actionsLogCsv
			.filter((row) => !row.action.includes("Toggle buff"))
			.map((row) => {
				let targetCell = "";
				if (row.isDamaging && row.targetCount !== undefined) {
					targetCell = '"';
					for (let i = 0; i < row.targetCount; i++) {
						if (i !== 0) {
							targetCell += ", ";
						}
						targetCell += "Boss" + i.toString();
					}
					targetCell += '"';
				}
				let conditional = "";
				const codaCount = magesCoda + wanderersCoda + armysCoda;
				if (row.action === "Mage's Ballad") {
					magesCoda = 1;
				} else if (row.action === "The Wanderer's Minuet") {
					wanderersCoda = 1;
				} else if (row.action === "Army's Paeon") {
					armysCoda = 1;
				} else if (row.action === "Radiant Finale") {
					if (codaCount > 0) {
						radiantCoda = codaCount;
						conditional = `${codaCount} Coda`;
						magesCoda = 0;
						wanderersCoda = 0;
						armysCoda = 0;
					}
				} else if (row.action === "Radiant Encore") {
					if (radiantCoda > 0) {
						conditional = `${radiantCoda} Encore`;
						radiantCoda = 0;
					}
				}
				return [row.time, normalizeName(row.action), "", conditional, targetCell];
			});
		const meta = ["use_strict_skill_naming = False"];
		const isHealerOrCaster = !(isMelee || RANGED_JOBS.includes(job));
		// Ama's combat sim expects a strength stat to be provided for healer and caster auto-attacks.
		// To avoid needing to store this stat in config, these figures are hardcoded at export.
		// These values were taken in-game by entering synced instances on a female midlander character
		// (Anemos at lvl 70, Zadnor lvl 80, Sil'dihn variant at lvl 90, and overworld at lvl 100).
		const autoStrengths = {
			[LevelSync.lvl70]: new Map([
				["WHM", 162],
				["SCH", 264],
				["AST", 148],
				["SGE", 177],
				["BLM", 133],
				["SMN", 264],
				["RDM", 162],
				["PCT", 148],
			]),
			[LevelSync.lvl80]: new Map([
				["WHM", 189],
				["SCH", 308],
				["AST", 172],
				["SGE", 206],
				["BLM", 155],
				["SMN", 308],
				["RDM", 189],
				["PCT", 172],
			]),
			[LevelSync.lvl90]: new Map([
				["WHM", 216],
				["SCH", 353],
				["AST", 197],
				["SGE", 236],
				["BLM", 177],
				["SMN", 353],
				["RDM", 216],
				["PCT", 197],
			]),
			[LevelSync.lvl100]: new Map([
				["WHM", 244],
				["SCH", 398],
				["AST", 222],
				["SGE", 266],
				["BLM", 200],
				["SMN", 398],
				["RDM", 244],
				["PCT", 222],
			]),
		};
		// stats dict is parsed by combat sim as a python dict
		// WD is the same at a given ilvl across all jobs, but we still want users to input it manually
		// main_stat varies for each job's bis, so we still require users to input that for accuracy
		let statsDict: any = {
			job_class: job,
			det_stat: this.gameConfig.determination,
			crit_stat: this.gameConfig.criticalHit,
			dh_stat: this.gameConfig.directHit,
			tenacity: this.gameConfig.tenacity,
			speed_stat: isHealerOrCaster ? this.gameConfig.spellSpeed : this.gameConfig.skillSpeed,
			version: CURRENT_GAME_COMBAT_PATCH,
			level: this.gameConfig.level,
			wd: this.gameConfig.wd,
			main_stat: this.gameConfig.main,
		};
		if (autoStrengths[this.gameConfig.level].has(job)) {
			statsDict = {
				...statsDict,
				healer_or_caster_strength: autoStrengths[this.gameConfig.level].get(job),
			};
		}
		meta.push("stats = " + JSON.stringify(statsDict));
		const downtimeWindows = this.timeline
			.getUntargetableMarkers()
			// append a comma to every window so python recognizes the tuple
			.map((marker) => `(${marker.time}, ${marker.time + marker.duration}),`);
		if (downtimeWindows.length > 0) {
			meta.push("downtime_windows = (" + downtimeWindows.join(" ") + ")");
		}
		return {
			meta,
			body: [["time", "skill_name", "job_class", "skill_conditional", "targets"]].concat(
				buffRows as any[][],
				actionRows as any[][],
			),
		};
	}

	// Used for trying to add a preset skill sequence to the current timeline
	tryAddLine(line: Line, replayMode = ReplayMode.SkillSequence) {
		const replayResult = this.#replay({ line: line, replayMode: replayMode });
		if (!replayResult.success) {
			this.rewindUntilBefore(replayResult.firstAddedIndex, false);
			window.alert(
				'Failed to add line "' +
					line.name +
					'" due to insufficient resources and/or stats mismatch.',
			);
			return false;
		} else {
			this.autoSave();
			updateInvalidStatus();
			return true;
		}
	}

	deleteLine(line: Line) {
		this.#presetLinesManager.deleteLine(line);
	}

	deleteAllLines() {
		this.#presetLinesManager.deleteAllLines();
	}

	reportInterruption(props: { failNode: ActionNode; failIndex: number }) {
		if (
			this.#bTakingUserInput ||
			(this.tickMode === TickMode.RealTimeAutoPause && this.shouldLoop)
		) {
			// #bTakingUserInput is set if and only if the user just tried to use a skill.
			// In manual mode: requestUseSkill immediately fast-forwards to the cast confirm window.
			// In real-time auto pause: the shouldLoop flag is set when we're simulating until
			// the cast confirm window.
			const nodeDisplayInfo = props.failNode.getNameForMessage();
			// TODO localize
			window.alert(
				"Cast interrupted! Resources for " + nodeDisplayInfo + " are no longer available",
			);
			console.warn("failed: " + nodeDisplayInfo);
			const currentTime = this.game.time;
			const currentLoop = this.shouldLoop;
			this.rewindUntilBefore(props.failIndex, false);
			this.autoSave();
			this.#requestTick({
				deltaTime: currentTime - this.game.time,
				waitKind: "duration",
			});
			this.shouldLoop = currentLoop;
		} else {
			// Previous verions of xivintheshell would remove interrupted casts from the timeline
			// if it came from a preset or file load.
			// After adding support for invalid actions, we instead just keep the invalid action around.
			this.#bInterrupted = true;
			if (!this.#bInSandbox) {
				// If the skill was replayed by a timeline edit motion, then invalidate the last cast.
				// When viewing historical state (a skill is selected), then the last action may be
				// something else.
				this.timeline.invalidateLastElement();
			}
		}
	}

	// basically restart the game and play till here:
	// if index is undefined, replay the whole thing.
	rewindUntilBefore(index: number | undefined, removeTrailingIdleTime: boolean) {
		const replayRecord = this.record;

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);

		if (index !== undefined) {
			replayRecord.spliceUpTo(index);
			this.#replay({
				line: replayRecord,
				replayMode: ReplayMode.Exact,
				removeTrailingIdleTime: removeTrailingIdleTime,
			});
		}
	}

	removeTrailingIdleTime() {
		// first remove any non-skill nodes in the end
		let lastSkillIndex: number | undefined = undefined;
		for (let i = this.record.tailIndex; i >= 0; i--) {
			if (this.record.actions[i].info.type === ActionType.Skill) {
				lastSkillIndex = i;
				break;
			}
		}
		const toDelete =
			lastSkillIndex === undefined
				? this.record.actions.slice()
				: this.record.actions.slice(lastSkillIndex + 1);
		if (toDelete.length > 0) {
			this.undoStack.push(new DeleteNodes((lastSkillIndex ?? -1) + 1, toDelete, "delete"));
		}
		if (lastSkillIndex === undefined) {
			// no skill has been used yet - delete everything.
			this.rewindUntilBefore(0, true);
		} else {
			// there are nodes after the last skill
			this.rewindUntilBefore(lastSkillIndex + 1, true);
		}
		updateInvalidStatus();
	}

	waitTillNextMpOrLucidTick() {
		const node = this.#requestTick({
			deltaTime: this.game.timeTillNextMpGainEvent(),
			waitKind: "mp",
		});
		if (node !== undefined) {
			this.undoStack.push(new AddNode(node, this.record.tailIndex));
		}
		updateInvalidStatus();
		this.updateAllDisplay();
	}

	insertRecordNodes(nodes: ActionNode[], insertIdx: number) {
		// cleanup function for taking care of business after splicing new nodes into the middle of
		// the timeline
		// unlike tryAddLine, this function can add nodes at arbitrary positions
		this.record.insertActionNodes(nodes, insertIdx);
		this.autoSave();
		// After inserting the new skill, restart simulation and re-select the newly-added skill.
		const status = updateInvalidStatus();
		let newSelectIdx: number;
		if (nodes.length > 1) {
			newSelectIdx = Math.min(insertIdx, this.record.tailIndex);
			this.record.selectSingle(newSelectIdx);
			this.record.selectUntil(newSelectIdx + nodes.length - 1);
		} else {
			newSelectIdx = Math.min(insertIdx + 1, this.record.tailIndex);
			this.record.selectSingle(newSelectIdx);
		}
		this.displayHistoricalState(status.skillUseTimes[newSelectIdx], newSelectIdx);
	}

	insertRecordNode(node: ActionNode, insertIdx: number) {
		this.insertRecordNodes([node], insertIdx);
	}

	requestUseSkill(
		props: { skillName: ActionKey; targetCount: number },
		canUndo: boolean = false,
	) {
		this.#bTakingUserInput = true;
		if (this.inputLocked) {
			// not sure should allow any control here.
		} else {
			if (this.displayingUpToDateGameState) {
				// Append the skill to the timeline.
				const status = this.#useSkill(
					props.skillName,
					props.targetCount,
					this.tickMode,
					-1,
					false,
					canUndo,
				);
				if (status.status.ready()) {
					this.scrollToTime(this.game.time);
					this.autoSave();
					// This is needed to correct timestamps of newly-used actions
					// in realtime mode, this is handled at the end of the animation loop
					if (this.tickMode !== TickMode.RealTimeAutoPause) {
						updateInvalidStatus();
					}
				}
			} else {
				// Insert the skill to the middle of the timeline by modifying the record.
				const insertIdx = this.record.selectionStartIndex;
				if (insertIdx !== undefined) {
					// TODO this needs validity checking
					const node = skillNode(props.skillName, props.targetCount);
					this.insertRecordNode(node, insertIdx);
					if (canUndo) {
						this.undoStack.push(new AddNode(node, insertIdx));
					}
				}
			}
		}
		this.#bTakingUserInput = false;
	}

	requestToggleBuff(buffName: ResourceKey, canUndo: boolean = false) {
		const success = this.game.requestToggleBuff(buffName);
		if (!success) return false;

		const toggleNode = setResourceNode(buffName);
		toggleNode.tmp_startLockTime = this.game.time;
		toggleNode.tmp_endLockTime = toggleNode.tmp_startLockTime;
		this.record.addActionNode(toggleNode);
		// TODO: support splicing the toggle node at current timestamp
		if (canUndo) {
			this.undoStack.push(new AddNode(toggleNode, this.record.tailIndex));
		}

		this.#actionsLogCsv.push({
			time: this.game.getDisplayTime(),
			action: "Toggle buff: " + RESOURCES[buffName].name,
			isGCD: 0,
			castTime: 0,
			isDamaging: false,
		});

		return true;
	}

	scrollToTime(t?: number) {
		const targetT = t === undefined ? this.game.time : t;
		// the most adhoc hack ever...
		setTimeout(() => {
			scrollTimelineTo(StaticFn.positionFromTimeAndScale(targetT, this.timeline.scale));
		}, 0);
	}

	#runLoop(loopCondition: () => boolean, forceEditorUpdate: boolean = false) {
		let prevTime = 0;
		const ctrl = this;

		const loopFn = function (time: number) {
			if (prevTime === 0) {
				// first frame
				prevTime = time;
				// start
				// ...
			}

			const dt = ((time - prevTime) / 1000) * ctrl.timeScale;
			// advance by dt
			const timeTillAnySkillAvailable = ctrl.game.timeTillAnySkillAvailable();
			if (timeTillAnySkillAvailable >= dt) {
				ctrl.#requestTick({
					deltaTime: dt,
					prematureStopCondition: () => {
						return !loopCondition();
					},
				});
			} else {
				ctrl.#requestTick({
					deltaTime: timeTillAnySkillAvailable,
					prematureStopCondition: () => {
						return !loopCondition();
					},
				});
				ctrl.#requestTick({
					deltaTime: dt - timeTillAnySkillAvailable,
					prematureStopCondition: () => {
						return !loopCondition();
					},
				});
			}

			// update display
			ctrl.updateAllDisplay();

			// end of frame
			prevTime = time;
			if (loopCondition()) {
				requestAnimationFrame(loopFn);
			} else {
				ctrl.shouldLoop = false;
				ctrl.autoSave();
				setRealTime(false);
				if (forceEditorUpdate) {
					updateInvalidStatus();
				}
			}
		};
		setRealTime(true);
		requestAnimationFrame(loopFn);
	}

	step(t: number, canUndo: boolean = false) {
		let node: ActionNode | undefined;
		let index = this.record.tailIndex + 1;
		if (this.displayingUpToDateGameState) {
			node = this.#requestTick({ deltaTime: t, waitKind: "duration" });
			this.autoSave();
			this.updateAllDisplay();
		} else if (this.record.selectionStartIndex !== undefined) {
			index = this.record.selectionStartIndex;
			node = durationWaitNode(t);
			this.insertRecordNode(node, index);
		}
		if (canUndo && node) {
			this.undoStack.push(new AddNode(node, index));
		}
	}

	stepUntil(t: number, canUndo: boolean = false) {
		let node: ActionNode | undefined;
		let index = this.record.tailIndex + 1;
		if (this.displayingUpToDateGameState) {
			node = this.#requestTick({
				deltaTime: t - this.game.getDisplayTime(),
				waitKind: "target",
			});
			this.autoSave();
			this.updateAllDisplay();
		} else if (this.record.selectionStartIndex !== undefined) {
			index = this.record.selectionStartIndex;
			node = jumpToTimestampNode(t);
			this.insertRecordNode(node, index);
		}
		if (canUndo && node) {
			this.undoStack.push(new AddNode(node, index));
		}
	}

	// Process key events across the whole webpage.
	// If an element like an input field does not want this handler to be called while focused,
	// it should call evt.stopPropagation().
	handleKeyboardEvent(evt: React.KeyboardEvent) {
		if (this.inputLocked) {
			// never accept shortcuts while we're mid-animation
			return;
		}
		const ctrlOrCmd = evt.ctrlKey || evt.metaKey;
		const firstSelected = controller.record.selectionStartIndex;
		const selecting = firstSelected !== undefined;
		// console.log(evt.keyCode);
		let processed = false;
		if (this.displayingUpToDateGameState) {
			if (evt.key === "u") {
				// delete the last action in the current timeline
				this.undoStack.doThenPush(
					new DeleteNodes(
						this.record.tailIndex,
						[this.record.actions[this.record.tailIndex]],
						"delete",
					),
				);
				processed = true;
			}
		}
		if (evt.key === "z" && ctrlOrCmd) {
			this.undoStack.undo();
			processed = true;
		} else if ((evt.key === "Z" && ctrlOrCmd) || (evt.key === "y" && ctrlOrCmd)) {
			this.undoStack.redo();
			processed = true;
		} else if (evt.key === "Paste" || (evt.key === "v" && ctrlOrCmd)) {
			// If there's currently selected stuff, delete the selection first.
			if (selecting) {
				controller.deleteSelectedSkills();
			}
			paste();
			processed = true;
		} else if (evt.key === "Copy" || (evt.key === "c" && ctrlOrCmd)) {
			if (selecting) {
				copy();
				processed = true;
			}
		} else if (evt.key === "Cut" || (evt.key === "x" && ctrlOrCmd)) {
			if (selecting) {
				copy();
				controller.undoStack.push(
					new DeleteNodes(
						firstSelected,
						controller.record.getSelected().actions,
						"delete",
					),
				);
				controller.deleteSelectedSkills();
				processed = true;
			}
		}
		if (processed) {
			evt.preventDefault();
		}
	}

	// Process key events within the timeline canvas and timeline editor.
	handleTimelineKeyboardEvent(evt: React.KeyboardEvent) {
		if (!this.inputLocked) {
			const ctrlOrCmd = evt.ctrlKey || evt.metaKey;
			const firstSelected = controller.record.selectionStartIndex;
			const lastSelected = controller.record.selectionEndIndex;
			const selecting = firstSelected !== undefined;
			let scrollToStart = false;
			let scrollToEnd = false;
			if (evt.key === "Backspace" || evt.key === "Delete") {
				if (selecting) {
					controller.undoStack.push(
						new DeleteNodes(
							firstSelected,
							controller.record.getSelected().actions,
							"delete",
						),
					);
					controller.deleteSelectedSkills();
				}
			} else if (evt.key === "ArrowUp") {
				if (selecting) {
					if (evt.shiftKey) {
						controller.timeline.resizeSelection(true);
					} else {
						controller.timeline.onClickTimelineAction(firstSelected - 1, false);
					}
					scrollToStart = true;
					evt.preventDefault();
				} else if (controller.record.length > 0) {
					controller.timeline.onClickTimelineAction(controller.record.tailIndex, false);
					scrollToStart = true;
					evt.preventDefault();
				}
			} else if (evt.key === "ArrowDown") {
				if (selecting) {
					if (evt.shiftKey) {
						controller.timeline.resizeSelection(false);
					} else {
						controller.timeline.onClickTimelineAction(lastSelected! + 1, false);
					}
					scrollToEnd = true;
					evt.preventDefault();
				} else if (controller.record.length > 0) {
					controller.timeline.onClickTimelineAction(0, false);
					scrollToEnd = true;
					evt.preventDefault();
				}
			} else if (evt.key === "Home") {
				controller.timeline.onClickTimelineAction(0, evt.shiftKey);
				scrollToStart = true;
			} else if (evt.key === "End") {
				controller.timeline.onClickTimelineAction(
					controller.record.tailIndex,
					evt.shiftKey,
				);
				scrollToEnd = true;
			} else if (evt.key === "Escape") {
				controller.record.unselectAll();
				controller.displayCurrentState();
			} else if (evt.key === "a" && ctrlOrCmd) {
				controller.timeline.onClickTimelineAction(0, false);
				controller.timeline.onClickTimelineAction(controller.record.tailIndex, true);
				evt.preventDefault();
			}
			// shared post-action effects
			if (scrollToStart) {
				this.scrollToTime(this.record.selectionStart?.tmp_startLockTime);
				scrollEditorToFirstSelected();
			} else if (scrollToEnd) {
				this.scrollToTime(this.record.selectionEnd?.tmp_startLockTime);
				scrollEditorToLastSelected();
			}
		}
	}

	setImageExportConfig(newConfig: ImageExportConfig) {
		this.imageExportConfig = newConfig;
	}
}
export const controller = new Controller();
