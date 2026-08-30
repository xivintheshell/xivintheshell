import { Debug, ProcMode, LevelSync, FIXED_BASE_CASTER_TAX } from "./Common";
import { ResourceOverride, ResourceOverrideData } from "./Resources";
import { getCachedValue, setCachedValue, ShellInfo, ShellVersion } from "../Controller/Common";
import { XIVMath } from "./XIVMath";
import { JOBS, ShellJob } from "./Data/Jobs";
import { CooldownKey, COOLDOWNS, ResourceKey, RESOURCES } from "./Data";
import { PhantomJob } from "./Data/Shared/Phantom";

export type ConfigData = {
	job: ShellJob;
	phantomJob?: PhantomJob; // added by phantom job fork
	shellVersion: ShellVersion;
	level: LevelSync;
	spellSpeed: number;
	skillSpeed: number;
	criticalHit: number;
	directHit: number;
	determination: number;
	piety: number;
	// TEN is not shown in the config UI (still used for tank damage calc / combat sim export).
	// WD and main are used for expected damage and can be set via the config pane or gear import.
	// On the main site these are implicitly set only via xivgear import for combat sim compatibility.
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

const CURRENT_BIS_WD = 139;

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

export type DynamicConfigPart = {
	[Property in DynamicConfigField]: number;
};

const OTHER_MAIN = 5440;

// https://xivgear.app/?page=sl|46a9d9dc-19b2-43b6-b04b-303a051ac2cc
const TANK_OC_BIS: DynamicConfigPart = {
	main: 5370,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 2781,
	directHit: 420,
	determination: 2557,
	piety: 440,
	tenacity: 1040,
};

// https://xivgear.app/?page=sl|3496a0c0-71a8-416a-b5d4-c1b31fe52e2a
const HEALER_OC_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 712,
	skillSpeed: 420,
	criticalHit: 3055,
	directHit: 420,
	determination: 2134,
	piety: 917,
	tenacity: 420,
};

// https://xivgear.app/?page=sl|2e79c852-353b-4f15-85da-766b73156f03
const MAIMING_OC_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 2597,
	directHit: 1512,
	determination: 2269,
	piety: 420,
	tenacity: 420,
};

const SCOUTING_OC_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 2816,
	directHit: 1368,
	determination: 2194,
	piety: 420,
	tenacity: 420,
};

const PRANGE_2_5_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 2781,
	directHit: 1606,
	determination: 1991,
	piety: 440,
	tenacity: 420,
};

const CASTING_OC_2_48_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 528,
	skillSpeed: 420,
	criticalHit: 3385,
	directHit: 1423,
	determination: 2001,
	piety: 440,
	tenacity: 420,
};

const CASTING_OC_2_5_BIS: DynamicConfigPart = {
	main: OTHER_MAIN,
	spellSpeed: 420,
	skillSpeed: 420,
	criticalHit: 3385,
	directHit: 1423,
	determination: 2109,
	piety: 440,
	tenacity: 420,
};

