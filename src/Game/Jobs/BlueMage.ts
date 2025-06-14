import { BlueMageStatusPropsGenerator } from "../../Components/Jobs/BlueMage";
import { controller } from "../../Controller/Controller";
import { Modifiers, PotencyModifier } from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	FAKE_SKILL_ANIMATION_LOCK,
	makeAbility,
	makeSpell,
	CooldownGroupProperties,
	NO_EFFECT,
	PotencyModifierFn,
	Spell,
	StatePredicate,
} from "../Skills";
import { GameState } from "../GameState";
import {
	getResourceInfo,
	makeResource,
	CoolDown,
	Resource,
	ResourceInfo,
	Event,
} from "../Resources";
import { GameConfig } from "../GameConfig";
import { TraitKey, ResourceKey } from "../Data";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { BlueMageResourceKey, BlueMageActionKey, BlueMageCooldownKey } from "../Data/Jobs/BlueMage";

const makeBlueMageResource = (
	rsc: BlueMageResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("BlueMage", rsc, maxValue, params ?? {});
};

makeBlueMageResource("Nightbloom_DOT", 1, { timeout: 60 });
makeBlueMageResource("Song_of_Torment_DOT", 1, { timeout: 30 });
makeBlueMageResource("Feather_Rain_DOT", 1, { timeout: 6 });
makeBlueMageResource("Moon_Flute", 1, { timeout: 15 });
makeBlueMageResource("Moon_Flute_OVER_TIME", 1, { timeout: 15 });
makeBlueMageResource("Diamondback", 1, { timeout: 10 });
makeBlueMageResource("Bristle", 1, { timeout: 30 });
makeBlueMageResource("Whistle", 1, { timeout: 30 });
makeBlueMageResource("Tingle", 1, { timeout: 15 });
makeBlueMageResource("Cold_Fog_1", 1, { timeout: 5 });
makeBlueMageResource("Cold_Fog_2", 1, { timeout: 15 });
makeBlueMageResource("kick", 1, { timeout: 5 });
makeBlueMageResource("Apokalypsis", 1, { timeout: 10 });
makeBlueMageResource("AP", 4, { default: 4, timeout: 30 });
makeBlueMageResource("SurpanakhaA", 1, { timeout: 3 });
makeBlueMageResource("SurpanakhaB", 1, { timeout: 3 });
makeBlueMageResource("SurpanakhaC", 1, { timeout: 3 });
makeBlueMageResource("Winged_Reprobation", 4);
makeBlueMageResource("Winged_Redemption", 1, { timeout: 10 });
makeBlueMageResource("Breath_of_Magic_DOT", 1, { timeout: 60 });
makeBlueMageResource("Mortal_Flame_DOT", 1, { timeout: 900 });

const BUFFS_DISPELLED_BY_SurpanakhaB: BlueMageResourceKey[] = ["SurpanakhaA"];
const BUFFS_DISPELLED_BY_SurpanakhaC: BlueMageResourceKey[] = ["SurpanakhaB"];
const BUFFS_DISPELLED_BY_SurpanakhaD: BlueMageResourceKey[] = ["SurpanakhaC"];

