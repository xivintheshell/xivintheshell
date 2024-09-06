import { MarkerColor } from "../Components/ColorTheme";
import { BuffType } from "./Common";

export class BuffInfo {
	readonly name: BuffType;
	readonly duration: number;
	readonly color: MarkerColor;
	readonly damageFactor: number;
	readonly critBonus: number;
	readonly dhBonus: number;

	constructor(name: BuffType, color: MarkerColor, duration: number, damageFactor: number, critBonus: number, dhBonus: number) {
		this.name = name;
		this.duration = duration;
		this.color = color;
		this.damageFactor = damageFactor;
		this.critBonus = critBonus;
		this.dhBonus = dhBonus;
	}
}

export const buffInfos = [
	new BuffInfo(BuffType.ArcaneCircle, MarkerColor.Pink, 20, 1.03, 0, 0),
	new BuffInfo(BuffType.ArmysPaeon, MarkerColor.Yellow, 45, 1, 0, 0.03),
	new BuffInfo(BuffType.BattleLitany, MarkerColor.Blue, 20, 1, 0.10, 0),
	new BuffInfo(BuffType.BattleVoice, MarkerColor.Orange, 20, 1, 0, 0.20),
	new BuffInfo(BuffType.Brotherhood, MarkerColor.Orange, 20, 1.05, 0, 0.),
	new BuffInfo(BuffType.Card_TheBalance, MarkerColor.Red, 15, 1.03, 0, 0),
	new BuffInfo(BuffType.Card_TheSpear, MarkerColor.Blue, 15, 1.06, 0, 0),
	new BuffInfo(BuffType.ChainStratagem, MarkerColor.Grey, 20, 1, 0.10, 0),
	new BuffInfo(BuffType.Devilment, MarkerColor.Green, 20, 1, 0.20, 0.20),
	new BuffInfo(BuffType.Divination, MarkerColor.Yellow, 20, 1.06, 0, 0.),
	new BuffInfo(BuffType.Dokumori, MarkerColor.Purple, 20, 1.05, 0, 0),
	new BuffInfo(BuffType.Embolden, MarkerColor.Grey, 20, 1.05, 0, 0),
	new BuffInfo(BuffType.MagesBallad, MarkerColor.Purple, 45, 1.01, 0, 0),
	new BuffInfo(BuffType.RadiantFinale1, MarkerColor.Purple, 20, 1.02, 0, 0),
	new BuffInfo(BuffType.RadiantFinale2, MarkerColor.Purple, 20, 1.04, 0, 0),
	new BuffInfo(BuffType.RadiantFinale3, MarkerColor.Purple, 20, 1.06, 0, 0),
	new BuffInfo(BuffType.SearingLight, MarkerColor.Blue, 20, 1.05, 0, 0),
	new BuffInfo(BuffType.StandardFinish, MarkerColor.Yellow, 60, 1.05, 0, 0),
	new BuffInfo(BuffType.StarryMuse, MarkerColor.Purple, 20.5, 1.05, 0, 0),
	new BuffInfo(BuffType.TechnicalFinish, MarkerColor.Blue, 20, 1.05, 0, 0),
	new BuffInfo(BuffType.WanderersMinuet, MarkerColor.Green, 45, 1, 0.02, 0),
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