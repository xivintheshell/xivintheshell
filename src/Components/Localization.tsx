import React from "react";
import { SkillName, BuffType, ResourceType } from "../Game/Common";
import { ContentNode } from "./Common";
import { MdLanguage } from "react-icons/md";
import { getCurrentThemeColors } from "./ColorTheme";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { controller } from "../Controller/Controller";

export type Language = "en" | "zh" | "ja";
export type LocalizedContent = {
	en: ContentNode;
	zh?: ContentNode;
	ja?: ContentNode;
};

export function localize(content: LocalizedContent) {
	let currentLang = getCurrentLanguage();
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
		let [month, day, year] = date.split("/");
		return `20${year}年${month}月${day}日`;
	}

	return date;
}

const skillsZh = new Map<SkillName, string>([
	// common
	[SkillName.Addle, "病毒"],
	[SkillName.Swiftcast, "即刻咏唱"],
	[SkillName.LucidDreaming, "醒梦"],
	[SkillName.Surecast, "沉稳咏唱"],
	[SkillName.Tincture, "爆发药"],
	[SkillName.Sprint, "疾跑"],
	[SkillName.Feint, "牵制"],
	[SkillName.TrueNorth, "真北"],
	[SkillName.SecondWind, "内丹"],
	[SkillName.LegSweep, "扫腿"],
	[SkillName.ArmsLength, "亲疏自行"],
	[SkillName.Bloodbath, "浴血"],
	[SkillName.HeadGraze, "伤头"],
	[SkillName.Rampart, "铁壁"],
	[SkillName.Reprisal, "雪仇"],
	[SkillName.LowBlow, "下踢"],
	[SkillName.Interject, "插言"],
	[SkillName.Provoke, "挑衅"],
	[SkillName.Shirk, "退避"],

	// BLM
	[SkillName.Fire, "火1"],
	[SkillName.Blizzard, "冰1"],
	[SkillName.Fire2, "火2"],
	[SkillName.Blizzard2, "冰2"],
	[SkillName.Fire4, "火4"],
	[SkillName.Transpose, "星灵移位"],
	[SkillName.Thunder3, "雷3"],
	[SkillName.Manaward, "魔罩"],
	[SkillName.Manafont, "魔泉"],
	[SkillName.Fire3, "火3"],
	[SkillName.Blizzard3, "冰3"],
	[SkillName.Freeze, "玄冰"],
	[SkillName.Flare, "核爆"],
	[SkillName.LeyLines, "黑魔纹"],
	[SkillName.Blizzard4, "冰4"],
	[SkillName.Thunder4, "霹雷"],
	[SkillName.BetweenTheLines, "魔纹步"],
	[SkillName.AetherialManipulation, "以太步"],
	[SkillName.Triplecast, "三连咏唱"],
	[SkillName.Foul, "秽浊"],
	[SkillName.Despair, "绝望"],
	[SkillName.UmbralSoul, "灵极魂"],
	[SkillName.Xenoglossy, "异言"],
	[SkillName.HighFire2, "高火2"],
	[SkillName.HighBlizzard2, "高冰冻2"],
	[SkillName.Amplifier, "详述"],
	[SkillName.Paradox, "悖论"],
	[SkillName.HighThunder, "高闪雷"],
	[SkillName.HighThunder2, "高震雷"],
	[SkillName.Retrace, "魔纹重置"],
	[SkillName.FlareStar, "耀星"],

	// picto stuff
	[SkillName.FireInRed, "火炎之红"],
	[SkillName.AeroInGreen, "疾风之绿"],
	[SkillName.WaterInBlue, "流水之蓝"],
	[SkillName.Fire2InRed, "烈炎之红"],
	[SkillName.Aero2InGreen, "烈风之绿"],
	[SkillName.Water2InBlue, "激水之蓝"],
	[SkillName.BlizzardInCyan, "冰结之蓝青"],
	[SkillName.StoneInYellow, "飞石之纯黄"],
	[SkillName.ThunderInMagenta, "闪雷之品红"],
	[SkillName.Blizzard2InCyan, "冰冻之蓝青"],
	[SkillName.Stone2InYellow, "坚石之纯黄"],
	[SkillName.Thunder2InMagenta, "震雷之品红"],
	[SkillName.HolyInWhite, "神圣之白"],
	[SkillName.CometInBlack, "彗星之黑"],
	[SkillName.RainbowDrip, "彩虹点滴"],
	[SkillName.StarPrism, "天星棱光"],

	[SkillName.TemperaCoat, "坦培拉涂层"],
	[SkillName.TemperaGrassa, "油性坦培拉涂层"],
	[SkillName.TemperaCoatPop, "坦培拉涂层破盾"],
	[SkillName.TemperaGrassaPop, "油性坦培拉涂层破盾"],
	[SkillName.Smudge, "速涂"],
	[SkillName.SubtractivePalette, "减色混合"],

	[SkillName.CreatureMotif, "动物彩绘"],
	[SkillName.PomMotif, "绒球彩绘"],
	[SkillName.WingMotif, "翅膀彩绘"],
	[SkillName.ClawMotif, "兽爪彩绘"],
	[SkillName.MawMotif, "尖牙彩绘"],
	[SkillName.LivingMuse, "动物构想"],
	[SkillName.PomMuse, "绒球构想"],
	[SkillName.WingedMuse, "翅膀构想"],
	[SkillName.ClawedMuse, "兽爪构想"],
	[SkillName.FangedMuse, "尖牙构想"],
	[SkillName.MogOfTheAges, "莫古力激流"],
	[SkillName.RetributionOfTheMadeen, "马蒂恩惩罚"],

	[SkillName.WeaponMotif, "武器彩绘"],
	[SkillName.SteelMuse, "武器构想"],
	[SkillName.HammerMotif, "重锤彩绘"],
	[SkillName.StrikingMuse, "重锤构想"],
	[SkillName.HammerStamp, "重锤敲章"],
	[SkillName.HammerBrush, "重锤掠刷"],
	[SkillName.PolishingHammer, "重锤抛光"],

	[SkillName.LandscapeMotif, "风景彩绘"],
	[SkillName.ScenicMuse, "风景构想"],
	[SkillName.StarrySkyMotif, "星空彩绘"],
	[SkillName.StarryMuse, "星空构想"],

	// RDM stuff
	[SkillName.Riposte, "回刺"],
	[SkillName.Verthunder, "赤闪雷"],
	[SkillName.CorpsACorps, "短兵相接"],
	[SkillName.Veraero, "赤疾风"],
	[SkillName.Verfire, "赤火炎"],
	[SkillName.Verstone, "赤飞石"],
	[SkillName.Zwerchhau, "交击斩"],
	[SkillName.Displacement, "移转"],
	[SkillName.Fleche, "飞刺"],
	[SkillName.Redoublement, "连攻"],
	[SkillName.Acceleration, "促进"],
	[SkillName.Moulinet, "划圆斩"],
	[SkillName.Vercure, "赤治疗"],
	[SkillName.ContreSixte, "六分反击"],
	[SkillName.Embolden, "鼓励"],
	[SkillName.Manafication, "魔元化"],
	[SkillName.Jolt2, "震荡"],
	[SkillName.Verraise, "赤复活"],
	[SkillName.Impact, "冲击"],
	[SkillName.Verflare, "赤核爆"],
	[SkillName.Verholy, "赤神圣"],
	[SkillName.EnchantedRiposte, "魔回刺"],
	[SkillName.EnchantedZwerchhau, "魔交击斩"],
	[SkillName.EnchantedRedoublement, "魔连攻"],
	[SkillName.EnchantedMoulinet, "魔划圆斩"],
	[SkillName.Verthunder2, "赤震雷"],
	[SkillName.Veraero2, "赤烈风"],
	[SkillName.Engagement, "交剑"],
	[SkillName.EnchantedReprise, "魔续斩"],
	[SkillName.Reprise, "续斩"],
	[SkillName.Scorch, "焦热"],
	[SkillName.Verthunder3, "赤暴雷"],
	[SkillName.Veraero3, "赤疾风"],
	[SkillName.MagickBarrier, "抗死"],
	[SkillName.Resolution, "决断"],
	[SkillName.EnchantedMoulinet2, "魔划圆斩·二段"],
	[SkillName.EnchantedMoulinet3, "魔划圆斩·三段"],
	[SkillName.Jolt3, "激荡"],
	[SkillName.ViceOfThorns, "荆棘回环"],
	[SkillName.GrandImpact, "显贵冲击"],
	[SkillName.Prefulgence, "光芒四射"],
	//等到绝伊甸我一定把你们全都秒了！————不知名赤魔法师

	// SAM
	[SkillName.Enpi, "燕飞"],
	[SkillName.Hakaze, "刃风"],
	[SkillName.Gyofu, "晓风"],
	[SkillName.Yukikaze, "雪风"],
	[SkillName.Jinpu, "阵风"],
	[SkillName.Gekko, "月光"],
	[SkillName.Shifu, "士风"],
	[SkillName.Kasha, "花车"],
	[SkillName.Fuga, "风雅"],
	[SkillName.Fuko, "风光"],
	[SkillName.Mangetsu, "满月"],
	[SkillName.Oka, "樱花"],
	[SkillName.MeikyoShisui, "明镜止水"],
	[SkillName.Ikishoten, "意气冲天"],
	[SkillName.Shinten, "必杀剑·震天"],
	[SkillName.Kyuten, "必杀剑·九天"],
	[SkillName.Gyoten, "必杀剑·晓天"],
	[SkillName.Yaten, "必杀剑·夜天"],
	[SkillName.Senei, "必杀剑·闪影"],
	[SkillName.Guren, "必杀剑·红莲"],
	[SkillName.Hagakure, "叶隐"],
	[SkillName.Iaijutsu, "居合术"],
	[SkillName.TsubameGaeshi, "燕回返"],
	[SkillName.Shoha, "照破"],
	[SkillName.ThirdEye, "心眼"],
	[SkillName.Tengentsu, "天眼通"],
	[SkillName.OgiNamikiri, "奥义斩浪"],
	[SkillName.KaeshiNamikiri, "回返斩浪"],
	[SkillName.Zanshin, "残心"],
	[SkillName.Meditate, "默想"],
	[SkillName.Higanbana, "彼岸花"],
	[SkillName.TenkaGoken, "天下五剑"],
	[SkillName.KaeshiGoken, "回返五剑"],
	[SkillName.TendoGoken, "天道五剑"],
	[SkillName.TendoKaeshiGoken, "天道回返五剑"],
	[SkillName.MidareSetsugekka, "纷乱雪月花"],
	[SkillName.KaeshiSetsugekka, "回返雪月花"],
	[SkillName.TendoSetsugekka, "天道雪月花"],
	[SkillName.TendoKaeshiSetsugekka, "天道回返雪月花"],
	[SkillName.ThirdEyePop, "心眼触发"],
	[SkillName.TengentsuPop, "天眼通触发"],

	// RPR
	[SkillName.Slice, "切割"],
	[SkillName.WaxingSlice, "增盈切割"],
	[SkillName.InfernalSlice, "地狱切割"],
	[SkillName.ShadowOfDeath, "死亡之影"],
	[SkillName.SoulSlice, "灵魂切割"],
	[SkillName.Gibbet, "绞决"],
	[SkillName.Gallows, "缢杀"],
	[SkillName.ExecutionersGibbet, "绞决处刑"],
	[SkillName.ExecutionersGallows, "缢杀处刑"],
	[SkillName.VoidReaping, "虚无收割"],
	[SkillName.CrossReaping, "交错收割"],
	[SkillName.PlentifulHarvest, "阴冷收割"],
	[SkillName.HarvestMoon, "收获月"],
	[SkillName.Communio, "团契"],
	[SkillName.Perfectio, "完人"],
	[SkillName.Soulsow, "播魂种"],
	[SkillName.Harpe, "勾刃"],
	[SkillName.BloodStalk, "隐匿挥割"],
	[SkillName.UnveiledGibbet, "绞决爪"],
	[SkillName.UnveiledGallows, "缢杀爪"],
	[SkillName.LemuresSlice, "夜游魂切割"],
	[SkillName.Sacrificium, "祭牲"],
	[SkillName.ArcaneCircle, "神秘环"],
	[SkillName.Gluttony, "暴食"],
	[SkillName.Enshroud, "夜游魂衣"],
	[SkillName.SpinningScythe, "旋转钐割"],
	[SkillName.NightmareScythe, "噩梦钐割"],
	[SkillName.WhorlOfDeath, "死亡之涡"],
	[SkillName.SoulScythe, "灵魂钐割"],
	[SkillName.Guillotine, "断首"],
	[SkillName.ExecutionersGuillotine, "断首处刑"],
	[SkillName.GrimReaping, "阴冷收割"],
	[SkillName.GrimSwathe, "束缚挥割"],
	[SkillName.LemuresScythe, "夜游魂钐割"],
	[SkillName.ArcaneCrest, "神秘纹"],
	[SkillName.ArcaneCrestPop, "神秘纹破裂"],
	[SkillName.HellsIngress, "地狱入境"],
	[SkillName.HellsEgress, "地狱出境"],
	[SkillName.Regress, "回退"],

	// MCH
	[SkillName.HeatedSplitShot, "热分裂弹"],
	[SkillName.HeatedSlugShot, "热独头弹"],
	[SkillName.HeatedCleanShot, "热狙击弹"],
	[SkillName.Drill, "钻头"],
	[SkillName.HotShot, "热弹"],
	[SkillName.AirAnchor, "空气锚"],
	[SkillName.Chainsaw, "回转飞锯"],
	[SkillName.Excavator, "掘地飞轮"],
	[SkillName.GaussRound, "虹吸弹"],
	[SkillName.DoubleCheck, "双将"],
	[SkillName.Ricochet, "弹射"],
	[SkillName.Checkmate, "将死"],
	[SkillName.BlazingShot, "烈焰弹"],
	[SkillName.Wildfire, "野火"],
	[SkillName.Detonator, "引爆装置"],
	[SkillName.Hypercharge, "超荷"],
	[SkillName.RookAutoturret, "车式浮空炮塔"],
	[SkillName.RookOverdrive, "超档车式炮塔"],
	[SkillName.AutomatonQueen, "后式自走人偶"],
	[SkillName.QueenOverdrive, "超档后式人偶"],
	[SkillName.BarrelStabilizer, "枪管加热"],
	[SkillName.Reassemble, "整备"],
	[SkillName.FullMetalField, "全金属爆发"],
	[SkillName.SpreadShot, "散射"],
	[SkillName.Scattergun, "霰弹枪"],
	[SkillName.AutoCrossbow, "自动弩"],
	[SkillName.Bioblaster, "毒菌冲击"],
	[SkillName.Flamethrower, "火焰喷射器"],
	[SkillName.Dismantle, "武装解除"],
	[SkillName.Tactician, "策动"],
	[SkillName.VolleyFire, "齐射"],
	[SkillName.ArmPunch, "铁臂拳"],
	[SkillName.RookOverload, "超负荷车式炮塔"],
	[SkillName.PileBunker, "打桩枪"],
	[SkillName.CrownedCollider, "王室对撞机"],
]);

