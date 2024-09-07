export const Debug = {
	epsilon: 1e-6,
	disableManaTicks: false,
	consoleLogEvents: false,
	noEnochian: false,
	constantSlidecastWindow: true,
};

export const enum LevelSync {
	lvl70 = 70,
	lvl80 = 80,
	lvl90 = 90,
	lvl100 = 100,
}

export const FIXED_BASE_CASTER_TAX = 0.1;

export const enum Aspect {
	Fire = "Fire",
	Ice = "Ice",
	Lightning = "Lightning",
	Hammer = "Hammer",
	Other = "Other"
}

export const enum ProcMode {
	RNG = "RNG",
	Never = "Never",
	Always = "Always"
}

export const enum SkillName {
	Blizzard = "Blizzard",
	Fire = "Fire",
	Blizzard2 = "Blizzard 2",
	Fire2 = "Fire 2",
	Transpose = "Transpose",
	Thunder3 = "Thunder 3",
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
	FlareStar = "Flare Star",
	Retrace = "Retrace",
	Addle = "Addle",
	Swiftcast = "Swiftcast",
	LucidDreaming = "Lucid Dreaming",
	Surecast = "Surecast",
	Tincture = "Tincture",
	Sprint = "Sprint",

	// picto stuff
	FireInRed = "Fire in Red",
	AeroInGreen = "Aero in Green",
	WaterInBlue = "Water in Blue",
	Fire2InRed = "Fire II in Red",
	Aero2InGreen = "Aero II in Green",
	Water2InBlue = "Water II in Blue",
	// due to a typo, "In" is capitalized erroneously, and any changes to this would require migrating users
	BlizzardInCyan = "Blizzard In Cyan", 
	ThunderInMagenta = "Thunder In Magenta", // "In"
	StoneInYellow = "Stone in Yellow",
	Blizzard2InCyan = "Blizzard II In Cyan", // "In"
	Stone2InYellow = "Stone II in Yellow",
	Thunder2InMagenta = "Thunder II In Magenta", // "In"
	HolyInWhite = "Holy in White",
	CometInBlack = "Comet in Black",
	RainbowDrip = "Rainbow Drip",
	StarPrism = "Star Prism",

	TemperaCoat = "Tempera Coat",
	TemperaGrassa = "Tempera Grassa",
	TemperaCoatPop = "Pop Tempera Coat",
	TemperaGrassaPop = "Pop Tempera Grassa",
	Smudge = "Smudge",
	SubtractivePalette = "Subtractive Palette",

	CreatureMotif = "Creature Motif",
	PomMotif = "Pom Motif",
	WingMotif = "Wing Motif",
	ClawMotif = "Claw Motif",
	MawMotif = "Maw Motif",
	LivingMuse = "Living Muse",
	PomMuse = "Pom Muse",
	WingedMuse = "Winged Muse",
	ClawedMuse = "Clawed Muse",
	FangedMuse = "Fanged Muse",
	MogOfTheAges = "Mog of the Ages",
	RetributionOfTheMadeen = "Retribution of the Madeen",

	WeaponMotif = "Weapon Motif",
	SteelMuse = "Steel Muse",
	HammerMotif = "Hammer Motif",
	StrikingMuse = "Striking Muse",
	HammerStamp = "Hammer Stamp",
	HammerBrush = "Hammer Brush",
	PolishingHammer = "Polishing Hammer",

	LandscapeMotif = "Landscape Motif",
	ScenicMuse = "Scenic Muse",
	StarrySkyMotif = "Starry Sky Motif",
	StarryMuse = "Starry Muse",

	Never = "Never",
}

export const enum SkillReadyStatus {
	Ready = "ready",
	Blocked = "blocked by CD, animation lock or caster tax",
	NotEnoughMP = "not enough MP",
	NotInCombat = "must be in combat (after first damage application)",
	RequirementsNotMet = "requirements not met",
	BuffNoLongerAvailable = "buff no longer available"
}

export enum BuffType {
	LeyLines = "Ley Lines",
	Hyperphantasia = "Hyperphantasia",
	Tincture = "Tincture",

	ArcaneCircle = "Arcane Circle",
	ArmysPaeon = "Army's Paeon",
	BattleLitany = "Battle Litany",
	BattleVoice = "Battle Voice",
	Brotherhood = "Brotherhood",
	Card_TheBalance = "Card - The Balance",
	Card_TheSpear = "Card - The Spear",
	ChainStratagem = "Chain Stratagem",
	Devilment = "Devilment",
	Divination = "Divination",
	Dokumori = "Dokumori",
	Embolden = "Embolden",
	MagesBallad = "Mage's Ballad",
	RadiantFinale1 = "Radiant Finale (1)",
	RadiantFinale2 = "Radiant Finale (2)",
	RadiantFinale3 = "Radiant Finale (3)",
	SearingLight = "Searing Light",
	StandardFinish = "Standard Finish",
	StarryMuse = "Starry Muse",
	TechnicalFinish = "Technical Finish",
	WanderersMinuet = "Wanderer's Minuet",
}

