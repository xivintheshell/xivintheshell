import {Debug, SkillName, ProcMode} from "./Common";
import {ResourceOverride} from "./Resources";
import {ShellInfo, ShellVersion} from "../Controller/Common";

export const DEFAULT_CONFIG = {
	// 2.37 GCD
	shellVersion: ShellInfo.version,
	spellSpeed: 1532,
	criticalHit: 420,
	directHit: 420,
	countdown: 5,
	randomSeed: "sup",
	fps: 60,
	gcdCorrection: 0,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	extendedBuffTimes: false,
	initialResourceOverrides: []
};

const FIXED_BASE_CASTER_TAX = 0.1;

export class GameConfig {

	readonly shellVersion = ShellInfo.version;
	readonly spellSpeed: number;
	readonly criticalHit: number;
	readonly directHit: number;
	readonly countdown: number;
	readonly randomSeed: string;
	readonly fps: number;
	readonly gcdCorrection: number;
	readonly animationLock: number;
	readonly timeTillFirstManaTick: number;
	readonly procMode: ProcMode;
	readonly extendedBuffTimes: boolean;
	readonly initialResourceOverrides: ResourceOverride[];
	readonly legacy_casterTax: number;

	constructor(props: {
		shellVersion: ShellVersion,
		spellSpeed: number,
		criticalHit: number,
		directHit: number,
		countdown: number,
		randomSeed: string,
		fps: number,
		gcdCorrection: number,
		animationLock: number,
		timeTillFirstManaTick: number,
		procMode: ProcMode,
		extendedBuffTimes: boolean,
		initialResourceOverrides: any[],
		casterTax?: number, // legacy
	}) {
		this.shellVersion = props.shellVersion;
		this.spellSpeed = props.spellSpeed;
		this.criticalHit = props.criticalHit ?? DEFAULT_CONFIG.criticalHit;
		this.directHit = props.directHit ?? DEFAULT_CONFIG.directHit;
		this.countdown = props.countdown;
		this.randomSeed = props.randomSeed;
		this.fps = props.fps;
		this.gcdCorrection = props.gcdCorrection;
		this.animationLock = props.animationLock;
		this.timeTillFirstManaTick = props.timeTillFirstManaTick;
		this.procMode = props.procMode;
		this.extendedBuffTimes = props.extendedBuffTimes;
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
				this.countdown === other.countdown &&
				this.randomSeed === other.randomSeed &&
				this.fps === other.fps &&
				this.gcdCorrection === other.gcdCorrection &&
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
	// returns GCD before FPS tax
	adjustedGCD(hasLL: boolean) {
		let baseGCD = 2.5;
		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*baseGCD)/10000)/100)*100/100)/100;
	}

	// returns cast time before FPS and caster tax
	adjustedCastTime(inCastTime : number, hasLL: boolean) {
		let subtractLL = hasLL ? 15 : 0;
		return Math.floor(Math.floor(Math.floor((100-subtractLL)*100/100)*Math.floor((2000-Math.floor(130*(this.spellSpeed-420)/2780+1000))*(1000*inCastTime)/1000)/100)*100/100)/1000;
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

	// for gcd
	getAfterTaxGCD(beforeTaxGCD: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return beforeTaxGCD;
		}
		return Math.floor(beforeTaxGCD * this.fps + 1) / this.fps
			+ this.gcdCorrection;
	}

	getAfterTaxCastTime(capturedCastTime: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return this.legacy_casterTax;
		}
		return (Math.floor(capturedCastTime * this.fps + 1) + Math.floor(FIXED_BASE_CASTER_TAX * this.fps + 1)) / this.fps
			+ this.gcdCorrection;
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
			countdown: this.countdown,
			randomSeed: this.randomSeed,
			casterTax: this.legacy_casterTax, // still want this bc don't want to break cached timelines
			fps: this.fps,
			gcdCorrection: this.gcdCorrection,
			animationLock: this.animationLock,
			timeTillFirstManaTick: this.timeTillFirstManaTick,
			procMode: this.procMode,
			extendedBuffTimes: this.extendedBuffTimes,
			initialResourceOverrides: this.initialResourceOverrides.map(override=>{ return override.serialized(); })
		};
	}
}

