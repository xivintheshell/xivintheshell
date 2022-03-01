import { Constants, ResourceType } from "./Common"
import { StatsModifier } from "./Stats";
import { makeSkillsList } from "./Skills"
import { Resource, ResourceState, Event } from "./Resources"


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

		this.resources.set(ResourceType.Enochian, new Resource(ResourceType.Enochian, 1, 0));
		this.resources.set(ResourceType.Paradox, new Resource(ResourceType.Paradox, 1, 0));
		this.resources.set(ResourceType.Firestarter, new Resource(ResourceType.Firestarter, 1, 0));
		this.resources.set(ResourceType.Thundercloud, new Resource(ResourceType.Thundercloud, 1, 0));

		this.resources.set(ResourceType.Movement, new Resource(ResourceType.Movement, 1, 1));
		this.resources.set(ResourceType.NotCasting, new Resource(ResourceType.NotCasting, 1, 1));
		this.resources.set(ResourceType.NotAnimationLocked, new Resource(ResourceType.NotAnimationLocked, 1, 1));
		this.resources.set(ResourceType.GCDReady, new Resource(ResourceType.GCDReady, 1, 1));

		this.resources.set(ResourceType.s_Sharpcast, new Resource(ResourceType.s_Sharpcast, 2, 0));
		this.resources.set(ResourceType.s_LeyLines, new Resource(ResourceType.s_LeyLines, 1, 0));
		this.resources.set(ResourceType.s_TripleCast, new Resource(ResourceType.s_TripleCast, 2, 0));
		this.resources.set(ResourceType.s_Manafont, new Resource(ResourceType.s_Manafont, 1, 0));
		this.resources.set(ResourceType.s_Amplifier, new Resource(ResourceType.s_Amplifier, 1, 0));
		// ... TODO

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

			// make a deep copy of events to advance for this round...
			var eventsToExecuteOld = [];
			for (var i = 0; i < this.eventsQueue.length; i++)
			{
				eventsToExecuteOld.push(this.eventsQueue[i]);
			}
			// actually tick them (which might enqueue new events)
			var executedEvents = 0;
			eventsToExecuteOld.forEach(e=>{
				e.timeTillEvent -= timeToTick;
				if (e.timeTillEvent <= Constants.epsilon)
				{
					if (!e.canceled)
					{
						e.effectFn(this);
						console.log((this.time + cumulativeDeltaTime + timeToTick).toFixed(2) + "s: " + e.name);
					}
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);

			cumulativeDeltaTime += timeToTick;
		}

		// actually update time
		this.time += deltaTime;
	}

	addEvent(evt)
	{
		//console.log((this.time).toFixed(2) + "s: (add evt) " + evt.name);
		//console.log(evt);
		this.eventsQueue.push(evt);
	}

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).currentValue; }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).currentValue; }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).currentValue; }
	getMP() { return this.resources.get(ResourceType.Mana).currentValue; }

	// number -> number
	captureDamage(basePotency)
	{
		// TODO: capture buffs, etc.
		return basePotency;
	}

	// number -> ()
	dealDamage(potency)
	{
		// placeholder
		// console.log("    BOOM! " + potency);
	}

	castGCDSpell(castTime, damageApplicationDelay, potency, manaCost)
	{
		// movement lock
		this.resources.takeResourceLock(ResourceType.Movement, castTime - 0.5);

		// casting status
		this.resources.takeResourceLock(ResourceType.NotCasting, castTime);

		// (after done casting) deduct MP, calc damage, queue actual damage 
		this.addEvent(new Event("deduct MP & calc damage", castTime, ()=>{
			this.resources.get(ResourceType.Mana).consume(manaCost); // actually deduct mana
			let capturedDamage = this.captureDamage(potency);
			this.addEvent(new Event("apply damage: " + capturedDamage, damageApplicationDelay, ()=>{ this.dealDamage(capturedDamage); }));
		}));

		// recast (GCD ready)
		this.resources.takeResourceLock(ResourceType.GCDReady, Constants.gcd);

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
				rsc.consume(1);
				let af = this.resources.get(ResourceType.AstralFire);
				let ui = this.resources.get(ResourceType.UmbralIce);
				let uh = this.resources.get(ResourceType.UmbralHeart);
				af.consume(af.currentValue);
				ui.consume(ui.currentValue);
				uh.consume(uh.currentValue);
			});

			// reset polyglot countdown to 30s
			this.resources.get(ResourceType.Polyglot).overrideTimer(30);
		}
	}

	timeTillNextGCDAvailable()
	{
		let nextSkillTime = this.resources.timeTillReady(ResourceType.NotAnimationLocked);
		let nextGCDReady = this.resources.timeTillReady(ResourceType.GCDReady);
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

	cumulativeStatsModifier()
	{
		let ret = new StatsModifier();
		for (var resource of this.resources.values())
		{
			ret.apply(resource.statsModifier);
		}
		return ret;
	}

	toString()
	{
		var s = "======== " + this.time + "s ========\n";
		s += "MP:\t" + this.resources.get(ResourceType.Mana).currentValue + "\n";
		s += "AF:\t" + this.resources.get(ResourceType.AstralFire).currentValue + "\n";
		s += "UI:\t" + this.resources.get(ResourceType.UmbralIce).currentValue + "\n";
		s += "UH:\t" + this.resources.get(ResourceType.UmbralHeart).currentValue + "\n";
		s += "Enochian:\t" + this.resources.get(ResourceType.Enochian).currentValue + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).currentValue + "\n";
		s += "Para:\t" + this.resources.get(ResourceType.Paradox).currentValue + "\n";
		s += "GCD Ready:\t" + this.resources.get(ResourceType.GCDReady).currentValue + "\n";
		return s;
	}
};

/*
Time is automatically advanced untill next available skill time.
*/

export var game = new GameState();

export function runTest()
{
	// get mana and thunder ticks rolling (through recursion)
	let recurringManaRegen = ()=>{
		// mana regen
		var additionalGain = 0;
		/* TODO: apply modifiers
		*/
		game.resources.get(ResourceType.Mana).gain(200 + additionalGain);
		// queue the next tick
		game.addEvent(new Event("ManaTick", 3, recurringManaRegen));
	};
	let recurringThunderTick = ()=>{
		// TODO: tick effect
		game.addEvent(new Event("ThunderTick", 3, recurringThunderTick));
	};

	// also polyglot
	let recurringPolyglotGain = rsc=>{
		if (game.hasEnochian()) rsc.gain(1);
		game.resources.addResourceEvent(ResourceType.Polyglot, "gain polyglot if currently has enochian", 30, recurringPolyglotGain);
	};
	recurringPolyglotGain(ResourceType.Polyglot);

	game.addEvent(new Event("InitialManaTick", 0.2, recurringManaRegen));
	game.addEvent(new Event("InitialThunderTick", 0.8, recurringThunderTick));
	console.log(game);
	console.log("========");

	console.log(game.resources.game);

	/*
	let base = StatsModifier.base();
	let mod = new StatsModifier();
	mod.damage = 0.1;
	mod.manaRegen = 100;
	base.apply(mod);
	console.log(base);
	console.log(StatsModifier.base());
	*/
}