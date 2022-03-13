import React from 'react';
import { logView } from "./LogView";
import { timeline } from "./Timeline";
import { skillsWindow } from "./Skills";
import { playbackControl } from "./PlaybackControl";
import { statusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

export var setRealTime = inRealTime=>{};
export default class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			realTime: false,
		}
		this.boundKeyCapture = this.keyCapture.bind(this);
		setRealTime = this.setRealTime.bind(this);
	}
	keyCapture(evt) {
		controller.handleKeyboardEvent(evt);
		evt.preventDefault();
	}
	setRealTime(rt) {
		this.setState({realTime: rt});
	}
	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		return <div className={"container"}>
			<div className={"container-narrow"}>
				<div className={"keyboardControlled" + (this.state.realTime ? " realTime" : "")}
					 tabIndex={-1}
					 onKeyDown={this.boundKeyCapture}>
					{statusDisplay}
					{skillsWindow}
				</div>
				{playbackControl}
				<Tabs>
					<TabList>
						<Tab>Timeline</Tab>
						<Tab>Logs</Tab>
					</TabList>

					<TabPanel className={"timelineTab"}>
						{timeline}
					</TabPanel>
					<TabPanel className={"logsTab"}>
						{logView}
					</TabPanel>
				</Tabs>
			</div>
		</div>;
	}
}