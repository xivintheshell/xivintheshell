import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { Aspect, WarningType } from "../Common";
import { ActionKey } from "../Data/Actions";
import { MCHActionKey } from "../Data/Actions/Jobs/MCH";
import { MCHCooldownKey } from "../Data/Cooldowns/Jobs/MCH";
import { MCHResourceKey } from "../Data/Resources/Jobs/MCH";
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
	rsc: MCHResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("MCH", rsc, maxValue, params ?? {});
};

// Gauge resources
makeMCHResource("HEAT_GAUGE", 100);
makeMCHResource("BATTERY_GAUGE", 100);

// Status Effects
makeMCHResource("REASSEMBLED", 1, { timeout: 5 });
makeMCHResource("OVERHEATED", 5, { timeout: 10 });
makeMCHResource("WILDFIRE", 1, { timeout: 10 });
makeMCHResource("WILDFIRE_SELF", 1, { timeout: 10 });
makeMCHResource("FLAMETHROWER", 1, { timeout: 10 });
makeMCHResource("BIOBLASTER", 1, { timeout: 15 });
makeMCHResource("TACTICIAN", 1, { timeout: 15 });
makeMCHResource("HYPERCHARGED", 1, { timeout: 30 });
makeMCHResource("EXCAVATOR_READY", 1, { timeout: 30 });
makeMCHResource("FULL_METAL_MACHINIST", 1, { timeout: 30 });

// Combos & other tracking
makeMCHResource("HEAT_COMBO", 2, { timeout: 30 });
makeMCHResource("QUEEN", 7);
makeMCHResource("QUEEN_PUNCHES", 5);
makeMCHResource("QUEEN_FINISHERS", 2);
makeMCHResource("WILDFIRE_HITS", 6);
makeMCHResource("BATTERY_BONUS", 50);

const COMBO_GCDS: MCHActionKey[] = [
	"HEATED_CLEAN_SHOT",
	"HEATED_SLUG_SHOT",
	"HEATED_SPLIT_SHOT",
	"SPREAD_SHOT",
	"SCATTERGUN", // Including AoE GCDs that break the combo, even though they don't combo themselves
];

// Skills that don't consume overheat - these are all AoE skills
// The only AoE skill that consumes overheat is Auto Crossbow
const WEAPONSKILLS_THAT_DONT_CONSUME_OVERHEAT: MCHActionKey[] = [
	"CHAIN_SAW",
	"EXCAVATOR",
	"FULL_METAL_FIELD",
	"SCATTERGUN",
	"BIOBLASTER",
	"SPREAD_SHOT",
];

