import {LevelSync} from "./Common";

export class Trait {
	readonly name: TraitName;
	readonly level: number;

	constructor(name: TraitName, level: number) {
		this.name = name;
		this.level = level;
	}
}

export const enum TraitName {
	EnhancedEnochianII,
	EnhancedPolyglot,
	EnhancedFoul,
	AspectMasteryIV,
	EnhancedManafont,
	EnhancedEnochianIII,
	AspectMasteryV,
	ThunderMasteryIII,
	EnhancedSwiftcast,
	EnhancedLeyLines,
	EnhancedEnochianIV,
	EnhancedPolyglotII,
	EnhancedAddle,
	EnhancedAstralFire,

	Never,
}

export class Traits {
	static list: Map<TraitName, Trait> = this.buildList();
	static buildList() {
		return new Map<TraitName, Trait>([
			[TraitName.EnhancedEnochianII, new Trait(TraitName.EnhancedEnochianII, 78)],
			[TraitName.EnhancedPolyglot, new Trait(TraitName.EnhancedPolyglot, 80)],
			[TraitName.EnhancedFoul, new Trait(TraitName.EnhancedFoul, 80)],
			[TraitName.AspectMasteryIV, new Trait(TraitName.AspectMasteryIV, 82)],
			[TraitName.EnhancedManafont, new Trait(TraitName.EnhancedManafont, 84)],
			[TraitName.EnhancedEnochianIII, new Trait(TraitName.EnhancedEnochianIII, 86)],
			[TraitName.AspectMasteryV, new Trait(TraitName.AspectMasteryV, 90)],
			[TraitName.ThunderMasteryIII, new Trait(TraitName.ThunderMasteryIII, 92)],
			[TraitName.EnhancedSwiftcast, new Trait(TraitName.EnhancedSwiftcast, 94)],
			[TraitName.EnhancedLeyLines, new Trait(TraitName.EnhancedLeyLines, 96)],
			[TraitName.EnhancedEnochianIV, new Trait(TraitName.EnhancedEnochianIV, 96)],
			[TraitName.EnhancedPolyglotII, new Trait(TraitName.EnhancedPolyglotII, 98)],
			[TraitName.EnhancedAddle, new Trait(TraitName.EnhancedAddle, 98)],
			[TraitName.EnhancedAstralFire, new Trait(TraitName.EnhancedAstralFire, 100)],
		]);
	}

	static hasUnlocked(traitName: TraitName, level: LevelSync) {
		const trait = this.list.get(traitName) || new Trait(TraitName.Never, 1);
		return level >= trait.level;
	}
}