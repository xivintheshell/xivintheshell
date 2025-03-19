import { Debug, ProcMode, LevelSync, FIXED_BASE_CASTER_TAX } from "./Common";
import { ResourceOverride, ResourceOverrideData } from "./Resources";
import { ShellInfo, ShellVersion } from "../Controller/Common";
import { XIVMath } from "./XIVMath";
import { ShellJob } from "./Data/Jobs";
import { CooldownKey, COOLDOWNS, ResourceKey, RESOURCES } from "./Data";

export type ConfigData = {
	job: ShellJob;
	shellVersion: ShellVersion;
	level: LevelSync;
	spellSpeed: number;
	skillSpeed: number;
	criticalHit: number;
	directHit: number;
	determination: number;
	piety: number;
	countdown: number;
	randomSeed: string;
	fps: number;
	gcdSkillCorrection: number;
	animationLock: number;
	timeTillFirstManaTick: number;
	procMode: ProcMode;
	initialResourceOverrides: ResourceOverrideData[];
};

export const DEFAULT_BLM_CONFIG: ConfigData = {
	job: "BLM",
	shellVersion: ShellInfo.version,
	level: LevelSync.lvl100,
	// 2.37 GCD
	spellSpeed: 1532,
	skillSpeed: 420,
	criticalHit: 420,
	directHit: 420,
	determination: 440,
	piety: 440,
	countdown: 5,
	randomSeed: "sup",
	fps: 60,
	gcdSkillCorrection: 0,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	initialResourceOverrides: [],
};

export const DEFAULT_PCT_CONFIG: ConfigData = {
	job: "PCT",
	shellVersion: ShellInfo.version,
	level: LevelSync.lvl100,
	// 7.05 2.5 GCD bis https://xivgear.app/?page=sl%7C4c102326-839a-43c8-84ae-11ffdb6ef4a2
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 3140,
	directHit: 1993,
	determination: 2269,
	piety: 440,
	countdown: 4.5,
	randomSeed: "sup",
	fps: 60,
	gcdSkillCorrection: 0,
	animationLock: 0.7,
	timeTillFirstManaTick: 1.2,
	procMode: ProcMode.Never,
	initialResourceOverrides: [],
};

export const DEFAULT_CONFIG: ConfigData = DEFAULT_BLM_CONFIG; // TODO
// {
// 	['BLM']: DEFAULT_BLM_CONFIG,
// 	['PCT']: DEFAULT_PCT_CONFIG,
// }[ShellInfo.job];

export type SerializedConfig = ConfigData & {
	casterTax: number; // still want this bc don't want to break cached timelines
};

