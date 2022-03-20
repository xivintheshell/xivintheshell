export const Debug =
{
	epsilon: 1e-5,
	disableManaTicks: false,
	consoleLogEvents: false
};

export class GameConfig
{
	constructor() {
		this.spellSpeed = 400;
		this.countdown = 0;
	}
	adjustedDoTPotency(inPotency) {
		let dotStrength = (1000 + Math.floor((this.spellSpeed - 400) * 130 / 1900.0)) * 0.001;
		return inPotency * dotStrength;
	}

	adjustedCastTime(inCastTime) {
		let ceil = Math.ceil((400.0 - this.spellSpeed) * 130 / 1900.0);
		let pts = Math.floor(inCastTime * (1000.0 + ceil));

		return Math.floor(pts / 10) * 0.01;
	}

	getSlidecastWindow(castTime) {
		return 0.46 + 0.02 * castTime;
	}
}

export const Aspect = 
{
	Fire: "Fire",
	Ice: "Ice",
	Lightning: "Lightning",
	Other: "Other"
};

export const SkillName = 
{
    Blizzard: "Blizzard",
    Fire: "Fire",
	Transpose: "Transpose",
	Thunder3: "Thunder 3",
	Manaward: "Manaward",
	Manafont: "Manafont",
	LeyLines: "Ley Lines",
	Fire3: "Fire 3",
	Blizzard3: "Blizzard 3",
	Freeze: "Freeze",
	Flare: "Flare",
	Sharpcast: "Sharpcast",
	Blizzard4: "Blizzard 4",
	Fire4: "Fire 4",
	BetweenTheLines: "Between the Lines",
	AetherialManipulation: "Aetherial Manipulation",
	Thunder4: "Thunder 4",
	Triplecast: "Triplecast",
	Foul: "Foul",
	Despair: "Despair",
	UmbralSoul: "Umbral Soul",
	Xenoglossy: "Xenoglossy",
	HighFire2: "High Fire 2",
	HighBlizzard2: "High Blizzard 2",
	Amplifier: "Amplifier",
	Paradox: "Paradox",
	Addle: "Addle",
	Swiftcast: "Swiftcast",
	LucidDreaming: "Lucid Dreaming",
	Surecast: "Surecast",
	Tincture: "Tincture"
};

export const SkillReadyStatus =
{
	Ready: "ready",
	Blocked: "blocked by CD, animation lock or caster tax",
	NotEnoughMP: "not enough MP",
	RequirementsNotMet: "requirements not met",
};

export const ResourceType =
{
	// job resources
	Mana: "Mana", // [0, 10000]
	Polyglot: "Polyglot", // [0, 2]
	AstralFire: "AstralFire", // [0, 3]
	UmbralIce: "UmbralIce", // [0, 3]
	UmbralHeart: "UmbralHeart", // [0, 3]
	Enochian: "Enochian", // [0, 1]
	Paradox: "Paradox", // [0, 1]

	// buffs & states
	LeyLines: "Ley Lines", // [0, 1]
	Sharpcast: "Sharpcast", // [0, 1]
	Triplecast: "Triplecast", // [0, 3]
	Firestarter: "Firestarter", // [0, 1]
	Thundercloud: "Thundercloud", // [0, 1]
	ThunderDoTTick: "ThunderDoTTick", // [0, 1]
	ThunderDoT: "ThunderDoT", // [0, 1] is actually used for display timing only
	Manaward: "Manaward", // [0, 1]
	Addle: "Addle", // [0, 1]
	Swiftcast: "Swiftcast", // [0, 1]
	LucidDreaming: "Lucid Dreaming", // [0, 1]
	Surecast: "Surecast", // [0, 1]
	Tincture: "Tincture", // [0, 1]

	// special
	Movement: "Movement", // [0, 1]
	NotAnimationLocked: "NotAnimationLocked", // [0, 1]
	NotCasterTaxed: "NotCasterTaxed", // [0, 1]

	// oGCDs
	cd_GCD: "cd_GCD", // [0, Constant.gcd]
	cd_Transpose: "cd_Transpose", // [0, 1x]
	cd_Sharpcast: "cd_Sharpcast", // [0, 2x] // TODO: figure out how this works
	cd_LeyLines: "cd_LeyLines", // [0, 1x]
	cd_Manaward: "cd_Manaward", // [0, 1x]
	cd_BetweenTheLines: "cd_BetweenTheLines", // [0, 1x]
	cd_AetherialManipulation: "cd_AetherialManipulation", // [0, 1x]
	cd_Triplecast: "cd_Triplecast", // [0, 2x]
	cd_Manafont: "cd_Manafont", // [0, 1x]
	cd_Amplifier: "cd_Amplifier", // [0, 1x]
	cd_Addle: "cd_Addle",
	cd_Swiftcast: "cd_Swiftcast",
	cd_LucidDreaming: "cd_LucidDreaming",
	cd_Surecast: "cd_Surecast",
	cd_Tincture: "cd_Tincture"
};
