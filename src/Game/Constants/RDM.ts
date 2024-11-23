import { TraitName } from "../Traits";

export enum RDMSkillName {
	Riposte = "Riposte",
	// Jolt = "Jolt",
	Verthunder = "Verthunder",
	CorpsACorps = "Corps-a-corps",
	Veraero = "Veraero",
	// Scatter = "Scatter",
	Verfire = "Verfire",
	Verstone = "Verstone",
	Zwerchhau = "Zwerchhau",
	Displacement = "Displacement",
	Fleche = "Fleche",
	Redoublement = "Redoublement",
	Acceleration = "Acceleration",
	Moulinet = "Moulinet",
	Vercure = "Vercure",
	ContreSixte = "Contre Sixte",
	Embolden = "Embolden",
	Manafication = "Manafication",
	Jolt2 = "Jolt II",
	Verraise = "Verraise",
	Impact = "Impact",
	Verflare = "Verflare",
	Verholy = "Verholy",
	EnchantedRiposte = "Enchanted Riposte",
	EnchantedZwerchhau = "Enchanted Zwerchhau",
	EnchantedRedoublement = "Enchanted Redoublement",
	EnchantedMoulinet = "Enchanted Moulinet",
	Verthunder2 = "Verthunder II",
	Veraero2 = "Veraero II",
	Engagement = "Engagement",
	EnchantedReprise = "Enchanted Reprise",
	Reprise = "Reprise",
	Scorch = "Scorch",
	Verthunder3 = "Verthunder III",
	Veraero3 = "Veraero III",
	MagickBarrier = "Magick Barrier",
	Resolution = "Resolution",
	EnchantedMoulinet2 = "Enchanted Moulinet Deux",
	EnchantedMoulinet3 = "Enchanted Moulinet Trois",
	Jolt3 = "Jolt III",
	ViceOfThorns = "Vice of Thorns",
	GrandImpact = "Grand Impact",
	Prefulgence = "Prefulgence",
}

export enum RDMResourceType {
	WhiteMana = "White Mana", // [0, 100]
	BlackMana = "Black Mana", // [0, 100]
	ManaStacks = "Mana Stacks", // [0, 3]

	Acceleration = "Acceleration", // [0, 1]
	Dualcast = "Dualcast", // [0, 1]
	Embolden = "Embolden", // [0, 1]
	GrandImpactReady = "Grand Impact Ready", // [0, 1]
	MagickBarrier = "Magick Barrier", // [0, 1]
	MagickedSwordplay = "Magicked Swordplay", // [0, 3]
	Manafication = "Manafication", // [0, 6]
	PrefulgenceReady = "Prefulgence Ready", // [0, 1]
	ThornedFlourish = "Thorned Flourish", // [0, 1]
	VerfireReady = "Verfire Ready", // [0, 1]
	VerstoneReady = "Verstone Ready", // [0, 1]

	// secret combo trackers
	// 0 = no melee combo, 1 = after 1st, 2 = after 2nd
	RDMMeleeCounter = "RDM Melee Combo", // [0, 2]
	// 0 = finishers not started, 1 = after verflare/holy, 2 = after scorch
	RDMFinisherCounter = "RDM Finisher Combo", // [0, 2]
	// 0 = no moulinet combo, 1 = after 1st, 2 = after 2nd
	RDMAoECounter = "RDM AoE Combo", // [0, 2]
}

export enum RDMCooldownType {
	cd_CorpsACorps = "cd_CorpsACorps",
	cd_Displacement = "cd_Displacement",
	cd_Fleche = "cd_Fleche",
	cd_Acceleration = "cd_Acceleration",
	cd_ContreSixte = "cd_ContreSixte",
	cd_Embolden = "cd_Embolden",
	cd_Manafication = "cd_Manafication",
	cd_MagickBarrier = "cd_MagickBarrier",
	cd_ViceOfThorns = "cd_ViceOfThorns",
	cd_Prefulgence = "cd_Prefulgence",
}

export const RDMTraitList: Array<[TraitName, number]> = [
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
];
