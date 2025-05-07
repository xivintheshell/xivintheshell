import { BRDStatusPropsGenerator } from "../../Components/Jobs/BRD";
import { localizeResourceType } from "../../Components/Localization";
import { StatusPropsGenerator } from "../../Components/StatusDisplay";
import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { Debug, BuffType, WarningType } from "../Common";
import { TraitKey } from "../Data";
import { BRDResourceKey, BRDActionKey, BRDCooldownKey } from "../Data/Jobs/BRD";
import { GameConfig } from "../GameConfig";
import { GameState, PlayerState } from "../GameState";
import { Modifiers, PotencyModifier } from "../Potency";
import { CoolDown, makeResource, Event } from "../Resources";
import {
	SkillAutoReplace,
	ConditionalSkillReplace,
	StatePredicate,
	EffectFn,
	CooldownGroupProperties,
	Weaponskill,
	makeWeaponskill,
	Ability,
	makeAbility,
	makeResourceAbility,
	ResourceCalculationFn,
	MOVEMENT_SKILL_ANIMATION_LOCK,
	Skill,
} from "../Skills";

const makeBRDResource = (
	rsc: BRDResourceKey,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("BRD", rsc, maxValue, params ?? {});
};

makeBRDResource("SOUL_VOICE", 100);
makeBRDResource("PITCH_PERFECT", 3);
makeBRDResource("REPERTOIRE", 4);
makeBRDResource("WANDERERS_CODA", 1);
makeBRDResource("MAGES_CODA", 1);
makeBRDResource("ARMYS_CODA", 1);
makeBRDResource("ETHOS_REPERTOIRE", 4);
makeBRDResource("MUSE_REPERTOIRE", 4);

makeBRDResource("HAWKS_EYE", 1, { timeout: 30 });
makeBRDResource("RAGING_STRIKES", 1, { timeout: 20 });
makeBRDResource("BARRAGE", 1, { timeout: 10 });
makeBRDResource("ARMYS_MUSE", 4, { timeout: 10 });
makeBRDResource("ARMYS_ETHOS", 4, { timeout: 30 });
makeBRDResource("BLAST_ARROW_READY", 1, { timeout: 10 });
makeBRDResource("RESONANT_ARROW_READY", 1, { timeout: 30 });
makeBRDResource("RADIANT_ENCORE_READY", 1, { timeout: 30 });
makeBRDResource("MAGES_BALLAD", 1, { timeout: 45 });
makeBRDResource("ARMYS_PAEON", 1, { timeout: 45 });
makeBRDResource("WANDERERS_MINUET", 1, { timeout: 45 });
makeBRDResource("BATTLE_VOICE", 1, { timeout: 20 });
makeBRDResource("WARDENS_PAEAN", 1, { timeout: 30 });
makeBRDResource("TROUBADOUR", 1, { timeout: 15 });
makeBRDResource("NATURES_MINNE", 1, { timeout: 15 });
makeBRDResource("RADIANT_FINALE", 1, { timeout: 20 });
makeBRDResource("RADIANT_CODA", 3);

makeBRDResource("CAUSTIC_BITE", 1, { timeout: 45 });
makeBRDResource("STORMBITE", 1, { timeout: 45 });

const BARD_SONGS: BRDResourceKey[] = ["WANDERERS_MINUET", "MAGES_BALLAD", "ARMYS_PAEON"];

const BARRAGE_SKILLS: BRDActionKey[] = ["REFULGENT_ARROW", "SHADOWBITE", "WIDE_VOLLEY"];

