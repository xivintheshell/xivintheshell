import React, {ChangeEvent, CSSProperties} from 'react'
import {Expandable, Input, LoadJsonFromFileOrUrl, asyncFetch, SaveToFile, parseTime, Help} from "./Common";
import {controller} from "../Controller/Controller";
import {ElemType, MarkerColor, MarkerElem} from "../Controller/Timeline";
import {FileType} from "../Controller/Common";

/*
	For the sake of simplicity, tracks be like:

	track 0
	track 1
	...
	track -1 (auto)*

	*implement later

	put auto markers to a separate pool, so they can be cleared with battle reset
 */

type Fixme = any;

export let setEditingMarkerValues = (marker: MarkerElem)=>{};

export let updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};

type TimelineMarkerPresetsProp = {}
type TimelineMarkerPresetsState = {
	nextMarkerColor: MarkerColor,
	nextMarkerTime: string,
	nextMarkerDuration: string,
	nextMarkerTrack: string,
	nextMarkerDescription: string,
	nextMarkerShowText: boolean,
	loadTrackDest: string,
	durationInputMode: DurationInputMode,
	/////////
	trackBins: Map<number, MarkerElem[]>
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
			controller.timeline.drawElements();
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
		<LoadPresetsBtn displayName={"DSR P7 by Santa"} trackAndUrls={[
			{track: 0, url: "https://miyehn.me/ffxiv-blm-rotation/presets/markers/dsr_p7_0.txt"},
		]}/>
	</div>
}

class TimelineMarkerPresets extends React.Component {
	saveFilename = "markers";
	state: TimelineMarkerPresetsState;

	onSaveFilenameChange: (evt: ChangeEvent<{value: string}>) => void;
	//onSave: () => void;
	onColorChange: (evt: ChangeEvent<{value: string}>) => void;
	onShowTextChange: React.ChangeEventHandler<HTMLInputElement>;

	setTime: (val: string) => void;
	setDuration: (val: string) => void;
	setTrack: (val: string) => void;
	setDescription: (val: string) => void;

	setLoadTrackDest: (val: string) => void;
	setDurationInputMode: (val: string) => void;

	constructor(props: TimelineMarkerPresetsProp) {
		super(props);
		setEditingMarkerValues = ((marker: MarkerElem)=>{
			this.setState({
				nextMarkerColor: marker.color,
				nextMarkerTime: marker.time.toString(),
				nextMarkerDuration: marker.duration.toString(),
				nextMarkerTrack: marker.track.toString(),
				nextMarkerDescription: marker.description,
				nextMarkerShowText: marker.showText,
			});
		}).bind(this);
		this.onSaveFilenameChange = ((evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) this.saveFilename = evt.target.value;
		}).bind(this);

