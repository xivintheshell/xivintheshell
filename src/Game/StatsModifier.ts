import {ResourceType} from "./Common"
import {ResourceState} from "./Resources";
import {ShellJob, ShellInfo} from "../Controller/Common";

export class StatsModifier
{
	castTimeFire = 1;
	castTimeIce = 1;
	manaCostFire = 1;
	manaCostIce = 1;
	manaRegen = 0;
	uhConsumption = 0;

	reset()
	{
		this.castTimeFire = 1;
		this.castTimeIce = 1;
		this.manaCostFire = 1;
		this.manaCostIce = 1;

		// additive constant
		this.manaRegen = 0;
		this.uhConsumption = 0;
	}

	// StatsModifier -> ()
	apply(other: StatsModifier)
	{
		this.castTimeFire *= other.castTimeFire;
		this.castTimeIce *= other.castTimeIce;
		this.manaCostFire *= other.manaCostFire;
		this.manaCostIce *= other.manaCostIce;

		this.manaRegen += other.manaRegen;
		this.uhConsumption += other.uhConsumption;
	}

	static base()
	{
		let ret = new StatsModifier();
		ret.manaRegen = 200;
		return ret;
	}

	static fromResourceState(resources: ResourceState)
	{
		let base = StatsModifier.base();
		let modifiers = [];

		if (ShellInfo.job !== ShellJob.BLM) {
			return base;
		}

		// umbral ice
		let ui = resources.get(ResourceType.UmbralIce);
		let uiMod = new StatsModifier();
		if (ui.availableAmount() > 0) {
			uiMod.manaCostFire = 0;
			uiMod.manaCostIce = 0;
			if (ui.availableAmount() === 3)
				uiMod.castTimeFire = 0.5;
		} 
		modifiers.push(uiMod);

		// astral fire & umbral hearts
		let af = resources.get(ResourceType.AstralFire);
		let uhStacks = resources.get(ResourceType.UmbralHeart).availableAmount();
		let afMod = new StatsModifier();
		if (af.availableAmount() === 1) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.manaCostIce = 0;
		} else if (af.availableAmount() === 2) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.manaCostIce = 0;
		} else if (af.availableAmount() === 3) {
			afMod.manaRegen = -200;
			afMod.uhConsumption = uhStacks > 0 ? 1 : 0;
			afMod.manaCostFire = uhStacks > 0 ? 1 : 2;
			afMod.manaCostIce = 0;
			afMod.castTimeIce = 0.5;
		}
		modifiers.push(afMod);

		//======== combine and return ========

		modifiers.forEach(mod=>{ base.apply(mod); });
		return base;
	}
}