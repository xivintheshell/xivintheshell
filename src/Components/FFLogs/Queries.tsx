// Functions for submitting queries about logs to the FFLogs GraphQL API.
import { ActionType, SkillNodeInfo } from "../../Controller/Record";
import { LevelSync } from "../../Game/Common";
import { ActionKey, ResourceKey } from "../../Game/Data";
import { JOBS, ShellJob } from "../../Game/Data/Jobs";
import { ConfigData } from "../../Game/GameConfig";
import { skillIdMap } from "../../Game/Skills";
import { localize, LocalizedContent } from "../Localization";

type ReportCode = string;
type FightID = number;
type PlayerID = number;

export interface LogQueryParams {
	apiBaseUrl: string;
	reportCode: ReportCode;
	fightID: FightID;
	playerID: PlayerID;
}

export interface ParsedLogQueryParams {
	apiBaseUrl: string;
	reportCode: ReportCode;
	fightID?: FightID;
	playerID?: PlayerID;
	error?: LocalizedContent;
}

export function parseLogURL(urlString: string): ParsedLogQueryParams {
	const url = URL.parse(urlString)!;
	if (url === null) {
		return {
			apiBaseUrl: "",
			reportCode: "",
			error: { en: "invalid URL", zh: "无效的网址" },
		};
	}
	if (url.hostname !== "www.fflogs.com" && url.hostname !== "cn.fflogs.com") {
		return {
			apiBaseUrl: "",
			reportCode: "",
			error: {
				en: "must be a link to www.fflogs.com or cn.fflogs.com",
				zh: "网址必须指向www.fflogs.com或cn.fflogs.com",
			},
		};
	}
	const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
	if (pathParts.length !== 2) {
		console.error("parsed link parts:", pathParts);
		return {
			apiBaseUrl: "",
			reportCode: "",
			error: {
				en: "link must contain a single report",
				zh: "网址必须包含一个日志",
			},
		};
	}
	console.assert(pathParts.length > 0);
	const reportCode = pathParts[pathParts.length - 1];
	// Example:
	// ?fight=19&type=casts&source=405&view=events
	// If fight and source are unspecified, the user must be prompted to select a specific
	// fight and player, similar to XIVAnalysis.
	const searchParams = url.searchParams;
	const maybeIntFightID = parseInt(searchParams.get("fight") ?? "NaN");
	const fightID = isNaN(maybeIntFightID) ? undefined : maybeIntFightID;
	const maybePlayerID = parseInt(searchParams.get("source") ?? "NaN");
	const playerID = isNaN(maybePlayerID) ? undefined : maybePlayerID;
	return {
		apiBaseUrl: `https://${url.hostname}/api/v2/user/`,
		reportCode,
		fightID,
		playerID,
	};
}

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

export interface IntermediateLogImportState {
	playerName: string;
	job: ShellJob;
	level?: LevelSync;
	statsInLog: boolean;
	inferredConfig?: Partial<ConfigData>;
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

export interface FightInfo {
	id: FightID;
	label: LocalizedContent;
	unixStartTime: number;
}

export interface PlayerInfo {
	id: PlayerID;
	name: string;
	job: string;
}

// Hopefully users don't have more than 100
const LIST_FIGHTS_QUERY = `
query ListReportFights($reportCode: String) {
	reportData {
		report(code: $reportCode) {
			fights {
				bossPercentage
				encounterID
				id
				name
				kill
				startTime
			}
			startTime
		}
	}
}`;

const LIST_FIGHT_IDS_QUERY = `
query ListReportFightIDs($reportCode: String) {
	reportData {
		report(code: $reportCode) {
			fights {
				id
			}
		}
	}
}`;

const LIST_PLAYERS_QUERY = `
query ListFightPlayers($reportCode: String, $fightID: Int) {
	reportData {
		report(code: $reportCode) {
			fights(fightIDs: [$fightID]) {
				bossPercentage
				encounterID
				id
				name
				kill
				startTime
			}
			startTime
			playerDetails(fightIDs: [$fightID])
		}
	}
}`;

const PLAYER_EVENT_QUERY = `
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
}`;

async function fetchQuery(apiBaseUrl: string, query: string, variables: any): Promise<any> {
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			// Use this instead if bypassing PKCE
			// // @ts-expect-error typescript doesn't like import.meta
			// Authorization: `Bearer ${import.meta.env.VITE_FFLOGS_CLIENT_TOKEN}`,
			Authorization: `Bearer ${window.sessionStorage.getItem("fflogsAuthToken")}`,
		},
		body: JSON.stringify({
			query,
			variables,
		}),
	};
	return fetch(apiBaseUrl, options)
		.then((response) => response.json())
		.then((blob) => {
			if (blob.error !== undefined) {
				throw new Error(blob.error);
			}
			if (blob.errors !== undefined) {
				throw new Error(blob.errors);
			}
			return blob.data;
		});
}

// Maps reportCode to list of FightInfo for that report.
// Assumes that report codes are unique between www.fflogs and cn.fflogs... surely this will always
// hold true, right? Right???
const fightQueryCache = new Map<ReportCode, FightInfo[]>();

function formatFightInfo(
	reportStartTime: number,
	fightInfo: {
		id: number;
		name: string;
		kill: boolean;
		bossPercentage: number | null;
		startTime: number;
	},
): FightInfo {
	// We do not currently use the encounterID field, but we can do so in the future to
	// add automatic marker import.
	const pctString =
		fightInfo.bossPercentage === null
			? localize({ en: "(trash)", zh: "（垃圾）" }).toString()
			: fightInfo.bossPercentage.toFixed(1) + "%";
	return {
		label: {
			en: `${fightInfo.name} - ${fightInfo.kill ? "kill" : pctString}`,
			zh: `${fightInfo.name} - ${fightInfo.kill ? "杀" : pctString}`,
		},
		id: fightInfo.id,
		unixStartTime: reportStartTime + fightInfo.startTime,
	};
}

