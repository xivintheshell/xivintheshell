import React, { useState, useEffect } from "react";
import { BuffType, SkillUnavailableReason } from "../Game/Common";
import { ContentNode } from "./Common";
import { MdLanguage } from "react-icons/md";
import { getCurrentThemeColors } from "./ColorTheme";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { controller } from "../Controller/Controller";
import { ActionKey, ACTIONS, CooldownKey, COOLDOWNS, ResourceKey } from "../Game/Data";
import { Data } from "../Game/Data/Data";
import { PotencyModifierType } from "../Game/Potency";
import { ConfigData } from "../Game/GameConfig";

export type Language = "en" | "zh" | "ja";

export function localizeLanguage(l: Language): string {
	const currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return l === "en" ? "英文" : l === "zh" ? "中文" : "日文";
	} else if (currentLang === "ja") {
		return l === "en" ? "英語" : l === "zh" ? "中国語" : "日本語";
	} else {
		return l.toString();
	}
}

export type LocalizedContent = {
	en: ContentNode;
	zh?: ContentNode;
	ja?: ContentNode;
};

export function localize(content: LocalizedContent) {
	const currentLang = getCurrentLanguage();
	if (currentLang === "zh" && content.zh) {
		return content.zh;
	} else if (currentLang === "ja" && content.ja) {
		return content.ja;
	} else {
		return content.en;
	}
}

// Expect date in format "mm/dd/yy" which is in changelog.
export function localizeDate(date: string, lang: Language): string {
	if (lang === "zh" || lang === "en") return date;

	if (lang === "ja") {
		const [month, day, year] = date.split("/");
		return `20${year}年${month}月${day}日`;
	}

	return date;
}

export function localizeConfigField(key: keyof ConfigData): string {
	switch (key) {
		case "spellSpeed":
			return localize({ en: "spell speed: ", zh: "咏速：" }).toString();
		case "skillSpeed":
			return localize({ en: "skill speed: ", zh: "技速：" }).toString();
		case "fps":
			return localize({ en: "FPS: ", zh: "帧率：" }).toString();
		case "criticalHit":
			return localize({ en: "crit: ", zh: "暴击：" }).toString();
		case "directHit":
			return localize({ en: "direct hit: ", zh: "直击：" }).toString();
		case "determination":
			return localize({ en: "determination: ", zh: "信念：" }).toString();
		case "piety":
			return localize({ en: "piety: ", zh: "信仰：" }).toString();
		case "animationLock":
			return localize({ en: "animation lock: ", zh: "能力技后摇：" }).toString();
	}
	return key;
}

export function localizeSkillName(text: ActionKey | string): string {
	if (text === "NEVER") {
		return localize({
			en: "unknown skill",
			zh: "未知技能",
		}).toString();
	}
	if (!(text in ACTIONS)) {
		return text;
	}
	const action = Data.getAction(text as ActionKey);
	return localize({
		en: action.name,
		...action.label,
	}).toString();
}

export function localizeSkillUnavailableReason(reason?: SkillUnavailableReason): string {
	if (reason === undefined) {
		return localize({ en: "reason unknown", zh: "未知的理由" }).toString();
	}
	let zhReason = "（未知的理由）";
	if (reason === SkillUnavailableReason.Blocked) {
		zhReason = "在CD，能力技后摇，或读条税中";
	} else if (reason === SkillUnavailableReason.SecondaryBlocked) {
		zhReason = "在次要的CD中";
	} else if (reason === SkillUnavailableReason.NotEnoughMP) {
		zhReason = "MP不足";
	} else if (reason === SkillUnavailableReason.NotInCombat) {
		zhReason = "不在战斗中（需先等第一次伤害结算）";
	} else if (reason === SkillUnavailableReason.RequirementsNotMet) {
		zhReason = "未满足释放条件";
	} else if (reason === SkillUnavailableReason.SkillNotUnlocked) {
		zhReason = "Lv比此技能的习得条件低";
	} else if (reason === SkillUnavailableReason.BuffNoLongerAvailable) {
		zhReason = "BUFF以结束";
	} else if (reason === SkillUnavailableReason.PastTargetTime) {
		zhReason = "跳时间的目标已经过去了";
	} else if (reason === SkillUnavailableReason.CastCanceled) {
		zhReason = "咏唱被中断（确定时不再满足播放条件）";
	} else if (reason === SkillUnavailableReason.UnknownSkill) {
		zhReason = "未知技能";
	} else {
		console.error("unlocalized reason: " + reason);
	}
	return localize({ en: reason, zh: zhReason }).toString();
}

