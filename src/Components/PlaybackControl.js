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
		return <div onChange={this.onChangeValue}>
			<label>
				<input type={"radio"} value={TickMode.RealTime} defaultChecked={false} name={"tick mode"}/>
				{TickMode.RealTime}
			</label>
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

class ManualTick extends React.Component {
	constructor(props) {
		super(props);
		this.state = {value: 1, redirect: false};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit (event) {
		controller.requestTick({
			deltaTime: parseFloat(this.state.value)
		});
		event.preventDefault();
	}

	handleChange(event) {
		this.setState({value: event.target.value});
	}

	render(){
		const form =
			<form onSubmit={this.handleSubmit}>
				<span>Fast forward by seconds: </span>
				<input size="8" type="text"
					   value={this.state.value} onChange={this.handleChange}/>
				<input type="submit" value="GO"/>
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
			{/*
			<TickModeSelection/>
			{playPauseButton}
			{fastForwardButton}
			*/}
			<ManualTick/>
		</div>;
	}
}

export const playbackControl = <PlaybackControl/>;