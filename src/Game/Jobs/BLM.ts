// Skill and state declarations for BLM.

import {controller} from "../../Controller/Controller";

import {ShellJob} from "../../Controller/Common";
import {SkillName, Aspect, ResourceType, WarningType} from "../Common";
import {
	makeAbility,
	makeSpell,
	makeResourceAbility,
	validateOrSkillError,
	SkillAutoReplace,
	Skill,
	ValidateAttemptFn,
	EffectFn,
} from "../Skills";
import {Traits, TraitName} from "../Traits";
import {JobState, PlayerState, GameState} from "../GameState";
import {CoolDown, CoolDownState, DoTBuff, Event, Resource, ResourceState} from "../Resources"
import {GameConfig} from "../GameConfig";

type RNG = any;

// === JOB GAUGE AND STATE ===
export class BLMState extends GameState {
	gameState: GameState;
	config: GameConfig;
	rng: RNG;
	nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event<BLMState>[];

	thunderTickOffset: number;

	constructor(config: GameConfig) {
		super(config);

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

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).availableAmount(); }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).availableAmount(); }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).availableAmount(); }
	getMP() { return this.resources.get(ResourceType.Mana).availableAmount(); }

	gainThunderhead() {
		let thunderhead = this.resources.get(ResourceType.Thunderhead);
		// [6/29/24] note: from screen recording it looks more like: button press (0.1s) gain buff (30.0s) lose buff
		// see: https://drive.google.com/file/d/11KEAEjgezCKxhvUsaLTjugKAH_D1glmy/view?usp=sharing
		let duration = 30;
		if (thunderhead.available(1)) { // already has a proc; reset its timer
			thunderhead.overrideTimer(this, duration);
		} else { // there's currently no proc. gain one.
			thunderhead.gain(1);
			this.resources.addResourceEvent({
				rscType: ResourceType.Thunderhead,
				name: "drop thunderhead",
				delay: duration,
				fnOnRsc: (rsc: Resource) => {
					rsc.consume(1);
				}
			});
		}
	}

	// call this whenever gaining af or ui from a different af/ui/unaspected state
	switchToAForUI(rscType: ResourceType.AstralFire | ResourceType.UmbralIce, numStacksToGain: number) {
		console.assert(numStacksToGain > 0);

		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		let as = this.resources.get(ResourceType.AstralSoul);

		if (rscType===ResourceType.AstralFire)
		{
			if (af.availableAmount() === 0) {
				this.gainThunderhead();
			}
			af.gain(numStacksToGain);

			if (Traits.hasUnlocked(TraitName.AspectMasteryV, this.config.level)) {
				if (ui.available(3) && uh.available(3)) {
					paradox.gain(1);
				}  
			}

			ui.consume(ui.availableAmount());
		}
		else if (rscType===ResourceType.UmbralIce)
		{
			if (ui.availableAmount() === 0) {
				this.gainThunderhead();
			}
			ui.gain(numStacksToGain);

			if (Traits.hasUnlocked(TraitName.AspectMasteryV, this.config.level)) {
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
		switch(this.resources.get(ResourceType.UmbralIce).availableAmount()) {
			case 1: mpToGain = 2500;  break;
			case 2: mpToGain = 5000;  break;
			case 3: mpToGain = 10000; break;
			default: mpToGain = 0; break;
		}
		this.addEvent(new Event(
			"gain umbral mana",
				effectApplicationDelay,
			() => {
				this.resources.get(ResourceType.Mana).gain(mpToGain);
			}));
	}

	captureManaCostAndUHConsumption(aspect: Aspect, baseManaCost: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let manaCost;
		let uhConsumption = 0;

		if (aspect === Aspect.Fire) {
			manaCost = baseManaCost * mod.manaCostFire;
			uhConsumption = mod.uhConsumption;
		}
		else if (aspect === Aspect.Ice) {
			manaCost = baseManaCost * mod.manaCostIce;
		}
		else {
			manaCost = baseManaCost;
		}
		return [manaCost, uhConsumption];
	}

	captureSpellCastTimeAFUI(aspect: Aspect, llAdjustedCastTime: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = llAdjustedCastTime;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return castTime;
	}

	hasEnochian() {
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		let enochian = this.resources.get(ResourceType.Enochian);
		return enochian.available(1);
	}

	// falls off after 15s unless refreshed by AF / UI
	startOrRefreshEnochian() {
		let enochian = this.resources.get(ResourceType.Enochian);

		if (enochian.available(1) && enochian.pendingChange) {
			// refresh timer (if there's already a timer)
			enochian.overrideTimer(this, 15);

		} else {
			// reset polyglot countdown to 30s if enochian wasn't actually active
			if (!enochian.available(1)) {
				this.resources.get(ResourceType.Polyglot).overrideTimer(this, 30);
			}

			// either fresh gain, or there's enochian but no timer
			enochian.gain(1);

			// add the event for losing it
			this.resources.addResourceEvent({
				rscType: ResourceType.Enochian,
				name: "lose enochian, clear all AF, UI, UH, stop poly timer",
				delay: 15,
				fnOnRsc: rsc=>{
					this.loseEnochian();
				}
			});
		}
	}

	loseEnochian() {
		this.resources.get(ResourceType.Enochian).consume(1);
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		let as = this.resources.get(ResourceType.AstralSoul);

		af.consume(af.availableAmount());
		ui.consume(ui.availableAmount());
		uh.consume(uh.availableAmount());
		paradox.consume(paradox.availableAmount());
		as.consume(as.availableAmount());
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
	validateAttempt: ValidateAttemptFn,
	onConfirm: EffectFn,
	onApplication: EffectFn,
}>): Skill<BLMState> => makeSpell(ShellJob.BLM, name, unlockLevel, {
	autoUpgrade: params.autoUpgrade,
	autoDowngrade: params.autoDowngrade,
	aspect: params.aspect,
	castTime: (state) => state.captureSpellCastTimeAFUI(params.baseCastTime ?? 0),
	// TODO split up UH consumption
	manaCost: (state) => state.captureManaCostAndUHConsumption(params.aspect ?? Aspect.other, params.baseManaCost ?? 0)[0],
	// TODO apply AFUI modifiers?
	potency: (state) => basePotency,
	applicationDelay: params.applicationDelay,
	isInstantFn: (state) => (
		// The expressions here are very sensitive to order, as the short-circuiting logic determines 
		// which buffs to consume first.
		// Priority of instant cast buff consumption:
		// 0. Always instant: Scathe (lol), Umbral Soul
		// 1. Instant with specific resources: Paradox, Xeno/Foul, F3P, T3P (rip).
		//    Do not consume para marker/polyglot yet here, since at lvl 70 Foul still consumes poly despite not being instant.
		// 2. Swift
		// 3. Triple

		// Paradox made instant via Dawntrail
		(name === SkillName.UmbralSoul || name === SkillName.Paradox) ||
		// Xenoglossy and Foul after lvl 80; consume polyglot if available
		(
			((name === SkillName.Foul && Traits.hasUnlocked(TraitName.EnhancedFoul, state.config.level)) ||
				name === SkillName.Xenoglossy)
		) ||
		// F3P
		(name === SkillName.Fire3 && state.tryConsumeResource(ResourceType.Firestarter)) ||
		// Swift
		state.tryConsumeResource(ResourceType.Swift) ||
		// Triple
		state.tryConsumeResource(ResourceType.Triple)
	),
	onConfirm: params.onConfirm,
	onApplication: params.onApplication,
});


const makeAbility_BLM =(name: SkillName, unlockLevel: number, cdName: ResourceType, params: Partial<{
	applicationDelay: number,
	onConfirm: EffectFn,
	onApplication: EffectFn,
}>): Skill<BLMState> => makeAbility(ShellJob.BLM, name, unlockLevel, cdName, params);


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
	onConfirm: (state) => {
		// Refresh Enochian and gain a UI stack at the cast confirm window, not the damage application.
		// MP is regained on damage application (TODO)
		if (state.getFireStacks() === 0) { // no AF
			state.switchToAForUI(ResourceType.UmbralIce, 1);
			state.startOrRefreshEnochian();
		} else { // in AF
			state.resources.get(ResourceType.Enochian).removeTimer();
			state.loseEnochian()
		}
	},
});

