import React, {
	ChangeEvent,
	createContext,
	CSSProperties,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	asyncFetch,
	Columns,
	ContentNode,
	Expandable,
	FileFormat,
	Help,
	Input,
	LoadJsonFromFileOrUrl,
	parseTime,
	SaveToFile,
} from "./Common";
import { controller } from "../Controller/Controller";
import {
	ElemType,
	MarkerElem,
	MarkerType,
	SerializedMarker,
	UntargetableMarkerTrack,
} from "../Controller/Timeline";
import {
	Language,
	localize,
	localizeBuffType,
	LocalizedContent,
	localizeLanguage,
} from "./Localization";
import { getThemeField, MarkerColor, ColorThemeContext } from "./ColorTheme";
import { Buff, buffInfos } from "../Game/Buffs";
import { BuffType } from "../Game/Common";
import { TIMELINE_COLUMNS_HEIGHT } from "./Timeline";
import { updateInvalidStatus } from "./TimelineEditor";
import { FileType } from "../Controller/Common";
import {
	ARCHIVE_TRACKS,
	displayFightKind,
	FightKind,
	LEGACY_ULTIMATE_TRACKS,
	MarkerTrackMeta,
	RECENT_CONTENT_TRACKS,
	TRACK_META_MAP,
} from "./TimelineMarkerPresets";

export let setEditingMarkerValues = (marker: MarkerElem) => {};

export let updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};

const PRESET_MARKERS_BASE = "/presets/markers/";

export type MarkerTrackIndividual = {
	fileType: FileType.MarkerTrackIndividual;
	track: number;
	markers: SerializedMarker[];
};

export type MarkerTracksCombined = {
	fileType: FileType.MarkerTracksCombined;
	tracks: MarkerTrackIndividual[];
};

type PhasedTrack = {
	offset: number;
	label: LocalizedContent;
	fileName: string;
};

export type MarkerTrackSet = {
	fileType: FileType.MarkerTrackSet;
	// Note: when loading a trackset, any events that occur before the offset of a subsequent
	// phase (e.g. a skipped enrage cast) will be cut off.
	phasedTracks: PhasedTrack[];
};

type TimelineMarkersState = {
	nextMarkerType: MarkerType;
	nextMarkerColor: MarkerColor;
	nextMarkerTime: string;
	nextMarkerDuration: string;
	nextMarkerTrack: string;
	nextMarkerDescription: string;
	nextMarkerShowText: boolean;
	nextMarkerBuff: BuffType;
	loadTrackDest: string;
	offsetStr: string;
	/////////
	trackBins: Map<number, MarkerElem[]>;
};
const asyncFetchJson = function (url: string, callback: (content: any) => void) {
	asyncFetch(url, (data) => {
		try {
			const content = JSON.parse(data);
			callback(content);
		} catch (e) {
			console.log("Error fetching/parsing JSON " + url);
			console.error(e);
		}
	});
};

const OffsetContext = createContext("");

function doPresetTrackLoad(
	content: MarkerTracksCombined,
	globalOffset?: string,
	localOffset?: string,
) {
	const parsedGlobalOffset = parseTime(globalOffset ?? "");
	const parsedLocalOffset = parseTime(localOffset ?? "");
	controller.timeline.loadCombinedTracksPreset(
		content,
		(isNaN(parsedGlobalOffset) ? 0 : parsedGlobalOffset) +
			(isNaN(parsedLocalOffset) ? 0 : parsedLocalOffset),
	);
	controller.updateStats();
	controller.timeline.drawElements();
}

function LoadCombinedTracksBtn(props: { displayName: ContentNode; url: string }) {
	const offsetCtx = useContext(OffsetContext);
	return <button
		onClick={(e) =>
			asyncFetchJson(props.url, (content) => doPresetTrackLoad(content, offsetCtx))
		}
	>
		{props.displayName}
	</button>;
}

