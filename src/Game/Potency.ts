import {controller} from "../Controller/Controller";
import {Aspect, BuffType, Debug, ResourceType, SkillName} from "./Common";
import { GameConfig } from "./GameConfig";
import {ResourceState} from "./Resources";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, STARRY, HAMMER, PARTY
}

export type PotencyModifier = {
	source: PotencyModifierType,
	buffType?: BuffType,
	damageFactor: number,
	critFactor: number,
	dhFactor: number,
}

export function getPotencyModifiersFromResourceState(resources: ResourceState, aspect: Aspect) : PotencyModifier[] {
	let mods : PotencyModifier[] = [];
	// pot
	if (resources.get(ResourceType.Tincture).available(1)) {
		mods.push({source: PotencyModifierType.POT, damageFactor: 1, critFactor: 0, dhFactor: 0});
	}

	// starry muse
	if (resources.get(ResourceType.StarryMuse).available(1)) {
		mods.push({source: PotencyModifierType.STARRY, damageFactor: 1.05, critFactor: 0, dhFactor: 0});
	}

	// hammer autocrit/dh
	if (aspect === Aspect.Hammer) {
		mods.push({source: PotencyModifierType.HAMMER, damageFactor: 1, critFactor: 1.0, dhFactor: 1.0});
	}

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, damageFactor: 1.33, critFactor: 0, dhFactor: 0});
	}

	// ui1
	let ui = resources.get(ResourceType.UmbralIce);
	if (ui.availableAmount() === 1) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI1, damageFactor: 0.9, critFactor: 0, dhFactor: 0});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI1, damageFactor: 1, critFactor: 0, dhFactor: 0});
	}
	// ui2
	else if (ui.availableAmount() === 2) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI2, damageFactor: 0.8, critFactor: 0, dhFactor: 0});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI2, damageFactor: 1, critFactor: 0, dhFactor: 0});
	}
	// ui3
	else if (ui.availableAmount() === 3) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI3, damageFactor: 0.7, critFactor: 0, dhFactor: 0});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI3, damageFactor: 1, critFactor: 0, dhFactor: 0});
	}

	// af1
	let af = resources.get(ResourceType.AstralFire);
	if (af.availableAmount() === 1) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF1, damageFactor: 0.9, critFactor: 0, dhFactor: 0});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF1, damageFactor: 1.4, critFactor: 0, dhFactor: 0});
		}
	}
	// af2
	else if (af.availableAmount() === 2) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF2, damageFactor: 0.8, critFactor: 0, dhFactor: 0});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF2, damageFactor: 1.6, critFactor: 0, dhFactor: 0});
		}
	}
	// af3
	else if (af.availableAmount() === 3) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF3, damageFactor: 0.7, critFactor: 0, dhFactor: 0});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF3, damageFactor: 1.8, critFactor: 0, dhFactor: 0});
		}
	}

	return mods;
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

		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) totalDamageFactor *= props.tincturePotencyMultiplier;
			else totalDamageFactor *= m.damageFactor;
		});

		if (props.includePartyBuffs && this.snapshotTime) {
			controller.game.getPartyBuffs(this.snapshotTime).forEach(buff => {
				totalDamageFactor *= buff.damageFactor;
				totalCritFactor += buff.critFactor ?? 0;
				totalDhFactor += buff.dhFactor ?? 0;
			});
		}

		let amt = this.base * this.#calculatePotencyModifier(totalDamageFactor, totalCritFactor, totalDhFactor)
		if (this.aspect === Aspect.Hammer) amt *= this.#calculateAutoCDHModifier(totalCritFactor, totalDhFactor)
		return amt;
	}

	getPartyBuffs() {
		return (this.snapshotTime) ? [...controller.game.getPartyBuffs(this.snapshotTime).keys()] : [];
	}

	resolve(displayTime: number) {
		if (this.base < 1) {
			console.warn(this);
		}
		console.assert(this.snapshotTime !== undefined);
		console.assert(this.applicationTime === undefined, this.sourceSkill);
		this.applicationTime = displayTime;
	}

	hasResolved() { return this.applicationTime !== undefined; }

	hasHitBoss(untargetable: (displayTime: number) => boolean) {
		return this.applicationTime !== undefined && !untargetable(this.applicationTime);
	}

	hasSnapshotted() { return this.snapshotTime !== undefined; }

	#calculatePotencyModifier(damageFactor: number, critBonus: number, dhBonus: number) {
		const critStat = this.config.criticalHit;
		const dhStat = this.config.directHit;
		const det = this.config.determination;

		const base = this.#calculateDamage(critStat, dhStat, det, 1, 0, 0);
		const buffed = this.#calculateDamage(critStat, dhStat, det, damageFactor, critBonus, dhBonus);

		return buffed / base;
	}

	#calculateAutoCDHModifier(critBonus: number, dhBonus: number) {
		const base = this.#calculateDamage(controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, critBonus, dhBonus);
		const buffed = this.#calculateDamage(controller.gameConfig.criticalHit, controller.gameConfig.directHit, controller.gameConfig.determination, 1, 1+critBonus, 1+dhBonus);

		return buffed / base;
	}

	#calculateDamage(crit: number, dh: number, det: number, damageFactor: number, critBonus: number, dhBonus: number) {
		let modifier = damageFactor;

		const critRate = (critBonus >= 1) ? critBonus : this.#criticalHitRate(crit) + critBonus;
		const dhRate = (critBonus >= 1) ? dhBonus : this.#directHitRate(dh) + dhBonus;
		const critDamageMult =  this.#criticalHitStrength(crit);

		const autoCDH = critRate >= 1 && dhRate >= 1;
		const critMod = critRate > 1 ? 1 + ((critRate - 1) * critDamageMult) : 1;
		const dhMod = dhRate > 1 ? 1 + ((dhRate - 1) * 1.25) : 1;
		const clampedCritRate = critRate > 1 ? 1 : critRate;
		const clampedDHRate   = dhRate   > 1 ? 1 : dhRate;

		if (autoCDH) 
			modifier *= (1 + this.#autoMultiDet(det) + this.#autoMultiDH(dh));
		else
			modifier *= (1 + this.#autoMultiDet(det));

		const critDamage = modifier * critMod * critDamageMult;
		const dhDamage = modifier * 1.25 * dhMod;
		const critDHDamage = critDamage * 1.25 * dhMod;
		const critDHRate = clampedCritRate * clampedDHRate;
		const normalRate = 1 - clampedCritRate - clampedDHRate + critDHRate;

		return modifier * normalRate + critDamage * (clampedCritRate-critDHRate) + dhDamage * (clampedDHRate-critDHRate) + critDHDamage * critDHRate; 
	}

	#criticalHitRate(crit: number) {
		return (Math.floor(200 * (crit-420) / 2780) + 50) * 0.001;
	}

	#criticalHitStrength(crit: number) {
		return (Math.floor(200 * (crit-420) / 2780) + 1400) * 0.001;
	}

	#directHitRate(dh: number) {
		return Math.floor(550 * (dh-420) / 2780) * 0.001;
	}

	#autoMultiDH(dh: number) {
		return Math.floor(140 * (dh-420) / 2780) * 0.001;
	}

	#autoMultiDet(det: number) {
		return Math.floor(140 * (det-440) / 2780) * 0.001;
	}
}