const skillsJa = new Map<SkillName, string>([
	[SkillName.Fire, "ファイア"],
	[SkillName.Blizzard, "ブリザド"],
	[SkillName.Fire2, "ファイラ"],
	[SkillName.Blizzard2, "ブリザラ"],
	[SkillName.Fire4, "ファイジャ"],
	[SkillName.Transpose, "トランス"],
	[SkillName.Thunder3, "サンダガ"],
	[SkillName.Manaward, "マバリア"],
	[SkillName.Manafont, "マナフォント"],
	[SkillName.Fire3, "ファイガ"],
	[SkillName.Blizzard3, "ブリザガ"],
	[SkillName.Freeze, "フリーズ"],
	[SkillName.Flare, "フレア"],
	[SkillName.LeyLines, "黒魔紋"],
	[SkillName.Blizzard4, "ブリザジャ"],
	[SkillName.BetweenTheLines, "ラインズステップ"],
	[SkillName.AetherialManipulation, "エーテリアルテップ"],
	[SkillName.Triplecast, "三連魔"],
	[SkillName.Foul, "ファウル"],
	[SkillName.Despair, "デスペア"],
	[SkillName.UmbralSoul, "アンブラルソウル"],
	[SkillName.Xenoglossy, "ゼノグロシー"],
	[SkillName.HighFire2, "ハイファイラ"],
	[SkillName.HighBlizzard2, "ハイブリザラ"],
	[SkillName.Amplifier, "アンプリファイア"],
	[SkillName.Addle, "アドル"],
	[SkillName.Swiftcast, "迅速魔"],
	[SkillName.LucidDreaming, "ルーシッドドリーム"],
	[SkillName.Surecast, "堅実魔"],
	[SkillName.Tincture, "薬"],
	[SkillName.Paradox, "パラドックス"],
	[SkillName.HighThunder, "ハイサンダー"],
	[SkillName.Sprint, "スプリント"],
	[SkillName.Retrace, "魔紋再設置"],
	[SkillName.FlareStar, "フレアスター"],

	// picto localization
	[SkillName.FireInRed, "レッドファイア"],
	[SkillName.AeroInGreen, "グリーンエアロ"],
	[SkillName.WaterInBlue, "ブルーウォータ"],
	[SkillName.Fire2InRed, "レッドファイラ"],
	[SkillName.Aero2InGreen, "グリーンエアロラ"],
	[SkillName.Water2InBlue, "ブルーウォタラ"],
	[SkillName.BlizzardInCyan, "シアンブリザド"],
	[SkillName.StoneInYellow, "イエローストーン"],
	[SkillName.ThunderInMagenta, "マゼンタサンダー"],
	[SkillName.Blizzard2InCyan, "シアンブリザラ"],
	[SkillName.Stone2InYellow, "イエローストンラ"],
	[SkillName.Thunder2InMagenta, "マゼンタサンダラ"],
	[SkillName.HolyInWhite, "ホワイトホーリー"],
	[SkillName.CometInBlack, "ブラックコメット"],
	[SkillName.RainbowDrip, "レインボードリップ"],
	[SkillName.StarPrism, "スタープリズム"],

	[SkillName.TemperaCoat, "テンペラコート"],
	[SkillName.TemperaGrassa, "テンペラグラッサ"],
	[SkillName.TemperaCoatPop, "テンペラコート【ブレイク】"],
	[SkillName.TemperaGrassaPop, "テンペラグラッサ【ブレイク】"],
	[SkillName.Smudge, "スマッジ"],
	[SkillName.SubtractivePalette, "サブトラクティブパレット"],

	[SkillName.CreatureMotif, "ピクトアニマル"],
	[SkillName.PomMotif, "ピクトアニマル"],
	[SkillName.WingMotif, "ピクトスケープ"],
	[SkillName.ClawMotif, "ピクトクロー"],
	[SkillName.MawMotif, "ピクトファング"],
	[SkillName.LivingMuse, "イマジンアニマル"],
	[SkillName.PomMuse, "ピクトポンポン"],
	[SkillName.WingedMuse, "ピクトウィング"],
	[SkillName.ClawedMuse, "イマジンクロー"],
	[SkillName.FangedMuse, "イマジンファング"],
	[SkillName.MogOfTheAges, "モーグリストリーム"],
	[SkillName.RetributionOfTheMadeen, "マディーンレトリビューション"],

	[SkillName.WeaponMotif, "ピクトウェポン"],
	[SkillName.SteelMuse, "イマジンウェポン"],
	[SkillName.HammerMotif, "ピクトハンマー"],
	[SkillName.StrikingMuse, "イマジンハンマー"],
	[SkillName.HammerStamp, "ハンマースタンプ"],
	[SkillName.HammerBrush, "ハンマーブラッシュ"],
	[SkillName.PolishingHammer, "ハンマーポリッシュ"],

	[SkillName.LandscapeMotif, "ピクトスケープ"],
	[SkillName.ScenicMuse, "イマジンスケープ"],
	[SkillName.StarrySkyMotif, "ピクトスカイ"],
	[SkillName.StarryMuse, "イマジンスカイ"],
	// TODO rdm localization
]);

