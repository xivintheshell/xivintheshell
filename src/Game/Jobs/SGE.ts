import { SGEStatusPropsGenerator } from "../../Components/Jobs/SGE";
import { localize, localizeResourceType } from "../../Components/Localization";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { Aspect, BuffType } from "../Common";
import { RESOURCES, TraitKey } from "../Data";
import { SGEResourceKey, SGEActionKey, SGECooldownKey } from "../Data/Jobs/SGE";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, Potency, PotencyModifier } from "../Potency";
import {
	CoolDown,
	Event,
	getAllResources,
	getResourceInfo,
	makeResource,
	Resource,
	ResourceInfo,
} from "../Resources";
import {
	Ability,
	combineEffects,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	MakeAbilityParams,
	MakeGCDParams,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	PotencyModifierFn,
	ResourceCalculationFn,
	Skill,
	Spell,
} from "../Skills";

const makeSGEResource = (
	rsc: SGEResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("SGE", rsc, maxValue, params ?? {});
};

makeSGEResource("ADDERSGALL", 3, { default: 3, timeout: 20 });
makeSGEResource("ADDERSTING", 3, { default: 3 });

makeSGEResource("EUKRASIA", 1);
makeSGEResource("KARDIA", 1, { default: 1 });
makeSGEResource("KARDION", 1, { default: 1 });

makeSGEResource("EUKRASIAN_DIAGNOSIS", 1, { timeout: 30 });
makeSGEResource("DIFFERENTIAL_DIAGNOSIS", 1, { timeout: 30 });
makeSGEResource("EUKRASIAN_PROGNOSIS", 1, { timeout: 30 });

makeSGEResource("HAIMA", 1, { timeout: 15 });
makeSGEResource("HAIMATINON", 5, { timeout: 15 });
makeSGEResource("PANHAIMA", 1, { timeout: 15 });
makeSGEResource("PANHAIMATINON", 5, { timeout: 15 });

makeSGEResource("PHYSIS_II", 1, { timeout: 15 });
makeSGEResource("AUTOPHYSIS", 1, { timeout: 15 });

makeSGEResource("PHILOSOPHIA", 1, { timeout: 20 });
makeSGEResource("EUDAIMONIA", 1, { timeout: 20 });

makeSGEResource("HOLOS", 1, { timeout: 20 });
makeSGEResource("HOLOSAKOS", 1, { timeout: 30 });

makeSGEResource("SOTERIA", 4, { timeout: 15 });
makeSGEResource("ZOE", 1, { timeout: 30 });
makeSGEResource("KRASIS", 1, { timeout: 10 });

makeSGEResource("KERACHOLE", 1, { timeout: 15 });
makeSGEResource("KERAKEIA", 1, { timeout: 15 });
makeSGEResource("TAUROCHOLE", 1, { timeout: 15 });

makeSGEResource("EUKRASIAN_DOSIS", 1, { timeout: 30 });
makeSGEResource("EUKRASIAN_DOSIS_II", 1, { timeout: 30 });
makeSGEResource("EUKRASIAN_DOSIS_III", 1, { timeout: 30 });
makeSGEResource("EUKRASIAN_DYSKRASIA", 1, { timeout: 30 });

/**
 * Note re: current shield implementation:
 * Currently, only a single Eukrasian Diagnosis application is tracked.
 * Future state should track shield applications by target, with some method for allowing the user to pick which
 * target that shield application applies to. This should also handle EProg not applying to targets that already
 * have EDiag, and EDiag overwriting targets that had EProg. That requires some fundamental changes to the
 * underlying code, so I'm leaving this for a separate PR in favor of getting SGE working to some degree, and
 * focusing on the healing potency addition for now.
 */

