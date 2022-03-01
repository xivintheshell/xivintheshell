export class StatsModifier
{
	constructor()
	{
		this.reset();
	}

	reset()
	{
		this.damageBase = 1;
		this.damageFire = 1;
		this.damageIce = 1;
		this.castTimeBase = 1;
		this.castTimeFire = 1;
		this.castTimeIce = 1;
		this.manaCostFire = 1;
		this.manaCostIce = 1;
		this.CH = 1;
		this.DH = 1;

		// additive constant
		this.manaRegen = 0;
	}

	// StatsModifier -> ()
	apply(other)
	{
		this.damageBase *= other.damageBase;
		this.damageFire *= other.damageFire;
		this.damageIce *= other.damageIce;
		this.castTimeBase *= other.castTimeBase;
		this.castTimeFire *= other.castTimeFire;
		this.castTimeIce *= other.castTimeIce;
		this.manaCostFire *= other.manaCostFire;
		this.manaCostIce *= other.manaCostIce;
		this.CH *= other.CH;
		this.DH *= other.DH;

		this.manaRegen += other.manaRegen;
	}
	// () -> StatsModifier
	clone()
	{
		var ret = new StatsModifier();
		ret.damageBase = this.damageBase;
		ret.damageFire = this.damageFire;
		ret.damageIce = this.damageIce;
		ret.castTimeBase = this.castTimeBase;
		ret.castTimeFire = this.castTimeFire;
		ret.castTimeIce = this.castTimeIce;
		ret.manaCostFire = this.manaCostFire;
		ret.manaCostIce = this.manaCostIce;
		ret.CH = this.CH;
		ret.DH = this.DH;
		ret.manaRegen = this. manaRegen;
		return ret;
	}

	static base()
	{
		let ret = new StatsModifier();
		ret.manaRegen = 400;
		return ret;
	}
};