import { localizeResourceType } from "../../Components/Localization";
import { controller } from "../../Controller/Controller";
import { ActionNode } from "../../Controller/Record";
import { BuffType, ResourceType, WarningType } from "../Common";
import { BRDResourceType } from "../Constants/BRD";
import { BRDActionKey } from "../Data/Actions/Jobs/BRD";
import { TraitKey } from "../Data/Traits";
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
	rsc: ResourceType,
	maxValue: number,
	params?: { timeout?: number; default?: number },
) => {
	makeResource("BRD", rsc, maxValue, params ?? {});
};

makeBRDResource(ResourceType.SoulVoice, 100);
makeBRDResource(ResourceType.PitchPerfect, 3);
makeBRDResource(ResourceType.Repertoire, 4);
makeBRDResource(ResourceType.WanderersCoda, 1);
makeBRDResource(ResourceType.MagesCoda, 1);
makeBRDResource(ResourceType.ArmysCoda, 1);
makeBRDResource(ResourceType.EthosRepertoire, 4);
makeBRDResource(ResourceType.MuseRepertoire, 4);

makeBRDResource(ResourceType.HawksEye, 1, { timeout: 30 });
makeBRDResource(ResourceType.RagingStrikes, 1, { timeout: 20 });
makeBRDResource(ResourceType.Barrage, 1, { timeout: 10 });
makeBRDResource(ResourceType.ArmysMuse, 4, { timeout: 10 });
makeBRDResource(ResourceType.ArmysEthos, 4, { timeout: 30 });
makeBRDResource(ResourceType.BlastArrowReady, 1, { timeout: 10 });
makeBRDResource(ResourceType.ResonantArrowReady, 1, { timeout: 30 });
makeBRDResource(ResourceType.RadiantEncoreReady, 1, { timeout: 30 });
makeBRDResource(ResourceType.MagesBallad, 1, { timeout: 45 });
makeBRDResource(ResourceType.ArmysPaeon, 1, { timeout: 45 });
makeBRDResource(ResourceType.WanderersMinuet, 1, { timeout: 45 });
makeBRDResource(ResourceType.BattleVoice, 1, { timeout: 20 });
makeBRDResource(ResourceType.WardensPaean, 1, { timeout: 30 });
makeBRDResource(ResourceType.Troubadour, 1, { timeout: 15 });
makeBRDResource(ResourceType.NaturesMinne, 1, { timeout: 15 });
makeBRDResource(ResourceType.RadiantFinale, 1, { timeout: 20 });
makeBRDResource(ResourceType.RadiantCoda, 3);

makeBRDResource(ResourceType.CausticBite, 1, { timeout: 45 });
makeBRDResource(ResourceType.Stormbite, 1, { timeout: 45 });

const BARD_SONGS: ResourceType[] = [
	ResourceType.WanderersMinuet,
	ResourceType.MagesBallad,
	ResourceType.ArmysPaeon,
];

const BARRAGE_SKILLS: BRDActionKey[] = ["REFULGENT_ARROW", "SHADOWBITE", "WIDE_VOLLEY"];

