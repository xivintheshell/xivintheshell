import { ensureRecord } from "../../../utilities";
import { ActionData, CooldownData, ResourceData, TraitData } from "../types";

export const NIN_ACTIONS = ensureRecord<ActionData>()({
	SPINNING_EDGE: { id: 2240, name: "Spinning Edge", label: { zh: "双刃旋" } },
	SHADE_SHIFT: { id: 2241, name: "Shade Shift", label: { zh: "残影" } },
	GUST_SLASH: { id: 2242, name: "Gust Slash", label: { zh: "绝风" } },
	HIDE: { id: 2245, name: "Hide", label: { zh: "隐遁" } },
	THROWING_DAGGER: { id: 2247, name: "Throwing Dagger", label: { zh: "飞刀" } },
	TRICK_ATTACK: { id: 2258, name: "Trick Attack", label: { zh: "攻其不备" } },
	AEOLIAN_EDGE: { id: 2255, name: "Aeolian Edge", label: { zh: "旋风刃" } },
	TEN: { id: 2259, name: "Ten", label: { zh: "天之印" } },
	NINJUTSU: { id: 2260, name: "Ninjutsu", label: { zh: "忍术" } },
	CHI: { id: 2261, name: "Chi", label: { zh: "地之印" } },
	DEATH_BLOSSOM: { id: 2254, name: "Death Blossom", label: { zh: "血雨飞花" } },
	SHUKUCHI: { id: 2262, name: "Shukuchi", label: { zh: "缩地" } },
	JIN: { id: 2263, name: "Jin", label: { zh: "人之印" } },
	KASSATSU: { id: 2264, name: "Kassatsu", label: { zh: "生杀予夺" } },
	HAKKE_MUJINSATSU: { id: 16488, name: "Hakke Mujinsatsu", label: { zh: "八卦无刃杀" } },
	ARMOR_CRUSH: { id: 3563, name: "Armor Crush", label: { zh: "强甲破点突" } },
	DREAM_WITHIN_A_DREAM: { id: 3566, name: "Dream Within a Dream", label: { zh: "梦幻三段" } },
	HELLFROG_MEDIUM: { id: 7401, name: "Hellfrog Medium", label: { zh: "通灵之术·大虾蟆" } },
	DOKUMORI: { id: 36957, name: "Dokumori", label: { zh: "介毒之术" } },
	BHAVACAKRA: { id: 7402, name: "Bhavacakra", label: { zh: "六道轮回" } },
	TEN_CHI_JIN: { id: 7403, name: "Ten Chi Jin", label: { zh: "天地人" } },
	MEISUI: { id: 16489, name: "Meisui", label: { zh: "命水" } },
	BUNSHIN: { id: 16493, name: "Bunshin", label: { zh: "分身之术" } },
	PHANTOM_KAMAITACHI: { id: 25774, name: "Phantom Kamaitachi", label: { zh: "残影镰鼬" } },
	FORKED_RAIJU: { id: 25777, name: "Forked Raiju", label: { zh: "月影雷兽爪" } },
	FLEETING_RAIJU: { id: 25778, name: "Fleeting Raiju", label: { zh: "月影雷兽牙" } },
	KUNAIS_BANE: { id: 36958, name: "Kunai's Bane", label: { zh: "百雷铳" } },
	DEATHFROG_MEDIUM: { id: 36959, name: "Deathfrog Medium", label: { zh: "通灵之术·虾蟆仙" } },
	ZESHO_MEPPO: { id: 36960, name: "Zesho Meppo", label: { zh: "是生灭法" } },
	TENRI_JINDO: { id: 36961, name: "Tenri Jindo", label: { zh: "天理人道" } },
	KATON: { id: 2266, name: "Katon", label: { zh: "火遁之术" } },
	RAITON: { id: 2267, name: "Raiton", label: { zh: "雷遁之术" } },
	HYOTON: { id: 2268, name: "Hyoton", label: { zh: "冰遁之术" } },
	HUTON: { id: 2269, name: "Huton", label: { zh: "风遁之术" } },
	DOTON: { id: 2270, name: "Doton", label: { zh: "土遁之术" } },
	SUITON: { id: 2271, name: "Suiton", label: { zh: "水遁之术" } },
	GOKA_MEKKYAKU: { id: 16491, name: "Goka Mekkyaku", label: { zh: "劫火灭却之术" } },
	HYOSHO_RANRYU: { id: 16492, name: "Hyosho Ranryu", label: { zh: "冰晶乱流之术" } },
	RABBIT_MEDIUM: { id: 2272, name: "Rabbit Medium", label: { zh: "通灵之术·兔子" } },
	// Because we serialize action name values instead of keys, we need to distinguish between
	// the different buttons. These will be re-normalized on CSV export.
	FUMA_SHURIKEN: { id: 2265, name: "Fuma Shuriken", label: { zh: "风魔手里剑" } },
	FUMA_SHURIKEN_TEN: {
		id: 18873,
		name: "Fuma Shuriken (Ten)",
		label: { zh: "风魔手里剑（天）" },
	},
	FUMA_SHURIKEN_CHI: {
		id: 18874,
		name: "Fuma Shuriken (Chi)",
		label: { zh: "风魔手里剑（地）" },
	},
	FUMA_SHURIKEN_JIN: {
		id: 18875,
		name: "Fuma Shuriken (Jin)",
		label: { zh: "风魔手里剑（人）" },
	},
	KATON_TEN: { id: 18876, name: "Katon (Ten)", label: { zh: "火遁之术（天）" } },
	RAITON_CHI: { id: 18877, name: "Raiton (Chi)", label: { zh: "雷遁之术（地）" } },
	HYOTON_JIN: { id: 18878, name: "Hyoton (Jin)", label: { zh: "冰遁之术（人）" } },
	HUTON_TEN: { id: 18879, name: "Huton (Ten)", label: { zh: "风遁之术（天）" } },
	DOTON_CHI: { id: 18880, name: "Doton (Chi)", label: { zh: "土遁之术（地）" } },
	SUITON_JIN: { id: 18881, name: "Suiton (Jin)", label: { zh: "水遁之术（人）" } },
});

