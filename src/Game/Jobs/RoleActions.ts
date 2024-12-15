import {ALL_JOBS, CASTER_JOBS, HEALER_JOBS, MELEE_JOBS, PHYSICAL_RANGED_JOBS, ShellJob, TANK_JOBS} from "../../Controller/Common";
import {SkillName, ResourceType, TraitName, WarningType} from "../Common";
import {combineEffects, makeAbility, makeLimitBreak, makeResourceAbility, makeSpell} from "../Skills";
import {DoTBuff, EventTag, makeResource} from "../Resources"
import {Traits} from "../Traits";
import type {GameState} from "../GameState";
import {controller} from "../../Controller/Controller";

//#region Helper functions

// Special case for RDM, because for some twelvesforsaken reason sprint/pot cancel dualcast
// And so do limit breaks! :(
const cancelDualcast = (state: GameState) => {
	if (state.job === ShellJob.RDM && state.tryConsumeResource(ResourceType.Dualcast)) {
		controller.reportWarning(WarningType.DualcastEaten);
	}
};

// Special case for SAM, since all actions should cancel meditate
const cancelMeditate = (state: GameState) => {
	if (state.job === ShellJob.SAM) {
		const evt = state.findNextQueuedEventByTag(EventTag.MeditateTick);
		if (evt) {
			evt.canceled = true;
		}
		state.tryConsumeResource(ResourceType.Meditate);
	}
};

// All actions cancel Improvisation
const cancelImprovisation = (state: GameState) => {
	if (state.job === ShellJob.DNC) {
		state.tryConsumeResource(ResourceType.Improvisation);
		state.tryConsumeResource(ResourceType.RisingRhythm, true);
	}
}

//#endregion

//#region Interrupts

makeAbility(TANK_JOBS, SkillName.Interject, 18, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Interject.png",
});

makeAbility(PHYSICAL_RANGED_JOBS, SkillName.HeadGraze, 24, ResourceType.cd_HeadGraze, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Head Graze.png",
	onExecute: cancelImprovisation,
});

//#endregion

//#region Enemy-targeted mitigations

TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Reprisal, 1, {timeout: 15});
})
makeResourceAbility(TANK_JOBS, SkillName.Reprisal, 22, ResourceType.cd_Reprisal, {
	rscType: ResourceType.Reprisal,
	applicationDelay: 0.62,
	cooldown: 60,
	duration: (state) => (Traits.hasUnlocked(TraitName.EnhancedReprisal, state.config.level) && 15) || 10,
	assetPath: "Role/Reprisal.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Feint, 1, {timeout: 15});
})
makeResourceAbility(MELEE_JOBS, SkillName.Feint, 22, ResourceType.cd_Feint, {
	rscType: ResourceType.Feint,
	applicationDelay: 0.537,
	cooldown: 90,
	duration: (state) => (Traits.hasUnlocked(TraitName.EnhancedFeint, state.config.level) && 15) || 10,
	assetPath: "Role/Feint.png",
	onExecute: cancelMeditate,
});

CASTER_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Addle, 1, {timeout: 15});
})
makeResourceAbility(CASTER_JOBS, SkillName.Addle, 8, ResourceType.cd_Addle, {
	rscType: ResourceType.Addle,
	applicationDelay: 0.621, // delayed
	cooldown: 90,
	duration: (state) => (Traits.hasUnlocked(TraitName.EnhancedAddle, state.config.level) && 15) || 10,
	assetPath: "Role/Addle.png",
});

//#endregion

//#region Self-targeted utility

TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Rampart, 1, {timeout: 20});
})
makeResourceAbility(TANK_JOBS, SkillName.Rampart, 8, ResourceType.cd_Rampart, {
	rscType: ResourceType.Rampart,
	applicationDelay: 0.62,
	cooldown: 90,
	assetPath: "Role/Rampart.png",
});

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.TrueNorth, 1, {timeout: 10});
})
makeResourceAbility(MELEE_JOBS, SkillName.TrueNorth, 50, ResourceType.cd_TrueNorth, {
	rscType: ResourceType.TrueNorth,
	applicationDelay: 0,
	cooldown: 45,
	maxCharges: 2,
	assetPath: "Role/True North.png",
	onExecute: cancelMeditate,
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.Swiftcast, 1, {timeout: 10});
})
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], SkillName.Swiftcast, 18, ResourceType.cd_Swiftcast, {
	rscType: ResourceType.Swiftcast,
	applicationDelay: 0, // instant
	cooldown: 40, // set by trait in constructor
	assetPath: "Role/Swiftcast.png",
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.LucidDreaming, 1, {timeout: 21});
})
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], SkillName.LucidDreaming, 14, ResourceType.cd_LucidDreaming, {
	rscType: ResourceType.LucidDreaming,
	applicationDelay: 0.623, // delayed
	cooldown: 60,
	assetPath: "Role/Lucid Dreaming.png",
	onApplication: (state, node) => {
		let lucid = state.resources.get(ResourceType.LucidDreaming) as DoTBuff;
		lucid.node = node;
		lucid.tickCount = 0;
		let nextLucidTickEvt = state.findNextQueuedEventByTag(EventTag.LucidTick);
		if (nextLucidTickEvt) {
			nextLucidTickEvt.addTag(EventTag.ManaGain);
		}
	},
});

//#endregion

//#region Anti-knockback

[...TANK_JOBS, ...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS].forEach((job) => {
	makeResource(job, ResourceType.ArmsLength, 1, {timeout: 6.5})
});
makeResourceAbility([...TANK_JOBS, ...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS], SkillName.ArmsLength, 32, ResourceType.cd_ArmsLength, {
	rscType: ResourceType.ArmsLength,
	applicationDelay: 0.62,
	cooldown: 120,
	assetPath: "Role/Arms Length.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation),
});

[...HEALER_JOBS, ...CASTER_JOBS].forEach((job) => {
	makeResource(job, ResourceType.Surecast, 1, {timeout: 6.5})
});
makeResourceAbility([...HEALER_JOBS, ...CASTER_JOBS], SkillName.Surecast, 44, ResourceType.cd_Surecast, {
	rscType: ResourceType.Surecast,
	applicationDelay: 0, // surprisingly instant because arms length is not
	cooldown: 120,
	assetPath: "Role/Surecast.png",
});

//#endregion

//#region Self-targeted healing

MELEE_JOBS.forEach((job) => {
	makeResource(job, ResourceType.Bloodbath, 1, {timeout: 20});
})
makeResourceAbility(MELEE_JOBS, SkillName.Bloodbath, 8, ResourceType.cd_Bloodbath, {
	rscType: ResourceType.Bloodbath,
	applicationDelay: 0.625,
	cooldown: 90,
	assetPath: "Role/Bloodbath.png",
	onExecute: cancelMeditate,
});

makeAbility([...MELEE_JOBS, ...PHYSICAL_RANGED_JOBS], SkillName.SecondWind, 12, ResourceType.cd_SecondWind, {
	applicationDelay: 0.625,
	cooldown: 120,
	assetPath: "Role/Second Wind.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation),
});

//#endregion

//#region Other-targeted utility

makeAbility(TANK_JOBS, SkillName.Provoke, 15, ResourceType.cd_Provoke, {
	applicationDelay: 0,
	cooldown: 30,
	assetPath: "Role/Provoke.png",
});

makeAbility(TANK_JOBS, SkillName.Shirk, 48, ResourceType.cd_Shirk, {
	applicationDelay: 0,
	cooldown: 120,
	assetPath: "Role/Shirk.png",
});

makeAbility(TANK_JOBS, SkillName.LowBlow, 25, ResourceType.cd_LowBlow, {
	applicationDelay: 0.62,
	cooldown: 25,
	assetPath: "Role/Low Blow.png",
});

makeSpell(HEALER_JOBS, SkillName.Esuna, 10, {
	manaCost: 400,
	castTime: 0,
	applicationDelay: 1.14,
	assetPath: "Role/Esuna.png",
})

makeAbility(HEALER_JOBS, SkillName.Rescue, 48, ResourceType.cd_Rescue, {
	applicationDelay: 0, // Who knows
	cooldown: 120,
	assetPath: "Role/Rescue.png"
})

makeAbility(MELEE_JOBS, SkillName.LegSweep, 10, ResourceType.cd_LegSweep, {
	applicationDelay: 0.625,
	cooldown: 40,
	assetPath: "Role/Leg Sweep.png",
	onExecute: cancelMeditate,
});

//#endregion

//#region All-jobs (Tincture and Sprint)

makeResourceAbility(ALL_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	rscType: ResourceType.Tincture,
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	cooldown: 270,
	assetPath: "Role/Tincture.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation),
	onConfirm: cancelDualcast,
});