export class SGEState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		if (!this.hasTraitUnlocked("ENHANCED_SWIFTCAST")) {
			this.cooldowns.set(new CoolDown("cd_SWIFTCAST", 60, 1, 1));
		}

		if (!this.hasTraitUnlocked("ENHANCED_PHYSIS_II")) {
			const autoPhysisInfo = getAllResources(this.job).get("AUTOPHYSIS") as ResourceInfo;
			autoPhysisInfo.maxTimeout = 10;
			getAllResources(this.job).set("AUTOPHYSIS", autoPhysisInfo);
		}

		if (!this.hasTraitUnlocked("ENHANCED_SOTERIA")) {
			this.cooldowns.set(new CoolDown("cd_SOTERIA", 90, 1, 1));
		}

		if (!this.hasTraitUnlocked("ENHANCED_ZOE")) {
			this.cooldowns.set(new CoolDown("cd_ZOE", 120, 1, 1));
		}

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Eukrasian DoT" }),
				groupedEffects: [
					{
						effectName: "EUKRASIAN_DOSIS",
						appliedBy: ["EUKRASIAN_DOSIS"],
					},
					{
						effectName: "EUKRASIAN_DOSIS_II",
						appliedBy: ["EUKRASIAN_DOSIS_II"],
					},
					{
						effectName: "EUKRASIAN_DOSIS_III",
						appliedBy: ["EUKRASIAN_DOSIS_III"],
					},
					{
						effectName: "EUKRASIAN_DYSKRASIA",
						appliedBy: ["EUKRASIAN_DYSKRASIA"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "PHYSIS_II",
						appliedBy: ["PHYSIS_II"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "KERAKEIA",
						appliedBy: ["KERACHOLE"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SGEState> {
		return new SGEStatusPropsGenerator(this);
	}

	override jobSpecificRegisterRecurringEvents() {
		// Addersgall recurring timer
		const recurringAddersgallGain = (rsc: Resource) => {
			const addersgallInfo = getResourceInfo("SGE", "ADDERSGALL") as ResourceInfo;
			// Not logging a warning since Rhizomata use can desync the timer from when it actually overcapped
			if (!this.hasResourceAvailable("ADDERSGALL", addersgallInfo.maxValue)) {
				this.resources.get("ADDERSGALL").gain(1);
			}

			this.resources.addResourceEvent({
				rscType: "ADDERSGALL",
				name: "gain addersgall if not currently capped",
				delay: addersgallInfo.maxTimeout,
				fnOnRsc: recurringAddersgallGain,
			});
		};
		recurringAddersgallGain(this.resources.get("ADDERSGALL"));
	}

	override jobSpecificAddHealingBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("AUTOPHYSIS")) {
			node.addBuff(BuffType.Autophysis);
		}
		if (this.hasResourceAvailable("KRASIS")) {
			node.addBuff(BuffType.Krasis);
		}

		// If the heal in question isn't a GCD heal, it's not affected by Zoe or Philosophia. Bail out.
		if (skill.cdName !== "cd_GCD") {
			return;
		}

		if (this.hasResourceAvailable("ZOE")) {
			node.addBuff(BuffType.Zoe);
		}
		if (this.hasResourceAvailable("PHILOSOPHIA")) {
			node.addBuff(BuffType.Philosophia);
		}
	}

	consumeAddersgall() {
		const addersgallInfo = getResourceInfo("SGE", "ADDERSGALL") as ResourceInfo;

		// If Addersgall was capped before this consumption event, restart the timer
		if (this.hasResourceAvailable("ADDERSGALL", addersgallInfo.maxValue)) {
			this.resources.get("ADDERSGALL").overrideTimer(this, addersgallInfo.maxTimeout);
		}

		this.tryConsumeResource("ADDERSGALL");
		this.resources.get("MANA").gain(700);
	}

	addPepsisPotency(consumedShield: SGEResourceKey, node: ActionNode) {
		const pepsisPotency = new Potency({
			config: this.config,
			sourceTime: this.getDisplayTime(),
			sourceSkill: "PEPSIS",
			aspect: Aspect.Other,
			basePotency: consumedShield === "EUKRASIAN_DIAGNOSIS" ? 450 : 350,
			description: localizeResourceType(consumedShield),
			targetCount: consumedShield === "EUKRASIAN_DIAGNOSIS" ? 1 : this.partySize,
			snapshotTime: this.getDisplayTime(),
		});
		if (this.hasResourceAvailable("TINCTURE")) {
			pepsisPotency.modifiers.push(Modifiers.Tincture);
		}
		if (this.hasResourceAvailable("AUTOPHYSIS")) {
			pepsisPotency.modifiers.push(Modifiers.Autophysis);
		}
		if (this.hasResourceAvailable("KRASIS")) {
			if (consumedShield === "EUKRASIAN_PROGNOSIS") {
				const nonKrasisPotency = new Potency({
					config: this.config,
					sourceTime: this.getDisplayTime(),
					sourceSkill: "PEPSIS",
					aspect: Aspect.Other,
					basePotency: pepsisPotency.base,
					description: localizeResourceType(consumedShield),
					targetCount: pepsisPotency.targetCount - 1,
					snapshotTime: this.getDisplayTime(),
				});
				node.addHoTPotency(nonKrasisPotency, "PEPSIS");
				pepsisPotency.targetCount = 1;
				pepsisPotency.description += ", " + localizeResourceType("KRASIS");
			}
			pepsisPotency.modifiers.push(Modifiers.Krasis);
		}
		node.addHoTPotency(pepsisPotency, "PEPSIS");
	}

	addHaimaExpirationPotency(effect: SGEResourceKey, node: ActionNode) {
		if (!(effect === "HAIMA" || effect === "PANHAIMA")) {
			return;
		}
		const expirationPotency = new Potency({
			config: this.config,
			sourceTime: this.getDisplayTime(),
			sourceSkill: effect === "HAIMA" ? "HAIMA" : "PANHAIMA",
			aspect: Aspect.Other,
			basePotency: effect === "HAIMA" ? 150 : 100,
			description: "",
			targetCount: effect === "HAIMA" ? 1 : this.partySize,
			snapshotTime: this.getDisplayTime(),
		});
		if (this.hasResourceAvailable("TINCTURE")) {
			expirationPotency.modifiers.push(Modifiers.Tincture);
		}
		if (this.hasResourceAvailable("AUTOPHYSIS")) {
			expirationPotency.modifiers.push(Modifiers.Autophysis);
		}
		if (this.hasResourceAvailable("KRASIS")) {
			if (effect === "PANHAIMA") {
				const nonKrasisPanhaimaPotency = new Potency({
					config: this.config,
					sourceTime: this.getDisplayTime(),
					sourceSkill: "PANHAIMA",
					aspect: Aspect.Other,
					basePotency: 100,
					description: "",
					targetCount: this.partySize - 1,
					snapshotTime: this.getDisplayTime(),
				});
				node.addHoTPotency(nonKrasisPanhaimaPotency, effect);
				expirationPotency.targetCount = 1;
			}
			expirationPotency.modifiers.push(Modifiers.Krasis);
		}
		node.addHoTPotency(expirationPotency, effect);
	}

	handleHaimaExpiration(effect: SGEResourceKey, node: ActionNode) {
		if (!(effect === "HAIMA" || effect === "PANHAIMA")) {
			return;
		}

		const stackEffect: SGEResourceKey = effect === "HAIMA" ? "HAIMATINON" : "PANHAIMATINON";
		const stacksRemaining = this.resources.get(stackEffect).availableAmount();
		// No stacks remaining means no expiration heal
		if (stacksRemaining <= 0) {
			return;
		}
		this.addEvent(
			new Event(`${RESOURCES[effect].name} expiration heal`, 0.001, () => {
				node.getHotPotencies(effect).forEach((expirationPotency) => {
					expirationPotency.description =
						localizeResourceType(effect) +
						" " +
						localize({ en: "expiration" }) +
						" (" +
						stacksRemaining +
						" " +
						localize({ en: "stacks" }) +
						")";
					if (
						effect === "PANHAIMA" &&
						expirationPotency.modifiers.includes(Modifiers.Krasis)
					) {
						expirationPotency.description += ", " + localizeResourceType("KRASIS");
					}
					expirationPotency.base *= stacksRemaining;
					controller.resolveHealingPotency(expirationPotency);
				});
			}),
		);
	}

	// Modifiers that only affect the caster's own GCD heals
	addHealingMagicPotencyModifiers(modifiers: PotencyModifier[]) {
		if (this.hasResourceAvailable("ZOE")) {
			modifiers.push(Modifiers.Zoe);
		}
		if (this.hasResourceAvailable("PHILOSOPHIA")) {
			modifiers.push(Modifiers.Philosophia);
		}
	}

	// Modifiers that affect incoming heals on the player with the effect
	addHealingActionPotencyModifiers(modifiers: PotencyModifier[]) {
		if (this.hasResourceAvailable("AUTOPHYSIS")) {
			modifiers.push(Modifiers.Autophysis);
		}
		if (this.hasResourceAvailable("KRASIS")) {
			modifiers.push(Modifiers.Krasis);
		}
	}
}

const makeSGESpell = (
	name: SGEActionKey,
	unlockLevel: number,
	params: Partial<MakeGCDParams<SGEState>>,
): Spell<SGEState> => {
	const defaultCastTime: ResourceCalculationFn<SGEState> = (state) =>
		state.config.adjustedCastTime(1.5);
	const defaultRecastTime: ResourceCalculationFn<SGEState> = (state) =>
		state.config.adjustedGCD(2.5);
	const jobHealingPotencyModifiers: PotencyModifierFn<SGEState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];

		state.addHealingMagicPotencyModifiers(modifiers);
		state.addHealingActionPotencyModifiers(modifiers);

		return modifiers;
	};
	const onConfirm: EffectFn<SGEState> = combineEffects(
		(state) => {
			// If a non-default cast time of zero was provided, it's already instant
			if (params.castTime === 0) {
				return;
			}
			// Otherwise consume swiftcast
			state.tryConsumeResource("SWIFTCAST");
		},
		(state, node) => {
			// If Kardia is off, or the spell doesn't do damage, bail
			if (!(state.hasResourceAvailable("KARDIA") && node.getInitialPotency())) {
				return;
			}

			// Add Kardia healing potency
			const kardiaPotency = new Potency({
				config: state.config,
				sourceTime: state.getDisplayTime(),
				sourceSkill: name,
				aspect: Aspect.Other,
				basePotency: state.hasTraitUnlocked("ENHANCED_HEALING_MAGIC") ? 170 : 130,
				description: localizeResourceType("KARDIA"),
				targetCount: 1,
				snapshotTime: state.getDisplayTime(),
			});
			if (state.hasResourceAvailable("TINCTURE")) {
				kardiaPotency.modifiers.push(Modifiers.Tincture);
			}
			if (state.hasResourceAvailable("SOTERIA")) {
				kardiaPotency.modifiers.push(Modifiers.Soteria);
			}

			state.addHealingActionPotencyModifiers(kardiaPotency.modifiers);

			node.addHoTPotency(kardiaPotency, "KARDION");
		},
		(state, node) => {
			if (!state.hasResourceAvailable("EUDAIMONIA")) {
				return;
			}

			// Add Eudaimonia healing potency
			const eudaimoniaPotency = new Potency({
				config: state.config,
				sourceTime: state.getDisplayTime(),
				sourceSkill: name,
				aspect: Aspect.Other,
				basePotency: 150,
				description: localizeResourceType("EUDAIMONIA"),
				targetCount: state.partySize,
				snapshotTime: state.getDisplayTime(),
			});
			if (state.hasResourceAvailable("TINCTURE")) {
				eudaimoniaPotency.modifiers.push(Modifiers.Tincture);
			}

			state.addHealingActionPotencyModifiers(eudaimoniaPotency.modifiers);

			node.addHoTPotency(eudaimoniaPotency, "EUDAIMONIA");
		},
		(state) => {
			if (!params.healingPotency) {
				return;
			}
			state.tryConsumeResource("ZOE");
		},
		params.onConfirm,
	);
	return makeSpell("SGE", name, unlockLevel, {
		...params,
		castTime: params.castTime ?? defaultCastTime,
		recastTime: params.recastTime ?? defaultRecastTime,
		isInstantFn: (state) => state.hasResourceAvailable("SWIFTCAST"),
		jobHealingPotencyModifiers,
		onConfirm,
		onApplication: combineEffects((state, node) => {
			const kardiaPotencies = node.getHotPotencies("KARDION");
			const eudaimoniaPotencies = node.getHotPotencies("EUDAIMONIA");

			if (kardiaPotencies.length > 0) {
				controller.resolveHealingPotency(kardiaPotencies[0]);
				state.tryConsumeResource("SOTERIA");
			}
			eudaimoniaPotencies.forEach((eudaimoniaPotency) => {
				controller.resolveHealingPotency(eudaimoniaPotency);
			});
		}, params.onApplication),
	});
};

