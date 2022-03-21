import { addLogContent } from "../Components/LogView";
import {Color, LogCategory} from "./Common";
import { GameState } from "../Game/GameState";
import {GameConfig, ResourceType, SkillReadyStatus} from "../Game/Common";
import {updateStatusDisplay} from "../Components/StatusDisplay";
import {displayedSkills, updateSkillButtons} from "../Components/Skills";
import {TickMode} from "../Components/PlaybackControl"
import {setRealTime} from "../Components/Main";
import {Timeline, ElemType} from "./Timeline"
import {scrollTimelineTo} from "../Components/Timeline";
import {ActionNode, ActionType, Recording} from "./Recording";

class Controller
{
	constructor()
	{
		this.stepSize = 0.5;
		this.timeScale = 1;
		this.shouldLoop = false;
		this.tickMode = TickMode.RealTimeAutoPause;
		this.lastAtteptedSkill = "";
		this.skillMaxTimeInQueue = 0.5;
		this.skillsQueue = [];

		this.gameConfig = new GameConfig();
		this.gameConfig.casterTax = 0.06;
		this.gameConfig.animationLock = 0.66;
		this.gameConfig.spellSpeed = 1532;
		this.gameConfig.timeTillFirstManaTick = 1.2;
		this.requestRestart();

		this.timeline = new Timeline();
		this.timeline.reset();

		this.battleRecording = new Recording();

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

	reportDamage(props) {

		this.timeline.addElement({
			type: ElemType.DamageMark,
			potency: props.potency,
			time: props.time,
			source: props.source
		})

		this.log(LogCategory.Event, "dealing damage of potency " + props.potency.toFixed(1), props.time, Color.Damage);
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
			if (!props.suppressLog) this.log(LogCategory.Action, "wait for " + props.deltaTime.toFixed(3) + "s", this.game.getDisplayTime(), Color.Grey);

			let lastAction = this.battleRecording.getLastAction();
			if (lastAction!==null && lastAction.type===ActionType.Wait) {
				lastAction.duration += timeTicked;
			} else {
				let waitNode = new ActionNode(ActionType.Wait);
				waitNode.duration = timeTicked;
				this.battleRecording.addActionNode(waitNode);
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
		//stepSize: 0.5,
		spellSpeed: 1268,
		animationLock: 0.66,
		casterTax: 0.06,
		timeTillFirstManaTick: 0.3,
		countdown: 5,
	})
	{
		//this.stepSize = props.stepSize;
		this.gameConfig = new GameConfig();
		this.gameConfig.casterTax = props.casterTax;
		this.gameConfig.animationLock = props.animationLock;
		this.gameConfig.spellSpeed = props.spellSpeed;
		this.gameConfig.timeTillFirstManaTick = props.timeTillFirstManaTick;
		this.gameConfig.countdown = props.countdown;

		this.requestRestart();
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

	#playPause(props)
	{
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

	#fastForward(props)
	{
		let deltaTime = this.game.timeTillAnySkillAvailable();
		this.#requestTick({deltaTime: deltaTime, suppressLog: false});
	}

	requestRestart(props)
	{
		this.lastAtteptedSkill = ""
		this.game = new GameState(this.gameConfig);
		this.updateStatusDisplay(this.game);
		this.#updateSkillButtons();
		this.#playPause({shouldLoop: false});
		if (this.timeline) {
			this.timeline.reset();
			this.timeline.drawElements();
		}
		this.log(
			LogCategory.Action,
			"======== RESET (GCD=" + this.game.config.adjustedCastTime(2.5).toFixed(2) + ") ========",
			this.game.getDisplayTime(),
			Color.Grey);
		this.log(
			LogCategory.Event,
			"======== RESET (GCD=" + this.game.config.adjustedCastTime(2.5).toFixed(2) + ") ========",
			this.game.getDisplayTime(),
			Color.Grey);
	}

	#useSkill(skillName, bWaitFirst, bSuppressLog=false)
	{
		let status = this.game.getSkillAvailabilityStatus(skillName);

		if (bWaitFirst) {
			this.#requestTick({deltaTime: status.timeTillAvailable, suppressLog: false});
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
			this.game.useSkillIfAvailable(skillName);
			this.updateStatusDisplay();
			this.#updateSkillButtons();
			if (this.tickMode === TickMode.RealTimeAutoPause) {
				this.shouldLoop = true;
				this.#runLoop(()=>{
					return this.game.timeTillAnySkillAvailable() > 0;
				});
			}

			let skillInfo = this.game.skillsList.get(skillName).info;
			let isGCD = skillInfo.cdName === ResourceType.cd_GCD;
			let isSpellCast = status.castTime > 0 && !status.instantCast;
			this.timeline.addElement({
				type: ElemType.Skill,
				skillName: skillName,
				isGCD: isGCD,
				isSpellCast: isSpellCast,
				time: this.game.time,
				lockDuration: this.game.timeTillAnySkillAvailable(),
				recastDuration: status.cdRecastTime,
			});
			scrollTimelineTo(this.timeline.positionFromTime(this.game.time));

			let node = new ActionNode(ActionType.Skill);
			node.skillName = skillName;
			this.battleRecording.addActionNode(node);
		}
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