export class BRDState extends GameState {
	constructor(config: GameConfig) {
		super(config);

		if (!this.hasTraitUnlocked("ENHANCED_BLOODLETTER")) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_HeartbreakShot, 15, 2, 2));
		}

		if (!this.hasTraitUnlocked("ENHANCED_TROUBADOUR")) {
			this.cooldowns.set(new CoolDown(ResourceType.cd_Troubadour, 120, 1, 1));
		}

		this.registerRecurringEvents([
			{
				reportName: localizeResourceType(ResourceType.Stormbite),
				groupedDots: [
					{
						dotName: ResourceType.Stormbite,
						appliedBy: ["STORMBITE", "IRON_JAWS"],
					},
				],
			},
			{
				reportName: localizeResourceType(ResourceType.CausticBite),
				groupedDots: [
					{
						dotName: ResourceType.CausticBite,
						appliedBy: ["CAUSTIC_BITE", "IRON_JAWS"],
					},
				],
			},
		]);
	}

	override jobSpecificAddDamageBuffCovers(node: ActionNode, skill: Skill<PlayerState>): void {
		if (this.hasResourceAvailable(ResourceType.RagingStrikes)) {
			node.addBuff(BuffType.RagingStrikes);
		}
		if (this.hasResourceAvailable(ResourceType.BattleVoice)) {
			node.addBuff(BuffType.BattleVoice);
		}
		const radiantFinale = this.resources.get(ResourceType.RadiantFinale).availableAmount();
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
			this.hasResourceAvailable(ResourceType.Barrage) &&
			BARRAGE_SKILLS.includes(skill.name as BRDActionKey)
		) {
			node.addBuff(BuffType.Barrage);
		}

		if (this.hasResourceAvailable(ResourceType.WanderersMinuet)) {
			node.addBuff(BuffType.WanderersMinuet);
		} else if (this.hasResourceAvailable(ResourceType.MagesBallad)) {
			node.addBuff(BuffType.MagesBallad);
		} else if (this.hasResourceAvailable(ResourceType.ArmysPaeon)) {
			node.addBuff(BuffType.ArmysPaeon);
		}
	}

	// Songs tick based on their application time, so they're not registered as a normal recurring event
	songTick(song: ResourceType) {
		if (!BARD_SONGS.includes(song)) {
			return;
		}
		if (!this.hasResourceAvailable(song)) {
			return;
		}

		if (this.triggersEffect(0.8)) {
			this.gainRepertoireEffect(song);
		}

		if (this.resources.timeTillReady(song) > 3) {
			this.addEvent(
				new Event(`${song} tick`, 3, () => {
					this.songTick(song);
				}),
			);
		}
	}

	gainRepertoireEffect(song?: ResourceType) {
		// If we weren't given a song, figure out if one is active
		if (!song) {
			if (this.hasResourceAvailable(ResourceType.WanderersMinuet)) {
				song = ResourceType.WanderersMinuet;
			} else if (this.hasResourceAvailable(ResourceType.MagesBallad)) {
				song = ResourceType.MagesBallad;
			} else if (this.hasResourceAvailable(ResourceType.ArmysPaeon)) {
				song = ResourceType.ArmysPaeon;
			}
		}
		// If no song is active, or the resource given isn't actually a song, bail
		if (!song) {
			return;
		}
		if (!BARD_SONGS.includes(song)) {
			return;
		}

		// Grant the specified repertoire effect
		switch (song) {
			case ResourceType.WanderersMinuet:
				this.resources.get(ResourceType.PitchPerfect).gain(1);
				break;
			case ResourceType.MagesBallad:
				this.cooldowns.get(ResourceType.cd_HeartbreakShot).restore(this, 7.5);
				break;
			case ResourceType.ArmysPaeon:
				this.resources.get(ResourceType.Repertoire).gain(1);
				break;
		}

		if (this.hasTraitUnlocked("SOUL_VOICE")) {
			if (this.hasResourceAvailable(ResourceType.SoulVoice, 100)) {
				controller.reportWarning(WarningType.SoulVoiceOvercap);
			}
			this.resources.get(ResourceType.SoulVoice).gain(5);
		}
	}

	resourceIsSong(rscType: ResourceType): boolean {
		return BARD_SONGS.includes(rscType);
	}

	beginSong(newSong: ResourceType) {
		if (!this.resourceIsSong(newSong)) {
			return;
		}

		BARD_SONGS.forEach((song) => this.tryExpireSong(song));

		// Convert stocked Army's Ethos into Army's Muse, if not singing Army's Paeon
		if (
			newSong !== ResourceType.ArmysPaeon &&
			this.hasResourceAvailable(ResourceType.ArmysEthos)
		) {
			const repertoire = this.resources.get(ResourceType.EthosRepertoire).availableAmount();
			this.resources.get(ResourceType.MuseRepertoire).gain(repertoire);

			this.tryConsumeResource(ResourceType.ArmysEthos);
			this.tryConsumeResource(ResourceType.EthosRepertoire, true);

			this.gainStatus(ResourceType.ArmysMuse);
		}

		if (this.hasTraitUnlocked("MINSTRELS_CODA")) {
			const coda =
				newSong === ResourceType.WanderersMinuet
					? ResourceType.WanderersCoda
					: newSong === ResourceType.MagesBallad
						? ResourceType.MagesCoda
						: ResourceType.ArmysCoda;
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

	tryExpireSong(song: ResourceType) {
		if (!this.resourceIsSong(song)) {
			return;
		}
		if (!this.hasResourceAvailable(song)) {
			return;
		}

		// Handle expiring secondary effects/gauge resources
		switch (song) {
			case ResourceType.WanderersMinuet:
				this.tryConsumeResource(ResourceType.PitchPerfect, true);
				break;
			case ResourceType.ArmysPaeon:
				// Cache how much repertoire is currently held for when the next song applies
				if (this.hasTraitUnlocked("ENHANCED_ARMYS_PAEON")) {
					const repertoire = this.resources
						.get(ResourceType.Repertoire)
						.availableAmount();
					if (repertoire > 0) {
						this.resources.get(ResourceType.EthosRepertoire).gain(repertoire);
						this.gainStatus(ResourceType.ArmysEthos);
					}

					// Clear out last Paeon's Muse Repertoire stack counter too
					this.tryConsumeResource(ResourceType.MuseRepertoire, true);
				}

				this.tryConsumeResource(ResourceType.Repertoire, true);
				break;
		}

		this.tryConsumeResource(song);
	}

	getCodaCount() {
		const wanderers = this.resources.get(ResourceType.WanderersCoda).availableAmount();
		const mages = this.resources.get(ResourceType.MagesCoda).availableAmount();
		const armys = this.resources.get(ResourceType.ArmysCoda).availableAmount();

		return wanderers + mages + armys;
	}

	getJobPotencyModifiers(skillName: BRDActionKey): PotencyModifier[] {
		const mods: PotencyModifier[] = [];

		const modiferResources: { rscType: ResourceType; mod: PotencyModifier }[] = [
			{ rscType: ResourceType.WanderersMinuet, mod: Modifiers.WanderersMinuet },
			{ rscType: ResourceType.MagesBallad, mod: Modifiers.MagesBallad },
			{ rscType: ResourceType.ArmysPaeon, mod: Modifiers.ArmysPaeon },
			{ rscType: ResourceType.RagingStrikes, mod: Modifiers.RagingStrikes },
			{ rscType: ResourceType.BattleVoice, mod: Modifiers.BattleVoice },
		];
		modiferResources.forEach((modRsc) => {
			if (this.hasResourceAvailable(modRsc.rscType)) {
				mods.push(modRsc.mod);
			}
		});

		if (this.hasResourceAvailable(ResourceType.RadiantFinale)) {
			const radiantCoda = this.resources.get(ResourceType.RadiantCoda).availableAmount();
			if (radiantCoda === 3) {
				mods.push(Modifiers.RadiantFinaleThreeCoda);
			} else if (radiantCoda === 2) {
				mods.push(Modifiers.RadiantFinaleTwoCoda);
			} else if (radiantCoda === 1) {
				mods.push(Modifiers.RadiantFinaleOneCoda);
			}
		}

		if (this.hasResourceAvailable(ResourceType.Barrage)) {
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

	getSpeedModifier(buff?: BRDResourceType): number {
		if (buff === ResourceType.ArmysPaeon) {
			const repertoire = this.resources.get(ResourceType.Repertoire).availableAmount();
			return repertoire * 4; // 4% per repertoire stack under Army's Paeon
		} else if (buff === ResourceType.ArmysMuse) {
			const museRepertoire = this.resources
				.get(ResourceType.MuseRepertoire)
				.availableAmount();
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
			let speedBuff = undefined;
			if (state.hasResourceAvailable(ResourceType.ArmysPaeon)) {
				speedBuff = ResourceType.ArmysPaeon;
			} else if (state.hasResourceAvailable(ResourceType.ArmysMuse)) {
				speedBuff = ResourceType.ArmysMuse;
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
	cdName: ResourceType,
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
	cdName: ResourceType,
	params: {
		rscType: ResourceType;
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
	onApplication: (state) => state.maybeGainProc(ResourceType.HawksEye, 0.2),
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
	onApplication: (state) => state.maybeGainProc(ResourceType.HawksEye, 0.35),
});

makeWeaponskill_BRD("REFULGENT_ARROW", 70, {
	potency: [
		["NEVER", 260],
		["RANGED_MASTERY", 280],
	],
	applicationDelay: 1.47,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.Barrage)) {
			state.tryConsumeResource(ResourceType.Barrage);
		} else {
			state.tryConsumeResource(ResourceType.HawksEye);
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
});

const dotAppliers: Array<{
	skillName: BRDActionKey;
	dotName: ResourceType;
	initialPotency: number;
	tickPotency: number;
}> = [
	{
		skillName: "CAUSTIC_BITE",
		dotName: ResourceType.CausticBite,
		initialPotency: 150,
		tickPotency: 20,
	},
	{
		skillName: "STORMBITE",
		dotName: ResourceType.Stormbite,
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
				dotName: props.dotName,
				skillName: props.skillName,
				tickPotency: props.tickPotency,
				speedStat: "sks",
				modifiers: state.getJobPotencyModifiers(props.skillName),
			}),
		onApplication: (state, node) => {
			state.applyDoT(props.dotName, node);
			if (state.hasTraitUnlocked("BITE_MASTERY_II")) {
				state.maybeGainProc(ResourceType.HawksEye, 0.35);
			}
		},
	});
});

makeWeaponskill_BRD("IRON_JAWS", 56, {
	potency: 100,
	applicationDelay: 0.67,
	onApplication: (state, node) => {
		dotAppliers.forEach((dotParams) => {
			state.refreshDot({
				node,
				dotName: dotParams.dotName,
				tickPotency: dotParams.tickPotency,
				skillName: "IRON_JAWS",
				speedStat: "sks",
				modifiers: state.getJobPotencyModifiers("IRON_JAWS"),
			});
		});
		if (state.hasTraitUnlocked("BITE_MASTERY_II")) {
			state.maybeGainProc(ResourceType.HawksEye, 0.35);
		}
	},
});

makeWeaponskill_BRD("APEX_ARROW", 80, {
	potency: (state) => {
		const soulVoice = state.resources.get(ResourceType.SoulVoice);
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
			state.resources.get(ResourceType.SoulVoice).availableAmount() >= 80
		) {
			state.gainStatus(ResourceType.BlastArrowReady);
		}

		state.tryConsumeResource(ResourceType.SoulVoice, true);
	},
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.SoulVoice, 20),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.SoulVoice, 80),
	replaceIf: [
		{
			newSkill: "BLAST_ARROW",
			condition: (state) => state.hasResourceAvailable(ResourceType.BlastArrowReady),
		},
	],
});
makeWeaponskill_BRD("BLAST_ARROW", 86, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.6,
	applicationDelay: 1.65,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.BlastArrowReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.BlastArrowReady),
	onConfirm: (state) => state.tryConsumeResource(ResourceType.BlastArrowReady),
});