function metaToTitleText(meta: MarkerTrackMeta, showAuthors: boolean): LocalizedContent {
	return {
		en:
			(meta.authors?.length ?? 0) > 0 && showAuthors
				? `${meta.name.en} by ${meta.authors?.join(" & ")}`
				: meta.name.en,
		zh:
			(meta.authors?.length ?? 0) > 0 && showAuthors
				? `${meta.name.zh}（来自${meta.authors?.join("+")}）`
				: meta.name.zh,
	};
}

type TrackDisplayProps = { meta: MarkerTrackMeta; fileName: string; showAuthors: boolean };

function TrackDisplay(props: TrackDisplayProps) {
	return <div style={{ marginBlock: 1 }}>
		<LoadCombinedTracksBtn
			displayName={localize(metaToTitleText(props.meta, props.showAuthors))}
			url={PRESET_MARKERS_BASE + props.fileName + ".txt"}
		/>
	</div>;
}

function TrackSetDisplay(props: TrackDisplayProps) {
	const [offsetMap, setOffsetMap] = useState(new Map<string, string>());
	const [phasedTracks, setPhasedTracks] = useState<PhasedTrack[] | undefined>(undefined);
	useEffect(() => {
		asyncFetchJson(PRESET_MARKERS_BASE + props.fileName + ".txt", (blob) => {
			if (blob.fileType !== FileType.MarkerTrackSet) {
				console.error(
					`while parsing ${props.fileName}, got invalid file type ${blob.fileType}`,
				);
			} else {
				setPhasedTracks(blob.phasedTracks);
			}
		});
	}, []);
	const body = <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 4 }}>
		{phasedTracks?.map(({ offset, label, fileName }, i) => <React.Fragment key={i}>
			<div style={{ gridRow: i + 1, gridColumn: 1 }}>
				<Input
					description="@"
					defaultValue={offsetMap.get(fileName)?.toString() ?? ""}
					onChange={(v: string) => setOffsetMap(new Map(offsetMap).set(fileName, v))}
					width={8}
					placeholder={offset.toString()}
				/>
			</div>
			<div style={{ gridRow: i + 1, gridColumn: 2 }}>
				<LoadCombinedTracksBtn
					displayName={localize(label)}
					url={PRESET_MARKERS_BASE + fileName}
				/>
			</div>
		</React.Fragment>) ??
			localize({
				en: "loading phases...",
			})}
	</div>;
	const globalOffset = useContext(OffsetContext);
	return <div
		style={{
			display: "flex",
			flexDirection: "column",
			paddingBlock: 8,
			paddingInline: 4,
			marginBlockEnd: 10,
			border: "1px dashed",
		}}
	>
		<Expandable
			title={`trackPresets-phase-${props.fileName}`}
			titleNode={
				<div
					style={{
						display: "inline-flex",
						flexDirection: "row",
						gap: 4,
						alignItems: "center",
						marginBottom: 4,
					}}
				>
					<div>{localize(metaToTitleText(props.meta, props.showAuthors))}</div>
					<div>
						<button
							onClick={(e) => {
								e.stopPropagation(); // Don't trigger the expandable
								// Ideally we would rewrite asyncFetchJson to be more promise-y and we
								// can then await all the tracks being loaded together
								phasedTracks?.forEach((track) =>
									asyncFetchJson(
										PRESET_MARKERS_BASE + track.fileName, // do not include txt extension here
										// TODO apply action cutoff for next phase
										(content) =>
											doPresetTrackLoad(
												content,
												globalOffset,
												offsetMap.get(track.fileName) ??
													track.offset.toString(),
											),
									),
								);
							}}
						>
							{localize({ en: "Load all phases" })}
						</button>
					</div>
				</div>
			}
			noMargin
			autoIndent={false}
			content={body}
		/>
	</div>;
}

type FightGroup = {
	unphased: string[];
	phased: string[];
	// If all tracks in this group share the same author(s), then display it in the section label.
	// Otherwise, display them individually.
	commonAuthors?: string[];
};