const makeSGEAbility = (
	name: SGEActionKey,
	unlockLevel: number,
	cdName: SGECooldownKey,
	params: Partial<MakeAbilityParams<SGEState>>,
): Ability<SGEState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<SGEState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];

		state.addHealingActionPotencyModifiers(modifiers);

		return modifiers;
	};
	return makeAbility("SGE", name, unlockLevel, cdName, {
		...params,
		jobHealingPotencyModifiers,
	});
};

const makeSGEResourceAbility = (
	name: SGEActionKey,
	unlockLevel: number,
	cdName: SGECooldownKey,
	params: MakeResourceAbilityParams<SGEState>,
): Ability<SGEState> => {
	return makeResourceAbility("SGE", name, unlockLevel, cdName, params);
};

makeSGESpell("EUKRASIA", 30, {
	castTime: 0,
	recastTime: 1,
	applicationDelay: 0,
	validateAttempt: (state) => !state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state) => state.gainStatus("EUKRASIA"),
});

makeSGESpell("DOSIS", 1, {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("EUKRASIA"),
			newSkill: "EUKRASIAN_DOSIS",
		},
	],
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY",
		otherSkill: "DOSIS_II",
	},
	manaCost: 300,
	potency: 300,
	applicationDelay: 0.67,
});

makeSGESpell("DOSIS_II", 72, {
	startOnHotbar: false,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("EUKRASIA"),
			newSkill: "EUKRASIAN_DOSIS_II",
		},
	],
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY_II",
		otherSkill: "DOSIS_III",
	},
	manaCost: 400,
	potency: 320,
	applicationDelay: 0.67,
});