const buffsZh = new Map<BuffType, string>([
	[BuffType.LeyLines, "黑魔纹"],
	[BuffType.Hyperphantasia, "绘灵幻景"],
	[BuffType.Tincture, "爆发药"],

	[BuffType.ArcaneCircle, "神秘纹"],
	[BuffType.ArmysPaeon, "军神的赞美歌歌"],
	[BuffType.BattleLitany, "战斗连祷"],
	[BuffType.BattleVoice, "战斗之声"],
	[BuffType.Brotherhood, "义结金兰"],
	[BuffType.Card_TheBalance, "太阳神之衡"],
	[BuffType.Card_TheSpear, "战斗神之枪"],
	[BuffType.ChainStratagem, "连环计"],
	[BuffType.Devilment, "进攻之探戈"],
	[BuffType.Divination, "占卜"],
	[BuffType.Dokumori, "介毒之术"],
	[BuffType.Embolden, "鼓励"],
	[BuffType.MagesBallad, "贤者的叙事谣"],
	[BuffType.RadiantFinale1, "光明神的最终乐章1"],
	[BuffType.RadiantFinale2, "光明神的最终乐章2"],
	[BuffType.RadiantFinale3, "光明神的最终乐章3"],
	[BuffType.SearingLight, "灼热之光"],
	[BuffType.StandardFinish, "标准舞步结束"],
	[BuffType.StarryMuse, "星空构想"],
	[BuffType.TechnicalFinish, "技巧舞步结束"],
	[BuffType.WanderersMinuet, "放浪神的小步舞曲"],
]);

const buffsJa = new Map<BuffType, string>([
	[BuffType.LeyLines, "黒魔紋"],
	[BuffType.Tincture, "薬"],

	[BuffType.ArcaneCircle, "アルケインサークル"],
	[BuffType.ArmysPaeon, "軍神のパイオン"],
	[BuffType.BattleLitany, "バトルリタニー"],
	[BuffType.BattleVoice, "バトルボイス"],
	[BuffType.Brotherhood, "桃園結義"],
	[BuffType.Card_TheBalance, "アーゼマの均衡"],
	[BuffType.Card_TheSpear, "ハルオーネの槍"],
	[BuffType.ChainStratagem, "連環計"],
	[BuffType.Devilment, "攻めのタンゴ"],
	[BuffType.Divination, "ディヴィネーション"],
	[BuffType.Dokumori, "毒盛の術"],
	[BuffType.Embolden, "エンボルデン"],
	[BuffType.MagesBallad, "賢人のバラード"],
	[BuffType.RadiantFinale1, "光神のフィナーレ1"],
	[BuffType.RadiantFinale2, "光神のフィナーレ2"],
	[BuffType.RadiantFinale3, "光神のフィナーレ3"],
	[BuffType.SearingLight, "シアリングライト"],
	[BuffType.StandardFinish, "スタンダードフィニッシュ"],
	[BuffType.StarryMuse, "イマジンスカイ"],
	[BuffType.TechnicalFinish, "テクニカルフィニッシュ"],
	[BuffType.WanderersMinuet, "旅神のメヌエット"],
]);

export function localizeBuffType(text: BuffType): string {
	const currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return buffsZh.get(text) ?? text;
	} else if (currentLang === "ja") {
		return buffsJa.get(text) ?? text;
	} else {
		return text;
	}
}

