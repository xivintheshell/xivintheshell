import {Debug, ResourceType} from "./Common"
import {GameState} from "./GameState";
import {ActionNode} from "../Controller/Record";

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
	constructor(name: string, delay: number, effectFn: ()=>void) {
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
	useStack(game: GameState) {
		this.consume(this.#cdPerStack);
		this.#reCaptureRecastTimeScale(game);
	}
	useStackWithRecast(game: GameState, recast: number) {
		// roll the GCD with a special recast value
		this.consume(this.#currentBaseRecast);
		this.maxValue = recast;
		// LL/HP modifier
		this.#reCaptureRecastTimeScale(game);
		// scale for spells with longer cast/recast
		this.#currentBaseRecast = recast;
	}
	useStackWithFixedRecast(game: GameState, recast: number) {
		// roll the GCD with a special recast value for spells that are unaffected
		// by haste buffs or sps (i.e. picto motifs)
		this.consume(this.#currentBaseRecast);
		this.maxValue = recast;
		this.#recastTimeScale = 1;
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
	timeTillAnyStackAvailable(cdName: ResourceType) {
		let cd = this.get(cdName);
		if (cd.stacksAvailable() > 0) return 0;
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
			console.error("cannot find resource", rscType, "in current GameState");
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

export const resourceInfos = new Map<ResourceType, ResourceOrCoolDownInfo>();

// resources
resourceInfos.set(ResourceType.Mana, { isCoolDown: false, defaultValue: 10000, maxValue: 10000, maxTimeout: -1 });
resourceInfos.set(ResourceType.Polyglot, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: 30 });
resourceInfos.set(ResourceType.AstralFire, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });
resourceInfos.set(ResourceType.UmbralIce, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });
resourceInfos.set(ResourceType.UmbralHeart, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: -1 });
resourceInfos.set(ResourceType.AstralSoul, { isCoolDown: false, defaultValue: 0, maxValue: 6, maxTimeout: -1 });

resourceInfos.set(ResourceType.LeyLines, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Enochian, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 15 }); // controls AF, UI, UH
resourceInfos.set(ResourceType.Paradox, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: -1 });
resourceInfos.set(ResourceType.Firestarter, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Thunderhead, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.ThunderDoT, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 }); // buff display only
resourceInfos.set(ResourceType.Manaward, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 20 });
resourceInfos.set(ResourceType.Triplecast, { isCoolDown: false, defaultValue: 0, maxValue: 3, maxTimeout: 15 });
resourceInfos.set(ResourceType.Addle, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 15 });
resourceInfos.set(ResourceType.Swiftcast, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });
resourceInfos.set(ResourceType.LucidDreaming, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 21 }); // buff display only
resourceInfos.set(ResourceType.Surecast, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });
resourceInfos.set(ResourceType.Tincture, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 30 });
resourceInfos.set(ResourceType.Sprint, { isCoolDown: false, defaultValue: 0, maxValue: 1, maxTimeout: 10 });

// CDs
resourceInfos.set(ResourceType.cd_GCD, { isCoolDown: true, maxStacks: 1, cdPerStack: 2.5 });
resourceInfos.set(ResourceType.cd_LeyLines, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Transpose, { isCoolDown: true, maxStacks: 1, cdPerStack: 5 });
resourceInfos.set(ResourceType.cd_Manaward, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_BetweenTheLines, { isCoolDown: true, maxStacks: 1, cdPerStack: 3 });
resourceInfos.set(ResourceType.cd_AetherialManipulation, { isCoolDown: true, maxStacks: 1, cdPerStack: 10 });
resourceInfos.set(ResourceType.cd_Triplecast, { isCoolDown: true, maxStacks: 2, cdPerStack: 60 });
resourceInfos.set(ResourceType.cd_Manafont, { isCoolDown: true, maxStacks: 1, cdPerStack: 100 });
resourceInfos.set(ResourceType.cd_Amplifier, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Retrace, { isCoolDown: true, maxStacks: 1, cdPerStack: 40 });
resourceInfos.set(ResourceType.cd_Addle, { isCoolDown: true, maxStacks: 1, cdPerStack: 90 });
resourceInfos.set(ResourceType.cd_Swiftcast, { isCoolDown: true, maxStacks: 1, cdPerStack: 40 });
resourceInfos.set(ResourceType.cd_LucidDreaming, { isCoolDown: true, maxStacks: 1, cdPerStack: 60 });
resourceInfos.set(ResourceType.cd_Surecast, { isCoolDown: true, maxStacks: 1, cdPerStack: 120 });
resourceInfos.set(ResourceType.cd_Tincture, { isCoolDown: true, maxStacks: 1, cdPerStack: 270 });
resourceInfos.set(ResourceType.cd_Sprint, { isCoolDown: true, maxStacks: 1, cdPerStack: 60 });

type ResourceOverrideProps = {
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

	constructor(props: ResourceOverrideProps) {
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

		let info = resourceInfos.get(this.type);
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
							  game.loseEnochian();
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

	serialized() {
		return {
			type: this.type,
			timeTillFullOrDrop: this.timeTillFullOrDrop,
			stacks: this.stacks,
			effectOrTimerEnabled: this.effectOrTimerEnabled
		};
	}
}