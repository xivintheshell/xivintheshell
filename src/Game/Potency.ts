import {Aspect, Debug, ResourceType, SkillName} from "./Common";
import {ResourceState} from "./Resources";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT
}

export type PotencyModifier = {
	factor: number,
	source: PotencyModifierType
}

export function getPotencyModifiersFromResourceState(resources: ResourceState, aspect: Aspect) : PotencyModifier[] {
	let mods : PotencyModifier[] = [];
	// pot
	if (resources.get(ResourceType.Tincture).available(1)) {
		mods.push({source: PotencyModifierType.POT, factor: 1});
	}

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, factor: 1.21});
	}

	// ui1
	let ui = resources.get(ResourceType.UmbralIce);
	if (ui.availableAmount() === 1) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI1, factor: 0.9});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI1, factor: 1});
	}
	// ui2
	else if (ui.availableAmount() === 2) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI2, factor: 0.8});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI2, factor: 1});
	}
	// ui3
	else if (ui.availableAmount() === 3) {
		if (aspect === Aspect.Fire) mods.push({source: PotencyModifierType.UI3, factor: 0.7});
		else if (aspect === Aspect.Ice) mods.push({source: PotencyModifierType.UI3, factor: 1});
	}

	// af1
	let af = resources.get(ResourceType.AstralFire);
	if (af.availableAmount() === 1) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF1, factor: 0.9});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF1, factor: 1.4});
		}
	}
	// af2
	else if (af.availableAmount() === 2) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF2, factor: 0.8});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF2, factor: 1.6});
		}
	}
	// af3
	else if (af.availableAmount() === 3) {
		if (aspect === Aspect.Ice) {
			mods.push({source: PotencyModifierType.AF3, factor: 0.7});
		}  else if (aspect === Aspect.Fire) {
			mods.push({source: PotencyModifierType.AF3, factor: 1.8});
		}
	}

	return mods;
}

export type InitialPotencyProps = {
	sourceTime: number,
	sourceSkill: SkillName,
	aspect: Aspect,
	basePotency: number,
	snapshotTime?: number,
	description?: string,
}

export class Potency {
	sourceTime: number;
	sourceSkill: SkillName;
	aspect: Aspect;
	description?: string;
	base: number;
	snapshotTime?: number;
	applicationTime?: number;
	modifiers: PotencyModifier[] = [];

	constructor(props: InitialPotencyProps) {
		this.sourceTime = props.sourceTime;
		this.sourceSkill = props.sourceSkill;
		this.aspect = props.aspect;
		this.base = props.basePotency;
		this.snapshotTime = props.snapshotTime;
		this.description = props.description;
	}

	getAmount(props: {tincturePotencyMultiplier: number}) {
		let potency = this.base;
		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) potency *= props.tincturePotencyMultiplier;
			else potency *= m.factor;
		});
		return potency;
	}

	resolve(t: number) {
		console.assert(this.snapshotTime !== undefined);
		console.assert(this.applicationTime === undefined);
		this.applicationTime = t;
	}

	hasResolved() { return this.applicationTime!==undefined; }

	hasSnapshotted() { return this.snapshotTime !== undefined; }
}