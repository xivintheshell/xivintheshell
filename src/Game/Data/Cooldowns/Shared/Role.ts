import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const ROLE = ensureRecord<Cooldown>()({
	cd_ADDLE: { name: "cd_Addle" }, // [0, 1x]
	cd_SWIFTCAST: { name: "cd_Swiftcast" }, // [0, 1x]
	cd_LUCID_DREAMING: { name: "cd_LucidDreaming" }, // [0, 1x]
	cd_SURECAST: { name: "cd_Surecast" }, // [0, 1x]
	cd_SECOND_WIND: { name: "cd_SecondWind" },
	cd_ARMS_LENGTH: { name: "cd_ArmsLength" },

	cd_RESCUE: { name: "cd_Rescue" },

	cd_FEINT: { name: "cd_Feint" },
	cd_TRUE_NORTH: { name: "cd_TrueNorth" },
	cd_BLOODBATH: { name: "cd_Bloodbath" },
	cd_LEG_SWEEP: { name: "cd_LegSweep" },

	cd_RAMPART: { name: "cd_Rampart" },
	cd_REPRISAL: { name: "cd_Reprisal" },
	cd_LOW_BLOW: { name: "cd_LowBlow" },
	cd_INTERJECT: { name: "cd_Interject" },
	cd_PROVOKE: { name: "cd_Provoke" },
	cd_SHIRK: { name: "cd_Shirk" },

	cd_HEAD_GRAZE: { name: "cd_HeadGraze" },
});

export type RoleCooldowns = typeof ROLE;
export type RoleCooldownKey = keyof RoleCooldowns;