export class BlueMageState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		this.registerRecurringEvents([
			{
				groupedEffects: [
					{
						effectName: "Nightbloom_DOT",
						appliedBy: ["Nightbloom"],
					},
					{
						effectName: "Song_of_Torment_DOT",
						appliedBy: ["Song_of_Torment"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "Feather_Rain_DOT",
						appliedBy: ["Feather_Rain"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "Breath_of_Magic_DOT",
						appliedBy: ["Feather_Rain"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "Mortal_Flame_DOT",
						appliedBy: ["Feather_Rain"],
					},
				],
			},
			{
				groupedEffects: [
					{
						effectName: "kick",
						appliedBy: ["kick"],
						isGroundTargeted: true,
						exclude: true,
					},
					{
						effectName: "Apokalypsis",
						appliedBy: ["Apokalypsis"],
						exclude: true,
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<BlueMageState> {
		return new BlueMageStatusPropsGenerator(this);
	}

	refreshBuff(rscType: ResourceKey, delay: number) {
		this.addEvent(
			new Event("gain buff", delay, () => {
				this.resources.get(rscType).gain(1);
				this.enqueueResourceDrop(rscType);
			}),
		);
	}

	override jobSpecificRegisterRecurringEvents(): void {
		let recurringkickTick = () => {
			this.handleDoTTick("kick");

			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, "kick");
			}

			this.addEvent(
				new Event("kick tick", 1, () => {
					recurringkickTick();
				}),
			);
		};

		let recurringApokalypsisTick = () => {
			this.handleDoTTick("Apokalypsis");

			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, "Apokalypsis");
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

		let recurringAPGain = (rsc: Resource) => {
			const APInfo = getResourceInfo("BlueMage", "AP") as ResourceInfo;
			if (!this.hasResourceAvailable("AP", APInfo.maxValue)) {
				this.resources.get("AP").gain(1);
			}
			if (this.hasResourceAvailable("AP", APInfo.maxValue)) {
				this.resources.get("AP").overrideTimer(this, APInfo.maxTimeout);
			}
			this.resources.addResourceEvent({
				rscType: "AP",
				name: "gain AP",
				delay: 30,
				fnOnRsc: recurringAPGain,
			});
		};
		recurringAPGain(this.resources.get("AP"));
	}

	consumeAP() {
		const APInfo = getResourceInfo("BlueMage", "AP") as ResourceInfo;
		if (this.hasResourceAvailable("AP", APInfo.maxValue)) {
			this.resources.get("AP").overrideTimer(this, APInfo.maxTimeout);
		}
		this.tryConsumeResource("AP");
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource("kick");
		this.tryConsumeResource("Apokalypsis");
	}
}

const isOver = (state: Readonly<BlueMageState>) =>
	state.hasResourceAvailable("Moon_Flute_OVER_TIME") || state.hasResourceAvailable("Diamondback");

const isPhantom = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("kick");
const Phantom_FlurryCondition: ConditionalSkillReplace<BlueMageState> = {
	newSkill: "Phantom_Flurry_B",
	condition: (state) => isPhantom(state),
};

const makeBlueMageSpell = (
	name: BlueMageActionKey,
	unlockLevel: number,
	params: {
		replaceIf?: ConditionalSkillReplace<BlueMageState>[];
		startOnHotbar?: boolean;
		highlightIf?: StatePredicate<BlueMageState>;
		baseCastTime?: number;
		baseRecastTime?: number;
		CastTime?: number;
		RecastTime?: number;
		manaCost?: number;
		basePotency?: number;
		drawsAggro?: boolean;
		falloff?: number;
		applicationDelay: number;
		isPetAttack?: boolean;
		cooldown?: number;
		jobPotencyModifiers?: PotencyModifierFn<BlueMageState>;
		validateAttempt?: StatePredicate<BlueMageState>;
		onApplication?: EffectFn<BlueMageState>;
		onConfirm?: EffectFn<BlueMageState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Spell<BlueMageState> => {
	const baseCastTime = params.baseCastTime ?? 0;
	const baseRecastTime = params.baseRecastTime ?? 2.5;
	const onConfirm: EffectFn<BlueMageState> | undefined =
		baseCastTime > 0
			? combineEffects(
					(state) => state.tryConsumeResource("SWIFTCAST"),
					params.onConfirm ?? NO_EFFECT,
				)
			: params.onConfirm;
	const jobPotencyMod: PotencyModifierFn<BlueMageState> =
		params.jobPotencyModifiers ?? ((state) => []);
	return makeSpell("BlueMage", name, unlockLevel, {
		...params,
		castTime: (state) => state.config.adjustedCastTime(baseCastTime),
		// em rite does not get scaled by sps
		recastTime: (state) =>
			baseRecastTime <= 1.5 ? baseRecastTime : state.config.adjustedGCD(baseRecastTime),
		potency: params.basePotency,

		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = jobPotencyMod(state);
			if (state.hasResourceAvailable("Moon_Flute")) {
				mods.push(Modifiers.MoonFlute);
			}
			if (state.hasResourceAvailable("Bristle")) {
				mods.push(Modifiers.Bristle);
			}

			if (
				(name === "Sharpened_Knife" ||
					name === "Final_Sting" ||
					name === "Triple_Trident" ||
					name === "Winged_Reprobation" ||
					name === "Revenge_Blast" ||
					name === "Wild_Rage" ||
					name === "Goblin_Punch") &&
				state.hasResourceAvailable("Whistle")
			) {
				mods.push(Modifiers.Whistle);
			}
			if (
				(name === "Sharpened_Knife" ||
					name === "Final_Sting" ||
					name === "Winged_Reprobation" ||
					name === "Revenge_Blast" ||
					name === "Wild_Rage" ||
					name === "Goblin_Punch") &&
				state.hasResourceAvailable("Tingle")
			) {
				mods.push(Modifiers.TingleA);
			}
			if (name === "Triple_Trident" && state.hasResourceAvailable("Tingle")) {
				mods.push(Modifiers.TingleB);
			}
			if (name === "Conviction_Marcato" && state.hasResourceAvailable("Winged_Redemption")) {
				mods.push(Modifiers.WingedRedemption);
			}
			if (
				name === "Winged_Reprobation" &&
				state.resources.get("Winged_Reprobation").availableAmount() >= 3
			) {
				mods.push(Modifiers.WingedReprobation);
			}
			return mods;
		},

		isInstantFn: (state) => state.hasResourceAvailable("SWIFTCAST") || baseCastTime === 0,
		onConfirm,
	});
};

const makeBlueMageAbility = (
	name: BlueMageActionKey,
	unlockLevel: number,
	cdName: BlueMageCooldownKey,
	params: {
		animationLock?: number;
		manaCost?: number;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<BlueMageState>[];
		highlightIf?: StatePredicate<BlueMageState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<BlueMageState>;
		onConfirm?: EffectFn<BlueMageState>;
		onApplication?: EffectFn<BlueMageState>;
	},
): Ability<BlueMageState> =>
	makeAbility("BlueMage", name, unlockLevel, cdName, {
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			if (state.hasResourceAvailable("Moon_Flute")) {
				mods.push(Modifiers.MoonFlute);
			}

			return mods;
		},
		...params,
	});

makeBlueMageSpell("Sonic_Boom", 1, {
	basePotency: 210,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
	},
});

makeBlueMageSpell("Sharpened_Knife", 1, {
	basePotency: 220,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
	},
});
makeBlueMageSpell("Goblin_Punch", 1, {
	basePotency: 220,
	baseCastTime: 0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
	},
});
makeBlueMageSpell("Revenge_Blast", 1, {
	basePotency: 500,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
	},
});
makeBlueMageSpell("Wild_Rage", 1, {
	basePotency: 500,
	baseCastTime: 5,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
	},
});
makeBlueMageSpell("Conviction_Marcato", 1, {
	basePotency: 220,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Winged_Redemption");
	},
});

