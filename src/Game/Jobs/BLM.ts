// Skill and state declarations for BLM.

import {StatsModifier} from "../StatsModifier";
import {controller} from "../../Controller/Controller";
import {ActionNode} from "../../Controller/Record";
import {ShellJob} from "../../Controller/Common";
import {Aspect, BuffType, ProcMode, ResourceType, SkillName, WarningType} from "../Common";
import {getPotencyModifiersFromResourceState, Potency} from "../Potency";
import {
	Ability,
	combineEffects,
	ConditionalSkillReplace,
	EffectFn,
	getSkill,
	makeAbility,
	makeResourceAbility,
	makeSpell,
	NO_EFFECT,
	SkillAutoReplace,
	Spell,
	ValidateAttemptFn,
} from "../Skills";
import {TraitName, Traits} from "../Traits";
import {GameState, PlayerState} from "../GameState";
import {getResourceInfo, makeResource, CoolDown, DoTBuff, Event, Resource, ResourceInfo} from "../Resources"
import {GameConfig} from "../GameConfig";

// === JOB GAUGE ELEMENTS AND STATUS EFFECTS ===
// TODO values changed by traits are handled in the class constructor, should be moved here
const makeBLMResource = (rsc: ResourceType, maxValue: number, params?: {timeout: number}) => {
	makeResource(ShellJob.BLM, rsc, maxValue, params ?? {});
};

makeBLMResource(ResourceType.Polyglot, 3, {timeout: 30});
makeBLMResource(ResourceType.AstralFire, 3);
makeBLMResource(ResourceType.UmbralIce, 3);
makeBLMResource(ResourceType.UmbralHeart, 3);
makeBLMResource(ResourceType.AstralSoul, 6);
makeBLMResource(ResourceType.LeyLines, 1, {timeout: 30});
makeBLMResource(ResourceType.Enochian, 1, {timeout: 15});
makeBLMResource(ResourceType.Paradox, 1);

// re-measured in DT, screen recording at: https://drive.google.com/file/d/1MEFnd-m59qx1yIaZeehSsAxjhLMsWBuw/view?usp=drive_link
makeBLMResource(ResourceType.Firestarter, 1, {timeout: 30.5});

// [6/29/24] note: from screen recording it looks more like: button press (0.1s) gain buff (30.0s) lose buff
// see: https://drive.google.com/file/d/11KEAEjgezCKxhvUsaLTjugKAH_D1glmy/view?usp=sharing
makeBLMResource(ResourceType.Thunderhead, 1, {timeout: 30});
makeBLMResource(ResourceType.ThunderDoT, 1, {timeout: 30}); // TODO
makeBLMResource(ResourceType.Manaward, 1, {timeout: 20});

// 15.7s: see screen recording: https://drive.google.com/file/d/1qoIpAMK2KAKETgID6a3p5dqkeWRcNDdB/view?usp=drive_link
makeBLMResource(ResourceType.Triplecast, 3, {timeout: 15.7});
makeBLMResource(ResourceType.Addle, 1, {timeout: 15});
makeBLMResource(ResourceType.Swiftcast, 1, {timeout: 10});
makeBLMResource(ResourceType.LucidDreaming, 1, {timeout: 21});
makeBLMResource(ResourceType.Surecast, 1, {timeout: 10});

// === JOB GAUGE AND STATE ===
export class BLMState extends GameState {
	thunderTickOffset: number;

	constructor(config: GameConfig) {
		super(config);

		this.thunderTickOffset = this.nonProcRng() * 3.0;

		const polyglotStacks = 
			(Traits.hasUnlocked(TraitName.EnhancedPolyglotII, this.config.level) && 3) ||
			(Traits.hasUnlocked(TraitName.EnhancedPolyglot, this.config.level) && 2) ||
			1;
		this.resources.set(new Resource(ResourceType.Polyglot, polyglotStacks, 0));

		// skill CDs (also a form of resource)
		const manafontCooldown = (Traits.hasUnlocked(TraitName.EnhancedManafont, this.config.level) && 100) || 180;
		const swiftcastCooldown = (Traits.hasUnlocked(TraitName.EnhancedSwiftcast, this.config.level) && 40) || 60;
		[
			new CoolDown(ResourceType.cd_Manafont, manafontCooldown, 1, 1),
			new CoolDown(ResourceType.cd_Swiftcast, swiftcastCooldown, 1, 1),
		].forEach((cd) => this.cooldowns.set(cd));

		this.registerRecurringEvents();
	}

