import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { Aspect, ResourceType, SkillName, WarningType } from "../Common";
import { TraitKey } from "../Data/Traits";
import { GameConfig } from "../GameConfig";
import { GameState } from "../GameState";
import { makeComboModifier, Modifiers, Potency, PotencyModifier } from "../Potency";
import {
	CoolDown,
	getResourceInfo,
	makeResource,
	ResourceInfo,
	Event,
	DoTBuff,
	Resource,
} from "../Resources";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	CooldownGroupProperties,
	EffectFn,
	getBasePotency,
	makeAbility,
	makeResourceAbility,
	makeWeaponskill,
	NO_EFFECT,
	ResourceCalculationFn,
	SkillAutoReplace,
	StatePredicate,
	Weaponskill,
} from "../Skills";

const makeMCHResource = (
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("MCH", rsc, maxValue, params ?? {});
};

// Gauge resources
makeMCHResource(ResourceType.HeatGauge, 100);
makeMCHResource(ResourceType.BatteryGauge, 100);

// Status Effects
makeMCHResource(ResourceType.Reassembled, 1, { timeout: 5 });
makeMCHResource(ResourceType.Overheated, 5, { timeout: 10 });
makeMCHResource(ResourceType.Wildfire, 1, { timeout: 10 });
makeMCHResource(ResourceType.WildfireSelf, 1, { timeout: 10 });
makeMCHResource(ResourceType.Flamethrower, 1, { timeout: 10 });
makeMCHResource(ResourceType.Bioblaster, 1, { timeout: 15 });
makeMCHResource(ResourceType.Tactician, 1, { timeout: 15 });
makeMCHResource(ResourceType.Hypercharged, 1, { timeout: 30 });
makeMCHResource(ResourceType.ExcavatorReady, 1, { timeout: 30 });
makeMCHResource(ResourceType.FullMetalMachinist, 1, { timeout: 30 });

// Combos & other tracking
makeMCHResource(ResourceType.HeatCombo, 2, { timeout: 30 });
makeMCHResource(ResourceType.Queen, 7);
makeMCHResource(ResourceType.QueenPunches, 5);
makeMCHResource(ResourceType.QueenFinishers, 2);
makeMCHResource(ResourceType.WildfireHits, 6);
makeMCHResource(ResourceType.BatteryBonus, 50);

const COMBO_GCDS: SkillName[] = [
	SkillName.HeatedCleanShot,
	SkillName.HeatedSlugShot,
	SkillName.HeatedSplitShot,
	SkillName.SpreadShot,
	SkillName.Scattergun, // Including AoE GCDs that break the combo, even though they don't combo themselves
];

// Skills that don't consume overheat - these are all AoE skills
// The only AoE skill that consumes overheat is Auto Crossbow
const WEAPONSKILLS_THAT_DONT_CONSUME_OVERHEAT: SkillName[] = [
	SkillName.Chainsaw,
	SkillName.Excavator,
	SkillName.FullMetalField,
	SkillName.Scattergun,
	SkillName.Bioblaster,
	SkillName.SpreadShot,
];

