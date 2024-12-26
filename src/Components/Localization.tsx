import React from "react";
import { BuffType } from "../Game/Common";
import { ContentNode } from "./Common";
import { MdLanguage } from "react-icons/md";
import { getCurrentThemeColors } from "./ColorTheme";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { controller } from "../Controller/Controller";
import { ActionKey, ACTIONS } from "../Game/Data/Actions";
import { ResourceKey, RESOURCES } from "../Game/Data/Resources";
import { CooldownKey, COOLDOWNS } from "../Game/Data/Cooldowns";

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

const skillsZh = new Map<ActionKey, string>([
	["FIRE", "火1"],
	["BLIZZARD", "冰1"],
	["FIRE_II", "火2"],
	["BLIZZARD_II", "冰2"],
	["FIRE_IV", "火4"],
	["TRANSPOSE", "星灵移位"],
	["THUNDER_III", "雷3"],
	["MANAWARD", "魔罩"],
	["MANAFONT", "魔泉"],
	["FIRE_III", "火3"],
	["BLIZZARD_III", "冰3"],
	["FREEZE", "玄冰"],
	["FLARE", "核爆"],
	["LEY_LINES", "黑魔纹"],
	["BLIZZARD_IV", "冰4"],
	["THUNDER_IV", "霹雷"],
	["BETWEEN_THE_LINES", "魔纹步"],
	["AETHERIAL_MANIPULATION", "以太步"],
	["TRIPLECAST", "三连咏唱"],
	["FOUL", "秽浊"],
	["DESPAIR", "绝望"],
	["UMBRAL_SOUL", "灵极魂"],
	["XENOGLOSSY", "异言"],
	["HIGH_FIRE_II", "高火2"],
	["HIGH_BLIZZARD_II", "高冰冻2"],
	["AMPLIFIER", "详述"],
	["ADDLE", "病毒"],
	["SWIFTCAST", "即刻咏唱"],
	["LUCID_DREAMING", "醒梦"],
	["SURECAST", "沉稳咏唱"],
	["TINCTURE", "爆发药"],
	["PARADOX", "悖论"],
	["HIGH_THUNDER", "高闪雷"],
	["HIGH_THUNDER_II", "高震雷"],
	["SPRINT", "疾跑"],
	["RETRACE", "魔纹重置"],
	["FLARE_STAR", "耀星"],

	// picto stuff
	["FIRE_IN_RED", "火炎之红"],
	["AERO_IN_GREEN", "疾风之绿"],
	["WATER_IN_BLUE", "流水之蓝"],
	["FIRE_II_IN_RED", "烈炎之红"],
	["AERO_II_IN_GREEN", "烈风之绿"],
	["WATER_II_IN_BLUE", "激水之蓝"],
	["BLIZZARD_IN_CYAN", "冰结之蓝青"],
	["STONE_IN_YELLOW", "飞石之纯黄"],
	["THUNDER_IN_MAGENTA", "闪雷之品红"],
	["BLIZZARD_II_IN_CYAN", "冰冻之蓝青"],
	["STONE_II_IN_YELLOW", "坚石之纯黄"],
	["THUNDER_II_IN_MAGENTA", "震雷之品红"],
	["HOLY_IN_WHITE", "神圣之白"],
	["COMET_IN_BLACK", "彗星之黑"],
	["RAINBOW_DRIP", "彩虹点滴"],
	["STAR_PRISM", "天星棱光"],

	["TEMPERA_COAT", "坦培拉涂层"],
	["TEMPERA_GRASSA", "油性坦培拉涂层"],
	["TEMPERA_COAT_POP", "坦培拉涂层破盾"],
	["TEMPERA_GRASSA_POP", "油性坦培拉涂层破盾"],
	["SMUDGE", "速涂"],
	["SUBTRACTIVE_PALETTE", "减色混合"],

	["CREATURE_MOTIF", "动物彩绘"],
	["POM_MOTIF", "绒球彩绘"],
	["WING_MOTIF", "翅膀彩绘"],
	["CLAW_MOTIF", "兽爪彩绘"],
	["MAW_MOTIF", "尖牙彩绘"],
	["LIVING_MUSE", "动物构想"],
	["POM_MUSE", "绒球构想"],
	["WINGED_MUSE", "翅膀构想"],
	["CLAWED_MUSE", "兽爪构想"],
	["FANGED_MUSE", "尖牙构想"],
	["MOG_OF_THE_AGES", "莫古力激流"],
	["RETRIBUTION_OF_THE_MADEEN", "马蒂恩惩罚"],

	["WEAPON_MOTIF", "武器彩绘"],
	["STEEL_MUSE", "武器构想"],
	["HAMMER_MOTIF", "重锤彩绘"],
	["STRIKING_MUSE", "重锤构想"],
	["HAMMER_STAMP", "重锤敲章"],
	["HAMMER_BRUSH", "重锤掠刷"],
	["POLISHING_HAMMER", "重锤抛光"],

	["LANDSCAPE_MOTIF", "风景彩绘"],
	["SCENIC_MUSE", "风景构想"],
	["STARRY_SKY_MOTIF", "星空彩绘"],
	["STARRY_MUSE", "星空构想"],

	// RDM stuff
	["RIPOSTE", "回刺"],
	["VERTHUNDER", "赤闪雷"],
	["CORPS_A_CORPS", "短兵相接"],
	["VERAERO", "赤疾风"],
	["VERFIRE", "赤火炎"],
	["VERSTONE", "赤飞石"],
	["ZWERCHHAU", "交击斩"],
	["DISPLACEMENT", "移转"],
	["FLECHE", "飞刺"],
	["REDOUBLEMENT", "连攻"],
	["ACCELERATION", "促进"],
	["MOULINET", "划圆斩"],
	["VERCURE", "赤治疗"],
	["CONTRE_SIXTE", "六分反击"],
	["EMBOLDEN", "鼓励"],
	["MANAFICATION", "魔元化"],
	["JOLT_II", "震荡"],
	["VERRAISE", "赤复活"],
	["IMPACT", "冲击"],
	["VERFLARE", "赤核爆"],
	["VERHOLY", "赤神圣"],
	["ENCHANTED_RIPOSTE", "魔回刺"],
	["ENCHANTED_ZWERCHHAU", "魔交击斩"],
	["ENCHANTED_REDOUBLEMENT", "魔连攻"],
	["ENCHANTED_MOULINET", "魔划圆斩"],
	["VERTHUNDER_II", "赤震雷"],
	["VERAERO_II", "赤烈风"],
	["ENGAGEMENT", "交剑"],
	["ENCHANTED_REPRISE", "魔续斩"],
	["REPRISE", "续斩"],
	["SCORCH", "焦热"],
	["VERTHUNDER_III", "赤暴雷"],
	["VERAERO_III", "赤疾风"],
	["MAGICK_BARRIER", "抗死"],
	["RESOLUTION", "决断"],
	["ENCHANTED_MOULINET_II", "魔划圆斩·二段"],
	["ENCHANTED_MOULINET_III", "魔划圆斩·三段"],
	["JOLT_III", "激荡"],
	["VICE_OF_THORNS", "荆棘回环"],
	["GRAND_IMPACT", "显贵冲击"],
	["PREFULGENCE", "光芒四射"],
	//等到绝伊甸我一定把你们全都秒了！————不知名赤魔法师
]);

