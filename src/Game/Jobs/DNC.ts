import { DNCStatusPropsGenerator } from "../../Components/Jobs/DNC";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { BuffType, WarningType } from "../Common";
import { TraitKey } from "../Data";
import { DNCResourceKey, DNCActionKey, DNCCooldownKey } from "../Data/Jobs/DNC";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, getResourceInfo, makeResource, Resource, ResourceInfo } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	makeWeaponskill,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	ResourceCalculationFn,
	Skill,
	StatePredicate,
	Weaponskill,
} from "../Skills";

const makeDNCResource = (
	rsc: DNCResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("DNC", rsc, maxValue, params ?? {});
};

// Gauge resources
makeDNCResource("ESPRIT_GAUGE", 100);
makeDNCResource("FEATHER_GAUGE", 4);
makeDNCResource("STANDARD_DANCE", 2);
makeDNCResource("TECHNICAL_DANCE", 4);

// Status effects
makeDNCResource("SILKEN_SYMMETRY", 1, { timeout: 30 });
makeDNCResource("SILKEN_FLOW", 1, { timeout: 30 });
makeDNCResource("FLOURISHING_SYMMETRY", 1, { timeout: 30 });
makeDNCResource("FLOURISHING_FLOW", 1, { timeout: 30 });

makeDNCResource("THREEFOLD_FAN_DANCE", 1, { timeout: 30 });
makeDNCResource("FOURFOLD_FAN_DANCE", 1, { timeout: 30 });

makeDNCResource("FINISHING_MOVE_READY", 1, { timeout: 30 });
makeDNCResource("FLOURISHING_STARFALL", 1, { timeout: 20 });

makeDNCResource("STANDARD_STEP", 1, { timeout: 15 });
makeDNCResource("STANDARD_FINISH", 1, { timeout: 60 });
makeDNCResource("STANDARD_BONUS", 2, { timeout: 60 });
makeDNCResource("ESPRIT", 1, { timeout: 60 });
makeDNCResource("TECHNICAL_STEP", 1, { timeout: 15 });
makeDNCResource("TECHNICAL_FINISH", 1, { timeout: 20.5 });
makeDNCResource("TECHNICAL_BONUS", 4, { timeout: 20.5 });

makeDNCResource("LAST_DANCE_READY", 1, { timeout: 30 });
makeDNCResource("DANCE_OF_THE_DAWN_READY", 1, { timeout: 30 });
makeDNCResource("FLOURISHING_FINISH", 1, { timeout: 30 });

makeDNCResource("CLOSED_POSITION", 1, { default: 1 });

makeDNCResource("DEVILMENT", 1, { timeout: 20 });
makeDNCResource("SHIELD_SAMBA", 1, { timeout: 15 });

makeDNCResource("IMPROVISATION", 1, { timeout: 15 });
makeDNCResource("RISING_RHYTHM", 4, { timeout: 15 });
makeDNCResource("IMPROVISATION_REGEN", 1, { timeout: 15 });
makeDNCResource("IMPROVISED_FINISH", 1, { timeout: 30 });

makeDNCResource("DANCE_PARTNER", 1, { default: 1 });
makeDNCResource("ESPRIT_PARTNER", 1, { timeout: 60 });
makeDNCResource("STANDARD_FINISH_PARTNER", 1, { timeout: 60 });
makeDNCResource("ESPRIT_TECHNICAL", 1, { timeout: 20 });

makeDNCResource("CASCADE_COMBO", 1, { timeout: 30 });
makeDNCResource("WINDMILL_COMBO", 1, { timeout: 30 });

