import { Constants, ResourceType, Aspect } from "./Common"
import { StatsModifier } from "./Stats";
import { makeSkillsList } from "./Skills"
import { Resource, ResourceState, CoolDowns, Event } from "./Resources"


// GameState := resources + events queue
class GameState
{
	constructor()
	{
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
		this.resources.set(ResourceType.NotCasting, new Resource(ResourceType.NotCasting, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));

		// skill CDs (also a form of resource)
		this.cooldowns = new CoolDowns(this);
		this.cooldowns.set(ResourceType.cd_GCD, new Resource(ResourceType.cd_GCD, Constants.gcd, Constants.gcd));
		this.cooldowns.set(ResourceType.cd_Sharpcast, new Resource(ResourceType.cd_Sharpcast, 60, 60));
		this.cooldowns.set(ResourceType.cd_LeyLines, new Resource(ResourceType.cd_LeyLines, 1, 0));
		this.cooldowns.set(ResourceType.cd_TripleCast, new Resource(ResourceType.cd_TripleCast, 2, 0));
		this.cooldowns.set(ResourceType.cd_Manafont, new Resource(ResourceType.cd_Manafont, 1, 0));
		this.cooldowns.set(ResourceType.cd_Amplifier, new Resource(ResourceType.cd_Amplifier, 1, 0));

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
		while (cumulativeDeltaTime < deltaTime - Constants.epsilon && this.eventsQueue.length > 0)
		{
			// make sure events are in proper order
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything or ticking past deltaTime
			let timeToTick = Math.min(deltaTime - cumulativeDeltaTime, this.eventsQueue[0].timeTillEvent);

			// advance time
			this.time += timeToTick;
			this.cooldowns.tick(timeToTick);

			// make a deep copy of events to advance for this round...
			var eventsToExecuteOld = [];
			for (var i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			var executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				if (e.timeTillEvent <= Constants.epsilon)
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
		let mod = this.combinedStatsModifier();

		var potency = basePotency * mod.damageBase;

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
		let mod = this.combinedStatsModifier();

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

	// number -> ()
	dealDamage(potency)
	{
		// placeholder
		// console.log("    BOOM! " + potency);
	}

	castGCDSpell(aspect, castTime, damageApplicationDelay, potency, manaCost)
	{
		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, castTime - 0.5);

		// casting status
		this.resources.takeResourceLock(ResourceType.NotCasting, castTime);

		// (after done casting) deduct MP, calc damage, queue actual damage 
		this.addEvent(new Event("deduct MP & calc damage", castTime, ()=>{
			this.resources.get(ResourceType.Mana).consume(manaCost); // actually deduct mana
			let capturedDamage = this.captureDamage(aspect, potency);
			this.addEvent(new Event("apply damage: " + capturedDamage, damageApplicationDelay, ()=>{ this.dealDamage(capturedDamage); }));
		}));

		// recast (GCD ready)
		this.cooldowns.use(ResourceType.cd_GCD, Constants.gcd);

		// animation lock
		this.resources.takeResourceLock(ResourceType.NotAnimationLocked, castTime + Constants.casterTax);
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

			console.log(this.time + "s: override poly timer to 30");
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

	timeTillNextGCDAvailable()
	{
		let nextSkillTime = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let nextGCDReady = Constants.gcd - this.cooldowns.get(ResourceType.cd_GCD).currentValue;
		return Math.max(nextSkillTime, nextGCDReady);
	}

	// basically the action when you press down the skill button
	useSkillIfAvailable(skillName)
	{
		let skill = this.skillsList.get(skillName);
		for (var i = 0; i < skill.instances.length; i++)
		{
			if (skill.instances[i].available(this))
			{
				console.log(this.time + "s: use skill [" + skillName + "] - " + skill.instances[i].description);
				skill.instances[i].use(this);
				return;
			}
		}
		console.log("none of the skill instances are available (nothing happened)");
	}

	updateStatsModifiers()
	{
		this.resources.resetStatsModifiers();

		let ui = this.resources.get(ResourceType.UmbralIce);
		if (ui.currentValue === 1) {
			ui.statsModifier.manaRegen = 2800;
			ui.statsModifier.manaCostFire = 0;
			ui.statsModifier.damageFire = 0.9;
			ui.statsModifier.manaCostIce = 0.75;
		} else if (ui.currentValue === 2) {
			ui.statsModifier.manaRegen = 4300;
			ui.statsModifier.manaCostFire = 0;
			ui.statsModifier.damageFire = 0.8;
			ui.statsModifier.manaCostIce = 0.5;
		} else if (ui.currentValue === 3) {
			ui.statsModifier.manaRegen = 5800;
			ui.statsModifier.manaCostFire = 0;
			ui.statsModifier.damageFire = 0.7;
			ui.statsModifier.manaCostIce = 0;
			ui.statsModifier.castTimeFire = 0.5;
		}

		let af = this.resources.get(ResourceType.AstralFire);
		if (af.currentValue === 1) {
			af.statsModifier.manaRegen = -400;
			af.statsModifier.manaCostFire = 2;
			af.statsModifier.damageFire = 1.4;
			af.statsModifier.manaCostIce = 0;
			af.statsModifier.damageIce = 0.9;
		} else if (af.currentValue === 2) {
			af.statsModifier.manaRegen = -400;
			af.statsModifier.manaCostFire = 2;
			af.statsModifier.damageFire = 1.6;
			af.statsModifier.manaCostIce = 0;
			af.statsModifier.damageIce = 0.8;
		} else if (af.currentValue === 3) {
			af.statsModifier.manaRegen = -400;
			af.statsModifier.manaCostFire = 2;
			af.statsModifier.damageFire = 1.8;
			af.statsModifier.manaCostIce = 0;
			af.statsModifier.damageIce = 0.7;
			af.statsModifier.castTimeIce = 0.5;
		}

		let uh = this.resources.get(ResourceType.UmbralHeart);
		if (uh.available(1))
		{
			af.statsModifier.manaCostFire = 1;
		}
	}
	combinedStatsModifier()
	{
		this.updateStatsModifiers();
		let ret = StatsModifier.base();
		for (var resource of this.resources.values())
		{
			ret.apply(resource.statsModifier);
		}
		return ret;
	}

	toString()
	{
		var s = "======== " + this.time.toFixed(3) + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).currentValue + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).currentValue + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).currentValue + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).currentValue + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).currentValue + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).currentValue + "\n";
		s += "Para:\t" + this.resources.get(ResourceType.Paradox).currentValue + "\n";
		s += "GCD:\t" + this.cooldowns.get(ResourceType.cd_GCD).currentValue + "\n";
		return s;
	}
};

/*
Time is automatically advanced untill next available skill time.
*/

export var game = new GameState();

export function runTest()
{
	if (Constants.disableManaAndThunderTicks === 0)
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