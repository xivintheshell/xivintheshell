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
}

class Skill
{
	// instances : SkillInstance[]
	constructor(name, timeTillAvailableFn, isSpell, instances)
	{
		this.name = name;
		this.isSpell = isSpell;
        this.timeTillAvailable = timeTillAvailableFn;
		this.instances = instances;
	}
}

class SkillsList extends Map
{
    constructor(game)
    {
        super();
        this.game = game;
    }
}

export function makeSkillsList(game)
{
	const skillsList = new SkillsList(game);

	// Blizzard
	// TODO: do something to scale cast & recast time due to LL
    skillsList.set(SkillName.Blizzard, new Skill(
        SkillName.Blizzard,
		()=>{ return game.timeTillNextStackAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance(
				"no AF",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
					game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
					game.getFireStacks() === 0 &&
					game.getMP() >= game.captureManaCost(Aspect.Ice, 400);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Ice, game.config.gcd);
					game.castSpell(Aspect.Ice, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 180, game.captureManaCost(Aspect.Ice, 400));
					game.addEvent(new Event("gain enochian", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.startOrRefreshEnochian();
					 }));
				}
			),
			new SkillInstance(
				 "in AF",
				 ()=>{
					 return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						 game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						 game.getFireStacks() > 0
				 },
				 ()=>{
					 let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Ice, game.config.gcd);
					 game.castSpell(Aspect.Ice, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 180, 0);
					 game.addEvent(new Event("lose enochian", castTime - 0.06, ()=>{
						 game.loseEnochian();
					 }));
				 }
			),
    	]
	));

	// Ley Lines
	skillsList.set(SkillName.LeyLines, new Skill(
		SkillName.LeyLines,
		()=>{ return game.timeTillNextStackAvailable(ResourceType.cd_LeyLines); },
		false,
		[
			new SkillInstance(
				"LL",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_LeyLines) >= 1 && // CD ready
					game.resources.get(ResourceType.NotAnimationLocked).available(1); // not animation locked
				},
				()=>{
					game.useAbility(ResourceType.cd_LeyLines, 0.1, ()=>{
						game.resources.get(ResourceType.LeyLines).gain(1);
						game.resources.addResourceEvent(
							ResourceType.LeyLines, "drop LL", 30, rsc=>{ rsc.consume(1); })
					})
				}
			),
		]
	));

	skillsList.set(SkillName.Template, new Skill(
		SkillName.Template,
		()=>{ return 0 },
		false,
		[
			new SkillInstance(
				"(template skill instance)",
				()=>{
					return true;
				},
				()=>{

				}
			),
		]
	));

    return skillsList;
}
