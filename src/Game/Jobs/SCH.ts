// Skill and state declarations for SCH.

// TODO: write tests for dissipation/seraphism/seraph interactions, and fey union passive gauge spend

import { SCHStatusPropsGenerator } from "../../Components/Jobs/SCH";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { TraitKey } from "../Data";
import { SCHActionKey, SCHCooldownKey, SCHResourceKey } from "../Data/Jobs/SCH";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { Aspect } from "../Common";
import { Potency, Modifiers, PotencyModifier } from "../Potency";
import { Event, makeResource, CoolDown } from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	makeAbility,
	makeResourceAbility,
	MakeResourceAbilityParams,
	makeSpell,
	MakeAbilityParams,
	PotencyModifierFn,
	SkillAutoReplace,
	StatePredicate,
	Spell,
	ResourceCalculationFn,
} from "../Skills";
import { localize, localizeSkillName } from "../../Components/Localization";
import { ActionNode } from "../../Controller/Record";
import { controller } from "../../Controller/Controller";

const makeSCHResource = (
	rsc: SCHResourceKey,
	maxValue: number,
	params?: {
		timeout?: number;
		default?: number;
		warnOnOvercap?: boolean;
		warnOnTimeout?: boolean;
	},
) => {
	makeResource("SCH", rsc, maxValue, params ?? {});
};

// Gauge resources
makeSCHResource("AETHERFLOW", 3, { warnOnOvercap: true });
makeSCHResource("FAERIE_GAUGE", 100);

// Statuses
makeSCHResource("BIO_II", 1, { timeout: 30 });
makeSCHResource("CATALYZE", 1, { timeout: 30 });
makeSCHResource("GALVANIZE", 1, { timeout: 30 });
makeSCHResource("WHISPERING_DAWN", 1, { timeout: 21 });
makeSCHResource("ANGELS_WHISPER", 1, { timeout: 21 });
makeSCHResource("FEY_ILLUMINATION", 1, { timeout: 20 });
makeSCHResource("SERAPHIC_ILLUMINATION", 1, { timeout: 20 });
makeSCHResource("SACRED_SOIL", 1, { timeout: 30 });
makeSCHResource("SACRED_SOIL_ZONE", 1, { timeout: 30 }); // TODO use short duration and periodically refresh
makeSCHResource("EMERGENCY_TACTICS", 1, { timeout: 15 });
makeSCHResource("DISSIPATION", 1, { timeout: 30 });
makeSCHResource("EXCOGITATION", 1, { timeout: 45 });
makeSCHResource("CHAIN_STRATAGEM", 1, { timeout: 20 });
makeSCHResource("IMPACT_IMMINENT", 1, { timeout: 30, warnOnTimeout: true });
makeSCHResource("BIOLYSIS", 1, { timeout: 30 });
makeSCHResource("RECITATION", 1, { timeout: 15 });
makeSCHResource("FEY_UNION", 1);
makeSCHResource("SERAPHIC_VEIL", 1, { timeout: 30 });
makeSCHResource("PROTRACTION", 1, { timeout: 10 });
makeSCHResource("EXPEDIENCE", 1, { timeout: 10 });
makeSCHResource("DESPERATE_MEASURES", 1, { timeout: 20 });
makeSCHResource("BANEFUL_IMPACTION", 1, { timeout: 15 });
makeSCHResource("SERAPHISM", 1, { timeout: 20 });
makeSCHResource("SERAPHISM_REGEN", 1, { timeout: 20 }); // TODO use short duration and periodically refresh

// Trackers
makeSCHResource("SERAPH_SUMMON_TIMER", 1, { timeout: 22 });

// From DMs with Caro, in steady mode there's usually a 90 ms delay between the SCH pressing a
// button and Eos beginning the action.
const DEFAULT_EOS_COMMAND_DELAY: number = 0.09;
// Tracks the amount of time it takes for the pet's "prepares" to the application of its effects.
const PET_APPLICATION_DELAYS: Map<SCHActionKey, number> = new Map([
	["FEY_BLESSING", 0.667],
	// ["EMBRACE", 0.624],
	["WHISPERING_DAWN", 1.156],
	["CONSOLATION", 0.889],
	["ANGELS_WHISPER", 1.029],
	// ["SERAPHIC_VEIL", 1.025],
	["AETHERPACT", 0.668],
	["FEY_ILLUMINATION", 1.3],
]);

