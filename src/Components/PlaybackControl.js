import React from 'react';
import { controller } from '../Controller/Controller'
import { Clickable } from "./Common";

const TickMode = {
	RealTime: "real-time",
	RealTimeAutoPause: "real-time, auto pause",
	AutoFastForward: "auto fast forward",
	Manual: "manual"
};

class TickModeSelection extends React.Component
{
	constructor(props) {
		super(props);
		this.state = {
			tickMode: TickMode.Manual
		}
		this.onChangeValue = this.unboundOnSelectionChanged.bind(this);
	}
	unboundOnSelectionChanged(evt) {
		console.log(evt.target.value);
	}
	render() {
		return <div className={"tickModeSelection"} onChange={this.onChangeValue}>
			<label>
				<input type={"radio"} value={TickMode.RealTimeAutoPause} defaultChecked={false} name={"tick mode"}/>
				{TickMode.RealTimeAutoPause}
			</label>
			<label>
				<input type={"radio"} value={TickMode.AutoFastForward} defaultChecked={false} name={"tick mode"}/>
				{TickMode.AutoFastForward}
			</label>
			<label>
				<input type={"radio"} value={TickMode.Manual} defaultChecked={true} name={"tick mode"}/>
				{TickMode.Manual}
			</label>
		</div>
	}
}

class Config extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			stepSize : 0.5,
			spellSpeed: 400,
			slideCastDuration: 0.4,
			animationLock: 0.7,
			casterTax: 0.08,
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
				<input type="submit" value="confirm and restart"/>
			</form>;
		return (
			<div className={"manualTickSelection"}>{form}</div>
		)}
}

class PlaybackControl extends React.Component {
	render() {
		let playPauseButton = <Clickable onClickFn={()=>{
			controller.requestPlayPause({});
		}} content={"[Play/Pause]"}/>

		let fastForwardButton = <Clickable onClickFn={()=>{
			controller.requestFastForward({})
		}} content={"[Fast-forward]"}/>

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