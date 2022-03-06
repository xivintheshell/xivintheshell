import { addLogContent } from "../Components/LogView";
import {Color, LogCategory} from "./Common";
import { game } from "../Game/GameState";
import {ResourceType} from "../Game/Common";
import {updateStatusDisplay} from "../Components/StatusDisplay";
import {stepSize} from "../Components/PlaybackControl";
import {displayedSkills, updateSkillButtons} from "../Components/Skills";

class Controller
{
    constructor() {
        this.lastAtteptedSkill = ""
    }
    // game --> view
    log(category, content, time, color=Color.Text)
    {
        if (time !== undefined) content = time.toFixed(3) + "s: " + content;
        addLogContent(category, content, color);
    }

    updateStatusDisplay(game) {
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
            gcd: game.config.gcd,
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
        updateStatusDisplay({
            resources: resourcesData,
            resourceLocks: resourceLocksData,
            enemyBuffs: enemyBuffsData,
            selfBuffs: selfBuffsData
        });
    }

    updateSkillButtons() {
        updateSkillButtons(displayedSkills.map(skillName=>{
            return game.getSkillAvailabilityStatus(skillName);
        }));
    }

    // view --> game
    requestTick(props={ deltaTime: -1 })
    {
        if (props.deltaTime > 0) {
            game.tick(props.deltaTime);
            this.updateStatusDisplay(game);
            this.updateSkillButtons();
            this.log(LogCategory.Action, "fast forward " + props.deltaTime.toFixed(3) + "s", game.time, Color.Grey);
        }
    }

    getSkillInfo(props={skillName: undefined}) {
        if (props.skillName) {
            return game.getSkillAvailabilityStatus(props.skillName);
        }
        return null;
    }

    requestPlayPause(props)
    {
        console.log("req play/pause");
    }

    requestFastForward(props)
    {
        let deltaTime = game.timeTillAnySkillAvailable();
        this.requestTick({deltaTime: deltaTime});
        this.log(LogCategory.Action, "wait for " + deltaTime.toFixed(3) + "s", game.time, Color.Grey);
    }

    useSkill(skillName, bWaitFirst) {
        if (bWaitFirst) {
            game.waitAndUseSkillIfAvailable(skillName);
            this.lastAtteptedSkill = "";

        } else {
            let result = game.useSkillIfAvailable(skillName);
            if (!result.success) {
                let s = result.description;
                if (result.reason==="notReady") {
                    s += " press again to step until then and use";
                    this.lastAtteptedSkill = skillName;
                }
                this.log(LogCategory.Action, s, result.time, result.logColor);
            }
        }

    }

    requestUseSkill(props) {
        if (props.skillName === this.lastAtteptedSkill) {
            this.useSkill(props.skillName, true);
        } else {
            this.useSkill(props.skillName, false);
        }
    }

    handleKeyboardEvent(evt) {
        if (evt.keyCode===32) { // space
            this.requestFastForward();
        }
        if (evt.shiftKey && evt.keyCode===39) { // shift + right
            this.requestTick({deltaTime: stepSize * 0.1});
        } else if (evt.keyCode===39) {
            this.requestTick({deltaTime: stepSize});
        }
    }
}
export const controller = new Controller();