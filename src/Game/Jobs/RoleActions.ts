import {ShellJob} from "../../Controller/Common";
import {SkillName, ResourceType, WarningType} from "../Common";
import {makeResourceAbility} from "../Skills";
import {DoTBuff, EventTag} from "../Resources"
import {Traits, TraitName} from "../Traits";
import type {GameState} from "../GameState";
import {controller} from "../../Controller/Controller";

const CASTER_JOBS = [ShellJob.BLM, ShellJob.PCT, ShellJob.RDM];

makeResourceAbility(CASTER_JOBS, SkillName.Addle, 8, ResourceType.cd_Addle, {
	rscType: ResourceType.Addle,
	applicationDelay: 0.621, // delayed
	cooldown: 90,
	duration: (state) => (Traits.hasUnlocked(TraitName.EnhancedAddle, state.config.level) && 15) || 10,
	assetPath: "Role/Addle.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.Swiftcast, 18, ResourceType.cd_Swiftcast, {
	rscType: ResourceType.Swiftcast,
	applicationDelay: 0, // instant
	cooldown: 40, // set by trait in constructor
	assetPath: "Role/Swiftcast.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.LucidDreaming, 14, ResourceType.cd_LucidDreaming, {
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

makeResourceAbility(CASTER_JOBS, SkillName.Surecast, 44, ResourceType.cd_Surecast, {
	rscType: ResourceType.Surecast,
	applicationDelay: 0, // surprisingly instant because arms length is not
	cooldown: 120,
	assetPath: "Role/Surecast.png",
});

// Special case for RDM, because for some twelvesforsaken reason sprint/pot cancel dualcast
const cancelDualcast = (state: GameState) => {
	if (state.job === ShellJob.RDM && state.tryConsumeResource(ResourceType.Dualcast)) {
		controller.reportWarning(WarningType.DualcastEaten);
	}
};

makeResourceAbility(CASTER_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	rscType: ResourceType.Tincture,
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	cooldown: 270,
	assetPath: "Role/Tincture.png",
	onConfirm: cancelDualcast,
});

makeResourceAbility(CASTER_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	rscType: ResourceType.Sprint,
	applicationDelay: 0.133, // delayed
	cooldown: 60,
	assetPath: "General/Sprint.png",
	onConfirm: cancelDualcast,
});