export class MCHState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		// Unlike standard and technical, Air Anchor and Chain Saw's cooldowns are affected by skill speed
		this.cooldowns.set(new CoolDown("cd_AIR_ANCHOR", this.config.adjustedSksGCD(40), 1, 1));
		this.cooldowns.set(new CoolDown("cd_CHAINSAW", this.config.adjustedSksGCD(60), 1, 1));

		if (!this.hasTraitUnlocked("QUEENS_GAMBIT")) {
			this.resources.set(new Resource("QUEEN_FINISHERS", 1, 0));
			this.resources.set(new Resource("QUEEN", 6, 0));
		}

		if (!this.hasTraitUnlocked("ENHANCED_REASSEMBLE")) {
			this.cooldowns.set(new CoolDown("cd_REASSEMBLE", 55, 1, 1));
		}
		if (!this.hasTraitUnlocked("ENHANCED_MULTI_WEAPON")) {
			this.cooldowns.set(new CoolDown("cd_DRILL", this.config.adjustedSksGCD(20), 1, 1));
		}

		if (!this.hasTraitUnlocked("CHARGED_ACTION_MASTERY")) {
			this.cooldowns.set(new CoolDown("cd_DOUBLE_CHECK", 30, 2, 2));
			this.cooldowns.set(new CoolDown("cd_CHECKMATE", 30, 2, 2));
		}

		if (!this.hasTraitUnlocked("ENHANCED_TACTICIAN")) {
			this.cooldowns.set(new CoolDown("cd_TACTICIAN", 120, 1, 1));
		}

		this.registerRecurringEvents([
			{
				groupedDots: [
					{
						dotName: "BIOBLASTER",
						appliedBy: ["BIOBLASTER"],
					},
				],
			},
			{
				groupedDots: [
					{
						dotName: "FLAMETHROWER",
						appliedBy: ["FLAMETHROWER"],
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
			this.handleDoTTick("FLAMETHROWER");

			// increment count
			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time, "FLAMETHROWER");
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
		this.tryConsumeResource("FLAMETHROWER");
	}

	processComboStatus(skill: MCHActionKey) {
		if (!COMBO_GCDS.includes(skill)) {
			return;
		} // MCH's non-combo GCDs don't break an ongoing combo

		const comboState = this.resources.get("HEAT_COMBO").availableAmount();

		// Defaulting to nextState 0 allows the AoE fillers to break the combo
		let nextState = 0;
		if (comboState === 0 && skill === "HEATED_SPLIT_SHOT") {
			nextState = 1;
		} else if (comboState === 1 && skill === "HEATED_SLUG_SHOT") {
			nextState = 2;
		}

		this.setComboState("HEAT_COMBO", nextState);
	}

	gainResource(rscType: "HEAT_GAUGE" | "BATTERY_GAUGE", amount: number) {
		const resource = this.resources.get(rscType);
		if (resource.availableAmount() + amount > resource.maxValue) {
			controller.reportWarning(
				rscType === "HEAT_GAUGE" ? WarningType.HeatOvercap : WarningType.BatteryOvercap,
			);
		}
		this.resources.get(rscType).gain(amount);
	}

	handleQueenPunch = () => {
		if (!this.hasResourceAvailable("QUEEN_PUNCHES")) {
			this.handleQueenFinisher();
			return;
		}

		const punchNode = (this.resources.get("QUEEN") as DoTBuff).node;

		if (punchNode !== undefined) {
			this.resolveQueenPotency(punchNode);
		}

		this.resources.get("QUEEN_PUNCHES").consume(1);

		// schedule next punch
		if (this.hasResourceAvailable("QUEEN_PUNCHES")) {
			this.addEvent(new Event("queen punch", 1.56, () => this.handleQueenPunch()));
		} else {
			this.addEvent(new Event("queen finisher", 1.56, () => this.handleQueenFinisher()));
		}
	};

	resolveQueenPotency(node: ActionNode) {
		const queenActionsRemaining =
			this.resources.get("QUEEN_PUNCHES").availableAmount() +
			this.resources.get("QUEEN_FINISHERS").availableAmount();
		const potencyIndex = this.resources.get("QUEEN").availableAmount() - queenActionsRemaining;

		if (potencyIndex < 0) {
			return;
		}

		const queenPotency = node.getDotPotencies("QUEEN")[potencyIndex];

		// Queen actions snapshot at execution time, not when the button was pressed, add Tincture modifier and note snapshot time for party buff handling
		if (this.hasResourceAvailable("TINCTURE")) {
			queenPotency.modifiers.push(Modifiers.Tincture);
		}
		queenPotency.snapshotTime = this.getDisplayTime();

		controller.resolvePotency(queenPotency);
	}

	calculateQueenPotency(minPotency: number, maxPotency: number) {
		const batteryBonus = this.resources.get("BATTERY_BONUS").availableAmount();
		const bonusPotency = (maxPotency - minPotency) * (batteryBonus / 50.0);
		return Math.floor((minPotency + bonusPotency) * 0.89); // Pet potency is approximately 89% that of player potency
	}

	handleQueenFinisher = () => {
		if (!this.hasResourceAvailable("QUEEN_FINISHERS")) {
			return;
		}

		const finisherNode = (this.resources.get("QUEEN") as DoTBuff).node;

		if (finisherNode !== undefined) {
			this.resolveQueenPotency(finisherNode);
		}

		this.resources.get("QUEEN_FINISHERS").consume(1);

		if (this.hasResourceAvailable("QUEEN_FINISHERS")) {
			this.addEvent(new Event("queen finisher", 2, () => this.handleQueenFinisher()));
		} else {
			this.tryConsumeResource("BATTERY_BONUS", true);
			this.addEvent(
				new Event("expire queen", 5, () => {
					this.tryConsumeResource("QUEEN", true);
				}),
			);
		}
	};

	expireWildfire() {
		if (!this.hasResourceAvailable("WILDFIRE_HITS")) {
			return;
		}
		this.tryConsumeResource("WILDFIRE_SELF");
		this.tryConsumeResource("WILDFIRE");

		// Potency stuff
		const potencyPerHit = this.hasTraitUnlocked("ENHANCED_WILD_FIRE") ? 240 : 100;
		const basePotency =
			Math.min(this.resources.get("WILDFIRE_HITS").availableAmount(), 6) * potencyPerHit;
		const potencyNode = (this.resources.get("WILDFIRE") as DoTBuff).node;

		if (potencyNode === undefined) {
			return;
		}
		const wildFirePotency = potencyNode.getDotPotencies("WILDFIRE")[0];
		wildFirePotency.base = basePotency;
		controller.resolvePotency(wildFirePotency);

		this.tryConsumeResource("WILDFIRE_HITS", true);
	}
}

const makeWeaponskill_MCH = (
	name: MCHActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		assetPath?: string;
		replaceIf?: ConditionalSkillReplace<MCHState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]>;
		combo?: {
			potency: number | Array<[TraitKey, number]>;
			resource: MCHResourceKey;
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
			if (name !== "FULL_METAL_FIELD") {
				state.tryConsumeResource("REASSEMBLED");
			}
		},
		(state) => {
			if (state.hasResourceAvailable("WILDFIRE_SELF")) {
				state.resources.get("WILDFIRE_HITS").gain(1);
			}
		},
		// All single-target weaponskills executed during overheat will consume a stack
		(state) => {
			if (!WEAPONSKILLS_THAT_DONT_CONSUME_OVERHEAT.includes(name)) {
				state.tryConsumeResource("OVERHEATED");
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
			if (state.hasResourceAvailable("REASSEMBLED") || name === "FULL_METAL_FIELD") {
				mods.push(Modifiers.AutoCDH);
			}
			if (
				state.hasResourceAvailable(ResourceType.Overheated) &&
				!WEAPONSKILLS_THAT_DONT_CONSUME_OVERHEAT.includes(name)
			) {
				mods.push(Modifiers.Overheated);
			}
			return mods;
		},
	});
};

