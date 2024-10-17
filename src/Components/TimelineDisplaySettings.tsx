import React from 'react'
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {Checkbox} from "./Common";
import useStateWithCallback from "use-state-with-callback";

export function TimelineDisplaySettings() {
	let setTimelineOptions = function() {
		let options = {
			drawDamageMarks: drawDamageMarks,
			drawMPTickMarks: drawMPTickMarks,
			drawBuffIndicators: drawBuffIndicators,
		};
		controller.setTimelineOptions(options);
	};
	const [drawDamageMarks, setDrawDamageMarks] = useStateWithCallback<boolean>(true, setTimelineOptions);
	const [drawMPTickMarks, setDrawMPTickMarks] = useStateWithCallback<boolean>(true, setTimelineOptions);
	const [drawBuffIndicators, setDrawBuffIndicators] = useStateWithCallback<boolean>(true, setTimelineOptions);

	return <div>
		<Checkbox uniqueName={"drawDamageMarks"} label={localize({en: "draw damage marks"})} onChange={setDrawDamageMarks}/>
		<Checkbox uniqueName={"drawMPTickMarks"} label={localize({en: "draw MP and lucid ticks"})} onChange={setDrawMPTickMarks}/>
		<Checkbox uniqueName={"drawBuffIndicators"} label={localize({en: "draw buff indicators"})} onChange={setDrawBuffIndicators}/>
	</div>
}