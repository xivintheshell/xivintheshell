import { SkillName, ResourceType, Aspect } from './Common'
import { controller } from "../Controller/Controller";
import { LogCategory, Color } from "../Controller/Common";

class SkillInfo
{
	constructor(skillName, cdName, aspect, isSpell, baseCastTime, baseManaCost, basePotency, damageApplicationDelay)
	{
		this.name = skillName;
		this.cdName = cdName;
		this.aspect = aspect;
		this.isSpell = isSpell;
		this.baseCastTime = baseCastTime;
		this.baseManaCost = baseManaCost;
		this.basePotency = basePotency;
		this.damageApplicationDelay = damageApplicationDelay;
	}
}

export const skillInfos = [
	new SkillInfo(SkillName.Blizzard, ResourceType.cd_GCD, Aspect.Ice, true, 2.5, 400, 180, 0.1),
	new SkillInfo(SkillName.Fire, ResourceType.cd_GCD, Aspect.Fire, true, 2.5, 800, 180, 0.1),
	new SkillInfo(SkillName.Transpose, ResourceType.cd_Transpose, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.Thunder3, ResourceType.cd_GCD, Aspect.Lightning, true, 2.5, 400, 50, 0.1),
	new SkillInfo(SkillName.Manaward, ResourceType.cd_Manaward, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.Manafont, ResourceType.cd_Manafont, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.Fire3, ResourceType.cd_GCD, Aspect.Fire, true, 3.5, 2000, 260, 0.1),
	new SkillInfo(SkillName.Blizzard3, ResourceType.cd_GCD, Aspect.Ice, true, 3.5, 800, 260, 0.1),
	new SkillInfo(SkillName.Freeze, ResourceType.cd_GCD, Aspect.Ice, true, 2.8, 1000, 120, 0.1),
	new SkillInfo(SkillName.Flare, ResourceType.cd_GCD, Aspect.Fire, true, 4, 0, 280, 0.1), // mana is handled separately
	new SkillInfo(SkillName.Sharpcast, ResourceType.cd_Sharpcast, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.Blizzard4, ResourceType.cd_GCD, Aspect.Ice, true, 2.5, 800, 300, 0.1),
	new SkillInfo(SkillName.Fire4, ResourceType.cd_GCD, Aspect.Fire, true, 2.8, 800, 300, 0.1),
	new SkillInfo(SkillName.BetweenTheLines, ResourceType.cd_BetweenTheLines, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.AetherialManipulation, ResourceType.cd_AetherialManipulation, Aspect.Other, false, 0, 0, 0, 0.1),
	new SkillInfo(SkillName.Thunder4, ResourceType.cd_GCD, Aspect.Lightning, true, 2.5, 400, 50, 0.1),
	new SkillInfo(SkillName.Triplecast, ResourceType.cd_Triplecast, Aspect.Other, false, 0, 0, 0, 0.1),

	new SkillInfo(SkillName.LeyLines, ResourceType.cd_LeyLines, Aspect.Other, false, 0, 0, 0, 0.1),
];

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
	constructor(name, instances)
	{
		this.name = name;
		this.instances = instances;
		this.info = null;
	}
}

class SkillsList extends Map
{
    constructor(game)
    {
        super();
        this.game = game;
    }
	setSkillInfos(infos)
	{
		infos.forEach(info=>{
			let s = this.get(info.name);
			s.info = info;
		});
	}
}