const COMBO_GCDS: DNCActionKey[] = ["CASCADE", "FOUNTAIN", "WINDMILL", "BLADESHOWER"];
const DANCE_MOVES: DNCActionKey[] = ["EMBOITE", "ENTRECHAT", "JETE", "PIROUETTE"];
export class DNCState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Disable Esprit Gauge for level 70 duties
		if (!this.hasTraitUnlocked("ESPRIT")) {
			this.resources.set(new Resource("ESPRIT_GAUGE", 0, 0));
		}

		const enAvantStacks = this.hasTraitUnlocked("ENHANCED_EN_AVANT_II") ? 3 : 2;
		this.cooldowns.set(new CoolDown("cd_EN_AVANT", 30, enAvantStacks, enAvantStacks));

		const shieldSambaCooldown = this.hasTraitUnlocked("ENHANCED_SHIELD_SAMBA") ? 90 : 120;
		this.cooldowns.set(new CoolDown("cd_SHIELD_SAMBA", shieldSambaCooldown, 1, 1));

		this.registerRecurringEvents();
	}

	override get statusPropsGenerator(): StatusPropsGenerator<DNCState> {
		return new DNCStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, _skill: Skill<GameState>): void {
		if (this.hasResourceAvailable("TECHNICAL_FINISH")) {
			node.addBuff(BuffType.TechnicalFinish);
		}
		if (this.hasResourceAvailable("DEVILMENT")) {
			node.addBuff(BuffType.Devilment);
		}
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource("IMPROVISATION");
		this.tryConsumeResource("RISING_RHYTHM", true);
	}

	processComboStatus(skill: DNCActionKey) {
		if (!COMBO_GCDS.includes(skill)) {
			return;
		} // DNC's non-combo GCDs don't break ongoing combos

		const cascadeInProgress = skill === "CASCADE";
		const windmillInProgress = skill === "WINDMILL";

		this.setComboState("CASCADE_COMBO", cascadeInProgress ? 1 : 0);
		this.setComboState("WINDMILL_COMBO", windmillInProgress ? 1 : 0);
	}

	getCurrentDanceStatus() {
		const danceResourceName: DNCResourceKey = this.hasResourceAvailable("STANDARD_STEP")
			? "STANDARD_DANCE"
			: "TECHNICAL_DANCE";

		return this.resources.get(danceResourceName).availableAmount();
	}

	processDanceStatus(skill: DNCActionKey) {
		if (!DANCE_MOVES.includes(skill)) {
			return;
		} // If you don't dance you're no friend of dance status

		const danceResourceName: DNCResourceKey = this.hasResourceAvailable("STANDARD_STEP")
			? "STANDARD_DANCE"
			: "TECHNICAL_DANCE";

		let expectedCurrentState = 0;
		switch (skill) {
			case "ENTRECHAT":
				expectedCurrentState = 1;
				break;
			case "JETE":
				expectedCurrentState = 2;
				break;
			case "PIROUETTE":
				expectedCurrentState = 3;
				break;
		}

		const danceResource = this.resources.get(danceResourceName);
		// If you didn't do the right step, you don't get to proceed
		if (danceResource.availableAmount() === expectedCurrentState) {
			danceResource.gain(1);
		}
	}

	gainProc(proc: DNCResourceKey) {
		if (this.hasResourceAvailable(proc) && proc === "THREEFOLD_FAN_DANCE") {
			controller.reportWarning(WarningType.FanThreeOverwrite);
		}
		this.gainStatus(proc);
	}

	override maybeGainProc(proc: DNCResourceKey, chance: number = 0.5) {
		super.maybeGainProc(proc, chance, true);
	}

	gainResource(rscType: "ESPRIT_GAUGE" | "FEATHER_GAUGE", amount: number) {
		const resource = this.resources.get(rscType);
		if (resource.availableAmount() + amount > resource.maxValue) {
			controller.reportWarning(
				rscType === "ESPRIT_GAUGE" ? WarningType.EspritOvercap : WarningType.FeatherOvercap,
			);
		}
		this.resources.get(rscType).gain(amount);
	}

	maybeGainResource(
		rscType: "ESPRIT_GAUGE" | "FEATHER_GAUGE",
		amount: number,
		chance: number = 0.5,
	) {
		if (this.triggersEffect(chance, true)) {
			this.gainResource(rscType, amount);
		}
	}

	simulatePartyEspritGain() {
		// Technical Finish Esprit generation overrides any need for dance partner member generation checks
		if (this.hasResourceAvailable("ESPRIT_TECHNICAL")) {
			for (let i = 0; i < this.resources.get("PARTY_SIZE").availableAmount() - 1; i++) {
				this.maybeGainResource("ESPRIT_GAUGE", 10, 0.2);
			}
			return;
		}

		if (this.hasResourceAvailable("ESPRIT_PARTNER")) {
			this.maybeGainResource("ESPRIT_GAUGE", 10, 0.2);
		}
	}

	applyStandardFinish(bonusLevel: number) {
		if (bonusLevel === 0) {
			return;
		}

		this.gainProc("STANDARD_FINISH");
		// Grant the new standard step bonus
		this.gainStatus("STANDARD_BONUS", bonusLevel);
		if (this.hasResourceAvailable("DANCE_PARTNER")) {
			this.gainProc("STANDARD_FINISH_PARTNER");
		}

		if (this.hasTraitUnlocked("ESPRIT")) {
			this.gainProc("ESPRIT");
			if (this.hasResourceAvailable("DANCE_PARTNER")) {
				this.gainProc("ESPRIT_PARTNER");
			}
		}

		if (this.hasTraitUnlocked("ENHANCED_STANDARD_FINISH")) {
			this.gainProc("LAST_DANCE_READY");
		}
	}
}