makeBlueMageSpell("Water_Cannon", 1, {
	basePotency: 200,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
	},
});

makeBlueMageSpell("Hydro_Pull", 1, {
	basePotency: 220,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
	},
});
makeBlueMageSpell("The_Rose_of_Destruction", 1, {
	basePotency: 400,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_The_Rose_of_Destruction",
		cooldown: 30,
		maxCharges: 1,
	},
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
	},
});

makeBlueMageSpell("Moon_Flute", 1, {
	baseCastTime: 2.0,
	manaCost: 500,
	applicationDelay: 0.6,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.refreshBuff("Moon_Flute", 0.6);
		state.addEvent(
			new Event("Moon_Flute ended", 15.6, () => {
				if (!state.hasResourceAvailable("Diamondback")) {
					state.refreshBuff("Moon_Flute_OVER_TIME", 0);
				}
			}),
		);
	},
});

makeBlueMageSpell("Diamondback", 1, {
	baseCastTime: 2.0,
	manaCost: 3000,
	applicationDelay: 0.6,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		if (state.hasResourceAvailable("Moon_Flute")) {
			state.tryConsumeResource("Moon_Flute");
			state.refreshBuff("Moon_Flute_OVER_TIME", 0);
		}
		state.refreshBuff("Diamondback", 0.6);
	},
});

