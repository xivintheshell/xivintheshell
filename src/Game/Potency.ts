import {controller} from "../Controller/Controller";
import { Calculations } from "./Calculations";
import {Aspect, BuffType, Debug, ResourceType, SkillName} from "./Common";
import { GameConfig } from "./GameConfig";
import {ResourceState} from "./Resources";
import { TraitName } from "./Traits";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, PARTY
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

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		const enochianModifier = 
			(controller.game.traitsList.UnlockedTrait(TraitName.EnhancedEnochianIV) && 1.33) ||
			(controller.game.traitsList.UnlockedTrait(TraitName.EnhancedEnochianIII) && 1.25) ||
			(controller.game.traitsList.UnlockedTrait(TraitName.EnhancedEnochianII) && 1.15) ||
			1.10;

		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, damageFactor: enochianModifier, critFactor: 0, dhFactor: 0});
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

		return this.base * this.#calculatePotencyModifier(totalDamageFactor, totalCritFactor, totalDhFactor);
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
		const level = this.config.level;
		const critStat = this.config.criticalHit;
		const dhStat = this.config.directHit;

		const base = Calculations.calculateDamage(level, critStat, dhStat, 1, 0, 0);
		const buffed = Calculations.calculateDamage(level, critStat, dhStat, damageFactor, critBonus, dhBonus);

		return buffed / base;
	}
}