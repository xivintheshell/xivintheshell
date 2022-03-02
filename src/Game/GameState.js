import {Aspect, GameConfig, ResourceType} from "./Common"
import {StatsModifier} from "./Stats";
import {makeSkillsList} from "./Skills"
import {CoolDown, CoolDownState, Event, Resource, ResourceState} from "./Resources"


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
		this.resources.set(ResourceType.Enochian, new Resource(ResourceType.Enochian, 1, 0));
		this.resources.set(ResourceType.Paradox, new Resource(ResourceType.Paradox, 1, 0));
		this.resources.set(ResourceType.Firestarter, new Resource(ResourceType.Firestarter, 1, 0));
		this.resources.set(ResourceType.Thundercloud, new Resource(ResourceType.Thundercloud, 1, 0));

		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		//this.resources.set(ResourceType.NotCasting, new Resource(ResourceType.NotCasting, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDownState(this);
		this.cooldowns.set(ResourceType.cd_GCD, new CoolDown(ResourceType.cd_GCD, this.config.gcd, 1, 1));
		this.cooldowns.set(ResourceType.cd_Sharpcast, new CoolDown(ResourceType.cd_Sharpcast, 30, 2, 2));
		this.cooldowns.set(ResourceType.cd_LeyLines, new CoolDown(ResourceType.cd_LeyLines, 120, 1, 1));
		this.cooldowns.set(ResourceType.cd_TripleCast, new CoolDown(ResourceType.cd_TripleCast, 60, 2, 2));
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
	}

	// advance game state by this much time
	tick(deltaTime)
	{
		//======== events ========
		var cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime - this.config.epsilon && this.eventsQueue.length > 0)
		{
			// make sure events are in proper order
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);

			// make a deep copy of events to advance for this round...
			const eventsToExecuteOld = [];
			for (var i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			let executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				if (e.timeTillEvent <= this.config.epsilon)
				{
					if (!e.canceled)
					{
						e.effectFn(this);
						console.log(this.time.toFixed(3) + "s: " + e.name);
					}
					executedEvents++;
				}
				e.timeTillEvent -= timeToTick;
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);

			cumulativeDeltaTime += timeToTick;
		}
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

	captureSpellCastAndRecastTimeScale(aspect, baseCastTime)
	{
		let mod = StatsModifier.fromResourceState(this.resources);

		let castTime = baseCastTime * mod.castTimeBase;
		if (aspect === Aspect.Fire) castTime *= mod.castTimeFire;
		else if (aspect === Aspect.Ice) castTime *= mod.castTimeIce;

		return [castTime, mod.spellRecastTimeScale];
	}

	// number -> ()
	dealDamage(potency)
	{
		// placeholder
		// console.log("    BOOM! " + potency);
	}

	castSpell(aspect, cdName, capturedCastTime, recastTimeScale, damageApplicationDelay, basePotency, capturedManaCost)
	{
		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - this.config.slideCastDuration);

		// (basically done casting) deduct MP, calc damage, queue actual damage
		this.addEvent(new Event("deduct MP & calc damage", capturedCastTime - this.config.slideCastDuration, ()=>{
			this.resources.get(ResourceType.Mana).consume(capturedManaCost); // actually deduct mana
			let capturedDamage = this.captureDamage(aspect, basePotency);
			this.addEvent(new Event(
				"apply spell damage: " + capturedDamage,
				this.config.slideCastDuration + damageApplicationDelay,
				()=>{ this.dealDamage(capturedDamage); }));
		}));

		// casting status (TODO: this doesn't do anything meaningful though, delete it?)
		//this.resources.takeResourceLock(ResourceType.NotCasting, castTime);

		// recast
		this.cooldowns.useStack(cdName);
		this.cooldowns.setRecastTimeScale(cdName, recastTimeScale);

		// caster tax
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, capturedCastTime + this.config.casterTax);
	}

	useAbility(cdName, effectApplicationDelay, effectFn)
	{
		console.log(this.time.toFixed(3) + "s: use ability with cd [" + cdName + "]");
		this.addEvent(new Event(
			"apply ability with cd [" + cdName + "]",
			effectApplicationDelay,
			()=>{ effectFn(); }
		));

		// recast
		this.cooldowns.useStack(cdName);

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

			console.log(this.time.toFixed(3) + "s: override poly timer to 30");
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

	timeTillNextSkillAvailable()
	{
		return this.resources.timeTillReady(ResourceType.NotAnimationLocked);
	}

	timeTillNextUseAvailable(cdName)
	{
		let tillNextSkill = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let tillNextStack = this.cooldowns.timeTillNextStackAvailable(cdName);
		return Math.max(tillNextSkill, tillNextStack);
	}

	// basically the action when you press down the skill button
	useSkillIfAvailable(skillName)
	{
		let skill = this.skillsList.get(skillName);
		for (let i = 0; i < skill.instances.length; i++)
		{
			if (skill.instances[i].available(this))
			{
				console.log(this.time.toFixed(3) + "s: use skill [" + skillName + "] - " + skill.instances[i].description);
				skill.instances[i].use(this);
				return;
			}
		}
		let timeTillAvailable = skill.timeTillAvailable();
		console.log("none of the instances are available (nothing happened). available in " + timeTillAvailable.toFixed(3) + "s.");
	}

	toString()
	{
		var s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).currentValue + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).currentValue + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).currentValue + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).currentValue + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).currentValue + "\n";
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
	if (game.config.disableManaAndThunderTicks === 0)
	{
		// get mana and thunder ticks rolling (through recursion)
		let recurringManaRegen = ()=>{
			// mana regen
			var additionalGain = 0;
			// TODO: apply modifiers
			game.resources.get(ResourceType.Mana).gain(200 + additionalGain);
			// queue the next tick
			game.addEvent(new Event("ManaTick", 3, recurringManaRegen));
		};
		let recurringThunderTick = ()=>{
			// TODO: tick effect
			game.addEvent(new Event("ThunderTick", 3, recurringThunderTick));
		};
		game.addEvent(new Event("InitialManaTick", 0.2, recurringManaRegen));
		game.addEvent(new Event("InitialThunderTick", 0.8, recurringThunderTick));
	}

	// also polyglot
	let recurringPolyglotGain = rsc=>{
		if (game.hasEnochian()) rsc.gain(1);
		game.resources.addResourceEvent(ResourceType.Polyglot, "gain polyglot if currently has enochian", 30, recurringPolyglotGain);
	};
	recurringPolyglotGain(ResourceType.Polyglot);

	console.log(game);
	console.log("========");
}