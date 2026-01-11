import React, { createContext, CSSProperties, useContext, useEffect, useState } from "react";
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
	RadioSet,
	SaveToFile,
} from "./Common";
import { controller } from "../Controller/Controller";
import {
	ElemType,
	MarkerElem,
	MarkerType,
	MarkerTracksCombined,
	UntargetableMarkerTrack,
} from "../Controller/Timeline";
import {
	Language,
	localize,
	localizeBuffType,
	LocalizedContent,
	localizeLanguage,
} from "./Localization";
import {
	getCurrentThemeColors,
	MarkerColor,
	ColorThemeContext,
	getThemeColors,
} from "./ColorTheme";
import { Buff, buffInfos } from "../Game/Buffs";
import { BuffType } from "../Game/Common";
import { TIMELINE_COLUMNS_HEIGHT } from "./Timeline";
import { updateInvalidStatus } from "./TimelineEditor";
import { FileType, getCachedValue } from "../Controller/Common";
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

const PRESET_MARKERS_BASE = "/presets/markers/";
export const MAX_TRACK_NUMBER = 20;
export const MIN_TRACK_NUMBER = 0; // untargetable track (-1) is handled separately

const ROW_GAP_PX = 5;

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

function Hsep(props: { marginTop: number; marginBottom: number }) {
	const theme = getCurrentThemeColors();
	return <hr
		style={{
			marginTop: props.marginTop,
			marginBottom: props.marginBottom,
			border: "none",
			borderTop: ("1px solid " + theme.bgHighContrast) as string,
		}}
	/>;
}

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
const TrackIndexContext = createContext<{
	trackIndices: number[];
	setTrackIndices: (arr: number[]) => void;
}>({
	trackIndices: [],
	setTrackIndices: () => {},
});

// exported to expose to test files
export function doPresetTrackLoad(
	content: MarkerTracksCombined,
	// can't access useContext here since it's in a hook
	setTrackIndices: (arr: number[]) => void,
	opts?: {
		globalOffset?: string;
		localOffset?: string;
		cutoff?: number;
	},
) {
	let parsedGlobalOffset = parseTime(opts?.globalOffset ?? "");
	parsedGlobalOffset = isNaN(parsedGlobalOffset) ? 0 : parsedGlobalOffset;
	const parsedLocalOffset = parseTime(opts?.localOffset ?? "");
	controller.timeline.loadCombinedTracksPreset(
		content,
		parsedGlobalOffset + (isNaN(parsedLocalOffset) ? 0 : parsedLocalOffset),
		opts?.cutoff !== undefined ? parsedGlobalOffset + opts.cutoff : undefined,
	);
	setTrackIndices(controller.timeline.getTrackIndices());
	controller.updateStats();
	controller.timeline.drawElements();
}