function TrackCollection(props: {
	label: LocalizedContent;
	trackList: string[];
	defaultShow?: boolean;
}) {
	// Group fight lists by their category + language. Phased fights are displayed after un-phased
	// ones because their offsets require more space.
	const trackGroups = new Map<FightKind, Map<Language, FightGroup>>();
	const addToGroup = (fileName: string) => {
		const trackMeta = TRACK_META_MAP.get(fileName);
		if (!trackMeta) {
			console.error("missing track metadata declaration for " + fileName);
			return;
		}
		if (!trackGroups.has(trackMeta.fightKind)) {
			trackGroups.set(trackMeta.fightKind, new Map());
		}
		const group = trackGroups.get(trackMeta.fightKind)!;
		trackMeta.supportedLanguages.forEach((lang) => {
			if (!group.has(lang)) {
				group.set(lang, { unphased: [], phased: [], commonAuthors: trackMeta.authors });
			}
			const langGroup = group.get(lang)!;
			(trackMeta.phased ? langGroup.phased : langGroup.unphased).push(fileName);
			// i hate javascript i hate javascript i hate javascript
			if (trackMeta.authors?.join("+") !== langGroup.commonAuthors?.join("+")) {
				langGroup.commonAuthors = undefined;
			}
		});
	};
	props.trackList.map(addToGroup);
	const pStyle: CSSProperties = { marginBlock: 1 };
	const body = <div
		style={{
			display: "flex",
			flexDirection: "column",
			marginTop: 4,
			paddingInlineStart: 6,
			marginInlineStart: 10,
		}}
	>
		{trackGroups
			.entries()
			.map(([kind, langMap], i) =>
				langMap
					.entries()
					.flatMap(([lang, group]) => [
						<div key={`${i}-${lang}`}>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									flexWrap: "wrap",
									gap: 4,
									alignItems: "baseline",
								}}
							>
								{localize({
									en: group.commonAuthors ? (
										<p style={pStyle}>
											{displayFightKind(kind)} ({localizeLanguage(lang)}) by{" "}
											{group.commonAuthors.join(" & ")}:
										</p>
									) : (
										<p style={pStyle}>
											{displayFightKind(kind)} ({localizeLanguage(lang)}):
										</p>
									),
									zh: group.commonAuthors ? (
										<p style={pStyle}>
											{displayFightKind(kind)}（{localizeLanguage(lang)}，来自
											{group.commonAuthors.join("+")}）：
										</p>
									) : (
										<p style={pStyle}>
											{displayFightKind(kind)}（{localizeLanguage(lang)}）：
										</p>
									),
								})}
								{group.unphased.map((label, j) => <TrackDisplay
									key={j}
									meta={TRACK_META_MAP.get(label)!}
									fileName={label}
									showAuthors={!group.commonAuthors}
								/>)}
							</div>
							<div
								style={{
									width: "60%",
									paddingInlineStart: 10,
									marginInlineEnd: 10,
								}}
							>
								{group.phased.map((label, j) => <TrackSetDisplay
									key={j}
									meta={TRACK_META_MAP.get(label)!}
									fileName={label}
									showAuthors={!group.commonAuthors}
								/>)}
							</div>
						</div>,
					])
					.toArray(),
			)
			.toArray()}
	</div>;
	return <Expandable
		title={`trackPresets-${props.label.en}`}
		titleNode={localize(props.label)}
		defaultShow={props.defaultShow}
		autoIndent={false}
		content={body}
	/>;
}

