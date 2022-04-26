import React from 'react';
import { controller } from '../Controller/Controller'
import { Input } from "./Common";
import ReactTooltip from 'react-tooltip';
import {TickMode} from "../Controller/Common";

export class TimeControl extends React.Component {
	constructor(props) {
		super(props);

		this.saveSettings = (settings)=>{
			let str = JSON.stringify({
				tickMode: settings.tickMode,
				stepSize: settings.stepSize,
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
					stepSize: this.state.stepSize,
					timeScale: this.state.timeScale
				});
				this.saveSettings({
					tickMode: numVal,
					stepSize: this.state.stepSize,
					timeScale: this.state.timeScale
				});
			}
		}).bind(this);

		this.setStepSize = ((val)=>{
			this.setState({stepSize: val});
			let numVal = parseFloat(val);
			if (!isNaN(numVal)) {
				controller.setTimeControlSettings({
					tickMode: this.state.tickMode,
					stepSize: numVal,
					timeScale: this.state.timeScale
				});
				this.saveSettings({
					tickMode: this.state.tickMode,
					stepSize: numVal,
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
					stepSize: this.state.stepSize,
					timeScale: numVal
				});
				this.saveSettings({
					tickMode: this.state.tickMode,
					stepSize: this.state.stepSize,
					timeScale: numVal
				});
			}
		}).bind(this);

		let settings = this.loadSettings();//LocalStorage.loadPlaybackSettings();
		if (settings) {
			this.state = {
				tickMode: settings.tickMode,
				stepSize: settings.stepSize,
				timeScale: settings.timeScale
			};
		} else {
			this.state = {
				tickMode: 1,
				stepSize: 1,
				timeScale: 2
			};
		}
	}
	componentDidMount() {
		controller.setTimeControlSettings(this.state);
	}
	render() {
		return <div className={"timeControl"}>
			<div>
				<span>Tick mode: </span>
				<label data-tip data-for="RealTime" className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.RealTime}
						   checked={this.state.tickMode===TickMode.RealTime}
						   name={"tick mode"}/>
					{"real-time"}
				</label>
				<label data-tip data-for="RealTimeAutoPause" className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.RealTimeAutoPause}
						   checked={this.state.tickMode===TickMode.RealTimeAutoPause}
						   name={"tick mode"}/>
					{"real-time auto pause"}
				</label>
				<label data-tip data-for="Manual" className={"tickModeOption"}>
					<input className={"radioButton"} type={"radio"} onChange={this.setTickMode}
						   value={TickMode.Manual}
						   checked={this.state.tickMode===TickMode.Manual}
						   name={"tick mode"}/>
					{"manual"}
				</label>
				<ReactTooltip id={"RealTime"}>
					<div className="toolTip">
						<p>- click to use a skill</p>
						<p>- [space bar] to play/pause. game time is elapsing when the above region has a green border</p>
						<p>Note that keyboard inputs are only effective within the control region i.e. when the above box is purple/green</p>
					</div>
				</ReactTooltip>
				<ReactTooltip id={"RealTimeAutoPause"}>
					<div className="toolTip">
						<p>*Recommended*</p>
						<p>- click to use a skill. or if it's not ready, click again to wait then retry</p>
						<p>- [->] to advance time by "step size" as configured below</p>
						<p>- [shift]+[->] to advance time by 1/5 "step size" as configured below</p>
						<p>Note that keyboard inputs are only effective within the control region i.e. when the above region has purple or green border.</p>
					</div>
				</ReactTooltip>
				<ReactTooltip id={"Manual"}>
					<div className="toolTip">
						<p>- click to use a skill. or if it's not ready, click again to wait then retry</p>
						<p>- [space bar] to advance game time to the earliest possible time for the next skill</p>
						<p>- [->] to advance time by "step size" as configured below</p>
						<p>- [shift]+[->] to advance time by 1/5 "step size" as configured below</p>
						<p>Note that keyboard inputs are only effective within the control region i.e. when the above region has purple or green border.</p>
					</div>
				</ReactTooltip>
			</div>
			<Input defaultValue={this.state.stepSize} description="step size: " onChange={this.setStepSize}/>
			<Input defaultValue={this.state.timeScale} description="time scale: " onChange={this.setTimeScale}/>
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
			randomSeed: ""
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setSpellSpeed = this.unboundSetSpellSpeed.bind(this);
		this.setAnimationLock = this.unboundSetAnimationLock.bind(this);
		this.setCasterTax = this.unboundSetCasterTax.bind(this);
		this.setTimeTillFirstManaTick = this.unboundSetTimeTillFirstManaTick.bind(this);
		this.setCountdown = this.unboundSetCountdown.bind(this);
		this.setRandomSeed = this.unboundSetRandomSeed.bind(this);

		updateConfigDisplay = ((config)=>{
			this.setState({
				spellSpeed: config.spellSpeed,
				animationLock: config.animationLock,
				casterTax: config.casterTax,
				timeTillFirstManaTick: config.timeTillFirstManaTick,
				countdown: config.countdown,
				randomSeed: config.randomSeed
			});
		}).bind(this);
	}

	unboundSetSpellSpeed(val) { this.setState({spellSpeed: val}) }
	unboundSetAnimationLock(val) { this.setState({animationLock: val}) }
	unboundSetCasterTax(val) { this.setState({casterTax: val}) }
	unboundSetTimeTillFirstManaTick(val) { this.setState({timeTillFirstManaTick: val}) }
	unboundSetCountdown(val) { this.setState({countdown: val}) }
	unboundSetRandomSeed(val) { this.setState({randomSeed: val }); }

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
			randomSeed: config.randomSeed,
		});
		controller.updateAllDisplay();
	}

	componentWillUnmount() {
		updateConfigDisplay = (config)=>{};
	}

	handleSubmit (event) {
		let seed = this.state.randomSeed;
		if (seed.length === 0) {
			seed = Math.floor(Math.random() * 10000).toString();
			this.setState({randomSeed: seed});
		}
		let config = {
			spellSpeed: this.state.spellSpeed,
			animationLock: this.state.animationLock,
			casterTax: this.state.casterTax,
			countdown: this.state.countdown,
			timeTillFirstManaTick: this.state.timeTillFirstManaTick,
			randomSeed: seed
		};
		this.setConfigAndRestart(config);
		event.preventDefault();
	}

	render() {
		return (
			<div className={"config"}>
				<form onSubmit={this.handleSubmit}>
					<Input defaultValue={this.state.spellSpeed} description="spell speed: " onChange={this.setSpellSpeed}/>
					<Input defaultValue={this.state.animationLock} description="animation lock: " onChange={this.setAnimationLock}/>
					<Input defaultValue={this.state.casterTax} description="caster tax: " onChange={this.setCasterTax}/>
					<Input defaultValue={this.state.timeTillFirstManaTick} description="time till first MP tick: " onChange={this.setTimeTillFirstManaTick}/>
					<Input defaultValue={this.state.countdown} description="countdown: " onChange={this.setCountdown}/>
					<Input defaultValue={this.state.randomSeed} description="random seed: " onChange={this.setRandomSeed}/>
					<input type="submit" value="apply and reset"/>
				</form>
			</div>
		)}
}