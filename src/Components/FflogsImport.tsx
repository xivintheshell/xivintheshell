import React, { useContext, useState, useRef } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FaXmark } from "react-icons/fa6";
import { ImportLog } from "../Controller/UndoStack";
import { controller } from "../Controller/Controller";
import { skillNode, jumpToTimestampNode, durationWaitNode, ActionNode } from "../Controller/Record";
import { ActionKey } from "../Game/Data";
import { JOBS, ShellJob } from "../Game/Data/Jobs";
import { skillIdMap } from "../Game/Skills";
import { ProcMode, LevelSync } from "../Game/Common";
import {
	GameConfig,
	DynamicConfigPart,
	DynamicConfigField,
	SerializedConfig,
} from "../Game/GameConfig";
import { Input, Help } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";
import { localize } from "./Localization";

const FFLOGS_API_URL = "https://www.fflogs.com/api/v2/client/";

interface LogQueryParams {
	reportCode: string;
	fightID: number;
	playerID: number;
}

// TODO: return partial<LogQueryParams> and handle errors
function parseLogURL(urlString: string): LogQueryParams {
	const url = URL.parse(urlString)!;
	// TODO allow cn.fflogs or kr.fflogs
	if (url === null || url.hostname !== "www.fflogs.com") {
		throw new Error("must pass a valid fflogs link");
	}
	const pathParts = url.pathname.split("/");
	console.assert(pathParts.length > 0);
	const reportCode = pathParts[pathParts.length - 1];
	// ?fight=19&type=casts&source=405&view=events
	const searchParams = url.searchParams;
	const fightID = parseInt(searchParams.get("fight")!);
	const playerID = parseInt(searchParams.get("source")!);
	return { reportCode, fightID, playerID };
}

// TODO cache in persistent storage instead? would have to deal with versioning though
const castQueryCache = new Map<LogQueryParams, IntermediateLogImportState>();

const FFLOGS_JOB_MAP = new Map<string, ShellJob>([
	["Paladin", "PLD"],
	["Warrior", "WAR"],
	["DarkKnight", "DRK"],
	["Gunbreaker", "GNB"],
	["WhiteMage", "WHM"],
	["Scholar", "SCH"],
	["Astrologian", "AST"],
	["Sage", "SGE"],
	["Monk", "MNK"],
	["Dragoon", "DRG"],
	["Ninja", "NIN"],
	["Viper", "VPR"],
	["Samurai", "SAM"],
	["Reaper", "RPR"],
	["Bard", "BRD"],
	["Machinist", "MCH"],
	["Dancer", "DNC"],
	["BlackMage", "BLM"],
	["RedMage", "RDM"],
	["Pictomancer", "PCT"],
	["BlueMage", "BLU"],
]);

const FILTERED_ACTION_IDS = new Set([
	7, // auto-attack
	33218, // quadruple technical finish (for some reason different from hitting the button?)
	34682, // star prism heal component
]);

interface IntermediateLogImportState {
	playerName: string;
	job: ShellJob;
	level?: LevelSync;
	statsInLog: boolean;
	inferredConfig?: Partial<DynamicConfigPart>;
	actions: ActionNode[];
	timestamps: number[];
	combatStartTime: number;
}

/**
 * Issue a GraphQL query given fight report ID, fight index ID, and player index ID.
 * These can be parsed from a report URL that has a fight/player selected, or retrieved by query.
 *
 * This function is stateless.
 */
