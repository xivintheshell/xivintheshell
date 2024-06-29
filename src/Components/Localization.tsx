import React from "react";
import {forceUpdateAll} from "./Main";
import {SkillName} from "../Game/Common";
import {ContentNode} from "./Common";
import {MdLanguage} from "react-icons/md";
import {getCurrentThemeColors} from "./ColorTheme";
import {getCachedValue, setCachedValue} from "../Controller/Common";

export type Language = "en" | "zh" | "ja";
export type LocalizedContent = {
	en: ContentNode,
	zh?: ContentNode,
	ja?: ContentNode
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

const skillsZh = new Map<SkillName, string>([
	[SkillName.Fire, "火1"],
	[SkillName.Blizzard, "冰1"],
	[SkillName.Fire4, "火4"],
	[SkillName.Transpose, "星灵移位"],
	[SkillName.HighThunder, "高暴雷"],
	[SkillName.Manaward, "魔罩"],
	[SkillName.Manafont, "魔泉"],
	[SkillName.Fire3, "火3"],
	[SkillName.Blizzard3, "冰3"],
	[SkillName.Freeze, "玄冰"],
	[SkillName.Flare, "核爆"],
	[SkillName.LeyLines, "黑魔纹"],
	[SkillName.Blizzard4, "冰4"],
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
	[SkillName.Addle, "病毒"],
	[SkillName.Swiftcast, "即刻咏唱"],
	[SkillName.LucidDreaming, "醒梦"],
	[SkillName.Surecast, "沉稳咏唱"],
	[SkillName.Tincture, "爆发药"],
	[SkillName.Paradox, "悖论"],
	[SkillName.Sprint, "疾跑"],
	[SkillName.Retrace, "Retrace"], // todo: when there's a common translation in the community
	[SkillName.FlareStar, "耀星"]
]);

const skillsJa = new Map<SkillName, string>([
	// todo
]);

export function localizeSkillName(text: SkillName) : string {
	let currentLang = getCurrentLanguage();
	if (currentLang === "zh") {
		return skillsZh.get(text) ?? text;
	} else if (currentLang === "ja") {
		return skillsJa.get(text) ?? text;
	} else {
		return text;
	}
}

export let getCurrentLanguage : ()=>Language = () => {return "en"}
let setCurrentLanguage : (lang: Language)=>void = (lang) => {}

function LanguageOption(props: {lang: Language}) {
	let text = "English";
	if (props.lang === "zh") text = "中文";
	if (props.lang === "ja") text = "日本語";
	let colors = getCurrentThemeColors();
	return <div style={{
		display: "inline-block",
		cursor: "pointer",
		verticalAlign: "middle",
		textDecoration: props.lang === getCurrentLanguage() ? "none" : "underline",
		borderTop: props.lang === getCurrentLanguage() ? "1px solid " + colors.text : "none"
	}} onClick={()=>{
		setCurrentLanguage(props.lang);
	}}>{text}</div>
}

export class SelectLanguage extends React.Component {
	state: {
		lang: Language
	}
	constructor(props: {}) {
		super(props);
		let lang: Language = "en";
		let savedLang = getCachedValue("language");
		if (savedLang === "zh" || savedLang === "ja") lang = savedLang;
		this.state = {
			lang: lang
		}
	}

	componentDidMount() {
		getCurrentLanguage = (()=>{return this.state.lang}).bind(this);
		setCurrentLanguage = ((lang: Language)=>{
			this.setState({lang: lang})
			setCachedValue("language", lang);
		}).bind(this);
	}
	componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{lang: Language}>, snapshot?: any) {
		if (prevState.lang !== this.state.lang) {
			forceUpdateAll();
		}
	}

	componentWillUnmount() {
		getCurrentLanguage = ()=>{return "en"}
		setCurrentLanguage = (lang) => {}
	}

	render() {
		return <div style={{
			display: "inline-block",
			position: "absolute",
			right: 68,
		}}>
			<span style={{display: "inline-block", fontSize: 17, position: "relative", marginRight: 2}}><MdLanguage/></span>
			<div style={{display: "inline-block", fontSize: 14, position: "relative", top: -4}}>
				<LanguageOption lang={"en"}/>|
				<LanguageOption lang={"zh"}/>
			</div>
		</div>
	}
}

