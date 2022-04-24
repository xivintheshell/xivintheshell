import React, {ChangeEvent, CSSProperties} from 'react'
import {Expandable, Input, LoadJsonFromFileOrUrl, asyncFetch, saveToFile} from "./Common";
// @ts-ignore // FIXME
import {controller} from "../Controller/Controller";
import {ElemType, MarkerColor, MarkerElem} from "../Controller/Timeline";

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
	durationInputMode: DurationInputMode,
}
const enum DurationInputMode {
	Duration = "duration",
	EndTime = "endTime"
}
let asyncFetchJson = function(url: string, callback: (content: any)=>void) {
	asyncFetch(url, data=>{
		try {
			let content = JSON.parse(data);
			callback(content);
		} catch {
			console.log("parse error");
		}
	});
}

type TrackAndUrl = {track: number, url: string}
let loadPresets = function(tracks: TrackAndUrl[]) {
	tracks.forEach(trackAndUrl=>{
		asyncFetchJson(trackAndUrl.url, (content)=>{
			controller.timeline.appendMarkersPreset(content, trackAndUrl.track);
		});
	});
}

type BtnProps = {
	displayName: string,
	trackAndUrls: TrackAndUrl[]
}
function LoadPresetsBtn(props: BtnProps) {
	let style: CSSProperties = {
		marginBottom: 10,
		marginRight: 4,
	};
	return <button style={style} onClick={()=>{
		controller.timeline.deleteAllMarkers();
		loadPresets(props.trackAndUrls);
	}}>{props.displayName}</button>;
}

function PresetButtons() {
	// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/raid/
	return <div>
		<span>Presets: </span>
		<LoadPresetsBtn displayName={"P1S Shackles of Time first"} trackAndUrls={[
			{track: 0, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_0.txt"},
			{track: 1, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_1.txt"},
			{track: 2, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_2.txt"},
			{track: 3, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_3.txt"},
		]}/>
		<LoadPresetsBtn displayName={"P1S Aetherial Shackles first"} trackAndUrls={[
			{track: 0, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_aetherial_shackles_first_0.txt"},
			{track: 1, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_aetherial_shackles_first_1.txt"},
			{track: 2, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_aetherial_shackles_first_2.txt"},
			{track: 3, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_aetherial_shackles_first_3.txt"},
		]}/>
		<LoadPresetsBtn displayName={"P2S"} trackAndUrls={[
			{track: 0, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p2s_0.txt"},
			{track: 1, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p2s_1.txt"},
			{track: 2, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/p2s_2.txt"},
		]}/>
	</div>
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
	setDurationInputMode: (val: string) => void;

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
			loadTrackDest: "0",
			durationInputMode: DurationInputMode.Duration
		};
		this.setTime = ((val: string)=>{this.setState({nextMarkerTime: val})}).bind(this);
		this.setDuration = ((val: string)=>{this.setState({nextMarkerDuration: val})}).bind(this);
		this.setTrack = ((val: string)=>{this.setState({nextMarkerTrack: val})}).bind(this);
		this.setDescription = ((val: string)=>{this.setState({nextMarkerDescription: val})}).bind(this);

		this.setLoadTrackDest = ((val: string)=>{this.setState({loadTrackDest: val})}).bind(this);

		this.setDurationInputMode = ((val: string)=>{
			this.setState({durationInputMode: val});
		}).bind(this);
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
		let inlineDiv = {display: "inline-block", marginRight: "1em", marginBottom: 6};
		let colorOption = function(markerColor: MarkerColor, displayName: string) {
			return <option key={markerColor} value={markerColor}>{displayName}</option>
		}
		/*
		// TODO: input end time for duration
		let tmp =
			<select defaultValue={DurationInputMode.Duration}
					style={{display: "inline-block", outline: "none"}}
					onChange={this.setDurationInputMode}>
			</select>;
		 */
		let content = <div style={contentStyle}>
			<button style={{marginBottom: 10}} onClick={()=>{
				controller.timeline.deleteAllMarkers();
			}}>clear all markers</button>
			<PresetButtons/>
			<Expandable title={"Load tracks"} defaultShow={false} content={
				<div style={{padding: 10, paddingLeft: 16}}>
					<Input defaultValue={this.state.loadTrackDest} description={"Track: "} width={8} style={inlineDiv}
						   onChange={this.setLoadTrackDest}/>
					<LoadJsonFromFileOrUrl
						loadUrlOnMount={false}
						defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_0.txt"}
						onLoadFn={(content: any)=>{
							let track = parseInt(this.state.loadTrackDest);
							if (isNaN(track)) {
								window.alert("invalid track destination");
								return;
							}
							controller.timeline.appendMarkersPreset(content, track);
						}}/>
				</div>
			}/>
			<Expandable title={"Add marker"} defaultShow={false} content={
				<form style={{
					outline: "1px solid lightgrey",
					margin: "10px 0",
					marginLeft: 16,
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
						<select style={{display: "inline-block", outline: "none"}}
								value={this.state.nextMarkerColor}
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
			}/>
			<form>
				<span>Save current markers to file: </span>
				<input defaultValue={this.saveFilename} style={longInputStyle} onChange={this.onSaveFilenameChange}/>
				<span> (each track as a separate file) </span>
				<button type={"submit"} onClick={(e)=>{
					this.onSave();
					e.preventDefault();
				}}>save</button>
			</form>
		</div>;
		return <Expandable
			title="Timeline markers"
			content={content}
			defaultShow={false}/>
	}
}
export let timelineMarkerPresets = <TimelineMarkerPresets/>;
