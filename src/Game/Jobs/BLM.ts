// Skill and state declarations for BLM.

import { ActionNode } from "../../Controller/Record";
import { Aspect, BuffType, Debug } from "../Common";
import { PotencyModifierType, PotencyMultiplier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	Skill,
	SkillAutoReplace,
	Spell,
	StatePredicate,
} from "../Skills";
import { GameState } from "../GameState";
import { makeResource, CoolDown, Event, Resource } from "../Resources";
import { GameConfig } from "../GameConfig";
import { localize } from "../../Components/Localization";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { BLMStatusPropsGenerator } from "../../Components/Jobs/BLM";
import { BLMResourceKey, BLMActionKey, BLMCooldownKey } from "../Data/Jobs/BLM";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeBLMResource = (
	rsc: BLMResourceKey,
	maxValue: number,
	params?: { timeout: number; warnOnOvercap?: boolean },
) => {
	makeResource("BLM", rsc, maxValue, params ?? {});
};

makeBLMResource("POLYGLOT", 3, { timeout: 30, warnOnOvercap: true });
makeBLMResource("ASTRAL_FIRE", 3);
makeBLMResource("UMBRAL_ICE", 3);
makeBLMResource("UMBRAL_HEART", 3);
makeBLMResource("ASTRAL_SOUL", 6);
makeBLMResource("LEY_LINES", 1, { timeout: 20 });
makeBLMResource("ENOCHIAN", 1);
makeBLMResource("PARADOX", 1);

makeBLMResource("FIRESTARTER", 1);

// [6/29/24] note: from screen recording it looks more like: button press (0.1s) gain buff (30.0s) lose buff
// see: https://drive.google.com/file/d/11KEAEjgezCKxhvUsaLTjugKAH_D1glmy/view?usp=sharing
makeBLMResource("THUNDERHEAD", 1);
makeBLMResource("THUNDER_III", 1, { timeout: 27 });
makeBLMResource("THUNDER_IV", 1, { timeout: 21 });
makeBLMResource("HIGH_THUNDER", 1, { timeout: 30 });
makeBLMResource("HIGH_THUNDER_II", 1, { timeout: 24 });
makeBLMResource("MANAWARD", 1, { timeout: 20 });

// 15.7s: see screen recording: https://drive.google.com/file/d/1qoIpAMK2KAKETgID6a3p5dqkeWRcNDdB/view?usp=drive_link
makeBLMResource("TRIPLECAST", 3, { timeout: 15.7 });

// === JOB GAUGE AND STATE ===
export class BLMState extends GameState {
	thunderTickOffset: number;

