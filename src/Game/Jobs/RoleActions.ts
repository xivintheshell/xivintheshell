import {ShellJob} from "../../Controller/Common";
import {SkillName, ResourceType} from "../../Game/Common";
import {makeAbility} from "../Skills";

const CASTER_JOBS = [ShellJob.BLM, ShellJob.PCT];

makeAbility(CASTER_JOBS, SkillName.Addle, 8, ResourceType.cd_Addle, {
	applicationDelay: 0.621, // delayed
	assetPath: "CasterRole/Addle.png",
});

makeAbility(CASTER_JOBS, SkillName.Swiftcast, 18, ResourceType.cd_Swiftcast, {
	applicationDelay: 0, // instant
	assetPath: "CasterRole/Swiftcast.png",
});

makeAbility(CASTER_JOBS, SkillName.LucidDreaming, 14, ResourceType.cd_LucidDreaming, {
	applicationDelay: 0.623, // delayed
	assetPath: "CasterRole/Lucid Dreaming.png",
});

makeAbility(CASTER_JOBS, SkillName.Surecast, 44, ResourceType.cd_Surecast, {
	applicationDelay: 0, // surprisingly instant because arms length is not
	assetPath: "CasterRole/Surecast.png",
});

makeAbility(CASTER_JOBS, SkillName.Tincture, 1, ResourceType.cd_Tincture, {
	applicationDelay: 0.64, // delayed // somewhere in the midrange of what's seen in logs
	assetPath: "CasterRole/Tincture.png",
});

makeAbility(CASTER_JOBS, SkillName.Sprint, 1, ResourceType.cd_Sprint, {
	applicationDelay: 0.133, // delayed
	assetPath: "General/Sprint.png",
});
