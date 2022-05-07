import {addLog, Color, LogCategory} from "../Controller/Common";
import {Debug, ResourceType} from "./Common"
import {GameState} from "./GameState";

export class Event {
	name: string;
	timeTillEvent: number;
	delay: number;
	effectFn: () => void;
	canceled: boolean;
	shouldLog: boolean;
	logColor: Color;

	// effectFn : () -> ()
	constructor(name: string, delay: number, effectFn: ()=>void, logColor=Color.Text, shouldLog=true)
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
export class Resource {
	type: ResourceType;
	maxValue: number;
	#currentValue: number;
	enabled: boolean;
	pendingChange?: Event;
	constructor(type: ResourceType, maxValue: number, initialValue: number) {
		this.type = type;
		this.maxValue = maxValue;
		this.#currentValue = initialValue;
		this.enabled = true;
	}
	overrideTimer(game: GameState, newTime: number) {
		if (this.pendingChange) {
			// hack: make a new event for this, so it's executed after all other events at this time are ticked
			game.addEvent(new Event(
				"override " + this.pendingChange.name + " timer: " + newTime,
				0,
				()=>{ if (this.pendingChange) this.pendingChange.timeTillEvent = newTime; }
			));
			this.pendingChange.timeTillEvent = newTime;
		} else {
			console.assert(false);
		}
	}
	removeTimer() {
		if (this.pendingChange) {
			this.pendingChange.canceled = true;
			this.pendingChange = undefined;
		}
	}
	available(amount: number) {
		return this.availableAmount() + Debug.epsilon >= amount;
	}
	availableAmount() {
		return this.enabled ? this.#currentValue : 0;
	}
	consume(amount: number) {
		if (!this.available(amount)) console.warn("invalid resource consumption: " + this.type);
		this.#currentValue = Math.max(this.#currentValue - amount, 0);
	}
	gain(amount: number) {
		this.#currentValue = Math.min(this.#currentValue + amount, this.maxValue);
	}
}

export class CoolDown extends Resource {
	readonly #cdPerStack: number;
	#recastTimeScale: number;
	constructor(type: ResourceType, cdPerStack: number, maxStacks: number, initialNumStacks: number) {
		super(type, maxStacks * cdPerStack, initialNumStacks * cdPerStack);
		this.#cdPerStack = cdPerStack;
		this.#recastTimeScale = 1; // effective for the next stack (i.e. 0.85 if captured LL)
	}
	currentStackCd() { return this.#cdPerStack * this.#recastTimeScale; }
	stacksAvailable() { return Math.floor((this.availableAmount() + Debug.epsilon) / this.#cdPerStack); }
	useStack(game: GameState) {
		this.consume(this.#cdPerStack);
		this.#reCaptureRecastTimeScale(game);
	}
	setRecastTimeScale(timeScale: number) { this.#recastTimeScale = timeScale; }
	#reCaptureRecastTimeScale(game: GameState) {
		this.#recastTimeScale = this.type === ResourceType.cd_GCD ? game.captureRecastTimeScale() : 1;
	}
	restore(game: GameState, deltaTime: number) {
		let stacksBefore = this.stacksAvailable();
		let unscaledTimeTillNextStack = (stacksBefore + 1) * this.#cdPerStack - this.availableAmount();
		let scaledTimeTillNextStack = unscaledTimeTillNextStack * this.#recastTimeScale;
		if (deltaTime >= scaledTimeTillNextStack) {// upon return, will have gained another stack
			// part before stack gain
			this.gain(unscaledTimeTillNextStack);
			// re-capture
			this.#reCaptureRecastTimeScale(game);
			// and part after stack gain
			this.gain((deltaTime - scaledTimeTillNextStack) / this.#recastTimeScale);
		} else {
			this.gain(deltaTime / this.#recastTimeScale);
		}
	}
	timeTillNextStackAvailable() {
		let currentStacks = this.stacksAvailable();
		if (currentStacks > 0) return 0;
		return (this.#cdPerStack - this.availableAmount()) * this.#recastTimeScale;
	}
}

export class CoolDownState extends Map<ResourceType, CoolDown> {
	game: GameState;
	constructor(game: GameState) {
		super();
		this.game = game;
	}
	get(rscType: ResourceType): CoolDown {
		let rsc = super.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false);
			return new CoolDown(ResourceType.Never, 0, 0, 0);
		}
	}
	tick(deltaTime: number) {
		for (const cd of this.values()) cd.restore(this.game, deltaTime);
	}
	stacksAvailable(rscType: ResourceType): number {
		return this.get(rscType).stacksAvailable();
	}
	setRecastTimeScale(cdName: ResourceType, timeScale: number) {
		let cd = this.get(cdName);
		cd.setRecastTimeScale(timeScale);
	}
	timeTillNextStackAvailable(cdName: ResourceType) {
		let cd = this.get(cdName);
		return cd.timeTillNextStackAvailable();
	}
}

export class ResourceState extends Map<ResourceType, Resource> {
	game: GameState;
	constructor(game: GameState) {
		super();
		this.game = game;
	}

	get(rscType: ResourceType): Resource {
		let rsc = super.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false);
			return new Resource(ResourceType.Never, 0, 0);
		}
	}

	timeTillReady(rscType: ResourceType): number {
		let rsc = this.get(rscType);
		if (rsc.pendingChange) {
			return rsc.pendingChange.timeTillEvent;
		}
		return 0;
	}

	// fnOnRsc : Resource -> ()
	addResourceEvent(
		rscType: ResourceType,
		name: string,
		delay: number,
		fnOnRsc: (rsc: Resource)=>void,
		logColor=Color.Text, shouldLog=true)
	{
		let rsc = this.get(rscType);
		 let evt = new Event(name, delay, ()=>{
			 rsc.pendingChange = undefined; // unregister self from resource
			 fnOnRsc(rsc); // before the scheduled event takes effect
		 }, logColor, shouldLog);
		 rsc.pendingChange = evt; // register to resource
		 this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType: ResourceType, delay: number) {
		this.get(rscType).consume(1);
		addLog(LogCategory.Event, "[resource locked] " + rscType, this.game.getDisplayTime(), Color.Grey);
		this.addResourceEvent(
			rscType, "[resource ready] " + rscType, delay, rsc=>{ rsc.gain(1); }, Color.Grey);
	}
}