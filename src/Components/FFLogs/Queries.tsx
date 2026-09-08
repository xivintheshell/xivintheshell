// Functions for submitting queries about logs to the FFLogs GraphQL API.
import { ActionType, SkillNodeInfo } from "../../Controller/Record";
import { BuffType, LevelSync } from "../../Game/Common";
import { ActionKey, ResourceKey } from "../../Game/Data";
import { ALL_JOBS, JOBS, ShellJob } from "../../Game/Data/Jobs";
import { ConfigData, getSavedConfigPart } from "../../Game/GameConfig";
import { buffInfos, getBuffInfoByStatusId, BRD_SONG_BUFF_TYPES } from "../../Game/Buffs";
import { skillIdMap } from "../../Game/Skills";
import { getCurrentLanguage, localize, LocalizedContent } from "../Localization";
import { findTrackKeyWithIdAndLanguage } from "../TimelineMarkerPresets";

type ReportCode = string;
type FightID = number;
type PlayerID = number;

export interface PartyBuffMarkerWindow {
	buffType: BuffType;
	time: number;
	duration: number;
}

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

export interface TargetabilityQueryParams {
	apiBaseUrl: string;
	reportCode: ReportCode;
	fightID: FightID;
}

export function parseLogURL(urlString: string): ParsedLogQueryParams {
	// Clicking a fight from the FFLogs web UI adds the ID as a hash instead of a search param.
	const url = URL.parse(urlString.replace("#", "?"))!;
	if (url === null) {
		return {
			apiBaseUrl: "",
			reportCode: "",
			error: { en: "invalid URL", zh: "无效的网址" },
		};
	}
	const fflogsDomains = ["www", "cn", "ja", "de", "fr", "kr"].map((it) => `${it}.fflogs.com`);
	if (!fflogsDomains.includes(url.hostname)) {
		return {
			apiBaseUrl: "",
			reportCode: "",
			error: {
				en: "must be a link to one of the following: " + fflogsDomains.join(", "),
				zh: "网址必须指向" + fflogsDomains.join("、") + "之一",
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
	["Summoner", "SMN"],
	["RedMage", "RDM"],
	["Pictomancer", "PCT"],
	["BlueMage", "BLU"],
]);

const FILTERED_ACTION_IDS = new Set([
	7, // auto-attack
	8, // auto-attack
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
	encounterTrackKey?: string;
	phaseTransitionTimestamps: number[];
	partyBuffMarkers: PartyBuffMarkerWindow[];
}

const BUFF_IDS = {
	TEMPERA_COAT: 1003686,
	TEMPERA_GRASSA: 1003687,
	BLACKEST_NIGHT: 1001178,
	TENGENTSU: 1003853,
	THIRD_EYE: 1001232,
	CREST_OF_TIME_BORROWED: 1002596,
	COLD_FOG: 1002493,
};

const POP_MAP = new Map<ActionKey, ActionKey>([
	["TEMPERA_COAT_POP", "TEMPERA_COAT"],
	["TEMPERA_GRASSA_POP", "TEMPERA_GRASSA"],
	["THE_BLACKEST_NIGHT_POP", "THE_BLACKEST_NIGHT"],
	["TENGENTSU_POP", "TENGENTSU"],
	["THIRD_EYE_POP", "THIRD_EYE"],
	["ARCANE_CREST_POP", "ARCANE_CREST"],
	["POP_COLD_FOG", "COLD_FOG"],
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
				encounterID
				name
				combatTime
				startTime
				endTime
				phaseTransitions {
					startTime
				}
			}
			playerDetails(fightIDs: [$fightID])
		}
	}
}`;

// FFLogs encodes status IDs as 1_000_000 + game status id on buff/debuff events.
const FFLOGS_STATUS_ID_OFFSET = 1_000_000;

const STATUS_EVENTS_QUERY = `
query GetPartyStatusEvents($reportCode: String, $fightID: Int, $filterExpression: String) {
	reportData {
		report(code: $reportCode) {
			events(
				fightIDs: [$fightID],
				filterExpression: $filterExpression,
				limit: 10000
			) {
				data
				nextPageTimestamp
			}
		}
	}
}`;

type StatusEvent = {
	timestamp: number;
	type: string;
	sourceID: number;
	targetID: number;
	abilityGameID: number;
};

async function queryPartyStatusEvents(params: LogQueryParams): Promise<StatusEvent[]> {
	// Filter by known party-buff / boss-debuff status IDs. `target.id` in filterExpression is
	// unreliable (apparently???), so we instead filter out self-buffs from the player post-query.
	const abilityIds = Array.from(
		new Set(buffInfos.map((info) => FFLOGS_STATUS_ID_OFFSET + info.statusId)),
	).join(", ");
	const filterExpression =
		`type in ("applybuff","removebuff","applydebuff","removedebuff")` +
		` and ability.id in (${abilityIds})`;
	const data = await fetchQuery(params.apiBaseUrl, STATUS_EVENTS_QUERY, {
		reportCode: params.reportCode,
		fightID: params.fightID,
		filterExpression,
	});
	const page = data.reportData.report.events;
	if (page.nextPageTimestamp != null) {
		console.warn(
			"party status events exceeded limit=10000; some buff markers may be missing",
			page.nextPageTimestamp,
		);
	}
	return page.data as StatusEvent[];
}

/**
 * Computes buff windows based on apply/remove status events from FFLogs.
 * Ignores all events where the source is the player themselves, as those are computed from
 * direct actions in the timeline. Player buffs must also target the selected player.
 */
function aggregatePartyBuffMarkers(
	events: StatusEvent[],
	playerID: PlayerID,
	combatStartTime: number,
	_fightEndTime: number,
): PartyBuffMarkerWindow[] {
	type OpenWindow = { startMs: number; buffType: BuffType; defaultDuration: number };
	// Key by statusId only (including boss debuffs): multi-target / untargetable phases can leave
	// per-target windows open with no remove event.
	const openWindows = new Map<number, OpenWindow>();
	const raw: PartyBuffMarkerWindow[] = [];

	// Because FFLogs has no inherent distinction for Radiant Finale stacks on status events, we
	// just manually count the number of times we've seen an RF cast. Apparently the event from the
	// BRD itself will have a number of stacks, but that sounds too convoluted to deal with, so we'll
	// just let resource runs languish for now.
	let radiantFinaleStacks = 1;

	const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
	for (const evt of sorted) {
		const statusId =
			evt.abilityGameID >= FFLOGS_STATUS_ID_OFFSET
				? evt.abilityGameID - FFLOGS_STATUS_ID_OFFSET
				: evt.abilityGameID;
		const info = getBuffInfoByStatusId(statusId, radiantFinaleStacks);
		if (!info) {
			continue;
		}
		const isDebuff = evt.type.endsWith("debuff");
		// Only examine party buffs that are applied to the selected player, and not issued
		// from the player themselves.
		if ((!isDebuff && evt.targetID !== playerID) || evt.sourceID === playerID) {
			continue;
		}
		if (evt.type === "applybuff" || evt.type === "applydebuff") {
			const opened = openWindows.get(statusId);
			// BRD songs overwrite each other; cut short any other open song at this apply.
			if (BRD_SONG_BUFF_TYPES.has(info.name)) {
				for (const [otherId, other] of openWindows) {
					if (otherId !== statusId && BRD_SONG_BUFF_TYPES.has(other.buffType)) {
						raw.push({
							buffType: other.buffType,
							time: (other.startMs - combatStartTime) / 1000,
							duration: (evt.timestamp - other.startMs) / 1000,
						});
						openWindows.delete(otherId);
					}
				}
				openWindows.set(statusId, {
					startMs: evt.timestamp,
					buffType: info.name,
					defaultDuration: info.duration,
				});
			} else if (opened && evt.timestamp > opened.startMs) {
				// If we didn't see a remove event (boss went untargetable, or player went out of
				// log range), end the marker with the default duration given by BuffInfo.
				raw.push({
					buffType: opened.buffType,
					time: (opened.startMs - combatStartTime) / 1000,
					duration: opened.defaultDuration,
				});
				openWindows.set(statusId, {
					startMs: evt.timestamp,
					buffType: info.name,
					defaultDuration: info.duration,
				});
			} else if (!opened) {
				openWindows.set(statusId, {
					startMs: evt.timestamp,
					buffType: info.name,
					defaultDuration: info.duration,
				});
			}
		} else if (evt.type === "removebuff" || evt.type === "removedebuff") {
			const opened = openWindows.get(statusId);
			if (opened) {
				if (statusId === 2964) {
					// Up the number of times we've seen Radiant Finale
					opened.buffType = getBuffInfoByStatusId(statusId, radiantFinaleStacks++)!.name;
				}
				raw.push({
					buffType: opened.buffType,
					time: (opened.startMs - combatStartTime) / 1000,
					duration: (evt.timestamp - opened.startMs) / 1000,
				});
				openWindows.delete(statusId);
			}
		}
	}

	for (const opened of openWindows.values()) {
		raw.push({
			buffType: opened.buffType,
			time: (opened.startMs - combatStartTime) / 1000,
			duration: opened.defaultDuration,
		});
	}

	// Merge together any overlapping buff windows.
	const positive = raw.filter((w) => w.duration > 0);
	const byType = new Map<BuffType, PartyBuffMarkerWindow[]>();
	for (const w of positive) {
		const list = byType.get(w.buffType) ?? [];
		list.push(w);
		byType.set(w.buffType, list);
	}
	const merged: PartyBuffMarkerWindow[] = [];
	for (const [buffType, list] of byType) {
		list.sort((a, b) => a.time - b.time);
		let cur: PartyBuffMarkerWindow | undefined;
		for (const w of list) {
			if (!cur) {
				cur = { ...w };
				continue;
			}
			const curEnd = cur.time + cur.duration;
			const wEnd = w.time + w.duration;
			if (w.time <= curEnd) {
				cur.duration = Math.max(curEnd, wEnd) - cur.time;
			} else {
				merged.push(cur);
				cur = { ...w };
			}
		}
		if (cur) {
			merged.push({ ...cur, buffType });
		}
	}
	return merged;
}

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
				throw new Error(JSON.stringify(blob.error));
			}
			if (blob.errors !== undefined) {
				throw new Error(JSON.stringify(blob.errors));
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
	// Sort players by job guide order (same as config selector)
	// If multiple people have the same job, then lexicographically compare by name
	players.sort((a, b) => {
		const jobCompare =
			ALL_JOBS.indexOf(a.job as ShellJob) - ALL_JOBS.indexOf(b.job as ShellJob);
		return jobCompare === 0 ? a.name.localeCompare(b.name) : jobCompare;
	});
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

interface CalculatedDamageEvent {
	timestamp: number;
	type: "calculateddamage";
	targetID: number;
	abilityGameID: number;
	unmitigatedAmount: number;
}

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
	// A list of targets that have been seen in "calculateddamage" events so far, in the order
	// in which they appear in packets.
	// The first target on this list will be used as boss 1.
	const seenTargetOrder: number[] = [];
	const seenTargetSet: Set<number> = new Set();
	// A map of timestamps to calculateddamage events. This is used in a second pass later on
	// to determine which target(s) a damaging ability hit. Note that these correspond to "prepares"
	// events (snapshots) rather than actual damage application, and thus are not susceptible
	// to errors due to ghosting.
	// This makes the assumption that for a given player, the pair of (timestamp, targetID) is
	// sufficient to pair damage instances to their cast.
	const damageEvents = new Map<number, CalculatedDamageEvent[]>();
	// If a "begin cast" is left at the end of the loop without a paired "cast", don't bother
	// adding it to the timeline since we can safely assume it was canceled.
	let stagedBeginEvent: any | undefined = undefined;
	// Map of "begin cast" timestamps to their corresponding "cast" events. Necessary to pair
	// damage instances for hardcast abilities.
	const hardcastSnapTimes = new Map<number, number>();
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
					hardcastSnapTimes.set(stagedBeginEvent.timestamp, entry.timestamp);
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
		} else if (entry.type === "calculateddamage") {
			let tsList = damageEvents.get(entry.timestamp);
			if (tsList === undefined) {
				tsList = [];
				damageEvents.set(entry.timestamp, tsList);
			}
			tsList.push(entry as CalculatedDamageEvent);
			if (!seenTargetSet.has(entry.targetID)) {
				seenTargetOrder.push(entry.targetID);
				seenTargetSet.add(entry.targetID);
			}
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
			} else if (job === "BLU" && entry.targetID === params.playerID) {
				if (abilityGameID === BUFF_IDS.COLD_FOG) {
					popToAdd = "POP_COLD_FOG";
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
	const statsInLog =
		inferredConfig !== undefined && Object.values(inferredConfig).every((x) => x !== undefined);
	if (!statsInLog) {
		// Fall back to last-saved stats for the imported job.
		inferredConfig = { ...getSavedConfigPart(job) };
	}
	const actions: SkillNodeInfo[] = castEvents.map((event: any) => {
		const id = event.abilityGameID;
		const key =
			skillIdMap.get(id) ??
			// Assume all other really high IDs (like 34600430) are tincture usages
			// I have no idea where precise IDs are stored, so I've decided to just cut this range
			// off at 34603670 (g4 mind pot) to not accidentally catch foods
			(id > 34000000 && id <= 34603670 ? "TINCTURE" : "NEVER");
		if (key === "NEVER") {
			console.error("unknown action id", id);
		}
		let pairedDamageEvents =
			damageEvents.get(event.timestamp)?.filter((dmg) => dmg.abilityGameID === id) ?? [];
		// If this was a hardcast: we need to look up the time of the actual snapshot event.
		// We can't use the ?? operator in case a dot tick occurred at the same time as the start of the cast.
		if (pairedDamageEvents.length === 0) {
			const snapTime = hardcastSnapTimes.get(event.timestamp);
			if (snapTime !== undefined) {
				pairedDamageEvents =
					damageEvents.get(snapTime)?.filter((dmg) => dmg.abilityGameID === id) ?? [];
			}
		}
		let targetList = [1];
		if (pairedDamageEvents.length > 0) {
			// Assume the target with highest received damage was the primary target.
			let primaryID = pairedDamageEvents[0].targetID;
			let maxDamage = pairedDamageEvents[0].unmitigatedAmount;
			const targetIDs = new Set<number>([primaryID]);
			for (let i = 1; i < pairedDamageEvents.length; i++) {
				const dmg = pairedDamageEvents[i];
				if (dmg.unmitigatedAmount > maxDamage) {
					primaryID = dmg.targetID;
					maxDamage = dmg.unmitigatedAmount;
				}
				targetIDs.add(dmg.targetID);
			}
			targetIDs.delete(primaryID);
			targetList = Array.from(targetIDs);
			targetList.splice(0, 0, primaryID);
			targetList = targetList.map((targetID) => seenTargetOrder.indexOf(targetID) + 1);
		}
		return {
			type: ActionType.Skill,
			skillName: key,
			targetList,
			healTargetCount: undefined,
		} as SkillNodeInfo;
	});
	const combatStartTime = fight.endTime - fight.combatTime;
	// Look up whether we have markers presets for the current fight in the current language,
	// and set timestamps from recorded phase transitions.
	// Note that fights like M8S P1 post-adds that have variable timelines based on mechanic times
	// must rely on targetabilityupdate events, which would require issuing an additional query
	// + extra parsing logic to handle properly.
	const encounterTrackKey = findTrackKeyWithIdAndLanguage(
		fight.encounterID,
		getCurrentLanguage(),
	);
	let partyBuffMarkers: PartyBuffMarkerWindow[] = [];
	if (encounterTrackKey !== undefined) {
		// Run a second query to retrieve all buff events that target the player/debuff events
		// that target a boss. This is deliberately run only if we have marker tracks for the
		// encounter; strictly speaking we can separate them but I'm lazy about adding UI for it.
		try {
			const statusEvents = await queryPartyStatusEvents(params);
			partyBuffMarkers = aggregatePartyBuffMarkers(
				statusEvents,
				params.playerID,
				combatStartTime,
				fight.endTime,
			);
		} catch (e) {
			console.error("failed to query party status events for buff markers", e);
		}
	}
	const state: IntermediateLogImportState = {
		playerName: name,
		job,
		level,
		statsInLog,
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
		combatStartTime,
		encounterTrackKey,
		phaseTransitionTimestamps:
			fight.phaseTransitions?.map(
				({ startTime }: { startTime: number }) => startTime - fight.startTime,
			) ?? [],
		partyBuffMarkers,
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