export class BRDState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		if (!this.hasTraitUnlocked("ENHANCED_BLOODLETTER")) {
			this.cooldowns.set(new CoolDown("cd_HEARTBREAK_SHOT", 15, 2, 2));
		}

		if (!this.hasTraitUnlocked("ENHANCED_TROUBADOUR")) {
			this.cooldowns.set(new CoolDown("cd_TROUBADOUR", 120, 1, 1));
		}

		this.registerRecurringEvents([
			{
				reportName: localizeResourceType("STORMBITE"),
				groupedEffects: [
					{
						effectName: "STORMBITE",
						appliedBy: ["STORMBITE", "IRON_JAWS"],
					},
				],
			},
			{
				reportName: localizeResourceType("CAUSTIC_BITE"),
				groupedEffects: [
					{
						effectName: "CAUSTIC_BITE",
						appliedBy: ["CAUSTIC_BITE", "IRON_JAWS"],
					},
				],
			},
		]);
	}

	override get statusPropsGenerator(): StatusPropsGenerator<BRDState> {
		return new BRDStatusPropsGenerator(this);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable("RAGING_STRIKES")) {
			node.addBuff(BuffType.RagingStrikes);
		}
		if (this.hasResourceAvailable("BATTLE_VOICE")) {
			node.addBuff(BuffType.BattleVoice);
		}
		const radiantFinale = this.resources.get("RADIANT_FINALE").availableAmount();
		switch (radiantFinale) {
			case 1:
				node.addBuff(BuffType.RadiantFinale1);
				break;
			case 2:
				node.addBuff(BuffType.RadiantFinale2);
				break;
			case 3:
				node.addBuff(BuffType.RadiantFinale3);
				break;
		}

		if (
			this.hasResourceAvailable("BARRAGE") &&
			BARRAGE_SKILLS.includes(skill.name as BRDActionKey)
		) {
			node.addBuff(BuffType.Barrage);
		}

		if (this.hasResourceAvailable("WANDERERS_MINUET")) {
			node.addBuff(BuffType.WanderersMinuet);
		} else if (this.hasResourceAvailable("MAGES_BALLAD")) {
			node.addBuff(BuffType.MagesBallad);
		} else if (this.hasResourceAvailable("ARMYS_PAEON")) {
			node.addBuff(BuffType.ArmysPaeon);
		}
	}

	// Songs tick based on their application time, so they're not registered as a normal recurring event
	songTick(song: BRDResourceKey) {
		if (!this.resourceIsSong(song)) {
			return;
		}
		if (!this.hasResourceAvailable(song)) {
			return;
		}

		if (this.triggersEffect(0.8)) {
			this.gainRepertoireEffect(song);
		}

		if (this.resources.timeTillReady(song) > 3 + Debug.epsilon) {
			this.addEvent(
				new Event(`${song} tick`, 3, () => {
					this.songTick(song);
				}),
			);
		}
	}

	gainRepertoireEffect(song?: BRDResourceKey) {
		// If we weren't given a song, figure out if one is active
		if (!song) {
			if (this.hasResourceAvailable("WANDERERS_MINUET")) {
				song = "WANDERERS_MINUET";
			} else if (this.hasResourceAvailable("MAGES_BALLAD")) {
				song = "MAGES_BALLAD";
			} else if (this.hasResourceAvailable("ARMYS_PAEON")) {
				song = "ARMYS_PAEON";
			}
		}
		// If no song is active, or the resource given isn't actually a song, bail
		if (!song) {
			return;
		}
		if (!this.resourceIsSong(song)) {
			return;
		}

		// Grant the specified repertoire effect
		switch (song) {
			case "WANDERERS_MINUET":
				this.resources.get("PITCH_PERFECT").gain(1);
				break;
			case "MAGES_BALLAD":
				this.cooldowns.get("cd_HEARTBREAK_SHOT").restore(7.5);
				break;
			case "ARMYS_PAEON":
				this.resources.get("REPERTOIRE").gain(1);
				break;
		}

		if (this.hasTraitUnlocked("SOUL_VOICE")) {
			if (this.hasResourceAvailable("SOUL_VOICE", 100)) {
				controller.reportWarning(WarningType.SoulVoiceOvercap);
			}
			this.resources.get("SOUL_VOICE").gain(5);
		}
	}

	resourceIsSong(rscType: BRDResourceKey): boolean {
		return BARD_SONGS.includes(rscType);
	}

	beginSong(newSong: BRDResourceKey) {
		if (!this.resourceIsSong(newSong)) {
			return;
		}

		BARD_SONGS.forEach((song) => this.tryExpireSong(song));

		// Convert stocked Army's Ethos into Army's Muse, if not singing Army's Paeon
		if (newSong !== "ARMYS_PAEON" && this.hasResourceAvailable("ARMYS_ETHOS")) {
			const repertoire = this.resources.get("ETHOS_REPERTOIRE").availableAmount();
			this.resources.get("MUSE_REPERTOIRE").gain(repertoire);

			this.tryConsumeResource("ARMYS_ETHOS");
			this.tryConsumeResource("ETHOS_REPERTOIRE", true);

			this.gainStatus("ARMYS_MUSE");
		}

		if (this.hasTraitUnlocked("MINSTRELS_CODA")) {
			const coda =
				newSong === "WANDERERS_MINUET"
					? "WANDERERS_CODA"
					: newSong === "MAGES_BALLAD"
						? "MAGES_CODA"
						: "ARMYS_CODA";
			if (this.hasResourceAvailable(coda)) {
				controller.reportWarning(WarningType.CodaOvercap);
			}
			this.resources.get(coda).gain(1);
		}

		this.resources.get(newSong).gain(1);
		this.resources.addResourceEvent({
			rscType: newSong,
			name: "drop " + newSong,
			delay: this.getStatusDuration(newSong),
			fnOnRsc: (_rsc) => this.tryExpireSong(newSong),
		});

		// Start ticking for repertoire
		this.addEvent(
			new Event(`${newSong} tick`, 3, () => {
				this.songTick(newSong);
			}),
		);
	}

	tryExpireSong(song: BRDResourceKey) {
		if (!this.resourceIsSong(song)) {
			return;
		}
		if (!this.hasResourceAvailable(song)) {
			return;
		}

		// Handle expiring secondary effects/gauge resources
		switch (song) {
			case "WANDERERS_MINUET":
				this.tryConsumeResource("PITCH_PERFECT", true);
				break;
			case "ARMYS_PAEON":
				// Cache how much repertoire is currently held for when the next song applies
				if (this.hasTraitUnlocked("ENHANCED_ARMYS_PAEON")) {
					const repertoire = this.resources.get("REPERTOIRE").availableAmount();
					if (repertoire > 0) {
						this.resources.get("ETHOS_REPERTOIRE").gain(repertoire);
						this.gainStatus("ARMYS_ETHOS");
					}

					// Clear out last Paeon's Muse Repertoire stack counter too
					this.tryConsumeResource("MUSE_REPERTOIRE", true);
				}

				this.tryConsumeResource("REPERTOIRE", true);
				break;
		}

		this.tryConsumeResource(song);
	}

	getCodaCount() {
		const wanderers = this.resources.get("WANDERERS_CODA").availableAmount();
		const mages = this.resources.get("MAGES_CODA").availableAmount();
		const armys = this.resources.get("ARMYS_CODA").availableAmount();

		return wanderers + mages + armys;
	}

	getJobPotencyModifiers(skillName: BRDActionKey): PotencyModifier[] {
		const mods: PotencyModifier[] = [];

		const modiferResources: { rscType: BRDResourceKey; mod: PotencyModifier }[] = [
			{ rscType: "WANDERERS_MINUET", mod: Modifiers.WanderersMinuet },
			{ rscType: "MAGES_BALLAD", mod: Modifiers.MagesBallad },
			{ rscType: "ARMYS_PAEON", mod: Modifiers.ArmysPaeon },
			{ rscType: "RAGING_STRIKES", mod: Modifiers.RagingStrikes },
			{ rscType: "BATTLE_VOICE", mod: Modifiers.BattleVoice },
		];
		modiferResources.forEach((modRsc) => {
			if (this.hasResourceAvailable(modRsc.rscType)) {
				mods.push(modRsc.mod);
			}
		});

		if (this.hasResourceAvailable("RADIANT_FINALE")) {
			const radiantCoda = this.resources.get("RADIANT_CODA").availableAmount();
			if (radiantCoda === 3) {
				mods.push(Modifiers.RadiantFinaleThreeCoda);
			} else if (radiantCoda === 2) {
				mods.push(Modifiers.RadiantFinaleTwoCoda);
			} else if (radiantCoda === 1) {
				mods.push(Modifiers.RadiantFinaleOneCoda);
			}
		}

		if (this.hasResourceAvailable("BARRAGE")) {
			switch (skillName) {
				case "REFULGENT_ARROW":
					mods.push(Modifiers.BarrageRefulgent);
					break;
				case "SHADOWBITE":
					mods.push(Modifiers.BarrageShadowbite);
					break;
				case "WIDE_VOLLEY":
					mods.push(Modifiers.BarrageWideVolley);
					break;
			}
		}

		return mods;
	}

	getSpeedModifier(buff?: BRDResourceKey): number {
		if (buff === "ARMYS_PAEON") {
			const repertoire = this.resources.get("REPERTOIRE").availableAmount();
			return repertoire * 4; // 4% per repertoire stack under Army's Paeon
		} else if (buff === "ARMYS_MUSE") {
			const museRepertoire = this.resources.get("MUSE_REPERTOIRE").availableAmount();
			if (museRepertoire === 4) {
				return 12;
			} // 12% at 4 stacks
			if (museRepertoire === 3) {
				return 4;
			} // 4% at 3 stacks
			return museRepertoire; // 1% per stack below 3 stacks
		}
		return 0;
	}
}

