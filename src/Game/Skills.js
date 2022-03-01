import { Constants, SkillName, ResourceType } from './Common'
import { Event } from './Resources';

class SkillInstance
{
	// available : () -> bool
	// effectFn : () -> ()
	constructor(description, requirementFn, effectFn)
	{
        this.description = description;
		this.available = requirementFn;
		this.use = effectFn;
	}
};

class Skill
{
	// instances : SkilInstance[]
	constructor(name, timeTillAvailableFn, instances)
	{
		this.name = name;
        this.timeTillAvailable = timeTillAvailableFn;
		this.instances = instances;
	}
};

class SkillsList extends Map
{
    constructor(game)
    {
        super();
        this.game = game;
    }
};

export function makeSkillsList(game)
{
    var skillsList = new SkillsList(game);

    // Blizzard
    skillsList.set(SkillName.Blizzard, new Skill(
        SkillName.Blizzard,
        game.timeTillNextGCDAvailable, [
        new SkillInstance(
            "not in AF or UI",
            ()=>{
                return game.resources.get(ResourceType.GCDReady).available(1) &&
                game.getFireStacks() === 0 &&
                game.getIceStacks() === 0 &&
                game.getMP() >= 400;
            },
            ()=>{
                game.castGCDSpell(Constants.gcd, 0.1, 180, 400);
				game.addEvent(new Event("gain enochian", Constants.gcd - Constants.casterTax, ()=>{
                	game.resources.get(ResourceType.UmbralIce).gain(1);
					game.startOrRefreshEnochian();
				}));
            }
        ),
		new SkillInstance(
			"in UI 1",
			()=>{
                return game.resources.get(ResourceType.GCDReady).available(1) &&
				game.getIceStacks() === 1 &&
				game.getMP() >= 300;
			},
			()=>{
                game.castGCDSpell(Constants.gcd, 0.1, 180, 300);
				game.addEvent(new Event("gain enochian", Constants.gcd - Constants.casterTax, ()=>{
                	game.resources.get(ResourceType.UmbralIce).gain(1);
					game.startOrRefreshEnochian();
				}));
			}
		),
		new SkillInstance(
			"in UI 2",
			()=>{
                return game.resources.get(ResourceType.GCDReady).available(1) &&
				game.getIceStacks() === 2 &&
				game.getMP() >= 200;
			},
			()=>{
                game.castGCDSpell(Constants.gcd, 0.1, 180, 200);
				game.addEvent(new Event("gain enochian", Constants.gcd - Constants.casterTax, ()=>{
                	game.resources.get(ResourceType.UmbralIce).gain(1);
					game.startOrRefreshEnochian();
				}));
			}
		),
		new SkillInstance(
			"in UI 3",
			()=>{
                return game.resources.get(ResourceType.GCDReady).available(1) &&
				game.getIceStacks() === 3
			},
			()=>{
                game.castGCDSpell(Constants.gcd, 0.1, 180, 0);
				game.addEvent(new Event("gain enochian", Constants.gcd - Constants.casterTax, ()=>{
                	game.resources.get(ResourceType.UmbralIce).gain(1);
					game.startOrRefreshEnochian();
				}));
			}
		),
    ]));

    return skillsList;
}

/*
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
*/