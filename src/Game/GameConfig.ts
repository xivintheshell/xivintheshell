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
	// TEN, WD, and main stat are hidden because they are not currently used for any purpose in XIV in
	// the Shell itself.  They were requested by Caro for compatibility with Ama's Combat Sim
	// export, and can be set either via xivgear import or by manually editing this file.
	tenacity: number;
	main: number;
	wd: number;
	countdown: number;
	randomSeed: string;
	fps: number;
	gcdSkillCorrection: number;
	animationLock: number;
	timeTillFirstManaTick: number;
	procMode: ProcMode;
	initialResourceOverrides: ResourceOverrideData[];
};

const CURRENT_BIS_WD = 152;

// These fields should (and initialResourceOverrides) should change every time the job changes,
// while remaining fields are kept the same.
type DynamicConfigField =
	| "spellSpeed"
	| "skillSpeed"
	| "criticalHit"
	| "directHit"
	| "determination"
	| "piety"
	| "tenacity"
	| "main";

const TANK_MAIN = 5882;
const OTHER_MAIN = 5925;

const PRANGE_2_5_BIS = {
	main: OTHER_MAIN,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 3387,
	directHit: 1935,
	determination: 2407,
	piety: 440,
	tenacity: 420,
};

// BiS sets updated for patch 7.3
// These should only be applied the first time the user loads the site, or switches to a given job
const JOB_DEFAULT_FIELDS: { [Property in ShellJob]: { [Property in DynamicConfigField]: number } } =
	{
		DRK: {
			main: TANK_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3404,
			directHit: 1068,
			determination: 2883,
			piety: 440,
			tenacity: 794,
		},
		GNB: {
			main: TANK_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3404,
			directHit: 1068,
			determination: 2883,
			piety: 440,
			tenacity: 794,
		},
		PLD: {
			main: TANK_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3242,
			directHit: 1230,
			determination: 2883,
			piety: 440,
			tenacity: 794,
		},
		WAR: {
			main: TANK_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3404,
			directHit: 1068,
			determination: 2883,
			piety: 440,
			tenacity: 794,
		},
		AST: {
			// "2.46 Spero Dedes"
			main: OTHER_MAIN,
			spellSpeed: 704,
			skillSpeed: 420,
			criticalHit: 3427,
			directHit: 1230,
			determination: 2510,
			piety: 718,
			tenacity: 420,
		},
		SCH: {
			// 2.40
			main: OTHER_MAIN,
			spellSpeed: 1221,
			skillSpeed: 420,
			criticalHit: 3484,
			directHit: 852,
			determination: 2314,
			piety: 718,
			tenacity: 420,
		},
		SGE: {
			// 2.46 min piety
			main: OTHER_MAIN,
			spellSpeed: 704,
			skillSpeed: 420,
			criticalHit: 3427,
			directHit: 1230,
			determination: 2510,
			piety: 718,
			tenacity: 420,
		},
		WHM: {
			// 2.46 min piety
			main: OTHER_MAIN,
			spellSpeed: 704,
			skillSpeed: 420,
			criticalHit: 3427,
			directHit: 1230,
			determination: 2510,
			piety: 718,
			tenacity: 420,
		},
		DRG: {
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3425,
			directHit: 1996,
			determination: 2308,
			piety: 440,
			tenacity: 420,
		},
		MNK: {
			// 1.94
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 968,
			criticalHit: 3487,
			directHit: 1685,
			determination: 2009,
			piety: 440,
			tenacity: 420,
		},
		NIN: {
			// 2.12
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3378,
			directHit: 1981,
			determination: 2370,
			piety: 440,
			tenacity: 420,
		},
		RPR: {
			// 2.49
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 474,
			criticalHit: 3425,
			directHit: 1942,
			determination: 2308,
			piety: 440,
			tenacity: 420,
		},
		SAM: {
			// 2.14
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 690,
			criticalHit: 3425,
			directHit: 2045,
			determination: 1989,
			piety: 440,
			tenacity: 420,
		},
		VPR: {
			// 2.12
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3378,
			directHit: 1981,
			determination: 2370,
			piety: 440,
			tenacity: 420,
		},
		DNC: PRANGE_2_5_BIS,
		BRD: PRANGE_2_5_BIS,
		MCH: PRANGE_2_5_BIS,
		BLM: {
			main: OTHER_MAIN,
			spellSpeed: 978,
			skillSpeed: 420,
			criticalHit: 3456,
			directHit: 1764,
			determination: 1951,
			piety: 440,
			tenacity: 420,
		},
		RDM: {
			// 2.48
			main: OTHER_MAIN,
			spellSpeed: 528,
			skillSpeed: 420,
			criticalHit: 3399,
			directHit: 1872,
			determination: 2350,
			piety: 440,
			tenacity: 420,
		},
		SMN: {
			// 2.48
			main: OTHER_MAIN,
			spellSpeed: 528,
			skillSpeed: 420,
			criticalHit: 3399,
			directHit: 1872,
			determination: 2350,
			piety: 440,
			tenacity: 420,
		},
		PCT: {
			// 7.2 2.5 GCD bis https://xivgear.app/?page=sl%7Cc48f85d8-9b93-4f96-bfc4-1e0e30e98a8c
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 3399,
			directHit: 1764,
			determination: 2566,
			piety: 440,
			tenacity: 420,
		},
		BLU: {
			// lv80 2.20
			main: 1701,
			spellSpeed: 1573,
			skillSpeed: 380,
			criticalHit: 1343,
			directHit: 785,
			determination: 676,
			piety: 340,
			tenacity: 380,
		},
		NEVER: {
			main: OTHER_MAIN,
			spellSpeed: 420,
			skillSpeed: 420,
			criticalHit: 420,
			directHit: 420,
			determination: 440,
			piety: 440,
			tenacity: 420,
		},
	};