const isDancing = (state: Readonly<DNCState>) =>
	state.hasResourceAvailable("STANDARD_STEP") || state.hasResourceAvailable("TECHNICAL_STEP");

const emboiteCondition: ConditionalSkillReplace<DNCState> = {
	newSkill: "EMBOITE",
	condition: (state) => isDancing(state),
};

const entrechatCondition: ConditionalSkillReplace<DNCState> = {
	newSkill: "ENTRECHAT",
	condition: (state) => isDancing(state),
};

const jeteCondition: ConditionalSkillReplace<DNCState> = {
	newSkill: "JETE",
	condition: (state) => isDancing(state),
};

const pirouetteCondition: ConditionalSkillReplace<DNCState> = {
	newSkill: "PIROUETTE",
	condition: (state) => isDancing(state),
};

const makeGCD_DNC = (
	name: DNCActionKey,
	unlockLevel: number,
	params: {
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<DNCState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: DNCResourceKey;
			resourceValue: number;
		};
		recastTime: number | ResourceCalculationFn<DNCState>;
		falloff?: number;
		applicationDelay?: number;
		validateAttempt?: StatePredicate<DNCState>;
		onConfirm?: EffectFn<DNCState>;
		highlightIf?: StatePredicate<DNCState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<DNCState> => {
	const onConfirm: EffectFn<DNCState> = combineEffects(
		(state) => {
			if (params.potency) {
				state.simulatePartyEspritGain();
			}
		},
		params.onConfirm,
		(state) => state.processComboStatus(name),
	);
	return makeWeaponskill("DNC", name, unlockLevel, {
		...params,
		onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("STANDARD_FINISH")) {
				const modifier =
					state.resources.get("STANDARD_BONUS").availableAmount() === 2
						? Modifiers.DoubleStandardFinish
						: Modifiers.SingleStandardFinish;
				mods.push(modifier);
			}
			if (state.hasResourceAvailable("TECHNICAL_FINISH")) {
				const technicalBonus = state.resources.get("TECHNICAL_BONUS").availableAmount();
				const modifier =
					technicalBonus === 4
						? Modifiers.QuadrupleTechnicalFinish
						: technicalBonus === 3
							? Modifiers.TripleTechnicalFinish
							: technicalBonus === 2
								? Modifiers.SingleTechnicalFinish
								: Modifiers.SingleTechnicalFinish;
				mods.push(modifier);
			}
			if (state.hasResourceAvailable("DEVILMENT")) {
				mods.push(Modifiers.Devilment);
			}
			if (name === "STARFALL_DANCE") {
				mods.push(Modifiers.AutoCDH);
			}
			return mods;
		},
	});
};

const makeAbility_DNC = (
	name: DNCActionKey,
	unlockLevel: number,
	cdName: DNCCooldownKey,
	params: {
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<DNCState>[];
		highlightIf?: StatePredicate<DNCState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<DNCState>;
		onConfirm?: EffectFn<DNCState>;
		onApplication?: EffectFn<DNCState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<DNCState> => {
	return makeAbility("DNC", name, unlockLevel, cdName, {
		...params,
		onConfirm: params.onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("STANDARD_FINISH")) {
				const modifier =
					state.resources.get("STANDARD_BONUS").availableAmount() === 2
						? Modifiers.DoubleStandardFinish
						: Modifiers.SingleStandardFinish;
				mods.push(modifier);
			}
			if (state.hasResourceAvailable("TECHNICAL_FINISH")) {
				const technicalBonus = state.resources.get("TECHNICAL_BONUS").availableAmount();
				const modifier =
					technicalBonus === 4
						? Modifiers.QuadrupleTechnicalFinish
						: technicalBonus === 3
							? Modifiers.TripleTechnicalFinish
							: technicalBonus === 2
								? Modifiers.SingleTechnicalFinish
								: Modifiers.SingleTechnicalFinish;
				mods.push(modifier);
			}
			if (state.hasResourceAvailable("DEVILMENT")) {
				mods.push(Modifiers.Devilment);
			}
			return mods;
		},
	});
};

