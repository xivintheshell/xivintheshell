import {
	getCachedValue,
	removeCachedValue,
	ReplayMode,
	setCachedValue,
	ShellInfo,
	ShellVersion,
	TickMode
} from "./Common";
import {GameState} from "../Game/GameState";
import {Debug, ProcMode, ResourceType, SkillName, SkillReadyStatus, WarningType} from "../Game/Common";
import {DEFAULT_CONFIG, GameConfig} from "../Game/GameConfig"
// @ts-ignore
import {updateStatusDisplay} from "../Components/StatusDisplay";
// @ts-ignore
import {displayedSkills, updateSkillButtons} from "../Components/Skills";
// @ts-ignore
import {updateConfigDisplay} from "../Components/PlaybackControl"
import {setHistorical, setRealTime} from "../Components/Main";
import {ElemType, MAX_TIMELINE_SLOTS, Timeline} from "./Timeline"
import {scrollTimelineTo, updateTimelineView} from "../Components/Timeline";
import {ActionNode, ActionType, Line, Record} from "./Record";
import {PresetLinesManager} from "./PresetLinesManager";
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";
import {refreshTimelineEditor} from "../Components/TimelineEditor";
import {StaticFn} from "../Components/Common";
import {TimelineRenderingProps} from "../Components/TimelineCanvas";
import {Potency, PotencyModifierType} from "../Game/Potency";
import {updateDamageStats, updateSelectedStats} from "../Components/DamageStatistics";
import {
	bossIsUntargetable,
	calculateDamageStats,
	calculateSelectedStats,
	getTargetableDurationBetween
} from "./DamageStatistics";

type Fixme = any;

class Controller {
	timeScale;
	shouldLoop;
	tickMode;
	lastAttemptedSkill;
	skillMaxTimeInQueue;
	skillsQueue: { skillName: SkillName, timeInQueue: number }[];
	timeline;
	#presetLinesManager;
	gameConfig;
	record;
	game;
	#tinctureBuffPercentage = 0;
	#untargetableMask = true;
	#lastDamageApplicationTime;

