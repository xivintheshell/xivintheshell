export enum RPRResourceType {
	Soul = "Soul", // [0, 100]
	Shroud = "Shroud", // [0, 100]
	DeathsDesign = "Death's Design", // [0, 1]
	SoulSlice = "Soul Slice", // [0, 2]

	SoulReaver = "Soul Reaver", // [0, 2], Gibbet/Gallows
	EnhancedGibbet = "Enhanced Gibbet", // [0, 1]
	EnhancedGallows = "Enhanced Gallows", // [0, 1]
	Executioner = "Executioner", // [0, 2], Executioner's Gibbet/Gallows

	Enshrouded = "Enshrouded", // [0, 1]
	LemureShroud = "Lemure Shroud", // [0, 5]
	EnhancedVoidReaping = "Enhanced Void Reaping", // [0, 1]
	EnhancedCrossReaping = "Enhanced Cross Reaping", // [0, 1]
	VoidShroud = "Void Shroud", // [0, 5]
	Oblatio = "Oblatio", // [0, 1]

	IdealHost = "Ideal Host", // [0, 1]
	PerfectioOcculta = "Perfectio Occulta", // [0, 1]
	PerfectioParata = "Perfectio Parata", // [0, 1]

	ArcaneCircle = "Arcane Circle", // [0, 1]
	CircleOfSacrifice = "Circle of Sacrifice", // [0, 1], PH Stack sender
	BloodsownCircle = "Bloodsown Circle", // [0, 1], PH Lockout & PH Stack Receiver
	ImmortalSacrifice = "Immortal Sacrifice", // [0, 8], PH Stacks

	ArcaneCrest = "Arcane Crest", // [0, 1]
	CrestOfTimeBorrowed = "Crest of Time Borrowed", // [0, 1]
	CrestOfTimeReturned = "Crest of Time Returned", // [0, 1]

	Soulsow = "Soulsow",
	Threshold = "Threshold",
	HellsIngressUsed = "Hell's Ingress Used", // For tracking which ability turns into the return
	EnhancedHarpe = "Enhanced Harpe",

	// 0 = no combo, 1 = after slice, 2 = after waxing
	RPRCombo = "RPR Combo", // [0, 2]
	// 0 = no combo, 1 = after spinning slice
	RPRAoECombo = "RPR AoE Combo", // [0, 1]
}

export enum RPRCooldownType {
	cd_ArcaneCircle = "cd_ArcaneCircle",
	cd_Gluttony = "cd_Gluttony",
	cd_SoulSlice = "cd_SoulSlice",
	cd_Enshroud = "cd_Enshroud",

	cd_IngressEgress = "cd_IngressEgress",
	cd_ArcaneCrest = "cd_ArcaneCrest",
	cd_ArcaneCrestPop = "cd_ArcaneCrestPop", // Not real

	cd_BloodStalk = "cd_BloodStalk",
	cd_LemuresSlice = "cd_LemuresSlice",
	cd_Sacrificium = "cd_Sacrificium",
}
