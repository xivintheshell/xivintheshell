import {Debug, SkillName, ProcMode, XIVMath, FIXED_BASE_CASTER_TAX} from "./Common";
import {ResourceOverride} from "./Resources";
import {ShellInfo, ShellVersion} from "../Controller/Common";

export const DEFAULT_CONFIG = {
	// 7.05 2.5 GCD bis https://xivgear.app/?page=sl%7C4c102326-839a-43c8-84ae-11ffdb6ef4a2
	shellVersion: ShellInfo.version,
	spellSpeed: 420,
	criticalHit: 3140,
	directHit: 1993,
	determination: 2269,
	countdown: 4.5,
	randomSeed: "sup",
	fps: 60,
	gcdSkillCorrection: 0,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	initialResourceOverrides: []
};

export class GameConfig {

	readonly shellVersion = ShellInfo.version;
	readonly spellSpeed: number;
	readonly criticalHit: number;
	readonly directHit: number;
	readonly determination: number;
	readonly countdown: number;
	readonly randomSeed: string;
	readonly fps: number;
	readonly gcdSkillCorrection: number;
	readonly animationLock: number;
	readonly timeTillFirstManaTick: number;
	readonly procMode: ProcMode;
	readonly initialResourceOverrides: ResourceOverride[];
	readonly legacy_casterTax: number;

	constructor(props: {
		shellVersion: ShellVersion,
		spellSpeed: number,
		criticalHit: number,
		directHit: number,
		determination: number,
		countdown: number,
		randomSeed: string,
		fps: number,
		gcdSkillCorrection: number,
		animationLock: number,
		timeTillFirstManaTick: number,
		procMode: ProcMode,
		initialResourceOverrides: any[],
		casterTax?: number, // legacy
	}) {
		this.shellVersion = props.shellVersion;
		this.spellSpeed = props.spellSpeed;
		this.criticalHit = props.criticalHit ?? DEFAULT_CONFIG.criticalHit;
		this.directHit = props.directHit ?? DEFAULT_CONFIG.directHit;
		this.determination = props.determination ?? DEFAULT_CONFIG.determination;
		this.countdown = props.countdown;
		this.randomSeed = props.randomSeed;
		this.fps = props.fps;
		this.gcdSkillCorrection = props.gcdSkillCorrection;
		this.animationLock = props.animationLock;
		this.timeTillFirstManaTick = props.timeTillFirstManaTick;
		this.procMode = props.procMode;
		this.initialResourceOverrides = props.initialResourceOverrides.map(obj=>{
			if (obj.effectOrTimerEnablled === undefined) {
				// backward compatibility:
				if (obj.enabled === undefined) obj.effectOrTimerEnabled = true;
				else obj.effectOrTimerEnabled = obj.enabled;
			}
			return new ResourceOverride(obj);
		});
		// backward compatibility for caster tax:
		this.legacy_casterTax = props?.casterTax ?? 0;
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
			return this.shellVersion === other.shellVersion &&
				this.spellSpeed === other.spellSpeed &&
				this.criticalHit === other.criticalHit &&
				this.directHit === other.directHit &&
				this.determination === other.determination &&
				this.countdown === other.countdown &&
				this.randomSeed === other.randomSeed &&
				this.fps === other.fps &&
				this.gcdSkillCorrection === other.gcdSkillCorrection &&
				this.animationLock === other.animationLock &&
				this.timeTillFirstManaTick === other.timeTillFirstManaTick &&
				this.procMode === other.procMode
		} else {
			return false;
		}
	}

	adjustedDoTPotency(inPotency : number) {
		return XIVMath.dotPotency(this.spellSpeed, inPotency);
	}

	// returns GCD before FPS tax
	adjustedGCD(hasLL: boolean, inspired?: boolean, recast?: number) {
		return XIVMath.preTaxGcd(this.spellSpeed, hasLL, inspired, recast);
	}

	// returns cast time before FPS and caster tax
	adjustedCastTime(inCastTime : number, hasLL: boolean, inspired?: boolean) {
		return XIVMath.preTaxCastTime(this.spellSpeed, inCastTime, hasLL, inspired);
	}

	getSkillAnimationLock(skillName : SkillName) : number {
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

	// for gcd
	getAfterTaxGCD(beforeTaxGCD: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return beforeTaxGCD;
		}
		return XIVMath.afterFpsTax(this.fps, beforeTaxGCD)
			+ this.gcdSkillCorrection;
	}

	// for casts
	getAfterTaxCastTime(capturedCastTime: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return this.legacy_casterTax + capturedCastTime;
		}
		return XIVMath.afterFpsTax(this.fps, capturedCastTime)
			+ XIVMath.afterFpsTax(this.fps, FIXED_BASE_CASTER_TAX)
			+ this.gcdSkillCorrection;
	}

	static getSlidecastWindow(castTime : number) {
		return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
	}

	serialized() {
		return {
			shellVersion: this.shellVersion,
			spellSpeed: this.spellSpeed,
			criticalHit: this.criticalHit,
			directHit: this.directHit,
			determination: this.determination,
			countdown: this.countdown,
			randomSeed: this.randomSeed,
			casterTax: this.legacy_casterTax, // still want this bc don't want to break cached timelines
			fps: this.fps,
			gcdSkillCorrection: this.gcdSkillCorrection,
			animationLock: this.animationLock,
			timeTillFirstManaTick: this.timeTillFirstManaTick,
			procMode: this.procMode,
			initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
		};
	}
}