export const NIN_COOLDOWNS = ensureRecord<CooldownData>()({
	cd_MUDRA_HACK: { name: "cd_MudraHack" },
	cd_MUDRA: { name: "cd_Mudra" },
	cd_SHADE_SHIFT: { name: "cd_Shadeshift" },
	cd_HIDE: { name: "cd_Hide" },
	cd_TRICK_ATTACK: { name: "cd_TrickAttack" },
	cd_SHUKUCHI: { name: "cd_Shukuchi" },
	cd_KASSATSU: { name: "cd_Kassatsu" },
	cd_DREAM_WITHIN_A_DREAM: { name: "cd_DREAM_WITHIN_A_DREAM" },
	cd_DOKUMORI: { name: "cd_Dokumori" },
	cd_TEN_CHI_JIN: { name: "cd_TenChiJin" },
	cd_MEISUI: { name: "cd_Meisui" },
	cd_BUNSHIN: { name: "cd_Bunshin" },
	cd_BHAVACAKRA: { name: "cd_Bhavacakra" },
	cd_TENRI_JINDO: { name: "cd_TenriJindo" },
});

export const NIN_GAUGES = ensureRecord<ResourceData>()({
	KAZEMATOI: { name: "Kazematoi", label: { zh: "风缠" } },
	NINKI: { name: "Ninki", label: { zh: "忍气" } },
});