export class MCHState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Unlike standard and technical, Air Anchor and Chain Saw's cooldowns are affected by skill speed
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_AirAnchor, this.config.adjustedSksGCD(40), 1, 1),
		);
		this.cooldowns.set(
			new CoolDown(ResourceType.cd_Chainsaw, this.config.adjustedSksGCD(60), 1, 1),
		);

		if (!this.hasTraitUnlocked("QUEENS_GAMBIT")) {
			this.resources.set(new Resource(ResourceType.QueenFinishers, 1, 0));
			this.resources.set(new Resource(ResourceType.Queen, 6, 0));
		}

		if (!this.hasTraitUnlocked("ENHANCED_REASSEMBLE")) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_Reassemble, 55, 1, 1));
		}
		if (!this.hasTraitUnlocked("ENHANCED_MULTI_WEAPON")) {
			this.cooldowns.set(
				new CoolDown(ResourceType.cd_Drill, this.config.adjustedSksGCD(20), 1, 1),
			);
		}

		if (!this.hasTraitUnlocked("CHARGED_ACTION_MASTERY")) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_DoubleCheck, 30, 2, 2));
			this.cooldowns.set(new CoolDown(ResourceType.cd_Checkmate, 30, 2, 2));
		}

		if (!this.hasTraitUnlocked("ENHANCED_TACTICIAN")) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_Tactician, 120, 1, 1));
		}

		this.registerRecurringEvents([
			{
				groupedDots: [
					{
						dotName: ResourceType.Bioblaster,
						appliedBy: [SkillName.Bioblaster],
					},
				],
			},
			{
				groupedDots: [
					{
						dotName: ResourceType.Flamethrower,
						appliedBy: [SkillName.Flamethrower],
						isGroundTargeted: true,
						exclude: true,
					},
				],
			},
		]);
	}

	// Flamethrower works like a DoT, but ticks every second instead, so we need to handle that separately
	override jobSpecificRegisterRecurringEvents(): void {
		let recurringFlamethrowerTick = () => {
			this.handleDoTTick(ResourceType.Flamethrower);

			// increment count
			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, ResourceType.Flamethrower);
			}

			// Flamethrower ticks every second, instead of every three, the way most DoTs do
			this.addEvent(
				new Event("Flamethrower tick", 1, () => {
					recurringFlamethrowerTick();
				}),
			);
		};

		let timeTillFirstFlamethrowerTick = this.config.timeTillFirstManaTick + this.dotTickOffset;
		while (timeTillFirstFlamethrowerTick > 1) timeTillFirstFlamethrowerTick--;
		this.addEvent(
			new Event(
				"initial Flamethrower tick",
				timeTillFirstFlamethrowerTick,
				recurringFlamethrowerTick,
			),
		);
	}

	override cancelChanneledSkills(): void {
		this.tryConsumeResource(ResourceType.Flamethrower);
	}

	processComboStatus(skill: SkillName) {
		if (!COMBO_GCDS.includes(skill)) {
			return;
		} // MCH's non-combo GCDs don't break an ongoing combo

		const comboState = this.resources.get(ResourceType.HeatCombo).availableAmount();

		// Defaulting to nextState 0 allows the AoE fillers to break the combo
		let nextState = 0;
		if (comboState === 0 && skill === SkillName.HeatedSplitShot) {
			nextState = 1;
		} else if (comboState === 1 && skill === SkillName.HeatedSlugShot) {
			nextState = 2;
		}

		this.setComboState(ResourceType.HeatCombo, nextState);
	}

	gainResource(
		rscType: typeof ResourceType.HeatGauge | typeof ResourceType.BatteryGauge,
		amount: number,
	) {
		const resource = this.resources.get(rscType);
		if (resource.availableAmount() + amount > resource.maxValue) {
			controller.reportWarning(
				rscType === ResourceType.HeatGauge
					? WarningType.HeatOvercap
					: WarningType.BatteryOvercap,
			);
		}
		this.resources.get(rscType).gain(amount);
	}

	handleQueenPunch = () => {
		if (!this.hasResourceAvailable(ResourceType.QueenPunches)) {
			this.handleQueenFinisher();
			return;
		}

		const punchNode = (this.resources.get(ResourceType.Queen) as DoTBuff).node;

		if (punchNode !== undefined) {
			this.resolveQueenPotency(punchNode);
		}

		this.resources.get(ResourceType.QueenPunches).consume(1);

		// schedule next punch
		if (this.hasResourceAvailable(ResourceType.QueenPunches)) {
			this.addEvent(new Event("queen punch", 1.56, () => this.handleQueenPunch()));
		} else {
			this.addEvent(new Event("queen finisher", 1.56, () => this.handleQueenFinisher()));
		}
	};

	resolveQueenPotency(node: ActionNode) {
		const queenActionsRemaining =
			this.resources.get(ResourceType.QueenPunches).availableAmount() +
			this.resources.get(ResourceType.QueenFinishers).availableAmount();
		const potencyIndex =
			this.resources.get(ResourceType.Queen).availableAmount() - queenActionsRemaining;

		if (potencyIndex < 0) {
			return;
		}

		const queenPotency = node.getDotPotencies(ResourceType.Queen)[potencyIndex];

		// Queen actions snapshot at execution time, not when the button was pressed, add Tincture modifier and note snapshot time for party buff handling
		if (this.hasResourceAvailable(ResourceType.Tincture)) {
			queenPotency.modifiers.push(Modifiers.Tincture);
		}
		queenPotency.snapshotTime = this.getDisplayTime();

		controller.resolvePotency(queenPotency);
	}

	calculateQueenPotency(minPotency: number, maxPotency: number) {
		const batteryBonus = this.resources.get(ResourceType.BatteryBonus).availableAmount();
		const bonusPotency = (maxPotency - minPotency) * (batteryBonus / 50.0);
		return Math.floor((minPotency + bonusPotency) * 0.89); // Pet potency is approximately 89% that of player potency
	}

	handleQueenFinisher = () => {
		if (!this.hasResourceAvailable(ResourceType.QueenFinishers)) {
			return;
		}

		const finisherNode = (this.resources.get(ResourceType.Queen) as DoTBuff).node;

		if (finisherNode !== undefined) {
			this.resolveQueenPotency(finisherNode);
		}

		this.resources.get(ResourceType.QueenFinishers).consume(1);

		if (this.hasResourceAvailable(ResourceType.QueenFinishers)) {
			this.addEvent(new Event("queen finisher", 2, () => this.handleQueenFinisher()));
		} else {
			this.tryConsumeResource(ResourceType.BatteryBonus, true);
			this.addEvent(
				new Event("expire queen", 5, () => {
					this.tryConsumeResource(ResourceType.Queen, true);
				}),
			);
		}
	};

	expireWildfire() {
		if (!this.hasResourceAvailable(ResourceType.WildfireHits)) {
			return;
		}
		this.tryConsumeResource(ResourceType.WildfireSelf);
		this.tryConsumeResource(ResourceType.Wildfire);

		// Potency stuff
		const potencyPerHit = this.hasTraitUnlocked("ENHANCED_WILD_FIRE") ? 240 : 100;
		const basePotency =
			Math.min(this.resources.get(ResourceType.WildfireHits).availableAmount(), 6) *
			potencyPerHit;
		const potencyNode = (this.resources.get(ResourceType.Wildfire) as DoTBuff).node;

		if (potencyNode === undefined) {
			return;
		}
		const wildFirePotency = potencyNode.getDotPotencies(ResourceType.Wildfire)[0];
		wildFirePotency.base = basePotency;
		controller.resolvePotency(wildFirePotency);

		this.tryConsumeResource(ResourceType.WildfireHits, true);
	}
}

