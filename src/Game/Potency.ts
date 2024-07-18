import {controller} from "../Controller/Controller";
import { Buff } from "./Buffs";
import {Aspect, BuffName, Debug, ResourceType, SkillName} from "./Common";
import {ResourceState} from "./Resources";

export const enum PotencyModifierType {
	AF3, AF2, AF1, UI3, UI2, UI1, ENO, POT, PARTY
}

export type PotencyModifier = {
	source: PotencyModifierType,
	factor: number
}

export function getPotencyModifiersFromResourceState(resources: ResourceState, aspect: Aspect) : PotencyModifier[] {
	let mods : PotencyModifier[] = [];
	// pot
	if (resources.get(ResourceType.Tincture).available(1)) {
		mods.push({source: PotencyModifierType.POT, factor: 1});
	}

	// eno
	if (resources.get(ResourceType.Enochian).available(1)) {
		if (!Debug.noEnochian) mods.push({source: PotencyModifierType.ENO, factor: 1.30});
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

	const buffMarkers = controller.timeline.getBuffMarkers();
	buffMarkers.filter(marker => {
		const adjustedTime = resources.game.time - resources.game.config.countdown;
		return marker.time <= adjustedTime && (marker.time + marker.duration) >= adjustedTime;
	}).forEach(marker => {
		const buff = new Buff(marker.description as BuffName);
		mods.push({source: PotencyModifierType.PARTY, factor: buff.info.potencyFactor})
	})
	
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
	sourceTime: number; // display time
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

	getAmount(props: {
		tincturePotencyMultiplier: number,
		includePartyBuffs: boolean
	}) {
		let potency = this.base;
		this.modifiers.forEach(m=>{
			if (m.source===PotencyModifierType.POT) potency *= props.tincturePotencyMultiplier;
			else if (m.source===PotencyModifierType.PARTY) potency *= props.includePartyBuffs ? m.factor : 1;
			else potency *= m.factor;
		});
		return potency;
	}

	resolve(displayTime: number) {
		if (this.base < 1) {
			console.warn(this);
		}
		console.assert(this.snapshotTime !== undefined);
		console.assert(this.applicationTime === undefined, this.sourceSkill);
		this.applicationTime = displayTime;
	}

	hasResolved() { return this.applicationTime !== undefined; }

	hasHitBoss(untargetable: (displayTime: number) => boolean) {
		return this.applicationTime !== undefined && !untargetable(this.applicationTime);
	}

	hasSnapshotted() { return this.snapshotTime !== undefined; }
}