const DOSIS_III_POTENCY: Array<[TraitKey, number]> = [
	["NEVER", 330],
	["MAGICK_MASTERY_HEALER", 380],
];

makeSGESpell("DOSIS_III", 82, {
	startOnHotbar: false,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("EUKRASIA"),
			newSkill: "EUKRASIAN_DOSIS_III",
		},
	],
	manaCost: 400,
	potency: DOSIS_III_POTENCY,
	applicationDelay: 0.67,
});

makeSGESpell("EUKRASIAN_DOSIS", 30, {
	startOnHotbar: false,
	manaCost: 400,
	castTime: 0,
	recastTime: 1.5,
	applicationDelay: 0.76,
	drawsAggro: true,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "EUKRASIAN_DOSIS",
			skillName: "EUKRASIAN_DOSIS",
			tickPotency: 40,
			speedStat: "sps",
		});
		state.tryConsumeResource("EUKRASIA");
	},
	onApplication: (state, node) => {
		state.applyDoT("EUKRASIAN_DOSIS", node);
	},
});

makeSGESpell("EUKRASIAN_DOSIS_II", 72, {
	startOnHotbar: false,
	manaCost: 400,
	castTime: 0,
	recastTime: 1.5,
	applicationDelay: 0.76,
	drawsAggro: true,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "EUKRASIAN_DOSIS_II",
			skillName: "EUKRASIAN_DOSIS_II",
			tickPotency: 60,
			speedStat: "sps",
		});
		state.tryConsumeResource("EUKRASIA");
	},
	onApplication: (state, node) => {
		state.applyDoT("EUKRASIAN_DOSIS_II", node);
	},
});

