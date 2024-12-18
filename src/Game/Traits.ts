import { LevelSync, TraitList, TraitName } from "./Common";

export class Trait {
	readonly name: TraitName;
	readonly level: number;

	constructor(name: TraitName, level: number) {
		this.name = name;
		this.level = level;
	}
}

export class Traits {
	static map: Map<TraitName, Trait> = this.buildMap();
	static buildMap() {
		return new Map<TraitName, Trait>(
			TraitList.map(([name, level]) => [name, new Trait(name, level)]),
		);
	}

	static hasUnlocked(traitName: TraitName, level: LevelSync) {
		const trait = this.map.get(traitName) || new Trait(TraitName.Never, 1);
		return level >= trait.level;
	}
}
