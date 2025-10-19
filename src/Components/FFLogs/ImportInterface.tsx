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
	SkillNodeInfo,
	skillNode,
} from "../../Controller/Record";
import { ActionKey, ResourceKey } from "../../Game/Data";
import { JOBS, ShellJob } from "../../Game/Data/Jobs";
import { skillIdMap } from "../../Game/Skills";
import { ProcMode, LevelSync } from "../../Game/Common";
import {
	GameConfig,
	DynamicConfigPart,
	DynamicConfigField,
	SerializedConfig,
} from "../../Game/GameConfig";
import { Input, Help, StaticFn } from "../Common";
import { ColorThemeContext, getCurrentThemeColors } from "../ColorTheme";
import { getCurrentLanguage, localize, localizeSkillName } from "../Localization";
import { AccessTokenStatus, getAccessToken, initiateFflogsAuth } from "./Auth";
import { PCT_ACTIONS } from "../../Game/Data/Jobs/PCT";

// === INTERFACING WITH FFLOGS GRAPHQL API ===
interface LogQueryParams {
	apiBaseUrl: string;
	reportCode: string;
	fightID: number;
	playerID: number;
}

// TODO: return partial<LogQueryParams> and handle errors
function parseLogURL(urlString: string): LogQueryParams {
	const url = URL.parse(urlString)!;
	// TODO allow cn.fflogs or kr.fflogs
	if (url === null || (url.hostname !== "www.fflogs.com" && url.hostname !== "cn.fflogs.com")) {
		throw new Error("must pass a valid fflogs link");
	}
	const pathParts = url.pathname.split("/");
	console.assert(pathParts.length > 0);
	const reportCode = pathParts[pathParts.length - 1];
	// Example:
	// ?fight=19&type=casts&source=405&view=events
	// If fight and source are unspecified, the user must be prompted to select a specific
	// fight and player, similar to XIVAnalysis.
	const searchParams = url.searchParams;
	const fightID = parseInt(searchParams.get("fight")!);
	const playerID = parseInt(searchParams.get("source")!);
	// TODO
	if (!fightID || !playerID) {
		throw new Error("must pick specific fight and specific player (will fix later)");
	}
	return {
		apiBaseUrl: `https://${url.hostname}/api/v2/user/`,
		reportCode,
		fightID,
		playerID,
	};
}

// In-memory cache for log import state.
// This cache is transient to avoid any versioning concerns and interactions with browser-imposed
// limits on sessionStorage/localStorage, as responses can become quite large.
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
	buffRemovalActions: { popKey: ActionKey; applyKey: ActionKey; timestamp: number }[];
	actions: SkillNodeInfo[];
	timestamps: number[];
	combatStartTime: number;
}

const BUFF_IDS = {
	TEMPERA_COAT: 1003686,
	TEMPERA_GRASSA: 1003687,
	BLACKEST_NIGHT: 1001178,
	TENGENTSU: 1003853,
	THIRD_EYE: 1001232,
	CREST_OF_TIME_BORROWED: 1002596,
};

const POP_MAP = new Map<ActionKey, ActionKey>([
	["TEMPERA_COAT_POP", "TEMPERA_COAT"],
	["TEMPERA_GRASSA_POP", "TEMPERA_GRASSA"],
	["THE_BLACKEST_NIGHT_POP", "THE_BLACKEST_NIGHT"],
	["TENGENTSU_POP", "TENGENTSU"],
	["THIRD_EYE_POP", "THIRD_EYE"],
	["ARCANE_CREST_POP", "ARCANE_CREST"],
]);

/**
 * Issue a GraphQL query given fight report ID, fight index ID, and player index ID.
 * These can be parsed from a report URL that has a fight/player selected, or retrieved by query.
 *
 * This function is stateless.
 */