const gainFirestarterProc = (game: PlayerState): Event<BLMState>[] => {
	// re-measured in DT, screen recording at: https://drive.google.com/file/d/1MEFnd-m59qx1yIaZeehSsAxjhLMsWBuw/view?usp=drive_link
	let duration = 30.5;
	if (game.resources.get(ResourceType.Firestarter).available(1)) {
		state.resources.get(ResourceType.Firestarter).overrideTimer(state, duration);
		return [];
	} else {
		state.resources.get(ResourceType.Firestarter).gain(1);
		return [new Event("drop firestarter proc", duration, (state) => state.resources.get(ResourceType.Firestarter).consume(1))];
	}
};

const potentiallyGainFirestarter = (game: PlayerState): Event<BLMState>[] => {
	let rand = game.rng();
	if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) {
		return gainFirestarterProc(game);
	} else {
		return [];
	}
};

makeGCD_BLM(SkillName.Fire, 2, {
	aspect: Aspect.Fire,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 180,
	applicationDelay: 1.871,
	// TODO make sure MP cost is figured out
	onConfirm: (state) => {
		// Refresh Enochian and gain a UI stack at the cast confirm window, not the damage application.
		const f3p = potentiallyGainFirestarter(state);
		if (state.getIceStacks() === 0) { // in fire or no enochian
			state.switchToAForUI(ResourceType.AstralFire, 1);
			state.startOrRefreshEnochian();
		} else { // in UI
			state.resources.get(ResourceType.Enochian).removeTimer();
			state.loseEnochian()
		}
		return f3p;
	},
});

