import React from 'react';
import {timeline} from "./Timeline";
import { skillsWindow } from "./Skills";
import { Config, TimeControl } from "./PlaybackControl";
import { statusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import 'react-tabs/style/react-tabs.css';
import {LoadSave} from "./LoadSave";
import {skillSequencePresets} from "./SkillSequencePresets";
import {timelineMarkerPresets} from "./TimelineMarkerPresets";
import {IntroSection} from "./IntroSection";
import changelog from "../changelog.json"

export let setRealTime = inRealTime=>{};
export let setOverrideOutlineColor = outlineColor=>{};
export default class Main extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			realTime: false,
			overrideOutlineColor: undefined,
		}
		this.controlRegionRef = React.createRef();
		this.gameplayKeyCapture = ((evt)=>{
			if (evt.target && evt.target === this.controlRegionRef.current) {
				controller.handleKeyboardEvent(evt);
				evt.preventDefault();
			}
		}).bind(this);
		this.gameplayMouseCapture = ((evt)=>{
			controller.displayCurrentState();
		}).bind(this);
		setRealTime = ((rt)=>{
			this.setState({realTime: rt});
		}).bind(this);
		setOverrideOutlineColor = (col=>{
			this.setState({ overrideOutlineColor: col });
		}).bind(this);
	}

	componentDidMount() {
		controller.tryAutoLoad();
		controller.updateAllDisplay();
	}

	componentWillUnmount() {
		setRealTime = inRealTime=>{};
		setOverrideOutlineColor = outlineColor=>{};
	}

	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		let containerStyle = {
			height: window.innerHeight,
			accentColor: "mediumpurple",
			fontFamily: "monospace",
			display: "flex",
			flexDirection: "column"
		}
		return <div style={containerStyle}>
			<div style={{
				flex: 1,
				overflow: "scroll",
				overscrollBehaviorY: "contain",
			}}>
				<div style={{
					maxWidth: 1000,
					margin: "0 auto",
					marginTop: 40,
				}}>
					<div>
						<h3 style={{marginBottom: 6}}>Black Mage in the Shell</h3>
						<div style={{marginBottom: 16}}>Last updated: {changelog[0].date} (see <b>About this
							tool/Changelog</b>) (see my <a href={"https://coda.io/d/_d-N3WFoMZ8e/Black-Mage-in-the-Shell_suRLF"}>roadmap</a>)
						</div>
						<IntroSection/>
					</div>
					<div style={{position: "relative", marginBottom: "16px"}}>
						<div style={{display: "inline-block", position: "relative", width: "70%"}}>
							<div className={"keyboardControlled" + (this.state.realTime ? " realTime" : "")}
								 style={this.state.overrideOutlineColor ?
									 {outline: "2px solid " + this.state.overrideOutlineColor} : {}}
								 tabIndex={-1}
								 ref={this.controlRegionRef}
								 onKeyDown={this.gameplayKeyCapture}
								 onClick={this.gameplayMouseCapture}
							>
								{statusDisplay}
								{skillsWindow}
							</div>
						</div>
						<div style={{
							marginLeft: "1%",
							display: "inline-block",
							position: "relative",
							verticalAlign: "top",
							width: "29%"
						}}>
							<Config/>
							<TimeControl/>
							<LoadSave/>
						</div>
					</div>
					{skillSequencePresets}
					{timelineMarkerPresets}
				</div>
			</div>
			{timeline}
		</div>;
	}
}