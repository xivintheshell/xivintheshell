import { BLUStatusPropsGenerator } from "../../Components/Jobs/BLU";
import { controller } from "../../Controller/Controller";
import { Modifiers, PotencyModifier } from "../Potency";
import { Aspect } from "../Common";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	makeSpell,
	CooldownGroupProperties,
	ResourceCalculationFn,
	PotencyModifierFn,
	Spell,
	StatePredicate,
} from "../Skills";
import { GameState } from "../GameState";
import { makeResource, CoolDown, Event, getResourceInfo, ResourceInfo } from "../Resources";
import { GameConfig } from "../GameConfig";
import { TraitKey, ResourceKey } from "../Data";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { BLUResourceKey, BLUActionKey, BLUCooldownKey } from "../Data/Jobs/BLU";

const makeBLUResource = (
	rsc: BLUResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("BLU", rsc, maxValue, params ?? {});
};

makeBLUResource("NIGHTBLOOM", 1, { timeout: 60 });
makeBLUResource("SONG_OF_TORMENT", 1, { timeout: 30 });
makeBLUResource("FEATHER_RAIN", 1, { timeout: 6 });
makeBLUResource("WAXING_NOCTURNE", 1, { timeout: 15 });
makeBLUResource("WANING_NOCTURNE", 1, { timeout: 15 });
makeBLUResource("DIAMONDBACK", 1, { timeout: 10 });
makeBLUResource("BRISTLE", 1, { timeout: 30 });
makeBLUResource("WHISTLE", 1, { timeout: 30 });
makeBLUResource("TINGLE", 1, { timeout: 15 });
makeBLUResource("COLD_FOG", 1, { timeout: 5 });
makeBLUResource("TOUCH_OF_FROST", 1, { timeout: 15 });
makeBLUResource("PHANTOM_FLURRY", 1, { timeout: 5 });
makeBLUResource("APOKALYPSIS", 1, { timeout: 10 });
makeBLUResource("WINGED_REPROBATION", 4);
makeBLUResource("WINGED_REDEMPTION", 1, { timeout: 10 });
makeBLUResource("BREATH_OF_MAGIC", 1, { timeout: 60 });
makeBLUResource("MORTAL_FLAME", 1, { timeout: 900 });
makeBLUResource("SURPANAKHAS_FURY", 4, { timeout: 3 });
makeBLUResource("BRUSH_WITH_DEATH", 1, { timeout: 600 });
export class BLUState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// change if BLU gets a level cap increase to 100
		this.cooldowns.set(new CoolDown("cd_SWIFTCAST", 60, 1, 1));
		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "NIGHTBLOOM",
						appliedBy: ["NIGHTBLOOM"],
					},
					{
						effectName: "SONG_OF_TORMENT",
						appliedBy: ["SONG_OF_TORMENT"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "FEATHER_RAIN",
						appliedBy: ["FEATHER_RAIN"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "BREATH_OF_MAGIC",
						appliedBy: ["BREATH_OF_MAGIC"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "MORTAL_FLAME",
						appliedBy: ["MORTAL_FLAME"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "PHANTOM_FLURRY",
						appliedBy: ["PHANTOM_FLURRY"],
						isGroundTargeted: true,
						exclude: true,
					},
					{
						effectName: "APOKALYPSIS",
						appliedBy: ["APOKALYPSIS"],
						isGroundTargeted: true,
						exclude: true,
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<BLUState> {
		return new BLUStatusPropsGenerator(this);
	}

	refreshBuff(rscType: ResourceKey, delay: number) {
		this.addEvent(
			new Event("gain buff", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
				// To allow users to easily skip to the end of diamondback/waning nocturne durations,
				// we treat their applications as an animation lock.
				// We still need to check these buffs in `validateAttempt` to prevent hardcasts that
				// end after the buff changes from executing.
				// This also avoids the need to special-case locking out role actions.
				if (rscType === "WANING_NOCTURNE" || rscType === "DIAMONDBACK") {
					// Diamondback lasts longer than Waning Nocturne, so if dback would expire before
					// Waning Nocturne, don't re-take the animation lock.
					const newLockDuration = (getResourceInfo("BLU", rscType) as ResourceInfo)
						.maxTimeout;
					const changeEvent = this.resources.get("NOT_ANIMATION_LOCKED").pendingChange;
					if (changeEvent !== undefined) {
						this.resources
							.get("NOT_ANIMATION_LOCKED")
							.overrideTimer(
								this,
								Math.max(newLockDuration, changeEvent.timeTillEvent),
							);
					} else {
						this.resources.takeResourceLock("NOT_ANIMATION_LOCKED", newLockDuration);
					}
				}
			}),
		);
	}

	override jobSpecificRegisterRecurringEvents(): void {
		const recurringkickTick = () => {
			this.handleDoTTick("PHANTOM_FLURRY");

			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, "PHANTOM_FLURRY");
			}

			this.addEvent(
				new Event("kick tick", 1, () => {
					recurringkickTick();
				}),
			);
		};

		const recurringApokalypsisTick = () => {
			this.handleDoTTick("APOKALYPSIS");

			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, "APOKALYPSIS");
			}

			this.addEvent(
				new Event("Apokalypsis tick", 1, () => {
					recurringApokalypsisTick();
				}),
			);
		};

		let timeTillFirstkickTick = this.config.timeTillFirstManaTick + this.dotTickOffset;
		while (timeTillFirstkickTick > 1) timeTillFirstkickTick--;
		this.addEvent(new Event("initial kick tick", timeTillFirstkickTick, recurringkickTick));

		let timeTillFirstApokalypsisTick = this.config.timeTillFirstManaTick + this.dotTickOffset;
		while (timeTillFirstApokalypsisTick > 1) timeTillFirstApokalypsisTick--;

		this.addEvent(
			new Event(
				"initial Apokalypsis tick",
				timeTillFirstApokalypsisTick,
				recurringApokalypsisTick,
			),
		);
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource("PHANTOM_FLURRY");
		this.tryConsumeResource("APOKALYPSIS");
	}
}

