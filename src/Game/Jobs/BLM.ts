// Skill and state declarations for BLM.

import {controller} from "../../Controller/Controller";

import {ShellJob} from "../../Controller/Common";
import {SkillName, Aspect, ResourceType, WarningType} from "../Common";
import {makeAbility, makeGCD, SkillAutoReplace, SkillInfo} from "../Skills";
import {Traits, TraitName} from "../Traits";
import {JobState, GameState} from "../GameState";
import {CoolDown, CoolDownState, DoTBuff, Event, Resource, ResourceState} from "../Resources"
import {GameConfig} from "../GameConfig";

type RNG = any;

// === JOB GAUGE AND STATE ===
export class BLMState implements JobState {
	gameState: GameState;
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];

	thunderTickOffset: number;

	// @ts-ignore
	constructor(gameState) {
		this.gameState = gameState;
		this.config = gameState.config;
		this.rng = gameState.rng;
		this.nonProcRng = gameState.nonProcRng;
		this.resources = gameState.resources;
		this.cooldowns = gameState.cooldowns;
		this.eventsQueue = gameState.eventsQueue;

		this.thunderTickOffset = this.nonProcRng() * 3.0;

		// RESOURCES (checked when using skills)
		const polyglotStacks = 
			(Traits.hasUnlocked(TraitName.EnhancedPolyglotII, this.config.level) && 3) ||
			(Traits.hasUnlocked(TraitName.EnhancedPolyglot, this.config.level) && 2) ||
			1;
		[
			new Resource(ResourceType.Polyglot, polyglotStacks, 0),
			new Resource(ResourceType.AstralFire, 3, 0),
			new Resource(ResourceType.UmbralIce, 3, 0),
			new Resource(ResourceType.UmbralHeart, 3, 0),
			new Resource(ResourceType.AstralSoul, 6, 0),
			new Resource(ResourceType.LeyLines, 1, 0), // capture
			new Resource(ResourceType.Enochian, 1, 0),
			new Resource(ResourceType.Paradox, 1, 0),
			new Resource(ResourceType.Firestarter, 1, 0),
			new Resource(ResourceType.Thunderhead, 1, 0),
			new DoTBuff(ResourceType.ThunderDoT, 1, 0),
			new Resource(ResourceType.Manaward, 1, 0),
			new Resource(ResourceType.Triplecast, 3, 0),
			new Resource(ResourceType.Addle, 1, 0),
			new Resource(ResourceType.Swiftcast, 1, 0),
			new DoTBuff(ResourceType.LucidDreaming, 1, 0),
			new Resource(ResourceType.Surecast, 1, 0),
			new Resource(ResourceType.Tincture, 1, 0), // capture
		].forEach((resource) => this.resources.set(resource));

		// skill CDs (also a form of resource)
		const manafontCooldown = (Traits.hasUnlocked(TraitName.EnhancedManafont, this.config.level) && 100) || 180;
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1),
			new CoolDown(ResourceType.cd_Transpose, 5, 1, 1),
			new CoolDown(ResourceType.cd_Manaward, 120, 1, 1),
			new CoolDown(ResourceType.cd_BetweenTheLines, 3, 1, 1),
			new CoolDown(ResourceType.cd_AetherialManipulation, 10, 1, 1),
			new CoolDown(ResourceType.cd_Triplecast, 60, 2, 2),

			new CoolDown(ResourceType.cd_Manafont, manafontCooldown, 1, 1),
			new CoolDown(ResourceType.cd_Amplifier, 120, 1, 1),
			new CoolDown(ResourceType.cd_Retrace, 40, 1, 1),
			new CoolDown(ResourceType.cd_Addle, 90, 1, 1),

			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
			new CoolDown(ResourceType.cd_LucidDreaming, 60, 1, 1),
			new CoolDown(ResourceType.cd_Surecast, 120, 1, 1),
			new CoolDown(ResourceType.cd_Tincture, 270, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));
	}

	addEvent(evt: Event) {
		this.gameState.addEvent(evt);
	}

	registerRecurringEvents() {
		// thunder DoT tick
		let recurringThunderTick = () => {
			let thunder = this.resources.get(ResourceType.ThunderDoT) as DoTBuff;
			if (thunder.available(1)) {// dot buff is effective
				thunder.tickCount++;
				if (thunder.node) { // aka this buff is applied by a skill (and not just from an override)
					// access potencies at index [1, 10] (since 0 is initial potency)
					let p = thunder.node.getPotencies()[thunder.tickCount];
					controller.resolvePotency(p);
				}
			}
			// increment count
			if (this.gameState.getDisplayTime() >= 0) {
				controller.reportDotTick(this.gameState.time);
			}
			// queue the next tick
			this.addEvent(new Event("thunder DoT tick", 3, ()=>{
				recurringThunderTick();
			}));
		};
		let timeTillFirstThunderTick = this.config.timeTillFirstManaTick + this.thunderTickOffset;
		while (timeTillFirstThunderTick > 3) timeTillFirstThunderTick -= 3;
		this.addEvent(new Event("initial thunder DoT tick", timeTillFirstThunderTick, recurringThunderTick));

		// also polyglot
		let recurringPolyglotGain = (rsc: Resource)=>{
			if (this.gameState.hasEnochian()) {
				if (rsc.availableAmount() === rsc.maxValue) {
					controller.reportWarning(WarningType.PolyglotOvercap);
				}
				rsc.gain(1);
			}
			this.resources.addResourceEvent({
				rscType: ResourceType.Polyglot,
				name: "gain polyglot if currently has enochian",
				delay: 30,
				fnOnRsc: recurringPolyglotGain
			});
		};
		recurringPolyglotGain(this.resources.get(ResourceType.Polyglot));
	}
}


