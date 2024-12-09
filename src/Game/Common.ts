import {BLMSkillName, BLMResourceType, BLMCooldownType, BLMTraitList, BLMTraitName} from "./Constants/BLM";
import {PCTSkillName, PCTResourceType, PCTCooldownType, PCTTraitList, PCTTraitName } from "./Constants/PCT";
import {RDMSkillName, RDMResourceType, RDMCooldownType, RDMTraitList, RDMTraitName} from "./Constants/RDM";
import {DNCSkillName, DNCResourceType, DNCCooldownType, DNCTraitList, DNCTraitName} from "./Constants/DNC";
import {SAMSkillName, SAMResourceType, SAMCooldownType, SAMTraitList, SAMTraitName} from "./Constants/SAM";
import {MCHSkillName, MCHResourceType, MCHCooldownType, MCHTraitList, MCHTraitName} from "./Constants/MCH";
import {RPRSkillName, RPRResourceType, RPRCooldownType, RPRTraitList, RPRTraitName} from "./Constants/RPR";


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
	ArmsLength = "Arm's Length", // Tanks, Melee, Phys Ranged

	SecondWind = "Second Wind", // Melee & Phys Ranged

	HeadGraze = "Head Graze", // Phys Ranged. Not bothering with Leg/Foot Graze at this point

	Addle = "Addle",
	Swiftcast = "Swiftcast",
	LucidDreaming = "Lucid Dreaming",
	Surecast = "Surecast",

	Tincture = "Tincture",
	Sprint = "Sprint",

	Feint = "Feint",
	Bloodbath = "Bloodbath",
	TrueNorth = "True North",
	LegSweep = "Leg Sweep",

	Never = "Never",
}