makeSGESpell("EUKRASIAN_DOSIS_III", 82, {
	startOnHotbar: false,
	manaCost: 400,
	castTime: 0,
	recastTime: 1.5,
	applicationDelay: 0.76,
	drawsAggro: true,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "EUKRASIAN_DOSIS_III",
			skillName: "EUKRASIAN_DOSIS_III",
			tickPotency: 85,
			speedStat: "sps",
		});
		state.tryConsumeResource("EUKRASIA");
	},
	onApplication: (state, node) => {
		state.applyDoT("EUKRASIAN_DOSIS_III", node);
	},
});

makeSGESpell("TOXIKON", 66, {
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY_II",
		otherSkill: "TOXIKON_II",
	},
	potency: [
		["NEVER", 240],
		["OFFENSIVE_MAGIC_MASTERY", 300],
	],
	falloff: 0.5,
	applicationDelay: 1.2,
	castTime: 0,
	validateAttempt: (state) => state.hasResourceAvailable("ADDERSTING"),
	onConfirm: (state) => state.tryConsumeResource("ADDERSTING"),
});
makeSGESpell("TOXIKON_II", 82, {
	startOnHotbar: false,
	potency: DOSIS_III_POTENCY,
	falloff: 0.5,
	applicationDelay: 1.2,
	castTime: 0,
	validateAttempt: (state) => state.hasResourceAvailable("ADDERSTING"),
	onConfirm: (state) => state.tryConsumeResource("ADDERSTING"),
});

makeSGESpell("PHLEGMA", 26, {
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY",
		otherSkill: "PHLEGMA_II",
	},
	potency: 400,
	falloff: 0.5,
	applicationDelay: 0.67,
	manaCost: 400,
	castTime: 0,
	secondaryCooldown: {
		cdName: "cd_PHLEGMA",
		maxCharges: 2,
		cooldown: 40,
	},
});
makeSGESpell("PHLEGMA_II", 72, {
	startOnHotbar: false,
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY_II",
		otherSkill: "PHLEGMA_III",
	},
	potency: 490,
	falloff: 0.5,
	applicationDelay: 0.67,
	manaCost: 400,
	castTime: 0,
	secondaryCooldown: {
		cdName: "cd_PHLEGMA",
		maxCharges: 2,
		cooldown: 40,
	},
});
makeSGESpell("PHLEGMA_III", 82, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.5,
	applicationDelay: 0.67,
	manaCost: 400,
	castTime: 0,
	secondaryCooldown: {
		cdName: "cd_PHLEGMA",
		maxCharges: 2,
		cooldown: 40,
	},
});

