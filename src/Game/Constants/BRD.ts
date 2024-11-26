export enum BRDSkillName {
    HeavyShot = "Heavy Shot",
    QuickNock = "Quick Nock",
    Bloodletter = "Bloodletter",
    Barrage = "Barrage",
    RagingStrikes = "Raging Strikes",
    RepellingShot = "Repelling Shot",
    WideVolley = "Wide Volley",
    MagesBallad = "Mage's Ballad",
    ArmysPaeon = "Army's Paeon",
    RainOfDeath = "Rain Of Death",
    BattleVoice = "Battle Voice",
    EmyprealArrow = "Empyreal Arrow",
    WanderersMinuet = "Wanderer's Minuet",
    IronJaws = "Iron Jaws",
    WardensPaean = "Warden's Paean",
    Sidewinder = "Sidewinder",
    PitchPerfect = "Pitch Perfect",
    Troubadour = "Troubadour",
    CausticBite = "Caustic Bite",
    Stormbite = "Stormbite",
    NaturesMinne = "Nature's Minne",
    RefulgentArrow = "Refulgent Arrow",
    Shadowbite ="Shadowbite",
    BurstShot = "Burst Shot",
    ApexArrow = "Apex Arow",
    Ladonsbite = "Ladonsbite",
    BlastArrow = "Blast Arrow",
    RadiantFinale = "Radiant Finale",
    HeartbreakShot = "Heartbreak Shot",
    ResonantArrow = "Resonant Arrow",
    RadiantEncore = "Radiant Encore",
}

export enum BRDResourceType {
    // Gauge
    SongTimer = "SongTimer",
    SoulVoice = "Soul Voice",
    PitchPerfect = "Pitch Perfect", // Yes it's all technically Repertoire, easier to represent this way
    Repertoire = "Repertoire", // Army's Paeon repertoire stacks

    // Other Trackers

    // Status Effects
    HawksEye = "Hawk's Eye",
    RagingStrikes = "Raging Strikes",
    Barrage = "Barrage",
    ArmysMuse = "Army's Muse",
    ArmysEthos = "Army's Ethos",
    BlastArrowReady = "Blast Arrow Ready",
    ResonantArrowReady = "Resonant Arrow Ready",
    RadiantEncoreReady = "Radiant Encore Ready",
    CausticBite = "Caustic Bite",
    Stormbite = "Stormbite",
    MagesBallad = "Mage's Ballad",
    ArmysPaeon = "Army's Paeon",
    WanderersMinuet = "Wanderer's Minuet",
    BattleVoice = "Battle Voice",
    WardensPaean = "Warden's Paean",
    Troubadour = "Troubadour",
    NaturesMinne = "Nature's Minne",
    RadiantFinale = "Radiant Finale",
}

export enum BRDCooldownType {
    cd_RagingStrikes = "cd_RagingStrikes",
    cd_Barrage = "cd_Barrage",
    cd_EmpyrealArrow = "cd_EmpyrealArrow",
    cd_HeartbreakShot = "cd_HeartbreakShot",
    cd_Sidewinder = "cd_Sidewinder",
    cd_WanderersMinuet = "cd_WanderersMinuet",
    cd_MagesBallad = "cd_MagesBallad",
    cd_ArmysPaeon = "cd_ArmysPaeon",
    cd_WardensPaean = "cd_WardensPaean",
    cd_NaturesMinne = "cd_NaturesMinne",
    cd_RepellingShot = "cd_RepellingShot",
    cd_BattleVoice = "cd_BattleVoice",
    cd_RadiantFinale = "cd_RadiantFinale",
}

export enum BRDTraitName {
	WideVolleyMastery = 9000,
	BiteMasteryII,
	HeavyShotMastery,
	EnhancedArmysPaeon,
	SoulVoice,
	QuickNockMastery,
	EnhancedBloodletter,
	EnhancedApexArrow,
	EnhancedTroubadour,
	MinstrelsCoda,
	BloodletterMastery,
	RangedMastery,
	EnhancedBarrage,
	EnhancedRadiantFinale,
}

export const BRDTraitList: Array<[BRDTraitName, number]> = [
    [BRDTraitName.WideVolleyMastery, 72],
    [BRDTraitName.BiteMasteryII, 76],
    [BRDTraitName.HeavyShotMastery, 76],
    [BRDTraitName.EnhancedArmysPaeon, 78],
    [BRDTraitName.SoulVoice, 80],
    [BRDTraitName.QuickNockMastery, 82],
    [BRDTraitName.EnhancedBloodletter, 84],
    [BRDTraitName.EnhancedApexArrow, 86],
    [BRDTraitName.EnhancedTroubadour, 88],
    [BRDTraitName.MinstrelsCoda, 90],
    [BRDTraitName.BloodletterMastery, 92],
    [BRDTraitName.RangedMastery, 94],
    [BRDTraitName.EnhancedBarrage, 96],
    [BRDTraitName.EnhancedRadiantFinale, 100]
];