import React from "react";
import {forceUpdateAll} from "./Main";
import {MdDarkMode, MdLightMode} from "react-icons/md";

export type ColorTheme = "Light" | "Dark";

let getCurrentColorTheme : ()=>ColorTheme = () => {return "Light"}
let setCurrentColorTheme : (colorTheme: ColorTheme)=>void = (colorTheme) => {}

export type ThemeColors = {
	accent: string,
	realTime: string,
	historical: string,
	fileDownload: string,
	text: string,
	emphasis: string,
	background: string,
	tipBackground: string,
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
		polyStacks: string,
	},
	timeline: {
		ruler: string,
		tracks: string,
		castBar: string,
		lockBar: string,
		gcdBar: string,
		llCover: string,
		potCover: string,
		damageMark: string,
		untargetableDamageMark: string,
		mpTickMark: string,
		warningMark: string,
		lucidTickMark: string,
		countdown: string,
		markerAlpha: string,
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
			text: "#b0b0b0",
			emphasis: "#dadada",
			background: "#1f1f21",
			tipBackground: "#2a2a2a",
			bgLowContrast: "#333",
			bgMediumContrast: "#393939",
			bgHighContrast: "#626262",
			resources: {
				gcdBar: "#5cab43",
				lockBar: "#737373",
				mana: "#62a5d2",
				manaTick: "#3d5c73",
				enochian: "#b4842d",
				astralFire: "#d55124",
				umbralIce: "#509bd5",
				umbralHeart: "#8fced5",
				paradox: "#d953ee",
				polyTimer: "#594472",
				polyStacks: "#b138ee",
			},
			timeline: {
				ruler: "#2d2d2d",
				tracks: "#242424",
				castBar: "#42364d",
				lockBar: "#696969",
				gcdBar: "#354931",
				llCover: "#5ea647",
				potCover: "#c4543a",
				damageMark: "#ff0000",
				untargetableDamageMark: "#7f7f7f",
				mpTickMark: "#32525e",
				warningMark: "#9d7103",
				lucidTickMark: "#56b3d5",
				countdown: "rgba(15, 15, 15, 0.4)",
				markerAlpha: "4f"
			}
		};
	} else {
		return {
			accent: "mediumpurple",
			realTime: "mediumseagreen",
			historical: "darkorange",
			fileDownload: "#798c3f",
			text: "black",
			emphasis: "black",
			background: "white",
			tipBackground: "white",
			bgLowContrast: "#efefef",
			bgMediumContrast: "lightgrey",
			bgHighContrast: "darkgrey",
			resources: {
				gcdBar: "#8edc72",
				lockBar: "#cbcbcb",
				mana: "#8ACEEA",
				manaTick: "#C2EAFF",
				enochian: "#f5cf96",
				astralFire: "#ff6633",
				umbralIce: "#66bbff",
				umbralHeart: "#95dae3",
				paradox: "#d953ee",
				polyTimer: "#d5bbf1",
				polyStacks: "#b138ee",
			},
			timeline: {
				ruler: "#e9e9e9",
				tracks: "#f3f3f3",
				castBar: "#ecd6f3",
				lockBar: "#9d9d9d",
				gcdBar: "#ccefc6",
				llCover: "#87ec71",
				potCover: "#ff865c",
				damageMark: "#ff0000",
				untargetableDamageMark: "#7f7f7f",
				mpTickMark: "#b6dfea",
				warningMark: "#ffbb29",
				lucidTickMark: "#88cae0",
				countdown: "rgba(0, 0, 0, 0.1)",
				markerAlpha: "7f"
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

