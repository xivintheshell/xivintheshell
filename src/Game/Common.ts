import {BLMSkillName, BLMResourceType, BLMCooldownType} from "./Constants/BLM";
import {PCTSkillName, PCTResourceType, PCTCooldownType} from "./Constants/PCT";
import {RDMSkillName, RDMResourceType, RDMCooldownType} from "./Constants/RDM";
import {SAMSkillName, SAMResourceType, SAMCooldownType} from "./Constants/SAM";

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
	Physical = "Physical",
	Other = "Other"
}

export const enum ProcMode {
	RNG = "RNG",
	Never = "Never",
	Always = "Always"
}

enum GeneralSkillName {
	Addle = "Addle",
	Swiftcast = "Swiftcast",
	LucidDreaming = "Lucid Dreaming",
	Surecast = "Surecast",
	Tincture = "Tincture",
	Sprint = "Sprint",

	Feint = "Feint",
	SecondWind = "Second Wind",
	Bloodbath = "Bloodbath",
	TrueNorth = "True North",
	ArmsLength = "Arm's Length",
	LegSweep = "Leg Sweep",

	Never = "Never",
}

// Merge enums for each class: https://stackoverflow.com/a/55827534
export const SkillName = {
	...BLMSkillName,
	...PCTSkillName,
	...RDMSkillName,
	...SAMSkillName,
	...GeneralSkillName,
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type SkillName = GeneralSkillName
	| BLMSkillName
	| PCTSkillName
	| RDMSkillName
	| SAMSkillName;

export const enum SkillReadyStatus {
	Ready = "ready",
	Blocked = "blocked by CD, animation lock or caster tax",
	NotEnoughMP = "not enough MP",
	NotInCombat = "must be in combat (after first damage application)",
	RequirementsNotMet = "requirements not met",
	SkillNotUnlocked = "skill not unlocked at provided level",
	BuffNoLongerAvailable = "buff no longer available"
}

// Add any buffs that you want to have highlighted on the timeline here.
export enum BuffType {
	LeyLines = "Ley Lines",
	Hyperphantasia = "Hyperphantasia",
	Manafication = "Manafication",
	Acceleration = "Acceleration",
	Fuka = "Fuka",
	Fugetsu = "Fugetsu",
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
	WanderersMinuet = "The Wanderer's Minuet",
}

enum GeneralResourceType {
	// job resources
	Mana = "Mana", // [0, 10000]
	Addle = "Addle", // [0, 1]
	Swiftcast = "Swiftcast", // [0, 1]
	LucidDreaming = "Lucid Dreaming", // [0, 1] also just for timing display
	Surecast = "Surecast", // [0, 1]
	Tincture = "Tincture", // [0, 1]
	Sprint = "Sprint", // [0, 1]

	Feint = "Feint", // [0, 1]
	TrueNorth = "True North", // [0, 1]
	ArmsLength = "Arm's Length", // [0, 1]
	Bloodbath = "Bloodbath", // [0, 1]

	// special
	RearPositional = "Rear Positional", // [0, 1]
	FlankPositional = "Flank Positional", // [0, 1]
	Movement = "Movement", // [0, 1]
	NotAnimationLocked = "NotAnimationLocked", // [0, 1]
	NotCasterTaxed = "NotCasterTaxed", // [0, 1]
	InCombat = "InCombat", // [0, 1], used for abilities that can only execute in combat

	Never = "Never",
}

enum GeneralCooldownType {
	cd_GCD = "cd_GCD", // [0, Constant.gcd]
	cd_Addle = "cd_Addle", // [0, 1x]
	cd_Swiftcast = "cd_Swiftcast", // [0, 1x]
	cd_LucidDreaming = "cd_LucidDreaming", // [0, 1x]
	cd_Surecast = "cd_Surecast", // [0, 1x]
	cd_Tincture = "cd_Tincture", // [0, 1x]
	cd_Sprint = "cd_Sprint", // [0, 1x]
	cd_Feint = "cd_Feint", // [0, 90]
	cd_TrueNorth = "cd_TrueNorth", // [0, 45]
	cd_ArmsLength = "cd_ArmsLength", // [0, 90]
	cd_Bloodbath = "cd_Bloodbath", // [0, 120]
	cd_SecondWind = "cd_SecondWind", // [0, 120]
	cd_LegSweep = "cd_LegSweep", // [0, 40]
}

const CooldownType = {
	...GeneralCooldownType,
	...BLMCooldownType,
	...PCTCooldownType,
	...RDMCooldownType,
	...SAMCooldownType,
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
type CooldownType = GeneralCooldownType
	| BLMCooldownType
	| PCTCooldownType
	| RDMCooldownType
	| SAMCooldownType;

export const ResourceType = {
	...CooldownType,
	...GeneralResourceType,
	...BLMResourceType,
	...PCTResourceType,
	...RDMResourceType,
	...SAMResourceType,
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ResourceType = CooldownType
	| GeneralResourceType
	| BLMResourceType
	| PCTResourceType
	| RDMResourceType
	| SAMResourceType;

export const enum WarningType {
	PolyglotOvercap = "polyglot overcap",

	CometOverwrite = "comet overwrite",
	PaletteOvercap = "palette gauge overcap",

	DualcastEaten = "dualcast dropped",
	ImbalancedMana = "mana difference became more than 30",
	ComboBreak = "broken combo",
	// TODO make buff overwrite warning generic
	GIOverwrite = "Grand Impact Ready overwrite",
	GIDrop = "Grand Impact expired",
	ViceOfThornsDrop = "Vice of Thorns expired",
	PrefulgenceDrop = "Prefulgence expired",
	ManaficDrop = "Manafication stacks expired",
	MagickedSwordplayDrop = "Magicked Swordplay stacks expired",

	KenkiOvercap = "kenki overcap",
	MeditationOvercap = "meditation stack overcap",
	SenOvercap = "sen overcap"
}