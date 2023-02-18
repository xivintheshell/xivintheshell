import React, {ReactNode} from "react";
import {GrLanguage} from "react-icons/gr";
import {forceUpdateAll} from "./Main";

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


function LanguageOption(props: {lang: Language}) {
	let text = "English";
	if (props.lang === "zh") text = "中文";
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


// todo: when language changed refresh page.
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
			forceUpdateAll();
		}).bind(this);
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
				<LanguageOption lang={"zh"}/>|
				<LanguageOption lang={"ja"}/>
			</div>
		</div>
	}
}

