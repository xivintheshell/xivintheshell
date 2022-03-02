import { ResourceType } from "./Common"

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
		this.recastTime = 1;
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
		this.recastTime *= other.recastTime;
		this.manaCostFire *= other.manaCostFire;
		this.manaCostIce *= other.manaCostIce;
		this.CH *= other.CH;
		this.DH *= other.DH;

		this.manaRegen += other.manaRegen;
	}
	/*
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
		ret.recastTime = this.recastTime;
		ret.manaCostFire = this.manaCostFire;
		ret.manaCostIce = this.manaCostIce;
		ret.CH = this.CH;
		ret.DH = this.DH;
		ret.manaRegen = this. manaRegen;
		return ret;
	}
	*/

	static base()
	{
		let ret = new StatsModifier();
		ret.manaRegen = 400;
		return ret;
	}

	static fromResourceState(resources)
	{
		let base = StatsModifier.base();
		let modifiers = [];

		// umbral ice
		let ui = resources.get(ResourceType.UmbralIce);
		let uiMod = new StatsModifier();
		if (ui.currentValue === 1) {
			uiMod.manaRegen = 2800;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.9;
			uiMod.manaCostIce = 0.75;
		} else if (ui.currentValue === 2) {
			uiMod.manaRegen = 4300;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.8;
			uiMod.manaCostIce = 0.5;
		} else if (ui.currentValue === 3) {
			uiMod.manaRegen = 5800;
			uiMod.manaCostFire = 0;
			uiMod.damageFire = 0.7;
			uiMod.manaCostIce = 0;
			uiMod.castTimeFire = 0.5;
		}
		modifiers.push(uiMod);

		// astral fire
		let af = resources.get(ResourceType.AstralFire);
		let afMod = new StatsModifier();
		if (af.currentValue === 1) {
			afMod.manaRegen = -400;
			afMod.manaCostFire = 2;
			afMod.damageFire = 1.4;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.9;
		} else if (af.currentValue === 2) {
			afMod.manaRegen = -400;
			afMod.manaCostFire = 2;
			afMod.damageFire = 1.6;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.8;
		} else if (af.currentValue === 3) {
			afMod.manaRegen = -400;
			afMod.manaCostFire = 2;
			afMod.damageFire = 1.8;
			afMod.manaCostIce = 0;
			afMod.damageIce = 0.7;
			afMod.castTimeIce = 0.5;
		}
		modifiers.push(afMod);

		// ley lines
		let ll = resources.get(ResourceType.LeyLines);
		let llMod = new StatsModifier();
		if (ll.available(1))
		{
			llMod.castTimeBase = 0.85;
			llMod.recastTime = 0.85;
		}
		modifiers.push(llMod);

		//======== combine and return ========

		modifiers.forEach(mod=>{ base.apply(mod); });
		return base;
	}
};