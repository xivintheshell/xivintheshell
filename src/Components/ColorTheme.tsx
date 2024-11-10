import React from "react";
import {MdDarkMode, MdLightMode} from "react-icons/md";
import {getCachedValue, setCachedValue, ShellJob} from "../Controller/Common";
import {controller} from "../Controller/Controller";

export type ColorTheme = "Light" | "Dark";

let getCurrentColorTheme : ()=>ColorTheme = () => {return "Light"}
let setCurrentColorTheme : (colorTheme: ColorTheme)=>void = (colorTheme) => {}

export const enum MarkerColor {
	Red = "#f64141",
	Orange = "#e89b5f",
	Yellow = "#ffd535",
	Green = "#50c53d",
	Cyan = "#53e5e5",
	Blue = "#217ff5",
	Purple = "#9755ef",
	Pink = "#ee79ee",
	Grey = "#6f6f6f"
}

export type BLMResourceColors = {
	enochian: string,
	astralFire: string,
	astralSoul: string,
	umbralIce: string,
	umbralHeart: string,
	paradox: string,
	polyTimer: string,
	polyStacks: string,
}

export type PCTResourceColors = {
	creatureCanvas: string,
	weaponCanvas: string,
	landscapeCanvas: string,
	paletteGauge: string,
	holyPaint: string,
	cometPaint: string,
	starryBuff: string,
}

export type RDMResourceColors = {
	whiteMana: string,
	blackMana: string,
	manaStack: string,
}

export type JobAccentColors = {
	[ShellJob.BLM]: string,
	[ShellJob.PCT]: string,
	[ShellJob.RDM]: string,
}

export type ThemeColors = {
	accent: string,
	jobAccents: JobAccentColors,
	realTime: string,
	historical: string,
	fileDownload: string,
	text: string,
	emphasis: string,
	warning: string,
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
		cdhTag: string,
	},
	blm: BLMResourceColors,
	pct: PCTResourceColors,
	rdm: RDMResourceColors,
	timeline: {
		ruler: string,
		tracks: string,
		castBar: string,
		lockBar: string,
		gcdBar: string,
		llCover: string,
		potCover: string,
		buffCover: string,
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
			jobAccents: {
				[ShellJob.BLM]: "#9370db", // mediumpurple
				[ShellJob.PCT]: "#e176c2",
				[ShellJob.RDM]: "#ff0000", // TODO less red
			},
			realTime: "mediumseagreen",
			historical: "#ff8c00", // darkorange
			fileDownload: "#798c3f",
			text: "#b0b0b0",
			emphasis: "#dadada",
			warning: "#ff6224",
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
				cdhTag: "#d55124",
			},
			blm: {
				enochian: "#b69241",
				astralFire: "#d55124",
				astralSoul: "#cb8046",
				umbralIce: "#509bd5",
				umbralHeart: "#8fced5",
				paradox: "#d953ee",
				polyTimer: "#594472",
				polyStacks: "#b138ee",
			},
			pct: {
				creatureCanvas: "#a948e3",
				weaponCanvas: "#a53535",
				landscapeCanvas: "#2e51dd",
				paletteGauge: "#b69241",
				holyPaint: "#9bc6dd",  // blue-ish light gray
				cometPaint: "#7e19aa",  // purple-ish black
				starryBuff: "#509bd5",
			},
			rdm: {
				// TODO
				whiteMana: "#9bc6dd",  // holy
				blackMana: "#7e19aa",  // comet
				manaStack: "#cb8046",  // astral soul
			},
			timeline: {
				ruler: "#2d2d2d",
				tracks: "#242424",
				castBar: "#42364d",
				lockBar: "#696969",
				gcdBar: "#354931",
				llCover: "#5ea647",
				potCover: "#c4543a",
				buffCover: "#9370db",
				damageMark: "#ff0000",
				untargetableDamageMark: "#7f7f7f",
				mpTickMark: "#32525e",
				warningMark: "#9d7103",
				lucidTickMark: "#56b3d5",
				countdown: "rgba(15, 15, 15, 0.4)",
				markerAlpha: "4f"
			}
		};
	} else { // Light mode
		return {
			accent: "mediumpurple",
			jobAccents: {
				[ShellJob.BLM]: "#9370db", // mediumpurple
				[ShellJob.PCT]: "#f485d6",
				[ShellJob.RDM]: "#ff0000", // TODO less red
			},
			realTime: "mediumseagreen",
			historical: "#ff8c00", // darkorange
			fileDownload: "#798c3f",
			text: "#000000",
			emphasis: "#000000",
			warning: "#f85210",
			background: "#ffffff",
			tipBackground: "#ffffff",
			bgLowContrast: "#efefef",
			bgMediumContrast: "lightgrey",
			bgHighContrast: "darkgrey",
			resources: {
				gcdBar: "#8edc72",
				lockBar: "#cbcbcb",
				mana: "#8ACEEA",
				manaTick: "#C2EAFF",
				cdhTag: "#ff6633",
			},
			blm: {
				enochian: "#f5cf96",
				astralFire: "#ff6633",
				astralSoul: "#ffa641",
				umbralIce: "#66bbff",
				umbralHeart: "#95dae3",
				paradox: "#d953ee",
				polyTimer: "#d5bbf1",
				polyStacks: "#b138ee",
			},
			pct: {
				creatureCanvas: "#b854e8",
				weaponCanvas: "#d54d48",
				landscapeCanvas: "#4568f6",
				paletteGauge: "#f5cf96",
				holyPaint: "#b7c9d5",  // blue-ish light gray
				cometPaint: "#9926c8",  // purple-ish black
				starryBuff: "#66bbff",
			},
			rdm: {
				// TODO
				whiteMana: "#ffa641",  // holy
				blackMana: "#b7c9d5",  // comet
				manaStack: "#9926c8",  // astral soul
			},
			timeline: {
				ruler: "#e9e9e9",
				tracks: "#f3f3f3",
				castBar: "#ecd6f3",
				lockBar: "#9d9d9d",
				gcdBar: "#ccefc6",
				llCover: "#87ec71",
				potCover: "#ff865c",
				buffCover: "#9370db",
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
		let savedColorTheme: string | null = getCachedValue("colorTheme");
		if (savedColorTheme === "Light" || savedColorTheme === "Dark") colorTheme = savedColorTheme;
		this.state = {
			colorTheme: colorTheme
		};
	}

	componentDidMount() {
		getCurrentColorTheme = (()=>{return this.state.colorTheme});
		setCurrentColorTheme = ((colorTheme: ColorTheme)=>{
			this.setState({colorTheme: colorTheme})
			setCachedValue("colorTheme", colorTheme);
		});
	}
	componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{colorTheme: ColorTheme}>, snapshot?: any) {
		if (prevState.colorTheme !== this.state.colorTheme) {
			controller.updateAllDisplay();
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

