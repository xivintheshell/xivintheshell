export const Constants =
{
    casterTax: 0.06,
    animationLock: 0.3,
    gcd: 2.5,

	//====
	epsilon: 0.00001,
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
	Enochian: "Enochian", // [0, 1]
	Paradox: "Paradox", // [0, 1]
	Firestarter: "Firestarter", // [0, 1]
	Thundercloud: "Thundercloud", // [0, 1]

	Movement: "Movement", // [0, 1]
	NotCasting: "NotCasting", // [0, 1] (movement time as a resource)
	NotAnimationLocked: "NotAnimationLocked", // [0, 1]
	GCDReady: "GCDReady", // shared by GCDs
	// oGCDs
	s_Sharpcast: "s_Sharpcast", // [0, 2] // TODO: figure out how this works
	s_LeyLines: "s_LeyLines", // [0, 1]
	s_TripleCast: "s_TripleCast", // [0, 2]
	s_Manafont: "s_Manafont", // [0, 1]
	s_Amplifier: "s_Amplifier" // [0, 1]
};