makeSGEAbility("PSYCHE", 92, "cd_PSYCHE", {
	potency: 600,
	falloff: 0.5,
	applicationDelay: 2.1,
	cooldown: 60,
});

makeSGESpell("DYSKRASIA", 46, {
	autoUpgrade: {
		trait: "OFFENSIVE_MAGIC_MASTERY_II",
		otherSkill: "DYSKRASIA_II",
	},
	potency: 160,
	falloff: 0,
	applicationDelay: 0.76,
	manaCost: 400,
	castTime: 0,
});
makeSGESpell("DYSKRASIA_II", 82, {
	startOnHotbar: false,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("EUKRASIA"),
			newSkill: "EUKRASIAN_DYSKRASIA",
		},
	],
	potency: 170,
	falloff: 0,
	applicationDelay: 0.76,
	manaCost: 400,
	castTime: 0,
});
makeSGESpell("EUKRASIAN_DYSKRASIA", 82, {
	startOnHotbar: false,
	falloff: 0,
	applicationDelay: 1.03,
	castTime: 0,
	recastTime: 1.5,
	drawsAggro: true,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "EUKRASIAN_DYSKRASIA",
			skillName: "EUKRASIAN_DYSKRASIA",
			tickPotency: 40,
			speedStat: "sps",
		});
		state.tryConsumeResource("EUKRASIA");
	},
	onApplication: (state, node) => {
		state.applyDoT("EUKRASIAN_DYSKRASIA", node);
	},
});

makeSGESpell("DIAGNOSIS", 2, {
	healingPotency: [
		["NEVER", 400],
		["ENHANCED_HEALING_MAGIC", 450],
	],
	applicationDelay: 0.58,
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("EUKRASIA"),
			newSkill: "EUKRASIAN_DIAGNOSIS",
		},
	],
	manaCost: 400,
});
makeSGESpell("EUKRASIAN_DIAGNOSIS", 30, {
	startOnHotbar: false,
	healingPotency: 300,
	applicationDelay: 0.67,
	castTime: 0,
	recastTime: 1.5,
	manaCost: 800,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state) => state.tryConsumeResource("EUKRASIA"),
	onApplication: (state) => state.gainStatus("EUKRASIAN_DIAGNOSIS"),
});
makeSGEAbility("EUKRASIAN_DIAGNOSIS_POP", 30, "cd_DIAGNOSIS_POP", {
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIAN_DIAGNOSIS"),
	onConfirm: (state) => {
		state.tryConsumeResource("EUKRASIAN_DIAGNOSIS");
		state.resources.get("ADDERSTING").gain(1);
	},
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIAN_DIAGNOSIS"),
});

makeSGESpell("PROGNOSIS", 10, {
	healingPotency: 300,
	aoeHeal: true,
	applicationDelay: 0.58,
	replaceIf: [
		{
			condition: (state) =>
				state.hasResourceAvailable("EUKRASIA") &&
				state.hasTraitUnlocked("EUKRASIAN_PROGNOSIS_MASTERY"),
			newSkill: "EUKRASIAN_PROGNOSIS_II",
		},
		{
			condition: (state) =>
				state.hasResourceAvailable("EUKRASIA") &&
				!state.hasTraitUnlocked("EUKRASIAN_PROGNOSIS_MASTERY"),
			newSkill: "EUKRASIAN_PROGNOSIS",
		},
	],
	manaCost: 700,
	castTime: (state) => state.config.adjustedCastTime(2),
});
makeSGESpell("EUKRASIAN_PROGNOSIS", 30, {
	startOnHotbar: false,
	autoUpgrade: {
		trait: "EUKRASIAN_PROGNOSIS_MASTERY",
		otherSkill: "EUKRASIAN_PROGNOSIS_II",
	},
	healingPotency: 100,
	aoeHeal: true,
	applicationDelay: 0.94,
	castTime: 0,
	recastTime: 1.5,
	manaCost: 800,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state) => state.tryConsumeResource("EUKRASIA"),
	onApplication: (state) => state.gainStatus("EUKRASIAN_PROGNOSIS"),
});
makeSGESpell("EUKRASIAN_PROGNOSIS_II", 96, {
	startOnHotbar: false,
	healingPotency: 100,
	aoeHeal: true,
	applicationDelay: 0.94,
	castTime: 0,
	recastTime: 1.5,
	manaCost: 800,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIA"),
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIA"),
	onConfirm: (state) => state.tryConsumeResource("EUKRASIA"),
	onApplication: (state) => state.gainStatus("EUKRASIAN_PROGNOSIS"),
});
makeSGEAbility("EUKRASIAN_PROGNOSIS_POP", 30, "cd_PROGNOSIS_POP", {
	autoUpgrade: {
		trait: "EUKRASIAN_PROGNOSIS_MASTERY",
		otherSkill: "EUKRASIAN_PROGNOSIS_II_POP",
	},
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIAN_PROGNOSIS"),
	onConfirm: (state) => {
		state.tryConsumeResource("EUKRASIAN_PROGNOSIS");
		state.resources.get("ADDERSTING").gain(1);
	},
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIAN_PROGNOSIS"),
});
makeSGEAbility("EUKRASIAN_PROGNOSIS_II_POP", 30, "cd_PROGNOSIS_POP", {
	startOnHotbar: false,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("EUKRASIAN_PROGNOSIS"),
	onConfirm: (state) => {
		state.tryConsumeResource("EUKRASIAN_PROGNOSIS");
		state.resources.get("ADDERSTING").gain(1);
	},
	highlightIf: (state) => state.hasResourceAvailable("EUKRASIAN_PROGNOSIS"),
});

