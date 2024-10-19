import {Debug, SkillName, ProcMode, LevelSync, ResourceType, FIXED_BASE_CASTER_TAX} from "./Common";
import {ResourceOverride, ResourceOverrideData} from "./Resources";
import {ShellInfo, ShellJob, ShellVersion} from "../Controller/Common";
import {XIVMath} from "./XIVMath";

export type ConfigData = {
	shellVersion: ShellVersion,
	level: LevelSync,
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
	initialResourceOverrides: ResourceOverrideData[]
}

const DEFAULT_BLM_CONFIG: ConfigData = {
	shellVersion: ShellInfo.version,
	level: LevelSync.lvl100,
	// 2.37 GCD
	spellSpeed: 1532,
	criticalHit: 420,
	directHit: 420,
	determination: 420,
	countdown: 5,
	randomSeed: "sup",
	fps: 60,
	gcdSkillCorrection: 0,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	initialResourceOverrides: []
};

const DEFAULT_PCT_CONFIG: ConfigData = {
	shellVersion: ShellInfo.version,
	level: LevelSync.lvl100,
	// 7.05 2.5 GCD bis https://xivgear.app/?page=sl%7C4c102326-839a-43c8-84ae-11ffdb6ef4a2
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

export const DEFAULT_CONFIG: ConfigData = {
	[ShellJob.BLM]: DEFAULT_BLM_CONFIG,
	[ShellJob.PCT]: DEFAULT_PCT_CONFIG,
}[ShellInfo.job];

export type SerializedConfig = ConfigData & {
	casterTax: number, // still want this bc don't want to break cached timelines
}

export class GameConfig {
	readonly shellVersion = ShellInfo.version;
	readonly level: LevelSync;
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
		level: LevelSync,
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
		initialResourceOverrides: (ResourceOverrideData & {enabled?: boolean})[],
		casterTax?: number, // legacy
	}) {
		this.shellVersion = props.shellVersion;
		this.level = props.level ?? DEFAULT_CONFIG.level;
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
			if (obj.effectOrTimerEnabled === undefined) {
				// backward compatibility:
				if (obj.enabled === undefined) obj.effectOrTimerEnabled = true;
				else obj.effectOrTimerEnabled = obj.enabled;
			}
			return new ResourceOverride(obj);
		});
		// backward compatibility for caster tax:
		this.legacy_casterTax = props?.casterTax ?? 0;
	}

	adjustedDoTPotency(inPotency : number) {
		return XIVMath.dotPotency(this.level, this.spellSpeed, inPotency);
	}

	// returns GCD before FPS tax
	adjustedGCD(baseGCD: number = 2.5, speedBuff?: ResourceType) {
		return XIVMath.preTaxGcd(this.level, this.spellSpeed, baseGCD, speedBuff);
	}

	// returns cast time before FPS and caster tax
	adjustedCastTime(inCastTime: number, speedBuff?: ResourceType) {
		return XIVMath.preTaxCastTime(this.level, this.spellSpeed, inCastTime, speedBuff);
	}

	getSkillAnimationLock(skillName : SkillName) : number {
		if (skillName === SkillName.AetherialManipulation
			|| skillName === SkillName.BetweenTheLines
			|| skillName === SkillName.Smudge) {
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
			level: this.level,
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

