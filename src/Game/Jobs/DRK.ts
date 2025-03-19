import { DRKStatusPropsGenerator } from "../../Components/Jobs/DRK";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeDRKResource = (
	rsc: DRKResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("DRK", rsc, maxValue, params ?? {});
};
*/

export class DRKState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<DRKState> {
		return new DRKStatusPropsGenerator(this);
	}
}

/*
const makeDRKWeaponskill = (
	name:DRKActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<DRKState>>,
): Weaponskill<DRKState> => {
	return makeWeaponskill("DRK", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeDRKSpell = (
	name: DRKActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<DRKState>>,
): Spell<DRKState> => {
	return makeSpell("DRK", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeDRKAbility = (
	name: DRKActionKey,
	unlockLevel: number,
	cdName: DRKCooldownKey,
	params: Partial<MakeAbilityParams<DRKState>>,
): Ability<DRKState> => {
	return makeAbility("DRK", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeDRKResourceAbility = (
	name: DRKActionKey,
	unlockLevel: number,
	cdName: DRKCooldownKey,
	params: MakeResourceAbilityParams<DRKState>,
): Ability<DRKState> => {
	return makeResourceAbility("DRK", name, unlockLevel, cdName, params);
};
*/
