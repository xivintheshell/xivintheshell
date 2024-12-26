import { ActionNode } from "../../Controller/Record";
import { Aspect, BuffType, ResourceType } from "../Common";
import { RPRResourceType } from "../Constants/RPR";
import { ActionKey } from "../Data/Actions";
import { RPRActionKey } from "../Data/Actions/Jobs/RPR";
import { CommonActionKey } from "../Data/Actions/Shared/Common";
import { RoleActionKey } from "../Data/Actions/Shared/Role";
import { TraitKey } from "../Data/Traits";
import { GameConfig } from "../GameConfig";
import { GameState, PlayerState } from "../GameState";
import { makeComboModifier, makePositionalModifier, Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, makeResource } from "../Resources";
import {
	Ability,
	combineEffects,
	combinePredicatesAnd,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	getBasePotency,
	getSkill,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	NO_EFFECT,
	ResourceCalculationFn,
	Skill,
	Spell,
	StatePredicate,
	Weaponskill,
} from "../Skills";

function makeRPRResource(
	type: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) {
	makeResource("RPR", type, maxValue, params ?? {});
}

makeRPRResource(ResourceType.Soul, 100);
makeRPRResource(ResourceType.Shroud, 100);

makeRPRResource(ResourceType.DeathsDesign, 1, {});
makeRPRResource(ResourceType.SoulReaver, 2, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedGibbet, 1, { timeout: 60 });
makeRPRResource(ResourceType.EnhancedGallows, 1, { timeout: 60 });
makeRPRResource(ResourceType.Executioner, 2, { timeout: 30 });

makeRPRResource(ResourceType.Enshrouded, 1, { timeout: 30 });
makeRPRResource(ResourceType.LemureShroud, 5, { timeout: 30 });
/* Not giving timeout for this because it needs to be zeroe-ed out when enshroud ends anyway
 * And I don't want the timeout to hide logic errors with that */
makeRPRResource(ResourceType.VoidShroud, 5); // Impossible for it to last 30s, but 30s is an upper bound
makeRPRResource(ResourceType.Oblatio, 1, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedVoidReaping, 1, { timeout: 30 });
makeRPRResource(ResourceType.EnhancedCrossReaping, 1, { timeout: 30 });

makeRPRResource(ResourceType.IdealHost, 1, { timeout: 30 });
makeRPRResource(ResourceType.PerfectioOcculta, 1, { timeout: 30 });
makeRPRResource(ResourceType.PerfectioParata, 1, { timeout: 30 });

makeRPRResource(ResourceType.ArcaneCircle, 1, { timeout: 20 }); // 20.00s exactly
makeRPRResource(ResourceType.CircleOfSacrifice, 1, { timeout: 5 });
makeRPRResource(ResourceType.BloodsownCircle, 1, { timeout: 6 });
makeRPRResource(ResourceType.ImmortalSacrifice, 8, { timeout: 30 });

makeRPRResource(ResourceType.ArcaneCrest, 1, { timeout: 5 });
makeRPRResource(ResourceType.CrestOfTimeBorrowed, 1, { timeout: 5 });
makeRPRResource(ResourceType.CrestOfTimeReturned, 1, { timeout: 15 });

makeRPRResource(ResourceType.Soulsow, 1, { default: 1 });
makeRPRResource(ResourceType.Threshold, 1, { timeout: 10 });
makeRPRResource(ResourceType.EnhancedHarpe, 1, { timeout: 10 });

// If 1, the last dash used was Ingress; if 0, the last dash was egress
// This determines which button is given the Regress replacement
makeRPRResource(ResourceType.HellsIngressUsed, 1);

makeRPRResource(ResourceType.RPRCombo, 2, { timeout: 30 });
makeRPRResource(RPRResourceType.RPRAoECombo, 1, { timeout: 30 });

makeRPRResource(ResourceType.Feint, 1, { timeout: 15 });
makeRPRResource(ResourceType.TrueNorth, 1, { timeout: 10 });
makeRPRResource(ResourceType.ArmsLength, 1, { timeout: 6 });
makeRPRResource(ResourceType.Bloodbath, 1, { timeout: 20 });

