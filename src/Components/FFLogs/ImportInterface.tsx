// Components and logic for importing a fight from an FFLogs report.
// This includes authorization and GraphQL queries against the fflogs v2 API.
// See docs for details: https://www.fflogs.com/api/docs
import React, { useEffect, useContext, useState, useRef } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FaXmark } from "react-icons/fa6";
import { ImportLog } from "../../Controller/UndoStack";
import { controller } from "../../Controller/Controller";
import {
	jumpToTimestampNode,
	durationWaitNode,
	ActionNode,
	ActionType,
	skillNode,
} from "../../Controller/Record";
import { ActionKey } from "../../Game/Data";
import { ProcMode, LevelSync } from "../../Game/Common";
import { GameConfig, SerializedConfig } from "../../Game/GameConfig";
import { Input, Help, StaticFn } from "../Common";
import { ColorThemeContext, getCurrentThemeColors } from "../ColorTheme";
import {
	getCurrentLanguage,
	localize,
	localizeConfigField,
	localizeSkillName,
} from "../Localization";
import { updateInvalidStatus } from "../TimelineEditor";
import { AccessTokenStatus, getAccessToken, initiateFflogsAuth } from "./Auth";
import {
	FightInfo,
	IntermediateLogImportState,
	ParsedLogQueryParams,
	parseLogURL,
	PlayerInfo,
	queryFightList,
	queryLastFightID,
	queryPlayerEvents,
	queryPlayerList,
} from "./Queries";

// === PROCESSING LOGGED ACTIONS ===

interface ApplyImportProgress {
	processed: number;
	total: number;
	// First several events where there's a significant timestamp mismatch.
	deltas: {
		skill: ActionKey;
		logTime: number;
		simTime: number;
	}[];
	spilledDeltas: number;
}

/**
 * STATEFUL function that applies the parsed action nodes and config to the active timeline in-place.
 * Creates a single new entry in the undo stack upon success.
 *
 * Yields a snapshot of processing progress, but it should generally be fast enough to not be relevant.
 *
 * This function can take a bit of time run because adding nodes invokes controller methods that may
 * trigger re-renders, and we need to splice in wait/jump nodes in the middle.
 * For most logs, there should not be very many node insertions, but in degenerate cases where
 * a log is very very off and many jumps need to be added, things may go wrong.
 *
 * This design CAN create broken intermediate states if the log import flow is closed prematurely.
 */