function LoadCombinedTracksBtn(props: {
	displayName: ContentNode;
	url: string;
	offsetStr?: string;
}) {
	const offsetCtx = useContext(OffsetContext);
	const { setTrackIndices } = useContext(TrackIndexContext);
	return <button
		onClick={(e) =>
			asyncFetchJson(props.url, (content) =>
				doPresetTrackLoad(content, setTrackIndices, {
					globalOffset: offsetCtx,
					localOffset: props.offsetStr,
				}),
			)
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
	const globalOffset = useContext(OffsetContext);
	const { setTrackIndices } = useContext(TrackIndexContext);
	const colors = getThemeColors(useContext(ColorThemeContext));
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
	const body = <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: ROW_GAP_PX }}>
		{phasedTracks?.map(({ offset, label, fileName }, i) => {
			let offsetStr = offsetMap.get(fileName);
			if (!offsetStr?.length) {
				offsetStr = offset.toString();
			}
			if (fileName === undefined) {
				console.error("missing fileName for phase", label, "of", props.fileName);
			}
			return <React.Fragment key={i}>
				<div style={{ gridRow: i + 1, gridColumn: 1 }}>
					<Input
						description="@"
						defaultValue={offsetMap.get(fileName)?.toString() ?? ""}
						onChange={(v: string) => {
							const newMap = new Map(offsetMap);
							if (v === undefined) {
								newMap.delete(fileName);
							} else {
								newMap.set(fileName, v);
							}
							setOffsetMap(newMap);
						}}
						width={8}
						placeholder={offset.toString()}
					/>
				</div>
				<div style={{ gridRow: i + 1, gridColumn: 2 }}>
					<LoadCombinedTracksBtn
						displayName={localize(label)}
						url={PRESET_MARKERS_BASE + fileName}
						offsetStr={offsetStr}
					/>
				</div>
			</React.Fragment>;
		}) ??
			localize({
				en: "loading phases...",
				zh: "正在载入阶段",
			})}
	</div>;
	return <div
		style={{
			display: "flex",
			flexDirection: "column",
			marginBlock: ROW_GAP_PX,
			marginLeft: 5,
			paddingLeft: 10,
			borderLeft: "1px solid " + colors.bgHighContrast,
			minWidth: 240,
		}}
	>
		<Expandable
			title={`trackPresets-phase-${props.fileName}`}
			titleNode={
				<div
					style={{
						display: "inline-flex",
						flexDirection: "row",
						gap: ROW_GAP_PX,
						alignItems: "baseline",
						marginBottom: 4,
					}}
				>
					<div>{localize(metaToTitleText(props.meta, props.showAuthors))}</div>
					<span tabIndex={-1}> </span>
					<div>
						<button
							onClick={(e) => {
								e.stopPropagation(); // Don't trigger the expandable
								// Cut off markers that would end after a subsequent phase begins.
								const cutoffs = new Map<string, number>();
								phasedTracks?.forEach((track, i) => {
									let acc = undefined;
									for (let j = i + 1; j < phasedTracks.length; j++) {
										const laterOfs = offsetMap.get(phasedTracks[j].fileName);
										// Do not apply cutoffs when using the default offset.
										if (laterOfs) {
											const parsedOfs = parseTime(laterOfs);
											if (acc === undefined || parsedOfs < acc) {
												acc = parsedOfs;
											}
										}
									}
									if (acc !== undefined) {
										cutoffs.set(track.fileName, acc);
									}
								});
								// Ideally we would rewrite asyncFetchJson to be more promise-y and we
								// can then await all the tracks being loaded together
								phasedTracks?.forEach((track) =>
									asyncFetchJson(
										PRESET_MARKERS_BASE + track.fileName, // do not include txt extension here
										(content) => {
											doPresetTrackLoad(content, setTrackIndices, {
												globalOffset,
												localOffset:
													offsetMap.get(track.fileName) ??
													track.offset.toString(),
												cutoff: cutoffs.get(track.fileName),
											});
										},
									),
								);
							}}
						>
							{localize({ en: "Load all phases", zh: "载入整场战斗" })}
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
			gap: ROW_GAP_PX,
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
									gap: ROW_GAP_PX,
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
							<div>
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
		titleBodyGap={ROW_GAP_PX}
		defaultShow={props.defaultShow}
		autoIndent={false}
		content={body}
	/>;
}

