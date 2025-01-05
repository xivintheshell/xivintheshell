import {
	getCachedValue,
	removeCachedValue,
	ReplayMode,
	setCachedValue,
	ShellInfo,
	ShellVersion,
	TickMode,
} from "./Common";
import { GameState } from "../Game/GameState";
import {
	getAutoReplacedSkillName,
	getConditionalReplacement,
	getNormalizedSkillName,
	getResourceKeyFromBuffName,
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
	WarningType,
} from "../Game/Common";
import { DEFAULT_CONFIG, GameConfig } from "../Game/GameConfig";
import { updateStatusDisplay } from "../Components/StatusDisplay";
import { updateSkillButtons } from "../Components/Skills";
import { updateConfigDisplay } from "../Components/PlaybackControl";
import { setHistorical, setJob, setRealTime } from "../Components/Main";
import { DamageMarkElem, DamageMarkInfo, ElemType, MAX_TIMELINE_SLOTS, Timeline } from "./Timeline";
import { scrollTimelineTo, updateTimelineView } from "../Components/Timeline";
import { ActionNode, ActionType, Line, Record } from "./Record";
import { ImageExportConfig } from "./ImageExportConfig";
import { inferJobFromSkillNames, PresetLinesManager } from "./PresetLinesManager";
import { updateSkillSequencePresetsView } from "../Components/SkillSequencePresets";
import { refreshTimelineEditor } from "../Components/TimelineEditor";
import { DEFAULT_TIMELINE_OPTIONS, StaticFn, TimelineDrawOptions } from "../Components/Common";
import { TimelineRenderingProps } from "../Components/TimelineCanvas";
import { Potency, PotencyModifierType } from "../Game/Potency";
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
import { MELEE_JOBS, ShellJob } from "../Game/Data/Jobs";
import { ActionKey, ACTIONS, ResourceKey, RESOURCES } from "../Game/Data";
import { LIMIT_BREAK_ACTIONS } from "../Game/Data/Shared/LimitBreak";
import { getGameState } from "../Game/Jobs";
import { localizeSkillName } from "../Components/Localization";

// Ensure role actions are imported after job-specific ones to protect hotbar ordering
require("../Game/Jobs/RoleActions");

type Fixme = any;

const STANDARD_DOT_TICK_KEY = "stdtick";

class Controller {
	timeScale;
	shouldLoop;
	tickMode;
	lastAttemptedSkill;
	timeline;
	#presetLinesManager;
	gameConfig;
	record;
	imageExportConfig: ImageExportConfig;
	timelineDrawOptions: TimelineDrawOptions = DEFAULT_TIMELINE_OPTIONS;
	game;
	#tinctureBuffPercentage = 0;
	#untargetableMask = true;
	#lastDamageApplicationTime;

