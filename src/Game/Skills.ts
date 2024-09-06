import {Aspect, BuffType, LevelSync, ProcMode, ResourceType, SkillName, WarningType} from './Common'
// @ts-ignore
import {controller} from "../Controller/Controller";
import {DoTBuff, EventTag, Resource} from "./Resources";
import {ActionNode} from "../Controller/Record";
import {GameState} from "./GameState";
import {getPotencyModifiersFromResourceState, Potency} from "./Potency";
import {TraitName, Traits} from './Traits';

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
// https://www.fflogs.com/reports/cNpjtRXHhZ8Az2V3#fight=last&type=damage-done&view=events&ability=36987
// https://www.fflogs.com/reports/7NMQkxLzcbptw3Xd#fight=15&type=damage-done&source=116&view=events&ability=36986
const skillInfos = [
	new SkillInfo(SkillName.Blizzard, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 400, 180, 0.846),
	new SkillInfo(SkillName.Fire, ResourceType.cd_GCD, Aspect.Fire, true,
		2.5, 800, 180, 1.871),
	new SkillInfo(SkillName.Blizzard2, ResourceType.cd_GCD, Aspect.Ice, true,
		3, 800, 80, 1.158), // Unknown damage application, copied from HB2
	new SkillInfo(SkillName.Fire2, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 1500, 80, 1.154), // Unknown damage application, copied from HF2
	new SkillInfo(SkillName.Transpose, ResourceType.cd_Transpose, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.Thunder3, ResourceType.cd_GCD, Aspect.Lightning, true,
		0, 0, 120, 0.757), // Unknown damage application, copied from HT
	new SkillInfo(SkillName.Manaward, ResourceType.cd_Manaward, Aspect.Other, false,
		0, 0, 0, 1.114),// delayed
	// Manafont: application delay 0.88s -> 0.2s since Dawntrail
	// infact most effects seem instant but MP gain is delayed.
	// see screen recording: https://drive.google.com/file/d/1zGhU9egAKJ3PJiPVjuRBBMkKdxxHLS9b/view?usp=drive_link
	new SkillInfo(SkillName.Manafont, ResourceType.cd_Manafont, Aspect.Other, false,
		0, 0, 0, 0.2),
	new SkillInfo(SkillName.Fire3, ResourceType.cd_GCD, Aspect.Fire, true,
		3.5, 2000, 280, 1.292),
	new SkillInfo(SkillName.Blizzard3, ResourceType.cd_GCD, Aspect.Ice, true,
		3.5, 800, 280, 0.89),
	new SkillInfo(SkillName.Freeze, ResourceType.cd_GCD, Aspect.Ice, true,
		2.8, 1000, 120, 0.664),
	new SkillInfo(SkillName.Flare, ResourceType.cd_GCD, Aspect.Fire, true,
		4, 0, 240, 1.157), // mana is handled separately

	new SkillInfo(SkillName.LeyLines, ResourceType.cd_LeyLines, Aspect.Other, false,
		0, 0, 0, 0.49),// delayed
	new SkillInfo(SkillName.Blizzard4, ResourceType.cd_GCD, Aspect.Ice, true,
		2.5, 800, 320, 1.156),
	new SkillInfo(SkillName.Fire4, ResourceType.cd_GCD, Aspect.Fire, true,
		2.8, 800, 320, 1.159),
	new SkillInfo(SkillName.BetweenTheLines, ResourceType.cd_BetweenTheLines, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.AetherialManipulation, ResourceType.cd_AetherialManipulation, Aspect.Other, false,
		0, 0, 0), // ?
	new SkillInfo(SkillName.Triplecast, ResourceType.cd_Triplecast, Aspect.Other, false,
		0, 0, 0), // instant

	new SkillInfo(SkillName.Foul, ResourceType.cd_GCD, Aspect.Other, true,
		2.5, 0, 600, 1.158),
	new SkillInfo(SkillName.Despair, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 0, 350, 0.556),
	// Umbral Soul: immediate snapshot & UH gain; delayed MP gain
	// see screen recording: https://drive.google.com/file/d/1nsO69O7lgc8V_R_To4X0TGalPsCus1cg/view?usp=drive_link
	new SkillInfo(SkillName.UmbralSoul, ResourceType.cd_GCD, Aspect.Ice, true,
		0, 0, 0, 0.633),
	new SkillInfo(SkillName.Xenoglossy, ResourceType.cd_GCD, Aspect.Other, true,
		0, 0, 880, 0.63),

	new SkillInfo(SkillName.HighFire2, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 1500, 100, 1.154),
	new SkillInfo(SkillName.HighBlizzard2, ResourceType.cd_GCD, Aspect.Ice, true,
		3, 800, 100, 1.158),
	new SkillInfo(SkillName.Amplifier, ResourceType.cd_Amplifier, Aspect.Other, false,
		0, 0, 0), // ? (assumed to be instant)
	new SkillInfo(SkillName.Paradox, ResourceType.cd_GCD, Aspect.Other, true,
		0, 1600, 520, 0.624),
	new SkillInfo(SkillName.HighThunder, ResourceType.cd_GCD, Aspect.Lightning, true,
		0, 0, 150, 0.757),
	new SkillInfo(SkillName.FlareStar, ResourceType.cd_GCD, Aspect.Fire, true,
		3, 0, 400, 0.622), /* Get actual delay after release */
	new SkillInfo(SkillName.Retrace, ResourceType.cd_Retrace, Aspect.Other, false,
		0, 0, 0), // ? (assumed to be instant)

	new SkillInfo(SkillName.Addle, ResourceType.cd_Addle, Aspect.Other, false,
		0, 0, 0, 0.621),// delayed
	new SkillInfo(SkillName.Swiftcast, ResourceType.cd_Swiftcast, Aspect.Other, false,
		0, 0, 0), // instant
	new SkillInfo(SkillName.LucidDreaming, ResourceType.cd_LucidDreaming, Aspect.Other, false,
		0, 0, 0, 0.623), // delayed
	new SkillInfo(SkillName.Surecast, ResourceType.cd_Surecast, Aspect.Other, false,
		0, 0, 0), // surprisingly instant because arms length is not
	new SkillInfo(SkillName.Tincture, ResourceType.cd_Tincture, Aspect.Other, false,
		0, 0, 0, 0.64),// delayed // somewhere in the midrange of what's seen in logs
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
			duration: number,
			additionalEffect?: () => void
		}) {
			let takeEffect = (node: ActionNode) => {
				let resource = game.resources.get(props.rscType);
				if (resource.available(1)) {
					resource.overrideTimer(game, props.duration);
				} else {
					resource.gain(1);
					game.resources.addResourceEvent({
						rscType: props.rscType,
						name: "drop " + props.rscType,
						delay: props.duration,
						fnOnRsc: (rsc: Resource) => {
							rsc.consume(1);
						}
					});
				}
				node.resolveAll(game.getDisplayTime());
				if (props.additionalEffect) {
					props.additionalEffect();
				}
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
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.UmbralIce, 1);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else // in AF
				{
					game.castSpell({skillName: SkillName.Blizzard, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		let gainFirestarterProc = function(game: GameState) {
			let fs = game.resources.get(ResourceType.Firestarter);
			// re-measured in DT, screen recording at: https://drive.google.com/file/d/1MEFnd-m59qx1yIaZeehSsAxjhLMsWBuw/view?usp=drive_link
			let duration = 30.5;
			if (fs.available(1)) {
				fs.overrideTimer(game, duration);
			} else {
				fs.gain(1);
				game.resources.addResourceEvent({
					rscType: ResourceType.Firestarter,
					name: "drop firestarter proc",
					delay: duration,
					fnOnRsc: (rsc: Resource)=>{
						rsc.consume(1);
					}
				});
			}
		}

		let potentiallyGainFirestarter = function(game: GameState) {
			let rand = game.rng(); // firestarter proc
			if (game.config.procMode===ProcMode.Always || (game.config.procMode===ProcMode.RNG && rand < 0.4)) gainFirestarterProc(game);
		}

		// Fire
		skillsList.set(SkillName.Fire, new Skill(SkillName.Fire,
			() => {
				return true;
			},
			(game, node) => {
				if (game.getIceStacks() === 0) { // in fire or no enochian
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 1);
						game.startOrRefreshEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				} else {
					game.castSpell({skillName: SkillName.Fire, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Enochian).removeTimer();
						game.loseEnochian();
						potentiallyGainFirestarter(game);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
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
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Ley Lines
		addResourceAbility({
			skillName: SkillName.LeyLines,
			rscType: ResourceType.LeyLines,
			instant: false,
			duration: 30,
			additionalEffect: () => {
				game.resources.get(ResourceType.LeyLines).enabled = true;
			}
		});

		let applyThunderDoT = function(game: GameState, node: ActionNode, skillName: SkillName) {
			let thunder = game.resources.get(ResourceType.ThunderDoT) as DoTBuff;
			const thunderDuration = (skillName === SkillName.Thunder3 && 27) || 30;
			if (thunder.available(1)) {
				console.assert(thunder.node);
				(thunder.node as ActionNode).removeUnresolvedPotencies();

				thunder.overrideTimer(game, thunderDuration);
			} else {
				thunder.gain(1);
				controller.reportDotStart(game.getDisplayTime());
				game.resources.addResourceEvent({
					rscType: ResourceType.ThunderDoT,
					name: "drop thunder DoT",
					delay: thunderDuration,
					fnOnRsc: rsc=>{
						  rsc.consume(1);
						  controller.reportDotDrop(game.getDisplayTime());
					 }
				});
			}
			thunder.node = node;
			thunder.tickCount = 0;
		}

		let addThunderPotencies = function(node: ActionNode, skillName: SkillName.Thunder3 | SkillName.HighThunder) {
			let mods = getPotencyModifiersFromResourceState(game.resources, Aspect.Lightning);
			let thunder = skillsList.get(skillName);

			// initial potency
			let pInitial = new Potency({
				config: controller.record.config ?? controller.gameConfig,
				sourceTime: game.getDisplayTime(),
				sourceSkill: skillName,
				aspect: Aspect.Lightning,
				basePotency: thunder ? thunder.info.basePotency : 150,
				snapshotTime: undefined,
				description: ""
			});
			pInitial.modifiers = mods;
			node.addPotency(pInitial);

			// dots
			const thunderTicks = (skillName === SkillName.Thunder3 && 9) || 10;
			const thunderTickPotency = (skillName === SkillName.Thunder3 && 50) || 60;
			for (let i = 0; i < thunderTicks; i++) {
				let pDot = new Potency({
					config: controller.record.config ?? controller.gameConfig,
					sourceTime: game.getDisplayTime(),
					sourceSkill: skillName,
					aspect: Aspect.Lightning,
					basePotency: game.config.adjustedDoTPotency(thunderTickPotency),
					snapshotTime: undefined,
					description: "DoT " + (i+1) + `/${thunderTicks}`
				});
				pDot.modifiers = mods;
				node.addPotency(pDot);
			}
		}

		let addThunders = function(skillName: SkillName.Thunder3 | SkillName.HighThunder) {
			skillsList.set(skillName, new Skill(skillName,
				() => {
					return game.resources.get(ResourceType.Thunderhead).available(1);
				},
				(game, node) => {
					// potency
					addThunderPotencies(node, skillName); // should call on capture
					let onHitPotency = node.getPotencies()[0];
					node.getPotencies().forEach(p=>{ p.snapshotTime = game.getDisplayTime(); });
	
					// tincture
					if (game.resources.get(ResourceType.Tincture).available(1)) {
						node.addBuff(BuffType.Tincture);
					}
	
					game.useInstantSkill({
						skillName: skillName,
						onApplication: () => {
							controller.resolvePotency(onHitPotency);
							applyThunderDoT(game, node, skillName);
						},
						dealDamage: false,
						node: node
					});
					let thunderhead = game.resources.get(ResourceType.Thunderhead);
					thunderhead.consume(1);
					thunderhead.removeTimer();
				}
			));
		}
		addThunders(SkillName.Thunder3);
		addThunders(SkillName.HighThunder);

		// Manaward
		addResourceAbility({skillName: SkillName.Manaward, rscType: ResourceType.Manaward, instant: false, duration: 20});

		// Manafont
		skillsList.set(SkillName.Manafont, new Skill(SkillName.Manafont,
			() => {
				return game.resources.get(ResourceType.AstralFire).availableAmount() > 0;
			},
			(game, node) => {
				let useSkillEvent = game.useInstantSkill({
					skillName: SkillName.Manafont,
					onCapture: () => {
						game.resources.get(ResourceType.AstralFire).gain(3);
						game.resources.get(ResourceType.UmbralHeart).gain(3);

						if (Traits.hasUnlocked(TraitName.AspectMasteryV, game.config.level))
							game.resources.get(ResourceType.Paradox).gain(1);

						game.gainThunderhead();
						game.startOrRefreshEnochian();
						node.resolveAll(game.getDisplayTime());
					},
					onApplication: () => {
						game.resources.get(ResourceType.Mana).gain(10000);
					},
					dealDamage: false,
					node: node
				});
				useSkillEvent.addTag(EventTag.ManaGain);
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
					game.castSpell({skillName: SkillName.Fire3, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Blizzard 3
		skillsList.set(SkillName.Blizzard3, new Skill(SkillName.Blizzard3,
			() => {
				return true;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard3, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.switchToAForUI(ResourceType.UmbralIce, 3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Freeze
		skillsList.set(SkillName.Freeze, new Skill(SkillName.Freeze,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Freeze, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Flare
		skillsList.set(SkillName.Flare, new Skill(SkillName.Flare,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Flare, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let uh = game.resources.get(ResourceType.UmbralHeart);
					let mana = game.resources.get(ResourceType.Mana);
					let manaCost = uh.available(1) ? mana.availableAmount() * 0.66 : mana.availableAmount();
					// mana
					game.resources.get(ResourceType.Mana).consume(manaCost);
					uh.consume(uh.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);

					if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, game.config.level))
						game.resources.get(ResourceType.AstralSoul).gain(3);

					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Blizzard 4
		skillsList.set(SkillName.Blizzard4, new Skill(SkillName.Blizzard4,
			() => {
				return game.getIceStacks() > 0; // in UI
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Blizzard4, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.UmbralHeart).gain(3);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Fire 4
		skillsList.set(SkillName.Fire4, new Skill(SkillName.Fire4,
			() => {
				return game.getFireStacks() > 0; // in AF
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Fire4, onCapture: (cap: SkillCaptureCallbackInfo) => {
					if (Traits.hasUnlocked(TraitName.EnhancedAstralFire, game.config.level))
						game.resources.get(ResourceType.AstralSoul).gain(1);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Between the Lines
		skillsList.set(SkillName.BetweenTheLines, new Skill(SkillName.BetweenTheLines,
			() => {
				let ll = game.resources.get(ResourceType.LeyLines);
				return ll.availableAmountIncludingDisabled() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.BetweenTheLines,
					dealDamage: false,
					onCapture: ()=>{node.resolveAll(game.getDisplayTime())},
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
					onCapture: ()=>{node.resolveAll(game.getDisplayTime())},
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
						// 15.7s: see screen recording: https://drive.google.com/file/d/1qoIpAMK2KAKETgID6a3p5dqkeWRcNDdB/view?usp=drive_link
						game.resources.addResourceEvent({
							rscType: ResourceType.Triplecast,
							name: "drop remaining Triple charges", delay: 15.7, fnOnRsc:(rsc: Resource) => {
								rsc.consume(rsc.availableAmount());
							}
						});
						node.resolveAll(game.getDisplayTime());
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
				if (Traits.hasUnlocked(TraitName.EnhancedFoul, game.config.level)) {
					game.resources.get(ResourceType.Polyglot).consume(1);
					game.useInstantSkill({
						skillName: SkillName.Foul,
						dealDamage: true,
						node: node
					});
				}
				else {
					game.castSpell({skillName: SkillName.Foul, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.resources.get(ResourceType.Polyglot).consume(1);
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			}
		));

		// Despair
		skillsList.set(SkillName.Despair, new Skill(SkillName.Despair,
			() => {
				return game.getFireStacks() > 0 && // in AF
					game.getMP() >= 800;
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Despair, onCapture: (cap: SkillCaptureCallbackInfo) => {
					let mana = game.resources.get(ResourceType.Mana);
					// mana
					mana.consume(mana.availableAmount());
					// +3 AF; refresh enochian
					game.resources.get(ResourceType.AstralFire).gain(3);
					game.startOrRefreshEnochian();
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Umbral Soul
		skillsList.set(SkillName.UmbralSoul, new Skill(SkillName.UmbralSoul,
			() => {
				return game.getIceStacks() > 0;
			},
			(game, node) => {
				game.castSpell({
					skillName: SkillName.UmbralSoul,
					onCapture: () => {
						game.resources.get(ResourceType.UmbralIce).gain(1);
						game.resources.get(ResourceType.UmbralHeart).gain(1);
						game.startOrRefreshEnochian();
						// halt
						let enochian = game.resources.get(ResourceType.Enochian);
						enochian.removeTimer();
					},
					onApplication: (app: SkillApplicationCallbackInfo) => {},
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

		let addFire2 = function(skillName: SkillName) {
			skillsList.set(skillName, new Skill(skillName,
				() => { return true; },
				(game, node) => {
					game.castSpell({skillName: skillName, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.AstralFire, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			))};
		[SkillName.Fire2, SkillName.HighFire2].forEach(addFire2);

		let addBlizzard2 = function(skillName: SkillName) {
			skillsList.set(skillName, new Skill(skillName,
				() => { return true; },
				(game, node) => {
					game.castSpell({skillName: skillName, onCapture: (cap: SkillCaptureCallbackInfo) => {
						game.switchToAForUI(ResourceType.UmbralIce, 3);
						game.startOrRefreshEnochian();
					}, onApplication: (app: SkillApplicationCallbackInfo) => {
					}, node: node});
				}
			))};
		[SkillName.Blizzard2, SkillName.HighBlizzard2].forEach(addBlizzard2);

		// Amplifier
		skillsList.set(SkillName.Amplifier, new Skill(SkillName.Amplifier,
			() => {
				return game.getIceStacks() > 0 || game.getFireStacks() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Amplifier,
					onCapture: () => {
						let polyglot = game.resources.get(ResourceType.Polyglot);
						if (polyglot.available(polyglot.maxValue)) {
							controller.reportWarning(WarningType.PolyglotOvercap)
						}
						polyglot.gain(1);
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Paradox
		skillsList.set(SkillName.Paradox, new Skill(SkillName.Paradox,
			() => {
				return game.resources.get(ResourceType.Paradox).available(1);
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.Paradox, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.Paradox).consume(1);
					// enochian (refresh only) (which also clears the halt status)
					if (game.hasEnochian()) {
						game.startOrRefreshEnochian();
					}
					if (game.getIceStacks() > 0) {
						game.resources.get(ResourceType.UmbralIce).gain(1);
					} else if (game.getFireStacks() > 0) {// firestarter proc
						game.resources.get(ResourceType.AstralFire).gain(1);
						gainFirestarterProc(game);
					} else {
						console.assert(false);
					}
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Flare Star
		skillsList.set(SkillName.FlareStar, new Skill(SkillName.FlareStar,
			() => {
				return game.resources.get(ResourceType.AstralSoul).available(6);
			},
			(game, node) => {
				game.castSpell({skillName: SkillName.FlareStar, onCapture: (cap: SkillCaptureCallbackInfo) => {
					game.resources.get(ResourceType.AstralSoul).consume(6);
				}, onApplication: (app: SkillApplicationCallbackInfo) => {
				}, node: node});
			}
		));

		// Retrace
		skillsList.set(SkillName.Retrace, new Skill(SkillName.Retrace,
			() => {
				return Traits.hasUnlocked(TraitName.EnhancedLeyLines, game.config.level) &&
					game.resources.get(ResourceType.LeyLines).availableAmountIncludingDisabled() > 0;
			},
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.Retrace,
					onCapture: () => {
						game.resources.get(ResourceType.LeyLines).enabled = true;
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}
		));

		// Addle
		const addleDuration = (Traits.hasUnlocked(TraitName.EnhancedAddle, game.config.level) && 15) || 10;
		addResourceAbility({skillName: SkillName.Addle, rscType: ResourceType.Addle, instant: false, duration: addleDuration});

		// Swiftcast
		addResourceAbility({skillName: SkillName.Swiftcast, rscType: ResourceType.Swiftcast, instant: true, duration: 10});

		// Lucid Dreaming
		skillsList.set(SkillName.LucidDreaming, new Skill(SkillName.LucidDreaming,
			() => { return true; },
			(game, node) => {
				game.useInstantSkill({
					skillName: SkillName.LucidDreaming,
					onApplication: () => {
						let lucid = game.resources.get(ResourceType.LucidDreaming) as DoTBuff;
						if (lucid.available(1)) {
							lucid.overrideTimer(game, 21);
						} else {
							lucid.gain(1);
							game.resources.addResourceEvent({
								rscType: ResourceType.LucidDreaming,
								name: "drop lucid dreaming", delay: 21, fnOnRsc: (rsc: Resource) => {
									rsc.consume(1);
								}
							});
						}
						lucid.node = node;
						lucid.tickCount = 0;
						let nextLucidTickEvt = game.findNextQueuedEventByTag(EventTag.LucidTick);
						if (nextLucidTickEvt) {
							nextLucidTickEvt.addTag(EventTag.ManaGain);
						}
					},
					dealDamage: false,
					node: node
				});
				node.resolveAll(game.getDisplayTime());
			}))

		// Surecast
		addResourceAbility({skillName: SkillName.Surecast, rscType: ResourceType.Surecast, instant: true, duration: 6});

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

export class DisplayedSkills extends Array<SkillName> {
	constructor(level: LevelSync) {
		super();

		this.push(SkillName.Blizzard);
		this.push(SkillName.Fire);
		this.push(SkillName.Transpose);
		this.push(SkillName.Thunder3);
		this.push(SkillName.Manaward);
		this.push(SkillName.Manafont);
		this.push(SkillName.Fire3);
		this.push(SkillName.Blizzard3);
		this.push(SkillName.Freeze);
		this.push(SkillName.Flare);
		this.push(SkillName.LeyLines);
		this.push(SkillName.Blizzard4);
		this.push(SkillName.Fire4);
		this.push(SkillName.BetweenTheLines);
		this.push(SkillName.AetherialManipulation);
		this.push(SkillName.Triplecast);
		this.push(SkillName.Foul);

		if (level >= 80) {
			this.push(SkillName.Despair);
			this.push(SkillName.UmbralSoul);
			this.push(SkillName.Xenoglossy);
		}
		else {
			this.push(SkillName.UmbralSoul);
		}

		this.push(SkillName.Fire2);
		this.push(SkillName.Blizzard2);

		if (level >= 90) {
			this.push(SkillName.Amplifier);
		}

		if (level >= 100) {
			this.push(SkillName.FlareStar);
		}

		this.push(SkillName.Addle);
		this.push(SkillName.Swiftcast);
		this.push(SkillName.LucidDreaming);
		this.push(SkillName.Surecast);
		this.push(SkillName.Tincture);
		this.push(SkillName.Sprint);
	}
}