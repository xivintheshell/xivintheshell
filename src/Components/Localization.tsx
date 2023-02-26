import React, {ReactNode} from "react";
import {GrLanguage} from "react-icons/gr";
import {forceUpdateAll} from "./Main";
import {SkillName, SkillReadyStatus} from "../Game/Common";

export type Language = "en" | "zh" | "ja";
export type LocalizedContent = {
	en: ReactNode,
	zh?: ReactNode,
	ja?: ReactNode
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
	[SkillName.Blizzard, "冰1"],
	[SkillName.Fire4, "火4"],
	[SkillName.LeyLines, "黑魔纹"]
	// todo
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

function LanguageOption(props: {lang: Language}) {
	let text = "English";
	if (props.lang === "zh") text = "中文(陆续更新中)";
	if (props.lang === "ja") text = "日本語";
	return <div style={{
		display: "inline-block",
		cursor: "pointer",
		textDecoration: props.lang === getCurrentLanguage() ? "none" : "underline",
		borderTop: props.lang === getCurrentLanguage() ? "1px solid black" : "none"
	}} onClick={()=>{
		setCurrentLanguage(props.lang);
	}}>{text}</div>
}

export let getCurrentLanguage : ()=>Language = () => {return "en"}
export let setCurrentLanguage : (lang: Language)=>void = (lang) => {}

export class SelectLanguage extends React.Component {
	state: {
		lang: Language
	}
	constructor(props: {}) {
		super(props);
		let lang: Language = "en";
		let savedLang = localStorage.getItem("language");
		if (savedLang === "zh" || savedLang === "ja") lang = savedLang;
		this.state = {
			lang: lang
		}
	}

	componentDidMount() {
		getCurrentLanguage = (()=>{return this.state.lang}).bind(this);
		setCurrentLanguage = ((lang: Language)=>{
			this.setState({lang: lang})
			localStorage.setItem("language", lang);
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
			right: 10,
		}}>
			<span style={{display: "inline-block", fontSize: 20, position: "relative", marginRight: 6}}><GrLanguage/></span>
			<div style={{display: "inline-block", fontSize: 15, position: "relative", top: -5}}>
				<LanguageOption lang={"en"}/>|
				<LanguageOption lang={"zh"}/>
			</div>
		</div>
	}
}

