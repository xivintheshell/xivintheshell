import {controller} from "../Controller/Controller";
import {XIVMath} from "./XIVMath";
import {Aspect, BuffType, SkillName} from "./Common";
import {GameConfig} from "./GameConfig";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO,
	STARRY, 
	EMBOLDEN_M,
	MANAFIC,
	ACCELERATION,
	POT,
	COMBO,
	AUTO_CDH,
	PARTY,
	FUGETSU,
	AUTO_CRIT,
	YATEN,
	POSITIONAL,
}

// Represents a multiplicative potency buff, e.g. AF3 multipliers potencies by 1.8
export type PotencyMultiplier = {
	kind: "multiplier",
	buffType?: BuffType,
	source: PotencyModifierType,
	damageFactor: number,
};

// Represents an additive potency buff, such as Enhanced Enpi increasing Enpi from 100 -> 270.
// Additive potencies should be applied before any multiplicative ones.
export type PotencyAdder = {
	kind: "adder",
	source: PotencyModifierType,
	additiveAmount: number, 
}

// Represents a modifier that scales crit, DH, or both.
export type CritDirectMultiplier = {
	kind: "critDirect",
	buffType?: BuffType,
	source: PotencyModifierType,
	critFactor: number,
	dhFactor: number,
};

export type PotencyModifier = PotencyMultiplier | PotencyAdder | CritDirectMultiplier;

export const Modifiers = {
	Tincture: {
		// tincture scaling is computed separately; just treat it as a multiplier of 1
		kind: "multiplier",
		source: PotencyModifierType.POT,
		damageFactor: 1,
	} as PotencyMultiplier,
	AutoCrit: {
		kind: "critDirect",
		source: PotencyModifierType.AUTO_CRIT,
		critFactor: 1,
		dhFactor: 0,
	} as CritDirectMultiplier,
	AutoCDH: {
		kind: "critDirect",
		source: PotencyModifierType.AUTO_CDH,
		critFactor: 1,
		dhFactor: 1,
	} as CritDirectMultiplier,
	Starry: {
		kind: "multiplier",
		source: PotencyModifierType.STARRY,
		damageFactor: 1.05,
	} as PotencyMultiplier,
	EmboldenMagic: {
		// The RDM self-buff component of Embolden is magic damage only
		kind: "multiplier",
		source: PotencyModifierType.EMBOLDEN_M,
		damageFactor: 1.05,
	} as PotencyMultiplier,
	AccelerationImpact: {
		kind: "adder",
		source: PotencyModifierType.ACCELERATION,
		additiveAmount: 50,
	} as PotencyAdder,
	Manafication: {
		kind: "multiplier",
		source: PotencyModifierType.MANAFIC,
		damageFactor: 1.05,
	} as PotencyMultiplier,
	Fugetsu: {
		kind: "multiplier",
		source: PotencyModifierType.FUGETSU,
		damageFactor: 1.13,
	} as PotencyMultiplier,
	Yatenpi: {
		kind: "adder",
		source: PotencyModifierType.YATEN,
		additiveAmount: 170,
	} as PotencyAdder,
};

export function makeComboModifier(addend: number): PotencyAdder {
	return {
		kind: "adder",
		source: PotencyModifierType.COMBO,
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

export type InitialPotencyProps = {
	config: GameConfig;
	sourceTime: number,
	sourceSkill: SkillName,
	aspect: Aspect,
	basePotency: number,
	snapshotTime?: number,
	description: string,
}

export class Potency {
	config: GameConfig;
	sourceTime: number; // display time
	sourceSkill: SkillName;
	aspect: Aspect;
	description: string;
	base: number;
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
	}

	getAmount(props: {
		tincturePotencyMultiplier: number,
		includePartyBuffs: boolean
	}) {
		let totalDamageFactor = 1;
		let totalAdditiveAmount = 0;
		let totalCritFactor = 0;
		let totalDhFactor = 0;

		let isAutoCDH = false;
		let isAutoCrit = false;

		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) totalDamageFactor *= props.tincturePotencyMultiplier;
			else if (m.source === PotencyModifierType.AUTO_CDH) isAutoCDH = true;
			else if (m.source === PotencyModifierType.AUTO_CRIT) isAutoCrit = true;
			else if (m.kind === "multiplier") totalDamageFactor *= m.damageFactor;
			else if (m.kind === "adder") totalAdditiveAmount += m.additiveAmount;
		});

		if (props.includePartyBuffs && this.snapshotTime) {
			controller.game.getPartyBuffs(this.snapshotTime).forEach(buff => {
				if (buff.kind === "multiplier") {
					totalDamageFactor *= buff.damageFactor;
				} else if (buff.kind === "critDirect") {
					totalCritFactor += buff.critFactor;
					totalDhFactor += buff.dhFactor;
				}
			});
		}
		const base = this.base + totalAdditiveAmount;

		let amt = base * this.#calculatePotencyModifier(totalDamageFactor, totalCritFactor, totalDhFactor);
		if (isAutoCDH) amt *= this.#calculateAutoCDHModifier(totalCritFactor, totalDhFactor);
		if (isAutoCrit) amt *= this.#calculateAutoCritModifier(totalCritFactor);
		return amt;
	}

	getPartyBuffs() {
		return (this.snapshotTime) ? [...controller.game.getPartyBuffs(this.snapshotTime).keys()] : [];
	}

	resolve(displayTime: number) {
		if (this.base < 1) {
			console.warn(this);
		}
		console.assert(this.snapshotTime !== undefined, `${this.sourceSkill} displayed at ${displayTime} did not have snapshotTime`);
		console.assert(
			this.applicationTime === undefined,
			`${this.sourceSkill} displayed at ${displayTime} was already resolved at ${this.applicationTime}`
		);
		this.applicationTime = displayTime;
	}

	hasResolved() { return this.applicationTime !== undefined; }

	hasHitBoss(untargetable: (displayTime: number) => boolean) {
		return this.applicationTime !== undefined && !untargetable(this.applicationTime);
	}

	hasSnapshotted() { return this.snapshotTime !== undefined; }

	#calculateAutoCDHModifier(critBonus: number, dhBonus: number) {
		const level = this.config.level;
		const base = XIVMath.calculateDamage(level, controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, critBonus, dhBonus);
		const buffed = XIVMath.calculateDamage(level, controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, 1+critBonus, 1+dhBonus);

		return buffed / base;
	}

	#calculateAutoCritModifier(critBonus: number) {
		// TODO check if this is the correct formula; may need to modify XIVMath.calculateDamage
		const level = this.config.level;
		const base = XIVMath.calculateDamage(level, controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, critBonus, 0);
		const buffed = XIVMath.calculateDamage(level, controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, 1+critBonus, 1);

		return buffed / base;
	}

	#calculatePotencyModifier(damageFactor: number, critBonus: number, dhBonus: number) {
		const level = this.config.level;
		const critStat = this.config.criticalHit;
		const dhStat = this.config.directHit;
		const det = this.config.determination;

		const base = XIVMath.calculateDamage(level, critStat, dhStat, det, 1, 0, 0);
		const buffed = XIVMath.calculateDamage(level, critStat, dhStat, det, damageFactor, critBonus, dhBonus);

		return buffed / base;
	}
}