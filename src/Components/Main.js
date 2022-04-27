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
import {skillSequencePresets} from "./SkillSequencePresets";
import {timelineMarkerPresets} from "./TimelineMarkerPresets";
import {Expandable, Help} from "./Common";

export let setRealTime = inRealTime=>{};
export default class Main extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			realTime: false,
		}
		this.gameplayKeyCapture = ((evt)=>{
			controller.handleKeyboardEvent(evt);
			evt.preventDefault();
		}).bind(this);
		setRealTime = ((rt)=>{
			this.setState({realTime: rt});
		}).bind(this);
	}

	componentDidMount() {
		controller.tryAutoLoad();
		controller.updateAllDisplay();
	}

	componentWillUnmount() {
		setRealTime = inRealTime=>{};
	}

	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		return <div className={"container"}>
			<div className={"container-narrow"}>
				<div>
					<h3>Black Mage in the Shell</h3>
					<Expandable
						defaultShow={true}
						title={"aboutThisTool"}
						titleNode={<span>{"About this tool: "}
							<Help topic={"expandable"} content={"click me to expand or collapse sections"}/></span>}
						content={<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
							<p>This is a FFXIV black mage emulator & rotation planner.</p>
							<p>
								General usage: set your stats in <b>Rotation</b> settings on the right, apply and reset,
								then click on the skills.
								Unless otherwise specified, all times are in seconds.
							</p>
							<p>
								Most edits are automatically saved in your browser cache, so it's generally okay to refresh the page and
								not worry about losing progress.
							</p>
							<p>Hover over <Help topic={"sampleTips"} content={"sample tip"}/> everywhere to see more tips.</p>
							<hr/>
							<p>Some links:</p>
							<ul>
								<li><a href={"https://github.com/miyehn/ffxiv-blm-rotation"}>Github repository</a></li>
								<li><a href={"https://na.finalfantasyxiv.com/jobguide/blackmage/"}>Official FFXIV black mage job guide</a></li>
								<li><a href={"https://discord.com/channels/277897135515762698/592613187245834260"}>
									BLM resources channel on The Balance (make sure you've already joined the server)</a></li>
							</ul>
							<p><Expandable title={"Implementation notes"} defaultShow={false} content={
								<div style={{margin: 10, paddingLeft: 10, marginBottom: 20}}>
									TODO
								</div>
							}/></p>
							<p>
								This tool is developed by <b>Ellyn Waterford @ Sargatanas</b> with generous help from their
								black mage friends and players on The Balance discord. Big shout out to <b>Galahad Crittingway
								 @ Exodus</b> for teaching me BLM from the ground up, testing the tool, and help collecting data.
								If you have questions,
								encountered bugs, or would like to suggest features, you can find Ellyn on discord
								(miyehn#5857) or via email (rainduym@gmail.com).
							</p>
							<p>Also, consider contributing! I didn't even clear P3S or P4S so it's hard for me to make
							timeline presets for those fights...</p>
						</div>
					}/>
				</div>
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
				{skillSequencePresets}
				{timelineMarkerPresets}
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