makeSGESpell("PNEUMA", 90, {
	potency: DOSIS_III_POTENCY,
	falloff: 0.4,
	healingPotency: 600,
	aoeHeal: true,
	applicationDelay: 0.58,
	manaCost: 700,
	secondaryCooldown: {
		cdName: "cd_PNEUMA",
		maxCharges: 1,
		cooldown: 120,
	},
});

makeSGEResourceAbility("ZOE", 56, "cd_ZOE", {
	rscType: "ZOE",
	applicationDelay: 0,
	cooldown: 90,
});

makeSGEAbility("PEPSIS", 58, "cd_PEPSIS", {
	cooldown: 30,
	applicationDelay: 1.16,
	onConfirm: (state, node) => {
		if (state.hasResourceAvailable("EUKRASIAN_DIAGNOSIS")) {
			state.addPepsisPotency("EUKRASIAN_DIAGNOSIS", node);
			state.tryConsumeResource("EUKRASIAN_DIAGNOSIS");
		}
		if (state.hasResourceAvailable("EUKRASIAN_PROGNOSIS")) {
			state.addPepsisPotency("EUKRASIAN_PROGNOSIS", node);
			state.tryConsumeResource("EUKRASIAN_PROGNOSIS");
		}
	},
	onApplication: (_state, node) => {
		node.getHotPotencies("PEPSIS").forEach((pepsisPotency) => {
			controller.resolveHealingPotency(pepsisPotency);
		});
	},
});

makeSGEResourceAbility("SOTERIA", 35, "cd_SOTERIA", {
	rscType: "SOTERIA",
	applicationDelay: 0.8,
	cooldown: 60,
});

makeSGEResourceAbility("KRASIS", 86, "cd_KRASIS", {
	rscType: "KRASIS",
	applicationDelay: 0.76,
	cooldown: 60,
});

makeSGEAbility("HAIMA", 70, "cd_HAIMA", {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("HAIMA"),
			newSkill: "HAIMA_POP",
		},
	],
	applicationDelay: 0.76,
	cooldown: 120,
	onConfirm: (state, node) => state.addHaimaExpirationPotency("HAIMA", node),
	onApplication: (state, node) => {
		const haimaStacks = (getResourceInfo("SGE", "HAIMATINON") as ResourceInfo).maxValue;
		state.gainStatus("HAIMA");
		state.gainStatus("HAIMATINON", haimaStacks);
		state.addEvent(
			new Event(
				"Haima Expiration heal Check",
				(getResourceInfo("SGE", "HAIMA") as ResourceInfo).maxTimeout - 0.001, // Check just before the effect expires
				() => state.handleHaimaExpiration("HAIMA", node),
			),
		);
	},
});
makeSGEAbility("HAIMA_POP", 70, "cd_HAIMA_POP", {
	startOnHotbar: false,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("HAIMA"),
	highlightIf: (state) => state.hasResourceAvailable("HAIMA"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("HAIMATINON")) {
			state.tryConsumeResource("HAIMATINON");
		} else {
			state.tryConsumeResource("HAIMA");
		}
	},
});

makeSGEAbility("PHYSIS_II", 60, "cd_PHYSIS", {
	aoeHeal: true,
	applicationDelay: 0.85,
	cooldown: 60,
	onConfirm: (state, node) => {
		state.addHoTPotencies({
			node,
			skillName: "PHYSIS_II",
			effectName: "PHYSIS_II",
			speedStat: "sps",
			tickPotency: 130,
		});
	},
	onApplication: (state, node) => {
		state.applyHoT("PHYSIS_II", node);
		state.gainStatus("AUTOPHYSIS");
	},
});

