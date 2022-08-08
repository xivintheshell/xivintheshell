import React from 'react';
import {timeline} from "./Timeline";
import { skillsWindow } from "./Skills";
import { Config, TimeControl } from "./PlaybackControl";
import { statusDisplay } from "./StatusDisplay";
import {controller} from "../Controller/Controller";
import 'react-tabs/style/react-tabs.css';
import {LoadSave} from "./LoadSave";
import {skillSequencePresets} from "./SkillSequencePresets";
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
			controlRegionHeight: 0
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

		let handleResize = e=>{
			let cur = this.controlRegionRef.current;
			if (cur) {
				this.setState({controlRegionHeight: cur.clientHeight});
			}
		}
		handleResize(null);
		window.addEventListener("resize", handleResize);
	}

	componentWillUnmount() {
		setRealTime = inRealTime=>{};
		setOverrideOutlineColor = outlineColor=>{};
	}

	// tabs: https://reactcommunity.org/react-tabs/
	render() {
		let containerStyle = {
			height: "100%",
			accentColor: "mediumpurple",
			fontFamily: "monospace",
			display: "flex",
			flexDirection: "column"
		}
		let mainControlRegion = <div style={{flex: 7, display: "inline-block", position: "relative"}}>
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
			</div>;
		return <div style={{
			position: "fixed",
			top: 0, bottom: 0, left: 0, right: 0
		}}>
			<div style={containerStyle}>
				<div style={{
					flex: 1,
					overflow: "scroll",
					overscrollBehaviorY: "contain",
				}}>
					<div style={{
						maxWidth: 1060,
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
						<div style={{
							display: "flex",
							flexDirection: "row",
							position: "relative",
							marginBottom: "16px"}}>
							{mainControlRegion}
							<div className={"staticScrollbar"} style={{
								flex: 3,
								height: this.state.controlRegionHeight,
								marginLeft: 6,
								position: "relative",
								verticalAlign: "top",
								overflowY: "scroll"
							}}>
								<Config/>
								<TimeControl/>
								<LoadSave/>
							</div>
						</div>
						{skillSequencePresets}
					</div>
				</div>
				{timeline}
			</div>
		</div>;
	}
}