import React from 'react'
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {Checkbox} from "./Common";

export function TimelineDisplaySettings() {
	return <div>
		<Checkbox uniqueName={"showDamageMarks"} label={localize({en: "show damage marks", zh: "显示伤害结算标记"})} onChange={val => {
			controller.setTimelineOptions({drawDamageMarks: val});
		}}/>
		<Checkbox uniqueName={"showMPAndLucidTickMarks"} label={localize({en: "show MP and lucid ticks", zh: "显示跳蓝和跳醒梦"})} onChange={val => {
			controller.setTimelineOptions({drawMPTickMarks: val});
		}}/>
		<Checkbox uniqueName={"showBuffIndicators"} label={localize({en: "show buff indicators", zh: "显示buff标记"})} onChange={val => {
			controller.setTimelineOptions({drawBuffIndicators: val});
		}}/>
	</div>
}