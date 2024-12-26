export enum GNBResourceType {
	PowderGauge = "Powder Gauge", // [0, 3]
	NoMercy = "No Mercy", // [0, 1]
	Aurora = "Aurora", // [0, 1]
	BowShockDoT = "Bow Shock DoT", // [0, 1]
	Camouflage = "Camouflage", // [0, 1]
	HeartOfCorundum = "Heart of Corundum", // [0, 1]
	ClarityOfCorundum = "Clarity of Corundum", // [0, 1]
	CatharsisOfCorundum = "Catharsis of Corundum", // [0, 1]
	Nebula = "Nebula", // [0, 1]
	GreatNebula = "Great Nebula", // [0, 1]
	HeartOfLight = "Heart of Light", // [0, 1]
	HeartOfStone = "Heart of Stone", // [0, 1]

	ReadyToBlast = "Ready to Blast", // [0, 1]
	ReadyToBreak = "Ready to Break", // [0, 1]
	ReadyToGouge = "Ready to Gouge", // [0, 1]
	ReadyToRaze = "Ready to Raze", // [0, 1]
	ReadyToReign = "Ready to Reign", // [0, 1]
	ReadyToRip = "Ready to Rip", // [0, 1]
	ReadyToTear = "Ready to Tear", // [0, 1]

	RoyalGuard = "Royal Guard", // [0, 1]
	SonicBreakDoT = "Sonic Break DoT", // [0, 1]
	Superbolide = "Superbolide", // [0, 1]
	BrutalShell = "Brutal Shell", // [0, 1]

	// secret combo trackers
	// 0 - combo neutral, 1 - brutal shell ready, 2 - solid barrel ready
	GNBComboTracker = "GNB Combo", // [0, 2]
	// 0 - combo neutral, 1 - demon slaughter ready
	GNBAOEComboTracker = "GNB AOE Combo", // [0, 1]
	// 0 - combo neutral, 1 - savage claw ready, 2 - wicked talon ready
	GNBGnashingComboTracker = "GNB Gnashing Combo", // [0, 2]
	// 0 - combo neutral, 1 - noble blood ready, 3 - lionheart ready
	GNBReignComboTracker = "GNB Reign Combo", // [0, 2]
}

export enum GNBCooldownType {
	cd_NoMercy = "cd_NoMercy", // 60 sec
	cd_Bloodfest = "cd_Bloodfest", // 120 sec
	cd_Camouflage = "cd_Camouflage", // 90 sec
	cd_RoyalGuard = "cd_RoyalGuard", // 2 sec
	cd_ReleaseRoyalGuard = "cd_ReleaseRoyalGuard", // 1 sec
	cd_DangerZone = "cd_DangerZone", // 30 sec
	cd_BlastingZone = "cd_BlastingZone", // 30 sec
	cd_Nebula = "cd_Nebula", // 120 sec
	cd_GreatNebula = "cd_GreatNebula", // 120 sec
	cd_Aurora = "cd_Aurora", // 60 sec
	cd_Superbolide = "cd_Superbolide", // 360 sec
	cd_Trajectory = "cd_Trajectory", // 30 sec
	cd_GnashingFang = "cd_GnashingFang", // 30 sec
	cd_BowShock = "cd_BowShock", // 60 sec
	cd_HeartOfLight = "cd_HeartOfLight", // 90 sec
	cd_HeartOfStone = "cd_HeartOfStone", // 25 sec
	cd_HeartOfCorundum = "cd_HeartOfCorundum", // 25 sec
	cd_DoubleDown = "cd_DoubleDown", // 60 sec
	cd_Continuation = "cd_Continuation", // 1 sec
	cd_Hypervelocity = "cd_Hypervelocity",
	cd_FatedBrand = "cd_FatedBrand",
	cd_JugularRip = "cd_JugularRip",
	cd_AbdomenTear = "cd_AbdomenTear",
	cd_EyeGouge = "cd_EyeGouge",
}