const makeWeaponskill_BRD = (
	name: BRDActionKey,
	unlockLevel: number,
	params: {
		autoUpgrade?: SkillAutoReplace;
		replaceIf?: ConditionalSkillReplace<BRDState>[];
		startOnHotbar?: boolean;
		potency?: number | Array<[TraitKey, number]> | ResourceCalculationFn<BRDState>;
		falloff?: number;
		applicationDelay?: number;
		validateAttempt?: StatePredicate<BRDState>;
		onConfirm?: EffectFn<BRDState>;
		highlightIf?: StatePredicate<BRDState>;
		onApplication?: EffectFn<BRDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Weaponskill<BRDState> => {
	return makeWeaponskill("BRD", name, unlockLevel, {
		...params,
		recastTime: (state) => {
			let speedBuff: BRDResourceKey | undefined = undefined;
			if (state.hasResourceAvailable("ARMYS_PAEON")) {
				speedBuff = "ARMYS_PAEON";
			} else if (state.hasResourceAvailable("ARMYS_MUSE")) {
				speedBuff = "ARMYS_MUSE";
			}
			const speedModifier = state.getSpeedModifier(speedBuff);
			return state.config.adjustedSksGCD(2.5, speedModifier);
		},
		jobPotencyModifiers: (state) => state.getJobPotencyModifiers(name),
	});
};

const makeAbility_BRD = (
	name: BRDActionKey,
	unlockLevel: number,
	cdName: BRDCooldownKey,
	params: {
		potency?: number | Array<[TraitKey, number]> | ResourceCalculationFn<BRDState>;
		replaceIf?: ConditionalSkillReplace<BRDState>[];
		requiresCombat?: boolean;
		highlightIf?: StatePredicate<BRDState>;
		startOnHotbar?: boolean;
		falloff?: number;
		applicationDelay?: number;
		animationLock?: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<BRDState>;
		onConfirm?: EffectFn<BRDState>;
		onApplication?: EffectFn<BRDState>;
		secondaryCooldown?: CooldownGroupProperties;
		autoUpgrade?: SkillAutoReplace;
	},
): Ability<BRDState> => {
	return makeAbility("BRD", name, unlockLevel, cdName, {
		...params,
		jobPotencyModifiers: (state) => state.getJobPotencyModifiers(name),
	});
};

const makeResourceAbility_BRD = (
	name: BRDActionKey,
	unlockLevel: number,
	cdName: BRDCooldownKey,
	params: {
		rscType: BRDResourceKey;
		replaceIf?: ConditionalSkillReplace<BRDState>[];
		applicationDelay: number;
		cooldown: number;
		maxCharges?: number;
		validateAttempt?: StatePredicate<BRDState>;
		onConfirm?: EffectFn<BRDState>;
		onApplication?: EffectFn<BRDState>;
		secondaryCooldown?: CooldownGroupProperties;
	},
): Ability<BRDState> => {
	return makeResourceAbility("BRD", name, unlockLevel, cdName, {
		...params,
	});
};

makeWeaponskill_BRD("HEAVY_SHOT", 1, {
	potency: 160,
	applicationDelay: 1.47, // Unknown, copied from Burst Shot
	onApplication: (state) => state.maybeGainProc("HAWKS_EYE", 0.2),
	autoUpgrade: {
		trait: "HEAVY_SHOT_MASTERY",
		otherSkill: "BURST_SHOT",
	},
});
makeWeaponskill_BRD("BURST_SHOT", 1, {
	startOnHotbar: false,
	potency: [
		["NEVER", 200],
		["RANGED_MASTERY", 220],
	],
	applicationDelay: 1.47,
	onApplication: (state) => state.maybeGainProc("HAWKS_EYE", 0.35),
});

makeWeaponskill_BRD("REFULGENT_ARROW", 70, {
	potency: [
		["NEVER", 260],
		["RANGED_MASTERY", 280],
	],
	applicationDelay: 1.47,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("BARRAGE")) {
			state.tryConsumeResource("BARRAGE");
		} else {
			state.tryConsumeResource("HAWKS_EYE");
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
	highlightIf: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
});

const dotAppliers: Array<{
	skillName: BRDActionKey;
	dotName: BRDResourceKey;
	initialPotency: number;
	tickPotency: number;
}> = [
	{
		skillName: "CAUSTIC_BITE",
		dotName: "CAUSTIC_BITE",
		initialPotency: 150,
		tickPotency: 20,
	},
	{
		skillName: "STORMBITE",
		dotName: "STORMBITE",
		initialPotency: 100,
		tickPotency: 25,
	},
];
dotAppliers.forEach((props) => {
	makeWeaponskill_BRD(props.skillName, 1, {
		potency: props.initialPotency,
		applicationDelay: 1.29,
		onConfirm: (state, node) =>
			state.addDoTPotencies({
				node,
				effectName: props.dotName,
				skillName: props.skillName,
				tickPotency: props.tickPotency,
				speedStat: "sks",
				modifiers: state.getJobPotencyModifiers(props.skillName),
			}),
		onApplication: (state, node) => {
			state.applyDoT(props.dotName, node);
			if (state.hasTraitUnlocked("BITE_MASTERY_II")) {
				state.maybeGainProc("HAWKS_EYE", 0.35);
			}
		},
	});
});

makeWeaponskill_BRD("IRON_JAWS", 56, {
	potency: 100,
	applicationDelay: 0.67,
	onConfirm: (state, node) => {
		// GH#131: iron jaws checks whether the dots are active at cast confirm,
		// not at application time
		// the refreshed status is still applied at application
		const dotActive = dotAppliers.map((dotParams) =>
			state.hasResourceAvailable(dotParams.dotName),
		);
		state.addEvent(
			new Event("iron jaws dot refresh", 0.67, () => {
				dotAppliers.forEach((dotParams, i) => {
					state.refreshDot(
						{
							node,
							effectName: dotParams.dotName,
							tickPotency: dotParams.tickPotency,
							skillName: "IRON_JAWS",
							speedStat: "sks",
							modifiers: state.getJobPotencyModifiers("IRON_JAWS"),
						},
						dotActive[i],
					);
				});
				if (state.hasTraitUnlocked("BITE_MASTERY_II")) {
					state.maybeGainProc("HAWKS_EYE", 0.35);
				}
			}),
		);
	},
});

makeWeaponskill_BRD("APEX_ARROW", 80, {
	potency: (state) => {
		const soulVoice = state.resources.get("SOUL_VOICE");
		const minRequirement = 20;
		const minPotency = state.hasTraitUnlocked("RANGED_MASTERY") ? 120 : 100;
		const maxPotency = state.hasTraitUnlocked("RANGED_MASTERY") ? 600 : 500;
		const soulVoiceBonus =
			(1.0 * (soulVoice.availableAmount() - minRequirement)) /
			(soulVoice.maxValue - minRequirement);
		const basePotency = (maxPotency - minPotency) * soulVoiceBonus + minPotency;
		return basePotency;
	},
	falloff: 0,
	applicationDelay: 1.07,
	onConfirm: (state) => {
		if (
			state.hasTraitUnlocked("ENHANCED_APEX_ARROW") &&
			state.resources.get("SOUL_VOICE").availableAmount() >= 80
		) {
			state.gainStatus("BLAST_ARROW_READY");
		}

		state.tryConsumeResource("SOUL_VOICE", true);
	},
	validateAttempt: (state) => state.hasResourceAvailable("SOUL_VOICE", 20),
	highlightIf: (state) => state.hasResourceAvailable("SOUL_VOICE", 80),
	replaceIf: [
		{
			newSkill: "BLAST_ARROW",
			condition: (state) => state.hasResourceAvailable("BLAST_ARROW_READY"),
		},
	],
});
makeWeaponskill_BRD("BLAST_ARROW", 86, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.6,
	applicationDelay: 1.65,
	validateAttempt: (state) => state.hasResourceAvailable("BLAST_ARROW_READY"),
	highlightIf: (state) => state.hasResourceAvailable("BLAST_ARROW_READY"),
	onConfirm: (state) => state.tryConsumeResource("BLAST_ARROW_READY"),
});

makeAbility_BRD("EMYPREAL_ARROW", 54, "cd_EMPYREAL_ARROW", {
	potency: [
		["NEVER", 240], // TODO - Confirm
		["RANGED_MASTERY", 260],
	],
	cooldown: 15,
	applicationDelay: 1.03,
	// GH#130: repertoire effect is applied on confirm
	onConfirm: (state) => state.gainRepertoireEffect(),
});

makeAbility_BRD("BLOODLETTER", 12, "cd_HEARTBREAK_SHOT", {
	potency: 130,
	cooldown: 15,
	maxCharges: 3,
	applicationDelay: 1.65, // Unsure, copied from Heartbreak
	autoUpgrade: {
		otherSkill: "HEARTBREAK_SHOT",
		trait: "BLOODLETTER_MASTERY",
	},
});
makeAbility_BRD("HEARTBREAK_SHOT", 92, "cd_HEARTBREAK_SHOT", {
	startOnHotbar: false,
	potency: 180,
	cooldown: 15,
	maxCharges: 3,
	applicationDelay: 1.65,
});

makeAbility_BRD("SIDEWINDER", 60, "cd_SIDEWINDER", {
	potency: [
		["NEVER", 320],
		["RANGED_MASTERY", 400],
	],
	cooldown: 60,
	applicationDelay: 0.53,
});

const songSkills: Array<{
	skillName: BRDActionKey;
	song: BRDResourceKey;
	skillLevel: number;
	cdName: BRDCooldownKey;
	replaceIf?: ConditionalSkillReplace<BRDState>[];
}> = [
	{
		skillName: "WANDERERS_MINUET",
		song: "WANDERERS_MINUET",
		skillLevel: 52,
		cdName: "cd_WANDERERS_MINUET",
		replaceIf: [
			{
				newSkill: "PITCH_PERFECT",
				condition: (state) => state.hasResourceAvailable("WANDERERS_MINUET"),
			},
		],
	},
	{
		skillName: "MAGES_BALLAD",
		song: "MAGES_BALLAD",
		skillLevel: 30,
		cdName: "cd_MAGES_BALLAD",
	},
	{
		skillName: "ARMYS_PAEON",
		song: "ARMYS_PAEON",
		skillLevel: 40,
		cdName: "cd_ARMYS_PAEON",
	},
];
songSkills.forEach((props) => {
	makeAbility_BRD(props.skillName, props.skillLevel, props.cdName, {
		applicationDelay: 0,
		requiresCombat: true,
		cooldown: 120,
		replaceIf: props.replaceIf,
		onConfirm: (state) => state.beginSong(props.song),
	});
});

makeAbility_BRD("PITCH_PERFECT", 52, "cd_PITCH_PERFECT", {
	startOnHotbar: false,
	applicationDelay: 0.8,
	cooldown: 1,
	potency: (state) => {
		const pitchPerfectStacks = state.resources.get("PITCH_PERFECT").availableAmount();
		return pitchPerfectStacks === 3 ? 360 : pitchPerfectStacks === 2 ? 220 : 100;
	},
	falloff: 0.55,
	onConfirm: (state) => state.tryConsumeResource("PITCH_PERFECT", true),
	validateAttempt: (state) =>
		state.hasResourceAvailable("WANDERERS_MINUET") &&
		state.hasResourceAvailable("PITCH_PERFECT"),
	highlightIf: (state) =>
		state.hasResourceAvailable("WANDERERS_MINUET") &&
		state.hasResourceAvailable("PITCH_PERFECT"),
});

makeResourceAbility_BRD("BARRAGE", 38, "cd_BARRAGE", {
	rscType: "BARRAGE",
	applicationDelay: 0,
	cooldown: 120,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_BARRAGE")) {
			state.gainStatus("RESONANT_ARROW_READY");
		}
	},
	replaceIf: [
		{
			newSkill: "RESONANT_ARROW",
			condition: (state) => state.hasResourceAvailable("RESONANT_ARROW_READY"),
		},
	],
});
makeWeaponskill_BRD("RESONANT_ARROW", 96, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.55,
	applicationDelay: 1.16,
	onConfirm: (state) => state.tryConsumeResource("RESONANT_ARROW_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("RESONANT_ARROW_READY"),
	highlightIf: (state) => state.hasResourceAvailable("RESONANT_ARROW_READY"),
});

