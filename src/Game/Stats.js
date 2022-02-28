export class StatsModifier
{
	constructor()
	{
		// additive fractions
		this.damage = 0;
		this.CH = 0;
		this.DH = 0;
		this.castTime = 0;

		// multiplicative coefficients
		this.manaCost = 1;

		// additive constant
		this.manaRegen = 0;
	}

	// StatsModifier -> ()
	apply(other)
	{
		this.damage += other.damage;
		this.CH += other.CH;
		this.DH += other.DH;
		this.castTime += other.castTime;

		this.manaCost *= other.manaCost;

		this.manaRegen += other.manaRegen;
	}
	// () -> StatsModifier
	clone()
	{
		var ret = new StatsModifier();
		ret.damage = this.damage;
		ret.CH = this.CH;
		ret.DH = this.DH;
		ret.castTime = this.castTime;
		ret.manaCost = this.manaCost;
		ret.manaRegen = this. manaRegen;
		return ret;
	}

	static __baseInstance = null;
	static base()
	{
		if (!this.__baseInstance)
		{
			this.__baseInstance = new this();
			// additive fractions
			this.__baseInstance.damage = 1;
			this.__baseInstance.CH = 1;
			this.__baseInstance.DH = 1;
			this.__baseInstance.castTime = 1;
			// multiplicative coefficients
			this.__baseInstance.manaCost = 1;
			// additive constant
			this.__baseInstance.manaRegen = 0;
		}
		return this.__baseInstance.clone();
	}
};