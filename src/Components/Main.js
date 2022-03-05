import React from 'react';
import { logView } from "./LogView";
import { timeline } from "./Timeline";
import { skillsWindow } from "./Skills";
import { playbackControl } from "./PlaybackControl";
import { statusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";

export default class Main extends React.Component {
	constructor(props) {
		super(props);
		this.boundKeyCapture = this.keyCapture.bind(this);
	}
	keyCapture(evt) {
		if (evt.keyCode===32) {
			controller.requestFastForward();
		}
		evt.preventDefault();
	}
	render() {
		return <div className={"container"}>
			{timeline}
			<div className={"container-narrow"}>
				<div className={"keyboardControlled"}
					 tabIndex={-1}
					 onKeyDown={this.boundKeyCapture}>
					{statusDisplay}
					{skillsWindow}
				</div>
				{playbackControl}
				{logView}
			</div>
		</div>;
	}
}