const isOver = (state: Readonly<BLUState>) =>
	state.hasResourceAvailable("WANING_NOCTURNE") || state.hasResourceAvailable("DIAMONDBACK");

const isPhantom = (state: Readonly<BLUState>) => state.hasResourceAvailable("PHANTOM_FLURRY");
const Phantom_FlurryCondition: ConditionalSkillReplace<BLUState> = {
	newSkill: "END_PHANTOM_FLURRY",
	condition: (state) => isPhantom(state),
};

const makeBLUSpell = (
	name: BLUActionKey,
	unlockLevel: number,
	params: {
		aspect?: Aspect;
		replaceIf?: ConditionalSkillReplace<BLUState>[];
		startOnHotbar?: boolean;
		baseCastTime?: number;
		manaCost?: number;
		basePotency?: number;
		falloff?: number;
		applicationDelay: number;
		cooldown?: number;
		jobPotencyModifiers?: PotencyModifierFn<BLUState>;
		validateAttempt?: StatePredicate<BLUState>;
		onApplication?: EffectFn<BLUState>;
		onConfirm?: EffectFn<BLUState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Spell<BLUState> => {
	const basePotency = params.basePotency ?? Number;
	const aspect = params.aspect ?? Aspect.Other;
	const baseCastTime = params.baseCastTime ?? 0;
	const onConfirm: EffectFn<BLUState> | undefined =
		baseCastTime > 0
			? combineEffects((state) => state.tryConsumeResource("SWIFTCAST"), params.onConfirm)
			: params.onConfirm;
	const jobPotencyMod: PotencyModifierFn<BLUState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeSpell("BLU", name, unlockLevel, {
		...params,
		aspect: aspect,
		castTime: (state) => state.config.adjustedCastTime(baseCastTime),
		potency: params.basePotency,
		validateAttempt: (state) => !isOver(state) && (params.validateAttempt?.(state) ?? true),
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
				mods.push(Modifiers.MoonFlute);
			}
			if (basePotency !== 0 && state.hasResourceAvailable("BRISTLE")) {
				mods.push(Modifiers.Bristle) && state.tryConsumeResource("BRISTLE");
			}

			if (aspect === Aspect.Physical && state.hasResourceAvailable("WHISTLE")) {
				mods.push(Modifiers.Whistle) && state.tryConsumeResource("WHISTLE");
			}
			if (
				aspect === Aspect.Physical &&
				name !== "TRIPLE_TRIDENT" &&
				state.hasResourceAvailable("TINGLE")
			) {
				mods.push(Modifiers.TingleA) && state.tryConsumeResource("TINGLE");
			}
			if (name === "TRIPLE_TRIDENT" && state.hasResourceAvailable("TINGLE")) {
				mods.push(Modifiers.TingleB) && state.tryConsumeResource("TINGLE");
			}
			if (name === "CONVICTION_MARCATO" && state.hasResourceAvailable("WINGED_REDEMPTION")) {
				mods.push(Modifiers.WingedRedemption) &&
					state.tryConsumeResource("WINGED_REDEMPTION");
			}
			if (
				name === "WINGED_REPROBATION" &&
				state.resources.get("WINGED_REPROBATION").availableAmount() === 3
			) {
				mods.push(Modifiers.WingedReprobation);
			}
			return mods;
		},
		isInstantFn: (state) => state.hasResourceAvailable("SWIFTCAST") || baseCastTime === 0,
		onConfirm: combineEffects(
			(state) => state.tryConsumeResource("SURPANAKHAS_FURY"),
			params.onConfirm,
		),
	});
};