makeBlueMageSpell("Matra_Magic", 1, {
	basePotency: 800,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	secondaryCooldown: {
		cdName: "cd_Matra_Magic",
		cooldown: 120,
		maxCharges: 1,
	},
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
	},
});

makeBlueMageSpell("Song_of_Torment", 1, {
	basePotency: 50,
	baseCastTime: 2.0,
	manaCost: 400,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.addDoTPotencies({
			node,
			effectName: "Song_of_Torment_DOT",
			skillName: "Song_of_Torment",
			tickPotency: 50,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => {
		state.tryConsumeResource("Nightbloom_DOT");
		state.applyDoT("Song_of_Torment_DOT", node);
	},
});

makeBlueMageSpell("Breath_of_Magic", 1, {
	basePotency: 0.00001,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.addDoTPotencies({
			node,
			effectName: "Breath_of_Magic_DOT",
			skillName: "Breath_of_Magic",
			tickPotency: 120,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("Breath_of_Magic_DOT", node);
	},
});
makeBlueMageSpell("Mortal_Flame", 1, {
	basePotency: 0.00001,
	baseCastTime: 2.0,
	manaCost: 500,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state, node) => {
		state.tryConsumeResource("Bristle");
		state.addDoTPotencies({
			node,
			effectName: "Mortal_Flame_DOT",
			skillName: "Mortal_Flame",
			tickPotency: 40,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("Mortal_Flame_DOT", node);
	},
});
makeBlueMageSpell("Whistle", 1, {
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.refreshBuff("Whistle", 0);
	},
});

makeBlueMageSpell("Bristle", 1, {
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Whistle");
		state.refreshBuff("Bristle", 0);
	},
});

makeBlueMageSpell("Final_Sting", 1, {
	basePotency: 2000,
	baseCastTime: 2.0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Tingle");
	},
});

makeBlueMageSpell("Tingle", 1, {
	basePotency: 100,
	baseCastTime: 2.0,
	manaCost: 200,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.refreshBuff("Tingle", 0);
	},
});

makeBlueMageSpell("Triple_Trident", 1, {
	basePotency: 450,
	baseCastTime: 2.0,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_Triple_Trident",
		cooldown: 90,
		maxCharges: 1,
	},
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
	},
});

const isColdA = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("Cold_Fog_1");
const isColdB = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("Cold_Fog_2");

const Cold_FogCondition: ConditionalSkillReplace<BlueMageState>[] = [
	{
		newSkill: "Cold_Fog_3",
		condition: (state) => isColdA(state),
	},

	{
		newSkill: "Cold_Fog_2",
		condition: (state) => isColdB(state),
	},
];

makeBlueMageSpell("Cold_Fog_1", 1, {
	replaceIf: Cold_FogCondition,
	baseCastTime: 2.0,
	cooldown: 90,
	manaCost: 300,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_Cold_Fog",
		cooldown: 90,
		maxCharges: 1,
	},
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.refreshBuff("Cold_Fog_1", 0);
	},
});
makeBlueMageSpell("Cold_Fog_2", 1, {
	startOnHotbar: false,
	basePotency: 400,
	baseCastTime: 0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
	},
});

makeBlueMageAbility("Cold_Fog_3", 1, "cd_Cold_Fog_Pop", {
	startOnHotbar: false,
	applicationDelay: 0,
	animationLock: FAKE_SKILL_ANIMATION_LOCK,
	cooldown: 1,
	validateAttempt: (state) => state.hasResourceAvailable("Cold_Fog_1"),
	onConfirm: (state) => {
		state.tryConsumeResource("Cold_Fog_1");
		state.refreshBuff("Cold_Fog_2", 0);
	},
});

makeBlueMageSpell("Phantom_Flurry_B", 1, {
	startOnHotbar: false,
	basePotency: 600,
	baseCastTime: 0,
	manaCost: 0,
	applicationDelay: 0.5,
	validateAttempt: (state) => !isOver(state),
});

