import React, { useContext, useState, useRef } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FaXmark } from "react-icons/fa6";
import { ImportLog } from "../Controller/UndoStack";
import { controller } from "../Controller/Controller";
import { skillNode, jumpToTimestampNode, ActionNode } from "../Controller/Record";
import { ActionKey } from "../Game/Data";
import { ALL_JOBS, JOBS, ShellJob } from "../Game/Data/Jobs";
import { skillIdMap } from "../Game/Skills";
import { ProcMode, LevelSync } from "../Game/Common";
import {
	GameConfig,
	DynamicConfigPart,
	DynamicConfigField,
	SerializedConfig,
} from "../Game/GameConfig";
import { Input } from "./Common";
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
]);

interface IntermediateLogImportState {
	playerName: string;
	job: ShellJob;
	level?: LevelSync;
	inferredConfig: Partial<DynamicConfigPart>;
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
		const inferredStats: Partial<DynamicConfigPart> = {};
		const fight = data.data.reportData.report.fights[0];
		const castEvents = [];
		const timestamps = [];
		for (const entry of data.data.reportData.report.events.data) {
			if (
				entry.type === "cast" &&
				entry.sourceID === params.playerID &&
				!FILTERED_ACTION_IDS.has(entry.abilityGameID)
			) {
				castEvents.push(entry);
				timestamps.push(entry.timestamp);
			} else if (entry.type === "combatantinfo") {
				// These stats are only populated for the log creator; these fields are otherwise
				// left undefined.
				level = entry.level;
				inferredStats.main = entry[JOBS[job].mainStat];
				inferredStats.spellSpeed = entry.spellSpeed;
				inferredStats.skillSpeed = entry.skillSpeed;
				inferredStats.criticalHit = entry.criticalHit;
				inferredStats.directHit = entry.directHit;
				inferredStats.determination = entry.determination;
				inferredStats.piety = entry.piety;
				inferredStats.tenacity = entry.tenacity;
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
			inferredConfig: inferredStats,
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
function applyImportedActions(state: IntermediateLogImportState) {
	// Reset the controller's GameConfig.
	const oldConfig = controller.gameConfig.serialized();
	const newConfig: SerializedConfig = {
		...oldConfig,
		procMode: ProcMode.Always,
		job: state.job,
	};
	Object.assign(state.inferredConfig);
	if (state.level !== undefined) {
		newConfig.level = state.level;
	}
	controller.setConfigAndRestart(
		newConfig,
		newConfig.job !== oldConfig.job || oldConfig.procMode !== newConfig.procMode,
	);
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
		nodes.splice(0, 0, jumpToTimestampNode(jumpTargetTime));
		console.log("target use time:", targetUseTime);
		// If the target use time is before countdown begins, then set the countdown to the floor of that duration
		if (-jumpTargetTime > controller.gameConfig.countdown) {
			controller.setConfigAndRestart({
				...newConfig,
				countdown: -Math.floor(jumpTargetTime),
			});
		}
	}
	controller.undoStack.push(new ImportLog(nodes, controller.record.length, oldConfig, newConfig));
	controller.insertRecordNodes(nodes, controller.record.length);
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
}

export function FflogsImportFlow() {
	// TODO set to false by default
	const [dialogOpen, setDialogOpen] = useState(true);
	const handleStyle: React.CSSProperties = {};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();

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
	const importLogComponent = <div>
		<Input
			description={
				<div>enter an fflogs URL (must have both player and exact fight selected)</div>
			}
			onChange={setLogLink}
			width={50}
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
								console.log(state);
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
	// TODO add flag for whether current timeline must be reset
	// TODO populate stat fields + level that aren't inferred
	const statBlock = <div>
		<p>adjust inferred configuration for {intermediateImportState.current?.playerName}</p>
		<div style={{ marginBottom: 10 }}>
			<span>{localize({ en: "job: ", zh: "职业：" })}</span>
			<select
				style={{ outline: "none", color: colors.text }}
				value={intermediateImportState.current?.job ?? controller.game.job}
				onChange={(s) => {
					intermediateImportState.current!.job = s.target.value as ShellJob;
				}}
			>
				{ALL_JOBS.filter((job) => JOBS[job].implementationLevel !== "UNIMPLEMENTED").map(
					(job) => <option key={job} value={job}>
						{job}
					</option>,
				)}
			</select>
		</div>
		{intermediateImportState.current &&
			Object.entries(intermediateImportState.current.inferredConfig).map(
				([field, value]) => <div key={field}>
					<Input
						style={{ display: "inline-block", color: colors.text }}
						defaultValue={value?.toString() ?? ""}
						description={field + ": "}
						onChange={(v) => {
							const parsed = parseInt(v);
							if (!isNaN(parsed)) {
								intermediateImportState.current!.inferredConfig[
									field as DynamicConfigField
								] = parsed;
							}
						}}
					/>
				</div>,
			)}
		<button
			onClick={() => {
				if (intermediateImportState.current) {
					applyImportedActions(intermediateImportState.current);
				} else {
					console.error("intermediate state was undefined when confirming import");
				}
				intermediateImportState.current = undefined;
				setFlowState(LogImportFlowState.AWAITING_LOG_LINK);
				setDialogOpen(false);
			}}
		>
			go
		</button>
	</div>;

	// GLUE
	// TODO check auth validity again here, and also on component initialization?
	const cancelButton = <button onClick={() => setFlowState(LogImportFlowState.AWAITING_LOG_LINK)}>
		cancel import
	</button>;

	const mainComponent =
		flowState === LogImportFlowState.AWAITING_AUTH
			? authComponent
			: flowState === LogImportFlowState.AWAITING_LOG_LINK
				? importLogComponent
				: flowState === LogImportFlowState.QUERYING_LOG_LINK
					? querySpinner
					: statBlock;

	const body = <div>
		{mainComponent}
		<br />
		{flowState > LogImportFlowState.AWAITING_LOG_LINK && cancelButton}
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
