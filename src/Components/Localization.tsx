import React from "react";
import { BuffType } from "../Game/Common";
import { ContentNode } from "./Common";
import { MdLanguage } from "react-icons/md";
import { getCurrentThemeColors } from "./ColorTheme";
import { getCachedValue, setCachedValue } from "../Controller/Common";
import { controller } from "../Controller/Controller";
import { ActionKey, ACTIONS, CooldownKey, COOLDOWNS, ResourceKey } from "../Game/Data";
import { Data } from "../Game/Data/Data";

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

export function localizeSkillName(text: ActionKey): string {
	const action = Data.getAction(text);

	return localize({
		en: action.name,
		...action.label,
	}).toString();
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
