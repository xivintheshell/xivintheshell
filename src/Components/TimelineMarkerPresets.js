import React from 'react'
import {Expandable, Input, LoadJsonFromFileOrUrl, saveToFile} from "./Common";
import {controller} from "../Controller/Controller";
import {ElemType, MarkerColor} from "../Controller/Timeline";

/*
	Load markers from file: [choose file] No file chosen
	Load markers from URL: __________[load]
	----
	| Time: ______ Duration: ______
	| Description: __________
	| Track: ______ Color: [dropdown]
	| [add marker]
	----
	Save markers to file as: __________[save]
	[clear all markers]
 */

/*
	For the sake of simplicity, tracks be like:

	track 0
	track 1
	...
	track -1 (auto)*

	*implement later

	put auto markers to a separate pool, so they can be cleared with battle reset
 */


export let updateTimelineMarkerPresetsView = ()=>{};

class TimelineMarkerPresets extends React.Component {
	saveFilename = "markers.txt";
	constructor(props) {
		super(props);
		updateTimelineMarkerPresetsView = this.unboundUpdatePresetsView.bind(this);
		this.onSaveFilenameChange = this.unboundOnSaveFilenameChange.bind(this);
		this.onSave = this.unboundOnSave.bind(this);
		this.onColorChange = this.unboundOnColorChange.bind(this);
		this.state = {
			nextMarkerColor: MarkerColor.Blue,
			nextMarkerTime: "0",
			nextMarkerDuration: "1",
			nextMarkerTrack: "0",
			nextMarkerDescription: "default description"
		};
		this.setTime = this.unboundSetTime.bind(this);
		this.setDuration = this.unboundSetDuration.bind(this);
		this.setTrack = this.unboundSetTrack.bind(this);
		this.setDescription = this.unboundSetDescription.bind(this);
	}
	componentWillUnmount() {
		updateTimelineMarkerPresetsView = ()=>{};
	}
	unboundOnSaveFilenameChange(evt) {
		if (evt.target) this.saveFilename = evt.target.value;
	}
	unboundOnSave(e) {
		saveToFile(controller.timeline.serializedMarkers(), this.saveFilename);
	}
	unboundOnColorChange(evt) {
		if (evt.target) {
			this.setState({nextMarkerColor: evt.target.value});
		}
	}
	unboundSetTime(val) { this.setState({nextMarkerTime: val}); }
	unboundSetDuration(val) { this.setState({nextMarkerDuration: val}); }
	unboundSetTrack(val) { this.setState({nextMarkerTrack: val}); }
	unboundSetDescription(val) { this.setState({nextMarkerDescription: val}); }

	unboundUpdatePresetsView() { this.forceUpdate(); }
	render() {
		let contentStyle = {
			margin: "10px",
			paddingLeft: "10px",
		};
		let longInputStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid black",
			width: "20em",
		};
		let inlineDiv = {display: "inline-block", marginRight: "1em"};
		let colorOption = function(markerColor, displayName) {
			return <option key={markerColor} value={markerColor}>{displayName}</option>
		}
		let content = <div style={contentStyle}>
			<LoadJsonFromFileOrUrl
				defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/defaultMarkers.txt"}
				onLoadFn={(content)=>{
					controller.timeline.appendMarkersPreset(content);
				}}/>
			<form style={{
				outline: "1px solid lightgrey",
				margin: "10px 0",
				padding: "10px",
			}}>
				<Input defaultValue={this.state.nextMarkerTime} description={"Time: "} width={5} style={inlineDiv}
					   onChange={this.setTime}/>
				<Input defaultValue={this.state.nextMarkerDuration} description={"Duration: "} width={5}
					   style={inlineDiv} onChange={this.setDuration}/>
				<Input defaultValue={this.state.nextMarkerDescription} description={"Description: "} width={40}
					   onChange={this.setDescription}/>
				<Input defaultValue={this.state.nextMarkerTrack} description={"Track: "} width={5}
					   style={inlineDiv} onChange={this.setTrack}/>
				<div style={{display: "inline-block", marginTop: "4px"}}>
					<span>Color: </span>
					<select defaultValue={this.state.nextMarkerColor}
						style={{display: "inline-block", outline: "none"}}
						onChange={this.onColorChange}>{[
						colorOption(MarkerColor.Red, "red"),
						colorOption(MarkerColor.Orange, "orange"),
						colorOption(MarkerColor.Yellow, "yellow"),
						colorOption(MarkerColor.Green, "green"),
						colorOption(MarkerColor.Cyan, "cyan"),
						colorOption(MarkerColor.Blue, "blue"),
						colorOption(MarkerColor.Purple, "purple"),
					]}</select>
					<div style={{
						background: this.state.nextMarkerColor,
						marginLeft: "4px",
						display: "inline-block",
						verticalAlign: "middle",
						height: "1em",
						width: "4em",
					}}/>
				</div>
				<button
					type={"submit"}
					style={{display: "block", marginTop: "0.5em"}}
					onClick={(e) => {
						let marker = {
							type: ElemType.Marker,
							time: parseFloat(this.state.nextMarkerTime),
							duration: parseFloat(this.state.nextMarkerDuration),
							color: this.state.nextMarkerColor,
							track: parseInt(this.state.nextMarkerTrack),
							description: this.state.nextMarkerDescription
						};
						if (isNaN(marker.duration) ||
							isNaN(marker.time) ||
							isNaN(marker.track)) {
							window.alert("some input(s) are invalid");
							e.preventDefault();
							return;
						}
						controller.timeline.addMarker(marker);
						e.preventDefault();
					}}>add marker
				</button>
			</form>
			<form>
				<span>Save markers to file as: </span>
				<input defaultValue={this.saveFilename} style={longInputStyle} onChange={this.onSaveFilenameChange}/>
				<button type={"submit"} onClick={(e)=>{
					this.onSave();
					e.preventDefault();
				}}>save</button>
			</form>
			<button onClick={()=>{
				controller.timeline.deleteAllMarkers();
			}}>clear all markers</button>
		</div>;
		return <Expandable
			title="Timeline markers"
			content={content}
			defaultShow={true}/>
	}
}
export let timelineMarkerPresets = <TimelineMarkerPresets/>;