export function localizeResourceType(key: ResourceKey | CooldownKey): string {
	const currentLang = getCurrentLanguage();

	if (key in COOLDOWNS) {
		// If it's a cooldown, first see if it's localized on the Data object
		const cooldown = Data.getCooldown(key as CooldownKey);
		const tryLocalized = localize({
			en: cooldown.name,
			...cooldown.label,
		}).toString();

		// If it's not localized on the Data object, try to find the action it's tied to by
		// trimming off the "cd_" leading portion that we use by convention
		if (currentLang !== "en" && tryLocalized === cooldown.name) {
			const sliced = key.slice(3);

			// Check both the action name and the key
			const skillName = Object.keys(ACTIONS).find(
				(key) => ACTIONS[key as ActionKey].name === sliced || key === sliced,
			) as ActionKey | undefined;

			// If we found a corresponding action, use that action's localized name
			if (skillName !== undefined) {
				return "CD：" + localizeSkillName(skillName);
			}
		}
		return tryLocalized;
	}

	const resource = Data.getResource(key as ResourceKey);
	return localize({
		en: resource.name,
		...resource.label,
	}).toString();
}

const modifierNames = new Map<PotencyModifierType, LocalizedContent>([
	[PotencyModifierType.AF3, { en: "AF3", zh: "三层火" }],
	[PotencyModifierType.AF2, { en: "AF2", zh: "二层火" }],
	[PotencyModifierType.AF1, { en: "AF1", zh: "一层火" }],
	[PotencyModifierType.UI3, { en: "UI3", zh: "三层冰" }],
	[PotencyModifierType.UI2, { en: "UI2", zh: "二层冰" }],
	[PotencyModifierType.UI1, { en: "UI1", zh: "一层冰" }],
	[PotencyModifierType.ENO, { en: "enochian", zh: "天语" }],
	[PotencyModifierType.POT, { en: "pot", zh: "爆发药" }],
	[PotencyModifierType.PARTY, { en: "party", zh: "团辅" }],
	[PotencyModifierType.AUTO_CDH, { en: "auto crit/direct hit", zh: "必直暴" }],
	[PotencyModifierType.STARRY, { en: "starry muse", zh: "星空构想" }],
	[PotencyModifierType.EMBOLDEN_M, { en: "embolden", zh: "鼓励" }],
	[PotencyModifierType.ACCELERATION, { en: "acceleration", zh: "促进" }],
	[PotencyModifierType.STANDARD_SINGLE, { en: "single standard finish", zh: "单色小舞" }],
	[PotencyModifierType.STANDARD_DOUBLE, { en: "double standard finish", zh: "双色小舞" }],
	[PotencyModifierType.TECHNICAL_SINGLE, { en: "single technical finish", zh: "单色大舞" }],
	[PotencyModifierType.TECHNICAL_DOUBLE, { en: "double technical finish", zh: "双色大舞" }],
	[PotencyModifierType.TECHNICAL_TRIPLE, { en: "triple technical finish", zh: "三色大舞" }],
	[PotencyModifierType.TECHNICAL_QUADRUPLE, { en: "quadruple technical finish", zh: "四色大舞" }],
	[PotencyModifierType.DEVILMENT, { en: "devilment", zh: "探戈" }],
	[PotencyModifierType.OVERHEATED, { en: "overheated", zh: "过热" }],
	[PotencyModifierType.COMBO, { en: "combo", zh: "连击" }],
	[PotencyModifierType.FUGETSU, { en: "fugetsu", zh: "风月" }],
	[PotencyModifierType.AUTO_CRIT, { en: "auto crit", zh: "必暴" }],
	[PotencyModifierType.YATEN, { en: "yaten", zh: "强化夜天" }],
	[PotencyModifierType.POSITIONAL, { en: "positional", zh: "身位" }],
	[PotencyModifierType.ARCANE_CIRCLE, { en: "arcane circle", zh: "神秘环" }],
	[PotencyModifierType.DEATHSDESIGN, { en: "death's design", zh: "死亡烙印" }],
	[
		PotencyModifierType.ENHANCED_GIBBET_GALLOWS,
		{ en: "enhanced gibbet/gallows", zh: "绞决/缢杀效果提高" },
	],
	[PotencyModifierType.ENHANCED_REAPING, { en: "enhanced reaping", zh: "虚无/交错收割效果提高" }],
	[PotencyModifierType.IMMORTAL_SACRIFICE, { en: "immortal sacrifice" }],
	[PotencyModifierType.BARRAGE, { en: "barrage" }],
	[PotencyModifierType.RAGING_STRIKES, { en: "raging strikes" }],
	[PotencyModifierType.BATTLE_VOICE, { en: "battle voice" }],
	[PotencyModifierType.RADIANT_FINALE_THREE_CODA, { en: "three coda radiant finale" }],
	[PotencyModifierType.RADIANT_FINALE_TWO_CODA, { en: "two coda radiant finale" }],
	[PotencyModifierType.RADIANT_FINALE_ONE_CODA, { en: "one coda radiant finale" }],
	[PotencyModifierType.WANDERERS_MINUET, { en: "wanderer's minuet" }],
	[PotencyModifierType.MAGES_BALLAD, { en: "mage's ballad" }],
	[PotencyModifierType.ARMYS_PAEON, { en: "army's paeon" }],
	[PotencyModifierType.NO_MERCY, { en: "no mercy", zh: "无情" }], // gnb
	[PotencyModifierType.SEARING_LIGHT, { en: "searing light", zh: "灼热之光" }],
	[PotencyModifierType.SURGING_TEMPEST, { en: "surging tempest", zh: "战场风暴" }],
	[PotencyModifierType.POWER_SURGE, { en: "power surge" }], // drg
	[PotencyModifierType.LANCE_CHARGE, { en: "lance charge" }],
	[PotencyModifierType.ENHANCED_PIERCING_TALON, { en: "enhanced piercing talon" }],
	[PotencyModifierType.LIFE_OF_THE_DRAGON, { en: "life of the dragon" }],
	[PotencyModifierType.LIFE_SURGE, { en: "life surge" }],
	[PotencyModifierType.PET, { en: "pet modifier", zh: "召唤物加成" }],
	[PotencyModifierType.DIVINE_MIGHT, { en: "divine might", zh: "神圣魔法效果提高" }],
	[PotencyModifierType.REQUIESCAT, { en: "requiescat", zh: "安魂祈祷" }],
	[PotencyModifierType.FIGHT_OR_FLIGHT, { en: "fight or flight", zh: "战逃反应" }],
	[PotencyModifierType.WHISTLE, { en: "WH", zh: "口笛" }],
	[PotencyModifierType.BRISTLE, { en: "BR", zh: "蓄力" }],
	[PotencyModifierType.MOON_FLUTE, { en: "MF", zh: "月笛" }],
	[PotencyModifierType.TINGLEA, { en: "TING", zh: "哔哩哔哩" }],
	[PotencyModifierType.TINGLEB, { en: "TING", zh: "哔哩哔哩" }],
	[PotencyModifierType.WINGED_REPROBATION, { en: "WREP", zh: "断罪飞翔" }],
	[PotencyModifierType.WINGED_REDEMPTION, { en: "WRED", zh: "完美神的祝福" }],
	[PotencyModifierType.DARKSIDE, { en: "darkside", zh: "暗黑" }],
	[PotencyModifierType.BUNSHIN, { en: "bunshin", zh: "分身之术" }],
	[PotencyModifierType.KASSATSU, { en: "kassatsu", zh: "生杀予夺" }],
	[PotencyModifierType.HOLLOW_NOZUCHI, { en: "hollow nozuchi", zh: "幻影野槌" }],
	[PotencyModifierType.KAZEMATOI, { en: "kazematoi", zh: "风缠" }],
	[PotencyModifierType.MEISUI, { en: "meisui", zh: "命水" }],
	[PotencyModifierType.DOKUMORI, { en: "dokumori", zh: "介毒之术" }],
	[PotencyModifierType.TRICK_ATTACK, { en: "trick attack", zh: "攻其不备" }],
	[PotencyModifierType.KUNAIS_BANE, { en: "kunai's bane", zh: "百雷铳" }],
	[PotencyModifierType.BROTHERHOOD, { en: "brotherhood", zh: "义结金兰" }],
	[PotencyModifierType.RIDDLE_OF_FIRE, { en: "riddle of fire", zh: "红莲极意" }],
	[PotencyModifierType.MNK_BALL, { en: "ball", zh: "功力" }],
	[PotencyModifierType.SSS_CHAKRA, { en: "chakra", zh: "斗气" }],
	[PotencyModifierType.DIVINATION, { en: "divination", zh: "占卜" }],
	[PotencyModifierType.HUNTERS_INSTINCT, { en: "hunter's instinct", zh: "猛袭" }],
	[PotencyModifierType.HONED, { en: "honed" }],
	[PotencyModifierType.VENOM, { en: "venom" }],
	[PotencyModifierType.POISED, { en: "poised" }],
	[PotencyModifierType.CHAIN_STRAT, { en: "chain stratagem", zh: "连环计" }],
	[PotencyModifierType.NO_CDH, { en: "no crit/direct hit", zh: "必不直暴" }],
]);
export function localizeModifierName(modifierType: PotencyModifierType): string {
	console.assert(
		modifierNames.has(modifierType),
		`modifier ${modifierType} doesn't have a name!`,
	);
	return localize(modifierNames.get(modifierType) ?? { en: "unknown" }) as string;
}

