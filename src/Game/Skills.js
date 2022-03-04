import { SkillName, ResourceType, Aspect } from './Common'
import { Event } from './Resources';
import { controller } from "../Controller/Controller";
import { LogCategory, Color } from "../Controller/Common";

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
    skillsList.set(SkillName.Blizzard, new Skill(
        SkillName.Blizzard,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance("no AF",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
					game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
					game.getFireStacks() === 0 &&
					game.getMP() >= game.captureManaCost(Aspect.Ice, 400);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Ice, game.config.gcd);
					game.castSpell(Aspect.Ice, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 180, game.captureManaCost(Aspect.Ice, 400));
					game.addEvent(new Event("gain UI", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.startOrRefreshEnochian();
					 }, Color.Ice));
				}
			),
			new SkillInstance("in AF",
				 ()=>{
					 return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						 game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						 game.getFireStacks() > 0;
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

	// Fire
	skillsList.set(SkillName.Fire, new Skill(
		SkillName.Fire,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance("no UI",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.getIceStacks() === 0 &&
						game.getMP() >= game.captureManaCost(Aspect.Fire, 800);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Fire, game.config.gcd);
					let capturedManaCost = game.captureManaCost(Aspect.Fire, 800);
					game.castSpell(Aspect.Fire, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 180, capturedManaCost);
					game.addEvent(new Event("gain AF", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.AstralFire).gain(1);
						game.startOrRefreshEnochian();
						// umbral heart
						let uh = game.resources.get(ResourceType.UmbralHeart);
						if (capturedManaCost > 0 && uh.available(1)) {
							uh.consume(1);
							controller.log(LogCategory.Event, "consume a UH stack, remaining: " + uh.currentValue, game.time, Color.Ice);
						}
					}, Color.Fire));
				}
			),
			new SkillInstance("in UI",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.getIceStacks() > 0;
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Fire, game.config.gcd);
					game.castSpell(Aspect.Fire, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 180, 0);
					game.addEvent(new Event("lose enochian", castTime - 0.06, ()=>{
						game.loseEnochian();
					}));
				}
			),
		]
	));

	// Transpose
	skillsList.set(SkillName.Transpose, new Skill(
		SkillName.Transpose,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_Transpose); },
		false,
		[
			new SkillInstance("all",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_Transpose) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						(game.getFireStacks() > 0 || game.getIceStacks() > 0); // has UI or AF
				},
				()=>{
					game.useInstantSkill(ResourceType.cd_Transpose, 0.1, ()=>{
						if (game.getFireStacks()===0 && game.getIceStacks()===0) {
							controller.log(LogCategory.Event, "transpose failed; AF/UI just fell off", game.time, Color.Error);
							return;
						}
						let af = game.resources.get(ResourceType.AstralFire);
						let ui = game.resources.get(ResourceType.UmbralIce);
						if (game.getFireStacks() > 0) {
							af.consume(af.currentValue);
							ui.gain(1);
						} else {
							ui.consume(ui.currentValue);
							af.gain(1);
						}
						game.startOrRefreshEnochian();
					})
				}
			),
		]
	));

	// Ley Lines
	skillsList.set(SkillName.LeyLines, new Skill(
		SkillName.LeyLines,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_LeyLines); },
		false,
		[
			new SkillInstance("LL",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_LeyLines) >= 1 && // CD ready
					game.resources.get(ResourceType.NotAnimationLocked).available(1); // not animation locked
				},
				()=>{
					game.useInstantSkill(ResourceType.cd_LeyLines, 0.1, ()=>{
						game.resources.get(ResourceType.LeyLines).gain(1);
						game.resources.addResourceEvent(
							ResourceType.LeyLines, "drop LL", 30, rsc=>{ rsc.consume(1); })
					});
				}
			),
		]
	));

	// Thunder
	// called at the time of APPLICATION (not snapshot)
	let applyThunderDoT = function(game, capturedInitialPotency, capturedTickPotency)
	{
		// define stuff
		let recurringThunderTick = (remainingTicks, capturedTickPotency)=>
		{
			if (remainingTicks===0) return;
			game.dealDamage(capturedTickPotency);
			game.resources.addResourceEvent(
				ResourceType.ThunderDoT,
				"recurring thunder tick " + (11-remainingTicks) + "/10", 3, thundercloud=>{
					recurringThunderTick(remainingTicks - 1, capturedTickPotency);
					if (Math.random() < 0.1) // thundercloud proc
					{
						if (thundercloud.available(1)) { // already has a proc; reset its timer
							thundercloud.overrideTimer(40);
							controller.log(LogCategory.Event, "Thundercloud proc! overriding an existing one", game.time, Color.Thunder);
						} else { // there's currently no proc. gain one.
							thundercloud.gain(1);
							controller.log(LogCategory.Event, "Thundercloud proc!", game.time, Color.Thunder);
							game.resources.addResourceEvent(ResourceType.Thundercloud, "drop thundercloud proc", 40, rsc=>{
								rsc.consume(1);
							}, Color.Thunder);
						}
					}
				}, Color.Thunder);
		};
		let rsc = game.resources.get(ResourceType.ThunderDoT);
		if (rsc.pendingChange !== null) {
			// if already has thunder applied; cancel the remaining ticks now.
			rsc.removeTimer();
		}
		// order of events:
		game.dealDamage(capturedInitialPotency);
		recurringThunderTick(10, capturedTickPotency);
	};
	skillsList.set(SkillName.Thunder3, new Skill(
		SkillName.Thunder3,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance(
				"made instant via thundercloud",
				()=>{
					// no need to wait for GCD
					return game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.resources.get(ResourceType.Thundercloud).available(1); // thundercloud
				},
				()=>{
					let capturedInitialPotency = game.captureDamage(Aspect.Other, 400);
					let capturedTickPotency = game.captureDamage(Aspect.Other, 35);
					game.useInstantSkill(ResourceType.cd_GCD, 0.1, ()=>{
						applyThunderDoT(game, capturedInitialPotency, capturedTickPotency);
					});
					let thundercloud = game.resources.get(ResourceType.Thundercloud);
					thundercloud.consume(1);
					thundercloud.removeTimer();
				}
			),
			new SkillInstance(
				"regular cast",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.resources.get(ResourceType.Mana).available(game.captureManaCost(Aspect.Other, 400));
				},
				()=>{
					// similar to but not exactly covered by game.castSpell(...)
					let [capturedCastTime, capturedRecastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Fire, game.config.gcd);
					let capturedManaCost = game.captureManaCost(Aspect.Other, 400);
					// lock movement
					game.resources.takeResourceLock(ResourceType.Movement, capturedCastTime - game.config.slideCastDuration);
					game.addEvent(new Event("deduct MP, snapshot damage", capturedCastTime - game.config.slideCastDuration, ()=>{
						game.resources.get(ResourceType.Mana).consume(capturedManaCost); // actually deduct mana
						let capturedInitialPotency = game.captureDamage(Aspect.Other, 50);
						let capturedTickPotency = game.captureDamage(Aspect.Other, 35);
						game.addEvent(new Event(
							"apply DoT and deal initial damage " + capturedInitialPotency.toFixed(1),
							game.config.slideCastDuration + 0.1, ()=>{
								applyThunderDoT(game, capturedInitialPotency, capturedTickPotency);
							}, Color.Thunder));
					}));

					// recast
					game.cooldowns.useStack(ResourceType.cd_GCD);
					game.cooldowns.setRecastTimeScale(ResourceType.cd_GCD, capturedRecastTimeScale);

					// caster tax
					game.resources.takeResourceLock(ResourceType.NotAnimationLocked, capturedCastTime + game.config.casterTax);
				}
			),
		]
	));

	// Manaward
	skillsList.set(SkillName.Manaward, new Skill(
		SkillName.Manaward,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_Manaward); },
		false,
		[
			new SkillInstance(
				"any",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_Manaward) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1); // not animation locked
				},
				()=>{
					game.useInstantSkill(ResourceType.cd_Manaward, 0.1, ()=>{
						game.resources.get(ResourceType.Manaward).gain(1);
						game.resources.addResourceEvent(
							ResourceType.Manaward, "drop Manaward", 20, rsc=>{ rsc.consume(1); })
					});
				}
			),
		]
	));

	// Manafont
	skillsList.set(SkillName.Manafont, new Skill(
		SkillName.Manafont,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_Manafont); },
		false,
		[
			new SkillInstance(
				"any",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_Manafont) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1); // not animation locked
				},
				()=>{
					game.useInstantSkill(ResourceType.cd_Manafont, 0.4, ()=>{
						game.resources.get(ResourceType.Mana).gain(3000);
						controller.log(LogCategory.Event, "manafont effect: mana +3000", game.time);
					}, false);
				}
			),
		]
	));

	// Fire 3
	skillsList.set(SkillName.Fire3, new Skill(
		SkillName.Fire3,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance("any",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.getMP() >= game.captureManaCost(Aspect.Fire, 2000);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Fire, game.config.longCastTime);
					let capturedManaCost = game.captureManaCost(Aspect.Fire, 2000);
					game.castSpell(Aspect.Fire, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 260, capturedManaCost);
					game.addEvent(new Event("lose all UI and gain full AF; refresh enochian", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.UmbralIce).consume(game.resources.get(ResourceType.UmbralIce).currentValue);
						game.resources.get(ResourceType.AstralFire).gain(3);
						game.startOrRefreshEnochian();
						// umbral heart
						let uh = game.resources.get(ResourceType.UmbralHeart);
						if (capturedManaCost > 0 && uh.available(1)) {
							uh.consume(1);
							controller.log(LogCategory.Event, "consume a UH stack, remaining: " + uh.currentValue, game.time, Color.Ice);
						}
					}, Color.Fire));
				}
			),
		]
	));

	// Blizzard 3
	skillsList.set(SkillName.Blizzard3, new Skill(
		SkillName.Blizzard3,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance("any",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.getMP() >= game.captureManaCost(Aspect.Ice, 800);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Ice, game.config.longCastTime);
					let capturedManaCost = game.captureManaCost(Aspect.Ice, 800);
					game.castSpell(Aspect.Ice, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 260, capturedManaCost);
					game.addEvent(new Event("lose all AF and gain full UI; refresh enochian", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.AstralFire).consume(game.resources.get(ResourceType.AstralFire).currentValue);
						game.resources.get(ResourceType.UmbralIce).gain(3);
						game.startOrRefreshEnochian();
					}, Color.Ice));
				}
			),
		]
	));

	// Freeze
	skillsList.set(SkillName.Freeze, new Skill(
		SkillName.Freeze,
		()=>{ return game.timeTillNextUseAvailable(ResourceType.cd_GCD); },
		true,
		[
			new SkillInstance("any",
				()=>{
					return game.cooldowns.stacksAvailable(ResourceType.cd_GCD) >= 1 && // CD ready
						game.resources.get(ResourceType.NotAnimationLocked).available(1) && // not animation locked
						game.getIceStacks() > 0 && // in UI
						game.getMP() >= game.captureManaCost(Aspect.Ice, 1000);
				},
				()=>{
					let [castTime, recastTimeScale] = game.captureSpellCastAndRecastTimeScale(Aspect.Ice, game.config.freezeCastTime);
					let capturedManaCost = game.captureManaCost(Aspect.Ice, 1000);
					game.castSpell(Aspect.Ice, ResourceType.cd_GCD, castTime, recastTimeScale, 0.1, 120, capturedManaCost);
					game.addEvent(new Event("gain full UH stacks via Freeze", castTime - 0.06, ()=>{
						game.resources.get(ResourceType.UmbralHeart).gain(3);
					}, Color.Ice));
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
