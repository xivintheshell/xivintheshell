import React from 'react';
import { controller } from '../Controller/Controller'
import {Help, Input, ButtonIndicator, Expandable} from "./Common";
import {TickMode} from "../Controller/Common";

export class TimeControl extends React.Component {
	constructor(props) {
		super(props);

		this.saveSettings = (settings)=>{
			let str = JSON.stringify({
				tickMode: settings.tickMode,
				timeScale: settings.timeScale
			});
			localStorage.setItem("playbackSettings", str);
		}

		this.loadSettings = ()=>{
			let str = localStorage.getItem("playbackSettings");
			if (str) {
				let settings = JSON.parse(str);
				return settings;
			}
			return undefined;
		}

		this.setTickMode = ((e)=>{
			if (!e || !e.target || isNaN(parseInt(e.target.value))) return;
			this.setState({tickMode: parseInt(e.target.value)});
			let numVal = parseInt(e.target.value);
			if (!isNaN(numVal)) {
				controller.setTimeControlSettings({
					tickMode: numVal,
					timeScale: this.state.timeScale
				});
				this.saveSettings({
					tickMode: numVal,
					timeScale: this.state.timeScale
				});
			}
		}).bind(this);

		this.setTimeScale = ((val)=>{
			this.setState({timeScale: val});
			let numVal = parseFloat(val);
			if (!isNaN(numVal)) {
				controller.setTimeControlSettings({
					tickMode: this.state.tickMode,
					timeScale: numVal
				});
				this.saveSettings({
					tickMode: this.state.tickMode,
					timeScale: numVal
				});
			}
		}).bind(this);

		let settings = this.loadSettings();//LocalStorage.loadPlaybackSettings();
		if (settings) {
			this.state = {
				tickMode: settings.tickMode,
				timeScale: settings.timeScale
			};
		} else {
			this.state = {
				tickMode: 1,
				timeScale: 2
			};
		}
	}
	componentDidMount() {
		controller.setTimeControlSettings({tickMode: this.state.tickMode, timeScale: this.state.timeScale});
	}
	render() {
		return <div className={"timeControl"}>
			<div style={{marginBottom: 5}}>
				<div style={{marginBottom: 5}}><b>Control</b></div>
				<label className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.RealTime}
						   checked={this.state.tickMode === TickMode.RealTime}
						   name={"tick mode"}/>
					{"real-time"}
				</label>
				<Help topic={"ctrl-realTime"} content={
					<div className="toolTip">
						<div className="paragraph">- click to use a skill</div>
						<div className="paragraph">- <ButtonIndicator text={"space"}/> to play/pause. game time is elapsing when the main region has a green border</div>
					</div>
				}/><br/>
				<label className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.RealTimeAutoPause}
						   checked={this.state.tickMode===TickMode.RealTimeAutoPause}
						   name={"tick mode"}/>
					{"real-time auto pause"}
				</label>
				<Help topic={"ctrl-realTimeAutoPause"} content={
					<div className="toolTip">
						<div className="paragraph">*Recommended*</div>
						<div className="paragraph">- click to use a skill. or if it's not ready, click again to wait then retry</div>
					</div>
				}/><br/>
				<label className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.Manual}
						   checked={this.state.tickMode===TickMode.Manual}
						   name={"tick mode"}/>
					{"manual"}
				</label>
				<Help topic={"ctrl-manual"} content={
					<div className="toolTip">
						<div className="paragraph">- click to use a skill. or if it's not ready, click again to wait then retry</div>
						<div className="paragraph">- <ButtonIndicator text={"space"}/> to advance game time to the earliest possible time for the next skill</div>
					</div>
				}/><br/>
			</div>
			<Input defaultValue={this.state.timeScale} description={<span>time scale <Help topic={"timeScale"} content={
				<div>rate at which game time advances automatically (aka when in real-time)</div>
			}/>: </span>} onChange={this.setTimeScale}/>
		</div>
	}
}

export let updateConfigDisplay = (config)=>{};