const makeWeaponskill_MCH = (
	name: SkillName,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<MCHState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: ResourceType;
			resourceValue: number;
		};
		recastTime: number | ResourceCalculationFn<MCHState>;
		falloff?: number;
		applicationDelay?: number;
		validateAttempt?: StatePredicate<MCHState>;
		onConfirm?: EffectFn<MCHState>;
		highlightIf?: StatePredicate<MCHState>;
		onApplication?: EffectFn<MCHState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<MCHState> => {
	const onConfirm: EffectFn<MCHState> = combineEffects(
		params.onConfirm ?? NO_EFFECT,
		(state) => state.processComboStatus(name),
		(state) => {
			if (name !== SkillName.FullMetalField) {
				state.tryConsumeResource(ResourceType.Reassembled);
			}
		},
		(state) => {
			if (state.hasResourceAvailable(ResourceType.WildfireSelf)) {
				state.resources.get(ResourceType.WildfireHits).gain(1);
			}
		},
		// All single-target weaponskills executed during overheat will consume a stack
		(state) => {
			if (!WEAPONSKILLS_THAT_DONT_CONSUME_OVERHEAT.includes(name)) {
				state.tryConsumeResource(ResourceType.Overheated);
			}
		},
	);
	const onApplication: EffectFn<MCHState> = params.onApplication ?? NO_EFFECT;
	return makeWeaponskill("MCH", name, unlockLevel, {
		...params,
		onConfirm,
		onApplication,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
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
				state.hasResourceAvailable(ResourceType.Reassembled) ||
				name === SkillName.FullMetalField
			) {
				mods.push(Modifiers.AutoCDH);
			}
			return mods;
		},
	});
};