export function TimelineMarkers() {
	const [offsetStr, setOffsetStr] = useState("");
	// TODO update these tooltips
	const offsetHelpEn =
		"When specified, all imported and preset tracks will start from the specified timestamp." +
		" Use this to combine markers for multi-phase fights with varying kill times.";
	const offsetHelpZh: string =
		"不为空时，下方所有导入的时间轴文件和预设都将从这个时间点开始。可以用此功能自行组合不同P的时间轴文件。";
	const parsedTime = parseTime(offsetStr);
	const offsetInput = <Input
		defaultValue={offsetStr}
		description={
			<>
				<span
					style={{
						color: isNaN(parsedTime) || parsedTime === 0 ? "" : MarkerColor.Purple,
					}}
				>
					{localize({
						en: "Load tracks starting at timestamp ",
						zh: "载入文件到此时间点 ",
					})}
				</span>
				<Help
					topic={"trackLoadOffset"}
					content={localize({ en: offsetHelpEn, zh: offsetHelpZh })}
				/>
				:
			</>
		}
		width={4}
		onChange={setOffsetStr}
	/>;

	const actionsSection = <>
		<button
			onClick={() => {
				controller.timeline.deleteAllMarkers();
				controller.updateStats();
			}}
		>
			{localize({ en: "clear all markers", zh: "清空当前" })}
		</button>
		<button
			onClick={() => {
				const count = controller.timeline.sortAndRemoveDuplicateMarkers();
				if (count > 0) {
					alert("removed " + count + " duplicate markers");
				} else {
					alert("no duplicate markers found");
				}
				controller.timeline.updateTimelineMarkers();
			}}
		>
			{localize({ en: "remove duplicates", zh: "删除重复标记" })}
		</button>
		<span>
			{localize({
				en: ", click to delete single markers",
				zh: "，可点击删除单个标记",
			})}
		</span>
	</>;
	// TODO: load/save buttons, custom marker/buff input
	return <Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>
		{[
			{
				defaultSize: 50,
				content: <>
					<p>
						<b>{localize({ en: "Presets", zh: "预设文件" })}</b>
					</p>
					<div>{offsetInput}</div>
					<TrackCollection
						label={{ en: "Current content" }}
						trackList={RECENT_CONTENT_TRACKS}
						defaultShow
					/>
					<TrackCollection
						label={{ en: "Legacy ultimates", zh: "过去绝本" }}
						trackList={LEGACY_ULTIMATE_TRACKS}
						defaultShow
					/>
					<p>
						<b>Archive</b>
					</p>
					{Array.from(
						ARCHIVE_TRACKS.entries().map(([header, trackList], i) => <div key={i}>
							<TrackCollection label={{ en: header }} trackList={trackList} />
						</div>),
					)}
				</>,
			},
			{
				defaultSize: 50,
				content: <>
					{actionsSection}
					<p>
						<b>{localize({ en: "Add buffs/markers", zh: "添加buff和标记" })}</b>
					</p>
				</>,
			},
		]}
	</Columns>;
}

export class OldTimelineMarkers extends React.Component {
	state: TimelineMarkersState;

	onColorChange: (evt: ChangeEvent<{ value: string }>) => void;
	onShowTextChange: React.ChangeEventHandler<HTMLInputElement>;
	onEnterBuffEdit: (buffType: BuffType) => void;

	setOffset: (val: string) => void;
	setTime: (val: string) => void;
	setDuration: (val: string) => void;
	setTrack: (val: string) => void;
	setDescription: (val: string) => void;
	setBuff: (val: BuffType) => void;

	setLoadTrackDest: (val: string) => void;

	static contextType = ColorThemeContext;