		this.onColorChange = ((evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) {
				this.setState({nextMarkerColor: evt.target.value});
			}
		}).bind(this);

		this.onShowTextChange = ((evt: ChangeEvent<HTMLInputElement>)=>{
			if (evt.target) {
				this.setState({nextMarkerShowText: evt.target.checked});
			}
		}).bind(this);

		this.state = {
			nextMarkerColor: MarkerColor.Blue,
			nextMarkerTime: "0",
			nextMarkerDuration: "1",
			nextMarkerTrack: "0",
			nextMarkerDescription: "default description",
			nextMarkerShowText: false,
			loadTrackDest: "0",
			durationInputMode: DurationInputMode.Duration,
			///////
			trackBins: new Map()
		};
		this.setTime = ((val: string)=>{this.setState({nextMarkerTime: val})}).bind(this);
		this.setDuration = ((val: string)=>{this.setState({nextMarkerDuration: val})}).bind(this);
		this.setTrack = ((val: string)=>{this.setState({nextMarkerTrack: val})}).bind(this);
		this.setDescription = ((val: string)=>{this.setState({nextMarkerDescription: val})}).bind(this);

		this.setLoadTrackDest = ((val: string)=>{this.setState({loadTrackDest: val})}).bind(this);

		this.setDurationInputMode = ((val: string)=>{
			this.setState({durationInputMode: val});
		}).bind(this);

		updateMarkers_TimelineMarkerPresets = ((trackBins: Map<number, MarkerElem[]>) => {
			this.setState({trackBins: trackBins});
		}).bind(this);
	}

	componentWillUnmount() {
		updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};
		setEditingMarkerValues = (marker)=>{};
	}

	render() {
		let inlineDiv = {display: "inline-block", marginRight: "1em", marginBottom: 6};
		let colorOption = function(markerColor: MarkerColor, displayName: string) {
			return <option key={markerColor} value={markerColor}>{displayName}</option>
		}

		let trackIndices: number[] = [];
		this.state.trackBins.forEach((bin, trackIndex)=>{
			trackIndices.push(trackIndex);
		});
		trackIndices.sort();

		let saveTrackLinks: JSX.Element[] = [];
		saveTrackLinks.push(<SaveToFile
			key={"combined"}
			getContentFn={()=>{return controller.timeline.serializedCombinedMarkerTracks();}}
			filename={"tracks_all"}
			displayName={"all tracks combined"}
		/>);
		trackIndices.forEach(trackIndex=>{
			saveTrackLinks.push(<SaveToFile
				key={trackIndex}
				getContentFn={()=>{ return controller.timeline.serializedSeparateMarkerTracks()[trackIndex]; }}
				filename={"track_" + trackIndex}
				displayName={"track " + trackIndex}
			/>);
		});

		let content = <div>
			<button style={{marginBottom: 10}} onClick={()=>{
				controller.timeline.deleteAllMarkers();
			}}>clear all markers</button>
			<PresetButtons/>
			<Expandable
				title={"Load tracks"}
				titleNode={<span>
					Load tracks <Help topic={"load tracks"} content={"when loading additional markers, no current markers will be deleted"}/></span>}
				defaultShow={false}
				content={
				<div>
					<div className={"paragraph"}><b>Multiple tracks combined</b></div>
					<LoadJsonFromFileOrUrl
						allowLoadFromUrl={false}
						loadUrlOnMount={false}
						defaultLoadUrl={""}
						onLoadFn={(content: any)=>{
							if (content.fileType !== FileType.MarkerTracksCombined) {
								window.alert("wrong file type '" + content.fileType + "'");
								return;
							}
							content.tracks.forEach((track: Fixme) => {
								controller.timeline.appendMarkersPreset(track, track.track);
							});
							controller.timeline.drawElements();
						}}/>
					<div className={"paragraph"}><b>Individual track</b></div>
					<div className={"paragraph"}>
						<Input defaultValue={this.state.loadTrackDest} description={"Track: "} width={8} style={inlineDiv}
							   onChange={this.setLoadTrackDest}/>
						<LoadJsonFromFileOrUrl
							allowLoadFromUrl={true}
							loadUrlOnMount={false}
							defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_0.txt"}
							onLoadFn={(content: any)=>{
								if (content.fileType !== FileType.MarkerTrackIndividual) {
									window.alert("wrong file type '" + content.fileType + "'");
									return;
								}
								let track = parseInt(this.state.loadTrackDest);
								if (isNaN(track)) {
									window.alert("invalid track destination");
									return;
								}
								controller.timeline.appendMarkersPreset(content, track);
								controller.timeline.drawElements();
							}}/>
					</div>
				</div>
			}/>
			<Expandable title={"Add marker"} defaultShow={false} content={
				<form style={{
					outline: "1px solid lightgrey",
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
					<div style={{display: "inline-block", marginTop: "4px", marginLeft: "10px"}}>
						<input type="checkbox" style={{position: "relative", top: 3}} checked={this.state.nextMarkerShowText} onChange={this.onShowTextChange}/>
						<span style={{marginLeft: 4}}>show text</span>
					</div>
					<button
						type={"submit"}
						style={{display: "block", marginTop: "0.5em"}}
						onClick={(e) => {
							let marker: MarkerElem = {
								type: ElemType.Marker,
								time: parseTime(this.state.nextMarkerTime),
								duration: parseFloat(this.state.nextMarkerDuration),
								color: this.state.nextMarkerColor,
								track: parseInt(this.state.nextMarkerTrack),
								description: this.state.nextMarkerDescription,
								showText: this.state.nextMarkerShowText,
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
			<div>
				<span>Save marker tracks to file: </span>
				{saveTrackLinks}
			</div>
		</div>;
		return <Expandable
			title="Timeline markers"
			titleNode={<span>Timeline markers</span>}
			content={content}
			defaultShow={false}/>
	}
}
export let timelineMarkerPresets = <TimelineMarkerPresets/>;
