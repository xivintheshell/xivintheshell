import {Debug, SkillName, ProcMode} from "./Common";
import {ResourceOverride} from "./Resources";

export const DEFAULT_CONFIG = {
	// 7.05 2.5 GCD bis https://xivgear.app/?page=sl%7C4c102326-839a-43c8-84ae-11ffdb6ef4a2
	spellSpeed: 420,
	criticalHit: 3140,
	directHit: 1993,
	determination: 2269,
	countdown: 4.5,
	randomSeed: "sup",
	casterTax: 0.1,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	extendedBuffTimes: true,
};

export class GameConfig {
	spellSpeed = DEFAULT_CONFIG.spellSpeed;
	criticalHit = DEFAULT_CONFIG.criticalHit;
	directHit = DEFAULT_CONFIG.directHit;
	determination = DEFAULT_CONFIG.determination;
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
		spellSpeed: number,
		criticalHit: number,
		directHit: number,
		determination: number,
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
			this.spellSpeed = props.spellSpeed;
			this.criticalHit = props.criticalHit ?? DEFAULT_CONFIG.criticalHit;
			this.directHit = props.directHit ?? DEFAULT_CONFIG.directHit;
			this.determination = props.determination ?? DEFAULT_CONFIG.determination;
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
			return this.spellSpeed === other.spellSpeed &&
				this.criticalHit === other.criticalHit &&
				this.directHit === other.directHit &&
				this.determination === other.determination &&
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
		let dotStrength = (1000 + Math.floor((this.spellSpeed - 420) * 130 / 2780.0)) * 0.001;
		return inPotency * dotStrength;
	}

	// 7/22/24: about the difference between adjustedGCD and adjustedCastTime, see scripts/sps-LL/test.js
	adjustedGCD(hasLL: boolean, hasHP?: boolean, recast?: number) {
		let baseGCD = recast || 2.5;
		let subtractLL = hasHP ? 25 : (hasLL ? 15 : 0);
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	adjustedCastTime(inCastTime : number, hasLL: boolean, inspired?: boolean) {
		let subtractLL = inspired ? 25 : (hasLL ? 15 : 0);
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*inCastTime)/1000)/100)*100/100)/1000;
	}

	getSkillAnimationLock(skillName : SkillName) : number {
		/* see: https://discord.com/channels/277897135515762698/1256614366674161705
		if (skillName === SkillName.Tincture) {
			return 1.16;
		}
		 */
		if (skillName === SkillName.AetherialManipulation
			|| skillName === SkillName.BetweenTheLines
			|| skillName === SkillName.Smudge) {
			// all movement skills have a lock of 0.8s
			return 0.8; // from: https://nga.178.com/read.php?tid=21233094&rand=761
		} else if (skillName === SkillName.TemperaCoatPop || skillName === SkillName.TemperaGrassaPop) {
			return 0.01; // not real abilities, animation lock is fake
		} else {
			return this.animationLock;
		}
	}

	static getSlidecastWindow(castTime : number) {
		return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
	}

	serialized() {
		return {
			spellSpeed: this.spellSpeed,
			criticalHit: this.criticalHit,
			directHit: this.directHit,
			determination: this.determination,
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