export class RPRState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		const soulSliceStacks = this.hasTraitUnlocked("TEMPERED_SOUL") ? 2 : 1;
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_SoulSlice, 30, soulSliceStacks, soulSliceStacks),
		);

		this.registerRecurringEvents();
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable(ResourceType.ArcaneCircle)) {
			node.addBuff(BuffType.ArcaneCircle);
		}

		if (this.hasResourceAvailable(ResourceType.DeathsDesign)) {
			node.addBuff(BuffType.DeathsDesign);
		}
	}

	refreshDeathsDesign() {
		const dd = this.resources.get(ResourceType.DeathsDesign);

		const newTime = Math.min(this.resources.timeTillReady(ResourceType.DeathsDesign) + 30, 60);
		if (dd.available(1)) {
			dd.overrideTimer(this, newTime);
			return;
		}

		dd.gain(1);
		this.resources.addResourceEvent({
			rscType: ResourceType.DeathsDesign,
			name: "drop Death's Design",
			delay: newTime,
			fnOnRsc: (rsc) => {
				rsc.consume(1);
			},
		});
	}

	setTimedResource(rscType: RPRResourceType, amount: number) {
		this.tryConsumeResource(rscType);
		this.resources.get(rscType).gain(amount);
		this.enqueueResourceDrop(rscType);
	}

	processCombo(skill: RPRActionKey) {
		const currCombo = this.resources.get(ResourceType.RPRCombo).availableAmount();
		const currAoeCombo = this.resources.get(ResourceType.RPRAoECombo).availableAmount();

		let [newCombo, newAoeCombo] = new Map<RPRActionKey, [number, number]>([
			["SLICE", [1, 0]],
			["WAXING_SLICE", [currCombo === 1 ? 2 : 0, 0]],
			["INFERNAL_SLICE", [0, 0]],
			["SPINNING_SCYTHE", [0, 1]],
			["NIGHTMARE_SCYTHE", [0, 0]],
		]).get(skill) ?? [currCombo, currAoeCombo]; // Any other gcd leaves combo unchanged

		if (newCombo !== currCombo) this.setComboState(ResourceType.RPRCombo, newCombo);
		if (newAoeCombo !== currAoeCombo) this.setComboState(ResourceType.RPRAoECombo, newAoeCombo);
	}

	processSoulGauge(skill: RPRActionKey) {
		const soul = this.resources.get(ResourceType.Soul);
		if (
			(
				[
					"SLICE",
					"WAXING_SLICE",
					"INFERNAL_SLICE",
					"SPINNING_SCYTHE",
					"NIGHTMARE_SCYTHE",
					"HARPE",
					"HARVEST_MOON",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soul.gain(10);
			return;
		}

		if ((["SOUL_SLICE", "SOUL_SCYTHE"] as RPRActionKey[]).includes(skill)) {
			soul.gain(50);
			return;
		}

		if (
			(
				[
					"BLOOD_STALK",
					"UNVEILED_GALLOWS",
					"UNVEILED_GIBBET",
					"GRIM_SWATHE",
					"GLUTTONY",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soul.consume(50);
			return;
		}
	}

	processShroudGauge(skill: RPRActionKey) {
		const shroud = this.resources.get(ResourceType.Shroud);

		if (
			(
				[
					"GALLOWS",
					"GIBBET",
					"EXECUTIONERS_GALLOWS",
					"EXECUTIONERS_GIBBET",
					"GUILLOTINE",
					"EXECUTIONERS_GUILLOTINE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			shroud.gain(10);
			return;
		}

		if (skill === "ENSHROUD" && !this.resources.get(ResourceType.IdealHost).available(1)) {
			shroud.consume(50);
		}
	}

	processReaversExecutioner(skill: RPRActionKey) {
		const reavers = this.resources.get(ResourceType.SoulReaver);
		const executioners = this.resources.get(ResourceType.Executioner);

		// Gibbet, Gallows, Guillotine
		if ((["GIBBET", "GALLOWS", "GUILLOTINE"] as RPRActionKey[]).includes(skill)) {
			reavers.consume(1);
			return;
		}

		if (
			(
				[
					"EXECUTIONERS_GIBBET",
					"EXECUTIONERS_GALLOWS",
					"EXECUTIONERS_GUILLOTINE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			executioners.consume(1);
			return;
		}

		// Any other action resets Soul reavers, even if it then gives more
		reavers.consume(reavers.availableAmount());
		executioners.consume(executioners.availableAmount());

		// Unveiled actions
		if (
			(
				[
					"BLOOD_STALK",
					"UNVEILED_GALLOWS",
					"UNVEILED_GIBBET",
					"GRIM_SWATHE",
				] as RPRActionKey[]
			).includes(skill)
		) {
			this.setTimedResource(ResourceType.SoulReaver, 1);
			return;
		}

		// Pre-96 gluttony
		if (skill === "GLUTTONY") {
			if (this.hasTraitUnlocked("ENHANCED_GLUTTONY")) {
				this.setTimedResource(ResourceType.Executioner, 2);
				return;
			}

			this.setTimedResource(ResourceType.SoulReaver, 2);
			return;
		}
	}

	processGibbetGallows(skill: RPRActionKey) {
		const soulReavers = this.resources.get(ResourceType.SoulReaver);
		const executioners = this.resources.get(ResourceType.Executioner);

		if (
			!(
				[
					"GIBBET",
					"GALLOWS",
					"EXECUTIONERS_GIBBET",
					"EXECUTIONERS_GALLOWS",
				] as RPRActionKey[]
			).includes(skill)
		) {
			soulReavers.consume(soulReavers.availableAmount());
			executioners.consume(executioners.availableAmount());
		}
		const matchingBuffs = new Map<RPRActionKey, ResourceType>([
			["GIBBET", ResourceType.EnhancedGibbet],
			["EXECUTIONERS_GIBBET", ResourceType.EnhancedGibbet],
			["GALLOWS", ResourceType.EnhancedGallows],
			["EXECUTIONERS_GALLOWS", ResourceType.EnhancedGallows],
		]);
		const otherBuffs = new Map<ActionKey, ResourceType>([
			["GIBBET", ResourceType.EnhancedGallows],
			["EXECUTIONERS_GIBBET", ResourceType.EnhancedGallows],
			["GALLOWS", ResourceType.EnhancedGibbet],
			["EXECUTIONERS_GALLOWS", ResourceType.EnhancedGibbet],
		]);

		//Already verified that map lookup will be successful.
		const matchingBuff = this.resources.get(matchingBuffs.get(skill) as ResourceType);
		const otherBuff = this.resources.get(otherBuffs.get(skill) as ResourceType);

		matchingBuff.consume(matchingBuff.availableAmount());
		otherBuff.consume(otherBuff.availableAmount());
		otherBuff.gain(1);
	}

	processCircleOfSacrifice(skill: RPRActionKey) {
		if (!this.hasResourceAvailable(ResourceType.CircleOfSacrifice)) {
			return;
		}
		const skillInfo = getSkill("RPR", skill);
		if (skillInfo.potencyFn(this) > 0) {
			let immortalSac = this.resources.get(ResourceType.ImmortalSacrifice);
			if (immortalSac.availableAmount() === 0) {
				this.setTimedResource(ResourceType.ImmortalSacrifice, 1);
			} else {
				this.resources.get(ResourceType.ImmortalSacrifice).gain(1);
			}
			this.tryConsumeResource(ResourceType.CircleOfSacrifice, true);
		}
	}

	enterEnshroud() {
		if (this.hasResourceAvailable(ResourceType.IdealHost))
			this.resources.get(ResourceType.IdealHost).consume(1);
		if (this.hasTraitUnlocked("ENHANCED_ENSHROUD"))
			this.setTimedResource(ResourceType.Oblatio, 1);
		this.setTimedResource(ResourceType.LemureShroud, 5);
	}

	exitEnshroud() {
		this.tryConsumeResource(ResourceType.Enshrouded);
		this.tryConsumeResource(ResourceType.Oblatio);
		this.tryConsumeResource(ResourceType.LemureShroud);
		this.tryConsumeResource(ResourceType.VoidShroud);
		this.tryConsumeResource(ResourceType.EnhancedCrossReaping);
		this.tryConsumeResource(ResourceType.EnhancedVoidReaping);
	}
}

const enshroudSkills = new Set<RPRActionKey | RoleActionKey | CommonActionKey>([
	"SHADOW_OF_DEATH",
	"WHORL_OF_DEATH",

	"HARVEST_MOON",
	"HARPE",

	"VOID_REAPING",
	"CROSS_REAPING",
	"GRIM_REAPING",
	"LEMURES_SLICE",
	"LEMURES_SCYTHE",
	"SACRIFICIUM",
	"COMMUNIO",

	"ARCANE_CIRCLE",
	"HELLS_EGRESS",
	"HELLS_INGRESS",
	"ARCANE_CREST",

	"FEINT",
	"LEG_SWEEP",
	"BLOODBATH",
	"TRUE_NORTH",
	"ARMS_LENGTH",
	"SECOND_WIND",
	"SPRINT",
	"TINCTURE",
]);

const gibgalHighlightPredicate: (
	enhancedRsc: ResourceType,
	skill: RPRActionKey,
) => StatePredicate<RPRState> = (enhancedRsc, skill) => (state: Readonly<RPRState>) => {
	const resource = (["GIBBET", "GALLOWS", "GUILLOTINE"] as RPRActionKey[]).includes(skill)
		? state.resources.get(ResourceType.SoulReaver)
		: state.resources.get(ResourceType.Executioner);

	return (
		state.resources.get(enhancedRsc).available(1) ||
		(resource.available(1) &&
			!state.hasResourceAvailable(ResourceType.EnhancedGibbet) &&
			!state.hasResourceAvailable(ResourceType.EnhancedGallows))
	);
};

const reaverPredicate: StatePredicate<RPRState> = (state) =>
	state.hasResourceAvailable(ResourceType.SoulReaver);
const executionerPredicate: StatePredicate<RPRState> = (state) =>
	state.hasResourceAvailable(ResourceType.Executioner);

const soulSpendPredicate: (cost: number) => StatePredicate<RPRState> = (cost) => (state) =>
	state.resources.get(ResourceType.Soul).availableAmount() >= cost;
const isEnshroudSkill = (skill: RPRActionKey) => enshroudSkills.has(skill);

const baseOnConfirm = (name: RPRActionKey): EffectFn<RPRState> => {
	return combineEffects(
		(state) => state.processCombo(name),
		(state) => state.processSoulGauge(name),
		(state) => state.processShroudGauge(name),
		(state) => state.processReaversExecutioner(name),
		(state) => state.processCircleOfSacrifice(name),
	);
};

const basePotencyModifiers = (state: Readonly<RPRState>): PotencyModifier[] => {
	const mods: PotencyModifier[] = [];

	if (state.hasResourceAvailable(ResourceType.ArcaneCircle)) {
		mods.push(Modifiers.ArcaneCircle);
	}

	if (state.hasResourceAvailable(ResourceType.DeathsDesign)) {
		mods.push(Modifiers.DeathsDesign);
	}

	return mods;
};

const makeRPRSpell = (
	name: RPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		secondaryCooldown?: CooldownGroupProperties;
		aspect: Aspect;
		castTime: number | ResourceCalculationFn<RPRState>;
		recastTime: number;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		highlightIf?: StatePredicate<RPRState>;
		onApplication?: EffectFn<RPRState>;
	},
): Spell<RPRState> => {
	const onConfirm: EffectFn<RPRState> = combineEffects(
		baseOnConfirm(name),
		params.onConfirm ?? NO_EFFECT,
	);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) =>
			!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);

	return makeSpell("RPR", name, unlockLevel, {
		...params,
		recastTime: (state) => state.config.adjustedGCD(params.recastTime),
		onConfirm: onConfirm,
		validateAttempt: validateAttempt,
		isInstantFn: (state) =>
			!(
				name === "COMMUNIO" ||
				(name === "HARPE" && !state.hasResourceAvailable(ResourceType.EnhancedHarpe)) ||
				(name === "SOULSOW" && state.isInCombat())
			),
		jobPotencyModifiers: basePotencyModifiers,
	});
};

const makeRPRWeaponskill = (
	name: RPRActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		startOnHotbar?: boolean;
		potency: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: ResourceType;
			resourceValue: number;
		};
		positional?: {
			potency: number | Array<[TraitKey, number]>;
			location: "flank" | "rear";
		};
		secondaryCooldown?: CooldownGroupProperties;
		aspect: Aspect;
		recastTime: number | ResourceCalculationFn<RPRState>;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		highlightIf?: StatePredicate<RPRState>;
	},
): Weaponskill<RPRState> => {
	const onConfirm: EffectFn<RPRState> = combineEffects(
		baseOnConfirm(name),
		params.onConfirm ?? NO_EFFECT,
	);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) =>
			!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);
	return makeWeaponskill("RPR", name, unlockLevel, {
		...params,
		onConfirm: onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = basePotencyModifiers(state);
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

			if (
				params.positional &&
				(state.hasResourceAvailable(ResourceType.TrueNorth) ||
					(params.positional.location === "flank" &&
						state.hasResourceAvailable(ResourceType.FlankPositional)) ||
					(params.positional.location === "rear" &&
						state.hasResourceAvailable(ResourceType.RearPositional)))
			) {
				mods.push(
					makePositionalModifier(
						getBasePotency(state, params.positional.potency) -
							getBasePotency(state, params.potency),
					),
				);
			}

			if (
				["GIBBET", "EXECUTIONERS_GIBBET"].includes(name) &&
				state.hasResourceAvailable(ResourceType.EnhancedGibbet)
			) {
				mods.push(Modifiers.EnhancedGibbetGallows);
			}

			if (
				["GALLOWS", "EXECUTIONERS_GALLOWS"].includes(name) &&
				state.hasResourceAvailable(ResourceType.EnhancedGallows)
			) {
				mods.push(Modifiers.EnhancedGibbetGallows);
			}

			if (
				name === "VOID_REAPING" &&
				state.hasResourceAvailable(ResourceType.EnhancedVoidReaping)
			) {
				mods.push(Modifiers.EnhancedReaping);
			}

			if (
				name === "CROSS_REAPING" &&
				state.hasResourceAvailable(ResourceType.EnhancedCrossReaping)
			) {
				mods.push(Modifiers.EnhancedReaping);
			}

			if (
				name === "PLENTIFUL_HARVEST" &&
				state.hasResourceAvailable(ResourceType.ImmortalSacrifice)
			) {
				for (
					let i = 0;
					i < state.resources.get(ResourceType.ImmortalSacrifice).availableAmount();
					i++
				) {
					mods.push(Modifiers.ImmortalSacrifice);
				}
			}

			return mods;
		},
		validateAttempt: validateAttempt,
	});
};