// BiS sets with full +3 and OC accessories
// These should only be applied the first time the user loads the site, or switches to a given job
const JOB_DEFAULT_FIELDS: { [Property in ShellJob]: DynamicConfigPart } = {
	DRK: TANK_OC_BIS,
	GNB: TANK_OC_BIS,
	PLD: TANK_OC_BIS,
	WAR: TANK_OC_BIS,
	AST: HEALER_OC_BIS,
	SCH: HEALER_OC_BIS,
	SGE: HEALER_OC_BIS,
	WHM: HEALER_OC_BIS,
	DRG: MAIMING_OC_BIS,
	MNK: {
		// 1.96
		// https://xivgear.app/?page=sl|3c30ba7a-132f-4238-893d-e20b2e381d22
		main: OTHER_MAIN,
		spellSpeed: 420,
		skillSpeed: 781,
		criticalHit: 2746,
		directHit: 1353,
		determination: 1918,
		piety: 440,
		tenacity: 420,
	},
	NIN: SCOUTING_OC_BIS,
	RPR: {
		...MAIMING_OC_BIS,
		determination: 2161,
		skillSpeed: 528, // 2.48
	},
	SAM: {
		// 2.14
		// https://xivgear.app/?page=sl|102422af-03bf-4bad-9815-4a3c592561fa
		main: OTHER_MAIN,
		spellSpeed: 420,
		skillSpeed: 781,
		criticalHit: 2746,
		directHit: 1353,
		determination: 1918,
		piety: 440,
		tenacity: 420,
	},
	VPR: SCOUTING_OC_BIS,
	DNC: PRANGE_2_5_BIS,
	BRD: PRANGE_2_5_BIS,
	MCH: PRANGE_2_5_BIS,
	BLM: CASTING_OC_2_48_BIS,
	RDM: CASTING_OC_2_5_BIS,
	SMN: CASTING_OC_2_48_BIS,
	PCT: CASTING_OC_2_5_BIS,
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

export function makeDefaultConfig(job: ShellJob, level: LevelSync = LevelSync.lvl100): ConfigData {
	return {
		job,
		shellVersion: ShellInfo.version,
		level: level ?? (job === "BLU" ? LevelSync.lvl80 : LevelSync.lvl100),
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

export function getSavedConfigPart(job: ShellJob): DynamicConfigPart {
	const blob = getCachedValue(`defaultPartialConfig: ${job}`);
	if (blob === null) {
		return JOB_DEFAULT_FIELDS[job];
	}
	const parsedBlob = JSON.parse(blob);
	// We only store combat stats directly in localStorage so they remain independent between jobs.
	// Remaining stats (like fps and countdown) are shared across job swap.
	// If anything is missing, just fill it in from the default.
	Object.entries(JOB_DEFAULT_FIELDS[job]).forEach(([key, value]) => {
		if (parsedBlob[key] === undefined) {
			parsedBlob[key] = value;
		}
	});
	return parsedBlob as ConfigData;
}

export const DEFAULT_CONFIG = makeDefaultConfig("BLM");

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
		const defaultConfig = DEFAULT_CONFIG;
		this.level = props.level ?? defaultConfig.level;
		this.spellSpeed = props.spellSpeed;
		this.skillSpeed = props.skillSpeed ?? defaultConfig.skillSpeed;
		this.criticalHit = props.criticalHit ?? defaultConfig.criticalHit;
		this.directHit = props.directHit ?? defaultConfig.directHit;
		this.determination = props.determination ?? defaultConfig.determination;
		this.piety = props.piety ?? defaultConfig.piety;
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

	getOverrideStacks(rsc: ResourceKey): number | undefined {
		return this.initialResourceOverrides.find((override) => override.type === rsc)?.stacks;
	}

	/**
	 * Options for XIVMath.calculateExpectedDamage derived from the current job.
	 * mainStatJobMod values are ClassJob primary-attribute modifiers.
	 * traitMulti follows XivGear role templates (Maim and Mend / Increased Action Damage).
	 */
	getDamageCalcOptions(): {
		mainStatJobMod: number;
		isTank: boolean;
		useCasterFormula: boolean;
		traitMulti: number;
		tenacity: number;
	} {
		const role = JOBS[this.job].role;
		const isTank = role === "TANK";
		const useCasterFormula = role === "HEALER" || role === "CASTER" || role === "LIMITED";

		// ClassJob primary attribute modifiers (mainStatJobMod for WD formula)
		// https://www.akhmorning.com/allagan-studies/modifiers/
		const MAIN_STAT_JOB_MOD: Partial<Record<ShellJob, number>> = {
			PLD: 100,
			MNK: 110,
			WAR: 105,
			DRG: 115,
			NIN: 110,
			DRK: 105,
			SAM: 112,
			GNB: 100,
			RPR: 115,
			VPR: 110,
		};

		let traitMulti = 1;
		if (this.job === "BLU") {
			traitMulti = 1.5; // Maim and Mend V
		} else if (role === "HEALER" || role === "CASTER") {
			traitMulti = 1.3; // Maim and Mend II
		} else if (role === "RANGED") {
			traitMulti = 1.2; // Increased Action Damage II
		}

		return {
			// casters, prange, healers, and BLU all have a jobmod of 115
			mainStatJobMod: MAIN_STAT_JOB_MOD[this.job] ?? 115,
			isTank,
			useCasterFormula,
			traitMulti,
			tenacity: this.tenacity,
		};
	}

	savePartialConfig() {
		const obj: any = {};
		Object.keys(JOB_DEFAULT_FIELDS[this.job]).forEach((key) => {
			obj[key] = this[key as keyof GameConfig];
		});
		setCachedValue(`defaultPartialConfig: ${this.job}`, JSON.stringify(obj));
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
			initialResourceOverrides: this.initialResourceOverrides.map((override) =>
				override.serialized(),
			),
		};
	}
}