// === SKILLS ===
// Abilities will display on the hotbar in the order they are declared here. If an ability has an
// `autoDowngrade` (i.e. it replaces a previous ability on the hotbar), it will not have its own
// slot and instead take the place of the downgrade ability.

const makeGCD_BLM = (name: SkillName, unlockLevel: number, params: Partial<{
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	aspect: Aspect,
	baseCastTime: number,
	baseManaCost: number,
	basePotency: number,
	applicationDelay: number,
	onCapture: any,  // TODO
	onApplication: any,  // TODO
}>): SkillInfo => makeGCD(ShellJob.BLM, name, unlockLevel, params);


const makeAbility_BLM =(name: SkillName, unlockLevel: number, cdName: ResourceType, params: Partial<{
	autoUpgrade: SkillAutoReplace,
	autoDowngrade: SkillAutoReplace,
	basePotency: number,
	applicationDelay: number,
	onCapture: any,  // TODO
	onApplication: any,  // TODO
}>): SkillInfo => makeAbility(ShellJob.BLM, name, unlockLevel, cdName, params);


// ref logs
// https://www.fflogs.com/reports/KVgxmW9fC26qhNGt#fight=16&type=summary&view=events&source=6
// https://www.fflogs.com/reports/rK87bvMFN2R3Hqpy#fight=1&type=casts&source=7
// https://www.fflogs.com/reports/cNpjtRXHhZ8Az2V3#fight=last&type=damage-done&view=events&ability=36987
// https://www.fflogs.com/reports/7NMQkxLzcbptw3Xd#fight=15&type=damage-done&source=116&view=events&ability=36986
makeGCD_BLM(SkillName.Blizzard, 1, {
	aspect: Aspect.Ice,
	baseCastTime: 2.5,
	baseManaCost: 400,
	basePotency: 180,
	applicationDelay: 0.846,
});

makeGCD_BLM(SkillName.Fire, 2, {
	aspect: Aspect.Fire,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 180,
	applicationDelay: 1.871,
});

makeAbility_BLM(SkillName.Transpose, 4, ResourceType.cd_Transpose, {
	applicationDelay: 0, // instant
});

