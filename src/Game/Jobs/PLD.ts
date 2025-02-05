// Skill and state declarations for PLD

import { controller } from "../../Controller/Controller";
import { BuffType, WarningType } from "../Common";
import { makeComboModifier, Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	ResourceCalculationFn,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	PotencyModifierFn,
	Skill,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";
import { GameState, PlayerState } from "../GameState";
import { makeResource, CoolDown, Event, Resource } from "../Resources";
import { GameConfig } from "../GameConfig";
import { ActionNode } from "../../Controller/Record";
import { PLDStatusPropsGenerator } from "../../Components/Jobs/PLD";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { ActionKey, CooldownKey, ResourceKey, TraitKey } from "../Data";
import { PLDResourceKey } from "../Data/Jobs/PLD";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
const makePLDResource = (
	rsc: PLDResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number; warningOnTimeout?: WarningType },
) => {
	makeResource("PLD", rsc, maxValue, params ?? {});
};

// TODO: get precise durations
makePLDResource("FIGHT_OR_FLIGHT", 1, { timeout: 20 });
makePLDResource("IRON_WILL", 1);
makePLDResource("OATH_GAUGE", 100);
makePLDResource("SHELTRON", 1, { timeout: 6 }); // TODO
makePLDResource("SENTINEL", 1, { timeout: 15 });
makePLDResource("COVER", 1, { timeout: 12 });
makePLDResource("CIRCLE_OF_SCORN_DOT", 1, { timeout: 15 });
makePLDResource("HALLOWED_GROUND", 1, { timeout: 10 });
makePLDResource("BULWARK", 1, { timeout: 10 });
makePLDResource("GORING_BLADE_READY", 1, { timeout: 30 });
makePLDResource("DIVINE_VEIL", 1, { timeout: 30 });
makePLDResource("ATONEMENT_READY", 1, { timeout: 30 });
makePLDResource("DIVINE_MIGHT", 1, { timeout: 30 });
makePLDResource("INTERVENTION", 1, { timeout: 8 }); // TODO??
makePLDResource("KNIGHTS_RESOLVE", 1, { timeout: 4 });
makePLDResource("KNIGHTS_BENEDICTION", 1, { timeout: 12 });
makePLDResource("REQUIESCAT", 4);
makePLDResource("CONFITEOR_READY", 1, { timeout: 30 });
makePLDResource("PASSAGE_OF_ARMS", 1, { timeout: 18 });
makePLDResource("ARMS_UP", 1); // ???
makePLDResource("SUPPLICATION_READY", 1, { timeout: 30 });
makePLDResource("SEPULCHRE_READY", 1, { timeout: 30 });
makePLDResource("HOLY_SHELTRON", 1, { timeout: 8 });
makePLDResource("BLADE_OF_HONOR_READY", 1, { timeout: 30 });
makePLDResource("GUARDIAN", 1, { timeout: 15 });

makePLDResource("PLD_COMBO_TRACKER", 2, { timeout: 30 });
makePLDResource("PLD_CONFITEOR_COMBO_TRACKER", 3, { timeout: 30 });
makePLDResource("PLD_AOE_COMBO_TRACKER", 1, { timeout: 30 });

// === JOB GAUGE AND STATE ===

export class PLDState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Winged Glide Stacks
		/*
        const wingedGlideStacks = this.hasTraitUnlocked(TraitName.EnhancedWingedGlide) ? 2: 1;
        [
            new CoolDown(ResourceType.cd_WingedGlide, 60, wingedGlideStacks, wingedGlideStacks),
        ].forEach((cd) => this.cooldowns.set(cd));
        */

		this.registerRecurringEvents([
			{
				groupedDots: [
					{
						dotName: "CIRCLE_OF_SCORN_DOT",
						appliedBy: ["CIRCLE_OF_SCORN"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<PLDState> {
		return new PLDStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
			// node.addBuff(BuffType.NoMercy);
		}
	}

	// handle all PLD combo abilities and combo states
	fixPLDComboState(skillName: ActionKey) {
		// HANDLE AOE DIFFERENTLY
		// the other 3 combo types
	}

	refreshBuff(rscType: ResourceKey, delay: number) {
		// buffs are applied on hit, so apply it after a delay
		this.addEvent(
			new Event("gain buff", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
			}),
		);
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const makeWeaponskill_PLD = (
	name: ActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<PLDState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		recastTime?: number | ResourceCalculationFn<PLDState>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: ResourceKey;
			resourceValue: number;
		};
		jobPotencyModifiers?: PotencyModifierFn<PLDState>;
		applicationDelay: number;
		animationLock?: number;
		validateAttempt?: StatePredicate<PLDState>;
		onExecute?: EffectFn<PLDState>;
		onConfirm?: EffectFn<PLDState>;
		highlightIf?: StatePredicate<PLDState>;
		onApplication?: EffectFn<PLDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<PLDState> => {
	const onConfirm: EffectFn<PLDState> = combineEffects(params.onConfirm ?? NO_EFFECT, (state) => {
		// fix gcd combo state
		if (name !== "PIERCING_TALON") {
			state.fixPLDComboState(name);
		}

		// remove all continuation buffs if gcd is pressed before continuation
	});
	const onApplication: EffectFn<PLDState> = params.onApplication ?? NO_EFFECT;
	const jobPotencyMod: PotencyModifierFn<PLDState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeWeaponskill("PLD", name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		onApplication: onApplication,
		recastTime: (state) => state.config.adjustedSksGCD(),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (
				params.combo &&
				state.resources.get(params.combo.resource).availableAmount() ===
					params.combo.resourceValue
			) {
				mods.push(
					makeComboModifier(
						getBasePotency(state, params.combo.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}

			if (state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
				// mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

const makeAbility_PLD = (
	name: ActionKey,
	unlockLevel: number,
	cdName: CooldownKey,
	params: {
		autoUpgrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<PLDState>[];
		highlightIf?: StatePredicate<PLDState>;
		startOnHotbar?: boolean;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<PLDState>;
		onConfirm?: EffectFn<PLDState>;
		onApplication?: EffectFn<PLDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<PLDState> => {
	return makeAbility("PLD", name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("FIGHT_OR_FLIGHT")) {
				// mods.push(Modifiers.NoMercy);
			}
			return mods;
		},
	});
};

makeWeaponskill_PLD("SHIELD_LOB", 15, {
	potency: 150,
	applicationDelay: 0.72,
});