async function queryPlayerEvents(params: LogQueryParams): Promise<IntermediateLogImportState> {
	if (castQueryCache.has(params)) {
		return castQueryCache.get(params)!;
	}

	// TODO handle pagination
	const query = `
	query GetPlayerEvents($reportCode: String, $fightID: Int, $playerID: Int) {
		reportData {
			report(code: $reportCode) {
				events(sourceID: $playerID, fightIDs: [$fightID]) {
					data
					nextPageTimestamp
				}
				fights(fightIDs: [$fightID]) {
					name
					combatTime
					startTime
					endTime
				}
				playerDetails(fightIDs: [$fightID])
			}
		}
	}
	`;

	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			// TODO do authorization properly
			// @ts-expect-error typescript doesn't like import.meta
			Authorization: `Bearer ${import.meta.env.VITE_FFLOGS_CLIENT_TOKEN}`,
		},
		body: JSON.stringify({
			query,
			variables: params,
		}),
	};
	const queryCacheKey = `fflogsCache/${params.reportCode}-${params.fightID}-${params.playerID}`;
	// TODO error handling
	const cacheEntry = sessionStorage.getItem(queryCacheKey);
	return (
		cacheEntry === null
			? fetch(FFLOGS_API_URL, options)
					.then((response) => response.json())
					.then((blob) => {
						// TODO figure out eviction policy to make sure we don't exceed sessionstorage limits,
						// or don't cache the whole request
						sessionStorage.setItem(queryCacheKey, JSON.stringify(blob));
						return blob;
					})
			: Promise.resolve(JSON.parse(cacheEntry))
	).then((data) => {
		// TODO combatantinfo entry can give stats and pre-buffs
		// TODO check/pair calculateddamage instances to identify multi-target abilities
		// TODO check pre-cast abilities
		// TODO filter+pair begin cast abilities
		// TODO deal with canceled casts
		// TODO explicit waits
		// TODO manual buff toggles
		const actor: any = Object.values(
			data.data.reportData.report.playerDetails.data.playerDetails,
		)
			.flat()
			.filter(
				// TODO handle indexerror and lookup error
				(actor: any) => actor.id === params.playerID,
			)[0];
		const job = FFLOGS_JOB_MAP.get(actor.type)!;
		const name = `${actor.name} @ ${actor.server}`;
		let level: LevelSync | undefined = undefined;
		let inferredConfig: DynamicConfigPart | undefined = undefined;
		const fight = data.data.reportData.report.fights[0];
		const castEvents = [];
		const timestamps = [];
		// If a "begin cast" is left at the end of the loop without a paired "cast", don't bother
		// adding it to the timeline since we can safely assume it was canceled.
		let stagedBeginEvent: any | undefined = undefined;
		for (let entry of data.data.reportData.report.events.data) {
			// TODO parse buff removal events that correspond to actions
			if (
				entry.type === "cast" &&
				entry.sourceID === params.playerID &&
				!FILTERED_ACTION_IDS.has(entry.abilityGameID)
			) {
				// If the cast ID does not match the previously-encountered begin cast, then
				// assume the begin cast was canceled, and discard it.
				// Otherwise, use the timestamp of the "begin cast" event for simulation reference.
				if (stagedBeginEvent !== undefined) {
					if (stagedBeginEvent.abilityGameID === entry.abilityGameID) {
						entry = stagedBeginEvent;
					}
					stagedBeginEvent = undefined;
				}
				castEvents.push(entry);
				timestamps.push(entry.timestamp);
			} else if (
				entry.type === "begincast" &&
				entry.sourceID === params.playerID &&
				!FILTERED_ACTION_IDS.has(entry.abilityGameID)
			) {
				stagedBeginEvent = entry;
			} else if (entry.type === "combatantinfo") {
				// These stats are only populated for the log creator; these fields are otherwise
				// left undefined.
				level = entry.level;
				inferredConfig = {
					main: entry[JOBS[job].mainStat],
					spellSpeed: entry.spellSpeed,
					skillSpeed: entry.skillSpeed,
					criticalHit: entry.criticalHit,
					directHit: entry.directHit,
					determination: entry.determination,
					piety: entry.piety,
					tenacity: entry.tenacity,
				};
			}
		}
		const castSkills: ActionKey[] = castEvents.map((event: any) => {
			const id = event.abilityGameID;
			if (skillIdMap.has(id)) {
				return skillIdMap.get(id)!;
			} else if (
				// Assume really high IDs (like 34600430) are tincture usages
				id > 30000000
			) {
				return "TINCTURE";
			} else {
				console.error("unknown action id", id);
				return "NEVER";
			}
		});
		const nodes = castSkills.map((key) => skillNode(key));
		const state: IntermediateLogImportState = {
			playerName: name,
			job,
			level,
			statsInLog:
				inferredConfig !== undefined &&
				Object.values(inferredConfig).every((x) => x !== undefined),
			inferredConfig,
			actions: nodes,
			timestamps,
			combatStartTime: fight.endTime - fight.combatTime,
		};
		castQueryCache.set(params, state);
		return state;
	});
}