makeSGEAbility("PHILOSOPHIA", 100, "cd_PHILOSOPHIA", {
	applicationDelay: 1.83,
	cooldown: 180,
	onApplication: (state) => {
		state.gainStatus("PHILOSOPHIA");
		state.gainStatus("EUDAIMONIA");
	},
});

makeSGEAbility("HOLOS", 76, "cd_HOLOS", {
	applicationDelay: 0.62,
	cooldown: 120,
	onApplication: (state) => {
		state.gainStatus("HOLOS");
		state.gainStatus("HOLOSAKOS");
	},
});

makeSGEAbility("PANHAIMA", 80, "cd_PANHAIMA", {
	replaceIf: [
		{
			condition: (state) => state.hasResourceAvailable("PANHAIMA"),
			newSkill: "PANHAIMA_POP",
		},
	],
	applicationDelay: 0.62,
	cooldown: 120,
	onConfirm: (state, node) => state.addHaimaExpirationPotency("PANHAIMA", node),
	onApplication: (state, node) => {
		const panhaimaStacks = (getResourceInfo("SGE", "PANHAIMATINON") as ResourceInfo).maxValue;
		state.gainStatus("PANHAIMA");
		state.gainStatus("PANHAIMATINON", panhaimaStacks);
		state.addEvent(
			new Event(
				"Panhaima Expiration heal Check",
				(getResourceInfo("SGE", "PANHAIMA") as ResourceInfo).maxTimeout - 0.001, // Check just before the effect expires
				() => state.handleHaimaExpiration("PANHAIMA", node),
			),
		);
	},
});
makeSGEAbility("PANHAIMA_POP", 80, "cd_PANHAIMA_POP", {
	startOnHotbar: false,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("PANHAIMA"),
	highlightIf: (state) => state.hasResourceAvailable("PANHAIMA"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("PANHAIMATINON")) {
			state.tryConsumeResource("PANHAIMATINON");
		} else {
			state.tryConsumeResource("PANHAIMA");
		}
	},
});

makeSGEAbility("RHIZOMATA", 74, "cd_RHIZOMATA", {
	cooldown: 90,
	onConfirm: (state) => state.resources.get("ADDERSGALL").gain(1),
});

makeSGEAbility("DRUOCHOLE", 45, "cd_DRUOCHOLE", {
	cooldown: 1,
	healingPotency: 600,
	applicationDelay: 0.78,
	validateAttempt: (state) => state.hasResourceAvailable("ADDERSGALL"),
	onConfirm: (state) => state.consumeAddersgall(),
});

makeSGEAbility("IXOCHOLE", 52, "cd_IXOCHOLE", {
	cooldown: 30,
	healingPotency: 400,
	aoeHeal: true,
	applicationDelay: 0.756,
	validateAttempt: (state) => state.hasResourceAvailable("ADDERSGALL"),
	onConfirm: (state) => state.consumeAddersgall(),
});

makeSGEAbility("TAUROCHOLE", 62, "cd_TAUROCHOLE", {
	cooldown: 45,
	applicationDelay: 0.67,
	onConfirm: (state) => state.consumeAddersgall(),
	onApplication: (state) => state.gainStatus("TAUROCHOLE"),
});

makeSGEAbility("KERACHOLE", 50, "cd_KERACHOLE", {
	cooldown: 30,
	aoeHeal: true,
	applicationDelay: 0.81,
	validateAttempt: (state) => state.hasResourceAvailable("ADDERSGALL"),
	onConfirm: (state, node) => {
		state.consumeAddersgall();
		state.addHoTPotencies({
			node,
			skillName: "KERACHOLE",
			effectName: "KERAKEIA",
			speedStat: "sps",
			tickPotency: 100,
		});
	},
	onApplication: (state, node) => {
		state.gainStatus("KERACHOLE");
		if (state.hasTraitUnlocked("ENHANCED_KERACHOLE")) {
			state.applyHoT("KERAKEIA", node);
		}
	},
});

makeSGESpell("EGEIRO", 12, {
	applicationDelay: 0.58,
	manaCost: 2400,
	castTime: 8,
});

makeSGEAbility("KARDIA", 4, "cd_KARDIA", {
	applicationDelay: 0.62,
	cooldown: 5,
	onApplication: (state) => {
		state.gainStatus("KARDIA");
		state.gainStatus("KARDION");
	},
});

makeSGEAbility("ICARUS", 40, "cd_ICARUS", {
	cooldown: 45,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});
