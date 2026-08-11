import { controller } from "../Controller/Controller";
import { MarkerColor } from "../Components/ColorTheme";
import { BuffType } from "./Common";
import { ShellJob, JOBS } from "./Data/Jobs";

export class BuffInfo {
	readonly name: BuffType;
	readonly duration: number;
	readonly color: MarkerColor;
	readonly damageFactor: number;
	readonly critBonus: number;
	readonly dhBonus: number;
	readonly job: ShellJob;
	readonly statusId: number;

	constructor(
		name: BuffType,
		color: MarkerColor,
		statusId: number,
		duration: number,
		damageFactor: number,
		critBonus: number,
		dhBonus: number,
		job: ShellJob,
	) {
		this.name = name;
		this.duration = duration;
		this.color = color;
		this.damageFactor = damageFactor;
		this.critBonus = critBonus;
		this.dhBonus = dhBonus;
		this.job = job;
		this.statusId = statusId;
	}
}

const RADIANT_FINALE_STATUS_ID = 2964;
const CHAIN_STRAT_STATUS_ID = 1221;
const DOKUMORI_STATUS_ID = 3849;

export const buffInfos = [
	new BuffInfo(BuffType.ArcaneCircle, MarkerColor.Pink, 2599, 20, 1.03, 0, 0, "RPR"),
	new BuffInfo(BuffType.ArmysPaeon, MarkerColor.Yellow, 2218, 45, 1, 0, 0.03, "BRD"),
	new BuffInfo(BuffType.BattleLitany, MarkerColor.Blue, 786, 20, 1, 0.1, 0, "DRG"),
	new BuffInfo(BuffType.BattleVoice, MarkerColor.Orange, 141, 20, 1, 0, 0.2, "BRD"),
	new BuffInfo(BuffType.Brotherhood, MarkerColor.Orange, 1185, 20, 1.05, 0, 0, "MNK"),
	// Damage increase for AST cards are placeholder values; they're updated dynamically based on
	// the active job.
	new BuffInfo(BuffType.Card_TheBalance, MarkerColor.Red, 3887, 15, 1, 0, 0, "AST"),
	new BuffInfo(BuffType.Card_TheSpear, MarkerColor.Blue, 3889, 15, 1, 0, 0, "AST"),
	new BuffInfo(
		BuffType.ChainStratagem,
		MarkerColor.Grey,
		CHAIN_STRAT_STATUS_ID,
		20,
		1,
		0.1,
		0,
		"SCH",
	),
	new BuffInfo(BuffType.Devilment, MarkerColor.Green, 1825, 20, 1, 0.2, 0.2, "DNC"),
	new BuffInfo(BuffType.Divination, MarkerColor.Yellow, 1878, 20, 1.06, 0, 0, "AST"),
	// Per the Balance's NIN advanced guide, Dokumori actually lasts 21s.
	new BuffInfo(BuffType.Dokumori, MarkerColor.Purple, DOKUMORI_STATUS_ID, 21, 1.05, 0, 0, "NIN"),
	new BuffInfo(BuffType.Embolden, MarkerColor.Grey, 1297, 20, 1.05, 0, 0, "RDM"),
	new BuffInfo(BuffType.MagesBallad, MarkerColor.Purple, 2217, 45, 1.01, 0, 0, "BRD"),
	new BuffInfo(
		BuffType.RadiantFinale1,
		MarkerColor.Purple,
		RADIANT_FINALE_STATUS_ID,
		20,
		1.02,
		0,
		0,
		"BRD",
	),
	new BuffInfo(
		BuffType.RadiantFinale2,
		MarkerColor.Purple,
		RADIANT_FINALE_STATUS_ID,
		20,
		1.04,
		0,
		0,
		"BRD",
	),
	new BuffInfo(
		BuffType.RadiantFinale3,
		MarkerColor.Purple,
		RADIANT_FINALE_STATUS_ID,
		20,
		1.06,
		0,
		0,
		"BRD",
	),
	new BuffInfo(BuffType.SearingLight, MarkerColor.Blue, 2703, 20, 1.05, 0, 0, "SMN"),
	new BuffInfo(BuffType.StandardFinish, MarkerColor.Yellow, 2105, 60, 1.05, 0, 0, "DNC"),
	new BuffInfo(BuffType.StarryMuse, MarkerColor.Purple, 3685, 20.5, 1.05, 0, 0, "PCT"),
	new BuffInfo(BuffType.TechnicalFinish, MarkerColor.Blue, 1822, 20, 1.05, 0, 0, "DNC"),
	new BuffInfo(BuffType.WanderersMinuet, MarkerColor.Green, 2216, 45, 1, 0.02, 0, "BRD"),
	// Unique phantom stuff (hacked in as BLU since we'll never be BLU in OC)
	new BuffInfo(BuffType.OffensiveAria, MarkerColor.Orange, 4247, 999, 1.04, 0, 0, "BLU"),
	new BuffInfo(BuffType.HerosRime, MarkerColor.Red, 4249, 20, 1.1, 0, 0, "BLU"),
	new BuffInfo(BuffType.BattleHigh, MarkerColor.Green, 4229, 20, 1, 0.5, 0.5, "BLU"),
];