async function queryPlayerEvents(params: LogQueryParams): Promise<IntermediateLogImportState> {
	if (castQueryCache.has(params)) {
		console.log("in-memory query cache hit for", params);
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
			Authorization: `Bearer ${window.sessionStorage.getItem("fflogsAuthToken")}`,
			// Uncomment the next 2 lines if bypassing PKCE
			// // @ts-expect-error typescript doesn't like import.meta
			// Authorization: `Bearer ${import.meta.env.VITE_FFLOGS_CLIENT_TOKEN}`,
		},
		body: JSON.stringify({
			query,
			variables: params,
		}),
	};
	const data = await fetch(params.apiBaseUrl, options)
		.then((response) => response.json())
		.then((blob) => {
			if (blob["error"] !== undefined) {
				throw new Error(blob["error"]);
			}
			return blob;
		});
	// TODO check/pair calculateddamage instances to identify multi-target abilities
	// TODO manual buff toggles
	const actor: any = Object.values(data.data.reportData.report.playerDetails.data.playerDetails)
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
	// Map buff tags to timestamps at which they were removed.
	// This is populated for jobs that have gauge events tied to the consumption of buffs, such as
	// PCT's Tempera Coat/Grassa, SAM's Tengentsu, and DRK's Blackest Night.
	// Buff removals do not distinguish between natural expiry, explicit click-offs, and triggers
	// due to damage taken.
	// The removal map should track the "Pop" action rather than the actual buff resource.
	const trackedBuffRemovals = new Map<ActionKey, Set<number>>();
	const trackedBuffApplies = new Map<ResourceKey, Set<number>>();
	const grassaCastTimestamps = new Set<number>();
	for (let entry of data.data.reportData.report.events.data) {
		if (entry.sourceID !== params.playerID) {
			continue;
		}
		// TODO parse buff removal events that correspond to actions
		if (entry.type === "cast" && !FILTERED_ACTION_IDS.has(entry.abilityGameID)) {
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
			// Sometimes buff removal events don't get picked up by a log.
			// For robustness, we treat the cast of Tempera Grassa as a proxy for buff removal
			// (its application delay is instant so this is accurate).
			// We then need to produce an artificial grassa buff removal event afterwads.
			if (entry.abilityGameID === PCT_ACTIONS.TEMPERA_GRASSA.id) {
				grassaCastTimestamps.add(entry.timestamp);
			}
		} else if (entry.type === "begincast" && !FILTERED_ACTION_IDS.has(entry.abilityGameID)) {
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
		} else if (entry.type === "removebuff") {
			let popToAdd: ActionKey | undefined = undefined;
			const ts = entry.timestamp;
			const abilityGameID = entry.abilityGameID;
			if (job === "PCT" && entry.targetID === params.playerID) {
				if (abilityGameID === BUFF_IDS.TEMPERA_COAT) {
					popToAdd = "TEMPERA_COAT_POP";
				} else if (abilityGameID === BUFF_IDS.TEMPERA_GRASSA) {
					popToAdd = "TEMPERA_GRASSA_POP";
				}
			} else if (job === "DRK") {
				if (abilityGameID === BUFF_IDS.BLACKEST_NIGHT) {
					popToAdd = "THE_BLACKEST_NIGHT_POP";
				}
			} else if (job === "SAM" && entry.targetID === params.playerID) {
				if (abilityGameID === BUFF_IDS.TENGENTSU) {
					popToAdd = "TENGENTSU_POP";
				} else if (abilityGameID === BUFF_IDS.THIRD_EYE) {
					popToAdd = "THIRD_EYE_POP";
				}
			} else if (job === "RPR" && entry.targetID === params.playerID) {
				if (abilityGameID === BUFF_IDS.CREST_OF_TIME_BORROWED) {
					popToAdd = "ARCANE_CREST_POP";
				}
			}
			// TODO deal with SGE shields
			// TODO deal with floor effects like paint lines and ley lines
			if (popToAdd !== undefined) {
				if (!trackedBuffRemovals.has(popToAdd)) {
					trackedBuffRemovals.set(popToAdd, new Set([ts]));
				} else {
					trackedBuffRemovals.get(popToAdd)!.add(ts);
				}
			}
		} else if (entry.type === "applybuff" && entry.targetID === params.playerID) {
			// This is a special case for PCT's Tempera Coat/Grassa interaction.
			// When Tempera Grassa is cast, a "removebuff" event for Tempera Coat is generated
			// with the same timestamp, but we should not produce a "Pop Tempera Coat" action.
			if (job === "PCT" && entry.abilityGameID === BUFF_IDS.TEMPERA_GRASSA) {
				if (!trackedBuffApplies.has("TEMPERA_GRASSA")) {
					trackedBuffApplies.set("TEMPERA_GRASSA", new Set());
				}
				trackedBuffApplies.get("TEMPERA_GRASSA")!.add(entry.timestamp);
			}
		}
	}
	// Remove all supposed tempera coat pops that overlap a grassa usage.
	trackedBuffApplies
		.get("TEMPERA_GRASSA")
		?.forEach((timestamp) => trackedBuffRemovals.get("TEMPERA_COAT_POP")?.delete(timestamp));
	// Add a new dummy grassa pop event if a cast event was picked up without a matching buff creation event.
	grassaCastTimestamps.forEach((timestamp) => {
		if (!trackedBuffApplies.get("TEMPERA_GRASSA")?.has(timestamp)) {
			if (!trackedBuffRemovals.has("TEMPERA_GRASSA")) {
				trackedBuffRemovals.set("TEMPERA_GRASSA", new Set([timestamp + 10]));
			} else {
				trackedBuffRemovals.get("TEMPERA_GRASSA")!.add(timestamp + 10);
			}
		}
	});
	const actions: SkillNodeInfo[] = castEvents.map((event: any) => {
		const id = event.abilityGameID;
		const key = skillIdMap.has(id)
			? skillIdMap.get(id)!
			: // Assume really high IDs (like 34600430) are tincture usages
				id > 30000000
				? "TINCTURE"
				: "NEVER";
		if (key === "NEVER") {
			console.error("unknown action id", id);
		}
		return {
			type: ActionType.Skill,
			skillName: key,
			// TODO set these fields properly
			targetCount: 1,
			healTargetCount: undefined,
		} as SkillNodeInfo;
	});
	const state: IntermediateLogImportState = {
		playerName: name,
		job,
		level,
		statsInLog:
			inferredConfig !== undefined &&
			Object.values(inferredConfig).every((x) => x !== undefined),
		inferredConfig,
		buffRemovalActions: Array.from(
			trackedBuffRemovals.entries().flatMap(([key, set]) =>
				set.entries().map(([timestamp]) => {
					return {
						popKey: key,
						applyKey: POP_MAP.get(key)!,
						timestamp,
					};
				}),
			),
		).sort((k1, k2) => k1.timestamp - k2.timestamp),
		actions,
		timestamps,
		combatStartTime: fight.endTime - fight.combatTime,
	};
	castQueryCache.set(params, state);
	return state;
}