makeBlueMageSpell("Winged_Reprobation", 1, {
	basePotency: 300,
	baseCastTime: 1.0,
	manaCost: 200,
	applicationDelay: 0.5,
	secondaryCooldown: {
		cdName: "cd_Winged_Reprobation",
		cooldown: 90,
		maxCharges: 1,
	},
	validateAttempt: (state) => !isOver(state),
	onConfirm: (state) => {
		state.tryConsumeResource("Bristle");
		state.tryConsumeResource("Whistle");
		state.tryConsumeResource("Tingle");
		state.resources.get("Winged_Reprobation").gain(1);
		if (state.resources.get("Winged_Reprobation").availableAmount() <= 3) {
			(state.cooldowns.get("cd_Winged_Reprobation") as CoolDown).restore(90);
		}
		if (state.resources.get("Winged_Reprobation").availableAmount() >= 4) {
			state.tryConsumeResource("Winged_Reprobation", true);
			state.refreshBuff("Winged_Redemption", 0);
		}
	},
});

makeBlueMageAbility("Eruption", 1, "cd_Eruption", {
	cooldown: 30,
	manaCost: 300,
	potency: 300,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});

makeBlueMageAbility("Feather_Rain", 1, "cd_Eruption", {
	cooldown: 30,
	manaCost: 300,
	potency: 220,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state, node) => {
		state.resources.get("MANA").consume(300);
		state.addDoTPotencies({
			node,
			effectName: "Feather_Rain_DOT",
			skillName: "Feather_Rain",
			tickPotency: 40,
			speedStat: "sps",
		});
		state.applyDoT("Feather_Rain_DOT", node);
	},
});

makeBlueMageAbility("Mountain_Buster", 1, "cd_Shock_Strike", {
	cooldown: 60,
	manaCost: 400,
	potency: 400,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 400,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(400);
	},
});
makeBlueMageAbility("Shock_Strike", 1, "cd_Shock_Strike", {
	cooldown: 60,
	manaCost: 400,
	potency: 400,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 400,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(400);
	},
});
makeBlueMageAbility("Glass_Dance", 1, "cd_Glass_Dance", {
	cooldown: 90,
	manaCost: 500,
	potency: 350,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 500,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(500);
	},
});
makeBlueMageAbility("Quasar", 1, "cd_Quasar", {
	cooldown: 60,
	manaCost: 300,
	potency: 300,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});
makeBlueMageAbility("J_Kick", 1, "cd_Quasar", {
	cooldown: 60,
	manaCost: 300,
	potency: 300,
	applicationDelay: 1,
	animationLock: 1,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});
makeBlueMageAbility("Both_Ends", 1, "cd_Nightbloom", {
	cooldown: 120,
	manaCost: 300,
	potency: 600,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});
makeBlueMageAbility("Sea_Shanty", 1, "cd_Sea_Shanty", {
	cooldown: 120,
	manaCost: 300,
	potency: 500,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});
makeBlueMageAbility("Being_Mortal", 1, "cd_Being_Mortal", {
	cooldown: 120,
	manaCost: 300,
	potency: 800,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state) => {
		state.resources.get("MANA").consume(300);
	},
});

