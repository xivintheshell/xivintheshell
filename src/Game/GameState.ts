import {Aspect, Debug, GameConfig, ResourceType, SkillName, SkillReadyStatus} from "./Common"
import {StatsModifier} from "./StatsModifier";
import {SkillApplicationCallbackInfo, SkillCaptureCallbackInfo, SkillsList} from "./Skills"
import {CoolDown, CoolDownState, Event, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {addLog, Color, LogCategory} from "../Controller/Common";
import {ActionNode} from "../Controller/Record";

//https://www.npmjs.com/package/seedrandom
let SeedRandom = require('seedrandom');

type RNG = any;

// GameState := resources + events queue
export class GameState {
	config: GameConfig
	rng: RNG;
	time: number;
	resources: ResourceState;
	cooldowns: CoolDownState;
	eventsQueue: Event[];
	skillsList: SkillsList;

	constructor(config: GameConfig) {
		this.config = config;
		this.rng = new SeedRandom(config.randomSeed);

		// TIME
		this.time = 0;

		// RESOURCES (checked when using skills)
		this.resources = new ResourceState(this);
		this.resources.set(ResourceType.Mana, new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(ResourceType.Polyglot, new Resource(ResourceType.Polyglot, 2, 0));
		this.resources.set(ResourceType.AstralFire, new Resource(ResourceType.AstralFire, 3, 0));
		this.resources.set(ResourceType.UmbralIce, new Resource(ResourceType.UmbralIce, 3, 0));
		this.resources.set(ResourceType.UmbralHeart, new Resource(ResourceType.UmbralHeart, 3, 0));

		this.resources.set(ResourceType.LeyLines, new Resource(ResourceType.LeyLines, 1, 0));
		this.resources.set(ResourceType.Sharpcast, new Resource(ResourceType.Sharpcast, 1, 0));
		this.resources.set(ResourceType.Enochian, new Resource(ResourceType.Enochian, 1, 0));
		this.resources.set(ResourceType.Paradox, new Resource(ResourceType.Paradox, 1, 0));
		this.resources.set(ResourceType.Firestarter, new Resource(ResourceType.Firestarter, 1, 0));
		this.resources.set(ResourceType.Thundercloud, new Resource(ResourceType.Thundercloud, 1, 0));
		this.resources.set(ResourceType.ThunderDoTTick, new Resource(ResourceType.ThunderDoTTick, 1, 0));
		this.resources.set(ResourceType.ThunderDoT, new Resource(ResourceType.ThunderDoT, 1, 0));
		this.resources.set(ResourceType.Manaward, new Resource(ResourceType.Manaward, 1, 0));
		this.resources.set(ResourceType.Triplecast, new Resource(ResourceType.Triplecast, 3, 0));
		this.resources.set(ResourceType.Addle, new Resource(ResourceType.Addle, 1, 0));
		this.resources.set(ResourceType.Swiftcast, new Resource(ResourceType.Swiftcast, 1, 0));
		this.resources.set(ResourceType.LucidDreaming, new Resource(ResourceType.LucidDreaming, 1, 0));
		this.resources.set(ResourceType.LucidTick, new Resource(ResourceType.LucidDreaming, 1, 0));
		this.resources.set(ResourceType.Surecast, new Resource(ResourceType.Surecast, 1, 0));
		this.resources.set(ResourceType.Tincture, new Resource(ResourceType.Tincture, 1, 0));

		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(ResourceType.NotCasterTaxed, new Resource(ResourceType.NotCasterTaxed, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(ResourceType.cd_GCD, new CoolDown(ResourceType.cd_GCD, config.adjustedCastTime(2.5), 1, 1));
		this.cooldowns.set(ResourceType.cd_Sharpcast, new CoolDown(ResourceType.cd_Sharpcast, 30, 2, 2));
		this.cooldowns.set(ResourceType.cd_LeyLines, new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Transpose, new CoolDown(ResourceType.cd_Transpose, 5, 1, 1));
		this.cooldowns.set(ResourceType.cd_Manaward, new CoolDown(ResourceType.cd_Manaward, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_BetweenTheLines, new CoolDown(ResourceType.cd_BetweenTheLines, 3, 1, 1));
		this.cooldowns.set(ResourceType.cd_AetherialManipulation, new CoolDown(ResourceType.cd_AetherialManipulation, 10, 1, 1));
		this.cooldowns.set(ResourceType.cd_Triplecast, new CoolDown(ResourceType.cd_Triplecast, 60, 2, 2));
		this.cooldowns.set(ResourceType.cd_Manafont, new CoolDown(ResourceType.cd_Manafont, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Amplifier, new CoolDown(ResourceType.cd_Amplifier, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Addle, new CoolDown(ResourceType.cd_Addle, 90, 1, 1));
		this.cooldowns.set(ResourceType.cd_Swiftcast, new CoolDown(ResourceType.cd_Swiftcast, 60, 1, 1));
		this.cooldowns.set(ResourceType.cd_LucidDreaming, new CoolDown(ResourceType.cd_LucidDreaming, 60, 1, 1));
		this.cooldowns.set(ResourceType.cd_Surecast, new CoolDown(ResourceType.cd_Surecast, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Tincture, new CoolDown(ResourceType.cd_Tincture, 270, 1, 1));

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

	#init()
	{
		if (Debug.disableManaTicks === false) {
			// get mana ticks rolling (through recursion)
			let game = this;
			let recurringManaRegen = ()=>{
				// mana regen
				let mana = this.resources.get(ResourceType.Mana);
				let gainAmount = this.captureManaRegenAmount();
				mana.gain(gainAmount);
				let currentAmount = mana.currentValue;
				controller.reportManaTick(game.time, "MP +" + gainAmount + " (MP="+currentAmount+")");
				addLog(LogCategory.Event, "mana tick +" + gainAmount, this.getDisplayTime(), Color.ManaTick);
				// queue the next tick
				this.resources.addResourceEvent(ResourceType.Mana, "mana tick", 3, rsc=>{
					recurringManaRegen();
				}, Color.ManaTick, false);
			};
			this.resources.addResourceEvent(ResourceType.Mana, "initial mana tick", this.config.timeTillFirstManaTick, recurringManaRegen, Color.ManaTick, false);
		}

		// also polyglot
		let recurringPolyglotGain = (rsc: Resource)=>{
			if (this.hasEnochian()) rsc.gain(1);
			this.resources.addResourceEvent(ResourceType.Polyglot, "gain polyglot if currently has enochian", 30, recurringPolyglotGain);
		};
		recurringPolyglotGain(this.resources.get(ResourceType.Polyglot));
	}

	// advance game state by this much time
	tick(deltaTime: number, prematureStopCondition=()=>{ return false; })
	{
		//======== events ========
		let cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime && this.eventsQueue.length > 0 && !prematureStopCondition())
		{
			// make sure events are in proper order
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
						if (e.shouldLog) addLog(LogCategory.Event, e.name, this.getDisplayTime(), e.logColor);
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

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).currentValue; }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).currentValue; }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).currentValue; }
	getMP() { return this.resources.get(ResourceType.Mana).currentValue; }

	getDisplayTime() {
		return (this.time - this.config.countdown);
	}

	switchToAForUI(rscType: ResourceType, numStacks: number)
	{
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		let paradox = this.resources.get(ResourceType.Paradox);
		if (rscType===ResourceType.AstralFire)
		{
			af.gain(numStacks);
			if (ui.available(3) && uh.available(3)) {
				paradox.gain(1);
				addLog(LogCategory.Event, "Paradox! (UI -> AF)", this.getDisplayTime());
			}
			ui.consume(ui.currentValue);
		}
		else if (rscType===ResourceType.UmbralIce)
		{
			ui.gain(numStacks);
			if (af.available(3)) {
				paradox.gain(1);
				addLog(LogCategory.Event, "Paradox! (AF -> UI)", this.getDisplayTime());
			}
			af.consume(af.currentValue);
		}
	}

	// number -> number
	captureDamage(aspect: Aspect, basePotency: number)
	{
		let mod = StatsModifier.fromResourceState(this.resources);

		let potency = basePotency * mod.damageBase;

		if (aspect === Aspect.Fire)
		{
			potency *= mod.damageFire;
		}
		else if (aspect === Aspect.Ice)
		{
			potency *= mod.damageIce;
		}
		return potency;
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

	captureSpellCastAndRecastTimeScale(aspect: Aspect, baseCastTime: number) {
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = baseCastTime * mod.castTimeBase;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return [castTime, mod.spellRecastTimeScale];
	}

	dealDamage(potency: number, source="unknown") {
		// report damage is moved to capture time
	}

	reportPotency(node: ActionNode, potency: number, source: string) {
		node.tmp_capturedPotency = (node.tmp_capturedPotency ?? 0) + potency;
		controller.reportDamage({
			potency: potency,
			time: this.time,
			source: source
		});
		controller.reportPotencyUpdate();
	}

	castSpell(
		skillName: SkillName,
		onCapture: (cap: SkillCaptureCallbackInfo)=>void,
		onApplication: (app: SkillApplicationCallbackInfo)=>void,
		node: ActionNode)
	{
		let skill = this.skillsList.get(skillName);
		let skillInfo = skill.info;
		console.assert(skillInfo.isSpell);
		let cd = this.cooldowns.get(skillInfo.cdName);
		let [capturedManaCost, uhConsumption] = this.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);
		let [capturedCastTime, recastTimeScale] = this.captureSpellCastAndRecastTimeScale(
			skillInfo.aspect, this.config.adjustedCastTime(skillInfo.baseCastTime));

		let skillTime = this.getDisplayTime();

		let takeEffect = function(game: GameState) {
			let resourcesStillAvailable = skill.available();
			let sourceName = skillInfo.name + "@"+skillTime.toFixed(2)
			if (resourcesStillAvailable) {
				// re-capture them here, since game state might've changed (say, AF/UI fell off)
				[capturedManaCost, uhConsumption] = game.captureManaCostAndUHConsumption(skillInfo.aspect, skillInfo.baseManaCost);
				// actually deduct resources
				// TODO: find a better place to put this paradox mana cost exception?
				if (!(skillName===SkillName.Paradox && game.getIceStacks()>0)) game.resources.get(ResourceType.Mana).consume(capturedManaCost);
				if (uhConsumption > 0) game.resources.get(ResourceType.UmbralHeart).consume(uhConsumption);
				if (capturedManaCost > 0)
					addLog(LogCategory.Event, skillName + " cost " + capturedManaCost + "MP", game.getDisplayTime());
				let capturedPotency = game.captureDamage(skillInfo.aspect, skillInfo.basePotency);
				game.reportPotency(node, capturedPotency, sourceName);
				let captureInfo: SkillCaptureCallbackInfo = {
					capturedManaCost: capturedManaCost
					//...
				};
				onCapture(captureInfo);

				// effect application
				game.addEvent(new Event(
					skillInfo.name + " applied",
					skillInfo.skillApplicationDelay,
					()=>{
						game.dealDamage(capturedPotency, sourceName);
						let applicationInfo: SkillApplicationCallbackInfo = {
							//...
						};
						onApplication(applicationInfo);
					},
					Color.Text));
				return true;
			} else {
				//console.log(skillName + " failed; rewinding game...");
				addLog(
					LogCategory.Event,
					skillName + " cast failed! Resources no longer available.",
					game.getDisplayTime(),
					Color.Error);
				// unlock movement and casting
				//game.resources.get(ResourceType.NotCasterTaxed).gain(1);
				//game.resources.get(ResourceType.NotCasterTaxed).removeTimer();
				return false;
			}
		}

		let instantCast = function(game: GameState, rsc: Resource | undefined)
		{
			let instantCastReason = rsc ? rsc.type : "(unknown, paradox?)";
			addLog(LogCategory.Event, "a cast is made instant via " + instantCastReason, game.getDisplayTime(), Color.Success);
			if (rsc) rsc.consume(1);
			takeEffect(game);

			// recast
			cd.useStack();
			cd.setRecastTimeScale(recastTimeScale)

			// animation lock
			game.resources.takeResourceLock(ResourceType.NotAnimationLocked, game.config.animationLock);
		}

		// Paradox made instant via UI
		if (skillName === SkillName.Paradox && this.getIceStacks() > 0) {
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
				addLog(LogCategory.Event, "all triple charges used", this.getDisplayTime());
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
				controller.rewindUntilBefore(node);
				controller.autoSave();
			}
		}));

		// recast
		cd.useStack();
		cd.setRecastTimeScale(recastTimeScale)

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotCasterTaxed, capturedCastTime + this.config.casterTax);
	}

	useInstantSkill(
		skillName: SkillName,
		effectFn: ()=>void,
		dealDamage: boolean,
		node: ActionNode)
	{
		console.assert(node);
		let skillInfo = this.skillsList.get(skillName).info;
		let skillTime = this.getDisplayTime();
		let cd = this.cooldowns.get(skillInfo.cdName);
		let sourceName = skillInfo.name+"@"+skillTime.toFixed(2);

		let capturedDamage = 0;
		if (dealDamage) {
			capturedDamage = this.captureDamage(skillInfo.aspect, skillInfo.basePotency);
			this.reportPotency(node, capturedDamage, sourceName);
		}
		let [capturedCastTime, recastTimeScale] = this.captureSpellCastAndRecastTimeScale(skillInfo.aspect, 0);

		let skillEvent = new Event(
			skillInfo.name + " applied",
			skillInfo.skillApplicationDelay,
			()=>{
				if (dealDamage) this.dealDamage(capturedDamage, sourceName);
				effectFn();
			}
			, Color.Text);
		this.addEvent(skillEvent);

		// recast
		cd.useStack();
		if (skillInfo.isSpell) cd.setRecastTimeScale(recastTimeScale);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.animationLock);
	}

	hasEnochian()
	{
		// lasts a teeny bit longer to allow simultaneous events catch its effect
		let enochian = this.resources.get(ResourceType.Enochian);
		return enochian.available(1);
	}

	// falls off after 15s unless refreshed by AF / UI
	startOrRefreshEnochian() {
		let enochian = this.resources.get(ResourceType.Enochian);

		if (enochian.available(1)) {
			// refresh
			enochian.overrideTimer(this, 15);
			addLog(LogCategory.Event, "refresh enochian timer", this.getDisplayTime());

		} else {
			// fresh gain
			enochian.gain(1);

			// add the event for losing it
			this.resources.addResourceEvent(ResourceType.Enochian, "lose enochian, clear all AF, UI, UH, stop poly timer", 15, rsc=>{
				this.loseEnochian();
			});

			addLog(LogCategory.Event, "override poly timer to 30", this.getDisplayTime(), Color.Text);
			// reset polyglot countdown to 30s
			this.resources.get(ResourceType.Polyglot).overrideTimer(this, 30);
		}
	}

	loseEnochian() {
		this.resources.get(ResourceType.Enochian).consume(1);
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		af.consume(af.currentValue);
		ui.consume(ui.currentValue);
		uh.consume(uh.currentValue);
	}

	#timeTillSkillAvailable(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let cdName = skill.info.cdName;
		let tillNextCDStack = this.cooldowns.timeTillNextStackAvailable(cdName);
		return Math.max(this.timeTillAnySkillAvailable(), tillNextCDStack);
	}

	timeTillAnySkillAvailable() {
		let tillNotAnimationLocked = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNotCasterTaxed = this.resources.timeTillReady(ResourceType.NotCasterTaxed);
		return Math.max(tillNotAnimationLocked, tillNotCasterTaxed);
	}

	getSkillAvailabilityStatus(skillName: SkillName) {
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.#timeTillSkillAvailable(skill.info.name);
		let [capturedManaCost, uhConsumption] = skill.info.isSpell ? this.captureManaCostAndUHConsumption(skill.info.aspect, skill.info.baseManaCost) : [0,0];
		let [capturedCastTime, recastTimeScale] = this.captureSpellCastAndRecastTimeScale(
			skill.info.aspect, this.config.adjustedCastTime(skill.info.baseCastTime));
		let instantCastAvailable = this.resources.get(ResourceType.Triplecast).available(1) || this.resources.get(ResourceType.Swiftcast).available(1);
		let currentMana = this.resources.get(ResourceType.Mana).currentValue;

		let notBlocked = timeTillAvailable <= Debug.epsilon;
		let enoughMana = capturedManaCost <= currentMana
			|| (skillName===SkillName.Paradox && this.getIceStacks()>0)
			|| (skillName===SkillName.Thunder3 && this.resources.get(ResourceType.Thundercloud).available(1))
			|| (skillName===SkillName.Fire3 && this.resources.get(ResourceType.Firestarter).available((1)));
		let reqsMet = skill.available();
		let status = SkillReadyStatus.Ready;
		if (!notBlocked) status = SkillReadyStatus.Blocked;
		else if (!enoughMana) status = SkillReadyStatus.NotEnoughMP;
		else if (!reqsMet) status = SkillReadyStatus.RequirementsNotMet;

		let cd = this.cooldowns.get(skill.info.cdName);
		let cdReadyCountdown = this.cooldowns.timeTillNextStackAvailable(skill.info.cdName);
		let cdRecastTime = cd.cdPerStack * (skill.info.isSpell ? recastTimeScale : 1);

		return {
			status: status,
			description: "",
			stacksAvailable: cd.stacksAvailable(),
			castTime: capturedCastTime,
			instantCast: instantCastAvailable,
			cdRecastTime: cdRecastTime,
			cdReadyCountdown: cdReadyCountdown,
			timeTillAvailable: timeTillAvailable,
			capturedManaCost: capturedManaCost,
		};
	}

	useSkill(skillName: SkillName, node: ActionNode) {
		let skill = this.skillsList.get(skillName);
		skill.use(this, node);
	}

	toString() {
		let s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).currentValue + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).currentValue + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).currentValue + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).currentValue + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).currentValue + "\n";
		s += "TC:\t" + this.resources.get(ResourceType.Thundercloud).currentValue + "\n";
		s += "LL:\t" + this.resources.get(ResourceType.LeyLines).currentValue + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).currentValue + "\n";
		s += "GCD:\t" + this.cooldowns.get(ResourceType.cd_GCD).currentValue.toFixed(3) + "\n";
		s += "LLCD:\t" + this.cooldowns.get(ResourceType.cd_LeyLines).currentValue.toFixed(3) + "\n";
		return s;
	}
}