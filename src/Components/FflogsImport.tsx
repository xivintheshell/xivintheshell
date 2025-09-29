import React, { useContext, useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FaXmark } from "react-icons/fa6";
import { AddNodeBulk } from "../Controller/UndoStack";
import { controller } from "../Controller/Controller";
import { skillNode, jumpToTimestampNode, ActionNode } from "../Controller/Record";
import { ActionKey } from "../Game/Data";
import { ShellJob } from "../Game/Data/Jobs";
import { skillIdMap } from "../Game/Skills";
import { ProcMode } from "../Game/Common";
import { GameConfig } from "../Game/GameConfig";
import { Input } from "./Common";
import { ColorThemeContext, getCurrentThemeColors } from "./ColorTheme";
// import { localize } from "./Localization";

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
	if (url.hostname !== "www.fflogs.com") {
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
const castQueryCache = new Map<LogQueryParams, ActionNode[]>();

const fflogsJobMap = new Map<string, ShellJob>([
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

// Issue a GraphQL query given fight report ID, fight index ID, and player index ID.
// These can be parsed from a report URL that has a fight/player selected, or retrieved by query.
async function queryPlayerEvents(params: LogQueryParams): Promise<ActionNode[]> {
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
		const job = fflogsJobMap.get(
			// @ts-expect-error whatever
			Object.values(data.data.reportData.report.playerDetails.data.playerDetails)
				.flat()
				.filter(
					// TODO handle indexerror and lookup error
					(actor: any) => actor.id === params.playerID,
				)[0].type,
		)!;
		// TODO return this instead of performing state mutation here
		// TODO check level sync too
		if (job !== controller.game.job || controller.gameConfig.procMode !== ProcMode.Always) {
			// TODO undo stack
			controller.setConfigAndRestart(
				{
					...controller.gameConfig.serialized(),
					procMode: ProcMode.Always,
					job,
				},
				true,
			);
			console.log("changing jobs w/ log import");
		}
		const fight = data.data.reportData.report.fights[0];
		const combatStartTime = fight.endTime - fight.combatTime;
		const castEvents = data.data.reportData.report.events.data.filter(
			// Filter action 7 (auto-attack)
			(entry: any) =>
				entry.type === "cast" &&
				entry.sourceID === params.playerID &&
				!FILTERED_ACTION_IDS.has(entry.abilityGameID),
		);
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
		// If the first action has a cast time, then assume it was hardcasted.
		if (nodes.length > 0) {
			const skillCastTimestamp = castEvents[0].timestamp;
			const targetUseTime = (skillCastTimestamp - combatStartTime) / 1000;
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
				controller.setConfigAndRestart(
					{
						...controller.gameConfig.serialized(),
						countdown: -Math.floor(jumpTargetTime),
					},
					false,
				);
			}
		}
		castQueryCache.set(params, nodes);
		return nodes;
	});
}

export function FflogsImportFlow() {
	// Order of user interactions:
	// 0. Authenticate user if necessary (probably just save a PKCE secret?)
	//    need to make sure also works for cn.fflogs
	// 1. User provides log link
	// 1a. If link does not have specific fight + player, prompt user to select like xivanalysis does
	// 2. Set job + level. User checks inferred stats, or supplies own + option to replace or append to current timeline
	// 3. Imported actions are added, and dialog progress is reset
	const handleStyle: React.CSSProperties = {};
	const lightMode = useContext(ColorThemeContext) === "Light";
	const colors = getCurrentThemeColors();

	const [logLink, setLogLink] = useState("");
	const [eventQueryInProgress, setEventQueryInProgress] = useState(false);

	const submitQueryButton = <button
		disabled={eventQueryInProgress}
		onClick={() => {
			if (!eventQueryInProgress) {
				setEventQueryInProgress(true);
				try {
					queryPlayerEvents(parseLogURL(logLink))
						.then((nodes) => {
							controller.undoStack.doThenPush(
								new AddNodeBulk(nodes, controller.record.length, "fflogs"),
							);
							console.log(`imported ${nodes.length} skills`);
						})
						.finally(() => {
							setEventQueryInProgress(false);
						});
				} catch (e) {
					console.error(e);
					window.alert(e);
					setEventQueryInProgress(false);
				}
			}
		}}
	>
		import from link
	</button>;

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

	const importComponent = <div>
		<Input
			description={
				<div>enter an fflogs URL (must have both player and exact fight selected)</div>
			}
			onChange={setLogLink}
			width={50}
		/>
		<br />
		{submitQueryButton}
	</div>;

	// TODO share more code with changelog
	return <Dialog.Root defaultOpen={true}>
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
				<Dialog.Description className="Description" render={importComponent} />
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>;
}