	constructor() {
		super({});
		setEditingMarkerValues = (marker: MarkerElem) => {
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
					nextMarkerBuff: marker.description as BuffType,
				});
			}
		};

		this.onColorChange = (evt: ChangeEvent<{ value: string }>) => {
			if (evt.target) {
				this.setState({ nextMarkerColor: evt.target.value });
			}
		};

		this.onShowTextChange = (evt: ChangeEvent<HTMLInputElement>) => {
			if (evt.target) {
				this.setState({ nextMarkerShowText: evt.target.checked });
			}
		};

		this.onEnterBuffEdit = (buffType) => {
			const buff = new Buff(buffType);
			this.setState({ nextMarkerDuration: buff.info.duration });
		};

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
			offsetStr: "",
			///////
			trackBins: new Map(),
		};
		this.setTime = (val: string) => {
			this.setState({ nextMarkerTime: val });
		};
		this.setDuration = (val: string) => {
			this.setState({ nextMarkerDuration: val });
		};
		this.setTrack = (val: string) => {
			this.setState({ nextMarkerTrack: val });
		};
		this.setDescription = (val: string) => {
			this.setState({ nextMarkerDescription: val });
		};
		this.setBuff = (val: BuffType) => {
			this.setState({ nextMarkerBuff: val });
		};

		this.setLoadTrackDest = (val: string) => {
			this.setState({ loadTrackDest: val });
		};
		this.setOffset = (val: string) => this.setState({ offsetStr: val });

		updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {
			this.setState({ trackBins: trackBins });
		};
	}

	componentWillUnmount() {
		updateMarkers_TimelineMarkerPresets = (trackBins: Map<number, MarkerElem[]>) => {};
		setEditingMarkerValues = (marker) => {};
	}

	render() {
		const inlineDiv = { display: "inline-block", marginRight: "1em", marginBottom: 6 };
		const colorOption = function (markerColor: MarkerColor, displayName: ContentNode) {
			return <option key={markerColor} value={markerColor}>
				{displayName}
			</option>;
		};

		const trackIndices: number[] = [];
		this.state.trackBins.forEach((bin, trackIndex) => {
			trackIndices.push(trackIndex);
		});
		trackIndices.sort();

		const saveTrackLinks: React.JSX.Element[] = [];
		saveTrackLinks.push(
			<SaveToFile
				key={"combined"}
				fileFormat={FileFormat.Json}
				getContentFn={() => {
					return controller.timeline.serializedCombinedMarkerTracks();
				}}
				filename={"tracks_all"}
				displayName={localize({ en: "all tracks combined", zh: "所有轨道" })}
			/>,
		);
		trackIndices.forEach((trackIndex) => {
			const filePostfix: string = trackIndex >= 0 ? trackIndex.toString() : "untargetable";
			let displayName: ContentNode =
				localize({ en: "track ", zh: "轨" }) + trackIndex.toString();
			if (trackIndex === UntargetableMarkerTrack) {
				displayName = localize({ en: "track untargetable", zh: "不可选中标记轨" });
			}
			saveTrackLinks.push(
				<SaveToFile
					key={trackIndex}
					fileFormat={FileFormat.Json}
					getContentFn={() => {
						const files = controller.timeline.serializedSeparateMarkerTracks();
						for (let i = 0; i < files.length; i++) {
							if (files[i].track === trackIndex) return files[i];
						}
						console.assert(false);
						return [];
					}}
					filename={"track_" + filePostfix}
					displayName={displayName}
				/>,
			);
		});

		const btnStyle = { marginRight: 4 };

		const infoOnlySection = <div>
			<Input
				defaultValue={this.state.nextMarkerDescription}
				description={localize({ en: "Description: ", zh: "描述：" })}
				width={40}
				onChange={this.setDescription}
			/>
			<Input
				defaultValue={this.state.nextMarkerTrack}
				description={localize({ en: "Track: ", zh: "轨道序号：" })}
				width={4}
				style={inlineDiv}
				onChange={this.setTrack}
			/>
			<div style={{ display: "inline-block", marginTop: "4px" }}>
				<span>{localize({ en: "Color: ", zh: "颜色：" })}</span>
				<select
					style={{ display: "inline-block", outline: "none" }}
					value={this.state.nextMarkerColor}
					onChange={this.onColorChange}
				>
					{[
						colorOption(MarkerColor.Red, localize({ en: "red", zh: "红" })),
						colorOption(MarkerColor.Orange, localize({ en: "orange", zh: "橙" })),
						colorOption(MarkerColor.Yellow, localize({ en: "yellow", zh: "黄" })),
						colorOption(MarkerColor.Green, localize({ en: "green", zh: "绿" })),
						colorOption(MarkerColor.Cyan, localize({ en: "cyan", zh: "青" })),
						colorOption(MarkerColor.Blue, localize({ en: "blue", zh: "蓝" })),
						colorOption(MarkerColor.Purple, localize({ en: "purple", zh: "紫" })),
						colorOption(MarkerColor.Pink, localize({ en: "pink", zh: "粉" })), // lol forgot abt this earlier
					]}
				</select>
				<div
					style={{
						background: this.state.nextMarkerColor,
						marginLeft: "4px",
						display: "inline-block",
						verticalAlign: "middle",
						height: "1em",
						width: "4em",
					}}
				/>
			</div>
			<div style={{ display: "inline-block", marginTop: "4px", marginLeft: "10px" }}>
				<input
					type="checkbox"
					style={{ position: "relative", top: 3 }}
					checked={this.state.nextMarkerShowText}
					onChange={this.onShowTextChange}
				/>
				<span style={{ marginLeft: 4 }}>
					{localize({ en: "show text", zh: "显示文字描述" })}
				</span>
			</div>
		</div>;

		const buffCollection: React.JSX.Element[] = [];
		buffInfos.forEach((info) => {
			// prevent starry from being selectable if we're the pictomancer
			const activeJob = controller.getActiveJob();
			if (
				!(activeJob === "PCT" && info.name === BuffType.StarryMuse) &&
				!(activeJob === "RDM" && info.name === BuffType.Embolden) &&
				!(
					activeJob === "DNC" &&
					(info.name === BuffType.TechnicalFinish || info.name === BuffType.Devilment)
				)
			) {
				buffCollection.push(
					<option key={info.name} value={info.name}>
						{localizeBuffType(info.name)}
					</option>,
				);
			}
		});

		const buffOnlySection = <div>
			<span>{localize({ en: "Buff: ", zh: "团辅：" })}</span>
			<select
				value={this.state.nextMarkerBuff}
				onChange={(evt) => {
					if (evt.target) {
						const buffType = evt.target.value as BuffType;
						this.setBuff(buffType);
						this.onEnterBuffEdit(buffType);
					}
				}}
			>
				{buffCollection}
			</select>

			<div style={{ marginTop: 5 }}>
				<Input
					defaultValue={this.state.nextMarkerTrack}
					description={localize({ en: "Track: ", zh: "轨道序号：" })}
					width={4}
					style={inlineDiv}
					onChange={this.setTrack}
				/>
			</div>
		</div>;

		const actionsSection = <>
			<button
				style={btnStyle}
				onClick={() => {
					controller.timeline.deleteAllMarkers();
					controller.updateStats();
				}}
			>
				{localize({ en: "clear all markers", zh: "清空当前" })}
			</button>
			<button
				style={btnStyle}
				onClick={() => {
					const count = controller.timeline.sortAndRemoveDuplicateMarkers();
					if (count > 0) {
						alert("removed " + count + " duplicate markers");
					} else {
						alert("no duplicate markers found");
					}
					controller.timeline.updateTimelineMarkers();
				}}
			>
				{localize({ en: "remove duplicates", zh: "删除重复标记" })}
			</button>
			<span>
				{localize({
					en: ", click to delete single markers",
					zh: "，可点击删除单个标记",
				})}
			</span>
		</>;

		// @ts-expect-error we need to read untyped this.context in place of a useContext hook
		const textColor = getThemeField(this.context, "text") as string;
		const individualTrackInput = <input
			style={{
				color: textColor,
				backgroundColor: "transparent",
				outline: "none",
				border: "none",
				borderBottom: "1px solid " + textColor,
			}}
			size={2}
			type={"text"}
			value={this.state.loadTrackDest}
			onChange={(e) => {
				this.setState({ loadTrackDest: e.target.value });
			}}
		/>;
		const individualTrackLabel = localize({
			en: <span>Load into individual track {individualTrackInput}: </span>,
			zh: <span>载入第{individualTrackInput}轨：</span>,
		});
		const parsedOffset = parseTime(this.state.offsetStr);
		const loadTracksSection = <>
			<LoadJsonFromFileOrUrl
				allowLoadFromUrl={false}
				defaultLoadUrl={""}
				label={localize({ en: "Load multiple tracks combined: ", zh: "载入多轨文件：" })}
				onLoadFn={(content: any) => {
					controller.timeline.loadCombinedTracksPreset(
						content,
						!isNaN(parsedOffset) ? parsedOffset : 0,
					);
					controller.updateStats();
					controller.timeline.drawElements();
				}}
			/>
			<div className={"paragraph"}>
				<LoadJsonFromFileOrUrl
					allowLoadFromUrl={false}
					label={individualTrackLabel}
					onLoadFn={(content: any) => {
						const track = parseInt(this.state.loadTrackDest);
						if (isNaN(track)) {
							window.alert("invalid track destination");
							return;
						}
						controller.timeline.loadIndividualTrackPreset(
							content,
							track,
							!isNaN(parsedOffset) ? parsedOffset : 0,
						);
						controller.updateStats();
						controller.timeline.drawElements();
					}}
				/>
			</div>
		</>;

		const addColumn = <form>
			<span>{localize({ en: "Type: ", zh: "类型：" })}</span>
			<select
				value={this.state.nextMarkerType}
				onChange={(evt) => {
					if (evt.target) {
						const markerType = evt.target.value as MarkerType;
						this.setState({
							nextMarkerType: markerType,
						});
						if (markerType === MarkerType.Buff) {
							this.onEnterBuffEdit(this.state.nextMarkerBuff);
						}
					}
				}}
			>
				<option value={MarkerType.Info}>{localize({ en: "Info", zh: "备注信息" })}</option>
				<option value={MarkerType.Untargetable}>
					{localize({ en: "Untargetable", zh: "不可选中" })}
				</option>
				<option value={MarkerType.Buff}>{localize({ en: "Buff", zh: "团辅" })}</option>
			</select>
			<span> </span>
			<Input
				defaultValue={this.state.nextMarkerTime}
				description={localize({ en: "Time: ", zh: "时间：" })}
				width={8}
				style={inlineDiv}
				onChange={this.setTime}
			/>

			<Input
				defaultValue={this.state.nextMarkerDuration}
				description={localize({ en: "Duration: ", zh: "持续时长：" })}
				width={8}
				style={inlineDiv}
				onChange={this.setDuration}
			/>

			{this.state.nextMarkerType === MarkerType.Info ? infoOnlySection : undefined}
			{this.state.nextMarkerType === MarkerType.Buff ? buffOnlySection : undefined}
			<button
				type={"submit"}
				style={{ display: "block", marginTop: "0.5em" }}
				onClick={(e) => {
					const marker: MarkerElem = {
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
								zh: `此团辅持续时间不能超过${buff.info.duration}秒`,
							});
						}
						marker.color = buff.info.color;
						marker.description = buff.name;
						marker.duration = duration;
						marker.showText = true;
					}
					if (isNaN(marker.duration) || isNaN(marker.time) || isNaN(marker.track)) {
						err = localize({ en: "some input(s) are invalid", zh: "部分输入格式不对" });
					}
					if (err) {
						window.alert(err);
						e.preventDefault();
						return;
					}
					controller.timeline.addMarker(marker);
					controller.updateStats();
					if (this.state.nextMarkerType === MarkerType.Untargetable) {
						// Some abilities check whether the boss was hit to determine gauge state.
						updateInvalidStatus();
					}
					e.preventDefault();
				}}
			>
				{localize({ en: "add marker", zh: "添加标记" })}
			</button>
		</form>;
		return <>
			<Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>
				{[
					{
						defaultSize: 50,
						content: <>
							{actionsSection}
							<br />
							<p>
								<b>{localize({ en: "Presets", zh: "预设文件" })}</b>
							</p>
							<p style={{ marginTop: 16 }}>
								<b>{localize({ en: "Load from file", zh: "从文件导入" })}</b>{" "}
								<Help
									topic={"load tracks"}
									content={localize({
										en: "when loading additional markers, current markers will not be deleted",
										zh: "载入新的标记时，时间轴上的已有标记不会被删除",
									})}
								/>
							</p>
							{loadTracksSection}
							<p style={{ marginTop: 16 }}>
								<b>
									{localize({
										en: "Save marker tracks to file",
										zh: "保存标记到文件",
									})}
								</b>
							</p>
							{saveTrackLinks}
						</>,
					},
					{
						defaultSize: 50,
						content: <>
							<p>
								<b>{localize({ en: "Create marker", zh: "添加标记" })}</b>
							</p>
							{addColumn}
						</>,
					},
				]}
			</Columns>
		</>;
	}
}
