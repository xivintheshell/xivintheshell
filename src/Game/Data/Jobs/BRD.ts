import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const BRD_ACTIONS = ensureRecord<ActionData>()({
	HEAVY_SHOT: { id: 97, name: "Heavy Shot" },
	QUICK_NOCK: { id: 100, name: "Quick Nock" },
	BLOODLETTER: { id: 110, name: "Bloodletter" },
	BARRAGE: { id: 107, name: "Barrage" },
	RAGING_STRIKES: { id: 101, name: "Raging Strikes" },
	REPELLING_SHOT: { id: 112, name: "Repelling Shot" },
	WIDE_VOLLEY: { id: 111, name: "Wide Volley" },
	MAGES_BALLAD: { id: 114, name: "Mage's Ballad" },
	ARMYS_PAEON: { id: 116, name: "Army's Paeon" },
	RAIN_OF_DEATH: { id: 117, name: "Rain Of Death" },
	BATTLE_VOICE: { id: 118, name: "Battle Voice" },
	EMYPREAL_ARROW: { id: 3558, name: "Empyreal Arrow" },
	WANDERERS_MINUET: { id: 3559, name: "Wanderer's Minuet" },
	IRON_JAWS: { id: 3560, name: "Iron Jaws" },
	WARDENS_PAEAN: { id: 3561, name: "Warden's Paean" },
	SIDEWINDER: { id: 3562, name: "Sidewinder" },
	PITCH_PERFECT: { id: 7404, name: "Pitch Perfect" },
	TROUBADOUR: { id: 7405, name: "Troubadour" },
	CAUSTIC_BITE: { id: 7406, name: "Caustic Bite" },
	STORMBITE: { id: 7407, name: "Stormbite" },
	NATURES_MINNE: { id: 7408, name: "Nature's Minne" },
	REFULGENT_ARROW: { id: 7409, name: "Refulgent Arrow" },
	SHADOWBITE: { id: 16494, name: "Shadowbite" },
	BURST_SHOT: { id: 16495, name: "Burst Shot" },
	APEX_ARROW: { id: 16496, name: "Apex Arow" },
	LADONSBITE: { id: 25783, name: "Ladonsbite" },
	BLAST_ARROW: { id: 25784, name: "Blast Arrow" },
	RADIANT_FINALE: { id: 25785, name: "Radiant Finale" },
	HEARTBREAK_SHOT: { id: 36975, name: "Heartbreak Shot" },
	RESONANT_ARROW: { id: 36976, name: "Resonant Arrow" },
	RADIANT_ENCORE: { id: 36977, name: "Radiant Encore" },
});

export const BRD_COOLDOWNS = ensureRecord<CooldownData>()({
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

export const BRD_GAUGES = ensureRecord<ResourceData>()({
	SONG_TIMER: { name: "SongTimer" },
	SOUL_VOICE: { name: "Soul Voice" },
	PITCH_PERFECT: { name: "Pitch Perfect" }, // Yes it's all technically Repertoire, easier to represent this way
	REPERTOIRE: { name: "Repertoire" }, // Army's Paeon repertoire stacks
	WANDERERS_CODA: { name: "Wanderer's Coda" },
	MAGES_CODA: { name: "Mage's Coda" },
	ARMYS_CODA: { name: "Army's Coda" },
});

export const BRD_STATUSES = ensureRecord<ResourceData>()({
	HAWKS_EYE: { name: "Hawk's Eye" },
	RAGING_STRIKES: { name: "Raging Strikes" },
	BARRAGE: { name: "Barrage" },
	ARMYS_MUSE: { name: "Army's Muse" },
	ARMYS_ETHOS: { name: "Army's Ethos" },
	BLAST_ARROW_READY: { name: "Blast Arrow Ready" },
	RESONANT_ARROW_READY: { name: "Resonant Arrow Ready" },
	RADIANT_ENCORE_READY: { name: "Radiant Encore Ready" },
	CAUSTIC_BITE: { name: "Caustic Bite" },
	STORMBITE: { name: "Stormbite" },
	MAGES_BALLAD: { name: "Mage's Ballad" },
	ARMYS_PAEON: { name: "Army's Paeon" },
	WANDERERS_MINUET: { name: "Wanderer's Minuet" },
	BATTLE_VOICE: { name: "Battle Voice" },
	WARDENS_PAEAN: { name: "Warden's Paean" },
	TROUBADOUR: { name: "Troubadour" },
	NATURES_MINNE: { name: "Nature's Minne" },
	RADIANT_FINALE: { name: "Radiant Finale" },
});

export const BRD_TRACKERS = ensureRecord<ResourceData>()({
	RADIANT_CODA: { name: "Radiant Coda" },
	MUSE_REPERTOIRE: { name: "Muse Repertoire" },
	ETHOS_REPERTOIRE: { name: "Ethos Repertoire" },
});

export const BRD_TRAITS = ensureRecord<TraitData>()({
	WIDE_VOLLEY_MASTERY: { name: "Wide Volley Mastery", level: 72 },
	BITE_MASTERY_II: { name: "Bite Mastery II", level: 76 },
	HEAVY_SHOT_MASTERY: { name: "Heavy Shot Mastery", level: 76 },
	ENHANCED_ARMYS_PAEON: { name: "Enhanced Army's Paeon", level: 78 },
	SOUL_VOICE: { name: "Soul Voice", level: 80 },
	QUICK_NOCK_MASTERY: { name: "Quick Nock Mastery", level: 82 },
	ENHANCED_BLOODLETTER: { name: "Enhanced Bloodletter", level: 84 },
	ENHANCED_APEX_ARROW: { name: "Enhanced Apex Arrow", level: 86 },
	ENHANCED_TROUBADOUR: { name: "Enhanced Troubadour", level: 88 },
	MINSTRELS_CODA: { name: "Minstrel's Coda", level: 90 },
	BLOODLETTER_MASTERY: { name: "Bloodletter Mastery", level: 92 },
	RANGED_MASTERY: { name: "Ranged Mastery", level: 94 },
	ENHANCED_BARRAGE: { name: "Enhanced Barrage", level: 96 },
	ENHANCED_RADIANT_FINALE: { name: "Enhanced Radiant Finale", level: 100 },
});

export type BRDActions = typeof BRD_ACTIONS;
export type BRDActionKey = keyof BRDActions;

export type BRDCooldowns = typeof BRD_COOLDOWNS;
export type BRDCooldownKey = keyof BRDCooldowns;

export type BRDGauges = typeof BRD_GAUGES;
export type BRDGaugeKey = keyof BRDGauges;

export type BRDStatuses = typeof BRD_STATUSES;
export type BRDStatusKey = keyof BRDStatuses;

export type BRDTrackers = typeof BRD_TRACKERS;
export type BRDTrackerKey = keyof BRDTrackers;

export const BRD_RESOURCES = {
	...BRD_GAUGES,
	...BRD_STATUSES,
	...BRD_TRACKERS,
};
export type BRDResources = typeof BRD_RESOURCES;
export type BRDResourceKey = keyof BRDResources;

export type BRDTraits = typeof BRD_TRAITS;
export type BRDTraitKey = keyof BRDTraits;
