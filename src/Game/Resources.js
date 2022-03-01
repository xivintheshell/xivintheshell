import { StatsModifier } from "./Stats";

// events := pending changes to the game state (resources)
export class Event
{
	// effectFn : () -> ()
	constructor(name, delay, effectFn)
	{
		this.name = name;
		this.timeTillEvent = delay;
		this.effectFn = effectFn;
		this.canceled = false;
	}
};

// can never be negative
// has a stats modifier which may change over time depending on resource amount
export class Resource
{
	constructor(type, maxValue, initialValue)
	{
		this.type = type;
		this.maxValue = maxValue;
		this.currentValue = initialValue;
		this.statsModifier = new StatsModifier();
		this.pendingChange = null;
	}
	getValue(rscType) { return this.get(rscType).currentValue; }
	overrideTimer(newTime)
	{
		this.pendingChange.timeTillEvent = newTime;
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
		this.currentValue = Math.min(this.currentValue + amount, this.maxValue);
	}
};

export class ResourceState extends Map
{
	constructor(game)
	{
		super();
		this.game = game;
	}

	timeTillReady(rscType)
	{
		let rsc = this.get(rscType);
		return rsc.pendingChange === null ? 0 : rsc.pendingChange.timeTillEvent;
	}

	// fnOnRsc : Resource -> ()
	addResourceEvent(rscType, name, delay, fnOnRsc)
	{
		let rsc = this.get(rscType);
		let evt = new Event(name, delay, ()=>{
			rsc.pendingChange = null; // unregister from resource
			fnOnRsc(rsc);
		});
		rsc.pendingChange = evt; // register to resource
		this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType, delay)
	{
		this.get(rscType).consume(1);
		console.log("[resource locked] " + rscType);
		this.addResourceEvent(rscType, "[resource ready] " + rscType, delay, rsc=>{ rsc.gain(1); });
	}

	//=============

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