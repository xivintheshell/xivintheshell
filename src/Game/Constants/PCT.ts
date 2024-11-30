export enum PCTSkillName {
    FireInRed = "Fire in Red",
    AeroInGreen = "Aero in Green",
    WaterInBlue = "Water in Blue",
    Fire2InRed = "Fire II in Red",
    Aero2InGreen = "Aero II in Green",
    Water2InBlue = "Water II in Blue",
    BlizzardInCyan = "Blizzard in Cyan",
    ThunderInMagenta = "Thunder in Magenta",
    StoneInYellow = "Stone in Yellow",
    Blizzard2InCyan = "Blizzard II in Cyan",
    Stone2InYellow = "Stone II in Yellow",
    Thunder2InMagenta = "Thunder II in Magenta",
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
}

export enum PCTResourceType {
    Portrait = "Portrait", // [0, 2] 1 = moogle, 2 = madeen
    Depictions = "Depictions", // [0, 3] used to show which creature motifs have been drawn
    CreatureCanvas = "Creature Canvas", // [0, 1]
    WeaponCanvas = "Weapon Canvas", // [0, 1]
    LandscapeCanvas = "Landscape Canvas", // [0, 1]
    PaletteGauge = "Palette Gauge", // [0, 100]
    Paint = "Paint", // [0, 5]

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

    // Hammer actions are a proper combo, not strictly tied to Hammer Time buff
    HammerCombo = "Hammer Combo Counter", // [0, 2]
}

export enum PCTCooldownType {
    cd_TemperaCoat = "cd_TemperaCoat", // [0, 120]
    cd_Smudge = "cd_Smudge", // [0, 20]
    cd_LivingMuse = "cd_LivingMuse", // [0, 40]
    cd_Portrait = "cd_Portrait", // [0, 30]
    cd_SteelMuse = "cd_SteelMuse", // [0, 60]
    cd_ScenicMuse = "cd_ScenicMuse", // [0, 120]
    cd_Subtractive = "cd_Subtractive", // [0, 1], not real
    cd_Grassa = "cd_Grassa", // [0, 1], not real
    cd_TemperaPop = "cd_TemperaPop", // [0, 1], also not real
}

export enum PCTTraitName {
    PictomancyMasteryII = 4000,
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
}

export const PCTTraitList: Array<[PCTTraitName, number]> = [
    [PCTTraitName.PictomancyMasteryII, 74],
    [PCTTraitName.EnhancedArtistry, 80],
    [PCTTraitName.EnhancedPictomancy, 82],
    [PCTTraitName.EnhancedSmudge, 84],
    [PCTTraitName.PictomancyMasteryIII, 84],
    [PCTTraitName.EnhancedPictomancyII, 86],
    [PCTTraitName.EnhancedTempera, 88],
    [PCTTraitName.EnhancedPalette, 90],
    [PCTTraitName.EnhancedPictomancyIII, 92],
    [PCTTraitName.PictomancyMasteryIV, 94],
    [PCTTraitName.EnhancedPictomancyIV, 96],
    [PCTTraitName.EnhancedPictomancyV, 100],
];