export function CustomMarkerWidget() {
	const [nextMarkerType, setNextMarkerType] = useState(MarkerType.Info);
	const [nextMarkerColor, setNextMarkerColor] = useState(MarkerColor.Blue);
	const [nextMarkerTime, setNextMarkerTime] = useState("0");
	const [nextMarkerDuration, setNextMarkerDuration] = useState("1");
	const [nextMarkerTrack, setNextMarkerTrack] = useState("0");
	const [nextMarkerDescription, setNextMarkerDescription] = useState("");
	const [nextMarkerShowText, setNextMarkerShowText] = useState(false);
	const [nextMarkerBuff, setNextMarkerBuff] = useState(BuffType.TechnicalFinish);
	const inlineDiv = { display: "inline-block", marginRight: "1em", marginBottom: 6 };
	const { setTrackIndices } = useContext(TrackIndexContext);

	useEffect(() => {
		// DANGER!! CONTROLLER STATE HACK
		setEditingMarkerValues = (marker: MarkerElem) => {
			setNextMarkerType(marker.markerType);
			setNextMarkerTime(marker.time.toString());
			setNextMarkerDuration(marker.duration.toString());
			if (marker.markerType === MarkerType.Info) {
				setNextMarkerColor(marker.color);
				setNextMarkerTime(marker.time.toString());
				setNextMarkerDuration(marker.duration.toString());
				setNextMarkerTrack(marker.track.toString());
				setNextMarkerDescription(marker.description);
				setNextMarkerShowText(marker.showText);
			} else if (marker.markerType === MarkerType.Buff) {
				setNextMarkerTrack(marker.track.toString());
				setNextMarkerBuff(marker.description as BuffType);
			}
		};
		// not part of the controller state hack, just initializes marker type from localStorage
		const cachedMarkerType = getCachedValue(`radio: markerType`);
		if (cachedMarkerType !== null) {
			setNextMarkerType(cachedMarkerType as MarkerType);
			if (cachedMarkerType === MarkerType.Buff) {
				onEnterBuffEdit(nextMarkerBuff);
			}
		}
	}, []);

	const colorOption = (markerColor: MarkerColor, displayName: ContentNode) => <option
		key={markerColor}
		value={markerColor}
	>
		{displayName}
	</option>;

	const infoOnlySection = <div>
		<Input
			defaultValue={nextMarkerDescription}
			description={localize({ en: "Description: ", zh: "描述：" })}
			width={40}
			onChange={setNextMarkerDescription}
		/>
		<Input
			defaultValue={nextMarkerTrack}
			description={localize({ en: "Track: ", zh: "轨道序号：" })}
			width={4}
			style={inlineDiv}
			onChange={setNextMarkerTrack}
		/>
		<div style={{ display: "inline-block", marginTop: "4px" }}>
			<span>{localize({ en: "Color: ", zh: "颜色：" })}</span>
			<select
				style={{ display: "inline-block", outline: "none" }}
				value={nextMarkerColor}
				onChange={(e) => {
					if (e.target) {
						setNextMarkerColor(e.target.value as MarkerColor);
					}
				}}
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
					background: nextMarkerColor,
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
				checked={nextMarkerShowText}
				onChange={(e) => {
					if (e.target) {
						setNextMarkerShowText(e.target.checked);
					}
				}}
			/>
			<span style={{ marginLeft: 4 }}>
				{localize({ en: "show text", zh: "显示文字描述" })}
			</span>
		</div>
	</div>;

	const onEnterBuffEdit = (buffType: BuffType) => {
		const buff = new Buff(buffType);
		setNextMarkerDuration(buff.info.duration.toString());
	};

	const buffCollection = buffInfos.map((info) => <option key={info.name} value={info.name}>
		{localizeBuffType(info.name)}
	</option>);

	const buffOnlySection = <div>
		<span>{localize({ en: "Buff: ", zh: "团辅：" })}</span>
		<select
			value={nextMarkerBuff}
			onChange={(evt) => {
				if (evt.target) {
					const buffType = evt.target.value as BuffType;
					setNextMarkerBuff(buffType);
					onEnterBuffEdit(buffType);
				}
			}}
		>
			{buffCollection}
		</select>

		<div style={{ marginTop: 5 }}>
			<Input
				defaultValue={nextMarkerTrack}
				description={localize({ en: "Track: ", zh: "轨道序号：" })}
				width={4}
				style={inlineDiv}
				onChange={setNextMarkerTrack}
			/>
		</div>
	</div>;
	return <div>
		<p>
			<b>{localize({ en: "Add buffs/markers", zh: "添加buff和标记" })}</b>
		</p>
		<form>
			<fieldset
				style={{
					display: "flex",
					alignItems: "baseline",
					paddingTop: 0,
					paddingLeft: 0,
					paddingBottom: 0,
					marginLeft: 0,
					marginBottom: 10,
					border: 0,
				}}
			>
				<legend
					style={{
						float: "left",
						marginRight: "0.5rem",
						position: "relative",
						top: "1px",
					}}
				>
					{localize({ en: "Type: ", zh: "类型：" })}
				</legend>
				<RadioSet
					containerStyle={{
						display: "flex",
						flexDirection: "row",
						gap: "0.8rem",
					}}
					uniqueName="markerType"
					selected={nextMarkerType}
					onChange={(markerType: string) => {
						setNextMarkerType(markerType as MarkerType);
						if (markerType === MarkerType.Buff) {
							onEnterBuffEdit(nextMarkerBuff);
						}
					}}
					/* TODO emphasize label of selected type */
					options={[
						[MarkerType.Info, localize({ en: "Info", zh: "备注信息" })],
						[MarkerType.Buff, localize({ en: "Buff", zh: "团辅" })],
						[MarkerType.Untargetable, localize({ en: "Untargetable", zh: "不可选中" })],
					]}
				/>
			</fieldset>
			<span> </span>
			<Input
				defaultValue={nextMarkerTime}
				description={localize({ en: "Time: ", zh: "时间：" })}
				width={8}
				style={inlineDiv}
				onChange={setNextMarkerTime}
			/>

			<Input
				defaultValue={nextMarkerDuration}
				description={localize({ en: "Duration: ", zh: "持续时长：" })}
				width={8}
				style={inlineDiv}
				onChange={setNextMarkerDuration}
			/>

			{nextMarkerType === MarkerType.Info ? infoOnlySection : undefined}
			{nextMarkerType === MarkerType.Buff ? buffOnlySection : undefined}
			<button
				type={"submit"}
				style={{ display: "block", marginTop: "0.5em" }}
				onClick={(e) => {
					const marker: MarkerElem = {
						type: ElemType.Marker,
						markerType: nextMarkerType,
						time: parseTime(nextMarkerTime),
						duration: parseFloat(nextMarkerDuration),
						color: nextMarkerColor,
						track: parseInt(nextMarkerTrack),
						description: nextMarkerDescription,
						showText: nextMarkerShowText,
					};
					let err: ContentNode | undefined = undefined;
					if (nextMarkerType === MarkerType.Untargetable) {
						marker.color = MarkerColor.Grey;
						marker.track = UntargetableMarkerTrack;
						marker.description = "";
						marker.showText = true;
					}
					if (nextMarkerType === MarkerType.Buff) {
						const buff = new Buff(nextMarkerBuff);
						const duration = parseFloat(nextMarkerDuration);
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
					if (
						marker.track !== UntargetableMarkerTrack &&
						(marker.track < MIN_TRACK_NUMBER || marker.track > MAX_TRACK_NUMBER)
					) {
						err = localize({
							en: `marker track number must be between ${MIN_TRACK_NUMBER} and ${MAX_TRACK_NUMBER}`,
							zh: `轨道序号必须在${MIN_TRACK_NUMBER}到${MAX_TRACK_NUMBER}之间`,
						});
					}
					if (err) {
						window.alert(err);
						e.preventDefault();
						return;
					}
					controller.timeline.addMarker(marker);
					controller.updateStats();
					setTrackIndices(controller.timeline.getTrackIndices());
					if (nextMarkerType === MarkerType.Untargetable) {
						// Some abilities check whether the boss was hit to determine gauge state.
						updateInvalidStatus();
					}
					e.preventDefault();
				}}
			>
				{localize({ en: "add marker", zh: "添加标记" })}
			</button>
		</form>
	</div>;
}

export function MarkerLoadSaveWidget() {
	const { trackIndices, setTrackIndices } = useContext(TrackIndexContext);
	const offset = parseInt(useContext(OffsetContext));
	const parsedOffset = isNaN(offset) ? 0 : offset;
	const colors = getThemeColors(useContext(ColorThemeContext));
	const [loadTrackDest, setLoadTrackDest] = useState("0");
	const individualTrackInput = <input
		style={{
			color: colors.text,
			backgroundColor: "transparent",
			outline: "none",
			border: "none",
			borderBottom: "1px solid " + colors.text,
		}}
		size={2}
		type={"text"}
		value={loadTrackDest}
		onChange={(e) => setLoadTrackDest(e.target.value)}
	/>;
	const individualTrackLabel = localize({
		en: <span>Load into individual track {individualTrackInput}: </span>,
		zh: <span>载入第{individualTrackInput}轨：</span>,
	});
	const loadTracksSection = <>
		<LoadJsonFromFileOrUrl
			allowLoadFromUrl={false}
			defaultLoadUrl={""}
			label={localize({ en: "Load multiple tracks combined: ", zh: "载入多轨文件：" })}
			onLoadFn={(content: any) => {
				controller.timeline.loadCombinedTracksPreset(content, parsedOffset);
				controller.updateStats();
				setTrackIndices(controller.timeline.getTrackIndices());
				controller.timeline.drawElements();
			}}
		/>
		<div className={"paragraph"}>
			<LoadJsonFromFileOrUrl
				allowLoadFromUrl={false}
				label={individualTrackLabel}
				onLoadFn={(content: any) => {
					const track = parseInt(loadTrackDest);
					if (
						isNaN(track) ||
						(track !== UntargetableMarkerTrack &&
							(track < MIN_TRACK_NUMBER || track > MAX_TRACK_NUMBER))
					) {
						window.alert(
							localize({
								en: `marker track number must be between ${MIN_TRACK_NUMBER} and ${MAX_TRACK_NUMBER}`,
								zh: `轨道序号必须在${MIN_TRACK_NUMBER}到${MAX_TRACK_NUMBER}之间`,
							}),
						);
						return;
					}
					controller.timeline.loadIndividualTrackPreset(content, track, parsedOffset);
					controller.updateStats();
					setTrackIndices(controller.timeline.getTrackIndices());
					controller.timeline.drawElements();
				}}
			/>
		</div>
	</>;

	const saveTracksSection = <>
		<SaveToFile
			key={"combined"}
			fileFormat={FileFormat.Json}
			getContentFn={() => controller.timeline.serializedCombinedMarkerTracks()}
			filename={"tracks_all"}
			displayName={localize({ en: "all tracks combined", zh: "所有轨道" })}
		/>

		{trackIndices.map((trackIndex) => {
			let fileSuffix = trackIndex.toString();
			let displayName: ContentNode = localize({ en: "track ", zh: "轨" }) + fileSuffix;
			if (trackIndex === UntargetableMarkerTrack) {
				fileSuffix = "untargetable";
				displayName = localize({ en: "track untargetable", zh: "不可选中标记轨" });
			}
			return <SaveToFile
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
				filename={"track_" + fileSuffix}
				displayName={displayName}
			/>;
		})}
	</>;

	return <div>
		<p>
			<b>{localize({ en: "Load marker tracks from file", zh: "从文件导入标记" })}</b>{" "}
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
		{saveTracksSection}
	</div>;
}

export function TimelineMarkers() {
	const [trackIndices, setTrackIndices] = useState<number[]>([]);
	useEffect(() => {
		setTrackIndices(controller.timeline.getTrackIndices());
	}, []);
	const [offsetStr, setOffsetStr] = useState("");
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
						en: "Load tracks with time offset ",
						zh: "载入文件时间偏移 ",
					})}
				</span>
				<Help
					topic={"trackLoadOffset"}
					content={localize({
						en: <div>
							<p>
								When specified, all imported and preset tracks will start from the
								specified timestamp. Use this to combine markers for multi-phase
								fights with varying kill times.
							</p>
							<p>
								Loading preset tracks that already have phase timestamps will add
								this start value on top of the phase-specific timing.
							</p>
						</div>,
						zh: <div>
							<p>
								不为空时，下方所有导入的时间轴文件和预设都将带此时间偏移。可以用此功能自行组合不同P的时间轴文件。
							</p>
							<p>导入已有P开始时间的预设时，会加上此设置的时间戳。</p>
						</div>,
					})}
				/>
				:
			</>
		}
		width={4}
		onChange={setOffsetStr}
	/>;

	const actionsSection = <>
		<p>
			<b>{localize({ en: "Remove buffs/markers", zh: "删除buff和标记" })}</b>
		</p>
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "max-content max-content",
				columnGap: 2,
				rowGap: ROW_GAP_PX,
				alignItems: "center",
			}}
		>
			<div>
				<button
					onClick={() => {
						controller.timeline.deleteAllMarkers();
						controller.updateStats();
						setTrackIndices([]);
					}}
				>
					{localize({ en: "clear all markers", zh: "清空当前" })}
				</button>
			</div>
			<div>
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
			</div>
			<div style={{ gridColumn: "1 / 3" }}>
				{localize({
					en: "click a marker in the timeline to delete it",
					zh: "点击时间轴上的标记即可删除",
				})}
			</div>
		</div>
	</>;
	return <Columns contentHeight={TIMELINE_COLUMNS_HEIGHT}>
		{[
			{
				defaultSize: 35,
				content: <>
					<p>
						<b>{localize({ en: "Presets", zh: "预设文件" })}</b>
					</p>
					<div>{offsetInput}</div>
					<OffsetContext.Provider value={offsetStr}>
						<TrackIndexContext.Provider value={{ trackIndices, setTrackIndices }}>
							<TrackCollection
								label={{ en: "Current content", zh: "当前版本" }}
								trackList={RECENT_CONTENT_TRACKS}
								defaultShow
							/>
							<TrackCollection
								label={{ en: "Legacy ultimates", zh: "过去绝本" }}
								trackList={LEGACY_ULTIMATE_TRACKS}
								defaultShow
							/>
							<p>
								<b>{localize({ en: "Archive", zh: "归档" })}</b>
							</p>
							{Array.from(
								ARCHIVE_TRACKS.entries().map(([header, trackList], i) => <div
									key={i}
								>
									<TrackCollection label={{ en: header }} trackList={trackList} />
								</div>),
							)}
						</TrackIndexContext.Provider>
					</OffsetContext.Provider>
				</>,
			},
			{
				defaultSize: 30,
				content: <>
					{actionsSection}
					<Hsep marginTop={15} marginBottom={15} />
					<TrackIndexContext.Provider value={{ trackIndices, setTrackIndices }}>
						<CustomMarkerWidget />
					</TrackIndexContext.Provider>
				</>,
			},
			{
				defaultSize: 35,
				content: <>
					<OffsetContext.Provider value={offsetStr}>
						<TrackIndexContext.Provider value={{ trackIndices, setTrackIndices }}>
							<MarkerLoadSaveWidget />
						</TrackIndexContext.Provider>
					</OffsetContext.Provider>
				</>,
			},
		]}
	</Columns>;
}
