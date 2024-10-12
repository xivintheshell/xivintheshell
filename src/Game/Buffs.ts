import { MarkerColor } from "../Components/ColorTheme";
import { BuffType } from "./Common";

export class BuffInfo {
	readonly name: BuffType;
	readonly duration: number;
	readonly color: MarkerColor;
	readonly damageFactor: number;
	readonly critBonus: number;
	readonly dhBonus: number;
	readonly job: string; // TODO replace with ShellJob

	constructor(name: BuffType, color: MarkerColor, duration: number, damageFactor: number, critBonus: number, dhBonus: number, job: string) {
		this.name = name;
		this.duration = duration;
		this.color = color;
		this.damageFactor = damageFactor;
		this.critBonus = critBonus;
		this.dhBonus = dhBonus;
		this.job = job;
	}
}

export const buffInfos = [
	new BuffInfo(BuffType.ArcaneCircle, MarkerColor.Pink, 20, 1.03, 0, 0, "RPR"),
	new BuffInfo(BuffType.ArmysPaeon, MarkerColor.Yellow, 45, 1, 0, 0.03, "BRD"),
	new BuffInfo(BuffType.BattleLitany, MarkerColor.Blue, 20, 1, 0.10, 0, "DRG"),
	new BuffInfo(BuffType.BattleVoice, MarkerColor.Orange, 20, 1, 0, 0.20, "BRD"),
	new BuffInfo(BuffType.Brotherhood, MarkerColor.Orange, 20, 1.05, 0, 0., "MNK"),
	new BuffInfo(BuffType.Card_TheBalance, MarkerColor.Red, 15, 1.03, 0, 0, "AST"),
	new BuffInfo(BuffType.Card_TheSpear, MarkerColor.Blue, 15, 1.06, 0, 0, "AST"),
	new BuffInfo(BuffType.ChainStratagem, MarkerColor.Grey, 20, 1, 0.10, 0, "SCH"),
	new BuffInfo(BuffType.Devilment, MarkerColor.Green, 20, 1, 0.20, 0.20, "DNC"),
	new BuffInfo(BuffType.Divination, MarkerColor.Yellow, 20, 1.06, 0, 0., "AST"),
	new BuffInfo(BuffType.Dokumori, MarkerColor.Purple, 20, 1.05, 0, 0, "NIN"),
	new BuffInfo(BuffType.Embolden, MarkerColor.Grey, 20, 1.05, 0, 0, "RDM"),
	new BuffInfo(BuffType.MagesBallad, MarkerColor.Purple, 45, 1.01, 0, 0, "BRD"),
	new BuffInfo(BuffType.RadiantFinale1, MarkerColor.Purple, 20, 1.02, 0, 0, "BRD"),
	new BuffInfo(BuffType.RadiantFinale2, MarkerColor.Purple, 20, 1.04, 0, 0, "BRD"),
	new BuffInfo(BuffType.RadiantFinale3, MarkerColor.Purple, 20, 1.06, 0, 0, "BRD"),
	new BuffInfo(BuffType.SearingLight, MarkerColor.Blue, 20, 1.05, 0, 0, "SMN"),
	new BuffInfo(BuffType.StandardFinish, MarkerColor.Yellow, 60, 1.05, 0, 0, "DNC"),
	new BuffInfo(BuffType.StarryMuse, MarkerColor.Purple, 20.5, 1.05, 0, 0, "PCT"),
	new BuffInfo(BuffType.TechnicalFinish, MarkerColor.Blue, 20, 1.05, 0, 0, "DNC"),
	new BuffInfo(BuffType.WanderersMinuet, MarkerColor.Green, 45, 1, 0.02, 0, "BRD"),
];

const buffInfosMap: Map<BuffType, BuffInfo> = new Map();
buffInfos.forEach(info=>{
	buffInfosMap.set(info.name, info);
});

export class Buff {
	readonly name: BuffType;
	info: BuffInfo;

	constructor(name: BuffType) {
		this.name = name;
		let info = buffInfosMap.get(name);
		if (!info) {
			info = buffInfos[0];
			console.error("Buff info not found!");
		}
		this.info = info;
	}
}