makeAbility_BRD("EMYPREAL_ARROW", 54, ResourceType.cd_EmpyrealArrow, {
	potency: [
		["NEVER", 240], // TODO - Confirm
		["RANGED_MASTERY", 260],
	],
	cooldown: 15,
	applicationDelay: 1.03,
	onApplication: (state) => state.gainRepertoireEffect(), // on application or on confirm?
});

makeAbility_BRD("BLOODLETTER", 12, ResourceType.cd_HeartbreakShot, {
	potency: 130,
	cooldown: 15,
	maxCharges: 3,
	applicationDelay: 1.65, // Unsure, copied from Heartbreak
	autoUpgrade: {
		otherSkill: "HEARTBREAK_SHOT",
		trait: "BLOODLETTER_MASTERY",
	},
});
makeAbility_BRD("HEARTBREAK_SHOT", 92, ResourceType.cd_HeartbreakShot, {
	startOnHotbar: false,
	potency: 180,
	cooldown: 15,
	maxCharges: 3,
	applicationDelay: 1.65,
});

makeAbility_BRD("SIDEWINDER", 60, ResourceType.cd_Sidewinder, {
	potency: [
		["NEVER", 320],
		["RANGED_MASTERY", 400],
	],
	cooldown: 60,
	applicationDelay: 0.53,
});

