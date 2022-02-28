import { StatsModifier } from "./Stats";
import { makeSkillsList } from "./Skills"

export const ResourceType =
{
	// hard resources
	Mana: "Mana", // [0, 10000]
	Polyglot: "Polyglot", // [0, 2]
	AstralFire: "AstralFire", // [0, 3]
	UmbralIce: "UmbralIce", // [0, 3]
	UmbralHeart: "UmbralHeart", // [0, 3]
	// binaries (buffs & states)
	Paradox: "Paradox", // [0, 1]
	Firestarter: "Firestarter", // [0, 1]
	Thundercloud: "Thundercloud", // [0, 1]

	Movement: "Movement", // [0, 1]
	NotCasting: "NotCasting", // [0, 1] (movement time as a resource)
	NotAnimationLocked: "NotAnimationLocked", // [0, 1]
	GCDReady: "GCDReady", // shared by GCDs
	// oGCDs
	s_Sharpcast: "s_Sharpcast", // [0, 2] // TODO: figure out how this works
	s_LeyLines: "s_LeyLines", // [0, 1]
	s_TripleCast: "s_TripleCast", // [0, 2]
	s_Manafont: "s_Manafont", // [0, 1]
	s_Amplifier: "s_Amplifier" // [0, 1]
};

const casterTax = 0.06;
const animationLock = 0.3;

const gcd = 2.35;


// can never be negative
// has a stats modifier which may change over time depending on resource amount
class Resource
{
	constructor(type, maxValue, initialValue)
	{
		this.type = type;
		this.maxValue = maxValue;
		this.currentValue = initialValue;
		this.statsModifier = new StatsModifier();
	}
	available(amount)
	{
		return this.currentValue >= amount;
	}
	consume(amount)	
	{
		if (!this.available(amount)) console.warn("invalid resource consumption: " + this.type);
		this.currentValue -= amount;
	}
	gain(amount)
	{
		//console.log("resource gain: " + amount);
		this.currentValue = Math.min(this.currentValue + amount, this.maxValue);
	}
};

class ResourceState extends Map
{
	// Map(string -> number) -> bool
	available(requirements)
	{
		for (var [resource, amount] of requirements.entries())
		{
			if (!this.get(resource).available(amount)) return false;
		}
		return true;
	}
	consume(resourcesMap)	
	{
		for (var [resource, amount] of resourcesMap.entries())
		{
			this.get(resource).consume(amount);
		}
	}
	gain(resourcesMap)
	{
		for (var [resource, amount] of resourcesMap.entries())
		{
			this.get(resource).gain(amount);
		}
	}
};

class Event
{
	// effectFn : GameState -> ()
	constructor(name, delay, effectFn)
	{
		this.name = name;
		this.timeTillEvent = delay;
		this.effectFn = effectFn;
	}
};

