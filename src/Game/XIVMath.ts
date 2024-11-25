import { LevelSync, ResourceType } from "./Common";
import { Traits, TraitName } from "./Traits";

export class XIVMath {
	static getMainstatBase(level: LevelSync) {
		switch(level) {
			case LevelSync.lvl70: return 292;
			case LevelSync.lvl80: return 340;
			case LevelSync.lvl90: return 390;
			case LevelSync.lvl100: return 440;
		}
	}

	static getSubstatBase(level: LevelSync) {
		switch(level) {
			case LevelSync.lvl70: return 364;
			case LevelSync.lvl80: return 380;
			case LevelSync.lvl90: return 400;
			case LevelSync.lvl100: return 420;
		}
	}

	static getStatDiv(level: LevelSync) {
		switch(level) {
			case LevelSync.lvl70: return 900;
			case LevelSync.lvl80: return 1300;
			case LevelSync.lvl90: return 1900;
			case LevelSync.lvl100: return 2780;
		}
	}

	static calculateDamage(level: LevelSync, crit: number, dh: number, det: number, damageFactor: number, critBonus: number, dhBonus: number) {
		let modifier = damageFactor;

		const critRate = (critBonus >= 1) ? critBonus : 
			(critBonus < 0) ? 0 : 
			XIVMath.#criticalHitRate(level, crit) + critBonus;
		const dhRate = (dhBonus >= 1) ? dhBonus :
			(dhBonus < 0) ? 0 :
			XIVMath.#directHitRate(level, dh) + dhBonus;

		// If this ability can't crit or direct hit, no need to calculate further modifications
		if (critRate === 0 && dhRate === 0) { return modifier }
		const critDamageMult =  XIVMath.#criticalHitStrength(level, crit);

		const autoCDH = critRate >= 1 && dhRate >= 1;
		const critMod = critRate > 1 ? 1 + ((critRate - 1) * critDamageMult) : 1;
		const dhMod = dhRate > 1 ? 1 + ((dhRate - 1) * 1.25) : 1;
		const clampedCritRate = critRate > 1 ? 1 : critRate;
		const clampedDHRate   = dhRate   > 1 ? 1 : dhRate;

		if (autoCDH)
			modifier *= (1 + XIVMath.#autoMultiDet(level, det) + XIVMath.#autoMultiDH(level, dh));
		else
			modifier *= (1 + XIVMath.#autoMultiDet(level, det));

		const critDamage = modifier * critMod * critDamageMult;
		const dhDamage = modifier * 1.25 * dhMod;
		const critDHDamage = critDamage * 1.25 * dhMod;
		const critDHRate = clampedCritRate * clampedDHRate;
		const normalRate = 1 - clampedCritRate - clampedDHRate + critDHRate;

		return modifier * normalRate + critDamage * (clampedCritRate-critDHRate) + dhDamage * (clampedDHRate-critDHRate) + critDHDamage * critDHRate;
	}

	static #criticalHitRate(level: LevelSync, crit: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return (Math.floor(200 * (crit-subStat) / div) + 50) * 0.001;
	}

	static #criticalHitStrength(level: LevelSync, crit: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return (Math.floor(200 * (crit-subStat) / div) + 1400) * 0.001;
	}

	static #directHitRate(level: LevelSync, dh: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor(550 * (dh-subStat) / div) * 0.001;
	}

	static #autoMultiDH(level: LevelSync, dh: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor(140 * (dh-subStat) / div) * 0.001;
	}

	// https://www.akhmorning.com/allagan-studies/stats/det/#explaining-determination
	static #autoMultiDet(level: LevelSync, det: number) {
		const subStat = this.getMainstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor(140 * (det-subStat) / div) * 0.001;
	}

	static dotPotency(level: LevelSync, speed: number, basePotency: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		const dotStrength = (1000 + Math.floor((speed - subStat) * 130 / div)) * 0.001;
		return basePotency * dotStrength;
	}

	// Return the speed modifier granted by a specific buff.
	// For example, for the 15% reduction granted by Circle of Power (which we just call Ley Lines),
	// return the integer 15.
	static getSpeedModifier(buff: ResourceType, level: LevelSync) {
		if (buff === ResourceType.LeyLines) {
			return 15;
		}
		if (buff === ResourceType.Inspiration) {
			return 25;
		}
		if (buff === ResourceType.Fuka) {
			return Traits.hasUnlocked(TraitName.EnhancedFugetsuAndFuka, level) ? 13 : 10;
		}
		console.error("No speed modifier for buff: ", buff);
		return 0;
	}

	static preTaxGcd(level: LevelSync, speed: number, baseGCD: number, speedBuff?: ResourceType) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		// let us pray we never need to stack haste buffs
		let subtractSpeed = speedBuff === undefined ? 0 : XIVMath.getSpeedModifier(speedBuff, level);

		return Math.floor(Math.floor(Math.floor((100-subtractSpeed)*100/100)*Math.floor((2000-Math.floor(130*(speed-subStat)/div+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	static preTaxCastTime(level: LevelSync, spellSpeed: number, baseCastTime: number, speedBuff?: ResourceType) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		let subtractSpeed = speedBuff === undefined ? 0 : XIVMath.getSpeedModifier(speedBuff, level);
		return Math.floor(Math.floor(Math.floor((100-subtractSpeed)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseCastTime)/1000)/100)*100/100)/1000;
	}

	static afterFpsTax(fps: number, baseDuration: number) {
		return Math.floor(baseDuration * fps + 1) / fps;
	}
}