	constructor(config: GameConfig) {
		super(config);

		// HACK: if UH or AF was set by override (but eno was not), then grant the enochian buff
		const startsWithEno = config.initialResourceOverrides.some(
			(override) =>
				(override.type === "ASTRAL_FIRE" || override.type === "UMBRAL_ICE") &&
				override.stacks > 0,
		);
		if (startsWithEno) {
			this.gainStatus("ENOCHIAN");
		}

		this.thunderTickOffset = this.nonProcRng() * 3.0;

		const polyglotStacks =
			(this.hasTraitUnlocked("ENHANCED_POLYGLOT_II") && 3) ||
			(this.hasTraitUnlocked("ENHANCED_POLYGLOT") && 2) ||
			1;
		this.resources.set(new Resource("POLYGLOT", polyglotStacks, 0, true));

		// skill CDs (also a form of resource)
		const manafontCooldown = (this.hasTraitUnlocked("ENHANCED_MANAFONT") && 100) || 120;
		const swiftcastCooldown = (this.hasTraitUnlocked("ENHANCED_SWIFTCAST") && 40) || 60;
		[
			new CoolDown("cd_MANAFONT", manafontCooldown, 1, 1),
			new CoolDown("cd_SWIFTCAST", swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Thunder DoT", zh: "雷DoT" }),
				groupedEffects: [
					{
						effectName: "HIGH_THUNDER",
						appliedBy: ["HIGH_THUNDER"],
					},
					{
						effectName: "HIGH_THUNDER_II",
						appliedBy: ["HIGH_THUNDER_II"],
					},
					{
						effectName: "THUNDER_III",
						appliedBy: ["THUNDER_III"],
					},
					{
						effectName: "THUNDER_IV",
						appliedBy: ["THUNDER_IV"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<BLMState> {
		return new BLMStatusPropsGenerator(this);
	}

	override jobSpecificRegisterRecurringEvents() {
		// also polyglot
		const recurringPolyglotGain = (rsc: Resource) => {
			if (this.hasEnochian()) {
				rsc.gain(1);
			}
			this.resources.addResourceEvent({
				rscType: "POLYGLOT",
				name: "gain polyglot if currently has enochian",
				delay: 30,
				fnOnRsc: recurringPolyglotGain,
			});
		};
		recurringPolyglotGain(this.resources.get("POLYGLOT"));
	}

	override jobSpecificAddSpeedBuffCovers(node: ActionNode, skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("LEY_LINES") && skill.cdName === "cd_GCD") {
			node.addBuff(BuffType.LeyLines);
		}
	}

	override captureManaRegenAmount(): number {
		if (this.getFireStacks() > 0) {
			return 0;
		}
		return 200;
	}

	getFireStacks() {
		return this.resources.get("ASTRAL_FIRE").availableAmount();
	}
	getIceStacks() {
		return this.resources.get("UMBRAL_ICE").availableAmount();
	}
	getUmbralHearts() {
		return this.resources.get("UMBRAL_HEART").availableAmount();
	}
	getMP() {
		return this.resources.get("MANA").availableAmount();
	}

	// call this whenever gaining af or ui from a different af/ui/unaspected state
	switchToAForUI(rscType: "ASTRAL_FIRE" | "UMBRAL_ICE", numStacksToGain: number) {
		console.assert(numStacksToGain > 0);

		const af = this.resources.get("ASTRAL_FIRE");
		const ui = this.resources.get("UMBRAL_ICE");
		const uh = this.resources.get("UMBRAL_HEART");
		const paradox = this.resources.get("PARADOX");
		const as = this.resources.get("ASTRAL_SOUL");

		if (rscType === "ASTRAL_FIRE") {
			if (af.availableAmount() === 0) {
				this.gainStatus("THUNDERHEAD");
			}
			af.gain(numStacksToGain);

			if (this.hasTraitUnlocked("ASPECT_MASTERY_V")) {
				if (ui.available(3) && uh.available(3)) {
					paradox.gain(1);
				}
			}

			ui.consume(ui.availableAmount());
		} else if (rscType === "UMBRAL_ICE") {
			if (ui.availableAmount() === 0) {
				this.gainStatus("THUNDERHEAD");
			}
			ui.gain(numStacksToGain);

			if (this.hasTraitUnlocked("ASPECT_MASTERY_V")) {
				if (af.available(3)) {
					paradox.gain(1);
				}
			}

			af.consume(af.availableAmount());
			as.consume(as.availableAmount());
		}
	}

	gainUmbralMana(effectApplicationDelay: number = 0) {
		let mpToGain = 0;
		switch (this.resources.get("UMBRAL_ICE").availableAmount()) {
			case 1:
				mpToGain = 2500;
				break;
			case 2:
				mpToGain = 5000;
				break;
			case 3:
				mpToGain = 10000;
				break;
			default:
				mpToGain = 0;
				break;
		}
		this.addEvent(
			new Event("gain umbral mana", effectApplicationDelay, () => {
				this.resources.get("MANA").gain(mpToGain);
			}),
		);
	}

	captureManaCost(name: BLMActionKey, aspect: Aspect, baseManaCost: number) {
		// TODO handle flare/despair MP here instead of individual skills
		const ui = this.getIceStacks();
		const af = this.getFireStacks();
		const uhStacks = this.getUmbralHearts();

		if (
			(name === "PARADOX" && this.getIceStacks() > 0) ||
			(name === "FIRE_III" && this.hasResourceAvailable("FIRESTARTER"))
		) {
			return 0;
		}

		let multiplier = 1;
		if ((aspect === Aspect.Fire && ui > 0) || (aspect === Aspect.Ice && (ui > 0 || af > 0))) {
			// swapping to other element is always 0 MP
			// ice spells under enochian are always 0 MP
			multiplier = 0;
		} else if (aspect === Aspect.Fire && af > 0 && uhStacks === 0) {
			// fire spells without umbral hearts have cost doubled
			multiplier = 2;
		}
		return baseManaCost * multiplier;
	}

	captureSpellCastTimeAFUI(baseCastTime: number, aspect: Aspect) {
		// Apply AF/UI multiplier after ley lines
		const llAdjustedCastTime = this.config.adjustedCastTime(
			baseCastTime,
			this.hasResourceAvailable("LEY_LINES") ? 15 : undefined,
		);

		let multiplier = 1;
		if (
			(aspect === Aspect.Fire && this.getIceStacks() === 3) ||
			(aspect === Aspect.Ice && this.getFireStacks() === 3)
		) {
			multiplier = 0.5;
		}
		return llAdjustedCastTime * multiplier;
	}

	hasEnochian() {
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		return this.hasResourceAvailable("ENOCHIAN");
	}

	// falls off after 15s unless refreshed by AF / UI
	startOrRefreshEnochian() {
		const enochian = this.resources.get("ENOCHIAN");

		if (enochian.available(1)) {
			// goodbye timer
		} else {
			// reset polyglot countdown to 30s if enochian wasn't actually active
			this.resources.get("POLYGLOT").overrideTimer(this, 30);
			enochian.gain(1);
		}
	}

	loseEnochian() {
		const rscToLose: BLMResourceKey[] = [
			"ENOCHIAN",
			"ASTRAL_FIRE",
			"UMBRAL_ICE",
			"UMBRAL_HEART",
			"PARADOX",
			"ASTRAL_SOUL",
		];
		rscToLose.forEach((rsc) => this.tryConsumeResource(rsc, true));
	}
}

// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const retraceCondition = (state: Readonly<BLMState>) =>
	state.resources.get("LEY_LINES").availableAmountIncludingDisabled() > 0;

const paraCondition = (state: Readonly<BLMState>) => state.hasResourceAvailable("PARADOX");

const getEnochianModifier = (state: Readonly<BLMState>) =>
	(state.hasTraitUnlocked("ENHANCED_ENOCHIAN_IV") && 1.27) ||
	(state.hasTraitUnlocked("ENHANCED_ENOCHIAN_III") && 1.22) ||
	(state.hasTraitUnlocked("ENHANCED_ENOCHIAN_II") && 1.15) ||
	1.1;

const makeSpell_BLM = (
	name: BLMActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<BLMState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<BLMState>;
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		aspect?: Aspect;
		baseCastTime: number;
		baseManaCost: number;
		basePotency: number;
		falloff?: number;
		applicationDelay: number;
		validateAttempt?: StatePredicate<BLMState>;
		onConfirm?: EffectFn<BLMState>;
		onApplication?: EffectFn<BLMState>;
	},
): Spell<BLMState> => {
	const aspect = params.aspect ?? Aspect.Other;
	const onConfirm: EffectFn<BLMState> = combineEffects(
		(state, node) => {
			// Consume swift/triple before anything else happens.
			// The code here is dependent on short-circuiting logic to consume the correct resources.
			// Non-swift/triple resources are consumed separately because they have secondary
			// implications on resource generation. However, they still need to be checked here
			// to avoid improperly spending swift/triple on an already-instant spell.
			params.baseCastTime === 0 ||
				(name === "DESPAIR" && state.hasTraitUnlocked("ENHANCED_ASTRAL_FIRE")) ||
				(name === "FOUL" && state.hasTraitUnlocked("ENHANCED_FOUL")) ||
				(name === "FIRE_III" && state.hasResourceAvailable("FIRESTARTER")) ||
				// Consume Swift before Triple.
				state.tryConsumeResource("SWIFTCAST") ||
				state.tryConsumeResource("TRIPLECAST");
		},
		(state, node) => {
			// put this before the spell's onConfirm to ensure F3P and other buffs aren't prematurely consumed
			// fire spells: attempt to consume umbral hearts
			// flare is handled separately because it wipes all hearts
			if (
				state.getFireStacks() > 0 &&
				aspect === Aspect.Fire &&
				!(["DESPAIR", "FLARE_STAR", "FLARE"] as BLMActionKey[]).includes(name) &&
				!(name === "FIRE_III" && state.hasResourceAvailable("FIRESTARTER"))
			) {
				state.tryConsumeResource("UMBRAL_HEART");
			}
			// ice spells: gain mana on spell application if in UI
			// umbral mana amount snapshots the state at the cast confirm window,
			// not the new UI level after the spell is cast
			if (aspect === Aspect.Ice) {
				state.gainUmbralMana(params.applicationDelay);
			}
		},
		params.onConfirm,
	);
	return makeSpell("BLM", name, unlockLevel, {
		...params,
		aspect,
		castTime: (state) => state.captureSpellCastTimeAFUI(params.baseCastTime, aspect),
		recastTime: (state) =>
			state.config.adjustedGCD(2.5, state.hasResourceAvailable("LEY_LINES") ? 15 : 0),
		manaCost: (state) => state.captureManaCost(name, aspect, params.baseManaCost),
		// TODO apply AFUI modifiers?
		potency: (state) => params.basePotency,
		isInstantFn: (state) =>
			// Despair after lvl 100
			(name === "DESPAIR" && state.hasTraitUnlocked("ENHANCED_ASTRAL_FIRE")) ||
			// Foul after lvl 80
			(name === "FOUL" && state.hasTraitUnlocked("ENHANCED_FOUL")) ||
			// F3P
			(name === "FIRE_III" && state.hasResourceAvailable("FIRESTARTER")) ||
			// Swift
			state.hasResourceAvailable("SWIFTCAST") ||
			// Triple
			state.hasResourceAvailable("TRIPLECAST"),
		onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyMultiplier[] = [];
			if (state.hasResourceAvailable("ENOCHIAN")) {
				const enochianModifier = getEnochianModifier(state);
				if (!Debug.noEnochian)
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.ENO,
						potencyFactor: enochianModifier,
					});
			}
			const ui = state.getIceStacks();
			const af = state.getFireStacks();
			if (ui === 1) {
				if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI1,
						potencyFactor: 0.9,
					});
				} else if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI1,
						potencyFactor: 1,
					});
				}
			} else if (ui === 2) {
				if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI2,
						potencyFactor: 0.8,
					});
				} else if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI2,
						potencyFactor: 1,
					});
				}
			} else if (ui === 3) {
				if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI3,
						potencyFactor: 0.7,
					});
				} else if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.UI3,
						potencyFactor: 1,
					});
				}
			}
			if (af === 1) {
				if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF1,
						potencyFactor: 0.9,
					});
				} else if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF1,
						potencyFactor: 1.4,
					});
				}
			} else if (af === 2) {
				if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF2,
						potencyFactor: 0.8,
					});
				} else if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF2,
						potencyFactor: 1.6,
					});
				}
			} else if (af === 3) {
				if (aspect === Aspect.Ice) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF3,
						potencyFactor: 0.7,
					});
				} else if (aspect === Aspect.Fire) {
					mods.push({
						kind: "multiplier",
						source: PotencyModifierType.AF3,
						potencyFactor: 1.8,
					});
				}
			}
			return mods;
		},
	});
};

