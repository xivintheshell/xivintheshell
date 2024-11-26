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
	// BLM
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

	// PCT
	PictomancyMasteryII,
	EnhancedArtistry,
	EnhancedPictomancy,
	EnhancedSmudge,
	PictomancyMasteryIII,
	EnhancedPictomancyII,
	EnhancedTempera,
	EnhancedPalette,
	EnhancedPictomancyIII,
	PictomancyMasteryIV,
	EnhancedPictomancyIV,
	EnhancedPictomancyV,

	// RDM
	EnhancedDisplacement,
	RedMagicMastery,
	EnhancedManafication,
	RedMagicMasteryII,
	RedMagicMasteryIII,
	EnhancedAcceleration,
	EnhancedManaficationII,
	EnhancedEmbolden,
	EnchantedBladeMastery,
	EnhancedAccelerationII,
	EnhancedManaficationIII,

	Hellsgate,
	TemperedSoul,
	ShroudGauge,
	EnhancedArcaneCrest,
	MeleeMasteryII,
	VoidSoul,
	EnhancedArcaneCircle,
	EnhancedEnshroud,
	EnhancedSecondWind,
	MeleeMasteryIII,
	EnhancedGluttony,
	EnhancedPlentifulHarvest,
	// DNC
	Esprit,
	EnhancedEnAvantII,
	EnhancedTechnicalFinish,
	EnhancedEsprit,
	EnhancedFlourish,
	EnhancedShieldSamba,
	EnhancedDevilment,
	EnhancedStandardFinish,
	DynamicDancer,
	EnhancedFlourishII,
	EnhancedTechnicalFinishII,

	EnhancedIaijutsu,
	EnhancedMeikyoShisui,
	EnhancedFugetsuAndFuka,
	ThirdEyeMastery,
	WayOfTheSamuraiII,
	FugaMastery,
	EnhancedIkishoten,
	HakazeMastery,
	EnhancedHissatsu,
	WayOfTheSamuraiIII,
	EnhancedIkishotenII,
	EnhancedMeikyoShisuiII,
	EnhancedFeint,

	// MCH
	ChargedActionMastery,
	HotShotMastery,
	EnhancedWildfire,
	Promotion,
	SpreadShotMastery,
	EnhancedReassemble,
	MarksmansMastery,
	QueensGambit,
	EnhancedTactician,
	DoubleBarrelMastery,
	EnhancedMultiWeapon,
	MarksmansMasteryII,
	EnhancedMultiWeaponII,
	EnhancedBarrelStabilizer,

	Never,
}