const makeAbility_MCH = (
	name: MCHActionKey,
	unlockLevel: number,
	cdName: MCHCooldownKey,
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
	name: MCHActionKey,
	unlockLevel: number,
	cdName: MCHCooldownKey,
	params: {
		rscType: MCHResourceKey;
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

makeWeaponskill_MCH("HEATED_SPLIT_SHOT", 54, {
	potency: [
		["NEVER", 180],
		["MARKSMANS_MASTERY", 200],
		["MARKSMANS_MASTERY_II", 220],
	],
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("HEAT_GAUGE", 5),
});

makeWeaponskill_MCH("HEATED_SLUG_SHOT", 60, {
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
		resource: "HEAT_COMBO",
		resourceValue: 1,
	},
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("HEAT_GAUGE", 5),
	highlightIf: (state) => state.resources.get("HEAT_COMBO").availableAmount() === 1,
});

makeWeaponskill_MCH("HEATED_CLEAN_SHOT", 64, {
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
		resource: "HEAT_COMBO",
		resourceValue: 2,
	},
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource("HEAT_GAUGE", 5);
		state.gainResource("BATTERY_GAUGE", 10);
	},
	highlightIf: (state) => state.resources.get("HEAT_COMBO").availableAmount() === 2,
});

makeResourceAbility_MCH("REASSEMBLE", 10, "cd_REASSEMBLE", {
	rscType: "REASSEMBLED",
	applicationDelay: 0,
	cooldown: 55,
	maxCharges: 2, // charges reduced as needed in constructor by trait
});