	// todo: should probably move these items to somewhere else: in Record maybe?
	#damageLogCsv : {
		time: number,
		damageSource: string,
		potency: number,
		buffs: ResourceType[]
	}[] = [];
	#actionsLogCsv : {
		time: number,
		action: string,
		isGCD: number,
		castTime: number
	}[] = [];
	#thunderDotTickTimes: number[] = [];
	#thunderDoTCoverageTimes: {tStartDisplay: number, tEndDisplay?: number}[] = [];

	savedHistoricalGame: GameState;
	savedHistoricalRecord: Record;

	#bAddingLine: boolean = false;
	#bInterrupted: boolean = false;
	#bCalculatingHistoricalState: boolean = false;

	displayingUpToDateGameState = true;

	constructor() {
		this.timeScale = 1;
		this.shouldLoop = false;
		this.tickMode = TickMode.RealTimeAutoPause;
		this.lastAttemptedSkill = "";
		this.skillMaxTimeInQueue = 0.5;
		this.skillsQueue = [];

		this.timeline = new Timeline();
		this.timeline.reset();

		this.#presetLinesManager = new PresetLinesManager();

		this.gameConfig = new GameConfig(DEFAULT_CONFIG);
		this.game = new GameState(this.gameConfig);

		this.record = new Record();
		this.record.config = this.gameConfig;

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
	}

	#applyResourceOverrides(gameConfig: GameConfig) {
		let overrides = gameConfig.initialResourceOverrides;
		for (let i = 0; i < overrides.length; i++) {
			overrides[i].applyTo(this.game);
		}
	}

	#sandboxEnvironment(fn: ()=>void) {
		this.displayingUpToDateGameState = false;
		this.#bCalculatingHistoricalState = true;
		let tmpGame = this.game;
		let tmpRecord = this.record;
		let tmpLastDamageApplicationTime = this.#lastDamageApplicationTime;
		//============^ stashed states ^============

		fn();

		//============v pop stashed states v============
		this.#bCalculatingHistoricalState = false;
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.game = tmpGame;
		this.record = tmpRecord;
		this.#lastDamageApplicationTime = tmpLastDamageApplicationTime;
	}

	checkRecordValidity(inRecord: Record, editedNodes: ActionNode[]) {

		console.assert(inRecord.config !== undefined);

		let result: {isValid: boolean, firstInvalidAction: ActionNode | undefined, invalidReason: string | undefined, straightenedIfValid: Record | undefined} = {
			isValid: true,
			firstInvalidAction: undefined,
			invalidReason: undefined,
			straightenedIfValid: undefined
		};

		// no edit happened
		if (editedNodes.length === 0) {
			console.log("no edit happened");
			return result;
		}

		this.#sandboxEnvironment(()=>{

			// create environment
			let cfg = inRecord.config ?? this.gameConfig;
			this.game = new GameState(cfg);
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
				selectionEnd: inRecord.getLastSelection()
			});
			this.#bAddingLine = false;

			result.isValid = status.success;
			result.firstInvalidAction = status.firstInvalidNode;
			result.invalidReason = status.invalidReason;
			if (status.success) {
				result.straightenedIfValid = this.record;
			}
		});

		return result;
	}

	// max replay time; cutoff action
	displayHistoricalState(displayTime: number, cutoffAction?: ActionNode) {

		let rawTime = displayTime + this.gameConfig.countdown;

		this.#sandboxEnvironment(()=>{
			let tmpRecord = this.record;
			this.game = new GameState(this.gameConfig);
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
				cutoffAction: cutoffAction
			});

			// view only cursor
			this.timeline.updateElem({
				type: ElemType.s_ViewOnlyCursor,
				time: this.game.time, // is actually historical state
				displayTime: this.game.getDisplayTime(),
				enabled: true
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

		this.#updateSelectedDamageStats();
	}

	displayCurrentState() {
		this.displayingUpToDateGameState = true;
		this.timeline.updateElem({
			type: ElemType.s_ViewOnlyCursor,
			enabled: false,
			time: 0,
			displayTime: 0
		});
		setHistorical(false);
		this.updateAllDisplay(this.game);
	}

	restart() {
		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);
	}

	#requestRestart() {
		this.lastAttemptedSkill = ""
		this.game = new GameState(this.gameConfig);
		this.#playPause({shouldLoop: false});
		this.timeline.reset();
		this.record.unselectAll();
		this.#lastDamageApplicationTime = -this.gameConfig.countdown;
		this.#damageLogCsv = [];
		this.#actionsLogCsv = [];
		this.#thunderDotTickTimes = [];
		this.#thunderDoTCoverageTimes = [];
		this.#bAddingLine = false;
		this.#bInterrupted = false;
		this.displayingUpToDateGameState = true;
	}

	getPresetLines() {
		return this.#presetLinesManager.presetLines;
	}

	serializedPresets() {
		return this.#presetLinesManager.serialized();
	}

	// qol: cleanup?
	addSelectionToPreset(name="(untitled)") {
		console.assert(this.record.getFirstSelection());
		let line = new Line();
		line.name = name;
		let itr = this.record.getFirstSelection();
		while (itr !== this.record.getLastSelection()?.next ?? undefined) {
			itr = itr as ActionNode;
			if (itr.type === ActionType.Skill) {
				line.addActionNode(itr.getClone());
			}
			itr = itr.next;
		}
		this.#presetLinesManager.addLine(line);
	}

	appendFilePresets(content: Fixme) {
		this.#presetLinesManager.deserializeAndAppend(content);
	}

	loadBattleRecordFromFile(content: Fixme) {
		if (content.config.procMode === undefined) { // for backward compatibility
			if (content.config.rngProcs!==undefined) {
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
		if (content.config.shellVersion === undefined) {
			content.config.shellVersion = ShellVersion.Initial;
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
			node.skillName = action.skillName;
			node.buffName = action.buffName;
			node.waitDuration = action.waitDuration;
			line.addActionNode(node);
		}
		let replayResult = this.#replay({line: line, replayMode: ReplayMode.Exact});
		if (!replayResult.success) {
			let msg = "Failed to load the entire record- \n";
			if (replayResult.firstInvalidNode) {
				msg += "Stopped here because the next action " + (replayResult.firstInvalidNode.skillName ?? "(unknown)") + " can't be added: ";
			}
			msg += replayResult.invalidReason;
			window.alert(msg);
		}
	}

	// assumes newRecord can be replayed exactly
	applyEditedRecord(newRecord : Record) {
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
			removeTrailingIdleTime: true
		});
		console.assert(replayResult.success);

		// copy selection
		let displayedItr = this.record.getFirstAction();
		let inItr = newRecord.getFirstAction();
		let firstSelected : ActionNode | undefined = undefined;
		let lastSelected : ActionNode | undefined = undefined;
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

	#updateTotalDamageStats() {
		let damageStats = calculateDamageStats({
			tinctureBuffPercentage: this.#tinctureBuffPercentage,
			lastDamageApplicationTime: this.#lastDamageApplicationTime
		});
		// display
		updateDamageStats(damageStats);
	}

	#updateSelectedDamageStats() {
		let stats = calculateSelectedStats({
			tinctureBuffPercentage: this.#tinctureBuffPercentage,
			lastDamageApplicationTime: this.#lastDamageApplicationTime
		});
		// display
		updateSelectedStats(stats);
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
	getUntargetableMask() { return this.#untargetableMask; }

	getMaxTicks(untilRawTime: number) {
		let cnt = 0;
		this.#thunderDotTickTimes.forEach(rt => {
			if (!bossIsUntargetable(rt - this.gameConfig.countdown) && rt <= untilRawTime) {
				cnt++;
			}
		});
		return cnt;
	}

	getDotCoverageTimeFraction(untilDisplayTime: number) {
		if (untilDisplayTime <= Debug.epsilon) return 0;
		let coveredTime = 0;
		this.#thunderDoTCoverageTimes.forEach(section=>{
			if (section.tStartDisplay <= untilDisplayTime) {
				let startTime = Math.max(0, section.tStartDisplay);
				let endTime = (section.tEndDisplay!==undefined && section.tEndDisplay <= untilDisplayTime) ? section.tEndDisplay : untilDisplayTime;
				endTime = Math.max(0, endTime);
				coveredTime += getTargetableDurationBetween(startTime, endTime);
			}
		});
		let totalTime = getTargetableDurationBetween(0, untilDisplayTime);
		return coveredTime / totalTime;
	}

	getTimelineRenderingProps(): TimelineRenderingProps {
		let showSelection : boolean = this.record.getFirstSelection() != null && this.record.getLastSelection() != null;
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
			slotElements: this.timeline.slots,
			activeSlotIndex: this.timeline.activeSlotIndex,
			allMarkers: this.timeline.getAllMarkers(),
			untargetableMarkers: this.timeline.getUntargetableMarkers(),
			buffMarkers: this.timeline.getBuffMarkers(),
			showSelection: showSelection,
			selectionStartDisplayTime: (this.record.getFirstSelection()?.tmp_startLockTime ?? 0) - this.gameConfig.countdown,
			selectionEndDisplayTime: (this.record.getLastSelection()?.tmp_endLockTime ?? 0) - this.gameConfig.countdown
		};
	}

	reportWarning(type: WarningType) {
		if (!this.#bCalculatingHistoricalState) {
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
		p.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) pot = true;
		});

		if (!this.#bCalculatingHistoricalState) {
			let sourceDesc = "{skill}@" + p.sourceTime.toFixed(3);
			if (p.description.length > 0) sourceDesc += " " + p.description;
			this.timeline.addElement({
				type: ElemType.DamageMark,
				potency: p,
				buffs: pot ? [ResourceType.Tincture] : [],
				time: this.game.time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
				sourceSkill: p.sourceSkill
			});

			// time, damageSource, potency, cumulativePotency
			this.#damageLogCsv.push({
				time: this.game.getDisplayTime(),
				damageSource: p.sourceSkill + "@" + p.sourceTime,
				// tincture is applied when actually exporting for download.
				potency: p.getAmount({tincturePotencyMultiplier: 1, includePartyBuffs: true}),
				buffs: pot ? [ResourceType.Tincture] : [],
			});
		}

		this.#updateTotalDamageStats();
	}

	reportLucidTick(time: number, sourceDesc: string) {
		if (!this.#bCalculatingHistoricalState) {
			this.timeline.addElement({
				type: ElemType.LucidMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	reportManaTick(time: number, sourceDesc: string) {
		if (!this.#bCalculatingHistoricalState) {
			this.timeline.addElement({
				type: ElemType.MPTickMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				sourceDesc: sourceDesc,
			});
		}
	}

	reportDotTick(rawTime: number) {
		if (!this.#bCalculatingHistoricalState) {
			this.#thunderDotTickTimes.push(rawTime)
			this.updateStats();
		}
	}

	reportDotStart(displayTime: number) {
		if (!this.#bCalculatingHistoricalState) {
			let len = this.#thunderDoTCoverageTimes.length;
			console.assert(len === 0 || this.#thunderDoTCoverageTimes[len-1].tEndDisplay!==undefined);
			this.#thunderDoTCoverageTimes.push({
				tStartDisplay: displayTime,
				tEndDisplay: undefined
			});
		}
	}

	reportDotDrop(displayTime: number) {
		if (!this.#bCalculatingHistoricalState) {
			let len = this.#thunderDoTCoverageTimes.length;
			console.assert(len > 0 && this.#thunderDoTCoverageTimes[len-1].tEndDisplay===undefined);
			this.#thunderDoTCoverageTimes[len-1].tEndDisplay = displayTime;
		}
	}

	updateStatusDisplay(game: GameState) {
		// resources
		let eno = game.resources.get(ResourceType.Enochian);
		let enoCountdown: number;
		if (eno.available(1) && !eno.pendingChange) {
			enoCountdown = 15;
		} else {
			enoCountdown = game.resources.timeTillReady(ResourceType.Enochian);
		}

		let resourcesData = {
			mana: game.resources.get(ResourceType.Mana).availableAmount(),
			timeTillNextManaTick: game.resources.timeTillReady(ResourceType.Mana),
			enochianCountdown: enoCountdown,
			astralFire: game.getFireStacks(),
			umbralIce: game.getIceStacks(),
			umbralHearts: game.resources.get(ResourceType.UmbralHeart).availableAmount(),
			paradox: game.resources.get(ResourceType.Paradox).availableAmount(),
			astralSoul: game.resources.get(ResourceType.AstralSoul).availableAmount(),
			polyglotCountdown: eno.available(1) ? game.resources.timeTillReady(ResourceType.Polyglot) : 30,
			polyglotStacks: game.resources.get(ResourceType.Polyglot).availableAmount(),

			portrait: game.resources.get(ResourceType.Portrait).availableAmount(),
			depictions: game.resources.get(ResourceType.Depictions).availableAmount(),
			creatureCanvas: game.resources.get(ResourceType.CreatureCanvas).availableAmount(),
			weaponCanvas: game.resources.get(ResourceType.WeaponCanvas).availableAmount(),
			landscapeCanvas: game.resources.get(ResourceType.LandscapeCanvas).availableAmount(),
			paletteGauge: game.resources.get(ResourceType.PaletteGauge).availableAmount(),
			paint: game.resources.get(ResourceType.Paint).availableAmount(),
			hasComet: game.resources.get(ResourceType.MonochromeTones).available(1),
		};
		// locks
		let cast = game.resources.get(ResourceType.NotCasterTaxed);
		let anim = game.resources.get(ResourceType.NotAnimationLocked);
		let gcd = game.cooldowns.get(ResourceType.cd_GCD);
		let resourceLocksData = {
			gcdReady: gcd.stacksAvailable() > 0,
			gcd: gcd.currentStackCd(),
			timeTillGCDReady: game.cooldowns.timeTillAnyStackAvailable(ResourceType.cd_GCD),
			castLocked: game.resources.timeTillReady(ResourceType.NotCasterTaxed) > 0,
			castLockTotalDuration: cast.pendingChange ? cast.pendingChange.delay : 0,
			castLockCountdown: game.resources.timeTillReady(ResourceType.NotCasterTaxed),
			animLocked: game.resources.timeTillReady(ResourceType.NotAnimationLocked) > 0,
			animLockTotalDuration: anim.pendingChange ? anim.pendingChange.delay : 0,
			animLockCountdown: game.resources.timeTillReady(ResourceType.NotAnimationLocked),
			canMove: game.resources.get(ResourceType.Movement).available(1),
		};
		// enemy buffs
		let enemyBuffsData = {
			DoTCountdown: game.resources.timeTillReady(ResourceType.ThunderDoT),
			addleCountdown: game.resources.timeTillReady(ResourceType.Addle)
		};
		// self buffs
		let selfBuffsData = {
			leyLinesEnabled: game.resources.get(ResourceType.LeyLines).enabled,
			leyLinesCountdown: game.resources.timeTillReady(ResourceType.LeyLines),
			triplecastCountdown: game.resources.timeTillReady(ResourceType.Triplecast),
			triplecastStacks: game.resources.get(ResourceType.Triplecast).availableAmount(),
			firestarterCountdown: game.resources.timeTillReady(ResourceType.Firestarter),
			thunderheadCountdown: game.resources.timeTillReady(ResourceType.Thunderhead),
			manawardCountdown: game.resources.timeTillReady(ResourceType.Manaward),
			swiftcastCountdown: game.resources.timeTillReady(ResourceType.Swiftcast),
			lucidDreamingCountdown: game.resources.timeTillReady(ResourceType.LucidDreaming),
			surecastCountdown: game.resources.timeTillReady(ResourceType.Surecast),
			tinctureCountdown: game.resources.timeTillReady(ResourceType.Tincture),
			sprintCountdown: game.resources.timeTillReady(ResourceType.Sprint),

			aetherhuesCountdown: game.resources.timeTillReady(ResourceType.Aetherhues),
			aetherhuesStacks: game.resources.get(ResourceType.Aetherhues).availableAmount(),
			monochromeTones: game.resources.get(ResourceType.MonochromeTones).availableAmount(),
			subtractivePalette: game.resources.get(ResourceType.SubtractivePalette).availableAmount(),
			subtractiveSpectrumCountdown: game.resources.timeTillReady(ResourceType.SubtractiveSpectrum),
			starryMuseCountdown: game.resources.timeTillReady(ResourceType.StarryMuse),
			hyperphantasiaCountdown: game.resources.timeTillReady(ResourceType.Hyperphantasia),
			hyperphantasiaStacks: game.resources.get(ResourceType.Hyperphantasia).availableAmount(),
			inspirationEnabled: game.resources.get(ResourceType.Inspiration).enabled,
			inspirationCountdown: game.resources.timeTillReady(ResourceType.Inspiration),
			rainbowBrightCountdown: game.resources.timeTillReady(ResourceType.RainbowBright),
			starstruckCountdown: game.resources.timeTillReady(ResourceType.Starstruck),
			hammerTimeCountdown: game.resources.timeTillReady(ResourceType.HammerTime),
			hammerTimeStacks: game.resources.get(ResourceType.HammerTime).availableAmount(),
			temperaCoatCountdown: game.resources.timeTillReady(ResourceType.TemperaCoat),
			temperaGrassaCountdown: game.resources.timeTillReady(ResourceType.TemperaGrassa),
			smudgeCountdown: game.resources.timeTillReady(ResourceType.Smudge),
		};
		if (typeof updateStatusDisplay !== "undefined") {
			updateStatusDisplay({
				time: game.getDisplayTime(),
				resources: resourcesData,
				resourceLocks: resourceLocksData,
				enemyBuffs: enemyBuffsData,
				selfBuffs: selfBuffsData
			});
		}
	}

	updateTimelineDisplay() {
		this.timeline.setTimeSegment(0, this.game.time);

		updateSkillSequencePresetsView();
		refreshTimelineEditor();

		this.timeline.updateElem({
			type: ElemType.s_Cursor,
			time: this.game.time,
			displayTime: this.game.getDisplayTime()
		});
		this.timeline.drawElements();
	}

	updateSkillButtons(game: GameState) {
		let paradoxReady = game.resources.get(ResourceType.Paradox).availableAmount() > 0;
		let retraceReady = game.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0;

		updateSkillButtons(displayedSkills.map((skillName: SkillName) => {
			return game.getSkillAvailabilityStatus(skillName);
		}), paradoxReady, retraceReady);
	}

	#requestTick(props: {
		deltaTime: number,
		separateNode: boolean,
		prematureStopCondition?: () => boolean,
	}) {
		if (props.deltaTime > 0) {
			let timeTicked = this.game.tick(
				props.deltaTime,
				props.prematureStopCondition ? props.prematureStopCondition : ()=>{ return false; });

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

	setTimeControlSettings(props: { timeScale: number; tickMode: TickMode; }) {
		this.timeScale = props.timeScale;
		this.tickMode = props.tickMode;
		this.shouldLoop = false;
		this.lastAttemptedSkill = "";
	}

	setConfigAndRestart(props: {
		spellSpeed: number,
		criticalHit: number,
		directHit: number,
		determination: number,
		animationLock: number,
		fps: number,
		gcdSkillCorrection: number,
		timeTillFirstManaTick: number,
		countdown: number,
		randomSeed: string,
		procMode: ProcMode,
		initialResourceOverrides: any[],
	}) {
		this.gameConfig = new GameConfig({
			...props,
			shellVersion: ShellInfo.version,
		});

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();
		this.#applyResourceOverrides(this.gameConfig);

		this.autoSave();
	}

	getDisplayedGame() : GameState {
		return this.displayingUpToDateGameState ? this.game : this.savedHistoricalGame;
	}

	getSkillInfo(props: {game: GameState, skillName: SkillName}) {
		return props.game.getSkillAvailabilityStatus(props.skillName);
	}

	#playPause(props: { shouldLoop: boolean; }) {
		let newShouldLoop = props.shouldLoop;
		if (this.shouldLoop === newShouldLoop) return;

		this.shouldLoop = newShouldLoop;

		if (this.shouldLoop) {
			this.#runLoop(()=>{
				return this.shouldLoop
			});
		}
	}

	#fastForward() {
		let deltaTime: number = this.game.timeTillAnySkillAvailable();
		this.#requestTick({deltaTime: deltaTime, separateNode: false});
	}

	#useSkill(
		skillName: SkillName,
		bWaitFirst: boolean,
		overrideTickMode: TickMode = this.tickMode
	) {
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({deltaTime: status.timeTillAvailable, separateNode: false});

			if ((skillName === SkillName.Fire || skillName === SkillName.Blizzard)
				&& this.game.resources.get(ResourceType.Paradox).available(1))
			{
				// automatically turn F1/B1 into paradox if conditions are met
				skillName = SkillName.Paradox;
			} else if (skillName === SkillName.Paradox
				&& !this.game.resources.get(ResourceType.Paradox).available(1))
			{
				// and vice versa
				if (this.game.getFireStacks() > 0) skillName = SkillName.Fire;
				else if (this.game.getIceStacks() > 0) skillName = SkillName.Blizzard;
			}
			status = this.game.getSkillAvailabilityStatus(skillName);
			this.lastAttemptedSkill = "";
		}

		if (status.status === SkillReadyStatus.Blocked || status.status === SkillReadyStatus.NotInCombat) {
			this.lastAttemptedSkill = skillName;
		}

		if (status.status === SkillReadyStatus.Ready) {
			let node = new ActionNode(ActionType.Skill);
			node.skillName = skillName;
			node.waitDuration = 0;
			this.record.addActionNode(node);

			this.game.useSkill(skillName, node);
			if (overrideTickMode === TickMode.RealTimeAutoPause) {
				this.shouldLoop = true;
				this.#runLoop(()=>{
					return this.game.timeTillAnySkillAvailable() > 0;
				});
			}

			let lockDuration = this.game.timeTillAnySkillAvailable();

			node.tmp_startLockTime = this.game.time;
			node.tmp_endLockTime = this.game.time + lockDuration;

			if (!this.#bCalculatingHistoricalState) { // this block is run when NOT viewing historical state (aka run when receiving input)
				let newStatus = this.game.getSkillAvailabilityStatus(skillName); // refresh to get re-captured recast time
				let skillInfo = this.game.skillsList.get(skillName).info;
				let isGCD = skillInfo.cdName === ResourceType.cd_GCD;
				let isSpellCast = status.castTime > 0 && !status.instantCast;
				let snapshotTime = isSpellCast ? status.castTime - GameConfig.getSlidecastWindow(status.castTime) : 0;
				this.timeline.addElement({
					type: ElemType.Skill,
					displayTime: this.game.getDisplayTime(),
					skillName: skillName,
					isGCD: isGCD,
					isSpellCast: isSpellCast,
					time: this.game.time,
					relativeSnapshotTime: snapshotTime,
					lockDuration: lockDuration,
					recastDuration: newStatus.cdRecastTime,
					node: node,
				});
				this.#actionsLogCsv.push({
					time: this.game.getDisplayTime(),
					action: skillName,
					isGCD: isGCD ? 1 : 0,
					castTime: status.instantCast ? 0 : status.castTime
				});
			}

			refreshTimelineEditor();
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
		line: Line,
		replayMode: ReplayMode,
		removeTrailingIdleTime?: boolean,
		maxReplayTime?: number,
		cutoffAction?: ActionNode,
		editedNodes?: ActionNode[], // for ReplayMode.Edited: everything before this should instead use ReplayMode.Exact
		selectionStart?: ActionNode,
		selectionEnd?: ActionNode
	}) : {
		success: boolean,
		firstAddedNode: ActionNode | undefined,
		firstInvalidNode: ActionNode | undefined,
		invalidReason: SkillReadyStatus | undefined
	} {
		// default input, if not provided
		if (props.removeTrailingIdleTime===undefined) props.removeTrailingIdleTime = false;
		if (props.maxReplayTime===undefined) props.maxReplayTime = -1;

		// when checking record validity as well as final application (ReplayMode.Edited), replay exactly until the first edited node
		// and also copy over selection status
		//let firstSelected: ActionNode | undefined = undefined;
		let currentReplayMode = props.replayMode;
		if (props.replayMode === ReplayMode.Edited) {
			currentReplayMode = ReplayMode.Exact;
		}

		let itr = props.line.getFirstAction();
		if (!itr) return {
			success: true,
			firstAddedNode: undefined,
			firstInvalidNode: undefined,
			invalidReason: undefined
		};

		const oldTail = this.record.getLastAction();
		let firstAddedNode = undefined;
		while (itr && itr !== props.cutoffAction) {

			// switch to edited replay past the first edited node
			if (props.replayMode === ReplayMode.Edited
				&& currentReplayMode === ReplayMode.Exact
				&& (this.#inArray(itr, props.editedNodes) || this.#inArray(itr.next, props.editedNodes)))
			{
				currentReplayMode = ReplayMode.Edited;
			}

			let lastIter = false;
			let firstInvalidNode : ActionNode | undefined = undefined;
			let invalidReason : SkillReadyStatus | undefined = undefined;

			// maxReplayTime is used for replay for displaying historical game states (only replay some given duration)
			let waitDuration = itr.waitDuration;
			if (props.maxReplayTime >= 0 &&
				props.maxReplayTime - this.game.time < waitDuration &&
				currentReplayMode === ReplayMode.Exact
			) {
				// hit specified max replay time; everything's valid so far
				waitDuration = props.maxReplayTime - this.game.time;
				lastIter = true;
			}

			// only Exact & validity replays wait nodes
			if (itr.type === ActionType.Wait && (currentReplayMode === ReplayMode.Exact || currentReplayMode === ReplayMode.Edited)) {
				this.#requestTick({
					deltaTime: waitDuration,
					separateNode: true,
				});
				// wait nodes are always valid
			}

			// skill nodes
			else if (itr.type === ActionType.Skill) {

				let waitFirst = currentReplayMode === ReplayMode.SkillSequence || currentReplayMode === ReplayMode.Edited; // true for tight replay; false for exact replay
				let status = this.#useSkill(itr.skillName as SkillName, waitFirst, TickMode.Manual);

				let bEditedTimelineShouldWaitAfterSkill = currentReplayMode === ReplayMode.Edited && (itr.next && itr.next.type === ActionType.Wait);
				if (currentReplayMode === ReplayMode.Exact || bEditedTimelineShouldWaitAfterSkill) {
					if (status.status === SkillReadyStatus.Ready) {
						//======== tick wait block ========
						// qol: clean up this code...
						let deltaTime = 0;
						if (props.maxReplayTime >= 0) {
							deltaTime = waitDuration;
						} else {
							if (props.removeTrailingIdleTime) {
								deltaTime = (itr===props.line.getLastAction() ? this.game.timeTillAnySkillAvailable() : waitDuration);
							} else {
								deltaTime = waitDuration;
							}
						}
						this.#requestTick({
							deltaTime: deltaTime,
							separateNode: false
						});
						//======== tick wait block ========
					}
				}
				else if (currentReplayMode === ReplayMode.SkillSequence || currentReplayMode === ReplayMode.Edited) {
					this.#requestTick({
						deltaTime: this.game.timeTillAnySkillAvailable(),
						separateNode: false
					});
				}
				else {
					lastIter = true;
					console.assert(false);
				}

				if (status.status !== SkillReadyStatus.Ready) {
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = status.status;
				}

				if (this.#bInterrupted) {// likely because enochian dropped before a cast snapshots
					this.#bInterrupted = false;
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = status.status;
				}
			}
			// buff enable/disable also only supported by exact / edited replay
			else if (itr.type === ActionType.SetResourceEnabled && (currentReplayMode === ReplayMode.Exact || currentReplayMode === ReplayMode.Edited)) {
				let success = this.requestToggleBuff(itr.buffName as ResourceType);
				const exact = currentReplayMode === ReplayMode.Exact;
				if (success) {
					this.#requestTick({
						// waitDuration gets auto filled when this node is moved around and causes unwanted gaps on the timeline..
						// current workaround: auto decide whether to respect this info in the record. Could be a bit too hacky..
						deltaTime: exact ? waitDuration : Math.min(waitDuration, this.game.timeTillAnySkillAvailable()),
						separateNode: false
					});
				} else {
					lastIter = true;
					firstInvalidNode = itr;
					invalidReason = SkillReadyStatus.BuffNoLongerAvailable;
				}
			}
			else {
				console.assert(false);
			}

			// now added whatever node it needs to add.

			// for edited replay mode, copy selection:
			if (props.replayMode === ReplayMode.Edited) {
				let lastAdded = this.record.getLastAction() ;
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
				return {
					success: false,
					firstAddedNode: firstAddedNode,
					firstInvalidNode: firstInvalidNode,
					invalidReason: invalidReason
				};
			} else {
				itr = itr.next;
			}

		}
		return {
			success: true,
			firstAddedNode: firstAddedNode,
			firstInvalidNode: undefined,
			invalidReason: undefined
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
		this.#playPause({shouldLoop: false});
		this.autoSave();

		this.record.unselectAll();
		console.assert(this.timeline.loadSlot(slot));
		this.displayCurrentState();
	}

	getDamageLogCsv() : any[][] {
		let csvRows = this.#damageLogCsv.map(row=>{
			let pot = false;
			row.buffs.forEach(b=>{
				if (b===ResourceType.Tincture) pot = true;
			});
			let potency = row.potency;
			if (pot) potency *= this.getTincturePotencyMultiplier();
			return [row.time, row.damageSource, potency];
		});
		return [["time", "damageSource", "potency"]].concat(csvRows as any[][]);
	}

	getActionsLogCsv() : any[][] {
		let csvRows = this.#actionsLogCsv.map(row=>{ return [
			row.time,
			row.action,
			row.isGCD,
			row.castTime
		]; });
		return [["time", "action", "isGCD", "castTime"]].concat(csvRows as any[][]);
	}

	// generally used for trying to add a line to the current timeline
	tryAddLine(line: Line, replayMode=ReplayMode.SkillSequence) {
		this.#bAddingLine = true;

		let replayResult = this.#replay({line: line, replayMode: replayMode});
		if (!replayResult.success) {
			this.rewindUntilBefore(replayResult.firstAddedNode, false);
			window.alert('Failed to add line "' + line.name + '" due to insufficient resources and/or stats mismatch.');
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

	reportInterruption(props: {failNode: ActionNode}) {
		if (!this.#bCalculatingHistoricalState) {
			window.alert("cast failed! Resources for " + props.failNode.skillName + " are no longer available");
			console.warn("failed: " + props.failNode.skillName);
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
				removeTrailingIdleTime: removeTrailingIdleTime
			});
		}
	}

	removeTrailingIdleTime() {

		// first remove any non-skill nodes in the end
		let lastSkill = this.record.getLastAction(node=>{ return node.type === ActionType.Skill; });
		if (!lastSkill) {
			// no skill has been used yet - delete everything.
			this.rewindUntilBefore(this.record.getFirstAction(), true);
		} else { // there are nodes after the last skill
			this.rewindUntilBefore(lastSkill.next, true);
		}
	}

	waitTillNextMpOrLucidTick() {
		this.#requestTick({deltaTime: this.game.timeTillNextMpGainEvent(), separateNode: true});
		this.updateAllDisplay();
	}

	requestUseSkill(props: { skillName: SkillName; }) {
		if (this.tickMode === TickMode.RealTimeAutoPause && this.shouldLoop) {
			// not sure should allow any control here.
		} else {
			let waitFirst = props.skillName === this.lastAttemptedSkill;
			let status = this.#useSkill(props.skillName, waitFirst);
			if (status.status === SkillReadyStatus.Ready) {
				this.scrollToTime(this.game.time);
				this.autoSave();
			}
		}
	}

	requestToggleBuff(buffName: ResourceType) {
		let success = this.game.requestToggleBuff(buffName); // currently always succeeds
		if (!success) return false;

		let node = new ActionNode(ActionType.SetResourceEnabled);
		node.buffName = buffName;
		this.record.addActionNode(node);

		this.#actionsLogCsv.push({
			time: this.game.getDisplayTime(),
			action: "Toggle buff: " + buffName,
			isGCD: 0,
			castTime: 0
		});

		return true;
	}

	scrollToTime(t?: number) {
		let targetT = t === undefined ? this.game.time : t;
		// the most adhoc hack ever...
		setTimeout(()=>{
			scrollTimelineTo(StaticFn.positionFromTimeAndScale(targetT, this.timeline.scale));
		}, 0);
	}

	#runLoop(loopCondition: () => boolean) {

		let prevTime = 0;
		let ctrl = this;

		const loopFn = function(time: number) {
			if (prevTime === 0) { // first frame
				prevTime = time;
				// start
				// ...
			}
			let dt = (time - prevTime) / 1000 * ctrl.timeScale;

			// update (skills queue)
			// dequeue skills at the start of each frame - if the skill is actually ready before the last frame is finished,
			// will leave a small gap between skills... OOF

			// tick until (1) dt, or (2) exactly when the last skill is finished, whichever comes first
			// if (2), dequeue the next skill if there is one, then tick the rest of dt

			let tryDequeueSkill = ()=>{
				let numSkillsProcessed = 0;
				for (let i = 0; i < ctrl.skillsQueue.length; i++) {
					let status = ctrl.#useSkill(ctrl.skillsQueue[i].skillName, true);
					if (status.status === SkillReadyStatus.Ready) {
						ctrl.scrollToTime(ctrl.game.time);
						ctrl.autoSave();
					}
					ctrl.skillsQueue[i].timeInQueue += dt;
					if (ctrl.skillsQueue[i].timeInQueue >= ctrl.skillMaxTimeInQueue) {
						numSkillsProcessed++;
					}
				}
				ctrl.skillsQueue.splice(0, numSkillsProcessed);
			};

			tryDequeueSkill();

			// advance by dt, but potentially dequeue another skill in between
			let timeTillAnySkillAvailable = ctrl.game.timeTillAnySkillAvailable();
			if (timeTillAnySkillAvailable >= dt) {
				ctrl.#requestTick({
					deltaTime : dt,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
			} else {
				ctrl.#requestTick({
					deltaTime : timeTillAnySkillAvailable,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
				tryDequeueSkill(); // potentially sandwich another skill here
				ctrl.#requestTick({
					deltaTime : dt - timeTillAnySkillAvailable,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
			}

			// update display
			ctrl.updateAllDisplay();

			// end of frame
			prevTime = time;
			if (loopCondition()) {
				requestAnimationFrame(loopFn);
			}
			else {
				ctrl.shouldLoop = false;
				ctrl.autoSave();
				setRealTime(false);
			}
		}
		setRealTime(true);
		requestAnimationFrame(loopFn);
	}

	step(t: number) {
		this.#requestTick({deltaTime: t, separateNode: true});
		this.updateAllDisplay();
	}

	#handleKeyboardEvent_RealTimeAutoPause(evt: { shiftKey: boolean; keyCode: number; }) {
		if (this.shouldLoop) return;

		if (evt.keyCode===85) { // u (undo)
			this.rewindUntilBefore(this.record.getLastAction(), false);
			this.updateAllDisplay();
			this.autoSave();
		}
	}
	#handleKeyboardEvent_Manual(evt: { keyCode: number; shiftKey: boolean; }) {
		if (evt.keyCode===32) { // space
			this.#fastForward();
			this.updateAllDisplay();
			this.autoSave();
		}
		else if (evt.keyCode===85) { // u (undo)
			this.rewindUntilBefore(this.record.getLastAction(), false);
			this.updateAllDisplay();
			this.autoSave();
		}
	}

	handleKeyboardEvent(evt: { keyCode: number; shiftKey: boolean; }) {
		// console.log(evt.keyCode);
		if (this.displayingUpToDateGameState) {
			if (this.tickMode === TickMode.RealTimeAutoPause) {
				this.#handleKeyboardEvent_RealTimeAutoPause(evt);
			} else if (this.tickMode === TickMode.Manual) {
				this.#handleKeyboardEvent_Manual(evt);
			}
		}
	}
}
export const controller = new Controller();