makeResourceAbility_BRD("RADIANT_FINALE", 90, "cd_RADIANT_FINALE", {
	rscType: "RADIANT_FINALE",
	applicationDelay: 0.62,
	cooldown: 110,
	onConfirm: (state) => {
		const coda = state.getCodaCount();
		state.resources.get("RADIANT_CODA").overrideCurrentValue(coda);
		state.tryConsumeResource("WANDERERS_CODA");
		state.tryConsumeResource("MAGES_CODA");
		state.tryConsumeResource("ARMYS_CODA");

		if (state.hasTraitUnlocked("ENHANCED_RADIANT_FINALE")) {
			state.gainStatus("RADIANT_ENCORE_READY");
		}
	},
	validateAttempt: (state) => state.getCodaCount() > 0,
	replaceIf: [
		{
			newSkill: "RADIANT_ENCORE",
			condition: (state) => state.hasResourceAvailable("RADIANT_ENCORE_READY"),
		},
	],
});
makeWeaponskill_BRD("RADIANT_ENCORE", 100, {
	startOnHotbar: false,
	potency: (state) => {
		const radiantCoda = state.resources.get("RADIANT_CODA").availableAmount();
		return radiantCoda === 3 ? 900 : radiantCoda === 2 ? 600 : 500;
	},
	falloff: 0.55,
	applicationDelay: 1.96,
	onConfirm: (state) => state.tryConsumeResource("RADIANT_ENCORE_READY"),
	validateAttempt: (state) => state.hasResourceAvailable("RADIANT_ENCORE_READY"),
	highlightIf: (state) => state.hasResourceAvailable("RADIANT_ENCORE_READY"),
});

