import { addLogContent } from "../Components/LogView";
import {Color, FileType, LogCategory, ReplayMode} from "./Common";
import { GameState } from "../Game/GameState";
import {GameConfig, ResourceType, SkillReadyStatus} from "../Game/Common";
import {updateStatusDisplay} from "../Components/StatusDisplay";
import {displayedSkills, updateSkillButtons} from "../Components/Skills";
import {TickMode, updateConfigDisplay} from "../Components/PlaybackControl"
import {setRealTime} from "../Components/Main";
import {Timeline, ElemType} from "./Timeline"
import {scrollTimelineTo, updateSelectionDisplay, updateStatsDisplay} from "../Components/Timeline";
import {ActionNode, ActionType, Record, Line} from "./Record";
import {updatePresetsView} from "../Components/Presets";

class Controller {
	constructor() {
		this.stepSize = 0.5;
		this.timeScale = 1;
		this.shouldLoop = false;
		this.tickMode = TickMode.RealTimeAutoPause;
		this.lastAtteptedSkill = "";
		this.skillMaxTimeInQueue = 0.5;
		this.skillsQueue = [];

		this.gameConfig = new GameConfig();
		this.#requestRestart();

		this.timeline = new Timeline();
		this.timeline.reset();

		this.presetLines = [];

		/*
		let intimes = [1.5, 2, 2.5, 2.8, 3, 3.5, 4];
		intimes.forEach(t=>{
			let adjusted = this.gameConfig.adjustedCastTime(t);
			let lltime = adjusted * 0.85;
			console.log(t.toFixed(2) + " " + adjusted.toFixed(2) + " " + lltime.toFixed(2));
		})
		 */

	}
	// game --> view
	log(category, content, time, color=Color.Text) {
		if (time !== undefined) content = time.toFixed(3) + "s: " + content;
		addLogContent(category, content, color);
	}

	serializedPresets() {
		return {
			fileType: FileType.Presets,
			config: this.gameConfig,
			presets: this.presetLines.map(line=>{
				return line.serialized();
			}),
		}
	}

	addSelectionToPreset(name="(untitled)") {
		console.assert(this.record.getFirstSelection() !== null);
		let line = new Line();
		line.name = name;
		let itr = this.record.getFirstSelection();
		while (itr !== this.record.getLastSelection().next) {
			line.addActionNode(itr.getClone());
			itr = itr.next;
		}
		this.presetLines.push(line);

		updatePresetsView();
	}

	appendFilePresets(content) {
		for (let i = 0; i < content.presets.length; i++) {
			let line = new Line();
			line.name = content.presets[i].name;
			for (let j = 0; j < content.presets[i].actions.length; j++) {
				let action = content.presets[i].actions[j];
				let node = new ActionNode(action.type);
				node.skillName = action.skillName;
				node.waitDuration = action.waitDuration;
				line.addActionNode(node);
			}
			this.presetLines.push(line);
		}
		updatePresetsView();
	}

