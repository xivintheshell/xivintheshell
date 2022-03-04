import {Aspect, GameConfig, ResourceType} from "./Common"
import {StatsModifier} from "./Stats";
import {makeSkillsList, skillInfos} from "./Skills"
import {CoolDown, CoolDownState, Event, Resource, ResourceState} from "./Resources"

import {controller} from "../Controller/Controller";
import {Color, LogCategory} from "../Controller/Common";

// GameState := resources + events queue
class GameState
{
	constructor(config)
	{
		this.config = config;

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
		this.resources.set(ResourceType.ThunderDoT, new Resource(ResourceType.ThunderDoT, 1, 0));
		this.resources.set(ResourceType.Manaward, new Resource(ResourceType.Manaward, 1, 0));
		this.resources.set(ResourceType.Triplecast, new Resource(ResourceType.Triplecast, 3, 0));

		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(ResourceType.cd_GCD, new CoolDown(ResourceType.cd_GCD, this.config.gcd, 1, 1));
		this.cooldowns.set(ResourceType.cd_Sharpcast, new CoolDown(ResourceType.cd_Sharpcast, 30, 2, 2));
		this.cooldowns.set(ResourceType.cd_LeyLines, new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Transpose, new CoolDown(ResourceType.cd_Transpose, 5, 1, 1));
		this.cooldowns.set(ResourceType.cd_Manaward, new CoolDown(ResourceType.cd_Manaward, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_BetweenTheLines, new CoolDown(ResourceType.cd_BetweenTheLines, 3, 1, 1));
		this.cooldowns.set(ResourceType.cd_AetherialManipulation, new CoolDown(ResourceType.cd_AetherialManipulation, 10, 1, 1));
		this.cooldowns.set(ResourceType.cd_Triplecast, new CoolDown(ResourceType.cd_Triplecast, 60, 2, 2));
		this.cooldowns.set(ResourceType.cd_Manafont, new CoolDown(ResourceType.cd_Manafont, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_Amplifier, new CoolDown(ResourceType.cd_Amplifier, 120, 1, 1));

		// EVENTS QUEUE (events decide future changes to resources)
		// which might include:
		// - damage calc (enqueues damage application)
		// - damage application (by damage calc)
		//   (dot as a flag for whether dot tick causes damage)
		// - dot application / refresh (put dot up, refresh timer by removing and re-enqueueing "thunder fall off" event)
		// - dot fall off (by dot application)
		// - modifiers up (which potentially enqueues modifier down)
		// - modifiers down (by modifiers up)
		this.eventsQueue = [];

		// SKILLS (instantiated once, read-only later)
		this.skillsList = makeSkillsList(this);
		this.skillsList.setSkillInfos(skillInfos);
	}

	init()
	{
		if (this.config.disableManaAndThunderTicks === 0)
		{
			// get mana and thunder ticks rolling (through recursion)
			let recurringManaRegen = ()=>{
				// mana regen
				let amount = this.captureManaRegenAmount();
				this.resources.get(ResourceType.Mana).gain(amount);
				controller.log(LogCategory.Event, "mana tick +" + amount, this.time, Color.ManaTick);
				// queue the next tick
				let nextTick = new Event("mana tick", 3, recurringManaRegen, Color.Text, false);
				this.addEvent(nextTick);
			};
			this.addEvent(new Event("initial mana tick", this.config.timeTillFirstManaTick, recurringManaRegen, Color.ManaTick));
		}

		// also polyglot
		let recurringPolyglotGain = rsc=>{
			if (this.hasEnochian()) rsc.gain(1);
			this.resources.addResourceEvent(ResourceType.Polyglot, "gain polyglot if currently has enochian", 30, recurringPolyglotGain);
		};
		recurringPolyglotGain(ResourceType.Polyglot);
	}

	// advance game state by this much time
	tick(deltaTime)
	{
		//======== events ========
		var cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime && this.eventsQueue.length > 0)
		{
			// make sure events are in proper order
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);
			cumulativeDeltaTime = Math.min(cumulativeDeltaTime + timeToTick, deltaTime);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);
			console.log("    tick " + timeToTick + " now at " + this.time);

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
				console.log(e.name + " in " + e.timeTillEvent);
				if (e.timeTillEvent <= this.config.epsilon)
				{
					if (!e.canceled)
					{
						if (e.shouldLog) controller.log(LogCategory.Event, e.name, this.time, e.logColor);
						e.effectFn(this);
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);
		}
		console.log(game.toString());
		console.log(game.resources);
	}