export class SCHState extends GameState {
	aetherpactOffset: number;
	nextEstimatedPetApplication: number | undefined;

	constructor(config: GameConfig) {
		super(config);
		this.aetherpactOffset = this.nonProcRng() * 3.0;
		this.nextEstimatedPetApplication = undefined;

		const deploymentCd = this.hasTraitUnlocked("ENHANCED_DEPLOYMENT_TACTICS") ? 90 : 120;
		const recitationCd = this.hasTraitUnlocked("ENHANCED_RECITATION") ? 60 : 90;
		this.cooldowns.set(new CoolDown("cd_DEPLOYMENT_TACTICS", deploymentCd, 1, 1));
		this.cooldowns.set(new CoolDown("cd_RECITATION", recitationCd, 1, 1));

		this.registerRecurringEvents([
			{
				reportName: localize({ en: "Bio/Biolysis DoT", zh: "毒DoT" }),
				groupedEffects: [
					{
						effectName: "BIO_II",
						appliedBy: ["BIO_II"],
					},
					{
						effectName: "BIOLYSIS",
						appliedBy: ["BIOLYSIS"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "BANEFUL_IMPACTION",
						appliedBy: ["BANEFUL_IMPACTION"],
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "WHISPERING_DAWN",
						appliedBy: ["WHISPERING_DAWN"],
					},
					{
						effectName: "ANGELS_WHISPER",
						appliedBy: ["WHISPERING_DAWN"],
					},
				],
			},
			// Fey Union is handled separately due to gauge consumption and pet jank.
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "SACRED_SOIL_ZONE",
						appliedBy: ["SACRED_SOIL"],
						isGroundTargeted: true,
					},
				],
			},
			{
				isHealing: true,
				groupedEffects: [
					{
						effectName: "SERAPHISM_REGEN",
						appliedBy: ["SERAPHISM"],
					},
				],
			},
		]);
	}

	override jobSpecificRegisterRecurringEvents() {
		// Fey Union ticks every 3s after summon at a seemingly random interval.
		const feyUnionEvent = () =>
			new Event("tick fey union", 3, () => {
				if (
					this.hasResourceAvailable("FEY_UNION") &&
					this.resources.get("FAERIE_GAUGE").available(10)
				) {
					this.resources.get("FAERIE_GAUGE").consume(10);
					// TODO controller.reportHoTTick
				}
				// End Fey Union if it is active and there's no more gauge, but always re-queue the next tick.
				if (!this.resources.get("FAERIE_GAUGE").available(10)) {
					this.tryConsumeResource("FEY_UNION");
				}
				this.addEvent(feyUnionEvent());
			});
		this.addEvent(
			new Event("begin fey union ticks", this.aetherpactOffset, () =>
				this.addEvent(feyUnionEvent()),
			),
		);
	}

	makePetPotency(
		targetCount: number,
		petSkill: SCHActionKey,
		sourceTime: number,
		basePotency: number,
	): Potency {
		const potency = new Potency({
			config: this.config,
			sourceTime,
			sourceSkill: petSkill,
			aspect: Aspect.Other,
			basePotency,
			snapshotTime: this.getDisplayTime(),
			description: "",
			targetCount,
			falloff: undefined,
		});
		const mods = [Modifiers.SchPet];
		potency.modifiers = mods;
		return potency;
	}

	queuePetAction(
		node: ActionNode,
		sourceSkill: SCHActionKey,
		petSkill: SCHActionKey,
		summonDelay: number, // delay from summon to pet snapshot
		applicationDelay: number, // delay from pet snapshot to application
		snapshot: (state: SCHState) => (state: SCHState) => void,
	) {
		// enqueue the pet's "prepares" event
		const now = this.getDisplayTime();
		this.nextEstimatedPetApplication = now + summonDelay + applicationDelay;
		const seraphTimer = this.resources.get("SERAPH_SUMMON_TIMER").pendingChange?.timeTillEvent;
		if (seraphTimer !== undefined && this.nextEstimatedPetApplication > seraphTimer + now) {
			controller.reportWarning({
				kind: "custom",
				en: `${localizeSkillName(sourceSkill)} is likely to ghost when seraph leaves!`,
			});
		}
		this.addEvent(
			new Event(petSkill + " pet snapshot", summonDelay, () => {
				console.log(petSkill + " snapshot");
				const effect = snapshot(this);
				this.addEvent(
					new Event(petSkill + " application", applicationDelay, () => {
						console.log(petSkill + " apply");
						effect(this);
					}),
				);
			}),
		);
	}

	warnLastPetGhost() {
		if (
			this.nextEstimatedPetApplication !== undefined &&
			this.nextEstimatedPetApplication > this.getDisplayTime()
		) {
			controller.reportWarning({
				kind: "custom",
				en: "previous pet command is likely to ghost!",
			});
		}
	}

	hasRealFairy(): boolean {
		return (
			!this.hasResourceAvailable("DISSIPATION") &&
			!this.hasResourceAvailable("SERAPH_SUMMON_TIMER")
		);
	}

	maybeChainModifier(): PotencyModifier[] {
		return this.hasResourceAvailable("CHAIN_STRATAGEM") ? [Modifiers.ChainStrat] : [];
	}

	maybeGainFaerieGauge() {
		// Gauge is only gained if the fairy is currently summoned.
		// TODO: verify if seraph affects this?
		if (this.hasRealFairy()) {
			this.resources.get("FAERIE_GAUGE").gain(10);
		}
	}

	// Modifiers that only affect the caster's own GCD heals
	addHealingMagicPotencyModifiers(modifiers: PotencyModifier[]) {
		if (
			this.hasResourceAvailable("FEY_ILLUMINATION") ||
			this.hasResourceAvailable("SERAPHIC_ILLUMINATION")
		) {
			modifiers.push(Modifiers.FeyIllum);
		}
		if (this.hasResourceAvailable("DISSIPATION")) {
			modifiers.push(Modifiers.Dissipation);
		}
	}

	// Modifiers that affect incoming heals on the player with the effect
	addHealingActionPotencyModifiers(modifiers: PotencyModifier[]) {
		if (this.hasResourceAvailable("PROTRACTION")) {
			modifiers.push(Modifiers.Protraction);
		}
	}

	override get statusPropsGenerator(): StatusPropsGenerator<SCHState> {
		return new SCHStatusPropsGenerator(this);
	}
}