const makeResourceAbility_DNC = (
	name: DNCActionKey,
	unlockLevel: number,
	cdName: DNCCooldownKey,
	params: {
		rscType: DNCResourceKey;
		replaceIf?: ConditionalSkillReplace<DNCState>[];
		applicationDelay: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<DNCState>;
		onConfirm?: EffectFn<DNCState>;
		onApplication?: EffectFn<DNCState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<DNCState> => {
	return makeResourceAbility("DNC", name, unlockLevel, cdName, params);
};

// Dance Moves
makeGCD_DNC("EMBOITE", 15, {
	startOnHotbar: false,
	recastTime: 1,
	onConfirm: (state) => state.processDanceStatus("EMBOITE"),
	highlightIf: (state) => isDancing(state) && state.getCurrentDanceStatus() === 0,
});
makeGCD_DNC("ENTRECHAT", 15, {
	startOnHotbar: false,
	recastTime: 1,
	onConfirm: (state) => state.processDanceStatus("ENTRECHAT"),
	highlightIf: (state) => isDancing(state) && state.getCurrentDanceStatus() === 1,
});
makeGCD_DNC("JETE", 15, {
	startOnHotbar: false,
	recastTime: 1,
	onConfirm: (state) => state.processDanceStatus("JETE"),
	highlightIf: (state) =>
		state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 2,
});
makeGCD_DNC("PIROUETTE", 15, {
	startOnHotbar: false,
	recastTime: 1,
	onConfirm: (state) => state.processDanceStatus("PIROUETTE"),
	highlightIf: (state) =>
		state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 3,
});

// ST Combo and Procs
makeGCD_DNC("CASCADE", 1, {
	replaceIf: [emboiteCondition],
	potency: [
		["NEVER", 200],
		["DYNAMIC_DANCER", 220],
	],
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.8,
	onConfirm: (state) => {
		state.maybeGainProc("SILKEN_SYMMETRY");

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 5);
		}
	},
});
makeGCD_DNC("FOUNTAIN", 2, {
	replaceIf: [entrechatCondition],
	potency: [
		["NEVER", 100],
		["DYNAMIC_DANCER", 120],
	],
	combo: {
		potency: [
			["NEVER", 260],
			["DYNAMIC_DANCER", 280],
		],
		resource: "CASCADE_COMBO",
		resourceValue: 1,
	},
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.98,
	onConfirm: (state) => {
		state.maybeGainProc("SILKEN_FLOW");

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 5);
		}
	},
	highlightIf: (state) => state.resources.get("CASCADE_COMBO").availableAmount() === 1,
});
makeGCD_DNC("REVERSE_CASCADE", 20, {
	replaceIf: [jeteCondition],
	potency: [
		["NEVER", 260],
		["DYNAMIC_DANCER", 280],
	],
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		state.hasResourceAvailable("SILKEN_SYMMETRY") ||
		state.hasResourceAvailable("FLOURISHING_SYMMETRY"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("SILKEN_SYMMETRY")) {
			state.tryConsumeResource("SILKEN_SYMMETRY");
		} else {
			state.tryConsumeResource("FLOURISHING_SYMMETRY");
		}

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 10);
		}
		state.maybeGainResource("FEATHER_GAUGE", 1);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable("SILKEN_SYMMETRY") ||
		state.hasResourceAvailable("FLOURISHING_SYMMETRY"),
});
makeGCD_DNC("FOUNTAINFALL", 40, {
	replaceIf: [pirouetteCondition],
	potency: [
		["NEVER", 320],
		["DYNAMIC_DANCER", 340],
	],
	recastTime: (state) => state.config.adjustedSksGCD(),
	applicationDelay: 1.21,
	validateAttempt: (state) =>
		state.hasResourceAvailable("SILKEN_FLOW") || state.hasResourceAvailable("FLOURISHING_FLOW"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("SILKEN_FLOW")) {
			state.tryConsumeResource("SILKEN_FLOW");
		} else {
			state.tryConsumeResource("FLOURISHING_FLOW");
		}

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 10);
		}
		state.maybeGainResource("FEATHER_GAUGE", 1);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable("SILKEN_FLOW") || state.hasResourceAvailable("FLOURISHING_FLOW"),
});
makeAbility_DNC("FAN_DANCE", 30, "cd_FAN_DANCE", {
	potency: [
		["NEVER", 150],
		["DYNAMIC_DANCER", 180],
	],
	cooldown: 1,
	applicationDelay: 0.62,
	validateAttempt: (state) => state.hasResourceAvailable("FEATHER_GAUGE") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FEATHER_GAUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("FEATHER_GAUGE");
		state.maybeGainProc("THREEFOLD_FAN_DANCE");
	},
});

