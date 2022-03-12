import React from 'react';
import { controller } from '../Controller/Controller'
import ReactTooltip from 'react-tooltip';

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
	}
	unboundOnSelectionChanged(evt) {
		let mode = parseInt(evt.target.value);
		controller.setTickMode(mode);
	}
	render() {
		return <div className={"tickModeSelection"} onChange={this.onChangeValue}>
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

class Config extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			stepSize : 0.5,
			spellSpeed: 1532,
			animationLock: 0.76,
			casterTax: 0.12,
			timeTillFirstManaTick: 1.5
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setConfigAndRestart();
	}

	setConfigAndRestart() {
		controller.setConfigAndRestart({
			stepSize: parseFloat(this.state.stepSize),
			spellSpeed: parseFloat(this.state.spellSpeed),
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
			<Config/>
		</div>;
	}
}

export var playbackControl = <PlaybackControl/>;