export const enum ResourceType {
	// job resources
	Mana = "Mana", // [0, 10000]
	Polyglot = "Polyglot", // [0, 3]
	AstralFire = "AstralFire", // [0, 3]
	UmbralIce = "UmbralIce", // [0, 3]
	UmbralHeart = "UmbralHeart", // [0, 3]
	Enochian = "Enochian", // [0, 1]
	Paradox = "Paradox", // [0, 1]
	AstralSoul = "Astral Soul", // [0, 6]

	Portrait = "Portrait", // [0, 2] 1 = moogle, 2 = madeen
	Depictions = "Depictions", // [0, 3] used to show which creature motifs have been drawn
	CreatureCanvas = "Creature Canvas", // [0, 1]
	WeaponCanvas = "Weapon Canvas", // [0, 1]
	LandscapeCanvas = "Landscape Canvas", // [0, 1]
	PaletteGauge = "Palette Gauge", // [0, 100]
	Paint = "Paint", // [0, 5]

	// buffs & states
	LeyLines = "Ley Lines", // [0, 1]
	Triplecast = "Triplecast", // [0, 3]
	Firestarter = "Firestarter", // [0, 1]
	Thunderhead = "Thunderhead", // [0, 1]
	ThunderDoT = "ThunderDoT", // [0, 1] is actually used for display timing only
	Manaward = "Manaward", // [0, 1]
	Addle = "Addle", // [0, 1]
	Swiftcast = "Swiftcast", // [0, 1]
	LucidDreaming = "Lucid Dreaming", // [0, 1] also just for timing display
	Surecast = "Surecast", // [0, 1]
	Tincture = "Tincture", // [0, 1]
	Sprint = "Sprint", // [0, 1]

	Aetherhues = "Aetherhues", // [0, 2]
	MonochromeTones = "Monochrome Tones", // [0, 1]
	SubtractivePalette = "Subtractive Palette", // [0, 3]
	HammerTime = "Hammer Time", // [0, 3]
	Inspiration = "Inspiration", // [0, 1]
	SubtractiveSpectrum = "Subtractive Spectrum", // [0, 1]
	Hyperphantasia = "Hyperphantasia", // [0, 5]
	RainbowBright = "Rainbow Bright", // [0, 1]
	Starstruck = "Starstruck", // [0, 1]
	StarryMuse = "Starry Muse", // [0, 1]
	TemperaCoat = "Tempera Coat",
	TemperaGrassa = "Tempera Grassa",
	Smudge = "Smudge",

	// special
	Movement = "Movement", // [0, 1]
	NotAnimationLocked = "NotAnimationLocked", // [0, 1]
	NotCasterTaxed = "NotCasterTaxed", // [0, 1]

	InCombat = "InCombat", // [0, 1], used for abilities that can only execute in combat

	// CDs
	cd_GCD = "cd_GCD", // [0, Constant.gcd]
	cd_Transpose = "cd_Transpose", // [0, 1x]
	cd_LeyLines = "cd_LeyLines", // [0, 1x]
	cd_Manaward = "cd_Manaward", // [0, 1x]
	cd_BetweenTheLines = "cd_BetweenTheLines", // [0, 1x]
	cd_AetherialManipulation = "cd_AetherialManipulation", // [0, 1x]
	cd_Triplecast = "cd_Triplecast", // [0, 2x]
	cd_Manafont = "cd_Manafont", // [0, 1x]
	cd_Amplifier = "cd_Amplifier", // [0, 1x]
	cd_Retrace = "cd_Retrace", // [0, 1x]
	cd_Addle = "cd_Addle", // [0, 1x]
	cd_Swiftcast = "cd_Swiftcast", // [0, 1x]
	cd_LucidDreaming = "cd_LucidDreaming", // [0, 1x]
	cd_Surecast = "cd_Surecast", // [0, 1x]
	cd_Tincture = "cd_Tincture", // [0, 1x]
	cd_Sprint = "cd_Sprint", // [0, 1x]

	cd_TemperaCoat = "cd_TemperaCoat", // [0, 120]
	cd_Smudge = "cd_Smudge", // [0, 20]
	cd_LivingMuse = "cd_LivingMuse", // [0, 40]
	cd_Portrait = "cd_Portrait", // [0, 30]
	cd_SteelMuse = "cd_SteelMuse", // [0, 60]
	cd_ScenicMuse = "cd_ScenicMuse", // [0, 120]
	cd_Subtractive = "cd_Subtractive", // [0, 1], not real
	cd_Grassa = "cd_Grassa", // [0, 1], not real
	cd_TemperaPop = "cd_TemperaPop", // [0, 1], also not real

	Never = "Never",
}

export const enum WarningType {
	PolyglotOvercap = "polyglot overcap",

	CometOverwrite = "comet overwrite",
	PaletteOvercap = "palette gauge overcap",
}