makeGCD_DNC("SABER_DANCE", 76, {
	replaceIf: [
		{
			newSkill: "DANCE_OF_THE_DAWN",
			condition: (state) =>
				state.hasResourceAvailable("DANCE_OF_THE_DAWN_READY") &&
				state.hasResourceAvailable("ESPRIT_GAUGE", 50),
		},
	],
	potency: [
		["NEVER", 500],
		["DYNAMIC_DANCER", 520],
	],
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 0.44,
	validateAttempt: (state) => state.hasResourceAvailable("ESPRIT_GAUGE", 50) && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("ESPRIT_GAUGE", 50),
	onConfirm: (state) => state.resources.get("ESPRIT_GAUGE").consume(50),
});
makeGCD_DNC("DANCE_OF_THE_DAWN", 100, {
	startOnHotbar: false,
	potency: 1000,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 0.44,
	validateAttempt: (state) => state.hasResourceAvailable("ESPRIT_GAUGE", 50) && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("ESPRIT_GAUGE", 50),
	onConfirm: (state) => {
		state.resources.get("ESPRIT_GAUGE").consume(50);
		state.tryConsumeResource("DANCE_OF_THE_DAWN_READY");
	},
});
makeGCD_DNC("LAST_DANCE", 92, {
	potency: 520,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 1.26,
	validateAttempt: (state) => state.hasResourceAvailable("LAST_DANCE_READY") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("LAST_DANCE_READY"),
	onConfirm: (state) => state.tryConsumeResource("LAST_DANCE_READY"),
});