const buffInfosMap: Map<BuffType, BuffInfo> = new Map();
buffInfos.forEach((info) => {
	buffInfosMap.set(info.name, info);
});

export const BOSS_DEBUFF_STATUS_IDS: ReadonlySet<number> = new Set([
	CHAIN_STRAT_STATUS_ID,
	DOKUMORI_STATUS_ID,
]);

export const BRD_SONG_BUFF_TYPES: ReadonlySet<BuffType> = new Set([
	BuffType.WanderersMinuet,
	BuffType.MagesBallad,
	BuffType.ArmysPaeon,
]);

const RADIANT_FINALE_BUFF_TYPES: ReadonlySet<BuffType> = new Set([
	BuffType.RadiantFinale1,
	BuffType.RadiantFinale2,
	BuffType.RadiantFinale3,
]);

// Render all mutually exclusive buffs on a single track.
export function buffTrackBinKey(buffType: BuffType): BuffType {
	if (BRD_SONG_BUFF_TYPES.has(buffType)) {
		return BuffType.WanderersMinuet;
	}
	if (RADIANT_FINALE_BUFF_TYPES.has(buffType)) {
		return BuffType.RadiantFinale1;
	}
	return buffType;
}

const buffInfoByStatusId: Map<number, BuffInfo> = new Map();
buffInfos.forEach((info) => {
	// FFLogs doesn't seem to have a way to distinguish radiant finale stacks, so we just hard-code its lookup.
	if (info.statusId === RADIANT_FINALE_STATUS_ID) {
		return;
	}
	buffInfoByStatusId.set(info.statusId, info);
});

export function getBuffInfoByStatusId(statusId: number, stacks?: number): BuffInfo | undefined {
	if (statusId === RADIANT_FINALE_STATUS_ID) {
		return stacks === 1
			? buffInfosMap.get(BuffType.RadiantFinale1)
			: stacks === 2
				? buffInfosMap.get(BuffType.RadiantFinale2)
				: buffInfosMap.get(BuffType.RadiantFinale3);
	}
	return buffInfoByStatusId.get(statusId);
}

export function getBuffColor(buff: BuffType): MarkerColor | undefined {
	return buffInfosMap.get(buff)?.color;
}

export class Buff {
	readonly name: BuffType;
	info: BuffInfo;

	constructor(name: BuffType) {
		this.name = name;
		let info = buffInfosMap.get(name);
		// Special case for AST cards, since their bonus depends on the active job.
		const isActiveJobMelee = ["TANK", "MELEE"].includes(JOBS[controller.game.job].role);
		if (name === BuffType.Card_TheBalance) {
			info = new BuffInfo(
				BuffType.Card_TheBalance,
				MarkerColor.Red,
				3887,
				15,
				isActiveJobMelee ? 1.06 : 1.03,
				0,
				0,
				"AST",
			);
		} else if (name === BuffType.Card_TheSpear) {
			info = new BuffInfo(
				BuffType.Card_TheSpear,
				MarkerColor.Blue,
				3889,
				15,
				isActiveJobMelee ? 1.03 : 1.06,
				0,
				0,
				"AST",
			);
		}
		if (!info) {
			info = buffInfos[0];
			console.error("Buff info not found!");
		}
		this.info = info;
	}
}
