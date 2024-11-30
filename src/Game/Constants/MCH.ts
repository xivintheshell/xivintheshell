export enum MCHSkillName {
    HeatedSplitShot = "Heated Split Shot",
    HeatedSlugShot = "Heated Slug Shot",
    HeatedCleanShot = "Heated Clean Shot",
    Drill = "Drill",
    HotShot = "Hot Shot",
    AirAnchor = "Air Anchor",
    Chainsaw = "Chain Saw",
    Excavator = "Excavator",
    GaussRound = "Gauss Round",
    DoubleCheck = "Double Check",
    Ricochet = "Ricochet",
    Checkmate = "Checkmate",
    BlazingShot = "Blazing Shot",
    Wildfire = "Wildfire",
    Detonator = "Detonator",
    Hypercharge = "Hypercharge",
    RookAutoturret = "Rook Autoturret",
    RookOverdrive = "Rook Overdrive",
    AutomatonQueen = "Automaton Queen",
    QueenOverdrive = "Queen Overdrive",
    BarrelStabilizer = "Barrel Stabilizer",
    Reassemble = "Reassemble",
    FullMetalField = "Full Metal Field",

    SpreadShot = "Spread Shot",
    Scattergun = "Scattergun",
    AutoCrossbow = "Auto Crossbow",
    Bioblaster = "Bioblaster",
    Flamethrower = "Flamethrower",

    Dismantle = "Dismantle",
    Tactician = "Tactician",

    VolleyFire = "Volley Fire",
    ArmPunch = "Arm Punch",
    RookOverload = "Rook Overload",
    PileBunker = "Pile Bunker",
    CrownedCollider = "Crowned Collider",
}

export enum MCHResourceType {
    // Gauge resources
    HeatGauge = "Heat",
    BatteryGauge = "Battery",

    // Status Effects
    Reassembled = "Reassembled",
    Overheated = "Overheated",
    Wildfire = "Wildfire",
    WildfireSelf = "Wildfire Self",
    Flamethrower = "Flamethrower",
    Bioblaster = "Bioblaster",
    Tactician = "Tactician",
    Hypercharged = "Hypercharged",
    ExcavatorReady = "Excavator Ready",
    FullMetalMachinist = "Full Metal Machinist",

    // Combos & other tracking
    HeatCombo = "Heat Combo",
    Queen = "Queen",
    QueenPunches = "QueenPunches",
    QueenFinishers = "QueenFinishers",
    BatteryBonus = "BatteryBonus",
    WildfireHits = "WildfireHits"
}

export enum MCHCooldownType {
    cd_Reassemble = "cd_Reassemble",
    cd_Drill = "cd_Drill",
    cd_Checkmate = "cd_Checkmate",
    cd_DoubleCheck = "cd_DoubleCheck",
    cd_AirAnchor = "cd_AirAnchor",
    cd_Chainsaw = "cd_Chainsaw",
    cd_BarrelStabilizer = "cd_BarrelStabilizer",
    cd_Wildfire = "cd_Wildfire",
    cd_Queen = "cd_Queen",
    cd_Overdrive = "cd_Overdrive",
    cd_Dismantle = "cd_Dismantle",
    cd_Tactician = "cd_Tactician",
    cd_Hypercharge = "cd_Hypercharge",
    cd_Detonator = "cd_Detonator",
}

export enum MCHTraitName {
	ChargedActionMastery = 3000,
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
}

export const MCHTraitList: Array<[MCHTraitName, number]> = [
    [MCHTraitName.ChargedActionMastery, 74],
    [MCHTraitName.HotShotMastery, 76],
    [MCHTraitName.EnhancedWildfire, 88],
    [MCHTraitName.Promotion, 80],
    [MCHTraitName.SpreadShotMastery, 82],
    [MCHTraitName.EnhancedReassemble, 84],
    [MCHTraitName.MarksmansMastery, 84],
    [MCHTraitName.QueensGambit, 86],
    [MCHTraitName.EnhancedTactician, 88],
    [MCHTraitName.DoubleBarrelMastery, 92],
    [MCHTraitName.EnhancedMultiWeapon, 94],
    [MCHTraitName.MarksmansMasteryII, 94],
    [MCHTraitName.EnhancedMultiWeaponII, 96],
    [MCHTraitName.EnhancedBarrelStabilizer, 100],
]