const makeRPRAbility = (
	name: RPRActionKey,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		isPhysical?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<RPRState>[];
		highlightIf?: StatePredicate<RPRState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<RPRState>;
		onConfirm?: EffectFn<RPRState>;
		onApplication?: EffectFn<RPRState>;
	},
): Ability<RPRState> => {
	const onConfirm = combineEffects(baseOnConfirm(name), params.onConfirm ?? NO_EFFECT);

	const validateAttempt: StatePredicate<RPRState> = combinePredicatesAnd(
		(state) =>
			!state.resources.get(ResourceType.Enshrouded).available(1) || isEnshroudSkill(name),
		params.validateAttempt ?? (() => true),
	);

	return makeAbility("RPR", name, unlockLevel, cdName, {
		...params,
		onConfirm: onConfirm,
		validateAttempt: validateAttempt,
		jobPotencyModifiers: basePotencyModifiers,
	});
};

makeRPRWeaponskill("SHADOW_OF_DEATH", 10, {
	potency: 300,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 1.15,
	onConfirm: (state) => state.refreshDeathsDesign(),
});

makeRPRWeaponskill("SLICE", 1, {
	potency: [
		["NEVER", 260],
		["MELEE_MASTERY_II_RPR", 320],
		["MELEE_MASTERY_III_RPR", 460],
	],
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.49,
});