	loadBattleRecordFromFile(content) {
		this.gameConfig = new GameConfig();
		this.gameConfig.casterTax = content.config.casterTax;
		this.gameConfig.animationLock = content.config.animationLock;
		this.gameConfig.spellSpeed = content.config.spellSpeed;
		this.gameConfig.timeTillFirstManaTick = content.config.timeTillFirstManaTick;
		this.gameConfig.countdown = content.config.countdown;
		this.gameConfig.randomSeed = content.config.randomSeed;

		this.record = new Record();
		this.record.config = content.config;
		updateConfigDisplay(content.config);

		this.#requestRestart();

		// now add the actions
		//console.log(content);
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

	reportPotencyUpdate() {
		let cumulativePotency = 0;
		for (let itr = this.record.getFirstAction(); itr !== this.record.getLastAction().next; itr = itr.next) {
			if (itr.type === ActionType.Skill && itr.tmp_startLockTime >= 0) {
				cumulativePotency += itr.tmp_capturedPotency;
			}
		}
		let totalTime = this.game.time - this.gameConfig.countdown;
		updateStatsDisplay({
			cumulativePPS: totalTime > 0 ? cumulativePotency / totalTime : 0,
			cumulativeDuration: Math.max(0, totalTime),
		});
	}

	reportDamage(props) {

		this.timeline.addElement({
			type: ElemType.DamageMark,
			potency: props.potency,
			time: props.time,
			source: props.source
		});

		this.log(
			LogCategory.Event,
			"reporting damage of potency " + props.potency.toFixed(1),
			props.time,
			Color.Damage);
	}

	reportLucidTick(time, source) {
		this.timeline.addElement({
			type: ElemType.LucidMark,
			time: time,
			source: source,
		});
	}

	reportManaTick(time, source) {
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

	#updateTimelineDisplay() {
		this.timeline.setTimeSegment(0, this.game.time);
		this.timeline.updateElem({type: ElemType.s_Cursor, time: this.game.time});
		this.timeline.drawElements();
	}

	#updateSkillButtons() {
		if (typeof updateSkillButtons !== "undefined") {
			updateSkillButtons(displayedSkills.map(skillName=>{
				return this.game.getSkillAvailabilityStatus(skillName);
			}));
		}
	}

