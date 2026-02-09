import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const BRD_ACTIONS = ensureRecord<ActionData>()({
	HEAVY_SHOT: { id: 97, name: "Heavy Shot", label: { zh: "强力射击" } },
	QUICK_NOCK: { id: 100, name: "Quick Nock", label: { zh: "连珠箭" } },
	BLOODLETTER: { id: 110, name: "Bloodletter", label: { zh: "失血箭" } },
	BARRAGE: { id: 107, name: "Barrage", label: { zh: "纷乱箭" } },
	RAGING_STRIKES: { id: 101, name: "Raging Strikes", label: { zh: "猛者强击" } },
	REPELLING_SHOT: { id: 112, name: "Repelling Shot", label: { zh: "后跃射击" } },
	WIDE_VOLLEY: { id: 111, name: "Wide Volley", label: { zh: "广域群射" } },
	MAGES_BALLAD: { id: 114, name: "Mage's Ballad", label: { zh: "贤者的叙事谣" } },
	ARMYS_PAEON: { id: 116, name: "Army's Paeon", label: { zh: "军神的赞美歌" } },
	RAIN_OF_DEATH: { id: 117, name: "Rain of Death", label: { zh: "死亡箭雨" } },
	BATTLE_VOICE: { id: 118, name: "Battle Voice", label: { zh: "战斗之声" } },
	EMYPREAL_ARROW: { id: 3558, name: "Empyreal Arrow", label: { zh: "九天连箭" } },
	WANDERERS_MINUET: {
		id: 3559,
		name: "The Wanderer's Minuet",
		label: { zh: "放浪神的小步舞曲" },
	},
	IRON_JAWS: { id: 3560, name: "Iron Jaws", label: { zh: "伶牙俐齿" } },
	WARDENS_PAEAN: { id: 3561, name: "Warden's Paean", label: { zh: "光阴神的礼赞凯歌" } },
	SIDEWINDER: { id: 3562, name: "Sidewinder", label: { zh: "侧风诱导箭" } },
	PITCH_PERFECT: { id: 7404, name: "Pitch Perfect", label: { zh: "完美音调" } },
	TROUBADOUR: { id: 7405, name: "Troubadour", label: { zh: "行吟" } },
	CAUSTIC_BITE: { id: 7406, name: "Caustic Bite", label: { zh: "烈毒咬箭" } },
	STORMBITE: { id: 7407, name: "Stormbite", label: { zh: "狂风蚀箭" } },
	NATURES_MINNE: { id: 7408, name: "Nature's Minne", label: { zh: "大地神的抒情恋歌" } },
	REFULGENT_ARROW: { id: 7409, name: "Refulgent Arrow", label: { zh: "辉煌箭" } },
	SHADOWBITE: { id: 16494, name: "Shadowbite", label: { zh: "影噬箭" } },
	BURST_SHOT: { id: 16495, name: "Burst Shot", label: { zh: "爆发射击" } },
	APEX_ARROW: { id: 16496, name: "Apex Arrow", label: { zh: "绝峰箭" } },
	LADONSBITE: { id: 25783, name: "Ladonsbite", label: { zh: "百首龙牙箭" } },
	BLAST_ARROW: { id: 25784, name: "Blast Arrow", label: { zh: "爆破箭" } },
	RADIANT_FINALE: { id: 25785, name: "Radiant Finale", label: { zh: "光明神的最终乐章" } },
	HEARTBREAK_SHOT: { id: 36975, name: "Heartbreak Shot", label: { zh: "碎心箭" } },
	RESONANT_ARROW: { id: 36976, name: "Resonant Arrow", label: { zh: "共鸣箭" } },
	RADIANT_ENCORE: { id: 36977, name: "Radiant Encore", label: { zh: "光明神的返场余音" } },
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
	SONG_TIMER: { name: "SongTimer", label: { zh: "歌曲时间" } },
	SOUL_VOICE: { name: "Soul Voice", label: { zh: "灵魂之声" } },
	PITCH_PERFECT: { name: "Pitch Perfect", label: { zh: "完美音调" } }, // Yes it's all technically Repertoire, easier to represent this way
	REPERTOIRE: { name: "Repertoire", label: { zh: "诗心" } }, // Army's Paeon repertoire stacks
	WANDERERS_CODA: { name: "Wanderer's Coda", label: { zh: "放浪神尾声" } },
	MAGES_CODA: { name: "Mage's Coda", label: { zh: "贤者尾声" } },
	ARMYS_CODA: { name: "Army's Coda", label: { zh: "军神尾声" } },
});

export const BRD_STATUSES = ensureRecord<ResourceData>()({
	HAWKS_EYE: { name: "Hawk's Eye", label: { zh: "鹰眼" } },
	RAGING_STRIKES: { name: "Raging Strikes", label: { zh: "猛者强击" } },
	BARRAGE: { name: "Barrage", label: { zh: "纷乱箭" } },
	ARMYS_MUSE: { name: "Army's Muse", label: { zh: "军神的加护" } },
	ARMYS_ETHOS: { name: "Army's Ethos", label: { zh: "军神的契约" } },
	BLAST_ARROW_READY: { name: "Blast Arrow Ready", label: { zh: "爆破箭预备" } },
	RESONANT_ARROW_READY: { name: "Resonant Arrow Ready", label: { zh: "共鸣箭预备" } },
	RADIANT_ENCORE_READY: { name: "Radiant Encore Ready", label: { zh: "光明神的返场余音" } },
	CAUSTIC_BITE: { name: "Caustic Bite", label: { zh: "烈毒咬箭" } },
	STORMBITE: { name: "Stormbite", label: { zh: "狂风蚀箭" } },
	MAGES_BALLAD: { name: "Mage's Ballad", label: { zh: "贤者的叙事谣" } },
	ARMYS_PAEON: { name: "Army's Paeon", label: { zh: "军神的赞美歌" } },
	WANDERERS_MINUET: { name: "Wanderer's Minuet", label: { zh: "放浪神的小步舞曲" } },
	BATTLE_VOICE: { name: "Battle Voice", label: { zh: "战斗之声" } },
	WARDENS_PAEAN: { name: "Warden's Paean", label: { zh: "光阴神的礼赞凯歌" } },
	TROUBADOUR: { name: "Troubadour", label: { zh: "行吟" } },
	NATURES_MINNE: { name: "Nature's Minne", label: { zh: "大地神的抒情恋歌" } },
	RADIANT_FINALE: { name: "Radiant Finale", label: { zh: "光明神的最终乐章" } },
});

export const BRD_TRACKERS = ensureRecord<ResourceData>()({
	RADIANT_CODA: { name: "Radiant Coda", label: { zh: "尾声标识数量" } },
	MUSE_REPERTOIRE: { name: "Muse Repertoire", label: { zh: "军神的加护诗心" } },
	ETHOS_REPERTOIRE: { name: "Ethos Repertoire", label: { zh: "军神的契约诗心" } },
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
