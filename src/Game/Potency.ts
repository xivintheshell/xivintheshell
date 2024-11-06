import {controller} from "../Controller/Controller";
import {XIVMath} from "./XIVMath";
import {Aspect, BuffType, SkillName} from "./Common";
import {GameConfig} from "./GameConfig";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, STARRY, AUTO_CDH, PARTY
}

export type PotencyModifier = {
	source: PotencyModifierType,
	buffType?: BuffType,
	damageFactor: number,
	critFactor: number,
	dhFactor: number,
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
		let totalCritFactor = 0;
		let totalDhFactor = 0;

		let isAutoCDH = false;

		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) totalDamageFactor *= props.tincturePotencyMultiplier;
			else if (m.source === PotencyModifierType.AUTO_CDH) isAutoCDH = true;
			else totalDamageFactor *= m.damageFactor;
		});

		if (props.includePartyBuffs && this.snapshotTime) {
			controller.game.getPartyBuffs(this.snapshotTime).forEach(buff => {
				totalDamageFactor *= buff.damageFactor;
				totalCritFactor += buff.critFactor ?? 0;
				totalDhFactor += buff.dhFactor ?? 0;
			});
		}

		let amt = this.base * this.#calculatePotencyModifier(totalDamageFactor, totalCritFactor, totalDhFactor);
		if (isAutoCDH) amt *= this.#calculateAutoCDHModifier(totalCritFactor, totalDhFactor);
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