export function makeDefaultConfig(job: ShellJob): ConfigData {
	return {
		job,
		shellVersion: ShellInfo.version,
		level: job === "BLU" ? LevelSync.lvl80 : LevelSync.lvl100,
		...JOB_DEFAULT_FIELDS[job],
		wd: CURRENT_BIS_WD,
		countdown: 5,
		randomSeed: "sup",
		fps: 60,
		gcdSkillCorrection: 0,
		animationLock: 0.7,
		timeTillFirstManaTick: 1.2,
		procMode: ProcMode.Never,
		initialResourceOverrides: [],
	};
}

export const DEFAULT_CONFIG: ConfigData = makeDefaultConfig("BLM"); // TODO
Object.freeze(DEFAULT_CONFIG);

export type SerializedConfig = ConfigData & {
	casterTax: number; // still want this bc don't want to break cached timelines
};

export class GameConfig {
	readonly job: ShellJob;
	readonly shellVersion = ShellInfo.version;
	readonly level: LevelSync;
	readonly wd: number;
	readonly main: number;
	readonly spellSpeed: number;
	readonly skillSpeed: number;
	readonly criticalHit: number;
	readonly directHit: number;
	readonly determination: number;
	readonly piety: number;
	readonly tenacity: number;
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
		wd?: number;
		main?: number;
		spellSpeed: number;
		skillSpeed: number;
		criticalHit: number;
		directHit: number;
		determination: number;
		piety: number;
		tenacity?: number;
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
		// hidden stats currently used only for combat sim export
		this.tenacity = props?.tenacity ?? 420;
		this.main = props?.main ?? OTHER_MAIN;
		this.wd = props?.wd ?? CURRENT_BIS_WD;
	}

	// Presuming DoT and Hot potency calculations work the same way...
	adjustedOvertimePotency(inPotency: number, scalar: "sks" | "sps" | "unscaled") {
		return XIVMath.overtimePotency(
			this.level,
			scalar === "sks"
				? this.skillSpeed
				: scalar === "sps"
					? this.spellSpeed
					: XIVMath.getSubstatBase(this.level),
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

	get critRate(): number {
		return XIVMath.criticalHitRate(this.level, this.criticalHit);
	}

	serialized() {
		return {
			job: this.job,
			shellVersion: this.shellVersion,
			level: this.level,
			wd: this.wd,
			main: this.main,
			spellSpeed: this.spellSpeed,
			skillSpeed: this.skillSpeed,
			criticalHit: this.criticalHit,
			directHit: this.directHit,
			determination: this.determination,
			piety: this.piety,
			tenacity: this.tenacity,
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