export class GameConfig {
	readonly job: ShellJob;
	readonly shellVersion = ShellInfo.version;
	readonly level: LevelSync;
	readonly spellSpeed: number;
	readonly skillSpeed: number;
	readonly criticalHit: number;
	readonly directHit: number;
	readonly determination: number;
	readonly piety: number;
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
		job: ShellJob;
		shellVersion: ShellVersion;
		level: LevelSync;
		spellSpeed: number;
		skillSpeed: number;
		criticalHit: number;
		directHit: number;
		determination: number;
		piety: number;
		countdown: number;
		randomSeed: string;
		fps: number;
		gcdSkillCorrection: number;
		animationLock: number;
		timeTillFirstManaTick: number;
		procMode: ProcMode;
		initialResourceOverrides: (ResourceOverrideData & { enabled?: boolean })[];
		casterTax?: number; // legacy
	}) {
		this.job = props.job;
		this.shellVersion = props.shellVersion;
		this.level = props.level ?? DEFAULT_CONFIG.level;
		this.spellSpeed = props.spellSpeed;
		this.skillSpeed = props.skillSpeed ?? DEFAULT_CONFIG.skillSpeed;
		this.criticalHit = props.criticalHit ?? DEFAULT_CONFIG.criticalHit;
		this.directHit = props.directHit ?? DEFAULT_CONFIG.directHit;
		this.determination = props.determination ?? DEFAULT_CONFIG.determination;
		this.piety = props.piety ?? DEFAULT_CONFIG.piety;
		this.countdown = props.countdown;
		this.randomSeed = props.randomSeed;
		this.fps = props.fps;
		this.gcdSkillCorrection = props.gcdSkillCorrection;
		this.animationLock = props.animationLock;
		this.timeTillFirstManaTick = props.timeTillFirstManaTick;
		this.procMode = props.procMode;
		this.initialResourceOverrides = props.initialResourceOverrides.map((obj) => {
			if (obj.effectOrTimerEnabled === undefined) {
				// backward compatibility:
				if (obj.enabled === undefined) obj.effectOrTimerEnabled = true;
				else obj.effectOrTimerEnabled = obj.enabled;
			}
			// Backwards compatibility re: change to keyed data
			if (!(obj.type in RESOURCES || obj.type in COOLDOWNS)) {
				// Special case a few spelling changes made during the transition
				if (obj.type.toString() === "AstralFire") {
					obj.type = "ASTRAL_FIRE";
				} else if (obj.type.toString() === "UmbralIce") {
					obj.type = "UMBRAL_ICE";
				} else if (obj.type.toString() === "UmbralHeart") {
					obj.type = "UMBRAL_HEART";
				} else {
					// Try to find the key in RESOURCES
					let key: ResourceKey | CooldownKey | undefined = Object.keys(RESOURCES).find(
						(key) => RESOURCES[key as ResourceKey].name === obj.type,
					) as ResourceKey;
					// If not found, check COOLDOWNS next
					if (!key) {
						key = Object.keys(COOLDOWNS).find(
							(key) => COOLDOWNS[key as CooldownKey].name === obj.type,
						) as CooldownKey;
					}
					// If we found it in either data set, assign the key as the type
					if (key) {
						obj.type = key;
					}
				}
			}
			return new ResourceOverride(obj);
		});
		// backward compatibility for caster tax:
		this.legacy_casterTax = props?.casterTax ?? 0;
	}

	// Presuming DoT and Hot potency calculations work the same way...
	adjustedOvertimePotency(inPotency: number, scalar: "sks" | "sps") {
		return XIVMath.overtimePotency(
			this.level,
			scalar === "sks" ? this.skillSpeed : this.spellSpeed,
			inPotency,
		);
	}

	// returns GCD before FPS tax
	adjustedGCD(baseGCD: number = 2.5, speedModifier?: number) {
		if (this.shellVersion >= ShellVersion.AllaganGcdFormula) {
			return XIVMath.preTaxGcd(this.level, this.spellSpeed, baseGCD, speedModifier);
		} else {
			return XIVMath.preTaxGcdLegacy(this.level, this.spellSpeed, baseGCD, speedModifier);
		}
	}

	adjustedSksGCD(baseGCD: number = 2.5, speedModifier?: number) {
		if (this.shellVersion >= ShellVersion.AllaganGcdFormula) {
			return XIVMath.preTaxGcd(this.level, this.skillSpeed, baseGCD, speedModifier);
		} else {
			return XIVMath.preTaxGcdLegacy(this.level, this.skillSpeed, baseGCD, speedModifier);
		}
	}

	// returns cast time before FPS and caster tax
	adjustedCastTime(inCastTime: number, speedModifier?: number) {
		return XIVMath.preTaxCastTime(this.level, this.spellSpeed, inCastTime, speedModifier);
	}

	adjustedSksCastTime(inCastTime: number, speedModifier?: number) {
		return XIVMath.preTaxCastTime(this.level, this.skillSpeed, inCastTime, speedModifier);
	}

	// for gcd
	getAfterTaxGCD(beforeTaxGCD: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return beforeTaxGCD;
		}
		return XIVMath.afterFpsTax(this.fps, beforeTaxGCD) + this.gcdSkillCorrection;
	}

	// for casts
	getAfterTaxCastTime(capturedCastTime: number) {
		if (this.shellVersion < ShellVersion.FpsTax) {
			return this.legacy_casterTax + capturedCastTime;
		}
		return (
			XIVMath.afterFpsTax(this.fps, capturedCastTime) +
			XIVMath.afterFpsTax(this.fps, FIXED_BASE_CASTER_TAX) +
			this.gcdSkillCorrection
		);
	}

	static getSlidecastWindow(castTime: number) {
		return Debug.constantSlidecastWindow ? 0.5 : 0.46 + 0.02 * castTime;
	}

	serialized() {
		return {
			job: this.job,
			shellVersion: this.shellVersion,
			level: this.level,
			spellSpeed: this.spellSpeed,
			skillSpeed: this.skillSpeed,
			criticalHit: this.criticalHit,
			directHit: this.directHit,
			determination: this.determination,
			piety: this.piety,
			countdown: this.countdown,
			randomSeed: this.randomSeed,
			casterTax: this.legacy_casterTax, // still want this bc don't want to break cached timelines
			fps: this.fps,
			gcdSkillCorrection: this.gcdSkillCorrection,
			animationLock: this.animationLock,
			timeTillFirstManaTick: this.timeTillFirstManaTick,
			procMode: this.procMode,
			initialResourceOverrides: this.initialResourceOverrides.map((override) => {
				return override.serialized();
			}),
		};
	}
}