/**
 * STATEFUL function that applies the parsed action nodes and config to the active timeline in-place.
 *
 * Also generates a new entry in the undo stack.
 */
async function applyImportedActions(state: IntermediateLogImportState, resetTimeline: boolean) {
	// Reset the controller's GameConfig.
	const oldConfig = controller.gameConfig.serialized();
	const newConfig: SerializedConfig = {
		...oldConfig,
		procMode: ProcMode.Always,
		job: state.job,
	};
	for (const [field, value] of Object.entries(state.inferredConfig ?? {})) {
		if (typeof value === "number") {
			// @ts-expect-error can't check property keys
			newConfig[field] = value;
		}
	}
	if (state.level !== undefined) {
		newConfig.level = state.level;
	}
	controller.setConfigAndRestart(
		newConfig,
		resetTimeline ||
			newConfig.job !== oldConfig.job ||
			oldConfig.procMode !== newConfig.procMode,
	);
	const initialRecordLength = controller.record.length;
	const finalNodes: ActionNode[] = [];
	const nodes = state.actions;
	// If the first action has a cast time, then assume it was hardcasted.
	if (nodes.length > 0) {
		const skillCastTimestamp = state.timestamps[0];
		const targetUseTime = (skillCastTimestamp - state.combatStartTime) / 1000;
		const castLength = controller.game.getSkillAvailabilityStatus(
			// @ts-expect-error use proper casting/annotation later
			nodes[0].info.skillName,
		).castTime;
		const jumpTargetTime =
			castLength > 0
				? targetUseTime - castLength + GameConfig.getSlidecastWindow(castLength)
				: targetUseTime;
		finalNodes.push(jumpToTimestampNode(jumpTargetTime), nodes[0]);
		console.log("target use time:", targetUseTime);
		// If the target use time is before countdown begins, then set the countdown to the floor of that duration
		if (-jumpTargetTime > controller.gameConfig.countdown) {
			controller.setConfigAndRestart({
				...newConfig,
				countdown: -Math.floor(jumpTargetTime),
			});
		}
	}
	controller.insertRecordNodes(finalNodes, controller.record.length);
	console.assert(nodes.length === state.timestamps.length);
	// Iterate over each node, and insert wait events as needed.
	// The head node's timestamp is already fixed by the initial countdown + jump event.
	let warned = false;
	for (let i = 1; i < nodes.length; i++) {
		const node = nodes[i];
		const actualTimestamp = (state.timestamps[i] - state.combatStartTime) / 1000;
		const expectedWait = controller.game.getSkillAvailabilityStatus(
			// @ts-expect-error use proper casting/annotation later
			nodes[i].info.skillName,
		).timeTillAvailable;
		const actualWait = actualTimestamp - controller.game.getDisplayTime();
		const delta = actualWait - expectedWait;
		// delta > 3.5: add a fixed timestamp wait, since this is probably used to wait for a target mechanic
		// delta <= 3.5: add a duration wait, since this is probably a late weave
		// |delta| <= 0.05: do nothing
		// delta < -0.05: sps is probably wrong; raise a warning
		const newNodes = [];
		if (delta > 3.5) {
			newNodes.push(jumpToTimestampNode(actualTimestamp));
		} else if (delta > 0.05) {
			newNodes.push(durationWaitNode(actualWait));
		} else if (delta < -0.05 && !warned) {
			console.error(
				`skill availability time was later than actual usage time (delta=${-delta})`,
			);
			warned = true;
		}
		newNodes.push(node);
		finalNodes.push(...newNodes);
		controller.insertRecordNodes(newNodes, controller.record.length);
	}
	console.log(`inserted ${finalNodes.length - nodes.length} wait/jump nodes`);
	// this is NOT atomic, but oh well
	controller.undoStack.push(new ImportLog(finalNodes, initialRecordLength, oldConfig, newConfig));
	controller.autoSave();
}