const makeSCHSpell = (
	name: SCHActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		autoDowngrade?: SkillAutoReplace;
		startOnHotbar?: boolean;
		baseCastTime?: number;
		drawsAggro?: boolean;
		manaCost: number | ResourceCalculationFn<SCHState>;
		potency?: number | Array<[TraitKey, number]>;
		healingPotency?: number | Array<[TraitKey, number]>;
		aoeHeal?: boolean;
		falloff?: number;
		applicationDelay: number;
		replaceIf?: ConditionalSkillReplace<SCHState>[];
		highlightIf?: StatePredicate<SCHState>;
		validateAttempt?: StatePredicate<SCHState>;
		onConfirm?: EffectFn<SCHState>;
		onApplication?: EffectFn<SCHState>;
	},
): Spell<SCHState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<SCHState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];
		state.addHealingMagicPotencyModifiers(modifiers);
		state.addHealingActionPotencyModifiers(modifiers);
		if (
			state.hasResourceAvailable("RECITATION") &&
			name !== "ACCESSION" &&
			name !== "MANIFESTATION"
		) {
			modifiers.push(Modifiers.AutoCrit);
		}
		return modifiers;
	};
	return makeSpell("SCH", name, unlockLevel, {
		...params,
		castTime: (state) => state.config.adjustedCastTime(params.baseCastTime ?? 0),
		recastTime: (state) => state.config.adjustedGCD(2.5),
		isInstantFn: (state) => !params.baseCastTime || state.hasResourceAvailable("SWIFTCAST"),
		jobPotencyModifiers: (state) => state.maybeChainModifier(),
		jobHealingPotencyModifiers,
		onConfirm: combineEffects(
			params.baseCastTime ? (state) => state.tryConsumeResource("SWIFTCAST") : undefined,
			params.healingPotency && name !== "PHYSICK"
				? (state) => state.tryConsumeResource("EMERGENCY_TACTICS")
				: undefined,
			params.onConfirm,
		),
	});
};

