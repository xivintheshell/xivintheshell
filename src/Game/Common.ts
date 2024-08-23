export const Debug = {
	epsilon: 1e-6,
	disableManaTicks: false,
	consoleLogEvents: false,
	noEnochian: false,
	constantSlidecastWindow: true,
};

export const enum LevelSync {
	lvl70 = "70",
	lvl80 = "80",
	lvl90 = "90",
	lvl100 = "100",
}

export const FIXED_BASE_CASTER_TAX = 0.1;

export const XIVMath = {

	preTaxGcd: (sps: number, hasLL: boolean): number => {
		const baseGCD = 2.5;
		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(sps-420)/2780+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	},
	dotPotency: (sps: number, basePotency: number): number => {
		let dotStrength = (1000 + Math.floor((sps - 420) * 130 / 2780.0)) * 0.001;
		return basePotency * dotStrength;
	},
	preTaxCastTime: (sps: number, baseCastTime: number, hasLL: boolean): number => {
		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(sps-420)/2780+1000))*(1000*baseCastTime)/1000)/100)*100/100)/1000;
	},
	afterFpsTax: (fps: number, baseDuration: number): number => {
		return Math.floor(baseDuration * fps + 1) / fps;
	}
};

export const enum Aspect {
	Fire = "Fire",
	Ice = "Ice",
	Lightning = "Lightning",
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
	Transpose = "Transpose",
	HighThunder = "High Thunder",
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
	FlareStar = "Flare Star",
	Retrace = "Retrace",
	Addle = "Addle",
	Swiftcast = "Swiftcast",
	LucidDreaming = "Lucid Dreaming",
	Surecast = "Surecast",
	Tincture = "Tincture",
	Sprint = "Sprint",

	Never = "Never",
}

export const enum SkillReadyStatus {
	Ready = "ready",
	Blocked = "blocked by CD, animation lock or caster tax",
	NotEnoughMP = "not enough MP",
	RequirementsNotMet = "requirements not met",
	BuffNoLongerAvailable = "buff no longer available"
}

export enum BuffType {
	LeyLines = "Ley Lines",
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

	// special
	Movement = "Movement", // [0, 1]
	NotAnimationLocked = "NotAnimationLocked", // [0, 1]
	NotCasterTaxed = "NotCasterTaxed", // [0, 1]

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

	Never = "Never",
}

export const enum WarningType {
	PolyglotOvercap = "polyglot overcap"
}