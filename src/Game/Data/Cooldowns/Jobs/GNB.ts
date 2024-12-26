import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const GNB = ensureRecord<Cooldown>()({
	cd_NO_MERCY: { name: "cd_NoMercy" }, // 60 sec
	cd_BLOODFEST: { name: "cd_Bloodfest" }, // 120 sec
	cd_CAMOUFLAGE: { name: "cd_Camouflage" }, // 90 sec
	cd_ROYAL_GUARD: { name: "cd_RoyalGuard" }, // 2 sec
	cd_RELEASE_ROYAL_GUARD: { name: "cd_ReleaseRoyalGuard" }, // 1 sec
	cd_DANGER_ZONE: { name: "cd_DangerZone" }, // 30 sec
	cd_BLASTING_ZONE: { name: "cd_BlastingZone" }, // 30 sec
	cd_NEBULA: { name: "cd_Nebula" }, // 120 sec
	cd_GREAT_NEBULA: { name: "cd_GreatNebula" }, // 120 sec
	cd_AURORA: { name: "cd_Aurora" }, // 60 sec
	cd_SUPERBOLIDE: { name: "cd_Superbolide" }, // 360 sec
	cd_TRAJECTORY: { name: "cd_Trajectory" }, // 30 sec
	cd_GNASHING_FANG: { name: "cd_GnashingFang" }, // 30 sec
	cd_BOW_SHOCK: { name: "cd_BowShock" }, // 60 sec
	cd_HEART_OF_LIGHT: { name: "cd_HeartOfLight" }, // 90 sec
	cd_HEART_OF_STONE: { name: "cd_HeartOfStone" }, // 25 sec
	cd_HEART_OF_CORUNDUM: { name: "cd_HeartOfCorundum" }, // 25 sec
	cd_DOUBLE_DOWN: { name: "cd_DoubleDown" }, // 60 sec
	cd_CONTINUATION: { name: "cd_Continuation" }, // 1 sec
	cd_HYPERVELOCITY: { name: "cd_Hypervelocity" },
	cd_FATED_BRAND: { name: "cd_FatedBrand" },
	cd_JUGULAR_RIP: { name: "cd_JugularRip" },
	cd_ABDOMEN_TEAR: { name: "cd_AbdomenTear" },
	cd_EYE_GOUGE: { name: "cd_EyeGouge" },
});

export type GNBCooldowns = typeof GNB;
export type GNBCooldownKey = keyof GNBCooldowns;
