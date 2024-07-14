import {controller} from "../Controller/Controller";
import {Aspect, BuffType, Debug, ResourceType, SkillName} from "./Common";
import {ResourceState} from "./Resources";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, PARTY
}

export type PotencyModifier = {
	source: PotencyModifierType,
	buffType?: BuffType,
	damageFactor: number,
	critFactor?: number,
	dhFactor?: number,
}

export function getPotencyModifiersFromResourceState(resources: ResourceState, aspect: Aspect) : PotencyModifier[] {
	let mods : PotencyModifier[] = [];
	// pot
	if (resources.get(ResourceType.Tincture).available(1)) {
		mods.push({source: PotencyModifierType.POT, damageFactor: 1});
	}

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, damageFactor: 1.30});
	}

	// ui1
	let ui = resources.get(ResourceType.UmbralIce);
	if (ui.availableAmount() === 1) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI1, damageFactor: 0.9});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI1, damageFactor: 1});
	}
	// ui2
	else if (ui.availableAmount() === 2) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI2, damageFactor: 0.8});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI2, damageFactor: 1});
	}
	// ui3
	else if (ui.availableAmount() === 3) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI3, damageFactor: 0.7});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI3, damageFactor: 1});
	}

	// af1
	let af = resources.get(ResourceType.AstralFire);
	if (af.availableAmount() === 1) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF1, damageFactor: 0.9});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF1, damageFactor: 1.4});
		}
	}
	// af2
	else if (af.availableAmount() === 2) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF2, damageFactor: 0.8});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF2, damageFactor: 1.6});
		}
	}
	// af3
	else if (af.availableAmount() === 3) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF3, damageFactor: 0.7});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF3, damageFactor: 1.8});
		}
	}

	return mods;
}

export type InitialPotencyProps = {
	sourceTime: number,
	sourceSkill: SkillName,
	aspect: Aspect,
	basePotency: number,
	snapshotTime?: number,
	description?: string,
}

export class Potency {
	sourceTime: number; // display time
	sourceSkill: SkillName;
	aspect: Aspect;
	description?: string;
	base: number;
	snapshotTime?: number;
	applicationTime?: number;
	modifiers: PotencyModifier[] = [];

	constructor(props: InitialPotencyProps) {
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

		if (props.includePartyBuffs) {
			controller.game.getPartyBuffs(this.snapshotTime).forEach(buff => {
				totalDamageFactor *= buff.damageFactor;
				totalCritFactor += buff.critFactor ?? 0;
				totalDhFactor += buff.dhFactor ?? 0;
			});
		}

		return this.base * this.#calculatePotencyModifier(totalDamageFactor, totalCritFactor, totalDhFactor);
	}

	getPartyBuffs() {
		return [...controller.game.getPartyBuffs(this.snapshotTime).keys()];
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

	#calculatePotencyModifier(damageBonus?: number, critBonus?: number, dhBonus?: number) {
		const base = this.#calculateDamage(controller.gameConfig.criticalHit, controller.gameConfig.directHit);
		const buffed = this.#calculateDamage(controller.gameConfig.criticalHit, controller.gameConfig.directHit, damageBonus, critBonus, dhBonus);

		return buffed / base;
	}

	#calculateDamage(crit: number, dh: number, damageBonus?: number, critBonus?: number, dhBonus?: number) {
		let modifier = 1;
		if (damageBonus) modifier *= damageBonus;
				
		let critRate = this.#criticalHitRate(crit)
		if (critBonus) critRate += critBonus;
		let dhRate = this.#directHitRate(dh);
		if (dhBonus) dhRate += dhBonus;

		const critDHRate = critRate * dhRate;
		const normalRate = 1 - critRate - dhRate + critDHRate;
		
		const critDamage = modifier * this.#criticalHitStrength(crit);
		const dhDamage = modifier * 1.25;
		const critDHDamage = critDamage * 1.25;

		return modifier * normalRate + critDamage * (critRate-critDHRate) + dhDamage * (dhRate-critDHRate) + critDHDamage * critDHRate; 
	}

	#criticalHitRate(crit: number) {
		return (Math.floor(200 * (crit-420) / 2780) + 50) * 0.001;
	}

	#criticalHitStrength(crit: number) {
		return (Math.floor(200 * (crit-420) / 2780) + 1400) * 0.001;
	}

	#directHitRate(dh: number) {
		return Math.floor(550 * (dh - 420) / 2780) * 0.001;
	}
}