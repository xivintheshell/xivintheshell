import {controller} from "../Controller/Controller";
import {ShellInfo, ShellJob} from "../Controller/Common";
import {XIVMath} from "./XIVMath";
import {Aspect, BuffType, Debug, ResourceType, SkillName} from "./Common";
import {GameConfig} from "./GameConfig";
import {ResourceState} from "./Resources";
import {TraitName, Traits} from "./Traits";

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
	if (ShellInfo.job === ShellJob.PCT && resources.get(ResourceType.StarryMuse).available(1)) {
		mods.push({source: PotencyModifierType.STARRY, damageFactor: 1.05, critFactor: 0, dhFactor: 0});
	}

	// hammer autocrit/dh
	if (aspect === Aspect.Hammer) {
		mods.push({source: PotencyModifierType.HAMMER, damageFactor: 1, critFactor: 1.0, dhFactor: 1.0});
	}

	// eno
	if (ShellInfo.job === ShellJob.BLM && resources.get(ResourceType.Enochian).available(1)) {
		const enochianModifier = 
			(Traits.hasUnlocked(TraitName.EnhancedEnochianIV, controller.game.config.level) && 1.33) ||
			(Traits.hasUnlocked(TraitName.EnhancedEnochianIII, controller.game.config.level) && 1.25) ||
			(Traits.hasUnlocked(TraitName.EnhancedEnochianII, controller.game.config.level) && 1.15) ||
			1.10;

		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, damageFactor: enochianModifier, critFactor: 0, dhFactor: 0});
	}

	if (ShellInfo.job === ShellJob.BLM) {
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