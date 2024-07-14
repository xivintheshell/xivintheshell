import { BuffType, MarkerColor } from "./Common";

export class BuffInfo {
	readonly name: BuffType;
	readonly duration: number;
	readonly color: MarkerColor;
	readonly damageBonus: number;
	readonly critBonus: number;
	readonly dhBonus: number;

	constructor(name: BuffType, color: MarkerColor, duration: number, damageBonus: number, critBonus: number, dhBonus: number) {
		this.name = name;
		this.duration = duration;
		this.color = color;
		this.damageBonus = damageBonus;
		this.critBonus = critBonus;
		this.dhBonus = dhBonus;
	}
}

const buffInfos = [
	new BuffInfo(BuffType.Mug, MarkerColor.Yellow, 20, 1.05, 0, 0),
	new BuffInfo(BuffType.TechnicalStep, MarkerColor.Blue, 20, 1.05, 0, 0),
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

export var buffConstants = {
	buffInfos
}