makeAbility_BLM(SkillName.Transpose, 4, ResourceType.cd_Transpose, {
	applicationDelay: 0, // instant
	validateAttempt: validateOrSkillError(
		(state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
		"must be in AF or UI to cast Transpose"
	),
	onApplication: (state) => {
		if (state.getFireStacks() === 0 && state.getIceStacks() === 0) {
			return [];
		}
		state.switchToAForUI(state.getFireStacks() > 0 ? Resource.UmbralIce : Resource.AstralFire, 1);
		state.startOrRefreshEnochian();
		return [];
	},
});

const applyThunderDoT = (game: PlayerState, node: ActionNode, skillName: SkillName) => {
	let thunder = game.resources.get(ResourceType.ThunderDoT) as DoTBuff;
	const thunderDuration = (skillName === SkillName.Thunder3 && 27) || 30;
	if (thunder.available(1)) {
		console.assert(thunder.node);
		(thunder.node as ActionNode).removeUnresolvedPotencies();

		thunder.overrideTimer(game, thunderDuration);
	} else {
		thunder.gain(1);
		controller.reportDotStart(game.getDisplayTime());
		// TODO return this instead of using a side effect
		game.resources.addResourceEvent({
			rscType: ResourceType.ThunderDoT,
			name: "drop thunder DoT",
			delay: thunderDuration,
			fnOnRsc: rsc=>{
				  rsc.consume(1);
				  controller.reportDotDrop(game.getDisplayTime());
			 }
		});
	}
	thunder.node = node;
	thunder.tickCount = 0;
};

const addThunderPotencies = (node: ActionNode, skillName: SkillName.Thunder3 | SkillName.HighThunder) => {
	let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Lightning);
	let thunder = skillsList.get(skillName);

	// initial potency
	let pInitial = new Potency({
		config: controller.record.config ?? controller.gameConfig,
		sourceTime: game.getDisplayTime(),
		sourceSkill: skillName,
		aspect: Aspect.Lightning,
		basePotency: thunder ? thunder.info.basePotency : 150,
		snapshotTime: undefined,
		description: ""
	});
	pInitial.modifiers = mods;
	node.addPotency(pInitial);

	// dots
	const thunderTicks = (skillName === SkillName.Thunder3 && 9) || 10;
	const thunderTickPotency = (skillName === SkillName.Thunder3 && 50) || 60;
	for (let i = 0; i < thunderTicks; i++) {
		let pDot = new Potency({
			config: controller.record.config ?? controller.gameConfig,
			sourceTime: game.getDisplayTime(),
			sourceSkill: skillName,
			aspect: Aspect.Lightning,
			basePotency: game.config.adjustedDoTPotency(thunderTickPotency),
			snapshotTime: undefined,
			description: "DoT " + (i+1) + `/${thunderTicks}`
		});
		pDot.modifiers = mods;
		node.addPotency(pDot);
	}
};

