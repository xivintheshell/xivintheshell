export class GameConfig
{
	constructor()
	{
		this.casterTax = 0.06;
		this.slideCastDuration = 0.4;
		this.animationLock = 0.7;
		this.gcd = 2.5;

		//==== DEBUG ====
		this.epsilon = 0.00001;
		this.disableManaAndThunderTicks = 1;
	}
}

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
	Fire3: "Fire III",
	Transpose: "Transpose",
	LeyLines: "Ley Lines",

	Template: "(template)"
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
	//NotCasting: "NotCasting", // [0, 1]
	NotAnimationLocked: "NotAnimationLocked", // [0, 1]
	// oGCDs
	cd_GCD: "cd_GCD", // [0, Constant.gcd]
	cd_Transpose: "cd_Transpose", // [0, 1x]
	cd_Sharpcast: "cd_Sharpcast", // [0, 2x] // TODO: figure out how this works
	cd_LeyLines: "cd_LeyLines", // [0, 1x]
	cd_TripleCast: "cd_TripleCast", // [0, 2x]
	cd_Manafont: "cd_Manafont", // [0, 1x]
	cd_Amplifier: "cd_Amplifier" // [0, 1x]
};