const makeAbility_BLM = (
	name: BLMActionKey,
	unlockLevel: number,
	cdName: BLMCooldownKey,
	params: {
		replaceIf?: ConditionalSkillReplace<BLMState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<BLMState>;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<BLMState>;
		onConfirm?: EffectFn<BLMState>;
		onApplication?: EffectFn<BLMState>;
	},
): Ability<BLMState> => makeAbility("BLM", name, unlockLevel, cdName, params);

// ref logs
// https://www.fflogs.com/reports/KVgxmW9fC26qhNGt#fight=16&type=summary&view=events&source=6
// https://www.fflogs.com/reports/rK87bvMFN2R3Hqpy#fight=1&type=casts&source=7
// https://www.fflogs.com/reports/cNpjtRXHhZ8Az2V3#fight=last&type=damage-done&view=events&ability=36987
// https://www.fflogs.com/reports/7NMQkxLzcbptw3Xd#fight=15&type=damage-done&source=116&view=events&ability=36986
makeSpell_BLM("BLIZZARD", 1, {
	aspect: Aspect.Ice,
	baseCastTime: 2,
	baseManaCost: 400,
	basePotency: 180,
	applicationDelay: 0.846,
	onConfirm: (state, node) => {
		// Refresh Enochian and gain a UI stack at the cast confirm window, not the damage application.
		// MP is regained on damage application (TODO)
		if (state.getFireStacks() === 0) {
			// no AF
			state.switchToAForUI("UMBRAL_ICE", 1);
			state.startOrRefreshEnochian();
		} else {
			// in AF
			state.resources.get("ENOCHIAN").removeTimer();
			state.loseEnochian();
		}
	},
	replaceIf: [
		{
			newSkill: "PARADOX",
			condition: paraCondition,
		},
	],
});