const makeBLUAbility = (
	name: BLUActionKey,
	unlockLevel: number,
	cdName: BLUCooldownKey,
	params: {
		animationLock?: number;
		manaCost?: number;
		potency?: number | Array<[TraitKey, number]> | ResourceCalculationFn<BLUState>;
		replaceIf?: ConditionalSkillReplace<BLUState>[];
		highlightIf?: StatePredicate<BLUState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		cooldown: number;
		maxCharges?: number;
		secondaryCooldown?: CooldownGroupProperties;
		validateAttempt?: StatePredicate<BLUState>;
		onConfirm?: EffectFn<BLUState>;
		onApplication?: EffectFn<BLUState>;
	},
): Ability<BLUState> => {
	const OnConfirm: EffectFn<BLUState> = (state: BLUState, node?: any) => {
		if (name !== "SURPANAKHA") {
			if (state.resources.get("SURPANAKHAS_FURY").availableAmount() > 0) {
				state.tryConsumeResource("SURPANAKHAS_FURY", true);
			}
		}
	};
	return makeAbility("BLU", name, unlockLevel, cdName, {
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
				mods.push(Modifiers.MoonFlute);
			}
			return mods;
		},
		validateAttempt: (state) => !isOver(state) && (params.validateAttempt?.(state) ?? true),
		...params,
		onConfirm: OnConfirm,
	});
};

makeBLUSpell("SONIC_BOOM", 1, {
	basePotency: 210,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
});

makeBLUSpell("SHARPENED_KNIFE", 1, {
	aspect: Aspect.Physical,
	basePotency: 220,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
});
makeBLUSpell("GOBLIN_PUNCH", 1, {
	aspect: Aspect.Physical,
	basePotency: 220,
	baseCastTime: 0,
	manaCost: 200,
	applicationDelay: 0.5,
});
makeBLUSpell("REVENGE_BLAST", 1, {
	aspect: Aspect.Physical,
	basePotency: 500,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
});
makeBLUSpell("WILD_RAGE", 1, {
	aspect: Aspect.Physical,
	basePotency: 500,
	baseCastTime: 5,
	manaCost: 0,
	applicationDelay: 0.5,
});
makeBLUSpell("CONVICTION_MARCATO", 1, {
	basePotency: 220,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
});