const songSkills: Array<{
	skillName: BRDActionKey;
	song: ResourceType;
	skillLevel: number;
	cdName: ResourceType;
	replaceIf?: ConditionalSkillReplace<BRDState>[];
}> = [
	{
		skillName: "WANDERERS_MINUET",
		song: ResourceType.WanderersMinuet,
		skillLevel: 52,
		cdName: ResourceType.cd_WanderersMinuet,
		replaceIf: [
			{
				newSkill: "PITCH_PERFECT",
				condition: (state) => state.hasResourceAvailable(ResourceType.WanderersMinuet),
			},
		],
	},
	{
		skillName: "MAGES_BALLAD",
		song: ResourceType.MagesBallad,
		skillLevel: 30,
		cdName: ResourceType.cd_MagesBallad,
	},
	{
		skillName: "ARMYS_PAEON",
		song: ResourceType.ArmysPaeon,
		skillLevel: 40,
		cdName: ResourceType.cd_ArmysPaeon,
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

makeAbility_BRD("PITCH_PERFECT", 52, ResourceType.cd_PitchPerfect, {
	startOnHotbar: false,
	applicationDelay: 0.8,
	cooldown: 1,
	potency: (state) => {
		const pitchPerfectStacks = state.resources.get(ResourceType.PitchPerfect).availableAmount();
		return pitchPerfectStacks === 3 ? 360 : pitchPerfectStacks === 2 ? 220 : 100;
	},
	falloff: 0,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.PitchPerfect, true),
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.WanderersMinuet) &&
		state.hasResourceAvailable(ResourceType.PitchPerfect),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.WanderersMinuet) &&
		state.hasResourceAvailable(ResourceType.PitchPerfect),
});