const thunderConfirm = (skillName: SkillName.Thunder3 | SkillName.HighThunder) => (
	(game: PlayerState, node: ActionNode) => {
		// potency
		addThunderPotencies(node, skillName); // should call on capture
		let onHitPotency = node.getPotencies()[0];
		node.getPotencies().forEach(p=>{ p.snapshotTime = game.getDisplayTime(); });

		// tincture
		if (game.resources.get(ResourceType.Tincture).available(1)) {
			node.addBuff(BuffType.Tincture);
		}

		let thunderhead = game.resources.get(ResourceType.Thunderhead);
		thunderhead.consume(1);
		thunderhead.removeTimer();
	}
);

makeGCD_BLM(SkillName.Thunder3, 45, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 120,
	applicationDelay: 0.757, // Unknown damage application, copied from HT
	onConfirm: thunderConfirm(Skill.Thunder3),
	onApplication: (state, node) => {
		controller.resolvePotency(onHitPotency);
		applyThunderDoT(game, node, skillName);
	},
	autoUpgrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeResourceAbility(ShellJob.BLM, SkillName.Manaward, 30, ResourceType.cd_Manaward, {
	rscType: ResourceType.Manaward,
	applicationDelay: 1.114, // delayed
	duration: 20,
});

// Manafont: application delay 0.88s -> 0.2s since Dawntrail
// infact most effects seem instant but MP gain is delayed.
// see screen recording: https://drive.google.com/file/d/1zGhU9egAKJ3PJiPVjuRBBMkKdxxHLS9b/view?usp=drive_link
makeResourceAbility(SkillName.Manafont, 30, ResourceType.cd_Manafont, {
	applicationDelay: 0.2, // delayed
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.AstralFire).availableAmount() > 0,
		"must be in AF to cast Manafont",
	),
	onConfirm: (state) => {
		state.resources.get(ResourceType.AstralFire).gain(3);
		state.resources.get(ResourceType.UmbralHeart).gain(3);

		if (Traits.hasUnlocked(TraitName.AspectMasteryV, state.config.level))
			state.resources.get(ResourceType.Paradox).gain(1);

		state.gainThunderhead();
		state.startOrRefreshEnochian();
	},
	onApplication: (state) => {
		state.resources.get(ResourceType.Mana).gain(10000)
	},
});

makeGCD_BLM(SkillName.Fire3, 35, {
	aspect: Aspect.Fire,
	baseCastTime: 3.5,
	baseManaCost: 2000,
	basePotency: 280,
	applicationDelay: 1.292,
	onConfirm: (state) => {
		// Firestarter consumption is handled in makeGCD_BLM
		state.switchToAForUI(ResourceType.AstralFire, 3);
		state.startOrRefreshEnochian();
	},
});

makeGCD_BLM(SkillName.Blizzard3, 35, {
	aspect: Aspect.Ice,
	baseCastTime: 3.5,
	baseManaCost: 800,
	basePotency: 280,
	applicationDelay: 0.89,
	onConfirm: (state) => {
		state.switchToAForUI(ResourceType.UmbralIce, 3);
		state.startOrRefreshEnochian();
	},
});

makeGCD_BLM(SkillName.Freeze, 40, {
	aspect: Aspect.Ice,
	baseCastTime: 2.8,
	baseManaCost: 1000,
	basePotency: 120,
	applicationDelay: 0.664,
	validateAttempt: validateOrSkillError((state) => state.getIceStacks() > 0, "must be in UI to cast Freeze"),
	onConfirm: (state) => state.resources.get(ResourceType.UmbralHeart).gain(3),
});

makeGCD_BLM(SkillName.Flare, 50, {
	aspect: Aspect.Fire,
	baseCastTime: 4,
	baseManaCost: 0,  // mana is handled separately
	basePotency: 240,
	applicationDelay: 1.157,
	validateAttempt: (state) => {
		if (state.getFireStacks() === 0) {
			return { message: "must be in AF to cast Flare" };
		} else if (state.getMP() < 800) {
			return { message: "must have at least 800 MP to cast Flare" };
		}
		return undefined; // no errors
	},
	onConfirm: (state) => {
		let uh = state.resources.get(ResourceType.UmbralHeart);
		let mana = state.resources.get(ResourceType.Mana);
		let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
		// mana
		state.resources.get(ResourceType.Mana).consume(manaCost);
		uh.consume(uh.availableAmount());
		// +3 AF; refresh enochian
		state.resources.get(ResourceType.AstralFire).gain(3);

		if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, game.config.level))
			state.resources.get(ResourceType.AstralSoul).gain(3);

		state.startOrRefreshEnochian();
	},
});

