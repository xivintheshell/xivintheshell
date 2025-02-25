import { VPRStatusPropsGenerator } from "../../Components/Jobs/VPR";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeVPRResource = (
	rsc: VPRResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("VPR", rsc, maxValue, params ?? {});
};
*/

export class VPRState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<VPRState> {
		return new VPRStatusPropsGenerator(this);
	}
}

/*
const makeVPRWeaponskill = (
	name:VPRActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<VPRState>>,
): Weaponskill<VPRState> => {
	return makeWeaponskill("VPR", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeVPRSpell = (
	name: VPRActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<VPRState>>,
): Spell<VPRState> => {
	return makeSpell("VPR", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeVPRAbility = (
	name: VPRActionKey,
	unlockLevel: number,
	cdName: VPRCooldownKey,
	params: Partial<MakeAbilityParams<VPRState>>,
): Ability<VPRState> => {
	return makeAbility("VPR", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeVPRResourceAbility = (
	name: VPRActionKey,
	unlockLevel: number,
	cdName: VPRCooldownKey,
	params: MakeResourceAbilityParams<VPRState>,
): Ability<VPRState> => {
	return makeResourceAbility("VPR", name, unlockLevel, cdName, params);
};
*/
