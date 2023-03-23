import React, {ChangeEvent, CSSProperties} from 'react'
import {
	Expandable,
	Input,
	LoadJsonFromFileOrUrl,
	asyncFetch,
	SaveToFile,
	parseTime,
	Help,
	FileFormat, ContentNode
} from "./Common";
import {controller} from "../Controller/Controller";
import {ElemType, MarkerColor, MarkerElem} from "../Controller/Timeline";
import {localize} from "./Localization";
import {getCurrentThemeColors} from "./ColorTheme";

/*
	For the sake of simplicity, tracks be like:

	track 0
	track 1
	...
	track -1 (auto)*

	*implement later

	put auto markers to a separate pool, so they can be cleared with battle reset
 */

export let setEditingMarkerValues = (marker: MarkerElem)=>{};

export let updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};

type TimelineMarkerPresetsProp = {};
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

function LoadCombinedTracksBtn(props: {displayName: string, url: string}) {
	let style: CSSProperties = {
		marginBottom: 10,
		marginRight: 4,
	};
	return <button style={style} onClick={()=>{
		asyncFetchJson(props.url, content => {
			controller.timeline.loadCombinedTracksPreset(content);
			controller.timeline.drawElements();
		});
	}}>{props.displayName}</button>
}

function PresetButtons() {
	// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/raid/
	return <div>
		<div style={{marginBottom: 10}}>{localize({en: "Presets: ", zh: "预设文件："})}</div>
		<LoadCombinedTracksBtn displayName={"P1S Shackles of Time first"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first.txt"}/>
		<LoadCombinedTracksBtn displayName={"P1S Aetherial Shackles first"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_aetherial_shackles_first.txt"}/>
		<LoadCombinedTracksBtn displayName={"P2S"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p2s.txt"}/>
		<br/>
		<LoadCombinedTracksBtn displayName={"DSR P7 by Santa"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/dsr_p7.txt"}/>
		<LoadCombinedTracksBtn displayName={"TOP by Santa (WIP, mechanics up to P5, updated 3/6)"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/TOP_2023_03_06.track"}/>
		<br/>
		<span>{localize({en: "From 不打冰3攻略组, in Chinese: ", zh: "来自不打冰3攻略组："})}</span>
		<LoadCombinedTracksBtn displayName={"P5S"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p5s_zh.txt"}/>
		<LoadCombinedTracksBtn displayName={"P6S"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p6s_zh.txt"}/>
		<LoadCombinedTracksBtn displayName={"P7S"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p7s_zh.txt"}/>
		<LoadCombinedTracksBtn displayName={"P8S门神蛇轴"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p8s_p1_snake_zh.txt"}/>
		<LoadCombinedTracksBtn displayName={"P8S门神车轴"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p8s_p1_beast_zh.txt"}/>
		<LoadCombinedTracksBtn displayName={"P8S本体"} url={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p8s_p2_zh.txt"}/>
	</div>
}

export class TimelineMarkerPresets extends React.Component {
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
			nextMarkerDescription: "",
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
		let colorOption = function(markerColor: MarkerColor, displayName: ContentNode) {
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
			fileFormat={FileFormat.Json}
			getContentFn={()=>{return controller.timeline.serializedCombinedMarkerTracks();}}
			filename={"tracks_all"}
			displayName={localize({en: "all tracks combined", zh: "所有轨道"})}
		/>);
		trackIndices.forEach(trackIndex=>{
			saveTrackLinks.push(<SaveToFile
				key={trackIndex}
				fileFormat={FileFormat.Json}
				getContentFn={()=>{ return controller.timeline.serializedSeparateMarkerTracks()[trackIndex]; }}
				filename={"track_" + trackIndex}
				displayName={localize({en: "track ", zh: "轨"}) + trackIndex.toString()}
			/>);
		});

		let btnStyle = {marginBottom: 10, marginRight: 4};
		let content = <div>
			<button style={btnStyle} onClick={()=>{
				controller.timeline.deleteAllMarkers();
			}}>{localize({en: "clear all markers", zh: "清空当前"})}</button>
			<button style={btnStyle} onClick={()=>{
				let count = controller.timeline.sortAndRemoveDuplicateMarkers();
				if (count > 0) {
					alert("removed " + count + " duplicate markers");
				} else {
					alert("no duplicate markers found");
				}
				controller.timeline.updateTimelineMarkers();
			}}>{localize({en: "remove duplicates", zh: "删除重复标记"})}</button>
			<PresetButtons/>
			<Expandable
				title={"Load tracks"}
				titleNode={<span>
					{localize({en: "Load tracks", zh: "导入"})} <Help topic={"load tracks"} content={localize({en: "when loading additional markers, current markers will not be deleted", zh: "载入新的标记时，时间轴上的已有标记不会被删除"})}/></span>}
				defaultShow={false}
				content={
				<div>
					<div className={"paragraph"}><b>{localize({en: "Multiple tracks combined", zh: "多轨文件"})}</b></div>
					<LoadJsonFromFileOrUrl
						allowLoadFromUrl={false}
						loadUrlOnMount={false}
						defaultLoadUrl={""}
						onLoadFn={(content: any)=>{
							controller.timeline.loadCombinedTracksPreset(content);
							controller.timeline.drawElements();
						}}/>
					<div className={"paragraph"}><b>{localize({en: "Individual track", zh: "单轨文件"})}</b></div>
					<div className={"paragraph"}>
						<Input defaultValue={this.state.loadTrackDest} description={localize({en: "Track: ", zh: "轨道序号："})} width={8} style={inlineDiv}
							   onChange={this.setLoadTrackDest}/>
						<LoadJsonFromFileOrUrl
							allowLoadFromUrl={false}
							loadUrlOnMount={false}
							defaultLoadUrl={"https://miyehn.me/ffxiv-blm-rotation/presets/markers/p1s_shackles_of_time_first_0.txt"}
							onLoadFn={(content: any)=>{
								let track = parseInt(this.state.loadTrackDest);
								if (isNaN(track)) {
									window.alert("invalid track destination");
									return;
								}
								controller.timeline.loadIndividualTrackPreset(content, track);
								controller.timeline.drawElements();
							}}/>
					</div>
				</div>
			}/>
			<Expandable title={"Add marker"} titleNode={localize({en: "Add marker", zh: "添加标记"})} defaultShow={false} content={
				<form style={{
					outline: "1px solid " + getCurrentThemeColors().bgMediumContrast,
					padding: "10px",
				}}>
					<Input defaultValue={this.state.nextMarkerTime} description={localize({en: "Time: ", zh: "时间："})} width={8} style={inlineDiv}
						   onChange={this.setTime}/>
					<Input defaultValue={this.state.nextMarkerDuration} description={localize({en: "Duration: ", zh: "持续时长："})} width={8}
						   style={inlineDiv} onChange={this.setDuration}/>

					<Input defaultValue={this.state.nextMarkerDescription} description={localize({en: "Description: ", zh: "描述："})} width={40}
						   onChange={this.setDescription}/>
					<Input defaultValue={this.state.nextMarkerTrack} description={localize({en: "Track: ", zh: "轨道序号："})} width={4}
						   style={inlineDiv} onChange={this.setTrack}/>
					<div style={{display: "inline-block", marginTop: "4px"}}>
						<span>{localize({en: "Color: ", zh: "颜色："})}</span>
						<select style={{display: "inline-block", outline: "none"}}
								value={this.state.nextMarkerColor}
								onChange={this.onColorChange}>{[
							colorOption(MarkerColor.Red, localize({en: "red", zh: "红"})),
							colorOption(MarkerColor.Orange, localize({en: "orange", zh: "橙"})),
							colorOption(MarkerColor.Yellow, localize({en: "yellow", zh: "黄"})),
							colorOption(MarkerColor.Green, localize({en: "green", zh: "绿"})),
							colorOption(MarkerColor.Cyan, localize({en: "cyan", zh: "青"})),
							colorOption(MarkerColor.Blue, localize({en: "blue", zh: "蓝"})),
							colorOption(MarkerColor.Purple, localize({en: "purple", zh: "紫"})),
							colorOption(MarkerColor.Pink, localize({en: "pink", zh: "粉"})) // lol forgot abt this earlier
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
						<span style={{marginLeft: 4}}>{localize({en: "show text", zh: "显示文字描述"})}</span>
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
						}}>{localize({en: "add marker", zh: "添加标记"})}
					</button>
				</form>
			}/>
			<div>
				<span>{localize({en: "Save marker tracks to file: ", zh: "保存标记到文件："})}</span>
				{saveTrackLinks}
			</div>
		</div>;
		return <Expandable
			title="Timeline markers"
			titleNode={<span>{localize({en: "Timeline markers", zh: "时间轴标记"})}</span>}
			content={content}
			defaultShow={false}/>
	}
}