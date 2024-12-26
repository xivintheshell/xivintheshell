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
