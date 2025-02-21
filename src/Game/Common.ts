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
	Other = "Other",
}

export const enum ProcMode {
	RNG = "RNG",
	Never = "Never",
	Always = "Always",
}

export const enum SkillUnavailableReason {
	Blocked = "blocked by CD, animation lock or caster tax",
	SecondaryBlocked = "blocked by secondary CD",
	NotEnoughMP = "not enough MP",
	NotInCombat = "must be in combat (after first damage application)",
	RequirementsNotMet = "requirements not met",
	SkillNotUnlocked = "skill not unlocked at provided level",
	BuffNoLongerAvailable = "buff no longer available",
}

export type SkillReadyStatus = {
	unavailableReasons: SkillUnavailableReason[];
	ready: () => boolean;
	toString: () => string;
	addUnavailableReason: (reason: SkillUnavailableReason) => void;
	clone: () => SkillReadyStatus;
};

export function makeSkillReadyStatus(): SkillReadyStatus {
	return {
		unavailableReasons: [],
		ready: function () {
			return this.unavailableReasons.length === 0;
		},
		toString: function () {
			if (this.ready()) return "ready";
			return this.unavailableReasons.join("; ");
		},
		addUnavailableReason: function (reason: SkillUnavailableReason) {
			if (!this.unavailableReasons.includes(reason)) {
				this.unavailableReasons.push(reason);
			}
		},
		clone: function () {
			const status = makeSkillReadyStatus();
			this.unavailableReasons.forEach((reason) => status.addUnavailableReason(reason));
			return status;
		},
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
	NoMercy = "No Mercy",
	PowerSurge = "Power Surge",
	LanceCharge = "Lance Charge",
	LifeOfTheDragon = "Life Of The Dragon",
	EnhancedPiercingTalon = "Enhanced Piercing Talon",
	LifeSurge = "Life Surge",
	DivineMight = "Divine Might",
	Requiescat = "Requiescat",
	FightOrFlight = "Fight Or Flight",
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
	Barrage = "Barrage",
	SearingLight = "Searing Light",
	StandardFinish = "Standard Finish",
	StarryMuse = "Starry Muse",
	TechnicalFinish = "Technical Finish",
	WanderersMinuet = "The Wanderer's Minuet",
	RagingStrikes = "Raging Strikes",

	DeathsDesign = "Death's Design",
}

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

	BeastGaugeOvercap = "Beast Gauge overcap",
	InnerReleaseDrop = "Inner Release expired",
	NascentChaosDrop = "Nascent Chaos expired",

	SoulVoiceOvercap = "soul voice overcap",
	CodaOvercap = "coda overcap",

	CartridgeOvercap = "cartridge overcap",

	ScaleOvercap = "firstminds' focus overcap",

	LateEnkindle = "enkindle used near end of demi window may ghost",
	RubysGlimmerDrop = "Ruby's Glimmer expired",
	AetherflowOvercap = "aetherflow overcap",
}
