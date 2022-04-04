import React from 'react';
import { logView } from "./LogView";
import { timeline } from "./Timeline";
import { skillsWindow } from "./Skills";
import { Config, TimeControl } from "./PlaybackControl";
import { statusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import {LoadSave} from "./LoadSave";
import {presets} from "./Presets";

export var setRealTime = inRealTime=>{};
export default class Main extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			realTime: false,
		}
		this.gameplayKeyCapture = this.unboundGameplayKeyCapture.bind(this);
		setRealTime = this.setRealTime.bind(this);
	}
	unboundGameplayKeyCapture(evt) {
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
				<div style={{ position: "relative", marginBottom: "16px" }}>
					<div style={{ display: "inline-block", position: "relative", width: "70%" }}>
						<div className={"keyboardControlled" + (this.state.realTime ? " realTime" : "")}
							 tabIndex={-1}
							 onKeyDown={this.gameplayKeyCapture}>
							{statusDisplay}
							{skillsWindow}
						</div>
					</div>
					<div style={{
						marginLeft: "1%",
						display: "inline-block",
						position: "relative",
						verticalAlign: "top",
						width: "29%" }}>
						<Config/>
						<TimeControl/>
						<LoadSave/>
					</div>
				</div>
				{presets}
				<div style={{marginTop: "16px"}}>
					<Tabs>
						<TabList>
							<Tab>Timeline</Tab>
							<Tab>Logs</Tab>
						</TabList>

						<TabPanel>
							{timeline}
						</TabPanel>
						<TabPanel>
							{logView}
						</TabPanel>
					</Tabs>
				</div>
			</div>
		</div>;
	}
}