import { StatsModifier } from "./Stats";

const ResourceType =
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
	NotCasting: "NotCasting", // [0, 1] (movement time as a resource)
	GCDReady: "GCDReady", // shared by GCDs
	// oGCDs
	s_Sharpcast: "s_Sharpcast", // [0, 2] // TODO: figure out how this works
	s_LeyLines: "s_LeyLines", // [0, 1]
	s_TripleCast: "s_TripleCast", // [0, 2]
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

class GameEvent
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
class GameState
{
	constructor()
	{
		// TIME
		this.time = 0;

		// RESOURCES (checked when using skills)
		this.resources = new Map();
		this.resources.set(ResourceType.GCDReady, new Resource(ResourceType.GCDReady, gcd, gcd));
		this.resources.set(ResourceType.Mana, new Resource(ResourceType.Mana, 10000, 10000));
		this.resources.set(ResourceType.AstralFire, new Resource(ResourceType.AstralFire, 3, 0));
		this.resources.set(ResourceType.UmbralIce, new Resource(ResourceType.UmbralIce, 3, 0));
		this.resources.set(ResourceType.UmbralHeart, new Resource(ResourceType.UmbralHeart, 3, 0));
		this.resources.set(ResourceType.s_Sharpcast, new Resource(ResourceType.s_Sharpcast, 2, 0));
		this.resources.set(ResourceType.Polyglot, new Resource(ResourceType.Polyglot, 2, 0));
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

		//================
		// convenience accessors (maintained elsewhere)

		this.doneCastingEvent = null; // could either be done casting or till end of caster tax
		this.animationLockEvent = null;
	}

	// advance game state by this much time
	tick(deltaTime)
	{
		//======== events ========
		var deltaTimeCopy = deltaTime;
		while (deltaTimeCopy > 0 && this.eventsQueue.length > 0)
		{
			// make sure events are in proper order
			this.eventsQueue.sort((a, b)=>{return a.timeTillEvent - b.timeTillEvent;})

			// time to safely advance without skipping anything
			let timeToTick = Math.min(deltaTimeCopy, this.eventsQueue[0].timeTillEvent);
			//console.log("ticking " + timeToTick + "s...");

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
					executedEvents++;
				}
			});
			// remove the executed events from the master list
			this.eventsQueue.splice(0, executedEvents);

			deltaTimeCopy -= timeToTick;
		}
		//console.log(this.eventsQueue);
		//console.log(this.resources);

		this.time += deltaTime;
	}

	addEvent(gameEvent)
	{
		var i = 0;
		while (i < this.eventsQueue.length && this.eventsQueue[i].timeTillEvent < gameEvent.timeTillEvent) i++;
		this.eventsQueue.splice(i, 0, gameEvent);
	}

	timeTillNextSkillAvailable()
	{
		let timeTillEndOfCasterTax = this.doneCastingEvent ?
			(this.doneCastingEvent.type == ResourceType.NotCasting ? this.doneCastingEvent.timeTillEvent + casterTax : this.doneCastingEvent.timeTillEvent) : 0;
		let timeTillEndOfAnimationLock = this.animationLockEvent ? this.animationLockEvent.timeTillEvent : 0;
		return Math.max(timeTillEndOfCasterTax, timeTillEndOfAnimationLock);
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
		s += "Sharp:\t" + this.resources.get(ResourceType.SharpcastStack).currentValue + "\n";
		s += "Poly:\t" + this.resources.get(ResourceType.Polyglot).currentValue + "\n";
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
		g.addEvent(new GameEvent("ManaTick", 3, recurringManaRegen));
	};

	let recurringThunderTick = g=>{
		// TODO: tick effect
		g.addEvent(new GameEvent("ThunderTick", 3, recurringThunderTick));
	};

	game.addEvent(new GameEvent("InitialManaTick", 0.5, recurringManaRegen));
	game.addEvent(new GameEvent("InitialThunderTick", 1.0, recurringThunderTick));
	console.log(game);
	console.log("========");

	for (const t in ResourceType)
	{
		console.log(t);
	}

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