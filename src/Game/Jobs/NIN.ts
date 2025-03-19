import { NINStatusPropsGenerator } from "../../Components/Jobs/NIN";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeNINResource = (
	rsc: NINResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("NIN", rsc, maxValue, params ?? {});
};
*/

export class NINState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<NINState> {
		return new NINStatusPropsGenerator(this);
	}
}

/*
const makeNINWeaponskill = (
	name:NINActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<NINState>>,
): Weaponskill<NINState> => {
	return makeWeaponskill("NIN", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeNINSpell = (
	name: NINActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<NINState>>,
): Spell<NINState> => {
	return makeSpell("NIN", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeNINAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: Partial<MakeAbilityParams<NINState>>,
): Ability<NINState> => {
	return makeAbility("NIN", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeNINResourceAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: MakeResourceAbilityParams<NINState>,
): Ability<NINState> => {
	return makeResourceAbility("NIN", name, unlockLevel, cdName, params);
};
*/