makeGCD_DNC("STANDARD_STEP", 15, {
	replaceIf: [
		{
			newSkill: "STANDARD_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("STANDARD_STEP") && state.getCurrentDanceStatus() === 0,
		},
		{
			newSkill: "SINGLE_STANDARD_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("STANDARD_STEP") && state.getCurrentDanceStatus() === 1,
		},
		{
			newSkill: "DOUBLE_STANDARD_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("STANDARD_STEP") && state.getCurrentDanceStatus() === 2,
		},
		{
			newSkill: "FINISHING_MOVE",
			condition: (state) => state.hasResourceAvailable("FINISHING_MOVE_READY"),
		},
	],
	validateAttempt: (state) => !isDancing(state),
	onConfirm: (state) => state.gainProc("STANDARD_STEP"),
	recastTime: 1.5,
	secondaryCooldown: {
		cdName: "cd_STANDARD_STEP",
		cooldown: 30,
		maxCharges: 1,
	},
});
makeGCD_DNC("FINISHING_MOVE", 96, {
	startOnHotbar: false,
	potency: 850,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 2.05,
	onConfirm: (state) => {
		state.applyStandardFinish(2);
		state.tryConsumeResource("FINISHING_MOVE_READY");
	},
	secondaryCooldown: {
		cdName: "cd_STANDARD_STEP",
		cooldown: 30,
		maxCharges: 1,
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("FINISHING_MOVE_READY") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FINISHING_MOVE_READY"),
});

const standardFinishes: Array<{
	skill: DNCActionKey;
	potency: number | Array<[TraitKey, number]>;
}> = [
	{ skill: "STANDARD_FINISH", potency: 360 },
	{ skill: "SINGLE_STANDARD_FINISH", potency: 540 },
	{
		skill: "DOUBLE_STANDARD_FINISH",
		potency: [
			["NEVER", 800],
			["DYNAMIC_DANCER", 850],
		],
	},
];
standardFinishes.forEach((finish) => {
	makeGCD_DNC(finish.skill, 15, {
		assetPath: "DNC/Standard Finish.png",
		startOnHotbar: false,
		potency: finish.potency,
		falloff: 0.6,
		applicationDelay: 0.54,
		onConfirm: (state) => {
			const bonusLevel = state.getCurrentDanceStatus();
			state.tryConsumeResource("STANDARD_STEP");
			state.tryConsumeResource("STANDARD_DANCE", true);

			if (bonusLevel === 0) {
				return;
			}

			state.applyStandardFinish(bonusLevel);
		},
		recastTime: 1.5,
		validateAttempt: (state) => state.hasResourceAvailable("STANDARD_STEP"),
		highlightIf: (state) =>
			state.hasResourceAvailable("STANDARD_STEP") && state.getCurrentDanceStatus() === 2,
	});
});

makeAbility_DNC("FLOURISH", 72, "cd_FLOURISH", {
	cooldown: 60,
	requiresCombat: true,
	validateAttempt: (state) => !isDancing(state),
	onConfirm: (state) => {
		state.gainProc("FLOURISHING_SYMMETRY");
		state.gainProc("FLOURISHING_FLOW");
		state.gainProc("THREEFOLD_FAN_DANCE");
		if (state.hasTraitUnlocked("ENHANCED_FLOURISH")) {
			state.gainProc("FOURFOLD_FAN_DANCE");
		}
		if (state.hasTraitUnlocked("ENHANCED_FLOURISH_II")) {
			state.gainProc("FINISHING_MOVE_READY");
		}
	},
});
makeAbility_DNC("FAN_DANCE_III", 66, "cd_FAN_DANCE_III", {
	potency: [
		["NEVER", 200],
		["DYNAMIC_DANCER", 220],
	],
	cooldown: 1,
	falloff: 0.6,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		state.hasResourceAvailable("THREEFOLD_FAN_DANCE") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("THREEFOLD_FAN_DANCE"),
	onConfirm: (state) => state.tryConsumeResource("THREEFOLD_FAN_DANCE"),
});
makeAbility_DNC("FAN_DANCE_IV", 86, "cd_FAN_DANCE_IV", {
	potency: [
		["NEVER", 300],
		["DYNAMIC_DANCER", 420],
	],
	falloff: 0.6,
	cooldown: 1,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		state.hasResourceAvailable("FOURFOLD_FAN_DANCE") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FOURFOLD_FAN_DANCE"),
	onConfirm: (state) => state.tryConsumeResource("FOURFOLD_FAN_DANCE"),
});

makeGCD_DNC("TECHNICAL_STEP", 70, {
	replaceIf: [
		{
			newSkill: "TECHNICAL_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 0,
		},
		{
			newSkill: "SINGLE_TECHNICAL_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 1,
		},
		{
			newSkill: "DOUBLE_TECHNICAL_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 2,
		},
		{
			newSkill: "TRIPLE_TECHNICAL_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 3,
		},
		{
			newSkill: "QUADRUPLE_TECHNICAL_FINISH",
			condition: (state) =>
				state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 4,
		},
		{
			newSkill: "TILLANA",
			condition: (state) => state.hasResourceAvailable("FLOURISHING_FINISH"),
		},
	],
	validateAttempt: (state) => !isDancing(state),
	onConfirm: (state) => state.gainProc("TECHNICAL_STEP"),
	recastTime: 1.5,
	falloff: 0.75,
	secondaryCooldown: {
		cdName: "cd_TECHNICAL_STEP",
		cooldown: 120,
		maxCharges: 1,
	},
});
makeGCD_DNC("TILLANA", 82, {
	startOnHotbar: false,
	potency: 600,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.6,
	applicationDelay: 0.84,
	onConfirm: (state) => {
		state.gainResource("ESPRIT_GAUGE", 50);
		state.tryConsumeResource("FLOURISHING_FINISH");
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("FLOURISHING_FINISH") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FLOURISHING_FINISH"),
});
makeGCD_DNC("TECHNICAL_FINISH", 70, {
	startOnHotbar: false,
	potency: 350,
	applicationDelay: 0.54,
	onConfirm: (state) => {
		state.tryConsumeResource("TECHNICAL_STEP");
		state.tryConsumeResource("TECHNICAL_DANCE", true);
	},
	recastTime: 1.5,
	validateAttempt: (state) => state.hasResourceAvailable("TECHNICAL_STEP"),
});

const technicalFinishes: Array<{
	skill: DNCActionKey;
	potency: number | Array<[TraitKey, number]>;
}> = [
	{ skill: "TECHNICAL_FINISH", potency: 350 },
	{ skill: "SINGLE_TECHNICAL_FINISH", potency: 540 },
	{ skill: "DOUBLE_TECHNICAL_FINISH", potency: 720 },
	{ skill: "TRIPLE_TECHNICAL_FINISH", potency: 900 },
	{
		skill: "QUADRUPLE_TECHNICAL_FINISH",
		potency: [
			["NEVER", 1200],
			["DYNAMIC_DANCER", 1300],
		],
	},
];
technicalFinishes.forEach((params) => {
	makeGCD_DNC(params.skill, 70, {
		assetPath: "DNC/Technical Finish.png",
		startOnHotbar: false,
		potency: params.potency,
		applicationDelay: 0.54,
		falloff: 0.6,
		onConfirm: (state) => {
			const bonusLevel = state.getCurrentDanceStatus();
			state.tryConsumeResource("TECHNICAL_STEP");
			state.tryConsumeResource("TECHNICAL_DANCE", true);

			if (bonusLevel === 0) {
				return;
			}

			state.gainProc("TECHNICAL_FINISH");
			if (state.hasTraitUnlocked("ESPRIT")) {
				state.gainProc("ESPRIT_TECHNICAL");
			}
			state.gainStatus("TECHNICAL_BONUS", bonusLevel);
			if (state.hasTraitUnlocked("ENHANCED_TECHNICAL_FINISH")) {
				state.gainProc("FLOURISHING_FINISH");
			}
			if (state.hasTraitUnlocked("ENHANCED_TECHNICAL_FINISH_II")) {
				state.gainProc("DANCE_OF_THE_DAWN_READY");
			}
		},
		recastTime: 1.5,
		validateAttempt: (state) => state.hasResourceAvailable("TECHNICAL_STEP"),
		highlightIf: (state) =>
			state.hasResourceAvailable("TECHNICAL_STEP") && state.getCurrentDanceStatus() === 4,
	});
});

makeResourceAbility_DNC("DEVILMENT", 62, "cd_DEVILMENT", {
	replaceIf: [
		{
			newSkill: "STARFALL_DANCE",
			condition: (state) => state.hasResourceAvailable("FLOURISHING_STARFALL"),
		},
	],
	rscType: "DEVILMENT",
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => !isDancing(state),
	onApplication: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_DEVILMENT")) {
			(state as DNCState).gainProc("FLOURISHING_STARFALL");
		}
	},
});
makeGCD_DNC("STARFALL_DANCE", 90, {
	startOnHotbar: false,
	potency: 600,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0.75,
	applicationDelay: 0.89,
	validateAttempt: (state) =>
		state.hasResourceAvailable("FLOURISHING_STARFALL") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FLOURISHING_STARFALL"),
	onConfirm: (state) => state.tryConsumeResource("FLOURISHING_STARFALL"),
});

