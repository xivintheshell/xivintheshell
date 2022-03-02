import { SkillName, ResourceType, Aspect } from './Common'
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
	// instances : SkillInstance[]
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
	// TODO: do something to scale cast & recast time due to LL
    skillsList.set(SkillName.Blizzard, new Skill(
        SkillName.Blizzard,
        game.timeTillNextGCDAvailable, [
        new SkillInstance(
            "no AF",
            ()=>{
                return game.cooldowns.available(ResourceType.cd_GCD, game.config.gcd) &&
                game.getFireStacks() === 0 &&
                game.getMP() >= game.captureManaCost(Aspect.Ice, 400);
            },
            ()=>{
                game.castSpell(Aspect.Ice, ResourceType.cd_GCD, game.config.gcd, 0.1, 180, game.captureManaCost(Aspect.Ice, 400));
				game.addEvent(new Event("gain enochian", game.config.gcd - game.config.casterTax, ()=>{
                	game.resources.get(ResourceType.UmbralIce).gain(1);
					game.startOrRefreshEnochian();
				}));
            }
        ),
		new SkillInstance(
			"in AF",
			()=>{
                return game.cooldowns.available(ResourceType.cd_GCD, game.config.gcd) &&
				game.getFireStacks() > 0
			},
			()=>{
                game.castSpell(Aspect.Ice, ResourceType.cd_GCD, game.config.gcd, 0.1, 180, 0);
				game.addEvent(new Event("lose enochian", game.config.gcd - game.config.casterTax, ()=>{
					game.loseEnochian();
				}));
			}
		),
    ]));

    return skillsList;
}
