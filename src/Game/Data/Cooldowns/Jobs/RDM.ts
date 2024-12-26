import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const RDM = ensureRecord<Cooldown>()({
	cd_CORPS_A_CORPS: { name: "cd_CorpsACorps" },
	cd_DISPLACEMENT: { name: "cd_Displacement" },
	cd_FLECHE: { name: "cd_Fleche" },
	cd_ACCELERATION: { name: "cd_Acceleration" },
	cd_CONTRE_SIXTE: { name: "cd_ContreSixte" },
	cd_EMBOLDEN: { name: "cd_Embolden" },
	cd_MANAFICATION: { name: "cd_Manafication" },
	cd_MAGICK_BARRIER: { name: "cd_MagickBarrier" },
	cd_VICE_OF_THORNS: { name: "cd_ViceOfThorns" },
	cd_PREFULGENCE: { name: "cd_Prefulgence" },
});

export type RDMCooldowns = typeof RDM;
export type RDMCooldownKey = keyof RDMCooldowns;