makeResourceAbility_BRD("BARRAGE", 38, ResourceType.cd_Barrage, {
	rscType: ResourceType.Barrage,
	applicationDelay: 0,
	cooldown: 120,
	onConfirm: (state) => {
		if (state.hasTraitUnlocked("ENHANCED_BARRAGE")) {
			state.gainStatus(ResourceType.ResonantArrowReady);
		}
	},
	replaceIf: [
		{
			newSkill: "RESONANT_ARROW",
			condition: (state) => state.hasResourceAvailable(ResourceType.ResonantArrowReady),
		},
	],
});
makeWeaponskill_BRD("RESONANT_ARROW", 96, {
	startOnHotbar: false,
	potency: 600,
	falloff: 0.5,
	applicationDelay: 1.16,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.ResonantArrowReady),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.ResonantArrowReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.ResonantArrowReady),
});

makeResourceAbility_BRD("RADIANT_FINALE", 90, ResourceType.cd_RadiantFinale, {
	rscType: ResourceType.RadiantFinale,
	applicationDelay: 0.62,
	cooldown: 110,
	onConfirm: (state) => {
		const coda = state.getCodaCount();
		state.resources.get(ResourceType.RadiantCoda).overrideCurrentValue(coda);
		state.tryConsumeResource(ResourceType.WanderersCoda);
		state.tryConsumeResource(ResourceType.MagesCoda);
		state.tryConsumeResource(ResourceType.ArmysCoda);

		if (state.hasTraitUnlocked("ENHANCED_RADIANT_FINALE")) {
			state.gainStatus(ResourceType.RadiantEncoreReady);
		}
	},
	validateAttempt: (state) => state.getCodaCount() > 0,
	replaceIf: [
		{
			newSkill: "RADIANT_ENCORE",
			condition: (state) => state.hasResourceAvailable(ResourceType.RadiantEncoreReady),
		},
	],
});
makeWeaponskill_BRD("RADIANT_ENCORE", 100, {
	startOnHotbar: false,
	potency: (state) => {
		const radiantCoda = state.resources.get(ResourceType.RadiantCoda).availableAmount();
		return radiantCoda === 3 ? 900 : radiantCoda === 2 ? 600 : 500;
	},
	falloff: 0.5,
	applicationDelay: 1.96,
	onConfirm: (state) => state.tryConsumeResource(ResourceType.RadiantEncoreReady),
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.RadiantEncoreReady),
	highlightIf: (state) => state.hasResourceAvailable(ResourceType.RadiantEncoreReady),
});