const makeSCHAbility = (
	name: SCHActionKey,
	unlockLevel: number,
	cdName: SCHCooldownKey,
	params: Partial<MakeAbilityParams<SCHState>>,
): Ability<SCHState> => {
	const jobHealingPotencyModifiers: PotencyModifierFn<SCHState> = (state) => {
		if (!params.healingPotency) {
			return [];
		}

		const modifiers: PotencyModifier[] = [];
		state.addHealingActionPotencyModifiers(modifiers);
		if (
			state.hasResourceAvailable("RECITATION") &&
			(name === "INDOMITABILITY" || name === "EXCOGITATION")
		) {
			modifiers.push(Modifiers.AutoCrit);
		}
		return modifiers;
	};
	return makeAbility("SCH", name, unlockLevel, cdName, {
		...params,
		jobPotencyModifiers: (state) => state.maybeChainModifier(),
		jobHealingPotencyModifiers,
	});
};

const makeSCHResourceAbility = (
	name: SCHActionKey,
	unlockLevel: number,
	cdName: SCHCooldownKey,
	params: MakeResourceAbilityParams<SCHState>,
): Ability<SCHState> => {
	return makeResourceAbility("SCH", name, unlockLevel, cdName, params);
};

const ADLOQUIUM_REPLACEMENTS: ConditionalSkillReplace<SCHState>[] = [
	{
		newSkill: "ADLOQUIUM",
		condition: (state) => !state.hasResourceAvailable("SERAPHISM"),
	},
	{
		newSkill: "MANIFESTATION",
		condition: (state) => state.hasResourceAvailable("SERAPHISM"),
	},
];
const CONCITATION_REPLACEMENTS: ConditionalSkillReplace<SCHState>[] = [
	{
		newSkill: "CONCITATION",
		condition: (state) => !state.hasResourceAvailable("SERAPHISM"),
	},
	{
		newSkill: "ACCESSION",
		condition: (state) => state.hasResourceAvailable("SERAPHISM"),
	},
];

makeSCHSpell("BROIL_II", 64, {
	autoUpgrade: {
		otherSkill: "BROIL_III",
		trait: "BROIL_MASTERY_III",
	},
	applicationDelay: 0, // TODO
	baseCastTime: 1.5,
	manaCost: 400,
	potency: 240,
});

makeSCHSpell("BROIL_III", 72, {
	autoDowngrade: {
		otherSkill: "BROIL_II",
		trait: "BROIL_MASTERY_III",
	},
	autoUpgrade: {
		otherSkill: "BROIL_IV",
		trait: "BROIL_MASTERY_IV",
	},
	applicationDelay: 0, // TODO
	baseCastTime: 1.5,
	manaCost: 400,
	potency: 255,
});

makeSCHSpell("BROIL_IV", 82, {
	autoDowngrade: {
		otherSkill: "BROIL_III",
		trait: "BROIL_MASTERY_IV",
	},
	applicationDelay: 0.8,
	baseCastTime: 1.5,
	manaCost: 400,
	potency: [
		["NEVER", 295],
		["TACTICIANS_MASTERY", 310],
	],
});

makeSCHSpell("BIO_II", 26, {
	autoUpgrade: {
		otherSkill: "BIOLYSIS",
		trait: "CORRUPTION_MASTERY_II",
	},
	applicationDelay: 0, // TODO
	baseCastTime: 0,
	manaCost: 300,
	drawsAggro: true,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "BIO_II",
			skillName: "BIO_II",
			tickPotency: 40,
			speedStat: "sps",
			// TODO chain should not snapshot since it's a debuff
			modifiers: state.maybeChainModifier(),
		});
	},
	onApplication: (state, node) => state.applyDoT("BIO_II", node),
});

