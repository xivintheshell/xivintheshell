import { LevelSync } from "./Common";

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

    static calculateDamage(level: LevelSync, crit: number, dh: number, damageFactor: number, critBonus: number, dhBonus: number) {
		let modifier = damageFactor;
				
		let critRate = XIVMath.#criticalHitRate(level, crit) + critBonus;
		let dhRate = XIVMath.#directHitRate(level, dh) + dhBonus;

		const critDHRate = critRate * dhRate;
		const normalRate = 1 - critRate - dhRate + critDHRate;
		
		const critDamage = modifier * XIVMath.#criticalHitStrength(level, crit);
		const dhDamage = modifier * 1.25;
		const critDHDamage = critDamage * 1.25;

		return modifier * normalRate + critDamage * (critRate-critDHRate) + dhDamage * (dhRate-critDHRate) + critDHDamage * critDHRate; 
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


    static dotPotency(level: LevelSync, spellSpeed: number, basePotency: number) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);
        const dotStrength = (1000 + Math.floor((spellSpeed - subStat) * 130 / div)) * 0.001;
		return basePotency * dotStrength;
	}

    static preTaxGcd(level: LevelSync, spellSpeed: number, hasLL: boolean) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);

		let baseGCD = 2.5;
		let subtractLL = hasLL ? 15 : 0;

		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	static preTaxCastTime(level: LevelSync, spellSpeed: number, baseCastTime: number, hasLL: boolean) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);

		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseCastTime)/1000)/100)*100/100)/1000;
	}

    static afterFpsTax(fps: number, baseDuration: number) {
        return Math.floor(baseDuration * fps + 1) / fps;
    }
}