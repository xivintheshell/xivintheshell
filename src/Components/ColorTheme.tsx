import React from "react";
import {forceUpdateAll} from "./Main";
import {MdDarkMode, MdLightMode} from "react-icons/md";
import {localize} from "./Localization";

export type ColorTheme = "Light" | "Dark";

let getCurrentColorTheme : ()=>ColorTheme = () => {return "Light"}
let setCurrentColorTheme : (colorTheme: ColorTheme)=>void = (colorTheme) => {}

export type ThemeColors = {
	accent: string,
	realTime: string,
	historical: string,
	fileDownload: string,
	text: string,
	background: string,
	bgLowContrast: string,
	bgMediumContrast: string,
	bgHighContrast: string,
	resources: {
		gcdBar: string,
		lockBar: string,
		mana: string,
		manaTick: string,
		enochian: string,
		astralFire: string,
		umbralIce: string,
		umbralHeart: string,
		paradox: string,
		polyTimer: string,
		polyStacks: string
	}
};

export let getCurrentThemeColors: ()=>ThemeColors = () => {
	let currentColorTheme = getCurrentColorTheme();
	if (currentColorTheme === "Dark") {
		return {
			accent: "mediumpurple",
			realTime: "mediumseagreen",
			historical: "darkorange",
			fileDownload: "#798c3f",
			text: "#bfbfc2",
			background: "#1f1f21",
			bgLowContrast: "#333",
			bgMediumContrast: "#555",
			bgHighContrast: "#888",
			resources: {
				gcdBar: "#5cab43",
				lockBar: "#737373",
				mana: "#62a5d2",
				manaTick: "#3d5c73",
				enochian: "#c99725",
				astralFire: "#d55124",
				umbralIce: "#509bd5",
				umbralHeart: "#8fced5",
				paradox: "#d953ee",
				polyTimer: "#594472",
				polyStacks: "#b138ee"
			}
		};
	} else {
		return {
			accent: "mediumpurple",
			realTime: "mediumseagreen",
			historical: "darkorange",
			fileDownload: "#798c3f",
			text: "black",
			background: "white",
			bgLowContrast: "#efefef",
			bgMediumContrast: "lightgrey",
			bgHighContrast: "darkgrey",
			resources: {
				gcdBar: "#8edc72",
				lockBar: "#cbcbcb",
				mana: "#8ACEEA",
				manaTick: "#C2EAFF",
				enochian: "#f5cf96",
				astralFire: "#f63",
				umbralIce: "#6bf",
				umbralHeart: "#95dae3",
				paradox: "#d953ee",
				polyTimer: "#d5bbf1",
				polyStacks: "#b138ee"
			}
		};
	}
}

function ColorThemeOption(props: {colorTheme: ColorTheme}) {
	let icon = <MdLightMode/>
	let colors = getCurrentThemeColors();
	if (props.colorTheme === "Dark") icon = <MdDarkMode/>;
	return <div style={{
		display: "inline-block",
		cursor: "pointer",
		verticalAlign: "middle",
		borderBottom: props.colorTheme === getCurrentColorTheme() ? "none" : "1px solid " + colors.text,
		borderTop: props.colorTheme === getCurrentColorTheme() ? "1px solid " + colors.text : "none"
	}} onClick={()=>{
		setCurrentColorTheme(props.colorTheme);
	}}>{icon}</div>
}

export class SelectColorTheme extends React.Component {
	state: {
		colorTheme: ColorTheme
	}
	constructor(props: {}) {
		super(props);
		let colorTheme: ColorTheme = "Light";
		let savedColorTheme: string | null = localStorage.getItem("colorTheme");
		if (savedColorTheme === "Light" || savedColorTheme === "Dark") colorTheme = savedColorTheme;
		this.state = {
			colorTheme: colorTheme
		};
	}

	componentDidMount() {
		getCurrentColorTheme = (()=>{return this.state.colorTheme}).bind(this);
		setCurrentColorTheme = ((colorTheme: ColorTheme)=>{
			this.setState({colorTheme: colorTheme})
			localStorage.setItem("colorTheme", colorTheme);
		}).bind(this);
	}
	componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{colorTheme: ColorTheme}>, snapshot?: any) {
		if (prevState.colorTheme !== this.state.colorTheme) {
			forceUpdateAll();
		}
	}

	componentWillUnmount() {
		getCurrentColorTheme = ()=>{return "Light"}
		setCurrentColorTheme = (colorTheme) => {}
	}

	render() {
		return <div style={{
			display: "inline-block",
			position: "absolute",
			right: 10,
		}}>
			<div style={{display: "inline-block", fontSize: 16, position: "relative"}}>
				<ColorThemeOption colorTheme={"Light"}/>|
				<ColorThemeOption colorTheme={"Dark"}/>
			</div>
		</div>
	}
}