makeSpell_BLM("FIRE", 2, {
	aspect: Aspect.Fire,
	baseCastTime: 2,
	baseManaCost: 800,
	basePotency: 180,
	applicationDelay: 1.871,
	onConfirm: (state, node) => {
		// Refresh Enochian and gain a UI stack at the cast confirm window, not the damage application.
		if (state.triggersEffect(0.4, true)) {
			state.gainStatus("FIRESTARTER");
		}
		if (state.getIceStacks() === 0) {
			// in fire or no enochian
			state.switchToAForUI("ASTRAL_FIRE", 1);
			state.startOrRefreshEnochian();
		} else {
			// in UI
			state.resources.get("ENOCHIAN").removeTimer();
			state.loseEnochian();
		}
	},
	replaceIf: [
		{
			newSkill: "PARADOX",
			condition: paraCondition,
		},
	],
});

makeAbility_BLM("TRANSPOSE", 4, "cd_TRANSPOSE", {
	applicationDelay: 0, // instant
	cooldown: 5,
	validateAttempt: (state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
	onApplication: (state, node) => {
		if (state.getFireStacks() !== 0 || state.getIceStacks() !== 0) {
			state.switchToAForUI(state.getFireStacks() > 0 ? "UMBRAL_ICE" : "ASTRAL_FIRE", 1);
			state.startOrRefreshEnochian();
		}
	},
});

const thunderConfirm =
	(skillName: BLMActionKey, dotName: BLMResourceKey) => (game: BLMState, node: ActionNode) => {
		let tickPotency = 0;
		switch (skillName) {
			case "HIGH_THUNDER":
				tickPotency = 60;
				break;
			case "THUNDER_III":
				tickPotency = 50;
				break;
			case "THUNDER_IV":
				tickPotency = 35;
				break;
			case "HIGH_THUNDER_II":
				tickPotency = 40;
				break;
		}

		const mods: PotencyMultiplier[] = [];
		if (game.hasResourceAvailable("ENOCHIAN") && !Debug.noEnochian) {
			const enochianModifier = getEnochianModifier(game);
			mods.push({
				kind: "multiplier",
				source: PotencyModifierType.ENO,
				potencyFactor: enochianModifier,
			});
		}

		console.assert(tickPotency > 0, `${skillName} was applied as a Thunder DoT`);
		game.addDoTPotencies({
			node,
			effectName: dotName,
			skillName,
			tickPotency,
			speedStat: "sps",
			aspect: Aspect.Lightning,
			modifiers: mods,
		});

		game.tryConsumeResource("THUNDERHEAD");
	};

makeSpell_BLM("THUNDER_III", 45, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 120,
	applicationDelay: 1.03,
	validateAttempt: (state) => state.hasResourceAvailable("THUNDERHEAD"),
	onConfirm: thunderConfirm("THUNDER_III", "THUNDER_III"),
	onApplication: (state, node) => state.applyDoT("THUNDER_III", node),
	autoUpgrade: { trait: "THUNDER_MASTERY_III", otherSkill: "HIGH_THUNDER" },
	highlightIf: (state) => state.hasResourceAvailable("THUNDERHEAD"),
});

