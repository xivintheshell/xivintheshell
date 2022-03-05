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
        }
    }

    requestPlayPause(props)
    {
        console.log("req play/pause");
    }

    requestFastForward(props)
    {
        let deltaTime = game.timeTillAnySkillAvailable();
        this.log(LogCategory.Action, "wait for " + deltaTime + "s", game.time, Color.Grey);
        game.tick(deltaTime);
    }

    requestUseSkill(props)
    {
        game.useSkillIfAvailable(props.skillName);
    }
}
export const controller = new Controller();