import { Debug, WarningType } from "./Common";
import { GameState } from "./GameState";
import { ActionNode } from "../Controller/Record";
import { BLMState } from "./Jobs/BLM";
import { controller } from "../Controller/Controller";
import { ShellJob, ALL_JOBS, MELEE_JOBS } from "./Data/Jobs";
import { ResourceKey, CooldownKey } from "./Data";

export enum EventTag {
	ManaGain,
	MpTick,
	LucidTick,
	MeditateTick,
	AutoTick,
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

abstract class ResourceOrCooldown {
	abstract type: ResourceKey | CooldownKey;
	readonly maxValue: number;

	protected currentValue: number;

	protected constructor(maxValue: number, initialValue: number) {
		this.maxValue = maxValue;
		this.currentValue = initialValue;
	}
	availableAmount() {
		return this.currentValue;
	}
	consume(amount: number) {
		if (this.currentValue < amount - Debug.epsilon) {
			console.warn(
				`invalid resource consumption: ${this.type}, ${this.currentValue} - ${amount}`,
			);
		}
		this.currentValue = Math.max(this.currentValue - amount, 0);
	}
	gain(amount: number) {
		this.currentValue = Math.min(this.currentValue + amount, this.maxValue);
	}
	overrideCurrentValue(amount: number) {
		if (amount < 0 || amount > this.maxValue) {
			console.warn(
				`invalid resource value override: ${this.type}, ${amount} should be in [0, ${this.maxValue}]`,
			);
		}
		this.currentValue = amount;
	}
}

// can never be negative
export class Resource extends ResourceOrCooldown {
	type: ResourceKey;
	enabled: boolean;
	pendingChange?: Event;

	#lastExpirationTime?: number;

	constructor(type: ResourceKey, maxValue: number, initialValue: number) {
		super(maxValue, initialValue);
		this.type = type;
		this.enabled = true;
	}

	available(amount: number) {
		return this.availableAmount() + Debug.epsilon >= amount;
	}
	availableAmountIncludingDisabled(): number {
		// used for checking LL existence: if Retrace should replace its button
		// also used for checking if a ground dot has been toggled but is still active
		return this.currentValue;
	}
	availableAmount() {
		return this.enabled ? super.availableAmount() : 0;
	}
	gainWrapping(amount: number) {
		this.currentValue = (this.currentValue + amount) % (this.maxValue + 1);
	}
	overrideTimer(game: GameState, newTime: number) {
		if (this.pendingChange) {
			// hack: make a new event for this, so it's executed after all other events at this time are ticked
			game.addEvent(
				new Event("override " + this.pendingChange.name + " timer: " + newTime, 0, () => {
					if (this.pendingChange) this.pendingChange.timeTillEvent = newTime;
				}),
			);
			this.pendingChange.timeTillEvent = newTime;
		} else {
			console.error(
				`Failed to override non-pending resource timer for resource: ${this.type}`,
			);
		}
	}
	removeTimer() {
		if (this.pendingChange) {
			this.pendingChange.canceled = true;
			this.pendingChange = undefined;
		}
	}
	getLastExpirationTime(): number | undefined {
		return this.#lastExpirationTime;
	}
	consume(amount: number) {
		super.consume(amount);
		if (this.currentValue === 0) {
			// note: might not want to access controller here
			this.#lastExpirationTime = controller.game.getDisplayTime();
		}
	}
}

export class OverTimeBuff extends Resource {
	node?: ActionNode = undefined;
	tickCount: number = 0;
}

export class CoolDown extends ResourceOrCooldown {
	type: CooldownKey;

	readonly #defaultRecast: number;
	#currentRecast: number;
	#timeTillNextStackAvailable: number;

	constructor(type: CooldownKey, cdPerStack: number, maxStacks: number, initialStacks: number) {
		super(maxStacks, initialStacks);
		this.type = type;

		this.#defaultRecast = cdPerStack;
		this.#currentRecast = cdPerStack; // special case for mixed-recast spells
		this.#timeTillNextStackAvailable = 0;
	}
	currentStackCd() {
		return this.#currentRecast;
	}
	maxStacks() {
		return this.maxValue;
	}
	useStack() {
		if (this.stacksAvailable() === this.maxStacks()) {
			this.#timeTillNextStackAvailable = this.#currentRecast;
		}
		super.consume(1);
	}
	useStackWithRecast(recast: number) {
		console.assert(
			this.maxStacks() === 1,
			"class CoolDown assumes special recasts are only available for skills with at most 1 stack",
		);
		// roll the GCD with a special recast value
		this.#currentRecast = recast;
		this.useStack();
	}
	restore(deltaTime: number) {
		while (deltaTime > 0 && super.availableAmount() < this.maxStacks()) {
			let forThisStack = Math.min(this.#timeTillNextStackAvailable, deltaTime);
			this.#timeTillNextStackAvailable -= forThisStack;
			if (this.#timeTillNextStackAvailable < Debug.epsilon) {
				super.gain(1);
				this.#currentRecast = this.#defaultRecast;
				if (this.stacksAvailable() < this.maxStacks()) {
					this.#timeTillNextStackAvailable += this.#defaultRecast;
				}
			}
			deltaTime -= forThisStack;
		}
	}
	timeTillNextStackAvailable() {
		return this.#timeTillNextStackAvailable;
	}
	overrideTimeTillNextStack(newTime: number) {
		this.#timeTillNextStackAvailable = newTime;
	}
	stacksAvailable(): number {
		return super.availableAmount();
	}
}

export class CoolDownState {
	game: GameState;
	#map: Map<CooldownKey, CoolDown>;
	constructor(game: GameState) {
		this.game = game;
		this.#map = new Map();
	}