makeSCHSpell("BIOLYSIS", 72, {
	autoDowngrade: {
		otherSkill: "BIO_II",
		trait: "CORRUPTION_MASTERY_II",
	},
	applicationDelay: 0.67,
	baseCastTime: 0,
	manaCost: 300,
	drawsAggro: true,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			effectName: "BIOLYSIS",
			skillName: "BIOLYSIS",
			tickPotency: state.hasTraitUnlocked("TACTICIANS_MASTERY") ? 80 : 70,
			speedStat: "sps",
			// TODO chain should not snapshot since it's a debuff
			modifiers: state.maybeChainModifier(),
		});
	},
	onApplication: (state, node) => state.applyDoT("BIOLYSIS", node),
});

makeSCHSpell("RUIN_II", 38, {
	applicationDelay: 0.94,
	potency: [
		["NEVER", 200],
		["BROIL_MASTERY_IV", 220],
	],
	baseCastTime: 0,
	manaCost: 400,
});

makeSCHSpell("ART_OF_WAR", 46, {
	autoUpgrade: {
		otherSkill: "ART_OF_WAR_II",
		trait: "ART_OF_WAR_MASTERY",
	},
	applicationDelay: 0, // TODO
	baseCastTime: 0,
	manaCost: 400,
	potency: 165,
	falloff: 0,
});

makeSCHSpell("ART_OF_WAR_II", 82, {
	autoDowngrade: {
		otherSkill: "ART_OF_WAR",
		trait: "ART_OF_WAR_MASTERY",
	},
	applicationDelay: 0.67,
	baseCastTime: 0,
	manaCost: 400,
	potency: 180,
	falloff: 0,
});

makeSCHResourceAbility("CHAIN_STRATAGEM", 66, "cd_CHAIN_STRATAGEM", {
	replaceIf: [
		{
			newSkill: "BANEFUL_IMPACTION",
			condition: (state) => state.hasResourceAvailable("IMPACT_IMMINENT"),
		},
	],
	rscType: "CHAIN_STRATAGEM",
	applicationDelay: 0.8,
	cooldown: 120,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_CHAIN_STRATAGEM")) {
			state.gainStatus("IMPACT_IMMINENT");
		}
	},
});

makeSCHAbility("BANEFUL_IMPACTION", 92, "cd_BANEFUL_IMPACTION", {
	startOnHotbar: false,
	applicationDelay: 1.29,
	cooldown: 1,
	falloff: 0,
	highlightIf: (state) => state.hasResourceAvailable("IMPACT_IMMINENT"),
	validateAttempt: (state) => state.hasResourceAvailable("IMPACT_IMMINENT"),
	onConfirm: (state, node) => {
		state.tryConsumeResource("IMPACT_IMMINENT");
		state.addDoTPotencies({
			node,
			effectName: "BANEFUL_IMPACTION",
			skillName: "BANEFUL_IMPACTION",
			tickPotency: 140,
			speedStat: "sps",
			// TODO chain should not snapshot since it's a debuff
			modifiers: state.maybeChainModifier(),
		});
	},
	onApplication: (state, node) => state.applyDoT("BANEFUL_IMPACTION", node),
});

makeSCHAbility("ENERGY_DRAIN", 45, "cd_ENERGY_DRAIN", {
	applicationDelay: 1.07,
	cooldown: 1,
	potency: 100,
	validateAttempt: (state) => state.hasResourceAvailable("AETHERFLOW"),
	onConfirm: (state) => {
		state.maybeGainFaerieGauge();
		state.tryConsumeResource("AETHERFLOW");
	},
});

makeSCHSpell("ADLOQUIUM", 30, {
	replaceIf: ADLOQUIUM_REPLACEMENTS,
	applicationDelay: 0.98,
	baseCastTime: 2,
	manaCost: 900,
	healingPotency: 300,
	onConfirm: (state) => {
		if (state.tryConsumeResource("RECITATION")) {
			state.gainStatus("GALVANIZE");
			if (state.triggersEffect(state.config.critRate)) {
				state.gainStatus("CATALYZE");
			}
		}
	},
});

makeSCHSpell("SUCCOR", 35, {
	autoUpgrade: {
		otherSkill: "CONCITATION",
		trait: "SUCCOR_MASTERY",
	},
	applicationDelay: 0, // TODO
	baseCastTime: 2,
	manaCost: 900,
	healingPotency: 200,
	onConfirm: (state) => {
		state.tryConsumeResource("RECITATION");
		state.gainStatus("GALVANIZE");
	},
});

