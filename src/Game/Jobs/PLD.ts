import { PLDStatusPropsGenerator } from "../../Components/Jobs/PLD";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makePLDResource = (
	rsc: PLDResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("PLD", rsc, maxValue, params ?? {});
};
*/

export class PLDState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<PLDState> {
		return new PLDStatusPropsGenerator(this);
	}
}

/*
const makePLDWeaponskill = (
	name:PLDActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<PLDState>>,
): Weaponskill<PLDState> => {
	return makeWeaponskill("PLD", name, unlockLevel, {
		...params
	})
}
*/

/*
const makePLDSpell = (
	name: PLDActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<PLDState>>,
): Spell<PLDState> => {
	return makeSpell("PLD", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makePLDAbility = (
	name: PLDActionKey,
	unlockLevel: number,
	cdName: PLDCooldownKey,
	params: Partial<MakeAbilityParams<PLDState>>,
): Ability<PLDState> => {
	return makeAbility("PLD", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makePLDResourceAbility = (
	name: PLDActionKey,
	unlockLevel: number,
	cdName: PLDCooldownKey,
	params: MakeResourceAbilityParams<PLDState>,
): Ability<PLDState> => {
	return makeResourceAbility("PLD", name, unlockLevel, cdName, params);
};
*/