	addEvent(evt)
	{
		this.eventsQueue.push(evt);
	}

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).currentValue; }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).currentValue; }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).currentValue; }
	getMP() { return this.resources.get(ResourceType.Mana).currentValue; }

	// number -> number
	captureDamage(aspect, basePotency)
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

	captureManaCost(aspect, baseManaCost)
	{
		let mod = StatsModifier.fromResourceState(this.resources);

		if (aspect === Aspect.Fire)
		{
			return baseManaCost * mod.manaCostFire;
		}
		else if (aspect === Aspect.Ice)
		{
			return baseManaCost * mod.manaCostIce;
		}
		else
		{
			return baseManaCost;
		}
	}

	captureManaRegenAmount()
	{
		let mod = StatsModifier.fromResourceState(this.resources);
		return mod.manaRegen;
	}

	captureSpellCastAndRecastTimeScale(aspect, baseCastTime)
	{
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = baseCastTime * mod.castTimeBase;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return [castTime, mod.spellRecastTimeScale];
	}

	dealDamage(potency)
	{
		controller.log(LogCategory.Event, "dealing damage of potency " + potency.toFixed(1), this.time, Color.Damage);
	}

	castSpell(skillName, onCapture, onApplication)
	{
		let skillInfo = this.skillsList.get(skillName).info;
		let cd = this.cooldowns.get(skillInfo.cdName);
		let capturedManaCost = this.captureManaCost(skillInfo.aspect, skillInfo.baseManaCost);

		let takeEffect = function(game, additionalDelay)
		{
			game.resources.get(ResourceType.Mana).consume(capturedManaCost); // actually deduct mana
			let capturedPotency = game.captureDamage(skillInfo.aspect, skillInfo.basePotency);
			let captureInfo = {
				capturedManaCost: capturedManaCost
				//...
			};
			onCapture(captureInfo);

			// effect application
			game.addEvent(new Event(
				skillInfo.name + " applied and cost " + capturedManaCost + "MP",
				additionalDelay + skillInfo.damageApplicationDelay,
				()=>{
					game.dealDamage(capturedPotency);
					let applicationInfo = {
						//...
					};
					onApplication(applicationInfo);
				},
				Color.Text));
		}

		// if there's a triplecast charge, use it and make this skill instant.
		let triple = this.resources.get(ResourceType.Triplecast);
		if (triple.available(1)) // made instant via a triple stack
		{
			controller.log(LogCategory.Event, "a cast is made instant via a triplecast charge", game.time, Color.Success);
			triple.consume(1);
			takeEffect(this, 0);

			// recast
			cd.useStack();

			// animation lock
			this.resources.takeResourceLock(ResourceType.NotAnimationLocked, this.config.animationLock);

			return;
		}

		// there are no triplecast charges. cast and apply effect
		let [capturedCastTime, recastTimeScale] = this.captureSpellCastAndRecastTimeScale(skillInfo.aspect, skillInfo.baseCastTime);

		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - this.config.slideCastDuration);

		// (basically done casting) deduct MP, calc damage, queue damage
		this.addEvent(new Event(skillInfo.name + " captured", capturedCastTime - this.config.slideCastDuration, ()=>{
			takeEffect(this, this.config.slideCastDuration);
		}));

		// recast
		cd.useStack();
		cd.setRecastTimeScale(recastTimeScale)

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, capturedCastTime + this.config.casterTax);
	}

	useInstantSkill(skillName, effectFn)
	{
		let skillInfo = this.skillsList.get(skillName).info;
		let cd = this.cooldowns.get(skillInfo.cdName);

		let skillEvent = new Event(
			skillInfo.name + " applied",
			skillInfo.damageApplicationDelay,
			()=>{ effectFn(); }
			, Color.Text);
		this.addEvent(skillEvent);

		// recast
		cd.useStack();

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
	startOrRefreshEnochian()
	{
		let enochian = this.resources.get(ResourceType.Enochian);

		if (enochian.available(1)) 
		{
			// refresh
			enochian.overrideTimer(15);
		}
		else
		{
			// fresh gain
			enochian.gain(1);

			// add the event for losing it
			this.resources.addResourceEvent(ResourceType.Enochian, "lose enochian, clear all AF, UI, UH, stop poly timer", 15, rsc=>{
				this.loseEnochian();
			});

			controller.log(LogCategory.Event, "override poly timer to 30", this.time, Color.Text);
			// reset polyglot countdown to 30s
			this.resources.get(ResourceType.Polyglot).overrideTimer(30);
		}
	}

	loseEnochian()
	{
		this.resources.get(ResourceType.Enochian).consume(1);
		let af = this.resources.get(ResourceType.AstralFire);
		let ui = this.resources.get(ResourceType.UmbralIce);
		let uh = this.resources.get(ResourceType.UmbralHeart);
		af.consume(af.currentValue);
		ui.consume(ui.currentValue);
		uh.consume(uh.currentValue);
	}

	timeTillSkillAvailable(skillName)
	{
		// TODO: should also wait until next casting ends (make caster tax separate from animation lock?)
		let skill = this.skillsList.get(skillName);
		let cdName = skill.info.cdName;
		let tillAnySkill = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNextCDStack = this.cooldowns.timeTillNextStackAvailable(cdName);
		return Math.max(tillAnySkill, tillNextCDStack);
	}

	// basically the action when you press down the skill button
	useSkillIfAvailable(skillName)
	{
		let skill = this.skillsList.get(skillName);
		let timeTillAvailable = this.timeTillSkillAvailable(skill.info.name);
		let capturedManaCost = skill.info.isSpell ? this.captureManaCost(skill.info.aspect, skill.info.baseManaCost) : 0;
		if (timeTillAvailable > 0)
		{
			controller.log(
				LogCategory.Skill,
				skillName + " is not available yet. available in " +
					timeTillAvailable.toFixed(3) + "s.",
				this.time,
				Color.Error);
			return;
		}
		if (capturedManaCost > this.resources.get(ResourceType.Mana).currentValue)
		{
			controller.log(
				LogCategory.Skill,
				skillName + " is not available yet (not enough MP)",
				this.time,
				Color.Error);
			return;
		}
		for (let i = 0; i < skill.instances.length; i++)
		{
			if (skill.instances[i].available(this))
			{
				controller.log(
					LogCategory.Skill,
					"use skill [" + skillName + "] - " + skill.instances[i].description,
					this.time,
					Color.Text);
				controller.log(
					LogCategory.Event,
					"use skill [" + skillName + "] - " + skill.instances[i].description,
					this.time,
					Color.Success);
				skill.instances[i].use(this);
				return;
			}
		}
		controller.log(LogCategory.Skill, skillName + " failed (reqs not satisfied)", this.time, Color.Error);
	}

	toString()
	{
		var s = "======== " + this.time.toFixed(3) + "s ========\n";
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

/*
Time is automatically advanced untill next available skill time.
*/

export var game = new GameState(new GameConfig());

export function runTest()
{
	game.init();
	console.log(game);
	console.log("========");
}