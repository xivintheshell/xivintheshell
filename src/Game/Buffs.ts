import { BuffName, MarkerColor } from "./Common";

export class BuffInfo {
	readonly name: BuffName;
	readonly duration: number;
	readonly potencyFactor: number;
	readonly color: MarkerColor;

	constructor(name: BuffName, duration: number, potencyFactor: number, color: MarkerColor) {
		this.name = name;
		this.duration = duration;
		this.potencyFactor = potencyFactor;
		this.color = color;
	}
}

const buffInfos = [
	new BuffInfo(BuffName.TechnicalStep, 20, 1.05, MarkerColor.Red),
	new BuffInfo(BuffName.Mug, 20, 1.05, MarkerColor.Yellow)
];

const buffInfosMap: Map<BuffName, BuffInfo> = new Map();
buffInfos.forEach(info=>{
	buffInfosMap.set(info.name, info);
});

export class Buff {
	readonly name: BuffName;
	info: BuffInfo;

	constructor(name: BuffName) {
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