const skillsJa = new Map<ActionKey, string>([
	["FIRE", "ファイア"],
	["BLIZZARD", "ブリザド"],
	["FIRE_II", "ファイラ"],
	["BLIZZARD_II", "ブリザラ"],
	["FIRE_IV", "ファイジャ"],
	["TRANSPOSE", "トランス"],
	["THUNDER_III", "サンダガ"],
	["MANAWARD", "マバリア"],
	["MANAFONT", "マナフォント"],
	["FIRE_III", "ファイガ"],
	["BLIZZARD_III", "ブリザガ"],
	["FREEZE", "フリーズ"],
	["FLARE", "フレア"],
	["LEY_LINES", "黒魔紋"],
	["BLIZZARD_IV", "ブリザジャ"],
	["BETWEEN_THE_LINES", "ラインズステップ"],
	["AETHERIAL_MANIPULATION", "エーテリアルテップ"],
	["TRIPLECAST", "三連魔"],
	["FOUL", "ファウル"],
	["DESPAIR", "デスペア"],
	["UMBRAL_SOUL", "アンブラルソウル"],
	["XENOGLOSSY", "ゼノグロシー"],
	["HIGH_FIRE_II", "ハイファイラ"],
	["HIGH_BLIZZARD_II", "ハイブリザラ"],
	["AMPLIFIER", "アンプリファイア"],
	["ADDLE", "アドル"],
	["SWIFTCAST", "迅速魔"],
	["LUCID_DREAMING", "ルーシッドドリーム"],
	["SURECAST", "堅実魔"],
	["TINCTURE", "薬"],
	["PARADOX", "パラドックス"],
	["HIGH_THUNDER", "ハイサンダー"],
	["SPRINT", "スプリント"],
	["RETRACE", "魔紋再設置"],
	["FLARE_STAR", "フレアスター"],

	// picto localization
	["FIRE_IN_RED", "レッドファイア"],
	["AERO_IN_GREEN", "グリーンエアロ"],
	["WATER_IN_BLUE", "ブルーウォータ"],
	["FIRE_II_IN_RED", "レッドファイラ"],
	["AERO_II_IN_GREEN", "グリーンエアロラ"],
	["WATER_II_IN_BLUE", "ブルーウォタラ"],
	["BLIZZARD_IN_CYAN", "シアンブリザド"],
	["STONE_IN_YELLOW", "イエローストーン"],
	["THUNDER_IN_MAGENTA", "マゼンタサンダー"],
	["BLIZZARD_II_IN_CYAN", "シアンブリザラ"],
	["STONE_II_IN_YELLOW", "イエローストンラ"],
	["THUNDER_II_IN_MAGENTA", "マゼンタサンダラ"],
	["HOLY_IN_WHITE", "ホワイトホーリー"],
	["COMET_IN_BLACK", "ブラックコメット"],
	["RAINBOW_DRIP", "レインボードリップ"],
	["STAR_PRISM", "スタープリズム"],

	["TEMPERA_COAT", "テンペラコート"],
	["TEMPERA_GRASSA", "テンペラグラッサ"],
	["TEMPERA_COAT_POP", "テンペラコート【ブレイク】"],
	["TEMPERA_GRASSA_POP", "テンペラグラッサ【ブレイク】"],
	["SMUDGE", "スマッジ"],
	["SUBTRACTIVE_PALETTE", "サブトラクティブパレット"],

	["CREATURE_MOTIF", "ピクトアニマル"],
	["POM_MOTIF", "ピクトアニマル"],
	["WING_MOTIF", "ピクトスケープ"],
	["CLAW_MOTIF", "ピクトクロー"],
	["MAW_MOTIF", "ピクトファング"],
	["LIVING_MUSE", "イマジンアニマル"],
	["POM_MUSE", "ピクトポンポン"],
	["WINGED_MUSE", "ピクトウィング"],
	["CLAWED_MUSE", "イマジンクロー"],
	["FANGED_MUSE", "イマジンファング"],
	["MOG_OF_THE_AGES", "モーグリストリーム"],
	["RETRIBUTION_OF_THE_MADEEN", "マディーンレトリビューション"],

	["WEAPON_MOTIF", "ピクトウェポン"],
	["STEEL_MUSE", "イマジンウェポン"],
	["HAMMER_MOTIF", "ピクトハンマー"],
	["STRIKING_MUSE", "イマジンハンマー"],
	["HAMMER_STAMP", "ハンマースタンプ"],
	["HAMMER_BRUSH", "ハンマーブラッシュ"],
	["POLISHING_HAMMER", "ハンマーポリッシュ"],

	["LANDSCAPE_MOTIF", "ピクトスケープ"],
	["SCENIC_MUSE", "イマジンスケープ"],
	["STARRY_SKY_MOTIF", "ピクトスカイ"],
	["STARRY_MUSE", "イマジンスカイ"],
	// TODO rdm localization
]);