function* applyImportedActions(state: IntermediateLogImportState, resetTimeline: boolean) {
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
	const actions = state.actions;
	console.assert(actions.length === state.timestamps.length);
	if (actions.length === 0) {
		return { processed: 0, total: 0, deltas: [], spilledDeltas: 0 };
	}
	const toInsert = actions.map((info) => new ActionNode(info));
	// If the first action has a cast time, then assume it was hardcasted.
	const skillCastTimestamp = state.timestamps[0];
	const targetUseTime = (skillCastTimestamp - state.combatStartTime) / 1000;
	const castLength = controller.game.getSkillAvailabilityStatus(actions[0].skillName).castTime;
	const jumpTargetTime =
		castLength > 0
			? targetUseTime - castLength + GameConfig.getSlidecastWindow(castLength)
			: targetUseTime;
	toInsert.unshift(jumpToTimestampNode(jumpTargetTime));
	console.log("initial jump time:", targetUseTime);
	// If the target use time is before countdown begins, then set the countdown to the floor of that duration
	if (-jumpTargetTime > controller.gameConfig.countdown) {
		controller.setConfigAndRestart({
			...newConfig,
			countdown: -Math.floor(jumpTargetTime),
		});
	}
	// Bulk insert the initial jump event + all action nodes.
	controller.insertRecordNodes(toInsert, initialRecordLength);
	const progress: ApplyImportProgress = {
		processed: 1,
		total: actions.length,
		deltas: [],
		spilledDeltas: 0,
	};
	// Iterate over each node, splicing in wait events as needed.
	// The first node's timestamp was already fixed by the initial countdown + jump event.
	//
	// This approach is much more performant than inserting record nodes one at a time because
	// controller methods very indiscreetly force UI state updates. Since most nodes will
	// (presumably) not require an additional wait event, splicing them in the middle will
	// result in far fewer render attempts.
	let nonSkillNodeCount = 1; // from initial jump event
	const cd = controller.gameConfig.countdown;
	// Splice in "Pop" actions as we iterate through skills.
	// If the next pop action would occur between the last skill and the current skill, then insert
	// the pop skill here. The precise timing is irrelevant to us because XIV in the Shell can currently
	// only add buffs when a user specifies a skill, and we want to err on the conservative side of
	// the buff still being present.
	// We don't really care if the iterator wasn't fully consumed at the end of the log, since that
	// means a pop occurred after the player's last skill was added.
	const popActionIter = state.buffRemovalActions[Symbol.iterator]();
	let nextPopAction = popActionIter.next();
	for (let i = 1; i < actions.length; i++) {
		// action[i] will correspond to
		// controller.record.actions[initialRecordLength + i + nonSkillNodeCount]
		// Since iteration starts at i=1, i-1 and recordIndex-1 are always valid.
		const action = actions[i];
		const recordIndex = initialRecordLength + i + nonSkillNodeCount;
		const simNode = controller.record.actions[recordIndex];
		const actualTimestamp = (state.timestamps[i] - state.combatStartTime) / 1000;
		const name = action.skillName;
		// Note that the sim node name may not match the expected skill name because state may
		// become invalid (e.g. Paradox becoming B1/F1 because of MP tick shenanigans breaking
		// earlier spells).
		console.assert(simNode.info.type === ActionType.Skill && simNode.tmp_startLockTime);
		const expectedTimestamp = simNode.tmp_startLockTime! - cd;
		const prevNode = controller.record.actions[recordIndex - 1];
		const prevLockEndTimestamp = prevNode.tmp_endLockTime! - cd;
		if (!nextPopAction.done) {
			const { popKey, applyKey, timestamp } = nextPopAction.value;
			const nextPopTimestamp = (timestamp - state.combatStartTime) / 1000;
			// console.log(popKey, nextPopTimestamp, "vs.", lastLockEndTimestamp, expectedTimestamp)
			let insertIndex = undefined;
			if (prevLockEndTimestamp > nextPopTimestamp) {
				// If the pop occurred during the animation lock of the last skill:
				// - If the skill is not the buff applier, insert the pop one before.
				// - If the skill is the buff applier, insert the pop right here.
				if (
					prevNode.info.type === ActionType.Skill &&
					prevNode.info.skillName === applyKey
				) {
					insertIndex = recordIndex;
				} else {
					insertIndex = recordIndex - 1;
				}
			} else if (actualTimestamp > nextPopTimestamp) {
				// Compare against actual log timestamp, not shell expected timestamp, in order to
				// preempt potential wait events.
				insertIndex = recordIndex;
			}
			if (insertIndex !== undefined) {
				// console.log("insert", popKey, "index", insertIndex, `(was at time ${StaticFn.displayTime(nextPopTimestamp, 3)})`);
				controller.insertRecordNode(skillNode(popKey), insertIndex);
				nextPopAction = popActionIter.next();
				// To ensure timings are accurate, redo this action iteration after pushing the fake "pop" action.
				// This also handles the rare case of two consecutive buff pops.
				i--;
				nonSkillNodeCount++;
				continue;
			}
		}
		const delta = actualTimestamp - expectedTimestamp!;
		const tol = 0.05;
		// delta > 3.5: add a fixed timestamp wait, since this is probably used to wait for a target mechanic
		// delta <= 3.5: add a duration wait, since this is probably a late weave
		// |delta| <= tol: do nothing
		// delta < -tol: sps is probably wrong; report to user
		if (delta > 3.5) {
			// console.log("insert jump to", StaticFn.displayTime(actualTimestamp, 3), "index", recordIndex);
			controller.insertRecordNode(jumpToTimestampNode(actualTimestamp), recordIndex);
			nonSkillNodeCount++;
		} else if (delta > tol) {
			const actualWait = actualTimestamp - prevLockEndTimestamp;
			console.assert(actualWait > 0);
			// console.log("insert wait", StaticFn.displayTime(actualWait, 3), "index", recordIndex);
			controller.insertRecordNode(durationWaitNode(actualWait), recordIndex);
			nonSkillNodeCount++;
		} else if (delta < -tol) {
			if (progress.deltas.length >= 10) {
				progress.spilledDeltas++;
			} else {
				progress.deltas.push({
					skill: name,
					logTime: actualTimestamp,
					simTime: expectedTimestamp,
				});
			}
		}
		progress.processed++;
		yield progress;
	}
	const insertedNodes = controller.record.actions.slice(initialRecordLength);
	console.log(`inserted ${nonSkillNodeCount} non-skill nodes`);
	// this is NOT atomic, but oh well
	controller.undoStack.push(
		new ImportLog(insertedNodes, initialRecordLength, oldConfig, newConfig),
	);
	controller.autoSave();
	updateInvalidStatus();
}

