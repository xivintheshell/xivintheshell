import { addLogContent } from "../Components/LogView";
import {Color, LogCategory} from "./Common";
import { game } from "../Game/GameState";

class Controller
{
    // game --> view
    log(category, content, time, color=Color.Text)
    {
        if (time !== undefined) content = time.toFixed(3) + "s: " + content;
        addLogContent(category, content, color);
    }

    // view --> game
    requestTick(props={ deltaTime: -1 })
    {
        if (props.deltaTime > 0) {
            game.tick(props.deltaTime);
            this.log(LogCategory.Action, "fast forward " + props.deltaTime.toFixed(3) + "s", game.time, Color.Grey);
        }
    }

    requestPlayPause(props)
    {
        console.log("req play/pause");
    }

    requestFastForward(props)
    {
        let deltaTime = game.timeTillAnySkillAvailable();
        if (deltaTime > 0) {
            game.tick(deltaTime);
        }
        this.log(LogCategory.Action, "wait for " + deltaTime.toFixed(3) + "s", game.time, Color.Grey);
    }

    requestUseSkill(props)
    {
        game.useSkillIfAvailable(props.skillName);
    }

    getResourceStatus(rscType)
    {
        let rsc = game.resources.get(rscType);
        return [rsc.currentValue, rsc.maxValue];
    }
}
export const controller = new Controller();