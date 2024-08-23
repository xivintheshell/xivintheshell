import { LevelSync } from "./Common";

export class Calculations {
    static readonly MainStatBase = new Map(
        [[LevelSync.lvl70, 292],
         [LevelSync.lvl80, 340],
         [LevelSync.lvl90, 390],
         [LevelSync.lvl100, 440]]
    );

    static getMainstatBase(level: LevelSync) {
        return Calculations.MainStatBase.get(level) ?? 440;
    }

    static readonly SubstatBase = new Map(
        [[LevelSync.lvl70, 364],
         [LevelSync.lvl80, 380],
         [LevelSync.lvl90, 400],
         [LevelSync.lvl100, 420]]
    );

    static getSubstatBase(level: LevelSync) {
        return Calculations.SubstatBase.get(level) ?? 420;
    }

    static readonly StatDiv = new Map(
        [[LevelSync.lvl70, 900],
         [LevelSync.lvl80, 1300],
         [LevelSync.lvl90, 1900],
         [LevelSync.lvl100, 2780]]
    );

    static getStatDiv(level: LevelSync) {
        return Calculations.StatDiv.get(level) ?? 2780;
    }

    static calculateDamage(level: LevelSync, crit: number, dh: number, damageFactor: number, critBonus: number, dhBonus: number) {
		let modifier = damageFactor;
				
		let critRate = Calculations.#criticalHitRate(level, crit) + critBonus;
		let dhRate = Calculations.#directHitRate(level, dh) + dhBonus;

		const critDHRate = critRate * dhRate;
		const normalRate = 1 - critRate - dhRate + critDHRate;
		
		const critDamage = modifier * Calculations.#criticalHitStrength(level, crit);
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


    static doTStrength(level: LevelSync, spellSpeed: number) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);
		return (1000 + Math.floor((spellSpeed - subStat) * 130 / div)) * 0.001;
	}

	// 7/22/24: about the difference between adjustedGCD and adjustedCastTime, see scripts/sps-LL/test.js
	static adjustedGCD(level: LevelSync, spellSpeed: number, hasLL: boolean) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);

		let baseGCD = 2.5;
		let subtractLL = hasLL ? 15 : 0;

		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	static adjustedCastTime(level: LevelSync, spellSpeed: number, inCastTime : number, hasLL: boolean) {
        const subStat = this.getSubstatBase(level);
        const div = this.getStatDiv(level);

		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(spellSpeed-subStat)/div+1000))*(1000*inCastTime)/1000)/100)*100/100)/1000;
	}
}