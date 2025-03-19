import { ASTStatusPropsGenerator } from "../../Components/Jobs/AST";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";

/*
const makeASTResource = (
	rsc: ASTResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("AST", rsc, maxValue, params ?? {});
};
*/

export class ASTState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<ASTState> {
		return new ASTStatusPropsGenerator(this);
	}
}

/*
const makeASTWeaponskill = (
	name:ASTActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<ASTState>>,
): Weaponskill<ASTState> => {
	return makeWeaponskill("AST", name, unlockLevel, {
		...params
	})
}
*/

/*
const makeASTSpell = (
	name: ASTActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<ASTState>>,
): Spell<ASTState> => {
	return makeSpell("AST", name, unlockLevel, {
		...params,
	});
};
*/

/*
const makeASTAbility = (
	name: ASTActionKey,
	unlockLevel: number,
	cdName: ASTCooldownKey,
	params: Partial<MakeAbilityParams<ASTState>>,
): Ability<ASTState> => {
	return makeAbility("AST", name, unlockLevel, cdName, {
		...params,
	});
};
*/

/*
const makeASTResourceAbility = (
	name: ASTActionKey,
	unlockLevel: number,
	cdName: ASTCooldownKey,
	params: MakeResourceAbilityParams<ASTState>,
): Ability<ASTState> => {
	return makeResourceAbility("AST", name, unlockLevel, cdName, params);
};
*/