// === PROCESSING LOGGED ACTIONS ===

interface ApplyImportProgress {
	processed: number;
	total: number;
	// First 5 events where there's a significant timestamp mismatch.
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
			if (progress.deltas.length >= 5) {
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
	const [flowState, setFlowState] = useState<LogImportFlowState>(
		LogImportFlowState.AWAITING_AUTH,
	);
	const [importProgress, setImportProgress] = useState<ApplyImportProgress | null>(null);
	const setDialogOpen = (open: boolean) => {
		// Adding nodes from an import is not atomic, so we prevent the user from closing the dialog
		// while processing nodes to not break controller state.
		if (open || flowState !== LogImportFlowState.PROCESSING_IMPORT) {
			if (!open && flowState === LogImportFlowState.IMPORT_DONE) {
				setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
				setImportProgress(null);
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
		onSubmit={(e) => {
			e.preventDefault();
			if (flowState === LogImportFlowState.AWAITING_LOG_LINK) {
				setFlowState(LogImportFlowState.QUERYING_LOG_LINK);
				try {
					queryPlayerEvents(parseLogURL(logLink)).then((state) => {
						intermediateImportState.current = state;
						console.log(`preparing to import ${state.actions.length} skills`);
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
						intermediateImportState.current = undefined;
					}, 0);
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
					"Minor differences are normal, but if you see a very large discrepancy," +
					"This means there's either a bug in the Shell, or the configured spell speed/skill speed/fps was incorrect.",
			})}
		</div>
		<table>
			<thead>
				<tr>
					<th>{localize({ en: "skill", zh: "技能" })}</th>
					<th>{localize({ en: "actual log time" })}</th>
					<th>{localize({ en: "expected shell time" })}</th>
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
				en: "processing actions...",
				zh: "正在技能处理中...",
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