makeResourceAbility("BLM", "MANAWARD", 30, "cd_MANAWARD", {
	rscType: "MANAWARD",
	applicationDelay: 1.114, // delayed
	cooldown: 120,
});

// Manafont: application delay 0.88s -> 0.2s since Dawntrail
// infact most effects seem instant but MP gain is delayed.
// see screen recording: https://drive.google.com/file/d/1zGhU9egAKJ3PJiPVjuRBBMkKdxxHLS9b/view?usp=drive_link
makeAbility_BLM("MANAFONT", 30, "cd_MANAFONT", {
	applicationDelay: 0.2, // delayed
	cooldown: 100, // set by trait in the constructor
	validateAttempt: (state) => state.getFireStacks() > 0,
	onConfirm: (state, node) => {
		state = state as BLMState;
		state.resources.get("ASTRAL_FIRE").gain(3);
		state.resources.get("UMBRAL_HEART").gain(3);

		if (state.hasTraitUnlocked("ASPECT_MASTERY_V")) state.resources.get("PARADOX").gain(1);

		state.gainStatus("THUNDERHEAD");
		state.startOrRefreshEnochian();
	},
	onApplication: (state, node) => {
		state.resources.get("MANA").gain(10000);
	},
});

makeSpell_BLM("FIRE_III", 35, {
	aspect: Aspect.Fire,
	baseCastTime: 3.5,
	baseManaCost: 2000,
	basePotency: 290,
	applicationDelay: 1.292,
	onConfirm: (state, node) => {
		state.tryConsumeResource("FIRESTARTER");
		state.switchToAForUI("ASTRAL_FIRE", 3);
		state.startOrRefreshEnochian();
	},
	highlightIf: (state) => state.hasResourceAvailable("FIRESTARTER"),
});