	#requestTick(props={
		deltaTime: -1,
		suppressLog: false,
		prematureStopCondition: null
	}) {
		if (props.deltaTime > 0) {
			let timeTicked = this.game.tick(
				props.deltaTime,
				props.prematureStopCondition ? props.prematureStopCondition : ()=>{ return false; });
			this.updateStatusDisplay(this.game);
			this.#updateSkillButtons();
			this.#updateTimelineDisplay();
			if (!props.suppressLog) {
				this.log(
					LogCategory.Action,
					"wait for " + props.deltaTime.toFixed(3) + "s",
					this.game.getDisplayTime(),
					Color.Grey);
			}

			// add this tick to game record
			let lastAction = this.record.getLastAction();
			if (lastAction!==null) {
				lastAction.waitDuration += timeTicked;
			} else {
				let waitNode = new ActionNode(ActionType.Wait);
				waitNode.waitDuration = timeTicked;
				this.record.addActionNode(waitNode);
			}
		}
	}

	setTickMode(tickMode) {
		this.tickMode = tickMode;
		this.shouldLoop = false;
		this.lastAtteptedSkill = "";
	}

	setTimeControlSettings(props) {
		this.stepSize = props.stepSize;
		this.timeScale = props.timeScale;
	}

	setConfigAndRestart(props={
		spellSpeed: 1268,
		animationLock: 0.66,
		casterTax: 0.06,
		timeTillFirstManaTick: 0.3,
		countdown: 5,
		randomSeed: "hello.",
	})
	{
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
	}

	getSkillInfo(props={skillName: undefined}) {
		if (props.skillName) {
			return this.game.getSkillAvailabilityStatus(props.skillName);
		}
		return null;
	}

	getResourceValue(props={rscType: undefined}) {
		if (props.rscType) {
			return this.game.resources.get(props.rscType).currentValue;
		}
		return -1;
	}

	#playPause(props) {
		let newShouldLoop = props ? props.shouldLoop : !this.shouldLoop;
		if (this.shouldLoop === newShouldLoop) return;

		this.shouldLoop = newShouldLoop;

		if (this.shouldLoop) {
			this.log(LogCategory.Action, "starting real-time control", this.game.getDisplayTime(), Color.Success);
			this.#runLoop(()=>{
				return this.shouldLoop
			});
		} else {
			this.log(LogCategory.Action, "paused", this.game.getDisplayTime(), Color.Success);
		}
	}

	#fastForward(props) {
		let deltaTime = this.game.timeTillAnySkillAvailable();
		this.#requestTick({deltaTime: deltaTime, suppressLog: false});
	}

	#requestRestart(props) {
		this.lastAtteptedSkill = ""
		this.game = new GameState(this.gameConfig);
		this.updateStatusDisplay(this.game);
		this.#updateSkillButtons();
		this.#playPause({shouldLoop: false});
		if (this.timeline) {
			this.timeline.reset();
			this.timeline.drawElements();
		}
		if (this.record) {
			this.record.unselectAll();
			this.onTimelineSelectionChanged();
		}
		// updateStatsDisplay(); // TODO
		if (!(props && props.suppressLog)) {
			this.log(
				LogCategory.Action,
				"======== RESET (GCD=" +
					this.game.config.adjustedCastTime(2.5).toFixed(2) + ") ========",
				this.game.getDisplayTime(),
				Color.Grey);
			this.log(
				LogCategory.Event,
				"======== RESET (GCD=" +
					this.game.config.adjustedCastTime(2.5).toFixed(2) + ") ========",
				this.game.getDisplayTime(),
				Color.Grey);
		}
	}

	#useSkill(skillName, bWaitFirst, bSuppressLog=false, overrideTickMode=this.tickMode) {
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({deltaTime: status.timeTillAvailable, suppressLog: bSuppressLog});
			status = this.game.getSkillAvailabilityStatus(skillName);
			this.lastAtteptedSkill = "";
		}

		let logString = "";
		let logColor = Color.Text;

		if (status.status === SkillReadyStatus.Ready)
		{
			logString = "use skill [" + skillName + "]";
			logColor = Color.Success;
		}
		else if (status.status === SkillReadyStatus.Blocked)
		{
			logString = "["+skillName+"] is not available yet. might be ready in ";
			logString += status.timeTillAvailable.toFixed(3) + ". press again to wait until then and retry";
			logColor = Color.Warning;
			this.lastAtteptedSkill = skillName;
		}
		else if (status.status === SkillReadyStatus.NotEnoughMP)
		{
			logString = "["+skillName+"] is not ready (not enough MP)";
			logColor = Color.Error;
		}
		else if (status.status === SkillReadyStatus.RequirementsNotMet)
		{
			logString = "["+skillName+"] requirements are not met";
			if (status.description.length > 0)
				logString += " (need: " + status.description + ")";
			logColor = Color.Error;
		}

		if (!bSuppressLog || status.status === SkillReadyStatus.Ready) {
			this.log(LogCategory.Action, logString, this.game.getDisplayTime(), logColor);
			if (status.status === SkillReadyStatus.Ready) {
				this.log(LogCategory.Event, logString, this.game.getDisplayTime(), logColor);
			}
		}

		if (status.status === SkillReadyStatus.Ready)
		{
			let node = new ActionNode(ActionType.Skill);
			node.tmp_capturedPotency = 0;

			this.game.useSkill(skillName, node);
			this.updateStatusDisplay();
			this.#updateSkillButtons();
			if (overrideTickMode === TickMode.RealTimeAutoPause) {
				this.shouldLoop = true;
				this.#runLoop(()=>{
					return this.game.timeTillAnySkillAvailable() > 0;
				});
			}

			let lockDuration = this.game.timeTillAnySkillAvailable();
			let time = this.game.time;

			node.skillName = skillName;
			node.waitDuration = 0;
			node.tmp_startLockTime = time;
			node.tmp_endLockTime = time + lockDuration;
			this.record.addActionNode(node);

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
				getIsSelected: ()=>{ return node.isSelected(); },
				node: node,
			});
			scrollTimelineTo(this.timeline.positionFromTime(this.game.time));
		}
		return status;
	}

	// returns true on success
	#replay(line, replayMode, suppressLog=false) {
		let itr = line.getFirstAction();
		while (itr !== null) {

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
				let status = this.#useSkill(itr.skillName, waitFirst, suppressLog, TickMode.Manual);
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

	// generally used for trying to add a line to the current timeline
	tryAddLine(line, replayMode=ReplayMode.Tight) {
		let oldTail = this.record.getLastAction();
		let replaySuccessful = this.#replay(line, replayMode, false);
		if (!replaySuccessful) {
			if (oldTail) this.rewindUntilBefore(oldTail.next);
			else { // tried to add line at the start but failed
				if (this.record.getFirstAction()) this.rewindUntilBefore(this.record.getFirstAction());
			}
			window.alert('Failed to add line "' + line.name + '" due to insufficient resources and/or stats mismatch.');
		}
	}

	deleteLine(line) {
		for (let i = 0; i < this.presetLines.length; i++) {
			if (this.presetLines[i] === line) {
				this.presetLines.splice(i, 1);
				updatePresetsView();
				return;
			}
		}
		console.assert(false);
	}

	deleteAllLines() {
		this.presetLines = [];
		updatePresetsView();
	}

	// basically restart the game and play till here:
	rewindUntilBefore(node) {
		let replayRecord = this.record;
		this.record = new Record();
		this.record.config = this.gameConfig;

		this.#requestRestart();

		if (node !== replayRecord.getFirstAction())
		{
			let itr = replayRecord.getFirstAction();
			while (itr.next !== node) {
				itr = itr.next;
			}
			itr.next = null;
			replayRecord.tail = itr;
			this.#replay(replayRecord, ReplayMode.Exact, false);
		}
	}

	onTimelineSelectionChanged() {
		let selectionStart = 0;
		let selectionEnd = 0;
		if (this.record.getFirstSelection()) {
			selectionStart = this.record.getFirstSelection().tmp_startLockTime;
			selectionEnd = this.record.getLastSelection().tmp_endLockTime;
		} else {
			updateStatsDisplay({
				selectedPotency: 0,
				selectedDuration: 0
			});
		}
		updateSelectionDisplay(
			this.timeline.positionFromTime(selectionStart), this.timeline.positionFromTime(selectionEnd));
		updatePresetsView();

	}

	requestUseSkill(props) {
		if (this.tickMode === TickMode.RealTime && this.shouldLoop) {
			this.skillsQueue.push({
				skillName: props.skillName,
				timeInQueue: 0
			});
		} else if (this.tickMode === TickMode.RealTimeAutoPause && this.shouldLoop) {
			// not sure if should allow any control here.
		} else {
			let waitFirst = props.skillName === this.lastAtteptedSkill;
			this.#useSkill(props.skillName, waitFirst);
		}
	}

	#runLoop(loopCondition) {

		let prevTime = 0;
		let ctrl = this;

		const loopFn = function(time) {
			if (prevTime === 0) { // first frame
				prevTime = time;
				// start
				// ...
			}
			let dt = (time - prevTime) / 1000 * ctrl.timeScale;

			// update (skills queue)
			let numSkillsProcessed = 0;
			for (let i = 0; i < ctrl.skillsQueue.length; i++) {
				ctrl.#useSkill(ctrl.skillsQueue[i].skillName, false, true);
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

	#handleKeyboardEvent_RealTime(evt) {
		if (evt.keyCode===32) { // space
			this.#playPause();
		}
	}
	#handleKeyboardEvent_RealTimeAutoPause(evt) {

		if (this.shouldLoop) return;

		if (evt.shiftKey && evt.keyCode===39 && !this.shouldLoop) { // shift + right
			this.#requestTick({deltaTime: this.stepSize * 0.2});
		}
		else if (evt.keyCode===39 && !this.shouldLoop) {// right arrow
			this.#requestTick({deltaTime: this.stepSize});
		}
	}
	#handleKeyboardEvent_Manual(evt) {
		if (evt.keyCode===32) { // space
			this.#fastForward();
		}
		if (evt.shiftKey && evt.keyCode===39) { // shift + right
			this.#requestTick({deltaTime: this.stepSize * 0.2});
		}
		else if (evt.keyCode===39) {// right arrow
			this.#requestTick({deltaTime: this.stepSize});
		}
	}

	handleKeyboardEvent(evt) {
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