makeWeaponskill_MCH("DRILL", 58, {
	potency: 600,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	secondaryCooldown: {
		cdName: "cd_DRILL",
		cooldown: 20,
		maxCharges: 2, // charges reduced as needed in constructor by trait
	},
});

makeWeaponskill_MCH("HOT_SHOT", 4, {
	autoUpgrade: {
		trait: "HOT_SHOT_MASTERY",
		otherSkill: "AIR_ANCHOR",
	},
	potency: 240,
	applicationDelay: 1.15, // Assuming the same as Air Anchor since we don't have data for it in the spreadsheet
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("BATTERY_GAUGE", 20),
	secondaryCooldown: {
		cdName: "cd_AIR_ANCHOR",
		cooldown: 40, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});
makeWeaponskill_MCH("AIR_ANCHOR", 76, {
	startOnHotbar: false,
	potency: 600,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("BATTERY_GAUGE", 20),
	secondaryCooldown: {
		cdName: "cd_AIR_ANCHOR",
		cooldown: 40, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});

makeWeaponskill_MCH("CHAIN_SAW", 90, {
	replaceIf: [
		{
			newSkill: "EXCAVATOR",
			condition: (state) => state.hasResourceAvailable("EXCAVATOR_READY"),
		},
	],
	potency: 600,
	falloff: 0.65,
	applicationDelay: 1.03,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource("BATTERY_GAUGE", 20);
		if (state.hasTraitUnlocked("ENHANCED_MULTI_WEAPON_II")) {
			state.gainStatus("EXCAVATOR_READY");
		}
	},
	secondaryCooldown: {
		cdName: "cd_CHAINSAW",
		cooldown: 60, // cooldown edited in constructor to be affected by skill speed
		maxCharges: 1,
	},
});
makeWeaponskill_MCH("EXCAVATOR", 90, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.65,
	applicationDelay: 1.07,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => {
		state.gainResource("BATTERY_GAUGE", 20);
		state.tryConsumeResource("EXCAVATOR_READY");
	},
	validateAttempt: (state) => state.hasResourceAvailable("EXCAVATOR_READY"),
	highlightIf: (state) => state.hasResourceAvailable("EXCAVATOR_READY"),
});

makeAbility_MCH("BARREL_STABILIZER", 66, "cd_BARREL_STABILIZER", {
	replaceIf: [
		{
			newSkill: "FULL_METAL_FIELD",
			condition: (state) => state.hasResourceAvailable("FULL_METAL_MACHINIST"),
		},
	],
	applicationDelay: 0,
	cooldown: 120,
	maxCharges: 1,
	requiresCombat: true,
	onConfirm: (state) => {
		state.gainStatus("HYPERCHARGED");
		if (state.hasTraitUnlocked("ENHANCED_BARREL_STABILIZER")) {
			state.gainStatus("FULL_METAL_MACHINIST");
		}
	},
});
makeWeaponskill_MCH("FULL_METAL_FIELD", 100, {
	startOnHotbar: false,
	potency: 900,
	falloff: 0.5,
	applicationDelay: 1.02,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.tryConsumeResource("FULL_METAL_MACHINIST"),
	validateAttempt: (state) => state.hasResourceAvailable("FULL_METAL_MACHINIST"),
	highlightIf: (state) => state.hasResourceAvailable("FULL_METAL_MACHINIST"),
});

makeResourceAbility_MCH("HYPERCHARGE", 30, "cd_HYPERCHARGE", {
	rscType: "OVERHEATED",
	applicationDelay: 0,
	cooldown: 10,
	maxCharges: 1,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("HYPERCHARGED")) {
			state.tryConsumeResource("HYPERCHARGED");
		} else {
			state.resources.get("HEAT_GAUGE").consume(50);
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("HEAT_GAUGE", 50) || state.hasResourceAvailable("HYPERCHARGED"),
	highlightIf: (state) =>
		state.hasResourceAvailable("HEAT_GAUGE", 50) || state.hasResourceAvailable("HYPERCHARGED"),
});

