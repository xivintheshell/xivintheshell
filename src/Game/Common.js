export const Constants =
{
    casterTax: 0.06,
    animationLock: 0.3,
    gcd: 2.5,

	//==== DEBUG ====
	epsilon: 0.00001,
	disableManaAndThunderTicks: 1,
};

export const Aspect = 
{
	Fire: "Fire",
	Ice: "Ice",
	Other: "Other"
};

export const SkillName = 
{
    Blizzard: "Blizzard",
    Fire: "Fire",
	Fire3: "Fire3",
	Transpose: "Transpose"
};

export const ResourceType =
{
	// hard resources
	Mana: "Mana", // [0, 10000]
	Polyglot: "Polyglot", // [0, 2]
	AstralFire: "AstralFire", // [0, 3]
	UmbralIce: "UmbralIce", // [0, 3]
	UmbralHeart: "UmbralHeart", // [0, 3]

	// binaries (buffs & states)
	LeyLines: "LeyLines", // [0, 1]
	Enochian: "Enochian", // [0, 1]
	Paradox: "Paradox", // [0, 1]
	Firestarter: "Firestarter", // [0, 1]
	Thundercloud: "Thundercloud", // [0, 1]

	Movement: "Movement", // [0, 1]
	NotCasting: "NotCasting", // [0, 1] (movement time as a resource)
	NotAnimationLocked: "NotAnimationLocked", // [0, 1]
	GCDReady: "GCDReady", // shared by GCDs
	// oGCDs
	cd_GCD: "cd_GCD", // [0, Constant.gcd]
	cd_Sharpcast: "cd_Sharpcast", // [0, 2x] // TODO: figure out how this works
	cd_LeyLines: "cd_LeyLines", // [0, 1x]
	cd_TripleCast: "cd_TripleCast", // [0, 2x]
	cd_Manafont: "cd_Manafont", // [0, 1x]
	cd_Amplifier: "cd_Amplifier" // [0, 1x]
};