export function localizeSkillName(text: SkillName): string {
	let currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return skillsZh.get(text) ?? text;
	} else if (currentLang === "ja") {
		return skillsJa.get(text) ?? text;
	} else {
		return text;
	}
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
	let currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return buffsZh.get(text) ?? text;
	} else if (currentLang === "ja") {
		return buffsJa.get(text) ?? text;
	} else {
		return text;
	}
}

const resourcesZh = new Map<ResourceType, string>([
	// common
	[ResourceType.Mana, "MP"],
	[ResourceType.Tincture, "爆发药"],
	[ResourceType.Sprint, "疾跑"],
	[ResourceType.RearPositional, "身位加成（后）"],
	[ResourceType.FlankPositional, "身位加成（侧）"],
	[ResourceType.Addle, "昏乱"],
	[ResourceType.Swiftcast, "即刻咏唱"],
	[ResourceType.LucidDreaming, "醒梦"],
	[ResourceType.Surecast, "沉稳咏唱"],
	[ResourceType.ArmsLength, "亲疏自行"],
	[ResourceType.Feint, "牵制"],
	[ResourceType.TrueNorth, "真北"],
	[ResourceType.Bloodbath, "浴血"],
	[ResourceType.InCombat, "战斗中"],
	[ResourceType.cd_GCD, "GCD"],

	// BLM
	[ResourceType.Triplecast, "三重咏唱"],
	[ResourceType.Firestarter, "火苗"],
	[ResourceType.Thunderhead, "雷砧"],
	[ResourceType.HighThunder, "高闪雷"], // May need retranslation from ThunderDoT
	[ResourceType.ThunderIII, "暴雷"], // May need retranslation from ThunderDoT
	[ResourceType.HighThunderII, "高震雷"], // May need retranslation from ThunderDoT
	[ResourceType.ThunderIV, "霹雷"], // May need retranslation from ThunderDoT
	[ResourceType.LeyLines, "黑魔纹"],
	[ResourceType.Manaward, "魔纹罩"],
	[ResourceType.AstralFire, "星极火"],
	[ResourceType.UmbralIce, "灵极冰"],
	[ResourceType.UmbralHeart, "冰针"],
	[ResourceType.AstralSoul, "星极魂"],
	[ResourceType.Paradox, "悖论"],
	[ResourceType.Enochian, "天语"],
	[ResourceType.Polyglot, "通晓"],

	// PCT
	[ResourceType.Aetherhues, "以太色调"],
	[ResourceType.TemperaCoat, "坦培拉涂层"],
	[ResourceType.Smudge, "速涂"],
	[ResourceType.HammerTime, "重锤连击"],
	[ResourceType.SubtractivePalette, "减色混合"],
	[ResourceType.StarryMuse, "星空构想"],
	[ResourceType.SubtractiveSpectrum, "减色混合预备"],
	[ResourceType.Hyperphantasia, "绘灵幻景"],
	[ResourceType.Inspiration, "绘画装置"],
	[ResourceType.RainbowBright, "彩虹点滴效果提高"],
	[ResourceType.Starstruck, "天星棱光预备"],
	[ResourceType.TemperaGrassa, "油性坦培拉涂层"],
	[ResourceType.MonochromeTones, "色调反转"],
	[ResourceType.HammerCombo, "重锤连击数"],
	[ResourceType.cd_Subtractive, "CD：减色混合"],
	[ResourceType.cd_Grassa, "CD：油性坦培拉涂层"],

	// RDM
	[ResourceType.WhiteMana, "白魔元"],
	[ResourceType.BlackMana, "黑魔元"],
	[ResourceType.ManaStacks, "魔元集"],
	[ResourceType.Acceleration, "促进"],
	[ResourceType.Dualcast, "连续咏唱"],
	[ResourceType.Embolden, "鼓励"],
	[ResourceType.GrandImpactReady, "显贵冲击预备"],
	[ResourceType.MagickBarrier, "抗死"],
	[ResourceType.MagickedSwordplay, "魔法剑术"],
	[ResourceType.Manafication, "魔元化"],
	[ResourceType.PrefulgenceReady, "光芒四射预备"],
	[ResourceType.ThornedFlourish, "荆棘环绕预备"],
	[ResourceType.VerfireReady, "赤火炎预备"],
	[ResourceType.VerstoneReady, "赤飞石预备"],
	[ResourceType.RDMMeleeCounter, "赤魔近战连"],
	[ResourceType.RDMAoECounter, "赤魔AOE连"],

	// SAM
	[ResourceType.MeikyoShisui, "明镜止水"],
	[ResourceType.Fugetsu, "风月"],
	[ResourceType.Fuka, "风花"],
	[ResourceType.ZanshinReady, "残心预备"],
	[ResourceType.Tendo, "天道"],
	[ResourceType.OgiReady, "奥义斩浪预备"],
	[ResourceType.TsubameGaeshiReady, "燕回返预备"],
	[ResourceType.ThirdEye, "心眼"],
	[ResourceType.Tengentsu, "天眼通"],
	[ResourceType.TengentsusForesight, "通天眼"],
	[ResourceType.Meditate, "默想"],
	[ResourceType.EnhancedEnpi, "燕飞效果提高"],
	[ResourceType.HiganbanaDoT, "彼岸花dot"],
	[ResourceType.Kenki, "剑气"],
	[ResourceType.Setsu, "雪闪"],
	[ResourceType.Getsu, "月闪"],
	[ResourceType.KaSen, "花闪"],
	[ResourceType.Meditation, "默想"],
	[ResourceType.SAMTwoReady, "连击2预备"],
	[ResourceType.SAMTwoAoeReady, "AOE2预备"],
	[ResourceType.GekkoReady, "月光预备"],
	[ResourceType.KashaReady, "花车预备"],
	[ResourceType.KaeshiOgiReady, "回返斩浪预备"],
	[ResourceType.KaeshiTracker, "回返状态"],

	// RPR
	[ResourceType.Soul, "灵魂"],
	[ResourceType.Shroud, "魂衣"],
	[ResourceType.DeathsDesign, "死亡烙印"],
	[ResourceType.SoulSlice, "灵魂切割预备"],
	[ResourceType.SoulReaver, "妖异之镰"],
	[ResourceType.EnhancedGibbet, "绞决效果提高"],
	[ResourceType.EnhancedGallows, "缢杀效果提高"],
	[ResourceType.Executioner, "处刑人"],
	[ResourceType.Enshrouded, "夜游魂衣"],
	[ResourceType.LemureShroud, "夜游魂"],
	[ResourceType.EnhancedVoidReaping, "虚无收割效果提高"],
	[ResourceType.EnhancedCrossReaping, "交错收割效果提高"],
	[ResourceType.VoidShroud, "虚无魂"],
	[ResourceType.Oblatio, "祭牲预备"],
	[ResourceType.IdealHost, "夜游魂衣预备"],
	[ResourceType.PerfectioOcculta, "补完"],
	[ResourceType.PerfectioParata, "完人预备"],
	[ResourceType.ArcaneCircle, "神秘环"],
	[ResourceType.CircleOfSacrifice, "祭祀环"],
	[ResourceType.BloodsownCircle, "死亡祭祀"],
	[ResourceType.ImmortalSacrifice, "死亡祭品"],
	[ResourceType.ArcaneCrest, "神秘纹"],
	[ResourceType.CrestOfTimeBorrowed, "守护纹"],
	[ResourceType.CrestOfTimeReturned, "活性纹"],
	[ResourceType.Soulsow, "播魂种"],
	[ResourceType.Threshold, "回退预备"],
	[ResourceType.HellsIngressUsed, "地狱入境已使用"],
	[ResourceType.EnhancedHarpe, "勾刃效果提高"],
	[ResourceType.RPRCombo, "单体连击"],
	[ResourceType.RPRAoECombo, "AOE连击"],
	[ResourceType.cd_IngressEgress, "CD：地狱入境/地狱出境"],

	// MCH
	[ResourceType.HeatGauge, "枪管热度"],
	[ResourceType.BatteryGauge, "电能"],
	[ResourceType.Reassembled, "整备预备"],
	[ResourceType.Overheated, "过热状态"],
	[ResourceType.Wildfire, "野火（敌）"],
	[ResourceType.WildfireSelf, "野火（我）"],
	[ResourceType.Flamethrower, "火焰喷射器持续中"],
	[ResourceType.Bioblaster, "毒菌冲击"],
	[ResourceType.Tactician, "策动"],
	[ResourceType.Hypercharged, "超荷预备"],
	[ResourceType.ExcavatorReady, "掘地飞轮预备"],
	[ResourceType.FullMetalMachinist, "全金属爆发预备"],
	[ResourceType.HeatCombo, "热连击"],
	[ResourceType.Queen, "人偶预备"],
	[ResourceType.QueenPunches, "人偶铁壁拳"],
	[ResourceType.QueenFinishers, "人偶离场"],
	[ResourceType.BatteryBonus, "额外电量"],
	[ResourceType.WildfireHits, "野火命中"],
	[ResourceType.cd_Queen, "CD：后式自走人偶"],
	[ResourceType.cd_Overdrive, "CD：超档车式炮塔/超档后式人偶"],
]);