makeRPRWeaponskill("WAXING_SLICE", 5, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_II_RPR", 160],
		["MELEE_MASTERY_III_RPR", 260],
	],
	combo: {
		potency: [
			["NEVER", 340],
			["MELEE_MASTERY_II_RPR", 400],
			["MELEE_MASTERY_III_RPR", 500],
		],
		resource: ResourceType.RPRCombo,
		resourceValue: 1,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.58,
	highlightIf: function (state: Readonly<RPRState>): boolean {
		return state.resources.get(ResourceType.RPRCombo).availableAmount() === 1;
	},
});

makeRPRWeaponskill("INFERNAL_SLICE", 30, {
	potency: [
		["NEVER", 100],
		["MELEE_MASTERY_II_RPR", 180],
		["MELEE_MASTERY_III_RPR", 280],
	],
	combo: {
		potency: [
			["NEVER", 420],
			["MELEE_MASTERY_II_RPR", 500],
			["MELEE_MASTERY_III_RPR", 600],
		],
		resource: ResourceType.RPRCombo,
		resourceValue: 2,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.54,
	highlightIf: function (state: Readonly<RPRState>): boolean {
		return state.resources.get(ResourceType.RPRCombo).availableAmount() === 2;
	},
});

makeRPRWeaponskill("SOUL_SLICE", 60, {
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 520],
	],
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.99,
	secondaryCooldown: {
		cdName: ResourceType.cd_SoulSlice,
		cooldown: 30,
		maxCharges: 2,
	},
});