const makeAbility_MCH = (
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		autoUpgrade?: SkillAutoReplace;
		requiresCombat?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		replaceIf?: ConditionalSkillReplace<MCHState>[];
		highlightIf?: StatePredicate<MCHState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<MCHState>;
		onConfirm?: EffectFn<MCHState>;
		onApplication?: EffectFn<MCHState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<MCHState> => {
	const onConfirm: EffectFn<MCHState> = combineEffects(params.onConfirm ?? NO_EFFECT);
	return makeAbility("MCH", name, unlockLevel, cdName, {
		...params,
		onConfirm: onConfirm,
		jobPotencyModifiers: (state) => {
			const mods: PotencyModifier[] = [];
			return mods;
		},
	});
};

const makeResourceAbility_MCH = (
	name: SkillName,
	unlockLevel: number,
	cdName: ResourceType,
	params: {
		rscType: ResourceType;
		replaceIf?: ConditionalSkillReplace<MCHState>[];
		applicationDelay: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<MCHState>;
		onConfirm?: EffectFn<MCHState>;
		onApplication?: EffectFn<MCHState>;
		highlightIf?: StatePredicate<MCHState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<MCHState> => {
	const onConfirm: EffectFn<MCHState> = combineEffects(params.onConfirm ?? NO_EFFECT);
	return makeResourceAbility("MCH", name, unlockLevel, cdName, {
		...params,
		onConfirm,
	});
};

makeWeaponskill_MCH(SkillName.HeatedSplitShot, 54, {
	potency: [
		["NEVER", 180],
		["MARKSMANS_MASTERY", 200],
		["MARKSMANS_MASTERY_II", 220],
	],
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 5),
});

makeWeaponskill_MCH(SkillName.HeatedSlugShot, 60, {
	potency: [
		["NEVER", 100],
		["MARKSMANS_MASTERY", 120],
		["MARKSMANS_MASTERY_II", 140],
	],
	combo: {
		potency: [
			["NEVER", 280],
			["MARKSMANS_MASTERY", 300],
			["MARKSMANS_MASTERY_II", 320],
		],
		resource: ResourceType.HeatCombo,
		resourceValue: 1,
	},
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 5),
	highlightIf: (state) => state.resources.get(ResourceType.HeatCombo).availableAmount() === 1,
});

makeWeaponskill_MCH(SkillName.HeatedCleanShot, 64, {
	potency: [
		["NEVER", 100],
		["MARKSMANS_MASTERY", 120],
		["MARKSMANS_MASTERY_II", 160],
	],
	combo: {
		potency: [
			["NEVER", 360],
			["MARKSMANS_MASTERY", 380],
			["MARKSMANS_MASTERY_II", 420],
		],
		resource: ResourceType.HeatCombo,
		resourceValue: 2,
	},
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource(ResourceType.HeatGauge, 5);
		state.gainResource(ResourceType.BatteryGauge, 10);
	},
	highlightIf: (state) => state.resources.get(ResourceType.HeatCombo).availableAmount() === 2,
});

makeResourceAbility_MCH(SkillName.Reassemble, 10, ResourceType.cd_Reassemble, {
	rscType: ResourceType.Reassembled,
	applicationDelay: 0,
	cooldown: 55,
	maxCharges: 2, // charges reduced as needed in constructor by trait
});

makeWeaponskill_MCH(SkillName.Drill, 58, {
	potency: 600,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	secondaryCooldown: {
		cdName: ResourceType.cd_Drill,
		cooldown: 20,
		maxCharges: 2, // charges reduced as needed in constructor by trait
	},
});

makeWeaponskill_MCH(SkillName.HotShot, 4, {
	autoUpgrade: {
		trait: "HOT_SHOT_MASTERY",
		otherSkill: SkillName.AirAnchor,
	},
	potency: 240,
	applicationDelay: 1.15, // Assuming the same as Air Anchor since we don't have data for it in the spreadsheet
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.BatteryGauge, 20),
	secondaryCooldown: {
		cdName: ResourceType.cd_AirAnchor,
		cooldown: 40, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});
makeWeaponskill_MCH(SkillName.AirAnchor, 76, {
	startOnHotbar: false,
	potency: 600,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.BatteryGauge, 20),
	secondaryCooldown: {
		cdName: ResourceType.cd_AirAnchor,
		cooldown: 40, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});

makeWeaponskill_MCH(SkillName.Chainsaw, 90, {
	replaceIf: [
		{
			newSkill: SkillName.Excavator,
			condition: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady),
		},
	],
	potency: 600,
	falloff: 0.65,
	applicationDelay: 1.03,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource(ResourceType.BatteryGauge, 20);
		if (state.hasTraitUnlocked("ENHANCED_MULTI_WEAPON_II")) {
			state.gainStatus(ResourceType.ExcavatorReady);
		}
	},
	secondaryCooldown: {
		cdName: ResourceType.cd_Chainsaw,
		cooldown: 60, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});