makeSCHSpell("CONCITATION", 96, {
	autoDowngrade: {
		otherSkill: "CONCITATION",
		trait: "SUCCOR_MASTERY",
	},
	replaceIf: CONCITATION_REPLACEMENTS,
	applicationDelay: 1.12,
	baseCastTime: 2,
	manaCost: 900,
	healingPotency: 200,
	onConfirm: (state) => {
		state.tryConsumeResource("RECITATION");
		state.gainStatus("GALVANIZE");
	},
});

makeSCHSpell("PHYSICK", 4, {
	applicationDelay: 1.03,
	healingPotency: [
		["NEVER", 400],
		["ENHANCED_HEALING_MAGIC", 450],
	],
	baseCastTime: 1.5,
	manaCost: 300,
});

makeSCHSpell("RESURRECTION", 12, {
	applicationDelay: 0.98,
	baseCastTime: 8,
	manaCost: 2400,
});

makeSCHAbility("AETHERFLOW", 45, "cd_AETHERFLOW", {
	applicationDelay: 0,
	cooldown: 60,
	requiresCombat: true,
	onConfirm: (state) => {
		state.resources.get("MANA").gain(2000);
		state.resources.get("AETHERFLOW").gain(3);
	},
});

makeSCHResourceAbility("DISSIPATION", 60, "cd_DISSIPATION", {
	rscType: "DISSIPATION",
	applicationDelay: 0,
	cooldown: 180,
	requiresCombat: true,
	validateAttempt: (state) => !state.hasResourceAvailable("SERAPH_SUMMON_TIMER"),
	onConfirm: (state) => {
		state.warnLastPetGhost();
		state.resources.get("AETHERFLOW").gain(3);
		state.tryConsumeResource("SERAPHISM");
		// TODO if we model the regen properly as reapplying from the buff, don't consume the regen portion
		state.tryConsumeResource("SERAPHISM_REGEN");
	},
});

makeSCHAbility("LUSTRATE", 45, "cd_LUSTRATE", {
	applicationDelay: 0.62,
	cooldown: 1,
	healingPotency: 600,
	validateAttempt: (state) => state.hasResourceAvailable("AETHERFLOW"),
	onConfirm: (state) => {
		state.maybeGainFaerieGauge();
		state.tryConsumeResource("AETHERFLOW");
	},
});

makeSCHResourceAbility("SACRED_SOIL", 50, "cd_SACRED_SOIL", {
	rscType: "SACRED_SOIL",
	applicationDelay: 0.62,
	cooldown: 30,
	healingPotency: 100,
	validateAttempt: (state) => state.hasResourceAvailable("AETHERFLOW"),
	onConfirm: (state) => {
		state.maybeGainFaerieGauge();
		state.tryConsumeResource("AETHERFLOW");
	},
});

makeSCHResourceAbility("EXCOGITATION", 62, "cd_EXCOGITATION", {
	rscType: "EXCOGITATION",
	applicationDelay: 0.8,
	cooldown: 45,
	healingPotency: 800,
	validateAttempt: (state) =>
		state.hasResourceAvailable("RECITATION") || state.hasResourceAvailable("AETHERFLOW"),
	onConfirm: (state) => {
		state.maybeGainFaerieGauge();
		state.tryConsumeResource("RECITATION") || state.tryConsumeResource("AETHERFLOW");
	},
});

makeSCHAbility("INDOMITABILITY", 52, "cd_INDOMITABILITY", {
	applicationDelay: 0.62,
	cooldown: 30,
	healingPotency: 400,
	validateAttempt: (state) =>
		state.hasResourceAvailable("RECITATION") || state.hasResourceAvailable("AETHERFLOW"),
	onConfirm: (state) => {
		state.maybeGainFaerieGauge();
		state.tryConsumeResource("RECITATION") || state.tryConsumeResource("AETHERFLOW");
	},
});