makeBlueMageAbility("Apokalypsis", 1, "cd_Being_Mortal", {
	cooldown: 120,
	manaCost: 300,
	potency: 0.0001,
	applicationDelay: 1.38,
	animationLock: 1.38,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state, node) => {
		state.resources.get("MANA").consume(300);
		state.addDoTPotencies({
			node,
			effectName: "Apokalypsis",
			skillName: "Apokalypsis",
			tickPotency: 100,
			tickFrequency: 1,
			speedStat: "sks",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("Apokalypsis", node);
	},
});

makeBlueMageAbility("Nightbloom", 1, "cd_Nightbloom", {
	cooldown: 120,
	manaCost: 300,
	potency: 400,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state, node) => {
		state.resources.get("MANA").consume(300);
		state.tryConsumeResource("Song_of_Torment_DOT");
		state.addDoTPotencies({
			node,
			effectName: "Nightbloom_DOT",
			skillName: "Nightbloom",
			tickPotency: 75,
			speedStat: "sps",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("Nightbloom_DOT", node);
	},
});

makeBlueMageAbility("kick", 1, "cd_Phantom_Flurry", {
	replaceIf: [Phantom_FlurryCondition],
	cooldown: 120,
	manaCost: 300,
	potency: 0.00001,
	applicationDelay: 0.5,
	validateAttempt: (state) =>
		!isOver(state) && state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state, node) => {
		state.resources.get("MANA").consume(300);
		state.addDoTPotencies({
			node,
			effectName: "kick",
			skillName: "kick",
			tickPotency: 200,
			tickFrequency: 1,
			speedStat: "sks",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("kick", node);
	},
});

const isSurpanakhaA = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("SurpanakhaA");
const isSurpanakhaB = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("SurpanakhaB");
const isSurpanakhaC = (state: Readonly<BlueMageState>) => state.hasResourceAvailable("SurpanakhaC");

const Surpanakha_LIST: ConditionalSkillReplace<BlueMageState>[] = [
	{
		newSkill: "SurpanakhaB",
		condition: (state) => isSurpanakhaA(state),
	},
	{
		newSkill: "SurpanakhaC",
		condition: (state) => isSurpanakhaB(state),
	},
	{
		newSkill: "SurpanakhaD",
		condition: (state) => isSurpanakhaC(state),
	},
];

makeBlueMageAbility("SurpanakhaA", 1, "cd_Surpanakha", {
	replaceIf: Surpanakha_LIST,
	cooldown: 1,
	manaCost: 200,
	potency: 200,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) &&
		state.hasResourceAvailable("AP") &&
		state.resources.get("MANA").availableAmount() >= 300,
	onConfirm: (state, node) => {
		state.resources.get("MANA").consume(200);
		state.consumeAP(), state.refreshBuff("SurpanakhaA", 0);
	},
});

makeBlueMageAbility("SurpanakhaB", 1, "cd_Surpanakha", {
	startOnHotbar: false,
	cooldown: 1,
	manaCost: 200,
	potency: 300,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) &&
		state.hasResourceAvailable("AP") &&
		state.resources.get("MANA").availableAmount() >= 300,
	onApplication: (state, node) => {
		let dispellCount = 0;
		BUFFS_DISPELLED_BY_SurpanakhaB.forEach((buff) => {
			if (state.tryConsumeResource(buff)) {
				dispellCount += 1;
			}
		});
		state.resources.get("MANA").consume(200);
		state.resources.get("AP").consume(1), state.refreshBuff("SurpanakhaB", 0);
	},
});

makeBlueMageAbility("SurpanakhaC", 1, "cd_Surpanakha", {
	startOnHotbar: false,
	cooldown: 1,
	manaCost: 200,
	potency: 400,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) &&
		state.hasResourceAvailable("AP") &&
		state.resources.get("MANA").availableAmount() >= 300,
	onApplication: (state, node) => {
		let dispellCount = 0;
		BUFFS_DISPELLED_BY_SurpanakhaC.forEach((buff) => {
			if (state.tryConsumeResource(buff)) {
				dispellCount += 1;
			}
		});
		state.resources.get("MANA").consume(200);
		state.resources.get("AP").consume(1), state.refreshBuff("SurpanakhaC", 0);
	},
});

makeBlueMageAbility("SurpanakhaD", 1, "cd_Surpanakha", {
	startOnHotbar: false,
	cooldown: 1,
	manaCost: 200,
	potency: 500,
	applicationDelay: 0.62,
	validateAttempt: (state) =>
		!isOver(state) &&
		state.hasResourceAvailable("AP") &&
		state.resources.get("MANA").availableAmount() >= 300,

	onApplication: (state, node) => {
		let dispellCount = 0;
		BUFFS_DISPELLED_BY_SurpanakhaD.forEach((buff) => {
			if (state.tryConsumeResource(buff)) {
				dispellCount += 1;
			}
		});
		state.resources.get("MANA").consume(200);
		state.resources.get("AP").consume(1);
	},
});
