import { ensureRecord } from "../../../../Utilities/ensureRecord";
import { Cooldown } from "../type";

export const BRD = ensureRecord<Cooldown>()({
	cd_RAGING_STRIKES: { name: "cd_RagingStrikes" },
	cd_BARRAGE: { name: "cd_Barrage" },
	cd_EMPYREAL_ARROW: { name: "cd_EmpyrealArrow" },
	cd_HEARTBREAK_SHOT: { name: "cd_HeartbreakShot" },
	cd_SIDEWINDER: { name: "cd_Sidewinder" },
	cd_WANDERERS_MINUET: { name: "cd_WanderersMinuet" },
	cd_MAGES_BALLAD: { name: "cd_MagesBallad" },
	cd_ARMYS_PAEON: { name: "cd_ArmysPaeon" },
	cd_WARDENS_PAEAN: { name: "cd_WardensPaean" },
	cd_NATURES_MINNE: { name: "cd_NaturesMinne" },
	cd_REPELLING_SHOT: { name: "cd_RepellingShot" },
	cd_BATTLE_VOICE: { name: "cd_BattleVoice" },
	cd_RADIANT_FINALE: { name: "cd_RadiantFinale" },
	cd_TROUBADOUR: { name: "cd_Troubadour" },
	cd_PITCH_PERFECT: { name: "cd_PitchPerfect" },
});

export type BRDCooldowns = typeof BRD;
export type BRDCooldownKey = keyof BRDCooldowns;