makeAbility_MCH("WILDFIRE", 45, "cd_WILDFIRE", {
	replaceIf: [
		{
			newSkill: "DETONATOR",
			condition: (state) => state.hasResourceAvailable("WILDFIRE_SELF"),
		},
	],
	applicationDelay: 0.67,
	cooldown: 120,
	maxCharges: 1,
	onConfirm: (state, node) => {
		state.gainStatus("WILDFIRE_SELF");
		const wildFire = state.resources.get("WILDFIRE") as DoTBuff;

		const wildFirePotency = new Potency({
			config: state.config,
			sourceTime: state.getDisplayTime(),
			sourceSkill: "WILDFIRE",
			aspect: Aspect.Physical,
			basePotency: 0, // We'll determine how much potency this deals when it expires
			snapshotTime: state.getDisplayTime(),
			description: "wildfire",
			targetCount: 1,
		});
		wildFirePotency.modifiers = [Modifiers.NoCDH]; // Wildfire can neither crit nor direct hit
		if (state.hasResourceAvailable("TINCTURE")) {
			wildFirePotency.modifiers.push(Modifiers.Tincture);
		}

		node.addDoTPotency(wildFirePotency, "WILDFIRE");

		wildFire.gain(1);
		wildFire.node = node;

		state.resources.addResourceEvent({
			rscType: "WILDFIRE",
			name: "wildfire expiration",
			delay: (getResourceInfo("MCH", "WILDFIRE") as ResourceInfo).maxTimeout,
			fnOnRsc: (_rsc) => state.expireWildfire(),
		});
	},
});
makeAbility_MCH("DETONATOR", 45, "cd_DETONATOR", {
	startOnHotbar: false,
	applicationDelay: 0.62,
	cooldown: 1,
	maxCharges: 1,
	onConfirm: (state) => state.expireWildfire(),
	validateAttempt: (state) => state.hasResourceAvailable("WILDFIRE_SELF"),
});

makeWeaponskill_MCH("BLAZING_SHOT", 68, {
	potency: [
		["NEVER", 220],
		["MARKSMANS_MASTERY_II", 240],
	],
	applicationDelay: 0.85,
	recastTime: 1.5,
	onConfirm: (state) => {
		(state.cooldowns.get("cd_DOUBLE_CHECK") as CoolDown).restore(state, 15);
		(state.cooldowns.get("cd_CHECKMATE") as CoolDown).restore(state, 15);
	},
	validateAttempt: (state) => state.hasResourceAvailable("OVERHEATED"),
	highlightIf: (state) => state.hasResourceAvailable("OVERHEATED"),
});

makeAbility_MCH("GAUSS_ROUND", 15, "cd_DOUBLE_CHECK", {
	autoUpgrade: {
		trait: "DOUBLE_BARREL_MASTERY",
		otherSkill: "DOUBLE_CHECK",
	},
	potency: 130,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3, // TODO
});
makeAbility_MCH("DOUBLE_CHECK", 92, "cd_DOUBLE_CHECK", {
	startOnHotbar: false,
	potency: 170,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});

makeAbility_MCH("RICOCHET", 50, "cd_CHECKMATE", {
	autoUpgrade: {
		trait: "DOUBLE_BARREL_MASTERY",
		otherSkill: "CHECKMATE",
	},
	potency: 130,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});
makeAbility_MCH("CHECKMATE", 92, "cd_CHECKMATE", {
	startOnHotbar: false,
	potency: 170,
	falloff: 0.5,
	applicationDelay: 0.71,
	cooldown: 30,
	maxCharges: 3,
});

