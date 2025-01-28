import { MNKStatusPropsGenerator } from "../../Components/Jobs/MNK";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeMNKResource = (
	rsc: MNKResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("MNK", rsc, maxValue, params ?? {});
};
*/

export class MNKState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<MNKState> {
		return new MNKStatusPropsGenerator(this);
	}
}

/*
const makeMNKWeaponskill = (
	name:MNKActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<MNKState>>,
): Weaponskill<MNKState> => {
	return makeWeaponskill("MNK", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeMNKSpell = (
	name: MNKActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<MNKState>>,
): Spell<MNKState> => {
	return makeSpell("MNK", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeMNKAbility = (
	name: MNKActionKey,
	unlockLevel: number,
	cdName: MNKCooldownKey,
	params: Partial<MakeAbilityParams<MNKState>>,
): Ability<MNKState> => {
	return makeAbility("MNK", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeMNKResourceAbility = (
	name: MNKActionKey,
	unlockLevel: number,
	cdName: MNKCooldownKey,
	params: MakeResourceAbilityParams<MNKState>,
): Ability<MNKState> => {
	return makeResourceAbility("MNK", name, unlockLevel, cdName, params);
};
*/
