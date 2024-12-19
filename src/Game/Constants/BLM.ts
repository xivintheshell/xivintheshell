export enum BLMSkillName {
	Blizzard = "Blizzard",
	Fire = "Fire",
	Blizzard2 = "Blizzard 2",
	Fire2 = "Fire 2",
	Transpose = "Transpose",
	Thunder3 = "Thunder 3",
	Thunder4 = "Thunder 4",
	Manaward = "Manaward",
	Manafont = "Manafont",
	LeyLines = "Ley Lines",
	Fire3 = "Fire 3",
	Blizzard3 = "Blizzard 3",
	Freeze = "Freeze",
	Flare = "Flare",
	Blizzard4 = "Blizzard 4",
	Fire4 = "Fire 4",
	BetweenTheLines = "Between the Lines",
	AetherialManipulation = "Aetherial Manipulation",
	// Thunder4 = "Thunder 4",
	Triplecast = "Triplecast",
	Foul = "Foul",
	Despair = "Despair",
	UmbralSoul = "Umbral Soul",
	Xenoglossy = "Xenoglossy",
	HighFire2 = "High Fire 2",
	HighBlizzard2 = "High Blizzard 2",
	Amplifier = "Amplifier",
	Paradox = "Paradox",
	HighThunder = "High Thunder",
	HighThunder2 = "High Thunder 2",
	FlareStar = "Flare Star",
	Retrace = "Retrace",
}

export enum BLMResourceType {
	Polyglot = "Polyglot", // [0, 3]
	AstralFire = "AstralFire", // [0, 3]
	UmbralIce = "UmbralIce", // [0, 3]
	UmbralHeart = "UmbralHeart", // [0, 3]
	Enochian = "Enochian", // [0, 1]
	Paradox = "Paradox", // [0, 1]
	AstralSoul = "Astral Soul", // [0, 6]

	// buffs & states
	LeyLines = "Ley Lines", // [0, 1]
	Triplecast = "Triplecast", // [0, 3]
	Firestarter = "Firestarter", // [0, 1]
	Thunderhead = "Thunderhead", // [0, 1]
	ThunderIII = "Thunder III",
	ThunderIV = "Thunder IV",
	HighThunder = "High Thunder",
	HighThunderII = "High Thunder II",
	Manaward = "Manaward", // [0, 1]
}

export enum BLMCooldownType {
	cd_Transpose = "cd_Transpose", // [0, 1x]
	cd_LeyLines = "cd_LeyLines", // [0, 1x]
	cd_Manaward = "cd_Manaward", // [0, 1x]
	cd_BetweenTheLines = "cd_BetweenTheLines", // [0, 1x]
	cd_AetherialManipulation = "cd_AetherialManipulation", // [0, 1x]
	cd_Triplecast = "cd_Triplecast", // [0, 2x]
	cd_Manafont = "cd_Manafont", // [0, 1x]
	cd_Amplifier = "cd_Amplifier", // [0, 1x]
	cd_Retrace = "cd_Retrace", // [0, 1x]
}

export enum BLMTraitName {
	EnhancedEnochianII = 1000,
	EnhancedPolyglot,
	EnhancedFoul,
	AspectMasteryIV,
	EnhancedManafont,
	EnhancedEnochianIII,
	AspectMasteryV,
	ThunderMasteryIII,
	EnhancedLeyLines,
	EnhancedEnochianIV,
	EnhancedPolyglotII,
	EnhancedAstralFire,
}

export const BLMTraitList: Array<[BLMTraitName, number]> = [
	[BLMTraitName.EnhancedEnochianII, 78],
	[BLMTraitName.EnhancedPolyglot, 80],
	[BLMTraitName.EnhancedFoul, 80],
	[BLMTraitName.AspectMasteryIV, 82],
	[BLMTraitName.EnhancedManafont, 84],
	[BLMTraitName.EnhancedEnochianIII, 86],
	[BLMTraitName.AspectMasteryV, 90],
	[BLMTraitName.ThunderMasteryIII, 92],
	[BLMTraitName.EnhancedLeyLines, 96],
	[BLMTraitName.EnhancedEnochianIV, 96],
	[BLMTraitName.EnhancedPolyglotII, 98],
	[BLMTraitName.EnhancedAstralFire, 100],
];