const robotSummons: Array<{
	skillName: MCHActionKey;
	skillLevel: number;
	startOnHotbar?: boolean;
	autoUpgrade?: SkillAutoReplace;
}> = [
	{
		skillName: "ROOK_AUTOTURRET",
		skillLevel: 40,
		autoUpgrade: {
			otherSkill: "AUTOMATON_QUEEN",
			trait: "PROMOTION",
		},
	},
	{
		skillName: "AUTOMATON_QUEEN",
		skillLevel: 80,
		startOnHotbar: false,
	},
];
robotSummons.forEach((params) => {
	makeAbility_MCH(params.skillName, params.skillLevel, "cd_QUEEN", {
		startOnHotbar: params.startOnHotbar,
		autoUpgrade: params.autoUpgrade,
		applicationDelay: 0,
		cooldown: 6,
		maxCharges: 1,
		validateAttempt: (state) => {
			return (
				state.hasResourceAvailable("BATTERY_GAUGE", 50) &&
				!state.hasResourceAvailable("QUEEN")
			);
		},
		onConfirm: (state, node) => {
			// Cache the battery bonus scalar based on the amount of battery gauge available
			const battery = state.resources.get("BATTERY_GAUGE").availableAmount();
			state.resources.get("BATTERY_BONUS").gain(battery - 50);

			// Consume the gauge
			state.tryConsumeResource("BATTERY_GAUGE", true);

			// note that queen is summoned, and grant the requisite number of punches and finishers
			const punchResource = state.resources.get("QUEEN_PUNCHES");
			punchResource.gain(5);
			const finishers = state.hasTraitUnlocked("QUEENS_GAMBIT") ? 2 : 1;
			state.resources.get("QUEEN_FINISHERS").gain(finishers);
			state.resources.get("QUEEN").gain(punchResource.availableAmount() + finishers);

			let sourceSkill = "VOLLEY_FIRE";
			let basePotency = 0;
			if (state.hasTraitUnlocked("PROMOTION")) {
				sourceSkill = "ARM_PUNCH";
				basePotency = state.calculateQueenPotency(120, 240);
			} else {
				basePotency = state.calculateQueenPotency(35, 75);
			}

			for (let i = 0; i < punchResource.availableAmount(); i++) {
				node.addDoTPotency(
					new Potency({
						config: state.config,
						sourceTime: state.getDisplayTime(),
						sourceSkill: sourceSkill as ActionKey,
						aspect: Aspect.Physical,
						description: "",
						basePotency,
						snapshotTime: undefined,
						targetCount: node.targetCount,
					}),
					"QUEEN",
				);
			}

			sourceSkill = state.hasTraitUnlocked("PROMOTION") ? "PILE_BUNKER" : "ROOK_OVERLOAD";
			if (sourceSkill === "PILE_BUNKER") {
				basePotency = state.calculateQueenPotency(340, 680);
			} else {
				basePotency = state.calculateQueenPotency(160, 320);
			}

			node.addDoTPotency(
				new Potency({
					config: state.config,
					sourceTime: state.getDisplayTime(),
					sourceSkill: sourceSkill as ActionKey,
					aspect: Aspect.Physical,
					description: "",
					basePotency,
					snapshotTime: undefined,
					targetCount: node.targetCount,
				}),
				"QUEEN",
			);

			if (state.hasTraitUnlocked("QUEENS_GAMBIT")) {
				node.addDoTPotency(
					new Potency({
						config: state.config,
						sourceTime: state.getDisplayTime(),
						sourceSkill: "CROWNED_COLLIDER",
						aspect: Aspect.Physical,
						description: "",
						basePotency: state.calculateQueenPotency(390, 780),
						snapshotTime: undefined,
						targetCount: node.targetCount,
					}),
					"QUEEN",
				);
			}

			(state.resources.get("QUEEN") as DoTBuff).node = node;

			// Schedule the initial punch
			state.addEvent(new Event("initial queen punch", 5.5, () => state.handleQueenPunch()));
		},
	});
});

