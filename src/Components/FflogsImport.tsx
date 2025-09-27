import React, { useState } from "react";
// import { Dialog } from "@base-ui-components/react/dialog";
// import { FaXmark } from "react-icons/fa6";
import { AddNodeBulk } from "../Controller/UndoStack";
import { controller } from "../Controller/Controller";
import { skillNode, ActionNode } from "../Controller/Record";
import { ActionKey } from "../Game/Data";
import { skillIdMap } from "../Game/Skills";
import { Input } from "./Common";
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

// Issue a GraphQL query given fight report ID, fight index ID, and player index ID.
// These can be parsed from a report URL that has a fight/player selected, or retrieved by query.
async function queryPlayerEvents(params: LogQueryParams): Promise<ActionNode[]> {
	if (castQueryCache.has(params)) {
		return castQueryCache.get(params)!;
	}

	const query = `
	query GetPlayerEvents($reportCode: String, $fightID: Int, $playerID: Int) {
		reportData {
			report(code: $reportCode) {
				events(sourceID: $playerID, fightIDs: [$fightID]) {
					data
					nextPageTimestamp
				}
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

	// TODO error handling
	return fetch(FFLOGS_API_URL, options)
		.then((response) => response.json())
		.then((data) => {
			// TODO combatantinfo entry can give stats and pre-buffs
			// TODO check/pair calculateddamage instances to identify multi-target abilities
			// TODO check pre-cast abilities
			// TODO filter+pair begin cast abilities
			// TODO deal with canceled casts
			// TODO explicit waits
			// TODO manual buff toggles
			const castIds: number[] = data.data.reportData.report.events.data
				.filter(
					// Filter action 7 (auto-attack)
					(entry: any) =>
						entry.type === "cast" &&
						entry.sourceID === params.playerID &&
						entry.abilityGameID !== 7,
				)
				.map((entry: any) => entry.abilityGameID);
			const castSkills: ActionKey[] = castIds.map((id) => {
				if (skillIdMap.has(id)) {
					return skillIdMap.get(id)!;
				} else {
					console.error("unknown action id", id);
					return "NEVER";
				}
			});
			const nodes = castSkills.map((key) => skillNode(key));
			castQueryCache.set(params, nodes);
			return nodes;
		});
}

export function FflogsImportFlow() {
	// const handleStyle: React.CSSProperties = {};
	// const lightMode = useContext(ColorThemeContext) === "Light";
	// const colors = getCurrentThemeColors();

	const [logLink, setLogLink] = useState("");
	const [eventQueryInProgress, setEventQueryInProgress] = useState(false);

	const submitQueryButton = <button
		disabled={eventQueryInProgress}
		onClick={() => {
			if (!eventQueryInProgress) {
				setEventQueryInProgress(true);
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
			}
		}}
	>
		import from link
	</button>;

	/*
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
	*/

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
	return importComponent;

	// TODO share more code with changelog
	/*
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
				<Dialog.Description
					className="Description"
					render={importComponent}
				/>
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>;
	*/
}
