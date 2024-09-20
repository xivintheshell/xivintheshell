import {ShellJob} from "../../Controller/Common";
import {SkillName, ResourceType} from "../Common";
import {makeAbility, makeResourceAbility} from "../Skills";
import {DoTBuff, EventTag} from "../Resources"

const CASTER_JOBS = [ShellJob.BLM, ShellJob.PCT];

makeResourceAbility(CASTER_JOBS, SkillName.Addle, 8, ResourceType.cd_Addle, {
	rscType: ResourceType.Addle,
	applicationDelay: 0.621, // delayed
	duration: (state) => (Traits.hasUnlocked(TraitName.EnhancedAddle, state.config.level) && 15) || 10,
	assetPath: "CasterRole/Addle.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.Swiftcast, 18, ResourceType.cd_Swiftcast, {
	rscType: ResourceType.Swiftcast,
	applicationDelay: 0, // instant
	duration: 10,
	assetPath: "CasterRole/Swiftcast.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.LucidDreaming, 14, ResourceType.cd_LucidDreaming, {
	rscType: ResourceType.LucidDreaming,
	applicationDelay: 0.623, // delayed
	assetPath: "CasterRole/Lucid Dreaming.png",
	duration: 21,
	onApplication: (state, node) => {
		let lucid = state.resources.get(ResourceType.LucidDreaming) as DoTBuff;
		lucid.node = node;
		lucid.tickCount = 0;
		let nextLucidTickEvt = game.findNextQueuedEventByTag(EventTag.LucidTick);
		if (nextLucidTickEvt) {
			nextLucidTickEvt.addTag(EventTag.ManaGain);
		}
	},
});

makeResourceAbility(CASTER_JOBS, SkillName.Surecast, 44, ResourceType.cd_Surecast, {
	rscType: ResourceType.Surecast,
	applicationDelay: 0, // surprisingly instant because arms length is not
	duration: 6,
	assetPath: "CasterRole/Surecast.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	rscType: ResourceType.Tincture,
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	duration: 30,
	assetPath: "CasterRole/Tincture.png",
});

makeResourceAbility(CASTER_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	rscType: ResourceType.Sprint,
	applicationDelay: 0.133, // delayed
	duration: 10,
	assetPath: "General/Sprint.png",
});