export function makeSkillsList(game)
{
	const skillsList = new SkillsList(game);

	// Blizzard
    skillsList.set(SkillName.Blizzard, new Skill(SkillName.Blizzard,
		[
			new SkillInstance("no AF",
				()=>{
					return game.getFireStacks() === 0 &&
					game.getMP() >= game.captureManaCost(Aspect.Ice, 400);
				},
				()=>{
					game.castSpell(SkillName.Blizzard, cap=>{
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.startOrRefreshEnochian();
					}, app=>{});
				}
			),
			new SkillInstance("in AF",
				()=>{
					return game.getFireStacks() > 0;
				},
				()=>{
					game.castSpell(SkillName.Blizzard, cap=>{
						game.loseEnochian();
					}, app=>{});
				},
			),
    	]
	));

	// Fire
	skillsList.set(SkillName.Fire, new Skill(SkillName.Fire,
		[
			new SkillInstance("no UI",
				()=>{
					return game.getIceStacks() === 0;
				},
				()=>{
					game.castSpell(SkillName.Fire, cap=>{
						game.resources.get(ResourceType.AstralFire).gain(1);
						game.startOrRefreshEnochian();
						// umbral heart
						let uh = game.resources.get(ResourceType.UmbralHeart);
						if (cap.capturedManaCost > 0 && uh.available(1)) {
							uh.consume(1);
							controller.log(LogCategory.Event, "consume a UH stack, remaining: " + uh.currentValue, game.time, Color.Ice);
						}
					}, app=>{});
				}
			),
			new SkillInstance("in UI",
				()=>{
					return game.getIceStacks() > 0;
				},
				()=>{
					game.castSpell(SkillName.Fire, cap=>{
						game.loseEnochian();
					}, app=>{});
				}
			),
		]
	));

	// Transpose
	skillsList.set(SkillName.Transpose, new Skill(SkillName.Transpose,
		[
			new SkillInstance("any",
				()=>{
					return game.getFireStacks() > 0 || game.getIceStacks() > 0; // has UI or AF
				},
				()=>{
					game.useInstantSkill(SkillName.Transpose, ()=>{
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
					});
				}
			),
		]
	));

	// Ley Lines
	skillsList.set(SkillName.LeyLines, new Skill(SkillName.LeyLines,
		[
			new SkillInstance("any",
				()=>{
					return true;
				},
				()=>{
					game.useInstantSkill(SkillName.LeyLines, ()=>{
						game.resources.get(ResourceType.LeyLines).gain(1);
						game.resources.addResourceEvent(
							ResourceType.LeyLines, "drop LL", 30, rsc=>{ rsc.consume(1); })
					});
				}
			),
		]
	));

	let gainThundercloudProc = function(game)
	{
		let thundercloud = game.resources.get(ResourceType.Thundercloud);
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

	// called at the time of APPLICATION (not snapshot)
	let applyThunderDoT = function(game, capturedTickPotency, numTicks)
	{
		// define stuff
		let recurringThunderTick = (remainingTicks, capturedTickPotency)=>
		{
			if (remainingTicks===0) return;
			game.resources.addResourceEvent(
				ResourceType.ThunderDoT,
				"recurring thunder tick " + (numTicks+1-remainingTicks) + "/" + numTicks, 3, rsc=>{
					game.dealDamage(capturedTickPotency);
					recurringThunderTick(remainingTicks - 1, capturedTickPotency);
					if (Math.random() < 0.1) // thundercloud proc
					{
						gainThundercloudProc(game);
					}
				}, Color.Thunder);
		};
		let rsc = game.resources.get(ResourceType.ThunderDoT);
		if (rsc.pendingChange !== null) {
			// if already has thunder applied; cancel the remaining ticks now.
			rsc.removeTimer();
		}
		// order of events:
		recurringThunderTick(numTicks, capturedTickPotency);
	};

	// Thunder 3
	skillsList.set(SkillName.Thunder3, new Skill(SkillName.Thunder3,
		[
			new SkillInstance("made instant via thundercloud",
				()=>{
					return game.resources.get(ResourceType.Thundercloud).available(1); // thundercloud
				},
				()=>{
					let capturedInitialPotency = game.captureDamage(Aspect.Other, 400);
					let capturedTickPotency = game.captureDamage(Aspect.Other, 35);
					game.useInstantSkill(SkillName.Thunder3, ()=>{
						game.dealDamage(capturedInitialPotency);
						applyThunderDoT(game, capturedTickPotency, 10);
					});
					let thundercloud = game.resources.get(ResourceType.Thundercloud);
					thundercloud.consume(1);
					thundercloud.removeTimer();
					// if there's a sharpcast stack, consume it and gain (a potentially new) proc
					let sc = game.resources.get(ResourceType.Sharpcast);
					if (sc.available(1)) {
						gainThundercloudProc(game);
						sc.consume(1);
						sc.removeTimer();
					}
				}
			),
			new SkillInstance("regular cast",
				()=>{ return true; },
				()=>{
					let capturedTickPotency;
					game.castSpell(SkillName.Thunder3, cap=>{
						capturedTickPotency = game.captureDamage(Aspect.Lightning, 35);
						// if there's a sharpcast stack, consume it and gain (a potentially new) proc
						let sc = game.resources.get(ResourceType.Sharpcast);
						if (sc.available(1)) {
							gainThundercloudProc(game);
							sc.consume(1);
							sc.removeTimer();
						}
					}, app=>{
						applyThunderDoT(game, capturedTickPotency, 10);
					});
				}
			),
		]
	));

	// Thunder 4
	skillsList.set(SkillName.Thunder4, new Skill(SkillName.Thunder4,
		[
			new SkillInstance("made instant via thundercloud",
				()=>{
					return game.resources.get(ResourceType.Thundercloud).available(1); // thundercloud
				},
				()=>{
					let capturedInitialPotency = game.captureDamage(Aspect.Other, 170);
					let capturedTickPotency = game.captureDamage(Aspect.Other, 20);
					game.useInstantSkill(SkillName.Thunder4, ()=>{
						game.dealDamage(capturedInitialPotency);
						applyThunderDoT(game, capturedTickPotency, 6);
					});
					let thundercloud = game.resources.get(ResourceType.Thundercloud);
					thundercloud.consume(1);
					thundercloud.removeTimer();
					// if there's a sharpcast stack, consume it and gain (a potentially new) proc
					let sc = game.resources.get(ResourceType.Sharpcast);
					if (sc.available(1)) {
						gainThundercloudProc(game);
						sc.consume(1);
						sc.removeTimer();
					}
				}
			),
			new SkillInstance("regular cast",
				()=>{ return true; },
				()=>{
					let capturedTickPotency;
					game.castSpell(SkillName.Thunder4, cap=>{
						capturedTickPotency = game.captureDamage(Aspect.Lightning, 20);
						// if there's a sharpcast stack, consume it and gain (a potentially new) proc
						let sc = game.resources.get(ResourceType.Sharpcast);
						if (sc.available(1)) {
							gainThundercloudProc(game);
							sc.consume(1);
							sc.removeTimer();
						}
					}, app=>{
						applyThunderDoT(game, capturedTickPotency, 6);
					});
				}
			),
		]
	));

	// Manaward
	skillsList.set(SkillName.Manaward, new Skill(SkillName.Manaward,
		[
			new SkillInstance(
				"any",
				()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.Manaward, ()=>{
						game.resources.get(ResourceType.Manaward).gain(1);
						game.resources.addResourceEvent(
							ResourceType.Manaward, "drop Manaward", 20, rsc=>{ rsc.consume(1); })
					});
				}
			),
		]
	));

	// Manafont
	skillsList.set(SkillName.Manafont, new Skill(SkillName.Manafont,
		[
			new SkillInstance(
				"any",
				()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.Manafont, ()=>{
						game.resources.get(ResourceType.Mana).gain(3000);
						controller.log(LogCategory.Event, "manafont effect: mana +3000", game.time);
					}, false);
				}
			),
		]
	));

	// Fire 3
	skillsList.set(SkillName.Fire3, new Skill(SkillName.Fire3,
		[
			new SkillInstance("any",
				()=>{ return true; },
				()=>{
					game.castSpell(SkillName.Fire3, cap=>{
						game.resources.get(ResourceType.UmbralIce).consume(game.resources.get(ResourceType.UmbralIce).currentValue);
						game.resources.get(ResourceType.AstralFire).gain(3);
						game.startOrRefreshEnochian();
						// umbral heart
						let uh = game.resources.get(ResourceType.UmbralHeart);
						if (cap.capturedManaCost > 0 && uh.available(1)) {
							uh.consume(1);
							controller.log(LogCategory.Event, "consume a UH stack, remaining: " + uh.currentValue, game.time, Color.Ice);
						}
					}, app=>{});
				}
			),
		]
	));

	// Blizzard 3
	skillsList.set(SkillName.Blizzard3, new Skill(SkillName.Blizzard3,
		[
			new SkillInstance("any",
				()=>{ return true; },
				()=>{
					game.castSpell(SkillName.Blizzard3, cap=>{
						game.resources.get(ResourceType.AstralFire).consume(game.resources.get(ResourceType.AstralFire).currentValue);
						game.resources.get(ResourceType.UmbralIce).gain(3);
						game.startOrRefreshEnochian();
					}, app=>{});
				}
			),
		]
	));

	// Freeze
	skillsList.set(SkillName.Freeze, new Skill(SkillName.Freeze,
		[
			new SkillInstance("any",
				()=>{
					return game.getIceStacks() > 0; // in UI
				},
				()=>{
					game.castSpell(SkillName.Freeze, cap=>{
						game.resources.get(ResourceType.UmbralHeart).gain(3);
					}, app=>{});
				}
			),
		]
	));

	// Flare
	skillsList.set(SkillName.Flare, new Skill(SkillName.Flare,
		[
			new SkillInstance("any",
				()=>{
					return game.getFireStacks() > 0 && // in AF
						game.getMP() >= 800;
				},
				()=>{
					game.castSpell(SkillName.Flare, cap=>{
						let uh = game.resources.get(ResourceType.UmbralHeart);
						let mana = game.resources.get(ResourceType.Mana);
						let manaCost = uh.available(1) ? mana.currentValue * 2 / 3 : mana.currentValue;
						// mana
						game.resources.get(ResourceType.Mana).consume(manaCost);
						uh.consume(uh.currentValue);
						// +3 AF; refresh enochian
						game.resources.get(ResourceType.AstralFire).gain(3);
						game.startOrRefreshEnochian();
					}, app=>{});
				}
			),
		]
	));

	// Sharpcast
	skillsList.set(SkillName.Sharpcast, new Skill(SkillName.Sharpcast,
		[
			new SkillInstance("any", ()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.Sharpcast, ()=>{
						let sc = game.resources.get(ResourceType.Sharpcast);
						if (sc.available(1)) sc.overrideTimer(30);
						else { // fresh gain
							sc.gain(1);
							game.resources.addResourceEvent(
								ResourceType.Sharpcast,
								"drop sharpcast",
								30,
								rsc=>{
									sc.consume(1);
								}, Color.Text);
						}
					});
				}
			),
		]
	));

	// Blizzard 4
	skillsList.set(SkillName.Blizzard4, new Skill(SkillName.Blizzard4,
		[
			new SkillInstance("any",
				()=>{
					return game.getIceStacks() > 0; // in UI
				},
				()=>{
					game.castSpell(SkillName.Blizzard4, cap=>{
						game.resources.get(ResourceType.UmbralHeart).gain(3);
					}, app=>{});
				}
			),
		]
	));

	// Fire 4
	skillsList.set(SkillName.Fire4, new Skill(SkillName.Fire4,
		[
			new SkillInstance("any",
				()=>{
					return game.getFireStacks() > 0; // in AF
				},
				()=>{
					game.castSpell(SkillName.Fire4, cap=>{}, app=>{});
				}
			),
		]
	));

	// Between the Lines
	skillsList.set(SkillName.BetweenTheLines, new Skill(SkillName.BetweenTheLines,
		[
			new SkillInstance("any", ()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.BetweenTheLines, ()=>{});
				}
			),
		]
	));

	// Aetherial Manipulation
	skillsList.set(SkillName.AetherialManipulation, new Skill(SkillName.AetherialManipulation,
		[
			new SkillInstance("any", ()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.AetherialManipulation, ()=>{});
				}
			),
		]
	));

	// Triplecast
	skillsList.set(SkillName.Triplecast, new Skill(SkillName.Triplecast,
		[
			new SkillInstance("any", ()=>{ return true; },
				()=>{
					game.useInstantSkill(SkillName.Triplecast, ()=>{
						let triple = game.resources.get(ResourceType.Triplecast);
						if (triple.pendingChange!==null) triple.removeTimer(); // should never need this, but just in case
						triple.gain(3);
						game.resources.addResourceEvent(
							ResourceType.Triplecast,
							"drop remaining Triple charges", 15, rsc=>{
								rsc.consume(rsc.currentValue);
							});
					});
				}
			),
		]
	));

	return skillsList;
}