makeSpell_BLM("BLIZZARD_III", 35, {
	aspect: Aspect.Ice,
	baseCastTime: 3.5,
	baseManaCost: 800,
	basePotency: 290,
	applicationDelay: 0.89,
	onConfirm: (state, node) => {
		state.switchToAForUI("UMBRAL_ICE", 3);
		state.startOrRefreshEnochian();
	},
});

makeSpell_BLM("FREEZE", 40, {
	aspect: Aspect.Ice,
	baseCastTime: 2,
	baseManaCost: 1000,
	basePotency: 120,
	applicationDelay: 0.664,
	falloff: 0,
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => state.resources.get("UMBRAL_HEART").gain(3),
});

makeSpell_BLM("FLARE", 50, {
	aspect: Aspect.Fire,
	baseCastTime: 2,
	baseManaCost: 0, // mana is handled separately
	basePotency: 240,
	applicationDelay: 1.157,
	falloff: 0.3,
	validateAttempt: (state) => state.getFireStacks() > 0 && state.getMP() >= 800,
	onConfirm: (state, node) => {
		const uh = state.resources.get("UMBRAL_HEART");
		const mana = state.resources.get("MANA");
		const manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
		// mana
		state.resources.get("MANA").consume(manaCost);
		uh.consume(uh.availableAmount());
		// +3 AF; refresh enochian
		state.resources.get("ASTRAL_FIRE").gain(3);

		if (state.hasTraitUnlocked("ENHANCED_ASTRAL_FIRE"))
			state.resources.get("ASTRAL_SOUL").gain(3);

		state.startOrRefreshEnochian();
	},
});

makeResourceAbility("BLM", "LEY_LINES", 52, "cd_LEY_LINES", {
	rscType: "LEY_LINES",
	applicationDelay: 0.49, // delayed
	cooldown: 120,
	maxCharges: 2,
	// cannot re-use ley lines if it's already up
	validateAttempt: (state) =>
		!(state.resources.get("LEY_LINES").availableAmountIncludingDisabled() > 0),
	onApplication: (state, node) => {
		state.resources.get("LEY_LINES").enabled = true;
	},
	replaceIf: [
		{
			newSkill: "RETRACE",
			condition: retraceCondition,
		},
	],
});

makeSpell_BLM("BLIZZARD_IV", 58, {
	aspect: Aspect.Ice,
	baseCastTime: 2,
	baseManaCost: 800,
	basePotency: 300,
	applicationDelay: 1.156,
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => state.resources.get("UMBRAL_HEART").gain(3),
});

makeSpell_BLM("FIRE_IV", 60, {
	aspect: Aspect.Fire,
	baseCastTime: 2,
	baseManaCost: 800,
	basePotency: 300,
	applicationDelay: 1.159,
	validateAttempt: (state) => state.getFireStacks() > 0,
	onConfirm: (state, node) => {
		if (state.hasTraitUnlocked("ENHANCED_ASTRAL_FIRE"))
			state.resources.get("ASTRAL_SOUL").gain(1);
	},
});

makeAbility_BLM("BETWEEN_THE_LINES", 62, "cd_BETWEEN_THE_LINES", {
	applicationDelay: 0,
	cooldown: 3,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
	validateAttempt: (state) =>
		state.resources.get("LEY_LINES").availableAmountIncludingDisabled() > 0,
	onConfirm: (state, node) => {
		state.resources.get("LEY_LINES").enabled = true;
	},
});