makeSCHAbility("WHISPERING_DAWN", 20, "cd_WHISPERING_DAWN", {
	applicationDelay: 0,
	cooldown: 60,
	validateAttempt: (state) => !state.hasResourceAvailable("DISSIPATION"),
	onConfirm: (state, node) => {
		state.tryConsumeResource("FEY_UNION");
		const effectName = state.hasResourceAvailable("SERAPH_SUMMON_TIMER")
			? "ANGELS_WHISPER"
			: "WHISPERING_DAWN";
		const petSnapshot = (state: SCHState) => {
			state.addHoTPotencies({
				node,
				skillName: "WHISPERING_DAWN",
				effectName,
				speedStat: "sps",
				tickPotency: 80,
			});
			return (state: SCHState) => {
				state.applyHoT(effectName, node);
				node.getHotPotencies("WHISPERING_DAWN").forEach((potency) => {
					if (!potency.modifiers.includes(Modifiers.SchPet)) {
						potency.modifiers.push(Modifiers.SchPet);
					}
				});
				state.gainStatus(effectName);
			};
		};
		state.queuePetAction(
			node,
			"WHISPERING_DAWN",
			effectName,
			DEFAULT_EOS_COMMAND_DELAY,
			PET_APPLICATION_DELAYS.get(effectName)!,
			petSnapshot,
		);
	},
});

makeSCHAbility("FEY_ILLUMINATION", 40, "cd_FEY_ILLUMINATION", {
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => !state.hasResourceAvailable("DISSIPATION"),
	onConfirm: (state, node) => {
		state.tryConsumeResource("FEY_UNION");
		const effectName = state.hasResourceAvailable("SERAPH_SUMMON_TIMER")
			? "SERAPHIC_ILLUMINATION"
			: "FEY_ILLUMINATION";
		const petSnapshot = (state: SCHState) => (state: SCHState) => state.gainStatus(effectName);
		state.queuePetAction(
			node,
			"FEY_ILLUMINATION",
			"FEY_ILLUMINATION",
			DEFAULT_EOS_COMMAND_DELAY,
			PET_APPLICATION_DELAYS.get("FEY_ILLUMINATION")!,
			petSnapshot,
		);
	},
});

makeSCHAbility("DEPLOYMENT_TACTICS", 56, "cd_DEPLOYMENT_TACTICS", {
	applicationDelay: 0.89,
	cooldown: 120, // set by trait in constructor
});

makeSCHResourceAbility("EMERGENCY_TACTICS", 58, "cd_EMERGENCY_TACTICS", {
	rscType: "EMERGENCY_TACTICS",
	applicationDelay: 0,
	cooldown: 15,
});

makeSCHAbility("AETHERPACT", 70, "cd_AETHERPACT", {
	replaceIf: [
		{
			newSkill: "DISSOLVE_UNION",
			condition: (state) => state.hasResourceAvailable("FEY_UNION"),
		},
	],
	applicationDelay: 0,
	cooldown: 3,
	validateAttempt: (state) =>
		state.resources.get("FAERIE_GAUGE").available(10) && state.hasRealFairy(),
	onConfirm: (state, node) => {
		state.gainStatus("FEY_UNION");
		const petSnapshot = (state: SCHState) => (state: SCHState) => state.gainStatus("FEY_UNION");
		state.queuePetAction(
			node,
			"AETHERPACT",
			"AETHERPACT",
			DEFAULT_EOS_COMMAND_DELAY,
			PET_APPLICATION_DELAYS.get("AETHERPACT")!,
			petSnapshot,
		);
	},
});

makeSCHAbility("DISSOLVE_UNION", 70, "cd_DISSOLVE_UNION", {
	startOnHotbar: false,
	applicationDelay: 0,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("FEY_UNION"),
	onConfirm: (state) => state.tryConsumeResource("FEY_UNION"),
});

makeSCHResourceAbility("RECITATION", 74, "cd_RECITATION", {
	rscType: "RECITATION",
	applicationDelay: 0,
	cooldown: 90, // set by trait in constructor
});

makeSCHAbility("FEY_BLESSING", 76, "cd_FEY_BLESSING", {
	applicationDelay: 0,
	cooldown: 60,
	validateAttempt: (state) => state.hasRealFairy(),
	onConfirm: (state, node) => {
		state.tryConsumeResource("FEY_UNION");
		const petSnapshot = (state: SCHState) => {
			const healPotency = state.makePetPotency(
				node.healTargetCount,
				"FEY_BLESSING",
				state.getDisplayTime(),
				320,
			);
			return (state: SCHState) => controller.resolveHealingPotency(healPotency);
		};
		state.queuePetAction(
			node,
			"FEY_BLESSING",
			"FEY_BLESSING",
			DEFAULT_EOS_COMMAND_DELAY,
			PET_APPLICATION_DELAYS.get("FEY_BLESSING")!,
			petSnapshot,
		);
	},
});