makeResourceAbility(ALL_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	rscType: ResourceType.Sprint,
	applicationDelay: 0.133, // delayed
	cooldown: 60,
	assetPath: "General/Sprint.png",
	onExecute: combineEffects(cancelMeditate, cancelImprovisation),
	onConfirm: cancelDualcast,
});

//#endregion

//#region Limit Breaks

// Tank
TANK_JOBS.forEach((job) => {
	makeResource(job, ResourceType.TankLB1, 1, {timeout: 10});
	makeResource(job, ResourceType.TankLB2, 1, {timeout: 12});
	makeResource(job, ResourceType.TankLB3, 1, {timeout: 8});
})
makeLimitBreak(TANK_JOBS, SkillName.TankLB1, ResourceType.cd_TankLB1, {
	applicationDelay: 0.45,
	onApplication: (state) => {
		state.resources.get(ResourceType.TankLB1).gain(1)
		state.enqueueResourceDrop(ResourceType.TankLB1, 10)
	},
})
makeLimitBreak(TANK_JOBS, SkillName.TankLB2, ResourceType.cd_TankLB2, {
	applicationDelay: 0.89,
	onApplication: (state) => {
		state.resources.get(ResourceType.TankLB2).gain(1)
		state.enqueueResourceDrop(ResourceType.TankLB2, 12)
	},
})
makeLimitBreak(TANK_JOBS, SkillName.TankLB3, ResourceType.cd_TankLB3, {
	applicationDelay: 1.34,
	onApplication: (state) => {
		state.resources.get(ResourceType.TankLB3).gain(1)
		state.enqueueResourceDrop(ResourceType.TankLB3, 8)
	},
})

// Healer
makeLimitBreak(HEALER_JOBS, SkillName.HealerLB1, ResourceType.cd_HealerLB1, {
	castTime: 2,
	applicationDelay: 0.76,
})
makeLimitBreak(HEALER_JOBS, SkillName.HealerLB2, ResourceType.cd_HealerLB2, {
	castTime: 2,
	applicationDelay: 0.8,
})
makeLimitBreak(HEALER_JOBS, SkillName.HealerLB3, ResourceType.cd_HealerLB3, {
	castTime: 2,
	applicationDelay: 0.8,
})

// Melee
makeLimitBreak(MELEE_JOBS, SkillName.MeleeLB1, ResourceType.cd_MeleeLB1, {
	castTime: 2,
	applicationDelay: 2.23,
	onExecute: cancelMeditate,
})
makeLimitBreak(MELEE_JOBS, SkillName.MeleeLB2, ResourceType.cd_MeleeLB2, {
	castTime: 3,
	applicationDelay: 3.28,
	onExecute: cancelMeditate,
})
makeLimitBreak(MELEE_JOBS, SkillName.MeleeLB3, ResourceType.cd_MeleeLB3, {
	castTime: 4.5,
	applicationDelay: 2.26,
	onExecute: cancelMeditate,
})

// Ranged
makeLimitBreak(PHYSICAL_RANGED_JOBS, SkillName.RangedLB1, ResourceType.cd_RangedLB1, {
	castTime: 2,
	applicationDelay: 2.23,
	onExecute: cancelImprovisation,
})
makeLimitBreak(PHYSICAL_RANGED_JOBS, SkillName.RangedLB2, ResourceType.cd_RangedLB2, {
	castTime: 3,
	applicationDelay: 2.49,
	onExecute: cancelImprovisation,
})
makeLimitBreak(PHYSICAL_RANGED_JOBS, SkillName.RangedLB3, ResourceType.cd_RangedLB3, {
	castTime: 4.5,
	applicationDelay: 3.16,
	onExecute: cancelImprovisation,
})

// Caster
makeLimitBreak(CASTER_JOBS, SkillName.CasterLB1, ResourceType.cd_CasterLB1, {
	castTime: 2,
	applicationDelay: 1.64,
	onConfirm: cancelDualcast,
})
makeLimitBreak(CASTER_JOBS, SkillName.CasterLB2, ResourceType.cd_CasterLB2, {
	castTime: 3,
	applicationDelay: 3.75,
	onConfirm: cancelDualcast,
})
makeLimitBreak(CASTER_JOBS, SkillName.CasterLB3, ResourceType.cd_CasterLB3, {
	castTime: 4.5,
	applicationDelay: 4.5,
	onConfirm: cancelDualcast,
})

//#region 