makeResourceAbility_BRD("RAGING_STRIKES", 4, ResourceType.cd_RagingStrikes, {
	rscType: ResourceType.RagingStrikes,
	applicationDelay: 0.53,
	cooldown: 120,
});

makeResourceAbility_BRD("BATTLE_VOICE", 50, ResourceType.cd_BattleVoice, {
	rscType: ResourceType.BattleVoice,
	applicationDelay: 0.62,
	cooldown: 120,
});

makeWeaponskill_BRD("QUICK_NOCK", 18, {
	potency: 110,
	applicationDelay: 1.11, // Unsure, copied from Ladonsbite,
	onApplication: (state) => state.maybeGainProc(ResourceType.HawksEye, 0.2),
	falloff: 0,
	autoUpgrade: {
		trait: "QUICK_NOCK_MASTERY",
		otherSkill: "LADONSBITE",
	},
});
makeWeaponskill_BRD("LADONSBITE", 82, {
	startOnHotbar: false,
	potency: 110,
	falloff: 0,
	applicationDelay: 1.11,
	onApplication: (state) => state.maybeGainProc(ResourceType.HawksEye, 0.35),
});

makeWeaponskill_BRD("WIDE_VOLLEY", 18, {
	potency: 140,
	falloff: 0,
	applicationDelay: 1.43, // Unsure, copied from Shadowbite,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.Barrage)) {
			state.tryConsumeResource(ResourceType.Barrage);
		} else {
			state.tryConsumeResource(ResourceType.HawksEye);
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
	autoUpgrade: {
		trait: "WIDE_VOLLEY_MASTERY",
		otherSkill: "SHADOWBITE",
	},
});
makeWeaponskill_BRD("SHADOWBITE", 72, {
	startOnHotbar: false,
	potency: 170,
	falloff: 0,
	applicationDelay: 1.43,
	onConfirm: (state) => {
		if (state.hasResourceAvailable(ResourceType.Barrage)) {
			state.tryConsumeResource(ResourceType.Barrage);
		} else {
			state.tryConsumeResource(ResourceType.HawksEye);
		}
	},
	validateAttempt: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
	highlightIf: (state) =>
		state.hasResourceAvailable(ResourceType.HawksEye) ||
		state.hasResourceAvailable(ResourceType.Barrage),
});

makeAbility_BRD("RAIN_OF_DEATH", 45, ResourceType.cd_HeartbreakShot, {
	potency: 100,
	cooldown: 15,
	maxCharges: 3,
	falloff: 0,
	applicationDelay: 1.65,
});

makeResourceAbility_BRD("WARDENS_PAEAN", 35, ResourceType.cd_WardensPaean, {
	rscType: ResourceType.WardensPaean,
	cooldown: 45,
	applicationDelay: 0.62,
});

makeResourceAbility_BRD("NATURES_MINNE", 35, ResourceType.cd_NaturesMinne, {
	rscType: ResourceType.NaturesMinne,
	cooldown: 120,
	applicationDelay: 0.62,
});

makeAbility_BRD("REPELLING_SHOT", 15, ResourceType.cd_RepellingShot, {
	cooldown: 30,
	animationLock: MOVEMENT_SKILL_ANIMATION_LOCK,
});

makeResourceAbility_BRD("TROUBADOUR", 56, ResourceType.cd_Troubadour, {
	rscType: ResourceType.Troubadour,
	maxCharges: 1,
	cooldown: 90,
	applicationDelay: 0,
});
