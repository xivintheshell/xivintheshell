import React from 'react';
import { controller } from '../Controller/Controller'

export const TickMode = {
	RealTime: 0,
	RealTimeAutoPause: 1,
	Manual: 2
};

class TickModeSelection extends React.Component
{
	constructor(props) {
		super(props);
		this.onChangeValue = this.unboundOnSelectionChanged.bind(this);

		let desc0 = <div>
			<span>- click to use a skill just like in-game</span><br/>
			<span>- [space bar] to play/pause. game time is elapsing when the above region has a green border</span><br/><br/>
			<span>Note that keyboard inputs are only effective within the control region i.e. when the above box is purple/green</span><br/>
		</div>;
		let desc1 = <div>
			<span>*Recommended*</span><br/><br/>
			<span>- click to use a skill. or if it's not ready, click again to wait then retry</span><br/>
			<span>- [->] to advance time by "step size" as configured below</span><br/>
			<span>- [shift]+[->] to advance time by 1/5 "step size" as configured below</span><br/><br/>
			<span>Note that keyboard inputs are only effective within the control region i.e. when the above region has purple or green border.</span><br/>
		</div>
		let desc2 = <div>
			<span>- click to use a skill. or if it's not ready, click again to wait then retry</span><br/>
			<span>- [space bar] to advance game time to the earliest possible time for the next skill</span><br/>
			<span>- [->] to advance time by "step size" as configured below</span><br/>
			<span>- [shift]+[->] to advance time by 1/5 "step size" as configured below</span><br/><br/>
			<span>Note that keyboard inputs are only effective within the control region i.e. when the above region has purple or green border.</span><br/>
		</div>

		this.descriptions = [desc0, desc1, desc2];

		this.state = {
			description: this.descriptions[TickMode.RealTimeAutoPause],
		}
	}
	unboundOnSelectionChanged(evt) {
		let mode = parseInt(evt.target.value);
		controller.setTickMode(mode);
		this.setState({description: this.descriptions[mode]});
	}
	render() {
		return <div className={"tickModeSelection"} onChange={this.onChangeValue}>
			<label className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.RealTime} defaultChecked={false} name={"tick mode"}/>
				{"real-time"}
			</label>
			<label className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.RealTimeAutoPause} defaultChecked={true} name={"tick mode"}/>
				{"real-time auto pause"}
			</label>
			<label className={"tickModeOption"}>
				<input className={"radioButton"} type={"radio"} value={TickMode.Manual} defaultChecked={false} name={"tick mode"}/>
				{"manual"}
			</label>
			<div className={"tickModeDescription"}>{this.state.description}</div>
		</div>
	}
}

class Config extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			stepSize : 0.5,
			spellSpeed: 1300,
			slideCastDuration: 0.45,
			animationLock: 0.66,
			casterTax: 0.06,
			timeTillFirstManaTick: 1.5
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setConfigAndRestart();
	}

	setConfigAndRestart() {
		controller.setConfigAndRestart({
			stepSize: parseFloat(this.state.stepSize),
			spellSpeed: parseFloat(this.state.spellSpeed),
			slideCastDuration: parseFloat(this.state.slideCastDuration),
			animationLock: parseFloat(this.state.animationLock),
			casterTax: parseFloat(this.state.casterTax),
			timeTillFirstManaTick: parseFloat(this.state.timeTillFirstManaTick)
		});
	}

	handleSubmit (event) {
		this.setConfigAndRestart();
		event.preventDefault();
	}

	render() {
		const inStepSize = <input className={"numberInput"} size="5" type="text" value={this.state.stepSize} onChange={
			e=>{ this.setState({stepSize: e.target.value});}
		}/>;
		const inSpellSpeed = <input className={"numberInput"} size="5" type="text" value={this.state.spellSpeed} onChange={
			e=>{ this.setState({spellSpeed: e.target.value});}
		}/>;
		const inSlideCastDuration = <input className={"numberInput"} size="5" type="text" value={this.state.slideCastDuration} onChange={
			e=>{ this.setState({slideCastDuration: e.target.value});}
		}/>;
		const inAnimationLock = <input className={"numberInput"} size="5" type="text" value={this.state.animationLock} onChange={
			e=>{ this.setState({animationLock: e.target.value});}
		}/>;
		const inCasterTax = <input className={"numberInput"} size="5" type="text" value={this.state.casterTax} onChange={
			e=>{ this.setState({casterTax: e.target.value});}
		}/>;
		const inTimeTillFirstManaTick = <input className={"numberInput"} size="5" type="text" value={this.state.timeTillFirstManaTick} onChange={
			e=>{ this.setState({timeTillFirstManaTick: e.target.value});}
		}/>;
		const form =
			<form className={"config"} onSubmit={this.handleSubmit}>
				<span>step size = {inStepSize}, </span>
				<span>spell speed = {inSpellSpeed}, </span>
				<span>slide cast duration = {inSlideCastDuration}, </span>
				<span>animation lock = {inAnimationLock}, </span>
				<span>caster tax = {inCasterTax}, </span>
				<span>time till first mana tick = {inTimeTillFirstManaTick}. </span>
				<input type="submit" value="apply and reset"/>
			</form>;
		return (
			<div className={"manualTickSelection"}>{form}</div>
		)}
}

class PlaybackControl extends React.Component {
	render() {
		// TODO
		return <div className={"playbackControl"}>
			<TickModeSelection/>
			{/*
			{playPauseButton}
			{fastForwardButton}
			*/}
			<Config/>
		</div>;
	}
}

export var playbackControl = <PlaybackControl/>;