	// todo: should probably move these items to somewhere else: in Record maybe?
	#damageLogCsv: {
		time: number;
		damageSource: string;
		potency: number;
		buffs: ResourceKey[];
	}[] = [];
	#actionsLogCsv: {
		time: number;
		action: string;
		isGCD: number;
		castTime: number;
	}[] = [];
	#dotTickTimes: Map<ResourceKey | string, number[]> = new Map();
	#dotCoverageTimes: Map<ResourceKey, { tStartDisplay: number; tEndDisplay?: number }[]> =
		new Map();

	savedHistoricalGame: GameState;
	savedHistoricalRecord: Record;

	#bAddingLine: boolean = false;
	#bInterrupted: boolean = false;
	#bInSandbox: boolean = false;

	#skipViewUpdates: boolean = false;
	// todo: can probably somehow get rid of this because it should largely overlaps with #bInSandbox
	displayingUpToDateGameState = true;

	constructor() {
		this.timeScale = 1;
		this.shouldLoop = false;
		this.tickMode = TickMode.RealTimeAutoPause;
		this.lastAttemptedSkill = "";

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

		this.#lastDamageApplicationTime = -this.gameConfig.countdown; // left of timeline origin

		// meaningless at the beginning
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;

		this.#requestRestart();
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
		let overrides = gameConfig.initialResourceOverrides;
		for (let i = 0; i < overrides.length; i++) {
			overrides[i].applyTo(this.game);
		}
	}

	#sandboxEnvironment(fn: () => void) {
		this.displayingUpToDateGameState = false;
		this.#bInSandbox = true;
		let tmpGame = this.game;
		let tmpRecord = this.record;
		let tmpLastDamageApplicationTime = this.#lastDamageApplicationTime;
		//============^ stashed states ^============

		fn();

		//============v pop stashed states v============
		this.#bInSandbox = false;
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.game = tmpGame;
		this.record = tmpRecord;
		this.#lastDamageApplicationTime = tmpLastDamageApplicationTime;
	}

	checkRecordValidity(inRecord: Record, editedNodes: ActionNode[]) {
		console.assert(inRecord.config !== undefined);

		let result: {
			isValid: boolean;
			firstInvalidAction: ActionNode | undefined;
			invalidReason: string | undefined;
			invalidTime: number | undefined;
			straightenedIfValid: Record | undefined;
		} = {
			isValid: true,
			firstInvalidAction: undefined,
			invalidReason: undefined,
			invalidTime: undefined,
			straightenedIfValid: undefined,
		};

		// no edit happened
		if (editedNodes.length === 0) {
			console.log("no edit happened");
			return result;
		}

		this.#sandboxEnvironment(() => {
			// create environment
			let cfg = inRecord.config ?? this.gameConfig;
			this.game = getGameState(cfg);
			this.record = new Record();
			this.record.config = cfg;
			this.#lastDamageApplicationTime = -cfg.countdown;

			// apply resource overrides
			this.#applyResourceOverrides(this.record.config);

			// replay skills sequence
			this.#bAddingLine = true;
			let status = this.#replay({
				line: inRecord,
				replayMode: ReplayMode.Edited,
				editedNodes: editedNodes,
				selectionStart: inRecord.getFirstSelection(),
				selectionEnd: inRecord.getLastSelection(),
			});
			this.#bAddingLine = false;

			result.isValid = status.success;
			result.firstInvalidAction = status.firstInvalidNode;
			result.invalidReason = status.invalidReason?.toString();
			result.invalidTime = status.invalidTime;
			if (status.success) {
				result.straightenedIfValid = this.record;
			}
		});

		return result;
	}

	// max replay time; cutoff action
	displayHistoricalState(displayTime: number, cutoffAction?: ActionNode) {
		let rawTime = displayTime + this.gameConfig.countdown;

		const hasSelected = this.record.getFirstSelection() !== undefined;
		this.#sandboxEnvironment(() => {
			let tmpRecord = this.record;
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
				cutoffAction: cutoffAction,
			});

			// view only cursor
			this.timeline.updateElem({
				type: ElemType.s_ViewOnlyCursor,
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

		this.lastAttemptedSkill = "";
		setHistorical(true);

		if (hasSelected) {
			this.#updateTotalDamageStats(true);
		}
		this.#updateSelectedDamageStats();
	}

	displayCurrentState() {
		this.displayingUpToDateGameState = true;
		this.timeline.updateElem({
			type: ElemType.s_ViewOnlyCursor,
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

	#requestRestart() {
		this.lastAttemptedSkill = "";
		this.game = getGameState(this.gameConfig);
		this.#playPause({ shouldLoop: false });
		this.timeline.reset();
		this.record.unselectAll();
		this.#lastDamageApplicationTime = -this.gameConfig.countdown;
		this.#damageLogCsv = [];
		this.#actionsLogCsv = [];
		this.#dotTickTimes = new Map();
		this.#dotCoverageTimes = new Map();
		this.#bAddingLine = false;
		this.#bInterrupted = false;
		this.displayingUpToDateGameState = true;
	}

	getPresetLines() {
		return this.#presetLinesManager.getLinesForJob(this.getActiveJob());
	}

	serializedPresets() {
		return this.#presetLinesManager.serialized();
	}

	// qol: cleanup?
	addSelectionToPreset(name = "(untitled)") {
		console.assert(this.record.getFirstSelection());
		let line = new Line();
		line.name = name;
		let itr = this.record.getFirstSelection();
		while (itr !== (this.record.getLastSelection()?.next ?? undefined)) {
			itr = itr as ActionNode;
			if (itr.type === ActionType.Skill) {
				line.addActionNode(itr.getClone());
			}
			itr = itr.next;
		}
		this.#presetLinesManager.addLine(line, this.getActiveJob());
	}

	appendFilePresets(content: Fixme) {
		this.#presetLinesManager.deserializeAndAppend(content);
	}

	loadBattleRecordFromFile(content: Fixme) {
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

		let gameConfig = new GameConfig(content.config);

		this.gameConfig = gameConfig;

		this.record = new Record();
		this.record.config = gameConfig;

		this.#requestRestart();

		// apply resource overrides
		this.#applyResourceOverrides(this.gameConfig);

		// now add the actions
		let line = new Line();
		for (let i = 0; i < content.actions.length; i++) {
			let action = content.actions[i];
			let node = new ActionNode(action.type);
			if (action.skillName) {
				node.skillName = getNormalizedSkillName(action.skillName);
				if (node.skillName === undefined) {
					const msg = `Failed to load record- \nInvalid skill name: ${action.skillName}`;
					window.alert(msg);
					return;
				}
			}
			node.buffName = getResourceKeyFromBuffName(action.buffName);
			node.waitDuration = action.waitDuration;
			node.targetCount = action.targetCount ?? 1;
			line.addActionNode(node);
		}
		let replayResult = this.#replay({ line: line, replayMode: ReplayMode.Exact });
		if (!replayResult.success) {
			let msg = "Failed to load the entire record- \n";
			if (replayResult.firstInvalidNode) {
				const actionName = replayResult.firstInvalidNode.skillName
					? localizeSkillName(replayResult.firstInvalidNode.skillName)
					: "(unknown)";
				msg += "Stopped here because the next action " + actionName + " can't be added: ";
			}
			msg += replayResult.invalidReason;
			window.alert(msg);
		}
	}

	// assumes newRecord can be replayed exactly
	applyEditedRecord(newRecord: Record) {
		if (!newRecord.config) {
			console.assert(false);
			return;
		}
		this.gameConfig = newRecord.config;
		this.record = new Record();
		this.record.config = newRecord.config;
		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);
		// replay actions
		let replayResult = this.#replay({
			line: newRecord,
			replayMode: ReplayMode.Exact,
			removeTrailingIdleTime: true,
		});
		console.assert(replayResult.success);

		// copy selection
		let displayedItr = this.record.getFirstAction();
		let inItr = newRecord.getFirstAction();
		let firstSelected: ActionNode | undefined = undefined;
		let lastSelected: ActionNode | undefined = undefined;
		while (inItr && displayedItr) {
			if (inItr === newRecord.getFirstSelection()) firstSelected = displayedItr;
			if (inItr === newRecord.getLastSelection()) lastSelected = displayedItr;
			displayedItr = displayedItr.next;
			inItr = inItr.next;
		}
		if (firstSelected && lastSelected) {
			this.record.selectSingle(firstSelected);
			this.record.selectUntil(lastSelected);
		} else if (firstSelected || lastSelected) {
			console.assert(false);
		}

		this.autoSave();
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
			let stats = calculateSelectedStats({
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
		if (!excludeStandardTicks) dotKeys.push(STANDARD_DOT_TICK_KEY);
		dotKeys.forEach((key) => {
			this.#dotTickTimes.get(key)?.forEach((rt) => {
				if (!bossIsUntargetable(rt - this.gameConfig.countdown) && rt <= untilRawTime) {
					cnt++;
				}
			});
		});
		return cnt;
	}

	getDotCoverageTimeFraction(untilDisplayTime: number, dot: ResourceKey) {
		if (untilDisplayTime <= Debug.epsilon) return 0;
		const dotCoverages = this.#dotCoverageTimes.get(dot);
		if (!dotCoverages) {
			return 0;
		}

		let coveredTime = 0;
		dotCoverages.forEach((section) => {
			if (section.tStartDisplay <= untilDisplayTime) {
				let startTime = Math.max(0, section.tStartDisplay);
				let endTime =
					section.tEndDisplay !== undefined && section.tEndDisplay <= untilDisplayTime
						? section.tEndDisplay
						: untilDisplayTime;
				endTime = Math.max(0, endTime);
				coveredTime += getTargetableDurationBetween(startTime, endTime);
			}
		});
		let totalTime = getTargetableDurationBetween(0, untilDisplayTime);
		return coveredTime / totalTime;
	}

	setTimelineOptions(options: Partial<TimelineDrawOptions>) {
		this.timelineDrawOptions = { ...this.timelineDrawOptions, ...options };
		this.updateTimelineDisplay();
	}

	getTimelineRenderingProps(): TimelineRenderingProps {
		let showSelection: boolean =
			this.record.getFirstSelection() != null && this.record.getLastSelection() != null;
		let countdown = this.gameConfig.countdown;
		// and other slots
		let allSlotsTimeInfo = this.timeline.getAllSlotsTimeInfo();
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

	reportWarning(type: WarningType) {
		if (!this.#bInSandbox) {
			this.timeline.addElement({
				type: ElemType.WarningMark,
				warningType: type,
				time: this.game.time,
				displayTime: this.game.getDisplayTime(),
			});
		}
	}

	resolvePotency(p: Potency) {
		p.resolve(this.game.getDisplayTime());
		this.#lastDamageApplicationTime = this.game.time;

		let pot = false;
		p.modifiers.forEach((m) => {
			if (m.source === PotencyModifierType.POT) pot = true;
		});

		if (!this.#bInSandbox) {
			let sourceDesc = "{skill}@" + p.sourceTime.toFixed(3);
			if (p.description.length > 0) sourceDesc += " " + p.description;
			const damageInfo: DamageMarkInfo = {
				potency: p,
				sourceDesc,
				sourceSkill: p.sourceSkill,
			};
			let existingElement = this.timeline.tryGetElement(
				this.game.time,
				ElemType.DamageMark,
			) as DamageMarkElem;
			if (existingElement) {
				existingElement.damageInfos.push(damageInfo);
				if (pot && !existingElement.buffs.includes("TINCTURE")) {
					existingElement.buffs.push("TINCTURE");
				}
			} else {
				this.timeline.addElement({
					type: ElemType.DamageMark,
					damageInfos: [damageInfo],
					buffs: pot ? ["TINCTURE"] : [],
					time: this.game.time,
					displayTime: this.game.getDisplayTime(),
				});
			}

			// time, damageSource, potency, cumulativePotency
			this.#damageLogCsv.push({
				time: this.game.getDisplayTime(),
				damageSource: p.sourceSkill + "@" + p.sourceTime,
				// tincture is applied when actually exporting for download.
				potency: p.getAmount({
					tincturePotencyMultiplier: 1,
					includePartyBuffs: true,
					includeSplash: true,
				}),
				buffs: pot ? ["TINCTURE"] : [],
			});
		}

		this.#updateTotalDamageStats();
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

	/**
	 * Records the raw time at which a dot tick event took place
	 * @param rawTime The time of the DoT
	 * @param dotName The name of the DoT that ticked. If not provided, assumes the standard DoT tick
	 */
	reportDotTick(rawTime: number, dotName?: ResourceKey) {
		if (!this.#bInSandbox) {
			const tickGroupKey = dotName ?? STANDARD_DOT_TICK_KEY;
			let tickGroup = this.#dotTickTimes.get(tickGroupKey);
			if (!tickGroup) {
				tickGroup = [];
				this.#dotTickTimes.set(tickGroupKey, tickGroup);
			}
			tickGroup.push(rawTime);
			this.updateStats();
		}
	}

	reportDotStart(displayTime: number, dot: ResourceKey) {
		if (!this.#bInSandbox) {
			let dotCoverages = this.#dotCoverageTimes.get(dot);
			if (!dotCoverages) {
				dotCoverages = [];
				this.#dotCoverageTimes.set(dot, dotCoverages);
			}
			let len = dotCoverages.length;
			console.assert(len === 0 || dotCoverages[len - 1].tEndDisplay !== undefined);
			dotCoverages.push({
				tStartDisplay: displayTime,
				tEndDisplay: undefined,
			});
		}
	}

	reportDotDrop(displayTime: number, dot: ResourceKey) {
		if (!this.#bInSandbox) {
			const dotCoverages = this.#dotCoverageTimes.get(dot);
			console.assert(dotCoverages, `Reported dropping ${dot} when no coverage was detected`);
			if (!dotCoverages) {
				return;
			}
			let len = dotCoverages.length;
			console.assert(len > 0 && dotCoverages[len - 1].tEndDisplay === undefined);
			dotCoverages[len - 1].tEndDisplay = displayTime;
		}
	}

	updateStatusDisplay(game: GameState) {
		// locks
		let cast = game.resources.get("NOT_CASTER_TAXED");
		let anim = game.resources.get("NOT_ANIMATION_LOCKED");
		let gcd = game.cooldowns.get("cd_GCD");
		let resourceLocksData = {
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
		updateStatusDisplay(
			{
				time: game.getDisplayTime(),
				resources: propsGenerator.getAllResourceViewProps(),
				resourceLocks: resourceLocksData,
				enemyBuffs: propsGenerator.getAllOtherTargetedBuffViewProps(),
				selfBuffs: propsGenerator.getAllSelfTargetedBuffViewProps(),
				level: game.config.level,
			},
			propsGenerator.statusLayoutFn,
		);
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
		separateNode: boolean;
		prematureStopCondition?: () => boolean;
	}) {
		if (props.deltaTime > 0) {
			let timeTicked = this.game.tick(
				props.deltaTime,
				props.prematureStopCondition
					? props.prematureStopCondition
					: () => {
							return false;
						},
			);

			// add this tick to game record
			let lastAction = this.record.getLastAction();
			if (lastAction && !props.separateNode) {
				lastAction.waitDuration += timeTicked;
			} else {
				let waitNode = new ActionNode(ActionType.Wait);
				waitNode.waitDuration = timeTicked;
				this.record.addActionNode(waitNode);
			}
		}
	}

	setTimeControlSettings(props: { timeScale: number; tickMode: TickMode }) {
		this.timeScale = props.timeScale;
		this.tickMode = props.tickMode;
		this.shouldLoop = false;
		this.lastAttemptedSkill = "";
	}

	setConfigAndRestart(props: {
		job: ShellJob;
		level: LevelSync;
		spellSpeed: number;
		skillSpeed: number;
		criticalHit: number;
		directHit: number;
		determination: number;
		piety: number;
		animationLock: number;
		fps: number;
		gcdSkillCorrection: number;
		timeTillFirstManaTick: number;
		countdown: number;
		randomSeed: string;
		procMode: ProcMode;
		initialResourceOverrides: any[];
	}) {
		const oldJob = this.gameConfig.job;
		this.gameConfig = new GameConfig({
			...props,
			shellVersion: ShellInfo.version,
		});

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);
		// Propagate changes to the intro section (definitely not idiomatic react... maybe we
		// should just make the text static for all jobs)
		if (oldJob !== props.job) {
			setJob(props.job);
		}

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
		let newShouldLoop = props.shouldLoop;
		if (this.shouldLoop === newShouldLoop) return;

		this.shouldLoop = newShouldLoop;

		if (this.shouldLoop) {
			this.#runLoop(() => {
				return this.shouldLoop;
			});
		}
	}

	#fastForward() {
		let deltaTime: number = this.game.timeTillAnySkillAvailable();
		this.#requestTick({ deltaTime: deltaTime, separateNode: false });
	}

	#useSkill(
		skillName: ActionKey,
		targetCount: number,
		bWaitFirst: boolean,
		overrideTickMode: TickMode = this.tickMode,
	) {
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({ deltaTime: status.timeTillAvailable, separateNode: false });
			skillName = getConditionalReplacement(skillName, this.game);
			status = this.game.getSkillAvailabilityStatus(skillName);
			this.lastAttemptedSkill = "";
		}

		if (
			status.status.unavailableReasons.some(
				(reason) =>
					reason === SkillUnavailableReason.Blocked ||
					reason === SkillUnavailableReason.NotInCombat,
			)
		) {
			this.lastAttemptedSkill = skillName;
		}

		if (status.status.ready()) {
			let node = new ActionNode(ActionType.Skill);
			node.skillName = skillName;
			node.waitDuration = 0;
			node.targetCount = targetCount;
			this.record.addActionNode(node);

			this.game.useSkill(skillName, node);
			if (overrideTickMode === TickMode.RealTimeAutoPause) {
				this.shouldLoop = true;
				this.#runLoop(() => {
					return this.game.timeTillAnySkillAvailable() > 0;
				});
			}

			let lockDuration = this.game.timeTillAnySkillAvailable();

			node.tmp_startLockTime = this.game.time;
			node.tmp_endLockTime = this.game.time + lockDuration;

			if (!this.#bInSandbox) {
				// this block is run when NOT viewing historical state (aka run when receiving input)
				let newStatus = this.game.getSkillAvailabilityStatus(skillName, true); // refresh to get re-captured recast time
				let skill = this.game.skillsList.get(skillName);
				let isGCD = skill.cdName === "cd_GCD";
				let isSpellCast = status.castTime > 0 && !status.instantCast;
				let snapshotTime = isSpellCast
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
					node: node,
				});
				this.#actionsLogCsv.push({
					time: this.game.getDisplayTime(),
					action: ACTIONS[skillName].name,
					isGCD: isGCD ? 1 : 0,
					castTime: status.instantCast ? 0 : status.castTime,
				});
			}

			// If this was called within a line load, do not refresh the timeline view
			if (!this.#skipViewUpdates) {
				refreshTimelineEditor();
			}
		}
		return status;
	}

	#inArray(n: ActionNode | undefined, l: ActionNode[] | undefined) {
		if (!l) return false;
		for (let i = 0; i < l.length; i++) {
			if (n === l[i]) return true;
		}
		return false;
	}

	// returns true on success
	#replay(props: {
		line: Line;
		replayMode: ReplayMode;
		removeTrailingIdleTime?: boolean;
		maxReplayTime?: number;
		cutoffAction?: ActionNode;
		editedNodes?: ActionNode[]; // for ReplayMode.Edited: everything before this should instead use ReplayMode.Exact
		selectionStart?: ActionNode;
		selectionEnd?: ActionNode;
	}): {
		success: boolean;
		firstAddedNode: ActionNode | undefined;
		firstInvalidNode: ActionNode | undefined;
		invalidReason: SkillReadyStatus | undefined;
		invalidTime: number | undefined;
	} {
		// Prevent UI updates from occuring until the final action
		this.#skipViewUpdates = true;
		// default input, if not provided
		if (props.removeTrailingIdleTime === undefined) props.removeTrailingIdleTime = false;
		if (props.maxReplayTime === undefined) props.maxReplayTime = -1;

		// when checking record validity as well as final application (ReplayMode.Edited), replay exactly until the first edited node
		// and also copy over selection status
		//let firstSelected: ActionNode | undefined = undefined;
		let currentReplayMode = props.replayMode;
		if (props.replayMode === ReplayMode.Edited) {
			currentReplayMode = ReplayMode.Exact;
		}

		let itr = props.line.getFirstAction();
		if (!itr) {
			// Empty line, no need to call re-render here
			this.#skipViewUpdates = false;
			return {
				success: true,
				firstAddedNode: undefined,
				firstInvalidNode: undefined,
				invalidReason: undefined,
				invalidTime: undefined,
			};
		}

		const oldTail = this.record.getLastAction();
		let firstAddedNode = undefined;
		while (itr && itr !== props.cutoffAction) {
			// switch to edited replay past the first edited node
			if (
				props.replayMode === ReplayMode.Edited &&
				currentReplayMode === ReplayMode.Exact &&
				(this.#inArray(itr, props.editedNodes) ||
					this.#inArray(itr.next, props.editedNodes))
			) {
				currentReplayMode = ReplayMode.Edited;
			}

			let lastIter = false;
			let firstInvalidNode: ActionNode | undefined = undefined;
			let invalidReason: SkillReadyStatus | undefined = undefined;
			let invalidTime: number | undefined = undefined;

			// maxReplayTime is used for replay for displaying historical game states (only replay some given duration)
			let waitDuration = itr.waitDuration;
			if (
				props.maxReplayTime >= 0 &&
				props.maxReplayTime - this.game.time < waitDuration &&
				currentReplayMode === ReplayMode.Exact
			) {
				// hit specified max replay time; everything's valid so far
				waitDuration = props.maxReplayTime - this.game.time;
				lastIter = true;
			}

			// only Exact & validity replays wait nodes
			if (
				itr.type === ActionType.Wait &&
				(currentReplayMode === ReplayMode.Exact || currentReplayMode === ReplayMode.Edited)
			) {
				this.#requestTick({
					deltaTime: waitDuration,
					separateNode: true,
				});
				// wait nodes are always valid
			}

			// skill nodes
			else if (itr.type === ActionType.Skill) {
				let waitFirst =
					currentReplayMode === ReplayMode.SkillSequence ||
					currentReplayMode === ReplayMode.Edited; // true for tight replay; false for exact replay
				let skillName = itr.skillName as ActionKey;
				if (props.replayMode === ReplayMode.SkillSequence) {
					// auto-replace as much as possible
					skillName = getAutoReplacedSkillName(
						this.game.job,
						skillName,
						this.gameConfig.level,
					);
				}
				let status = this.#useSkill(skillName, itr.targetCount, waitFirst, TickMode.Manual);

				let bEditedTimelineShouldWaitAfterSkill =
					currentReplayMode === ReplayMode.Edited &&
					itr.next &&
					itr.next.type === ActionType.Wait;
				if (currentReplayMode === ReplayMode.Exact || bEditedTimelineShouldWaitAfterSkill) {
					if (status.status.ready()) {
						//======== tick wait block ========
						// qol: clean up this code...
						let deltaTime = 0;
						if (props.maxReplayTime >= 0) {
							deltaTime = waitDuration;
						} else {
							if (props.removeTrailingIdleTime) {
								deltaTime =
									itr === props.line.getLastAction()
										? this.game.timeTillAnySkillAvailable()
										: waitDuration;
							} else {
								deltaTime = waitDuration;
							}
						}
						this.#requestTick({
							deltaTime: deltaTime,
							separateNode: false,
						});
						//======== tick wait block ========
					}
				} else if (
					currentReplayMode === ReplayMode.SkillSequence ||
					currentReplayMode === ReplayMode.Edited
				) {
					this.#requestTick({
						deltaTime: this.game.timeTillAnySkillAvailable(),
						separateNode: false,
					});
				} else {
					lastIter = true;
					console.assert(false);
				}

				if (!status.status.ready()) {
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = status.status.clone();
					invalidTime = this.game.getDisplayTime();
				}

				if (this.#bInterrupted) {
					// likely because enochian dropped before a cast snapshots
					this.#bInterrupted = false;
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = status.status;
					invalidTime = this.game.getDisplayTime();
				}
			}
			// buff enable/disable also only supported by exact / edited replay
			else if (
				itr.type === ActionType.SetResourceEnabled &&
				(currentReplayMode === ReplayMode.Exact || currentReplayMode === ReplayMode.Edited)
			) {
				let success = this.requestToggleBuff(itr.buffName as ResourceKey);
				const exact = currentReplayMode === ReplayMode.Exact;
				if (success) {
					this.#requestTick({
						// waitDuration gets auto filled when this node is moved around and causes unwanted gaps on the timeline..
						// current workaround: auto decide whether to respect this info in the record. Could be a bit too hacky..
						deltaTime: exact
							? waitDuration
							: Math.min(waitDuration, this.game.timeTillAnySkillAvailable()),
						separateNode: false,
					});
				} else {
					const reason = makeSkillReadyStatus();
					reason.addUnavailableReason(SkillUnavailableReason.BuffNoLongerAvailable);
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = reason;
					invalidTime = this.game.getDisplayTime();
				}
			} else {
				console.assert(false);
			}

			// now added whatever node it needs to add.

			// for edited replay mode, copy selection:
			if (props.replayMode === ReplayMode.Edited) {
				let lastAdded = this.record.getLastAction();
				if (itr === props.selectionStart && lastAdded) {
					this.record.selectSingle(lastAdded);
				} else if (itr === props.selectionEnd && lastAdded) {
					this.record.selectUntil(lastAdded);
				}
			}

			// this iteration just added something, but firstAddedNode is still empty:
			if (this.record.getLastAction() !== oldTail && !firstAddedNode) {
				firstAddedNode = this.record.getLastAction();
			}

			if (lastIter) {
				// Re-enable UI updates
				this.#skipViewUpdates = false;
				this.updateAllDisplay();
				return {
					success: false,
					firstAddedNode: firstAddedNode,
					firstInvalidNode: firstInvalidNode,
					invalidReason: invalidReason,
					invalidTime: invalidTime,
				};
			} else {
				itr = itr.next;
			}
		}
		// Re-enable UI updates
		this.#skipViewUpdates = false;
		this.updateAllDisplay();
		return {
			success: true,
			firstAddedNode: firstAddedNode,
			firstInvalidNode: undefined,
			invalidReason: undefined,
			invalidTime: undefined,
		};
	}

	autoSave() {
		let serializedRecord = this.record.serialized();
		this.timeline.saveCurrentSlot(serializedRecord, this.gameConfig.countdown, this.game.time);
	}

	tryAutoLoad() {
		let str = getCachedValue("gameRecord");
		if (str !== null) {
			console.log("migrating existing record to slot 0");
			setCachedValue("gameRecord0", str);
			removeCachedValue("gameRecord");
		}
		for (let i = 0; i < MAX_TIMELINE_SLOTS; i++) {
			this.timeline.loadSlot(i);
		}

		let hasAtLeastOneSlot = this.timeline.slots.length > 0;
		if (!hasAtLeastOneSlot) {
			this.timeline.addSlot();
		}

		this.setActiveSlot(0);
	}

	setActiveSlot(slot: number) {
		// cancel real time
		this.#playPause({ shouldLoop: false });
		this.autoSave();

		this.record.unselectAll();
		console.assert(this.timeline.loadSlot(slot));
		this.displayCurrentState();
	}

	getDamageLogCsv(): any[][] {
		let csvRows = this.#damageLogCsv.map((row) => {
			let pot = false;
			row.buffs.forEach((b) => {
				if (b === "TINCTURE") pot = true;
			});
			let potency = row.potency;
			if (pot) potency *= this.getTincturePotencyMultiplier();
			return [row.time, row.damageSource, potency];
		});
		return [["time", "damageSource", "potency"]].concat(csvRows as any[][]);
	}

	getActionsLogCsv(): any[][] {
		let csvRows = this.#actionsLogCsv.map((row) => {
			return [row.time, row.action, row.isGCD, row.castTime];
		});
		return [["time", "action", "isGCD", "castTime"]].concat(csvRows as any[][]);
	}

	// return rows of a CSV to feed to Amarantine's combat sim
	// https://github.com/Amarantine-xiv/Amas-FF14-Combat-Sim
	getAmaSimCsv(): any[][] {
		const normalizeName = (s: string) => {
			if (s === ACTIONS.TINCTURE.name) {
				return "Grade 2 Gemdraught";
			} else {
				return s.replace(" 2", " II").replace(" 3", " III").replace(" 4", " IV");
			}
		};
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
			const getBuffModifiers = () => {
				if (buff.info.name === BuffType.Dokumori) {
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
					return "Big";
				}
				return "";
			};
			return [marker.time, buffName, buff.info.job, getBuffModifiers()];
		});
		const actionRows = this.#actionsLogCsv
			// sim currently doesn't track mp ticks or mp costs, so skip lucid dreaming
			// also skip sprint, buff toggle events, and any other non-damage-related abilities
			.filter(
				(row) =>
					!(
						[
							"SPRINT",
							"LUCID_DREAMING",
							"BETWEEN_THE_LINES",
							"RETRACE",
							"ADDLE",
							"AETHERIAL_MANIPULATION",
							"MANAWARD",
							"SURECAST",

							"TEMPERA_GRASSA_POP",
							"TEMPERA_COAT_POP",
							...Object.keys(LIMIT_BREAK_ACTIONS), // Exclude LBs from export
						] as ActionKey[]
					)
						.map((key) => ACTIONS[key].name)
						.includes(row.action) && !row.action.includes("Toggle buff"),
			)
			.map((row) => [row.time, normalizeName(row.action), "", ""]);
		return [["Time", "skill_name", "job_class", "skill_conditional"]].concat(
			buffRows as any[][],
			actionRows as any[][],
		);
	}

	// generally used for trying to add a line to the current timeline
	tryAddLine(line: Line, replayMode = ReplayMode.SkillSequence) {
		this.#bAddingLine = true;

		let replayResult = this.#replay({ line: line, replayMode: replayMode });
		if (!replayResult.success) {
			this.rewindUntilBefore(replayResult.firstAddedNode, false);
			window.alert(
				'Failed to add line "' +
					line.name +
					'" due to insufficient resources and/or stats mismatch.',
			);
			this.#bAddingLine = false;
			return false;
		} else {
			this.autoSave();
			this.#bAddingLine = false;
			return true;
		}
	}

	deleteLine(line: Line) {
		this.#presetLinesManager.deleteLine(line);
	}

	deleteAllLines() {
		this.#presetLinesManager.deleteAllLines();
	}

	reportInterruption(props: { failNode: ActionNode }) {
		if (!this.#bInSandbox) {
			window.alert(
				"cast failed! Resources for " +
					ACTIONS[props.failNode.skillName as ActionKey].name +
					" are no longer available",
			);
			console.warn("failed: " + ACTIONS[props.failNode.skillName as ActionKey].name);
		}
		// if adding from a line, invalidate the whole line
		// if loading from file (shouldn't happen)
		// if real-time / using a skill directly: get rid of this node but don't scrub time back

		if (this.#bAddingLine) {
			this.#bInterrupted = true;
		} else {
			let currentTime = this.game.time;
			let currentLoop = this.shouldLoop;
			this.rewindUntilBefore(props.failNode, false);
			this.autoSave();
			this.#requestTick({
				deltaTime: currentTime - this.game.time,
				separateNode: false,
			});
			this.shouldLoop = currentLoop;
		}
	}

	// basically restart the game and play till here:
	// if node is undefined, replay the whole thing.
	rewindUntilBefore(node: ActionNode | undefined, removeTrailingIdleTime: boolean) {
		let replayRecord = this.record;

		let newTail: ActionNode | undefined;
		if (replayRecord.getFirstAction() === node) {
			// deleting everything before head (making it empty)
			newTail = undefined;
		} else {
			console.assert(replayRecord.getFirstAction() !== undefined);
			newTail = replayRecord.getFirstAction();
			while ((newTail as ActionNode).next !== node) {
				newTail = (newTail as ActionNode).next;
			}
		}

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);

		if (newTail) {
			replayRecord.tail = newTail;
			replayRecord.tail.next = undefined;
			this.#replay({
				line: replayRecord,
				replayMode: ReplayMode.Exact,
				removeTrailingIdleTime: removeTrailingIdleTime,
			});
		}
	}

	removeTrailingIdleTime() {
		// first remove any non-skill nodes in the end
		let lastSkill = this.record.getLastAction((node) => {
			return node.type === ActionType.Skill;
		});
		if (!lastSkill) {
			// no skill has been used yet - delete everything.
			this.rewindUntilBefore(this.record.getFirstAction(), true);
		} else {
			// there are nodes after the last skill
			this.rewindUntilBefore(lastSkill.next, true);
		}
	}

	waitTillNextMpOrLucidTick() {
		this.#requestTick({ deltaTime: this.game.timeTillNextMpGainEvent(), separateNode: true });
		this.updateAllDisplay();
	}

	requestUseSkill(props: { skillName: ActionKey; targetCount: number }) {
		if (this.tickMode === TickMode.RealTimeAutoPause && this.shouldLoop) {
			// not sure should allow any control here.
		} else {
			let waitFirst = props.skillName === this.lastAttemptedSkill;
			let status = this.#useSkill(props.skillName, props.targetCount, waitFirst);
			if (status.status.ready()) {
				this.scrollToTime(this.game.time);
				this.autoSave();
			}
		}
	}

	requestToggleBuff(buffName: ResourceKey) {
		let success = this.game.requestToggleBuff(buffName); // currently always succeeds
		if (!success) return false;

		let node = new ActionNode(ActionType.SetResourceEnabled);
		node.buffName = buffName;
		this.record.addActionNode(node);

		this.#actionsLogCsv.push({
			time: this.game.getDisplayTime(),
			action: "Toggle buff: " + RESOURCES[buffName].name,
			isGCD: 0,
			castTime: 0,
		});

		return true;
	}

	scrollToTime(t?: number) {
		let targetT = t === undefined ? this.game.time : t;
		// the most adhoc hack ever...
		setTimeout(() => {
			scrollTimelineTo(StaticFn.positionFromTimeAndScale(targetT, this.timeline.scale));
		}, 0);
	}

	#runLoop(loopCondition: () => boolean) {
		let prevTime = 0;
		let ctrl = this;

		const loopFn = function (time: number) {
			if (prevTime === 0) {
				// first frame
				prevTime = time;
				// start
				// ...
			}

			let dt = ((time - prevTime) / 1000) * ctrl.timeScale;
			// advance by dt
			let timeTillAnySkillAvailable = ctrl.game.timeTillAnySkillAvailable();
			if (timeTillAnySkillAvailable >= dt) {
				ctrl.#requestTick({
					deltaTime: dt,
					separateNode: false,
					prematureStopCondition: () => {
						return !loopCondition();
					},
				});
			} else {
				ctrl.#requestTick({
					deltaTime: timeTillAnySkillAvailable,
					separateNode: false,
					prematureStopCondition: () => {
						return !loopCondition();
					},
				});
				ctrl.#requestTick({
					deltaTime: dt - timeTillAnySkillAvailable,
					separateNode: false,
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
			}
		};
		setRealTime(true);
		requestAnimationFrame(loopFn);
	}

	step(t: number) {
		this.#requestTick({ deltaTime: t, separateNode: true });
		this.updateAllDisplay();
	}

	#handleKeyboardEvent_RealTimeAutoPause(evt: { shiftKey: boolean; keyCode: number }) {
		if (this.shouldLoop) return;

		if (evt.keyCode === 85) {
			// u (undo)
			this.rewindUntilBefore(this.record.getLastAction(), false);
			this.updateAllDisplay();
			this.autoSave();
		}
	}
	#handleKeyboardEvent_Manual(evt: { keyCode: number; shiftKey: boolean }) {
		if (evt.keyCode === 32) {
			// space
			this.#fastForward();
			this.updateAllDisplay();
			this.autoSave();
		} else if (evt.keyCode === 85) {
			// u (undo)
			this.rewindUntilBefore(this.record.getLastAction(), false);
			this.updateAllDisplay();
			this.autoSave();
		}
	}

	handleKeyboardEvent(evt: { keyCode: number; shiftKey: boolean }) {
		// console.log(evt.keyCode);
		if (this.displayingUpToDateGameState) {
			if (this.tickMode === TickMode.RealTimeAutoPause) {
				this.#handleKeyboardEvent_RealTimeAutoPause(evt);
			} else if (this.tickMode === TickMode.Manual) {
				this.#handleKeyboardEvent_Manual(evt);
			}
		}
	}

	setImageExportConfig(newConfig: ImageExportConfig) {
		this.imageExportConfig = newConfig;
	}
}
export const controller = new Controller();