// AoE Combo and Procs
makeGCD_DNC("WINDMILL", 15, {
	replaceIf: [emboiteCondition],
	potency: 120,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.62,
	onConfirm: (state) => {
		state.maybeGainProc("SILKEN_SYMMETRY");

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 5);
		}
	},
});
makeGCD_DNC("BLADESHOWER", 25, {
	replaceIf: [entrechatCondition],
	potency: 100,
	recastTime: (state) => state.config.adjustedSksGCD(),
	combo: {
		potency: 160,
		resource: "WINDMILL_COMBO",
		resourceValue: 1,
	},
	falloff: 0,
	applicationDelay: 0.62,
	onConfirm: (state) => {
		state.maybeGainProc("SILKEN_FLOW");

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 5);
		}
	},
	highlightIf: (state) => state.resources.get("WINDMILL_COMBO").availableAmount() === 1,
});
makeGCD_DNC("RISING_WINDMILL", 35, {
	replaceIf: [jeteCondition],
	potency: 160,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		state.hasResourceAvailable("SILKEN_SYMMETRY") ||
		state.hasResourceAvailable("FLOURISHING_SYMMETRY"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("SILKEN_SYMMETRY")) {
			state.tryConsumeResource("SILKEN_SYMMETRY");
		} else {
			state.tryConsumeResource("FLOURISHING_SYMMETRY");
		}

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 10);
		}
		state.maybeGainResource("FEATHER_GAUGE", 1);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable("SILKEN_SYMMETRY") ||
		state.hasResourceAvailable("FLOURISHING_SYMMETRY"),
});
makeGCD_DNC("BLOODSHOWER", 45, {
	replaceIf: [pirouetteCondition],
	potency: 200,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		state.hasResourceAvailable("SILKEN_FLOW") || state.hasResourceAvailable("FLOURISHING_FLOW"),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("SILKEN_FLOW")) {
			state.tryConsumeResource("SILKEN_FLOW");
		} else {
			state.tryConsumeResource("FLOURISHING_FLOW");
		}

		if (state.hasTraitUnlocked("ESPRIT")) {
			state.gainResource("ESPRIT_GAUGE", 10);
		}
		state.maybeGainResource("FEATHER_GAUGE", 1);
	},
	highlightIf: (state) =>
		state.hasResourceAvailable("SILKEN_FLOW") || state.hasResourceAvailable("FLOURISHING_FLOW"),
});

