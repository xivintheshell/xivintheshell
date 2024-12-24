export enum WARSkillName {
	HeavySwing = "Heavy Swing",
	Maim = "Maim",
	StormsPath = "Storms Path",
	StormsEye = "Storms Eye",
	FellCleave = "Fell Cleave",
	Upheaval = "Upheaval",
	Onslaught = "Onslaught",

	Tomahawk = "Tomahawk",

	Overpower = "Overpower",
	MythrilTempest = "Mythril Tempest",
	Decimate = "Decimate",
	Orogeny = "Orogeny",

	InnerRelease = "Inner Release",
	PrimalWrath = "Primal Wrath",
	PrimalRend = "Primal Rend",
	PrimalRuination = "Primal Ruination",

	Infuriate = "Infuriate",
	InnerChaos = "Inner Chaos",
	ChaoticCyclone = "Chaotic Cyclone",

	ThrillOfBattle = "Thrill of Battle",
	Equilibrium = "Equilibrium",
	ShakeItOff = "Shake It Off",
	RawIntuition = "Raw Intuition", // Lv56-81
	NascentFlash = "Nascent Flash",
	BloodWhetting = "Bloodwhetting", // Lv82-
	Vengeance = "Vengeance", // Lv38-91
	Damnation = "Damnation", // Lv92-
	Holmgang = "Holmgang",

	Defiance = "Defiance",
	ReleaseDefiance = "Release Defiance",
}

export enum WARGaugeTypes {
	BeastGauge = "Beast Gauge",
}

export enum WARBuffTypes {
	// Status Effects
	SurgingTempest = "Surging Tempest",
	InnerRelease = "Inner Release", // Free Fell Cleaves
	InnerStrength = "Inner Strength", // KB/Stun immune
	BurgeoningFury = "Burgeoning Fury", // Fell Cleave usage counter
	Wrathful = "Wrathful", // Primal Wrath Ready
	PrimalRendReady = "Primal Rend Ready",
	PrimalRuinationReady = "Primal Ruination Ready",

	NascentChaos = "Nascent Chaos",

	// TODO: Nascent Glint when multiple players in a timeline is fully supported.
	NascentFlash = "Nascent Flash", // health-on-hit (self)
	ThrillOfBattle = "Thrill of Battle",
	Equilibrium = "Equilibrium", // HoT
	ShakeItOff = "Shake It Off", // Barrier
	ShakeItOffOverTime = "Shake It Off Over Time", // HoT
	RawIntuition = "Raw Intuition",
	StemTheTide = "Stem the Tide", // Barrier
	StemTheFlow = "Stem the Flow", // 4s extra DR
	Bloodwhetting = "Bloodwhetting",

	Vengeance = "Vengeance", // Phys Ref. / 30% DR
	Damnation = "Damnation", // Phys Ref. / 40% DR
	PrimevalImpulse = "Primeval Impulse", // HoT

	Holmgang = "Holmgang", // Invuln

	Defiance = "Defiance", // Tank Stance
}

export enum WARTrackingType {
	// Combos & other tracking
	StormCombo = "Storm Combo",
	TempestCombo = "Tempest Combo",
}

export const WARResourceType = {
	...WARBuffTypes,
	...WARGaugeTypes,
	...WARTrackingType,
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type WARResourceType = WARBuffTypes | WARGaugeTypes | WARTrackingType;

export enum WARCooldownType {
	cd_InnerRelease = "cd_InnerRelease",
	cd_PrimalWrath = "cd_PrimalWrath",
	cd_Upheaval = "cd_Upheaval",
	cd_Onslaught = "cd_Onslaught",
	cd_Infuriate = "cd_Infuriate",

	cd_Vengeance = "cd_Vengeance",
	cd_ThrillOfBattle = "cd_ThrillOfBattle",
	cd_RawIntuition = "cd_RawIntuition",
	cd_Equilibrium = "cd_Equilibrium",
	cd_ShakeItOff = "cd_ShakeItOff",
	cd_Holmgang = "cd_Holmgang",

	cd_Defiance = "cd_Defiance",
	cd_ReleaseDefiance = "cd_ReleaseDefiance",
}
