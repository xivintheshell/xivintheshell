import {Aspect, BuffType, Debug, ResourceType, SkillName, SkillReadyStatus, WarningType} from "./Common"
import {GameConfig} from "./GameConfig"
import {StatsModifier} from "./StatsModifier";
import {SkillApplicationCallbackInfo, SkillCaptureCallbackInfo, SkillsList} from "./Skills"
import {CoolDown, CoolDownState, DoTBuff, Event, EventTag, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {ActionNode} from "../Controller/Record";
import {getPotencyModifiersFromResourceState, Potency, PotencyModifier, PotencyModifierType} from "./Potency";
import {Buff} from "./Buffs";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;

// GameState := resources + events queue
export class GameState {
	config: GameConfig
	rng: RNG;
	#nonProcRng: RNG; // use this for things other than procs (actor tick offsets, for example)
	lucidTickOffset: number;
	thunderTickOffset: number;
	time: number; // raw time which starts at 0 regardless of countdown
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList;

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = new SeedRandom(config.randomSeed);
		this.#nonProcRng = new SeedRandom(config.randomSeed + "_nonProcs");
		this.lucidTickOffset = this.#nonProcRng() * 3.0;
		this.thunderTickOffset = this.#nonProcRng() * 3.0;

		// TIME (raw time which starts at 0 regardless of countdown)
		this.time = 0;

		// RESOURCES (checked when using skills)
		this.resources = new ResourceState(this);
		this.resources.set(ResourceType.Mana, new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(ResourceType.Polyglot, new Resource(ResourceType.Polyglot, 3, 0));
		this.resources.set(ResourceType.AstralFire, new Resource(ResourceType.AstralFire, 3, 0));
		this.resources.set(ResourceType.UmbralIce, new Resource(ResourceType.UmbralIce, 3, 0));
		this.resources.set(ResourceType.UmbralHeart, new Resource(ResourceType.UmbralHeart, 3, 0));
		this.resources.set(ResourceType.AstralSoul, new Resource(ResourceType.AstralSoul, 6, 0));

		this.resources.set(ResourceType.Portrait, new Resource(ResourceType.Portrait, 2, 0));
		this.resources.set(ResourceType.Depictions, new Resource(ResourceType.Depictions, 3, 0));
		// automatically do prepull draws
		this.resources.set(ResourceType.CreatureCanvas, new Resource(ResourceType.CreatureCanvas, 1, 1));
		this.resources.set(ResourceType.WeaponCanvas, new Resource(ResourceType.WeaponCanvas, 1, 1));
		this.resources.set(ResourceType.LandscapeCanvas, new Resource(ResourceType.LandscapeCanvas, 1, 1));
		this.resources.set(ResourceType.PaletteGauge, new Resource(ResourceType.PaletteGauge, 100, 0));
		this.resources.set(ResourceType.Paint, new Resource(ResourceType.Paint, 5, 0));

		this.resources.set(ResourceType.LeyLines, new Resource(ResourceType.LeyLines, 1, 0)); // capture
		this.resources.set(ResourceType.Enochian, new Resource(ResourceType.Enochian, 1, 0));
		this.resources.set(ResourceType.Paradox, new Resource(ResourceType.Paradox, 1, 0));
		this.resources.set(ResourceType.Firestarter, new Resource(ResourceType.Firestarter, 1, 0));
		this.resources.set(ResourceType.Thunderhead, new Resource(ResourceType.Thunderhead, 1, 0));
		this.resources.set(ResourceType.ThunderDoT, new DoTBuff(ResourceType.ThunderDoT, 1, 0));
		this.resources.set(ResourceType.Manaward, new Resource(ResourceType.Manaward, 1, 0));
		this.resources.set(ResourceType.Triplecast, new Resource(ResourceType.Triplecast, 3, 0));
		this.resources.set(ResourceType.Addle, new Resource(ResourceType.Addle, 1, 0));
		this.resources.set(ResourceType.Swiftcast, new Resource(ResourceType.Swiftcast, 1, 0));
		this.resources.set(ResourceType.LucidDreaming, new DoTBuff(ResourceType.LucidDreaming, 1, 0));
		this.resources.set(ResourceType.Surecast, new Resource(ResourceType.Surecast, 1, 0));
		this.resources.set(ResourceType.Tincture, new Resource(ResourceType.Tincture, 1, 0)); // capture
		this.resources.set(ResourceType.Sprint, new Resource(ResourceType.Sprint, 1, 0));

		this.resources.set(ResourceType.Aetherhues, new Resource(ResourceType.Aetherhues, 2, 0));
		this.resources.set(ResourceType.MonochromeTones, new Resource(ResourceType.MonochromeTones, 1, 0));
		this.resources.set(ResourceType.SubtractivePalette, new Resource(ResourceType.SubtractivePalette, 3, 0));
		this.resources.set(ResourceType.HammerTime, new Resource(ResourceType.HammerTime, 3, 0));
		this.resources.set(ResourceType.Inspiration, new Resource(ResourceType.Inspiration, 1, 0));
		this.resources.set(ResourceType.SubtractiveSpectrum, new Resource(ResourceType.SubtractiveSpectrum, 1, 0));
		this.resources.set(ResourceType.Hyperphantasia, new Resource(ResourceType.Hyperphantasia, 5, 0));
		this.resources.set(ResourceType.RainbowBright, new Resource(ResourceType.RainbowBright, 1, 0));
		this.resources.set(ResourceType.Starstruck, new Resource(ResourceType.Starstruck, 1, 0));
		this.resources.set(ResourceType.StarryMuse, new Resource(ResourceType.StarryMuse, 1, 0));
		this.resources.set(ResourceType.TemperaCoat, new Resource(ResourceType.TemperaCoat, 1, 0));
		this.resources.set(ResourceType.TemperaGrassa, new Resource(ResourceType.TemperaGrassa, 1, 0));
		this.resources.set(ResourceType.Smudge, new Resource(ResourceType.Smudge, 1, 0));

		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(ResourceType.NotCasterTaxed, new Resource(ResourceType.NotCasterTaxed, 1, 1));
		// begin the encounter not in combat by default
		this.resources.set(ResourceType.InCombat, new Resource(ResourceType.InCombat, 1, 0));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(ResourceType.cd_GCD, new CoolDown(ResourceType.cd_GCD, config.getAfterTaxGCD(config.adjustedGCD(false)), 1, 1));
		this.cooldowns.set(ResourceType.cd_LeyLines, new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Transpose, new CoolDown(ResourceType.cd_Transpose, 5, 1, 1));
		this.cooldowns.set(ResourceType.cd_Manaward, new CoolDown(ResourceType.cd_Manaward, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_BetweenTheLines, new CoolDown(ResourceType.cd_BetweenTheLines, 3, 1, 1));
		this.cooldowns.set(ResourceType.cd_AetherialManipulation, new CoolDown(ResourceType.cd_AetherialManipulation, 10, 1, 1));
		this.cooldowns.set(ResourceType.cd_Triplecast, new CoolDown(ResourceType.cd_Triplecast, 60, 2, 2));
		this.cooldowns.set(ResourceType.cd_Manafont, new CoolDown(ResourceType.cd_Manafont, 100, 1, 1));
		this.cooldowns.set(ResourceType.cd_Amplifier, new CoolDown(ResourceType.cd_Amplifier, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Retrace, new CoolDown(ResourceType.cd_Amplifier, 40, 1, 1));
		this.cooldowns.set(ResourceType.cd_Addle, new CoolDown(ResourceType.cd_Addle, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_Swiftcast, new CoolDown(ResourceType.cd_Swiftcast, 40, 1, 1));
		this.cooldowns.set(ResourceType.cd_LucidDreaming, new CoolDown(ResourceType.cd_LucidDreaming, 60, 1, 1));
		this.cooldowns.set(ResourceType.cd_Surecast, new CoolDown(ResourceType.cd_Surecast, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Tincture, new CoolDown(ResourceType.cd_Tincture, 270, 1, 1));
		this.cooldowns.set(ResourceType.cd_Sprint, new CoolDown(ResourceType.cd_Sprint, 60, 1, 1));

		this.cooldowns.set(ResourceType.cd_TemperaCoat, new CoolDown(ResourceType.cd_TemperaCoat, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Smudge, new CoolDown(ResourceType.cd_Smudge, 20, 1, 1));
		this.cooldowns.set(ResourceType.cd_LivingMuse, new CoolDown(ResourceType.cd_LivingMuse, 40, 3, 3));
		this.cooldowns.set(ResourceType.cd_Portrait, new CoolDown(ResourceType.cd_Portrait, 30, 1, 1));
		this.cooldowns.set(ResourceType.cd_SteelMuse, new CoolDown(ResourceType.cd_SteelMuse, 60, 2, 2));
		this.cooldowns.set(ResourceType.cd_ScenicMuse, new CoolDown(ResourceType.cd_ScenicMuse, 120, 1, 1));
		// TODO handle these differently
		this.cooldowns.set(ResourceType.cd_Subtractive, new CoolDown(ResourceType.cd_Subtractive, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_Grassa, new CoolDown(ResourceType.cd_Grassa, 1, 1, 1));
		this.cooldowns.set(ResourceType.cd_TemperaPop, new CoolDown(ResourceType.cd_TemperaPop, 1, 1, 1));

		// EVENTS QUEUE (events decide future changes to resources)
		// which might include:
		// - damage calc (enqueues damage application)
		// - damage application
		// - dot application / refresh (put dot up, refresh timer by removing and re-enqueueing "thunder fall off" event)
		// - dot fall off (by dot application)
		// - modifiers up (which potentially enqueues modifier down)
		// - modifiers down (by modifiers up)
		this.eventsQueue = [];

		// SKILLS (instantiated once, read-only later)
		this.skillsList = new SkillsList(this);

		this.#init();
	}

	// get mp tick, lucid tick, thunder DoT tick and polyglot rolling
	#init() {
		let game = this;
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			let recurringManaRegen = ()=>{
				// mana regen
				let mana = this.resources.get(ResourceType.Mana);
				let gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				let currentAmount = mana.availableAmount();
				controller.reportManaTick(game.time, "+" + gainAmount + " (MP="+currentAmount+")");
				// queue the next tick
				this.resources.addResourceEvent({
					rscType: ResourceType.Mana,
					name: "mana tick",
					delay: 3,
					fnOnRsc: rsc=>{
						recurringManaRegen();
					},
					// would ideally want to only have ManaGain tag if there's no AF... too much work for now
					tags: [EventTag.MpTick, EventTag.ManaGain]
				});
			};
			this.resources.addResourceEvent({
				rscType: ResourceType.Mana,
				name: "initial mana tick",
				delay: this.config.timeTillFirstManaTick,
				fnOnRsc: recurringManaRegen,
				// would ideally want to only have ManaGain tag if there's no AF... too much work for now
				tags: [EventTag.MpTick, EventTag.ManaGain]
			});
		}

		// lucid ticks
		let recurringLucidTick = () => {
			// do work at lucid tick
			let lucid = this.resources.get(ResourceType.LucidDreaming) as DoTBuff;
			if (lucid.available(1)) {
				lucid.tickCount++;
				if (this.getFireStacks() === 0) {
					let mana = this.resources.get(ResourceType.Mana);
					mana.gain(550);
					let msg = "+550";
					console.assert(lucid.node !== undefined);
					if (lucid.node) {
						let t = "??";
						if (lucid.node.tmp_startLockTime) {
							t = (lucid.node.tmp_startLockTime - this.config.countdown).toFixed(3);
						}
						msg += " {skill}@" + t;
						msg += " (" + lucid.tickCount + "/7)";
					}
					msg += " (MP=" + mana.availableAmount() + ")";
					controller.reportLucidTick(this.time, msg);
				}
			}
			// queue the next tick
			let recurringLucidTickEvt = new Event("lucid tick", 3, ()=>{
				recurringLucidTick();
			});
			recurringLucidTickEvt.addTag(EventTag.LucidTick);
			// potentially also give mp gain tag
			if (lucid.available(1) && lucid.pendingChange) {
				let timeTillDropLucid = lucid.pendingChange.timeTillEvent;
				if (timeTillDropLucid >= 3) {
					recurringLucidTickEvt.addTag(EventTag.ManaGain);
				}
			}
			this.addEvent(recurringLucidTickEvt);
		};
		let timeTillFirstLucidTick = this.config.timeTillFirstManaTick + this.lucidTickOffset;
		while (timeTillFirstLucidTick > 3) timeTillFirstLucidTick -= 3;
		let firstLucidTickEvt = new Event("initial lucid tick", timeTillFirstLucidTick, recurringLucidTick);
		firstLucidTickEvt.addTag(EventTag.LucidTick);
		this.addEvent(firstLucidTickEvt);

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

	// advance game state by this much time
	tick(deltaTime: number, prematureStopCondition=()=>{ return false; }) {
		//======== events ========
		let cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime && this.eventsQueue.length > 0 && !prematureStopCondition())
		{
			// make sure events are in proper order (qol: optimize using a priority queue...)
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);
			cumulativeDeltaTime = Math.min(cumulativeDeltaTime + timeToTick, deltaTime);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);
			if (Debug.consoleLogEvents) console.log("====== tick " + timeToTick + " now at " + this.time);

			// make a deep copy of events to advance for this round...
			const eventsToExecuteOld = [];
			for (let i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			let executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				e.timeTillEvent -= timeToTick;
				if (Debug.consoleLogEvents) console.log(e.name + " in " + e.timeTillEvent);
				if (e.timeTillEvent <= Debug.epsilon)
				{
					if (!e.canceled)
					{
						e.effectFn();
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);
		}
		if (Debug.consoleLogEvents) {
			console.log(this.toString());
			console.log(this.resources);
			console.log(this.cooldowns);
		}
		return cumulativeDeltaTime;
	}

	addEvent(evt: Event) {
		this.eventsQueue.push(evt);
	}

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).availableAmount(); }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).availableAmount(); }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).availableAmount(); }
	getMP() { return this.resources.get(ResourceType.Mana).availableAmount(); }

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

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

			if (ui.available(3) && uh.available(3)) {
				paradox.gain(1);
			}  

			ui.consume(ui.availableAmount());
		}
		else if (rscType===ResourceType.UmbralIce)
		{
			if (ui.availableAmount() === 0) {
				this.gainThunderhead();
			}
			ui.gain(numStacksToGain);

			if (af.available(3)) {
				paradox.gain(1);
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

	captureManaRegenAmount() {
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	captureSpellCastTimeAFUI(aspect: Aspect, llAdjustedCastTime: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = llAdjustedCastTime;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return castTime;
	}

	gcdRecastTimeScale() {
		let ll = this.resources.get(ResourceType.LeyLines);
		if (ll.available(1)) {
			// should be approximately 0.85
			const num = this.config.getAfterTaxGCD(this.config.adjustedGCD(true));
			const denom = this.config.getAfterTaxGCD(this.config.adjustedGCD(false));
			return num / denom;
		} else {
			return 1;
		}
	}

	requestToggleBuff(buffName: ResourceType) {
		let rsc = this.resources.get(buffName);
		// only ley lines can be enabled / disabled. Everything else will just be canceled
		if (buffName === ResourceType.LeyLines || buffName === ResourceType.Inspiration) {
			if (rsc.available(1)) { // buff exists and enabled
				rsc.enabled = false;
				return true;
			} else {
				// currently nothing happens if trying to toggle a buff that isn't applied
				rsc.enabled = true;
				return true;
			}
		} else if ([
			ResourceType.HammerTime,
			ResourceType.Aetherhues,
			ResourceType.SubtractivePalette,
		].includes(buffName)) {
			// subtractive spectrum, starstruck, monochrome tones, rainbow drip,
			// tempera coat/grassa, smudge can be clicked off
			// but these buffs cannot be
			return true;
		} else {
			rsc.consume(rsc.availableAmount());
			rsc.removeTimer();
			return true;
		}
	}

	castSpell(props: {
		skillName: SkillName,
		onCapture: (cap: SkillCaptureCallbackInfo)=>void,
		onApplication: (app: SkillApplicationCallbackInfo)=>void,
		node: ActionNode})
	{
		let skill = this.skillsList.get(props.skillName);
		let skillInfo = skill.info;
		console.assert(skillInfo.isSpell);
		let cd = this.cooldowns.get(skillInfo.cdName);
		let [capturedManaCost, uhConsumption] = this.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		const inspireSkills = [
			SkillName.FireInRed,
			SkillName.Fire2InRed,
			SkillName.AeroInGreen,
			SkillName.Aero2InGreen,
			SkillName.WaterInBlue,
			SkillName.Water2InBlue,
			SkillName.HolyInWhite,
			SkillName.BlizzardInCyan,
			SkillName.Blizzard2InCyan,
			SkillName.StoneInYellow,
			SkillName.Stone2InYellow,
			SkillName.ThunderInMagenta,
			SkillName.Thunder2InMagenta,
			SkillName.CometInBlack,
			SkillName.StarPrism,
		];
		let inspired = this.resources.get(ResourceType.Inspiration).available(1) && inspireSkills.includes(props.skillName);
		let capturedCastTime = this.captureSpellCastTimeAFUI(
			skillInfo.aspect,
			this.config.adjustedCastTime(skillInfo.baseCastTime, llCovered, inspired));
		// hack for motifs, which are not affected by sps
		if (props.skillName.includes("Motif")) {
			capturedCastTime = skillInfo.baseCastTime;
		}
		if (llCovered && skillInfo.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}
		if (inspired) {
			props.node.addBuff(BuffType.Hyperphantasia);
		}

		// attach potency node
		let potency: Potency | undefined = undefined;
		if (skillInfo.basePotency > 0) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: props.skillName,
				aspect: skillInfo.aspect,
				basePotency: skillInfo.basePotency,
				snapshotTime: undefined,
				description: "",
			});
			props.node.addPotency(potency);
		}

		let takeEffect = function(game: GameState) {
			let resourcesStillAvailable = skill.available();
			if (resourcesStillAvailable) {
				// re-capture them here, since game state might've changed (say, AF/UI fell off)
				[capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);

				// actually deduct MP and UH (except some special ones like Despair, Flare and Flare Star that deduct resources in onCapture fn)
				if (props.skillName !== SkillName.Flare && props.skillName !== SkillName.Despair && props.skillName !== SkillName.FlareStar) {
					if (!(props.skillName===SkillName.Paradox && game.getIceStacks()>0)) {
						game.resources.get(ResourceType.Mana).consume(capturedManaCost);
					}
					if (uhConsumption > 0) game.resources.get(ResourceType.UmbralHeart).consume(uhConsumption);
				}

				// potency
				if (potency) {
					potency.snapshotTime = game.getDisplayTime();
					potency.modifiers = getPotencyModifiersFromResourceState(game.resources, skillInfo.aspect);
				}

				// tincture
				if (game.resources.get(ResourceType.Tincture).available(1) && skillInfo.basePotency > 0) {
					props.node.addBuff(BuffType.Tincture);
				}

				// starry muse
				if (game.resources.get(ResourceType.StarryMuse).available(1) && skillInfo.basePotency > 0) {
					props.node.addBuff(BuffType.StarryMuse);
				}

				// ice spells: gain mana if in UI
				if (skillInfo.aspect === Aspect.Ice) {
					game.gainUmbralMana(skillInfo.skillApplicationDelay);
				}

				let captureInfo: SkillCaptureCallbackInfo = {
					capturedManaCost: capturedManaCost
					//...
				};
				props.onCapture(captureInfo);

				// effect application
				game.addEvent(new Event(
					skillInfo.name + " applied",
					skillInfo.skillApplicationDelay,
					()=>{
						if (potency) {
							controller.resolvePotency(potency);
						}
						let applicationInfo: SkillApplicationCallbackInfo = {
							//...
						};
						props.onApplication(applicationInfo);
					}));
				if (potency) {
					game.resources.addResourceEvent({
						rscType: ResourceType.InCombat,
						name: "begin combat if necessary",
						delay: skillInfo.skillApplicationDelay,
						fnOnRsc: (rsc: Resource) => rsc.gain(1),
					});
				}
				return true;
			} else {
				return false;
			}
		}

		let instantCast = function(game: GameState, rsc?: Resource) {
			if (rsc) rsc.consume(1);
			takeEffect(game);

			// recast
			let recastTime = props.skillName.includes("Motif")
				? skillInfo.baseRecastTime
				: (
					rsc && rsc.type === ResourceType.RainbowBright
						// when rainbow bright is affecting rainbow drip, base cast is always 2.5
						? game.config.adjustedGCD(false, false, 2.5)
						// unlike LL, we need to account for hyperphantasia here because the hyperphantasia buff
						// would be consumed before the Resource object can check the recast
						: game.config.adjustedGCD(false, inspired, skillInfo.baseRecastTime)
				);
			cd.useStackWithRecast(game, game.config.getAfterTaxGCD(recastTime));

			// animation lock
			game.resources.takeResourceLock(ResourceType.NotAnimationLocked, game.config.getSkillAnimationLock(props.skillName));
		}

		// Picto's litany of instant casts
		if (skillInfo.baseCastTime === 0) {
			instantCast(this, undefined);
			return;
		}

		// Rainbow Drip made instant via Rainbow Bright
		let rainbowBright = this.resources.get(ResourceType.RainbowBright);
		if (props.skillName === SkillName.RainbowDrip && rainbowBright.available(1)) {
			rainbowBright.removeTimer();
			instantCast(this, rainbowBright);
			return;
		}

		// Paradox made instant via Dawntrail
		if (props.skillName === SkillName.Paradox || props.skillName === SkillName.UmbralSoul) {
			instantCast(this, undefined);
			return;
		}

		// Swiftcast
		let swift = this.resources.get(ResourceType.Swiftcast);
		if (swift.available(1)) {
			swift.removeTimer();
			instantCast(this, swift);
			return;
		}

		// Triplecast charge
		let triple = this.resources.get(ResourceType.Triplecast);
		if (triple.available(1)) {
			instantCast(this, triple);
			if (!triple.available(1)) {
				triple.removeTimer();
			}
			return;
		}

		// there are no triplecast charges. cast and apply effect

		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));

		// (basically done casting) deduct MP, calc damage, queue damage
		this.addEvent(new Event(skillInfo.name + " captured", capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime), ()=>{
			let success = takeEffect(this);
			if (!success) {
				controller.reportInterruption({
					failNode: props.node
				});
			}
		}));

		// recast
		// unlike LL, we need to account for hyperphantasia here because the hyperphantasia buff
		// would be consumed before the Resource object can check the recast
		cd.useStackWithRecast(
			this,
			this.config.getAfterTaxGCD(
				skillInfo.name.includes("Motif") ? skillInfo.baseRecastTime : this.config.adjustedGCD(false, inspired, skillInfo.baseRecastTime)
			)
		);

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotCasterTaxed, this.config.getAfterTaxCastTime(capturedCastTime));
	}

	useInstantSkill(props: {
		skillName: SkillName,
		onCapture?: () => void,
		onApplication?: () => void,
		dealDamage: boolean,
		node: ActionNode
	}) {
		console.assert(props.node);
		let skillInfo = this.skillsList.get(props.skillName).info;
		let cd = this.cooldowns.get(skillInfo.cdName);

		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		if (llCovered && skillInfo.cdName===ResourceType.cd_GCD) {
			props.node.addBuff(BuffType.LeyLines);
		}

		// potency
		let potency : Potency | undefined = undefined;
		if (props.dealDamage) {
			potency = new Potency({
				config: this.config,
				sourceTime: this.getDisplayTime(),
				sourceSkill: skillInfo.name,
				aspect: skillInfo.aspect,
				basePotency: skillInfo.basePotency,
				snapshotTime: this.getDisplayTime(),
				description: "",
			});
			potency.modifiers = getPotencyModifiersFromResourceState(this.resources, skillInfo.aspect);
			props.node.addPotency(potency);
		}

		// tincture
		if (this.resources.get(ResourceType.Tincture).available(1) && skillInfo.basePotency > 0) {
			props.node.addBuff(BuffType.Tincture);
		}

		// starry muse
		if (this.resources.get(ResourceType.StarryMuse).available(1) && skillInfo.basePotency > 0) {
			props.node.addBuff(BuffType.StarryMuse);
		}

		if (props.onCapture) props.onCapture();

		let skillEvent = new Event(
			skillInfo.name + " captured",
			skillInfo.skillApplicationDelay,
			()=>{
				if (props.dealDamage && potency) controller.resolvePotency(potency);
				if (props.onApplication) props.onApplication();
			});
		if (props.dealDamage && potency) {
			this.resources.addResourceEvent({
				rscType: ResourceType.InCombat,
				name: "begin combat if necessary",
				delay: skillInfo.skillApplicationDelay,
				fnOnRsc: (rsc: Resource) => rsc.gain(1),
			});
		}
		this.addEvent(skillEvent);

		// recast
		cd.useStack(this);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.getSkillAnimationLock(props.skillName));

		return skillEvent;
	}

	hasEnochian() {
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		let enochian = this.resources.get(ResourceType.Enochian);
		return enochian.available(1);
	}

	// falls off after 30 (or 30.8) seconds unless next spell is resolved
	// (for now ignore edge case of buff falling off mid-cast)
	cycleAetherhues() {
		let aetherhues = this.resources.get(ResourceType.Aetherhues);
		if (aetherhues.available(2) && aetherhues.pendingChange) {
			// reset timer and reset value to 0
			aetherhues.overrideCurrentValue(0);
			aetherhues.removeTimer();
		} else if (aetherhues.available(1) && aetherhues.pendingChange) {
			// refresh timer if it was already running
			aetherhues.overrideTimer(this, 30.8);
			aetherhues.gain(1);
		} else {
			// we were at 0 aetherhues, so increment and start the timer anew
			aetherhues.gain(1);
			this.resources.addResourceEvent({
				rscType: ResourceType.Aetherhues,
				name: "reset aetherhues status",
				delay: 30,
				fnOnRsc: rsc => this.resources.get(ResourceType.Aetherhues).overrideCurrentValue(0),
			});
		}
	}

	// when inspiration + hyperphantasia stacks are available, the cast/recast of paint spells
	// are greatly reduced
	// when all 5 phantasia stacks are consumed, then inspiration is also removed
	tryConsumeHyperphantasia() {
		let hyperphantasia = this.resources.get(ResourceType.Hyperphantasia);
		let inspiration = this.resources.get(ResourceType.Inspiration);
		if (inspiration.available(1) && hyperphantasia.available(1) && hyperphantasia.pendingChange) {
			// consume a stack
			hyperphantasia.consume(1);
			// if all stacks are consumed, stop timers and gain rainbow bright
			if (hyperphantasia.availableAmount() === 0) {
				inspiration.consume(1);
				hyperphantasia.removeTimer();
				inspiration.removeTimer();
				this.resources.get(ResourceType.RainbowBright).gain(1);
				this.resources.addResourceEvent({
					rscType: ResourceType.RainbowBright,
					name: "drop rainbow bright", delay: 30, fnOnRsc: (rsc: Resource) => rsc.consume(1),
				});
			}
		}
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

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.info.cdName;
		let tillAnyCDStack = this.cooldowns.timeTillAnyStackAvailable(cdName);
		return Math.max(this.timeTillAnySkillAvailable(), tillAnyCDStack);
	}

	timeTillAnySkillAvailable() {
		let tillNotAnimationLocked = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNotCasterTaxed = this.resources.timeTillReady(ResourceType.NotCasterTaxed);
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	findNextQueuedEventByTag(tag : EventTag) {
		for (let i = 0; i < this.eventsQueue.length; i++) {
			let evt = this.eventsQueue[i];
			if (evt.hasTag(tag)) return evt;
		}
		return undefined;
	}

	timeTillNextMpGainEvent() {
		let foundEvt = this.findNextQueuedEventByTag(EventTag.ManaGain);
		return foundEvt ? foundEvt.timeTillEvent : 0;
	}

	timeTillNextDamageEvent() {
		// Find when the next damage event is. Used to block starry + striking muse when out of combat.
		return this.resources.timeTillReady(ResourceType.InCombat);
	}

	getSkillAvailabilityStatus(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.info.name);
		let [capturedManaCost] = skill.info.isSpell ? this.captureManaCostAndUHConsumption(skill.info.aspect, skill.info.baseManaCost) : [0,0];
		let llCovered = this.resources.get(ResourceType.LeyLines).available(1);
		let inspired = this.resources.get(ResourceType.Inspiration).available(1);
		let capturedCastTime = this.captureSpellCastTimeAFUI(
			skill.info.aspect,
			this.config.adjustedCastTime(skill.info.baseCastTime, llCovered, inspired));
		if (skillName.includes("Motif")) {
			capturedCastTime = skill.info.baseCastTime;
		}
		let instantCastAvailable = this.resources.get(ResourceType.Triplecast).available(1)
			|| this.resources.get(ResourceType.Swiftcast).available(1)
			|| skillName===SkillName.Paradox
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)))
			|| (skillName===SkillName.Xenoglossy && this.resources.get(ResourceType.Polyglot).available(1))
			|| (skillName===SkillName.UmbralSoul && this.getIceStacks()>0) // lmfao why does this count as a spell
			|| (skillName === SkillName.StarPrism && this.resources.get(ResourceType.Starstruck).available(1))
			|| (skillName === SkillName.RainbowDrip && this.resources.get(ResourceType.RainbowBright).available(1))
			|| ((skillName === SkillName.HolyInWhite || skillName === SkillName.CometInBlack) && this.resources.get(ResourceType.Paint).available(1))
			|| (skill.info.aspect === Aspect.Hammer && this.resources.get(ResourceType.HammerTime).available(1))
			;
		let currentMana = this.resources.get(ResourceType.Mana).availableAmount();
		let notBlocked = timeTillAvailable <= Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana
			|| (skillName===SkillName.Paradox && this.getIceStacks() > 0)
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)));
		let reqsMet = skill.available();
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;
		// Special case for striking/starry muse, which require being in combat
		if ([SkillName.StrikingMuse, SkillName.StarryMuse].includes(skillName) && status === SkillReadyStatus.RequirementsNotMet) {
			status = SkillReadyStatus.NotInCombat;
			timeTillAvailable = this.timeTillNextDamageEvent();
		}

		let cd = this.cooldowns.get(skill.info.cdName);
		let timeTillNextStackReady = this.cooldowns.timeTillNextStackAvailable(skill.info.cdName);
		let cdRecastTime = cd.currentStackCd();
		if (skillName.includes("Motif")) {
			cdRecastTime = skill.info.baseRecastTime;
		} else if (skillName === SkillName.RainbowDrip && this.resources.get(ResourceType.RainbowBright).available(1)) {
			cdRecastTime = this.config.adjustedGCD(false, false, 2.5);
		}

		// to be displayed together when hovered on a skill
		let timeTillDamageApplication = 0;
		if (status === SkillReadyStatus.Ready) {
			if (skill.info.isSpell) {
				let timeTillCapture = instantCastAvailable ? 0 : (capturedCastTime - GameConfig.getSlidecastWindow(capturedCastTime));
				timeTillDamageApplication = timeTillCapture + skill.info.skillApplicationDelay;
			} else {
				timeTillDamageApplication = skill.info.skillApplicationDelay;
			}
		}

		// conditions that make the skills show proc
		let highlight = false;

		if (skillName === SkillName.Paradox) {// paradox
			highlight = true;
		} else if (skillName === SkillName.Fire3) {// F3P
			if (this.resources.get(ResourceType.Firestarter).available(1)) highlight = true;
		} else if (skillName === SkillName.HighThunder) {
			if (this.resources.get(ResourceType.Thunderhead).available(1)) highlight = true;
		} else if (skillName === SkillName.Foul || skillName === SkillName.Xenoglossy) {// polyglot
			if (this.resources.get(ResourceType.Polyglot).available(1)) highlight = true;
		} else if (skillName === SkillName.FlareStar) {
			if (this.resources.get(ResourceType.AstralSoul).available(6)) highlight = true;
		} else if (skillName === SkillName.CometInBlack) {
			// if comet is ready, it glows regardless of paint status
			highlight = this.resources.get(ResourceType.MonochromeTones).available(1);
		} else if (skillName === SkillName.HolyInWhite) {
			// holy doesn't glow if comet is ready
			highlight = !this.resources.get(ResourceType.MonochromeTones).available(1)
				&& this.resources.get(ResourceType.Paint).available(1);
		} else if (skillName === SkillName.SubtractivePalette) {
			highlight = this.resources.get(ResourceType.SubtractiveSpectrum).available(1) ||
				this.resources.get(ResourceType.PaletteGauge).available(50);
		} else if (skillName === SkillName.MogOfTheAges) {
			highlight = this.resources.get(ResourceType.Portrait).available(1);
		} else if (skill.info.aspect === Aspect.Hammer) {
			highlight = this.resources.get(ResourceType.HammerTime).available(1);
		} else if (skillName === SkillName.RainbowDrip) {
			highlight = this.resources.get(ResourceType.RainbowBright).available(1);
		} else if (skillName === SkillName.StarPrism) {
			highlight = this.resources.get(ResourceType.Starstruck).available(1);
		} else if (skillName === SkillName.TemperaGrassa || skillName === SkillName.TemperaCoatPop) {
			highlight = this.resources.get(ResourceType.TemperaCoat).available(1);
		} else if (skillName === SkillName.TemperaGrassaPop) {
			highlight = this.resources.get(ResourceType.TemperaGrassa).available(1);
		}

		return {
			status: status,
			description: "",
			stacksAvailable: cd.stacksAvailable(),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: cdRecastTime,
			timeTillNextStackReady: timeTillNextStackReady,
			timeTillAvailable: timeTillAvailable,
			timeTillDamageApplication: timeTillDamageApplication,
			capturedManaCost: capturedManaCost,
			highlight: highlight,
			llCovered: llCovered
		};
	}

	useSkill(skillName: SkillName, node: ActionNode) {
		let skill = this.skillsList.get(skillName);
		skill.use(this, node);
	}

	getPartyBuffs(time: number) {
		const buffCollection = new Map<BuffType, PotencyModifier>();
		const buffMarkers = controller.timeline.getBuffMarkers();
		buffMarkers.filter(marker => {
			return marker.time <= time && (marker.time + marker.duration) >= time;
		}).forEach(marker => {
			const buff = new Buff(marker.description as BuffType);
			if (!buffCollection.has(buff.name)) {
				buffCollection.set(buff.name, {
					source: PotencyModifierType.PARTY, 
					buffType: buff.name,
					damageFactor: buff.info.damageFactor,
					critFactor: buff.info.critBonus,
					dhFactor: buff.info.dhBonus,
				});
			}
		})

		return buffCollection;
	}

	toString() {
		let s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).availableAmount() + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).availableAmount() + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).availableAmount() + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).availableAmount() + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).availableAmount() + "\n";
		s += "LL:\t" + this.resources.get(ResourceType.LeyLines).availableAmount() + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).availableAmount() + "\n";
		s += "GCD:\t" + this.cooldowns.get(ResourceType.cd_GCD).availableAmount().toFixed(3) + "\n";
		s += "LLCD:\t" + this.cooldowns.get(ResourceType.cd_LeyLines).availableAmount().toFixed(3) + "\n";
		return s;
	}
}