export class Config extends React.Component {
	constructor(props) {
		super(props);
		this.state = { // NOT DEFAULTS
			stepSize : 0,
			spellSpeed: 0,
			animationLock: 0,
			casterTax: 0,
			timeTillFirstManaTick: 0,
			countdown: 0,
			randomSeed: "",
			rngProcs: true
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setSpellSpeed = this.unboundSetSpellSpeed.bind(this);
		this.setAnimationLock = this.unboundSetAnimationLock.bind(this);
		this.setCasterTax = this.unboundSetCasterTax.bind(this);
		this.setTimeTillFirstManaTick = this.unboundSetTimeTillFirstManaTick.bind(this);
		this.setCountdown = this.unboundSetCountdown.bind(this);
		this.setRandomSeed = this.unboundSetRandomSeed.bind(this);
		this.setrngProcs = this.unboundSetrngProcs.bind(this);

		updateConfigDisplay = ((config)=>{
			this.setState({
				spellSpeed: config.spellSpeed,
				animationLock: config.animationLock,
				casterTax: config.casterTax,
				timeTillFirstManaTick: config.timeTillFirstManaTick,
				countdown: config.countdown,
				randomSeed: config.randomSeed,
				rngProcs: config.rngProcs
			});
		}).bind(this);
	}

	unboundSetSpellSpeed(val) { this.setState({spellSpeed: val}) }
	unboundSetAnimationLock(val) { this.setState({animationLock: val}) }
	unboundSetCasterTax(val) { this.setState({casterTax: val}) }
	unboundSetTimeTillFirstManaTick(val) { this.setState({timeTillFirstManaTick: val}) }
	unboundSetCountdown(val) { this.setState({countdown: val}) }
	unboundSetRandomSeed(val) { this.setState({randomSeed: val}); }
	unboundSetrngProcs(evt) { this.setState({rngProcs: evt.target.checked}); }

	setConfigAndRestart(config) {
		if (isNaN(parseFloat(config.spellSpeed)) ||
			isNaN(parseFloat(config.animationLock)) ||
			isNaN(parseFloat(config.casterTax)) ||
			isNaN(parseFloat(config.timeTillFirstManaTick)) ||
			isNaN(parseFloat(config.countdown))) {
			window.alert("Some config fields are not numbers!");
			return;
		}
		controller.setConfigAndRestart({
			spellSpeed: parseFloat(config.spellSpeed),
			animationLock: parseFloat(config.animationLock),
			casterTax: parseFloat(config.casterTax),
			timeTillFirstManaTick: parseFloat(config.timeTillFirstManaTick),
			countdown: parseFloat(config.countdown),
			randomSeed: config.randomSeed.trim(),
			rngProcs: config.rngProcs
		});
		controller.updateAllDisplay();
		controller.updateCumulativeStatsDisplay();
	}

	componentWillUnmount() {
		updateConfigDisplay = (config)=>{};
	}

	handleSubmit (event) {
		let seed = this.state.randomSeed;
		if (seed.length === 0) {
			for (let i = 0; i < 4; i++) {
				seed += Math.floor(Math.random() * 10).toString();
			}
			this.setState({randomSeed: seed});
		}
		let config = {
			spellSpeed: this.state.spellSpeed,
			animationLock: this.state.animationLock,
			casterTax: this.state.casterTax,
			countdown: this.state.countdown,
			timeTillFirstManaTick: this.state.timeTillFirstManaTick,
			randomSeed: seed,
			rngProcs: this.state.rngProcs
		};
		this.setConfigAndRestart(config);
		event.preventDefault();
	}

	render() {
		let editSection = <form onSubmit={this.handleSubmit}>
			<Input defaultValue={this.state.spellSpeed} description="spell speed: " onChange={this.setSpellSpeed}/>
			<Input defaultValue={this.state.animationLock} description="animation lock: " onChange={this.setAnimationLock}/>
			<Input defaultValue={this.state.casterTax} description="caster tax: " onChange={this.setCasterTax}/>
			<Input defaultValue={this.state.timeTillFirstManaTick} description="time till first MP tick: " onChange={this.setTimeTillFirstManaTick}/>
			<Input defaultValue={this.state.countdown} description="countdown: " onChange={this.setCountdown}/>
			<Input defaultValue={this.state.randomSeed} description={
				<span>random seed <Help topic={"randomSeed"} content={
					"can be anything, or leave empty to get 4 random digits."
				}/>: </span>} onChange={this.setRandomSeed}/>
			<div>
				<input type="checkbox" style={{position: "relative", top: 3, marginRight: 5}}
					   checked={this.state.rngProcs}
					   onChange={this.setrngProcs}/>
				<span>rng procs <Help topic={"rngProcs"} content={
					"turning off rng procs will force you to sharpcast everything."
				}/></span>
			</div>

			<input style={{marginTop: 5}} type="submit" value="apply and reset"/>
		</form>;
		return (
			<div className={"config"} style={{marginBottom: 16}}>
				<div style={{marginBottom: 5}}><b>Config</b></div>
				<Expandable title={"Edit"} content={editSection}/>
			</div>
		)}
}