makeBLUSpell("WATER_CANNON", 1, {
	basePotency: 200,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
});

makeBLUSpell("HYDRO_PULL", 1, {
	basePotency: 220,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
});
makeBLUSpell("THE_ROSE_OF_DESTRUCTION", 1, {
	basePotency: 400,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_THE_ROSE_OF_DESTRUCTION",
		cooldown: 30,
		maxCharges: 1,
	},
});

makeBLUSpell("MOON_FLUTE", 1, {
	baseCastTime: 2.0,
	manaCost: 500,
	applicationDelay: 0.6,
	onConfirm: (state) => {
		if (!state.hasResourceAvailable("WAXING_NOCTURNE")) {
			state.refreshBuff("WAXING_NOCTURNE", 0.6);
			state.addEvent(
				new Event("Waxing_Nocturne ended", 15.6, () => {
					// Don't apply Waning Nocturne if it was already triggered by Diamondback
					if (!state.hasResourceAvailable("WANING_NOCTURNE")) {
						state.refreshBuff("WANING_NOCTURNE", 0);
					}
				}),
			);
		}
	},
});

makeBLUSpell("DIAMONDBACK", 1, {
	baseCastTime: 2.0,
	manaCost: 3000,
	applicationDelay: 0.6,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			state.tryConsumeResource("WAXING_NOCTURNE");
			state.refreshBuff("WANING_NOCTURNE", 0);
		}
		state.refreshBuff("DIAMONDBACK", 0.6);
	},
});

makeBLUSpell("MATRA_MAGIC", 1, {
	basePotency: 800,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_MATRA_MAGIC",
		cooldown: 120,
		maxCharges: 1,
	},
});

makeBLUSpell("SONG_OF_TORMENT", 1, {
	basePotency: 50,
	baseCastTime: 2.0,
	manaCost: 400,
	applicationDelay: 0.5,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		if (state.hasResourceAvailable("BRISTLE")) {
			modifiers.push(Modifiers.Bristle);
		}
		state.addDoTPotencies({
			node,
			effectName: "SONG_OF_TORMENT",
			skillName: "SONG_OF_TORMENT",
			tickPotency: 50,
			speedStat: "sps",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("SONG_OF_TORMENT", node);
	},
});

makeBLUSpell("BREATH_OF_MAGIC", 1, {
	basePotency: 0,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		if (state.hasResourceAvailable("BRISTLE")) {
			modifiers.push(Modifiers.Bristle);
		}
		state.tryConsumeResource("BRISTLE");
		state.addDoTPotencies({
			node,
			effectName: "BREATH_OF_MAGIC",
			skillName: "BREATH_OF_MAGIC",
			tickPotency: 120,
			speedStat: "sps",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("BREATH_OF_MAGIC", node);
	},
});
makeBLUSpell("MORTAL_FLAME", 1, {
	basePotency: 0,
	baseCastTime: 2.0,
	manaCost: 500,
	applicationDelay: 0.5,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		if (state.hasResourceAvailable("BRISTLE")) {
			modifiers.push(Modifiers.Bristle);
		}
		state.tryConsumeResource("BRISTLE");
		state.addDoTPotencies({
			node,
			effectName: "MORTAL_FLAME",
			skillName: "MORTAL_FLAME",
			tickPotency: 40,
			speedStat: "sps",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("MORTAL_FLAME", node);
	},
});
makeBLUSpell("WHISTLE", 1, {
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0,
	onConfirm: (state) => {
		state.tryConsumeResource("BRISTLE");
		state.refreshBuff("WHISTLE", 0);
	},
});

makeBLUSpell("BRISTLE", 1, {
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0,
	onConfirm: (state) => {
		state.tryConsumeResource("WHISTLE");
		state.refreshBuff("BRISTLE", 0);
	},
});

makeBLUSpell("FINAL_STING", 1, {
	aspect: Aspect.Physical,
	basePotency: 2000,
	baseCastTime: 2.0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !state.hasResourceAvailable("BRUSH_WITH_DEATH"),
	onConfirm: (state) => {
		state.refreshBuff("BRUSH_WITH_DEATH", 0);
	},
});

makeBLUSpell("TINGLE", 1, {
	basePotency: 100,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	onConfirm: (state) => {
		state.refreshBuff("TINGLE", 0);
	},
});

makeBLUSpell("TRIPLE_TRIDENT", 1, {
	aspect: Aspect.Physical,
	basePotency: 450,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_TRIPLE_TRIDENT",
		cooldown: 90,
		maxCharges: 1,
	},
});

const isColdA = (state: Readonly<BLUState>) => state.hasResourceAvailable("COLD_FOG");
const isColdB = (state: Readonly<BLUState>) => state.hasResourceAvailable("TOUCH_OF_FROST");

const Cold_FogCondition: ConditionalSkillReplace<BLUState>[] = [
	{
		newSkill: "POP_COLD_FOG",
		condition: (state) => isColdA(state),
	},

	{
		newSkill: "WHITE_DEATH",
		condition: (state) => isColdB(state),
	},
];

makeBLUSpell("COLD_FOG", 1, {
	replaceIf: Cold_FogCondition,
	baseCastTime: 2.0,
	cooldown: 90,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_COLD_FOG",
		cooldown: 90,
		maxCharges: 1,
	},
	onConfirm: (state) => {
		state.refreshBuff("COLD_FOG", 0);
	},
});
makeBLUSpell("WHITE_DEATH", 1, {
	startOnHotbar: false,
	basePotency: 400,
	baseCastTime: 0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state) && state.hasResourceAvailable("TOUCH_OF_FROST"),
});