const modifierTags = new Map<PotencyModifierType, LocalizedContent>([
	[PotencyModifierType.AF3, { en: "AF3", zh: "三层火" }],
	[PotencyModifierType.AF2, { en: "AF2", zh: "二层火" }],
	[PotencyModifierType.AF1, { en: "AF1", zh: "一层火" }],
	[PotencyModifierType.UI3, { en: "UI3", zh: "三层冰" }],
	[PotencyModifierType.UI2, { en: "UI2", zh: "二层冰" }],
	[PotencyModifierType.UI1, { en: "UI1", zh: "一层冰" }],
	[PotencyModifierType.ENO, { en: "ENO", zh: "天语" }],
	[PotencyModifierType.POT, { en: "pot", zh: "爆发药" }],
	[PotencyModifierType.PARTY, { en: "party", zh: "团辅" }],
	[PotencyModifierType.AUTO_CDH, { en: "CDH", zh: "必直暴" }],
	[PotencyModifierType.STARRY, { en: "STARRY", zh: "星空" }],
	[PotencyModifierType.EMBOLDEN_M, { en: "MB", zh: "鼓励" }],
	[PotencyModifierType.ACCELERATION, { en: "ACC", zh: "促进" }],
	[PotencyModifierType.STANDARD_SINGLE, { en: "SSF", zh: "单色小舞" }],
	[PotencyModifierType.STANDARD_DOUBLE, { en: "DSF", zh: "双色小舞" }],
	[PotencyModifierType.TECHNICAL_SINGLE, { en: "STF", zh: "单色大舞" }],
	[PotencyModifierType.TECHNICAL_DOUBLE, { en: "DTF", zh: "双色大舞" }],
	[PotencyModifierType.TECHNICAL_TRIPLE, { en: "TTF", zh: "三色大舞" }],
	[PotencyModifierType.TECHNICAL_QUADRUPLE, { en: "QTF", zh: "四色大舞" }],
	[PotencyModifierType.DEVILMENT, { en: "DEV", zh: "探戈" }],
	[PotencyModifierType.OVERHEATED, { en: "OVERHEATED", zh: "过热" }],
	[PotencyModifierType.COMBO, { en: "CMB", zh: "连击" }],
	[PotencyModifierType.FUGETSU, { en: "FGS", zh: "风月" }],
	[PotencyModifierType.AUTO_CRIT, { en: "CRIT", zh: "必暴" }],
	[PotencyModifierType.YATEN, { en: "ENH", zh: "强化夜天" }],
	[PotencyModifierType.POSITIONAL, { en: "PS", zh: "身位" }],
	[PotencyModifierType.ARCANE_CIRCLE, { en: "AC", zh: "神秘环" }],
	[PotencyModifierType.DEATHSDESIGN, { en: "DD", zh: "死亡烙印" }],
	[PotencyModifierType.ENHANCED_GIBBET_GALLOWS, { en: "E. GIB/GAL", zh: "绞决/缢杀↑" }],
	[PotencyModifierType.ENHANCED_REAPING, { en: "E. REAPING", zh: "虚无/交错收割↑" }],
	[PotencyModifierType.IMMORTAL_SACRIFICE, { en: "IMMORTAL SAC", zh: "死亡祭品" }],
	[PotencyModifierType.BARRAGE, { en: "BRG" }],
	[PotencyModifierType.RAGING_STRIKES, { en: "RS" }],
	[PotencyModifierType.BATTLE_VOICE, { en: "BV" }],
	[PotencyModifierType.RADIANT_FINALE_THREE_CODA, { en: "RF3" }],
	[PotencyModifierType.RADIANT_FINALE_TWO_CODA, { en: "RF2" }],
	[PotencyModifierType.RADIANT_FINALE_ONE_CODA, { en: "RF1" }],
	[PotencyModifierType.WANDERERS_MINUET, { en: "WM" }],
	[PotencyModifierType.MAGES_BALLAD, { en: "MB" }],
	[PotencyModifierType.ARMYS_PAEON, { en: "AP" }],
	[PotencyModifierType.NO_MERCY, { en: "NM", zh: "无情" }], // gnb
	[PotencyModifierType.SEARING_LIGHT, { en: "SL", zh: "灼热" }], // smn
	[PotencyModifierType.SURGING_TEMPEST, { en: "SURGING", zh: "战场风暴" }],
	[PotencyModifierType.POWER_SURGE, { en: "PWS" }], // drg
	[PotencyModifierType.LANCE_CHARGE, { en: "LC" }],
	[PotencyModifierType.LIFE_OF_THE_DRAGON, { en: "LIFE" }],
	[PotencyModifierType.ENHANCED_PIERCING_TALON, { en: "ENH" }],
	[PotencyModifierType.LIFE_SURGE, { en: "LS" }],
	[PotencyModifierType.BATTLE_LITANY, { en: "BL" }],
	[PotencyModifierType.DIVINE_MIGHT, { en: "DM", zh: "强化圣灵" }],
	[PotencyModifierType.REQUIESCAT, { en: "REQ", zh: "安魂" }],
	[PotencyModifierType.FIGHT_OR_FLIGHT, { en: "FOF", zh: "战逃" }],
	[PotencyModifierType.PET, { en: "PET", zh: "召唤物" }],
	[PotencyModifierType.WHISTLE, { en: "WH", zh: "口笛" }],
	[PotencyModifierType.BRISTLE, { en: "BR", zh: "蓄力" }],
	[PotencyModifierType.MOON_FLUTE, { en: "MF", zh: "月笛" }],
	[PotencyModifierType.TINGLEA, { en: "TING", zh: "哔哩哔哩" }],
	[PotencyModifierType.TINGLEB, { en: "TING", zh: "哔哩哔哩" }],
	[PotencyModifierType.WINGED_REPROBATION, { en: "WREP", zh: "断罪飞翔" }],
	[PotencyModifierType.WINGED_REDEMPTION, { en: "WRED", zh: "完美神的祝福" }],
	[PotencyModifierType.DARKSIDE, { en: "DS", zh: "暗黑" }],
	[PotencyModifierType.BUNSHIN, { en: "BUN", zh: "分身之术" }],
	[PotencyModifierType.KASSATSU, { en: "KASS", zh: "生杀予夺" }],
	[PotencyModifierType.HOLLOW_NOZUCHI, { en: "NOZ", zh: "幻影野槌" }],
	[PotencyModifierType.KAZEMATOI, { en: "KAZ", zh: "风缠" }],
	[PotencyModifierType.MEISUI, { en: "MEI", zh: "命水" }],
	[PotencyModifierType.DOKUMORI, { en: "DOKU", zh: "介毒之术" }],
	[PotencyModifierType.TRICK_ATTACK, { en: "TRICK", zh: "攻其不备" }],
	[PotencyModifierType.KUNAIS_BANE, { en: "KB", zh: "百雷铳" }],
	[PotencyModifierType.BROTHERHOOD, { en: "BH", zh: "义结金兰" }],
	[PotencyModifierType.RIDDLE_OF_FIRE, { en: "ROF", zh: "红莲极意" }],
	[PotencyModifierType.MNK_BALL, { en: "BALL", zh: "功力" }],
	[PotencyModifierType.SSS_CHAKRA, { en: "CHAKRA", zh: "斗气" }],
	[PotencyModifierType.DIVINATION, { en: "DIV", zh: "占卜" }],
	[PotencyModifierType.HUNTERS_INSTINCT, { en: "HI", zh: "猛袭" }],
	[PotencyModifierType.HONED, { en: "HONED" }],
	[PotencyModifierType.VENOM, { en: "VENOM" }],
	[PotencyModifierType.POISED, { en: "POISED" }],
	[PotencyModifierType.CHAIN_STRAT, { en: "CHAIN", zh: "连环计" }],
	[PotencyModifierType.NO_CDH, { en: "NO CDH", zh: "必不直暴" }],
]);
export function localizeModifierTag(modifierType: PotencyModifierType): string {
	console.assert(
		modifierTags.has(modifierType),
		`modifier ${modifierType} doesn't have a tag name!`,
	);
	return localize(modifierTags.get(modifierType) ?? { en: "unknown" }) as string;
}

