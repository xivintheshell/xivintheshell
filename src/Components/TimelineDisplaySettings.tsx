import React from 'react'
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {Checkbox, TimelineDrawOptions} from "./Common";
import useStateWithCallback from "use-state-with-callback";

export function TimelineDisplaySettings() {
	let setTimelineOptions = function() {
		let options: TimelineDrawOptions = {
			drawMarkers: drawMarkers,
			drawDamageMarks: drawDamageMarks,
			drawMPTickMarks: drawMPTickMarks,
			drawBuffIndicators: drawBuffIndicators,
		};
		controller.setTimelineOptions(options);
	};
	const [drawMarkers, setDrawMarkers] = useStateWithCallback<boolean>(true, setTimelineOptions);
	const [drawDamageMarks, setDrawDamageMarks] = useStateWithCallback<boolean>(true, setTimelineOptions);
	const [drawMPTickMarks, setDrawMPTickMarks] = useStateWithCallback<boolean>(true, setTimelineOptions);
	const [drawBuffIndicators, setDrawBuffIndicators] = useStateWithCallback<boolean>(true, setTimelineOptions);

	return <div>
		<Checkbox uniqueName={"drawMarkers"} label={localize({en: "draw timeline markers"})} onChange={setDrawMarkers}/>
		<Checkbox uniqueName={"drawDamageMarks"} label={localize({en: "draw damage marks"})} onChange={setDrawDamageMarks}/>
		<Checkbox uniqueName={"drawMPTickMarks"} label={localize({en: "draw MP and lucid ticks"})} onChange={setDrawMPTickMarks}/>
		<Checkbox uniqueName={"drawBuffIndicators"} label={localize({en: "draw buff indicators"})} onChange={setDrawBuffIndicators}/>
	</div>
}