makeAbility_DNC("FAN_DANCE_II", 30, "cd_FAN_DANCE_II", {
	potency: 100,
	cooldown: 1,
	falloff: 0,
	applicationDelay: 0.54,
	validateAttempt: (state) => state.hasResourceAvailable("FEATHER_GAUGE") && !isDancing(state),
	highlightIf: (state) => state.hasResourceAvailable("FEATHER_GAUGE"),
	onConfirm: (state) => {
		state.tryConsumeResource("FEATHER_GAUGE");
		state.maybeGainProc("THREEFOLD_FAN_DANCE");
	},
});

makeAbility_DNC("CURING_WALTZ", 52, "cd_CURING_WALTZ", {
	cooldown: 60,
	applicationDelay: 0.58,
});

makeAbility_DNC("IMPROVISATION", 80, "cd_IMPROVISATION", {
	replaceIf: [
		{
			newSkill: "IMPROVISED_FINISH",
			condition: (state) => state.hasResourceAvailable("IMPROVISATION"),
		},
	],
	cooldown: 120,
	applicationDelay: 0.89,
	validateAttempt: (state) => !isDancing(state),
	onConfirm: (state) => {
		state.gainProc("IMPROVISATION");
		state.gainProc("IMPROVISATION_REGEN");
		const risingRhythmRecurrence = () => {
			if (!state.hasResourceAvailable("IMPROVISATION")) {
				return;
			}

			state.resources.get("RISING_RHYTHM").gain(1);
			state.gainProc("IMPROVISATION_REGEN");
			state.resources.addResourceEvent({
				rscType: "RISING_RHYTHM",
				name: "rising rhythm tic",
				delay: 3,
				fnOnRsc: (rsc) => risingRhythmRecurrence(),
			});
		};
		state.resources.addResourceEvent({
			rscType: "RISING_RHYTHM",
			name: "rising rhythm tic",
			delay: 3,
			fnOnRsc: (rsc) => risingRhythmRecurrence(),
		});
		state.resources.addResourceEvent({
			rscType: "IMPROVISATION",
			name: "improvisation timeout",
			delay: (getResourceInfo("DNC", "IMPROVISATION") as ResourceInfo).maxTimeout,
			fnOnRsc: (rsc) => {
				rsc.consume(1);
				state.tryConsumeResource("RISING_RHYTHM", true);
			},
		});
	},
});
makeAbility_DNC("IMPROVISED_FINISH", 80, "cd_IMPROVISED_FINISH", {
	startOnHotbar: false,
	cooldown: 120,
	applicationDelay: 0.71,
	validateAttempt: (state) => !isDancing(state),
	onConfirm: (state) => state.gainProc("IMPROVISED_FINISH"),
});

makeAbility_DNC("EN_AVANT", 50, "cd_EN_AVANT", {
	cooldown: 30,
	maxCharges: 3, // Adjust charges when synced in the state constructor
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeResourceAbility_DNC("SHIELD_SAMBA", 56, "cd_SHIELD_SAMBA", {
	rscType: "SHIELD_SAMBA",
	maxCharges: 1,
	cooldown: 90,
	applicationDelay: 0,
});

makeAbility_DNC("CLOSED_POSITION", 60, "cd_CLOSED_POSITION", {
	replaceIf: [
		{
			newSkill: "ENDING",
			condition: (state) => state.hasResourceAvailable("CLOSED_POSITION"),
		},
	],
	cooldown: 30,
	maxCharges: 1,
	applicationDelay: 0,
	onConfirm: (state) => {
		state.resources.get("CLOSED_POSITION").gain(1);
		state.resources.get("DANCE_PARTNER").gain(1);
	},
	validateAttempt: (state) => !state.hasResourceAvailable("CLOSED_POSITION"),
	secondaryCooldown: {
		cdName: "cd_ENDING",
		cooldown: 1,
		maxCharges: 1,
	},
});
makeAbility_DNC("ENDING", 60, "cd_ENDING", {
	startOnHotbar: false,
	cooldown: 1,
	maxCharges: 1,
	applicationDelay: 0,
	onConfirm: (state) => {
		state.tryConsumeResource("CLOSED_POSITION", true);
		state.tryConsumeResource("DANCE_PARTNER", true);
		state.tryConsumeResource("STANDARD_FINISH_PARTNER", true);
		state.tryConsumeResource("ESPRIT_PARTNER", true);
	},
	secondaryCooldown: {
		cdName: "cd_CLOSED_POSITION",
		cooldown: 30,
		maxCharges: 1,
	},
});