// TODO move this out to Common.ts/job-specific files
export class Traits {
	static list: Map<TraitName, Trait> = this.buildList();
	static buildList() {
		return new Map<TraitName, Trait>([
			[TraitName.EnhancedEnochianII, 78],
			[TraitName.EnhancedPolyglot, 80],
			[TraitName.EnhancedFoul, 80],
			[TraitName.AspectMasteryIV, 82],
			[TraitName.EnhancedManafont, 84],
			[TraitName.EnhancedEnochianIII, 86],
			[TraitName.AspectMasteryV, 90],
			[TraitName.ThunderMasteryIII, 92],
			[TraitName.EnhancedSwiftcast, 94],
			[TraitName.EnhancedLeyLines, 96],
			[TraitName.EnhancedEnochianIV, 96],
			[TraitName.EnhancedPolyglotII, 98],
			[TraitName.EnhancedAddle, 98],
			[TraitName.EnhancedAstralFire, 100],

			[TraitName.PictomancyMasteryII, 74],
			[TraitName.EnhancedArtistry, 80],
			[TraitName.EnhancedPictomancy, 82],
			[TraitName.EnhancedSmudge, 84],
			[TraitName.PictomancyMasteryIII, 84],
			[TraitName.EnhancedPictomancyII, 86],
			[TraitName.EnhancedTempera, 88],
			[TraitName.EnhancedTempera, 90],
			[TraitName.EnhancedPictomancyIII, 92],
			[TraitName.PictomancyMasteryIV, 94],
			[TraitName.EnhancedPictomancyIV, 96],
			[TraitName.EnhancedPictomancyV, 100],

			[TraitName.EnhancedDisplacement, 72],
			[TraitName.RedMagicMastery, 74],
			[TraitName.EnhancedManafication, 78],
			[TraitName.RedMagicMasteryII, 82],
			[TraitName.RedMagicMasteryIII, 84],
			[TraitName.EnhancedAcceleration, 88],
			[TraitName.EnhancedManaficationII, 90],
			[TraitName.EnhancedEmbolden, 92],
			[TraitName.EnchantedBladeMastery, 94],
			[TraitName.EnhancedAccelerationII, 96],
			[TraitName.EnhancedManaficationIII, 100],
			
			[TraitName.Hellsgate, 74],
			[TraitName.TemperedSoul, 78],
			[TraitName.ShroudGauge, 80],
			[TraitName.EnhancedArcaneCrest, 84],
			[TraitName.MeleeMasteryII, 84],
			[TraitName.VoidSoul, 86],
			[TraitName.EnhancedArcaneCircle, 88],
			[TraitName.EnhancedEnshroud, 92],
			[TraitName.EnhancedSecondWind, 94],
			[TraitName.MeleeMasteryIII, 94],
			[TraitName.EnhancedGluttony, 96],
			[TraitName.EnhancedPlentifulHarvest, 100],


			[TraitName.Esprit, 76],
			[TraitName.EnhancedEnAvantII, 78],
			[TraitName.EnhancedTechnicalFinish, 82],
			[TraitName.EnhancedEsprit, 84],
			[TraitName.EnhancedFlourish, 86],
			[TraitName.EnhancedShieldSamba, 88],
			[TraitName.EnhancedDevilment, 90],
			[TraitName.EnhancedStandardFinish, 92],
			[TraitName.DynamicDancer, 94],
			[TraitName.EnhancedFlourishII, 96],
			[TraitName.EnhancedTechnicalFinishII, 100],

			[TraitName.EnhancedIaijutsu, 74],
			[TraitName.EnhancedMeikyoShisui, 76],
			[TraitName.EnhancedFugetsuAndFuka, 78],
			[TraitName.ThirdEyeMastery, 82],
			[TraitName.WayOfTheSamuraiII, 84],
			[TraitName.FugaMastery, 86],
			[TraitName.EnhancedIkishoten, 90],
			[TraitName.HakazeMastery, 92],
			[TraitName.EnhancedHissatsu, 94],
			[TraitName.WayOfTheSamuraiIII, 94],
			[TraitName.EnhancedIkishotenII, 96],
			[TraitName.EnhancedMeikyoShisuiII, 100],
			[TraitName.EnhancedFeint, 98],
			
			[TraitName.ChargedActionMastery, 74],
			[TraitName.HotShotMastery, 76],
			[TraitName.EnhancedWildfire, 88],
			[TraitName.Promotion, 80],
			[TraitName.SpreadShotMastery, 82],
			[TraitName.EnhancedReassemble, 84],
			[TraitName.MarksmansMastery, 84],
			[TraitName.QueensGambit, 86],
			[TraitName.EnhancedTactician, 88],
			[TraitName.DoubleBarrelMastery, 92],
			[TraitName.EnhancedMultiWeapon, 94],
			[TraitName.MarksmansMasteryII, 94],
			[TraitName.EnhancedMultiWeaponII, 96],
			[TraitName.EnhancedBarrelStabilizer, 100],

		].map(([name, level]) => [name, new Trait(name, level)]));
	}

	static hasUnlocked(traitName: TraitName, level: LevelSync) {
		const trait = this.list.get(traitName) || new Trait(TraitName.Never, 1);
		return level >= trait.level;
	}
}