	registerRecurringEvents() {
		super.registerRecurringEvents();
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
			if (this.getDisplayTime() >= 0) {
				controller.reportDotTick(this.time);
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
			if (this.hasEnochian()) {
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
		const duration = (getResourceInfo(ShellJob.BLM, ResourceType.Thunderhead) as ResourceInfo).maxTimeout;
		if (thunderhead.available(1)) { // already has a proc; reset its timer
			thunderhead.overrideTimer(this, duration);
		} else { // there's currently no proc. gain one.
			thunderhead.gain(1);
			this.enqueueResourceDrop(ResourceType.Thunderhead);
		}
	}
	getThunderDotDuration() {
		return this.config.level >= getSkill(ShellJob.BLM, SkillName.HighThunder).unlockLevel ? 30 : 27;
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

	captureManaCost(name: SkillName, aspect: Aspect, baseManaCost: number) {
		// TODO handle flare/despair MP here instead of individual skills
		let mod = StatsModifier.fromResourceState(this.resources);

		if ((name === SkillName.Paradox && this.getIceStacks() > 0) ||
			(name === SkillName.Fire3 && this.hasResourceAvailable(ResourceType.Firestarter))
		) {
			return 0;
		}

		if (aspect === Aspect.Fire) {
			return baseManaCost * mod.manaCostFire;
		} else if (aspect === Aspect.Ice) {
			return baseManaCost * mod.manaCostIce;
		} else {
			return baseManaCost;
		}
	}

	captureSpellCastTimeAFUI(baseCastTime: number, aspect: Aspect) {
		// Apply AF/UI multiplier after ley lines
		const llAdjustedCastTime = this.config.adjustedCastTime(
			baseCastTime,
			this.hasResourceAvailable(ResourceType.LeyLines) ? ResourceType.LeyLines : undefined
		);
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = llAdjustedCastTime;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return castTime;
	}

	hasEnochian() {
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		return this.hasResourceAvailable(ResourceType.Enochian);
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
//
// If an ability appears on the hotbar only when replacing another ability, it should have
// `startOnHotbar` set to false, and `replaceIf` set appropriately on the abilities to replace.

const retraceCondition = (state: Readonly<BLMState>) => (
	state.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0
);

const paraCondition = (state: Readonly<BLMState>) => state.hasResourceAvailable(ResourceType.Paradox);

const makeGCD_BLM = (name: SkillName, unlockLevel: number, params: {
	replaceIf?: ConditionalSkillReplace<BLMState>[],
	startOnHotbar?: boolean,
	autoUpgrade?: SkillAutoReplace,
	autoDowngrade?: SkillAutoReplace,
	aspect?: Aspect,
	baseCastTime: number,
	baseManaCost: number,
	basePotency: number,
	applicationDelay: number,
	validateAttempt?: ValidateAttemptFn<BLMState>,
	onConfirm?: EffectFn<BLMState>,
	onApplication?: EffectFn<BLMState>,
}): Spell<BLMState> => {
	const aspect = params.aspect ?? Aspect.Other;
	let onConfirm: EffectFn<BLMState> = combineEffects(
		(state, node) => {
			// Consume swift/triple before anything else happens.
			// The code here is dependent on short-circuiting logic to consume the correct resources.
			// Non-swift/triple resources are consumed separately because they have secondary
			// implications on resource generation. However, they still need to be checked here
			// to avoid improperly spending swift/triple on an already-instant spell.
			params.baseCastTime === 0 ||
			(name === SkillName.Foul && Traits.hasUnlocked(TraitName.EnhancedFoul, state.config.level)) ||
			(name === SkillName.Fire3 && state.hasResourceAvailable(ResourceType.Firestarter)) ||
			// Consume Swift before Triple.
			state.tryConsumeResource(ResourceType.Swiftcast) ||
			state.tryConsumeResource(ResourceType.Triplecast)
		},
		(state, node) => {
			// put this before the spell's onConfirm to ensure F3P and other buffs aren't prematurely consumed
			// fire spells: attempt to consume umbral hearts
			// flare is handled separately because it wipes all hearts
			if (
				state.getFireStacks() > 0 &&
				aspect === Aspect.Fire &&
				![SkillName.Despair, SkillName.FlareStar, SkillName.Flare].includes(name) &&
				!(name === SkillName.Fire3 && state.hasResourceAvailable(ResourceType.Firestarter))
			) {
				state.tryConsumeResource(ResourceType.UmbralHeart)
			}
			// ice spells: gain mana on spell application if in UI
			// umbral mana amount snapshots the state at the cast confirm window,
			// not the new UI level after the spell is cast
			if (aspect === Aspect.Ice) {
				state.gainUmbralMana(params.applicationDelay);
			}
		},
		params.onConfirm ?? NO_EFFECT,
	);
	const onApplication: EffectFn<BLMState> = params.onApplication ?? NO_EFFECT;
	return makeSpell(ShellJob.BLM, name, unlockLevel, {
		replaceIf: params.replaceIf,
		startOnHotbar: params.startOnHotbar,
		autoUpgrade: params.autoUpgrade,
		autoDowngrade: params.autoDowngrade,
		aspect: aspect,
		castTime: (state) => state.captureSpellCastTimeAFUI(params.baseCastTime, aspect),
		manaCost: (state) => state.captureManaCost(name, aspect, params.baseManaCost),
		// TODO apply AFUI modifiers?
		potency: (state) => params.basePotency,
		validateAttempt: params.validateAttempt,
		applicationDelay: params.applicationDelay,
		isInstantFn: (state) => (
			// Foul after lvl 80
			(name === SkillName.Foul && Traits.hasUnlocked(TraitName.EnhancedFoul, state.config.level)) ||
			// F3P
			(name === SkillName.Fire3 && state.hasResourceAvailable(ResourceType.Firestarter)) ||
			// Swift
			state.hasResourceAvailable(ResourceType.Swiftcast) ||
			// Triple
			state.hasResourceAvailable(ResourceType.Triplecast)
		),
		onConfirm: onConfirm,
		onApplication: onApplication,
	});
};


const makeAbility_BLM =(name: SkillName, unlockLevel: number, cdName: ResourceType, params: {
	replaceIf?: ConditionalSkillReplace<BLMState>[],
	startOnHotbar?: boolean,
	applicationDelay?: number,
	cooldown: number,
	maxCharges?: number,
	validateAttempt?: ValidateAttemptFn<BLMState>,
	onConfirm?: EffectFn<BLMState>,
	onApplication?: EffectFn<BLMState>,
}): Ability<BLMState> => makeAbility(ShellJob.BLM, name, unlockLevel, cdName, params);


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
	onConfirm: (state, node) => {
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
	replaceIf: [{
		newSkill: SkillName.Paradox,
		condition: paraCondition,
	}],
});

const gainFirestarterProc = (state: PlayerState) => {
	let duration = (getResourceInfo(ShellJob.BLM, ResourceType.Firestarter) as ResourceInfo).maxTimeout;
	if (state.resources.get(ResourceType.Firestarter).available(1)) {
		state.resources.get(ResourceType.Firestarter).overrideTimer(state, duration);
	} else {
		state.resources.get(ResourceType.Firestarter).gain(1);
		state.enqueueResourceDrop(ResourceType.Firestarter, duration);
	}
};

const potentiallyGainFirestarter = (game: PlayerState) => {
	let rand = game.rng();
	if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) {
		gainFirestarterProc(game);
	}
};

makeGCD_BLM(SkillName.Fire, 2, {
	aspect: Aspect.Fire,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 180,
	applicationDelay: 1.871,
	onConfirm: (state, node) => {
		// Refresh Enochian and gain a UI stack at the cast confirm window, not the damage application.
		potentiallyGainFirestarter(state);
		if (state.getIceStacks() === 0) { // in fire or no enochian
			state.switchToAForUI(ResourceType.AstralFire, 1);
			state.startOrRefreshEnochian();
		} else { // in UI
			state.resources.get(ResourceType.Enochian).removeTimer();
			state.loseEnochian()
		}
	},
	replaceIf: [{
		newSkill: SkillName.Paradox,
		condition: paraCondition,
	}],
});

makeAbility_BLM(SkillName.Transpose, 4, ResourceType.cd_Transpose, {
	applicationDelay: 0, // instant
	cooldown: 5,
	validateAttempt: (state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
	onApplication: (state, node) => {
		if (state.getFireStacks() !== 0 || state.getIceStacks() !== 0) {
			state.switchToAForUI(state.getFireStacks() > 0 ? ResourceType.UmbralIce : ResourceType.AstralFire, 1);
			state.startOrRefreshEnochian();
		}
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

const addThunderPotencies = (game: PlayerState, node: ActionNode, skillName: SkillName.Thunder3 | SkillName.HighThunder) => {
	let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Lightning);
	let thunder = getSkill(ShellJob.BLM, skillName);

	// initial potency
	let pInitial = new Potency({
		config: controller.record.config ?? controller.gameConfig,
		sourceTime: game.getDisplayTime(),
		sourceSkill: skillName,
		aspect: Aspect.Lightning,
		basePotency: thunder ? thunder.potencyFn(game) : 150,
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
		addThunderPotencies(game, node, skillName); // should call on capture
		node.getPotencies().forEach(p=>{ p.snapshotTime = game.getDisplayTime(); });

		// tincture
		if (game.hasResourceAvailable(ResourceType.Tincture)) {
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
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Thunderhead),
	onConfirm: thunderConfirm(SkillName.Thunder3),
	onApplication: (state, node) => {
		// resolve the on-hit potency element (always the first of the node)
		controller.resolvePotency(node.getPotencies()[0]);
		applyThunderDoT(state, node, SkillName.Thunder3);
	},
	autoUpgrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeResourceAbility(ShellJob.BLM, SkillName.Manaward, 30, ResourceType.cd_Manaward, {
	rscType: ResourceType.Manaward,
	applicationDelay: 1.114, // delayed
	cooldown: 120,
});

// Manafont: application delay 0.88s -> 0.2s since Dawntrail
// infact most effects seem instant but MP gain is delayed.
// see screen recording: https://drive.google.com/file/d/1zGhU9egAKJ3PJiPVjuRBBMkKdxxHLS9b/view?usp=drive_link
makeAbility_BLM(SkillName.Manafont, 30, ResourceType.cd_Manafont, {
	applicationDelay: 0.2, // delayed
	cooldown: 100, // set by trait in the constructor
	validateAttempt: (state) => state.getFireStacks() > 0,
	onConfirm: (state, node) => {
		state = state as BLMState;
		state.resources.get(ResourceType.AstralFire).gain(3);
		state.resources.get(ResourceType.UmbralHeart).gain(3);

		if (Traits.hasUnlocked(TraitName.AspectMasteryV, state.config.level))
			state.resources.get(ResourceType.Paradox).gain(1);

		state.gainThunderhead();
		state.startOrRefreshEnochian();
	},
	onApplication: (state, node) => {
		state.resources.get(ResourceType.Mana).gain(10000)
	},
});

makeGCD_BLM(SkillName.Fire3, 35, {
	aspect: Aspect.Fire,
	baseCastTime: 3.5,
	baseManaCost: 2000,
	basePotency: 280,
	applicationDelay: 1.292,
	onConfirm: (state, node) => {
		state.tryConsumeResource(ResourceType.Firestarter);
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
	onConfirm: (state, node) => {
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
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => state.resources.get(ResourceType.UmbralHeart).gain(3),
});

makeGCD_BLM(SkillName.Flare, 50, {
	aspect: Aspect.Fire,
	baseCastTime: 4,
	baseManaCost: 0,  // mana is handled separately
	basePotency: 240,
	applicationDelay: 1.157,
	validateAttempt: (state) => state.getFireStacks() > 0 && state.getMP() >= 800,
	onConfirm: (state, node) => {
		let uh = state.resources.get(ResourceType.UmbralHeart);
		let mana = state.resources.get(ResourceType.Mana);
		let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
		// mana
		state.resources.get(ResourceType.Mana).consume(manaCost);
		uh.consume(uh.availableAmount());
		// +3 AF; refresh enochian
		state.resources.get(ResourceType.AstralFire).gain(3);

		if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, state.config.level))
			state.resources.get(ResourceType.AstralSoul).gain(3);

		state.startOrRefreshEnochian();
	},
});

makeResourceAbility(ShellJob.BLM, SkillName.LeyLines, 52, ResourceType.cd_LeyLines, {
	rscType: ResourceType.LeyLines,
	applicationDelay: 0.49, // delayed
	cooldown: 120,
	onApplication: (state, node) => {
		state.resources.get(ResourceType.LeyLines).enabled = true
	},
	replaceIf: [{
		newSkill: SkillName.Retrace,
		condition: retraceCondition,
	}],
});

makeGCD_BLM(SkillName.Blizzard4, 58, {
	aspect: Aspect.Ice,
	baseCastTime: 2.5,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.156,
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => state.resources.get(ResourceType.UmbralHeart).gain(3),
});

makeGCD_BLM(SkillName.Fire4, 60, {
	aspect: Aspect.Fire,
	baseCastTime: 2.8,
	baseManaCost: 800,
	basePotency: 320,
	applicationDelay: 1.159,
	validateAttempt: (state) => state.getFireStacks() > 0,
	onConfirm: (state, node) => {
		if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, state.config.level))
			state.resources.get(ResourceType.AstralSoul).gain(1);
	},
});

makeAbility_BLM(SkillName.BetweenTheLines, 62, ResourceType.cd_BetweenTheLines, {
	applicationDelay: 0, // ?
	cooldown: 3,
	validateAttempt: (state) => state.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0,
});

makeAbility_BLM(SkillName.AetherialManipulation, 50, ResourceType.cd_AetherialManipulation, {
	applicationDelay: 0, // ?
	cooldown: 10,
});

makeAbility_BLM(SkillName.Triplecast, 66, ResourceType.cd_Triplecast, {
	applicationDelay: 0, // instant
	cooldown: 60,
	maxCharges: 2,
	onApplication: (state, node) => {
		const triple = state.resources.get(ResourceType.Triplecast)
		if (triple.pendingChange) triple.removeTimer();
		triple.gain(3);
		state.enqueueResourceDrop(ResourceType.Triplecast);
	},
});

makeGCD_BLM(SkillName.Foul, 70, {
	baseCastTime: 2.5,
	baseManaCost: 0,
	basePotency: 600,
	applicationDelay: 1.158,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Polyglot),
	onConfirm: (state, node) => state.resources.get(ResourceType.Polyglot).consume(1),
});

makeGCD_BLM(SkillName.Despair, 72, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0, // mana handled separately, like flare
	basePotency: 350,
	applicationDelay: 0.556,
	validateAttempt: (state) => state.getFireStacks() > 0 && state.getMP() >= 800,
	onConfirm: (state, node) => {
		const mana = state.resources.get(ResourceType.Mana);
		const availableMana = mana.availableAmount();
		console.assert(availableMana >= 800, `tried to confirm despair at ${availableMana} MP`);
		mana.consume(availableMana);
		// +3 AF; refresh enochian
		state.resources.get(ResourceType.AstralFire).gain(3);
		state.startOrRefreshEnochian();
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
	validateAttempt: (state) => state.getIceStacks() > 0,
	onConfirm: (state, node) => {
		state.resources.get(ResourceType.UmbralIce).gain(1);
		state.resources.get(ResourceType.UmbralHeart).gain(1);
		state.startOrRefreshEnochian();
		// halt
		let enochian = state.resources.get(ResourceType.Enochian);
		enochian.removeTimer();
	},
});

makeGCD_BLM(SkillName.Xenoglossy, 80, {
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 880,
	applicationDelay: 0.63,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Polyglot),
	onConfirm: (state, node) => state.resources.get(ResourceType.Polyglot).consume(1),
});

makeGCD_BLM(SkillName.Fire2, 18, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 1500,
	basePotency: 80,
	applicationDelay: 1.154, // Unknown damage application, copied from HF2
	autoUpgrade: { trait: TraitName.AspectMasteryIV, otherSkill: SkillName.HighFire2 },
	onConfirm: (state, node) => {
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
	onConfirm: (state, node) => {
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
	onConfirm: (state, node) => {
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
	onConfirm: (state, node) => {
		state.switchToAForUI(ResourceType.UmbralIce, 3);
		state.startOrRefreshEnochian();
	},
});

makeAbility_BLM(SkillName.Amplifier, 86, ResourceType.cd_Amplifier, {
	applicationDelay: 0, // ? (assumed to be instant)
	cooldown: 120,
	validateAttempt: (state) => state.getFireStacks() > 0 || state.getIceStacks() > 0,
	onApplication: (state, node) => {
		let polyglot = state.resources.get(ResourceType.Polyglot);
		if (polyglot.available(polyglot.maxValue)) {
			controller.reportWarning(WarningType.PolyglotOvercap)
		}
		polyglot.gain(1);
	},
});

makeGCD_BLM(SkillName.Paradox, 90, {
	// Paradox made instant via Dawntrail
	baseCastTime: 0,
	baseManaCost: 1600,
	basePotency: 520,
	applicationDelay: 0.624,
	validateAttempt: paraCondition,
	onConfirm: (state, node) => {
		state.resources.get(ResourceType.Paradox).consume(1);
		if (state.hasEnochian()) {
			state.startOrRefreshEnochian();
		}
		if (state.getIceStacks() > 0) {
			state.resources.get(ResourceType.UmbralIce).gain(1);
		} else if (state.getFireStacks() > 0) {
			state.resources.get(ResourceType.AstralFire).gain(1);
			gainFirestarterProc(state);
		} else {
			console.error("cannot cast Paradox outside of AF/UI");
		}
	},
	replaceIf: [{
		newSkill: SkillName.Blizzard,
		condition: (state) => !state.hasResourceAvailable(ResourceType.Paradox) && state.getIceStacks() > 0,
	}, {
		newSkill: SkillName.Fire,
		condition: (state) => !state.hasResourceAvailable(ResourceType.Paradox) && state.getFireStacks() > 0,
	}],
	startOnHotbar: false,
});

makeGCD_BLM(SkillName.HighThunder, 92, {
	aspect: Aspect.Lightning,
	baseCastTime: 0,
	baseManaCost: 0,
	basePotency: 150,
	applicationDelay: 0.757,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.Thunderhead),
	onConfirm: thunderConfirm(SkillName.HighThunder),
	onApplication: (state, node) => {
		// resolve the on-hit potency element (always the first of the node)
		controller.resolvePotency(node.getPotencies()[0]);
		applyThunderDoT(state, node, SkillName.HighThunder);
	},
	autoDowngrade: { trait: TraitName.ThunderMasteryIII, otherSkill: SkillName.HighThunder },
});

makeGCD_BLM(SkillName.FlareStar, 100, {
	aspect: Aspect.Fire,
	baseCastTime: 3,
	baseManaCost: 0,
	basePotency: 400,
	applicationDelay: 0.622,
	validateAttempt: (state) => state.hasResourceAvailable(ResourceType.AstralSoul, 6),
	onConfirm: (state, node) => state.resources.get(ResourceType.AstralSoul).consume(6),
});

makeAbility_BLM(SkillName.Retrace, 96, ResourceType.cd_Retrace, {
	applicationDelay: 0, // ? (assumed to be instant)
	cooldown: 40,
	validateAttempt: retraceCondition,
	onConfirm: (state, node) => {
		state.resources.get(ResourceType.LeyLines).enabled = true;
	},
	startOnHotbar: false,
});

// TODO this function is kept here to avoid circular imports, but should probably be moved
export function newGameState(config: GameConfig) {
	return new BLMState(config);
}