const overdriveSkills: Array<{
	skillName: MCHActionKey;
	skillLevel: number;
	startOnHotbar?: boolean;
	autoUpgrade?: SkillAutoReplace;
}> = [
	{
		skillName: "ROOK_OVERDRIVE",
		skillLevel: 40,
		autoUpgrade: {
			otherSkill: "QUEEN_OVERDRIVE",
			trait: "PROMOTION",
		},
	},
	{
		skillName: "QUEEN_OVERDRIVE",
		skillLevel: 80,
		startOnHotbar: false,
	},
];
overdriveSkills.forEach((params) => {
	makeAbility_MCH(params.skillName, params.skillLevel, "cd_OVERDRIVE", {
		startOnHotbar: params.startOnHotbar,
		autoUpgrade: params.autoUpgrade,
		applicationDelay: 0,
		cooldown: 15,
		maxCharges: 1,
		validateAttempt: (state) => state.hasResourceAvailable("QUEEN_PUNCHES"),
		onConfirm: (state) => {
			state.tryConsumeResource("QUEEN_PUNCHES", true);
		},
	});
});

makeWeaponskill_MCH("SPREAD_SHOT", 18, {
	autoUpgrade: {
		trait: "SPREAD_SHOT_MASTERY",
		otherSkill: "SCATTERGUN",
	},
	potency: 140,
	falloff: 0,
	applicationDelay: 0.8,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("HEAT_GAUGE", 5),
});
makeWeaponskill_MCH("SCATTERGUN", 82, {
	startOnHotbar: false,
	potency: [
		["NEVER", 140],
		["MARKSMANS_MASTERY_II", 160],
	],
	falloff: 0,
	applicationDelay: 1.15,
	recastTime: (state) => state.config.adjustedSksGCD(),
	onConfirm: (state) => state.gainResource("HEAT_GAUGE", 10),
});

makeWeaponskill_MCH("BIOBLASTER", 58, {
	potency: 50,
	falloff: 0,
	applicationDelay: 0.97,
	recastTime: (state) => state.config.adjustedSksGCD(),
	secondaryCooldown: {
		cdName: "cd_DRILL",
		cooldown: 20,
		maxCharges: 2, // charges reduced as needed in constructer by trait
	},
	onConfirm: (state, node) =>
		state.addDoTPotencies({
			node,
			dotName: "BIOBLASTER",
			skillName: "BIOBLASTER",
			tickPotency: 50,
			speedStat: "sks",
		}),
	onApplication: (state, node) => state.applyDoT("BIOBLASTER", node),
});

makeWeaponskill_MCH("AUTO_CROSSBOW", 52, {
	potency: [
		["NEVER", 140],
		["MARKSMANS_MASTERY_II", 160],
	],
	falloff: 0,
	applicationDelay: 0.89,
	recastTime: 1.5,
	validateAttempt: (state) => state.hasResourceAvailable("OVERHEATED"),
	highlightIf: (state) => state.hasResourceAvailable("OVERHEATED"),
});

makeWeaponskill_MCH("FLAMETHROWER", 70, {
	applicationDelay: 0.89,
	recastTime: (state) => state.config.adjustedSksGCD(),
	falloff: 0,
	onConfirm: (state, node) => {
		state.addDoTPotencies({
			node,
			dotName: "FLAMETHROWER",
			skillName: "FLAMETHROWER",
			tickPotency: 100,
			tickFrequency: 1,
			speedStat: "sks",
		});
	},
	onApplication: (state, node) => {
		state.applyDoT("FLAMETHROWER", node);
	},
	secondaryCooldown: {
		cdName: "cd_FLAMETHROWER",
		cooldown: 60,
		maxCharges: 1,
	},
});

makeResourceAbility_MCH("TACTICIAN", 56, "cd_TACTICIAN", {
	rscType: "TACTICIAN",
	maxCharges: 1,
	cooldown: 90,
	applicationDelay: 0.62,
});

makeAbility_MCH("DISMANTLE", 62, "cd_DISMANTLE", {
	maxCharges: 1,
	cooldown: 120,
	applicationDelay: 0.62,
});
