import React from 'react';
import './Game.js';
//import logo from './logo.svg';
import './App.css';

export const ResourceType =
{
	// hard resources
	Mana: "Mana", // [0, 10000]
	Polyglot: "Polyglot", // [0, 2]
	SharpcastStack: "SharpcastStack", // [0, 2] // TODO: figure out how this works
	AstralFire: "AstralFire", // [0, 3]
	UmbralIce: "UmbralIce", // [0, 3]
	UmbralHeart: "UmbralHeart", // [0, 3]
	// binary buffs
	Paradox: "Paradox", // [0, 1]
	Firestarter: "Firestarter", // [0, 1]
	Thundercloud: "Thundercloud", // [0, 1]
	NotCasting: "NotCasting", // [0, 1] (movement time as a resource)
	// cool downs
	GCD: "GCD", // shared by GCDs
	SharpcastCD: "SharpcastCD", // [0, 60], -30 each
	ManafontCD: "ManafontCD", // [0, 60], -60 each
	// ...
};

const SkillID = 
{
	Fire3: "Fire3",
	Transpose: "Transpose"
};

const casterTax = 0.06;
const animationLock = 0.3;

const gcd = 2.35;

class StatsModifier
{
	constructor()
	{
		// additive fractions
		this.damage = 0;
		this.CH = 0;
		this.DH = 0;
		this.castTime = 0;

		// multiplicative coefficients
		this.manaCost = 1;

		// additive constant
		this.manaRegen = 0;
	}

	// StatsModifier -> ()
	apply(other)
	{
		this.damage += other.damage;
		this.CH += other.CH;
		this.DH += other.DH;
		this.castTime += other.castTime;

		this.manaCost *= other.manaCost;

		this.manaRegen += other.manaRegen;
	}
	// () -> StatsModifier
	clone()
	{
		var ret = new StatsModifier();
		ret.damage = this.damage;
		ret.CH = this.CH;
		ret.DH = this.DH;
		ret.castTime = this.castTime;
		ret.manaCost = this.manaCost;
		ret.manaRegen = this. manaRegen;
		return ret;
	}

	static __baseInstance = null;
	static base()
	{
		if (!this.__baseInstance)
		{
			this.__baseInstance = new this();
			// additive fractions
			this.__baseInstance.damage = 1;
			this.__baseInstance.CH = 1;
			this.__baseInstance.DH = 1;
			this.__baseInstance.castTime = 1;
			// multiplicative coefficients
			this.__baseInstance.manaCost = 1;
			// additive constant
			this.__baseInstance.manaRegen = 0;
		}
		return this.__baseInstance.clone();
	}
};