	forEach(fn: (cd: CoolDown, cdName: CooldownKey) => void) {
		this.#map.forEach(fn);
	}

	get(rscType: CooldownKey): CoolDown {
		let rsc = this.#map.get(rscType);
		if (rsc) return rsc;
		else {
			console.assert(false, `no cooldown for resource ${rscType}`);
			return new CoolDown("NEVER", 0, 0, 0);
		}
	}

	set(cd: CoolDown) {
		this.#map.set(cd.type as CooldownKey, cd);
	}

	tick(deltaTime: number) {
		for (const cd of this.#map.values()) cd.restore(deltaTime);
	}
	timeTillNextStackAvailable(cdName: CooldownKey) {
		let cd = this.get(cdName);
		return cd.timeTillNextStackAvailable();
	}
	timeTillAnyStackAvailable(cdName: CooldownKey) {
		let cd = this.get(cdName);
		if (cd.stacksAvailable() > 0) return 0;
		return cd.timeTillNextStackAvailable();
	}
}

export class ResourceState {
	game: GameState;
	#map: Map<ResourceKey, Resource>;
	constructor(game: GameState) {
		this.game = game;
		this.#map = new Map();
	}

	get(rscType: ResourceKey): Resource {
		let rsc = this.#map.get(rscType);
		if (rsc) return rsc;
		else {
			console.error(`could not find resource ${rscType}`);
			return new Resource("NEVER", 0, 0);
		}
	}

	set(resource: Resource) {
		this.#map.set(resource.type, resource);
	}

	timeTillReady(rscType: ResourceKey): number {
		let rsc = this.get(rscType);
		if (rsc.pendingChange) {
			return rsc.pendingChange.timeTillEvent;
		}
		return 0;
	}

	// fnOnRsc : Resource -> ()
	addResourceEvent(props: {
		rscType: ResourceKey;
		name: string;
		delay: number;
		fnOnRsc: (rsc: Resource) => void;
		tags?: EventTag[];
	}) {
		let rsc = this.get(props.rscType);
		let evt = new Event(props.name, props.delay, () => {
			rsc.pendingChange = undefined; // unregister self from resource
			props.fnOnRsc(rsc); // before the scheduled event takes effect
		});
		rsc.pendingChange = evt; // register to resource
		if (props.tags) {
			props.tags.forEach((tag) => {
				evt.addTag(tag);
			});
		}
		this.game.addEvent(evt); // register to events master list
	}