/**
 * State of user through the log import flow.
 *
 * The order of user interactions is as follows:
 * 0. Authenticate user if necessary (probably just save a PKCE secret?)
 *    need to make sure also works for cn.fflogs
 * 1. User provides log link
 * 1a. If link does not have specific fight + player, prompt user to select like xivanalysis does
 * 2. Set job + level. User checks inferred stats, or supplies own + option to replace or append to current timeline
 * 3. Imported actions are added, and dialog progress is reset
 */
enum LogImportFlowState {
	AWAITING_AUTH,
	AWAITING_LOG_LINK,
	QUERYING_LOG_LINK,
	ADJUSTING_CONFIG,
	PROCESSING_IMPORT,
}

export function FflogsImportFlow() {
	// TODO set to false by default
	const [dialogOpen, setDialogOpen] = useState(true);
	const handleStyle: React.CSSProperties = {};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();

	const [resetOnImport, setResetOnImport] = useState(true);
	const dialogRef = useRef<HTMLDivElement | null>(null);

	const [logLink, setLogLink] = useState("");
	const [flowState, setFlowState] = useState<LogImportFlowState>(
		LogImportFlowState.AWAITING_AUTH,
	);

	// Intermediate logimport state is valid iff flowState is ADJUSTING_CONFIG.
	const intermediateImportState = useRef<IntermediateLogImportState | undefined>(undefined);

	// 0. AUTH
	const authComponent = <div>
		<button
			onClick={() => {
				setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
			}}
		>
			placeholder auth flow button
		</button>
	</div>;

	// 1. QUERY AND IMPORT LOG
	// TODO: replace this with a formset so hitting enter submits the query
	const importLogComponent = <div>
		<Input
			description={
				<div>enter an fflogs URL (must have both player and exact fight selected)</div>
			}
			onChange={setLogLink}
			width={50}
			defaultValue={logLink}
			autoFocus
		/>
		<br />
		<button
			disabled={flowState !== LogImportFlowState.AWAITING_LOG_LINK}
			onClick={() => {
				if (flowState === LogImportFlowState.AWAITING_LOG_LINK) {
					setFlowState(LogImportFlowState.QUERYING_LOG_LINK);
					try {
						queryPlayerEvents(parseLogURL(logLink))
							.then((state) => {
								intermediateImportState.current = state;
								console.log(`attempting to import ${state.actions.length} skills`);
							})
							.finally(() => {
								setFlowState(LogImportFlowState.ADJUSTING_CONFIG);
							});
					} catch (e) {
						console.error(e);
						window.alert(e);
						setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
					}
				}
			}}
		>
			import from link
		</button>
	</div>;

	// TODO add an actual spinner
	const querySpinner = <div>
		<p>retrieving log...</p>
	</div>;

	// 2. ADJUST STATS
	// TODO localize and share code with config
	// TODO add back arrow
	// TODO populate stat fields + level that aren't inferred
	const needsForceReset = () =>
		controller.gameConfig.job !== intermediateImportState.current?.job;
	const configHelp = <Help
		container={dialogRef}
		topic="fflogsConfigReset"
		content={localize({
			en: <div>
				FFLogs only records exact combat stats for the player that created the log. All
				other stats must be entered manually. Any configuration not specified in this
				dialog, including initial resource overrides, will use the values set in the main
				"Config" panel.
				<br />
				After a log import, the "proc mode" field is set to "Always". You can manually
				adjust this later.
			</div>,
		})}
	/>;
	const resetActiveHelp = <Help
		container={dialogRef}
		topic="fflogsConfigResetActive"
		content={localize({
			en: <div>
				<i>
					Actions in the current timeline will be cleared and replaced with those imported
					from the log.
				</i>
				<br />
				FFLogs does not record actions performed before combat begins. To add pre-pull
				actions, manually insert them after importing, or add them beforehand and uncheck
				this option.
			</div>,
		})}
	/>;
	const resetInactiveHelp = <Help
		container={dialogRef}
		topic="fflogsConfigResetActive"
		content={localize({
			en: <span>
				<i>
					Actions imported from the log will be added to the end of the existing timeline.
				</i>
			</span>,
		})}
	/>;
	const statBlock = <div>
		{localize({
			en: <p>
				Reading {intermediateImportState.current?.actions.length ?? 0} skills for{" "}
				<b>{intermediateImportState.current?.playerName}</b>
			</p>,
		})}
		{intermediateImportState.current?.statsInLog
			? localize({
					en: "Using stats found in log. Please adjust as needed.",
				})
			: localize({
					en: "Exact stats not found in log. Please enter manually or adjust with the Config pane after import.",
				})}{" "}
		{configHelp}
		<hr style={{ marginTop: 10, marginBottom: 10 }} />
		<div>
			<span>{localize({ en: "job: ", zh: "职业：" })}</span>
			{intermediateImportState.current?.job ?? controller.game.job}
		</div>
		{intermediateImportState.current && <div style={{ marginBottom: 10 }}>
			<span>{localize({ en: "level: ", zh: "等级：" })}</span>
			<select
				style={{ outline: "none", color: colors.text }}
				value={intermediateImportState.current!.level}
				onChange={(e) => {
					intermediateImportState.current!.level = parseInt(e.target.value) as LevelSync;
				}}
			>
				<option key={LevelSync.lvl100} value={LevelSync.lvl100}>
					100
				</option>
				<option key={LevelSync.lvl90} value={LevelSync.lvl90}>
					90
				</option>
				<option key={LevelSync.lvl80} value={LevelSync.lvl80}>
					80
				</option>
				<option key={LevelSync.lvl70} value={LevelSync.lvl70}>
					70
				</option>
			</select>
		</div>}
		{intermediateImportState.current &&
			Object.entries(
				intermediateImportState.current.inferredConfig ?? {
					spellSpeed: "",
					skillSpeed: "",
					criticalHit: "",
					directHit: "",
					determination: "",
					piety: "",
				},
			)
				.filter(
					// main stat and tenacity are hidden to the user
					([field, _]) => field !== "main" && field !== "tenacity",
				)
				.map(([field, value]) => <div key={field}>
					{/* TODO these fields need proper synchronization */}
					<Input
						style={{ display: "inline-block", color: colors.text }}
						defaultValue={value?.toString() ?? ""}
						description={field + ": "}
						onChange={(v) => {
							const parsed = parseInt(v);
							if (!isNaN(parsed)) {
								if (intermediateImportState.current!.inferredConfig === undefined) {
									intermediateImportState.current!.inferredConfig = {};
								}
								intermediateImportState.current!.inferredConfig[
									field as DynamicConfigField
								] = parsed;
								console.log(intermediateImportState);
							}
						}}
					/>
				</div>)}
		<hr style={{ marginTop: 10, marginBottom: 10 }} />
		{/* Do not use the common Checkbox component, since that backs values to localStorage. */}
		{needsForceReset() ? (
			<div style={{ marginBottom: 5 }}>
				<span>
					{localize({ en: "Imported actions will replace the current timeline." })}
				</span>
			</div>
		) : (
			<div style={{ marginBottom: 5 }}>
				<input
					className="shellCheckbox"
					type="checkbox"
					onChange={(e) => {
						setResetOnImport(e.currentTarget.checked);
					}}
					checked={resetOnImport}
				/>
				<span>{localize({ en: "Reset timeline on import" })} </span>
				{resetOnImport ? resetActiveHelp : resetInactiveHelp}
			</div>
		)}
		<button
			style={{ marginTop: 10 }}
			onClick={() => {
				if (intermediateImportState.current) {
					setFlowState(LogImportFlowState.PROCESSING_IMPORT);
					// Use a timeout to force a render update before beginning the import process.
					// applyImportedActions adds a bunch of nodes one at a time, which forces a ton
					// of re-renders in quick succession due to some bad design choices in the controller.
					// Without the timeout, stuff would hang.
					new Promise<void>((resolve) =>
						setTimeout(() => {
							applyImportedActions(
								intermediateImportState.current!,
								resetOnImport || needsForceReset(),
							);
							resolve();
						}, 0),
					).finally(() => {
						setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						intermediateImportState.current = undefined;
						setDialogOpen(false);
					});
				} else {
					console.error("intermediate state was undefined when confirming import");
					setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
					intermediateImportState.current = undefined;
					setDialogOpen(false);
				}
			}}
		>
			{localize({
				en: "go",
				zh: "确定",
			})}
		</button>
	</div>;

	// 3. PROCESS LOG IMPORT
	const processingSpinner = <div>processing actions...</div>;

	// GLUE
	// TODO check auth validity again here, and also on component initialization?
	const cancelButton = <button onClick={() => setFlowState(LogImportFlowState.AWAITING_LOG_LINK)}>
		{localize({
			en: "cancel",
			zh: "取消",
		})}
	</button>;

	const mainComponent =
		flowState === LogImportFlowState.AWAITING_AUTH
			? authComponent
			: flowState === LogImportFlowState.AWAITING_LOG_LINK
				? importLogComponent
				: flowState === LogImportFlowState.QUERYING_LOG_LINK
					? querySpinner
					: flowState === LogImportFlowState.ADJUSTING_CONFIG
						? statBlock
						: processingSpinner;

	const body = <div ref={dialogRef}>
		{mainComponent}
		<br />
		{/* Don't render the cancel button during the processing state, because controller actions are irreversible at that point. */}
		{flowState > LogImportFlowState.AWAITING_LOG_LINK &&
		flowState !== LogImportFlowState.PROCESSING_IMPORT
			? cancelButton
			: undefined}
	</div>;

	// Don't use a bespoke Clickable component for the expand button, since it suppresses Dialog.Trigger's
	// built-in dismiss behavior.
	const dialogTrigger = <div className="clickable">
		<span style={handleStyle}>
			<span className="clickableLinkLike">click to open dialog</span>
		</span>
	</div>;

	const exitTrigger = <FaXmark
		className="dialogExit"
		style={{
			color: colors.bgHighContrast,
		}}
	/>;

	// TODO share more code with changelog
	return <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
		<Dialog.Trigger render={dialogTrigger} nativeButton={false} />
		<Dialog.Portal>
			<Dialog.Backdrop
				className="Backdrop"
				style={{
					opacity: lightMode ? 0.2 : 0.7,
				}}
			/>
			<Dialog.Popup
				className="Popup visibleScrollbar"
				id="changelogPopup"
				style={{
					backgroundColor: colors.background,
					border: "1px solid " + colors.bgMediumContrast,
					color: colors.text,
				}}
			>
				<Dialog.Title render={<h3>Import from FFLogs</h3>} />
				<Dialog.Close render={exitTrigger} nativeButton={false} />
				<Dialog.Description className="Description" render={body} />
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>;
}