// This locale takes effect on a user's first visit to the site, or if they have no saved language
// preference.
const DEFAULT_LOCALE = navigator.language === "zh-CN" || navigator.language === "zh" ? "zh" : "en";

// TODO convert this into a context
export let getCurrentLanguage: () => Language = () =>
	(getCachedValue("language") || DEFAULT_LOCALE) as Language;

function LanguageOption(props: { lang: Language; setCurrentLanguage: (lang: Language) => void }) {
	let text = "English";
	if (props.lang === "zh") text = "中文";
	if (props.lang === "ja") text = "日本語";
	const colors = getCurrentThemeColors();
	return <div
		style={{
			display: "inline-block",
			cursor: "pointer",
			textDecoration: props.lang === getCurrentLanguage() ? "none" : "underline",
			borderTop: props.lang === getCurrentLanguage() ? "1px solid " + colors.text : "none",
		}}
		onClick={() => {
			props.setCurrentLanguage(props.lang);
		}}
	>
		{text}
	</div>;
}

export function SelectLanguage() {
	const savedLang = getCachedValue("language") as Language | null;
	const startLang: Language =
		savedLang !== null && (["zh", "ja", "en"] as Language[]).includes(savedLang)
			? savedLang
			: DEFAULT_LOCALE;
	const [lang, setLang] = useState<Language>(startLang);
	const setCurrentLanguage = (lang: Language) => {
		setLang(lang);
		setCachedValue("language", lang);
	};
	useEffect(() => {
		getCurrentLanguage = () => lang;
		return () => {
			getCurrentLanguage = () => lang;
		};
	});
	useEffect(() => {
		controller.updateAllDisplay();
	}, [lang]);

	return <div
		style={{
			display: "inline-block",
		}}
	>
		<span
			style={{
				display: "inline-block",
				fontSize: 17,
				position: "relative",
				marginRight: 2,
			}}
		>
			<MdLanguage />
		</span>
		<div style={{ display: "inline-block", fontSize: 14, verticalAlign: "top" }}>
			<LanguageOption lang={"en"} setCurrentLanguage={setCurrentLanguage} />|
			<LanguageOption lang={"zh"} setCurrentLanguage={setCurrentLanguage} />
		</div>
	</div>;
}
