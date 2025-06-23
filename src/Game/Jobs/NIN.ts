// Skill and state declarations for NIN.

// TODO stuff to test
// - mudra -> kassatsu -> ninjutsu eats kassatsu
// - tcj has different gcd roll from mudras
// - various bunny conditions

import { NINStatusPropsGenerator } from "../../Components/Jobs/NIN";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { NINActionKey, NINCooldownKey, NINResourceKey } from "../Data/Jobs/NIN";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { getResourceInfo, makeResource, ResourceInfo } from "../Resources";
import {
	Ability,
	makeAbility,
	MakeAbilityParams,
	MakeGCDParams,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeWeaponskill,
	Weaponskill,
} from "../Skills";

const makeNINResource = (
	rsc: NINResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("NIN", rsc, maxValue, params ?? {});
};

makeNINResource("MUDRA", 1, { timeout: 6 });
makeNINResource("HIDE", 1);
makeNINResource("TRICK_ATTACK", 1, { timeout: 15.77 });
makeNINResource("KASSATSU", 1, { timeout: 15 });
makeNINResource("DOKUMORI", 1, { timeout: 21 });
makeNINResource("TENRI_JINDO_READY", 1, { timeout: 30 });
makeNINResource("TEN_CHI_JIN", 1, { timeout: 6 });
makeNINResource("MEISUI", 1, { timeout: 30 });
makeNINResource("SHADOW_WALKER", 1, { timeout: 20 });
makeNINResource("BUNSHIN", 5, { timeout: 30 });
makeNINResource("PHANTOM_KAMAITACHI_READY", 1, { timeout: 45 });
makeNINResource("RAIJU_READY", 1, { timeout: 30 });
makeNINResource("KUNAIS_BANE", 1, { timeout: 16.25 });
makeNINResource("HIGI", 1, { timeout: 30 });
makeNINResource("DOTON", 1, { timeout: 18 });

makeNINResource("NIN_COMBO_TRACKER", 2, { timeout: 30 });
makeNINResource("NIN_AOE_COMBO_TRACKER", 1, { timeout: 30 });
// these two resources should be cleared when the mudra status is dropped
makeNINResource("MUDRA_TRACKER", 1e4);
makeNINResource("BUNNY", 1);

enum Mudra {
	Ten = 1,
	Chi = 2,
	Jin = 3,
}

export class NINState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<NINState> {
		return new NINStatusPropsGenerator(this);
	}

	// Convert the state's current MUDRA_TRACKER resource to a sequence of the last
	// 2 executed mudras.
	//
	// MUDRA_TRACKER is a 3-digit tracker representing the last 3 mudras performed:
	// 0 = [no mudra]
	// 1 = ten, 2 = chi, 3 = jin
	//
	// Returns undefined if the player bunnied. Returns an empty list if the mudra
	// state is empty.
	parseMudraTracker(): Mudra[] | undefined {
		if (this.hasResourceAvailable("BUNNY")) {
			return undefined;
		}
		const mudraTracker = this.resources.get("MUDRA_TRACKER").availableAmount();
		if (mudraTracker === 0) {
			return [];
		}
		if (mudraTracker < 10) {
			console.assert(mudraTracker < 4, `mudra tracker value ${mudraTracker} was invalid`);
			return [mudraTracker];
		}
		if (mudraTracker < 100) {
			console.assert(
				mudraTracker % 10 !== 0,
				`mudra tracker value ${mudraTracker} was invalid`,
			);
			return [Math.floor(mudraTracker / 10), mudraTracker % 10];
		}
		if (mudraTracker < 1000) {
			return [
				Math.floor(mudraTracker / 100),
				Math.floor(mudraTracker / 10),
				mudraTracker % 10,
			];
		}
		return undefined;
	}

	pushMudra(mudra: Mudra) {
		const mudraResource = this.resources.get("MUDRA_TRACKER");
		const amt = mudraResource.availableAmount();
		if (amt === 0) {
			console.assert(this.resources.get("MUDRA_TRACKER").availableAmount() === 0);
			console.assert(this.resources.get("BUNNY").availableAmount() === 0);
			// enqueue clear for tracker and bunny resources
			this.gainStatus("MUDRA");
			this.resources.addResourceEvent({
				rscType: "MUDRA",
				name: "clear mudra tracker/bunny",
				delay: (getResourceInfo("NIN", "MUDRA") as ResourceInfo).maxTimeout,
				fnOnRsc: (rsc) => {
					this.resources.get("MUDRA_TRACKER").overrideCurrentValue(0);
					this.resources.get("BUNNY").overrideCurrentValue(0);
				},
			});
		}
		if (amt > 1000) {
			// don't bother, since we're already bunnied
			return;
		}
		mudraResource.overrideCurrentValue(amt * 10 + mudra);
	}
}

const makeNINWeaponskill = (
	name: NINActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<NINState>>,
): Weaponskill<NINState> => {
	return makeWeaponskill("NIN", name, unlockLevel, {
		...params,
	});
};

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

const makeNINResourceAbility = (
	name: NINActionKey,
	unlockLevel: number,
	cdName: NINCooldownKey,
	params: MakeResourceAbilityParams<NINState>,
): Ability<NINState> => {
	return makeResourceAbility("NIN", name, unlockLevel, cdName, params);
};

// Mudra actions always take exactly 0.5s regardless of sks/haste.
// Under TCJ, they take exactyl 1s instead.
(
	[
		["TEN", 30],
		["CHI", 35],
		["JIN", 45],
	] as Array<[NINActionKey, number]>
).forEach(([name, level], i) => {
	makeNINAbility(name, 30, "cd_MUDRA", {
		cooldown: 20,
		maxCharges: 2,
		// Mudras cannot be used during a GCD roll
		validateAttempt: (state) => state.cooldowns.get("cd_GCD").stacksAvailable() > 0,
		// Roll the GCD and update mudra state
		onConfirm: (state) => {
			const recast = state.hasResourceAvailable("TEN_CHI_JIN") ? 1 : 0.5;
			state.cooldowns.get("cd_GCD").useStackWithRecast(recast);
			state.pushMudra(i + 1);
		},
	});
});