makeResourceAbility_BRD("RAGING_STRIKES", 4, "cd_RAGING_STRIKES", {
	rscType: "RAGING_STRIKES",
	applicationDelay: 0.53,
	cooldown: 120,
});

makeResourceAbility_BRD("BATTLE_VOICE", 50, "cd_BATTLE_VOICE", {
	rscType: "BATTLE_VOICE",
	applicationDelay: 0.62,
	cooldown: 120,
});

makeWeaponskill_BRD("QUICK_NOCK", 18, {
	potency: 110,
	applicationDelay: 1.11, // Unsure, copied from Ladonsbite,
	onApplication: (state) => state.maybeGainProc("HAWKS_EYE", 0.2),
	falloff: 0,
	autoUpgrade: {
		trait: "QUICK_NOCK_MASTERY",
		otherSkill: "LADONSBITE",
	},
});
makeWeaponskill_BRD("LADONSBITE", 82, {
	startOnHotbar: false,
	potency: 140,
	falloff: 0,
	applicationDelay: 1.11,
	onApplication: (state) => state.maybeGainProc("HAWKS_EYE", 0.35),
});

makeWeaponskill_BRD("WIDE_VOLLEY", 18, {
	potency: 140,
	falloff: 0,
	applicationDelay: 1.43, // Unsure, copied from Shadowbite,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("BARRAGE")) {
			state.tryConsumeResource("BARRAGE");
		} else {
			state.tryConsumeResource("HAWKS_EYE");
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
	highlightIf: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
	autoUpgrade: {
		trait: "WIDE_VOLLEY_MASTERY",
		otherSkill: "SHADOWBITE",
	},
});
makeWeaponskill_BRD("SHADOWBITE", 72, {
	startOnHotbar: false,
	potency: 180,
	falloff: 0,
	applicationDelay: 1.43,
	onConfirm: (state) => {
		if (state.hasResourceAvailable("BARRAGE")) {
			state.tryConsumeResource("BARRAGE");
		} else {
			state.tryConsumeResource("HAWKS_EYE");
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
	highlightIf: (state) =>
		state.hasResourceAvailable("HAWKS_EYE") || state.hasResourceAvailable("BARRAGE"),
});

makeAbility_BRD("RAIN_OF_DEATH", 45, "cd_HEARTBREAK_SHOT", {
	potency: 100,
	cooldown: 15,
	maxCharges: 3,
	falloff: 0,
	applicationDelay: 1.65,
});

makeResourceAbility_BRD("WARDENS_PAEAN", 35, "cd_WARDENS_PAEAN", {
	rscType: "WARDENS_PAEAN",
	cooldown: 45,
	applicationDelay: 0.62,
});

makeResourceAbility_BRD("NATURES_MINNE", 35, "cd_NATURES_MINNE", {
	rscType: "NATURES_MINNE",
	cooldown: 120,
	applicationDelay: 0.62,
});

makeAbility_BRD("REPELLING_SHOT", 15, "cd_REPELLING_SHOT", {
	cooldown: 30,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeResourceAbility_BRD("TROUBADOUR", 56, "cd_TROUBADOUR", {
	rscType: "TROUBADOUR",
	maxCharges: 1,
	cooldown: 90,
	applicationDelay: 0,
});
