import {addLog, Color, LogCategory, ReplayMode, TickMode} from "./Common";
import {GameState} from "../Game/GameState";
import {ProcMode, ResourceType, SkillName, SkillReadyStatus} from "../Game/Common";
import {GameConfig} from "../Game/GameConfig"
// @ts-ignore
import {updateStatusDisplay} from "../Components/StatusDisplay";
// @ts-ignore
import {displayedSkills, updateSkillButtons} from "../Components/Skills";
// @ts-ignore
import {updateConfigDisplay} from "../Components/PlaybackControl"
// @ts-ignore
import {setOverrideOutlineColor, setRealTime} from "../Components/Main";
import {ElemType, Timeline} from "./Timeline"
// @ts-ignore
import {scrollTimelineTo, updateStatsDisplay, updateTimelineView} from "../Components/Timeline";
import {ActionNode, ActionType, Line, Record} from "./Record";
import {PresetLinesManager} from "./PresetLinesManager";
// @ts-ignore
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";
import {refreshTimelineEditor} from "../Components/TimelineEditor";
import {StaticFn} from "../Components/Common";
import {TimelineRenderingProps} from "../Components/TimelineCanvas";

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
	#statsCsv : {
		time: number,
		damageSource: string,
		potency: number,
		buffs: ResourceType[]
	}[] = [];

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

		this.gameConfig = new GameConfig();
		this.gameConfig.spellSpeed = 1532;
		this.gameConfig.countdown = 5;
		this.gameConfig.randomSeed = "sup";
		this.gameConfig.casterTax = 0.1;
		this.gameConfig.animationLock = 0.7;
		this.gameConfig.timeTillFirstManaTick = 1.2;
		this.gameConfig.procMode = ProcMode.RNG;
		this.gameConfig.extendedBuffTimes = false;
		this.game = new GameState(this.gameConfig, 1);

		this.record = new Record();
		this.record.config = this.gameConfig;

		// meaningless at the beginning
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;

		this.#requestRestart();
	}

	updateAllDisplay(game: GameState = this.game) {
		updateConfigDisplay(game.config.serialized());
		this.updateStatusDisplay(game);
		this.updateSkillButtons(game);
		this.updateTimelineDisplay();
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
		setOverrideOutlineColor("darkorange");
		let tmpGame = this.game;
		let tmpRecord = this.record;
		this.lastAttemptedSkill = "";
		//============^ stashed states ^============

		fn();

		//============v pop stashed states v============
		this.#bCalculatingHistoricalState = false;
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.game = tmpGame;
		this.record = tmpRecord;
	}

	checkRecordValidity(inRecord: Record) {

		console.assert(inRecord.config !== undefined);

		let result: {isValid: boolean, firstInvalidAction: ActionNode | undefined, invalidReason: string | undefined} = {
			isValid: true,
			firstInvalidAction: undefined,
			invalidReason: undefined
		}

		this.#sandboxEnvironment(()=>{

			// create environment
			let cfg = inRecord.config ?? this.gameConfig;
			this.game = new GameState(cfg, 1);
			this.record = new Record();
			this.record.config = cfg;

			// apply resource overrides
			this.#applyResourceOverrides(this.record.config);

			// replay skills sequence
			let status = this.#replay({
				line: inRecord,
				replayMode: ReplayMode.Edited,
				suppressLog: true,
			});

			result.isValid = status.success;
			result.firstInvalidAction = status.firstInvalidNode;
			result.invalidReason = status.invalidReason;
		});

		return result;

	}

	// max replay time; cutoff action
	displayHistoricalState(time: number, cutoffAction?: ActionNode) {
		this.displayingUpToDateGameState = false;
		this.#bCalculatingHistoricalState = true;
		setOverrideOutlineColor("darkorange");
		let tmpGame = this.game;
		let tmpRecord = this.record;
		this.lastAttemptedSkill = "";
		//============^ stashed states ^============

		this.game = new GameState(this.gameConfig, this.game.getTincturePotencyMultiplier());
		this.record = new Record();
		this.record.config = this.gameConfig;

		// apply resource overrides
		this.#applyResourceOverrides(this.record.config);

		// clear stats
		this.updateCumulativeStatsDisplay();

		// replay skills sequence
		this.#replay({
			line: tmpRecord,
			replayMode: ReplayMode.Exact,
			suppressLog: true,
			maxReplayTime: time,
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
		// timeline
		this.timeline.drawElements();

		//============v pop stashed states v============
		this.#bCalculatingHistoricalState = false;
		this.savedHistoricalGame = this.game;
		this.savedHistoricalRecord = this.record;
		this.game = tmpGame;
		this.record = tmpRecord;
	}

	displayCurrentState() {
		this.displayingUpToDateGameState = true;
		this.timeline.updateElem({
			type: ElemType.s_ViewOnlyCursor,
			enabled: false,
			time: 0,
			displayTime: 0
		});
		setOverrideOutlineColor(undefined);
		this.updateAllDisplay(this.game);
		this.updateCumulativeStatsDisplay();
	}

	#requestRestart() {
		this.lastAttemptedSkill = ""
		this.game = new GameState(this.gameConfig, this.game.getTincturePotencyMultiplier());
		this.#playPause({shouldLoop: false});
		this.timeline.reset();
		this.record.unselectAll();
		this.#statsCsv = [];
		this.#bAddingLine = false;
		this.#bInterrupted = false;
		this.displayingUpToDateGameState = true;
		let gcd = this.game.config.adjustedCastTime(2.5).toFixed(2);
		addLog(
			LogCategory.Action,
			"======== RESET (GCD=" + gcd + ") ========",
			this.game.getDisplayTime(),
			Color.Grey);
		addLog(
			LogCategory.Event,
			"======== RESET (GCD=" + gcd + ") ========",
			this.game.getDisplayTime(),
			Color.Grey);
	}

	getPresetLines() {
		return this.#presetLinesManager.presetLines;
	}

	serializedPresets() {
		return this.#presetLinesManager.serialized();
	}

	// todo: cleanup?
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
		if (content.config.extendedBuffTimes === undefined) {
			content.config.extendedBuffTimes = false;
		}
		if (content.config.procMode === undefined) { // for backward compatibility
			if (content.config.rngProcs!==undefined) {
				content.config.procMode = content.config.rngProcs ? ProcMode.RNG : ProcMode.Never;
			} else {
				content.config.procMode = ProcMode.RNG;
			}
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
			replayMode: ReplayMode.Edited,
			removeTrailingIdleTime: true
		});
		console.assert(replayResult.success);
		this.autoSave();
	}

	#getPotencyStatsBySkill() {
		let m = new Map<SkillName, {count: number, potencySum: number}>();
		this.record.iterateAll(node=>{
			if (node.skillName!==undefined && node.resolved()) {
				let entry = m.get(node.skillName) ?? {count: 0, potencySum: 0};
				entry.count += 1;
				entry.potencySum += node.getPotency() * (node.hasBuff(ResourceType.Tincture) ? this.game.getTincturePotencyMultiplier() : 1);
				m.set(node.skillName, entry);
			}
		});
		return m;
	}

	// called by reset, reportDamage, displayCurrentState
	updateCumulativeStatsDisplay() {
		let cumulativePotency = this.game.getCumulativePotency();
		let totalTime = this.game.getLastDamageApplicationDisplayTime();

		let gcdSkills = 0;
		this.record.iterateAll(node=>{
			if (node.type === ActionType.Skill && node.resolved() && node.skillName) {
				let skillInfo = this.game.skillsList.get(node.skillName);
				if (skillInfo.info.cdName === ResourceType.cd_GCD) gcdSkills++;
			}
		});

		updateStatsDisplay({
			cumulativePotency: cumulativePotency,
			cumulativeDuration: Math.max(0, totalTime),
			historical: this.#bCalculatingHistoricalState,
			statsBySkill: this.#getPotencyStatsBySkill(),
			gcdCount: gcdSkills
		});
	}
	setTincturePotencyMultiplier(inMultiplier: number) {
		// updates cumulative sum
		this.game.setTincturePotencyMultiplier(inMultiplier);
		// refresh stats
		let selectedPotency = 0;
		this.record.iterateSelected(node=>{
			selectedPotency += node.getPotency() * (node.hasBuff(ResourceType.Tincture) ? inMultiplier : 1);
		});
		updateStatsDisplay({
			cumulativePotency: this.game.getCumulativePotency(),
			selectedPotency: selectedPotency,
			statsBySkill: this.#getPotencyStatsBySkill()
		});
		this.displayCurrentState();
		updateTimelineView();
	}

	getTimelineRenderingProps(): TimelineRenderingProps {
		return {
			timelineWidth: this.timeline.getCanvasWidth(),
			timelineHeight: this.timeline.getCanvasHeight(),
			countdown: this.gameConfig.countdown,
			scale: this.timeline.scale,
			tincturePotencyMultiplier: this.game.getTincturePotencyMultiplier(),
			elements: this.timeline.elements,
			markers: this.timeline.markers,
			selectionStartX: this.timeline.positionFromTime(this.record.getFirstSelection()?.tmp_startLockTime ?? 0),
			selectionEndX: this.timeline.positionFromTime(this.record.getLastSelection()?.tmp_endLockTime ?? 0)
		};
	}


	reportDamage(props: {
		potency: number,
		source: string,
		buffs: ResourceType[]
	}) {
		if (!this.#bCalculatingHistoricalState) {
			this.timeline.addElement({
				type: ElemType.DamageMark,
				potency: props.potency,
				buffs: props.buffs,
				time: this.game.time,
				displayTime: this.game.getDisplayTime(),
				source: props.source
			});

			// time, damageSource, potency, cumulativePotency
			this.#statsCsv.push({
				time: this.game.getDisplayTime(),
				damageSource: props.source,
				potency: props.potency,
				buffs: props.buffs
			});
		}

		this.updateCumulativeStatsDisplay();
	}

	reportLucidTick(time: number, source: string) {
		if (!this.#bCalculatingHistoricalState) {
			this.timeline.addElement({
				type: ElemType.LucidMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				source: source,
			});
		}
	}

	reportManaTick(time: number, source: string) {
		if (!this.#bCalculatingHistoricalState) {
			this.timeline.addElement({
				type: ElemType.MPTickMark,
				time: time,
				displayTime: this.game.getDisplayTime(),
				source: source,
			});
		}
	}

	updateStatusDisplay(game: GameState) {
		// resources
		let eno = game.resources.get(ResourceType.Enochian);
		let resourcesData = {
			mana: game.resources.get(ResourceType.Mana).availableAmount(),
			timeTillNextManaTick: game.resources.timeTillReady(ResourceType.Mana),
			enochianCountdown: game.resources.timeTillReady(ResourceType.Enochian),
			astralFire: game.getFireStacks(),
			umbralIce: game.getIceStacks(),
			umbralHearts: game.resources.get(ResourceType.UmbralHeart).availableAmount(),
			paradox: game.resources.get(ResourceType.Paradox).availableAmount(),
			polyglotCountdown: eno.available(1) ? game.resources.timeTillReady(ResourceType.Polyglot) : 30,
			polyglotStacks: game.resources.get(ResourceType.Polyglot).availableAmount()
		};
		// locks
		let cast = game.resources.get(ResourceType.NotCasterTaxed);
		let anim = game.resources.get(ResourceType.NotAnimationLocked);
		let gcd = game.cooldowns.get(ResourceType.cd_GCD);
		let resourceLocksData = {
			gcdReady: gcd.stacksAvailable() > 0,
			gcd: gcd.currentStackCd(),
			timeTillGCDReady: game.cooldowns.timeTillNextStackAvailable(ResourceType.cd_GCD),
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
			sharpcastCountdown: game.resources.timeTillReady(ResourceType.Sharpcast),
			triplecastCountdown: game.resources.timeTillReady(ResourceType.Triplecast),
			firestarterCountdown: game.resources.timeTillReady(ResourceType.Firestarter),
			thundercloudCountdown: game.resources.timeTillReady(ResourceType.Thundercloud),
			manawardCountdown: game.resources.timeTillReady(ResourceType.Manaward),
			swiftcastCountdown: game.resources.timeTillReady(ResourceType.Swiftcast),
			lucidDreamingCountdown: game.resources.timeTillReady(ResourceType.LucidDreaming),
			surecastCountdown: game.resources.timeTillReady(ResourceType.Surecast),
			tinctureCountdown: game.resources.timeTillReady(ResourceType.Tincture),
			sprintCountdown: game.resources.timeTillReady(ResourceType.Sprint)
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
		updateSkillButtons(displayedSkills.map((skillName: SkillName) => {
			return game.getSkillAvailabilityStatus(skillName);
		}));
	}

	#requestTick(props: {
		deltaTime: number,
		suppressLog: boolean,
		separateNode: boolean,
		prematureStopCondition?: () => boolean,
	}) {
		if (props.deltaTime > 0) {
			let timeTicked = this.game.tick(
				props.deltaTime,
				props.prematureStopCondition ? props.prematureStopCondition : ()=>{ return false; });
			if (!props.suppressLog) {
				addLog(
					LogCategory.Action,
					"wait for " + props.deltaTime.toFixed(3) + "s",
					this.game.getDisplayTime(),
					Color.Grey);
			}

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

	setConfigAndRestart(props={
		spellSpeed: 1268,
		animationLock: 0.66,
		casterTax: 0.06,
		timeTillFirstManaTick: 0.3,
		countdown: 5,
		randomSeed: "hello.",
		procMode: ProcMode.RNG,
		extendedBuffTimes: false,
		initialResourceOverrides: []
	}) {
		this.gameConfig = new GameConfig(props);

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

	getResourceValue(props: {rscType: ResourceType}) {
		if (props.rscType) {
			return this.game.resources.get(props.rscType).availableAmount();
		}
		return -1;
	}

	#playPause(props: { shouldLoop: boolean; }) {
		let newShouldLoop = props.shouldLoop;
		if (this.shouldLoop === newShouldLoop) return;

		this.shouldLoop = newShouldLoop;

		if (this.shouldLoop) {
			addLog(LogCategory.Action, "starting real-time control", this.game.getDisplayTime(), Color.Success);
			this.#runLoop(()=>{
				return this.shouldLoop
			});
		} else {
			addLog(LogCategory.Action, "paused", this.game.getDisplayTime(), Color.Success);
		}
	}

	#fastForward() {
		let deltaTime: number = this.game.timeTillAnySkillAvailable();
		this.#requestTick({deltaTime: deltaTime, suppressLog: false, separateNode: false});
	}

	#useSkill(
		skillName: SkillName,
		bWaitFirst: boolean,
		bSuppressLog: boolean = false,
		overrideTickMode: TickMode = this.tickMode
	) {
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({deltaTime: status.timeTillAvailable, suppressLog: bSuppressLog, separateNode: false});
			// automatically turn F1/B1 into paradox if conditions are met
			if ((skillName === SkillName.Fire || skillName === SkillName.Blizzard)
				&& this.game.resources.get(ResourceType.Paradox).available(1)) {
				skillName = SkillName.Paradox;
			}
			status = this.game.getSkillAvailabilityStatus(skillName);
			this.lastAttemptedSkill = "";
		}

		let logString = "";
		let logColor = Color.Text;

		if (status.status === SkillReadyStatus.Ready) {
			logString = "use skill [" + skillName + "]";
			logColor = Color.Success;
		}
		else if (status.status === SkillReadyStatus.Blocked) {
			logString = "["+skillName+"] is not available yet. might be ready in ";
			logString += status.timeTillAvailable.toFixed(3) + ". press again to wait until then and retry";
			logColor = Color.Warning;
			this.lastAttemptedSkill = skillName;
		}
		else if (status.status === SkillReadyStatus.NotEnoughMP) {
			logString = "["+skillName+"] is not ready (not enough MP)";
			logColor = Color.Error;
		}
		else if (status.status === SkillReadyStatus.RequirementsNotMet) {
			logString = "["+skillName+"] requirements are not met";
			if (status.description.length > 0)
				logString += " (need: " + status.description + ")";
			logColor = Color.Error;
		}

		if (!bSuppressLog || status.status === SkillReadyStatus.Ready) {
			addLog(LogCategory.Action, logString, this.game.getDisplayTime(), logColor);
			if (status.status === SkillReadyStatus.Ready) {
				addLog(LogCategory.Event, logString, this.game.getDisplayTime(), logColor);
			}
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

			if (!this.#bCalculatingHistoricalState) { // this block is run when NOT viewing historical state (aka receiving input)
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
			}

			refreshTimelineEditor();
		}
		return status;
	}

	// returns true on success
	#replay(props: {
		line: Line,
		replayMode: ReplayMode,
		suppressLog?: boolean,
		removeTrailingIdleTime?: boolean,
		maxReplayTime?: number,
		cutoffAction?: ActionNode
	}) : {
		success: boolean,
		firstAddedNode: ActionNode | undefined,
		firstInvalidNode: ActionNode | undefined,
		invalidReason: SkillReadyStatus | undefined
	} {
		// default input, if not provided
		if (props.suppressLog===undefined) props.suppressLog = false;
		if (props.removeTrailingIdleTime===undefined) props.removeTrailingIdleTime = false;
		if (props.maxReplayTime===undefined) props.maxReplayTime = -1;

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

			let lastIter = false;
			let firstInvalidNode : ActionNode | undefined = undefined;
			let invalidReason : SkillReadyStatus | undefined = undefined;

			// maxReplayTime is used for replay for displaying historical game states (only replay some given duration)
			let waitDuration = itr.waitDuration;
			if (props.maxReplayTime >= 0 &&
				props.maxReplayTime - this.game.time < waitDuration &&
				props.replayMode === ReplayMode.Exact
			) {
				// hit specified max replay time; everything's valid so far
				waitDuration = props.maxReplayTime - this.game.time;
				lastIter = true;
			}

			// only Exact & validity replays wait nodes
			if (itr.type === ActionType.Wait && (props.replayMode === ReplayMode.Exact || props.replayMode === ReplayMode.Edited)) {
				this.#requestTick({
					deltaTime: waitDuration,
					suppressLog: props.suppressLog,
					separateNode: true,
				});
				// wait nodes are always valid
			}

			// skill nodes
			else if (itr.type === ActionType.Skill) {

				let waitFirst = props.replayMode === ReplayMode.SkillSequence || props.replayMode === ReplayMode.Edited; // true for tight replay; false for exact replay
				let status = this.#useSkill(itr.skillName as SkillName, waitFirst, props.suppressLog, TickMode.Manual);

				if (props.replayMode === ReplayMode.Exact) {
					if (status.status === SkillReadyStatus.Ready) {
						//======== tick wait block ========
						// todo: clean up this code...
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
							suppressLog: props.suppressLog,
							separateNode: false
						});
						//======== tick wait block ========
					}
				}
				else if (props.replayMode === ReplayMode.SkillSequence || props.replayMode === ReplayMode.Edited) {
					this.#requestTick({
						deltaTime: this.game.timeTillAnySkillAvailable(),
						suppressLog: props.suppressLog,
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
			else if (itr.type === ActionType.SetResourceEnabled && (props.replayMode === ReplayMode.Exact || props.replayMode === ReplayMode.Edited)) {
				let success = this.requestToggleBuff(itr.buffName as ResourceType);
				const exact = props.replayMode === ReplayMode.Exact;
				if (success) {
					this.#requestTick({
						// waitDuration gets auto filled when this node is moved around and causes unwanted gaps on the timeline..
						// current workaround: auto decide whether to respect this info in the record. Could be a bit too hacky..
						deltaTime: exact ? waitDuration : Math.min(waitDuration, this.game.timeTillAnySkillAvailable()),
						suppressLog: props.suppressLog,
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
		localStorage.setItem("gameRecord", JSON.stringify(serializedRecord));
	}

	tryAutoLoad() {
		let str = localStorage.getItem("gameRecord");
		if (str !== null) {
			let content = JSON.parse(str);
			this.loadBattleRecordFromFile(content);
		}
	}

	getStatsCsv() : any[][] {
		let csvRows = this.#statsCsv.map(row=>{
			let pot = false;
			row.buffs.forEach(b=>{
				if (b===ResourceType.Tincture) pot = true;
			});
			let potency = row.potency;
			if (pot) potency *= this.game.getTincturePotencyMultiplier();
			return [row.time, row.damageSource, potency];
		});
		return [["time", "damageSource", "potency"]].concat(csvRows as any[][]);
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
		if (this.tickMode !== TickMode.RealTime) {
			window.alert("cast failed! Resources for " + props.failNode.skillName + " are no longer available");
		}
		// if adding from a line, invalidate the whole line
		// if loading from file (shouldn't happen)
		// if real-time / using a skill directly: get rid of this node but don't scrub time back

		console.warn("failed: " + props.failNode.skillName);

		if (this.#bAddingLine) {
			this.#bInterrupted = true;
		} else {
			let currentTime = this.game.time;
			let currentLoop = this.shouldLoop;
			this.rewindUntilBefore(props.failNode, false);
			this.autoSave();
			this.#requestTick({
				deltaTime: currentTime - this.game.time,
				suppressLog: true,
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
				suppressLog: true,
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

	requestUseSkill(props: { skillName: SkillName; }) {
		if (this.tickMode === TickMode.RealTime && this.shouldLoop) {
			this.skillsQueue.push({
				skillName: props.skillName,
				timeInQueue: 0
			});
		} else if (this.tickMode === TickMode.RealTimeAutoPause && this.shouldLoop) {
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
		let success = this.game.requestToggleBuff(buffName);
		if (!success) return false;

		let node = new ActionNode(ActionType.SetResourceEnabled);
		node.buffName = buffName;
		this.record.addActionNode(node);

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
					let status = ctrl.#useSkill(ctrl.skillsQueue[i].skillName, false, true);
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
					suppressLog: true,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
			} else {
				ctrl.#requestTick({
					deltaTime : timeTillAnySkillAvailable,
					suppressLog: true,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
				tryDequeueSkill(); // potentially sandwich another skill here
				ctrl.#requestTick({
					deltaTime : dt - timeTillAnySkillAvailable,
					suppressLog: true,
					separateNode: false,
					prematureStopCondition: ()=>{ return !loopCondition(); }
				});
			}

			// update display
			ctrl.updateAllDisplay();

			// end of frame
			prevTime = time;
			if (loopCondition()) requestAnimationFrame(loopFn);
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
		this.#requestTick({deltaTime: t, suppressLog: false, separateNode: true});
		this.updateAllDisplay();
	}

	#handleKeyboardEvent_RealTime(evt: { keyCode: number; }) {
		if (evt.keyCode===32) { // space
			this.#playPause({shouldLoop: !this.shouldLoop});
		}
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
			if (this.tickMode === TickMode.RealTime) {
				this.#handleKeyboardEvent_RealTime(evt);
			} else if (this.tickMode === TickMode.RealTimeAutoPause) {
				this.#handleKeyboardEvent_RealTimeAutoPause(evt);
			} else if (this.tickMode === TickMode.Manual) {
				this.#handleKeyboardEvent_Manual(evt);
			}
		}
	}
}
export const controller = new Controller();
