import React from 'react'
import {controller} from "../Controller/Controller";
import {localize} from "./Localization";
import {Checkbox} from "./Common";
import useStateWithCallback from "use-state-with-callback";

export function TimelineDisplaySettings() {
	let setTimelineOptions = function() {
		let options = {
			drawDamageMarks: drawDamageMarks,
		};
		controller.setTimelineOptions(options);
	};
	const [drawDamageMarks, setDrawDamageMarks] = useStateWithCallback<boolean>(true, setTimelineOptions);

	return <div>
		<Checkbox uniqueName={"drawDamageMarks"} label={localize({en: "draw damage mark"})} onChange={setDrawDamageMarks}/>
	</div>
}