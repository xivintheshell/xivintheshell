import {Color, LogCategory} from "../Controller/Common";
import {Debug, ResourceType} from "./Common"
import {controller} from "../Controller/Controller";

export class Event
{
	// effectFn : () -> ()
	constructor(name, delay, effectFn, logColor=Color.Text, shouldLog=true)
	{
		this.name = name;
		this.timeTillEvent = delay;
		this.delay = delay;
		this.effectFn = effectFn;
		this.canceled = false;
		this.shouldLog = shouldLog;
		this.logColor = logColor;
	}
}

// can never be negative
export class Resource
{
	constructor(type, maxValue, initialValue)
	{
		this.type = type;
		this.maxValue = maxValue;
		this.currentValue = initialValue;
		this.pendingChange = null;
	}
	overrideTimer(newTime)
	{
		this.pendingChange.timeTillEvent = newTime;
	}
	removeTimer()
	{
		this.pendingChange.canceled = true;
		this.pendingChange = null;
	}
	available(amount)
	{
		return this.currentValue + Debug.epsilon >= amount;
	}
	consume(amount)	
	{
		if (!this.available(amount)) console.warn("invalid resource consumption: " + this.type);
		this.currentValue = Math.max(this.currentValue - amount, 0);
	}
	gain(amount)
	{
		this.currentValue = Math.min(this.currentValue + amount, this.maxValue);
	}
}

export class CoolDown extends Resource
{
	constructor(type, cdPerStack, maxStacks, initialNumStacks)
	{
		super(type, maxStacks * cdPerStack, initialNumStacks * cdPerStack);
		this.cdPerStack = cdPerStack;
		this.recastTimeScale = 1; // effective for the next stack (i.e. 0.85 if captured LL)
	}
	stacksAvailable() { return Math.floor((this.currentValue + Debug.epsilon) / this.cdPerStack); }
	useStack() { this.consume(this.cdPerStack); }
	setRecastTimeScale(timeScale) { this.recastTimeScale = timeScale; }
	restore(deltaTime)
	{
		let stacksBefore = this.stacksAvailable();
		let timeTillNextStack = (stacksBefore + 1) * this.cdPerStack - this.currentValue;
		let scaledTimeTillNextStack = timeTillNextStack * this.recastTimeScale;
		if (deltaTime >= scaledTimeTillNextStack) // upon return, will have gained another stack
		{
			this.gain(timeTillNextStack + (deltaTime - scaledTimeTillNextStack));
			this.recastTimeScale = 1;
		}
		else
		{
			this.gain(deltaTime / this.recastTimeScale);
		}
	}
}

export class CoolDownState extends Map
{
	constructor(game)
	{
		super();
		this.game = game;
	}
	tick(deltaTime)
	{
		for (const cd of this.values()) cd.restore(deltaTime);
	}
	stacksAvailable(rscType)
	{
		return this.get(rscType).stacksAvailable();
	}
	setRecastTimeScale(cdName, timeScale)
	{
		let cd = this.get(cdName);
		cd.setRecastTimeScale(timeScale);
	}
	timeTillNextStackAvailable(cdName)
	{
		let cd = this.get(cdName);
		let currentStacks = cd.stacksAvailable();
		if (currentStacks > 0) return 0;
		return (cd.cdPerStack - cd.currentValue) * cd.recastTimeScale;
	}
}

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
	addResourceEvent(rscType, name, delay, fnOnRsc, logColor=Color.Text, shouldLog=true)
	{
		let rsc = this.get(rscType);
		 let evt = new Event(name, delay, ()=>{
			 rsc.pendingChange = null; // unregister self from resource
			 fnOnRsc(rsc); // before the scheduled event takes effect
		 }, logColor, shouldLog);
		 rsc.pendingChange = evt; // register to resource
		 this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType, delay)
	{
		this.get(rscType).consume(1);
		controller.log(LogCategory.Event, "[resource locked] " + rscType, this.game.time, Color.Grey);
		this.addResourceEvent(rscType, "[resource ready] " + rscType, delay, rsc=>{ rsc.gain(1); }, Color.Grey);
	}
}