export const NIN_STATUSES = ensureRecord<ResourceData>()({
	MUDRA: { name: "Mudra", label: { zh: "手势" } },
	SHADE_SHIFT: { name: "Shade Shift", label: { zh: "残影" } },
	HIDDEN: { name: "Hidden", label: { zh: "隐遁" } },
	TRICK_ATTACK: { name: "Trick Attack", label: { zh: "攻其不备" }, specialDebuff: true },
	KASSATSU: { name: "Kassatsu", label: { zh: "生杀予夺" } },
	DOKUMORI: { name: "Dokumori", label: { zh: "介毒之术" }, specialDebuff: true },
	TENRI_JINDO_READY: { name: "Tenri Jindo Ready", label: { zh: "天理人道预备" } },
	// Internally tracks 3 stacks to simplify buff expiry logic.
	TEN_CHI_JIN: { name: "Ten Chi Jin", maximumStacks: 3, label: { zh: "天地人" } },
	MEISUI: { name: "Meisui", label: { zh: "命水" } },
	SHADOW_WALKER: { name: "Shadow Walker", label: { zh: "忍隐" } },
	BUNSHIN: { name: "Bunshin", maximumStacks: 5, label: { zh: "分身之术" } },
	PHANTOM_KAMAITACHI_READY: { name: "Phantom Kamaitachi Ready", label: { zh: "残影镰鼬预备" } },
	RAIJU_READY: { name: "Raiju Ready", maximumStacks: 3, label: { zh: "月影雷兽预备" } },
	KUNAIS_BANE: { name: "Kunai's Bane", label: { zh: "百雷铳" }, specialDebuff: true },
	HIGI: { name: "Higi", label: { zh: "秘技预备" } },
	DOTON: { name: "Doton", mayBeToggled: true, label: { zh: "土遁之术" } },
});

export const NIN_TRACKERS = ensureRecord<ResourceData>()({
	NIN_COMBO_TRACKER: { name: "NIN Combo", label: { zh: "双刃旋连连击状态" } }, // [0, 2]
	NIN_AOE_COMBO_TRACKER: { name: "NIN AOE Combo", label: { zh: "AOE连连击状态" } }, // [0, 1]
	// 3-digit tracker representing the last 3 mudras cast
	// 0 = [no mudra]
	// 1 = ten, 2 = chi, 3 = jin
	MUDRA_TRACKER: { name: "Mudra Tracker", label: { zh: "手势状态" } },
	// 1 if the current mudra bunnied (should be cleared on the mudra buff's expiration)
	BUNNY: { name: "Bunny", label: { zh: "兔子" } },
});

export const NIN_TRAITS = ensureRecord<TraitData>()({
	ENHANCED_SHUKUCHI_II: { name: "Enhanced Shukuchi II", level: 74 },
	MELEE_MASTERY_NIN: { name: "Melee Mastery NIN", level: 74 },
	ENHANCED_KASSATSU: { name: "Enhanced Kassatsu", level: 76 },
	SHUKIHO_II: { name: "Shukiho II", level: 78 },
	SHUKIHO_III: { name: "Shukiho III", level: 84 },
	MELEE_MASTERY_II_NIN: { name: "Melee Mastery II NIN", level: 84 },
	ENHANCED_MEISUI: { name: "Enhanced Meisui", level: 88 },
	ENHANCED_RAITON: { name: "Enhanced Raiton", level: 90 },
	TRICK_ATTACK_MASTERY: { name: "Trick Attack Mastery", level: 92 },
	MELEE_MASTERY_III_NIN: { name: "Melee Mastery III NIN", level: 94 },
	ENHANCED_DOKUMORI: { name: "Enhanced Dokumori", level: 96 },
	ENHANCED_TEN_CHI_JIN: { name: "Enhanced Ten Chi Jin", level: 100 },
});

export type NINActions = typeof NIN_ACTIONS;
export type NINActionKey = keyof NINActions;

export type NINCooldowns = typeof NIN_COOLDOWNS;
export type NINCooldownKey = keyof NINCooldowns;

export type NINGauges = typeof NIN_GAUGES;
export type NINGaugeKey = keyof NINGauges;

export type NINStatuses = typeof NIN_STATUSES;
export type NINStatusKey = keyof NINStatuses;

export type NINTrackers = typeof NIN_TRACKERS;
export type NINTrackerKey = keyof NINTrackers;

export const NIN_RESOURCES = {
	...NIN_GAUGES,
	...NIN_STATUSES,
	...NIN_TRACKERS,
};
export type NINResources = typeof NIN_RESOURCES;
export type NINResourceKey = keyof NINResources;

export type NINTraits = typeof NIN_TRAITS;
export type NINTraitKey = keyof NINTraits;
