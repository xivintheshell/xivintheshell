import { LevelSync, ResourceType } from "./Common";

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

		const critRate = (critBonus >= 1) ? critBonus : XIVMath.#criticalHitRate(level, crit) + critBonus;
		const dhRate = (critBonus >= 1) ? dhBonus : XIVMath.#directHitRate(level, dh) + dhBonus;
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

	static #autoMultiDet(level: LevelSync, det: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor(140 * (det-subStat) / div) * 0.001;
	}

	static dotPotency(level: LevelSync, spellSpeed: number, basePotency: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		const dotStrength = (1000 + Math.floor((spellSpeed - subStat) * 130 / div)) * 0.001;
		return basePotency * dotStrength;
	}

	// Return the speed modifier granted by a specific buff.
	// For example, for the 15% reduction granted by Circle of Power (which we just call Ley Lines),
	// return the integer 15.
	static getSpeedModifier(buff: ResourceType) {
		if (buff === ResourceType.LeyLines) {
			return 15;
		}
		if (buff === ResourceType.Inspiration) {
			return 25;
		}
		console.error("No speed modifier for buff: ", buff);
		return 0;
	}

	static preTaxGcd(level: LevelSync, spellSpeed: number, baseGCD: number, speedBuff?: ResourceType) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		// let us pray we never need to stack haste buffs
		let subtractSpeed = speedBuff === undefined ? 0 : XIVMath.getSpeedModifier(speedBuff);

		return Math.floor(Math.floor(Math.floor((100-subtractSpeed)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	static preTaxCastTime(level: LevelSync, spellSpeed: number, baseCastTime: number, speedBuff?: ResourceType) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		let subtractSpeed = speedBuff === undefined ? 0 : XIVMath.getSpeedModifier(speedBuff);
		return Math.floor(Math.floor(Math.floor((100-subtractSpeed)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseCastTime)/1000)/100)*100/100)/1000;
	}

	static afterFpsTax(fps: number, baseDuration: number) {
		return Math.floor(baseDuration * fps + 1) / fps;
	}
}