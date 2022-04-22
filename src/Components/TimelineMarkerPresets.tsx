import React, {ChangeEvent} from 'react'
import {Expandable, Input, LoadJsonFromFileOrUrl, saveToFile} from "./Common";
// @ts-ignore // FIXME
import {controller} from "../Controller/Controller";
import {ElemType, MarkerColor, MarkerElem, SerializedMarker} from "../Controller/Timeline";

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

export let setEditingMarkerValues = (marker: MarkerElem)=>{};

type TimelineMarkerPresetsProp = {}
type TimelineMarkerPresetsState = {
	nextMarkerColor: MarkerColor,
	nextMarkerTime: string,
	nextMarkerDuration: string,
	nextMarkerTrack: string,
	nextMarkerDescription: string,
	loadTrackDest: string,
}
class TimelineMarkerPresets extends React.Component {
	saveFilename = "markers";
	state: TimelineMarkerPresetsState;

	onSaveFilenameChange: (evt: ChangeEvent<{value: string}>) => void;
	onSave: () => void;
	onColorChange: (evt: ChangeEvent<{value: string}>) => void;

	setTime: (val: string) => void;
	setDuration: (val: string) => void;
	setTrack: (val: string) => void;
	setDescription: (val: string) => void;

	setLoadTrackDest: (val: string) => void;

	constructor(props: TimelineMarkerPresetsProp) {
		super(props);
		updateTimelineMarkerPresetsView = (()=>{this.forceUpdate();}).bind(this);
		setEditingMarkerValues = ((marker: MarkerElem)=>{
			this.setState({
				nextMarkerColor: marker.color,
				nextMarkerTime: marker.time.toString(),
				nextMarkerDuration: marker.duration.toString(),
				nextMarkerTrack: marker.track.toString(),
				nextMarkerDescription: marker.description
			});
		}).bind(this);
		this.onSaveFilenameChange = ((evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) this.saveFilename = evt.target.value;
		}).bind(this);

		this.onSave = (()=>{
			let files = controller.timeline.serializedMarkers();
			for (let i = 0; i < files.length; i++) {
				saveToFile(files[i], this.saveFilename + "_" + i + ".txt");
			}
		}).bind(this);

		this.onColorChange = ((evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) {
				this.setState({nextMarkerColor: evt.target.value});
			}
		}).bind(this);

		this.state = {
			nextMarkerColor: MarkerColor.Blue,
			nextMarkerTime: "0",
			nextMarkerDuration: "1",
			nextMarkerTrack: "0",
			nextMarkerDescription: "default description",
			loadTrackDest: "0"
		};
		this.setTime = ((val: string)=>{this.setState({nextMarkerTime: val})}).bind(this);
		this.setDuration = ((val: string)=>{this.setState({nextMarkerDuration: val})}).bind(this);
		this.setTrack = ((val: string)=>{this.setState({nextMarkerTrack: val})}).bind(this);
		this.setDescription = ((val: string)=>{this.setState({nextMarkerDescription: val})}).bind(this);

		this.setLoadTrackDest = ((val: string)=>{this.setState({loadTrackDest: val})}).bind(this);
	}
	componentWillUnmount() {
		updateTimelineMarkerPresetsView = ()=>{};
		setEditingMarkerValues = (marker)=>{};
	}

	render() {
		let contentStyle = {
			margin: "10px",
			paddingLeft: "10px",
		};
		let longInputStyle = {
			outline: "none",
			border: "none",
			borderBottom: "1px solid black",
			width: "10em",
		};
		let inlineDiv = {display: "inline-block", marginRight: "1em"};
		let colorOption = function(markerColor: MarkerColor, displayName: string) {
			return <option key={markerColor} value={markerColor}>{displayName}</option>
		}
		let content = <div style={contentStyle}>
			<Input defaultValue={this.state.loadTrackDest} description={"Load into track: "} width={8} style={inlineDiv}
				   onChange={this.setLoadTrackDest}/>
			<LoadJsonFromFileOrUrl
				defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/p1s_0.txt"}
				// FIXME
				onLoadFn={(content: any)=>{
					let track = parseInt(this.state.loadTrackDest);
					if (isNaN(track)) {
						window.alert("invalid track destination");
						return;
					}
					controller.timeline.appendMarkersPreset(content, track);
				}}/>
			<form style={{
				outline: "1px solid lightgrey",
				margin: "10px 0",
				padding: "10px",
			}}>
				<Input defaultValue={this.state.nextMarkerTime} description={"Time: "} width={8} style={inlineDiv}
					   onChange={this.setTime}/>
				<Input defaultValue={this.state.nextMarkerDuration} description={"Duration: "} width={8}
					   style={inlineDiv} onChange={this.setDuration}/>
				<Input defaultValue={this.state.nextMarkerDescription} description={"Description: "} width={40}
					   onChange={this.setDescription}/>
				<Input defaultValue={this.state.nextMarkerTrack} description={"Track: "} width={4}
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
						let parseTime = (timeStr: string): number => {
							let val = timeStr.trim();
							let colonIndex = val.indexOf(':');
							if (colonIndex < 0) {
								return parseFloat(val);
							}
							let minute = parseInt(val.substring(0, colonIndex));
							let second = parseFloat(val.substring(colonIndex + 1));
							return minute * 60 + second;
						};
						let marker: MarkerElem = {
							type: ElemType.Marker,
							time: parseTime(this.state.nextMarkerTime),
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
				<span>Save markers to file: </span>
				<input defaultValue={this.saveFilename} style={longInputStyle} onChange={this.onSaveFilenameChange}/>
				<span> (each track as a separate file) </span>
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