makeRPRWeaponskill("GIBBET", 70, {
	replaceIf: [
		{
			newSkill: "EXECUTIONERS_GIBBET",
			condition: (state) => state.hasResourceAvailable(ResourceType.Executioner),
		},
		{
			newSkill: "VOID_REAPING",
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
		},
	],
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	positional: {
		potency: [
			["NEVER", 520],
			["MELEE_MASTERY_III_RPR", 560],
		],
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.5,
	highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGibbet, "GIBBET"),
	validateAttempt: reaverPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedGibbet);
		state.setTimedResource(ResourceType.EnhancedGallows, 1);
	},
});

makeRPRWeaponskill("GALLOWS", 70, {
	replaceIf: [
		{
			newSkill: "EXECUTIONERS_GALLOWS",
			condition: (state) => state.resources.get(ResourceType.Executioner).available(1),
		},
		{
			newSkill: "CROSS_REAPING",
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
		},
	],
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	positional: {
		potency: [
			["NEVER", 520],
			["MELEE_MASTERY_III_RPR", 560],
		],
		location: "rear",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.53,
	highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGallows, "GALLOWS"),
	validateAttempt: reaverPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedGallows);
		state.setTimedResource(ResourceType.EnhancedGibbet, 1);
	},
});

makeRPRWeaponskill("EXECUTIONERS_GIBBET", 96, {
	startOnHotbar: false,
	potency: 700,
	positional: {
		potency: 760,
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.62,
	highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGibbet, "EXECUTIONERS_GIBBET"),
	validateAttempt: executionerPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedGibbet);
		state.setTimedResource(ResourceType.EnhancedGallows, 1);
	},
});

