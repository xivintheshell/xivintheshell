import { addLogContent } from "../Components/LogView";
import { Color } from "./Common";

class Controller
{
    log(category, content, time, color=Color.Text)
    {
        if (time !== undefined) content = time.toFixed(3) + "s: " + content;
        addLogContent(category, content, color);
    }
}
export const controller = new Controller();