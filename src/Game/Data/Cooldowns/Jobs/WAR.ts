import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const WAR = ensureRecord<Cooldown>()({
	cd_INNER_RELEASE: { name: "cd_InnerRelease" },
	cd_PRIMAL_WRATH: { name: "cd_PrimalWrath" },
	cd_UPHEAVAL: { name: "cd_Upheaval" },
	cd_ONSLAUGHT: { name: "cd_Onslaught" },
	cd_INFURIATE: { name: "cd_Infuriate" },

	cd_VENGEANCE: { name: "cd_Vengeance" },
	cd_THRILL_OF_BATTLE: { name: "cd_ThrillOfBattle" },
	cd_RAW_INTUITION: { name: "cd_RawIntuition" },
	cd_EQUILIBRIUM: { name: "cd_Equilibrium" },
	cd_SHAKE_IT_OFF: { name: "cd_ShakeItOff" },
	cd_HOLMGANG: { name: "cd_Holmgang" },

	cd_DEFIANCE: { name: "cd_Defiance" },
	cd_RELEASE_DEFIANCE: { name: "cd_ReleaseDefiance" },
});

export type WARCooldowns = typeof WAR;
export type WARCooldownKey = keyof WARCooldowns;