// === COMPONENT STATE MACHINE ===

/**
 * State of user through the log import flow.
 */
enum LogImportFlowState {
	/** Waiting for the user to initiate authentication. */
	AWAITING_AUTH,
	/** Issued authentication query to FFLogs; awaiting result. */
	CHECKING_AUTH,
	/** User authenticated; awaiting log link. */
	AWAITING_LOG_LINK,
	/** Log link provided; submitting query to obtain log data. */
	QUERYING_LOG_LINK,
	/** Log link had multiple fights; user must select one. */
	CHOOSE_FIGHT,
	/** Log link selected fight but not player; user must select one. */
	CHOOSE_PLAYER,
	/** Fight selected; user is adjusting configuration values. */
	ADJUSTING_CONFIG,
	/** Imported nodes are being added to the controller. */
	PROCESSING_IMPORT,
	/** Import completed; showing results to user. */
	IMPORT_DONE,
}

export function FflogsImportFlow() {
	const [dialogOpen, _setDialogOpen] = useState<boolean>(
		// The dialog should be opened upon returning from the FFLogs auth flow.
		new URLSearchParams(window.location.search).has("code"),
	);
	const handleStyle: React.CSSProperties = {};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();

	const [resetOnImport, setResetOnImport] = useState(true);
	const dialogRef = useRef<HTMLDivElement | null>(null);

	const [logLink, setLogLink] = useState("");
	const [flowState, _setFlowState] = useState<LogImportFlowState>(
		LogImportFlowState.AWAITING_AUTH,
	);
	const setFlowState = (newFlowState: LogImportFlowState) => {
		if (newFlowState === flowState) {
			return;
		}
		// Clear intermediate state variables when transitioning between states.
		if (flowState === LogImportFlowState.IMPORT_DONE) {
			setImportProgress(null);
		}
		if (
			newFlowState !== LogImportFlowState.ADJUSTING_CONFIG &&
			newFlowState !== LogImportFlowState.PROCESSING_IMPORT
		) {
			intermediateImportState.current = undefined;
		}
		if (
			newFlowState !== LogImportFlowState.CHOOSE_FIGHT &&
			newFlowState !== LogImportFlowState.CHOOSE_PLAYER
		) {
			// fightList is valid during CHOOSE_PLAYER in case they wish to go back one page.
			fightList.current = [];
			playerList.current = [];
			chosenFightInfo.current = undefined;
		}
		if (
			![
				LogImportFlowState.AWAITING_LOG_LINK,
				LogImportFlowState.CHOOSE_FIGHT,
				LogImportFlowState.CHOOSE_PLAYER,
			].includes(newFlowState)
		) {
			logInfo.current = undefined;
		}
		_setFlowState(newFlowState);
	};

	const [importProgress, setImportProgress] = useState<ApplyImportProgress | null>(null);
	const setDialogOpen = (open: boolean) => {
		// Adding nodes from an import is not atomic, so we prevent the user from closing the dialog
		// while processing nodes to not break controller state.
		if (open || flowState !== LogImportFlowState.PROCESSING_IMPORT) {
			if (!open && flowState === LogImportFlowState.IMPORT_DONE) {
				setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
			}
			_setDialogOpen(open);
		}
	};

	// Automatically perform authentication on component load.
	useEffect(() => {
		if (
			!new URLSearchParams(window.location.search).has("code") &&
			window.sessionStorage.getItem("fflogsAuthToken") !== null
		) {
			setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
			console.log("already authorized to fflogs");
			return;
		}
		setFlowState(LogImportFlowState.CHECKING_AUTH);
		getAccessToken()
			.then((status) => {
				if (status === AccessTokenStatus.SUCCESS) {
					setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
				} else if (dialogOpen && status === AccessTokenStatus.UNAUTHORIZED) {
					// Automatically attempt to perform authorization flow.
					initiateFflogsAuth()
						.then(getAccessToken)
						.then((status) => {
							setFlowState(
								status === AccessTokenStatus.SUCCESS
									? LogImportFlowState.AWAITING_LOG_LINK
									: LogImportFlowState.AWAITING_AUTH,
							);
						})
						.catch((e) => {
							console.log("Error during automatic FFLogs authentication");
							console.error(e);
							setFlowState(LogImportFlowState.AWAITING_AUTH);
						});
				} else {
					setFlowState(LogImportFlowState.AWAITING_AUTH);
				}
			})
			.catch(() => setFlowState(LogImportFlowState.AWAITING_AUTH));
	}, []);

	const logInfo = useRef<ParsedLogQueryParams | undefined>(undefined);
	const fightList = useRef<FightInfo[]>([]);
	const chosenFightInfo = useRef<FightInfo | undefined>(undefined);
	const playerList = useRef<PlayerInfo[]>([]);
	// Intermediate logimport state is valid iff flowState is ADJUSTING_CONFIG.
	const intermediateImportState = useRef<IntermediateLogImportState | undefined>(undefined);

	const cancelButton = <button onClick={() => setFlowState(LogImportFlowState.AWAITING_LOG_LINK)}>
		{localize({
			en: "cancel",
			zh: "取消",
		})}
	</button>;

	// 0. AUTH
	const authComponent = <div>
		<button
			onClick={() => {
				initiateFflogsAuth();
				setFlowState(LogImportFlowState.CHECKING_AUTH);
			}}
		>
			click here to authenticate your fflogs account
		</button>
		<br />
		<br />
		<span>(will redirect to www.fflogs.com)</span>
	</div>;

	const authProcessingComponent = <div>verifying authentication...</div>;

	// 1. QUERY AND IMPORT LOG
	const limitations = <div>
		<div>
			<b>{localize({ en: "Limitations", zh: "限制" })}</b>
		</div>
		{getCurrentLanguage() === "zh" && <div>
			<i>我们现在还在开发FFLogs进口功能，所以许多标签还没有完全被翻译。</i>🙇🏻
		</div>}
		<div>
			{localize({ en: "Log import is currently subject to the following limitations:" })}
		</div>
		<ul>
			<li>
				{localize({
					en: "FFLogs only records combat stats for the creator of the log, so stats must be manually entered for other players.",
				})}
			</li>
			<li>
				{localize({
					en: "FFLogs cannot record actions that were performed before combat began. Pre-pull actions must be entered manually before import.",
				})}
			</li>
			<li>
				{localize({
					en: "Manual buff click-offs, and buff toggles from entering/leaving a zone (for example: leaving Ley Lines or Sacred Soil) are not currently processed by XIV in the Shell.",
				})}
			</li>
			<li>
				{localize({
					en: "The offset of MP and Lucid Dreaming ticks are not currently synchronized in XIV in the Shell.",
				})}
			</li>
			<li>
				{localize({
					en: "XIV in the Shell currently ignores the number of enemies hit by an ability.",
				})}
			</li>
			<li>
				{localize({
					en: "XIV in the Shell does not record job gauge updates that are affected by random factors, or by whether an enemy is hit or killed.",
				})}
			</li>
		</ul>
		<div>
			{localize({
				en: "These may change in future updates.",
			})}
		</div>
	</div>;

	const importLogComponent = <form
		onSubmit={async (e) => {
			e.preventDefault();
			if (flowState !== LogImportFlowState.AWAITING_LOG_LINK) {
				return;
			}
			try {
				const partialLogInfo = parseLogURL(logLink);
				if (partialLogInfo.error) {
					throw new Error(localize(partialLogInfo.error).toString());
				}
				setFlowState(LogImportFlowState.QUERYING_LOG_LINK);
				// Special case: if the URL parameters contained fight=last, then issue an extra
				// query to get the ID of the last fight.
				if (new URL(logLink).searchParams.get("fight") === "last") {
					console.log("querying last fight ID");
					const lastFightID = await queryLastFightID(
						partialLogInfo.apiBaseUrl,
						partialLogInfo.reportCode,
					);
					partialLogInfo.fightID = lastFightID;
				}
				logInfo.current = partialLogInfo;
				if (partialLogInfo.fightID === undefined) {
					const infos = await queryFightList(
						partialLogInfo.apiBaseUrl,
						partialLogInfo.reportCode,
					);
					fightList.current = infos;
					console.log("choosing from", infos.length, "fights");
					setFlowState(LogImportFlowState.CHOOSE_FIGHT);
				} else if (partialLogInfo.playerID === undefined) {
					const infos = await queryPlayerList(
						partialLogInfo.apiBaseUrl,
						partialLogInfo.reportCode,
						partialLogInfo.fightID,
					);
					fightList.current = [];
					[chosenFightInfo.current, playerList.current] = infos;
					console.log("choosing from", playerList.current.length, "players");
					setFlowState(LogImportFlowState.CHOOSE_PLAYER);
				} else {
					const state = await queryPlayerEvents({
						apiBaseUrl: partialLogInfo.apiBaseUrl,
						reportCode: partialLogInfo.reportCode,
						fightID: partialLogInfo.fightID,
						playerID: partialLogInfo.playerID,
					});
					intermediateImportState.current = state;
					console.log(`preparing to import ${state.actions.length} skills`);
					setFlowState(LogImportFlowState.ADJUSTING_CONFIG);
				}
			} catch (e) {
				console.error(e);
				window.alert(e);
				setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
			}
		}}
	>
		{/* TODO automatically submit on paste, like xiva does? */}
		<Input
			description={
				<div>
					{localize({
						en: "enter an FFLogs report link",
						zh: "请输入FFLogs日志网址",
					})}
				</div>
			}
			onChange={setLogLink}
			width={50}
			defaultValue={logLink}
			autoFocus
		/>
		<br />
		<button
			type="submit"
			disabled={flowState !== LogImportFlowState.AWAITING_LOG_LINK || !logLink}
		>
			{localize({ en: "import", zh: "进口" })}
		</button>
		<br />
		<br />
		<button onClick={() => setFlowState(LogImportFlowState.AWAITING_AUTH)}>
			{localize({ en: "back to authorization", zh: "从新授权" })}
		</button>
		<hr />
		{limitations}
	</form>;

	// TODO add an actual spinner
	const querySpinner = <div>
		<p>{localize({ en: "retrieving log...", zh: "正在检索日志..." })}</p>
	</div>;

	const runningFightOrPlayerQuery = useRef<boolean>(false);
	const fightPicker = <div>
		<b>{localize({ en: "Choose a fight", zh: "选择战场" })}</b>
		<hr style={{ marginTop: 10, marginBottom: 10 }} />
		<ul>
			{fightList.current.map((info, i) => <li
				key={i}
				onClick={() => {
					if (runningFightOrPlayerQuery.current) {
						return;
					}
					const partialLogInfo = logInfo.current;
					if (partialLogInfo === undefined) {
						console.error("log info was undefined in fight choice state");
						setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						return;
					}
					runningFightOrPlayerQuery.current = true;
					queryPlayerList(partialLogInfo.apiBaseUrl, partialLogInfo.reportCode, info.id)
						.then((infos) => {
							[chosenFightInfo.current, playerList.current] = infos;
							partialLogInfo.fightID = info.id;
							console.log("choosing from", playerList.current.length, "players");
							setFlowState(LogImportFlowState.CHOOSE_PLAYER);
						})
						.catch((e) => {
							console.error(e);
							window.alert(e);
							setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						})
						.finally(() => {
							runningFightOrPlayerQuery.current = false;
						});
				}}
			>
				<span className="clickableLinkLike">
					{new Date(info.unixStartTime).toLocaleString()}
					{" - "}
					{localize(info.label)}
				</span>
			</li>)}
		</ul>
		{cancelButton}
	</div>;

	const playerPicker = <div>
		{chosenFightInfo.current && <span>
			{new Date(chosenFightInfo.current.unixStartTime).toLocaleString()}
			{" - "}
			{localize(chosenFightInfo.current.label)}
		</span>}
		<br />
		<b>{localize({ en: "Choose a player", zh: "选择队员" })}</b>
		<hr style={{ marginTop: 10, marginBottom: 10 }} />
		<ul>
			{playerList.current.map((info, i) => <li
				key={i}
				onClick={() => {
					if (runningFightOrPlayerQuery.current) {
						return;
					}
					const partialLogInfo = logInfo.current;
					if (partialLogInfo === undefined) {
						console.error("log info was undefined in player choice state");
						setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						return;
					}
					if (partialLogInfo.fightID === undefined) {
						console.error("fight ID was undefined in player choice state");
						setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						return;
					}
					runningFightOrPlayerQuery.current = true;
					queryPlayerEvents({
						apiBaseUrl: partialLogInfo.apiBaseUrl,
						reportCode: partialLogInfo.reportCode,
						fightID: partialLogInfo.fightID,
						playerID: info.id,
					})
						.then((state) => {
							intermediateImportState.current = state;
							console.log(`preparing to import ${state.actions.length} skills`);
							setFlowState(LogImportFlowState.ADJUSTING_CONFIG);
						})
						.catch((e) => {
							console.error(e);
							window.alert(e);
							setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
						})
						.finally(() => {
							runningFightOrPlayerQuery.current = false;
						});
				}}
			>
				<span className="clickableLinkLike">
					{info.job}
					{" - "}
					{info.name}
				</span>
			</li>)}
		</ul>
		{fightList.current.length === 0 ? (
			// If we came from fight selection, the cancel button should go back there.
			// Otherwise, go back to link entry.
			cancelButton
		) : (
			<button
				onClick={() => {
					setFlowState(LogImportFlowState.CHOOSE_FIGHT);
					playerList.current = [];
				}}
			>
				{localize({
					en: "back to fight selection",
					zh: "回到战场选择",
				})}
			</button>
		)}
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
						// @ts-expect-error can't verify property typing easily
						description={localizeConfigField(field)}
						onChange={(v) => {
							const parsed = parseInt(v);
							if (!isNaN(parsed)) {
								if (intermediateImportState.current!.inferredConfig === undefined) {
									intermediateImportState.current!.inferredConfig = {};
								}
								// @ts-expect-error not properly validating
								intermediateImportState.current!.inferredConfig[field] = parsed;
								console.log("new field should be " + parsed);
							}
						}}
					/>
				</div>)}
		<Input
			style={{ display: "inline-block", color: colors.text, marginTop: 10 }}
			defaultValue={""}
			description={localizeConfigField("fps")}
			onChange={(v) => {
				const parsed = parseInt(v);
				if (!isNaN(parsed)) {
					if (intermediateImportState.current!.inferredConfig === undefined) {
						intermediateImportState.current!.inferredConfig = {};
					}
					intermediateImportState.current!.inferredConfig["fps"] = parsed;
					console.log(intermediateImportState);
				}
			}}
		/>
		<hr style={{ marginTop: 10, marginBottom: 10 }} />
		{/* Do not use the common Checkbox component, since that backs values to localStorage and
		we don't want to persist its state. */}
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
					const gen = applyImportedActions(
						intermediateImportState.current!,
						resetOnImport || needsForceReset(),
					);
					// We use a dummy setTimeout to ensure we transition the UI to the processing screen.
					setTimeout(() => {
						gen.forEach((progress) => {
							setImportProgress({ ...progress });
						});
						setFlowState(LogImportFlowState.IMPORT_DONE);
					}, 0);
				} else {
					console.error("intermediate state was undefined when confirming import");
					setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
					setDialogOpen(false);
				}
			}}
		>
			{localize({
				en: "go",
				zh: "确定",
			})}
		</button>
		<br />
		{cancelButton}
	</div>;

	// 3. PROCESS LOG IMPORT
	const importProgressTable = importProgress?.deltas.length && <div>
		<hr />
		<div>
			{localize({
				en:
					"Some simulated actions had timestamps in XIV in the Shell different from the recorded values in FFLogs. " +
					"Minor differences are normal, but if you see a very large discrepancy, " +
					"this means there's either a bug in XIV in the Shell, or the configured spell speed/skill speed/fps was incorrect.",
			})}
		</div>
		<table>
			<thead>
				<tr>
					<th>{localize({ en: "skill", zh: "技能" })}</th>
					<th>{localize({ en: "log time", zh: "日志时间" })}</th>
					<th>{localize({ en: "shell time", zh: "模拟器时间" })}</th>
					<th>{localize({ en: "difference", zh: "差别" })}</th>
				</tr>
			</thead>
			<tbody>
				{importProgress.deltas.map((info, i) => <tr key={i}>
					<td>{localizeSkillName(info.skill)}</td>
					<td>{StaticFn.displayTime(info.logTime, 3)}</td>
					<td>{StaticFn.displayTime(info.simTime, 3)}</td>
					<td>{StaticFn.displayTime(info.logTime - info.simTime, 3)}</td>
				</tr>)}
			</tbody>
		</table>
		{importProgress.spilledDeltas ? (
			<span>{localize({ en: `...and ${importProgress.spilledDeltas} more` })}</span>
		) : undefined}
	</div>;
	const processingSpinner = <div>
		<div>
			{localize({
				en: "processing actions (this may take a moment)...",
				zh: "正在技能处理中（有可能会花一些时间）...",
			})}
		</div>
		<br />
		{importProgress && <div>
			<span>
				{importProgress.processed} / {importProgress.total}
			</span>
			<br />
			{importProgressTable}
		</div>}
	</div>;

	// 4. IMPORT DONE; TIME TO CELEBRATE
	const importSummary = <div>
		<b>{localize({ en: "Import successful!", zh: "进口成功！" })}</b>
		{localize({
			en: " You may now close this dialog.",
			zh: "您现在可以关闭此对话框。",
		})}
		<br />
		{importProgressTable}
		<br />
		<button onClick={() => setDialogOpen(false)}>
			{localize({
				en: "finish",
				zh: "完成",
			})}
		</button>
	</div>;

	const mainComponent =
		flowState === LogImportFlowState.AWAITING_AUTH ? (
			authComponent
		) : flowState === LogImportFlowState.CHECKING_AUTH ? (
			authProcessingComponent
		) : flowState === LogImportFlowState.AWAITING_LOG_LINK ? (
			importLogComponent
		) : flowState === LogImportFlowState.QUERYING_LOG_LINK ? (
			querySpinner
		) : flowState === LogImportFlowState.CHOOSE_FIGHT ? (
			fightPicker
		) : flowState === LogImportFlowState.CHOOSE_PLAYER ? (
			playerPicker
		) : flowState === LogImportFlowState.ADJUSTING_CONFIG ? (
			statBlock
		) : flowState === LogImportFlowState.PROCESSING_IMPORT ? (
			processingSpinner
		) : flowState === LogImportFlowState.IMPORT_DONE ? (
			importSummary
		) : (
			<div>Bad state: {flowState}. Please contact us with a bug report.</div>
		);

	const body = <div ref={dialogRef}>{mainComponent}</div>;

	// Don't use a bespoke Clickable component for the expand button, since it suppresses Dialog.Trigger's
	// built-in dismiss behavior.
	const dialogTrigger = <div className="clickable">
		<span style={handleStyle}>
			<span className="clickableLinkLike">
				{localize({
					en: "Click to open dialog",
					zh: "点击弹出对话框",
				})}
			</span>
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
				id="dialogPopup"
				style={{
					backgroundColor: colors.background,
					border: "1px solid " + colors.bgMediumContrast,
					color: colors.text,
				}}
			>
				<Dialog.Title
					render={<h3>{localize({ en: "Import from FFLogs", zh: "FFLogs进口" })}</h3>}
				/>
				<Dialog.Close render={exitTrigger} nativeButton={false} />
				<Dialog.Description className="Description" render={body} />
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>;
}
