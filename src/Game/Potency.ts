import { controller } from "../Controller/Controller";
import { XIVMath } from "./XIVMath";
import { Aspect, BuffType } from "./Common";
import { GameConfig } from "./GameConfig";
import { ActionKey } from "./Data";

export const enum PotencyModifierType {
	AF3,
	AF2,
	AF1,
	UI3,
	UI2,
	UI1,
	ENO,
	STARRY,
	EMBOLDEN_M,
	MANAFIC,
	ACCELERATION,
	POT,
	COMBO,
	AUTO_CDH,
	NO_CDH,
	PARTY,

	STANDARD_SINGLE,
	STANDARD_DOUBLE,
	TECHNICAL_SINGLE,
	TECHNICAL_DOUBLE,
	TECHNICAL_TRIPLE,
	TECHNICAL_QUADRUPLE,
	DEVILMENT,

	FUGETSU,
	AUTO_CRIT,
	YATEN,
	POSITIONAL,

	ARCANE_CIRCLE,
	DEATHSDESIGN,
	ENHANCED_GIBBET_GALLOWS,
	ENHANCED_REAPING,
	IMMORTAL_SACRIFICE,

	OVERHEATED,

	SURGING_TEMPEST,

	RAGING_STRIKES,
	WANDERERS_MINUET,
	MAGES_BALLAD,
	ARMYS_PAEON,
	BATTLE_VOICE,
	RADIANT_FINALE_ONE_CODA,
	RADIANT_FINALE_TWO_CODA,
	RADIANT_FINALE_THREE_CODA,
	BARRAGE,

	NO_MERCY,

	SEARING_LIGHT,

	POWER_SURGE,
	ENHANCED_PIERCING_TALON,
	LANCE_CHARGE,
	LIFE_OF_THE_DRAGON,
	LIFE_SURGE,
	BATTLE_LITANY,

	FIGHT_OR_FLIGHT,
	DIVINE_MIGHT,
	REQUIESCAT,

	PET,

	ZOE,
	SOTERIA,
	KRASIS,
	AUTOPHYSIS,
	PHILOSOPHIA,

	MOON_FLUTE,
	BRISTLE,
	WHISTLE,
	TINGLEA,
	TINGLEB,
	SURPANAKHA,
	WINGED_REPROBATION,
	WINGED_REDEMPTION,

	DARKSIDE,

	BUNSHIN,
	KASSATSU,
	HOLLOW_NOZUCHI,
	KAZEMATOI,
	MEISUI,
	DOKUMORI,
	TRICK_ATTACK,
	KUNAIS_BANE,

	BROTHERHOOD,
	RIDDLE_OF_FIRE,
	SSS_CHAKRA,
	MNK_BALL,

	DIVINATION,
	NEUTRAL_SECT,
	THE_ARROW,
	SYNASTRY,

	CONFESSION,
	ASYLUM,
	TEMPERANCE,
	EXTRA_BELL_STACKS,
}

// Represents a multiplicative potency buff, e.g. AF3 multipliers potencies by 1.8
export type PotencyMultiplier = {
	kind: "multiplier";
	buffType?: BuffType;
	source: PotencyModifierType;
	potencyFactor: number;
};

// Represents an additive potency buff, such as Enhanced Enpi increasing Enpi from 100 -> 270.
// Additive potencies should be applied before any multiplicative ones.
export type PotencyAdder = {
	kind: "adder";
	source: PotencyModifierType;
	additiveAmount: number;
};

// Represents a modifier that scales crit, DH, or both.
export type CritDirectMultiplier = {
	kind: "critDirect";
	buffType?: BuffType;
	source: PotencyModifierType;
	critBonus: number;
	dhBonus: number;
};

export type PotencyModifier = PotencyMultiplier | PotencyAdder | CritDirectMultiplier;

const DARKSIDE_SCALAR = 1.1;
const NIN_PET_SCALAR = 0.9;