makeWeaponskill_MCH(SkillName.Excavator, 90, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.65,
	applicationDelay: 1.07,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource(ResourceType.BatteryGauge, 20);
		state.tryConsumeResource(ResourceType.ExcavatorReady);
	},
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ExcavatorReady),
});

makeAbility_MCH(SkillName.BarrelStabilizer, 66, ResourceType.cd_BarrelStabilizer, {
	replaceIf: [
		{
			newSkill: SkillName.FullMetalField,
			condition: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist),
		},
	],
	applicationDelay: 0,
	cooldown: 120,
	maxCharges: 1,
	requiresCombat: true,
	onConfirm: (state) => {
		state.gainStatus(ResourceType.Hypercharged);
		if (state.hasTraitUnlocked("ENHANCED_BARREL_STABILIZER")) {
			state.gainStatus(ResourceType.FullMetalMachinist);
		}
	},
});
makeWeaponskill_MCH(SkillName.FullMetalField, 100, {
	startOnHotbar: false,
	potency: 900,
	falloff: 0.5,
	applicationDelay: 1.02,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.FullMetalMachinist),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.FullMetalMachinist),
});

makeResourceAbility_MCH(SkillName.Hypercharge, 30, ResourceType.cd_Hypercharge, {
	rscType: ResourceType.Overheated,
	applicationDelay: 0,
	cooldown: 10,
	maxCharges: 1,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.Hypercharged)) {
			state.tryConsumeResource(ResourceType.Hypercharged);
		} else {
			state.resources.get(ResourceType.HeatGauge).consume(50);
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.HeatGauge, 50) ||
		state.hasResourceAvailable(ResourceType.Hypercharged),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.HeatGauge, 50) ||
		state.hasResourceAvailable(ResourceType.Hypercharged),
});

makeAbility_MCH(SkillName.Wildfire, 45, ResourceType.cd_Wildfire, {
	replaceIf: [
		{
			newSkill: SkillName.Detonator,
			condition: (state) => state.hasResourceAvailable(ResourceType.WildfireSelf),
		},
	],
	applicationDelay: 0.67,
	cooldown: 120,
	maxCharges: 1,
	onConfirm: (state, node) => {
		state.gainStatus(ResourceType.WildfireSelf);
		const wildFire = state.resources.get(ResourceType.Wildfire) as DoTBuff;

		const wildFirePotency = new Potency({
			config: state.config,
			sourceTime: state.getDisplayTime(),
			sourceSkill: SkillName.Wildfire,
			aspect: Aspect.Physical,
			basePotency: 0, // We'll determine how much potency this deals when it expires
			snapshotTime: state.getDisplayTime(),
			description: "wildfire",
			targetCount: 1,
		});
		wildFirePotency.modifiers = [Modifiers.NoCDH]; // Wildfire can neither crit nor direct hit
		if (state.hasResourceAvailable(ResourceType.Tincture)) {
			wildFirePotency.modifiers.push(Modifiers.Tincture);
		}

		node.addDoTPotency(wildFirePotency, ResourceType.Wildfire);

		wildFire.gain(1);
		wildFire.node = node;

		state.resources.addResourceEvent({
			rscType: ResourceType.Wildfire,
			name: "wildfire expiration",
			delay: (getResourceInfo("MCH", ResourceType.Wildfire) as ResourceInfo).maxTimeout,
			fnOnRsc: (_rsc) => state.expireWildfire(),
		});
	},
});
makeAbility_MCH(SkillName.Detonator, 45, ResourceType.cd_Detonator, {
	startOnHotbar: false,
	applicationDelay: 0.62,
	cooldown: 1,
	maxCharges: 1,
	onConfirm: (state) => state.expireWildfire(),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.WildfireSelf),
});

makeWeaponskill_MCH(SkillName.BlazingShot, 68, {
	potency: [
		["NEVER", 220],
		["MARKSMANS_MASTERY_II", 240],
	],
	applicationDelay: 0.85,
	recastTime: 1.5,
	onConfirm: (state) => {
		(state.cooldowns.get(ResourceType.cd_DoubleCheck) as CoolDown).restore(state, 15);
		(state.cooldowns.get(ResourceType.cd_Checkmate) as CoolDown).restore(state, 15);
	},
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Overheated),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Overheated),
});