// Merge enums for each class: https://stackoverflow.com/a/55827534
export const SkillName = {
	...BLMSkillName,
	...PCTSkillName,
	...RDMSkillName,
	...DNCSkillName,
	...SAMSkillName,
	...MCHSkillName,
	...RPRSkillName,
	...GeneralSkillName,
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type SkillName = GeneralSkillName
	| BLMSkillName
	| PCTSkillName
	| RDMSkillName
	| DNCSkillName
	| SAMSkillName
	| MCHSkillName
	| RPRSkillName;

export const enum SkillUnavailableReason {
	Blocked = "blocked by CD, animation lock or caster tax",
	NotEnoughMP = "not enough MP",
	NotInCombat = "must be in combat (after first damage application)",
	RequirementsNotMet = "requirements not met",
	SkillNotUnlocked = "skill not unlocked at provided level",
	BuffNoLongerAvailable = "buff no longer available"
}

export type SkillReadyStatus = {
	unavailableReasons: SkillUnavailableReason[]
	ready: () => boolean;
	toString: () => string;
	addUnavailableReason: (reason: SkillUnavailableReason) => void;
	clone: () => SkillReadyStatus;
};

export function makeSkillReadyStatus(): SkillReadyStatus {
	return {
		unavailableReasons: [],
		ready: function() {
			return this.unavailableReasons.length === 0;
		},
		toString: function() {
			if (this.ready()) return "ready";
			return this.unavailableReasons.join("; ");
		},
		addUnavailableReason: function(reason: SkillUnavailableReason) {
			if (!this.unavailableReasons.includes(reason)) {
				this.unavailableReasons.push(reason);
			}
		},
		clone: function() {
			const status = makeSkillReadyStatus();
			this.unavailableReasons.forEach(reason => status.addUnavailableReason(reason));
			return status;
		}
	};
}

// Add any buffs that you want to have highlighted on the timeline here.
export enum BuffType {
	LeyLines = "Ley Lines",
	Hyperphantasia = "Hyperphantasia",
	Manafication = "Manafication",
	Acceleration = "Acceleration",
	Fuka = "Fuka",
	Fugetsu = "Fugetsu",
	EnhancedEnpi = "Enhanced Enpi",
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
	ArmsLength = "Arms Length",
	Tincture = "Tincture", // [0, 1]
	Sprint = "Sprint", // [0, 1]

	Feint = "Feint", // [0, 1]
	TrueNorth = "True North", // [0, 1]
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
	cd_SecondWind = "cd_SecondWind",
	cd_ArmsLength = "cd_ArmsLength",
	cd_Tincture = "cd_Tincture", // [0, 1x]
	cd_Sprint = "cd_Sprint", // [0, 1x]

	cd_Feint = "cd_Feint",
	cd_TrueNorth = "cd_TrueNorth",
	cd_Bloodbath = "cd_Bloodbath",
	cd_LegSweep = "cd_LegSweep",

	cd_HeadGraze = "cd_HeadGraze",
}

const CooldownType = {
	...GeneralCooldownType,
	...BLMCooldownType,
	...PCTCooldownType,
	...RDMCooldownType,
	...DNCCooldownType,
	...SAMCooldownType,
	...MCHCooldownType,
	...RPRCooldownType
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
type CooldownType = GeneralCooldownType
	| BLMCooldownType
	| PCTCooldownType
	| RDMCooldownType
	| DNCCooldownType
	| SAMCooldownType
	| MCHCooldownType
	| RPRCooldownType;

export const ResourceType = {
	...CooldownType,
	...GeneralResourceType,
	...BLMResourceType,
	...PCTResourceType,
	...RDMResourceType,
	...DNCResourceType,
	...SAMResourceType,
	...MCHResourceType,
	...RPRResourceType,
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ResourceType = CooldownType
	| GeneralResourceType
	| BLMResourceType
	| PCTResourceType
	| RDMResourceType
	| DNCResourceType
	| SAMResourceType
	| MCHResourceType
	| RPRResourceType;

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

	EspritOvercap = "esprit gauge overcap",
	FeatherOvercap = "feather gauge overcap",
	FanThreeOverwrite = "overwrote fan dance 3",

	HeatOvercap = "heat gauge overcap",
	BatteryOvercap = "battery gauge overcap",

	KenkiOvercap = "kenki overcap",
	MeditationOvercap = "meditation stack overcap",
	SenOvercap = "sen overcap",
}

export enum ReservedTraitName {
	Never = 0
}

export enum RoleTraitName {
	// 0-99 reserved
	// Healer, Magical Ranged
	EnhancedSwiftcast = 100,
	// Magical Ranged
	EnhancedAddle,

	// Melee, Ranged
	EnhancedSecondWind,
	// Melee
	EnhancedFeint,

	// Tank
	MeleeMasteryTank,
	EnhancedRampart,
	MeleeMasteryIITank,
	EnhancedReprisal,
}

const GeneralTraitList: Array<[RoleTraitName, number]> = [
	[RoleTraitName.EnhancedSwiftcast, 94],
	[RoleTraitName.EnhancedAddle, 98],

	[RoleTraitName.EnhancedSecondWind, 94],
	[RoleTraitName.EnhancedFeint, 98],

	[RoleTraitName.MeleeMasteryTank, 84],
	[RoleTraitName.EnhancedRampart, 94],
	[RoleTraitName.MeleeMasteryIITank, 94],
	[RoleTraitName.EnhancedReprisal, 98],
]

export const TraitName = {
	...RoleTraitName,  //  100-1000
	...BLMTraitName,   // 1000-1999
	...PCTTraitName,   // 2000-2999
	...DNCTraitName,   // 3000-3999
	...RDMTraitName,   // 4000-4999
	...SAMTraitName,   // 5000-5999
	...MCHTraitName,   // 6000-6999
	...RPRTraitName,   // 7000-7999
	...ReservedTraitName, // 0, for now
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TraitName = RoleTraitName
	| BLMTraitName
	| PCTTraitName
	| DNCTraitName
	| RDMTraitName
	| SAMTraitName
	| MCHTraitName
	| RPRTraitName
	| ReservedTraitName;

export const TraitList: Array<[TraitName, number]> = [
	...GeneralTraitList,
	...BLMTraitList,
	...PCTTraitList,
	...RDMTraitList,
	...DNCTraitList,
	...SAMTraitList,
	...MCHTraitList,
	...RPRTraitList,
]