export function localizeResourceType(text: ResourceType): string {
	const currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		if (resourcesZh.has(text)) {
			return resourcesZh.get(text)!;
		}
		if (text.startsWith("cd_")) {
			const sliced = text.slice(3) as keyof typeof SkillName;
			const skillName: SkillName | undefined = SkillName[sliced];
			if (skillName !== undefined) {
				return "CD：" + localizeSkillName(skillName);
			}
		}
		return text;
	} else {
		return text;
	}
}

export let getCurrentLanguage: () => Language = () => {
	return "en";
};
let setCurrentLanguage: (lang: Language) => void = (lang) => {};

function LanguageOption(props: { lang: Language }) {
	let text = "English";
	if (props.lang === "zh") text = "中文";
	if (props.lang === "ja") text = "日本語";
	let colors = getCurrentThemeColors();
	return <div
		style={{
			display: "inline-block",
			cursor: "pointer",
			verticalAlign: "middle",
			textDecoration: props.lang === getCurrentLanguage() ? "none" : "underline",
			borderTop: props.lang === getCurrentLanguage() ? "1px solid " + colors.text : "none",
		}}
		onClick={() => {
			setCurrentLanguage(props.lang);
		}}
	>
		{text}
	</div>;
}

export class SelectLanguage extends React.Component {
	state: {
		lang: Language;
	};
	constructor(props: {}) {
		super(props);
		let lang: Language = "en";
		let savedLang = getCachedValue("language");
		if (savedLang === "zh" || savedLang === "ja") lang = savedLang;
		this.state = {
			lang: lang,
		};
	}

	componentDidMount() {
		getCurrentLanguage = () => {
			return this.state.lang;
		};
		setCurrentLanguage = (lang: Language) => {
			this.setState({ lang: lang });
			setCachedValue("language", lang);
		};
	}
	componentDidUpdate(
		prevProps: Readonly<{}>,
		prevState: Readonly<{ lang: Language }>,
		snapshot?: any,
	) {
		if (prevState.lang !== this.state.lang) {
			controller.updateAllDisplay();
		}
	}

	componentWillUnmount() {
		getCurrentLanguage = () => {
			return "en";
		};
		setCurrentLanguage = (lang) => {};
	}

	render() {
		return <div
			style={{
				display: "inline-block",
				position: "absolute",
				right: 68,
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
			<div style={{ display: "inline-block", fontSize: 14, position: "relative", top: -4 }}>
				<LanguageOption lang={"en"} />|
				<LanguageOption lang={"zh"} />
			</div>
		</div>;
	}
}
