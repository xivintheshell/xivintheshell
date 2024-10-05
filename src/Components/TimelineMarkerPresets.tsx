import React, {ChangeEvent, CSSProperties} from 'react'
import {
	asyncFetch,
	ContentNode,
	Expandable,
	FileFormat,
	Help,
	Input,
	LoadJsonFromFileOrUrl,
	parseTime,
	SaveToFile
} from "./Common";
import {controller} from "../Controller/Controller";
import {ShellInfo, ShellJob} from "../Controller/Common";
import {ElemType, MarkerElem, MarkerType, UntargetableMarkerTrack} from "../Controller/Timeline";
import {localize, localizeBuffType} from "./Localization";
import {getCurrentThemeColors, MarkerColor} from "./ColorTheme";
import {Buff, buffInfos} from '../Game/Buffs';
import {BuffType} from '../Game/Common';

export let setEditingMarkerValues = (marker: MarkerElem)=>{};

export let updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};

type TimelineMarkerPresetsProp = {};
type TimelineMarkerPresetsState = {
	nextMarkerType: MarkerType,
	nextMarkerColor: MarkerColor,
	nextMarkerTime: string,
	nextMarkerDuration: string,
	nextMarkerTrack: string,
	nextMarkerDescription: string,
	nextMarkerShowText: boolean,
	nextMarkerBuff: BuffType,
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

function LoadCombinedTracksBtn(props: {displayName: ContentNode, url: string}) {
	let style: CSSProperties = {
		marginRight: 4,
	};
	return <button style={style} onClick={()=>{
		asyncFetchJson(props.url, content => {
			controller.timeline.loadCombinedTracksPreset(content);
			controller.updateStats();
			controller.timeline.drawElements();
		});
	}}>{props.displayName}</button>
}

function PresetButtons() {
	// https://github.com/OverlayPlugin/cactbot/tree/main/ui/raidboss/data/07-dt
	let content = <div style={{lineHeight: "2em"}}>
		<span>{localize({en: "Current tier: ", zh: "当前版本（英文）："})}</span>
		<LoadCombinedTracksBtn displayName={"M2S by shanzhe"} url={"/presets/markers/m2s.txt"}/>
		<LoadCombinedTracksBtn displayName={"M3S by shanzhe"} url={"/presets/markers/m3s.txt"}/>
		<LoadCombinedTracksBtn displayName={"M4S by shanzhe"} url={"/presets/markers/m4s.txt"}/>
		<br/>
		<span>{localize({en: "Ultimates: ", zh: "绝本（英文）："})}</span>
		<LoadCombinedTracksBtn displayName={"DSR P6 by Tischel"} url={"/presets/markers/dsr_p6.txt"}/>
		<LoadCombinedTracksBtn displayName={"DSR P7 by Santa"} url={"/presets/markers/dsr_p7.txt"}/>
		<LoadCombinedTracksBtn displayName={"TOP by Santa"} url={"/presets/markers/TOP_2023_04_02.track"}/>
	</div>
	return <Expandable title={"preset buttons"} titleNode={localize({en: "Presets", zh: "预设文件"})} defaultShow={true}
					   content={content}/>
}

export class TimelineMarkerPresets extends React.Component {

	state: TimelineMarkerPresetsState;

	onColorChange: (evt: ChangeEvent<{value: string}>) => void;
	onShowTextChange: React.ChangeEventHandler<HTMLInputElement>;
	onEnterBuffEdit: (buffType: BuffType) => void;

	setTime: (val: string) => void;
	setDuration: (val: string) => void;
	setTrack: (val: string) => void;
	setDescription: (val: string) => void;
	setBuff: (val: BuffType) => void;

	setLoadTrackDest: (val: string) => void;
	setDurationInputMode: (val: string) => void;

	constructor(props: TimelineMarkerPresetsProp) {
		super(props);
		setEditingMarkerValues = ((marker: MarkerElem)=>{
			if (marker.markerType === MarkerType.Info) {
				this.setState({
					nextMarkerType: marker.markerType,
					nextMarkerColor: marker.color,
					nextMarkerTime: marker.time.toString(),
					nextMarkerDuration: marker.duration.toString(),
					nextMarkerTrack: marker.track.toString(),
					nextMarkerDescription: marker.description,
					nextMarkerShowText: marker.showText,
				});
			} else if (marker.markerType === MarkerType.Untargetable) {
				this.setState({
					nextMarkerType: marker.markerType,
					nextMarkerTime: marker.time.toString(),
					nextMarkerDuration: marker.duration.toString(),
				});
			} else {
				this.setState({
					nextMarkerType: marker.markerType,
					nextMarkerTrack: marker.track.toString(),
					nextMarkerTime: marker.time.toString(),
					nextMarkerDuration: marker.duration.toString(),
					nextMarkerBuff: marker.description as BuffType
				})
			}
		});

		this.onColorChange = (evt: ChangeEvent<{value: string}>)=>{
			if (evt.target) {
				this.setState({nextMarkerColor: evt.target.value});
			}
		};

		this.onShowTextChange = (evt: ChangeEvent<HTMLInputElement>)=>{
			if (evt.target) {
				this.setState({nextMarkerShowText: evt.target.checked});
			}
		};

		this.onEnterBuffEdit = (buffType) => {
			const buff = new Buff(buffType);
			this.setState({nextMarkerDuration: buff.info.duration});
		}

		this.state = {
			nextMarkerType: MarkerType.Info,
			nextMarkerColor: MarkerColor.Blue,
			nextMarkerTime: "0",
			nextMarkerDuration: "1",
			nextMarkerTrack: "0",
			nextMarkerDescription: "",
			nextMarkerShowText: false,
			nextMarkerBuff: BuffType.TechnicalFinish,
			loadTrackDest: "0",
			durationInputMode: DurationInputMode.Duration,
			///////
			trackBins: new Map()
		};
		this.setTime = (val: string)=>{this.setState({nextMarkerTime: val})};
		this.setDuration = (val: string)=>{this.setState({nextMarkerDuration: val})};
		this.setTrack = (val: string)=>{this.setState({nextMarkerTrack: val})};
		this.setDescription = (val: string)=>{this.setState({nextMarkerDescription: val})};
		this.setBuff = (val: BuffType)=>{this.setState({nextMarkerBuff: val})};

		this.setLoadTrackDest = (val: string)=>{this.setState({loadTrackDest: val})};

		this.setDurationInputMode = (val: string)=>{
			this.setState({durationInputMode: val});
		};

		updateMarkers_TimelineMarkerPresets = ((trackBins: Map<number, MarkerElem[]>) => {
			this.setState({trackBins: trackBins});
		});
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
			let filePostfix: string = trackIndex >= 0 ? trackIndex.toString() : "untargetable";
			let displayName: ContentNode = localize({en: "track ", zh: "轨"}) + trackIndex.toString();
			if (trackIndex === UntargetableMarkerTrack) {
				displayName = localize({en: "track untargetable", zh: "不可选中标记轨"});
			}
			saveTrackLinks.push(<SaveToFile
				key={trackIndex}
				fileFormat={FileFormat.Json}
				getContentFn={()=>{
					let files = controller.timeline.serializedSeparateMarkerTracks();
					for (let i = 0; i < files.length; i++) {
						if (files[i].track === trackIndex) return files[i];
					}
					console.assert(false);
					return [];
				}}
				filename={"track_" + filePostfix}
				displayName={displayName}
			/>);
		});

		let btnStyle = {marginBottom: 10, marginRight: 4};

		let infoOnlySection = <div>
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
		</div>

		let buffCollection: JSX.Element[] = [];
		buffInfos.forEach(info => {
			// prevent starry from being selectable if we're the pictomancer
			if (ShellInfo.job === ShellJob.PCT && info.name !== BuffType.StarryMuse) {
				buffCollection.push(<option key={info.name} value={info.name}>{localizeBuffType(info.name)}</option>)
			}
		});

		let buffOnlySection = <div>
			<span>{localize({en: "Buff: ", zh: "团辅："})}</span>
			<select value={this.state.nextMarkerBuff}
					onChange={evt => {
						if (evt.target) {
							const buffType = evt.target.value as BuffType;
							this.setBuff(buffType);
							this.onEnterBuffEdit(buffType);
						}
					}}>{buffCollection}
			</select>

			<div style={{marginTop: 5}}>
				<Input defaultValue={this.state.nextMarkerTrack} description={localize({en: "Track: ", zh: "轨道序号："})} width={4}
						style={inlineDiv} onChange={this.setTrack}/>
			</div>
		</div>

		return <div>
			<button style={btnStyle} onClick={()=>{
				controller.timeline.deleteAllMarkers();
				controller.updateStats();
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
							controller.updateStats();
							controller.timeline.drawElements();
						}}/>
					<div className={"paragraph"}><b>{localize({en: "Individual track", zh: "单轨文件"})}</b></div>
					<div className={"paragraph"}>
						<Input defaultValue={this.state.loadTrackDest} description={localize({en: "Track: ", zh: "轨道序号："})} width={8} style={inlineDiv}
							   onChange={this.setLoadTrackDest}/>
						<LoadJsonFromFileOrUrl
							allowLoadFromUrl={false}
							loadUrlOnMount={false}
							defaultLoadUrl={"/presets/markers/p1s_shackles_of_time_first_0.txt"}
							onLoadFn={(content: any)=>{
								let track = parseInt(this.state.loadTrackDest);
								if (isNaN(track)) {
									window.alert("invalid track destination");
									return;
								}
								controller.timeline.loadIndividualTrackPreset(content, track);
								controller.updateStats();
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
					<span>{localize({en: "Type: ", zh: "类型："})}</span>
					<select value={this.state.nextMarkerType}
					        onChange={evt => {
								if (evt.target) {
									const markerType = evt.target.value as MarkerType;
									this.setState({
										nextMarkerType: markerType
									});
									if (markerType === MarkerType.Buff) {
										this.onEnterBuffEdit(this.state.nextMarkerBuff);
									}
								}
							}}>
						<option value={MarkerType.Info}>{localize({en: "Info", zh: "备注信息"})}</option>
						<option value={MarkerType.Untargetable}>{localize({en: "Untargetable", zh: "不可选中"})}</option>
						<option value={MarkerType.Buff}>{localize({en: "Buff", zh: "团辅"})}</option>
					</select>
					<span> </span>
					<Input defaultValue={this.state.nextMarkerTime} description={localize({en: "Time: ", zh: "时间："})} width={8} style={inlineDiv}
						   onChange={this.setTime}/>

					<Input defaultValue={this.state.nextMarkerDuration} description={localize({en: "Duration: ", zh: "持续时长："})} width={8}
						style={inlineDiv} onChange={this.setDuration}/>

					{this.state.nextMarkerType === MarkerType.Info ? infoOnlySection : undefined}
					{this.state.nextMarkerType === MarkerType.Buff ? buffOnlySection : undefined}
					<button
						type={"submit"}
						style={{display: "block", marginTop: "0.5em"}}
						onClick={(e) => {
							let marker: MarkerElem = {
								type: ElemType.Marker,
								markerType: this.state.nextMarkerType,
								time: parseTime(this.state.nextMarkerTime),
								duration: parseFloat(this.state.nextMarkerDuration),
								color: this.state.nextMarkerColor,
								track: parseInt(this.state.nextMarkerTrack),
								description: this.state.nextMarkerDescription,
								showText: this.state.nextMarkerShowText,
							};
							let err: ContentNode | undefined = undefined;
							if (this.state.nextMarkerType === MarkerType.Untargetable) {
								marker.color = MarkerColor.Grey;
								marker.track = UntargetableMarkerTrack;
								marker.description = "";
								marker.showText = true;
							}
							if (this.state.nextMarkerType === MarkerType.Buff) {
								const buff = new Buff(this.state.nextMarkerBuff);
								const duration = parseFloat(this.state.nextMarkerDuration);
								if (!isNaN(duration) && duration > buff.info.duration) {
									err = localize({
										en: `this buff can't last longer than ${buff.info.duration}s`,
										zh: `此团辅持续时间不能超过${buff.info.duration}秒`
									});
								}
								marker.color = buff.info.color;
								marker.description = buff.name;
								marker.duration = duration;
								marker.showText = true;
							}
							if (isNaN(marker.duration) ||
								isNaN(marker.time) ||
								isNaN(marker.track)) {
								err = localize({en: "some input(s) are invalid", zh: "部分输入格式不对"});
							}
							if (err) {
								window.alert(err);
								e.preventDefault();
								return;
							}
							controller.timeline.addMarker(marker);
							controller.updateStats();
							e.preventDefault();
						}}>{localize({en: "add marker", zh: "添加标记"})}
					</button>
				</form>
			}/>
			<div>
				<span>{localize({en: "Save marker tracks to file: ", zh: "保存标记到文件："})}</span>
				{saveTrackLinks}
			</div>
		</div>
	}
}
