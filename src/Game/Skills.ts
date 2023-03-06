import {Aspect, ProcMode, ResourceType, SkillName} from './Common'
// @ts-ignore
import {controller} from "../Controller/Controller";
import {LucidDreamingBuff, Resource} from "./Resources";
import {ActionNode} from "../Controller/Record";
import {GameState} from "./GameState";

export interface SkillCaptureCallbackInfo {
	capturedManaCost: number
}

export interface SkillApplicationCallbackInfo {

}

export class SkillInfo {
	readonly name: SkillName;
	readonly cdName: ResourceType;
	readonly aspect: Aspect;
	readonly isSpell: boolean;
	readonly baseCastTime: number;
	readonly baseManaCost: number;
	readonly basePotency: number;
	readonly skillApplicationDelay: number;

	constructor(
		skillName: SkillName,
		cdName: ResourceType,
		aspect: Aspect,
		isSpell: boolean,
		baseCastTime: number,
		baseManaCost: number,
		basePotency: number,
		skillApplicationDelay?: number)
	{
		this.name = skillName;
		this.cdName = cdName;
		this.aspect = aspect;
		this.isSpell = isSpell;
		this.baseCastTime = baseCastTime;
		this.baseManaCost = baseManaCost;
		this.basePotency = basePotency;
		this.skillApplicationDelay = skillApplicationDelay===undefined ? 0 : skillApplicationDelay;
	}
}

// ref logs
// https://www.fflogs.com/reports/KVgxmW9fC26qhNGt#fight=16&type=summary&view=events&source=6
// https://www.fflogs.com/reports/rK87bvMFN2R3Hqpy#fight=1&type=casts&source=7
const skillInfos = [
	new SkillInfo(SkillName.Blizzard, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 400, 180, 0.846),
	new SkillInfo(SkillName.Fire, ResourceType.cd_GCD, Aspect.Fire, true,
		2.5, 800, 180, 1.871),
	new SkillInfo(SkillName.Transpose, ResourceType.cd_Transpose, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.Thunder3, ResourceType.cd_GCD, Aspect.Lightning, true,
		2.5, 400, 50, 1.025),
	new SkillInfo(SkillName.Manaward, ResourceType.cd_Manaward, Aspect.Other, false,
		0, 0, 0, 1.114),// delayed
	new SkillInfo(SkillName.Manafont, ResourceType.cd_Manafont, Aspect.Other, false,
		0, 0, 0, 0.88),// delayed, test by manafont->desp from 0 mana
	new SkillInfo(SkillName.Fire3, ResourceType.cd_GCD, Aspect.Fire, true,
		3.5, 2000, 260, 1.292),
	new SkillInfo(SkillName.Blizzard3, ResourceType.cd_GCD, Aspect.Ice, true,
		3.5, 800, 260, 0.89),
	new SkillInfo(SkillName.Freeze, ResourceType.cd_GCD, Aspect.Ice, true,
		2.8, 1000, 120, 0.664),
	new SkillInfo(SkillName.Flare, ResourceType.cd_GCD, Aspect.Fire, true,
		4, 0, 280, 1.157), // mana is handled separately

	new SkillInfo(SkillName.LeyLines, ResourceType.cd_LeyLines, Aspect.Other, false,
		0, 0, 0, 0.49),// delayed
	new SkillInfo(SkillName.Sharpcast, ResourceType.cd_Sharpcast, Aspect.Other,false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.Blizzard4, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 800, 310, 1.156),
	new SkillInfo(SkillName.Fire4, ResourceType.cd_GCD, Aspect.Fire, true,
		2.8, 800, 310, 1.159),
	new SkillInfo(SkillName.BetweenTheLines, ResourceType.cd_BetweenTheLines, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.AetherialManipulation, ResourceType.cd_AetherialManipulation, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.Triplecast, ResourceType.cd_Triplecast, Aspect.Other, false,
		0, 0, 0), // instant

	new SkillInfo(SkillName.Foul, ResourceType.cd_GCD, Aspect.Other, true,
		0, 0, 600, 1.158),
	new SkillInfo(SkillName.Despair, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 0, 340, 0.556),
	new SkillInfo(SkillName.UmbralSoul, ResourceType.cd_GCD, Aspect.Ice, true,
		0, 0, 0),// ? (assumed to be instant)
	new SkillInfo(SkillName.Xenoglossy, ResourceType.cd_GCD, Aspect.Other, true,
		0, 0, 800, 0.63),

	new SkillInfo(SkillName.HighFire2, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 1500, 140, 1.154),
	new SkillInfo(SkillName.HighBlizzard2, ResourceType.cd_GCD, Aspect.Ice, true,
		3, 800, 140, 1.158),
	new SkillInfo(SkillName.Amplifier, ResourceType.cd_Amplifier, Aspect.Other, false,
		0, 0, 0), // ? (assumed to be instant)
	new SkillInfo(SkillName.Paradox, ResourceType.cd_GCD, Aspect.Other, true,
		2.5, 1600, 500, 0.624),

	new SkillInfo(SkillName.Addle, ResourceType.cd_Addle, Aspect.Other, false,
		0, 0, 0, 0.621),// delayed
	new SkillInfo(SkillName.Swiftcast, ResourceType.cd_Swiftcast, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.LucidDreaming, ResourceType.cd_LucidDreaming, Aspect.Other, false,
		0, 0, 0, 0.623), // delayed
	new SkillInfo(SkillName.Surecast, ResourceType.cd_Surecast, Aspect.Other, false,
		0, 0, 0), // surprisingly instant because arms length is not
	new SkillInfo(SkillName.Tincture, ResourceType.cd_Tincture, Aspect.Other, false,
		0, 0, 0, 0.891),// delayed
	new SkillInfo(SkillName.Sprint, ResourceType.cd_Sprint, Aspect.Other, false,
		0, 0, 0, 0.133)// delayed
];

