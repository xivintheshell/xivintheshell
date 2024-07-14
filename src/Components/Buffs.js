import {BuffName} from "../Game/Common";
import {updateTimelineView} from "./Timeline";

// seems useful: https://na.finalfantasyxiv.com/lodestone/special/fankit/icon/
export const buffIcons = new Map();
buffIcons.set(BuffName.TechnicalStep, require("./Asset/OtherJobs/technical_step.png"));
buffIcons.set(BuffName.Mug, require("./Asset/OtherJobs/mug.png"));

export const buffIconImages = new Map();
buffIcons.forEach((path, skillName)=>{
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function() {
		updateTimelineView();
	}
	buffIconImages.set(skillName, imgObj);
});
