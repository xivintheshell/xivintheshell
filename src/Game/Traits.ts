import { LevelSync, TraitList } from "./Common";

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

export class Traits {
	static hasUnlocked(traitName: TraitName, level: LevelSync) {
		const trait = TraitList.get(traitName) || new Trait(TraitName.Never, 1);
		return level >= trait.level;
	}
}