makeBLUAbility("POP_COLD_FOG", 1, "cd_COLD_FOG_POP", {
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("COLD_FOG"),
	onConfirm: (state) => {
		state.tryConsumeResource("COLD_FOG");
		state.refreshBuff("TOUCH_OF_FROST", 0);
	},
});

makeBLUSpell("END_PHANTOM_FLURRY", 1, {
	startOnHotbar: false,
	basePotency: 600,
	baseCastTime: 0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => state.hasResourceAvailable("PHANTOM_FLURRY"),
});

makeBLUSpell("WINGED_REPROBATION", 1, {
	aspect: Aspect.Physical,
	basePotency: 300,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_WINGED_REPROBATION",
		cooldown: 90,
		maxCharges: 1,
	},
	onConfirm: (state) => {
		state.resources.get("WINGED_REPROBATION").gain(1);
		if (state.resources.get("WINGED_REPROBATION").availableAmount() <= 3) {
			(state.cooldowns.get("cd_WINGED_REPROBATION") as CoolDown).restore(90);
		}
		if (state.resources.get("WINGED_REPROBATION").availableAmount() === 4) {
			state.tryConsumeResource("WINGED_REPROBATION", true);
			state.refreshBuff("WINGED_REDEMPTION", 0);
		}
	},
});

makeBLUAbility("ERUPTION", 1, "cd_ERUPTION", {
	cooldown: 30,
	manaCost: 300,
	potency: 300,
	applicationDelay: 0.62,
});

makeBLUAbility("FEATHER_RAIN", 1, "cd_ERUPTION", {
	cooldown: 30,
	manaCost: 300,
	potency: 220,
	applicationDelay: 0.62,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		state.addDoTPotencies({
			node,
			effectName: "FEATHER_RAIN",
			skillName: "FEATHER_RAIN",
			tickPotency: 40,
			speedStat: "sps",
			modifiers,
		});
		state.applyDoT("FEATHER_RAIN", node);
	},
});