makeResourceAbility(ShellJob.BLM, SkillName.LeyLines, 52, ResourceType.cd_LeyLines, {
	rscType: ResourceType.LeyLines,
	applicationDelay: 0.49, // delayed
	duration: 30,
	onApplication: (state) => {
		state.resources.get(ResourceType.LeyLines).enabled = true
	},
});

makeGCD_BLM(SkillName.Blizzard4, 58, {
	aspect: Aspect.Ice,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.156,
	validateAttempt: validateOrSkillError((state) => state.getIceStacks() > 0, "must be in UI to cast Blizzard 4"),
	onConfirm: (state) => state.resources.get(ResourceType.UmbralHeart).gain(3),
});

makeGCD_BLM(SkillName.Fire4, 60, {
	aspect: Aspect.Fire,
	baseCastTime: 2.8,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.159,
	validateAttempt: validateOrSkillError((state) => state.getFireStacks() > 0, "must be in AF to cast Fire 4"),
	onConfirm: (state) => {
		if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, state.config.level))
			state.resources.get(ResourceType.AstralSoul).gain(1);
	},
});

makeAbility_BLM(SkillName.BetweenTheLines, 62, ResourceType.cd_BetweenTheLines, {
	applicationDelay: 0, // ?
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0,
		"must have active Ley Lines to cast Between the Lines",
	),
});

makeAbility_BLM(SkillName.AetherialManipulation, 50, ResourceType.cd_AetherialManipulation, {
	applicationDelay: 0, // ?
});

makeAbility_BLM(SkillName.Triplecast, 66, ResourceType.cd_Triplecast, {
	applicationDelay: 0, // instant
	onApplication: (state) => {
		const triple = state.resources.get(ResourceType.Triplecast)
		if (triple.pendingChaing) triple.removeTimer();
		triple.gain(3);
		return [new Event(
			"drop remaining triplecast charges",
			15.7, // 15.7s: see screen recording: https://drive.google.com/file/d/1qoIpAMK2KAKETgID6a3p5dqkeWRcNDdB/view?usp=drive_link
			(state) => {
				const rsc = state.resources.get(ResourceType.Triplecast);
				rsc.consume(rsc.availableAmount());
			},
		)];
	},
});

makeGCD_BLM(SkillName.Foul, 70, {
	baseCastTime: 2.5,
	baseManaCost: 0,
	basePotency: 600,
	applicationDelay: 1.158,
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.Polyglot).available(1),
		"must have Polyglot stacks to cast Foul",
	),
	onConfirm: (state) => state.resources.get(ResourceType.Polyglot).consume(1),
});

makeGCD_BLM(SkillName.Despair, 72, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0, // mana handled separately, like flare
	basePotency: 350,
	applicationDelay: 0.556,
	validateAttempt: (state) => {
		if (state.getFireStacks() === 0) {
			return { message: "must be in AF to cast Despair" };
		} else if (state.getMP() < 800) {
			return { message: "must have at least 800 MP to cast Despair" };
		}
		return undefined; // no error
	},
});

// Umbral Soul: immediate snapshot & UH gain; delayed MP gain
// see screen recording: https://drive.google.com/file/d/1nsO69O7lgc8V_R_To4X0TGalPsCus1cg/view?usp=drive_link
makeGCD_BLM(SkillName.UmbralSoul, 35, {
	aspect: Aspect.Ice,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 0,
	applicationDelay: 0.633,
	validateAttempt: validateOrSkillError((state) => state.getIceStacks() > 0, "must be in UI to cast Umbral Soul"),
	onConfirm: (state) => {
		state.resources.get(ResourceType.UmralIce).gain(1);
		state.resources.get(ResourceType.UmbralHeart).gain(1);
		game.startOrRefreshEnochian();
		// halt
		let enochian = game.resources.get(ResourceType.Enochian);
		enochian.removeTimer();
	},
});

