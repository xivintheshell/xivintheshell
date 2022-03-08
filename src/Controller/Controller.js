import { addLogContent } from "../Components/LogView";
import {Color, LogCategory} from "./Common";
import { GameState } from "../Game/GameState";
import {GameConfig, ResourceType, SkillReadyStatus} from "../Game/Common";
import {updateStatusDisplay} from "../Components/StatusDisplay";
import {displayedSkills, updateSkillButtons} from "../Components/Skills";

class Controller
{
    constructor()
    {
        this.stepSize = 0.5;
        this.shouldLoop = false;

        this.gameConfig = new GameConfig();
        this.gameConfig.casterTax = 0.06;
        this.gameConfig.slideCastDuration = 0.5;
        this.gameConfig.animationLock = 0.66;
        this.gameConfig.spellSpeed = 1300;
        this.gameConfig.timeTillFirstManaTick = 1.2;
        this.requestRestart();
    }
    // game --> view
    log(category, content, time, color=Color.Text)
    {
        if (time !== undefined) content = time.toFixed(3) + "s: " + content;
        addLogContent(category, content, color);
    }

    #updateStatusDisplay() {
        let game = this.game;
        // resources
        let eno = game.resources.get(ResourceType.Enochian);
        let resourcesData = {
            mana: game.resources.get(ResourceType.Mana).currentValue,
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
                resources: resourcesData,
                resourceLocks: resourceLocksData,
                enemyBuffs: enemyBuffsData,
                selfBuffs: selfBuffsData
            });
        }
    }

    #updateSkillButtons() {
        if (typeof updateSkillButtons !== "undefined") {
            updateSkillButtons(displayedSkills.map(skillName=>{
                return this.game.getSkillAvailabilityStatus(skillName);
            }));
        }
    }

    // view --> game
    requestTick(props={ deltaTime: -1 })
    {
        if (props.deltaTime > 0) {
            this.game.tick(props.deltaTime);
            this.#updateStatusDisplay(this.game);
            this.#updateSkillButtons();
            this.log(LogCategory.Action, "wait for " + props.deltaTime.toFixed(3) + "s", this.game.time, Color.Grey);
        }
    }

    setConfigAndRestart(props={
        stepSize: 0.5,
        spellSpeed: 1268,
        slideCastDuration: 0.5,
        animationLock: 0.66,
        casterTax: 0.06,
        timeTillFirstManaTick: 0.3,
    })
    {
        this.stepSize = props.stepSize;

        this.gameConfig = new GameConfig();
        this.gameConfig.casterTax = props.casterTax;
        this.gameConfig.slideCastDuration = props.slideCastDuration;
        this.gameConfig.animationLock = props.animationLock;
        this.gameConfig.spellSpeed = props.spellSpeed;
        this.gameConfig.timeTillFirstManaTick = props.timeTillFirstManaTick;

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

    requestPlayPause(props)
    {
        if (this.shouldLoop) {
            this.shouldLoop = false;
        } else {
            this.shouldLoop = true;
            this.#runLoop(()=>{
                return this.shouldLoop
            });
        }
    }

    requestFastForward(props)
    {
        let deltaTime = this.game.timeTillAnySkillAvailable();
        this.requestTick({deltaTime: deltaTime});
    }

    requestRestart(props)
    {
        this.lastAtteptedSkill = ""
        this.game = new GameState(this.gameConfig);
        this.#updateStatusDisplay(this.game);
        this.#updateSkillButtons();
        this.log(
            LogCategory.Action,
            "======== RESET (GCD=" + this.game.config.adjustedCastTime(2.5) + ") ========",
            this.game.time,
            Color.Grey);
        this.log(
            LogCategory.Event,
            "======== RESET (GCD=" + this.game.config.adjustedCastTime(2.5) + ") ========",
            this.game.time,
            Color.Grey);
    }

    #useSkill(skillName, bWaitFirst)
    {
        let status = this.game.getSkillAvailabilityStatus(skillName);
        if (bWaitFirst) {
            this.requestTick({deltaTime: status.timeTillAvailable});
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

        this.log(LogCategory.Action, logString, this.game.time, logColor);
        if (status.status === SkillReadyStatus.Ready) {
            this.log(LogCategory.Event, logString, this.game.time, logColor);
        }

        if (status.status === SkillReadyStatus.Ready)
        {
            this.game.useSkillIfAvailable(skillName);
            this.#updateStatusDisplay();
            this.#updateSkillButtons();
        }
    }

    requestUseSkill(props) {
        this.#useSkill(props.skillName, props.skillName === this.lastAtteptedSkill);
    }

    #runLoop(loopCondition) {

        let numFrames = 0;

        const loopFn = function(elapsed) {
            if (numFrames === 0) { // first frame
                // start
            }
            // update

            // end of frame
            numFrames++;
            if (loopCondition()) requestAnimationFrame(loopFn);
        }
        requestAnimationFrame(loopFn);
    }

    handleKeyboardEvent(evt) {
        console.log(evt.keyCode);
        if (evt.keyCode===32) { // space
            this.requestFastForward();
        }
        if (evt.shiftKey && evt.keyCode===39) { // shift + right
            this.requestTick({deltaTime: this.stepSize * 0.2});
        }
        else if (evt.keyCode===39) {
            this.requestTick({deltaTime: this.stepSize});
        }
        else if (evt.keyCode===49) {
            this.requestPlayPause();
        }
    }
}
export const controller = new Controller();
