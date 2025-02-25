import { SCHStatusPropsGenerator } from "../../Components/Jobs/SCH";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeSCHResource = (
	rsc: SCHResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("SCH", rsc, maxValue, params ?? {});
};
*/

export class SCHState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SCHState> {
		return new SCHStatusPropsGenerator(this);
	}
}

/*
const makeSCHWeaponskill = (
	name:SCHActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<SCHState>>,
): Weaponskill<SCHState> => {
	return makeWeaponskill("SCH", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeSCHSpell = (
	name: SCHActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<SCHState>>,
): Spell<SCHState> => {
	return makeSpell("SCH", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeSCHAbility = (
	name: SCHActionKey,
	unlockLevel: number,
	cdName: SCHCooldownKey,
	params: Partial<MakeAbilityParams<SCHState>>,
): Ability<SCHState> => {
	return makeAbility("SCH", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeSCHResourceAbility = (
	name: SCHActionKey,
	unlockLevel: number,
	cdName: SCHCooldownKey,
	params: MakeResourceAbilityParams<SCHState>,
): Ability<SCHState> => {
	return makeResourceAbility("SCH", name, unlockLevel, cdName, params);
};
*/