	// useful for binary resources
	takeResourceLock(rscType: ResourceKey, delay: number) {
		this.get(rscType).consume(1);
		this.addResourceEvent({
			rscType: rscType,
			name: "[resource ready] " + rscType,
			delay: delay,
			fnOnRsc: (rsc) => {
				rsc.gain(1);
			},
		});
	}
}

export type ResourceInfo = {
	isCoolDown: false;
	defaultValue: number;
	maxValue: number;
	maxTimeout: number;
	warningOnTimeout?: WarningType;
};
export type CoolDownInfo = {
	isCoolDown: true;
	maxStacks: number;
	cdPerStack: number;
};
export type ResourceOrCoolDownInfo = ResourceInfo | CoolDownInfo;

const resourceInfos = new Map<ShellJob, Map<ResourceKey | CooldownKey, ResourceOrCoolDownInfo>>();

export function getResourceInfo(
	job: ShellJob,
	rsc: ResourceKey | CooldownKey,
): ResourceOrCoolDownInfo {
	const map = resourceInfos.get(job)!;
	if (!map.has(rsc)) {
		console.error(`no resource info found for ${rsc}`);
	}
	return map.get(rsc)!;
}

export function getAllResources(
	job: ShellJob,
): Map<ResourceKey | CooldownKey, ResourceOrCoolDownInfo> {
	if (!resourceInfos.has(job)) {
		console.error("could not find resources for job " + job);
	}
	return resourceInfos.get(job)!;
}

// Add a status effect or job gauge element to the resource map of the specified job.
export function makeResource(
	job: ShellJob,
	rsc: ResourceKey,
	maxValue: number,
	params: Partial<{
		default: number;
		timeout: number;
		warningOnTimeout: WarningType;
	}>,
) {
	getAllResources(job).set(rsc, {
		isCoolDown: false,
		defaultValue: params.default ?? 0,
		maxValue: maxValue,
		maxTimeout: params.timeout ?? -1,
		warningOnTimeout: params.warningOnTimeout,
	});
}

ALL_JOBS.forEach((job) => {
	resourceInfos.set(
		job,
		new Map([
			[
				"cd_GCD",
				{
					// special declaration for GCD override default
					isCoolDown: true,
					maxStacks: 1,
					cdPerStack: 2.5,
				},
			],
		]),
	);
	// MP, tincture buff, InCombat, and sprint are common to all jobs
	makeResource(job, "IN_COMBAT", 1, { default: 0 });
	makeResource(job, "MANA", 10000, { default: 10000 });
	makeResource(job, "TINCTURE", 1, { timeout: 30 });
	makeResource(job, "SPRINT", 1, { timeout: 10 });
	makeResource(job, "PARTY_SIZE", 8, { default: 8 });
	makeResource(job, "AUTOS_ENGAGED", 1, { default: 0 });
	makeResource(job, "STORED_AUTO", 1, { default: 0 });
});

MELEE_JOBS.forEach((job) => {
	// positionals are assumed on by default -- we'll add the ability to toggle them later
	makeResource(job, "REAR_POSITIONAL", 1, { default: 1 });
	makeResource(job, "FLANK_POSITIONAL", 1, { default: 1 });
});

// Add an ability to the resource map of the specified job.
// Should only be called within the makeAbility constructor, except for the default GCD cooldown.
// May be called multiple times if skills share a cooldown (such as picto living muse variants)
export function makeCooldown(
	job: ShellJob,
	rsc: CooldownKey,
	cdPerStack: number,
	maxStacks: number = 1,
) {
	getAllResources(job).set(rsc, {
		isCoolDown: true,
		cdPerStack: cdPerStack,
		maxStacks: maxStacks,
	});
}

export type ResourceOverrideData = {
	type: ResourceKey | CooldownKey;
	timeTillFullOrDrop: number; // CDs (full), buff/procs (drop)
	stacks: number; // Triplecast, MP, AF, UI, UH, Paradox, Polyglot
	effectOrTimerEnabled: boolean; // LL, halt
};

export class ResourceOverride {
	type: ResourceKey | CooldownKey;
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
		return (
			this.type === other.type &&
			this.timeTillFullOrDrop === other.timeTillFullOrDrop &&
			this.stacks === other.stacks &&
			this.effectOrTimerEnabled === other.effectOrTimerEnabled
		);
	}

	// todo
	static fromGameState(game: GameState) {
		let overrides: ResourceOverride[] = [];
		// CDs
		game.cooldowns.forEach((cd: CoolDown, cdName: CooldownKey) => {
			cd.availableAmount();
			overrides.push(
				new ResourceOverride({
					type: cdName,
					timeTillFullOrDrop: cd.maxValue - cd.availableAmount(),
					stacks: 0, // not used
					effectOrTimerEnabled: true, // not used
				}),
			);
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
		let info = getAllResources(game.job).get(this.type);
		if (!info) {
			console.assert(false, `can't apply override ${this.type} to job ${game.job}`);
			return;
		}

		// CD
		if (info.isCoolDown) {
			let cd = game.cooldowns.get(this.type as CooldownKey);
			let elapsed = cd.maxStacks() * cd.currentStackCd() - this.timeTillFullOrDrop;
			let stacks = Math.floor((elapsed + Debug.epsilon) / cd.currentStackCd());
			let timeTillNextStack = this.timeTillFullOrDrop % cd.currentStackCd();
			cd.overrideCurrentValue(stacks);
			cd.overrideTimeTillNextStack(timeTillNextStack);
		}

		// resource
		else {
			let rsc = game.resources.get(this.type as ResourceKey);

			let overrideDropRscTimer = (newTimer: number) => {
				rsc.removeTimer();
				game.resources.addResourceEvent({
					rscType: rsc.type,
					name: "drop " + rsc.type,
					delay: newTimer,
					fnOnRsc: (r: Resource) => {
						if (rsc.type === "ENOCHIAN") {
							// since enochian should also take away AF/UI/UH stacks
							// TODO move to job-specific code
							(game as BLMState).loseEnochian();
						} else {
							r.consume(r.availableAmount());
						}
					},
				});
			};

			// Ley Lines (timer + enabled)
			if (rsc.type === "LEY_LINES") {
				rsc.consume(rsc.availableAmount());
				rsc.gain(1);
				overrideDropRscTimer(this.timeTillFullOrDrop);
				rsc.enabled = this.effectOrTimerEnabled;
			}

			// Polyglot (refresh timer + stacks)
			else if (rsc.type === "POLYGLOT") {
				// stacks
				let stacks = this.stacks;
				rsc.consume(rsc.availableAmount());
				rsc.gain(stacks);
				// timer
				let timer = this.timeTillFullOrDrop;
				if (timer > 0) {
					// timer is set
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
				if (stacks > 0 && info.maxTimeout >= 0) {
					// may expire
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
			effectOrTimerEnabled: this.effectOrTimerEnabled,
		};
	}
}