const skillInfosMap: Map<SkillName, SkillInfo> = new Map();
skillInfos.forEach(info=>{
	skillInfosMap.set(info.name, info);
});

export class Skill {
	readonly name: SkillName;
	readonly available: () => boolean;
	readonly use: (game: GameState, node: ActionNode) => void;
	info: SkillInfo;

	constructor(name: SkillName, requirementFn: ()=>boolean, effectFn: (game: GameState, node: ActionNode)=>void) {
		this.name = name;
		this.available = requirementFn;
		this.use = effectFn;
		let info = skillInfosMap.get(name);
		if (!info) {
			info = skillInfos[0];
			console.error("Skill info not found!");
		}
		this.info = info;
	}
}

export class SkillsList extends Map<SkillName, Skill> {
	constructor(game: GameState) {
		super();

		let skillsList = this;

		let addResourceAbility = function(props: {
			skillName: SkillName,
			rscType: ResourceType,
			instant: boolean,
			duration: number
		}) {
			let takeEffect = (node: ActionNode) => {
				let resource = game.resources.get(props.rscType);
				if (resource.available(1)) {
					resource.overrideTimer(game, props.duration);
				} else {
					resource.gain(1);
					game.resources.addResourceEvent(
						props.rscType,
						"drop " + props.rscType, props.duration, (rsc: Resource) => {
							rsc.consume(1);
						});
				}
				node.resolve();
			};
			skillsList.set(props.skillName, new Skill(props.skillName,
				() => {
					return true;
				},
				(game, node) => {
					game.useInstantSkill({
						skillName: props.skillName,
						onCapture: props.instant ? ()=>takeEffect(node) : undefined,
						onApplication: props.instant ? undefined : ()=>takeEffect(node),
						dealDamage: false,
						node: node
					});
				}
			));
		}

		// Blizzard
		skillsList.set(SkillName.Blizzard, new Skill(SkillName.Blizzard,
			() => {
				return true;
			},
			(game: GameState, node: ActionNode) => {
				if (game.getFireStacks() === 0) // no AF
				{
					game.castSpell(SkillName.Blizzard, (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.startOrRefreshEnochian();
					}, (app: SkillApplicationCallbackInfo) => {
					}, node);
				} else // in AF
				{
					game.castSpell(SkillName.Blizzard, (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
					}, (app: SkillApplicationCallbackInfo) => {
					}, node);
				}
			}
		));

		let gainFirestarterProc = function(game: GameState) {
			let fs = game.resources.get(ResourceType.Firestarter);
			let duration = game.config.extendedBuffTimes ? 31 : 30;
			if (fs.available(1)) {
				fs.overrideTimer(game, duration);
			} else {
				fs.gain(1);
				game.resources.addResourceEvent(
					ResourceType.Firestarter,
					"drop firestarter proc", duration, (rsc: Resource)=>{
						rsc.consume(1);
					});
			}
		}

		let potentiallyGainFirestarter = function(game: GameState) {
			// firestarter
			let sc = game.resources.get(ResourceType.Sharpcast);
			if (sc.available(1)) {
				gainFirestarterProc(game);
				sc.consume(1);
				sc.removeTimer();
			} else {
				let rand = game.rng(); // firestarter proc
				if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) gainFirestarterProc(game);
			}
		}