export function localizeSkillName(text: ActionKey): string {
	let currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return skillsZh.get(text) ?? text;
	} else if (currentLang === "ja") {
		return skillsJa.get(text) ?? text;
	} else {
		return ACTIONS[text].name;
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

const resourcesZh = new Map<ResourceKey | CooldownKey, string>([
	// common
	["MANA", "MP"],
	["TINCTURE", "爆发药"],
	["SPRINT", "疾跑"],
	["REAR_POSITIONAL", "身位加成（后）"],
	["FLANK_POSITIONAL", "身位加成（侧）"],
	["ADDLE", "昏乱"],
	["SWIFTCAST", "即刻咏唱"],
	["LUCID_DREAMING", "醒梦"],
	["SURECAST", "沉稳咏唱"],
	["IN_COMBAT", "战斗中"],
	["cd_GCD", "GCD"],

	// BLM
	["TRIPLECAST", "三重咏唱"],
	["FIRESTARTER", "火苗"],
	["THUNDERHEAD", "雷砧"],
	["HIGH_THUNDER", "高闪雷"], // May need retranslation from ThunderDoT
	["THUNDER_III", "暴雷"], // May need retranslation from ThunderDoT
	["HIGH_THUNDER_II", "高震雷"], // May need retranslation from ThunderDoT
	["THUNDER_IV", "霹雷"], // May need retranslation from ThunderDoT
	["LEY_LINES", "黑魔纹"],
	["MANAWARD", "魔纹罩"],
	["ASTRAL_FIRE", "星极火"],
	["UMBRAL_ICE", "灵极冰"],
	["UMBRAL_HEART", "冰针"],
	["ASTRAL_SOUL", "星极魂"],
	["PARADOX", "悖论"],
	["ENOCHIAN", "天语"],
	["POLYGLOT", "通晓"],

	// PCT
	["AETHERHUES", "以太色调"],
	["TEMPERA_COAT", "坦培拉涂层"],
	["SMUDGE", "速涂"],
	["HAMMER_TIME", "重锤连击"],
	["SUBTRACTIVE_PALETTE", "减色混合"],
	["STARRY_MUSE", "星空构想"],
	["SUBTRACTIVE_SPECTRUM", "减色混合预备"],
	["HYPERPHANTASIA", "绘灵幻景"],
	["INSPIRATION", "绘画装置"],
	["RAINBOW_BRIGHT", "彩虹点滴效果提高"],
	["STARSTRUCK", "天星棱光预备"],
	["TEMPERA_GRASSA", "油性坦培拉涂层"],
	["MONOCHROME_TONES", "色调反转"],
	["HAMMER_COMBO", "重锤连击数"],
	["cd_SUBTRACTIVE", "CD：减色混合"],
	["cd_GRASSA", "CD：油性坦培拉涂层"],

	// RDM
	["WHITE_MANA", "白魔元"],
	["BLACK_MANA", "黑魔元"],
	["MANA_STACKS", "魔元集"],
	["ACCELERATION", "促进"],
	["DUALCAST", "连续咏唱"],
	["EMBOLDEN", "鼓励"],
	["GRAND_IMPACT_READY", "显贵冲击预备"],
	["MAGICK_BARRIER", "抗死"],
	["MAGICKED_SWORDPLAY", "魔法剑术"],
	["MANAFICATION", "魔元化"],
	["PREFULGENCE_READY", "光芒四射预备"],
	["THORNED_FLOURISH", "荆棘环绕预备"],
	["VERFIRE_READY", "赤火炎预备"],
	["VERSTONE_READY", "赤飞石预备"],
	["RDM_MELEE_COUNTER", "赤魔近战连"],
	["RDM_AOE_COUNTER", "赤魔AOE连"],
]);

export function localizeResourceType(key: ResourceKey | CooldownKey): string {
	const currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		if (resourcesZh.has(key)) {
			return resourcesZh.get(key)!;
		}
		// TODO - This in particular probably doesn't work well anymore, nor did it likely work well before,
		// Depending on how well developers matched their skill enum keys to their cd_* cooldown keys
		// An argument for better linking the actions to their cooldowns in the data...
		if (key.startsWith("cd_")) {
			const sliced = key.slice(3);
			const skillName = Object.keys(ACTIONS).find(
				(key) => ACTIONS[key as ActionKey].name === sliced || key === sliced,
			) as ActionKey | undefined;
			if (skillName !== undefined) {
				return "CD：" + localizeSkillName(skillName);
			}
		}
	}

	if (key in COOLDOWNS) {
		return COOLDOWNS[key as CooldownKey].name;
	}
	return RESOURCES[key as ResourceKey].name;
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