makeGCD_BLM(SkillName.Thunder3, 45, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 120,
	applicationDelay: 0.757, // Unknown damage application, copied from HT
	autoUpgrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeAbility_BLM(SkillName.Manaward, 30, ResourceType.cd_Manaward, {
	applicationDelay: 1.114, // delayed
});

// Manafont: application delay 0.88s -> 0.2s since Dawntrail
// infact most effects seem instant but MP gain is delayed.
// see screen recording: https://drive.google.com/file/d/1zGhU9egAKJ3PJiPVjuRBBMkKdxxHLS9b/view?usp=drive_link
makeAbility_BLM(SkillName.Manafont, 30, ResourceType.cd_Manafont, {
	applicationDelay: 0.2, // delayed
});

makeGCD_BLM(SkillName.Fire3, 35, {
	aspect: Aspect.Fire,
	baseCastTime: 3.5,
	baseManaCost: 2000,
	basePotency: 280,
	applicationDelay: 1.292,
});

makeGCD_BLM(SkillName.Blizzard3, 35, {
	aspect: Aspect.Ice,
	baseCastTime: 3.5,
	baseManaCost: 800,
	basePotency: 280,
	applicationDelay: 0.89,
});

makeGCD_BLM(SkillName.Freeze, 40, {
	aspect: Aspect.Ice,
	baseCastTime: 2.8,
	baseManaCost: 1000,
	basePotency: 120,
	applicationDelay: 0.664,
});

makeGCD_BLM(SkillName.Flare, 50, {
	aspect: Aspect.Fire,
	baseCastTime: 4,
	baseManaCost: 0,  // mana is handled separately
	basePotency: 240,
	applicationDelay: 1.157,
});


makeAbility_BLM(SkillName.LeyLines, 52, ResourceType.cd_LeyLines, {
	applicationDelay: 0.49, // delayed
});

makeGCD_BLM(SkillName.Blizzard4, 58, {
	aspect: Aspect.Ice,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.156,
});

makeGCD_BLM(SkillName.Fire4, 60, {
	aspect: Aspect.Fire,
	baseCastTime: 2.8,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.159,
});

makeAbility_BLM(SkillName.BetweenTheLines, 62, ResourceType.cd_BetweenTheLines, {
	applicationDelay: 0, // ?
});

makeAbility_BLM(SkillName.AetherialManipulation, 50, ResourceType.cd_AetherialManipulation, {
	applicationDelay: 0, // ?
});

makeAbility_BLM(SkillName.Triplecast, 52, ResourceType.cd_Triplecast, {
	applicationDelay: 0, // instant
});


makeGCD_BLM(SkillName.Foul, 70, {
	baseCastTime: 2.5,
	baseManaCost: 0,
	basePotency: 600,
	applicationDelay: 1.158,
});

makeGCD_BLM(SkillName.Despair, 72, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0, // mana handled separately, like flare
	basePotency: 350,
	applicationDelay: 0.556,
});

// Umbral Soul: immediate snapshot & UH gain; delayed MP gain
// see screen recording: https://drive.google.com/file/d/1nsO69O7lgc8V_R_To4X0TGalPsCus1cg/view?usp=drive_link
makeGCD_BLM(SkillName.UmbralSoul, 35, {
	aspect: Aspect.Ice,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 0,
	applicationDelay: 0.633,
});

makeGCD_BLM(SkillName.Xenoglossy, 80, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 880,
	applicationDelay: 0.63,
});

makeGCD_BLM(SkillName.Fire2, 18, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 80,
	applicationDelay: 1.154, // Unknown damage application, copied from HF2
	autoUpgrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.HighFire2 },
});

makeGCD_BLM(SkillName.Blizzard2, 12, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 80,
	applicationDelay: 1.158, // Unknown damage application, copied from HB2
	autoUpgrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.HighBlizzard2 },
});

makeGCD_BLM(SkillName.HighFire2, 82, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 100,
	applicationDelay: 1.154,
	autoDowngrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.Fire2 },
});

makeGCD_BLM(SkillName.HighBlizzard2, 82, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 100,
	applicationDelay: 1.158,
	autoDowngrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.Blizzard2 },
});

makeAbility_BLM(SkillName.Amplifier, 86, ResourceType.cd_Amplifier, {
	applicationDelay: 0, // ? (assumed to be instant)
});

makeGCD_BLM(SkillName.Paradox, 90, {
	baseCastTime: 0,
	baseManaCost: 1600,
	basePotency: 520,
	applicationDelay: 0.624,
});

makeGCD_BLM(SkillName.HighThunder, 92, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 150,
	applicationDelay: 0.757,
	autoDowngrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeGCD_BLM(SkillName.FlareStar, 100, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0,
	basePotency: 400,
	applicationDelay: 0.622,
});

makeAbility_BLM(SkillName.Retrace, 96, ResourceType.cd_Retrace, {
	applicationDelay: 0, // ? (assumed to be instant)
});