export const Modifiers = {
	Tincture: {
		// tincture scaling is computed separately; just treat it as a multiplier of 1
		kind: "multiplier",
		source: PotencyModifierType.POT,
		potencyFactor: 1,
	} as PotencyMultiplier,
	AutoCrit: {
		kind: "critDirect",
		source: PotencyModifierType.AUTO_CRIT,
		critBonus: 1,
		dhBonus: 0,
	} as CritDirectMultiplier,
	AutoCDH: {
		kind: "critDirect",
		source: PotencyModifierType.AUTO_CDH,
		critBonus: 1,
		dhBonus: 1,
	} as CritDirectMultiplier,
	NoCDH: {
		kind: "critDirect",
		source: PotencyModifierType.NO_CDH,
		critBonus: 0,
		dhBonus: 0,
	} as CritDirectMultiplier,
	Starry: {
		kind: "multiplier",
		source: PotencyModifierType.STARRY,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	EmboldenMagic: {
		// The RDM self-buff component of Embolden is magic damage only
		kind: "multiplier",
		source: PotencyModifierType.EMBOLDEN_M,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	AccelerationImpact: {
		kind: "adder",
		source: PotencyModifierType.ACCELERATION,
		additiveAmount: 50,
	} as PotencyAdder,
	Manafication: {
		kind: "multiplier",
		source: PotencyModifierType.MANAFIC,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	SingleStandardFinish: {
		kind: "multiplier",
		source: PotencyModifierType.STANDARD_SINGLE,
		potencyFactor: 1.02,
	} as PotencyMultiplier,
	DoubleStandardFinish: {
		kind: "multiplier",
		source: PotencyModifierType.STANDARD_DOUBLE,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	SingleTechnicalFinish: {
		kind: "multiplier",
		source: PotencyModifierType.TECHNICAL_SINGLE,
		potencyFactor: 1.01,
	} as PotencyMultiplier,
	DoubleTechnicalFinish: {
		kind: "multiplier",
		source: PotencyModifierType.TECHNICAL_DOUBLE,
		potencyFactor: 1.02,
	} as PotencyMultiplier,
	TripleTechnicalFinish: {
		kind: "multiplier",
		source: PotencyModifierType.TECHNICAL_TRIPLE,
		potencyFactor: 1.03,
	} as PotencyMultiplier,
	QuadrupleTechnicalFinish: {
		kind: "multiplier",
		source: PotencyModifierType.TECHNICAL_QUADRUPLE,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	Devilment: {
		kind: "critDirect",
		source: PotencyModifierType.DEVILMENT,
		critBonus: 0.2,
		dhBonus: 0.2,
	} as CritDirectMultiplier,
	FugetsuBase: {
		kind: "multiplier",
		source: PotencyModifierType.FUGETSU,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	FugetsuEnhanced: {
		kind: "multiplier",
		source: PotencyModifierType.FUGETSU,
		potencyFactor: 1.13,
	} as PotencyMultiplier,
	YatenpiBase: {
		kind: "adder",
		source: PotencyModifierType.YATEN,
		additiveAmount: 160,
	} as PotencyAdder,
	YatenpiEnhanced: {
		kind: "adder",
		source: PotencyModifierType.YATEN,
		additiveAmount: 170,
	} as PotencyAdder,
	ArcaneCircle: {
		kind: "multiplier",
		source: PotencyModifierType.ARCANE_CIRCLE,
		potencyFactor: 1.03,
	} as PotencyMultiplier,
	DeathsDesign: {
		kind: "multiplier",
		source: PotencyModifierType.DEATHSDESIGN,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	EnhancedGibbetGallows: {
		kind: "adder",
		source: PotencyModifierType.ENHANCED_GIBBET_GALLOWS,
		additiveAmount: 60,
	} as PotencyAdder,
	EnhancedReaping: {
		kind: "adder",
		source: PotencyModifierType.ENHANCED_REAPING,
		additiveAmount: 60,
	} as PotencyAdder,
	ImmortalSacrifice: {
		kind: "adder",
		source: PotencyModifierType.IMMORTAL_SACRIFICE,
		additiveAmount: 40,
	} as PotencyAdder,
	Overheated: {
		kind: "adder",
		source: PotencyModifierType.OVERHEATED,
		additiveAmount: 20,
	} as PotencyAdder,
	SurgingTempest: {
		kind: "multiplier",
		source: PotencyModifierType.SURGING_TEMPEST,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	RagingStrikes: {
		kind: "multiplier",
		source: PotencyModifierType.RAGING_STRIKES,
		potencyFactor: 1.15,
	} as PotencyMultiplier,
	MagesBallad: {
		kind: "multiplier",
		source: PotencyModifierType.MAGES_BALLAD,
		potencyFactor: 1.01,
	} as PotencyMultiplier,
	ArmysPaeon: {
		kind: "critDirect",
		source: PotencyModifierType.ARMYS_PAEON,
		critBonus: 0,
		dhBonus: 0.03,
	} as CritDirectMultiplier,
	WanderersMinuet: {
		kind: "critDirect",
		source: PotencyModifierType.WANDERERS_MINUET,
		critBonus: 0.02,
		dhBonus: 0,
	} as CritDirectMultiplier,
	BattleVoice: {
		kind: "critDirect",
		source: PotencyModifierType.BATTLE_VOICE,
		critBonus: 0,
		dhBonus: 0.2,
	} as CritDirectMultiplier,
	RadiantFinaleOneCoda: {
		kind: "multiplier",
		source: PotencyModifierType.RADIANT_FINALE_ONE_CODA,
		potencyFactor: 1.02,
	} as PotencyMultiplier,
	RadiantFinaleTwoCoda: {
		kind: "multiplier",
		source: PotencyModifierType.RADIANT_FINALE_TWO_CODA,
		potencyFactor: 1.04,
	} as PotencyMultiplier,
	RadiantFinaleThreeCoda: {
		kind: "multiplier",
		source: PotencyModifierType.RADIANT_FINALE_THREE_CODA,
		potencyFactor: 1.06,
	} as PotencyMultiplier,
	BarrageRefulgent: {
		kind: "multiplier",
		source: PotencyModifierType.BARRAGE,
		potencyFactor: 3,
	} as PotencyMultiplier,
	BarrageWideVolley: {
		kind: "adder",
		source: PotencyModifierType.BARRAGE,
		additiveAmount: 80,
	} as PotencyAdder,
	BarrageShadowbite: {
		kind: "adder",
		source: PotencyModifierType.BARRAGE,
		additiveAmount: 100,
	} as PotencyAdder,
	NoMercy: {
		kind: "multiplier",
		source: PotencyModifierType.NO_MERCY,
		potencyFactor: 1.2,
	} as PotencyMultiplier,
	SearingLight: {
		kind: "multiplier",
		source: PotencyModifierType.SEARING_LIGHT,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	SmnPet: {
		kind: "multiplier",
		source: PotencyModifierType.PET,
		// with a 5% party bonus, smn pet skills do approximately 80% of its other potencies
		// https://docs.google.com/spreadsheets/d/1Yt7Px7VHuKG1eJR9CRKs3RpvcR5IZKAAA3xjekvv0LY/edit?gid=0#gid=0
		potencyFactor: 0.8,
	} as PotencyMultiplier,
	PowerSurge: {
		kind: "multiplier",
		source: PotencyModifierType.POWER_SURGE,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	LanceCharge: {
		kind: "multiplier",
		source: PotencyModifierType.LANCE_CHARGE,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	LifeOfTheDragon: {
		kind: "multiplier",
		source: PotencyModifierType.LIFE_OF_THE_DRAGON,
		potencyFactor: 1.15,
	} as PotencyMultiplier,
	BattleLitany: {
		kind: "critDirect",
		source: PotencyModifierType.BATTLE_LITANY,
		critBonus: 0.1,
		dhBonus: 0.0,
	} as CritDirectMultiplier,
	EnhancedPiercingTalon: {
		kind: "adder",
		source: PotencyModifierType.ENHANCED_PIERCING_TALON,
		additiveAmount: 150,
	} as PotencyAdder,
	LifeSurge: {
		kind: "critDirect",
		source: PotencyModifierType.LIFE_SURGE,
		critBonus: 1.0,
		dhBonus: 0,
	} as CritDirectMultiplier,
	FightOrFlight: {
		kind: "multiplier",
		source: PotencyModifierType.FIGHT_OR_FLIGHT,
		potencyFactor: 1.25,
	} as PotencyMultiplier,
	Zoe: {
		kind: "multiplier",
		source: PotencyModifierType.ZOE,
		potencyFactor: 1.5,
	} as PotencyMultiplier,
	Soteria: {
		kind: "multiplier",
		source: PotencyModifierType.SOTERIA,
		potencyFactor: 1.7,
	} as PotencyMultiplier,
	Krasis: {
		kind: "multiplier",
		source: PotencyModifierType.KRASIS,
		potencyFactor: 1.2,
	} as PotencyMultiplier,
	Autophysis: {
		kind: "multiplier",
		source: PotencyModifierType.AUTOPHYSIS,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	Philosophia: {
		kind: "multiplier",
		source: PotencyModifierType.PHILOSOPHIA,
		potencyFactor: 1.2,
	} as PotencyMultiplier,
	MoonFlute: {
		kind: "multiplier",
		source: PotencyModifierType.MOON_FLUTE,
		potencyFactor: 1.5,
	} as PotencyMultiplier,
	Whistle: {
		kind: "multiplier",
		source: PotencyModifierType.WHISTLE,
		potencyFactor: 1.8,
	} as PotencyMultiplier,
	Bristle: {
		kind: "multiplier",
		source: PotencyModifierType.BRISTLE,
		potencyFactor: 1.5,
	} as PotencyMultiplier,
	TingleA: {
		kind: "adder",
		source: PotencyModifierType.TINGLEA,
		additiveAmount: 100,
	} as PotencyAdder,
	TingleB: {
		kind: "adder",
		source: PotencyModifierType.TINGLEB,
		additiveAmount: 300,
	} as PotencyAdder,
	Surpanakha: {
		kind: "adder",
		source: PotencyModifierType.SURPANAKHA,
		additiveAmount: 100,
	} as PotencyAdder,
	WingedReprobation: {
		kind: "adder",
		source: PotencyModifierType.WINGED_REPROBATION,
		additiveAmount: 100,
	} as PotencyAdder,
	WingedRedemption: {
		kind: "adder",
		source: PotencyModifierType.WINGED_REDEMPTION,
		additiveAmount: 220,
	} as PotencyAdder,
	Darkside: {
		kind: "multiplier",
		source: PotencyModifierType.DARKSIDE,
		potencyFactor: DARKSIDE_SCALAR,
	} as PotencyMultiplier,
	DrkPet: {
		kind: "multiplier",
		source: PotencyModifierType.PET,
		// with a 5% party bonus, living shadow skills do approximately 105% of its other potencies
		// https://docs.google.com/spreadsheets/d/1Yt7Px7VHuKG1eJR9CRKs3RpvcR5IZKAAA3xjekvv0LY/edit?gid=0#gid=0
		// however, these comparisons were done assuming the player is already under darkside, so we need
		// to multiply these values by a further 1.1 to compare against a player without darkside
		potencyFactor: 1.05 * DARKSIDE_SCALAR,
	} as PotencyMultiplier,
	// with a 5% party bonus, the additional potency from bunshin attacks do 90% of player potency
	// this is applied to the additive bonus from bunshin as well as phantom kamaitachi
	BunshinST: {
		kind: "adder",
		source: PotencyModifierType.BUNSHIN,
		additiveAmount: 160 * NIN_PET_SCALAR,
	} as PotencyAdder,
	BunshinAOE: {
		kind: "adder",
		source: PotencyModifierType.BUNSHIN,
		additiveAmount: 80 * NIN_PET_SCALAR,
	} as PotencyAdder,
	NinPet: {
		kind: "multiplier",
		source: PotencyModifierType.PET,
		potencyFactor: NIN_PET_SCALAR,
	} as PotencyMultiplier,
	Kassatsu: {
		kind: "multiplier",
		source: PotencyModifierType.KASSATSU,
		potencyFactor: 1.3,
	} as PotencyMultiplier,
	HollowNozuchi: {
		kind: "adder",
		source: PotencyModifierType.HOLLOW_NOZUCHI,
		additiveAmount: 70,
	} as PotencyAdder,
	Kazematoi: {
		kind: "adder",
		source: PotencyModifierType.KAZEMATOI,
		additiveAmount: 100,
	} as PotencyAdder,
	Meisui: {
		kind: "adder",
		source: PotencyModifierType.MEISUI,
		additiveAmount: 150,
	} as PotencyAdder,
	Dokumori: {
		kind: "multiplier",
		source: PotencyModifierType.DOKUMORI,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	TrickAttack: {
		kind: "multiplier",
		source: PotencyModifierType.TRICK_ATTACK,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	KunaisBane: {
		kind: "multiplier",
		source: PotencyModifierType.KUNAIS_BANE,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	Brotherhood: {
		kind: "multiplier",
		source: PotencyModifierType.BROTHERHOOD,
		potencyFactor: 1.05,
	} as PotencyMultiplier,
	RiddleOfFire: {
		kind: "multiplier",
		source: PotencyModifierType.RIDDLE_OF_FIRE,
		potencyFactor: 1.15,
	} as PotencyMultiplier,
	Divination: {
		kind: "multiplier",
		source: PotencyModifierType.DIVINATION,
		potencyFactor: 1.06,
	} as PotencyMultiplier,
	NeutralSect: {
		kind: "multiplier",
		source: PotencyModifierType.NEUTRAL_SECT,
		potencyFactor: 1.2,
	} as PotencyMultiplier,
	TheArrow: {
		kind: "multiplier",
		source: PotencyModifierType.THE_ARROW,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	Synastry: {
		kind: "multiplier",
		source: PotencyModifierType.SYNASTRY,
		potencyFactor: 1.4,
	} as PotencyMultiplier,
	// earthly star is a pet
	AstPet: {
		kind: "multiplier",
		source: PotencyModifierType.PET,
		potencyFactor: 0.98,
	} as PotencyMultiplier,
	Confession: {
		kind: "adder",
		source: PotencyModifierType.CONFESSION,
		additiveAmount: 200,
	} as PotencyAdder,
	Asylum: {
		kind: "multiplier",
		source: PotencyModifierType.ASYLUM,
		potencyFactor: 1.1,
	} as PotencyMultiplier,
	Temperance: {
		kind: "multiplier",
		source: PotencyModifierType.TEMPERANCE,
		potencyFactor: 1.2,
	} as PotencyMultiplier,
	// liturgy of the bell is a pet
	WhmPet: {
		kind: "multiplier",
		source: PotencyModifierType.PET,
		potencyFactor: 0.96,
	} as PotencyMultiplier,
};

export function makeComboModifier(addend: number): PotencyAdder {
	return {
		kind: "adder",
		source: PotencyModifierType.COMBO,
		additiveAmount: addend,
	};
}

export function makeRequiescatModifier(addend: number): PotencyAdder {
	return {
		kind: "adder",
		source: PotencyModifierType.REQUIESCAT,
		additiveAmount: addend,
	};
}

export function makeDivineMightModifier(addend: number): PotencyAdder {
	return {
		kind: "adder",
		source: PotencyModifierType.DIVINE_MIGHT,
		additiveAmount: addend,
	};
}

export function makePositionalModifier(addend: number): PotencyAdder {
	return {
		kind: "adder",
		source: PotencyModifierType.POSITIONAL,
		additiveAmount: addend,
	};
}

export type PotencyKind = "damage" | "healing";

export type InitialPotencyProps = {
	config: GameConfig;
	sourceTime: number;
	sourceSkill: ActionKey;
	aspect: Aspect;
	basePotency: number;
	snapshotTime?: number;
	description: string;
	targetCount: number;
	falloff?: number;
};

export class Potency {
	config: GameConfig;
	sourceTime: number; // display time
	sourceSkill: ActionKey;
	aspect: Aspect;
	description: string;
	base: number;
	targetCount: number;
	falloff?: number;
	snapshotTime?: number;
	applicationTime?: number;
	modifiers: PotencyModifier[] = [];

	constructor(props: InitialPotencyProps) {
		this.config = props.config;
		this.sourceTime = props.sourceTime;
		this.sourceSkill = props.sourceSkill;
		this.aspect = props.aspect;
		this.base = props.basePotency;
		this.snapshotTime = props.snapshotTime;
		this.description = props.description;
		this.targetCount = props.targetCount;
		this.falloff = props.falloff;
	}

	getAmount(props: {
		tincturePotencyMultiplier: number;
		includePartyBuffs: boolean;
		includeSplash: boolean;
	}) {
		let totalDamageFactor = 1;
		let totalAdditiveAmount = 0;
		let totalCritBonus = 0;
		let totalDhBonus = 0;

		let isAutoCDH = false;
		let isAutoCrit = false;
		let noCDH = false;

		this.modifiers.forEach((m) => {
			if (m.source === PotencyModifierType.POT)
				totalDamageFactor *= props.tincturePotencyMultiplier;
			else if (m.source === PotencyModifierType.AUTO_CDH) isAutoCDH = true;
			else if (m.source === PotencyModifierType.AUTO_CRIT) isAutoCrit = true;
			else if (m.source === PotencyModifierType.NO_CDH) noCDH = true;
			// handle calculation for ordinary crit/DH bonuses separate from autocrit/dh
			else if (m.kind === "critDirect") {
				totalCritBonus += m.critBonus;
				totalDhBonus += m.dhBonus;
			} else if (m.kind === "multiplier") totalDamageFactor *= m.potencyFactor;
			else if (m.kind === "adder") totalAdditiveAmount += m.additiveAmount;
		});
		// If this skill can't crit or direct hit, it can't be an auto crit/CDH
		console.assert(
			!(noCDH && (isAutoCDH || isAutoCrit)),
			"skills that can't CDH cannot be auto-crit or auto-CDH",
		);
		if (noCDH) {
			isAutoCDH = false;
			isAutoCrit = false;
		}
		console.assert(!(isAutoCDH && isAutoCrit), "cannot be both auto-crit and auto-CDH");

		if (props.includePartyBuffs && this.snapshotTime) {
			controller.game.getPartyBuffs(this.snapshotTime).forEach((buff) => {
				if (buff.kind === "multiplier") {
					totalDamageFactor *= buff.potencyFactor;
				} else if (buff.kind === "critDirect") {
					totalCritBonus += buff.critBonus;
					totalDhBonus += buff.dhBonus;
				}
			});
		}
		const base = this.base + totalAdditiveAmount;

		let amt =
			base *
			this.#calculatePotencyModifier(
				totalDamageFactor,
				noCDH ? 0 : totalCritBonus,
				noCDH ? 0 : totalDhBonus,
			);
		if (isAutoCDH) amt *= this.#calculateAutoCDHModifier(totalCritBonus, totalDhBonus);
		else if (isAutoCrit) amt *= this.#calculateAutoCritModifier(totalCritBonus, totalDhBonus);
		if (props.includeSplash) {
			const splashScalar = 1 + (1 - (this.falloff ?? 1)) * (this.targetCount - 1);
			amt *= splashScalar;
		}
		return amt;
	}

	getPartyBuffs() {
		return this.snapshotTime
			? [...controller.game.getPartyBuffs(this.snapshotTime).keys()]
			: [];
	}

	resolve(displayTime: number) {
		console.assert(
			this.snapshotTime !== undefined,
			`${this.sourceSkill} displayed at ${displayTime} did not have snapshotTime`,
		);
		console.assert(
			this.applicationTime === undefined,
			`${this.sourceSkill} displayed at ${displayTime} was already resolved at ${this.applicationTime}`,
		);
		this.applicationTime = displayTime;
	}

	hasResolved() {
		return this.applicationTime !== undefined;
	}

	hasHitBoss(untargetable: (displayTime: number) => boolean) {
		return this.applicationTime !== undefined && !untargetable(this.applicationTime);
	}

	hasSnapshotted() {
		return this.snapshotTime !== undefined;
	}

	#calculateAutoCDHModifier(critBonus: number, dhBonus: number) {
		const level = this.config.level;
		const base = XIVMath.calculateDamage(
			level,
			controller.gameConfig.criticalHit,
			controller.gameConfig.directHit,
			controller.gameConfig.determination,
			1,
			critBonus,
			dhBonus,
		);
		const buffed = XIVMath.calculateDamage(
			level,
			controller.gameConfig.criticalHit,
			controller.gameConfig.directHit,
			controller.gameConfig.determination,
			1,
			1 + critBonus,
			1 + dhBonus,
		);

		return buffed / base;
	}

	#calculateAutoCritModifier(critBonus: number, dhBonus: number) {
		const level = this.config.level;
		const base = XIVMath.calculateDamage(
			level,
			controller.gameConfig.criticalHit,
			controller.gameConfig.directHit,
			controller.gameConfig.determination,
			1,
			critBonus,
			dhBonus,
		);
		const buffed = XIVMath.calculateDamage(
			level,
			controller.gameConfig.criticalHit,
			controller.gameConfig.directHit,
			controller.gameConfig.determination,
			1,
			1 + critBonus,
			dhBonus,
		);

		return buffed / base;
	}

	#calculatePotencyModifier(damageFactor: number, critBonus: number, dhBonus: number) {
		const level = this.config.level;
		const critStat = this.config.criticalHit;
		const dhStat = this.config.directHit;
		const det = this.config.determination;

		const base = XIVMath.calculateDamage(level, critStat, dhStat, det, 1, 0, 0);
		const buffed = XIVMath.calculateDamage(
			level,
			critStat,
			dhStat,
			det,
			damageFactor,
			critBonus,
			dhBonus,
		);

		return buffed / base;
	}
}