makeAbility_BLM("AETHERIAL_MANIPULATION", 50, "cd_AETHERIAL_MANIPULATION", {
	applicationDelay: 0,
	cooldown: 10,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeAbility_BLM("TRIPLECAST", 66, "cd_TRIPLECAST", {
	applicationDelay: 0, // instant
	cooldown: 60,
	maxCharges: 2,
	onApplication: (state, node) => state.gainStatus("TRIPLECAST", 3),
});

makeSpell_BLM("FOUL", 70, {
	baseCastTime: 2,
	baseManaCost: 0,
	basePotency: 600,
	falloff: 0.25,
	applicationDelay: 1.158,
	validateAttempt: (state) => state.hasResourceAvailable("POLYGLOT"),
	onConfirm: (state, node) => state.resources.get("POLYGLOT").consume(1),
	highlightIf: (state) => state.hasResourceAvailable("POLYGLOT"),
});

makeSpell_BLM("DESPAIR", 72, {
	aspect: Aspect.Fire,
	baseCastTime: 2, // instant cast at level 100, handled in makeSpell_BLM
	baseManaCost: 0, // mana handled separately, like flare
	basePotency: 350,
	applicationDelay: 0.556,
	validateAttempt: (state) => state.getFireStacks() > 0 && state.getMP() >= 800,
	onConfirm: (state, node) => {
		const mana = state.resources.get("MANA");
		const availableMana = mana.availableAmount();
		console.assert(availableMana >= 800, `tried to confirm despair at ${availableMana} MP`);
		mana.consume(availableMana);
		// +3 AF; refresh enochian
		state.resources.get("ASTRAL_FIRE").gain(3);
		state.startOrRefreshEnochian();
	},
});

// Umbral Soul: immediate snapshot & UH gain; delayed MP gain
// see screen recording: https://drive.google.com/file/d/1nsO69O7lgc8V_R_To4X0TGalPsCus1cg/view?usp=drive_link
makeSpell_BLM("UMBRAL_SOUL", 35, {
	aspect: Aspect.Ice,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 0,
	applicationDelay: 0.633,
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => {
		state.resources.get("UMBRAL_ICE").gain(1);
		state.resources.get("UMBRAL_HEART").gain(1);
	},
});

makeSpell_BLM("XENOGLOSSY", 80, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 890,
	applicationDelay: 0.63,
	validateAttempt: (state) => state.hasResourceAvailable("POLYGLOT"),
	// Don't call tryConsumeResource so we ensure the timer keeps ticking.
	onConfirm: (state, node) => state.resources.get("POLYGLOT").consume(1),
	highlightIf: (state) => state.hasResourceAvailable("POLYGLOT"),
});

makeSpell_BLM("FIRE_II", 18, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 80,
	falloff: 0,
	applicationDelay: 1.154, // Unknown damage application, copied from HF2
	autoUpgrade: { trait: "ASPECT_MASTERY_IV", otherSkill: "HIGH_FIRE_II" },
	onConfirm: (state, node) => {
		state.switchToAForUI("ASTRAL_FIRE", 3);
		state.startOrRefreshEnochian();
	},
});

makeSpell_BLM("BLIZZARD_II", 12, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 80,
	falloff: 0,
	applicationDelay: 1.158, // Unknown damage application, copied from HB2
	autoUpgrade: { trait: "ASPECT_MASTERY_IV", otherSkill: "HIGH_BLIZZARD_II" },
	onConfirm: (state, node) => {
		state.switchToAForUI("UMBRAL_ICE", 3);
		state.startOrRefreshEnochian();
	},
});

makeSpell_BLM("HIGH_FIRE_II", 82, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 100,
	falloff: 0,
	applicationDelay: 1.154,
	autoDowngrade: { trait: "ASPECT_MASTERY_IV", otherSkill: "FIRE_II" },
	onConfirm: (state, node) => {
		state.switchToAForUI("ASTRAL_FIRE", 3);
		state.startOrRefreshEnochian();
	},
});

makeSpell_BLM("HIGH_BLIZZARD_II", 82, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 100,
	falloff: 0,
	applicationDelay: 1.158,
	autoDowngrade: { trait: "ASPECT_MASTERY_IV", otherSkill: "BLIZZARD_II" },
	onConfirm: (state, node) => {
		state.switchToAForUI("UMBRAL_ICE", 3);
		state.startOrRefreshEnochian();
	},
});

