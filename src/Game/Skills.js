const SkillID = 
{
	Fire3: "Fire3",
	Transpose: "Transpose"
};

class SkillInstance
{
	// timeTillAvailableFn : GameState -> float
	// requirementFn : GameState -> bool
	// effectFn : GameState -> ()
	constructor(timeTillAvailableFn, requirementFn, effectFn)
	{
		this.timeTillAvailableFn = timeTillAvailableFn;
		this.requirementFn = requirementFn;
		this.effectFn = effectFn;
	}
};

class Skill
{
	// instances : SkilInstance[]
	constructor(name, instances)
	{
		this.name = name;
		this.instances = instances;
	}
};

var skills = new Map();
skills.set(SkillID.Fire3, new Skill(SkillID.Fire3,
	[
		// case 1: has umbral ice
		new SkillInstance(
			g=>{ // time till available
				return Math.max(g.timeTillNextSkillAvailable(), gcd - g.resources.get(ResourceType.GCD).currentValue);
			},
			g=>{ // requirement: has umbral ice
				return g.resources.get(ResourceType.UmbralIce).currentValue > 0;
			},
			g=>{ // effect
				// TODO
				// queue damage; remove UI, apply AF3, add 1/2 cast time + caster lock, refresh GCD timer
			}
		),
		// case 2: hard-casted F3
		new SkillInstance(
			g=>{
				return Math.max(g.timeTillNextSkillAvailable(), gcd - g.resources.get(ResourceType.GCD).currentValue);
			},
			g=>{
				return g.resources.get(ResourceType.Mana).available(2000);
			},
			g=>{
				// TODO
			}
		),
	]
));