makeAbility_MCH(SkillName.GaussRound, 15, ResourceType.cd_DoubleCheck, {
	autoUpgrade: {
		trait: "DOUBLE_BARREL_MASTERY",
		otherSkill: SkillName.DoubleCheck,
	},
	potency: 130,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3, // TODO
});
makeAbility_MCH(SkillName.DoubleCheck, 92, ResourceType.cd_DoubleCheck, {
	startOnHotbar: false,
	potency: 170,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});

makeAbility_MCH(SkillName.Ricochet, 50, ResourceType.cd_Checkmate, {
	autoUpgrade: {
		trait: "DOUBLE_BARREL_MASTERY",
		otherSkill: SkillName.Checkmate,
	},
	potency: 130,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});
makeAbility_MCH(SkillName.Checkmate, 92, ResourceType.cd_Checkmate, {
	startOnHotbar: false,
	potency: 170,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});

const robotSummons: Array<{
	skillName: SkillName;
	skillLevel: number;
	startOnHotbar?: boolean;
	autoUpgrade?: SkillAutoReplace;
}> = [
	{
		skillName: SkillName.RookAutoturret,
		skillLevel: 40,
		autoUpgrade: {
			otherSkill: SkillName.AutomatonQueen,
			trait: "PROMOTION",
		},
	},
	{
		skillName: SkillName.AutomatonQueen,
		skillLevel: 80,
		startOnHotbar: false,
	},
];
robotSummons.forEach((params) => {
	makeAbility_MCH(params.skillName, params.skillLevel, ResourceType.cd_Queen, {
		startOnHotbar: params.startOnHotbar,
		autoUpgrade: params.autoUpgrade,
		applicationDelay: 0,
		cooldown: 6,
		maxCharges: 1,
		validateAttempt: (state) => {
			return (
				state.hasResourceAvailable(ResourceType.BatteryGauge, 50) &&
				!state.hasResourceAvailable(ResourceType.Queen)
			);
		},
		onConfirm: (state, node) => {
			// Cache the battery bonus scalar based on the amount of battery gauge available
			const battery = state.resources.get(ResourceType.BatteryGauge).availableAmount();
			state.resources.get(ResourceType.BatteryBonus).gain(battery - 50);

			// Consume the gauge
			state.tryConsumeResource(ResourceType.BatteryGauge, true);

			// note that queen is summoned, and grant the requisite number of punches and finishers
			const punchResource = state.resources.get(ResourceType.QueenPunches);
			punchResource.gain(5);
			const finishers = state.hasTraitUnlocked("QUEENS_GAMBIT") ? 2 : 1;
			state.resources.get(ResourceType.QueenFinishers).gain(finishers);
			state.resources
				.get(ResourceType.Queen)
				.gain(punchResource.availableAmount() + finishers);

			let sourceSkill = SkillName.VolleyFire;
			let basePotency = 0;
			if (state.hasTraitUnlocked("PROMOTION")) {
				sourceSkill = SkillName.ArmPunch;
				basePotency = state.calculateQueenPotency(120, 240);
			} else {
				basePotency = state.calculateQueenPotency(35, 75);
			}

			for (let i = 0; i < punchResource.availableAmount(); i++) {
				node.addDoTPotency(
					new Potency({
						config: state.config,
						sourceTime: state.getDisplayTime(),
						sourceSkill,
						aspect: Aspect.Physical,
						description: "",
						basePotency,
						snapshotTime: undefined,
						targetCount: node.targetCount,
					}),
					ResourceType.Queen,
				);
			}

			sourceSkill = state.hasTraitUnlocked("PROMOTION")
				? SkillName.PileBunker
				: SkillName.RookOverload;
			if (sourceSkill === SkillName.PileBunker) {
				basePotency = state.calculateQueenPotency(340, 680);
			} else {
				basePotency = state.calculateQueenPotency(160, 320);
			}

			node.addDoTPotency(
				new Potency({
					config: state.config,
					sourceTime: state.getDisplayTime(),
					sourceSkill,
					aspect: Aspect.Physical,
					description: "",
					basePotency,
					snapshotTime: undefined,
					targetCount: node.targetCount,
				}),
				ResourceType.Queen,
			);

			if (state.hasTraitUnlocked("QUEENS_GAMBIT")) {
				node.addDoTPotency(
					new Potency({
						config: state.config,
						sourceTime: state.getDisplayTime(),
						sourceSkill: SkillName.CrownedCollider,
						aspect: Aspect.Physical,
						description: "",
						basePotency: state.calculateQueenPotency(390, 780),
						snapshotTime: undefined,
						targetCount: node.targetCount,
					}),
					ResourceType.Queen,
				);
			}

			(state.resources.get(ResourceType.Queen) as DoTBuff).node = node;

			// Schedule the initial punch
			state.addEvent(new Event("initial queen punch", 5.5, () => state.handleQueenPunch()));
		},
	});
});

