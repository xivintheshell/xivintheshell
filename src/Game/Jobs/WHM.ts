import { WHMStatusPropsGenerator } from "../../Components/Jobs/WHM";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeWHMResource = (
	rsc: WHMResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("WHM", rsc, maxValue, params ?? {});
};
*/

export class WHMState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<WHMState> {
		return new WHMStatusPropsGenerator(this);
	}
}

/*
const makeWHMWeaponskill = (
	name:WHMActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<WHMState>>,
): Weaponskill<WHMState> => {
	return makeWeaponskill("WHM", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeWHMSpell = (
	name: WHMActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<WHMState>>,
): Spell<WHMState> => {
	return makeSpell("WHM", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeWHMAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: Partial<MakeAbilityParams<WHMState>>,
): Ability<WHMState> => {
	return makeAbility("WHM", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeWHMResourceAbility = (
	name: WHMActionKey,
	unlockLevel: number,
	cdName: WHMCooldownKey,
	params: MakeResourceAbilityParams<WHMState>,
): Ability<WHMState> => {
	return makeResourceAbility("WHM", name, unlockLevel, cdName, params);
};
*/
