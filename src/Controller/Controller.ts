import {addLog, Color, LogCategory, ReplayMode, TickMode} from "./Common";
import {GameState} from "../Game/GameState";
import {GameConfig, ResourceType, SkillName, SkillReadyStatus} from "../Game/Common";
// @ts-ignore
import {updateStatusDisplay} from "../Components/StatusDisplay";
// @ts-ignore
import {displayedSkills, updateSkillButtons} from "../Components/Skills";
// @ts-ignore
import {updateConfigDisplay} from "../Components/PlaybackControl"
// @ts-ignore
import {setRealTime} from "../Components/Main";
import {ElemType, Timeline} from "./Timeline"
// @ts-ignore
import {scrollTimelineTo, updateSelectionDisplay, updateStatsDisplay} from "../Components/Timeline";
import {ActionNode, ActionType, Line, Record} from "./Record";
import {PresetLinesManager} from "./PresetLinesManager";
// @ts-ignore
import {updateSkillSequencePresetsView} from "../Components/SkillSequencePresets";

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
		this.game = new GameState(this.gameConfig);

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();
	}

	updateAllDisplay() {
		updateConfigDisplay(this.gameConfig);
		this.updateStatusDisplay();
		this.updateSkillButtons();
		this.updateTimelineDisplay();
	}

	#requestRestart() {
		this.lastAttemptedSkill = ""
		this.game = new GameState(this.gameConfig);
		this.#playPause({shouldLoop: false});
		this.timeline.reset();
		this.record.unselectAll();
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

	// TODO: cleanup?
	addSelectionToPreset(name="(untitled)") {
		console.assert(this.record.getFirstSelection());
		let line = new Line();
		line.name = name;
		let itr = this.record.getFirstSelection();
		while (itr !== this.record.getLastSelection()?.next ?? undefined) {
			itr = itr as ActionNode;
			line.addActionNode(itr.getClone());
			itr = itr.next;
		}
		this.#presetLinesManager.addLine(line);
	}

	appendFilePresets(content: Fixme) {
		this.#presetLinesManager.deserializeAndAppend(content);
	}

	loadBattleRecordFromFile(content: Fixme) {
		this.gameConfig = new GameConfig();
		this.gameConfig.casterTax = content.config.casterTax;
		this.gameConfig.animationLock = content.config.animationLock;
		this.gameConfig.spellSpeed = content.config.spellSpeed;
		this.gameConfig.timeTillFirstManaTick = content.config.timeTillFirstManaTick;
		this.gameConfig.countdown = content.config.countdown;
		this.gameConfig.randomSeed = content.config.randomSeed;

		this.record = new Record();
		this.record.config = content.config;

		this.#requestRestart();

		// now add the actions
		let line = new Line();
		for (let i = 0; i < content.actions.length; i++) {
			let action = content.actions[i];
			let node = new ActionNode(action.type);
			node.skillName = action.skillName;
			node.waitDuration = action.waitDuration;
			line.addActionNode(node);
		}
		let replayResult = this.#replay(line, ReplayMode.Exact, false);
		console.assert(replayResult);
	}

	updateCumulativeStatsDisplay() {
		let cumulativePotency = 0;
		this.record.iterateAll(itr=>{
			cumulativePotency += itr.tmp_capturedPotency ?? 0;
		});
		let totalTime = this.game.time - this.gameConfig.countdown;
		updateStatsDisplay({
			cumulativePPS: totalTime > 0 ? cumulativePotency / totalTime : 0,
			cumulativeDuration: Math.max(0, totalTime),
		});
	}

	reportPotencyUpdate() {
		this.updateCumulativeStatsDisplay();
	}

	reportDamage(props: { potency: number; time: number; source: string; }) {

		this.timeline.addElement({
			type: ElemType.DamageMark,
			potency: props.potency,
			time: props.time,
			source: props.source
		});

		addLog(
			LogCategory.Event,
			"reporting damage of potency " + props.potency.toFixed(1),
			props.time,
			Color.Damage);
	}

	reportLucidTick(time: number, source: string) {
		this.timeline.addElement({
			type: ElemType.LucidMark,
			time: time,
			source: source,
		});
	}

	reportManaTick(time: number, source: string) {
		this.timeline.addElement({
			type: ElemType.MPTickMark,
			time: time,
			source: source,
		});
	}

	updateStatusDisplay() {
		let game = this.game;
		// resources
		let eno = game.resources.get(ResourceType.Enochian);
		let resourcesData = {
			mana: game.resources.get(ResourceType.Mana).currentValue,
			timeTillNextManaTick: game.resources.timeTillReady(ResourceType.Mana),
			enochianCountdown: game.resources.timeTillReady(ResourceType.Enochian),
			astralFire: game.getFireStacks(),
			umbralIce: game.getIceStacks(),
			umbralHearts: game.resources.get(ResourceType.UmbralHeart).currentValue,
			paradox: game.resources.get(ResourceType.Paradox).currentValue,
			polyglotCountdown: eno.available(1) ? game.resources.timeTillReady(ResourceType.Polyglot) : 30,
			polyglotStacks: game.resources.get(ResourceType.Polyglot).currentValue
		};
		// locks
		let cast = game.resources.get(ResourceType.NotCasterTaxed);
		let anim = game.resources.get(ResourceType.NotAnimationLocked);
		let resourceLocksData = {
			gcdReady: game.cooldowns.get(ResourceType.cd_GCD).stacksAvailable() > 0,
			gcd: 2.5,
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
		this.onTimelineSelectionChanged();
		this.timeline.updateElem({type: ElemType.s_Cursor, time: this.game.time});
		this.timeline.drawElements();
	}

	updateSkillButtons() {
		updateSkillButtons(displayedSkills.map((skillName: SkillName) => {
			return this.game.getSkillAvailabilityStatus(skillName);
		}));
	}

	#requestTick(props: {
		deltaTime: number,
		suppressLog: boolean,
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
			if (lastAction) {
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
	}) {
		this.gameConfig = new GameConfig();
		this.gameConfig.casterTax = props.casterTax;
		this.gameConfig.animationLock = props.animationLock;
		this.gameConfig.spellSpeed = props.spellSpeed;
		this.gameConfig.timeTillFirstManaTick = props.timeTillFirstManaTick;
		this.gameConfig.countdown = props.countdown;
		this.gameConfig.randomSeed = props.randomSeed;

		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();

		this.autoSave();
	}

	getSkillInfo(props: {skillName: SkillName}) {
			return this.game.getSkillAvailabilityStatus(props.skillName);
	}

	getResourceValue(props: {rscType: ResourceType}) {
		if (props.rscType) {
			return this.game.resources.get(props.rscType).currentValue;
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
		this.#requestTick({deltaTime: deltaTime, suppressLog: false});
	}

	#useSkill(skillName: SkillName, bWaitFirst: boolean, bSuppressLog=false, overrideTickMode=this.tickMode) {
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({deltaTime: status.timeTillAvailable, suppressLog: bSuppressLog});
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
			node.tmp_capturedPotency = 0;
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
			let time = this.game.time;

			node.tmp_startLockTime = time;
			node.tmp_endLockTime = time + lockDuration;

			let skillInfo = this.game.skillsList.get(skillName).info;
			let isGCD = skillInfo.cdName === ResourceType.cd_GCD;
			let isSpellCast = status.castTime > 0 && !status.instantCast;
			this.timeline.addElement({
				type: ElemType.Skill,
				skillName: skillName,
				isGCD: isGCD,
				isSpellCast: isSpellCast,
				capturedPotency: node.tmp_capturedPotency,
				time: time,
				lockDuration: lockDuration,
				recastDuration: status.cdRecastTime,
				node: node,
			});
		}
		return status;
	}

	// returns true on success
	#replay(line: Line, replayMode: ReplayMode, suppressLog=false) {
		let itr = line.getFirstAction();
		if (!itr) return true;

		while (itr) {

			// only Exact mode replays wait nodes
			if (itr.type === ActionType.Wait && replayMode === ReplayMode.Exact) {
				this.#requestTick({
					deltaTime: itr.waitDuration,
					suppressLog: suppressLog
				});
			}

			// skill nodes
			else if (itr.type === ActionType.Skill) {
				let waitFirst = replayMode === ReplayMode.Tight;
				let status = this.#useSkill(itr.skillName as SkillName, waitFirst, suppressLog, TickMode.Manual);
				if (replayMode === ReplayMode.Exact) {
					console.assert(status.status === SkillReadyStatus.Ready);
					let deltaTime = itr===line.getLastAction() ?
						this.game.timeTillAnySkillAvailable() : itr.waitDuration;
					this.#requestTick({
						deltaTime: deltaTime,
						suppressLog: suppressLog
					});
				} else if (replayMode === ReplayMode.Tight) {
					this.#requestTick({
						deltaTime: this.game.timeTillAnySkillAvailable(),
						suppressLog: suppressLog
					});
				}
				if (status.status !== SkillReadyStatus.Ready) {
					return false;
				}
			}
			else {
				console.assert(false);
			}

			itr = itr.next;
		}
		return true;
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

	// generally used for trying to add a line to the current timeline
	tryAddLine(line: Line, replayMode=ReplayMode.Tight) {
		let oldTail = this.record.getLastAction();
		let replaySuccessful = this.#replay(line, replayMode, false);
		if (!replaySuccessful) {
			if (oldTail) this.rewindUntilBefore(oldTail.next);
			else { // tried to add line at the start but failed
				/*if (this.record.getFirstAction())*/
				this.rewindUntilBefore(this.record.getFirstAction());
			}
			window.alert('Failed to add line "' + line.name + '" due to insufficient resources and/or stats mismatch.');
			return false;
		} else {
			this.autoSave();
			return true;
		}
	}

	deleteLine(line: Line) {
		this.#presetLinesManager.deleteLine(line);
	}

	deleteAllLines() {
		this.#presetLinesManager.deleteAllLines();
	}

	// basically restart the game and play till here:
	rewindUntilBefore(node: ActionNode | undefined) {
		let replayRecord = this.record;
		let replayRecordHead = replayRecord.getFirstAction();
		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();

		// TODO: cleanup logic
		if (node && replayRecordHead && node !== replayRecord.getFirstAction()) {
			let itr: ActionNode | undefined = replayRecordHead;
			while (itr ? (itr.next !== node) : false) {
				itr = (itr as ActionNode).next;
			}
			(itr as ActionNode).next = undefined;
			replayRecord.tail = itr;
			this.#replay(replayRecord, ReplayMode.Exact, false);
		}
	}

	onTimelineSelectionChanged() {
		let selectionStart = 0;
		let selectionEnd = 0;
		if (this.record.getFirstSelection()) {
			selectionStart = this.record.getFirstSelection()?.tmp_startLockTime ?? 0;
			selectionEnd = this.record.getLastSelection()?.tmp_endLockTime ?? 0;
		} else {
			updateStatsDisplay({
				selectedPotency: 0,
				selectedDuration: 0,
			});
		}
		updateSelectionDisplay(
			this.timeline.positionFromTime(selectionStart), this.timeline.positionFromTime(selectionEnd));
		updateSkillSequencePresetsView();

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
	scrollToTime(t?: number) {
		let targetT = t === undefined ? this.game.time : t;
		// the most adhoc hack ever...
		setTimeout(()=>{
			scrollTimelineTo(this.timeline.positionFromTime(targetT));
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
			ctrl.#requestTick({
				deltaTime : dt,
				suppressLog: true,
				prematureStopCondition: ()=>{ return !loopCondition(); }
			});

			// update display
			ctrl.updateAllDisplay();

			// end of frame
			prevTime = time;
			if (loopCondition()) requestAnimationFrame(loopFn);
			else {
				ctrl.shouldLoop = false;
				setRealTime(false);
			}
		}
		setRealTime(true);
		requestAnimationFrame(loopFn);
	}

	// TODO: update display?
	#handleKeyboardEvent_RealTime(evt: { keyCode: number; }) {
		if (evt.keyCode===32) { // space
			this.#playPause({shouldLoop: !this.shouldLoop});
		}
	}
	step(t: number) {
		this.#requestTick({deltaTime: t, suppressLog: false});
		this.updateAllDisplay();
	}
	#handleKeyboardEvent_RealTimeAutoPause(evt: { shiftKey: boolean; keyCode: number; }) {

		if (this.shouldLoop) return;

		/*
		if (evt.shiftKey && evt.keyCode===39 && !this.shouldLoop) { // shift + right
			this.#requestTick({deltaTime: this.stepSize * 0.2, suppressLog: false});
			this.updateAllDisplay();
		}
		else if (evt.keyCode===39 && !this.shouldLoop) {// right arrow
			this.stepTime();
			this.updateAllDisplay();
		}
		 */
	}
	#handleKeyboardEvent_Manual(evt: { keyCode: number; shiftKey: boolean; }) {
		if (evt.keyCode===32) { // space
			this.#fastForward();
			this.updateAllDisplay();
		}
		/*
		if (evt.shiftKey && evt.keyCode===39) { // shift + right
			this.#requestTick({deltaTime: this.stepSize * 0.2, suppressLog: false});
			this.updateAllDisplay();
		}
		else if (evt.keyCode===39) {// right arrow
			this.stepTime();
			this.updateAllDisplay();
		}
		 */
	}

	handleKeyboardEvent(evt: { keyCode: number; shiftKey: boolean; }) {
		//console.log(evt.keyCode);
		if (this.tickMode === TickMode.RealTime) {
			this.#handleKeyboardEvent_RealTime(evt);
		} else if (this.tickMode === TickMode.RealTimeAutoPause) {
			this.#handleKeyboardEvent_RealTimeAutoPause(evt);
		} else if (this.tickMode === TickMode.Manual) {
			this.#handleKeyboardEvent_Manual(evt);
		}
	}
}
export const controller = new Controller();
