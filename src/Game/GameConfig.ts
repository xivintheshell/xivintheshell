import { Calculations } from "./Calculations";
import {Debug, SkillName, ProcMode, LevelSync} from "./Common";
import {ResourceOverride} from "./Resources";

export const DEFAULT_CONFIG = {
	level: LevelSync.lvl100,
	// 2.37 GCD
	spellSpeed: 1532,
	criticalHit: 420,
	directHit: 420,
	countdown: 5,
	randomSeed: "sup",
	casterTax: 0.1,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	extendedBuffTimes: false,
};

export class GameConfig {
	level = DEFAULT_CONFIG.level;
	spellSpeed = DEFAULT_CONFIG.spellSpeed;
	criticalHit = DEFAULT_CONFIG.criticalHit;
	directHit = DEFAULT_CONFIG.directHit;
	countdown = DEFAULT_CONFIG.countdown;
	randomSeed = DEFAULT_CONFIG.randomSeed;
	casterTax = DEFAULT_CONFIG.casterTax;
	animationLock = DEFAULT_CONFIG.animationLock;
	timeTillFirstManaTick = DEFAULT_CONFIG.timeTillFirstManaTick;
	procMode = DEFAULT_CONFIG.procMode;
	extendedBuffTimes = DEFAULT_CONFIG.extendedBuffTimes;
	initialResourceOverrides: ResourceOverride[] = [];

	// DEBUG
	constructor(props?: {
		level: LevelSync,
		spellSpeed: number,
		criticalHit: number,
		directHit: number,
		countdown: number,
		randomSeed: string,
		casterTax: number,
		animationLock: number,
		timeTillFirstManaTick: number,
		procMode: ProcMode,
		extendedBuffTimes: boolean,
		initialResourceOverrides: any[]
	}) {
		if (props) {
			this.level = props.level;
			this.spellSpeed = props.spellSpeed;
			this.criticalHit = props.criticalHit ?? DEFAULT_CONFIG.criticalHit;
			this.directHit = props.directHit ?? DEFAULT_CONFIG.directHit;
			this.countdown = props.countdown;
			this.randomSeed = props.randomSeed;
			this.casterTax = props.casterTax;
			this.animationLock = props.animationLock;
			this.timeTillFirstManaTick = props.timeTillFirstManaTick;
			this.procMode = props.procMode;
			this.extendedBuffTimes = props.extendedBuffTimes;
			if (props.initialResourceOverrides) {
				this.initialResourceOverrides = props.initialResourceOverrides.map(obj=>{
					if (obj.effectOrTimerEnabled === undefined) {
						// backward compatibility:
						if (obj.enabled === undefined) obj.effectOrTimerEnabled = true;
						else obj.effectOrTimerEnabled = obj.enabled;
					}
					return new ResourceOverride(obj);
				});
			}
		}
	}

	equals(other : GameConfig) {
		let sortFn = (a: ResourceOverride, b: ResourceOverride)=>{
			return a.props.type < b.props.type ? -1 : 1;
		};
		let thisSortedOverrides = this.initialResourceOverrides.sort(sortFn);
		let otherSortedOverrides = other.initialResourceOverrides.sort(sortFn);
		if (thisSortedOverrides.length === otherSortedOverrides.length) {
			for (let i = 0; i < thisSortedOverrides.length; i++) {
				if (!thisSortedOverrides[i].equals(otherSortedOverrides[i])) {
					return false;
				}
			}
			return this.level === other.level &&
				this.spellSpeed === other.spellSpeed &&
				this.criticalHit === other.criticalHit &&
				this.directHit === other.directHit &&
				this.countdown === other.countdown &&
				this.randomSeed === other.randomSeed &&
				this.casterTax === other.casterTax &&
				this.animationLock === other.animationLock &&
				this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
				this.procMode === other.procMode &&
				this.extendedBuffTimes === other.extendedBuffTimes;
		} else {
			return false;
		}
	}

	adjustedDoTPotency(inPotency : number) {
		let dotStrength = Calculations.doTStrength(this.level, this.spellSpeed);
		return inPotency * dotStrength;
	}

	adjustedGCD(hasLL: boolean) {
		return Calculations.adjustedGCD(this.level, this.spellSpeed, hasLL);
	}

	adjustedCastTime(inCastTime : number, hasLL: boolean) {
		return Calculations.adjustedCastTime(this.level, this.spellSpeed, inCastTime, hasLL);
	}

	getSkillAnimationLock(skillName : SkillName) : number {
		/* see: https://discord.com/channels/277897135515762698/1256614366674161705
		if (skillName === SkillName.Tincture) {
			return 1.16;
		}
		 */
		if (skillName === SkillName.AetherialManipulation || skillName === SkillName.BetweenTheLines) {
			return 0.8; // from: https://nga.178.com/read.php?tid=21233094&rand=761
		} else {
			return this.animationLock;
		}
	}

	static getSlidecastWindow(castTime : number) {
		return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
	}

	serialized() {
		return {
			level: this.level,
			spellSpeed: this.spellSpeed,
			criticalHit: this.criticalHit,
			directHit: this.directHit,
			countdown: this.countdown,
			randomSeed: this.randomSeed,
			casterTax: this.casterTax,
			animationLock: this.animationLock,
			timeTillFirstManaTick: this.timeTillFirstManaTick,
			procMode: this.procMode,
			extendedBuffTimes: this.extendedBuffTimes,
			initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
		};
	}
}