// GameState := resources + events queue
export class GameState
{
	constructor()
	{
		// TIME
		this.time = 0;

		// RESOURCES (checked when using skills)
		this.resources = new ResourceState();
		this.resources.set(ResourceType.Mana, new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(ResourceType.Polyglot, new Resource(ResourceType.Polyglot, 2, 0));
		this.resources.set(ResourceType.AstralFire, new Resource(ResourceType.AstralFire, 3, 0));
		this.resources.set(ResourceType.UmbralIce, new Resource(ResourceType.UmbralIce, 3, 0));
		this.resources.set(ResourceType.UmbralHeart, new Resource(ResourceType.UmbralHeart, 3, 0));

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

		//================
		// convenience accessors (maintained elsewhere)

		this.unlockAnimationEvent = null;

		this.GCDReadyEvent = null;
	}

	// advance game state by this much time
	tick(deltaTime)
	{
		//======== events ========
		var cumulativeDeltaTime = 0;
		while (cumulativeDeltaTime < deltaTime-0.00001 && this.eventsQueue.length > 0)
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
				if (e.timeTillEvent <= 0)
				{
					e.effectFn(this);
					console.log((this.time + cumulativeDeltaTime + timeToTick).toFixed(2) + "s: " + e.name);
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
		var i = 0;
		while (i < this.eventsQueue.length && this.eventsQueue[i].timeTillEvent < evt.timeTillEvent) i++;
		this.eventsQueue.splice(i, 0, evt);
	}

	getFireStacks() { return this.resources.get(ResourceType.AstralFire).currentValue; }
	getIceStacks() { return this.resources.get(ResourceType.UmbralIce).currentValue; }
	getUmbralHearts() { return this.resources.get(ResourceType.UmbralHeart).currentValue; }
	getMP() { return this.resources.get(ResourceType.Mana).currentValue; }

	captureDamage(basePotency)
	{
		// TODO: capture buffs, etc.
		return basePotency;
	}

	dealDamage(potency)
	{
		console.log("    BOOM! " + potency);
	}

	castGCDSpell(castTime, damageApplicationDelay, potency, manaCost)
	{
		// movement lock
		this.resources.get(ResourceType.Movement).consume(1);
		this.addEvent(new Event("unlock movement", castTime - 0.5, g=>{ g.resources.get(ResourceType.Movement).gain(1); }));

		// spell cast, damage, etc.
		this.resources.get(ResourceType.NotCasting).consume(1);
		this.addEvent(new Event("finish casting & calc damage", castTime, g=>{
			g.resources.get(ResourceType.NotCasting).gain(1); // done casting
			g.resources.get(ResourceType.Mana).consume(manaCost); // actually deduct mana
			let capturedPotency = g.captureDamage(potency);
			g.addEvent(new Event("apply damage: " + capturedPotency, damageApplicationDelay, g=>{ g.dealDamage(capturedPotency); }));
		}));

		// recast (GCD ready)
		this.resources.get(ResourceType.GCDReady).consume(1);
		this.GCDReadyEvent = new Event("GCD ready", gcd, g=>{
			g.resources.get(ResourceType.GCDReady).gain(1);
			g.GCDReadyEvent = null;
		});

		// animation lock
		this.resources.get(ResourceType.NotAnimationLocked).consume(1);
		this.unlockAnimationEvent = new Event("unlock animation", castTime + casterTax, g=>{
			g.resources.get(ResourceType.NotAnimationLocked).gain(1);
			g.unlockAnimationEvent = null;
		});
		this.addEvent(this.unlockAnimationEvent);
	}

	timeTillNextGCDAvailable()
	{
		let nextSkillTime = this.unlockAnimationEvent ? this.unlockAnimationEvent.timeTillEvent : 0;
		let nextGCDReady = this.GCDReadyEvent ? this.GCDReadyEvent.timeTillEvent : 0;
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
				skill.instances[i].use(this);
				console.log(this.time + "s: use skill [" + skillName + "] - " + skill.instances[i].description);
				return;
			}
		}
		console.log("none of the skill instances are available");
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
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).currentValue + "\n";
		s += "Para:\t" + this.resources.get(ResourceType.Paradox).currentValue + "\n";
		return s;
	}
};

/*
Time is automatically advanced untill next available skill time.
*/

export var game = new GameState();

export function runTest()
{
	// get mana tick rolling (through recursion)
	let recurringManaRegen = g=>{
		// mana regen
		var additionalGain = 0;
		/* TODO: apply modifiers
		*/
		g.resources.get(ResourceType.Mana).gain(200 + additionalGain);
		// queue the next tick
		g.addEvent(new Event("ManaTick", 3, recurringManaRegen));
	};

	let recurringThunderTick = g=>{
		// TODO: tick effect
		g.addEvent(new Event("ThunderTick", 3, recurringThunderTick));
	};

	game.addEvent(new Event("InitialManaTick", 0.2, recurringManaRegen));
	game.addEvent(new Event("InitialThunderTick", 0.8, recurringThunderTick));
	console.log(game);
	console.log("========");

	/*
	for (const t in ResourceType)
	{
		console.log(t);
	}
	*/

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