makeBLUAbility("MOUNTAIN_BUSTER", 1, "cd_SHOCK_STRIKE", {
	cooldown: 60,
	manaCost: 400,
	potency: 400,
	applicationDelay: 0.62,
});
makeBLUAbility("SHOCK_STRIKE", 1, "cd_SHOCK_STRIKE", {
	cooldown: 60,
	manaCost: 400,
	potency: 400,
	applicationDelay: 0.62,
});
makeBLUAbility("GLASS_DANCE", 1, "cd_GLASS_DANCE", {
	cooldown: 90,
	manaCost: 500,
	potency: 350,
	applicationDelay: 0.62,
});
makeBLUAbility("QUASAR", 1, "cd_QUASAR", {
	cooldown: 60,
	manaCost: 300,
	potency: 300,
	applicationDelay: 0.62,
});
makeBLUAbility("J_KICK", 1, "cd_QUASAR", {
	cooldown: 60,
	manaCost: 300,
	potency: 300,
	applicationDelay: 1,
	animationLock: 1,
});
makeBLUAbility("BOTH_ENDS", 1, "cd_NIGHTBLOOM", {
	cooldown: 120,
	manaCost: 300,
	potency: 600,
	applicationDelay: 0.62,
});
makeBLUAbility("SEA_SHANTY", 1, "cd_SEA_SHANTY", {
	cooldown: 120,
	manaCost: 300,
	potency: 500,
	applicationDelay: 0.62,
});
makeBLUAbility("BEING_MORTAL", 1, "cd_BEING_MORTAL", {
	cooldown: 120,
	manaCost: 300,
	potency: 800,
	applicationDelay: 0.62,
});

makeBLUAbility("APOKALYPSIS", 1, "cd_BEING_MORTAL", {
	cooldown: 120,
	manaCost: 300,
	potency: 0,
	applicationDelay: 1.38,
	animationLock: 1.38,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		state.addDoTPotencies({
			node,
			effectName: "APOKALYPSIS",
			skillName: "APOKALYPSIS",
			tickPotency: 140,
			tickFrequency: 1,
			speedStat: "unscaled",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("APOKALYPSIS", node);
	},
});

makeBLUAbility("NIGHTBLOOM", 1, "cd_NIGHTBLOOM", {
	cooldown: 120,
	manaCost: 300,
	potency: 400,
	applicationDelay: 0.62,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		state.addDoTPotencies({
			node,
			effectName: "NIGHTBLOOM",
			skillName: "NIGHTBLOOM",
			tickPotency: 75,
			speedStat: "sps",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("NIGHTBLOOM", node);
	},
});

makeBLUAbility("PHANTOM_FLURRY", 1, "cd_PHANTOM_FLURRY", {
	replaceIf: [Phantom_FlurryCondition],
	cooldown: 120,
	manaCost: 300,
	potency: 0,
	applicationDelay: 0.5,
	onConfirm: (state, node) => {
		const modifiers: PotencyModifier[] = [];
		if (state.hasResourceAvailable("WAXING_NOCTURNE")) {
			modifiers.push(Modifiers.MoonFlute);
		}
		state.addDoTPotencies({
			node,
			effectName: "PHANTOM_FLURRY",
			skillName: "PHANTOM_FLURRY",
			tickPotency: 200,
			tickFrequency: 1,
			speedStat: "unscaled",
			modifiers,
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("PHANTOM_FLURRY", node);
	},
});

makeBLUAbility("SURPANAKHA", 1, "cd_SURPANAKHA_LOCKOUT", {
	cooldown: 1,
	manaCost: 200,
	potency: (state) => 200 * (1 + 0.5 * state.resources.get("SURPANAKHAS_FURY").availableAmount()),
	applicationDelay: 0.62,
	onApplication: (state) => {
		if (state.resources.get("SURPANAKHAS_FURY").availableAmount() === 3) {
			state.tryConsumeResource("SURPANAKHAS_FURY", true);
		} else {
			state.refreshBuff("SURPANAKHAS_FURY", 0);
		}
	},
	secondaryCooldown: {
		cdName: "cd_SURPANAKHA",
		cooldown: 30,
		maxCharges: 4,
	},
});