makeAbility_BLM("AMPLIFIER", 86, "cd_AMPLIFIER", {
	applicationDelay: 0, // ? (assumed to be instant)
	cooldown: 120,
	validateAttempt: (state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
	onApplication: (state, node) => {
		const polyglot = state.resources.get("POLYGLOT");
		polyglot.gain(1);
	},
});

makeSpell_BLM("PARADOX", 90, {
	// Paradox made instant via Dawntrail
	baseCastTime: 0,
	baseManaCost: 1600,
	basePotency: 540,
	applicationDelay: 0.624,
	validateAttempt: paraCondition,
	onConfirm: (state, node) => {
		state.resources.get("PARADOX").consume(1);
		if (state.getFireStacks() > 0) {
			state.gainStatus("FIRESTARTER");
		} else if (state.getIceStacks() === 0) {
			console.error("cannot cast Paradox outside of AF/UI");
		}
	},
	replaceIf: [
		{
			newSkill: "BLIZZARD",
			condition: (state) =>
				!state.hasResourceAvailable("PARADOX") && state.getIceStacks() > 0,
		},
		{
			newSkill: "FIRE",
			condition: (state) =>
				!state.hasResourceAvailable("PARADOX") && state.getFireStacks() > 0,
		},
	],
	startOnHotbar: false,
	highlightIf: (state) => true,
});

makeSpell_BLM("HIGH_THUNDER", 92, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 150,
	applicationDelay: 0.757,
	validateAttempt: (state) => state.hasResourceAvailable("THUNDERHEAD"),
	onConfirm: thunderConfirm("HIGH_THUNDER", "HIGH_THUNDER"),
	onApplication: (state, node) => state.applyDoT("HIGH_THUNDER", node),
	autoDowngrade: { trait: "THUNDER_MASTERY_III", otherSkill: "THUNDER_III" },
	highlightIf: (state) => state.hasResourceAvailable("THUNDERHEAD"),
});

makeSpell_BLM("FLARE_STAR", 100, {
	aspect: Aspect.Fire,
	baseCastTime: 2,
	baseManaCost: 0,
	basePotency: 500,
	falloff: 0.65,
	applicationDelay: 0.622,
	validateAttempt: (state) => state.hasResourceAvailable("ASTRAL_SOUL", 6),
	onConfirm: (state, node) => state.tryConsumeResource("ASTRAL_SOUL", true),
	highlightIf: (state) => state.hasResourceAvailable("ASTRAL_SOUL", 6),
});

makeSpell_BLM("THUNDER_IV", 64, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 80,
	falloff: 0,
	applicationDelay: 1.16,
	validateAttempt: (state) => state.hasResourceAvailable("THUNDERHEAD"),
	onConfirm: thunderConfirm("THUNDER_IV", "THUNDER_IV"),
	onApplication: (state, node) => state.applyDoT("THUNDER_IV", node),
	autoUpgrade: { trait: "THUNDER_MASTERY_III", otherSkill: "HIGH_THUNDER_II" },
	highlightIf: (state) => state.hasResourceAvailable("THUNDERHEAD"),
});

makeSpell_BLM("HIGH_THUNDER_II", 92, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 100,
	falloff: 0,
	applicationDelay: 0.8,
	validateAttempt: (state) => state.hasResourceAvailable("THUNDERHEAD"),
	onConfirm: thunderConfirm("HIGH_THUNDER_II", "HIGH_THUNDER_II"),
	onApplication: (state, node) => state.applyDoT("HIGH_THUNDER_II", node),
	autoDowngrade: { trait: "THUNDER_MASTERY_III", otherSkill: "THUNDER_IV" },
	highlightIf: (state) => state.hasResourceAvailable("THUNDERHEAD"),
});

makeAbility_BLM("RETRACE", 96, "cd_RETRACE", {
	applicationDelay: 0, // ? (assumed to be instant)
	cooldown: 40,
	validateAttempt: retraceCondition,
	onConfirm: (state, node) => {
		const ll = state.resources.get("LEY_LINES");
		ll.enabled = true;
		// set LL timer to the closest 0.5s
		console.assert(
			ll.pendingChange !== undefined,
			"LL should def have a timer when Retrace is used",
		);
		ll.pendingChange!.timeTillEvent = Math.floor(ll.pendingChange!.timeTillEvent) + 0.5;
	},
	startOnHotbar: false,
});