makeRPRWeaponskill("EXECUTIONERS_GALLOWS", 96, {
	startOnHotbar: false,
	potency: 700,
	positional: {
		potency: 760,
		location: "flank",
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.62,
	highlightIf: gibgalHighlightPredicate(ResourceType.EnhancedGallows, "EXECUTIONERS_GALLOWS"),
	validateAttempt: executionerPredicate,
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedGallows);
		state.setTimedResource(ResourceType.EnhancedGibbet, 1);
	},
});

makeRPRWeaponskill("PLENTIFUL_HARVEST", 88, {
	potency: 720,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 1.16,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ImmortalSacrifice, 1),
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.ImmortalSacrifice, 1) &&
		!state.hasResourceAvailable(ResourceType.BloodsownCircle),
	onConfirm: (state) => {
		state.resources
			.get(ResourceType.ImmortalSacrifice)
			.consume(state.resources.get(ResourceType.ImmortalSacrifice).availableAmount());
		state.setTimedResource(ResourceType.IdealHost, 1);
		state.setTimedResource(ResourceType.PerfectioOcculta, 1);
	},
});

makeRPRSpell("COMMUNIO", 90, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
			newSkill: "PERFECTIO",
		},
	],
	potency: 1100,
	aspect: Aspect.Other,
	castTime: 1.3,
	recastTime: 2.5,
	falloff: 0.6,
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.Enshrouded) &&
		state.resources.get(ResourceType.LemureShroud).availableAmount() === 1,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.PerfectioOcculta)) {
			state.resources.get(ResourceType.PerfectioOcculta).consume(1);
			state.setTimedResource(ResourceType.PerfectioParata, 1);
		}
		state.exitEnshroud();
		state.tryConsumeResource(ResourceType.EnhancedCrossReaping);
		state.tryConsumeResource(ResourceType.EnhancedVoidReaping);
	},
});

makeRPRSpell("HARPE", 15, {
	potency: 300,
	aspect: Aspect.Other,
	castTime: 1.3,
	recastTime: 2.5,
	applicationDelay: 0.9,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.EnhancedHarpe),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.EnhancedHarpe),
});

makeRPRSpell("SOULSOW", 82, {
	potency: 0,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
			newSkill: "HARVEST_MOON",
		},
	],
	startOnHotbar: true,
	aspect: Aspect.Other,
	castTime: 5,
	recastTime: 2.5,
	applicationDelay: 0,
	onConfirm: (state) => state.resources.get(ResourceType.Soulsow).gain(1),
});

makeRPRSpell("HARVEST_MOON", 82, {
	potency: [
		["NEVER", 600],
		["MELEE_MASTERY_III_RPR", 800],
	],
	startOnHotbar: false,
	aspect: Aspect.Other,
	castTime: 0,
	recastTime: 2.5,
	falloff: 0.5,
	applicationDelay: 0.9,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Soulsow),
	onConfirm: (state) => state.resources.get(ResourceType.Soulsow).consume(1),
});