		// Fire
		skillsList.set(SkillName.Fire, new Skill(SkillName.Fire,
			() => {
				return true;
			},
			(game, node) => {
				if (game.getIceStacks() === 0) { // in fire or no enochian
					game.castSpell(SkillName.Fire, (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.AstralFire).gain(1);
						game.startOrRefreshEnochian();
						potentiallyGainFirestarter(game);
					}, (app: SkillApplicationCallbackInfo) => {
					}, node);
				} else {
					game.castSpell(SkillName.Fire, (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
						potentiallyGainFirestarter(game);
					}, (app: SkillApplicationCallbackInfo) => {
					}, node);
				}
			}
		));

		// Transpose
		skillsList.set(SkillName.Transpose, new Skill(SkillName.Transpose,
			() => {
				return game.getFireStacks() > 0 || game.getIceStacks() > 0; // has UI or AF
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Transpose,
					onCapture: () => {
						if (game.getFireStacks() === 0 && game.getIceStacks() === 0) {
							return;
						}
						if (game.getFireStacks() > 0) {
							game.switchToAForUI(ResourceType.UmbralIce, 1);
						} else {
							game.switchToAForUI(ResourceType.AstralFire, 1);
						}
						game.startOrRefreshEnochian();
					},
					dealDamage: false,
					node: node
				});
				node.resolve();
			}
		));

		// Ley Lines
		addResourceAbility({
			skillName: SkillName.LeyLines,
			rscType: ResourceType.LeyLines,
			instant: false,
			duration: 30});

		let gainThundercloudProc = function (game: GameState) {
			let thundercloud = game.resources.get(ResourceType.Thundercloud);
			let duration = game.config.extendedBuffTimes ? 41 : 40;
			if (thundercloud.available(1)) { // already has a proc; reset its timer
				thundercloud.overrideTimer(game, duration);
			} else { // there's currently no proc. gain one.
				thundercloud.gain(1);
				game.resources.addResourceEvent(
					ResourceType.Thundercloud,
					"drop thundercloud proc", duration, (rsc: Resource) => {
						rsc.consume(1);
					});
			}
		}

		// called at the time of APPLICATION (not snapshot)
		let applyThunderDoT = function(game: GameState, node: ActionNode, capturedTickPotency: number, numTicks: number) {
			// define stuff
			let recurringThunderTick = (remainingTicks: number, capturedTickPotency: number)=> {
				if (remainingTicks===0) return;
				game.resources.addResourceEvent(
					ResourceType.ThunderDoTTick,
					"recurring thunder tick " + (numTicks+1-remainingTicks) + "/" + numTicks, 3, (rsc: Resource) =>{
						let damageSource = "DoT " + (numTicks+1-remainingTicks) + "/" + numTicks;
						game.reportPotency(node, capturedTickPotency, damageSource);
						game.dealDamage(node, capturedTickPotency, damageSource);
						if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && game.rng() < 0.1)) {// thundercloud proc
							gainThundercloudProc(game);
						}
						recurringThunderTick(remainingTicks - 1, capturedTickPotency);
					});
			};
			let dot = game.resources.get(ResourceType.ThunderDoT);
			let tick = game.resources.get(ResourceType.ThunderDoTTick);
			// if already has thunder applied; cancel the remaining ticks now.
			dot.removeTimer();
			tick.removeTimer();
			// order of events: gain buff, add "remove" event,
			dot.gain(1);
			game.resources.addResourceEvent(ResourceType.ThunderDoT, "drop DoT", 30, (dot: Resource)=>{
				dot.consume(1);
			});
			// what this function does: wait for 3s and do a tick
			recurringThunderTick(numTicks, capturedTickPotency);
		};

		// Thunder 3
		skillsList.set(SkillName.Thunder3, new Skill(SkillName.Thunder3,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Thundercloud).available(1)) // made instant via thundercloud
				{
					let skillTime = game.getDisplayTime();
					let capturedInitialPotency = game.captureDamage(Aspect.Other, 400);
					let capturedTickPotency = game.captureDamage(Aspect.Other, game.config.adjustedDoTPotency(35));
					// tincture
					if (game.resources.get(ResourceType.Tincture).available(1)) {
						node.addBuff(ResourceType.Tincture);
					}
					let sourceName = "Thunder 3@"+skillTime.toFixed(2);

					game.reportPotency(node, capturedInitialPotency, sourceName);
					game.useInstantSkill({
						skillName: SkillName.Thunder3,
						onApplication: () => {
							game.dealDamage(node, capturedInitialPotency, sourceName);
							applyThunderDoT(game, node, capturedTickPotency, 10);
						},
						dealDamage: false,
						node: node
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
				} else {
					let capturedTickPotency: number;
					game.castSpell(SkillName.Thunder3, (cap: SkillCaptureCallbackInfo) => {
						capturedTickPotency = game.captureDamage(Aspect.Lightning, game.config.adjustedDoTPotency(35));
						// tincture
						if (game.resources.get(ResourceType.Tincture).available(1)) {
							node.addBuff(ResourceType.Tincture);
						}
						// if there's a sharpcast stack, consume it and gain (a potentially new) proc
						let sc = game.resources.get(ResourceType.Sharpcast);
						if (sc.available(1)) {
							gainThundercloudProc(game);
							sc.consume(1);
							sc.removeTimer();
						}
					}, (app: SkillApplicationCallbackInfo) => {
						applyThunderDoT(game, node, capturedTickPotency, 10);
					}, node);
				}
			}
		));

		// Manaward
		addResourceAbility({skillName: SkillName.Manaward, rscType: ResourceType.Manaward, instant: false, duration: 20});

		// Manafont
		skillsList.set(SkillName.Manafont, new Skill(SkillName.Manafont,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Manafont,
					onApplication: () => {
						game.resources.get(ResourceType.Mana).gain(3000);
						node.resolve();
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Fire 3
		skillsList.set(SkillName.Fire3, new Skill(SkillName.Fire3,
			() => {
				return true;
			},
			(game, node) => {
				if (game.resources.get(ResourceType.Firestarter).available(1)) {
					game.useInstantSkill({
						skillName: SkillName.Fire3,
						dealDamage: true,
						node: node
					});
					game.switchToAForUI(ResourceType.AstralFire, 3);
					game.startOrRefreshEnochian();
					game.resources.get(ResourceType.Firestarter).consume(1);
					game.resources.get(ResourceType.Firestarter).removeTimer();
				} else {
					game.castSpell(SkillName.Fire3, (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, (app: SkillApplicationCallbackInfo) => {
					}, node);
				}
			}
		));

		// Blizzard 3
		skillsList.set(SkillName.Blizzard3, new Skill(SkillName.Blizzard3,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell(SkillName.Blizzard3, (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Freeze
		skillsList.set(SkillName.Freeze, new Skill(SkillName.Freeze,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell(SkillName.Freeze, (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Flare
		skillsList.set(SkillName.Flare, new Skill(SkillName.Flare,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell(SkillName.Flare, (cap: SkillCaptureCallbackInfo) => {
					let uh = game.resources.get(ResourceType.UmbralHeart);
					let mana = game.resources.get(ResourceType.Mana);
					let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
					// mana
					game.resources.get(ResourceType.Mana).consume(manaCost);
					uh.consume(uh.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Sharpcast
		addResourceAbility({skillName: SkillName.Sharpcast, rscType: ResourceType.Sharpcast, instant: true, duration: 30});

		// Blizzard 4
		skillsList.set(SkillName.Blizzard4, new Skill(SkillName.Blizzard4,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell(SkillName.Blizzard4, (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Fire 4
		skillsList.set(SkillName.Fire4, new Skill(SkillName.Fire4,
			() => {
				return game.getFireStacks() > 0; // in AF
			},
			(game, node) => {
				game.castSpell(SkillName.Fire4, (cap: SkillCaptureCallbackInfo) => {
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Between the Lines
		skillsList.set(SkillName.BetweenTheLines, new Skill(SkillName.BetweenTheLines,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.BetweenTheLines,
					dealDamage: false,
					onCapture: ()=>{node.resolve()},
					node: node
				});
			}
		));

		// Aetherial Manipulation
		skillsList.set(SkillName.AetherialManipulation, new Skill(SkillName.AetherialManipulation,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.AetherialManipulation,
					dealDamage: false,
					onCapture: ()=>{node.resolve()},
					node: node
				});
			}
		));

		// Triplecast
		skillsList.set(SkillName.Triplecast, new Skill(SkillName.Triplecast,
			() => {
				return true;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Triplecast,
					onCapture: () => {
						let triple = game.resources.get(ResourceType.Triplecast);
						if (triple.pendingChange) triple.removeTimer(); // should never need this, but just in case
						triple.gain(3);
						game.resources.addResourceEvent(
							ResourceType.Triplecast,
							"drop remaining Triple charges", game.config.extendedBuffTimes ? 15.7 : 15, (rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							});
						node.resolve();
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Foul
		skillsList.set(SkillName.Foul, new Skill(SkillName.Foul,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				game.resources.get(ResourceType.Polyglot).consume(1);
				game.useInstantSkill({
					skillName: SkillName.Foul,
					dealDamage: true,
					node: node
				});
			}
		));

		// Despair
		skillsList.set(SkillName.Despair, new Skill(SkillName.Despair,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell(SkillName.Despair, (cap: SkillCaptureCallbackInfo) => {
					let mana = game.resources.get(ResourceType.Mana);
					// mana
					mana.consume(mana.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Umbral Soul
		skillsList.set(SkillName.UmbralSoul, new Skill(SkillName.UmbralSoul,
			() => {
				return game.getIceStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.UmbralSoul,
					onCapture: () => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.resources.get(ResourceType.UmbralHeart).gain(1);
						game.startOrRefreshEnochian();
						node.resolve();
					},
					dealDamage: false,
					node: node
				});
			}
		));

		// Xenoglossy
		skillsList.set(SkillName.Xenoglossy, new Skill(SkillName.Xenoglossy,
			() => {
				return game.resources.get(ResourceType.Polyglot).available(1);
			},
			(game, node) => {
				game.resources.get(ResourceType.Polyglot).consume(1);
				game.useInstantSkill({
					skillName: SkillName.Xenoglossy,
					dealDamage: true,
					node: node
				});
			}
		));

		// High Fire 2
		skillsList.set(SkillName.HighFire2, new Skill(SkillName.HighFire2,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell(SkillName.HighFire2, (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.AstralFire, 3);
					game.startOrRefreshEnochian();
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// High Blizzard 2
		skillsList.set(SkillName.HighBlizzard2, new Skill(SkillName.HighBlizzard2,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell(SkillName.HighBlizzard2, (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Amplifier
		skillsList.set(SkillName.Amplifier, new Skill(SkillName.Amplifier,
			() => {
				return game.getIceStacks() > 0 || game.getFireStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Amplifier,
					onCapture: () => {
						game.resources.get(ResourceType.Polyglot).gain(1);
					},
					dealDamage: false,
					node: node
				});
				node.resolve();
			}
		));

		// Paradox
		skillsList.set(SkillName.Paradox, new Skill(SkillName.Paradox,
			() => {
				return game.resources.get(ResourceType.Paradox).available(1);
			},
			(game, node) => {
				game.castSpell(SkillName.Paradox, (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.Paradox).consume(1);
					// enochian (refresh only
					if (game.hasEnochian()) {
						game.startOrRefreshEnochian();
					}
					if (game.getIceStacks() > 0) {
						game.resources.get(ResourceType.UmbralIce).gain(1);
					}
					if (game.getFireStacks() > 0) {// firestarter proc
						game.resources.get(ResourceType.AstralFire).gain(1);
						potentiallyGainFirestarter(game);
					}
				}, (app: SkillApplicationCallbackInfo) => {
				}, node);
			}
		));

		// Addle
		addResourceAbility({skillName: SkillName.Addle, rscType: ResourceType.Addle, instant: false, duration: 10});

		// Swiftcast
		addResourceAbility({skillName: SkillName.Swiftcast, rscType: ResourceType.Swiftcast, instant: true, duration: 10});

		// Lucid Dreaming
		skillsList.set(SkillName.LucidDreaming, new Skill(SkillName.LucidDreaming,
			() => { return true; },
			(game, node) => {
				const skillTime = game.getDisplayTime();
				game.useInstantSkill({
					skillName: SkillName.LucidDreaming,
					onApplication: () => {
						let lucid = game.resources.get(ResourceType.LucidDreaming) as LucidDreamingBuff;
						if (lucid.available(1)) {
							lucid.overrideTimer(game, 21);
						} else {
							lucid.gain(1);
							game.resources.addResourceEvent(
								ResourceType.LucidDreaming,
								"drop lucid dreaming", 21, (rsc: Resource) => {
									rsc.consume(1);
								});
						}
						lucid.sourceSkill = "Lucid@"+skillTime.toFixed(2);
						lucid.tickCount = 0;
					},
					dealDamage: false,
					node: node
				});
				node.resolve();
			}))

		// Surecast
		addResourceAbility({skillName: SkillName.Surecast, rscType: ResourceType.Surecast, instant: true, duration: 10});

		// Tincture
		addResourceAbility({skillName: SkillName.Tincture, rscType: ResourceType.Tincture, instant: false, duration: 30});

		// Sprint
		addResourceAbility({skillName: SkillName.Sprint, rscType: ResourceType.Sprint, instant: false, duration: 10});

		return skillsList;
	}
	get(key: SkillName): Skill {
		let skill = super.get(key);
		if (skill) return skill;
		else {
			console.assert(false);
			return new Skill(
				SkillName.Never,
				()=>{return false},
				(game: GameState, node: ActionNode)=>{});
		}
	}
}