// can never be negative
// has a stats modifier which may change over time depending on resource amount
class Resource
{
	constructor(maxValue, initialValue)
	{
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
		console.log("resource gain: " + amount);
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

class Game
{
	constructor()
	{
		// RESOURCES (checked when using skills)
		// TODO: merge resources & buffs
		this.resources = new Map();
		this.resources.set(ResourceType.GCD, new Resource(gcd, gcd));
		this.resources.set(ResourceType.Mana, new Resource(10000, 10000));
		this.resources.set(ResourceType.Polyglot, new Resource(2, 0));
		// ... TODO

		// BUFFS (checked by events)

		this.damageModifiers = [];
		this.CHModifiers = [];
		this.DHModifiers = [];
		this.castTimeModifiers = [];
		this.manaCostModifiers = [];
		this.manaRegenModifiers = [];

		// TIMERS (ticked by events)
		this.timeTillEndOfCasterTax = 0;
		this.remainingAnimationLock = 0;

		// events queue
		// which might include:
		// - damage calc (enqueues damage application)
		// - damage application (by damage calc)
		//   (dot as a flag for whether dot tick causes damage)
		// - dot application / refresh (put dot up, refresh timer by removing and re-enqueueing "thunder fall off" event)
		// - dot fall off (by dot application)
		// - modifiers up (which potentially enqueues modifier down)
		// - modifiers down (by modifiers up)
		this.eventsQueue = [];
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
			console.log("ticking " + timeToTick + "s...");

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
		console.log(this.eventsQueue);
		console.log(this.resources);

		//======= timers ========
		this.timeTillEndOfCasterTax = Math.max(this.timeTillEndOfCasterTax - deltaTime, 0);
		this.remainingAnimationLock = Math.max(this.remainingAnimationLock - deltaTime, 0);
	}

	addEvent(gameEvent)
	{
		var i = 0;
		while (i < this.eventsQueue.length && this.eventsQueue[i].timeTillEvent < gameEvent.timeTillEvent) i++;
		this.eventsQueue.splice(i, 0, gameEvent);
	}

	timeTillNextSkillAvailable()
	{
		return Math.max(this.timeTillEndOfCasterTax, this.remainingAnimationLock);
	}
};

var game = new Game();

/*
Time is automatically advanced untill next available skill time.
*/

class SkillInstance
{
	// timeTillAvailableFn : GameState -> float
	// requirementFn : GameState -> bool
	// effectFn : GameState -> ()
	constructor(timeTillAvailableFn, requirementFn, effectFn)
	{
		this.timeTillAvailableFn = timeTillAvailableFn;
		this.requirementFn = requirementFn;
		this.effectFn = effectFn;
	}
};

class Skill
{
	// instances : SkilInstance[]
	constructor(name, instances)
	{
		this.name = name;
		this.instances = instances;
	}
};

var skills = new Map();
skills.set(SkillID.Fire3, new Skill(SkillID.Fire3,
	[
		// case 1: has umbral ice
		new SkillInstance(
			g=>{ // time till available
				return Math.max(g.timeTillNextSkillAvailable(), gcd - g.resources.get(ResourceType.GCD).currentValue);
			},
			g=>{ // requirement: has umbral ice
				return g.resources.get(ResourceType.UmbralIce).currentValue > 0;
			},
			g=>{ // effect
				// TODO
				// queue damage; remove UI, apply AF3, add 1/2 cast time + caster lock, refresh GCD timer
			}
		),
		// case 2: hard-casted F3
		new SkillInstance(
			g=>{
				return Math.max(g.timeTillNextSkillAvailable(), gcd - g.resources.get(ResourceType.GCD).currentValue);
			},
			g=>{
				return g.resources.get(ResourceType.Mana).available(2000);
			},
			g=>{
				// TODO
			}
		),
	]
));

//======================================================

class DebugTick extends React.Component {
	constructor(props) {
		super(props);
		this.state = {value: 1, redirect: false};
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleSubmit (event) {
		game.tick(parseFloat(this.state.value));
		event.preventDefault();
	}

	handleChange(event) {
		this.setState({value: event.target.value});
	}

	render(){ 
		var powered =
			<form onSubmit={this.handleSubmit}>
				<span>Tick by </span>
				<input size="5" type="text" 
						value={this.state.value} onChange={this.handleChange} />
				<input type="submit" value="GO" />
			</form>
		return (
			<div className="footer">
				{powered}
			</div>
	)}
}

function DebugThunder()
{
	var fn = ()=>{
		console.log("clicked");
	};
	return <button onClick={fn}>click me</button>;
}

class App extends React.Component {

	constructor(props)
	{
		super(props);

		// get mana tick rolling (through recursion)
		let recurringManaRegen = g=>{
			// mana regen
			var additionalGain = 0;
			/* TODO: apply modifiers
			g.manaRegenModifiers.forEach(mod=>{
				additionalGain += mod.value;
			});
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
		let base = StatsModifier.base();
		let mod = new StatsModifier();
		mod.damage = 0.1;
		mod.manaRegen = 100;
		base.apply(mod);
		console.log(base);
		console.log(StatsModifier.base());
	}

	render()
	{
		return (
			<div className="App">
				<DebugTick />
				<DebugThunder />
				{/*
				<header className="App-header">
					<img src={logo} className="App-logo" alt="logo" />
					<p>
						Edit <code>src/App.js</code> and save to reload.
					</p>
					<a
						className="App-link"
						href="https://reactjs.org"
						target="_blank"
						rel="noopener noreferrer"
					>
						Learn React
					</a>
				</header>
				*/}
			</div>
		);
	}
}

export default App;
