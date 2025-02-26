import { LevelSync } from "./Common";

export class XIVMath {
	static getMainstatBase(level: LevelSync) {
		switch (level) {
			case LevelSync.lvl70:
				return 292;
			case LevelSync.lvl80:
				return 340;
			case LevelSync.lvl90:
				return 390;
			case LevelSync.lvl100:
				return 440;
		}
	}

	static getSubstatBase(level: LevelSync) {
		switch (level) {
			case LevelSync.lvl70:
				return 364;
			case LevelSync.lvl80:
				return 380;
			case LevelSync.lvl90:
				return 400;
			case LevelSync.lvl100:
				return 420;
		}
	}

	static getStatDiv(level: LevelSync) {
		switch (level) {
			case LevelSync.lvl70:
				return 900;
			case LevelSync.lvl80:
				return 1300;
			case LevelSync.lvl90:
				return 1900;
			case LevelSync.lvl100:
				return 2780;
		}
	}

	static calculateDamage(
		level: LevelSync,
		crit: number,
		dh: number,
		det: number,
		damageFactor: number,
		critBonus: number,
		dhBonus: number,
	) {
		let modifier = damageFactor;

		const critRate =
			critBonus >= 1
				? critBonus
				: critBonus < 0
					? 0
					: XIVMath.#criticalHitRate(level, crit) + critBonus;
		const dhRate =
			dhBonus >= 1 ? dhBonus : dhBonus < 0 ? 0 : XIVMath.#directHitRate(level, dh) + dhBonus;

		// If this ability can't crit or direct hit, no need to calculate further modifications
		if (critRate === 0 && dhRate === 0) {
			return modifier;
		}
		const critDamageMult = XIVMath.#criticalHitStrength(level, crit);

		const autoCDH = critRate >= 1 && dhRate >= 1;
		const critMod = critRate > 1 ? 1 + (critRate - 1) * critDamageMult : 1;
		const dhMod = dhRate > 1 ? 1 + (dhRate - 1) * 1.25 : 1;
		const clampedCritRate = critRate > 1 ? 1 : critRate;
		const clampedDHRate = dhRate > 1 ? 1 : dhRate;

		if (autoCDH)
			modifier *= 1 + XIVMath.#autoMultiDet(level, det) + XIVMath.#autoMultiDH(level, dh);
		else modifier *= 1 + XIVMath.#autoMultiDet(level, det);

		const critDamage = modifier * critMod * critDamageMult;
		const dhDamage = modifier * 1.25 * dhMod;
		const critDHDamage = critDamage * 1.25 * dhMod;
		const critDHRate = clampedCritRate * clampedDHRate;
		const normalRate = 1 - clampedCritRate - clampedDHRate + critDHRate;

		return (
			modifier * normalRate +
			critDamage * (clampedCritRate - critDHRate) +
			dhDamage * (clampedDHRate - critDHRate) +
			critDHDamage * critDHRate
		);
	}

	static #criticalHitRate(level: LevelSync, crit: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return (Math.floor((200 * (crit - subStat)) / div) + 50) * 0.001;
	}

	static #criticalHitStrength(level: LevelSync, crit: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return (Math.floor((200 * (crit - subStat)) / div) + 1400) * 0.001;
	}

	static #directHitRate(level: LevelSync, dh: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor((550 * (dh - subStat)) / div) * 0.001;
	}

	static #autoMultiDH(level: LevelSync, dh: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor((140 * (dh - subStat)) / div) * 0.001;
	}

	// https://www.akhmorning.com/allagan-studies/stats/det/#explaining-determination
	static #autoMultiDet(level: LevelSync, det: number) {
		const subStat = this.getMainstatBase(level);
		const div = this.getStatDiv(level);
		return Math.floor((140 * (det - subStat)) / div) * 0.001;
	}

	static overtimePotency(level: LevelSync, speed: number, basePotency: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		const effectStrength = (1000 + Math.floor(((speed - subStat) * 130) / div)) * 0.001;
		return basePotency * effectStrength;
	}

	static mpTick(level: LevelSync, pie: number) {
		const mainStat = this.getMainstatBase(level);
		const div = this.getStatDiv(level);
		return 200 + Math.floor((150 * (pie - mainStat)) / div);
	}

	/**
	 * Returns the pre-tax GCD given the player's current stats and base GCD length
	 * @param level The player's level
	 * @param speed The player's applicable speed stat
	 * @param baseGCD The base time of the GCD
	 * @param speedModifier Any speed modifiers applied, as an integer reduction to the total time.
	 * 						For example, for the 15% reduction granted by Circle of Power
	 * 						(which we just call Ley Lines), return the integer 15.
	 * @returns The GCD prior to any FPS tax
	 */
	static preTaxGcd(level: LevelSync, speed: number, baseGCD: number, speedModifier?: number) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);
		let ceil = Math.ceil(((subStat - speed) * 130) / div);
		let pts = Math.floor(baseGCD * (1000 + ceil));
		return Math.floor(((100 - (speedModifier ?? 0)) * pts) / 1000) / 100;
	}

	// DO NOT USE except to support legacy timelines. Arguments are the same as for preTaxGcd
	// this formula is rounded incorrectly, as a result when there is haste buff the resulting GCD
	// may be inaccurate by up to 0.01s
	static preTaxGcdLegacy(
		level: LevelSync,
		speed: number,
		baseGCD: number,
		speedModifier?: number,
	) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		return (
			Math.floor(
				(Math.floor(
					(Math.floor(((100 - (speedModifier ?? 0)) * 100) / 100) *
						Math.floor(
							((2000 - Math.floor((130 * (speed - subStat)) / div + 1000)) *
								(1000 * baseGCD)) /
								10000,
						)) /
						100,
				) *
					100) /
					100,
			) / 100
		);
	}

	/**
	 * The pre-tax cast time of an action, given the player's current stats and base cast time
	 * @param level The player's level
	 * @param speed The player's applicable speed stat
	 * @param baseCastTime The base cast time of the action
	 * @param speedModifier Any speed modifiers applied, as an integer reduction to the total time.
	 * 						For example, for the 15% reduction granted by Circle of Power
	 * 						(which we just call Ley Lines), return the integer 15.
	 * @returns The cast time prior to any FPS or caster tax
	 */
	static preTaxCastTime(
		level: LevelSync,
		speed: number,
		baseCastTime: number,
		speedModifier?: number,
	) {
		const subStat = this.getSubstatBase(level);
		const div = this.getStatDiv(level);

		return (
			Math.floor(
				(Math.floor(
					(Math.floor(((100 - (speedModifier ?? 0)) * 100) / 100) *
						Math.floor(
							((2000 - Math.floor((130 * (speed - subStat)) / div + 1000)) *
								(1000 * baseCastTime)) /
								1000,
						)) /
						100,
				) *
					100) /
					100,
			) / 1000
		);
	}

	static afterFpsTax(fps: number, baseDuration: number) {
		return Math.floor(baseDuration * fps + 1) / fps;
	}
}