makeSCHAbility("SUMMON_SERAPH", 80, "cd_SUMMON_SERAPH", {
	replaceIf: [
		{
			newSkill: "CONSOLATION",
			condition: (state) => state.hasResourceAvailable("SERAPH_SUMMON_TIMER"),
		},
	],
	applicationDelay: 0,
	cooldown: 120,
	validateAttempt: (state) => state.hasRealFairy(),
	// Treat seraph summon as instant
	onConfirm: (state) => {
		state.warnLastPetGhost();
		state.gainStatus("SERAPH_SUMMON_TIMER");
		state.tryConsumeResource("FEY_UNION");
	},
});

makeSCHAbility("CONSOLATION", 80, "cd_CONSOLATION", {
	startOnHotbar: false,
	applicationDelay: 0,
	cooldown: 30,
	maxCharges: 2,
	healingPotency: 250,
	validateAttempt: (state) => state.hasResourceAvailable("SERAPH_SUMMON_TIMER"),
	onConfirm: (state, node) => {
		const petSnapshot = (state: SCHState) => {
			const healPotency = state.makePetPotency(
				node.healTargetCount,
				"CONSOLATION",
				state.getDisplayTime(),
				250,
			);
			return (state: SCHState) => controller.resolveHealingPotency(healPotency);
		};
		state.queuePetAction(
			node,
			"CONSOLATION",
			"CONSOLATION",
			DEFAULT_EOS_COMMAND_DELAY,
			PET_APPLICATION_DELAYS.get("CONSOLATION")!,
			petSnapshot,
		);
	},
});

makeSCHResourceAbility("PROTRACTION", 86, "cd_PROTRACTION", {
	rscType: "PROTRACTION",
	applicationDelay: 0.76,
	cooldown: 60,
});

makeSCHAbility("EXPEDIENT", 90, "cd_EXPEDIENT", {
	applicationDelay: 0,
	cooldown: 120,
});

makeSCHResourceAbility("SERAPHISM", 100, "cd_SERAPHISM", {
	rscType: "SERAPHISM",
	applicationDelay: 0,
	cooldown: 180,
	validateAttempt: (state) => !state.hasResourceAvailable("DISSIPATION"),
	onConfirm: (state) => {
		// Temporarily replace the cooldown object of etact
		const oldEtactCd = state.cooldowns.get("cd_EMERGENCY_TACTICS");
		oldEtactCd.restore(15);
		state.cooldowns.set(new CoolDown("cd_EMERGENCY_TACTICS", 1, 1, 1));
		// Restore the old cooldown object when Seraphism expires
		state.addEvent(
			new Event("restore etact cd", state.getStatusDuration("SERAPHISM"), () =>
				state.cooldowns.set(oldEtactCd),
			),
		);
	},
});

makeSCHSpell("MANIFESTATION", 100, {
	startOnHotbar: false,
	replaceIf: ADLOQUIUM_REPLACEMENTS,
	applicationDelay: 1.16,
	healingPotency: 360,
	baseCastTime: 0,
	manaCost: 900,
	validateAttempt: (state) => state.hasResourceAvailable("SERAPHISM"),
	onConfirm: (state) => {
		// Does not consume Recitation
		state.gainStatus("GALVANIZE");
		if (state.triggersEffect(state.config.critRate)) {
			state.gainStatus("CATALYZE");
		}
	},
});

makeSCHSpell("ACCESSION", 100, {
	startOnHotbar: false,
	replaceIf: CONCITATION_REPLACEMENTS,
	applicationDelay: 0.98,
	healingPotency: 240,
	baseCastTime: 0,
	manaCost: 900,
	validateAttempt: (state) => state.hasResourceAvailable("SERAPHISM"),
	onConfirm: (state) => state.gainStatus("GALVANIZE"),
});