makeRPRAbility("GLUTTONY", 76, ResourceType.cd_Gluttony, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
			newSkill: "SACRIFICIUM",
		},
	],
	isPhysical: false,
	potency: 520,
	startOnHotbar: true,
	falloff: 0.25,
	applicationDelay: 1.06,
	cooldown: 60,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("BLOOD_STALK", 50, ResourceType.cd_BloodStalk, {
	replaceIf: [
		{
			newSkill: "LEMURES_SLICE",
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
		},
		{
			newSkill: "UNVEILED_GIBBET",
			condition: (state) => state.hasResourceAvailable(ResourceType.EnhancedGibbet),
		},
		{
			newSkill: "UNVEILED_GALLOWS",
			condition: (state) => state.hasResourceAvailable(ResourceType.EnhancedGallows),
		},
	],
	isPhysical: true,
	potency: 340,
	startOnHotbar: true,
	applicationDelay: 0.89,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("GRIM_SWATHE", 55, ResourceType.cd_BloodStalk, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
			newSkill: "LEMURES_SLICE",
		},
	],
	isPhysical: true,
	potency: 140,
	startOnHotbar: true,
	falloff: 0,
	applicationDelay: 0.58,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("UNVEILED_GIBBET", 70, ResourceType.cd_BloodStalk, {
	isPhysical: true,
	potency: 440,
	startOnHotbar: false,
	applicationDelay: 0.54,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("UNVEILED_GALLOWS", 70, ResourceType.cd_BloodStalk, {
	isPhysical: true,
	potency: 440,
	startOnHotbar: false,
	applicationDelay: 0.54,
	cooldown: 1,
	validateAttempt: soulSpendPredicate(50),
	highlightIf: soulSpendPredicate(50),
});

makeRPRAbility("LEMURES_SLICE", 86, ResourceType.cd_LemuresSlice, {
	isPhysical: true,
	potency: [
		["NEVER", 240],
		["MELEE_MASTERY_III_RPR", 280],
	],
	startOnHotbar: false,
	applicationDelay: 0.7,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
	onConfirm: (state) => {
		state.resources.get(ResourceType.VoidShroud).consume(2);
	},
});

makeRPRAbility("SACRIFICIUM", 92, ResourceType.cd_Sacrificium, {
	isPhysical: false,
	potency: 530,
	startOnHotbar: false,
	falloff: 0.5,
	applicationDelay: 0.76,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Oblatio),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Oblatio),
	onConfirm: (state) => state.resources.get(ResourceType.Oblatio).consume(1),
});

makeResourceAbility("RPR", "ARCANE_CIRCLE", 72, ResourceType.cd_ArcaneCircle, {
	rscType: ResourceType.ArcaneCircle,
	applicationDelay: 0.6,
	startOnHotbar: true,
	maxCharges: 1,
	potency: 0,
	onApplication: (state: RPRState) => {
		if (state.hasTraitUnlocked("ENHANCED_ARCANE_CIRCLE")) {
			state.setTimedResource(ResourceType.CircleOfSacrifice, 1);
			state.setTimedResource(ResourceType.BloodsownCircle, 1);
		}
	},
	cooldown: 120,
});

makeRPRWeaponskill("VOID_REAPING", 80, {
	startOnHotbar: false,
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	aspect: Aspect.Physical,
	recastTime: 1.5,
	applicationDelay: 0.53,
	highlightIf: (state) =>
		state.resources.get(ResourceType.LemureShroud).availableAmount() > 1 &&
		!state.hasResourceAvailable(ResourceType.EnhancedCrossReaping),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedVoidReaping);
		state.setTimedResource(ResourceType.EnhancedCrossReaping, 1);
		state.resources.get(ResourceType.LemureShroud).consume(1);
		state.resources.get(ResourceType.VoidShroud).gain(1);

		if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
});

makeRPRWeaponskill("CROSS_REAPING", 80, {
	startOnHotbar: false,
	potency: [
		["NEVER", 460],
		["MELEE_MASTERY_III_RPR", 500],
	],
	aspect: Aspect.Physical,
	recastTime: 1.5,
	applicationDelay: 0.53,
	highlightIf: (state) =>
		state.resources.get(ResourceType.LemureShroud).availableAmount() > 1 &&
		!state.hasResourceAvailable(ResourceType.EnhancedVoidReaping),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.EnhancedCrossReaping);
		state.setTimedResource(ResourceType.EnhancedVoidReaping, 1);
		state.resources.get(ResourceType.LemureShroud).consume(1);
		state.resources.get(ResourceType.VoidShroud).gain(1);

		if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
});

makeResourceAbility("RPR", "ENSHROUD", 80, ResourceType.cd_Enshroud, {
	rscType: ResourceType.Enshrouded,
	highlightIf: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.Shroud, 50) ||
			state.hasResourceAvailable(ResourceType.IdealHost)
		);
	},
	applicationDelay: 0,
	startOnHotbar: true,
	cooldown: 15,
	validateAttempt: (state) => {
		return (
			state.hasResourceAvailable(ResourceType.Shroud, 50) ||
			state.hasResourceAvailable(ResourceType.IdealHost)
		);
	},
	onConfirm: combineEffects(baseOnConfirm("ENSHROUD"), (state: RPRState) => {
		state.enterEnshroud();
	}) as EffectFn<GameState>,
});

makeRPRWeaponskill("PERFECTIO", 100, {
	potency: 1300,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 1.29,
	startOnHotbar: false,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.PerfectioParata),
	onConfirm: (state) => {
		state.resources.get(ResourceType.PerfectioParata).consume(1);
	},
});

makeRPRAbility("REGRESS", 74, ResourceType.cd_BloodStalk, {
	cooldown: 1,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	startOnHotbar: false,
	highlightIf: (_state) => true,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Threshold),
	onConfirm: (state) => state.resources.get(ResourceType.Threshold).consume(1),
});