const overdriveSkills: Array<{
	skillName: SkillName;
	skillLevel: number;
	startOnHotbar?: boolean;
	autoUpgrade?: SkillAutoReplace;
}> = [
	{
		skillName: SkillName.RookOverdrive,
		skillLevel: 40,
		autoUpgrade: {
			otherSkill: SkillName.QueenOverdrive,
			trait: "PROMOTION",
		},
	},
	{
		skillName: SkillName.QueenOverdrive,
		skillLevel: 80,
		startOnHotbar: false,
	},
];
overdriveSkills.forEach((params) => {
	makeAbility_MCH(params.skillName, params.skillLevel, ResourceType.cd_Overdrive, {
		startOnHotbar: params.startOnHotbar,
		autoUpgrade: params.autoUpgrade,
		applicationDelay: 0,
		cooldown: 15,
		maxCharges: 1,
		validateAttempt: (state) => state.hasResourceAvailable(ResourceType.QueenPunches),
		onConfirm: (state) => {
			state.tryConsumeResource(ResourceType.QueenPunches, true);
		},
	});
});

makeWeaponskill_MCH(SkillName.SpreadShot, 18, {
	autoUpgrade: {
		trait: "SPREAD_SHOT_MASTERY",
		otherSkill: SkillName.Scattergun,
	},
	potency: 140,
	falloff: 0,
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 5),
});
makeWeaponskill_MCH(SkillName.Scattergun, 82, {
	startOnHotbar: false,
	potency: [
		["NEVER", 140],
		["MARKSMANS_MASTERY_II", 160],
	],
	falloff: 0,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource(ResourceType.HeatGauge, 10),
});

makeWeaponskill_MCH(SkillName.Bioblaster, 58, {
	potency: 50,
	falloff: 0,
	applicationDelay: 0.97,
	recastTime: (state) => state.config.adjustedSksGCD(),
	secondaryCooldown: {
		cdName: ResourceType.cd_Drill,
		cooldown: 20,
		maxCharges: 2, // charges reduced as needed in constructer by trait
	},
	onConfirm: (state, node) =>
		state.addDoTPotencies({
			node,
			dotName: ResourceType.Bioblaster,
			skillName: SkillName.Bioblaster,
			tickPotency: 50,
			speedStat: "sks",
		}),
	onApplication: (state, node) => state.applyDoT(ResourceType.Bioblaster, node),
});

makeWeaponskill_MCH(SkillName.AutoCrossbow, 52, {
	potency: [
		["NEVER", 140],
		["MARKSMANS_MASTERY_II", 160],
	],
	falloff: 0,
	applicationDelay: 0.89,
	recastTime: 1.5,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Overheated),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.Overheated),
});

makeWeaponskill_MCH(SkillName.Flamethrower, 70, {
	applicationDelay: 0.89,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			dotName: ResourceType.Flamethrower,
			skillName: SkillName.Flamethrower,
			tickPotency: 100,
			tickFrequency: 1,
			speedStat: "sks",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT(ResourceType.Flamethrower, node);
	},
	secondaryCooldown: {
		cdName: ResourceType.cd_Flamethrower,
		cooldown: 60,
		maxCharges: 1,
	},
});

makeResourceAbility_MCH(SkillName.Tactician, 56, ResourceType.cd_Tactician, {
	rscType: ResourceType.Tactician,
	maxCharges: 1,
	cooldown: 90,
	applicationDelay: 0.62,
});

makeAbility_MCH(SkillName.Dismantle, 62, ResourceType.cd_Dismantle, {
	maxCharges: 1,
	cooldown: 120,
	applicationDelay: 0.62,
});
