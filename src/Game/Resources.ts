import {Debug, ResourceType} from "./Common"
import {ShellInfo, ShellJob, ALL_JOBS} from "../Controller/Common";
import {GameState} from "./GameState";
import {ActionNode} from "../Controller/Record";
import {BLMState} from "./Jobs/BLM";

export enum EventTag {
	ManaGain,
	MpTick,
	LucidTick
}

export class Event {
	name: string;
	#tags: EventTag[];
	timeTillEvent: number;
	delay: number;
	effectFn: () => void;
	canceled: boolean;

	// effectFn : () -> ()
	constructor(name: string, delay: number, effectFn: () => void) {
		this.name = name;
		this.#tags = [];
		this.timeTillEvent = delay;
		this.delay = delay;
		this.effectFn = effectFn;
		this.canceled = false;
	}
	hasTag(tag: EventTag): boolean {
		for (let i = 0; i < this.#tags.length; i++) {
			if (tag === this.#tags[i]) return true;
		}
		return false;
	}
	addTag(tag: EventTag) {
		if (!this.hasTag(tag)) {
			this.#tags.push(tag);
		}
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
			console.error(`Failed to override non-pending resource timer for resource: ${this.type}`);
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
	availableAmountIncludingDisabled(): number {// used for checking LL existence: if Retrace should replace its button
		return this.#currentValue;
	}
	consume(amount: number) {
		if (this.#currentValue < amount - Debug.epsilon) {
			console.warn("invalid resource consumption: " + this.type);
			console.log(amount);
			console.log(this);
		}
		this.#currentValue = Math.max(this.#currentValue - amount, 0);
	}
	gain(amount: number) {
		this.#currentValue = Math.min(this.#currentValue + amount, this.maxValue);
	}
	overrideCurrentValue(amount: number) {
		this.#currentValue = amount;
	}
}

export class DoTBuff extends Resource {
	node?: ActionNode = undefined;
	tickCount: number = 0;
}

export class CoolDown extends Resource {
	readonly #cdPerStack: number;
	#recastTimeScale: number;
	#currentBaseRecast: number;
	constructor(type: ResourceType, cdPerStack: number, maxStacks: number, initialNumStacks: number) {
		super(type, maxStacks * cdPerStack, initialNumStacks * cdPerStack);
		this.#cdPerStack = cdPerStack;
		this.#currentBaseRecast = cdPerStack; // special case for mixed-recast spells
		this.#recastTimeScale = 1; // effective for the next stack (i.e. 0.85 if captured LL)
	}
	currentStackCd() { return this.#currentBaseRecast * this.#recastTimeScale; }
	stacksAvailable() { return Math.floor((this.availableAmount() + Debug.epsilon) / this.#currentBaseRecast); }
	maxStacks() { return this.maxValue / this.#currentBaseRecast; }
	useStack(game: GameState) {
		this.consume(this.#cdPerStack);
		this.#reCaptureRecastTimeScale(game);
	}
	useStackWithRecast(game: GameState, recast: number) {
		// roll the GCD with a special recast value
		this.consume(this.#currentBaseRecast);
		this.maxValue = recast;
		// LL modifier
		// (PCT handles hyperphantasia logic separately)
		this.#reCaptureRecastTimeScale(game);
		// scale for spells with longer cast/recast
		this.#currentBaseRecast = recast;
	}
	setRecastTimeScale(timeScale: number) { this.#recastTimeScale = timeScale; }
	#reCaptureRecastTimeScale(game: GameState) {
		this.#recastTimeScale = this.type === ResourceType.cd_GCD ? game.gcdRecastTimeScale() : 1;
	}
	restore(game: GameState, deltaTime: number) {
		let stacksBefore = this.stacksAvailable();
		let unscaledTimeTillNextStack = (stacksBefore + 1) * this.#currentBaseRecast - this.availableAmount();
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
		if (this.availableAmount() === this.maxValue) return 0;
		return (this.#currentBaseRecast - this.availableAmount() % this.#currentBaseRecast) * this.#recastTimeScale;
	}
}

export class CoolDownState {
	game: GameState;
	#map: Map<ResourceType, CoolDown>;
	constructor(game: GameState) {
		this.game = game;
		this.#map = new Map();
	}

	forEach(fn: (cd: CoolDown, cdName: ResourceType) => void) {
		this.#map.forEach(fn);
	}

	get(rscType: ResourceType): CoolDown {
		let rsc = this.#map.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false, `no cooldown for resource ${rscType}`);
			return new CoolDown(ResourceType.Never, 0, 0, 0);
		}
	}

	set(cd: CoolDown) {
		this.#map.set(cd.type, cd);
	}

	tick(deltaTime: number) {
		for (const cd of this.#map.values()) cd.restore(this.game, deltaTime);
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
	timeTillAnyStackAvailable(cdName: ResourceType) {
		let cd = this.get(cdName);
		if (cd.stacksAvailable() > 0) return 0;
		return cd.timeTillNextStackAvailable();
	}
}

export class ResourceState {
	game: GameState;
	#map: Map<ResourceType, Resource>;
	constructor(game: GameState) {
		this.game = game;
		this.#map = new Map();
	}

	get(rscType: ResourceType): Resource {
		let rsc = this.#map.get(rscType);
		if (rsc) return rsc;
		else {
			console.error(`could not find resource ${rscType}`);
			return new Resource(ResourceType.Never, 0, 0);
		}
	}

	set(resource: Resource) {
		this.#map.set(resource.type, resource);
	}

	timeTillReady(rscType: ResourceType): number {
		let rsc = this.get(rscType);
		if (rsc.pendingChange) {
			return rsc.pendingChange.timeTillEvent;
		}
		return 0;
	}

	// fnOnRsc : Resource -> ()
	addResourceEvent(props: {
		rscType: ResourceType,
		name: string,
		delay: number,
		fnOnRsc: (rsc: Resource)=>void,
		tags?: EventTag[]
	})
	{
		let rsc = this.get(props.rscType);
		let evt = new Event(props.name, props.delay, () => {
			rsc.pendingChange = undefined; // unregister self from resource
			props.fnOnRsc(rsc); // before the scheduled event takes effect
		});
		rsc.pendingChange = evt; // register to resource
		if (props.tags) {
			props.tags.forEach(tag => {
				evt.addTag(tag);
			});
		}
		this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType: ResourceType, delay: number) {
		this.get(rscType).consume(1);
		this.addResourceEvent({
			rscType: rscType,
			name: "[resource ready] " + rscType,
			delay: delay,
			fnOnRsc: rsc=>{ rsc.gain(1); }
		});
	}
}

export type ResourceInfo = {
	isCoolDown: false,
	defaultValue: number,
	maxValue: number,
	maxTimeout: number,
}
export type CoolDownInfo = {
	isCoolDown: true,
	maxStacks: number,
	cdPerStack: number
}
export type ResourceOrCoolDownInfo = ResourceInfo | CoolDownInfo;

const resourceInfos = new Map<ShellJob, Map<ResourceType, ResourceOrCoolDownInfo>>();

export function getResourceInfo(job: ShellJob, rsc: ResourceType): ResourceOrCoolDownInfo {
	const map = resourceInfos.get(job)!;
	if (!map.has(rsc)) {
		console.error(`no resource info found for ${rsc}`);
	}
	return map.get(rsc)!;
}

export function getAllResources(job: ShellJob): Map<ResourceType, ResourceOrCoolDownInfo> {
	return resourceInfos.get(job)!;
}

// Add a status effect or job gauge element to the resource map of the specified job.
export function makeResource(job: ShellJob, rsc: ResourceType, maxValue: number, params: Partial<{
	default: number,
	timeout: number,
}>) {
	getAllResources(job).set(rsc, {
		isCoolDown: false,
		defaultValue: params.default ?? 0,
		maxValue: maxValue,
		maxTimeout: params.timeout ?? -1,
	});
}

ALL_JOBS.forEach((job) => {
	resourceInfos.set(job, new Map([[ResourceType.cd_GCD, {
		// special declaration for GCD override default
		isCoolDown: true,
		maxStacks: 1,
		cdPerStack: 2.5
	}]]));
	// MP, tincture buff, and sprint are common to all jobs
	makeResource(job, ResourceType.Mana, 10000, {default: 10000});
	makeResource(job, ResourceType.Tincture, 1, {timeout: 30});
	makeResource(job, ResourceType.Sprint, 1, {timeout: 10});
});

// Add an ability to the resource map of the specified job.
// Should only be called within the makeAbility constructor, except for the default GCD cooldown.
// May be called multiple times if skills share a cooldown (such as picto living muse variants)
export function makeCooldown(job: ShellJob, rsc: ResourceType, cdPerStack: number, maxStacks: number = 1) {
	getAllResources(job).set(rsc, {
		isCoolDown: true,
		cdPerStack: cdPerStack,
		maxStacks: maxStacks,
	});
}

export type ResourceOverrideData = {
	type: ResourceType,
	timeTillFullOrDrop: number, // CDs (full), buff/procs (drop)
	stacks: number, // Triplecast, MP, AF, UI, UH, Paradox, Polyglot
	effectOrTimerEnabled: boolean, // LL, halt
};

export class ResourceOverride {

	type: ResourceType;
	timeTillFullOrDrop: number; // CDs (full), buff/procs (drop)
	stacks: number; // Triplecast, MP, AF, UI, UH, Paradox, Polyglot
	effectOrTimerEnabled: boolean; // LL, halt

	constructor(props: ResourceOverrideData) {
		this.type = props.type;
		this.timeTillFullOrDrop = props.timeTillFullOrDrop;
		this.stacks = props.stacks;
		this.effectOrTimerEnabled = props.effectOrTimerEnabled;
	}

	equals(other: ResourceOverride) {
		return this.type === other.type &&
			this.timeTillFullOrDrop === other.timeTillFullOrDrop &&
			this.stacks === other.stacks &&
			this.effectOrTimerEnabled === other.effectOrTimerEnabled;
	}

	// todo
	static fromGameState(game: GameState)
	{
		let overrides: ResourceOverride[] = [];
		// CDs
		game.cooldowns.forEach((cd: CoolDown, cdName: ResourceType) => {
			cd.availableAmount();
			overrides.push(new ResourceOverride({
				type: cdName,
				timeTillFullOrDrop: cd.maxValue - cd.availableAmount(),
				stacks: 0, // not used
				effectOrTimerEnabled: true // not used
			}));
		});
		// other resources: todo

		return overrides;
	}

	// CDs: time till full
	// LL: enabled, time till full
	// Enochian: enabled, time till drop
	// Triplecast: stacks, time till drop
	// other buffs: time till drop
	// MP, AF, UI, UH, Paradox, Polyglot: amount (stacks)
	applyTo(game: GameState) {
		let info = getAllResources(ShellInfo.job).get(this.type);
		if (!info) {
			console.assert(false);
			return;
		}

		// CD
		if (info.isCoolDown) {
			let cd = game.cooldowns.get(this.type);
			cd.overrideCurrentValue(cd.maxValue - this.timeTillFullOrDrop);
		}

		// resource
		else {
			let rsc = game.resources.get(this.type);

			let overrideDropRscTimer = (newTimer: number) => {
				rsc.removeTimer();
				game.resources.addResourceEvent({
					rscType: rsc.type,
					name: "drop " + rsc.type,
					delay: newTimer,
					fnOnRsc: (r: Resource) => {
						if (rsc.type === ResourceType.Enochian) { // since enochian should also take away AF/UI/UH stacks
							// TODO move to job-specific code
							(game as BLMState).loseEnochian();
						} else {
							r.consume(r.availableAmount());
						}
					}
				});
			};

			// Ley Lines (timer + enabled)
			if (rsc.type === ResourceType.LeyLines)
			{
				rsc.consume(rsc.availableAmount());
				rsc.gain(1);
				overrideDropRscTimer(this.timeTillFullOrDrop);
				rsc.enabled = this.effectOrTimerEnabled;
			}

			// Enochian (timer + enabled)
			else if (rsc.type === ResourceType.Enochian)
			{
				rsc.consume(rsc.availableAmount());
				rsc.gain(1);
				if (this.effectOrTimerEnabled) {
					overrideDropRscTimer(this.timeTillFullOrDrop);
				}
			}

			// Polyglot (refresh timer + stacks)
			else if (rsc.type === ResourceType.Polyglot)
			{
				// stacks
				let stacks = this.stacks;
				rsc.consume(rsc.availableAmount());
				rsc.gain(stacks);
				// timer
				let timer = this.timeTillFullOrDrop;
				if (timer > 0) { // timer is set
					rsc.overrideTimer(game, timer);
				}
			}

			// everything else (timer and/or stacks)
			else {

				// stacks
				let stacks = this.stacks;
				rsc.consume(rsc.availableAmount());
				rsc.gain(stacks);

				// timer
				let timer = this.timeTillFullOrDrop;
				if (stacks > 0 && info.maxTimeout >= 0) { // may expire
					overrideDropRscTimer(timer);
				}
			}
		}
	}

	serialized(): ResourceOverrideData {
		return {
			type: this.type,
			timeTillFullOrDrop: this.timeTillFullOrDrop,
			stacks: this.stacks,
			effectOrTimerEnabled: this.effectOrTimerEnabled
		};
	}
}