makeRPRAbility("HELLS_INGRESS", 20, ResourceType.cd_IngressEgress, {
	replaceIf: [
		{
			condition: (state) =>
				state.hasResourceAvailable(ResourceType.Threshold) &&
				state.hasResourceAvailable(ResourceType.HellsIngressUsed),
			newSkill: "REGRESS",
		},
	],
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	onConfirm: (state) => {
		state.resources.get(ResourceType.HellsIngressUsed).gain(1);
		if (state.hasTraitUnlocked("HELLSGATE")) state.setTimedResource(ResourceType.Threshold, 1);
		state.setTimedResource(ResourceType.EnhancedHarpe, 1);
	},
});

makeRPRAbility("HELLS_EGRESS", 20, ResourceType.cd_IngressEgress, {
	replaceIf: [
		{
			condition: (state) =>
				state.hasResourceAvailable(ResourceType.Threshold) &&
				!state.hasResourceAvailable(ResourceType.HellsIngressUsed),
			newSkill: "REGRESS",
		},
	],
	cooldown: 20,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	onConfirm: (state) => {
		state.tryConsumeResource(ResourceType.HellsIngressUsed);
		if (state.hasTraitUnlocked("HELLSGATE")) state.setTimedResource(ResourceType.Threshold, 1);
		state.setTimedResource(ResourceType.EnhancedHarpe, 1);
	},
});

makeRPRAbility("ARCANE_CREST", 40, ResourceType.cd_ArcaneCrest, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable(ResourceType.CrestOfTimeBorrowed),
			newSkill: "ARCANE_CREST_POP",
		},
	],
	cooldown: 30,
	onConfirm: (state) => state.setTimedResource(ResourceType.CrestOfTimeBorrowed, 1),
});

makeRPRAbility("ARCANE_CREST_POP", 40, ResourceType.cd_ArcaneCrestPop, {
	cooldown: 1,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	startOnHotbar: false,
	onConfirm: (state) => {
		state.resources.get(ResourceType.CrestOfTimeBorrowed).consume(1);
		state.setTimedResource(ResourceType.CrestOfTimeReturned, 1);
	},
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.CrestOfTimeBorrowed),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.CrestOfTimeBorrowed),
});

makeRPRWeaponskill("WHORL_OF_DEATH", 35, {
	potency: 100,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 1.15,
	onConfirm: (state) => state.refreshDeathsDesign(),
});

makeRPRWeaponskill("SPINNING_SCYTHE", 25, {
	potency: 160,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.62,
});

makeRPRWeaponskill("NIGHTMARE_SCYTHE", 45, {
	potency: 140,
	combo: {
		potency: 200,
		resource: ResourceType.RPRAoECombo,
		resourceValue: 1,
	},
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.8,
	highlightIf: function (state: Readonly<RPRState>): boolean {
		return state.resources.get(ResourceType.RPRAoECombo).availableAmount() === 1;
	},
});

makeRPRWeaponskill("SOUL_SCYTHE", 65, {
	potency: 180,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.66,
	secondaryCooldown: {
		cdName: ResourceType.cd_SoulSlice,
		cooldown: 30,
		maxCharges: 2,
	},
});

makeRPRWeaponskill("EXECUTIONERS_GUILLOTINE", 96, {
	startOnHotbar: false,
	potency: 300,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.53,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Executioner),
	validateAttempt: executionerPredicate,
});

makeRPRWeaponskill("GRIM_REAPING", 80, {
	startOnHotbar: false,
	potency: 200,
	recastTime: 1.5,
	falloff: 0,
	applicationDelay: 0.8,
	highlightIf: (state) => state.resources.get(ResourceType.LemureShroud).availableAmount() > 1,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.LemureShroud),
	onConfirm: (state) => {
		state.resources.get(ResourceType.LemureShroud).consume(1);
		state.resources.get(ResourceType.VoidShroud).gain(1);

		if (state.resources.get(ResourceType.LemureShroud).availableAmount() === 0) {
			state.exitEnshroud();
		}
	},
	aspect: Aspect.Physical,
});

makeRPRAbility("LEMURES_SCYTHE", 86, ResourceType.cd_LemuresSlice, {
	isPhysical: true,
	potency: 100,
	falloff: 0,
	applicationDelay: 0.66,
	cooldown: 1,
	startOnHotbar: false,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.VoidShroud, 2),
	onConfirm: (state) => {
		state.resources.get(ResourceType.VoidShroud).consume(2);
	},
});

makeRPRWeaponskill("GUILLOTINE", 70, {
	replaceIf: [
		{
			newSkill: "EXECUTIONERS_GUILLOTINE",
			condition: (state) => state.resources.get(ResourceType.Executioner).available(1),
		},
		{
			newSkill: "GRIM_REAPING",
			condition: (state) => state.hasResourceAvailable(ResourceType.Enshrouded),
		},
	],
	potency: 200,
	aspect: Aspect.Physical,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.49,
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SoulReaver),
	validateAttempt: reaverPredicate,
});
