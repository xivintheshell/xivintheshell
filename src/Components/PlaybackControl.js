import React from 'react';
import {controller} from '../Controller/Controller'
import {ButtonIndicator, Expandable, Help, Input} from "./Common";
import {TickMode} from "../Controller/Common";
import {ResourceType} from "../Game/Common";
import {resourceInfos} from "../Game/Resources";
import {CoolDownInfo} from "../Game/Resources";

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

function ConfigSummary(props) {
	let ct_2_5 = controller.gameConfig.adjustedCastTime(2.5).toFixed(2);
	let lucidTickOffset = controller.game.actorTickOffset.toFixed(2);
	let offsetDesc = "The random time offset of actor (lucid dreaming) ticks relative to MP ticks";
	let rngProc = controller.gameConfig.rngProcs;
	return <div>
		GCD: {ct_2_5}
		<br/>Actor tick offset <Help topic={"actorTickOffset"} content={offsetDesc}/>: {lucidTickOffset}
		{rngProc ? undefined : <span><br/>No rng procs</span>}
	</div>
}

// key, rscType, rscInfo
function ResourceOverrideDisplay(props) {
	let str;
	if (props.rscInfo.isCoolDown) {
		str = props.override.type + " full in " + props.override.timeTillFullOrDrop + "s";
	} else {
		str = props.override.type;
		if (props.override.type === ResourceType.LeyLines) str += " (" + (props.override.enabled ? "enabled" : "disabled") + ")";
		if (props.rscInfo.maxValue > 1 || props.override.type === ResourceType.Paradox) str += " (amount: " + props.override.stacks + ")";
		if (props.rscInfo.maxTimeout >= 0) str += " drops in " + props.override.timeTillFullOrDrop + "s";
	}
	return <div style={{marginTop: 10}}>{str}</div>;
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
			rngProcs: true,
			initialResourceOverrides: [],
			/////////
			selectedOverrideResource: ResourceType.Mana,
			overrideTimer: 0,
			overrideStacks: 0,
			overrideEnabled: true
		};
		this.handleSubmit = this.handleSubmit.bind(this);
		this.setSpellSpeed = this.unboundSetSpellSpeed.bind(this);
		this.setAnimationLock = this.unboundSetAnimationLock.bind(this);
		this.setCasterTax = this.unboundSetCasterTax.bind(this);
		this.setTimeTillFirstManaTick = this.unboundSetTimeTillFirstManaTick.bind(this);
		this.setCountdown = this.unboundSetCountdown.bind(this);
		this.setRandomSeed = this.unboundSetRandomSeed.bind(this);
		this.setrngProcs = this.unboundSetRngProcs.bind(this);

		this.setOverrideTimer = (val=>{ this.setState({overrideTimer: val}) }).bind(this);
		this.setOverrideStacks = (val=>{ this.setState({overrideStacks: val}) }).bind(this);
		this.setOverrideEnabled = (evt=>{ this.setState({overrideEnabled: evt.target.checked}) }).bind(this);

		updateConfigDisplay = ((config)=>{
			this.setState(config);
		}).bind(this);
	}

	unboundSetSpellSpeed(val) { this.setState({spellSpeed: val}) }
	unboundSetAnimationLock(val) { this.setState({animationLock: val}) }
	unboundSetCasterTax(val) { this.setState({casterTax: val}) }
	unboundSetTimeTillFirstManaTick(val) { this.setState({timeTillFirstManaTick: val}) }
	unboundSetCountdown(val) { this.setState({countdown: val}) }
	unboundSetRandomSeed(val) { this.setState({randomSeed: val}); }
	unboundSetRngProcs(evt) { this.setState({rngProcs: evt.target.checked}); }

	#addResourceOverride() {
		let rscType = this.state.selectedOverrideResource;
		let info = resourceInfos.get(rscType);

		let inputOverrideTimer = parseFloat(this.state.overrideTimer);
		let inputOverrideStacks = parseInt(this.state.overrideStacks);
		let inputOverrideEnabled = this.state.overrideEnabled;
		if (isNaN(inputOverrideStacks) || isNaN(inputOverrideTimer)) {
			window.alert("some inputs are not numbers!");
			return;
		}

		if (inputOverrideStacks < 0 || inputOverrideStacks > info.maxValue) {
			window.alert("invalid input amount (must be in range [0, " + info.maxValue + "]");
			return;
		}
		if (inputOverrideTimer < 0 || inputOverrideTimer > info.maxTimeout) {
			window.alert("invalid input timeout (must be in range [0, " + info.maxTimeout + "]");
			return;
		}

		let props = {
			type: rscType,
			timeTillFullOrDrop: info.maxTimeout >= 0 ? inputOverrideTimer : -1,
			stacks: info.maxValue > 1 ? inputOverrideStacks : 1,
			enabled: rscType === ResourceType.LeyLines ? inputOverrideEnabled : true,
		};
		let overrides = this.state.initialResourceOverrides;
		overrides.push(props);
		this.setState({initialResourceOverrides: overrides});
	}

	#addResourceOverrideNode() {
		let resourceOptions = [];
		let counter = 0;
		for (let k of resourceInfos.keys()) {
			resourceOptions.push(<option key={counter} value={k}>{k}</option>);
			counter++;
		}

		let rscType = this.state.selectedOverrideResource;
		let info = resourceInfos.get(rscType);
		let inputSection = undefined;
		if (info !== undefined) {
			inputSection = <div style={{margin: "6px 0"}}>{
				info.isCoolDown ?
					<Input description="Time till full: " defaultValue={this.state.overrideTimer}
						   onChange={this.setOverrideTimer}/> :
					<div>
						{/*timer*/}
						{info.maxTimeout >= 0 ? <Input
							description="Time till drop: "
							defaultValue={this.state.overrideTimer}
							onChange={this.setOverrideTimer}/> : undefined}

						{/*stacks*/}
						{info.maxValue > 1 || rscType === ResourceType.Paradox ? <Input
							description="Amount: "
							defaultValue={this.state.overrideStacks}
							onChange={this.setOverrideStacks}/> : undefined}

						{/*enabled*/}
						{rscType === ResourceType.LeyLines ? <div>
							<input style={{position: "relative", top: 3, marginRight: 5}}
								   type="checkbox"
								   checked={this.state.overrideEnabled}
								   onChange={this.setOverrideEnabled}
							/><span>enabled</span>

						</div> : undefined}
					</div>
			}</div>
		}

		return <div style={{marginTop: 16, outline: "1px solid lightgrey", outlineOffset: 6}}>
			<select value={this.state.selectedOverrideResource}
					onChange={evt=>{
						if (evt.target) {
							this.setState({
								selectedOverrideResource: evt.target.value,
								overrideEnabled: evt.target.value===ResourceType.LeyLines ?
									this.state.overrideEnabled : true
							});
						}
					}}>
				{resourceOptions}
			</select>
			{inputSection}
			<button onClick={evt=>{
				this.#addResourceOverride();
				evt.preventDefault();
			}}>add override</button>
		</div>
	}

	#resourceOverridesSection() {
		let resourceOverridesDisplayNodes = [];
		for (let i = 0; i < this.state.initialResourceOverrides.length; i++) {
			let override = this.state.initialResourceOverrides[i];
			let info = resourceInfos.get(override.type);
			// TODO: find a better way to display stuff
			resourceOverridesDisplayNodes.push(<ResourceOverrideDisplay key={i} override={override} rscInfo={info}/>);
		}
		return <div style={{marginTop: 10}}>
			<Expandable title="overrideInitialResources" titleNode={<span>
				Override initial resources <Help topic="overrideInitialResources" content={<div>
				ouch.
			</div>}/>
			</span>} content={<div>
				<button onClick={evt=>{
					this.setState({ initialResourceOverrides: [] });
					evt.preventDefault();
				}}>clear all overrides</button>
				{resourceOverridesDisplayNodes}
				{this.#addResourceOverrideNode()}
			</div>}/>
		</div>;
	}

	setConfigAndRestart(config) {
		if (isNaN(parseFloat(config.spellSpeed)) ||
			isNaN(parseFloat(config.animationLock)) ||
			isNaN(parseFloat(config.casterTax)) ||
			isNaN(parseFloat(config.timeTillFirstManaTick)) ||
			isNaN(parseFloat(config.countdown))) {
			window.alert("Some config fields are not numbers!");
			return;
		}
		if (config.initialResourceOverrides === undefined) {
			console.assert(false);
			return;
		}
		controller.setConfigAndRestart({
			spellSpeed: parseFloat(config.spellSpeed),
			animationLock: parseFloat(config.animationLock),
			casterTax: parseFloat(config.casterTax),
			timeTillFirstManaTick: parseFloat(config.timeTillFirstManaTick),
			countdown: parseFloat(config.countdown),
			randomSeed: config.randomSeed.trim(),
			rngProcs: config.rngProcs,
			initialResourceOverrides: config.initialResourceOverrides // info only
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
			rngProcs: this.state.rngProcs,
			initialResourceOverrides: this.state.initialResourceOverrides // info only
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
			{this.#resourceOverridesSection()}
			<input type="submit" value="apply and reset"/>
		</form>;
		return (
			<div className={"config"} style={{marginBottom: 16}}>
				<div style={{marginBottom: 5}}><b>Config</b></div>
				<ConfigSummary/> {/* retrieves data from global controller */}
				<Expandable title={"Edit"} content={editSection}/>
			</div>
		)}
}