export async function queryFightList(
	apiBaseUrl: string,
	reportCode: ReportCode,
): Promise<FightInfo[]> {
	const cacheValue = fightQueryCache.get(reportCode);
	if (cacheValue !== undefined) {
		return cacheValue;
	}
	const data = await fetchQuery(apiBaseUrl, LIST_FIGHTS_QUERY, { reportCode });
	const reportStartTime = data.reportData.report.startTime as number;
	const result = data.reportData.report.fights.map((fightInfo: any) =>
		formatFightInfo(reportStartTime, fightInfo),
	);
	fightQueryCache.set(reportCode, result);
	return result;
}

export async function queryLastFightID(
	apiBaseUrl: string,
	reportCode: ReportCode,
): Promise<number> {
	const data = await fetchQuery(apiBaseUrl, LIST_FIGHT_IDS_QUERY, { reportCode });
	const ids = data.reportData.report.fights.map((info: any) => info.id);
	return Math.max(...ids);
}

function formatPlayerName(actor: { name: string; server: string }): string {
	return `${actor.name ?? localize({ en: "(name unknown)", zh: "（无名）" })} @ ${actor.server ?? localize({ en: "(world unknown)", zh: "（未知地区）" })}`;
}

// Map reportCode -> fightID -> fight label + list of player info
const playerQueryCache = new Map<ReportCode, Map<FightID, [FightInfo, PlayerInfo[]]>>();
export async function queryPlayerList(
	apiBaseUrl: string,
	reportCode: ReportCode,
	fightID: FightID,
): Promise<[FightInfo, PlayerInfo[]]> {
	const cacheValue = playerQueryCache.get(reportCode)?.get(fightID);
	if (cacheValue !== undefined) {
		return cacheValue;
	}
	const data = await fetchQuery(apiBaseUrl, LIST_PLAYERS_QUERY, { reportCode, fightID });
	const players = Object.values(data.reportData.report.playerDetails.data.playerDetails)
		.flat()
		.map((playerInfo: any) => {
			return {
				id: playerInfo.id,
				name: formatPlayerName(playerInfo),
				job: FFLOGS_JOB_MAP.get(playerInfo.type) ?? "???",
			};
		});
	const reportStartTime = data.reportData.report.startTime as number;
	const fightInfo = formatFightInfo(reportStartTime, data.reportData.report.fights[0]);
	if (!playerQueryCache.has(reportCode)) {
		playerQueryCache.set(reportCode, new Map([[fightID, [fightInfo, players]]]));
	} else {
		playerQueryCache.get(reportCode)!.set(fightID, [fightInfo, players]);
	}
	return [fightInfo, players];
}

// In-memory cache for log import state.
// reportID -> fightID -> playerID -> state
// This cache is transient to avoid any versioning concerns and interactions with browser-imposed
// limits on sessionStorage/localStorage, as responses can become quite large.
const castQueryCache = new Map<
	ReportCode,
	Map<FightID, Map<PlayerID, IntermediateLogImportState>>
>();

/**
 * Issue a GraphQL query given fight report ID, fight index ID, and player index ID.
 * These can be parsed from a report URL that has a fight/player selected, or retrieved by query.
 *
 * This function is stateless.
 */
export async function queryPlayerEvents(
	params: LogQueryParams,
): Promise<IntermediateLogImportState> {
	const cacheValue = castQueryCache
		.get(params.reportCode)
		?.get(params.fightID)
		?.get(params.playerID);
	if (cacheValue !== undefined) {
		console.log("query cache hit for", params);
		return cacheValue;
	}
	const data = await fetchQuery(params.apiBaseUrl, PLAYER_EVENT_QUERY, params);
	// TODO check/pair calculateddamage instances to identify multi-target abilities
	// TODO manual buff toggles
	const actor: any = Object.values(data.reportData.report.playerDetails.data.playerDetails)
		.flat()
		.filter(
			// TODO handle indexerror and lookup error
			(actor: any) => actor.id === params.playerID,
		)[0];
	const job = FFLOGS_JOB_MAP.get(actor.type)!;
	const name = formatPlayerName(actor);
	let level: LevelSync | undefined = undefined;
	let inferredConfig: Partial<ConfigData> | undefined = undefined;
	const fight = data.reportData.report.fights[0];
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
	for (let entry of data.reportData.report.events.data) {
		if (entry.sourceID !== params.playerID) {
			continue;
		}
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
			// NOTE: It is sometimes possible for a cast of Tempera Grassa to perfectly overlap with
			// a damage event removing the Tempera Coat buff, as is the case in shanzhe's test FRU log.
			// PoV with this happening: https://youtu.be/0VbiXoZh5cc?t=675
			// (Grassa's CD rolls, but Tempera Coat's CD is reduced by 60s instead of 30s)
			//
			// We treat the subsequent Tempera Grassa cast as invalid, though it technically is
			// possible to remove that cast with some pre-processing here.
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
	if (!castQueryCache.has(params.reportCode)) {
		castQueryCache.set(
			params.reportCode,
			new Map([[params.fightID, new Map([[params.playerID, state]])]]),
		);
	} else if (!castQueryCache.get(params.reportCode)!.has(params.fightID)) {
		castQueryCache
			.get(params.reportCode)!
			.set(params.fightID, new Map([[params.playerID, state]]));
	} else {
		castQueryCache.get(params.reportCode)!.get(params.fightID)!.set(params.playerID, state);
	}
	return state;
}