makeGCD_BLM(SkillName.Xenoglossy, 80, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 880,
	applicationDelay: 0.63,
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.Polyglot).available(1),
		"must have Polyglot stacks to cast Xenoglossy",
	),
	onConfirm: (state) => state.resources.get(ResourceType.Polyglot).consume(1),
});

makeGCD_BLM(SkillName.Fire2, 18, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 80,
	applicationDelay: 1.154, // Unknown damage application, copied from HF2
	autoUpgrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.HighFire2 },
	onConfirm: (state) => {
		state.switchToAForUI(ResourceType.AstralFire, 3);
		state.startOrRefreshEnochian();
	},
});

makeGCD_BLM(SkillName.Blizzard2, 12, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 80,
	applicationDelay: 1.158, // Unknown damage application, copied from HB2
	autoUpgrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.HighBlizzard2 },
	onConfirm: (state) => {
		state.switchToAForUI(ResourceType.UmbralIce, 3);
		state.startOrRefreshEnochian();
	},
});

makeGCD_BLM(SkillName.HighFire2, 82, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 100,
	applicationDelay: 1.154,
	autoDowngrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.Fire2 },
	onConfirm: (state) => {
		state.switchToAForUI(ResourceType.AstralFire, 3);
		state.startOrRefreshEnochian();
	},
});

makeGCD_BLM(SkillName.HighBlizzard2, 82, {
	aspect: Aspect.Ice,
	baseCastTime: 3,
	baseManaCost: 800,
	basePotency: 100,
	applicationDelay: 1.158,
	autoDowngrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.Blizzard2 },
	onConfirm: (state) => {
		state.switchToAForUI(ResourceType.UmbralIce, 3);
		state.startOrRefreshEnochian();
	},
});

makeAbility_BLM(SkillName.Amplifier, 86, ResourceType.cd_Amplifier, {
	applicationDelay: 0, // ? (assumed to be instant)
	validateAttempt: validateOrSkillError(
		(state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
		"must be in AF or UI to cast Amplifier"
	),
	onApplication: (state) => {
		let polyglot = state.resources.get(ResourceType.Polyglot);
		if (polyglot.available(polyglot.maxValue)) {
			controller.reportWarning(WarningType.PolyglotOvercap)
		}
		polyglot.gain(1);
	},
});

makeGCD_BLM(SkillName.Paradox, 90, {
	baseCastTime: 0,
	baseManaCost: 1600,
	basePotency: 520,
	applicationDelay: 0.624,
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.Paradox).available(1),
		"must have Paradox marker to cast Paradox"
	),
	onConfirm: (state) => {
		state.resources.get(ResourceType.Paradox).consume(1);
		if (state.hasEnochian()) {
			state.startOrRefreshEnochian();
		}
		if (game.getIceStacks() > 0) {
			game.resources.get(ResourceType.UmbralIce).gain(1);
		} else if (game.getFireStacks() > 0) {
			game.resources.get(ResourceType.AstralFire).gain(1);
			return gainFirestarterProc(game);
		} else {
			console.error("cannot cast Paradox outside of AF/UI");
		}
		return [];
	},
});

makeGCD_BLM(SkillName.HighThunder, 92, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 150,
	applicationDelay: 0.757,
	onConfirm: thunderConfirm,
	onApplication: (state, node) => {
		controller.resolvePotency(onHitPotency);
		applyThunderDoT(game, node, skillName);
	},
	autoDowngrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeGCD_BLM(SkillName.FlareStar, 100, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0,
	basePotency: 400,
	applicationDelay: 0.622,
	validateAttempt: validateOrSkillError(
		(state) => state.resources.get(ResourceType.AstralSoul).available(6),
		"must have 6 Astral Souls to cast Paradox"
	),
	onConfirm: (state) => state.resources.get(ResourceType.AstralSoul).consume(6),
});

makeAbility_BLM(SkillName.Retrace, 96, ResourceType.cd_Retrace, {
	applicationDelay: 0, // ? (assumed to be instant)
	validateAttempt: validateOrSkillError(
		(state) => (Traits.hasUnlocked(TraitName.EnhancedLeyLines, state.config.level) &&
			state.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0),
		"must have active Ley Lines in order to cast Retrace",
	),
	onConfirm: (state) => {
		state.resources.get(ResourceType.LeyLines).enabled = true;
	},
});
