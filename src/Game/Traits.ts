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

export class TraitsList extends Map<TraitName, Trait> {
    constructor() {
        super();

        let traitsList = this;
        traitsList.set(TraitName.EnhancedEnochianII, new Trait(TraitName.EnhancedEnochianII, 78));
        traitsList.set(TraitName.EnhancedPolyglot, new Trait(TraitName.EnhancedPolyglot, 80));
        traitsList.set(TraitName.EnhancedFoul, new Trait(TraitName.EnhancedFoul, 80));
        traitsList.set(TraitName.AspectMasteryIV, new Trait(TraitName.AspectMasteryIV, 82));
        traitsList.set(TraitName.EnhancedManafont, new Trait(TraitName.EnhancedManafont, 84));
        traitsList.set(TraitName.EnhancedEnochianIII, new Trait(TraitName.EnhancedEnochianIII, 86));
        traitsList.set(TraitName.AspectMasteryV, new Trait(TraitName.AspectMasteryV, 90));
        traitsList.set(TraitName.ThunderMasteryIII, new Trait(TraitName.ThunderMasteryIII, 92));
        traitsList.set(TraitName.EnhancedSwiftcast, new Trait(TraitName.EnhancedSwiftcast, 94));
        traitsList.set(TraitName.EnhancedLeyLines, new Trait(TraitName.EnhancedLeyLines, 96));
        traitsList.set(TraitName.EnhancedEnochianIV, new Trait(TraitName.EnhancedEnochianIV, 96));
        traitsList.set(TraitName.EnhancedPolyglotII, new Trait(TraitName.EnhancedPolyglotII, 98));
        traitsList.set(TraitName.EnhancedAddle, new Trait(TraitName.EnhancedAddle, 98));
        traitsList.set(TraitName.EnhancedAstralFire, new Trait(TraitName.EnhancedAstralFire, 100));
    }

    get(key: TraitName): Trait {
		let skill = super.get(key);
		if (skill) return skill;
		else {
			console.assert(false);
			return new Trait(TraitName.Never, 1);
		};
	}
}
