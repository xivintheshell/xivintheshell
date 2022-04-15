import React from 'react';
import { controller } from '../Controller/Controller'
import { Input } from "./Common";
import ReactTooltip from 'react-tooltip';

export const TickMode = {
	RealTime: 0,
	RealTimeAutoPause: 1,
	Manual: 2
};

// actually, control settings: tick mode, time scale, step size
class TickModeSelection extends React.Component
{
	constructor(props) {
		super(props);
		this.onChangeValue = this.unboundOnSelectionChanged.bind(this);
	}
	unboundOnSelectionChanged(evt) {
		let mode = parseInt(evt.target.value);
		controller.setTickMode(mode);
	}
	render() {
		return <div onChange={this.onChangeValue}>
			<span>Tick mode: </span>
			<label data-tip data-for="RealTime" className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.RealTime} defaultChecked={false} name={"tick mode"}/>
				{"real-time"}
			</label>
			<label data-tip data-for="RealTimeAutoPause" className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.RealTimeAutoPause} defaultChecked={true} name={"tick mode"}/>
				{"real-time auto pause"}
			</label>
			<label data-tip data-for="Manual" className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.Manual} defaultChecked={false} name={"tick mode"}/>
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
	}
}

export class TimeControl extends React.Component {
	constructor(props) {
		super(props);
		this.setStepSize = this.unboundSetStepSize.bind(this);
		this.setTimeScale = this.unboundSetTimeScale.bind(this);
		this.state = {
			stepSize: 1,
			timeScale: 2
		};
	}
	unboundSetStepSize(val) {
		this.setState({stepSize: val})
		let numVal = parseFloat(val);
		if (!isNaN(numVal)) {
			controller.setTimeControlSettings({
				stepSize: numVal,
				timeScale: this.state.timeScale
			});
		}
	}
	unboundSetTimeScale(val) {
		this.setState({timeScale: val})
		let numVal = parseFloat(val);
		if (!isNaN(numVal)) {
			controller.setTimeControlSettings({
				stepSize: this.state.stepSize,
				timeScale: numVal
			});
		}
	}
	componentDidMount() {
		this.unboundSetStepSize(this.state.stepSize);
		this.unboundSetTimeScale(this.state.timeScale);
	}
	render() {
		return <div className={"timeControl"}>
			<TickModeSelection/>
			<Input defaultValue={this.state.stepSize} description="step size: " onChange={this.setStepSize}/>
			<Input defaultValue={this.state.timeScale} description="time scale: " onChange={this.setTimeScale}/>
		</div>
	}
}

export let updateConfigDisplay = (config)=>{};

export class Config extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			stepSize : 0.5,
			spellSpeed: 400,
			animationLock: 0.7,
			casterTax: 0.1,
			timeTillFirstManaTick: 1.2,
			countdown: 0,
			randomSeed: "",
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setSpellSpeed = this.unboundSetSpellSpeed.bind(this);
		this.setAnimationLock = this.unboundSetAnimationLock.bind(this);
		this.setCasterTax = this.unboundSetCasterTax.bind(this);
		this.setTimeTillFirstManaTick = this.unboundSetTimeTillFirstManaTick.bind(this);
		this.setCountdown = this.unboundSetCountdown.bind(this);
		this.setRandomSeed = this.unboundSetRandomSeed.bind(this);

		updateConfigDisplay = this.unboundUpdateConfigDisplay.bind(this);
	}

	unboundSetSpellSpeed(val) { this.setState({spellSpeed: val}) }
	unboundSetAnimationLock(val) { this.setState({animationLock: val}) }
	unboundSetCasterTax(val) { this.setState({casterTax: val}) }
	unboundSetTimeTillFirstManaTick(val) { this.setState({timeTillFirstManaTick: val}) }
	unboundSetCountdown(val) { this.setState({countdown: val}) }
	unboundSetRandomSeed(val) { this.setState({randomSeed: val }); }

	setConfigAndRestart() {
		let seed = this.state.randomSeed.length > 0 ?
			this.state.randomSeed : Math.random().toString();
		if (isNaN(parseFloat(this.state.spellSpeed)) ||
			isNaN(parseFloat(this.state.animationLock)) ||
			isNaN(parseFloat(this.state.casterTax)) ||
			isNaN(parseFloat(this.state.timeTillFirstManaTick)) ||
			isNaN(parseFloat(this.state.countdown))) {
			window.alert("Some config fields are not numbers!");
			return;
		}
		controller.setConfigAndRestart({
			spellSpeed: parseFloat(this.state.spellSpeed),
			animationLock: parseFloat(this.state.animationLock),
			casterTax: parseFloat(this.state.casterTax),
			timeTillFirstManaTick: parseFloat(this.state.timeTillFirstManaTick),
			countdown: parseFloat(this.state.countdown),
			randomSeed: seed,
		});
	}

	unboundUpdateConfigDisplay(config) {
		this.setState({
			spellSpeed: config.spellSpeed,
			animationLock: config.animationLock,
			casterTax: config.casterTax,
			timeTillFirstManaTick: config.timeTillFirstManaTick,
			countdown: config.countdown,
			randomSeed: config.randomSeed
		});
	}

	componentDidMount() {
		this.setConfigAndRestart();
	}

	componentWillUnmount() {
		updateConfigDisplay = (config)=>{};
	}

	handleSubmit (event) {
		this.setConfigAndRestart();
		event.preventDefault();
	}

	// TODO: how to let Input fields update....
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