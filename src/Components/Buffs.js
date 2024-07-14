import {BuffType} from "../Game/Common";
import {updateTimelineView} from "./Timeline";

// seems useful: https://na.finalfantasyxiv.com/lodestone/special/fankit/icon/
export const buffIcons = new Map();
buffIcons.set(BuffType.Mug, require("./Asset/OtherJobs/mug.png"));
buffIcons.set(BuffType.TechnicalStep, require("./Asset/OtherJobs/technical_step.png"));

export const buffIconImages = new Map();
buffIcons.forEach((path, skillName)=>{
	let imgObj = new Image();
	imgObj.src = path;
	imgObj.onload = function() {
		updateTimelineView();
	}
	buffIconImages.set(skillName, imgObj);
});
